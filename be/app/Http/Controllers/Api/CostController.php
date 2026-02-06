<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Cost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CostController extends Controller
{
    /**
     * Danh sách chi phí
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);

        $query = Cost::where('project_id', $project->id)
            ->with(['creator', 'managementApprover', 'accountantApprover', 'attachments', 'costGroup', 'subcontractor', 'material', 'materialTransaction']);

        // Filter theo category
        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        // Filter theo status
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Search
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $costs = $query->orderByDesc('cost_date')->paginate(15);

        return response()->json([
            'success' => true,
            'data' => $costs,
        ]);
    }

    /**
     * Tạo chi phí mới (Quản lý dự án)
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = $request->user();

        // Check permission
        if (!$user->hasPermission(\App\Constants\Permissions::COST_CREATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo chi phí. Chỉ Super Admin mới có quyền này.'
            ], 403);
        }

        $validated = $request->validate([
            'cost_group_id' => 'nullable|exists:cost_groups,id',
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string|max:2000',
            'cost_date' => 'required|date',
            'subcontractor_id' => 'nullable|exists:subcontractors,id',
            'material_id' => 'nullable|exists:materials,id',
            'quantity' => 'nullable|numeric|min:0.01|required_with:material_id',
            'unit' => 'nullable|string|max:20|required_with:material_id',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        // Nếu có cost_group_id, kiểm tra cost_group có active không
        if (!empty($validated['cost_group_id'])) {
            $costGroup = \App\Models\CostGroup::find($validated['cost_group_id']);
            if (!$costGroup || !$costGroup->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nhóm chi phí không tồn tại hoặc đã bị vô hiệu hóa.'
                ], 422);
            }

            // Kiểm tra nếu cost group liên quan đến nhà thầu phụ thì bắt buộc phải chọn subcontractor
            $isSubcontractorCostGroup = $costGroup->code === 'subcontractor'
                || stripos($costGroup->name, 'nhà thầu phụ') !== false
                || stripos($costGroup->name, 'thầu phụ') !== false;

            if ($isSubcontractorCostGroup && empty($validated['subcontractor_id'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vui lòng chọn nhà thầu phụ liên quan cho loại chi phí này.'
                ], 422);
            }
        }

        // Kiểm tra subcontractor thuộc về project này
        if (!empty($validated['subcontractor_id'])) {
            $subcontractor = \App\Models\Subcontractor::where('project_id', $project->id)
                ->find($validated['subcontractor_id']);
            if (!$subcontractor) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nhà thầu phụ không thuộc về dự án này.'
                ], 422);
            }
        }

        try {
            DB::beginTransaction();

            $attachmentIds = $validated['attachment_ids'] ?? [];
            unset($validated['attachment_ids']);

            // Tự động xác định cost_group_id và category dựa trên nguồn phát sinh
            $autoDetectService = app(\App\Services\CostGroupAutoDetectService::class);

            $costData = [
                'project_id' => $project->id,
                'created_by' => $user->id,
                ...$validated,
                'status' => 'draft', // Mặc định là draft
            ];

            // Tự động xác định cost_group_id nếu chưa có
            if (empty($costData['cost_group_id'])) {
                $costData['cost_group_id'] = $autoDetectService->detectCostGroup($costData);
            }

            // Tự động xác định category
            $costData['category'] = $autoDetectService->detectCategory($costData);

            $cost = Cost::create($costData);

            // Đính kèm files nếu có
            if (!empty($attachmentIds)) {
                foreach ($attachmentIds as $attachmentId) {
                    $attachment = \App\Models\Attachment::find($attachmentId);
                    if ($attachment && ($attachment->uploaded_by === $user->id || $user->hasPermission(\App\Constants\Permissions::SETTINGS_MANAGE))) {
                        $attachment->update([
                            'attachable_type' => Cost::class,
                            'attachable_id' => $cost->id,
                        ]);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Chi phí đã được tạo.',
                'data' => $cost->load(['creator', 'attachments', 'subcontractor', 'costGroup']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Xem chi tiết chi phí
     */
    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = Cost::where('project_id', $project->id)
            ->with(['creator', 'managementApprover', 'accountantApprover', 'attachments', 'costGroup', 'subcontractor', 'material', 'materialTransaction'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $cost,
        ]);
    }

    /**
     * Cập nhật chi phí (chỉ khi draft)
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = Cost::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        // Check permission
        if (!$user->hasPermission(\App\Constants\Permissions::COST_UPDATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật chi phí. Chỉ Super Admin mới có quyền này.'
            ], 403);
        }

        // Chỉ cho phép cập nhật khi ở trạng thái draft (trừ Super Admin)
        if (!$isSuperAdmin && $cost->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể cập nhật chi phí ở trạng thái nháp.',
            ], 400);
        }

        $validated = $request->validate([
            'cost_group_id' => 'sometimes|nullable|exists:cost_groups,id',
            'name' => 'sometimes|string|max:255',
            'amount' => 'sometimes|numeric|min:0',
            'description' => 'nullable|string|max:2000',
            'cost_date' => 'sometimes|date',
            'material_id' => 'nullable|exists:materials,id',
            'quantity' => 'nullable|numeric|min:0.01|required_with:material_id',
            'unit' => 'nullable|string|max:20|required_with:material_id',
            'subcontractor_id' => 'nullable|exists:subcontractors,id',

            'payroll_id' => 'nullable|exists:payrolls,id',
            'equipment_allocation_id' => 'nullable|exists:equipment_allocations,id',
        ]);

        // Tự động xác định cost_group_id và category nếu chưa có
        $autoDetectService = app(\App\Services\CostGroupAutoDetectService::class);

        // Merge với dữ liệu hiện tại của cost để có đầy đủ thông tin
        $costData = array_merge([
            'material_id' => $cost->material_id,
            'subcontractor_id' => $cost->subcontractor_id,

            'payroll_id' => $cost->payroll_id,
            'equipment_allocation_id' => $cost->equipment_allocation_id,
        ], $validated);

        if (empty($validated['cost_group_id'])) {
            $validated['cost_group_id'] = $autoDetectService->detectCostGroup($costData);
        }

        if (empty($validated['category'])) {
            $validated['category'] = $autoDetectService->detectCategory($costData);
        }

        // Kiểm tra cost_group có active không (nếu được cập nhật)
        if (isset($validated['cost_group_id']) && $validated['cost_group_id']) {
            $costGroup = \App\Models\CostGroup::find($validated['cost_group_id']);
            if (!$costGroup || !$costGroup->is_active) {
                return response()->json([
                    'success' => false,
                    'message' => 'Nhóm chi phí không tồn tại hoặc đã bị vô hiệu hóa.'
                ], 422);
            }
        }

        $cost->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Chi phí đã được cập nhật.',
            'data' => $cost->fresh(),
        ]);
    }

    /**
     * Submit để Ban điều hành duyệt
     */
    public function submit(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = Cost::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        // Check RBAC permission
        if (!$user->owner && !$user->hasPermission(\App\Constants\Permissions::COST_SUBMIT)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền gửi chi phí để duyệt.'
            ], 403);
        }

        if ($cost->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể submit chi phí ở trạng thái nháp.',
            ], 400);
        }

        $cost->submitForManagementApproval();

        return response()->json([
            'success' => true,
            'message' => 'Chi phí đã được gửi để Ban điều hành duyệt.',
            'data' => $cost->fresh(),
        ]);
    }

    /**
     * Ban điều hành duyệt
     */
    public function approveByManagement(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = Cost::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        // Check RBAC permission
        if (!$user->owner && !$user->hasPermission(\App\Constants\Permissions::COST_APPROVE_MANAGEMENT)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt chi phí (Ban điều hành).'
            ], 403);
        }

        if ($cost->status !== 'pending_management_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Chi phí không ở trạng thái chờ Ban điều hành duyệt.',
            ], 400);
        }

        $cost->approveByManagement($user);

        return response()->json([
            'success' => true,
            'message' => 'Chi phí đã được Ban điều hành duyệt.',
            'data' => $cost->fresh(),
        ]);
    }

    /**
     * Kế toán xác nhận (final approval)
     */
    public function approveByAccountant(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = Cost::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        // Check RBAC permission
        if (!$user->owner && !$user->hasPermission(\App\Constants\Permissions::COST_APPROVE_ACCOUNTANT)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xác nhận chi phí (Kế toán).'
            ], 403);
        }

        if ($cost->status !== 'pending_accountant_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Chi phí không ở trạng thái chờ Kế toán xác nhận.',
            ], 400);
        }

        // Validate attachment_ids if provided
        $validated = $request->validate([
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
                            'attachable_type' => Cost::class,
                            'attachable_id' => $cost->id,
                        ]);
                    }
                }
            }

            $cost->approveByAccountant($user);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Chi phí đã được Kế toán xác nhận.',
                'data' => $cost->fresh(['attachments']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Từ chối chi phí
     */
    public function reject(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = Cost::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        // Check RBAC permission
        if (!$user->owner && !$user->hasPermission(\App\Constants\Permissions::COST_REJECT)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối chi phí.'
            ], 403);
        }

        $validated = $request->validate([
            'rejected_reason' => 'required|string|max:500',
        ]);

        if (!in_array($cost->status, ['pending_management_approval', 'pending_accountant_approval'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể từ chối chi phí đang chờ duyệt.',
            ], 400);
        }

        $cost->reject($validated['rejected_reason'], $user);

        return response()->json([
            'success' => true,
            'message' => 'Chi phí đã bị từ chối.',
            'data' => $cost->fresh(),
        ]);
    }

    /**
     * Xóa chi phí (chỉ khi draft)
     */
    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = Cost::where('project_id', $project->id)->findOrFail($id);
        $user = request()->user();

        // Check permission
        if (!$user->hasPermission(\App\Constants\Permissions::COST_DELETE)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa chi phí. Chỉ Super Admin mới có quyền này.'
            ], 403);
        }

        // Chỉ cho phép xóa khi ở trạng thái draft (trừ Super Admin)
        if (!$isSuperAdmin && $cost->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xóa chi phí ở trạng thái nháp.',
            ], 400);
        }

        $cost->delete();

        return response()->json([
            'success' => true,
            'message' => 'Chi phí đã được xóa.',
        ]);
    }
}
