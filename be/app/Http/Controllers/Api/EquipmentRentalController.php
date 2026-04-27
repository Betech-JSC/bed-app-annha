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
use App\Services\EquipmentService;

class EquipmentRentalController extends Controller
{
    protected $authService;
    protected $equipmentService;

    public function __construct(\App\Services\AuthorizationService $authService, \App\Services\EquipmentService $equipmentService)
    {
        $this->authService = $authService;
        $this->equipmentService = $equipmentService;
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

        try {
            $validated['project_id'] = $projectId;
            $rental = $this->equipmentService->upsertRental($validated, null, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo phiếu thuê thiết bị.',
                'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name', 'attachments']),
            ], 201);
        } catch (\Exception $e) {
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

        try {
            $this->equipmentService->upsertRental($validated, $rental, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật phiếu thuê.',
                'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name', 'attachments']),
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

        try {
            $this->equipmentService->submitRental($rental);

            return response()->json([
                'success' => true,
                'message' => 'Đã gửi phiếu thuê để BĐH duyệt.',
                'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name', 'approver:id,name', 'attachments']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
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

        if ($this->equipmentService->approveRentalByManagement($rental, $user)) {
             return response()->json([
                 'success' => true,
                 'message' => 'BĐH đã duyệt. Chuyển sang Kế toán.',
                 'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name', 'approver:id,name', 'attachments']),
             ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Thao tác không thành công hoặc sai trạng thái.',
        ], 422);
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
        $request->validate(['reason' => 'required|string']);

        if ($this->equipmentService->rejectRental($rental, $request->reason, $user)) {
            return response()->json([
                'success' => true,
                'message' => 'Đã từ chối phiếu thuê.',
                'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name', 'approver:id,name', 'attachments']),
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Thao tác không thành công hoặc sai trạng thái.',
        ], 422);
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

        // Financial Gatekeeper: Mandatory attachments for accountant confirmation
        if ($rental->attachments()->count() === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu thuê thiết bị bắt buộc phải có file chứng từ đính kèm trước khi kế toán xác nhận.',
            ], 422);
        }

        if ($this->equipmentService->confirmRentalByAccountant($rental, $user)) {
            return response()->json([
                'success' => true,
                'message' => 'Kế toán đã xác nhận. Thiết bị chuyển sang Đang sử dụng.',
                'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name', 'approver:id,name', 'confirmer:id,name', 'attachments']),
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Thao tác không thành công hoặc sai trạng thái.',
        ], 422);
    }

    /**
     * Người lập đánh dấu đã trả (in_use → pending_return)
     */
    public function requestReturn(string $projectId, string $id)
    {
        $rental = EquipmentRental::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->equipmentService->requestReturnRental($rental);

            return response()->json([
                'success' => true,
                'message' => 'Đã gửi yêu cầu trả thiết bị thuê.',
                'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * KT xác nhận trả (pending_return → returned)
     */
    public function confirmReturn(string $projectId, string $id)
    {
        $user = auth()->user();
        $rental = EquipmentRental::where('project_id', $projectId)->findOrFail($id);

        if ($this->equipmentService->confirmReturnRental($rental, $user)) {
             return response()->json([
                 'success' => true,
                 'message' => 'Đã xác nhận trả thiết bị thuê.',
                 'data'    => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name']),
             ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Thao tác không thành công hoặc sai trạng thái.',
        ], 422);
    }

    /**
     * Hoàn duyệt phiếu thuê thiết bị về trạng thái nháp
     */
    public function revertToDraft(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::EQUIPMENT_REVERT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền hoàn duyệt phiếu thuê thiết bị này.'
            ], 403);
        }

        $rental = EquipmentRental::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->equipmentService->revertRentalToDraft($rental, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã đưa phiếu thuê thiết bị về trạng thái nháp.',
                'data' => $rental->fresh(['equipment', 'supplier:id,name', 'creator:id,name', 'approver:id,name'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage()
            ], 400);
        }
    }
}
