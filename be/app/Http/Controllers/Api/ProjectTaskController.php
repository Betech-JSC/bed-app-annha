<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Services\TaskProgressService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProjectTaskController extends Controller
{
    /**
     * Danh sách tasks của dự án
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);

        $query = $project->tasks()
            ->with([
                'parent',
                'children',
                'assignedUser',
                'dependencies.dependsOnTask',
                'creator',
                'updater',
                'acceptanceStages', // Load acceptance stages for task (parent tasks only)
            ]);

        // Filter by parent task (parent tasks act as "phases")
        if ($parentId = $request->query('parent_id')) {
            if ($parentId === 'null' || $parentId === '') {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', $parentId);
            }
        }

        // Filter by status
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Filter by assigned_to
        if ($assignedTo = $request->query('assigned_to')) {
            $query->where('assigned_to', $assignedTo);
        }

        // BUSINESS RULE: For Daily Log, only return leaf tasks (tasks without children)
        // Parent tasks (A) progress is auto-calculated from children
        if ($request->query('leaf_only') === 'true') {
            $allTasks = $query->ordered()->get();
            $taskIdsWithChildren = $allTasks->pluck('id')->toArray();
            $tasksWithChildren = $allTasks->filter(function ($task) use ($allTasks) {
                return $allTasks->where('parent_id', $task->id)->count() > 0;
            })->pluck('id')->toArray();

            // Filter to only tasks that don't have children
            $tasks = $allTasks->filter(function ($task) use ($tasksWithChildren) {
                return !in_array($task->id, $tasksWithChildren);
            })->values();
        } else {
            $tasks = $query->ordered()->get();
        }

        return response()->json([
            'success' => true,
            'data' => $tasks
        ]);
    }

    /**
     * Tạo task mới
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        $validated = $request->validate([
            'phase_id' => 'nullable|exists:project_phases,id',
            'parent_id' => 'nullable|exists:project_tasks,id', // For hierarchical structure
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration' => 'nullable|integer|min:1',
            // BUSINESS RULE: progress_percentage and status are NOT editable
            // They are calculated from Daily Logs and dates automatically
            // 'progress_percentage' => REMOVED - calculated from logs only
            // 'status' => REMOVED - auto-calculated based on dates and progress
            'priority' => ['nullable', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'assigned_to' => 'nullable|exists:users,id',
            'order' => 'nullable|integer|min:0',
        ]);

        // Validate parent belongs to project and prevent circular reference
        if (isset($validated['parent_id'])) {
            $parent = $project->tasks()->find($validated['parent_id']);
            if (!$parent) {
                return response()->json([
                    'success' => false,
                    'message' => 'Công việc cha không thuộc dự án này.',
                ], 422);
            }
            // Prevent task from being its own parent
            // (circular check will be done after creation)
        }

        // BUSINESS RULE: Parent tasks cannot exist alone for execution
        // If creating a parent task (has parent_id = null and will have children),
        // we allow it, but it must have children to be executable
        // This validation happens after creation when children are added

        try {
            DB::beginTransaction();

            // Auto-calculate order if not provided
            if (!isset($validated['order'])) {
                $maxOrder = $project->tasks()
                    ->where('parent_id', $validated['parent_id'] ?? null)
                    ->max('order') ?? -1;
                $validated['order'] = $maxOrder + 1;
            }

            // BUSINESS RULE: progress_percentage and status are system-calculated
            // Initialize with 0 and 'not_started', will be calculated from logs
            $task = ProjectTask::create([
                'project_id' => $project->id,
                ...$validated,
                'status' => 'not_started', // Will be auto-calculated
                'priority' => $validated['priority'] ?? 'medium',
                'progress_percentage' => 0, // Will be calculated from logs
                'created_by' => $user->id,
            ]);

            // Prevent circular parent reference
            if ($task->parent_id) {
                $parent = ProjectTask::find($task->parent_id);
                if ($parent && $parent->parent_id === $task->id) {
                    DB::rollBack();
                    return response()->json([
                        'success' => false,
                        'message' => 'Không thể tạo quan hệ cha-con vòng tròn.',
                    ], 422);
                }
            }

            // Auto-calculate duration if dates are set
            if ($task->start_date && $task->end_date && !$task->duration) {
                $task->updateDuration();
            }

            // Calculate initial progress and status from logs (if any)
            $service = app(TaskProgressService::class);
            $service->updateTaskFromLogs($task, true);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Công việc đã được tạo thành công.',
                'data' => $task->load(['parent', 'assignedUser', 'creator'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo công việc.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Chi tiết task
     */
    public function show(string $projectId, string $id)
    {
        $task = ProjectTask::where('project_id', $projectId)
            ->with([
                'parent',
                'children',
                'assignedUser',
                'dependencies.dependsOnTask',
                'dependents.task',
                'project',
                'creator',
                'updater',
                'acceptanceStages', // BUSINESS RULE: Load acceptance stages linked to this task
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $task
        ]);
    }

    /**
     * Cập nhật task
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $task = ProjectTask::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        $validated = $request->validate([
            'phase_id' => 'nullable|exists:project_phases,id',
            'parent_id' => 'nullable|exists:project_tasks,id', // For hierarchical structure
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration' => 'nullable|integer|min:1',
            // BUSINESS RULE: progress_percentage and status are NOT editable
            // They are calculated from Daily Logs and dates automatically
            // 'progress_percentage' => REMOVED - calculated from logs only
            // 'status' => REMOVED - auto-calculated based on dates and progress
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'assigned_to' => 'nullable|exists:users,id',
            'order' => 'sometimes|integer|min:0',
        ]);

        // Validate parent belongs to project and prevent circular reference
        if (isset($validated['parent_id'])) {
            $parent = $task->project->tasks()->find($validated['parent_id']);
            if (!$parent) {
                return response()->json([
                    'success' => false,
                    'message' => 'Công việc cha không thuộc dự án này.',
                ], 422);
            }
            // Prevent task from being its own parent or creating circular reference
            if ($validated['parent_id'] == $task->id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Công việc không thể là cha của chính nó.',
                ], 422);
            }
            // Check if parent is a descendant of this task (would create cycle)
            $descendantIds = $this->getDescendantIds($task);
            if (in_array($validated['parent_id'], $descendantIds)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể tạo quan hệ cha-con vòng tròn.',
                ], 422);
            }
        }

        // BUSINESS RULE: If removing parent_id (making task a root), check if it has children
        // Parent tasks cannot exist alone - they must have children to be executable
        if ($task->parent_id && !isset($validated['parent_id'])) {
            // Task is being made a root task
            $hasChildren = ProjectTask::where('parent_id', $task->id)
                ->whereNull('deleted_at')
                ->exists();
            if ($hasChildren) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể chuyển công việc cha thành công việc gốc khi còn có công việc con.',
                ], 422);
            }
        }

        $task->update([
            ...$validated,
            'updated_by' => $user->id,
        ]);

        // Auto-calculate duration if dates are set
        if ($task->start_date && $task->end_date) {
            $task->updateDuration();
        }

        // Note: Acceptance stages phase_id sync is handled by ProjectTask model event
        // No need to duplicate here to avoid double sync

        // Recalculate progress and status when dates or parent changes
        if ($task->wasChanged(['start_date', 'end_date', 'parent_id'])) {
            $service = app(TaskProgressService::class);
            $service->updateTaskFromLogs($task, true);
        }

        return response()->json([
            'success' => true,
            'message' => 'Công việc đã được cập nhật.',
            'data' => $task->fresh()->load([
                'parent',
                'assignedUser',
                'dependencies.dependsOnTask',
                'creator',
                'updater',
                'acceptanceStages', // BUSINESS RULE: Load acceptance stages linked to this task
            ])
        ]);
    }

    /**
     * Xóa task
     */
    public function destroy(string $projectId, string $id)
    {
        $task = ProjectTask::where('project_id', $projectId)->findOrFail($id);

        // Check if task has dependencies
        if ($task->dependencies()->count() > 0 || $task->dependents()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa công việc vì có phụ thuộc với công việc khác.',
            ], 422);
        }

        $task->delete();

        return response()->json([
            'success' => true,
            'message' => 'Công việc đã được xóa.',
        ]);
    }

    /**
     * Sắp xếp lại thứ tự tasks
     */
    public function reorder(Request $request, string $projectId)
    {
        $validated = $request->validate([
            'tasks' => 'required|array',
            'tasks.*.id' => 'required|exists:project_tasks,id',
            'tasks.*.order' => 'required|integer|min:0',
        ]);

        try {
            DB::beginTransaction();

            foreach ($validated['tasks'] as $taskData) {
                ProjectTask::where('id', $taskData['id'])
                    ->where('project_id', $projectId)
                    ->update(['order' => $taskData['order']]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Thứ tự công việc đã được cập nhật.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi cập nhật thứ tự.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cập nhật tiến độ task
     * 
     * DEPRECATED: Progress percentage is now ONLY calculated from Daily Logs
     * This endpoint is kept for backward compatibility but will recalculate from logs
     */
    public function updateProgress(Request $request, string $projectId, string $id)
    {
        $task = ProjectTask::where('project_id', $projectId)->findOrFail($id);

        // BUSINESS RULE: Progress is calculated from Daily Logs only
        // Recalculate from logs instead of accepting manual input
        $service = app(TaskProgressService::class);
        $service->updateTaskFromLogs($task, true);

        return response()->json([
            'success' => true,
            'message' => 'Tiến độ công việc đã được tính toán lại từ nhật ký thi công.',
            'data' => $task->fresh()
        ]);
    }

    /**
     * Get all descendant task IDs (for circular reference check)
     */
    private function getDescendantIds(ProjectTask $task): array
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
