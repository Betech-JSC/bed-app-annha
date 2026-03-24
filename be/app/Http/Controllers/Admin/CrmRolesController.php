<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CrmRolesController extends Controller
{
    /**
     * Main page — list all roles with their permissions
     */
    public function index()
    {
        $roles = Role::with('permissions')
            ->withCount('users')
            ->orderBy('name')
            ->get()
            ->map(fn($role) => [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'users_count' => $role->users_count ?? 0,
                'permissions' => $role->permissions->pluck('id')->toArray(),
                'permission_names' => $role->permissions->pluck('name')->toArray(),
                'created_at' => $role->created_at?->format('d/m/Y'),
            ]);

        // Group permissions by prefix (e.g. "project.view" => group "project")
        $permissions = Permission::orderBy('name')->get();
        $groupedPermissions = $permissions->groupBy(function ($p) {
            $parts = explode('.', $p->name);
            return $parts[0] ?? 'general';
        })->map(function ($group, $key) {
            return [
                'group' => $this->translateGroup($key),
                'key' => $key,
                'items' => $group->map(fn($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'description' => $p->description,
                    'label' => $this->translatePermission($p->name),
                ])->values(),
            ];
        })->values();

        $users = User::orderBy('name')
            ->select('id', 'name', 'email')
            ->get();

        return Inertia::render('Crm/Roles/Index', [
            'roles' => $roles,
            'groupedPermissions' => $groupedPermissions,
            'allPermissions' => $permissions->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'label' => $this->translatePermission($p->name),
            ]),
            'users' => $users,
        ]);
    }

    /**
     * Create a new role
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'description' => 'nullable|string|max:500',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        if (!empty($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        return redirect()->back()->with('success', 'Tạo vai trò thành công');
    }

    /**
     * Update role + sync permissions
     */
    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'name' => "required|string|max:255|unique:roles,name,{$id}",
            'description' => 'nullable|string|max:500',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        $role->permissions()->sync($validated['permissions'] ?? []);

        return redirect()->back()->with('success', 'Cập nhật vai trò thành công');
    }

    /**
     * Delete a role
     */
    public function destroy($id)
    {
        $role = Role::findOrFail($id);
        $role->permissions()->detach();
        $role->users()->detach();
        $role->delete();

        return redirect()->back()->with('success', 'Xóa vai trò thành công');
    }

    /**
     * Assign role to user
     */
    public function assignUser(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $role->users()->syncWithoutDetaching([$validated['user_id']]);

        return redirect()->back()->with('success', 'Gán vai trò thành công');
    }

    /**
     * Remove role from user
     */
    public function removeUser(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $role->users()->detach($validated['user_id']);

        return redirect()->back()->with('success', 'Gỡ vai trò thành công');
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private function translateGroup(string $key): string
    {
        return [
            'project' => 'Dự án',
            'cost' => 'Chi phí',
            'material' => 'Vật tư',
            'equipment' => 'Thiết bị',
            'hr' => 'Nhân sự',
            'finance' => 'Tài chính',
            'report' => 'Báo cáo',
            'user' => 'Người dùng',
            'role' => 'Vai trò',
            'permission' => 'Quyền hạn',
            'notification' => 'Thông báo',
            'setting' => 'Cài đặt',
            'system' => 'Hệ thống',
            'general' => 'Chung',
        ][$key] ?? ucfirst($key);
    }

    private function translatePermission(string $name): string
    {
        $translations = [
            'project.view' => 'Xem dự án',
            'project.create' => 'Tạo dự án',
            'project.edit' => 'Sửa dự án',
            'project.delete' => 'Xóa dự án',
            'cost.view' => 'Xem chi phí',
            'cost.create' => 'Tạo chi phí',
            'cost.edit' => 'Sửa chi phí',
            'cost.delete' => 'Xóa chi phí',
            'cost.approve.management' => 'Duyệt chi phí (BĐH)',
            'cost.approve.accountant' => 'Duyệt chi phí (Kế toán)',
            'material.view' => 'Xem vật tư',
            'material.create' => 'Tạo vật tư',
            'material.edit' => 'Sửa vật tư',
            'material.delete' => 'Xóa vật tư',
            'equipment.view' => 'Xem thiết bị',
            'equipment.create' => 'Tạo thiết bị',
            'equipment.edit' => 'Sửa thiết bị',
            'equipment.delete' => 'Xóa thiết bị',
            'hr.view' => 'Xem nhân sự',
            'hr.create' => 'Tạo nhân sự',
            'hr.edit' => 'Sửa nhân sự',
            'hr.delete' => 'Xóa nhân sự',
            'report.view' => 'Xem báo cáo',
            'setting.view' => 'Xem cài đặt',
            'setting.edit' => 'Sửa cài đặt',
            'notification.send' => 'Gửi thông báo',
            'role.manage' => 'Quản lý vai trò',
        ];

        return $translations[$name] ?? $name;
    }
}
