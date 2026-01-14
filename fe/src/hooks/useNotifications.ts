import { useState, useEffect, useCallback, useMemo } from "react";
import { useFocusEffect } from "expo-router";
import { notificationApi, Notification, NotificationFilters } from "@/api/notificationApi";

interface UseNotificationsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  filters?: NotificationFilters;
  loadNotifications?: boolean; // Chỉ load unread count nếu false
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { autoRefresh = true, refreshInterval = 30000, filters = {} } = options;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationApi.getAll(filters);
      const data = response.data || [];
      setNotifications(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to load notifications");
      setError(error);
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters]);

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await notificationApi.getUnreadCount();
      if (response.success) {
        setUnreadCount(response.unread_count || 0);
      }
    } catch (err) {
      console.error("Error loading unread count:", err);
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
    loadUnreadCount();
  }, [loadNotifications, loadUnreadCount]);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, status: "read" as const, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error marking as read:", err);
      throw err;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, status: "read" as const, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
      throw err;
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: number) => {
    try {
      await notificationApi.delete(notificationId);
      const deleted = notifications.find((n) => n.id === notificationId);
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (deleted?.status === "unread") {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error deleting notification:", err);
      throw err;
    }
  }, [notifications]);

  // Load on mount - chỉ load nếu được yêu cầu
  useEffect(() => {
    if (shouldLoadNotifications) {
      loadNotifications();
    }
    loadUnreadCount();
  }, [shouldLoadNotifications, loadNotifications, loadUnreadCount]);

  // Auto refresh on focus - chỉ khi được yêu cầu
  useFocusEffect(
    useCallback(() => {
      if (shouldLoadNotifications) {
        refresh();
      } else {
        // Chỉ refresh unread count
        loadUnreadCount();
      }
    }, [shouldLoadNotifications, refresh, loadUnreadCount])
  );

  // Polling for unread count
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadUnreadCount();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
