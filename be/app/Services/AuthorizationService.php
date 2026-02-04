<?php

namespace App\Services;

use App\Models\User;
use App\Models\Project;
use App\Models\ProjectPersonnel;
use App\Constants\Permissions;

/**
 * Authorization Service
 * 
 * Centralized service for checking user permissions with project-specific logic.
 * 
 * Logic:
 * - If user is assigned to project (ProjectPersonnel exists):
 *   → Check project-specific permissions first
 *   → If project-specific permissions exist and contain the permission → grant access
 *   → If project-specific permissions are empty or don't contain permission → fallback to global permissions
 * 
 * - If user is NOT assigned to project:
 *   → Use global permissions (for admin/accountant who need system-wide access)
 * 
 * - Super admin (users with all permissions) can access everything via global permissions fallback
 */
class AuthorizationService
{
    /**
     * Check if user has permission for a specific project
     * 
     * @param User $user
     * @param string $permission Permission constant (e.g., Permissions::CONTRACT_VIEW)
     * @param Project|int|null $project Project model, project ID, or null for global check
     * @return bool
     */
    public function can(User $user, string $permission, $project = null): bool
    {
        // Nếu không có project context → check global permission
        if (!$project) {
            return $user->hasPermission($permission);
        }

        // Resolve project ID
        $projectId = $project instanceof Project ? $project->id : $project;

        // Check nếu user đã được assign vào project
        $personnel = ProjectPersonnel::where('project_id', $projectId)
            ->where('user_id', $user->id)
            ->first();

        if ($personnel) {
            // User đã được assign → check project-specific permissions trước
            if ($personnel->permissions && is_array($personnel->permissions) && count($personnel->permissions) > 0) {
                // Check wildcard
                if (in_array('*', $personnel->permissions)) {
                    return true;
                }
                // Check specific permission
                if (in_array($permission, $personnel->permissions)) {
                    return true;
                }
            }

            // Nếu project-specific permissions rỗng hoặc không có permission → fallback về global permissions
            // (Super admin hoặc users với global permissions vẫn có thể xem)
            return $user->hasPermission($permission);
        } else {
            // User chưa được assign → check global permissions
            // (Có thể là admin/accountant cần xem tất cả projects)
            return $user->hasPermission($permission);
        }
    }

    /**
     * Get all permissions for user in a project
     * 
     * @param User $user
     * @param Project|int $project
     * @return array Array of permission strings
     */
    public function getProjectPermissions(User $user, $project): array
    {
        // Resolve project ID
        $projectId = $project instanceof Project ? $project->id : $project;

        // Get global permissions first (cần dùng cho fallback)
        $rolePermissions = $user->roles()
            ->with('permissions')
            ->get()
            ->pluck('permissions')
            ->flatten()
            ->pluck('name')
            ->toArray();

        $directPermissions = $user->directPermissions()
            ->pluck('name')
            ->toArray();

        $globalPermissions = array_unique(array_merge($rolePermissions, $directPermissions));

        // Check nếu user đã được assign vào project
        $personnel = ProjectPersonnel::where('project_id', $projectId)
            ->where('user_id', $user->id)
            ->first();

        if ($personnel) {
            // User đã được assign → check project-specific permissions
            if ($personnel->permissions && is_array($personnel->permissions) && count($personnel->permissions) > 0) {
                // Có project-specific permissions → trả về chúng
                return $personnel->permissions;
            }
            // Nếu không có project-specific permissions → fallback về global permissions
            // (Super admin hoặc users với global permissions vẫn có thể xem)
            return $globalPermissions;
        } else {
            // User chưa được assign → trả về global permissions
            return $globalPermissions;
        }
    }

    /**
     * Require permission - throw exception if not authorized
     * 
     * @param User $user
     * @param string $permission
     * @param Project|int|null $project
     * @throws \Illuminate\Http\Exceptions\HttpResponseException
     */
    public function require(User $user, string $permission, $project = null): void
    {
        if (!$this->can($user, $permission, $project)) {
            $projectId = $project instanceof Project ? $project->id : ($project ?? 'global');
            abort(403, "Bạn không có quyền thực hiện hành động này. Cần quyền: {$permission}" . ($project ? " cho project {$projectId}" : ""));
        }
    }

    /**
     * Check if user is super admin (có tất cả permissions)
     * 
     * @param User $user
     * @return bool
     * @deprecated Sử dụng hasPermission() thay vì check này
     */
    public function isSuperAdmin(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    /**
     * Check if user is assigned to project
     * 
     * @param User $user
     * @param Project|int $project
     * @return bool
     */
    public function isAssignedToProject(User $user, $project): bool
    {
        $projectId = $project instanceof Project ? $project->id : $project;

        return ProjectPersonnel::where('project_id', $projectId)
            ->where('user_id', $user->id)
            ->exists();
    }
}
