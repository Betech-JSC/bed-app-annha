import React, { useMemo } from "react";
import { View, ViewProps } from "react-native";
import { usePermissions, useProjectPermissions } from "@/hooks/usePermissions";

interface PermissionGuardProps extends ViewProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  projectId?: string | number | null;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

function PermissionGuard({
  permission,
  permissions,
  requireAll = false,
  projectId,
  fallback = null,
  children,
  ...viewProps
}: PermissionGuardProps) {
  const globalPermissions = usePermissions();
  const projectPermissions = useProjectPermissions(projectId || null);

  // Memoize permission check to avoid recalculating on every render
  const isAllowed = useMemo(() => {
    const perms = projectId ? projectPermissions : globalPermissions;

    // If still loading, hide UI to prevent flash
    if (perms.loading) {
      return false;
    }

    if (permission) {
      // Direct array check (fast path)
      if (Array.isArray(perms.permissions)) {
        if (perms.permissions.includes("*") || perms.permissions.includes(permission)) {
          return true;
        }
      }
      // Fallback to hasPermission method
      return perms.hasPermission(permission);
    }

    if (permissions && permissions.length > 0) {
      if (requireAll) {
        return perms.hasAllPermissions(permissions);
      } else {
        return perms.hasAnyPermission(permissions);
      }
    }

    return true; // No permission check, show by default
  }, [
    permission,
    permissions,
    requireAll,
    projectId,
    globalPermissions.permissions,
    globalPermissions.loading,
    projectPermissions.permissions,
    projectPermissions.loading,
  ]);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <View {...viewProps}>{children}</View>;
}

PermissionGuard.displayName = 'PermissionGuard';

export { PermissionGuard };
