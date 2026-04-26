<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EquipmentPurchase;
use App\Models\EquipmentPurchaseItem;
use App\Models\Equipment;
use App\Constants\Permissions;
use App\Models\Cost;
use App\Models\CostGroup;
use App\Models\Project;
use App\Services\AuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Services\EquipmentService;

class EquipmentPurchaseController extends Controller
{
    protected $authService;
    protected $equipmentService;

    public function __construct(\App\Services\AuthorizationService $authService, \App\Services\EquipmentService $equipmentService)
    {
        $this->authService = $authService;
        $this->equipmentService = $equipmentService;
    }
    /**
     * Danh sách phiếu mua thiết bị theo dự án
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem phiếu mua thiết bị của dự án này.'
            ], 403);
        }

        $query = EquipmentPurchase::where('project_id', $projectId)
            ->with(['items', 'creator:id,name', 'approver:id,name', 'confirmer:id,name'])
            ->orderBy('created_at', 'desc');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json([
            'success' => true,
            'data' => $query->paginate(20),
        ]);
    }

    /**
     * Chi tiết phiếu mua
     */
    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem phiếu mua thiết bị này.'
            ], 403);
        }

        $purchase = EquipmentPurchase::where('project_id', $projectId)
            ->with(['items', 'creator:id,name', 'approver:id,name', 'confirmer:id,name', 'attachments'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $purchase,
        ]);
    }

    /**
     * Tạo phiếu mua + items 
     */
    public function store(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo phiếu mua thiết bị cho dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'notes'              => 'nullable|string',
            'items'              => 'required|array|min:1',
            'items.*.name'       => 'required|string|max:255',
            'items.*.code'       => 'nullable|string|max:100',
            'items.*.quantity'   => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'attachment_ids'     => 'nullable|array',
            'attachment_ids.*'   => 'exists:attachments,id',
        ]);

        try {
            $validated['project_id'] = $projectId;
            $purchase = $this->equipmentService->upsertPurchase($validated, null, $user);

            // Create project cost (draft) for tracking
            $costGroup = CostGroup::where('code', 'equipment')
                ->orWhere('name', 'like', '%thiết bị%')
                ->where('is_active', true)
                ->first();

            $itemNames = collect($validated['items'])->pluck('name')->implode(', ');
            if (strlen($itemNames) > 100) {
                $itemNames = substr($itemNames, 0, 97) . '...';
            }

            Cost::create([
                'project_id' => $projectId,
                'cost_group_id' => $costGroup ? $costGroup->id : null,
                'category' => 'equipment',
                'name' => "Mua thiết bị: {$itemNames}",
                'amount' => $purchase->total_amount,
                'description' => "Từ phiếu mua thiết bị #{$purchase->id}. " . ($purchase->notes ?? ""),
                'cost_date' => now()->toDateString(),
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo phiếu mua thiết bị.',
                'data'    => $purchase->fresh(['items', 'creator:id,name', 'attachments']),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cập nhật phiếu mua + items (chỉ khi Nháp/Từ chối)
     */
    public function update(string $projectId, string $id, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật phiếu mua thiết bị này.'
            ], 403);
        }

        $purchase = EquipmentPurchase::where('project_id', $projectId)->findOrFail($id);

        $validated = $request->validate([
            'notes'              => 'nullable|string',
            'items'              => 'sometimes|array|min:1',
            'items.*.name'       => 'required|string|max:255',
            'items.*.code'       => 'nullable|string|max:100',
            'items.*.quantity'   => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'attachment_ids'     => 'nullable|array',
            'attachment_ids.*'   => 'exists:attachments,id',
        ]);

        try {
            $this->equipmentService->upsertPurchase($validated, $purchase, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật phiếu mua.',
                'data'    => $purchase->fresh(['items', 'creator:id,name', 'attachments']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Xóa phiếu (chỉ khi Nháp)
     */
    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_DELETE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa phiếu mua thiết bị này.'
            ], 403);
        }

        $purchase = EquipmentPurchase::where('project_id', $projectId)->findOrFail($id);

        if ($purchase->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xóa phiếu ở trạng thái Nháp.',
            ], 422);
        }

        $purchase->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa phiếu mua.',
        ]);
    }

    // ====================================================================
    // WORKFLOW
    // ====================================================================

    public function submit(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền gửi duyệt phiếu mua thiết bị này.'
            ], 403);
        }

        $purchase = EquipmentPurchase::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->equipmentService->submitPurchase($purchase);

            return response()->json([
                'success' => true,
                'message' => 'Đã gửi phiếu mua để BĐH duyệt.',
                'data'    => $purchase->fresh(['items', 'creator:id,name']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function approveManagement(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt phiếu mua thiết bị này.'
            ], 403);
        }

        $purchase = EquipmentPurchase::where('project_id', $projectId)->findOrFail($id);

        if ($this->equipmentService->approvePurchaseByManagement($purchase, $user)) {
             return response()->json([
                 'success' => true,
                 'message' => 'BĐH đã duyệt. Chuyển sang Kế toán.',
                 'data'    => $purchase->fresh(['items', 'creator:id,name', 'approver:id,name']),
             ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Thao tác không thành công hoặc sai trạng thái.',
        ], 422);
    }

    public function rejectManagement(string $projectId, string $id, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối phiếu mua thiết bị này.'
            ], 403);
        }

        $purchase = EquipmentPurchase::where('project_id', $projectId)->findOrFail($id);
        $request->validate(['reason' => 'required|string']);

        if ($this->equipmentService->rejectPurchase($purchase, $request->reason, $user)) {
            return response()->json([
                'success' => true,
                'message' => 'Đã từ chối phiếu mua.',
                'data'    => $purchase->fresh(['items', 'creator:id,name', 'approver:id,name']),
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Thao tác không thành công hoặc sai trạng thái.',
        ], 422);
    }

    /**
     * Kế toán xác nhận CK → tự động tạo Equipment (kho)
     */
    public function confirmAccountant(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::COST_APPROVE_ACCOUNTANT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xác nhận thanh toán mua thiết bị này.'
            ], 403);
        }

        $purchase = EquipmentPurchase::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->equipmentService->confirmPurchaseByAccountant($purchase, $user);

            // Create global project cost for reporting (approved state)
            $costGroup = CostGroup::where('code', 'equipment')
                ->orWhere('name', 'like', '%thiết bị%')
                ->where('is_active', true)
                ->first();

            Cost::create([
                'project_id'             => $projectId,
                'cost_group_id'          => $costGroup ? $costGroup->id : null,
                'category'               => 'equipment',
                'name'                   => "Mua thiết bị cho DA: {$project->name}",
                'amount'                 => $purchase->total_amount,
                'description'            => "Từ phiếu mua thiết bị #{$purchase->id}. " . ($purchase->notes ?? ""),
                'cost_date'              => now(),
                'status'                 => 'approved',
                'created_by'             => $purchase->created_by,
                'management_approved_by' => $purchase->approved_by,
                'management_approved_at' => $purchase->approved_at,
                'accountant_approved_by' => $user->id,
                'accountant_approved_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Kế toán đã xác nhận. Thiết bị đã được nhập kho công ty.',
                'data'    => $purchase->fresh(['items', 'creator:id,name', 'approver:id,name', 'confirmer:id,name']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 500);
        }
    }
}
