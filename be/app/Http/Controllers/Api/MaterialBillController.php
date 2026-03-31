<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaterialBill;
use App\Models\MaterialBillItem;
use App\Models\Project;
use App\Models\Cost;
use App\Models\MaterialTransaction;
use App\Constants\Permissions;
use App\Services\AuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class MaterialBillController extends Controller
{
    protected $authService;

    public function __construct(AuthorizationService $authService)
    {
        $this->authService = $authService;
    }

    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::MATERIAL_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem thông tin vật liệu dự án này.'
            ], 403);
        }

        $query = MaterialBill::with(['supplier', 'costGroup', 'creator'])
            ->where('project_id', $projectId);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($supplierId = $request->query('supplier_id')) {
            $query->where('supplier_id', $supplierId);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('bill_number', 'like', "%{$search}%")
                    ->orWhere('notes', 'like', "%{$search}%");
            });
        }

        $bills = $query->orderByDesc('bill_date')->orderByDesc('created_at')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $bills
        ]);
    }

    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::MATERIAL_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo hóa đơn vật liệu cho dự án này.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'supplier_id' => 'required|exists:suppliers,id',
            'bill_number' => 'nullable|string|max:50',
            'bill_date' => 'required|date',
            'cost_group_id' => 'required|exists:cost_groups,id',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.material_id' => 'required|exists:materials,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $totalAmount = 0;
            foreach ($request->items as $item) {
                $totalAmount += $item['quantity'] * $item['unit_price'];
            }

            $bill = MaterialBill::create([
                'project_id' => $projectId,
                'supplier_id' => $request->supplier_id,
                'bill_number' => $request->bill_number,
                'bill_date' => $request->bill_date,
                'cost_group_id' => $request->cost_group_id,
                'total_amount' => $totalAmount,
                'notes' => $request->notes,
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

            foreach ($request->items as $item) {
                MaterialBillItem::create([
                    'material_bill_id' => $bill->id,
                    'material_id' => $item['material_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'total_price' => $item['quantity'] * $item['unit_price'],
                    'notes' => $item['notes'] ?? null,
                ]);
            }

            // Create linked Cost record immediately (draft) so it shows in Chi phí tab
            $supplierName = '';
            if ($request->supplier_id) {
                $supplier = \App\Models\Supplier::find($request->supplier_id);
                $supplierName = $supplier->name ?? '';
            }

            Cost::create([
                'project_id' => $projectId,
                'cost_group_id' => $request->cost_group_id,
                'supplier_id' => $request->supplier_id,
                'category' => 'construction_materials',
                'material_bill_id' => $bill->id,
                'name' => "Phiếu vật liệu #" . ($bill->bill_number ?? $bill->id) . ($supplierName ? " - {$supplierName}" : ''),
                'amount' => $totalAmount,
                'description' => $request->notes ?? "Từ phiếu vật tư " . ($bill->bill_number ?? $bill->id),
                'cost_date' => $request->bill_date,
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo hóa đơn vật liệu thành công.',
                'data' => $bill->load('items.material')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi khi tạo hóa đơn vật liệu: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo hóa đơn.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::MATERIAL_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem hóa đơn vật liệu này.'
            ], 403);
        }

        $bill = MaterialBill::with(['supplier', 'costGroup', 'creator', 'items.material', 'managementApprover', 'accountantApprover'])
            ->where('project_id', $projectId)
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $bill
        ]);
    }

    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $bill = MaterialBill::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::MATERIAL_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật hóa đơn này.'
            ], 403);
        }

        if ($bill->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể cập nhật hóa đơn ở trạng thái nháp.'
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'supplier_id' => 'sometimes|required|exists:suppliers,id',
            'bill_number' => 'nullable|string|max:50',
            'bill_date' => 'sometimes|required|date',
            'cost_group_id' => 'sometimes|required|exists:cost_groups,id',
            'notes' => 'nullable|string',
            'items' => 'sometimes|required|array|min:1',
            'items.*.material_id' => 'required|exists:materials,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $updateData = $request->only(['supplier_id', 'bill_number', 'bill_date', 'cost_group_id', 'notes']);
            
            if ($request->has('items')) {
                // Delete old items
                $bill->items()->delete();
                
                $totalAmount = 0;
                foreach ($request->items as $item) {
                    $totalAmount += $item['quantity'] * $item['unit_price'];
                    MaterialBillItem::create([
                        'material_bill_id' => $bill->id,
                        'material_id' => $item['material_id'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['unit_price'],
                        'total_price' => $item['quantity'] * $item['unit_price'],
                        'notes' => $item['notes'] ?? null,
                    ]);
                }
                $updateData['total_amount'] = $totalAmount;
            }

            $bill->update($updateData);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật hóa đơn thành công.',
                'data' => $bill->load('items.material')
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi khi cập nhật hóa đơn vật liệu: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi cập nhật hóa đơn.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function submit(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $bill = MaterialBill::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::MATERIAL_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền gửi duyệt hóa đơn này.'
            ], 403);
        }

        $bill->submitForManagementApproval();

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi hóa đơn cho Ban điều hành duyệt.'
        ]);
    }

    public function approveManagement(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $bill = MaterialBill::with('items')->where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::COST_APPROVE_MANAGEMENT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt hóa đơn này (BĐH).'
            ], 403);
        }

        if ($bill->status !== 'pending_management') {
            return response()->json([
                'success' => false,
                'message' => 'Trạng thái hóa đơn không hợp lệ.'
            ], 400);
        }

        $bill->approveByManagement($user);

        return response()->json([
            'success' => true,
            'message' => 'Ban điều hành đã duyệt hóa đơn. Chờ Kế toán xác nhận.'
        ]);
    }

    public function approveAccountant(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $bill = MaterialBill::with(['items.material', 'supplier'])->where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::COST_APPROVE_ACCOUNTANT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xác nhận hóa đơn này (Kế toán).'
            ], 403);
        }

        if ($bill->status !== 'pending_accountant') {
            return response()->json([
                'success' => false,
                'message' => 'Trạng thái hóa đơn không hợp lệ.'
            ], 400);
        }

        try {
            DB::beginTransaction();

            $bill->approveByAccountant($user);
            // Side effects (Inventory, Debt) remain here or move to Model if appropriate.
            // MaterialBill model already has triggerApprovalSideEffects called in approveByAccountant? 
            // Wait, let's check approveByAccountant in MaterialBill.php.
            $bill->triggerApprovalSideEffects();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã xác nhận thanh toán hóa đơn. Dữ liệu đã được đẩy qua Chi phí dự án và Kho vật liệu.'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Lỗi khi xác nhận hóa đơn vật liệu: " . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi xác nhận hóa đơn.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function reject(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $bill = MaterialBill::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::COST_REJECT, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối hóa đơn này.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Vui lòng nhập lý do từ chối.',
                'errors' => $validator->errors()
            ], 422);
        }

        $bill->reject($request->reason, $user);

        return response()->json([
            'success' => true,
            'message' => 'Hóa đơn đã bị từ chối.'
        ]);
    }

    /**
     * Helper: Find and update linked Cost record for a MaterialBill
     * @deprecated Use model-driven sync instead
     */
    private function updateLinkedMaterialCost($projectId, string $billRef, string $newStatus, array $extra = []): ?Cost
    {
        $cost = Cost::where('material_bill_id', function($q) use ($billRef) {
            // This is just a fallback for old records without material_bill_id
             return null; 
        })->first();

        if (!$cost) {
             // Fallback to name search for legacy records
             $cost = Cost::where('project_id', $projectId)
                ->where('category', 'construction_materials')
                ->where('name', 'LIKE', "%#{$billRef}%")
                ->first();
        }

        if ($cost) {
            $cost->update(array_merge(['status' => $newStatus], $extra));
        }

        return $cost;
    }

    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $bill = MaterialBill::where('project_id', $projectId)->findOrFail($id);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::MATERIAL_DELETE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa hóa đơn này.'
            ], 403);
        }

        if ($bill->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể xóa hóa đơn ở trạng thái nháp.'
            ], 400);
        }

        $bill->delete();

        return response()->json([
            'success' => true,
            'message' => 'Hóa đơn đã được xóa.'
        ]);
    }
}
