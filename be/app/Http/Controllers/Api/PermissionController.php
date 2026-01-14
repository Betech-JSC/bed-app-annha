<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use App\Models\ProjectPersonnel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class PermissionController extends Controller
{
    /**
     * Lấy tất cả permissions của user hiện tại
     */
    public function myPermissions(Request $request)
    {
        $user = $request->user('sanctum');

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        $permissions = $user->permissions()->pluck('name')->toArray();

        return response()->json([
            'success' => true,
            'data' => $permissions,
        ]);
    }

    /**
     * Kiểm tra user có permission không
     */
    public function checkPermission(Request $request, string $permission)
    {
        $user = $request->user('sanctum');

        if (!$user) {
            return response()->json([
                'success' => false,
                'has_permission' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        $hasPermission = $user->hasPermission($permission);

        return response()->json([
            'success' => true,
            'has_permission' => $hasPermission,
            'permission' => $permission,
        ]);
    }

    /**
     * Kiểm tra permissions của user trong một project cụ thể
     */
    public function checkProjectPermission(Request $request, string $projectId, string $permission)
    {
        $user = $request->user('sanctum');

        if (!$user) {
            return response()->json([
                'success' => false,
                'has_permission' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        // Super admin có toàn quyền
        if ($user->role === 'admin' && $user->owner === true) {
            return response()->json([
                'success' => true,
                'has_permission' => true,
                'permission' => $permission,
                'source' => 'super_admin',
            ]);
        }

        // Check qua ProjectPersonnel
        $personnel = ProjectPersonnel::where('project_id', $projectId)
            ->where('user_id', $user->id)
            ->first();

        if ($personnel && $personnel->hasPermission($permission)) {
            return response()->json([
                'success' => true,
                'has_permission' => true,
                'permission' => $permission,
                'source' => 'project_personnel',
            ]);
        }

        // Check qua global roles
        $hasPermission = $user->hasPermission($permission);

        return response()->json([
            'success' => true,
            'has_permission' => $hasPermission,
            'permission' => $permission,
            'source' => $hasPermission ? 'global_role' : 'none',
        ]);
    }

    /**
     * Lấy permissions của user trong một project
     */
    public function projectPermissions(Request $request, string $projectId)
    {
        $user = $request->user('sanctum');

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        $permissions = [];

        // Super admin có toàn quyền
        if ($user->role === 'admin' && $user->owner === true) {
            $permissions = ['*']; // All permissions
        } else {
            // Get permissions từ ProjectPersonnel
            $personnel = ProjectPersonnel::where('project_id', $projectId)
                ->where('user_id', $user->id)
                ->first();

            if ($personnel && $personnel->permissions) {
                $permissions = array_merge($permissions, $personnel->permissions);
            }

            // Get permissions từ global roles
            $globalPermissions = $user->permissions()->pluck('name')->toArray();
            $permissions = array_merge($permissions, $globalPermissions);
        }

        $permissions = array_unique($permissions);

        return response()->json([
            'success' => true,
            'data' => $permissions,
        ]);
    }

    /**
     * Lấy danh sách tất cả permissions (cho quản lý)
     */
    public function index(Request $request)
    {
        $permissions = Permission::orderBy('name')->get();

        return response()->json([
            'success' => true,
            'data' => $permissions,
        ]);
    }

    /**
     * Tạo permission mới
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:permissions,name',
            'description' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $permission = Permission::create([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo quyền thành công.',
            'data' => $permission
        ], 201);
    }

    /**
     * Cập nhật permission
     */
    public function update(Request $request, string $id)
    {
        $permission = Permission::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255|unique:permissions,name,' . $id,
            'description' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $permission->update([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật quyền thành công.',
            'data' => $permission
        ]);
    }

    /**
     * Xóa permission
     */
    public function destroy(string $id)
    {
        $permission = Permission::findOrFail($id);

        // Kiểm tra xem permission có đang được sử dụng không
        $rolesCount = $permission->roles()->count();
        if ($rolesCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Không thể xóa quyền này vì đang được sử dụng bởi {$rolesCount} vai trò."
            ], 422);
        }

        $permission->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa quyền thành công.'
        ]);
    }
}
