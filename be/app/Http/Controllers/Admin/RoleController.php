<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Request;
use Inertia\Inertia;
use Inertia\Response;

class RoleController extends Controller
{
    /**
     * Danh sách roles
     */
    public function index(): Response
    {
        $roles = Role::with(['permissions', 'admins'])->get()->map(function ($role) {
            return [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description ?? '',
                'permissions' => $role->permissions->map(function ($perm) {
                    return [
                        'id' => $perm->id,
                        'name' => $perm->name,
                        'description' => $perm->description,
                    ];
                }),
                'permissions_count' => $role->permissions->count(),
                'admins_count' => $role->admins->count(),
                'users_count' => $role->users->count(),
                'created_at' => $role->created_at->format('Y-m-d H:i:s'),
            ];
        });

        $permissions = Permission::all()->map(function ($perm) {
            return [
                'id' => $perm->id,
                'name' => $perm->name,
                'description' => $perm->description ?? '',
            ];
        });

        return Inertia::render('Admin/Roles/Index', [
            'roles' => $roles,
            'permissions' => $permissions,
        ]);
    }

    /**
     * Form tạo role mới
     */
    public function create(): Response
    {
        $permissions = Permission::all()->map(function ($perm) {
            return [
                'id' => $perm->id,
                'name' => $perm->name,
                'description' => $perm->description ?? '',
            ];
        });

        return Inertia::render('Admin/Roles/Create', [
            'permissions' => $permissions,
        ]);
    }

    /**
     * Lưu role mới
     */
    public function store(): RedirectResponse
    {
        Request::validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'description' => 'nullable|string|max:500',
            'permission_ids' => 'sometimes|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        $role = Role::create([
            'name' => Request::get('name'),
            'description' => Request::get('description'),
        ]);

        if (Request::has('permission_ids')) {
            $role->permissions()->sync(Request::get('permission_ids'));
        }

        return redirect()->route('admin.roles.index')->with('success', 'Đã tạo role thành công');
    }

    /**
     * Chi tiết role
     */
    public function show($id): Response
    {
        $role = Role::with(['permissions', 'admins', 'users'])->findOrFail($id);

        $allPermissions = Permission::all()->map(function ($perm) {
            return [
                'id' => $perm->id,
                'name' => $perm->name,
                'description' => $perm->description ?? '',
            ];
        });

        return Inertia::render('Admin/Roles/Show', [
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description ?? '',
                'permissions' => $role->permissions->map(function ($perm) {
                    return [
                        'id' => $perm->id,
                        'name' => $perm->name,
                        'description' => $perm->description ?? '',
                    ];
                }),
                'admins' => $role->admins->map(function ($admin) {
                    return [
                        'id' => $admin->id,
                        'name' => $admin->name,
                        'email' => $admin->email,
                    ];
                }),
                'users' => $role->users->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                    ];
                }),
                'created_at' => $role->created_at->format('Y-m-d H:i:s'),
            ],
            'allPermissions' => $allPermissions,
        ]);
    }

    /**
     * Form chỉnh sửa role
     */
    public function edit($id): Response
    {
        $role = Role::with('permissions')->findOrFail($id);

        $permissions = Permission::all()->map(function ($perm) {
            return [
                'id' => $perm->id,
                'name' => $perm->name,
                'description' => $perm->description ?? '',
            ];
        });

        return Inertia::render('Admin/Roles/Edit', [
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description ?? '',
                'permission_ids' => $role->permissions->pluck('id')->toArray(),
            ],
            'permissions' => $permissions,
        ]);
    }

    /**
     * Cập nhật role
     */
    public function update($id): RedirectResponse
    {
        $role = Role::findOrFail($id);

        Request::validate([
            'name' => 'required|string|max:255|unique:roles,name,' . $role->id,
            'description' => 'nullable|string|max:500',
            'permission_ids' => 'sometimes|array',
            'permission_ids.*' => 'exists:permissions,id',
        ]);

        $role->update([
            'name' => Request::get('name'),
            'description' => Request::get('description'),
        ]);

        if (Request::has('permission_ids')) {
            $role->permissions()->sync(Request::get('permission_ids'));
        } else {
            $role->permissions()->detach();
        }

        return redirect()->route('admin.roles.index')->with('success', 'Đã cập nhật role thành công');
    }

    /**
     * Xóa role
     */
    public function destroy($id): RedirectResponse
    {
        $role = Role::findOrFail($id);

        // Kiểm tra xem role có đang được sử dụng không
        if ($role->admins()->count() > 0 || $role->users()->count() > 0) {
            return redirect()->back()->with('error', 'Không thể xóa role đang được sử dụng');
        }

        $role->permissions()->detach();
        $role->delete();

        return redirect()->route('admin.roles.index')->with('success', 'Đã xóa role thành công');
    }
}
