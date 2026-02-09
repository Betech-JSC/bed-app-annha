<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectPayment;
use App\Constants\Permissions;
use App\Services\AuthorizationService;
use App\Services\NotificationService;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectPaymentController extends Controller
{
    protected $authService;
    protected $notificationService;

    public function __construct(AuthorizationService $authService, NotificationService $notificationService)
    {
        $this->authService = $authService;
        $this->notificationService = $notificationService;
    }
    /**
     * Danh sách thanh toán
     */
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission với project context
        if (!$this->authService->can($user, Permissions::PAYMENT_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem danh sách thanh toán của dự án này.'
            ], 403);
        }

        $payments = $project->payments()
            ->with(['confirmer', 'customerApprover', 'attachments'])
            ->orderBy('payment_number')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $payments
        ]);
    }

    /**
     * Chi tiết thanh toán
     */
    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission với project context
        if (!$this->authService->can($user, Permissions::PAYMENT_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem thanh toán của dự án này.'
            ], 403);
        }

        $payment = ProjectPayment::where('project_id', $projectId)
            ->with(['confirmer', 'customerApprover', 'attachments'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $payment
        ]);
    }

    /**
     * Tạo đợt thanh toán
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission với project context
        if (!$this->authService->can($user, Permissions::PAYMENT_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo đợt thanh toán cho dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'payment_number' => 'required|integer|min:1',
            'amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
            'due_date' => 'required|date',
            'contract_id' => 'nullable|exists:contracts,id',
        ]);

        try {
            DB::beginTransaction();

            // Check if payment number already exists
            $exists = ProjectPayment::where('project_id', $project->id)
                ->where('payment_number', $validated['payment_number'])
                ->exists();

            if ($exists) {
                return response()->json([
                    'success' => false,
                    'message' => 'Số đợt thanh toán đã tồn tại.'
                ], 400);
            }

            $payment = ProjectPayment::create([
                'project_id' => $project->id,
                ...$validated,
                'status' => 'pending',
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đợt thanh toán đã được tạo.',
                'data' => $payment
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
     * Cập nhật thanh toán
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $payment = ProjectPayment::where('project_id', $projectId)
            ->findOrFail($id);
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission với project context
        if (!$this->authService->can($user, Permissions::PAYMENT_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật thanh toán của dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
            'due_date' => 'sometimes|date',
            'paid_date' => 'nullable|date',
        ]);

        $payment->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Thanh toán đã được cập nhật.',
            'data' => $payment->fresh()
        ]);
    }

    /**
     * Xác nhận thanh toán (kế toán)
     */
    public function confirm(Request $request, string $projectId, string $id)
    {
        $payment = ProjectPayment::where('project_id', $projectId)
            ->findOrFail($id);

        $payment = ProjectPayment::where('project_id', $projectId)
            ->findOrFail($id);
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission với project context
        if (!$this->authService->can($user, Permissions::PAYMENT_CONFIRM, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xác nhận thanh toán của dự án này.'
            ], 403);
        }

        if ($payment->status !== 'customer_paid') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xác nhận thanh toán khi khách hàng đã thanh toán.'
            ], 400);
        }

        $validated = $request->validate([
            'paid_date' => 'required|date',
        ]);

        $payment->markAsPaid($user);
        $payment->update(['paid_date' => $validated['paid_date']]);

        // Thông báo cho khách hàng
        $this->notificationService->notifyPaymentConfirmed($payment);

        return response()->json([
            'success' => true,
            'message' => 'Thanh toán đã được xác nhận.',
            'data' => $payment->fresh(['confirmer', 'customerApprover', 'attachments'])
        ]);
    }

    /**
     * Upload hình ảnh xác nhận chuyển khoản
     */
    public function uploadPaymentProof(Request $request, string $projectId, string $id)
    {
        $payment = ProjectPayment::where('project_id', $projectId)
            ->findOrFail($id);

        $user = auth()->user();

        $validated = $request->validate([
            'attachment_ids' => 'required|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            DB::beginTransaction();

            // Đính kèm files
            $attached = [];
            foreach ($validated['attachment_ids'] as $attachmentId) {
                $attachment = \App\Models\Attachment::find($attachmentId);
                if ($attachment && ($attachment->uploaded_by === $user->id || $user->hasPermission(\App\Constants\Permissions::SETTINGS_MANAGE))) {
                    $attachment->update([
                        'attachable_type' => ProjectPayment::class,
                        'attachable_id' => $payment->id,
                    ]);
                    $attached[] = $attachment;
                }
            }

            // Đánh dấu đã upload hình xác nhận
            if (count($attached) > 0) {
                $payment->markPaymentProofUploaded();

                // Gửi thông báo cho khách hàng
                if ($payment->project->customer_id) {
                    $this->notificationService->sendToUser(
                        $payment->project->customer_id,
                        Notification::TYPE_WORKFLOW,
                        Notification::CATEGORY_WORKFLOW_APPROVAL,
                        "Yêu cầu duyệt thanh toán",
                        "Bạn có một yêu cầu duyệt hình ảnh thanh toán cho đợt #{$payment->payment_number} của dự án '{$payment->project->name}'.",
                        [
                            'project_id' => $payment->project->id,
                            'payment_id' => $payment->id,
                        ],
                        Notification::PRIORITY_HIGH,
                        "/projects/{$payment->project->id}/payments"
                    );
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã upload ' . count($attached) . ' hình xác nhận. Đang chờ khách hàng duyệt.',
                'data' => $payment->fresh(['attachments', 'customerApprover'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi upload hình xác nhận.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Khách hàng đánh dấu đã thanh toán (upload chứng từ + nhập thông tin)
     */
    public function markAsPaidByCustomer(Request $request, string $projectId, string $id)
    {
        $payment = ProjectPayment::where('project_id', $projectId)
            ->findOrFail($id);

        $user = auth()->user();

        $project = Project::findOrFail($projectId);

        // Check RBAC permission với project context
        if (!$this->authService->can($user, Permissions::PAYMENT_MARK_AS_PAID_BY_CUSTOMER, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền đánh dấu đã thanh toán cho dự án này.'
            ], 403);
        }

        if ($payment->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể đánh dấu đã thanh toán khi thanh toán ở trạng thái chờ thanh toán.'
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
                            'attachable_type' => ProjectPayment::class,
                            'attachable_id' => $payment->id,
                        ]);
                    }
                }
            }

            // Đánh dấu đã thanh toán
            $payment->markAsPaidByCustomer(
                $user,
                $validated['paid_date'] ?? null,
                $validated['actual_amount'] ?? null
            );

            // Gửi thông báo cho kế toán
            $this->notificationService->sendToPermissionUsers(
                Permissions::PAYMENT_CONFIRM,
                $project->id,
                Notification::TYPE_WORKFLOW,
                Notification::CATEGORY_WORKFLOW_APPROVAL,
                "Khách hàng đã thanh toán",
                "Khách hàng đã đánh dấu thanh toán và upload chứng từ cho đợt #{$payment->payment_number} của dự án '{$project->name}'.",
                [
                    'project_id' => $project->id,
                    'payment_id' => $payment->id,
                ],
                Notification::PRIORITY_HIGH,
                "/projects/{$project->id}/payments"
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã đánh dấu thanh toán. Đang chờ kế toán xác nhận.',
                'data' => $payment->fresh(['customerApprover', 'attachments'])
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
     * Khách hàng duyệt thanh toán (backward compatible - giữ lại cho workflow cũ)
     */
    public function approveByCustomer(Request $request, string $projectId, string $id)
    {
        $payment = ProjectPayment::where('project_id', $projectId)
            ->findOrFail($id);

        $user = auth()->user();
        $project = $payment->project;

        $project = Project::findOrFail($projectId);

        // Check RBAC permission với project context
        if (!$this->authService->can($user, Permissions::PAYMENT_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt thanh toán của dự án này.'
            ], 403);
        }

        if ($payment->status !== 'customer_pending_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Thanh toán không ở trạng thái chờ duyệt.'
            ], 400);
        }

        $payment->approveByCustomer($user);

        // Gửi thông báo cho kế toán
        $this->notificationService->sendToPermissionUsers(
            Permissions::PAYMENT_CONFIRM,
            $project->id,
            Notification::TYPE_WORKFLOW,
            Notification::CATEGORY_WORKFLOW_APPROVAL,
            "Khách hàng đã duyệt thanh toán",
            "Khách hàng đã duyệt đợt thanh toán #{$payment->payment_number} của dự án '{$project->name}'.",
            [
                'project_id' => $project->id,
                'payment_id' => $payment->id,
            ],
            Notification::PRIORITY_MEDIUM,
            "/projects/{$project->id}/payments"
        );

        return response()->json([
            'success' => true,
            'message' => 'Đã duyệt thanh toán. Đang chờ kế toán xác nhận.',
            'data' => $payment->fresh(['customerApprover', 'attachments'])
        ]);
    }

    /**
     * Từ chối thanh toán (khách hàng)
     */
    public function rejectByCustomer(Request $request, string $projectId, string $id)
    {
        $payment = ProjectPayment::where('project_id', $projectId)
            ->findOrFail($id);

        $user = auth()->user();
        $project = $payment->project;

        // Check RBAC permission
        if (!$user->hasPermission(Permissions::PAYMENT_APPROVE)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối thanh toán.'
            ], 403);
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        if ($payment->status !== 'customer_pending_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Thanh toán không ở trạng thái chờ duyệt.'
            ], 400);
        }

        // Chuyển về pending và xóa hình xác nhận (hoặc giữ lại để tham khảo)
        $payment->status = 'pending';
        $payment->notes = ($payment->notes ? $payment->notes . "\n\n" : '') . "Lý do từ chối: " . $validated['rejection_reason'];
        $payment->save();

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối thanh toán.',
            'data' => $payment->fresh()
        ]);
    }

    /**
     * Từ chối thanh toán (Kế toán/Admin)
     */
    public function reject(Request $request, string $projectId, string $id)
    {
        $payment = ProjectPayment::where('project_id', $projectId)
            ->findOrFail($id);

        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission với project context
        if (!$this->authService->can($user, Permissions::PAYMENT_CONFIRM, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối thanh toán của dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        if ($payment->status !== 'customer_paid') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể từ chối thanh toán khi khách hàng đã đánh dấu thanh toán.'
            ], 400);
        }

        try {
            DB::beginTransaction();

            $payment->update([
                'status' => 'pending',
                'notes' => ($payment->notes ? $payment->notes . "\n\n" : '') . "Kế toán từ chối - Lý do: " . $validated['reason'],
            ]);

            // Thông báo cho khách hàng
            $this->notificationService->notifyPaymentRejected($payment, $validated['reason']);

            // Optional: Xóa các attachment là proof nếu muốn bắt khách upload lại
            // $payment->attachments()->where('type', 'image')->delete();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã từ chối thanh toán.',
                'data' => $payment->fresh(['confirmer', 'customerApprover', 'attachments'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi từ chối thanh toán.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
