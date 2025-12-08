<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Request;
use Inertia\Inertia;
use Inertia\Response;

class PermissionController extends Controller
{
    /**
     * Danh sách permissions
     */
    public function index(): Response
    {
        $permissions = Permission::with('roles')->get()->map(function ($perm) {
            return [
                'id' => $perm->id,
                'name' => $perm->name,
                'description' => $perm->description ?? '',
                'roles_count' => $perm->roles->count(),
                'created_at' => $perm->created_at->format('Y-m-d H:i:s'),
            ];
        });

        return Inertia::render('Admin/Permissions/Index', [
            'permissions' => $permissions,
        ]);
    }

    /**
     * Form tạo permission mới
     */
    public function create(): Response
    {
        return Inertia::render('Admin/Permissions/Create');
    }

    /**
     * Lưu permission mới
     */
    public function store(): RedirectResponse
    {
        Request::validate([
            'name' => 'required|string|max:255|unique:permissions,name',
            'description' => 'nullable|string|max:500',
        ]);

        Permission::create([
            'name' => Request::get('name'),
            'description' => Request::get('description'),
        ]);

        return redirect()->route('admin.permissions.index')->with('success', 'Đã tạo permission thành công');
    }

    /**
     * Form chỉnh sửa permission
     */
    public function edit($id): Response
    {
        $permission = Permission::findOrFail($id);

        return Inertia::render('Admin/Permissions/Edit', [
            'permission' => [
                'id' => $permission->id,
                'name' => $permission->name,
                'description' => $permission->description ?? '',
            ],
        ]);
    }

    /**
     * Cập nhật permission
     */
    public function update($id): RedirectResponse
    {
        $permission = Permission::findOrFail($id);

        Request::validate([
            'name' => 'required|string|max:255|unique:permissions,name,' . $permission->id,
            'description' => 'nullable|string|max:500',
        ]);

        $permission->update([
            'name' => Request::get('name'),
            'description' => Request::get('description'),
        ]);

        return redirect()->route('admin.permissions.index')->with('success', 'Đã cập nhật permission thành công');
    }

    /**
     * Xóa permission
     */
    public function destroy($id): RedirectResponse
    {
        $permission = Permission::findOrFail($id);

        // Kiểm tra xem permission có đang được sử dụng không
        if ($permission->roles()->count() > 0) {
            return redirect()->back()->with('error', 'Không thể xóa permission đang được sử dụng');
        }

        $permission->delete();

        return redirect()->route('admin.permissions.index')->with('success', 'Đã xóa permission thành công');
    }

    /**
     * Quản lý roles cho admin
     */
    public function manageAdminRoles(): Response
    {
        $admins = Admin::with('roles')->get()->map(function ($admin) {
            return [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'super_admin' => $admin->super_admin,
                'roles' => $admin->roles->map(function ($role) {
                    return [
                        'id' => $role->id,
                        'name' => $role->name,
                    ];
                }),
            ];
        });

        $roles = Role::all()->map(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description ?? '',
            ];
        });

        return Inertia::render('Admin/Permissions/ManageAdminRoles', [
            'admins' => $admins,
            'roles' => $roles,
        ]);
    }

    /**
     * Cập nhật roles cho admin
     */
    public function updateAdminRole($id): RedirectResponse
    {
        $admin = Admin::findOrFail($id);

        Request::validate([
            'role_ids' => 'sometimes|array',
            'role_ids.*' => 'exists:roles,id',
            'super_admin' => 'sometimes|boolean',
        ]);

        if (Request::has('super_admin')) {
            $admin->super_admin = Request::get('super_admin');
            $admin->save();
        }

        if (Request::has('role_ids')) {
            $admin->roles()->sync(Request::get('role_ids'));
        }

        return redirect()->back()->with('success', 'Đã cập nhật quyền cho admin thành công');
    }
}
