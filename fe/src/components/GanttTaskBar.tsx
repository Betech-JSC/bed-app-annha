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
  phaseColor?: string;
  showTriangle?: boolean;
}

const getStatusColor = (status: TaskStatus): string => {
  switch (status) {
    case "completed":
      return "#10B981";
    case "in_progress":
      return "#3B82F6";
    case "delayed":
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
  phaseColor,
  showTriangle = false,
}: GanttTaskBarProps) {
  const statusColor = phaseColor || getStatusColor(task.status);
  const priorityColor = getPriorityColor(task.priority);
  const progressPercentage = task.progress_percentage != null && typeof task.progress_percentage === 'number' 
    ? task.progress_percentage 
    : 0;
  const progressWidth = (progressPercentage / 100) * width;

  const hasChildren = (task as any).children && (task as any).children.length > 0;

  return (
    <TouchableOpacity
      style={[
        styles.taskBar,
        {
          left,
          width,
          top,
          height,
          backgroundColor: statusColor + "30",
          borderColor: statusColor,
          borderWidth: 1.5,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Progress indicator */}
      {progressPercentage > 0 && (
        <View
          style={[
            styles.progressBar,
            {
              width: progressWidth,
              backgroundColor: statusColor,
            },
          ]}
        />
      )}

      {/* Triangle indicator at start */}
      {showTriangle && (
        <View style={[styles.triangleIndicator, { borderLeftColor: statusColor }]} />
      )}
      
      {/* Task name */}
      <View style={styles.taskNameContainer}>
        {hasChildren && (
          <Ionicons
            name="layers"
            size={12}
            color={statusColor}
            style={styles.hierarchyIcon}
          />
        )}
      <Text style={styles.taskName} numberOfLines={1}>
        {task.name}
      </Text>
      </View>

      {/* Priority indicator */}
      {(task.priority === "urgent" || task.priority === "high") && (
        <View
          style={[
            styles.priorityIndicator,
            { backgroundColor: priorityColor },
          ]}
        />
      )}

      {/* Progress percentage */}
      {width > 80 && (
        <Text style={styles.progressText}>
          {progressPercentage.toFixed(0)}%
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  taskBar: {
    position: "absolute",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: "center",
    minWidth: 80,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  progressBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 6,
    opacity: 0.6,
  },
  taskNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    zIndex: 1,
  },
  hierarchyIcon: {
    marginRight: 2,
  },
  taskName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  priorityIndicator: {
    position: "absolute",
    right: 4,
    top: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
  progressText: {
    position: "absolute",
    right: 4,
    bottom: 2,
    fontSize: 9,
    fontWeight: "700",
    color: "#1F2937",
    zIndex: 2,
  },
  triangleIndicator: {
    position: "absolute",
    left: -8,
    top: "50%",
    marginTop: -6,
    width: 0,
    height: 0,
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderRightWidth: 8,
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    borderLeftWidth: 0,
    zIndex: 3,
  },
});

