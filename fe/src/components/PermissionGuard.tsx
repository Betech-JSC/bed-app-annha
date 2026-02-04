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

    // Debug logging
    if (projectId && permission) {
      console.log(`[PermissionGuard] Checking permission: ${permission} for project ${projectId}`);
      console.log(`[PermissionGuard] Loading: ${perms.loading}, Permissions:`, perms.permissions);
      console.log(`[PermissionGuard] Permissions array length:`, perms.permissions?.length || 0);
      console.log(`[PermissionGuard] Permissions includes "*":`, perms.permissions?.includes("*"));
      console.log(`[PermissionGuard] Permissions includes "${permission}":`, perms.permissions?.includes(permission));
    }

    // If still loading, show by default to avoid flickering
    // This allows UI to render while permissions are being fetched
    if (perms.loading) {
      console.log(`[PermissionGuard] Still loading, showing UI by default`);
      return true;
    }

    if (permission) {
      // Direct check first for better debugging and as fallback
      const directCheck = Array.isArray(perms.permissions) && (
        perms.permissions.includes("*") ||
        perms.permissions.includes(permission)
      );
      console.log(`[PermissionGuard] Direct check result: ${directCheck}`);

      // Also use hasPermission method
      const result = perms.hasPermission(permission);
      console.log(`[PermissionGuard] hasPermission() result: ${result} for ${permission}`);

      // Use direct check if hasPermission() returns false but direct check is true
      // This handles edge cases where hasPermission() might have issues
      const finalResult = result || directCheck;

      if (!finalResult && projectId) {
        console.warn(`[PermissionGuard] ⚠️ Permission denied: ${permission} for project ${projectId}`);
        console.warn(`[PermissionGuard] Available permissions:`, perms.permissions);
        console.warn(`[PermissionGuard] Permission string comparison:`, {
          requested: permission,
          requestedType: typeof permission,
          available: perms.permissions,
          availableTypes: perms.permissions?.map(p => typeof p),
          includes: perms.permissions?.includes(permission),
          wildcard: perms.permissions?.includes("*"),
          directCheck,
          hasPermissionResult: result,
        });
      } else if (finalResult && projectId) {
        console.log(`[PermissionGuard] ✅ Permission granted: ${permission} for project ${projectId}`);
      }

      return finalResult;
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
