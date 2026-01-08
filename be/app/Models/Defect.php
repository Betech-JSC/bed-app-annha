<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class Defect extends Model
{
    protected $fillable = [
        'uuid',
        'project_id',
        'task_id',
        'acceptance_stage_id',
        'description',
        'severity',
        'status',
        'expected_completion_date',
        'reported_by',
        'reported_at',
        'fixed_by',
        'fixed_at',
        'verified_by',
        'verified_at',
    ];

    protected $casts = [
        'reported_at' => 'datetime',
        'fixed_at' => 'datetime',
        'verified_at' => 'datetime',
        'expected_completion_date' => 'date',
    ];

    protected $appends = [
        'is_open',
        'is_fixed',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class);
    }

    public function acceptanceStage(): BelongsTo
    {
        return $this->belongsTo(AcceptanceStage::class);
    }

    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function fixer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fixed_by');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(DefectHistory::class);
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getIsOpenAttribute(): bool
    {
        return in_array($this->status, ['open', 'in_progress']);
    }

    public function getIsFixedAttribute(): bool
    {
        return $this->status === 'fixed' || $this->status === 'verified';
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function markAsInProgress(?User $user = null): bool
    {
        $this->status = 'in_progress';
        return $this->save();
    }

    public function markAsFixed(?User $user = null): bool
    {
        $this->status = 'fixed';
        if ($user) {
            $this->fixed_by = $user->id;
        }
        $this->fixed_at = now();
        return $this->save();
    }

    public function markAsVerified(?User $user = null): bool
    {
        if ($this->status !== 'fixed') {
            return false;
        }
        $this->status = 'verified';
        if ($user) {
            $this->verified_by = $user->id;
        }
        $this->verified_at = now();
        $saved = $this->save();
        
        // Kiểm tra nếu tất cả lỗi của task đã được xử lý xong, cập nhật task progress
        if ($saved && $this->task_id) {
            $this->checkAndUpdateTaskProgress();
        }

        // BUSINESS RULE: Khi tất cả defects của acceptance stage đã verified
        // Tự động gửi duyệt lại (resubmit) acceptance stage
        if ($saved && $this->acceptance_stage_id) {
            $this->autoResubmitAcceptanceStage();
        }
        
        return $saved;
    }

    /**
     * Kiểm tra và cập nhật task progress khi tất cả lỗi đã được xử lý
     */
    protected function checkAndUpdateTaskProgress(): void
    {
        if (!$this->task_id) {
            return;
        }

        $task = $this->task;
        if (!$task) {
            return;
        }

        // Đếm số lỗi chưa được xử lý xong (open, in_progress, hoặc fixed nhưng chưa verified)
        $openDefectsCount = Defect::where('project_id', $this->project_id)
            ->where('task_id', $this->task_id)
            ->whereIn('status', ['open', 'in_progress', 'fixed'])
            ->count();

        // Nếu không còn lỗi nào chưa được xử lý xong (tất cả đã verified)
        if ($openDefectsCount === 0) {
            // Kiểm tra xem task có đang ở trạng thái chưa hoàn thành không
            if ($task->status !== 'completed' && $task->progress_percentage < 100) {
                // Cập nhật task progress nếu chưa đạt 100%
                // Có thể set progress = 100% hoặc giữ nguyên và chỉ đánh dấu là đã xử lý hết lỗi
                // Ở đây ta không tự động set 100% vì có thể task còn công việc khác
                // Chỉ cập nhật nếu task đã gần hoàn thành (>= 90%)
                if ($task->progress_percentage >= 90) {
                    $task->update([
                        'progress_percentage' => 100,
                        'status' => 'completed',
                    ]);
                }
            }
        }
    }

    /**
     * BUSINESS RULE: Tự động gửi duyệt lại acceptance stage khi tất cả defects đã verified
     */
    protected function autoResubmitAcceptanceStage(): void
    {
        try {
            if (!$this->acceptance_stage_id) {
                return;
            }

            $stage = \App\Models\AcceptanceStage::find($this->acceptance_stage_id);
            if (!$stage) {
                return;
            }

            // Kiểm tra xem tất cả defects của stage đã verified chưa
            $unverifiedDefects = Defect::where('acceptance_stage_id', $stage->id)
                ->whereIn('status', ['open', 'in_progress', 'fixed'])
                ->count();

            // Nếu vẫn còn defects chưa verified, không resubmit
            if ($unverifiedDefects > 0) {
                return;
            }

            // Nếu tất cả defects đã verified, tự động resubmit acceptance items
            // Resubmit các items đã bị rejected
            $rejectedItems = $stage->items()
                ->where('workflow_status', 'rejected')
                ->get();

            foreach ($rejectedItems as $item) {
                // Reset rejection fields và chuyển về draft để có thể gửi duyệt lại
                $item->update([
                    'workflow_status' => 'draft',
                    'rejected_by' => null,
                    'rejected_at' => null,
                    'rejection_reason' => null,
                ]);
            }

            // Nếu stage đang ở trạng thái rejected, reset về pending
            if ($stage->status === 'rejected') {
                $stage->update([
                    'status' => 'pending',
                    'rejected_by' => null,
                    'rejected_at' => null,
                    'rejection_reason' => null,
                ]);
            }

            \Illuminate\Support\Facades\Log::info('Auto-resubmitted acceptance stage after all defects verified', [
                'stage_id' => $stage->id,
                'stage_name' => $stage->name,
                'defect_id' => $this->id,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error auto-resubmitting acceptance stage', [
                'defect_id' => $this->id,
                'stage_id' => $this->acceptance_stage_id,
                'error' => $e->getMessage()
            ]);
            // Don't throw - resubmit is not critical
        }
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeOpen($query)
    {
        return $query->whereIn('status', ['open', 'in_progress']);
    }

    public function scopeBySeverity($query, $severity)
    {
        return $query->where('severity', $severity);
    }

    public function scopeCritical($query)
    {
        return $query->where('severity', 'critical');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($defect) {
            if (empty($defect->uuid)) {
                $defect->uuid = Str::uuid();
            }
        });
    }
}
