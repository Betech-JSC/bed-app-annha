<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectRisk;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ProjectRiskController extends Controller
{
    /**
     * Danh sách rủi ro của project
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);

        $query = $project->risks()
            ->with([
                'owner',
                'identifier',
                'updater',
            ]);

        // Filter by status
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Filter by category
        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        // Filter by risk level
        if ($riskLevel = $request->query('risk_level')) {
            if ($riskLevel === 'high') {
                $query->highRisk();
            }
        }

        // Filter active only
        if ($request->query('active_only') === 'true') {
            $query->active();
        }

        $risks = $query->orderByDesc('created_at')->get();

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
            $risk = ProjectRisk::create([
                'project_id' => $project->id,
                'title' => $validated['title'],
                'description' => $validated['description'] ?? null,
                'category' => $validated['category'],
                'probability' => $validated['probability'],
                'impact' => $validated['impact'],
                'risk_type' => $validated['risk_type'] ?? 'threat',
                'status' => 'identified',
                'mitigation_plan' => $validated['mitigation_plan'] ?? null,
                'contingency_plan' => $validated['contingency_plan'] ?? null,
                'owner_id' => $validated['owner_id'] ?? null,
                'identified_date' => now(),
                'target_resolution_date' => $validated['target_resolution_date'] ?? null,
                'identified_by' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo rủi ro mới',
                'data' => $risk->load(['owner', 'identifier'])
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
            $risk->update(array_merge($validated, [
                'updated_by' => $user->id,
            ]));

            // Nếu status là closed, đánh dấu resolved
            if (isset($validated['status']) && $validated['status'] === 'closed' && !$risk->resolved_date) {
                $risk->markAsResolved();
            }

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
        $risk = $project->risks()->findOrFail($id);

        try {
            $risk->markAsResolved();

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
