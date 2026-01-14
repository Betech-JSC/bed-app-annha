<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectPaymentController extends Controller
{
    /**
     * Danh sách thanh toán
     */
    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
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
     * Tạo đợt thanh toán
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission
        if (!$user->hasPermission('payments.create')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo đợt thanh toán.'
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

        $user = auth()->user();

        // Check permission
        if (!$user->hasPermission('payments.confirm')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xác nhận thanh toán.'
            ], 403);
        }

        if ($payment->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Đợt thanh toán này đã được xác nhận.'
            ], 400);
        }

        $validated = $request->validate([
            'paid_date' => 'required|date',
        ]);

        $payment->markAsPaid($user);
        $payment->update(['paid_date' => $validated['paid_date']]);

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
                if ($attachment && ($attachment->uploaded_by === $user->id || $user->role === 'admin' || $user->owner === true)) {
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
                $this->notifyCustomerForApproval($payment);
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
     * Khách hàng duyệt thanh toán
     */
    public function approveByCustomer(Request $request, string $projectId, string $id)
    {
        $payment = ProjectPayment::where('project_id', $projectId)
            ->findOrFail($id);

        $user = auth()->user();
        $project = $payment->project;

        // Check RBAC permission
        if (!$user->owner && !$user->hasPermission(\App\Constants\Permissions::PAYMENT_APPROVE)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt thanh toán.'
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
        $this->notifyAccountantForConfirmation($payment);

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
        if (!$user->owner && !$user->hasPermission(\App\Constants\Permissions::PAYMENT_APPROVE)) {
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
     * Gửi thông báo cho khách hàng khi có hình xác nhận cần duyệt
     */
    private function notifyCustomerForApproval(ProjectPayment $payment): void
    {
        $project = $payment->project;
        $customer = $project->customer;

        if (!$customer) {
            return;
        }

        // TODO: Implement notification service
        // Có thể gửi email, push notification, hoặc in-app notification
        \Log::info("Thông báo cho khách hàng {$customer->id}: Có hình xác nhận thanh toán cần duyệt - Payment #{$payment->payment_number}");
    }

    /**
     * Gửi thông báo cho kế toán khi khách hàng đã duyệt
     */
    private function notifyAccountantForConfirmation(ProjectPayment $payment): void
    {
        // TODO: Implement notification service
        // Gửi thông báo cho kế toán để xác nhận thanh toán
        \Log::info("Thông báo cho kế toán: Khách hàng đã duyệt thanh toán - Payment #{$payment->payment_number}");
    }
}
