/**
 * Permission utility functions
 * 
 * Helper functions for permission checks and role-based logic
 */

import { Permissions } from "@/constants/Permissions";

/**
 * Check if user has super admin permissions (all permissions)
 */
export const isSuperAdmin = (permissions: string[]): boolean => {
    return permissions.includes("*");
};

/**
 * Check if user has any project permissions
 */
export const hasProjectPermissions = (permissions: string[]): boolean => {
    if (isSuperAdmin(permissions)) return true;
    return permissions.some((perm) =>
        perm.startsWith("project.") || perm === Permissions.PROJECT_VIEW
    );
};

/**
 * Check if user has any HR permissions
 */
export const hasHRPermissions = (permissions: string[]): boolean => {
    if (isSuperAdmin(permissions)) return true;
    return permissions.some((perm) => perm.startsWith("hr."));
};

/**
 * Check if user can approve at a specific level
 */
export const canApproveAtLevel = (
    permissions: string[],
    level: 1 | 2 | 3
): boolean => {
    if (isSuperAdmin(permissions)) return true;

    const levelPermissions = [
        Permissions.ACCEPTANCE_APPROVE_LEVEL_1,
        Permissions.ACCEPTANCE_APPROVE_LEVEL_2,
        Permissions.ACCEPTANCE_APPROVE_LEVEL_3,
    ];

    // Can approve at this level or higher
    for (let i = level; i <= 3; i++) {
        if (permissions.includes(levelPermissions[i - 1])) {
            return true;
        }
    }

    return false;
};

/**
 * Check if user can manage costs (create, update, delete)
 */
export const canManageCosts = (permissions: string[]): boolean => {
    if (isSuperAdmin(permissions)) return true;
    return (
        permissions.includes(Permissions.COST_CREATE) ||
        permissions.includes(Permissions.COST_UPDATE) ||
        permissions.includes(Permissions.COST_DELETE)
    );
};

/**
 * Check if user can approve costs
 */
export const canApproveCosts = (permissions: string[]): boolean => {
    if (isSuperAdmin(permissions)) return true;
    return (
        permissions.includes(Permissions.COST_APPROVE_MANAGEMENT) ||
        permissions.includes(Permissions.COST_APPROVE_ACCOUNTANT)
    );
};

/**
 * Get redirect path based on permissions
 */
export const getRedirectPath = (permissions: string[]): string => {
    if (isSuperAdmin(permissions)) {
        return "/projects";
    }

    const hasHR = hasHRPermissions(permissions);
    const hasProject = hasProjectPermissions(permissions);

    if (hasHR && !hasProject) {
        return "/hr";
    }

    if (hasProject) {
        return "/projects";
    }

    if (hasHR) {
        return "/hr";
    }

    return "/projects";
};
