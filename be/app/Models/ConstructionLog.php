<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConstructionLog extends Model
{
    use \App\Traits\NotifiesUsers;
    protected $fillable = [
        'uuid',
        'project_id',
        'task_id',
        'log_date',
        'weather',
        'personnel_count',
        'completion_percentage',
        'notes',
        'shift',
        'work_items',
        'issues',
        'safety_notes',
        'delay_reason',
        'adjustment_id',
        'approval_status',
        'approved_by',
        'approved_at',
        'created_by',
    ];

    protected $casts = [
        'log_date' => 'date',
        'completion_percentage' => 'decimal:2',
        'personnel_count' => 'integer',
        'work_items' => 'array',
        'approved_at' => 'datetime',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    // BUSINESS RULE: Nhật ký không cần luồng duyệt — chỉ CRUD
    // approval_status luôn = 'approved' khi tạo mới

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
    // METHODS
    // ==================================================================

    // approve() / reject() removed — nhật ký không cần phê duyệt

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
        // Use afterCommit to ensure the log data is fully saved before recalculating
        static::created(function ($log) {
            if ($log->task_id) {
                // Defer to after the current transaction commits (avoids nested transaction issues)
                DB::afterCommit(function () use ($log) {
                    $task = ProjectTask::find($log->task_id);
                    if ($task) {
                        $service = app(\App\Services\TaskProgressService::class);
                        $service->updateTaskFromLogs($task, true);
                    }
                });
            }
        });

        static::updated(function ($log) {
            if ($log->task_id) {
                DB::afterCommit(function () use ($log) {
                    $task = ProjectTask::find($log->task_id);
                    if ($task) {
                        $service = app(\App\Services\TaskProgressService::class);
                        $service->updateTaskFromLogs($task, true);
                    }
                });
            }
        });

        static::deleted(function ($log) {
            if ($log->task_id) {
                DB::afterCommit(function () use ($log) {
                    $task = ProjectTask::find($log->task_id);
                    if ($task) {
                        $service = app(\App\Services\TaskProgressService::class);
                        $service->updateTaskFromLogs($task, true);
                    }
                });
            }
        });
    }
    // ==================================================================
    // NotifiesUsers Implementation
    // ==================================================================

    public function getNotificationProject(): ?Project
    {
        return $this->project;
    }

    public function getNotificationLabel(): string
    {
        return "Nhật ký: " . ($this->log_date ? $this->log_date->format('d/m/Y') : "#{$this->id}");
    }

    protected function notificationMap(): array
    {
        return [
            'submitted' => [
                'title'    => 'Nhật ký công trường mới',
                'body'     => 'Nhật ký ngày {name} đã được cập nhật.',
                'target'   => ['management', 'pm', 'supervisor'],
                'tab'      => 'logs',
                'priority' => 'medium',
                'category' => 'status_change',
            ],
        ];
    }
}
