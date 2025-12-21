<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Team;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class TeamController extends Controller
{
    /**
     * Danh sách đội/tổ
     */
    public function index(Request $request)
    {
        $query = Team::with(['teamLeader', 'project', 'subcontractor', 'members']);

        // Filter by project
        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }

        // Filter by type
        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }

        // Filter by status
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Search
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $teams = $query->orderByDesc('created_at')->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $teams
        ]);
    }

    /**
     * Chi tiết đội/tổ
     */
    public function show(string $id)
    {
        $team = Team::with([
            'teamLeader',
            'project',
            'subcontractor',
            'members',
            'contracts',
            'workVolumes'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $team
        ]);
    }

    /**
     * Tạo đội/tổ mới
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:teams,code',
            'type' => ['required', Rule::in(['team', 'subcontractor'])],
            'project_id' => 'nullable|exists:projects,id',
            'team_leader_id' => 'nullable|exists:users,id',
            'subcontractor_id' => 'nullable|exists:subcontractors,id',
            'description' => 'nullable|string',
            'member_ids' => 'nullable|array',
            'member_ids.*' => 'exists:users,id',
        ]);

        try {
            DB::beginTransaction();

            $team = Team::create([
                'name' => $validated['name'],
                'code' => $validated['code'] ?? null,
                'type' => $validated['type'],
                'project_id' => $validated['project_id'] ?? null,
                'team_leader_id' => $validated['team_leader_id'] ?? null,
                'subcontractor_id' => $validated['subcontractor_id'] ?? null,
                'description' => $validated['description'] ?? null,
                'member_count' => count($validated['member_ids'] ?? []),
                'status' => 'active',
            ]);

            // Add members
            if (!empty($validated['member_ids'])) {
                foreach ($validated['member_ids'] as $userId) {
                    $role = $userId == $validated['team_leader_id'] ? 'leader' : 'member';
                    $team->addMember(User::find($userId), $role);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đội/tổ đã được tạo thành công.',
                'data' => $team->load(['teamLeader', 'members', 'project'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo đội/tổ.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Cập nhật đội/tổ
     */
    public function update(Request $request, string $id)
    {
        $team = Team::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('teams', 'code')->ignore($team->id)],
            'type' => ['sometimes', Rule::in(['team', 'subcontractor'])],
            'project_id' => 'nullable|exists:projects,id',
            'team_leader_id' => 'nullable|exists:users,id',
            'subcontractor_id' => 'nullable|exists:subcontractors,id',
            'description' => 'nullable|string',
            'status' => ['sometimes', Rule::in(['active', 'inactive', 'disbanded'])],
        ]);

        $team->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Đội/tổ đã được cập nhật.',
            'data' => $team->fresh(['teamLeader', 'members', 'project'])
        ]);
    }

    /**
     * Xóa đội/tổ
     */
    public function destroy(string $id)
    {
        $team = Team::findOrFail($id);
        $team->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đội/tổ đã được xóa.'
        ]);
    }

    /**
     * Thêm thành viên vào đội
     */
    public function addMember(Request $request, string $id)
    {
        $team = Team::findOrFail($id);
        
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role' => ['sometimes', Rule::in(['member', 'deputy_leader', 'leader'])],
        ]);

        $team->addMember(User::find($validated['user_id']), $validated['role'] ?? 'member');

        return response()->json([
            'success' => true,
            'message' => 'Đã thêm thành viên vào đội.',
            'data' => $team->fresh(['members'])
        ]);
    }

    /**
     * Xóa thành viên khỏi đội
     */
    public function removeMember(Request $request, string $id)
    {
        $team = Team::findOrFail($id);
        
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $team->removeMember(User::find($validated['user_id']));

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa thành viên khỏi đội.',
            'data' => $team->fresh(['members'])
        ]);
    }
}
