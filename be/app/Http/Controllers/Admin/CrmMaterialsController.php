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
}
