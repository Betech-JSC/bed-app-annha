<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\GlobalEquipment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CrmGlobalEquipmentController extends Controller
{
    use CrmAuthorization;

    public function index(Request $request)
    {
        $user = auth('admin')->user();
        $this->crmRequire($user, 'company_asset.view');

        $query = GlobalEquipment::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('brand', 'like', "%{$search}%")
                    ->orWhere('model', 'like', "%{$search}%");
            });
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        $catalog = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        return response()->json([
            'success' => true,
            'data' => $catalog
        ]);
    }

    public function store(Request $request)
    {
        $user = auth('admin')->user();
        $this->crmRequire($user, 'company_asset.view'); // Use same permission or asset management permission

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:global_equipments,code',
            'category' => 'nullable|string|max:100',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'unit' => 'nullable|string|max:50',
            'unit_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        GlobalEquipment::create($validated);

        return back()->with('success', 'Đã thêm thiết bị vào danh mục.');
    }

    public function update(Request $request, $id)
    {
        $user = auth('admin')->user();
        $this->crmRequire($user, 'company_asset.view');

        $globalEquipment = GlobalEquipment::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'code' => ['nullable', 'string', 'max:50', Rule::unique('global_equipments', 'code')->ignore($globalEquipment->id)],
            'category' => 'nullable|string|max:100',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'unit' => 'nullable|string|max:50',
            'unit_price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        $globalEquipment->update($validated);

        return back()->with('success', 'Đã cập nhật thông tin thiết bị.');
    }

    public function destroy($id)
    {
        $user = auth('admin')->user();
        $this->crmRequire($user, 'company_asset.view');

        $globalEquipment = GlobalEquipment::findOrFail($id);

        // Check if there are actual equipments referencing this global equipment definition
        if ($globalEquipment->equipments()->count() > 0) {
            return back()->with('error', 'Không thể xóa thiết bị mẫu đang được sử dụng trong kho.');
        }

        $globalEquipment->delete();

        return back()->with('success', 'Đã xóa thiết bị khỏi danh mục.');
    }
}
