<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ProjectTask extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'project_id',
        'phase_id',
        'name',
        'description',
        'start_date',
        'end_date',
        'duration',
        'progress_percentage',
        'status',
        'priority',
        'assigned_to',
        'order',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'duration' => 'integer',
        'progress_percentage' => 'decimal:2',
        'order' => 'integer',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function phase(): BelongsTo
    {
        return $this->belongsTo(ProjectPhase::class);
    }

    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function dependencies(): HasMany
    {
        return $this->hasMany(ProjectTaskDependency::class, 'task_id');
    }

    public function dependents(): HasMany
    {
        return $this->hasMany(ProjectTaskDependency::class, 'depends_on_task_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function calculateDuration(): ?int
    {
        if ($this->start_date && $this->end_date) {
            return $this->start_date->diffInDays($this->end_date) + 1;
        }
        return null;
    }

    public function updateDuration(): void
    {
        $duration = $this->calculateDuration();
        if ($duration !== null) {
            $this->duration = $duration;
            $this->save();
        }
    }

    public function getDependentTasks()
    {
        return $this->dependencies()->with('dependsOnTask')->get()->map(function ($dependency) {
            return $dependency->dependsOnTask;
        });
    }

    /**
     * Cập nhật tiến độ dự án khi task progress thay đổi
     */
    public function updateProjectProgress(): void
    {
        if (!$this->project) {
            return;
        }

        $project = $this->project;
        
        // Đảm bảo có progress record
        if (!$project->progress) {
            $project->progress()->create([
                'overall_percentage' => 0,
                'calculated_from' => 'logs',
            ]);
        }

        // Tính lại tiến độ tổng hợp từ logs (vì logs cập nhật task progress)
        $project->progress->calculateOverall();
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
        return $query->where('status', $status);
    }

    public function scopeByPriority($query, $priority)
    {
        return $query->where('priority', $priority);
    }

    public function scopeAssignedTo($query, $userId)
    {
        return $query->where('assigned_to', $userId);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($task) {
            if (empty($task->uuid)) {
                $task->uuid = Str::uuid();
            }
        });

        static::saving(function ($task) {
            // Auto-calculate duration if dates are set
            if ($task->start_date && $task->end_date && !$task->duration) {
                $task->duration = $task->calculateDuration();
            }
        });

        static::saved(function ($task) {
            // Khi task progress thay đổi, cập nhật project progress
            if ($task->isDirty('progress_percentage')) {
                $task->updateProjectProgress();
            }
        });
    }
}

