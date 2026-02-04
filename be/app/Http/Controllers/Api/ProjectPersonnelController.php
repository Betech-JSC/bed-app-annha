<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectPersonnel;
use App\Constants\Permissions;
use App\Services\AuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectPersonnelController extends Controller
{
    protected $authService;

    public function __construct(AuthorizationService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * Danh sách nhân sự
     */
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission với project context
        if (!$this->authService->can($user, Permissions::PERSONNEL_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem danh sách nhân sự của dự án này.'
            ], 403);
        }

        $personnel = $project->personnel()
            ->with(['user', 'assigner', 'personnelRole'])
            ->get();

        return response()->json([
            'success' => true,
            'data' => $personnel
        ]);
    }

    /**
     * Thêm nhân sự
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission với project context
        if (!$this->authService->can($user, Permissions::PERSONNEL_ASSIGN, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền gán nhân sự vào dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role_id' => 'required|exists:personnel_roles,id',
            'permissions' => 'nullable|array',
        ]);

        try {
            DB::beginTransaction();

            // Check if already assigned
            $exists = ProjectPersonnel::where('project_id', $project->id)
                ->where('user_id', $validated['user_id'])
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Người dùng đã được gán vào dự án này.'
                ], 400);
            }

            $personnel = ProjectPersonnel::create([
                'project_id' => $project->id,
                'assigned_by' => $user->id,
                ...$validated,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Nhân sự đã được thêm vào dự án.',
                'data' => $personnel->load(['user', 'assigner', 'personnelRole'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Xóa nhân sự
     */
    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $personnel = ProjectPersonnel::where('project_id', $project->id)->findOrFail($id);
        $user = auth()->user();

        // Check permission với project context
        if (!$this->authService->can($user, Permissions::PERSONNEL_REMOVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa nhân sự khỏi dự án này.'
            ], 403);
        }

        $personnel->delete();

        return response()->json([
            'success' => true,
            'message' => 'Nhân sự đã được xóa khỏi dự án.'
        ]);
    }
}
