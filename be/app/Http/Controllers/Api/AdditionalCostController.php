<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdditionalCost;
use App\Models\Project;
use App\Constants\Permissions;
use App\Services\NotificationService;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdditionalCostController extends Controller
{
    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Danh sách chi phí phát sinh
     */
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check RBAC permission
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(\App\Constants\Permissions::ADDITIONAL_COST_VIEW)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem chi phí phát sinh. Cần quyền: ' . \App\Constants\Permissions::ADDITIONAL_COST_VIEW
            ], 403);
        }

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

        // Check RBAC permission
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(\App\Constants\Permissions::ADDITIONAL_COST_CREATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo chi phí phát sinh. Cần quyền: ' . \App\Constants\Permissions::ADDITIONAL_COST_CREATE
            ], 403);
        }

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
                'status' => 'pending',
            ]);

            // Đính kèm files nếu có
            if (!empty($attachmentIds)) {
                foreach ($attachmentIds as $attachmentId) {
                    $attachment = \App\Models\Attachment::find($attachmentId);
                    if ($attachment && ($attachment->uploaded_by === $user->id || $user->hasPermission(\App\Constants\Permissions::SETTINGS_MANAGE))) {
                        $attachment->update([
                            'attachable_type' => AdditionalCost::class,
                            'attachable_id' => $cost->id,
                        ]);
                    }
                }
            }

            DB::commit();

            // Notify accountants/managers about new additional cost
            $this->notificationService->sendToPermissionUsers(
                Permissions::ADDITIONAL_COST_CONFIRM,
                $project->id,
                Notification::TYPE_WORKFLOW,
                Notification::CATEGORY_WORKFLOW_APPROVAL,
                "Yêu cầu chi phí phát sinh mới",
                "Có một yêu cầu chi phí phát sinh mới cho dự án '{$project->name}' với số tiền " . number_format($cost->amount) . " VND.",
                [
                    'project_id' => $project->id,
                    'cost_id' => $cost->id,
                ],
                Notification::PRIORITY_MEDIUM,
                "/projects/{$project->id}/costs"
            );

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
     * Khách hàng đánh dấu đã thanh toán (upload chứng từ + nhập thông tin)
     */
    public function markAsPaidByCustomer(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = AdditionalCost::where('project_id', $project->id)->findOrFail($id);

        $user = auth()->user();

        // Check RBAC permission
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(\App\Constants\Permissions::ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền đánh dấu đã thanh toán. Cần quyền: ' . \App\Constants\Permissions::ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER
            ], 403);
        }

        if ($cost->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể đánh dấu đã thanh toán khi chi phí ở trạng thái chờ thanh toán.'
            ], 400);
        }

        $validated = $request->validate([
            'paid_date' => 'nullable|date',
            'actual_amount' => 'nullable|numeric|min:0',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            DB::beginTransaction();

            // Đính kèm files nếu có
            if (!empty($validated['attachment_ids'])) {
                foreach ($validated['attachment_ids'] as $attachmentId) {
                    $attachment = \App\Models\Attachment::find($attachmentId);
                    if ($attachment && ($attachment->uploaded_by === $user->id || $user->hasPermission(\App\Constants\Permissions::SETTINGS_MANAGE))) {
                        $attachment->update([
                            'attachable_type' => AdditionalCost::class,
                            'attachable_id' => $cost->id,
                        ]);
                    }
                }
            }

            // Đánh dấu đã thanh toán
            $cost->markAsPaidByCustomer(
                $user,
                $validated['paid_date'] ?? null,
                $validated['actual_amount'] ?? null
            );

            // Notify accountants
            $this->notificationService->sendToPermissionUsers(
                Permissions::ADDITIONAL_COST_CONFIRM,
                $project->id,
                Notification::TYPE_WORKFLOW,
                Notification::CATEGORY_WORKFLOW_APPROVAL,
                "Khách hàng đã thanh toán chi phí phát sinh",
                "Khách hàng đã đánh dấu thanh toán chi phí phát sinh cho dự án '{$project->name}'.",
                [
                    'project_id' => $project->id,
                    'cost_id' => $cost->id,
                ],
                Notification::PRIORITY_HIGH,
                "/projects/{$project->id}/costs"
            );

            return response()->json([
                'success' => true,
                'message' => 'Đã đánh dấu thanh toán. Đang chờ kế toán xác nhận.',
                'data' => $cost->fresh(['customerPaidBy', 'attachments'])
            ]);
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
     * Kế toán xác nhận đã nhận tiền
     */
    public function confirm(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = AdditionalCost::where('project_id', $project->id)->findOrFail($id);

        $user = auth()->user();

        // Check RBAC permission
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(\App\Constants\Permissions::ADDITIONAL_COST_CONFIRM)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xác nhận chi phí phát sinh. Cần quyền: ' . \App\Constants\Permissions::ADDITIONAL_COST_CONFIRM
            ], 403);
        }

        if ($cost->status !== 'customer_paid') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xác nhận khi khách hàng đã thanh toán.'
            ], 400);
        }

        $cost->confirm($user);

        // Notify proposer and customer
        $this->notificationService->notifyCostConfirmed($cost);

        return response()->json([
            'success' => true,
            'message' => 'Đã xác nhận đã nhận tiền.',
            'data' => $cost->fresh(['confirmer', 'customerPaidBy', 'attachments'])
        ]);
    }

    /**
     * Duyệt chi phí phát sinh (backward compatible - giữ lại cho workflow cũ)
     */
    public function approve(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = AdditionalCost::where('project_id', $project->id)->findOrFail($id);

        $user = auth()->user();

        // Check RBAC permission
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(\App\Constants\Permissions::ADDITIONAL_COST_APPROVE)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt chi phí phát sinh. Cần quyền: ' . \App\Constants\Permissions::ADDITIONAL_COST_APPROVE
            ], 403);
        }

        // Nếu đang ở customer_paid, chuyển thành confirm
        if ($cost->status === 'customer_paid') {
            $cost->confirm($user);
            return response()->json([
                'success' => true,
                'message' => 'Đã xác nhận đã nhận tiền.',
                'data' => $cost->fresh(['confirmer', 'customerPaidBy', 'attachments'])
            ]);
        }

        // Workflow cũ: pending_approval → approved
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
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(\App\Constants\Permissions::ADDITIONAL_COST_REJECT)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối chi phí phát sinh. Cần quyền: ' . \App\Constants\Permissions::ADDITIONAL_COST_REJECT
            ], 403);
        }

        $validated = $request->validate([
            'rejected_reason' => 'required|string|max:500',
        ]);

        $cost->reject($validated['rejected_reason']);

        // Notify proposer and customer
        $this->notificationService->notifyCostRejected($cost, $validated['rejected_reason']);

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
        $user = auth()->user();

        // Check RBAC permission
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(\App\Constants\Permissions::ADDITIONAL_COST_VIEW)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem chi phí phát sinh. Cần quyền: ' . \App\Constants\Permissions::ADDITIONAL_COST_VIEW
            ], 403);
        }

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

        // Check RBAC permission - user must be able to update the cost
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(\App\Constants\Permissions::ADDITIONAL_COST_UPDATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật chi phí phát sinh. Cần quyền: ' . \App\Constants\Permissions::ADDITIONAL_COST_UPDATE
            ], 403);
        }

        $validated = $request->validate([
            'attachment_ids' => 'required|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            DB::beginTransaction();

            $attached = [];
            foreach ($validated['attachment_ids'] as $attachmentId) {
                $attachment = \App\Models\Attachment::find($attachmentId);
                if ($attachment && ($attachment->uploaded_by === $user->id || $user->hasPermission(\App\Constants\Permissions::SETTINGS_MANAGE))) {
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
