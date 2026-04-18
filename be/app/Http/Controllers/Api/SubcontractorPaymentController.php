<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Subcontractor;
use App\Models\SubcontractorPayment;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubcontractorPaymentController extends Controller
{
    use ApiAuthorization;

    protected $financialService;

    public function __construct(\App\Services\FinancialService $financialService)
    {
        $this->financialService = $financialService;
    }
    /**
     * Danh sách thanh toán nhà thầu phụ
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $this->apiRequire($request->user(), Permissions::SUBCONTRACTOR_PAYMENT_VIEW, $project);
        
        $query = SubcontractorPayment::where('project_id', $project->id)
            ->with(['subcontractor', 'creator', 'approver', 'payer']);

        // Filter by subcontractor
        if ($request->has('subcontractor_id')) {
            $query->where('subcontractor_id', $request->subcontractor_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $payments = $query->orderByDesc('created_at')->get();

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
        $this->apiRequire(auth()->user(), Permissions::SUBCONTRACTOR_PAYMENT_VIEW, $projectId);

        $payment = SubcontractorPayment::where('project_id', $projectId)
            ->with(['subcontractor', 'project', 'creator', 'approver', 'payer'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $payment
        ]);
    }

    /**
     * Tạo thanh toán mới
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = $request->user();
        $this->apiRequire($user, Permissions::SUBCONTRACTOR_PAYMENT_CREATE, $project);

        $validated = $request->validate([
            'subcontractor_id' => 'required|exists:subcontractors,id',
            'payment_stage' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0',
            'accepted_volume' => 'nullable|numeric|min:0',
            'payment_date' => 'nullable|date',
            'payment_method' => 'required|in:cash,bank_transfer,check,other',
            'reference_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
        ]);

        try {
            $payment = $this->financialService->upsertSubPayment(
                array_merge($validated, ['project_id' => $project->id]),
                null,
                $user
            );

            return response()->json([
                'success' => true,
                'message' => 'Phiếu đề nghị thanh toán đã được tạo.',
                'data' => $payment
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Cập nhật thanh toán
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $this->apiRequire($request->user(), Permissions::SUBCONTRACTOR_PAYMENT_UPDATE, $projectId);

        $payment = SubcontractorPayment::where('project_id', $projectId)
            ->findOrFail($id);

        // Không cho phép cập nhật nếu đã thanh toán
        if ($payment->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật phiếu thanh toán đã thanh toán.'
            ], 400);
        }

        $validated = $request->validate([
            'payment_stage' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0',
            'accepted_volume' => 'nullable|numeric|min:0',
            'payment_date' => 'nullable|date',
            'payment_method' => 'required|in:cash,bank_transfer,check,other',
            'reference_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
        ]);

        try {
            $payment = $this->financialService->upsertSubPayment($validated, $payment, $request->user());

            return response()->json([
                'success' => true,
                'message' => 'Phiếu thanh toán đã được cập nhật.',
                'data' => $payment
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Xóa thanh toán
     */
    public function destroy(string $projectId, string $id)
    {
        $this->apiRequire(auth()->user(), Permissions::SUBCONTRACTOR_PAYMENT_DELETE, $projectId);

        $payment = SubcontractorPayment::where('project_id', $projectId)
            ->findOrFail($id);

        // Không cho phép xóa nếu đã thanh toán
        if ($payment->status === 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa phiếu thanh toán đã thanh toán.'
            ], 400);
        }

        $payment->delete();

        return response()->json([
            'success' => true,
            'message' => 'Phiếu thanh toán đã được xóa.'
        ]);
    }

    /**
     * Gửi phiếu chi để duyệt (từ draft -> pending_management_approval)
     */
    public function submit(string $projectId, string $id)
    {
        $this->apiRequire(auth()->user(), Permissions::SUBCONTRACTOR_PAYMENT_EDIT, $projectId);
        $payment = SubcontractorPayment::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->financialService->submitSubPayment($payment, auth()->user());

            return response()->json([
                'success' => true,
                'message' => 'Phiếu thanh toán đã được gửi duyệt.',
                'data' => $payment->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Ban điều hành duyệt (từ pending_management_approval -> pending_accountant_confirmation)
     */
    public function approve(string $projectId, string $id)
    {
        $this->apiRequire(auth()->user(), Permissions::SUBCONTRACTOR_PAYMENT_APPROVE, $projectId);
        $payment = SubcontractorPayment::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->financialService->approveSubPayment($payment, auth()->user());

            return response()->json([
                'success' => true,
                'message' => 'Phiếu thanh toán đã được duyệt thành công.',
                'data' => $payment->fresh()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 400);
        }
    }

    /**
     * Từ chối phiếu chi
     */
    public function reject(Request $request, string $projectId, string $id)
    {
        $this->apiRequire(auth()->user(), Permissions::SUBCONTRACTOR_PAYMENT_APPROVE, $projectId);

        $payment = SubcontractorPayment::where('project_id', $projectId)
            ->findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'rejection_reason' => 'nullable|string|max:1000',
        ]);

        try {
            $this->financialService->rejectSubPayment($payment, $validated['rejection_reason'] ?? null, $user);

            return response()->json([
                'success' => true,
                'message' => 'Phiếu chi đã bị từ chối.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 400);
        }
    }

    public function markAsPaid(Request $request, string $projectId, string $id)
    {
        $this->apiRequire($request->user(), Permissions::SUBCONTRACTOR_PAYMENT_MARK_PAID, $projectId);

        $payment = SubcontractorPayment::where('project_id', $projectId)
            ->findOrFail($id);
        $user = $request->user();

        try {
            $this->financialService->confirmSubPayment($payment, $user);

            return response()->json([
                'success' => true,
                'message' => 'Phiếu thanh toán đã được xác nhận là đã thanh toán.',
                'data' => $payment->fresh(['payer', 'subcontractor'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false, 
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 500);
        }
    }
    /**
     * Hoàn duyệt phiếu chi về trạng thái nháp
     */
    public function revertToDraft(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $payment = SubcontractorPayment::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        // Check permission - Requires dedicated revert permission
        $canRevert = $this->apiCan(Permissions::SUBCONTRACTOR_PAYMENT_REVERT, $project);

        if (!$canRevert) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền hoàn duyệt phiếu chi này.'
            ], 403);
        }

        try {
            $this->financialService->revertSubPaymentToDraft($payment);

            return response()->json([
                'success' => true,
                'message' => 'Phiếu chi đã được hoàn về trạng thái nháp.',
                'data' => $payment->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 400);
        }
    }
}
