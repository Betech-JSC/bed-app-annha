<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Services\TaskProgressService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

use App\Constants\Permissions;
use App\Services\AuthorizationService;

class ProjectTaskController extends Controller
{
    protected $authService;
    protected $taskService;

    public function __construct(
        AuthorizationService $authService,
        \App\Services\ProjectTaskService $taskService
    ) {
        $this->authService = $authService;
        $this->taskService = $taskService;
    }
    /**
     * Danh sách tasks của dự án
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, Permissions::PROJECT_TASK_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem công việc của dự án này.'
            ], 403);
        }

        $tasks = $this->taskService->getTasks($project, $request->only(['parent_id', 'status', 'assigned_to', 'leaf_only']));

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

        // Check permission
        if (!$this->authService->can($user, Permissions::PROJECT_TASK_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo công việc cho dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'phase_id' => 'nullable|exists:project_phases,id',
            'parent_id' => 'nullable|exists:project_tasks,id',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            // BUSINESS RULE: For work items (tasks with parents or specified as leaf), 
            // dates are strongly recommended. We keep them nullable at DB level 
            // but can enforce at UI/Controller level if needed.
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration' => 'nullable|integer|min:1',
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
            $task = $this->taskService->upsert(
                array_merge($validated, ['project_id' => $project->id]),
                null,
                $user
            );

            return response()->json([
                'success' => true,
                'message' => 'Công việc đã được tạo thành công.',
                'data' => $task->load(['parent', 'assignedUser', 'creator'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo công việc: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Chi tiết task
     */
    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, Permissions::PROJECT_TASK_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem công việc của dự án này.'
            ], 403);
        }

        $task = ProjectTask::where('project_id', $project->id)
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

        // Check permission
        if (!$this->authService->can($user, Permissions::PROJECT_TASK_UPDATE, $task->project_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật công việc của dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'phase_id' => 'nullable|exists:project_phases,id',
            'parent_id' => 'nullable|exists:project_tasks,id',
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            // BUSINESS RULE: For work items (tasks with parents or specified as leaf), 
            // dates are strongly recommended for progress and acceptance tracking.
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration' => 'nullable|integer|min:1',
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
            $descendantIds = $this->taskService->getDescendantIds($task);
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

        try {
            $this->taskService->upsert($validated, $task, $user);

            return response()->json([
                'success' => true,
                'message' => 'Công việc đã được cập nhật.',
                'data' => $task->fresh()->load([
                    'parent',
                    'assignedUser',
                    'dependencies.dependsOnTask',
                    'creator',
                    'updater',
                    'acceptanceStages',
                ])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật công việc: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Xóa task
     */
    public function destroy(string $projectId, string $id)
    {
        $task = ProjectTask::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, Permissions::PROJECT_TASK_DELETE, $task->project_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa công việc của dự án này.'
            ], 403);
        }

        try {
            $this->taskService->delete($task);
            return response()->json([
                'success' => true,
                'message' => 'Công việc đã được xóa.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa công việc: ' . $e->getMessage(),
            ], 422);
        }
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
            $this->taskService->reorderTasks((int)$projectId, $validated['tasks']);

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
     * Recalculate all tasks progress for a project
     * 
     * This ensures all progress_percentage values are up-to-date from Daily Logs
     */
    public function recalculateAll(string $projectId)
    {
        $project = Project::findOrFail($projectId);

        try {
            $this->taskService->recalculateProject((int)$projectId);

            return response()->json([
                'success' => true,
                'message' => 'Đã tính toán lại tiến độ cho tất cả công việc.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
            ], 500);
        }
    }
}
