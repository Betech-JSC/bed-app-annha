import { useState, useEffect, useCallback } from "react";
import { notificationApi } from "@/api/notificationApi";
import { useSelector } from "react-redux";
import { RootState } from "@/store";

interface UseUnreadCountOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

/**
 * Hook chỉ để lấy unread count - tối ưu hơn useNotifications khi chỉ cần số lượng
 */
export function useUnreadCount(options: UseUnreadCountOptions = {}) {
  const { autoRefresh = true, refreshInterval = 30000 } = options;

  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const token = useSelector((state: RootState) => state.user.token);

  const loadUnreadCount = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const response = await notificationApi.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.unread_count || 0);
      }
    } catch (err) {
      console.error("Error loading unread count:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Load on mount
  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount]);

  // Polling for unread count - chỉ bắt đầu sau lần load đầu tiên
  useEffect(() => {
    if (!autoRefresh) return;

    let intervalId: NodeJS.Timeout | null = null;

    // Delay polling để tránh gọi ngay lập tức sau mount
    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        loadUnreadCount();
      }, refreshInterval);
    }, refreshInterval);

    // Cleanup cả timeout và interval
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval, loadUnreadCount]);

  return {
    unreadCount,
    loading,
    refresh: loadUnreadCount,
  };
}
