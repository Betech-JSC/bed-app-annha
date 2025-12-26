<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Subcontractor;
use App\Models\SubcontractorPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubcontractorPaymentController extends Controller
{
    /**
     * Danh sách thanh toán nhà thầu phụ
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        
        $query = SubcontractorPayment::where('project_id', $project->id)
            ->with(['subcontractor', 'creator', 'approver', 'payer', 'workVolume']);

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
        $payment = SubcontractorPayment::where('project_id', $projectId)
            ->with(['subcontractor', 'project', 'creator', 'approver', 'payer', 'workVolume'])
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

        $validated = $request->validate([
            'subcontractor_id' => 'required|exists:subcontractors,id',
            'work_volume_id' => 'nullable|exists:work_volumes,id',
            'payment_stage' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0',
            'accepted_volume' => 'nullable|numeric|min:0',
            'payment_date' => 'nullable|date',
            'payment_method' => 'required|in:cash,bank_transfer,check,other',
            'reference_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        // Validate subcontractor belongs to project
        $subcontractor = Subcontractor::where('project_id', $project->id)
            ->findOrFail($validated['subcontractor_id']);

        // Check if amount exceeds remaining amount
        $remaining = $subcontractor->total_quote - $subcontractor->total_paid;
        if ($validated['amount'] > $remaining) {
            return response()->json([
                'success' => false,
                'message' => 'Số tiền thanh toán vượt quá số tiền còn lại.'
            ], 400);
        }

        try {
            DB::beginTransaction();

            $payment = SubcontractorPayment::create([
                'subcontractor_id' => $subcontractor->id,
                'project_id' => $project->id,
                ...$validated,
                'status' => 'draft', // Bắt đầu từ draft
                'created_by' => $user->id,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Phiếu thanh toán đã được tạo.',
                'data' => $payment->load(['subcontractor', 'creator'])
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
            'amount' => 'sometimes|numeric|min:0',
            'accepted_volume' => 'nullable|numeric|min:0',
            'payment_date' => 'nullable|date',
            'payment_method' => 'sometimes|in:cash,bank_transfer,check,other',
            'reference_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        // Check amount if changed
        if (isset($validated['amount'])) {
            $subcontractor = $payment->subcontractor;
            $otherPaymentsTotal = $subcontractor->payments()
                ->where('id', '!=', $payment->id)
                ->where('status', '!=', 'cancelled')
                ->sum('amount');
            $remaining = $subcontractor->total_quote - $otherPaymentsTotal;
            
            if ($validated['amount'] > $remaining) {
                return response()->json([
                    'success' => false,
                    'message' => 'Số tiền thanh toán vượt quá số tiền còn lại.'
                ], 400);
            }
        }

        $payment->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Phiếu thanh toán đã được cập nhật.',
            'data' => $payment->fresh(['subcontractor'])
        ]);
    }

    /**
     * Xóa thanh toán
     */
    public function destroy(string $projectId, string $id)
    {
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
    public function submit(Request $request, string $projectId, string $id)
    {
        $payment = SubcontractorPayment::where('project_id', $projectId)
            ->findOrFail($id);
        $user = $request->user();

        if ($payment->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể gửi phiếu chi ở trạng thái nháp.'
            ], 400);
        }

        $payment->submitForApproval();

        return response()->json([
            'success' => true,
            'message' => 'Phiếu chi đã được gửi để duyệt.',
            'data' => $payment->fresh()
        ]);
    }

    /**
     * Ban điều hành duyệt (từ pending_management_approval -> pending_accountant_confirmation)
     */
    public function approve(Request $request, string $projectId, string $id)
    {
        $payment = SubcontractorPayment::where('project_id', $projectId)
            ->findOrFail($id);
        $user = $request->user();

        if ($payment->status !== 'pending_management_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể duyệt phiếu thanh toán ở trạng thái chờ ban điều hành duyệt.'
            ], 400);
        }

        $payment->approve($user);

        return response()->json([
            'success' => true,
            'message' => 'Phiếu thanh toán đã được ban điều hành duyệt.',
            'data' => $payment->fresh(['approver'])
        ]);
    }

    /**
     * Từ chối phiếu chi
     */
    public function reject(Request $request, string $projectId, string $id)
    {
        $payment = SubcontractorPayment::where('project_id', $projectId)
            ->findOrFail($id);
        $user = $request->user();

        if (!in_array($payment->status, ['pending_management_approval', 'pending_accountant_confirmation'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể từ chối phiếu chi đang chờ duyệt.'
            ], 400);
        }

        $validated = $request->validate([
            'rejection_reason' => 'nullable|string|max:1000',
        ]);

        $payment->reject($user, $validated['rejection_reason'] ?? null);

        return response()->json([
            'success' => true,
            'message' => 'Phiếu chi đã bị từ chối.',
            'data' => $payment->fresh(['rejector'])
        ]);
    }

    /**
     * Kế toán xác nhận đã thanh toán (từ pending_accountant_confirmation -> paid)
     */
    public function markAsPaid(Request $request, string $projectId, string $id)
    {
        $payment = SubcontractorPayment::where('project_id', $projectId)
            ->findOrFail($id);
        $user = $request->user();

        if ($payment->status !== 'pending_accountant_confirmation') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xác nhận thanh toán phiếu đã được ban điều hành duyệt.'
            ], 400);
        }

        $payment->markAsPaid($user);

        return response()->json([
            'success' => true,
            'message' => 'Phiếu thanh toán đã được xác nhận là đã thanh toán.',
            'data' => $payment->fresh(['payer', 'subcontractor'])
        ]);
    }
}
