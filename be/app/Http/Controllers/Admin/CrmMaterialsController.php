<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Material;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CrmMaterialsController extends Controller
{
    public function index(Request $request)
    {
        $query = Material::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%");
            });
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        $materials = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $stats = [
            'total' => Material::count(),
            'low_stock' => Material::whereColumn('min_stock', '>', \DB::raw('COALESCE((SELECT SUM(quantity) FROM material_transactions WHERE material_transactions.material_id = materials.id AND type = "in") - COALESCE((SELECT SUM(quantity) FROM material_transactions WHERE material_transactions.material_id = materials.id AND type = "out"), 0), 0)'))->count(),
        ];

        $categories = Material::select('category')->distinct()->whereNotNull('category')->pluck('category');

        return Inertia::render('Crm/Materials/Index', [
            'materials' => $materials,
            'stats' => $stats,
            'categories' => $categories,
            'filters' => $request->only(['search', 'category']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:materials,code',
            'unit' => 'required|string|max:50',
            'category' => 'nullable|string|max:100',
            'unit_price' => 'nullable|numeric|min:0',
            'min_stock' => 'nullable|integer|min:0',
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
            'category' => 'nullable|string|max:100',
            'unit_price' => 'nullable|numeric|min:0',
            'min_stock' => 'nullable|integer|min:0',
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
