<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EquipmentPurchase;
use App\Models\EquipmentPurchaseItem;
use App\Models\Equipment;
use App\Constants\Permissions;
use App\Models\Cost;
use App\Models\CostGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EquipmentPurchaseController extends Controller
{
    /**
     * Danh sách phiếu mua thiết bị theo dự án
     */
    public function index(string $projectId, Request $request)
    {
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
        $user = auth()->user();

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
            DB::beginTransaction();

            $purchase = EquipmentPurchase::create([
                'project_id'   => $projectId,
                'notes'        => $validated['notes'] ?? null,
                'status'       => 'draft',
                'total_amount' => 0,
                'created_by'   => $user->id,
            ]);

            foreach ($validated['items'] as $itemData) {
                $purchase->items()->create([
                    'name'       => $itemData['name'],
                    'code'       => $itemData['code'] ?? null,
                    'quantity'   => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    // total_price auto-calculated by model boot
                ]);
            }

            $purchase->recalculateTotal();

            // Gắn attachments
            if (!empty($validated['attachment_ids'])) {
                \App\Models\Attachment::whereIn('id', $validated['attachment_ids'])
                    ->update([
                        'attachable_type' => EquipmentPurchase::class,
                        'attachable_id'   => $purchase->id,
                    ]);
            }

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
                'cost_date' => now()->toDateString(), // purchase date is today (store time) 
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo phiếu mua thiết bị.',
                'data'    => $purchase->fresh(['items', 'creator:id,name', 'attachments']),
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
     * Cập nhật phiếu mua + items (chỉ khi Nháp/Từ chối)
     */
    public function update(string $projectId, string $id, Request $request)
    {
        $purchase = EquipmentPurchase::where('project_id', $projectId)->findOrFail($id);

        if (!in_array($purchase->status, ['draft', 'rejected'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể chỉnh sửa phiếu ở trạng thái Nháp hoặc Từ chối.',
            ], 422);
        }

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
            DB::beginTransaction();

            if (isset($validated['notes'])) {
                $purchase->update(['notes' => $validated['notes']]);
            }

            // Rebuild items if provided
            if (isset($validated['items'])) {
                $purchase->items()->delete();
                foreach ($validated['items'] as $itemData) {
                    $purchase->items()->create([
                        'name'       => $itemData['name'],
                        'code'       => $itemData['code'] ?? null,
                        'quantity'   => $itemData['quantity'],
                        'unit_price' => $itemData['unit_price'],
                    ]);
                }
                $purchase->recalculateTotal();
            }

            if (!empty($validated['attachment_ids'])) {
                \App\Models\Attachment::whereIn('id', $validated['attachment_ids'])
                    ->update([
                        'attachable_type' => EquipmentPurchase::class,
                        'attachable_id'   => $purchase->id,
                    ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật phiếu mua.',
                'data'    => $purchase->fresh(['items', 'creator:id,name', 'attachments']),
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
     * Xóa phiếu (chỉ khi Nháp)
     */
    public function destroy(string $projectId, string $id)
    {
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
        $purchase = EquipmentPurchase::where('project_id', $projectId)->findOrFail($id);

        if (!in_array($purchase->status, ['draft', 'rejected'])) {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể gửi duyệt phiếu ở trạng thái Nháp hoặc Từ chối.',
            ], 422);
        }

        if ($purchase->items()->count() === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu mua phải có ít nhất 1 thiết bị.',
            ], 422);
        }

        $purchase->update([
            'status'           => 'pending_management',
            'rejection_reason' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi phiếu mua để BĐH duyệt.',
            'data'    => $purchase->fresh(['items', 'creator:id,name']),
        ]);
    }

    public function approveManagement(string $projectId, string $id)
    {
        $user = auth()->user();
        $purchase = EquipmentPurchase::where('project_id', $projectId)->findOrFail($id);

        if ($purchase->status !== 'pending_management') {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu không ở trạng thái chờ BĐH duyệt.',
            ], 422);
        }

        $purchase->update([
            'status'      => 'pending_accountant',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'BĐH đã duyệt. Chuyển sang Kế toán.',
            'data'    => $purchase->fresh(['items', 'creator:id,name', 'approver:id,name']),
        ]);
    }

    public function rejectManagement(string $projectId, string $id, Request $request)
    {
        $user = auth()->user();
        $purchase = EquipmentPurchase::where('project_id', $projectId)->findOrFail($id);

        if ($purchase->status !== 'pending_management') {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu không ở trạng thái chờ BĐH duyệt.',
            ], 422);
        }

        $request->validate(['reason' => 'required|string']);

        $purchase->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->reason,
            'approved_by'      => $user->id,
            'approved_at'      => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối phiếu mua.',
            'data'    => $purchase->fresh(['items', 'creator:id,name', 'approver:id,name']),
        ]);
    }

    /**
     * Kế toán xác nhận CK → tự động tạo Equipment (kho)
     */
    public function confirmAccountant(string $projectId, string $id)
    {
        $user = auth()->user();
        $purchase = EquipmentPurchase::where('project_id', $projectId)->findOrFail($id);

        if ($purchase->status !== 'pending_accountant') {
            return response()->json([
                'success' => false,
                'message' => 'Phiếu không ở trạng thái chờ Kế toán.',
            ], 422);
        }

        try {
            DB::beginTransaction();

            $purchase->update([
                'status'       => 'completed',
                'confirmed_by' => $user->id,
                'confirmed_at' => now(),
            ]);

            // Nghiệp vụ đặc biệt: Tạo Equipment cho mỗi item
            foreach ($purchase->items as $item) {
                Equipment::create([
                    'name'           => $item->name,
                    'code'           => $item->code ?: ('EQP-' . date('Ymd') . '-' . strtoupper(\Illuminate\Support\Str::random(4))),
                    'type'           => 'owned',
                    'category'       => 'machinery', // default
                    'purchase_price' => $item->total_price,
                    'purchase_date'  => now()->toDateString(),
                    'useful_life_months' => 60, // default 5 năm
                    'residual_value' => 0,
                    'current_value'  => $item->total_price,
                    'status'         => 'available',
                    'notes'          => "Nhập kho từ phiếu mua #{$purchase->id} - Dự án #{$projectId}",
                    'created_by'     => $purchase->created_by,
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Kế toán đã xác nhận. Thiết bị đã được nhập kho công ty.',
                'data'    => $purchase->fresh(['items', 'creator:id,name', 'approver:id,name', 'confirmer:id,name']),
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
