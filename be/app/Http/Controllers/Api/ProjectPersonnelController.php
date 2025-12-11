<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectPersonnel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectPersonnelController extends Controller
{
    /**
     * Danh sách nhân sự
     */
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $personnel = $project->personnel()
            ->with(['user', 'assigner'])
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

        // Check permission
        $canAssign = $project->customer_id === $user->id
            || $project->project_manager_id === $user->id
            || $project->personnel()->where('user_id', $user->id)->whereIn('role', ['project_manager', 'supervisor'])->exists();

        if (!$canAssign) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền gán nhân sự.'
            ], 403);
        }

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => [
                'required',
                'in:project_manager,supervisor,accountant,viewer,editor,management,team_leader,worker,guest,supervisor_guest,designer'
            ],
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
                'data' => $personnel->load(['user', 'assigner'])
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

        // Check permission
        $canRemove = $project->customer_id === $user->id
            || $project->project_manager_id === $user->id;

        if (!$canRemove) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa nhân sự.'
            ], 403);
        }

        // Cannot remove customer or project manager
        if ($personnel->user_id === $project->customer_id || $personnel->user_id === $project->project_manager_id) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa chủ dự án hoặc quản lý dự án.'
            ], 400);
        }

        $personnel->delete();

        return response()->json([
            'success' => true,
            'message' => 'Nhân sự đã được xóa khỏi dự án.'
        ]);
    }
}
