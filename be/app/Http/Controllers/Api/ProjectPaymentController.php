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
            ->with(['confirmer', 'attachments'])
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
            'data' => $payment->fresh()
        ]);
    }
}
