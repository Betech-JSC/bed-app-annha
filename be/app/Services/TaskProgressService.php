<?php

namespace App\Services;

use App\Models\ProjectTask;
use App\Models\ConstructionLog;
use App\Models\Acceptance;
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
     * Calculate automatic status based on dates, progress, and acceptance state
     * 
     * STATUS RULES:
     * - If today < start_date → Not Started
     * - If start_date ≤ today ≤ end_date AND percentage < 100 → In Progress
     * - If today > end_date AND percentage < 100 → Delayed
     * - If percentage >= 100:
     *     - If acceptance NOT done → Pending Acceptance ("Đang nghiệm thu")
     *     - If acceptance done (or no acceptance required) → Completed
     * 
     * @param ProjectTask $task
     * @param float $progressPercentage
     * @return string Status
     */
    public function calculateStatus(ProjectTask $task, float $progressPercentage): string
    {
        $today = Carbon::today();
        
        // If progress is effectively 100%, check acceptance state
        if ($progressPercentage >= 99.9) {
            // First check if all children's progress allows completion
            if (!$this->canParentBeCompleted($task)) {
                return 'in_progress'; // Children not all at 100% yet
            }

            // ROOT TASK (Category A): all children must be customer_approved
            if (!$task->parent_id) {
                $childIds = ProjectTask::where('parent_id', $task->id)
                    ->whereNull('deleted_at')
                    ->pluck('id');

                if ($childIds->isNotEmpty()) {
                    $approvedCount = Acceptance::whereIn('task_id', $childIds)
                        ->where('workflow_status', 'customer_approved')
                        ->count();
                    if ($approvedCount < $childIds->count()) {
                        return 'pending_acceptance'; // Some children still in acceptance
                    }
                }
                return 'completed';
            }

            // CHILD TASK (Category B): check its own Acceptance record
            $acceptance = Acceptance::where('task_id', $task->id)->first();
            if ($acceptance) {
                if ($acceptance->workflow_status === 'customer_approved') {
                    return 'completed';
                }
                return 'pending_acceptance';
            }

            // No Acceptance record yet — will be created by pushFromTask()
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
            // If child has children, use recursive parent calculation
            $childChildren = ProjectTask::where('parent_id', $child->id)
                ->whereNull('deleted_at')
                ->count();
            if ($childChildren > 0) {
                $childProgress = $this->calculateParentProgress($child);
            } else {
                // Leaf child: use MAX of log-based progress and stored progress_percentage
                // This ensures manually-set progress (e.g., completed=100%) is respected
                $logProgress = $this->calculateProgressFromLogs($child);
                $storedProgress = (float) ($child->progress_percentage ?? 0);
                $childProgress = max($logProgress, $storedProgress);
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
     * (either from logs OR from manual progress override)
     * 
     * NOTE: We do NOT check acceptance status here anymore.
     * The old check created a deadlock:
     *   1. AcceptanceStage can't be created until parent is 'completed'
     *   2. Parent can't be 'completed' until children are 'accepted'  
     *   3. AcceptanceItems can't exist before AcceptanceStage is created
     * Instead, acceptance is a SEPARATE workflow that runs AFTER task completion.
     * 
     * @param ProjectTask $parentTask
     * @return bool
     */
    public function canParentBeCompleted(ProjectTask $task): bool
    {
        $children = ProjectTask::where('parent_id', $task->id)
            ->whereNull('deleted_at')
            ->get();

        // Check children first (Recursive)
        foreach ($children as $child) {
            if (!$this->canParentBeCompleted($child)) {
                return false;
            }
        }

        // Final progress check — use MAX(logProgress, storedProgress) for leaf tasks
        // This ensures manually-set progress (e.g. completed=100%) is respected
        if ($children->isEmpty()) {
            $logProgress = $this->calculateProgressFromLogs($task);
            $storedProgress = (float) ($task->progress_percentage ?? 0);
            $progress = max($logProgress, $storedProgress);
        } else {
            $progress = $this->calculateParentProgress($task);
        }

        // Use a small epsilon (99.9) to handle floating point rounding differences
        // that might occur when averaging multiple sub-tasks.
        return (float)$progress >= 99.9;
    }

    /**
     * Check if a task is "customer accepted" based on Acceptance module
     * 
     * @param ProjectTask $task
     * @return bool
     */
    public function isTaskAccepted(ProjectTask $task): bool
    {
        // Root task (Category A): all children must be customer_approved
        if (!$task->parent_id) {
            $childIds = ProjectTask::where('parent_id', $task->id)->whereNull('deleted_at')->pluck('id');
            if ($childIds->isEmpty()) {
                return true;
            }
            $approvedCount = Acceptance::whereIn('task_id', $childIds)
                ->where('workflow_status', 'customer_approved')
                ->count();
            return $approvedCount >= $childIds->count();
        }

        // Child task (Category B): check its own Acceptance record
        $acceptance = Acceptance::where('task_id', $task->id)->first();
        if ($acceptance) {
            return $acceptance->workflow_status === 'customer_approved';
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
            $logProgress = $this->calculateProgressFromLogs($task);
            
            // If task has children, use parent calculation
            $hasChildren = ProjectTask::where('parent_id', $task->id)
                ->whereNull('deleted_at')
                ->exists();
            if ($hasChildren) {
                $progress = $this->calculateParentProgress($task);
            } else {
                // Leaf task: use MAX of log-based and stored (manual) progress
                $storedProgress = (float) ($task->progress_percentage ?? 0);
                $progress = max($logProgress, $storedProgress);
            }

            // STEP 1: Push child task into acceptance when it hits 100%.
            // Root tasks have no direct acceptance record — their status is derived
            // from all children's acceptance records in calculateStatus().
            if ($progress >= 99.9 && $task->parent_id !== null) {
                app(AcceptanceService::class)->pushFromTask($task);
            }

            // STEP 2: Calculate status (now aware of acceptance state)
            $status = $this->calculateStatus($task, $progress);
            
            // Preserve explicit manual overrides
            if (in_array($task->status, ['on_hold', 'cancelled'])) {
                $status = $task->status;
            }

            // Update task (bypass fillable restrictions for system updates)
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

        // Sort tasks by depth (children first) to ensure bottom-up calculation
        // Leaf tasks (no children) first, then parents based on relationship
        // A simple way is to calculate in multiple passes or use depth
        
        // For simplicity with existing code, we'll repeat the children-then-parent logic
        // but ensure we get the project record for final recalculation.
        $project = \App\Models\Project::with('progress')->find($projectId);
        if (!$project) return;

        // Leaf tasks (no children)
        $leafTasks = $tasks->filter(function ($task) use ($tasks) {
            return !$tasks->where('parent_id', $task->id)->count();
        });

        foreach ($leafTasks as $task) {
            // Don't update parent yet, we'll do it in bulk
            $this->updateTaskFromLogs($task, false);
        }

        // Parent tasks - process all remaining tasks
        // To handle multi-level properly, we can calculate from deepest to shallowest
        // Or just run the updateTaskFromLogs which handles its own children
        $parentTasks = $tasks->whereNotNull('parent_id')->merge($tasks->whereNull('parent_id'))
            ->filter(function($t) use ($leafTasks) {
                return !$leafTasks->contains('id', $t->id);
            });

        foreach ($parentTasks as $task) {
            $this->updateTaskFromLogs($task, false);
        }

        // Final pass: Recalculate root tasks explicitly and trigger project overview
        $rootTasks = $tasks->whereNull('parent_id');
        foreach ($rootTasks as $task) {
            $this->updateTaskFromLogs($task, false);
        }

        // Trigger project level progress recalculation
        if ($project->progress) {
            $project->progress->calculateOverall(true);
        }
    }

}

