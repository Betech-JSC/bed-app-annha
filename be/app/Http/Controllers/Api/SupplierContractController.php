<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SupplierContract;
use App\Models\Supplier;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SupplierContractController extends Controller
{
    /**
     * Danh sách hợp đồng NCC
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem hợp đồng NCC.'
            ], 403);
        }

        $query = SupplierContract::with(['supplier', 'project', 'signer']);

        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($supplierId = $request->query('supplier_id')) {
            $query->where('supplier_id', $supplierId);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $contracts = $query->orderByDesc('contract_date')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $contracts
        ]);
    }

    /**
     * Tạo hợp đồng mới
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo hợp đồng NCC.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'supplier_id' => 'required|exists:suppliers,id',
            'project_id' => 'nullable|exists:projects,id',
            'contract_number' => 'nullable|string|max:100|unique:supplier_contracts,contract_number',
            'contract_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'contract_date' => 'required|date',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'contract_value' => 'required|numeric|min:0',
            'advance_payment' => 'nullable|numeric|min:0',
            'payment_method' => 'required|in:milestone,progress,monthly,lump_sum,on_delivery',
            'payment_schedule' => 'nullable|array',
            'status' => 'in:draft,active,suspended,completed,terminated,cancelled',
            'terms_and_conditions' => 'nullable|string',
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

        $contract = SupplierContract::create($data);

        $contract->load(['supplier', 'project', 'signer']);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo hợp đồng thành công.',
            'data' => $contract
        ], 201);
    }

    /**
     * Chi tiết hợp đồng
     */
    public function show(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem hợp đồng.'
            ], 403);
        }

        $contract = SupplierContract::with([
            'supplier',
            'project',
            'signer',
            'acceptances'
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $contract
        ]);
    }

    /**
     * Cập nhật hợp đồng
     */
    public function update(Request $request, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật hợp đồng.'
            ], 403);
        }

        $contract = SupplierContract::findOrFail($id);

        if ($contract->status === 'active' && $contract->signed_at) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể sửa hợp đồng đã ký.'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'contract_number' => 'sometimes|nullable|string|max:100|unique:supplier_contracts,contract_number,' . $id,
            'contract_name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'contract_date' => 'sometimes|required|date',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'contract_value' => 'sometimes|required|numeric|min:0',
            'advance_payment' => 'nullable|numeric|min:0',
            'payment_method' => 'sometimes|required|in:milestone,progress,monthly,lump_sum,on_delivery',
            'payment_schedule' => 'nullable|array',
            'status' => 'in:draft,active,suspended,completed,terminated,cancelled',
            'terms_and_conditions' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $contract->update($request->all());

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật hợp đồng thành công.',
            'data' => $contract->fresh(['supplier', 'project', 'signer'])
        ]);
    }

    /**
     * Xóa hợp đồng
     */
    public function destroy(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.delete') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa hợp đồng.'
            ], 403);
        }

        $contract = SupplierContract::findOrFail($id);

        if ($contract->status === 'active' && $contract->signed_at) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa hợp đồng đã ký.'
            ], 422);
        }

        $contract->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa hợp đồng thành công.'
        ]);
    }

    /**
     * Ký hợp đồng
     */
    public function sign(Request $request, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('suppliers.approve') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền ký hợp đồng.'
            ], 403);
        }

        $contract = SupplierContract::findOrFail($id);

        if ($contract->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể ký hợp đồng ở trạng thái draft.'
            ], 422);
        }

        $contract->sign($user);

        return response()->json([
            'success' => true,
            'message' => 'Đã ký hợp đồng thành công.',
            'data' => $contract->fresh(['signer'])
        ]);
    }
}
