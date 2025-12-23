import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ProjectTask, TaskStatus, TaskPriority } from "@/types/ganttTypes";
import { Ionicons } from "@expo/vector-icons";

interface GanttTaskBarProps {
  task: ProjectTask;
  left: number;
  width: number;
  top: number;
  height: number;
  onPress?: () => void;
}

const getStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case "completed":
      return "#10B981";
    case "in_progress":
      return "#3B82F6";
    case "on_hold":
      return "#F59E0B";
    case "cancelled":
      return "#EF4444";
    default:
      return "#6B7280";
  }
};

const getPriorityColor = (priority: TaskPriority): string => {
  switch (priority) {
    case "urgent":
      return "#DC2626";
    case "high":
      return "#F59E0B";
    case "medium":
      return "#3B82F6";
    default:
      return "#6B7280";
  }
};

export default function GanttTaskBar({
  task,
  left,
  width,
  top,
  height,
  onPress,
}: GanttTaskBarProps) {
  const statusColor = getStatusColor(task.status);
  const priorityColor = getPriorityColor(task.priority);
  const progressWidth = (task.progress_percentage / 100) * width;

  return (
    <TouchableOpacity
      style={[
        styles.taskBar,
        {
          left,
          width,
          top,
          height,
          backgroundColor: statusColor + "40",
          borderColor: statusColor,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Progress indicator */}
      {task.progress_percentage > 0 && (
        <View
          style={[
            styles.progressBar,
            {
              width: progressWidth,
              backgroundColor: statusColor + "80",
            },
          ]}
        />
      )}

      {/* Task name */}
      <Text style={styles.taskName} numberOfLines={1}>
        {task.name}
      </Text>

      {/* Priority indicator */}
      {task.priority === "urgent" || task.priority === "high" ? (
        <View
          style={[
            styles.priorityIndicator,
            { backgroundColor: priorityColor },
          ]}
        />
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  taskBar: {
    position: "absolute",
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 2,
    justifyContent: "center",
    minWidth: 60,
  },
  progressBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  taskName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F2937",
    zIndex: 1,
  },
  priorityIndicator: {
    position: "absolute",
    right: 4,
    top: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

