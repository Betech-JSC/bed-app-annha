<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdditionalCost;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdditionalCostController extends Controller
{
    /**
     * Danh sách chi phí phát sinh
     */
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $costs = $project->additionalCosts()
            ->with(['proposer', 'approver', 'attachments'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $costs
        ]);
    }

    /**
     * Tạo chi phí phát sinh
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0',
            'description' => 'required|string|max:1000',
        ]);

        try {
            DB::beginTransaction();

            $cost = AdditionalCost::create([
                'project_id' => $project->id,
                'proposed_by' => $user->id,
                ...$validated,
                'status' => 'pending_approval',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Chi phí phát sinh đã được đề xuất.',
                'data' => $cost->load(['proposer'])
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
     * Duyệt chi phí phát sinh (khách hàng)
     */
    public function approve(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = AdditionalCost::where('project_id', $project->id)->findOrFail($id);

        $user = auth()->user();

        // Only customer can approve
        if ($project->customer_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ khách hàng mới có quyền duyệt.'
            ], 403);
        }

        if ($cost->status !== 'pending_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Chi phí không ở trạng thái chờ duyệt.'
            ], 400);
        }

        $cost->approve($user);

        return response()->json([
            'success' => true,
            'message' => 'Chi phí phát sinh đã được duyệt.',
            'data' => $cost->fresh()
        ]);
    }

    /**
     * Từ chối chi phí phát sinh
     */
    public function reject(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = AdditionalCost::where('project_id', $project->id)->findOrFail($id);

        $user = auth()->user();

        if ($project->customer_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ khách hàng mới có quyền từ chối.'
            ], 403);
        }

        $validated = $request->validate([
            'rejected_reason' => 'required|string|max:500',
        ]);

        $cost->reject($validated['rejected_reason']);

        return response()->json([
            'success' => true,
            'message' => 'Chi phí phát sinh đã bị từ chối.',
            'data' => $cost->fresh()
        ]);
    }
}
