<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Material;
use App\Models\MaterialInventory;
use App\Models\MaterialTransaction;
use App\Models\MaterialBill;
use App\Models\Project;
use App\Models\CostGroup;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CrmWarehouseInventoryController extends Controller
{
    public function index(Request $request)
    {
        // 1. Tồn kho tổng
        $materials = Material::orderBy('name')->get(['id', 'name', 'code', 'unit', 'unit_price', 'cost_group_id']);
        $inventory = [];
        
        foreach ($materials as $m) {
            $invRecord = MaterialInventory::whereNull('project_id')
                ->where('material_id', $m->id)
                ->first();

            if (!$invRecord) {
                $invRecord = MaterialInventory::create([
                    'project_id' => null,
                    'material_id' => $m->id,
                    'current_stock' => 0,
                ]);
            }

            // Tính tồn khả dụng (trừ đi lượng pending export)
            $pendingQty = MaterialTransaction::whereNull('project_id')
                ->where('material_id', $m->id)
                ->where('type', 'export')
                ->where('status', 'pending')
                ->sum('quantity');

            $inventory[] = [
                'material_id' => $m->id,
                'name' => $m->name,
                'code' => $m->code,
                'unit' => $m->unit,
                'unit_price' => (float) $m->unit_price,
                'actual_stock' => (float) $invRecord->current_stock,
                'available_stock' => (float) max(0, $invRecord->current_stock - $pendingQty),
                'total_value' => (float) ($invRecord->current_stock * $m->unit_price),
            ];
        }

        // 2. Phiếu nhập kho tổng (project_id null)
        $bills = MaterialBill::whereNull('project_id')
            ->with(['supplier', 'creator', 'items.material', 'attachments'])
            ->orderByDesc('created_at')
            ->get();

        // 3. Lịch sử giao dịch
        $history = MaterialTransaction::whereNull('project_id')
            ->with(['material', 'creator', 'targetProject'])
            ->orderByDesc('created_at')
            ->get();

        $projects = Project::orderBy('name')->get(['id', 'name', 'code']);
        $suppliers = Supplier::orderBy('name')->get(['id', 'name']);
        $costGroups = CostGroup::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Crm/WarehouseInventory/Index', [
            'inventory' => $inventory,
            'bills' => $bills,
            'history' => $history,
            'projects' => $projects,
            'suppliers' => $suppliers,
            'costGroups' => $costGroups,
        ]);
    }

    public function exportStore(Request $request)
    {
        $request->validate([
            'material_id' => 'required|exists:materials,id',
            'target_project_id' => 'required|exists:projects,id',
            'quantity' => 'required|numeric|min:0.01',
            'unit_price' => 'required|numeric|min:0',
            'transaction_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $m = Material::findOrFail($request->material_id);
        $invRecord = MaterialInventory::whereNull('project_id')
            ->where('material_id', $m->id)
            ->first();

        $currentStock = $invRecord ? $invRecord->current_stock : 0;
        $pendingQty = MaterialTransaction::whereNull('project_id')
            ->where('material_id', $m->id)
            ->where('type', 'export')
            ->where('status', 'pending')
            ->sum('quantity');

        $availableStock = max(0, $currentStock - $pendingQty);

        if ($request->quantity > $availableStock) {
            return back()->with('error', "Không đủ tồn kho khả dụng. Hiện khả dụng: {$availableStock} {$m->unit}.");
        }

        $trans = MaterialTransaction::create([
            'material_id' => $request->material_id,
            'project_id' => null,
            'target_project_id' => $request->target_project_id,
            'type' => 'export',
            'quantity' => $request->quantity,
            'unit_price' => $request->unit_price,
            'total_amount' => $request->quantity * $request->unit_price,
            'transaction_date' => $request->transaction_date,
            'notes' => $request->notes,
            'status' => 'pending',
            'created_by' => auth()->id(),
        ]);

        return back()->with('success', 'Đã gửi yêu cầu xuất kho chờ duyệt.');
    }

    public function billStore(Request $request)
    {
        $request->merge(['project_id' => null]);
        $billService = app(\App\Services\MaterialBillService::class);
        try {
            $billService->upsert($request->all(), null, auth()->user());
            return back()->with('success', 'Đã tạo phiếu mua vật tư nhập kho tổng thành công.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function billUpdate(Request $request, $id)
    {
        $bill = MaterialBill::whereNull('project_id')->findOrFail($id);
        $request->merge(['project_id' => null]);
        $billService = app(\App\Services\MaterialBillService::class);
        try {
            $billService->upsert($request->all(), $bill, auth()->user());
            return back()->with('success', 'Đã cập nhật phiếu mua vật tư thành công.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function billSubmit($id)
    {
        $bill = MaterialBill::whereNull('project_id')->findOrFail($id);
        $billService = app(\App\Services\MaterialBillService::class);
        try {
            $billService->submit($bill, auth()->user());
            return back()->with('success', 'Đã gửi phiếu mua vật tư cho Ban điều hành duyệt.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function billApproveManagement($id)
    {
        $bill = MaterialBill::whereNull('project_id')->findOrFail($id);
        $billService = app(\App\Services\MaterialBillService::class);
        try {
            $billService->approve($bill, auth()->user());
            return back()->with('success', 'Đã duyệt phiếu mua vật tư (BĐH).');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function billApproveAccountant(Request $request, $id)
    {
        $bill = MaterialBill::whereNull('project_id')->findOrFail($id);
        $billService = app(\App\Services\MaterialBillService::class);
        $attachmentService = app(\App\Services\AttachmentService::class);
        try {
            // Đính kèm chứng từ thanh toán của Kế toán (description = 'after')
            $request->merge(['description' => 'after']);
            $attachmentService->handleCrmUpload($request, $bill, "material-bills/company-warehouse/{$bill->id}", true);

            $billService->approve($bill, auth()->user(), $request->only('budget_item_id'));
            return back()->with('success', 'Đã xác nhận thanh toán phiếu mua vật tư. Hàng đã được nhập kho công ty.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function billReject(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);
        $bill = MaterialBill::whereNull('project_id')->findOrFail($id);
        $billService = app(\App\Services\MaterialBillService::class);
        try {
            $billService->reject($bill, auth()->user(), $request->reason);
            return back()->with('success', 'Đã từ chối phiếu mua vật tư.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function billRevert(Request $request, $id)
    {
        $bill = MaterialBill::whereNull('project_id')->findOrFail($id);
        $billService = app(\App\Services\MaterialBillService::class);
        try {
            $billService->revertToDraft($bill, auth()->user());
            return back()->with('success', 'Đã hoàn duyệt phiếu mua vật tư.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function billDestroy($id)
    {
        $bill = MaterialBill::whereNull('project_id')->findOrFail($id);
        $billService = app(\App\Services\MaterialBillService::class);
        try {
            $billService->delete($bill);
            return back()->with('success', 'Đã xóa phiếu mua vật tư.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }
}
