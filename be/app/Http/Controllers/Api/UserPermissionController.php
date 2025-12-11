<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Permission;
use Illuminate\Http\Request;

class UserPermissionController extends Controller
{
    /**
     * Lấy tất cả permissions của một user
     */
    public function getUserPermissions(string $id)
    {
        $user = User::with(['directPermissions', 'roles.permissions'])->findOrFail($id);

        // Lấy permissions từ roles
        $rolePermissions = $user->roles()
            ->with('permissions')
            ->get()
            ->pluck('permissions')
            ->flatten()
            ->unique('id');

        // Lấy permissions trực tiếp
        $directPermissions = $user->directPermissions;

        // Merge và unique
        $allPermissions = $rolePermissions->merge($directPermissions)->unique('id');

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'direct_permission_ids' => $directPermissions->pluck('id')->toArray(),
                'role_permission_ids' => $rolePermissions->pluck('id')->toArray(),
                'all_permission_ids' => $allPermissions->pluck('id')->toArray(),
            ],
        ]);
    }

    /**
     * Sync permissions trực tiếp cho user
     */
    public function syncUserPermissions(Request $request, string $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'permission_ids' => 'required|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        $user->directPermissions()->sync($validated['permission_ids']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật quyền cho tài khoản thành công.',
            'data' => $user->load('directPermissions'),
        ]);
    }

    /**
     * Lấy tất cả permissions trong hệ thống
     */
    public function getAllPermissions()
    {
        $permissions = Permission::orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $permissions,
        ]);
    }
}
