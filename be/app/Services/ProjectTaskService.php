<?php

namespace App\Services;

use App\Models\ProjectTask;
use App\Models\ProjectTaskDependency;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProjectTaskService
{
    protected $progressService;

    public function __construct(TaskProgressService $progressService)
    {
        $this->progressService = $progressService;
    }

    /**
     * Create or update a project task
     */
    public function upsert(array $data, ?ProjectTask $task = null, ?User $user = null): ProjectTask
    {
        return DB::transaction(function () use ($data, $task, $user) {
            $isNew = !$task;
            
            if ($isNew) {
                $task = new ProjectTask();
                $task->uuid = (string) Str::uuid();
                $task->project_id = $data['project_id'];
                $task->created_by = $user ? $user->id : auth()->id();
            }

            $task->updated_by = $user ? $user->id : auth()->id();

            // Fillable fields
            $fillable = [
                'name', 'description', 'start_date', 'end_date', 
                'duration', 'priority', 'assigned_to', 'order', 
                'parent_id', 'phase_id'
            ];

            foreach ($fillable as $field) {
                if (array_key_exists($field, $data)) {
                    $task->{$field} = $data[$field];
                }
            }

            // Auto-calculate duration if missing but dates present
            if ($task->start_date && $task->end_date && !$task->duration) {
                $task->duration = $task->calculateDuration();
            }

            $task->save();

            // When dates or structure changes, we should recalculate progress and status
            // The ProjectTask model boot method already triggers this via TaskProgressService
            // But we can explicitly trigger it if needed to ensure immediate availability.
            $this->progressService->updateTaskFromLogs($task, true);

            // MANUAL OVERRIDE: Handle user-set status and/or progress_percentage
            $hasManualStatus = array_key_exists('status', $data) && $data['status'];
            $hasManualProgress = array_key_exists('progress_percentage', $data) && $data['progress_percentage'] !== null;
            
            if ($hasManualStatus || $hasManualProgress) {
                $updateFields = [];

                if ($hasManualStatus) {
                    $manualStatus = $data['status'];
                    $updateFields['status'] = $manualStatus;

                    // Sync progress based on status
                    if ($manualStatus === 'completed') {
                        $updateFields['progress_percentage'] = 100;
                    } elseif ($manualStatus === 'not_started') {
                        $updateFields['progress_percentage'] = 0;
                    }
                }

                // If progress was manually set (slider), use it (overrides status-based sync)
                if ($hasManualProgress && !$hasManualStatus) {
                    $manualProgress = (float) $data['progress_percentage'];
                    $updateFields['progress_percentage'] = $manualProgress;
                    
                    // Auto-sync status from progress
                    if ($manualProgress >= 100) {
                        $updateFields['status'] = 'completed';
                    } elseif ($manualProgress <= 0) {
                        $updateFields['status'] = 'not_started';
                    } elseif ($manualProgress > 0) {
                        $updateFields['status'] = 'in_progress';
                    }
                }

                $task->forceFill($updateFields)->saveQuietly();

                // CASCADE: Recalculate parent task progress + status
                if ($task->parent_id) {
                    $parent = ProjectTask::find($task->parent_id);
                    if ($parent) {
                        $this->progressService->updateTaskFromLogs($parent, true);
                    }
                }

                // Update project overall progress
                $task->updateProjectProgress();
            }

            return $task->fresh(['assignedUser', 'parent', 'dependencies']);
        });
    }

    /**
     * Delete a task
     */
    public function delete(ProjectTask $task): bool
    {
        return DB::transaction(function () use ($task) {
            $projectId = $task->project_id;
            $parentId = $task->parent_id;

            // Delete dependencies
            $task->dependencies()->delete();
            $task->dependents()->delete();

            // If it has children, decide what to do. Standard: recursive soft delete or move to parent.
            // Here we do simple soft-delete of the task itself.
            $success = $task->delete();

            if ($parentId) {
                $parent = ProjectTask::find($parentId);
                if ($parent) {
                    $this->progressService->updateTaskFromLogs($parent, true);
                }
            } else {
                // If it was a root task, recalculate project overview
                $this->progressService->recalculateAllTasks($projectId);
            }

            return $success;
        });
    }

    /**
     * Add a dependency
     */
    public function addDependency(ProjectTask $task, int $dependsOnTaskId, string $type = 'FS'): ProjectTaskDependency
    {
        if ($task->id === $dependsOnTaskId) {
            throw new \Exception('A task cannot depend on itself.');
        }

        if (!ProjectTaskDependency::validateCircular($task->id, $dependsOnTaskId)) {
            throw new \Exception('Circular dependency detected.');
        }

        return ProjectTaskDependency::updateOrCreate([
            'task_id' => $task->id,
            'depends_on_task_id' => $dependsOnTaskId,
        ], [
            'dependency_type' => $type,
        ]);
    }

    /**
     * Remove a dependency
     */
    public function removeDependency(int $dependencyId): bool
    {
        return (bool) ProjectTaskDependency::destroy($dependencyId);
    }

    /**
     * Bulk recalculate all tasks in a project
     */
    public function recalculateProject(int $projectId): void
    {
        $this->progressService->recalculateAllTasks($projectId);
    }

    /**
     * Get tasks with filtering and business logic
     */
    public function getTasks(Project $project, array $filters = []): \Illuminate\Support\Collection
    {
        $query = $project->tasks()
            ->with([
                'parent',
                'children',
                'assignedUser',
                'dependencies.dependsOnTask',
                'creator',
                'updater',
                'acceptanceStages',
            ]);

        if (isset($filters['parent_id'])) {
            if ($filters['parent_id'] === 'null' || $filters['parent_id'] === '') {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', $filters['parent_id']);
            }
        }

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['assigned_to'])) {
            $query->where('assigned_to', $filters['assigned_to']);
        }

        $allTasks = $query->ordered()->get();

        if (isset($filters['leaf_only']) && ($filters['leaf_only'] === 'true' || $filters['leaf_only'] === true)) {
            $tasksWithChildren = $allTasks->filter(function ($task) use ($allTasks) {
                return $allTasks->where('parent_id', $task->id)->count() > 0;
            })->pluck('id')->toArray();

            return $allTasks->filter(function ($task) use ($tasksWithChildren) {
                return !in_array($task->id, $tasksWithChildren);
            })->values();
        }

        return $allTasks;
    }

    /**
     * Reorder tasks in a project
     */
    public function reorderTasks(int $projectId, array $tasksData): void
    {
        DB::transaction(function () use ($projectId, $tasksData) {
            foreach ($tasksData as $taskData) {
                ProjectTask::where('id', $taskData['id'])
                    ->where('project_id', $projectId)
                    ->update(['order' => $taskData['order']]);
            }
        });
    }

    /**
     * Get all descendant task IDs (for circular reference check)
     */
    public function getDescendantIds(ProjectTask $task): array
    {
        $descendantIds = [];
        $children = ProjectTask::where('parent_id', $task->id)->get();

        foreach ($children as $child) {
            $descendantIds[] = $child->id;
            $descendantIds = array_merge($descendantIds, $this->getDescendantIds($child));
        }

        return $descendantIds;
    }
}
