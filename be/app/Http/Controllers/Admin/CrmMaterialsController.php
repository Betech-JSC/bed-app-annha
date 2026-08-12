<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Material;
use App\Models\CostGroup;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CrmMaterialsController extends Controller
{
    public function index(Request $request)
    {
        $query = Material::with('costGroup');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($costGroupId = $request->query('cost_group_id')) {
            $query->where('cost_group_id', $costGroupId);
        }

        $materials = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $stats = [
            'total' => Material::count(),
        ];

        $costGroups = CostGroup::active()->ordered()->get(['id', 'name']);

        return Inertia::render('Crm/Materials/Index', [
            'materials' => $materials,
            'stats' => $stats,
            'costGroups' => $costGroups,
            'filters' => $request->only(['search', 'cost_group_id']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:materials,code',
            'unit' => 'required|string|max:50',
            'category' => 'nullable|string|max:255',
            'cost_group_id' => 'nullable|exists:cost_groups,id',
            'unit_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        Material::create($validated);
        return back()->with('success', 'Đã thêm vật tư.');
    }

    public function update(Request $request, $id)
    {
        $material = Material::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('materials', 'code')->ignore($material->id)],
            'unit' => 'sometimes|string|max:50',
            'category' => 'nullable|string|max:255',
            'cost_group_id' => 'nullable|exists:cost_groups,id',
            'unit_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $material->update($validated);
        return back()->with('success', 'Đã cập nhật vật tư.');
    }

    public function destroy($id)
    {
        Material::findOrFail($id)->delete();
        return back()->with('success', 'Đã xóa vật tư.');
    }

    public function priceHistory($id)
    {
        $material = Material::findOrFail($id);

        // Fetch price history from MaterialBillItems
        $billHistory = \App\Models\MaterialBillItem::where('material_id', $id)
            ->whereHas('materialBill', function ($q) {
                $q->where('status', 'approved');
            })
            ->with(['materialBill.project', 'materialBill.supplier'])
            ->get()
            ->map(function ($item) {
                return [
                    'date' => $item->materialBill->bill_date?->format('Y-m-d'),
                    'ref' => $item->materialBill->bill_number,
                    'project_name' => $item->materialBill->project?->name ?? 'Kho tổng / Dự án khác',
                    'supplier_name' => $item->materialBill->supplier?->name ?? 'N/A',
                    'quantity' => (float)$item->quantity,
                    'unit_price' => (float)$item->unit_price,
                    'type' => 'bill',
                ];
            });

        // Fetch price history from direct Costs (where material_bill_id is null)
        $costHistory = \App\Models\Cost::where('material_id', $id)
            ->whereNull('material_bill_id')
            ->where('status', 'approved')
            ->with(['project', 'supplier'])
            ->get()
            ->map(function ($cost) {
                $qty = (float)$cost->quantity;
                $amount = (float)$cost->amount;
                $unitPrice = $qty > 0 ? ($amount / $qty) : $amount;

                return [
                    'date' => $cost->cost_date ? \Carbon\Carbon::parse($cost->cost_date)->format('Y-m-d') : null,
                    'ref' => $cost->name,
                    'project_name' => $cost->project?->name ?? 'Chi phí công ty',
                    'supplier_name' => $cost->supplier?->name ?? 'N/A',
                    'quantity' => $qty,
                    'unit_price' => $unitPrice,
                    'type' => 'cost',
                ];
            });

        // Merge both, filter out empty dates, and sort by date descending
        $history = $billHistory->concat($costHistory)
            ->filter(fn($item) => !empty($item['date']))
            ->sortByDesc('date')
            ->values();

        return response()->json([
            'material' => $material,
            'history' => $history,
        ]);
    }
}
