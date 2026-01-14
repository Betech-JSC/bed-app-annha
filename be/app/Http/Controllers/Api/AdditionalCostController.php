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
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            DB::beginTransaction();

            $attachmentIds = $validated['attachment_ids'] ?? [];
            unset($validated['attachment_ids']);

            $cost = AdditionalCost::create([
                'project_id' => $project->id,
                'proposed_by' => $user->id,
                ...$validated,
                'status' => 'pending_approval',
            ]);

            // Đính kèm files nếu có
            if (!empty($attachmentIds)) {
                foreach ($attachmentIds as $attachmentId) {
                    $attachment = \App\Models\Attachment::find($attachmentId);
                    if ($attachment && ($attachment->uploaded_by === $user->id || $user->role === 'admin' || $user->owner === true)) {
                        $attachment->update([
                            'attachable_type' => AdditionalCost::class,
                            'attachable_id' => $cost->id,
                        ]);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Chi phí phát sinh đã được đề xuất.',
                'data' => $cost->load(['proposer', 'attachments'])
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

        // Check RBAC permission
        if (!$user->owner && !$user->hasPermission(\App\Constants\Permissions::ADDITIONAL_COST_APPROVE)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt chi phí phát sinh.'
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

        // Check RBAC permission
        if (!$user->owner && !$user->hasPermission(\App\Constants\Permissions::ADDITIONAL_COST_REJECT)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối chi phí phát sinh.'
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

    /**
     * Chi tiết chi phí phát sinh
     */
    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = AdditionalCost::where('project_id', $project->id)
            ->with(['proposer', 'approver', 'attachments'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $cost
        ]);
    }

    /**
     * Đính kèm file vào chi phí phát sinh
     */
    public function attachFiles(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = AdditionalCost::where('project_id', $project->id)->findOrFail($id);
        $user = auth()->user();

        $validated = $request->validate([
            'attachment_ids' => 'required|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            DB::beginTransaction();

            $attached = [];
            foreach ($validated['attachment_ids'] as $attachmentId) {
                $attachment = \App\Models\Attachment::find($attachmentId);
                if ($attachment && ($attachment->uploaded_by === $user->id || $user->role === 'admin' || $user->owner === true)) {
                    $attachment->update([
                        'attachable_type' => AdditionalCost::class,
                        'attachable_id' => $cost->id,
                    ]);
                    $attached[] = $attachment;
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã đính kèm ' . count($attached) . ' file.',
                'data' => $cost->fresh(['attachments'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi đính kèm file.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
