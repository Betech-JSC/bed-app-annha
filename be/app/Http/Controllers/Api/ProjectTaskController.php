<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectTask;
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
            ->with(['phase', 'assignedUser', 'dependencies.dependsOnTask', 'creator', 'updater']);

        // Filter by phase
        if ($phaseId = $request->query('phase_id')) {
            if ($phaseId === 'null') {
                $query->whereNull('phase_id');
            } else {
                $query->where('phase_id', $phaseId);
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

        $tasks = $query->ordered()->get();

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
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration' => 'nullable|integer|min:1',
            'progress_percentage' => 'nullable|numeric|min:0|max:100',
            'status' => ['nullable', Rule::in(['not_started', 'in_progress', 'completed', 'cancelled', 'on_hold'])],
            'priority' => ['nullable', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'assigned_to' => 'nullable|exists:users,id',
            'order' => 'nullable|integer|min:0',
        ]);

        // Validate phase belongs to project
        if (isset($validated['phase_id'])) {
            $phase = $project->phases()->find($validated['phase_id']);
            if (!$phase) {
                return response()->json([
                    'success' => false,
                    'message' => 'Giai đoạn không thuộc dự án này.',
                ], 422);
            }
        }

        try {
            DB::beginTransaction();

            // Auto-calculate order if not provided
            if (!isset($validated['order'])) {
                $maxOrder = $project->tasks()
                    ->where('phase_id', $validated['phase_id'] ?? null)
                    ->max('order') ?? -1;
                $validated['order'] = $maxOrder + 1;
            }

            $task = ProjectTask::create([
                'project_id' => $project->id,
                ...$validated,
                'status' => $validated['status'] ?? 'not_started',
                'priority' => $validated['priority'] ?? 'medium',
                'progress_percentage' => $validated['progress_percentage'] ?? 0,
                'created_by' => $user->id,
            ]);

            // Auto-calculate duration if dates are set
            if ($task->start_date && $task->end_date && !$task->duration) {
                $task->updateDuration();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Công việc đã được tạo thành công.',
                'data' => $task->load(['phase', 'assignedUser', 'creator'])
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
                'phase',
                'assignedUser',
                'dependencies.dependsOnTask',
                'dependents.task',
                'project',
                'creator',
                'updater'
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
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration' => 'nullable|integer|min:1',
            'progress_percentage' => 'sometimes|numeric|min:0|max:100',
            'status' => ['sometimes', Rule::in(['not_started', 'in_progress', 'completed', 'cancelled', 'on_hold'])],
            'priority' => ['sometimes', Rule::in(['low', 'medium', 'high', 'urgent'])],
            'assigned_to' => 'nullable|exists:users,id',
            'order' => 'sometimes|integer|min:0',
        ]);

        // Validate phase belongs to project
        if (isset($validated['phase_id'])) {
            $phase = $task->project->phases()->find($validated['phase_id']);
            if (!$phase) {
                return response()->json([
                    'success' => false,
                    'message' => 'Giai đoạn không thuộc dự án này.',
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

        return response()->json([
            'success' => true,
            'message' => 'Công việc đã được cập nhật.',
            'data' => $task->fresh()->load(['phase', 'assignedUser', 'dependencies.dependsOnTask', 'creator', 'updater'])
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
     */
    public function updateProgress(Request $request, string $projectId, string $id)
    {
        $task = ProjectTask::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        $validated = $request->validate([
            'progress_percentage' => 'required|numeric|min:0|max:100',
        ]);

        $task->update([
            'progress_percentage' => $validated['progress_percentage'],
            'updated_by' => $user->id,
        ]);

        // Auto-update status based on progress
        if ($task->progress_percentage == 100 && $task->status !== 'completed') {
            $task->update(['status' => 'completed']);
        } elseif ($task->progress_percentage > 0 && $task->progress_percentage < 100 && $task->status === 'not_started') {
            $task->update(['status' => 'in_progress']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Tiến độ công việc đã được cập nhật.',
            'data' => $task->fresh()
        ]);
    }
}

