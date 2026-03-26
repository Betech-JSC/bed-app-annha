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

// Prevent concurrent calls for the same project
const projectPermissionsFetching: Record<string, Promise<any> | null> = {};
const projectPermissionsCache: Record<string, {
  permissions: string[];
  timestamp: number;
}> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const DEBOUNCE_DELAY = 500; // 500ms debounce để tránh spam API

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

    // Check global cache first
    const cached = projectPermissionsCache[projectIdStr];
    if (cached && (now - cached.timestamp < CACHE_DURATION) && !force) {
      setPermissions(cached.permissions);
      setLoading(false);
      return;
    }

    // Check if already fetching
    if (projectPermissionsFetching[projectIdStr] && !force) {
      try {
        const response = await projectPermissionsFetching[projectIdStr];
        if (response?.success) {
          const perms = Array.isArray(response.data) ? response.data : [];
          setPermissions(perms);
          setLoading(false);
        }
        return;
      } catch (error) {
        // Continue to fetch if previous fetch failed
      }
    }

    // Debounce if called too soon (chỉ để tránh spam, không cache)
    if (!force && (now - lastLoadTimeRef.current < DEBOUNCE_DELAY)) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        loadProjectPermissions(true);
      }, DEBOUNCE_DELAY - (now - lastLoadTimeRef.current));
      return;
    }

    // Clear timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
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

        // Update cache
        projectPermissionsCache[projectIdStr] = {
          permissions: perms,
          timestamp: Date.now()
        };

        setPermissions(perms);
      } else {
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

      setPermissions([]);
    } finally {
      isLoadingRef.current = false;
      setLoading(false);
      // Don't clear fetching promise immediately if we want others to reuse it? 
      // Actually we should clear it so future calls can fetch again if needed (after cache expiry)
      // But for now, clearing it is fine because cache handles the hits.
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

  const hasPermission = useCallback((permission: string): boolean => {
    if (loading) {
      return false;
    }

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return false;
    }

    // Check for wildcard first
    if (permissions.includes("*")) {
      return true;
    }

    return permissions.includes(permission);
  }, [permissions, loading]);

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
    // Force reload (no cache to clear)
    if (projectId) {
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
