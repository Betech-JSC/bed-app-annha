<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProjectPersonnel;
use Illuminate\Http\Request;

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
}
