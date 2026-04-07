<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AssetUsage;
use App\Models\Equipment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AssetUsageController extends Controller
{
    /**
     * Danh sách phiếu mượn theo dự án
     */
    public function index(string $projectId, Request $request)
    {
        $query = AssetUsage::where('project_id', $projectId)
            ->with(['asset:id,name,code,status', 'receiver:id,name', 'creator:id,name'])
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
     * Chi tiết phiếu mượn
     */
    public function show(string $projectId, string $id)
    {
        $usage = AssetUsage::where('project_id', $projectId)
            ->with(['asset', 'receiver:id,name,email', 'creator:id,name,email'])
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

        return response()->json([
            'success' => true,
            'data' => $query->get(['id', 'name', 'code as asset_code', 'category', 'status', 'current_value']),
        ]);
    }

    /**
     * Tạo phiếu mượn (status = pending_receive)
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

        if ($asset->status === 'retired') {
            return response()->json([
                'success' => false,
                'message' => 'Thiết bị không còn trong kho.',
            ], 422);
        }

        $usage = AssetUsage::create([
            'project_id'       => $projectId,
            'equipment_id'     => $validated['equipment_id'],
            'quantity'         => $validated['quantity'],
            'receiver_id'      => $validated['receiver_id'],
            'received_date'    => $validated['received_date'],
            'notes'            => $validated['notes'] ?? null,
            'status'           => 'pending_receive',
            'created_by'       => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo phiếu mượn thiết bị. Chờ người nhận xác nhận.',
            'data'    => $usage->fresh(['asset:id,name,code', 'receiver:id,name', 'creator:id,name']),
        ], 201);
    }

    /**
     * Xóa phiếu (chỉ khi pending_receive)
     */
    public function destroy(string $projectId, string $id)
    {
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        if ($usage->status !== 'pending_receive') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xóa phiếu khi chưa nhận.',
            ], 422);
        }

        $usage->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa phiếu mượn.',
        ]);
    }

    // ====================================================================
    // 2-WAY CONFIRMATION
    // ====================================================================

    /**
     * Người nhận bấm "Đã nhận" → pending_receive → in_use (trừ tồn kho)
     */
    public function confirmReceive(string $projectId, string $id)
    {
        $user = auth()->user();
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        if ($usage->status !== 'pending_receive') {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu không ở trạng thái chờ nhận.',
            ], 422);
        }

        // Kiểm tra người nhận
        if ($user->id !== $usage->receiver_id) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ người nhận mới có thể xác nhận.',
            ], 403);
        }

        try {
            DB::beginTransaction();

            $usage->update([
                'status'        => 'in_use',
                'received_date' => now()->toDateString(),
            ]);

            // Trừ tồn kho — chuyển sang trạng thái in_use
            $asset = $usage->asset;
            $asset->update(['status' => 'in_use', 'assigned_to' => $user->id]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã xác nhận nhận thiết bị.',
                'data'    => $usage->fresh(['asset:id,name,code,status', 'receiver:id,name', 'creator:id,name']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Người nhận bấm "Đã trả" → in_use → pending_return
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

        if ($user->id !== $usage->receiver_id) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ người nhận mới có thể yêu cầu trả.',
            ], 403);
        }

        $usage->update(['status' => 'pending_return']);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi yêu cầu trả thiết bị. Chờ người lập xác nhận.',
            'data'    => $usage->fresh(['asset:id,name,code,status', 'receiver:id,name', 'creator:id,name']),
        ]);
    }

    /**
     * Người lập bấm "Xác nhận đã nhận lại" → pending_return → returned (cộng lại tồn kho)
     */
    public function confirmReturn(string $projectId, string $id)
    {
        $user = auth()->user();
        $usage = AssetUsage::where('project_id', $projectId)->findOrFail($id);

        if ($usage->status !== 'pending_return') {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu không ở trạng thái chờ xác nhận trả.',
            ], 422);
        }

        if ($user->id !== $usage->created_by) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ người lập phiếu mới có thể xác nhận nhận lại.',
            ], 403);
        }

        try {
            DB::beginTransaction();

            $usage->update([
                'status'        => 'returned',
                'returned_date' => now()->toDateString(),
            ]);

            // Cộng lại tồn kho
            $asset = $usage->asset;
            $asset->update(['status' => 'available', 'assigned_to' => null]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã xác nhận nhận lại thiết bị. Thiết bị đã trả về kho.',
                'data'    => $usage->fresh(['asset:id,name,code,status', 'receiver:id,name', 'creator:id,name']),
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
