<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssetUsage;
use App\Models\Equipment;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssetUsageController extends Controller
{
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

        $asset = Equipment::findOrFail($validated['equipment_id']);

        if (!in_array($asset->status, ['available', 'in_use'])) {
            return response()->json([
                'success' => false,
                'message' => 'Thiết bị hiện ' . (Equipment::STATUS_LABELS[$asset->status] ?? $asset->status) . '. Vui lòng kiểm tra lại.',
            ], 422);
        }

        if ($validated['quantity'] > $asset->remaining_quantity) {
            return response()->json([
                'success' => false,
                'message' => "Không đủ số lượng trong kho. Hiện còn {$asset->remaining_quantity} {$asset->unit}.",
            ], 422);
        }

        $usage = AssetUsage::create([
            'project_id'       => $projectId,
            'equipment_id'     => $validated['equipment_id'],
            'quantity'         => $validated['quantity'],
            'receiver_id'      => $validated['receiver_id'],
            'received_date'    => $validated['received_date'],
            'notes'            => $validated['notes'] ?? null,
            'status'           => 'draft',
            'created_by'       => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo phiếu sử dụng thiết bị.',
            'data'    => $usage->fresh(['asset:id,name,code', 'receiver:id,name', 'creator:id,name']),
        ], 201);
    }

    /**
     * Cập nhật phiếu (chỉ khi draft hoặc rejected)
     */
    public function update(string $projectId, string $id, Request $request)
    {
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        if (!in_array($usage->status, ['draft', 'rejected'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể chỉnh sửa phiếu ở trạng thái Nháp hoặc Từ chối.',
            ], 422);
        }

        $validated = $request->validate([
            'equipment_id'  => 'sometimes|exists:equipment,id',
            'quantity'      => 'sometimes|integer|min:1',
            'receiver_id'   => 'sometimes|exists:users,id',
            'received_date' => 'sometimes|date',
            'notes'         => 'nullable|string',
        ]);

        $validated['status'] = 'draft'; // Reset on edit
        $usage->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật phiếu.',
            'data'    => $usage->fresh(['asset:id,name,code', 'receiver:id,name', 'creator:id,name']),
        ]);
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

        if (!in_array($usage->status, ['draft', 'rejected'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể gửi duyệt phiếu ở trạng thái Nháp hoặc Từ chối.',
            ], 422);
        }

        $usage->update([
            'status'           => 'pending_management',
            'rejection_reason' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi phiếu để BĐH duyệt.',
            'data'    => $usage->fresh(['asset', 'receiver:id,name', 'creator:id,name', 'approver:id,name']),
        ]);
    }

    /**
     * Bước 2a: BĐH duyệt (pending_management → pending_accountant)
     */
    public function approveManagement(string $projectId, string $id)
    {
        $user = auth()->user();
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        if ($usage->status !== 'pending_management') {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu không ở trạng thái chờ BĐH duyệt.',
            ], 422);
        }

        $usage->update([
            'status'      => 'pending_accountant',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'BĐH đã duyệt. Chuyển sang Kế toán.',
            'data'    => $usage->fresh(['asset', 'receiver:id,name', 'creator:id,name', 'approver:id,name']),
        ]);
    }

    /**
     * Bước 2b: Từ chối (pending_management/pending_accountant → rejected)
     */
    public function reject(string $projectId, string $id, Request $request)
    {
        $user = auth()->user();
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        if (!in_array($usage->status, ['pending_management', 'pending_accountant'])) {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu không ở trạng thái chờ duyệt.',
            ], 422);
        }

        $request->validate(['reason' => 'required|string']);

        $usage->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->reason,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối phiếu sử dụng thiết bị.',
            'data'    => $usage->fresh(['asset', 'receiver:id,name', 'creator:id,name', 'approver:id,name']),
        ]);
    }

    /**
     * Bước 3: KT xác nhận (pending_accountant → approved → auto in_use)
     * Khi KT duyệt, thiết bị tự động chuyển sang trạng thái "Đang sử dụng"
     */
    public function confirmAccountant(string $projectId, string $id)
    {
        $user = auth()->user();
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        if ($usage->status !== 'pending_accountant') {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu không ở trạng thái chờ Kế toán.',
            ], 422);
        }

        try {
            DB::beginTransaction();

            $usage->update([
                'status'        => 'in_use',
                'confirmed_by'  => $user->id,
                'confirmed_at'  => now(),
                'received_date' => now()->toDateString(),
            ]);

            // Cập nhật trạng thái thiết bị trong kho
            $asset = $usage->asset;
            if ($asset) {
                $asset->update([
                    'status' => 'in_use',
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'KT đã xác nhận. Thiết bị chuyển sang trạng thái Đang sử dụng.',
                'data'    => $usage->fresh(['asset', 'receiver:id,name', 'creator:id,name', 'approver:id,name', 'confirmer:id,name']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 500);
        }
    }

    // ====================================================================
    // LIFECYCLE MANAGEMENT (After approval)
    // ====================================================================

    /**
     * Người nhận yêu cầu trả (in_use → pending_return)
     */
    public function requestReturn(string $projectId, string $id)
    {
        $user = auth()->user();
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        if ($usage->status !== 'in_use') {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu không ở trạng thái đang sử dụng.',
            ], 422);
        }

        $usage->update(['status' => 'pending_return']);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi yêu cầu trả thiết bị.',
            'data'    => $usage->fresh(['asset', 'receiver:id,name', 'creator:id,name']),
        ]);
    }

    /**
     * KT xác nhận trả (pending_return → returned)
     */
    public function confirmReturn(string $projectId, string $id)
    {
        $user = auth()->user();

        // Check KT permission
        if (!$user->hasPermission(Permissions::COST_APPROVE_ACCOUNTANT)) {
            return response()->json(['success' => false, 'message' => 'Bạn không có quyền xác nhận trả.'], 403);
        }

        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        if ($usage->status !== 'pending_return') {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu không ở trạng thái chờ xác nhận trả.',
            ], 422);
        }

        try {
            DB::beginTransaction();

            $usage->update([
                'status'        => 'returned',
                'returned_date' => now()->toDateString(),
            ]);

            // Cập nhật trạng thái thiết bị trong kho
            $asset = $usage->asset;
            if ($asset) {
                // Nếu sau khi trả, số lượng còn lại bằng với số lượng tổng thì mới set available
                $asset->refresh();
                if ($asset->remaining_quantity >= $asset->quantity) {
                    $asset->update(['status' => 'available']);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã xác nhận nhận lại thiết bị. Thiết bị đã trả về kho.',
                'data'    => $usage->fresh(['asset', 'receiver:id,name', 'creator:id,name']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 500);
        }
    }
}
