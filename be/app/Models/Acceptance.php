<?php

namespace App\Models;

use App\Traits\Approvable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Acceptance extends Model
{
    use SoftDeletes, Approvable;

    protected $fillable = [
        'uuid',
        'project_id',
        'task_id',
        'acceptance_template_id',
        'name',
        'description',
        'order',
        'workflow_status',
        'notes',
        'submitted_by',
        'submitted_at',
        'supervisor_approved_by',
        'supervisor_approved_at',
        'customer_approved_by',
        'customer_approved_at',
        'rejected_by',
        'rejected_at',
        'rejection_reason',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'order'                  => 'integer',
        'submitted_at'           => 'datetime',
        'supervisor_approved_at' => 'datetime',
        'customer_approved_at'   => 'datetime',
        'rejected_at'            => 'datetime',
    ];

    protected $appends = [
        'parent_task_id',
        'workflow_status_label',
        'is_fully_approved',
        'has_open_defects',
    ];

    // ==================================================================
    // RELATIONSHIPS
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(AcceptanceTemplate::class, 'acceptance_template_id');
    }

    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function supervisorApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'supervisor_approved_by');
    }

    public function customerApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_approved_by');
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

    public function defects(): HasMany
    {
        // Defects are linked via the same task_id (not via morph)
        return $this->hasMany(Defect::class, 'task_id', 'task_id');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // APPROVABLE OVERRIDES
    // ==================================================================

    protected function getModelStatusValue(): string
    {
        return $this->workflow_status ?? '';
    }

    public function isPendingApproval(): bool
    {
        return in_array($this->workflow_status, ['submitted', 'supervisor_approved']);
    }

    public function getApprovalResolvedStatus(): string
    {
        return match ($this->workflow_status) {
            'customer_approved' => 'approved',
            'rejected'          => 'rejected',
            default             => 'pending',
        };
    }

    public function getApprovalSummary(): string
    {
        $taskName = $this->task?->name ?? "#{$this->id}";
        return "Nghiệm thu: {$taskName}";
    }

    public function getApprovalMetadata(): array
    {
        return [
            'name'            => $this->name,
            'task_id'         => $this->task_id,
            'project_id'      => $this->project_id,
            'workflow_status' => $this->workflow_status,
        ];
    }

    // ==================================================================
    // ACCESSORS
    // ==================================================================

    public function getParentTaskIdAttribute(): ?int
    {
        return $this->task?->parent_id;
    }

    public function getWorkflowStatusLabelAttribute(): string
    {
        return match ($this->workflow_status) {
            'draft'              => 'Nháp',
            'submitted'          => 'Đang nghiệm thu',
            'supervisor_approved'=> 'GS đã xác nhận',
            'customer_approved'  => 'Đã nghiệm thu',
            'rejected'           => 'Bị từ chối',
            default              => $this->workflow_status ?? '',
        };
    }

    public function getIsFullyApprovedAttribute(): bool
    {
        return $this->workflow_status === 'customer_approved';
    }

    public function getHasOpenDefectsAttribute(): bool
    {
        return Defect::where('project_id', $this->project_id)
            ->where('task_id', $this->task_id)
            ->whereIn('status', ['open', 'in_progress', 'fixed'])
            ->exists();
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (self $model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) Str::uuid();
            }
        });

        static::saved(function (self $model) {
            // Skip when reverting to draft — updateTaskFromLogs would call pushFromTask,
            // which re-submits the acceptance and undoes the revert.
            if ($model->wasChanged('workflow_status') && $model->workflow_status !== 'draft') {
                $task = $model->task;
                if ($task) {
                    app(\App\Services\TaskProgressService::class)->updateTaskFromLogs($task);
                }
            }
        });

        static::deleted(function (self $model) {
            $task = $model->task;
            if ($task) {
                app(\App\Services\TaskProgressService::class)->updateTaskFromLogs($task);
            }
        });
    }
}
