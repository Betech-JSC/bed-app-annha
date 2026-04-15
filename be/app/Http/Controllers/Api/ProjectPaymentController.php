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
    protected $financialService;
    protected $notificationService;

    public function __construct(
        AuthorizationService $authService, 
        \App\Services\FinancialService $financialService,
        NotificationService $notificationService
    ) {
        $this->authService = $authService;
        $this->financialService = $financialService;
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

    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::PAYMENT_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo đợt thanh toán cho dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'payment_number' => 'nullable|max:50',
            'amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
            'due_date' => 'required|date',
            'contract_id' => 'nullable|exists:contracts,id',
        ]);

        try {
            $payment = $this->financialService->upsertProjectPayment(
                array_merge($validated, ['project_id' => $project->id]),
                null,
                $user
            );

            return response()->json([
                'success' => true,
                'message' => 'Đợt thanh toán đã được tạo.',
                'data' => $payment
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
            ], 500);
        }
    }

    public function update(Request $request, string $projectId, string $id)
    {
        $payment = ProjectPayment::where('project_id', $projectId)->findOrFail($id);
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

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

        try {
            $this->financialService->upsertProjectPayment($validated, $payment, $user);
            return response()->json([
                'success' => true,
                'message' => 'Thanh toán đã được cập nhật.',
                'data' => $payment->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 500);
        }
    }

    public function confirm(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::PAYMENT_CONFIRM, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xác nhận thanh toán của dự án này.'
            ], 403);
        }

        $payment = ProjectPayment::where('project_id', $projectId)->findOrFail($id);
        $validated = $request->validate([
            'paid_date' => 'required|date',
        ]);

        try {
            $this->financialService->confirmProjectPayment($payment, $user);
            $payment->update(['paid_date' => $validated['paid_date']]);

            $this->notificationService->notifyPaymentConfirmed($payment);

            return response()->json([
                'success' => true,
                'message' => 'Thanh toán đã được xác nhận.',
                'data' => $payment->fresh(['confirmer', 'customerApprover', 'attachments'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Upload hình ảnh xác nhận chuyển khoản
     */
    public function uploadPaymentProof(Request $request, string $projectId, string $id)
    {
        $payment = ProjectPayment::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        $validated = $request->validate([
            'attachment_ids' => 'required|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            $attached = $this->financialService->attachPaymentProof($payment, $validated['attachment_ids'], $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã upload ' . count($attached) . ' hình xác nhận. Đang chờ khách hàng duyệt.',
                'data' => $payment->fresh(['attachments', 'customerApprover'])
            ]);
        } catch (\Exception $e) {
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
        $payment = ProjectPayment::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();
        $project = Project::findOrFail($projectId);

        // Check RBAC permission
        if (!$this->authService->can($user, Permissions::PAYMENT_MARK_AS_PAID_BY_CUSTOMER, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền đánh dấu đã thanh toán cho dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'paid_date' => 'nullable|date',
            'actual_amount' => 'nullable|numeric|min:0',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            $this->financialService->customerMarkAsPaid($payment, $validated, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã đánh dấu thanh toán. Đang chờ kế toán xác nhận.',
                'data' => $payment->fresh(['customerApprover', 'attachments'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function approveByCustomer(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::PAYMENT_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt thanh toán của dự án này.'
            ], 403);
        }

        $payment = ProjectPayment::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->financialService->approveProjectPaymentByCustomer($payment, $user);
            $this->notificationService->notifyPaymentConfirmed($payment); 
            
            return response()->json([
                'success' => true,
                'message' => 'Đã duyệt thanh toán. Đang chờ kế toán xác nhận.',
                'data' => $payment->fresh(['customerApprover', 'attachments'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 500);
        }
    }

    public function rejectByCustomer(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::PAYMENT_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối thanh toán của dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $payment = ProjectPayment::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->financialService->rejectProjectPayment($payment, $validated['rejection_reason'], null); 
            return response()->json([
                'success' => true,
                'message' => 'Đã từ chối thanh toán.',
                'data' => $payment->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 500);
        }
    }

    public function reject(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::PAYMENT_CONFIRM, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối thanh toán của dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $payment = ProjectPayment::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->financialService->rejectProjectPayment($payment, $validated['reason'], $user);
            $this->notificationService->notifyPaymentRejected($payment, $validated['reason']);

            return response()->json([
                'success' => true,
                'message' => 'Đã từ chối thanh toán.',
                'data' => $payment->fresh(['confirmer', 'customerApprover', 'attachments'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }
}
