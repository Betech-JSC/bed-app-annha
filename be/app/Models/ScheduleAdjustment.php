<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ScheduleAdjustment extends Model
{
    protected $fillable = [
        'uuid', 'project_id', 'task_id', 'type',
        'original_start', 'original_end',
        'proposed_start', 'proposed_end',
        'delay_days', 'reason', 'impact_analysis',
        'priority', 'status',
        'created_by', 'approved_by', 'approved_at', 'approval_notes',
    ];

    protected $casts = [
        'original_start'  => 'date',
        'original_end'    => 'date',
        'proposed_start'  => 'date',
        'proposed_end'    => 'date',
        'approved_at'     => 'datetime',
        'delay_days'      => 'integer',
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
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function attachments(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function approve($user, ?string $notes = null): bool
    {
        $this->status = 'approved';
        $this->approved_by = $user->id;
        $this->approved_at = now();
        $this->approval_notes = $notes;

        if ($this->save()) {
            // Cập nhật task dates nếu có proposed dates
            if ($this->proposed_start || $this->proposed_end) {
                $task = $this->task;
                if ($task) {
                    if ($this->proposed_start) $task->start_date = $this->proposed_start;
                    if ($this->proposed_end) $task->end_date = $this->proposed_end;
                    $task->updated_by = $user->id;
                    $task->save();
                }
            }
            return true;
        }

        return false;
    }

    public function reject($user, ?string $notes = null): bool
    {
        $this->status = 'rejected';
        $this->approved_by = $user->id;
        $this->approved_at = now();
        $this->approval_notes = $notes;
        return $this->save();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeByPriority($query, string $priority)
    {
        return $query->where('priority', $priority);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = Str::uuid();
            }
        });
    }
}
