<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OvertimeCategory;
use Illuminate\Http\Request;

class OvertimeCategoryController extends Controller
{
    /**
     * Danh sách hạng mục OT
     */
    public function index(Request $request)
    {
        $query = OvertimeCategory::query();

        if ($request->has('is_active')) {
            $query->where('is_active', $request->is_active);
        }

        $categories = $query->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $categories
        ]);
    }

    /**
     * Tạo hạng mục OT mới
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:overtime_categories,code',
            'description' => 'nullable|string',
            'default_multiplier' => 'nullable|numeric|min:1|max:10',
            'is_active' => 'nullable|boolean',
        ]);

        $category = OvertimeCategory::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo hạng mục OT thành công',
            'data' => $category
        ], 201);
    }

    /**
     * Cập nhật hạng mục OT
     */
    public function update(Request $request, $id)
    {
        $category = OvertimeCategory::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:50|unique:overtime_categories,code,' . $category->id,
            'description' => 'nullable|string',
            'default_multiplier' => 'nullable|numeric|min:1|max:10',
            'is_active' => 'nullable|boolean',
        ]);

        $category->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật hạng mục OT thành công',
            'data' => $category
        ]);
    }

    /**
     * Xóa hạng mục OT
     */
    public function destroy($id)
    {
        $category = OvertimeCategory::findOrFail($id);
        $category->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa hạng mục OT thành công'
        ]);
    }
}
