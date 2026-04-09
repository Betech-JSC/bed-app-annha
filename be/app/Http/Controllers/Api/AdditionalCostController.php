<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdditionalCost;
use App\Models\Project;
use App\Constants\Permissions;
use App\Services\NotificationService;
use App\Models\Notification;
use App\Services\AuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdditionalCostController extends Controller
{
    protected $notificationService;
    protected $authService;

    public function __construct(NotificationService $notificationService, AuthorizationService $authService)
    {
        $this->notificationService = $notificationService;
        $this->authService = $authService;
    }

    /**
     * Danh sách chi phí phát sinh
     */
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::ADDITIONAL_COST_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem chi phí phát sinh của dự án này.'
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

        if (!$this->authService->can($user, Permissions::ADDITIONAL_COST_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo chi phí phát sinh cho dự án này.'
            ], 403);
        }

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
                'status' => 'pending_approval',
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

            // Notify customers for APPROVAL
            $this->notificationService->sendToPermissionUsers(
                Permissions::ADDITIONAL_COST_APPROVE,
                $project->id,
                Notification::TYPE_WORKFLOW,
                Notification::CATEGORY_WORKFLOW_APPROVAL,
                "Yêu cầu duyệt chi phí phát sinh",
                "Có một yêu cầu chi phí phát sinh mới cho dự án '{$project->name}' với số tiền " . number_format((float)$cost->amount) . " VND. Vui lòng kiểm tra và duyệt.",
                [
                    'project_id' => $project->id,
                    'cost_id' => $cost->id,
                ],
                Notification::PRIORITY_HIGH,
                "/projects/{$project->id}/additional-costs"
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

        if (!$this->authService->can($user, Permissions::ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền đánh dấu đã thanh toán cho dự án này.'
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
            'attachment_ids' => 'required|array|min:1',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

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
                "/projects/{$project->id}/additional-costs/{$cost->id}"
            );

            return response()->json([
                'success' => true,
                'message' => 'Đã đánh dấu thanh toán. Đang chờ kế toán xác nhận.',
                'data' => $cost->fresh(['customerPaidBy', 'attachments'])
            ]);
    }

    /**
     * Kế toán xác nhận đã nhận tiền
     */
    public function confirm(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = AdditionalCost::where('project_id', $project->id)->findOrFail($id);

        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::ADDITIONAL_COST_CONFIRM, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xác nhận chi phí phát sinh cho dự án này.'
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
     * Duyệt chi phí phát sinh -> Cộng vào hợp đồng
     */
    public function approve(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = AdditionalCost::where('project_id', $project->id)->findOrFail($id);

        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::ADDITIONAL_COST_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt chi phí phát sinh cho dự án này.'
            ], 403);
        }

        // Chỉ duyệt khi đang chờ duyệt
        if (!in_array($cost->status, ['pending_approval', 'pending'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chi phí không ở trạng thái chờ duyệt.'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Nếu status là 'pending', chuyển sang 'pending_approval' trước
            if ($cost->status === 'pending') {
                $cost->status = 'pending_approval';
                $cost->save();
            }

            // Sử dụng model method để đảm bảo audit trail đầy đủ
            if (!$cost->approve($user)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Không thể duyệt chi phí phát sinh.'
                ], 400);
            }

            // Cập nhật giá trị hợp đồng
            $contract = $project->contract;
            if ($contract) {
                $contract->contract_value += $cost->amount;
                $contract->save();
            }

            DB::commit();

            // Notify proposer
            $this->notificationService->sendToUser(
                $cost->proposed_by,
                Notification::TYPE_WORKFLOW,
                Notification::CATEGORY_WORKFLOW_APPROVAL,
                "Chi phí phát sinh đã được duyệt",
                "Chi phí phát sinh " . number_format((float)$cost->amount) . " VND cho dự án '{$project->name}' đã được duyệt và cộng vào hợp đồng.",
                [
                    'project_id' => $project->id,
                    'cost_id' => $cost->id,
                ],
                Notification::PRIORITY_MEDIUM,
                 "/projects/{$project->id}/additional-costs"
            );

            return response()->json([
                'success' => true,
                'message' => 'Chi phí phát sinh đã được duyệt và cộng vào giá trị hợp đồng.',
                'data' => $cost->fresh()
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi duyệt chi phí.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Từ chối chi phí phát sinh
     */
    public function reject(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = AdditionalCost::where('project_id', $project->id)->findOrFail($id);

        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::ADDITIONAL_COST_REJECT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối chi phí phát sinh cho dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'rejected_reason' => 'required|string|max:500',
        ]);

        $cost->reject($validated['rejected_reason'], $request->user());

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

        if (!$this->authService->can($user, Permissions::ADDITIONAL_COST_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem chi phí phát sinh của dự án này.'
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

        if (!$this->authService->can($user, Permissions::ADDITIONAL_COST_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật chi phí phát sinh này.'
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

    /**
     * Xóa chi phí phát sinh
     */
    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = AdditionalCost::where('project_id', $project->id)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::ADDITIONAL_COST_DELETE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa chi phí phát sinh này.'
            ], 403);
        }

        // Chỉ cho phép xóa nếu đang ở trạng thái pending hoặc rejected
        if (!in_array($cost->status, ['pending', 'rejected'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xóa chi phí ở trạng thái chờ thanh toán hoặc đã bị từ chối.'
            ], 400);
        }

        try {
            DB::beginTransaction();

            // Xóa các đính kèm liên quan (hoặc gỡ liên kết)
            $cost->attachments()->update([
                'attachable_id' => null,
                'attachable_type' => null
            ]);

            $cost->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã xóa chi phí phát sinh thành công.'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi xóa chi phí phát sinh.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
