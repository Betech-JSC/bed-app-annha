<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Cost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

use App\Constants\Permissions;
use App\Services\AuthorizationService;

class CostController extends Controller
{
    protected $authService;
    protected $financialService;

    public function __construct(\App\Services\AuthorizationService $authService, \App\Services\FinancialService $financialService)
    {
        $this->authService = $authService;
        $this->financialService = $financialService;
    }
    /**
     * Danh sách chi phí
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, Permissions::COST_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem chi phí của dự án này.'
            ], 403);
        }

        $query = Cost::where('project_id', $project->id)
            ->with(['creator', 'managementApprover', 'accountantApprover', 'attachments', 'costGroup', 'subcontractor', 'material', 'materialBill', 'equipmentAllocation.equipment']);

        // Filter theo category hoặc cost_group_id
        if ($category = $request->query('category')) {
            if (str_starts_with($category, 'group_')) {
                $query->where('cost_group_id', substr($category, 6));
            } else {
                $query->where('category', $category);
            }
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

        // Calculate total amount before pagination
        $totalAmount = $query->sum('amount');

        $limit = $request->query('limit', 15);
        $costs = $query->orderByDesc('cost_date')->paginate($limit);

        return response()->json([
            'success' => true,
            'data' => $costs,
            'meta' => [
                'total_amount' => (float) $totalAmount,
            ],
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
        if (!$this->authService->can($user, Permissions::COST_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo chi phí cho dự án này.'
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

        try {
            $cost = $this->financialService->upsertCost($validated, null, $user);

            return response()->json([
                'success' => true,
                'message' => 'Chi phí đã được tạo.',
                'data' => $cost,
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Xem chi tiết chi phí
     */
    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, Permissions::COST_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem chi phí của dự án này.'
            ], 403);
        }

        $cost = Cost::where('project_id', $project->id)
            ->with(['creator', 'managementApprover', 'accountantApprover', 'attachments', 'costGroup', 'subcontractor', 'material', 'materialTransactions', 'materialBill.items.material', 'materialBill.supplier'])
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
        if (!$this->authService->can($user, Permissions::COST_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật chi phí của dự án này.'
            ], 403);
        }

        // Chỉ cho phép cập nhật khi ở trạng thái draft (trừ Super Admin)
        if (!$user->owner && $cost->status !== 'draft') {
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
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
            'equipment_allocation_id' => 'nullable|exists:equipment_allocations,id',
        ]);

        try {
            $cost = $this->financialService->upsertCost($validated, $cost, $user);

            return response()->json([
                'success' => true,
                'message' => 'Chi phí đã được cập nhật.',
                'data' => $cost,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 422);
        }
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
        if (!$this->authService->can($user, Permissions::COST_SUBMIT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền gửi chi phí để duyệt.'
            ], 403);
        }

        try {
            $this->financialService->submitCost($cost, $user);

            return response()->json([
                'success' => true,
                'message' => 'Chi phí đã được gửi để Ban điều hành duyệt.',
                'data' => $cost->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 400);
        }
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
        if (!$this->authService->can($user, Permissions::COST_APPROVE_MANAGEMENT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt chi phí (Ban điều hành).'
            ], 403);
        }

        try {
            $this->financialService->approveCostByManagement($cost, $user);

            return response()->json([
                'success' => true,
                'message' => 'Chi phí đã được Ban điều hành duyệt.',
                'data' => $cost->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 400);
        }
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
        if (!$this->authService->can($user, Permissions::COST_APPROVE_ACCOUNTANT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xác nhận chi phí (Kế toán).'
            ], 403);
        }

        $validated = $request->validate([
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'required|integer|exists:attachments,id',
        ]);

        try {
            $this->financialService->approveCostByAccountant($cost, $validated, $user);

            return response()->json([
                'success' => true,
                'message' => 'Chi phí đã được Kế toán xác nhận.',
                'data' => $cost->fresh(['attachments']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 400);
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
        if (!$this->authService->can($user, Permissions::COST_REJECT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối chi phí.'
            ], 403);
        }

        $validated = $request->validate([
            'rejected_reason' => 'required|string|max:500',
        ]);

        try {
            $this->financialService->rejectCost($cost, $validated['rejected_reason'], $user);

            return response()->json([
                'success' => true,
                'message' => 'Chi phí đã bị từ chối.',
                'data' => $cost->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 400);
        }
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
        if (!$this->authService->can($user, Permissions::COST_DELETE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa chi phí của dự án này.'
            ], 403);
        }

        // Chỉ cho phép xóa khi ở trạng thái draft (trừ Super Admin)
        if (!$user->owner && $cost->status !== 'draft') {
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
    /**
     * Hoàn duyệt chi phí về trạng thái nháp
     */
    public function revertToDraft(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cost = Cost::where('project_id', $project->id)->findOrFail($id);
        $user = $request->user();

        // Check permission - Requires dedicated revert permission
        $canRevert = $this->authService->can($user, Permissions::COST_REVERT, $project);

        if (!$canRevert) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền hoàn duyệt chi phí này.'
            ], 403);
        }

        try {
            $this->financialService->revertCostToDraft($cost);

            return response()->json([
                'success' => true,
                'message' => 'Chi phí đã được hoàn về trạng thái nháp.',
                'data' => $cost->fresh(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 400);
        }
    }
}
