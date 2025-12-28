<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupplierAcceptance;
use App\Models\Supplier;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SupplierAcceptanceController extends Controller
{
    /**
     * Danh sách nghiệm thu NCC
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem nghiệm thu NCC.'
            ], 403);
        }

        $query = SupplierAcceptance::with(['supplier', 'project', 'contract', 'accepter']);

        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($supplierId = $request->query('supplier_id')) {
            $query->where('supplier_id', $supplierId);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $acceptances = $query->orderByDesc('acceptance_date')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $acceptances
        ]);
    }

    /**
     * Tạo nghiệm thu mới
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo nghiệm thu.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'supplier_id' => 'required|exists:suppliers,id',
            'project_id' => 'nullable|exists:projects,id',
            'supplier_contract_id' => 'nullable|exists:supplier_contracts,id',
            'acceptance_number' => 'nullable|string|max:100|unique:supplier_acceptances,acceptance_number',
            'acceptance_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'acceptance_date' => 'required|date',
            'accepted_quantity' => 'required|numeric|min:0',
            'quantity_unit' => 'nullable|string|max:20',
            'accepted_amount' => 'required|numeric|min:0',
            'quality_score' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $data = $request->all();
        $data['created_by'] = $user->id;
        $data['status'] = 'pending';

        $acceptance = SupplierAcceptance::create($data);

        $acceptance->load(['supplier', 'project', 'contract']);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo nghiệm thu thành công.',
            'data' => $acceptance
        ], 201);
    }

    /**
     * Chi tiết nghiệm thu
     */
    public function show(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem nghiệm thu.'
            ], 403);
        }

        $acceptance = SupplierAcceptance::with([
            'supplier',
            'project',
            'contract',
            'accepter',
            'rejector',
            'attachments'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $acceptance
        ]);
    }

    /**
     * Cập nhật nghiệm thu
     */
    public function update(Request $request, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật nghiệm thu.'
            ], 403);
        }

        $acceptance = SupplierAcceptance::findOrFail($id);

        if (in_array($acceptance->status, ['approved', 'rejected'])) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể sửa nghiệm thu đã được duyệt/từ chối.'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'acceptance_number' => 'sometimes|nullable|string|max:100|unique:supplier_acceptances,acceptance_number,' . $id,
            'acceptance_name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'acceptance_date' => 'sometimes|required|date',
            'accepted_quantity' => 'sometimes|required|numeric|min:0',
            'quantity_unit' => 'nullable|string|max:20',
            'accepted_amount' => 'sometimes|required|numeric|min:0',
            'quality_score' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $acceptance->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật nghiệm thu thành công.',
            'data' => $acceptance->fresh(['supplier', 'project', 'contract'])
        ]);
    }

    /**
     * Xóa nghiệm thu
     */
    public function destroy(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.delete') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa nghiệm thu.'
            ], 403);
        }

        $acceptance = SupplierAcceptance::findOrFail($id);

        if ($acceptance->status === 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa nghiệm thu đã được duyệt.'
            ], 422);
        }

        $acceptance->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa nghiệm thu thành công.'
        ]);
    }

    /**
     * Duyệt nghiệm thu
     */
    public function approve(Request $request, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.approve') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền duyệt nghiệm thu.'
            ], 403);
        }

        $acceptance = SupplierAcceptance::findOrFail($id);

        if ($acceptance->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể duyệt nghiệm thu ở trạng thái pending.'
            ], 422);
        }

        $notes = $request->input('notes');
        $acceptance->approve($user, $notes);

        // Cập nhật công nợ của supplier
        $supplier = $acceptance->supplier;
        $supplier->recordDebt($acceptance->accepted_amount);

        return response()->json([
            'success' => true,
            'message' => 'Đã duyệt nghiệm thu thành công.',
            'data' => $acceptance->fresh(['accepter'])
        ]);
    }

    /**
     * Từ chối nghiệm thu
     */
    public function reject(Request $request, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.approve') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền từ chối nghiệm thu.'
            ], 403);
        }

        $acceptance = SupplierAcceptance::findOrFail($id);

        if ($acceptance->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể từ chối nghiệm thu ở trạng thái pending.'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng nhập lý do từ chối.',
                'errors' => $validator->errors()
            ], 422);
        }

        $acceptance->reject($request->rejection_reason, $user);

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối nghiệm thu.',
            'data' => $acceptance->fresh(['rejector'])
        ]);
    }
}
