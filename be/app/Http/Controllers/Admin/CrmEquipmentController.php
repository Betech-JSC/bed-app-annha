<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CrmEquipmentController extends Controller
{
    public function index(Request $request)
    {
        $query = Equipment::query();

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('serial_number', 'like', "%{$search}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $equipment = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $stats = [
            'total' => Equipment::count(),
            'available' => Equipment::where('status', 'available')->count(),
            'in_use' => Equipment::where('status', 'in_use')->count(),
            'maintenance' => Equipment::where('status', 'maintenance')->count(),
        ];

        return Inertia::render('Crm/Equipment/Index', [
            'equipment' => $equipment,
            'stats' => $stats,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:equipment,code',
            'category' => 'nullable|string|max:100',
            'type' => 'nullable|string|max:100',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'quantity' => 'nullable|integer|min:1',
            'purchase_price' => 'nullable|numeric|min:0',
            'rental_rate_per_day' => 'nullable|numeric|min:0',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        Equipment::create($validated);
        return back()->with('success', 'Đã thêm thiết bị.');
    }

    public function update(Request $request, $id)
    {
        $eq = Equipment::findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => ['sometimes', 'string', 'max:50', Rule::unique('equipment', 'code')->ignore($eq->id)],
            'category' => 'nullable|string|max:100',
            'type' => 'nullable|string|max:100',
            'brand' => 'nullable|string|max:100',
            'model' => 'nullable|string|max:100',
            'serial_number' => 'nullable|string|max:100',
            'quantity' => 'nullable|integer|min:1',
            'purchase_price' => 'nullable|numeric|min:0',
            'rental_rate_per_day' => 'nullable|numeric|min:0',
            'status' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $eq->update($validated);
        return back()->with('success', 'Đã cập nhật thiết bị.');
    }

    public function destroy($id)
    {
        Equipment::findOrFail($id)->delete();
        return back()->with('success', 'Đã xóa thiết bị.');
    }
}
