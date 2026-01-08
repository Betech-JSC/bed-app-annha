<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class AcceptanceItem extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'acceptance_stage_id',
        'task_id',
        'acceptance_template_id',
        'name',
        'description',
        'start_date',
        'end_date',
        'acceptance_status',
        'workflow_status',
        'notes',
        'approved_by',
        'approved_at',
        'rejected_by',
        'rejected_at',
        'rejection_reason',
        'submitted_by',
        'submitted_at',
        'supervisor_approved_by',
        'supervisor_approved_at',
        'project_manager_approved_by',
        'project_manager_approved_at',
        'customer_approved_by',
        'customer_approved_at',
        'order',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'order' => 'integer',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
        'submitted_at' => 'datetime',
        'supervisor_approved_at' => 'datetime',
        'project_manager_approved_at' => 'datetime',
        'customer_approved_at' => 'datetime',
    ];

    protected $appends = [
        'is_completed',
        'can_accept',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function acceptanceStage(): BelongsTo
    {
        return $this->belongsTo(AcceptanceStage::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class);
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(AcceptanceTemplate::class, 'acceptance_template_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function rejector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function supervisorApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_approved_by');
    }

    public function projectManagerApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'project_manager_approved_by');
    }

    public function customerApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_approved_by');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getIsCompletedAttribute(): bool
    {
        return now()->toDateString() >= $this->end_date->toDateString();
    }

    public function getCanAcceptAttribute(): bool
    {
        // Chỉ được nghiệm thu sau khi hoàn thành (end_date đã qua)
        return $this->is_completed && $this->acceptance_status === 'pending';
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function approve(?User $user = null, ?string $notes = null): bool
    {
        if (!$this->can_accept) {
            return false;
        }

        $this->acceptance_status = 'approved';
        if ($user) {
            $this->approved_by = $user->id;
        }
        $this->approved_at = now();
        if ($notes) {
            $this->notes = $notes;
        }
        $saved = $this->save();

        // Check if stage can be completed
        if ($saved) {
            $this->acceptanceStage->checkCompletion();

            // Tự động cập nhật tiến độ dự án khi nghiệm thu thay đổi
            $this->updateProjectProgress();
        }

        return $saved;
    }

    public function reject(string $reason, ?User $user = null): bool
    {
        if (!$this->can_accept) {
            return false;
        }

        $this->acceptance_status = 'rejected';
        $this->rejection_reason = $reason;
        if ($user) {
            $this->rejected_by = $user->id;
        }
        $this->rejected_at = now();
        $saved = $this->save();

        // BUSINESS RULE: Khi từ chối nghiệm thu → tự động tạo lỗi ghi nhận
        if ($saved) {
            $this->autoCreateDefectOnReject($user, $reason);
            $this->updateProjectProgress();
        }

        return $saved;
    }

    public function resetAcceptance(): bool
    {
        // Reset về pending nếu chưa được approve/reject
        if ($this->acceptance_status === 'approved' || $this->acceptance_status === 'rejected') {
            return false;
        }

        $this->acceptance_status = 'pending';
        $this->approved_by = null;
        $this->approved_at = null;
        $this->rejected_by = null;
        $this->rejected_at = null;
        $this->rejection_reason = null;
        $saved = $this->save();

        // Cập nhật tiến độ dự án khi reset nghiệm thu
        if ($saved) {
            $this->updateProjectProgress();
        }

        return $saved;
    }

    /**
     * Cập nhật tiến độ dự án dựa trên nghiệm thu
     * 
     * BUSINESS RULE: When acceptance is approved, create a ConstructionLog with 100% completion
     * This ensures single source of truth - progress is always calculated from logs
     */
    public function updateProjectProgress(): void
    {
        $project = $this->acceptanceStage->project;
        if ($project) {
            // Đảm bảo có progress record
            if (!$project->progress) {
                $project->progress()->create([
                    'overall_percentage' => 0,
                    'calculated_from' => 'acceptance',
                ]);
            }

            // Nếu nghiệm thu được approve và có task_id, tạo/update ConstructionLog với 100%
            // This ensures progress is calculated from logs (single source of truth)
            // BUSINESS RULE: Unique constraint is ['project_id', 'log_date'], not including task_id
            // So we use updateOrCreate to handle existing logs for the same project and date
            if ($this->acceptance_status === 'approved' && $this->task_id) {
                $task = $this->task;
                if ($task) {
                    // Use acceptance end_date or today as log date
                    $logDate = $this->end_date ? $this->end_date->toDateString() : now()->toDateString();

                    // BUSINESS RULE: Unique constraint is ['project_id', 'log_date']
                    // Use updateOrCreate to handle existing logs
                    $existingLog = \App\Models\ConstructionLog::where('project_id', $project->id)
                        ->where('log_date', $logDate)
                        ->first();

                    if ($existingLog) {
                        // Update existing log - set completion to 100% and add note
                        // Update task_id if it's different (for multiple tasks on same day)
                        $existingLog->update([
                            'task_id' => $task->id, // Update task_id if different
                            'completion_percentage' => 100, // Always set to 100% when acceptance approved
                            'notes' => ($existingLog->notes ? $existingLog->notes . "\n" : '') .
                                "Nghiệm thu đã được phê duyệt: {$this->name}",
                        ]);
                    } else {
                        // Create new construction log with 100% completion
                        // This will trigger task progress recalculation via ConstructionLog event
                        \App\Models\ConstructionLog::create([
                            'project_id' => $project->id,
                            'task_id' => $task->id,
                            'log_date' => $logDate,
                            'completion_percentage' => 100,
                            'notes' => "Nghiệm thu đã được phê duyệt: {$this->name}",
                            'created_by' => (\Illuminate\Support\Facades\Auth::check() ? \Illuminate\Support\Facades\Auth::id() : null) ?? $this->approved_by ?? $this->created_by ?? 1,
                        ]);
                    }
                    // Task progress will be automatically recalculated via ConstructionLog::created/updated event
                }
            }

            // Tính lại tiến độ tổng hợp (ưu tiên nghiệm thu)
            $project->progress->calculateOverall();
        }
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }

    public function scopeByStatus($query, $status)
    {
        return $query->where('acceptance_status', $status);
    }

    public function scopeCompleted($query)
    {
        return $query->whereDate('end_date', '<=', now());
    }

    public function scopePending($query)
    {
        return $query->where('acceptance_status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('acceptance_status', 'approved');
    }

    /**
     * BUSINESS RULE: Tự động tạo lỗi ghi nhận khi từ chối nghiệm thu
     * Được gọi khi reject acceptance item (cả acceptance_status và workflow_status)
     */
    public function autoCreateDefectOnReject(?User $user = null, ?string $reason = null): ?\App\Models\Defect
    {
        try {
            $stage = $this->acceptanceStage;
            if (!$stage) {
                return null;
            }

            // Kiểm tra xem đã có defect nào chưa được verified cho item này chưa
            $hasUnverifiedDefects = \App\Models\Defect::where('acceptance_stage_id', $stage->id)
                ->whereIn('status', ['open', 'in_progress', 'fixed'])
                ->exists();

            // Nếu đã có defects chưa verified, không tạo thêm
            if ($hasUnverifiedDefects) {
                return null;
            }

            // Tạo defect mặc định khi từ chối nghiệm thu
            $defect = \App\Models\Defect::create([
                'project_id' => $stage->project_id,
                'task_id' => $this->task_id ?? $stage->task_id, // BUSINESS RULE: Auto-link to task
                'acceptance_stage_id' => $stage->id,
                'description' => "Nghiệm thu bị từ chối cho hạng mục: {$this->name}.\n" .
                    ($reason ? "Lý do: {$reason}\n" : '') .
                    "Vui lòng khắc phục các vấn đề trước khi gửi duyệt lại.",
                'severity' => 'high', // Mặc định là high vì nghiệm thu bị từ chối
                'status' => 'open',
                'reported_by' => $user?->id ?? $this->rejected_by ?? $stage->rejected_by ?? null,
                'reported_at' => now(),
            ]);

            // Tạo history record
            \App\Models\DefectHistory::create([
                'defect_id' => $defect->id,
                'action' => 'created',
                'new_status' => 'open',
                'user_id' => $defect->reported_by,
                'notes' => 'Tự động tạo khi nghiệm thu bị từ chối',
            ]);

            \Illuminate\Support\Facades\Log::info('Auto-created defect for rejected acceptance item', [
                'item_id' => $this->id,
                'item_name' => $this->name,
                'stage_id' => $stage->id,
                'defect_id' => $defect->id,
            ]);

            return $defect;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error auto-creating defect for rejected acceptance item', [
                'item_id' => $this->id,
                'error' => $e->getMessage()
            ]);
            // Don't throw - defect creation is not critical
            return null;
        }
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($item) {
            if (empty($item->uuid)) {
                $item->uuid = Str::uuid();
            }
            // Auto set status based on dates
            if ($item->end_date && $item->end_date->toDateString() <= now()->toDateString()) {
                if ($item->acceptance_status === 'not_started') {
                    $item->acceptance_status = 'pending';
                }
            }
        });

        static::saving(function ($item) {
            // Auto update status when end_date passes
            if ($item->end_date && $item->end_date->toDateString() <= now()->toDateString()) {
                if ($item->acceptance_status === 'not_started') {
                    $item->acceptance_status = 'pending';
                }
            }
        });

        // BUSINESS RULE: Khi workflow_status thay đổi thành 'rejected'
        // Tự động tạo lỗi ghi nhận
        static::saved(function ($item) {
            if ($item->wasChanged('workflow_status') && $item->workflow_status === 'rejected') {
                // Chỉ tạo defect nếu chưa có (tránh tạo trùng)
                $hasUnverifiedDefects = \App\Models\Defect::where('acceptance_stage_id', $item->acceptance_stage_id)
                    ->whereIn('status', ['open', 'in_progress', 'fixed'])
                    ->exists();

                if (!$hasUnverifiedDefects) {
                    $item->autoCreateDefectOnReject(
                        $item->rejected_by ? \App\Models\User::find($item->rejected_by) : null,
                        $item->rejection_reason
                    );
                }
            }
        });
    }
}
