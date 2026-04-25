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

            // ROOT TASK (Category A): check linked AcceptanceStage
            if (!$task->parent_id) {
                $stage = AcceptanceStage::where('task_id', $task->id)
                    ->where('project_id', $task->project_id)
                    ->orderByDesc('id')
                    ->first();
                
                if ($stage) {
                    // AcceptanceStage exists — check if fully approved
                    // We check for customer_approved and any subsequent statuses
                    if (in_array($stage->status, ['customer_approved', 'owner_approved', 'design_approved'])) {
                        return 'completed'; // Fully accepted → done
                    }
                    return 'pending_acceptance'; // Still in acceptance workflow
                }
                // No AcceptanceStage yet → completed (will trigger auto-creation)
                return 'completed';
            }

            // CHILD TASK (Category B): check linked AcceptanceItem
            $acceptanceItem = \App\Models\AcceptanceItem::where('task_id', $task->id)->first();
            if ($acceptanceItem) {
                if (in_array($acceptanceItem->workflow_status, ['customer_approved', 'owner_approved', 'design_approved'])) {
                    return 'completed'; // Fully accepted
                }
                return 'pending_acceptance'; // Still in acceptance workflow
            }

            // No AcceptanceItem yet — task is completed (waiting for stage creation)
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
        // A. Root Task (Category A) check
        if (!$task->parent_id) {
            $stage = \App\Models\AcceptanceStage::where('task_id', $task->id)->orderByDesc('id')->first();
            if ($stage) {
                return in_array($stage->status, ['customer_approved', 'owner_approved', 'design_approved']);
            }
            // MATCH FRONTEND: Default to true if no stages defined for root task
            // This allows the task to become 'completed' so an AcceptanceStage can be auto-created.
            return true;
        }

        // B. Sub-task (Category B) check
        // Check if there's an AcceptanceItem linked to this task (Get latest)
        $item = \App\Models\AcceptanceItem::where('task_id', $task->id)->orderByDesc('id')->first();
        if ($item) {
            return in_array($item->workflow_status, ['customer_approved', 'owner_approved', 'design_approved']);
        }

        // If no direct link found, it's considered "accepted" by default 
        // IF it has no acceptance requirements defined for it.
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

            // STEP 1: Auto-create acceptance stage BEFORE status calculation
            // This ensures calculateStatus() can see the newly created stage
            // and return 'pending_acceptance' instead of 'completed'
            //
            // BUSINESS RULE: Push individual child to acceptance the moment it hits 100%.
            // Stage is created on the parent (resolves recursively if child has parent),
            // and the corresponding item flips draft → submitted ("Đang nghiệm thu").
            if ($progress >= 99.9) {
                if (!$task->parent_id) {
                    $this->autoCreateAcceptanceStage($task);
                } else {
                    $this->pushChildToAcceptance($task);
                }
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

    /**
     * Auto-create acceptance stage on the parent (root) task.
     *
     * BUSINESS RULE:
     * - Stage always lives on a root task (parent_id = null).
     * - If a child is passed in, walk up to the root and create stage there.
     * - Items are created (draft) for all immediate children of the root.
     * - Idempotent: skips if stage already exists.
     *
     * @param ProjectTask $task
     * @return AcceptanceStage|null
     */
    protected function autoCreateAcceptanceStage(ProjectTask $task): ?AcceptanceStage
    {
        try {
            // Resolve up to root if a child was passed in
            while ($task->parent_id !== null) {
                $parent = ProjectTask::find($task->parent_id);
                if (!$parent) {
                    return null;
                }
                $task = $parent;
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

            // AUTO-CREATE acceptance items for each child task (Category B)
            $children = ProjectTask::where('parent_id', $task->id)
                ->whereNull('deleted_at')
                ->orderBy('order')
                ->get();

            $itemOrder = 0;
            foreach ($children as $child) {
                $itemOrder++;
                \App\Models\AcceptanceItem::create([
                    'acceptance_stage_id' => $stage->id,
                    'task_id' => $child->id,
                    'name' => $child->name,
                    'description' => $child->description,
                    'order' => $itemOrder,
                    'workflow_status' => 'draft',
                    'acceptance_status' => 'not_started',
                    'start_date' => $child->start_date ?? $task->start_date ?? now(),
                    'end_date' => $child->end_date ?? $task->end_date ?? now(),
                    'created_by' => $child->created_by,
                ]);
            }

            Log::info('Auto-created acceptance stage for completed task', [
                'task_id' => $task->id,
                'task_name' => $task->name,
                'stage_id' => $stage->id,
                'project_id' => $task->project_id,
                'items_created' => $itemOrder,
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

    /**
     * Public wrapper for autoCreateAcceptanceStage
     * Used by ProjectTaskService for manual override path
     */
    public function autoCreateAcceptanceStagePublic(ProjectTask $task): ?AcceptanceStage
    {
        return $this->autoCreateAcceptanceStage($task);
    }

    /**
     * Push a single child task into the acceptance flow when it hits 100%.
     *
     * BUSINESS RULE:
     * - Walk up to the root parent and ensure a stage exists.
     * - Find the AcceptanceItem linked to this child; if missing, create it
     *   (covers cases where the child was added after the stage was created).
     * - If item is in 'draft', flip to 'submitted' ("Đang nghiệm thu").
     * - Re-sync stage status via checkCompletion().
     */
    protected function pushChildToAcceptance(ProjectTask $child): void
    {
        try {
            if ($child->parent_id === null) {
                return;
            }

            // Resolve root parent
            $root = $child;
            while ($root->parent_id !== null) {
                $parent = ProjectTask::find($root->parent_id);
                if (!$parent) {
                    return;
                }
                $root = $parent;
            }

            // Ensure stage exists on root
            $stage = AcceptanceStage::where('task_id', $root->id)
                ->where('project_id', $root->project_id)
                ->first();
            if (!$stage) {
                $stage = $this->autoCreateAcceptanceStage($root);
                if (!$stage) {
                    return;
                }
            }

            // Find item for this child
            $item = \App\Models\AcceptanceItem::where('acceptance_stage_id', $stage->id)
                ->where('task_id', $child->id)
                ->first();

            // If item doesn't exist (child added after stage creation), create it
            if (!$item) {
                $maxOrder = (int) (\App\Models\AcceptanceItem::where('acceptance_stage_id', $stage->id)->max('order') ?? 0);
                $item = \App\Models\AcceptanceItem::create([
                    'acceptance_stage_id' => $stage->id,
                    'task_id' => $child->id,
                    'name' => $child->name,
                    'description' => $child->description,
                    'order' => $maxOrder + 1,
                    'workflow_status' => 'draft',
                    'acceptance_status' => 'not_started',
                    'start_date' => $child->start_date ?? $root->start_date ?? now(),
                    'end_date' => $child->end_date ?? $root->end_date ?? now(),
                    'created_by' => $child->created_by,
                ]);
            }

            // Flip draft → submitted ("Đang nghiệm thu")
            if ($item->workflow_status === 'draft') {
                $item->workflow_status = 'submitted';
                $item->submitted_at = now();
                $item->submitted_by = auth()->id() ?? $child->updated_by ?? $child->created_by;
                $item->save();

                $stage->checkCompletion();

                Log::info('Child task auto-pushed to acceptance (submitted)', [
                    'child_task_id' => $child->id,
                    'root_task_id' => $root->id,
                    'stage_id' => $stage->id,
                    'item_id' => $item->id,
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error pushing child to acceptance', [
                'child_task_id' => $child->id,
                'error' => $e->getMessage(),
            ]);
            // Don't throw — push to acceptance must not break progress recalculation
        }
    }
}

