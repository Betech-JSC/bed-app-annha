<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;
use App\Models\AcceptanceTemplate;

class AcceptanceStage extends Model
{
    protected $fillable = [
        'uuid',
        'project_id',
        'task_id', // BUSINESS RULE: Must be parent task (A) from Progress - parent task acts as "phase"
        'acceptance_template_id', // Link to acceptance template from Settings
        'name',
        'description',
        'order',
        'is_custom',
        'status',
        'internal_approved_by',
        'internal_approved_at',
        'supervisor_approved_by',
        'supervisor_approved_at',
        'project_manager_approved_by',
        'project_manager_approved_at',
        'customer_approved_by',
        'customer_approved_at',
        'design_approved_by',
        'design_approved_at',
        'owner_approved_by',
        'owner_approved_at',
        'rejected_by',
        'rejected_at',
        'rejection_reason',
    ];

    protected $casts = [
        'is_custom' => 'boolean',
        'order' => 'integer',
        'internal_approved_at' => 'datetime',
        'supervisor_approved_at' => 'datetime',
        'project_manager_approved_at' => 'datetime',
        'customer_approved_at' => 'datetime',
        'design_approved_at' => 'datetime',
        'owner_approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    protected $appends = [
        'is_fully_approved',
        'has_open_defects',
        'is_completed',
        'completion_percentage',
        'acceptability_status', // BUSINESS RULE: Calculated from defects
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function internalApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'internal_approved_by');
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

    public function designApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'design_approved_by');
    }

    public function ownerApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_approved_by');
    }

    public function rejector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function defects(): HasMany
    {
        return $this->hasMany(Defect::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function items(): HasMany
    {
        return $this->hasMany(AcceptanceItem::class)->orderBy('order');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function acceptanceTemplate(): BelongsTo
    {
        return $this->belongsTo(AcceptanceTemplate::class, 'acceptance_template_id');
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getIsFullyApprovedAttribute(): bool
    {
        // Stage hoàn thành khi customer_approved (theo workflow mới)
        return $this->status === 'customer_approved';
    }

    public function getHasOpenDefectsAttribute(): bool
    {
        return $this->defects()->whereIn('status', ['open', 'in_progress'])->exists();
    }

    public function getIsCompletedAttribute(): bool
    {
        $items = $this->items;
        if ($items->isEmpty()) {
            return false;
        }
        // BUSINESS RULE: Giai đoạn nghiệm thu chỉ được xem là hoàn thành khi 100% hạng mục 
        // trong giai đoạn đã được duyệt xong (customer_approved)
        return $items->every(function ($item) {
            return $item->workflow_status === 'customer_approved';
        });
    }

    public function getCompletionPercentageAttribute(): float
    {
        $items = $this->items;
        if ($items->isEmpty()) {
            return 0;
        }
        // Tính completion dựa trên workflow_status = customer_approved
        $approvedCount = $items->where('workflow_status', 'customer_approved')->count();
        return ($approvedCount / $items->count()) * 100;
    }

    /**
     * BUSINESS RULE: Calculate acceptability status from defects
     * - If no defects → acceptable
     * - If all defects = COMPLETED (verified) → acceptable
     * - If any defect != COMPLETED → not_acceptable
     */
    public function getAcceptabilityStatusAttribute(): string
    {
        $defects = $this->defects;

        // If no defects, it's acceptable
        if ($defects->isEmpty()) {
            return 'acceptable';
        }

        // Check if all defects are completed (verified)
        $allCompleted = $defects->every(function ($defect) {
            return $defect->status === 'verified';
        });

        return $allCompleted ? 'acceptable' : 'not_acceptable';
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function approveInternal(?User $user = null): bool
    {
        $this->status = 'internal_approved';
        if ($user) {
            $this->internal_approved_by = $user->id;
        }
        $this->internal_approved_at = now();
        return $this->save();
    }

    /**
     * Supervisor approve (Giám sát duyệt)
     * Workflow: pending → supervisor_approved
     */
    public function approveSupervisor(?User $user = null): bool
    {
        if ($this->status !== 'pending') {
            return false;
        }
        $this->status = 'supervisor_approved';
        if ($user) {
            $this->supervisor_approved_by = $user->id;
        }
        $this->supervisor_approved_at = now();
        return $this->save();
    }

    /**
     * Project Manager approve (Quản lý dự án duyệt)
     * Workflow: supervisor_approved → project_manager_approved
     */
    public function approveProjectManager(?User $user = null): bool
    {
        if ($this->status !== 'supervisor_approved') {
            return false;
        }
        $this->status = 'project_manager_approved';
        if ($user) {
            $this->project_manager_approved_by = $user->id;
        }
        $this->project_manager_approved_at = now();
        return $this->save();
    }

    /**
     * Customer approve (Khách hàng duyệt)
     * Workflow: project_manager_approved → customer_approved
     */
    public function approveCustomer(?User $user = null): bool
    {
        if ($this->status !== 'project_manager_approved') {
            return false;
        }
        $this->status = 'customer_approved';
        if ($user) {
            $this->customer_approved_by = $user->id;
        }
        $this->customer_approved_at = now();
        $saved = $this->save();

        // BUSINESS RULE: Khi nghiệm thu ĐẠT (customer_approved)
        // Tự động tạo hạng mục nghiệm thu hoàn thành
        if ($saved) {
            $this->autoCreateAcceptanceItems();
            $this->updateProjectProgress();
        }

        return $saved;
    }

    public function approveDesign(?User $user = null): bool
    {
        if ($this->status !== 'customer_approved') {
            return false;
        }
        $this->status = 'design_approved';
        if ($user) {
            $this->design_approved_by = $user->id;
        }
        $this->design_approved_at = now();
        return $this->save();
    }

    public function approveOwner(?User $user = null): bool
    {
        if ($this->status !== 'design_approved') {
            return false;
        }
        // Check for open defects
        if ($this->has_open_defects) {
            return false;
        }
        $this->status = 'owner_approved';
        if ($user) {
            $this->owner_approved_by = $user->id;
        }
        $this->owner_approved_at = now();
        $saved = $this->save();

        // Cập nhật tiến độ dự án khi stage được owner approved
        if ($saved) {
            $this->updateProjectProgress();
        }

        return $saved;
    }

    public function reject(string $reason, ?User $user = null): bool
    {
        $this->status = 'rejected';
        $this->rejection_reason = $reason;
        if ($user) {
            $this->rejected_by = $user->id;
        }
        $this->rejected_at = now();
        $saved = $this->save();

        // BUSINESS RULE: Khi từ chối nghiệm thu → tự động tạo lỗi ghi nhận
        if ($saved) {
            $this->autoCreateDefectIfNotAcceptable($user, $reason);
        }

        return $saved;
    }

    /**
     * Kiểm tra và cập nhật trạng thái hoàn thành của tiến độ
     */
    public function checkCompletion(): void
    {
        // BUSINESS RULE: Stage chỉ hoàn thành khi 100% items customer_approved
        // Không tự động cập nhật status, phải qua workflow: pending → supervisor_approved → project_manager_approved → customer_approved

        // Cập nhật tiến độ dự án
        $this->updateProjectProgress();
    }

    /**
     * Cập nhật tiến độ dự án dựa trên nghiệm thu
     */
    protected function updateProjectProgress(): void
    {
        if ($this->project) {
            // Đảm bảo có progress record
            if (!$this->project->progress) {
                $this->project->progress()->create([
                    'overall_percentage' => 0,
                    'calculated_from' => 'acceptance',
                ]);
            }

            // Tính lại tiến độ tổng hợp (ưu tiên nghiệm thu)
            $this->project->progress->calculateOverall();
        }
    }

    /**
     * BUSINESS RULE: Tự động tạo hạng mục nghiệm thu hoàn thành khi nghiệm thu ĐẠT
     * Chỉ tạo nếu chưa có items hoặc items chưa đầy đủ
     */
    protected function autoCreateAcceptanceItems(): void
    {
        try {
            // Nếu đã có items, không tạo thêm
            if ($this->items()->count() > 0) {
                return;
            }

            // Tạo một acceptance item mặc định cho giai đoạn nghiệm thu này
            \App\Models\AcceptanceItem::create([
                'acceptance_stage_id' => $this->id,
                'task_id' => $this->task_id, // Link to parent task (Category A)
                'name' => $this->name . ' - Hạng mục nghiệm thu',
                'description' => $this->description ?? 'Hạng mục nghiệm thu được tự động tạo khi nghiệm thu đạt',
                'start_date' => $this->task?->start_date ?? now(),
                'end_date' => $this->task?->end_date ?? now(),
                'workflow_status' => 'draft',
                'acceptance_status' => 'pending',
                'order' => 1,
                'created_by' => $this->customer_approved_by ?? $this->project_manager_approved_by ?? null,
            ]);

            \Illuminate\Support\Facades\Log::info('Auto-created acceptance item for approved stage', [
                'stage_id' => $this->id,
                'stage_name' => $this->name,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error auto-creating acceptance items', [
                'stage_id' => $this->id,
                'error' => $e->getMessage()
            ]);
            // Don't throw - item creation is not critical
        }
    }

    /**
     * BUSINESS RULE: Tự động tạo lỗi nghiệm thu khi nghiệm thu KHÔNG ĐẠT
     * Được gọi khi reject stage hoặc khi acceptability_status = "not_acceptable"
     */
    public function autoCreateDefectIfNotAcceptable(?User $user = null, ?string $reason = null): ?\App\Models\Defect
    {
        try {
            // Kiểm tra xem đã có defect nào chưa được verified chưa
            $hasUnverifiedDefects = $this->defects()
                ->whereIn('status', ['open', 'in_progress', 'fixed'])
                ->exists();

            // Nếu đã có defects chưa verified, không tạo thêm
            if ($hasUnverifiedDefects) {
                return null;
            }

            // Tạo defect mặc định cho nghiệm thu không đạt
            $description = "Nghiệm thu không đạt yêu cầu cho giai đoạn: {$this->name}.";
            if ($reason) {
                $description .= "\nLý do từ chối: {$reason}";
            }
            $description .= "\nVui lòng khắc phục các vấn đề trước khi gửi duyệt lại.";

            $defect = \App\Models\Defect::create([
                'project_id' => $this->project_id,
                'task_id' => $this->task_id, // BUSINESS RULE: Auto-link to Category A (parent task)
                'acceptance_stage_id' => $this->id,
                'description' => $description,
                'severity' => 'high', // Mặc định là high vì nghiệm thu không đạt
                'status' => 'open',
                'reported_by' => $user?->id ?? $this->rejected_by ?? $this->customer_approved_by ?? $this->project_manager_approved_by ?? null,
                'reported_at' => now(),
            ]);

            // Tạo history record
            \App\Models\DefectHistory::create([
                'defect_id' => $defect->id,
                'action' => 'created',
                'new_status' => 'open',
                'user_id' => $defect->reported_by,
                'notes' => 'Tự động tạo khi nghiệm thu không đạt',
            ]);

            \Illuminate\Support\Facades\Log::info('Auto-created defect for not acceptable stage', [
                'stage_id' => $this->id,
                'stage_name' => $this->name,
                'defect_id' => $defect->id,
            ]);

            return $defect;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error auto-creating defect for not acceptable stage', [
                'stage_id' => $this->id,
                'error' => $e->getMessage()
            ]);
            // Don't throw - defect creation is not critical
            return null;
        }
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'owner_approved');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($stage) {
            if (empty($stage->uuid)) {
                $stage->uuid = Str::uuid();
            }
        });

        // BUSINESS RULE: Khi defect được tạo cho acceptance stage
        // Kiểm tra và tự động tạo defect nếu nghiệm thu không đạt
        static::saved(function ($stage) {
            // Chỉ kiểm tra khi stage đã được customer_approved hoặc rejected
            // và acceptability_status = "not_acceptable"
            if (
                in_array($stage->status, ['customer_approved', 'rejected', 'project_manager_approved'])
                && $stage->acceptability_status === 'not_acceptable'
            ) {
                // Kiểm tra xem đã có defects chưa verified chưa
                $hasUnverifiedDefects = $stage->defects()
                    ->whereIn('status', ['open', 'in_progress', 'fixed'])
                    ->exists();

                // Nếu chưa có defects chưa verified, tự động tạo
                if (!$hasUnverifiedDefects) {
                    $stage->autoCreateDefectIfNotAcceptable();
                }
            }
        });
    }
}
