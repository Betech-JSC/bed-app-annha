import { useEffect, useMemo, useState, useRef, useCallback } from "react";
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

// Cache để tránh gọi API nhiều lần cho cùng một project
const projectPermissionsCache: Record<string, { permissions: string[]; timestamp: number }> = {};
const projectPermissionsFetching: Record<string, Promise<any> | null> = {};
const CACHE_DURATION = 60000; // 1 phút cache
const DEBOUNCE_DELAY = 2000; // 2 giây debounce

export function useProjectPermissions(projectId: string | number | null) {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const lastLoadTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLoadingRef = useRef<boolean>(false);

  const loadProjectPermissions = useCallback(async (force: boolean = false) => {
    if (!projectId) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    const projectIdStr = String(projectId);
    const now = Date.now();
    const timeSinceLastLoad = now - lastLoadTimeRef.current;

    // Check cache first
    const cached = projectPermissionsCache[projectIdStr];
    if (!force && cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log(`[useProjectPermissions] Using cached permissions for project ${projectId}`);
      setPermissions(cached.permissions);
      setLoading(false);
      return;
    }

    // Prevent concurrent calls
    if (isLoadingRef.current && !force) {
      return;
    }

    // Debounce if called too soon
    if (!force && timeSinceLastLoad < DEBOUNCE_DELAY) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        loadProjectPermissions(true);
      }, DEBOUNCE_DELAY - timeSinceLastLoad);
      return;
    }

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Check if already fetching
    if (projectPermissionsFetching[projectIdStr] && !force) {
      try {
        await projectPermissionsFetching[projectIdStr];
        const cached = projectPermissionsCache[projectIdStr];
        if (cached) {
          setPermissions(cached.permissions);
          setLoading(false);
        }
        return;
      } catch (error) {
        // Continue to fetch if previous fetch failed
      }
    }

    try {
      isLoadingRef.current = true;
      setLoading(true);
      lastLoadTimeRef.current = Date.now();

      const fetchPromise = permissionApi.getProjectPermissions(projectId);
      projectPermissionsFetching[projectIdStr] = fetchPromise;

      const response = await fetchPromise;

      if (response.success) {
        const perms = Array.isArray(response.data) ? response.data : [];
        console.log(`[useProjectPermissions] Loaded permissions for project ${projectId}:`, perms);
        setPermissions(perms);

        // Update cache
        projectPermissionsCache[projectIdStr] = {
          permissions: perms,
          timestamp: Date.now(),
        };
      } else {
        console.warn(`[useProjectPermissions] Failed to load permissions for project ${projectId}:`, response);
        setPermissions([]);
      }
    } catch (error: any) {
      console.error("Error loading project permissions:", error);

      // Retry logic for 429 errors
      if (error.response?.status === 429) {
        const retryAfter = error.response?.headers?.['retry-after']
          ? parseInt(error.response.headers['retry-after']) * 1000
          : 3000; // Default 3 seconds

        console.log(`[useProjectPermissions] Rate limited. Retrying after ${retryAfter}ms...`);
        setTimeout(() => {
          loadProjectPermissions(true);
        }, retryAfter);
        return;
      }

      // Use cached permissions if available, even if expired
      const cached = projectPermissionsCache[projectIdStr];
      if (cached) {
        console.log(`[useProjectPermissions] Using expired cache due to error`);
        setPermissions(cached.permissions);
      } else {
        setPermissions([]);
      }
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
      projectPermissionsFetching[projectIdStr] = null;
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadProjectPermissions(false);
    } else {
      setPermissions([]);
      setLoading(false);
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [projectId, loadProjectPermissions]);

  const hasPermission = (permission: string): boolean => {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return false;
    }
    if (permissions.includes("*")) {
      return true;
    }
    const has = permissions.includes(permission);
    if (!has) {
      console.log(`[useProjectPermissions] Permission check failed: ${permission}. Available permissions:`, permissions);
    }
    return has;
  };

  const hasAnyPermission = (permissionList: string[]): boolean => {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return false;
    }
    if (permissions.includes("*")) {
      return true;
    }
    return permissionList.some((perm) => permissions.includes(perm));
  };

  const hasAllPermissions = (permissionList: string[]): boolean => {
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return false;
    }
    if (permissions.includes("*")) {
      return true;
    }
    return permissionList.every((perm) => permissions.includes(perm));
  };

  const refresh = useCallback(() => {
    // Clear cache to force reload
    if (projectId) {
      const projectIdStr = String(projectId);
      delete projectPermissionsCache[projectIdStr];
      loadProjectPermissions(true);
    }
  }, [projectId, loadProjectPermissions]);

  return {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refresh,
  };
}
