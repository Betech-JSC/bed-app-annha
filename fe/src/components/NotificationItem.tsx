import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Notification } from "@/api/notificationApi";

interface NotificationItemProps {
  notification: Notification;
  onPress?: (notification: Notification) => void;
  onMarkAsRead?: (notification: Notification) => void;
  onDelete?: (notification: Notification) => void;
}

export function NotificationItem({
  notification,
  onPress,
  onMarkAsRead,
  onDelete,
}: NotificationItemProps) {
  const isUnread = notification.status === "unread";

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "#EF4444";
      case "high":
        return "#F59E0B";
      case "medium":
        return "#3B82F6";
      case "low":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      project_performance: "Hiệu suất dự án",
      system: "Hệ thống",
      workflow: "Workflow",
      assignment: "Phân công",
      mention: "Đề cập",
      file_upload: "Tải file",
    };
    return labels[type] || type;
  };

  const priorityColor = getPriorityColor(notification.priority);

  return (
    <TouchableOpacity
      style={[styles.container, isUnread && styles.containerUnread]}
      onPress={() => onPress?.(notification)}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {isUnread && <View style={[styles.unreadDot, { backgroundColor: priorityColor }]} />}
            <Text style={styles.title} numberOfLines={1}>
              {notification.title || notification.message || "Thông báo"}
            </Text>
          </View>
          <View style={styles.actions}>
            {isUnread && onMarkAsRead && (
              <TouchableOpacity
                onPress={() => onMarkAsRead(notification)}
                style={styles.actionButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#3B82F6" />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(notification)}
                style={styles.actionButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.body} numberOfLines={2}>
          {notification.body || notification.message || ""}
        </Text>
        <View style={styles.footer}>
          <View style={styles.meta}>
            <Text style={styles.type}>{getTypeLabel(notification.type || "system")}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor + "20" }]}>
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {notification.priority === "urgent"
                  ? "Khẩn cấp"
                  : notification.priority === "high"
                  ? "Cao"
                  : notification.priority === "medium"
                  ? "Trung bình"
                  : "Thấp"}
              </Text>
            </View>
          </View>
          <Text style={styles.time}>
            {new Date(notification.created_at).toLocaleString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  containerUnread: {
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  body: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  type: {
    fontSize: 12,
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "600",
  },
  time: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});
