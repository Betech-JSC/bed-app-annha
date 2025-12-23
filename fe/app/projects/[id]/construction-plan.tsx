import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ganttApi } from "@/api/ganttApi";
import { ProjectPhase, ProjectTask, CreatePhaseData, CreateTaskData } from "@/types/ganttTypes";
import { GanttChart } from "@/components";
import TaskFormModal from "@/components/TaskFormModal";
import PhaseFormModal from "@/components/PhaseFormModal";
import { PermissionGuard } from "@/components/PermissionGuard";

export default function ConstructionPlanScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedPhase, setSelectedPhase] = useState<ProjectPhase | null>(null);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [viewMode, setViewMode] = useState<"gantt" | "list">("gantt");

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [phasesResponse, tasksResponse] = await Promise.all([
        ganttApi.getPhases(id!),
        ganttApi.getTasks(id!),
      ]);

      if (phasesResponse.success) {
        setPhases(phasesResponse.data || []);
      }
      if (tasksResponse.success) {
        setTasks(tasksResponse.data || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreatePhase = async (data: CreatePhaseData) => {
    const response = await ganttApi.createPhase(id!, data);
    if (response.success) {
      await loadData();
    } else {
      throw new Error(response.message || "Không thể tạo giai đoạn");
    }
  };

  const handleUpdatePhase = async (data: CreatePhaseData) => {
    if (!selectedPhase) return;
    const response = await ganttApi.updatePhase(id!, selectedPhase.id, data);
    if (response.success) {
      await loadData();
    } else {
      throw new Error(response.message || "Không thể cập nhật giai đoạn");
    }
  };

  const handleDeletePhase = async (phaseId: number) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa giai đoạn này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await ganttApi.deletePhase(id!, phaseId);
              if (response.success) {
                await loadData();
              } else {
                Alert.alert("Lỗi", response.message || "Không thể xóa giai đoạn");
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa giai đoạn");
            }
          },
        },
      ]
    );
  };

  const handleCreateTask = async (data: CreateTaskData) => {
    const response = await ganttApi.createTask(id!, data);
    if (response.success) {
      await loadData();
    } else {
      throw new Error(response.message || "Không thể tạo công việc");
    }
  };

  const handleUpdateTask = async (data: CreateTaskData) => {
    if (!selectedTask) return;
    const response = await ganttApi.updateTask(id!, selectedTask.id, data);
    if (response.success) {
      await loadData();
    } else {
      throw new Error(response.message || "Không thể cập nhật công việc");
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa công việc này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await ganttApi.deleteTask(id!, taskId);
              if (response.success) {
                await loadData();
              } else {
                Alert.alert("Lỗi", response.message || "Không thể xóa công việc");
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa công việc");
            }
          },
        },
      ]
    );
  };

  const handleTaskPress = (task: ProjectTask) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handlePhasePress = (phase: ProjectPhase) => {
    setSelectedPhase(phase);
    setShowPhaseModal(true);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kế hoạch thi công</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => setViewMode(viewMode === "gantt" ? "list" : "gantt")}
          >
            <Ionicons
              name={viewMode === "gantt" ? "list" : "calendar"}
              size={24}
              color="#3B82F6"
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {viewMode === "gantt" ? (
          <GanttChart
            phases={phases}
            tasks={tasks}
            onTaskPress={handleTaskPress}
            onPhasePress={handlePhasePress}
          />
        ) : (
          <View style={styles.listView}>
            {phases.map((phase) => {
              const phaseTasks = tasks.filter((t) => t.phase_id === phase.id);
              return (
                <View key={phase.id} style={styles.phaseCard}>
                  <View style={styles.phaseCardHeader}>
                    <Text style={styles.phaseCardTitle}>{phase.name}</Text>
                    <View style={styles.phaseCardActions}>
                      <PermissionGuard permission="projects.update">
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedPhase(phase);
                            setShowPhaseModal(true);
                          }}
                        >
                          <Ionicons name="create-outline" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDeletePhase(phase.id)}
                        >
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </PermissionGuard>
                    </View>
                  </View>
                  {phase.description && (
                    <Text style={styles.phaseCardDescription}>{phase.description}</Text>
                  )}
                  <View style={styles.tasksList}>
                    {phaseTasks.map((task) => (
                      <TouchableOpacity
                        key={task.id}
                        style={styles.taskCard}
                        onPress={() => handleTaskPress(task)}
                      >
                        <View style={styles.taskCardLeft}>
                          <View
                            style={[
                              styles.taskStatusDot,
                              {
                                backgroundColor:
                                  task.status === "completed"
                                    ? "#10B981"
                                    : task.status === "in_progress"
                                      ? "#3B82F6"
                                      : "#6B7280",
                              },
                            ]}
                          />
                          <Text style={styles.taskCardName}>{task.name}</Text>
                        </View>
                        <Text style={styles.taskCardProgress}>
                          {task.progress_percentage}%
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
            {phases.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Chưa có giai đoạn</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.fabContainer}>
        <PermissionGuard permission="projects.update">
          <TouchableOpacity
            style={[styles.fab, styles.fabSecondary]}
            onPress={() => {
              setSelectedTask(null);
              setShowTaskModal(true);
            }}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              setSelectedPhase(null);
              setShowPhaseModal(true);
            }}
          >
            <Ionicons name="layers" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </PermissionGuard>
      </View>

      {/* Modals */}
      <PhaseFormModal
        visible={showPhaseModal}
        phase={selectedPhase}
        onClose={() => {
          setShowPhaseModal(false);
          setSelectedPhase(null);
        }}
        onSubmit={selectedPhase ? handleUpdatePhase : handleCreatePhase}
      />

      <TaskFormModal
        visible={showTaskModal}
        task={selectedTask}
        phases={phases}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedTask(null);
        }}
        onSubmit={selectedTask ? handleUpdateTask : handleCreateTask}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  viewModeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  listView: {
    padding: 16,
  },
  phaseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  phaseCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  phaseCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  phaseCardActions: {
    flexDirection: "row",
    gap: 12,
  },
  phaseCardDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
  },
  tasksList: {
    gap: 8,
  },
  taskCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  taskCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  taskStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  taskCardName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    flex: 1,
  },
  taskCardProgress: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3B82F6",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#9CA3AF",
  },
  fabContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabSecondary: {
    backgroundColor: "#10B981",
  },
});

