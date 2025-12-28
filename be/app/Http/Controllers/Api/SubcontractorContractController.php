<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubcontractorContract;
use App\Models\Subcontractor;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SubcontractorContractController extends Controller
{
    /**
     * Danh sách hợp đồng thầu phụ
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('subcontractors.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem hợp đồng thầu phụ.'
            ], 403);
        }

        $query = SubcontractorContract::with(['subcontractor', 'project', 'signer']);

        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($subcontractorId = $request->query('subcontractor_id')) {
            $query->where('subcontractor_id', $subcontractorId);
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

        if (!$user->hasPermission('subcontractors.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo hợp đồng thầu phụ.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'subcontractor_id' => 'required|exists:subcontractors,id',
            'project_id' => 'required|exists:projects,id',
            'global_subcontractor_id' => 'nullable|exists:global_subcontractors,id',
            'contract_number' => 'nullable|string|max:100|unique:subcontractor_contracts,contract_number',
            'contract_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'contract_date' => 'required|date',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'contract_value' => 'required|numeric|min:0|max:99999999999999999.99',
            'advance_payment' => 'nullable|numeric|min:0',
            'retention' => 'nullable|numeric|min:0',
            'retention_percentage' => 'nullable|numeric|min:0|max:100',
            'payment_method' => 'required|in:milestone,progress,monthly,lump_sum',
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

        // Tính retention nếu chỉ có percentage
        if (isset($data['retention_percentage']) && !isset($data['retention'])) {
            $data['retention'] = ($data['contract_value'] * $data['retention_percentage']) / 100;
        }

        $contract = SubcontractorContract::create($data);

        $contract->load(['subcontractor', 'project', 'signer']);

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

        if (!$user->hasPermission('subcontractors.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem hợp đồng.'
            ], 403);
        }

        $contract = SubcontractorContract::with([
            'subcontractor', 
            'project', 
            'signer', 
            'acceptances',
            'progress',
            'payments'
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

        if (!$user->hasPermission('subcontractors.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật hợp đồng.'
            ], 403);
        }

        $contract = SubcontractorContract::findOrFail($id);

        // Không cho phép sửa hợp đồng đã ký
        if ($contract->status === 'active' && $contract->signed_at) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể sửa hợp đồng đã ký.'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'contract_number' => 'sometimes|nullable|string|max:100|unique:subcontractor_contracts,contract_number,' . $id,
            'contract_name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'contract_date' => 'sometimes|required|date',
            'start_date' => 'sometimes|required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'contract_value' => 'sometimes|required|numeric|min:0|max:99999999999999999.99',
            'advance_payment' => 'nullable|numeric|min:0',
            'retention' => 'nullable|numeric|min:0',
            'retention_percentage' => 'nullable|numeric|min:0|max:100',
            'payment_method' => 'sometimes|required|in:milestone,progress,monthly,lump_sum',
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

        // Tính retention nếu chỉ có percentage
        if (isset($data['retention_percentage']) && !isset($data['retention'])) {
            $contractValue = $data['contract_value'] ?? $contract->contract_value;
            $data['retention'] = ($contractValue * $data['retention_percentage']) / 100;
        }

        $contract->update($data);

        $contract->load(['subcontractor', 'project', 'signer']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật hợp đồng thành công.',
            'data' => $contract
        ]);
    }

    /**
     * Xóa hợp đồng
     */
    public function destroy(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('subcontractors.delete') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa hợp đồng.'
            ], 403);
        }

        $contract = SubcontractorContract::findOrFail($id);

        // Không cho phép xóa hợp đồng đã ký
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

        if (!$user->hasPermission('subcontractors.approve') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền ký hợp đồng.'
            ], 403);
        }

        $contract = SubcontractorContract::findOrFail($id);

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
