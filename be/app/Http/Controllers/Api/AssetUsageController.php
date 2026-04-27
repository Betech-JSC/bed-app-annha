<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssetUsage;
use App\Models\Equipment;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

use App\Services\EquipmentService;

class AssetUsageController extends Controller
{
    protected $equipmentService;

    public function __construct(EquipmentService $equipmentService)
    {
        $this->equipmentService = $equipmentService;
    }

    /**
     * Danh sách phiếu sử dụng thiết bị theo dự án
     */
    public function index(string $projectId, Request $request)
    {
        $query = AssetUsage::where('project_id', $projectId)
            ->with(['asset:id,name,code,status', 'receiver:id,name', 'creator:id,name', 'approver:id,name', 'confirmer:id,name'])
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
     * Chi tiết phiếu sử dụng
     */
    public function show(string $projectId, string $id)
    {
        $usage = AssetUsage::where('project_id', $projectId)
            ->with(['asset', 'receiver:id,name,email', 'creator:id,name,email', 'approver:id,name', 'confirmer:id,name', 'attachments'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $usage,
        ]);
    }

    /**
     * Lấy danh sách thiết bị còn tồn kho (cho dropdown)
     */
    public function availableAssets(Request $request)
    {
        $query = Equipment::whereIn('status', ['available', 'in_use'])
            ->orderBy('name');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%");
            });
        }

        $assets = $query->get(['id', 'name', 'code as asset_code', 'category', 'status', 'quantity', 'current_value']);
        
        // Bổ sung thuộc tính remaining_quantity và lọc
        $filtered = $assets->map(function ($item) {
            $item->remaining_quantity = $item->remaining_quantity; // using accessor
            return $item;
        })->filter(function ($item) {
            return $item->remaining_quantity > 0;
        })->values();

        return response()->json([
            'success' => true,
            'data' => $filtered,
        ]);
    }

    /**
     * Tạo phiếu sử dụng thiết bị (status = draft)
     */
    public function store(string $projectId, Request $request)
    {
        $user = auth()->user();

        $validated = $request->validate([
            'equipment_id' => 'required|exists:equipment,id',
            'quantity'         => 'required|integer|min:1',
            'receiver_id'      => 'required|exists:users,id',
            'received_date'    => 'required|date',
            'notes'            => 'nullable|string',
        ]);

        try {
            $validated['project_id'] = $projectId;
            $usage = $this->equipmentService->upsertUsage($validated, null, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo phiếu sử dụng thiết bị.',
                'data'    => $usage->fresh(['asset:id,name,code', 'receiver:id,name', 'creator:id,name']),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Cập nhật phiếu (chỉ khi draft hoặc rejected)
     */
    public function update(string $projectId, string $id, Request $request)
    {
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        $validated = $request->validate([
            'equipment_id'  => 'sometimes|exists:equipment,id',
            'quantity'      => 'sometimes|integer|min:1',
            'receiver_id'   => 'sometimes|exists:users,id',
            'received_date' => 'sometimes|date',
            'notes'         => 'nullable|string',
        ]);

        try {
            $this->equipmentService->upsertUsage($validated, $usage, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật phiếu.',
                'data'    => $usage->fresh(['asset:id,name,code', 'receiver:id,name', 'creator:id,name']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /**
     * Xóa phiếu (chỉ khi draft hoặc rejected)
     */
    public function destroy(string $projectId, string $id)
    {
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        if (!in_array($usage->status, ['draft', 'rejected'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xóa phiếu ở trạng thái Nháp hoặc Từ chối.',
            ], 422);
        }

        $usage->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa phiếu sử dụng.',
        ]);
    }

    // ====================================================================
    // 3-LEVEL APPROVAL WORKFLOW
    // ====================================================================

    /**
     * Bước 1: Người lập gửi duyệt (draft/rejected → pending_management)
     */
    public function submit(string $projectId, string $id)
    {
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->equipmentService->submitUsage($usage);

            return response()->json([
                'success' => true,
                'message' => 'Đã gửi phiếu để BĐH duyệt.',
                'data'    => $usage->fresh(['asset', 'receiver:id,name', 'creator:id,name', 'approver:id,name']),
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
        $user = auth()->user();
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        if ($this->equipmentService->approveUsageByManagement($usage, $user)) {
             return response()->json([
                 'success' => true,
                 'message' => 'BĐH đã duyệt. Chuyển sang Kế toán.',
                 'data'    => $usage->fresh(['asset', 'receiver:id,name', 'creator:id,name', 'approver:id,name']),
             ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Thao tác không thành công hoặc sai trạng thái.',
        ], 422);
    }

    /**
     * Bước 2b: Từ chối (pending_management/pending_accountant → rejected)
     */
    public function reject(string $projectId, string $id, Request $request)
    {
        $user = auth()->user();
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        $request->validate(['reason' => 'required|string']);

        if ($this->equipmentService->rejectUsage($usage, $request->reason, $user)) {
            return response()->json([
                'success' => true,
                'message' => 'Đã từ chối phiếu sử dụng thiết bị.',
                'data'    => $usage->fresh(['asset', 'receiver:id,name', 'creator:id,name', 'approver:id,name']),
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Thao tác không thành công hoặc sai trạng thái.',
        ], 422);
    }

    /**
     * Bước 3: KT xác nhận (pending_accountant → approved → auto in_use)
     * Khi KT duyệt, thiết bị tự động chuyển sang trạng thái "Đang sử dụng"
     */
    public function confirmAccountant(string $projectId, string $id)
    {
        $user = auth()->user();
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        // Financial Gatekeeper: Mandatory attachments for accountant confirmation
        if ($usage->attachments()->count() === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu sử dụng thiết bị bắt buộc phải có file chứng từ đính kèm trước khi kế toán xác nhận.',
            ], 422);
        }

        if ($this->equipmentService->confirmUsageByAccountant($usage, $user)) {
            return response()->json([
                'success' => true,
                'message' => 'KT đã xác nhận. Thiết bị chuyển sang trạng thái Đang sử dụng.',
                'data'    => $usage->fresh(['asset', 'receiver:id,name', 'creator:id,name', 'approver:id,name', 'confirmer:id,name']),
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Thao tác không thành công hoặc sai trạng thái.',
        ], 422);
    }

    // ====================================================================
    // LIFECYCLE MANAGEMENT (After approval)
    // ====================================================================

    /**
     * Người nhận yêu cầu trả (in_use → pending_return)
     */
    public function requestReturn(string $projectId, string $id)
    {
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->equipmentService->requestReturnUsage($usage);

            return response()->json([
                'success' => true,
                'message' => 'Đã gửi yêu cầu trả thiết bị.',
                'data'    => $usage->fresh(['asset', 'receiver:id,name', 'creator:id,name']),
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
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        if ($this->equipmentService->confirmReturnUsage($usage, $user)) {
             return response()->json([
                 'success' => true,
                 'message' => 'Đã xác nhận nhận lại thiết bị. Thiết bị đã trả về kho.',
                 'data'    => $usage->fresh(['asset', 'receiver:id,name', 'creator:id,name']),
             ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Thao tác không thành công hoặc sai trạng thái.',
        ], 422);
    }
}
