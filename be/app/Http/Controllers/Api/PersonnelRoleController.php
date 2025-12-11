<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\ProjectPersonnel;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PersonnelRoleController extends Controller
{
    /**
     * Danh sách tất cả các roles
     */
    public function index()
    {
        $roles = Role::orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $roles,
        ]);
    }

    /**
     * Lấy thông tin chi tiết một role
     */
    public function show(string $id)
    {
        $role = Role::findOrFail($id);

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
            'description' => 'nullable|string|max:1000',
        ]);

        $role = Role::create($validated);

        return response()->json([
            'success' => true,
            'message' => 'Vai trò đã được tạo thành công.',
            'data' => $role,
        ], 201);
    }

    /**
     * Cập nhật role
     */
    public function update(Request $request, string $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('roles', 'name')->ignore($role->id),
            ],
            'description' => 'nullable|string|max:1000',
        ]);

        $role->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Vai trò đã được cập nhật.',
            'data' => $role,
        ]);
    }

    /**
     * Xóa role
     */
    public function destroy(string $id)
    {
        $role = Role::findOrFail($id);

        // Kiểm tra xem role có đang được sử dụng không
        $usageCount = ProjectPersonnel::where('role', $role->name)->count();

        if ($usageCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Không thể xóa vai trò này vì đang có {$usageCount} nhân sự đang sử dụng.",
            ], 400);
        }

        $role->delete();

        return response()->json([
            'success' => true,
            'message' => 'Vai trò đã được xóa.',
        ]);
    }

    /**
     * Lấy danh sách roles với số lượng sử dụng
     */
    public function withUsage()
    {
        $roles = Role::withCount([
            'users' => function ($query) {
                $query->whereHas('personnel');
            }
        ])->orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $roles,
        ]);
    }

    /**
     * Lấy permissions mặc định cho một role
     */
    public function getDefaultPermissions(string $roleName)
    {
        $permissions = $this->getDefaultRolePermissions($roleName);

        return response()->json([
            'success' => true,
            'data' => [
                'role' => $roleName,
                'permissions' => $permissions,
            ],
        ]);
    }

    /**
     * Lấy tất cả permissions trong hệ thống
     */
    public function getAllPermissions()
    {
        $permissions = \App\Models\Permission::orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $permissions,
        ]);
    }

    /**
     * Lấy permissions của một role
     */
    public function getRolePermissions(string $id)
    {
        $role = Role::with('permissions')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'role' => $role,
                'permissions' => $role->permissions->pluck('id')->toArray(),
            ],
        ]);
    }

    /**
     * Sync permissions cho một role
     */
    public function syncPermissions(Request $request, string $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'permission_ids' => 'required|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        $role->permissions()->sync($validated['permission_ids']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật quyền cho vai trò thành công.',
            'data' => $role->load('permissions'),
        ]);
    }

    /**
     * Lấy permissions mặc định dựa trên role name
     */
    private function getDefaultRolePermissions(string $roleName): array
    {
        return match ($roleName) {
            'management', 'Ban điều hành' => ['view', 'edit', 'approve', 'financial_view', 'financial_approve'],
            'accountant', 'Kế toán' => ['view', 'financial_view', 'financial_approve', 'payment_confirm'],
            'team_leader', 'Tổ trưởng' => ['view', 'edit', 'approve', 'manage_workers'],
            'worker', 'Thợ' => ['view'],
            'guest', 'Khách' => ['view'],
            'supervisor_guest', 'Giám sát khách' => ['view', 'approve'],
            'designer', 'Bên Thiết Kế' => ['view', 'edit', 'design_edit'],
            'supervisor', 'Giám sát' => ['view', 'edit', 'approve', 'supervise'],
            'project_manager', 'Quản lý dự án' => ['view', 'edit', 'approve', 'manage_all'],
            default => ['view'],
        };
    }
}
