import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Project } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
}

export default function ProjectCard({ project, onPress }: ProjectCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
        return "#10B981";
      case "completed":
        return "#3B82F6";
      case "cancelled":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "planning":
        return "Lập kế hoạch";
      case "in_progress":
        return "Đang thi công";
      case "completed":
        return "Hoàn thành";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.name}>{project.name}</Text>
          <Text style={styles.code}>{project.code}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(project.status) + "20" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(project.status) },
            ]}
          >
            {getStatusText(project.status)}
          </Text>
        </View>
      </View>
      {project.description && (
        <Text style={styles.description} numberOfLines={2}>
          {project.description}
        </Text>
      )}
      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.footerText}>
            {project.start_date
              ? new Date(project.start_date).toLocaleDateString("vi-VN")
              : "Chưa có"}
          </Text>
        </View>
        {project.progress && (
          <View style={styles.footerItem}>
            <Ionicons name="trending-up-outline" size={16} color="#6B7280" />
            <Text style={styles.footerText}>
              {project.progress.overall_percentage}%
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  code: {
    fontSize: 14,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: "#6B7280",
  },
});
