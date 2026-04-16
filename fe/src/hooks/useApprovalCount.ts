import { useState, useEffect, useCallback } from "react";
import { approvalCenterApi } from "@/api/approvalCenterApi";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface UseApprovalCountOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Hook lấy tổng số item đang chờ duyệt trong Approval Center.
 * Dùng để hiển thị badge trên tab bar.
 */
export function useApprovalCount(options: UseApprovalCountOptions = {}) {
  const { autoRefresh = true, refreshInterval = 60000 } = options;

  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const token = useSelector((state: RootState) => state.user.token);

  const loadPendingCount = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await approvalCenterApi.getApprovals();
      if (response.success && response.data?.stats) {
        setPendingCount(response.data.stats.pending_total || 0);
      }
    } catch {
      // Ignore errors (e.g. 403 permission denied — user has no approval role)
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPendingCount();
  }, [loadPendingCount]);

  useEffect(() => {
    if (!autoRefresh) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(loadPendingCount, refreshInterval);
    }, refreshInterval);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval, loadPendingCount]);

  return { pendingCount, loading, refresh: loadPendingCount };
}
