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
        'phase_id', // Link to ProjectPhase
        'parent_id', // For hierarchical structure (WBS) - parent tasks act as "phases"
        'name',
        'description',
        'start_date',
        'end_date',
        'duration',
        // progress_percentage and status are NOT fillable - they are system-calculated
        // 'progress_percentage', // Calculated from Daily Logs only
        // 'status', // Auto-calculated based on dates and progress
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
        return $this->belongsTo(ProjectPhase::class, 'phase_id');
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

    /**
     * Parent task (for hierarchical structure)
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'parent_id');
    }

    /**
     * Child tasks (for hierarchical structure)
     */
    public function children(): HasMany
    {
        return $this->hasMany(ProjectTask::class, 'parent_id')->orderBy('order');
    }

    /**
     * Construction logs for this task
     */
    public function constructionLogs(): HasMany
    {
        return $this->hasMany(ConstructionLog::class, 'task_id');
    }

    /**
     * Acceptance stages linked to this task (parent task only - Category A)
     */
    public function acceptanceStages(): HasMany
    {
        return $this->hasMany(AcceptanceStage::class, 'task_id');
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
            // Prevent infinite loop: Check if this save was triggered by TaskProgressService
            // If progress/status changed but dates/parent didn't, it's a system update from service
            $isSystemUpdate = $task->wasChanged(['progress_percentage', 'status']) 
                && !$task->wasChanged(['start_date', 'end_date', 'parent_id']);
            
            // When task dates or parent relationship changes, recalculate progress and status
            // Only if this is NOT a system update (to avoid recursion)
            if ($task->wasChanged(['start_date', 'end_date', 'parent_id']) && !$isSystemUpdate) {
                $service = app(\App\Services\TaskProgressService::class);
                // updateTaskFromLogs uses saveQuietly, so it won't trigger this event again
                $service->updateTaskFromLogs($task, true);
            }
            
            // When task progress changes (from service), update project progress
            // Only update project progress, don't recalculate task progress again
            if ($task->wasChanged('progress_percentage') && $isSystemUpdate) {
                $task->updateProjectProgress();
            }
        });
    }
}

