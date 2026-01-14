import { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "@/store";
import { fetchPermissions } from "@/reducers/permissionsSlice";
import { permissionApi } from "@/api/permissionApi";

// Cache để tránh gọi API nhiều lần trong cùng một render cycle
let fetchPromise: Promise<any> | null = null;

export function usePermissions() {
  const dispatch = useDispatch();
  const { permissions, loading, lastFetched } = useSelector(
    (state: RootState) => state.permissions
  );
  const user = useSelector((state: RootState) => state.user);

  useEffect(() => {
    // Chỉ fetch nếu:
    // 1. Có user token
    // 2. Chưa có permissions hoặc đã quá 5 phút (300000ms) kể từ lần fetch cuối
    const shouldFetch =
      user?.token &&
      (!lastFetched || Date.now() - lastFetched > 300000);

    if (shouldFetch && !fetchPromise) {
      fetchPromise = dispatch(fetchPermissions() as any).finally(() => {
        fetchPromise = null;
      });
    }
  }, [user?.token, lastFetched, dispatch]);

  const hasPermission = useMemo(() => {
    return (permission: string): boolean => {
      // Super admin có toàn quyền
      if (permissions.includes("*")) {
        return true;
      }
      return permissions.includes(permission);
    };
  }, [permissions]);

  const hasAnyPermission = useMemo(() => {
    return (permissionList: string[]): boolean => {
      if (permissions.includes("*")) {
        return true;
      }
      return permissionList.some((perm) => permissions.includes(perm));
    };
  }, [permissions]);

  const hasAllPermissions = useMemo(() => {
    return (permissionList: string[]): boolean => {
      if (permissions.includes("*")) {
        return true;
      }
      return permissionList.every((perm) => permissions.includes(perm));
    };
  }, [permissions]);

  const refresh = () => {
    if (!fetchPromise) {
      fetchPromise = dispatch(fetchPermissions() as any).finally(() => {
        fetchPromise = null;
      });
    }
  };

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refresh,
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
    refresh: loadProjectPermissions,
  };
}
