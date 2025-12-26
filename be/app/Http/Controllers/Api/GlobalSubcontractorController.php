<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GlobalSubcontractor;
use Illuminate\Http\Request;

class GlobalSubcontractorController extends Controller
{
    /**
     * Danh sách nhà thầu phụ toàn hệ thống
     */
    public function index(Request $request)
    {
        $query = GlobalSubcontractor::query();

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('category', 'like', "%{$search}%")
                    ->orWhere('contact_person', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filter by category
        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        $subcontractors = $query->orderBy('name')->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $subcontractors
        ]);
    }

    /**
     * Tạo nhà thầu phụ toàn hệ thống
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'description' => 'nullable|string',
            'tax_code' => 'nullable|string|max:50',
        ]);

        $subcontractor = GlobalSubcontractor::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Nhà thầu phụ đã được tạo.',
            'data' => $subcontractor
        ], 201);
    }

    /**
     * Chi tiết nhà thầu phụ
     */
    public function show(string $id)
    {
        $subcontractor = GlobalSubcontractor::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $subcontractor
        ]);
    }

    /**
     * Cập nhật nhà thầu phụ
     */
    public function update(Request $request, string $id)
    {
        $subcontractor = GlobalSubcontractor::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'description' => 'nullable|string',
            'tax_code' => 'nullable|string|max:50',
        ]);

        $subcontractor->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Nhà thầu phụ đã được cập nhật.',
            'data' => $subcontractor
        ]);
    }

    /**
     * Xóa nhà thầu phụ
     */
    public function destroy(string $id)
    {
        $subcontractor = GlobalSubcontractor::findOrFail($id);
        $subcontractor->delete();

        return response()->json([
            'success' => true,
            'message' => 'Nhà thầu phụ đã được xóa.'
        ]);
    }
}
