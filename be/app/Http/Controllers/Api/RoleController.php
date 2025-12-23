<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    /**
     * Danh sách roles
     */
    public function index()
    {
        $roles = Role::with(['permissions', 'users'])
            ->withCount(['users', 'permissions'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $roles,
        ]);
    }

    /**
     * Chi tiết role
     */
    public function show($id)
    {
        $role = Role::with(['permissions', 'users'])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $role,
        ]);
    }

    /**
     * Tạo role mới
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'description' => 'nullable|string|max:500',
            'permission_ids' => 'nullable|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        if (!empty($validated['permission_ids'])) {
            $role->permissions()->sync($validated['permission_ids']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo vai trò thành công',
            'data' => $role->load(['permissions']),
        ], 201);
    }

    /**
     * Cập nhật role
     */
    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255|unique:roles,name,' . $role->id,
            'description' => 'nullable|string|max:500',
            'permission_ids' => 'nullable|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        $role->update([
            'name' => $validated['name'] ?? $role->name,
            'description' => $validated['description'] ?? $role->description,
        ]);

        if (isset($validated['permission_ids'])) {
            $role->permissions()->sync($validated['permission_ids']);
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật vai trò thành công',
            'data' => $role->load(['permissions']),
        ]);
    }

    /**
     * Xóa role
     */
    public function destroy($id)
    {
        $role = Role::findOrFail($id);

        // Kiểm tra xem role có đang được sử dụng không
        if ($role->users()->count() > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa vai trò đang được sử dụng',
            ], 400);
        }

        $role->permissions()->detach();
        $role->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa vai trò thành công',
        ]);
    }
}


