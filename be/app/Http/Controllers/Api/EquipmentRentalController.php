<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EquipmentRental;
use App\Constants\Permissions;
use App\Models\Cost;
use App\Models\CostGroup;
use App\Models\Project;
use App\Services\AuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EquipmentRentalController extends Controller
{
    protected $authService;

    public function __construct(AuthorizationService $authService)
    {
        $this->authService = $authService;
    }
    /**
     * Danh sách phiếu thuê thiết bị theo dự án
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem phiếu thuê thiết bị của dự án này.'
            ], 403);
        }

        $query = EquipmentRental::where('project_id', $projectId)
            ->with(['equipment', 'supplier:id,name', 'creator:id,name', 'approver:id,name', 'confirmer:id,name'])
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
     * Chi tiết phiếu thuê
     */
    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem phiếu thuê thiết bị này.'
            ], 403);
        }

        $rental = EquipmentRental::where('project_id', $projectId)
            ->with(['equipment', 'supplier', 'creator:id,name', 'approver:id,name', 'confirmer:id,name', 'attachments'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $rental,
        ]);
    }

    /**
     * Tạo phiếu thuê thiết bị (Nháp)
     */
    public function store(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo phiếu thuê thiết bị cho dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'equipment_name'        => 'required|string|max:255',
            'equipment_id'          => 'nullable|exists:equipment,id',
            'supplier_id'           => 'nullable|exists:suppliers,id',
            'rental_start_date'     => 'required|date',
            'rental_end_date'       => 'required|date|after:rental_start_date',
            'quantity'              => 'required|integer|min:1',
            'unit_price'            => 'required|numeric|min:0',
            'notes'                 => 'nullable|string',
            'attachment_ids'        => 'nullable|array',
            'attachment_ids.*'      => 'exists:attachments,id',
        ]);

        $totalCost = $validated['quantity'] * $validated['unit_price'];

        try {
            DB::beginTransaction();

            $rental = EquipmentRental::create([
                'project_id'            => $projectId,
                'equipment_name'        => $validated['equipment_name'],
                'equipment_id'          => $validated['equipment_id'] ?? null,
                'quantity'              => $validated['quantity'],
                'unit_price'            => $validated['unit_price'],
                'supplier_id'           => $validated['supplier_id'] ?? null,
                'rental_start_date'     => $validated['rental_start_date'],
                'rental_end_date'       => $validated['rental_end_date'],
                'total_cost'            => $totalCost,
                'notes'                 => $validated['notes'] ?? null,
                'status'                => 'draft',
                'created_by'            => $user->id,
            ]);

            // Gắn attachments
            if (!empty($validated['attachment_ids'])) {
                \App\Models\Attachment::whereIn('id', $validated['attachment_ids'])
                    ->update([
                        'attachable_type' => EquipmentRental::class,
                        'attachable_id'   => $rental->id,
                    ]);
            }

            // Create project cost (draft) for tracking
            $costGroup = CostGroup::where('code', 'equipment')
                ->orWhere('name', 'like', '%thiết bị%')
                ->where('is_active', true)
                ->first();

            $supplierName = '';
            if ($rental->supplier_id) {
                $supplier = \App\Models\Supplier::find($rental->supplier_id);
                $supplierName = $supplier->name ?? '';
            }

            $cost = Cost::create([
                'project_id' => $projectId,
                'cost_group_id' => $costGroup ? $costGroup->id : null,
                'category' => 'equipment',
                'supplier_id' => $rental->supplier_id,
                'name' => "Thuê thiết bị: " . $rental->equipment_name . ($supplierName ? " - {$supplierName}" : ""),
                'amount' => $rental->total_cost,
                'description' => "Từ phiếu thuê thiết bị #{$rental->id}. " . ($rental->notes ?? ""),
                'cost_date' => $rental->rental_start_date,
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

            // Link cost to rental
            $rental->update(['cost_id' => $cost->id]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo phiếu thuê thiết bị.',
                'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name', 'attachments']),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Cập nhật phiếu thuê (chỉ khi Nháp hoặc Từ chối)
     */
    public function update(string $projectId, string $id, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật phiếu thuê thiết bị này.'
            ], 403);
        }

        $rental = EquipmentRental::where('project_id', $projectId)->findOrFail($id);

        if (!in_array($rental->status, ['draft', 'rejected'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể chỉnh sửa phiếu ở trạng thái Nháp hoặc Từ chối.',
            ], 422);
        }

        $validated = $request->validate([
            'equipment_name'        => 'sometimes|string|max:255',
            'equipment_id'          => 'nullable|exists:equipment,id',
            'supplier_id'           => 'nullable|exists:suppliers,id',
            'rental_start_date'     => 'sometimes|date',
            'rental_end_date'       => 'sometimes|date|after:rental_start_date',
            'quantity'              => 'sometimes|integer|min:1',
            'unit_price'            => 'sometimes|numeric|min:0',
            'notes'                 => 'nullable|string',
            'attachment_ids'        => 'nullable|array',
            'attachment_ids.*'      => 'exists:attachments,id',
        ]);

        if (isset($validated['quantity']) || isset($validated['unit_price'])) {
            $qty = $validated['quantity'] ?? $rental->quantity;
            $price = $validated['unit_price'] ?? $rental->unit_price;
            $validated['total_cost'] = $qty * $price;
        }

        $rental->update($validated);

        // Cập nhật Cost liên quan
        if ($rental->cost_id && (isset($validated['total_cost']) || isset($validated['notes']) || isset($validated['equipment_name']))) {
            $cost = Cost::find($rental->cost_id);
            if ($cost) {
                $cost->update([
                    'amount'      => $rental->total_cost,
                    'description' => "Từ phiếu thuê thiết bị #{$rental->id}. " . ($rental->notes ?? ""),
                    'name'        => "Thuê thiết bị: " . $rental->equipment_name,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật phiếu thuê.',
            'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name', 'attachments']),
        ]);
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
                'message' => 'Bạn không có quyền xóa phiếu thuê thiết bị này.'
            ], 403);
        }

        $rental = EquipmentRental::where('project_id', $projectId)->findOrFail($id);

        if ($rental->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xóa phiếu ở trạng thái Nháp.',
            ], 422);
        }

        $rental->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa phiếu thuê.',
        ]);
    }

    // ====================================================================
    // WORKFLOW ACTIONS
    // ====================================================================

    /**
     * Bước 1: Người lập gửi duyệt (draft → pending_management)
     */
    public function submit(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền gửi duyệt phiếu thuê thiết bị này.'
            ], 403);
        }

        $rental = EquipmentRental::where('project_id', $projectId)->findOrFail($id);

        if (!in_array($rental->status, ['draft', 'rejected'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể gửi duyệt phiếu ở trạng thái Nháp hoặc Từ chối.',
            ], 422);
        }

        $rental->update([
            'status'           => 'pending_management',
            'rejection_reason' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi phiếu thuê để BĐH duyệt.',
            'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name', 'approver:id,name', 'attachments']),
        ]);
    }

    /**
     * Bước 2a: BĐH duyệt (pending_management → pending_accountant)
     */
    public function approveManagement(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt phiếu thuê thiết bị này.'
            ], 403);
        }

        $rental = EquipmentRental::where('project_id', $projectId)->findOrFail($id);

        if ($rental->status !== 'pending_management') {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu không ở trạng thái chờ BĐH duyệt.',
            ], 422);
        }

        $rental->update([
            'status'      => 'pending_accountant',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'BĐH đã duyệt. Chuyển sang Kế toán.',
            'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name', 'approver:id,name', 'attachments']),
        ]);
    }

    /**
     * Bước 2b: BĐH từ chối (pending_management → rejected)
     */
    public function rejectManagement(string $projectId, string $id, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối phiếu thuê thiết bị này.'
            ], 403);
        }

        $rental = EquipmentRental::where('project_id', $projectId)->findOrFail($id);

        if ($rental->status !== 'pending_management') {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu không ở trạng thái chờ BĐH duyệt.',
            ], 422);
        }

        $request->validate(['reason' => 'required|string']);

        $rental->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->reason,
            'approved_by'      => $user->id,
            'approved_at'      => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối phiếu thuê.',
            'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name', 'approver:id,name', 'attachments']),
        ]);
    }

    /**
     * Bước 3: Kế toán xác nhận đã chuyển khoản (pending_accountant → completed)
     */
    public function confirmAccountant(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::COST_APPROVE_ACCOUNTANT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xác nhận thanh toán thiết bị này.'
            ], 403);
        }

        $rental = EquipmentRental::where('project_id', $projectId)->findOrFail($id);

        if ($rental->status !== 'pending_accountant') {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu không ở trạng thái chờ Kế toán.',
            ], 422);
        }

        $rental->update([
            'status'       => 'in_use',
            'confirmed_by' => $user->id,
            'confirmed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Kế toán đã xác nhận. Thiết bị chuyển sang Đang sử dụng.',
            'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name', 'approver:id,name', 'confirmer:id,name', 'attachments']),
        ]);
    }

    /**
     * Người lập đánh dấu đã trả (in_use → pending_return)
     */
    public function requestReturn(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền yêu cầu trả thiết bị này.'
            ], 403);
        }

        $rental = EquipmentRental::where('project_id', $projectId)->findOrFail($id);

        if ($rental->status !== 'in_use') {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu thuê không ở trạng thái đang sử dụng.',
            ], 422);
        }

        $rental->update(['status' => 'pending_return']);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi yêu cầu trả thiết bị thuê.',
            'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name']),
        ]);
    }

    /**
     * KT xác nhận trả (pending_return → returned)
     */
    public function confirmReturn(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::COST_APPROVE_ACCOUNTANT, $project)) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xác nhận trả.'], 403);
        }

        $rental = EquipmentRental::where('project_id', $projectId)->findOrFail($id);

        if ($rental->status !== 'pending_return') {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu thuê không ở trạng thái chờ xác nhận trả.',
            ], 422);
        }

        $rental->update(['status' => 'returned']);

        return response()->json([
            'success' => true,
            'message' => 'Đã xác nhận trả thiết bị thuê.',
            'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name']),
        ]);
    }
}
