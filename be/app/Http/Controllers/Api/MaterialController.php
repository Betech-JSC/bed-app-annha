<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Material;
use App\Models\MaterialTransaction;
use App\Constants\Permissions;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MaterialController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission(Permissions::MATERIAL_VIEW)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem danh sách vật liệu.'
            ], 403);
        }

        $query = Material::query();

        if ($request->query('active_only') === 'true') {
            $query->where('status', 'active');
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        $materials = $query->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $materials
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission(Permissions::MATERIAL_CREATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo vật liệu.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:materials,code',
            'unit' => 'required|string|max:20',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'unit_price' => 'required|numeric|min:0',
            'status' => 'in:active,inactive,discontinued',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $material = Material::create([
            'name' => $request->name,
            'code' => $request->code,
            'unit' => $request->unit,
            'description' => $request->description,
            'category' => $request->category,
            'unit_price' => $request->unit_price,
            'status' => $request->status ?? 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo vật liệu thành công.',
            'data' => $material
        ], 201);
    }

    public function show(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission(Permissions::MATERIAL_VIEW)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem vật liệu.'
            ], 403);
        }

        $material = Material::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $material
        ]);
    }


    /**
     * Lấy danh sách materials đã sử dụng trong project (thông qua MaterialBills)
     * Tính toán thống kê từ MaterialBillItem — nguồn dữ liệu chính xác
     */
    public function getByProject(string $projectId, Request $request)
    {
        $user = auth()->user();

        if (!$user->hasPermission(Permissions::MATERIAL_VIEW)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem vật liệu dự án.'
            ], 403);
        }

        // Lấy các materials đã xuất hiện trong MaterialBillItem của project này
        $query = Material::whereHas('billItems.materialBill', function ($q) use ($projectId) {
            $q->where('project_id', $projectId)
              ->whereNotIn('status', ['rejected']); // Bỏ qua phiếu bị từ chối
        });

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%");
            });
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        $materials = $query->paginate(50);

        $projectTotalCost = 0;
        $projectApprovedCost = 0;
        $projectPendingCost = 0;
        $totalBillsCount = 0;

        // Tính toán số lượng & chi phí từ MaterialBillItem
        $materials->getCollection()->transform(function ($material) use ($projectId, &$projectTotalCost, &$projectApprovedCost, &$projectPendingCost, &$totalBillsCount) {
            // Lấy tất cả bill items của material này trong project (trừ rejected)
            $billItems = \App\Models\MaterialBillItem::where('material_id', $material->id)
                ->whereHas('materialBill', function ($q) use ($projectId) {
                    $q->where('project_id', $projectId)
                      ->whereNotIn('status', ['rejected']);
                })
                ->with('materialBill:id,status')
                ->get();

            $totalQuantity = $billItems->sum('quantity');
            $totalAmount = $billItems->sum('total_price');
            
            // Phân loại theo trạng thái
            $approvedAmount = $billItems->filter(fn($item) => $item->materialBill->status === 'approved')->sum('total_price');
            $pendingAmount = $totalAmount - $approvedAmount;
            $billsCount = $billItems->pluck('material_bill_id')->unique()->count();

            $material->project_usage = $totalQuantity;
            $material->project_total_amount = $totalAmount;
            $material->project_approved_amount = $approvedAmount;
            $material->project_pending_amount = $pendingAmount;
            $material->project_transactions_count = $billsCount;

            $projectTotalCost += $totalAmount;
            $projectApprovedCost += $approvedAmount;
            $projectPendingCost += $pendingAmount;
            $totalBillsCount += $billsCount;

            return $material;
        });

        // Đếm tổng số phiếu vật tư trong dự án
        $billStats = \App\Models\MaterialBill::where('project_id', $projectId)
            ->whereNotIn('status', ['rejected'])
            ->selectRaw("
                COUNT(*) as total_bills,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_bills,
                SUM(CASE WHEN status IN ('pending_management', 'pending_accountant') THEN 1 ELSE 0 END) as pending_bills,
                SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_bills
            ")
            ->first();

        return response()->json([
            'success' => true,
            'data' => $materials,
            'summary' => [
                'total_material_cost' => (float)$projectTotalCost,
                'approved_material_cost' => (float)$projectApprovedCost,
                'pending_material_cost' => (float)$projectPendingCost,
                'total_materials_count' => $materials->total(),
                'total_bills' => (int)($billStats->total_bills ?? 0),
                'approved_bills' => (int)($billStats->approved_bills ?? 0),
                'pending_bills' => (int)($billStats->pending_bills ?? 0),
                'draft_bills' => (int)($billStats->draft_bills ?? 0),
            ]
        ]);
    }

    public function update(Request $request, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission(Permissions::MATERIAL_UPDATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật vật liệu.'
            ], 403);
        }

        $material = Material::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'code' => 'sometimes|nullable|string|max:50|unique:materials,code,' . $id,
            'unit' => 'sometimes|required|string|max:20',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:100',
            'unit_price' => 'sometimes|required|numeric|min:0',
            'min_stock' => 'nullable|numeric|min:0',
            'max_stock' => 'nullable|numeric|min:0',
            'status' => 'in:active,inactive,discontinued',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $material->update($request->only([
            'name',
            'code',
            'unit',
            'description',
            'category',
            'unit_price',
            'status'
        ]));

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật vật liệu thành công.',
            'data' => $material
        ]);
    }

    public function destroy(string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission(Permissions::MATERIAL_DELETE)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa vật liệu.'
            ], 403);
        }

        $material = Material::findOrFail($id);

        // Kiểm tra có giao dịch không
        if ($material->transactions()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa vật liệu đã có giao dịch.'
            ], 422);
        }

        $material->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa vật liệu thành công.'
        ]);
    }

    /**
     * Tạo transaction cho material trong project
     * LƯU Ý: Chỉ cho phép tạo transaction xuất kho (out) hoặc điều chỉnh (adjustment)
     * Transaction nhập kho (in) chỉ được tạo tự động từ Cost khi được approved
     */
    public function createTransaction(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission(Permissions::MATERIAL_CREATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo giao dịch vật liệu.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'material_id' => 'required|exists:materials,id',
            'type' => 'required|in:out,adjustment', // Chỉ cho phép out và adjustment
            'quantity' => 'required|numeric|min:0.01',
            'transaction_date' => 'required|date',
            'notes' => 'nullable|string',
            'cost_group_id' => 'required_if:type,out|nullable|exists:cost_groups,id',
            'amount' => 'required_if:type,out|nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        /*
        // Nếu là transaction xuất kho (out), kiểm tra tồn kho
        if ($request->type === 'out') {
            $material = Material::findOrFail($request->material_id);
            $currentStock = $material->current_stock;

            if ($currentStock < $request->quantity) {
                return response()->json([
                    'success' => false,
                    'message' => "Không đủ tồn kho. Tồn kho hiện tại: {$currentStock} {$material->unit}, yêu cầu: {$request->quantity} {$material->unit}."
                ], 422);
            }
        }
        */

        // Sử dụng MaterialInventoryService để tạo transaction xuất kho và đẩy qua chi phí dự án
        if ($request->type === 'out') {
            try {
                $inventoryService = app(\App\Services\MaterialInventoryService::class);
                $transaction = $inventoryService->createUsageTransaction(
                    $request->material_id,
                    $projectId,
                    $request->quantity,
                    $request->notes ?? '',
                    $user->id,
                    $request->transaction_date,
                    $request->cost_group_id,
                    $request->amount
                );

                return response()->json([
                    'success' => true,
                    'message' => 'Đã ghi nhận sử dụng vật liệu thành công.',
                    'data' => $transaction
                ], 201);
            } catch (\Exception $e) {
                return response()->json([
                    'success' => false,
                    'message' => $e->getMessage()
                ], 422);
            }
        }

        // Transaction điều chỉnh (adjustment) - tạo trực tiếp
        $transaction = MaterialTransaction::create([
            'material_id' => $request->material_id,
            'project_id' => $projectId,
            'cost_id' => null, // Adjustment không liên kết với Cost
            'type' => $request->type,
            'quantity' => $request->quantity,
            'transaction_date' => $request->transaction_date,
            'notes' => $request->notes ?? 'Điều chỉnh kho',
            'status' => 'approved',
            'created_by' => $user->id,
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        $transaction->load(['material', 'project', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo giao dịch điều chỉnh kho thành công.',
            'data' => $transaction
        ], 201);
    }

    /**
     * Tạo nhiều giao dịch xuất kho cùng lúc (Batch)
     */
    public function batchTransactions(Request $request, string $projectId)
    {
        $user = auth()->user();

        if (!$user->hasPermission(Permissions::MATERIAL_CREATE)) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo giao dịch vật liệu.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'transaction_date' => 'required|date',
            'cost_group_id' => 'required|exists:cost_groups,id',
            'items' => 'required|array|min:1',
            'items.*.material_id' => 'required|exists:materials,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.amount' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $inventoryService = app(\App\Services\MaterialInventoryService::class);
            $result = $inventoryService->createBatchUsageTransaction(
                $request->items,
                $projectId,
                $user->id,
                $request->transaction_date,
                $request->cost_group_id
            );

            return response()->json([
                'success' => true,
                'message' => 'Đã ghi nhận sử dụng vật liệu tổng hợp và đẩy sang Chi phí dự án.',
                'data' => $result
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Lỗi khi xử lý batch: ' . $e->getMessage()
            ], 422);
        }
    }

}
