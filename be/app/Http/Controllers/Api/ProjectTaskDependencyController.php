<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\ProjectTaskDependency;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProjectTaskDependencyController extends Controller
{
    use ApiAuthorization;

    protected $taskService;

    public function __construct(\App\Services\ProjectTaskService $taskService)
    {
        $this->taskService = $taskService;
    }
    /**
     * Tạo dependency mới
     */
    public function store(Request $request, string $projectId, string $taskId)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire($request->user(), Permissions::PROJECT_TASK_UPDATE, $project);

        $task = ProjectTask::where('project_id', $projectId)->findOrFail($taskId);

        $validated = $request->validate([
            'depends_on_task_id' => 'required|exists:project_tasks,id',
            'dependency_type' => ['nullable', Rule::in(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'])],
        ]);

        try {
            $dependency = $this->taskService->addDependency(
                $task,
                $validated['depends_on_task_id'],
                $validated['dependency_type'] ?? 'finish_to_start'
            );

            return response()->json([
                'success' => true,
                'message' => 'Phụ thuộc đã được tạo thành công.',
                'data' => $dependency->load(['dependsOnTask'])
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo phụ thuộc: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Xóa dependency
     */
    public function destroy(string $projectId, string $taskId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire(auth()->user(), Permissions::PROJECT_TASK_UPDATE, $project);

        try {
            $this->taskService->removeDependency((int)$id);

            return response()->json([
                'success' => true,
                'message' => 'Phụ thuộc đã được xóa.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Validate circular dependency (utility endpoint)
     */
    public function validateCircular(Request $request, string $projectId, string $taskId)
    {
        $validated = $request->validate([
            'depends_on_task_id' => 'required|exists:project_tasks,id',
        ]);

        $isValid = ProjectTaskDependency::validateCircular($taskId, $validated['depends_on_task_id']);

        return response()->json([
            'success' => true,
            'is_valid' => $isValid,
            'message' => $isValid 
                ? 'Không có vòng lặp phụ thuộc.' 
                : 'Có vòng lặp phụ thuộc.',
        ]);
    }
}

