<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectRisk;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ProjectRiskController extends Controller
{
    use ApiAuthorization;

    protected $riskService;

    public function __construct(\App\Services\ProjectRiskService $riskService)
    {
        $this->riskService = $riskService;
    }
    /**
     * Danh sách rủi ro của project
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire($request->user(), Permissions::PROJECT_RISK_VIEW, $project);

        $risks = $this->riskService->getRisks($project, $request->only(['status', 'category', 'risk_level', 'active_only']));

        return response()->json([
            'success' => true,
            'data' => $risks
        ]);
    }

    /**
     * Tạo rủi ro mới
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        $this->apiRequire($user, Permissions::PROJECT_RISK_CREATE, $project);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'category' => 'required|in:schedule,cost,quality,scope,resource,technical,external,other',
            'probability' => 'required|in:very_low,low,medium,high,very_high',
            'impact' => 'required|in:very_low,low,medium,high,very_high',
            'risk_type' => 'nullable|in:threat,opportunity',
            'mitigation_plan' => 'nullable|string|max:5000',
            'contingency_plan' => 'nullable|string|max:5000',
            'owner_id' => 'nullable|exists:users,id',
            'target_resolution_date' => 'nullable|date',
        ]);

        try {
            $risk = $this->riskService->upsert(
                array_merge($validated, ['project_id' => $project->id]),
                null,
                $user
            );

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo rủi ro mới',
                'data' => $risk
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo rủi ro: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Chi tiết rủi ro
     */
    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire(auth()->user(), Permissions::PROJECT_RISK_VIEW, $project);

        $risk = $project->risks()->with(['owner', 'identifier', 'updater'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $risk
        ]);
    }

    /**
     * Cập nhật rủi ro
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $risk = $project->risks()->findOrFail($id);
        $user = auth()->user();
        $this->apiRequire($user, Permissions::PROJECT_RISK_UPDATE, $project);

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'category' => 'sometimes|required|in:schedule,cost,quality,scope,resource,technical,external,other',
            'probability' => 'sometimes|required|in:very_low,low,medium,high,very_high',
            'impact' => 'sometimes|required|in:very_low,low,medium,high,very_high',
            'status' => 'sometimes|required|in:identified,analyzed,mitigated,monitored,closed',
            'risk_type' => 'nullable|in:threat,opportunity',
            'mitigation_plan' => 'nullable|string|max:5000',
            'contingency_plan' => 'nullable|string|max:5000',
            'owner_id' => 'nullable|exists:users,id',
            'target_resolution_date' => 'nullable|date',
        ]);

        try {
            $this->riskService->upsert($validated, $risk, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật rủi ro',
                'data' => $risk->fresh(['owner', 'identifier', 'updater'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật rủi ro: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Xóa rủi ro
     */
    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire(auth()->user(), Permissions::PROJECT_RISK_DELETE, $project);

        $risk = $project->risks()->findOrFail($id);

        try {
            $risk->delete();

            return response()->json([
                'success' => true,
                'message' => 'Đã xóa rủi ro'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa rủi ro: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Đánh dấu rủi ro đã được giải quyết
     */
    public function markAsResolved(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire(auth()->user(), Permissions::PROJECT_RISK_UPDATE, $project);

        $risk = $project->risks()->findOrFail($id);

        try {
            $this->riskService->resolve($risk);

            return response()->json([
                'success' => true,
                'message' => 'Đã đánh dấu rủi ro đã được giải quyết',
                'data' => $risk->fresh(['owner', 'identifier'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể đánh dấu rủi ro: ' . $e->getMessage()
            ], 500);
        }
    }
}
