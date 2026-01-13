import React from "react";
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

  const hasPermission = () => {
    // Use project permissions if projectId is provided
    const perms = projectId ? projectPermissions : globalPermissions;

    if (permission) {
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
  };

  if (!hasPermission()) {
    return <>{fallback}</>;
  }

  return <View {...viewProps}>{children}</View>;
}

PermissionGuard.displayName = 'PermissionGuard';

export { PermissionGuard };
