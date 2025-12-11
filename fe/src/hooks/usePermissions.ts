import { useState, useEffect } from "react";
import { permissionApi } from "@/api/permissionApi";

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const response = await permissionApi.getMyPermissions();
      if (response.success) {
        setPermissions(response.data || []);
      }
    } catch (error) {
      console.error("Error loading permissions:", error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    // Super admin có toàn quyền
    if (permissions.includes("*")) {
      return true;
    }
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    if (permissions.includes("*")) {
      return true;
    }
    return permissionList.some((perm) => permissions.includes(perm));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    if (permissions.includes("*")) {
      return true;
    }
    return permissionList.every((perm) => permissions.includes(perm));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refresh: loadPermissions,
  };
}

export function useProjectPermissions(projectId: string | number | null) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      loadProjectPermissions();
    } else {
      setPermissions([]);
      setLoading(false);
    }
  }, [projectId]);

  const loadProjectPermissions = async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const response = await permissionApi.getProjectPermissions(projectId);
      if (response.success) {
        setPermissions(response.data || []);
      }
    } catch (error) {
      console.error("Error loading project permissions:", error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (permissions.includes("*")) {
      return true;
    }
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    if (permissions.includes("*")) {
      return true;
    }
    return permissionList.some((perm) => permissions.includes(perm));
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    refresh: loadProjectPermissions,
  };
}
