<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CostGroup;
use Illuminate\Http\Request;

class CostGroupController extends Controller
{
    /**
     * Danh sách nhóm chi phí
     */
    public function index()
    {
        $groups = CostGroup::active()->ordered()->get();

        return response()->json([
            'success' => true,
            'data' => $groups
        ]);
    }

    /**
     * Tạo nhóm chi phí mới
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        // Check permission (owner, admin hoặc có quyền settings.manage)
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission('settings.manage')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo nhóm chi phí.'
            ], 403);
        }

        $validated = $request->validate([
            'code' => 'required|string|max:50|unique:cost_groups,code',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:1000',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $group = CostGroup::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Nhóm chi phí đã được tạo.',
            'data' => $group
        ], 201);
    }

    /**
     * Chi tiết nhóm chi phí
     */
    public function show(string $id)
    {
        $group = CostGroup::findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $group
        ]);
    }

    /**
     * Cập nhật nhóm chi phí
     */
    public function update(Request $request, string $id)
    {
        $user = auth()->user();

        // Check permission (owner, admin hoặc có quyền settings.manage)
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission('settings.manage')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật nhóm chi phí.'
            ], 403);
        }

        $group = CostGroup::findOrFail($id);

        $validated = $request->validate([
            'code' => 'sometimes|string|max:50|unique:cost_groups,code,' . $id,
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string|max:1000',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]);

        $group->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Nhóm chi phí đã được cập nhật.',
            'data' => $group->fresh()
        ]);
    }

    /**
     * Xóa nhóm chi phí
     */
    public function destroy(string $id)
    {
        $user = auth()->user();

        // Check permission (owner, admin hoặc có quyền settings.manage)
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission('settings.manage')) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa nhóm chi phí.'
            ], 403);
        }

        $group = CostGroup::findOrFail($id);

        // Kiểm tra xem có chi phí nào đang sử dụng nhóm này không
        $costsCount = \App\Models\Cost::where('category', $group->code)->count();
        if ($costsCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Không thể xóa nhóm chi phí này vì có {$costsCount} chi phí đang sử dụng."
            ], 400);
        }

        $group->delete();

        return response()->json([
            'success' => true,
            'message' => 'Nhóm chi phí đã được xóa.'
        ]);
    }
}
