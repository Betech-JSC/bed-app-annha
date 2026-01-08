<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class ConstructionLog extends Model
{
    protected $fillable = [
        'uuid',
        'project_id',
        'task_id',
        'log_date',
        'weather',
        'personnel_count',
        'completion_percentage',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'log_date' => 'date',
        'completion_percentage' => 'decimal:2',
        'personnel_count' => 'integer',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeForDate($query, $date)
    {
        return $query->where('log_date', $date);
    }

    public function scopeRecent($query, $days = 30)
    {
        return $query->where('log_date', '>=', now()->subDays($days)->toDateString());
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($log) {
            if (empty($log->uuid)) {
                $log->uuid = Str::uuid();
            }
        });

        // BUSINESS RULE: When log is created/updated/deleted, recalculate task progress
        static::created(function ($log) {
            if ($log->task_id) {
                $task = ProjectTask::find($log->task_id);
                if ($task) {
                    $service = app(\App\Services\TaskProgressService::class);
                    $service->updateTaskFromLogs($task, true);
                }
            }
        });

        static::updated(function ($log) {
            if ($log->task_id) {
                $task = ProjectTask::find($log->task_id);
                if ($task) {
                    $service = app(\App\Services\TaskProgressService::class);
                    $service->updateTaskFromLogs($task, true);
                }
            }
        });

        static::deleted(function ($log) {
            if ($log->task_id) {
                $task = ProjectTask::find($log->task_id);
                if ($task) {
                    $service = app(\App\Services\TaskProgressService::class);
                    $service->updateTaskFromLogs($task, true);
                }
            }
        });
    }
}
