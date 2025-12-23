import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ProjectPhase, ProjectTask } from "@/types/ganttTypes";
import { Ionicons } from "@expo/vector-icons";

interface PhaseSectionProps {
  phase: ProjectPhase;
  tasks: ProjectTask[];
  onTaskPress?: (task: ProjectTask) => void;
  onPhasePress?: (phase: ProjectPhase) => void;
}

export default function PhaseSection({
  phase,
  tasks,
  onTaskPress,
  onPhasePress,
}: PhaseSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "completed":
        return "#10B981";
      case "in_progress":
        return "#3B82F6";
      case "cancelled":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const phaseTasks = tasks.filter((task) => task.phase_id === phase.id);
  const progress =
    phaseTasks.length > 0
      ? phaseTasks.reduce((sum, task) => sum + task.progress_percentage, 0) /
        phaseTasks.length
      : 0;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setCollapsed(!collapsed)}
      >
        <View style={styles.headerLeft}>
          <Ionicons
            name={collapsed ? "chevron-forward" : "chevron-down"}
            size={20}
            color="#6B7280"
          />
          <View
            style={[
              styles.statusDot,
              { backgroundColor: getStatusColor(phase.status) },
            ]}
          />
          <Text style={styles.phaseName}>{phase.name}</Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.taskCount}>{phaseTasks.length} công việc</Text>
          <Text style={styles.progressText}>{progress.toFixed(0)}%</Text>
        </View>
      </TouchableOpacity>

      {!collapsed && (
        <View style={styles.content}>
          {phase.description && (
            <Text style={styles.description}>{phase.description}</Text>
          )}
          {phase.start_date && phase.end_date && (
            <Text style={styles.dates}>
              {new Date(phase.start_date).toLocaleDateString("vi-VN")} -{" "}
              {new Date(phase.end_date).toLocaleDateString("vi-VN")}
            </Text>
          )}
          {phaseTasks.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có công việc</Text>
          ) : (
            <View style={styles.tasksList}>
              {phaseTasks.map((task) => (
                <TouchableOpacity
                  key={task.id}
                  style={styles.taskItem}
                  onPress={() => onTaskPress?.(task)}
                >
                  <View style={styles.taskItemLeft}>
                    <View
                      style={[
                        styles.taskStatusDot,
                        {
                          backgroundColor: getStatusColor(task.status),
                        },
                      ]}
                    />
                    <Text style={styles.taskName}>{task.name}</Text>
                  </View>
                  <Text style={styles.taskProgress}>
                    {task.progress_percentage}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginRight: 8,
  },
  phaseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskCount: {
    fontSize: 12,
    color: "#6B7280",
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
  },
  content: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  dates: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
    textAlign: "center",
    padding: 16,
  },
  tasksList: {
    gap: 8,
  },
  taskItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 6,
  },
  taskItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  taskName: {
    fontSize: 14,
    color: "#1F2937",
    flex: 1,
  },
  taskProgress: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
  },
});

