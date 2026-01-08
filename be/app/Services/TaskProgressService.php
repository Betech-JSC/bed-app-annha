<?php

namespace App\Services;

use App\Models\ProjectTask;
use App\Models\ConstructionLog;
use App\Models\AcceptanceStage;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Task Progress Service
 * 
 * BUSINESS RULES:
 * - Progress percentage is ONLY calculated from Daily Construction Logs
 * - Status is ALWAYS system-calculated based on dates and percentage
 * - Parent progress = average of children
 * - Parent can only be completed when ALL children are 100%
 * 
 * SINGLE SOURCE OF TRUTH: Daily Construction Logs
 */
class TaskProgressService
{
    /**
     * Calculate task progress from Daily Construction Logs
     * 
     * RULE: Get the latest log for this task and use its completion_percentage
     * If no logs exist, progress = 0
     * 
     * @param ProjectTask $task
     * @return float Progress percentage (0-100)
     */
    public function calculateProgressFromLogs(ProjectTask $task): float
    {
        // Get latest log for this specific task
        $latestLog = ConstructionLog::where('task_id', $task->id)
            ->whereNotNull('completion_percentage')
            ->orderBy('log_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->first();

        if ($latestLog && $latestLog->completion_percentage !== null) {
            return (float) $latestLog->completion_percentage;
        }

        return 0.0;
    }

    /**
     * Calculate automatic status based on dates and progress
     * 
     * STATUS RULES (NO MANUAL OVERRIDE):
     * - If today < start_date → Not Started
     * - If start_date ≤ today ≤ end_date AND percentage < 100 → In Progress
     * - If today > end_date AND percentage < 100 → Delayed
     * - If percentage = 100 → Completed
     * 
     * @param ProjectTask $task
     * @param float $progressPercentage
     * @return string Status
     */
    public function calculateStatus(ProjectTask $task, float $progressPercentage): string
    {
        $today = Carbon::today();
        
        // If progress is 100%, status is always completed
        if ($progressPercentage >= 100) {
            return 'completed';
        }

        // If no start date, cannot determine status
        if (!$task->start_date) {
            return 'not_started';
        }

        $startDate = Carbon::parse($task->start_date);
        $endDate = $task->end_date ? Carbon::parse($task->end_date) : null;

        // Not started: today is before start date
        if ($today->lt($startDate)) {
            return 'not_started';
        }

        // In progress: within date range and not completed
        if ($endDate && $today->gte($startDate) && $today->lte($endDate)) {
            return 'in_progress';
        }

        // Delayed: past end date and not completed
        if ($endDate && $today->gt($endDate)) {
            return 'delayed';
        }

        // Started but no end date yet
        if ($today->gte($startDate) && !$endDate) {
            return 'in_progress';
        }

        return 'not_started';
    }

    /**
     * Calculate parent task progress from children
     * 
     * RULE: Parent progress = average of all children progress percentages
     * If no children, return current progress
     * 
     * @param ProjectTask $parentTask
     * @return float Progress percentage (0-100)
     */
    public function calculateParentProgress(ProjectTask $parentTask): float
    {
        $children = ProjectTask::where('parent_id', $parentTask->id)
            ->whereNull('deleted_at')
            ->get();

        if ($children->isEmpty()) {
            // No children, calculate from logs
            return $this->calculateProgressFromLogs($parentTask);
        }

        // Calculate average of children
        $totalProgress = 0;
        $count = 0;

        foreach ($children as $child) {
            // Recursively calculate child progress (handles nested hierarchy)
            $childProgress = $this->calculateProgressFromLogs($child);
            
            // If child has children, use its calculated progress (recursive)
            $childChildren = ProjectTask::where('parent_id', $child->id)
                ->whereNull('deleted_at')
                ->count();
            if ($childChildren > 0) {
                $childProgress = $this->calculateParentProgress($child);
            }
            
            $totalProgress += $childProgress;
            $count++;
        }

        return $count > 0 ? round($totalProgress / $count, 2) : 0.0;
    }

    /**
     * Check if parent can be marked as completed
     * 
     * RULE: Parent can ONLY be completed when ALL children reach 100%
     * 
     * @param ProjectTask $parentTask
     * @return bool
     */
    public function canParentBeCompleted(ProjectTask $parentTask): bool
    {
        $children = ProjectTask::where('parent_id', $parentTask->id)
            ->whereNull('deleted_at')
            ->get();

        if ($children->isEmpty()) {
            // No children, check its own progress
            $progress = $this->calculateProgressFromLogs($parentTask);
            return $progress >= 100;
        }

        // All children must be 100%
        foreach ($children as $child) {
            $childProgress = $this->calculateProgressFromLogs($child);
            
            // If child has children, check recursively
            $childChildren = ProjectTask::where('parent_id', $child->id)
                ->whereNull('deleted_at')
                ->count();
            if ($childChildren > 0) {
                if (!$this->canParentBeCompleted($child)) {
                    return false;
                }
            } else {
                if ($childProgress < 100) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Update task progress and status from logs
     * 
     * This is the ONLY method that should update progress_percentage and status
     * Called when:
     * - Daily log is created/updated
     * - Task dates are changed
     * - Parent-child relationship changes
     * 
     * @param ProjectTask $task
     * @param bool $updateParent Whether to update parent task as well
     * @return ProjectTask
     */
    public function updateTaskFromLogs(ProjectTask $task, bool $updateParent = true): ProjectTask
    {
        DB::beginTransaction();
        try {
            // Calculate progress from logs
            $progress = $this->calculateProgressFromLogs($task);
            
            // If task has children, use parent calculation
            $hasChildren = ProjectTask::where('parent_id', $task->id)
                ->whereNull('deleted_at')
                ->exists();
            if ($hasChildren) {
                $progress = $this->calculateParentProgress($task);
            }

            // Calculate status automatically
            $status = $this->calculateStatus($task, $progress);

            // Prevent manual completion if not all children are done
            $hasChildren = ProjectTask::where('parent_id', $task->id)
                ->whereNull('deleted_at')
                ->exists();
            if ($status === 'completed' && $hasChildren) {
                if (!$this->canParentBeCompleted($task)) {
                    $status = 'in_progress'; // Force to in_progress if children not all done
                }
            }

            // Update task (bypass fillable restrictions for system updates)
            // Use forceFill to update system-calculated fields
            // Use saveQuietly to prevent triggering model events (avoid infinite loop)
            $task->forceFill([
                'progress_percentage' => $progress,
                'status' => $status,
            ])->saveQuietly();

            // Update parent if this task has a parent
            if ($updateParent && $task->parent_id) {
                $parent = ProjectTask::find($task->parent_id);
                if ($parent) {
                    $this->updateTaskFromLogs($parent, true);
                }
            }

            // Auto-create acceptance stage when parent task reaches 100%
            // BUSINESS RULE: Only parent tasks (Category A) can have acceptance stages
            if ($progress >= 100 && $status === 'completed' && !$task->parent_id) {
                $this->autoCreateAcceptanceStage($task);
            }

            DB::commit();
            return $task->fresh();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error updating task progress from logs', [
                'task_id' => $task->id,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    /**
     * Recalculate all tasks for a project
     * 
     * Used when:
     * - Project is loaded
     * - Daily logs are bulk updated
     * - Need to sync all progress
     * 
     * @param int $projectId
     * @return void
     */
    public function recalculateAllTasks(int $projectId): void
    {
        $tasks = ProjectTask::where('project_id', $projectId)
            ->whereNull('deleted_at')
            ->get();

        // Process leaf tasks first (tasks without children)
        $leafTasks = $tasks->filter(function ($task) use ($tasks) {
            return !$tasks->where('parent_id', $task->id)->count();
        });

        foreach ($leafTasks as $task) {
            $this->updateTaskFromLogs($task, true);
        }

        // Then process parent tasks (they will use children's calculated progress)
        $parentTasks = $tasks->filter(function ($task) use ($tasks) {
            return $tasks->where('parent_id', $task->id)->count() > 0;
        });

        foreach ($parentTasks as $task) {
            $this->updateTaskFromLogs($task, true);
        }
    }

    /**
     * Auto-create acceptance stage when parent task reaches 100%
     * 
     * BUSINESS RULE:
     * - Only parent tasks (no parent_id) can have acceptance stages
     * - Only create if task is at 100% and completed
     * - Only create if no acceptance stage exists for this task
     * 
     * @param ProjectTask $task
     * @return AcceptanceStage|null
     */
    protected function autoCreateAcceptanceStage(ProjectTask $task): ?AcceptanceStage
    {
        try {
            // Only create for parent tasks (Category A)
            if ($task->parent_id !== null) {
                return null;
            }

            // Check if acceptance stage already exists for this task
            $existingStage = AcceptanceStage::where('task_id', $task->id)
                ->where('project_id', $task->project_id)
                ->first();

            if ($existingStage) {
                // Already exists, don't create duplicate
                return null;
            }

            // Auto-calculate order (max order + 1)
            $maxOrder = AcceptanceStage::where('project_id', $task->project_id)
                ->max('order') ?? 0;

            // Create acceptance stage
            $stage = AcceptanceStage::create([
                'project_id' => $task->project_id,
                'task_id' => $task->id, // BUSINESS RULE: Link to parent task (A)
                'name' => $task->name . ' - Nghiệm thu', // Auto-generated name
                'description' => $task->description 
                    ? $task->description . "\n\n[Giai đoạn nghiệm thu được tự động tạo khi công việc đạt 100%]"
                    : '[Giai đoạn nghiệm thu được tự động tạo khi công việc đạt 100%]',
                'order' => $maxOrder + 1,
                'is_custom' => false, // Auto-generated, not custom
                'status' => 'pending', // Start with pending status
            ]);

            Log::info('Auto-created acceptance stage for completed task', [
                'task_id' => $task->id,
                'task_name' => $task->name,
                'stage_id' => $stage->id,
                'project_id' => $task->project_id,
            ]);

            return $stage;
        } catch (\Exception $e) {
            Log::error('Error auto-creating acceptance stage', [
                'task_id' => $task->id,
                'error' => $e->getMessage()
            ]);
            // Don't throw - acceptance stage creation is not critical for task progress
            return null;
        }
    }
}

