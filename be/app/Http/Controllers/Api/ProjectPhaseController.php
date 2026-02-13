<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectPhase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ProjectPhaseController extends Controller
{
    protected $authService;

    public function __construct(\App\Services\AuthorizationService $authService)
    {
        $this->authService = $authService;
    }
    /**
     * Danh sách phases của dự án
     */
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, \App\Constants\Permissions::PROJECT_PHASE_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem giai đoạn của dự án này.'
            ], 403);
        }
        $phases = $project->phases()
            ->with([
                'tasks',
                'tasks.acceptanceStages', // Load acceptance stages for tasks
                'acceptanceStages', // Load acceptance stages for phase
                'creator', 
                'updater'
            ])
            ->ordered()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $phases
        ]);
    }

    /**
     * Tạo phase mới
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, \App\Constants\Permissions::PROJECT_PHASE_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo giai đoạn cho dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'order' => 'nullable|integer|min:0',
            'status' => ['nullable', Rule::in(['planning', 'in_progress', 'completed', 'cancelled'])],
        ]);

        try {
            DB::beginTransaction();

            // Auto-calculate order if not provided
            if (!isset($validated['order'])) {
                $maxOrder = $project->phases()->max('order') ?? -1;
                $validated['order'] = $maxOrder + 1;
            }

            $phase = ProjectPhase::create([
                'project_id' => $project->id,
                ...$validated,
                'status' => $validated['status'] ?? 'planning',
                'created_by' => $user->id,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Giai đoạn đã được tạo thành công.',
                'data' => $phase->load(['tasks', 'creator'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo giai đoạn.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Chi tiết phase
     */
    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, \App\Constants\Permissions::PROJECT_PHASE_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem chi tiết giai đoạn này.'
            ], 403);
        }

        $phase = ProjectPhase::where('project_id', $project->id)
            ->with(['tasks', 'project', 'creator', 'updater'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $phase
        ]);
    }

    /**
     * Cập nhật phase
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $phase = ProjectPhase::where('project_id', $project->id)->findOrFail($id);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, \App\Constants\Permissions::PROJECT_PHASE_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật giai đoạn của dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'order' => 'sometimes|integer|min:0',
            'status' => ['sometimes', Rule::in(['planning', 'in_progress', 'completed', 'cancelled'])],
        ]);

        $phase->update([
            ...$validated,
            'updated_by' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Giai đoạn đã được cập nhật.',
            'data' => $phase->fresh()->load(['tasks', 'creator', 'updater'])
        ]);
    }

    /**
     * Xóa phase
     */
    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $phase = ProjectPhase::where('project_id', $project->id)->findOrFail($id);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, \App\Constants\Permissions::PROJECT_PHASE_DELETE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa giai đoạn của dự án này.'
            ], 403);
        }

        // Check if phase has tasks
        if ($phase->tasks()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa giai đoạn vì còn công việc trong giai đoạn này.',
            ], 422);
        }

        $phase->delete();

        return response()->json([
            'success' => true,
            'message' => 'Giai đoạn đã được xóa.',
        ]);
    }

    /**
     * Sắp xếp lại thứ tự phases
     */
    public function reorder(Request $request, string $projectId)
    {
        $validated = $request->validate([
            'phases' => 'required|array',
            'phases.*.id' => 'required|exists:project_phases,id',
            'phases.*.order' => 'required|integer|min:0',
        ]);

        try {
            DB::beginTransaction();

            foreach ($validated['phases'] as $phaseData) {
                ProjectPhase::where('id', $phaseData['id'])
                    ->where('project_id', $projectId)
                    ->update(['order' => $phaseData['order']]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Thứ tự giai đoạn đã được cập nhật.',
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
}

