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
     * @param $user
     * @param string $permission Permission constant (e.g., Permissions::CONTRACT_VIEW)
     * @param Project|int|null $project Project model, project ID, or null for global check
     * @return bool
     */
    public function can($user, string $permission, $project = null): bool
    {
        if (!$user) return false;

        // 1. Super Admin / Management bypass
        // For Admin model: check super_admin property
        // For User model: check isSuperAdmin() method or owner flag
        $isGlobalAdmin = false;
        if ($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            $isGlobalAdmin = true;
        } elseif ($user instanceof \App\Models\User) {
            $isGlobalAdmin = $user->owner;
        }

        // Generic bypass for specific management permissions
        if ($isGlobalAdmin 
            || $user->hasPermission(Permissions::PROJECT_MANAGE)
            || $user->hasPermission(Permissions::SETTINGS_MANAGE)) {
            return true;
        }

        // 2. Global check (no project context)
        if (!$project) {
            return $user->hasPermission($permission);
        }

        // 3. Resolve project ID
        $projectId = $project instanceof Project ? $project->id : $project;

        // 4. Check project assignment
        $personnel = ProjectPersonnel::where('project_id', $projectId)
            ->where('user_id', $user->id)
            ->first();

        if ($personnel) {
            // Check project-specific permission overrides (JSON column)
            if ($personnel->permissions && is_array($personnel->permissions) && count($personnel->permissions) > 0) {
                if (in_array('*', $personnel->permissions) || in_array($permission, $personnel->permissions)) {
                    return true;
                }
            }

            // Fallback to global permissions ONLY if the user is assigned to the project
            return $user->hasPermission($permission);
        }

        // 5. If NOT assigned and NOT a global admin → Deny access to project-specific data
        return false;
    }

    /**
     * Get all permissions for user in a project
     * 
     * @param $user
     * @param Project|int $project
     * @return array Array of permission strings
     */
    public function getProjectPermissions($user, $project): array
    {
        if (!$user) return [];

        // 1. Super Admin / Management bypass
        $isGlobalAdmin = false;
        if ($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) {
            $isGlobalAdmin = true;
        } elseif ($user instanceof \App\Models\User) {
            $isGlobalAdmin = $user->owner;
        }

        if ($isGlobalAdmin 
            || $user->hasPermission(Permissions::PROJECT_MANAGE)
            || $user->hasPermission(Permissions::SETTINGS_MANAGE)) {
            // Trả về wildcard để Frontend biết là có toàn quyền
            return ['*'];
        }

        // Resolve project ID
        $projectId = $project instanceof Project ? $project->id : $project;

        // Get global permissions (from user's system roles + direct permissions)
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
            // Get explicit project-specific permissions (JSON column overrides)
            $projectPermissions = ($personnel->permissions && is_array($personnel->permissions)) 
                ? $personnel->permissions 
                : [];

            // NOTE: project_personnel.role_id references personnel_roles (NOT system roles).
            // We do NOT resolve system Role permissions from PersonnelRole.
            // PersonnelRole uses canView/canEdit/canApprove methods instead.
            
            // Merge: global + project-specific permissions
            return array_values(array_unique(array_merge($globalPermissions, $projectPermissions)));
        } else {
            // User chưa được assign → trả về global permissions
            return array_values($globalPermissions);
        }
    }

    /**
     * Require permission - throw exception if not authorized
     * 
     * @param $user
     * @param string $permission
     * @param Project|int|null $project
     * @throws \Illuminate\Http\Exceptions\HttpResponseException
     */
    public function require($user, string $permission, $project = null): void
    {
        if (!$this->can($user, $permission, $project)) {
            $projectId = $project instanceof Project ? $project->id : ($project ?? 'global');
            abort(403, "Bạn không có quyền thực hiện hành động này. Cần quyền: {$permission}" . ($project ? " cho project {$projectId}" : ""));
        }
    }

    /**
     * Check if user is super admin (có tất cả permissions)
     * 
     * @param $user
     * @return bool
     * @deprecated Sử dụng hasPermission() thay vì check này
     */
    public function isSuperAdmin($user): bool
    {
        if (!$user) return false;
        
        return method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin();
    }

    /**
     * Check if user is assigned to project
     * 
     * @param $user
     * @param Project|int $project
     * @return bool
     */
    public function isAssignedToProject($user, $project): bool
    {
        if (!$user || !($user instanceof \App\Models\User)) return false;
        $projectId = $project instanceof Project ? $project->id : $project;

        return ProjectPersonnel::where('project_id', $projectId)
            ->where('user_id', $user->id)
            ->exists();
    }
}
