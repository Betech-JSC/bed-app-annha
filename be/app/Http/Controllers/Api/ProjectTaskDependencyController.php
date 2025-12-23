<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\ProjectTaskDependency;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProjectTaskDependencyController extends Controller
{
    /**
     * Tạo dependency mới
     */
    public function store(Request $request, string $projectId, string $taskId)
    {
        $project = Project::findOrFail($projectId);
        $task = ProjectTask::where('project_id', $projectId)->findOrFail($taskId);

        $validated = $request->validate([
            'depends_on_task_id' => 'required|exists:project_tasks,id',
            'dependency_type' => ['nullable', Rule::in(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish'])],
        ]);

        // Validate depends_on_task belongs to same project
        $dependsOnTask = ProjectTask::where('project_id', $projectId)
            ->find($validated['depends_on_task_id']);
        
        if (!$dependsOnTask) {
            return response()->json([
                'success' => false,
                'message' => 'Công việc phụ thuộc không thuộc dự án này.',
            ], 422);
        }

        // Check if task cannot depend on itself
        if ($task->id == $validated['depends_on_task_id']) {
            return response()->json([
                'success' => false,
                'message' => 'Công việc không thể phụ thuộc vào chính nó.',
            ], 422);
        }

        // Check for circular dependency
        if (!ProjectTaskDependency::validateCircular($task->id, $validated['depends_on_task_id'])) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo phụ thuộc vì sẽ tạo vòng lặp phụ thuộc.',
            ], 422);
        }

        // Check if dependency already exists
        $existing = ProjectTaskDependency::where('task_id', $task->id)
            ->where('depends_on_task_id', $validated['depends_on_task_id'])
            ->first();

        if ($existing) {
            return response()->json([
                'success' => false,
                'message' => 'Phụ thuộc này đã tồn tại.',
            ], 422);
        }

        try {
            DB::beginTransaction();

            $dependency = ProjectTaskDependency::create([
                'task_id' => $task->id,
                'depends_on_task_id' => $validated['depends_on_task_id'],
                'dependency_type' => $validated['dependency_type'] ?? 'finish_to_start',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Phụ thuộc đã được tạo thành công.',
                'data' => $dependency->load(['dependsOnTask'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo phụ thuộc.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Xóa dependency
     */
    public function destroy(string $projectId, string $taskId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $task = ProjectTask::where('project_id', $projectId)->findOrFail($taskId);
        
        $dependency = ProjectTaskDependency::where('task_id', $task->id)
            ->findOrFail($id);

        $dependency->delete();

        return response()->json([
            'success' => true,
            'message' => 'Phụ thuộc đã được xóa.',
        ]);
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

