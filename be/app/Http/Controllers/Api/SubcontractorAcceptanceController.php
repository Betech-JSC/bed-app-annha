<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SubcontractorAcceptance;
use App\Models\Subcontractor;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SubcontractorAcceptanceController extends Controller
{
    /**
     * Danh sách nghiệm thu thầu phụ
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission('subcontractors.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem nghiệm thu thầu phụ.'
            ], 403);
        }

        $query = SubcontractorAcceptance::with(['subcontractor', 'project', 'contract', 'accepter']);

        if ($projectId = $request->query('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($subcontractorId = $request->query('subcontractor_id')) {
            $query->where('subcontractor_id', $subcontractorId);
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

        if (!$user->hasPermission('subcontractors.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo nghiệm thu.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'subcontractor_id' => 'required|exists:subcontractors,id',
            'project_id' => 'required|exists:projects,id',
            'subcontractor_contract_id' => 'nullable|exists:subcontractor_contracts,id',
            'acceptance_number' => 'nullable|string|max:100|unique:subcontractor_acceptances,acceptance_number',
            'acceptance_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'acceptance_date' => 'required|date',
            'accepted_volume' => 'required|numeric|min:0',
            'volume_unit' => 'nullable|string|max:20',
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

        $acceptance = SubcontractorAcceptance::create($data);

        $acceptance->load(['subcontractor', 'project', 'contract']);

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

        if (!$user->hasPermission('subcontractors.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem nghiệm thu.'
            ], 403);
        }

        $acceptance = SubcontractorAcceptance::with([
            'subcontractor',
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

        if (!$user->hasPermission('subcontractors.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật nghiệm thu.'
            ], 403);
        }

        $acceptance = SubcontractorAcceptance::findOrFail($id);

        // Không cho phép sửa nghiệm thu đã approved/rejected
        if (in_array($acceptance->status, ['approved', 'rejected'])) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể sửa nghiệm thu đã được duyệt/từ chối.'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'acceptance_number' => 'sometimes|nullable|string|max:100|unique:subcontractor_acceptances,acceptance_number,' . $id,
            'acceptance_name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'acceptance_date' => 'sometimes|required|date',
            'accepted_volume' => 'sometimes|required|numeric|min:0',
            'volume_unit' => 'nullable|string|max:20',
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
            'data' => $acceptance->fresh(['subcontractor', 'project', 'contract'])
        ]);
    }

    /**
     * Xóa nghiệm thu
     */
    public function destroy(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('subcontractors.delete') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa nghiệm thu.'
            ], 403);
        }

        $acceptance = SubcontractorAcceptance::findOrFail($id);

        // Không cho phép xóa nghiệm thu đã approved
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

        if (!$user->hasPermission('subcontractors.approve') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền duyệt nghiệm thu.'
            ], 403);
        }

        $acceptance = SubcontractorAcceptance::findOrFail($id);

        if ($acceptance->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể duyệt nghiệm thu ở trạng thái pending.'
            ], 422);
        }

        $notes = $request->input('notes');
        $acceptance->approve($user, $notes);

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

        if (!$user->hasPermission('subcontractors.approve') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền từ chối nghiệm thu.'
            ], 403);
        }

        $acceptance = SubcontractorAcceptance::findOrFail($id);

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
