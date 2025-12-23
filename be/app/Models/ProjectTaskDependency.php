<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectTaskDependency extends Model
{
    protected $fillable = [
        'task_id',
        'depends_on_task_id',
        'dependency_type',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function dependsOnTask(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'depends_on_task_id');
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public static function validateCircular($taskId, $dependsOnTaskId): bool
    {
        // Check if creating this dependency would create a circular reference
        $visited = [];
        return !static::hasPath($dependsOnTaskId, $taskId, $visited);
    }

    protected static function hasPath($fromTaskId, $toTaskId, &$visited): bool
    {
        if ($fromTaskId == $toTaskId) {
            return true;
        }

        if (isset($visited[$fromTaskId])) {
            return false;
        }

        $visited[$fromTaskId] = true;

        $dependencies = static::where('task_id', $fromTaskId)->get();
        foreach ($dependencies as $dependency) {
            if (static::hasPath($dependency->depends_on_task_id, $toTaskId, $visited)) {
                return true;
            }
        }

        return false;
    }
}

