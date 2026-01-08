import React, { useState, useEffect, useMemo } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ganttApi } from "@/api/ganttApi";
import { acceptanceApi } from "@/api/acceptanceApi";
import { ProjectTask, CreateTaskData } from "@/types/ganttTypes";
import { GanttChart } from "@/components";
import TaskFormModal from "@/components/TaskFormModal";
import { PermissionGuard } from "@/components/PermissionGuard";

export default function ConstructionPlanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, taskId } = useLocalSearchParams<{ id: string; taskId?: string }>();
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [acceptanceStages, setAcceptanceStages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
  const [viewMode, setViewMode] = useState<"gantt" | "list">("gantt");

  useEffect(() => {
    loadData();
  }, [id]);

  // Auto-open task modal if taskId is provided
  useEffect(() => {
    if (taskId && tasks.length > 0) {
      const task = tasks.find(t => t.id.toString() === taskId);
      if (task) {
        setSelectedTask(task);
        setShowTaskModal(true);
      }
    }
  }, [taskId, tasks]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksResponse, stagesResponse] = await Promise.all([
        ganttApi.getTasks(id!),
        acceptanceApi.getStages(id!).catch(() => ({ success: false, data: [] })), // Load acceptance stages
      ]);

      if (tasksResponse.success) {
        setTasks(tasksResponse.data || []);
      }
      if (stagesResponse.success) {
        setAcceptanceStages(stagesResponse.data || []);
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

  // Build task hierarchy - parent tasks act as "phases"
  const taskHierarchy = useMemo(() => {
    const taskMap = new Map<number, ProjectTask & { children: ProjectTask[] }>();
    const rootTasks: (ProjectTask & { children: ProjectTask[] })[] = [];

    // Initialize all tasks
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });

    // Build hierarchy
    tasks.forEach(task => {
      const parentId = (task as any).parent_id;
      if (parentId && taskMap.has(parentId)) {
        const parent = taskMap.get(parentId)!;
        parent.children.push(taskMap.get(task.id)!);
      } else {
        rootTasks.push(taskMap.get(task.id)!);
      }
    });

    return { taskMap, rootTasks };
  }, [tasks]);

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

  const handleTaskPress = async (task: ProjectTask) => {
    // Load full task detail with acceptance stages
    try {
      const taskResponse = await ganttApi.getTask(id!, task.id);
      if (taskResponse.success && taskResponse.data) {
        setSelectedTask(taskResponse.data);
        setShowTaskModal(true);
      } else {
        // Fallback to task from list if detail load fails
        setSelectedTask(task);
        setShowTaskModal(true);
      }
    } catch (error) {
      console.error("Error loading task detail:", error);
      // Fallback to task from list if detail load fails
      setSelectedTask(task);
      setShowTaskModal(true);
    }
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
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kế hoạch thi công</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => setViewMode(viewMode === "gantt" ? "list" : "gantt")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={viewMode === "gantt" ? "list" : "calendar"}
              size={24}
              color="#3B82F6"
            />
          </TouchableOpacity>
          <PermissionGuard permission="projects.update">
            <TouchableOpacity
              style={styles.createButtonHeader}
              onPress={() => {
                setSelectedTask(null);
                setShowTaskModal(true);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="add" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </PermissionGuard>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {viewMode === "gantt" ? (
          <GanttChart
            tasks={tasks}
            onTaskPress={handleTaskPress}
          />
        ) : (
          <View style={styles.listView}>
            {/* Render parent tasks as "phases" */}
            {taskHierarchy.rootTasks.map((parentTask) => {
              const childTasks = parentTask.children || [];
              const taskStages = acceptanceStages.filter(
                (stage: any) => stage.task_id === parentTask.id
              );

              return (
                <View key={parentTask.id} style={styles.phaseCard}>
                  <View style={styles.phaseCardHeader}>
                    <Text style={styles.phaseCardTitle}>{parentTask.name}</Text>
                    <View style={styles.phaseCardActions}>
                      <PermissionGuard permission="projects.update">
                        <TouchableOpacity
                          onPress={() => handleTaskPress(parentTask)}
                        >
                          <Ionicons name="create-outline" size={20} color="#3B82F6" />
                        </TouchableOpacity>
                      </PermissionGuard>
                    </View>
                  </View>
                  {parentTask.description && (
                    <Text style={styles.phaseCardDescription}>{parentTask.description}</Text>
                  )}
                  {/* Show acceptance stages linked to this parent task */}
                  {taskStages.length > 0 && (
                    <View style={styles.acceptanceInfo}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#3B82F6" />
                      <Text style={styles.acceptanceInfoText}>
                        {taskStages.length} giai đoạn nghiệm thu
                      </Text>
                    </View>
                  )}
                  <View style={styles.tasksList}>
                    {childTasks.length > 0 ? (
                      childTasks.map((task) => (
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
                            <View style={styles.taskCardInfo}>
                              <Text style={styles.taskCardName}>{task.name}</Text>
                            </View>
                            {/* Show acceptance stage badge if task has acceptance stages */}
                            {(() => {
                              const childTaskStages = acceptanceStages.filter(
                                (stage: any) => stage.task_id === task.id
                              );
                              if (childTaskStages.length > 0) {
                                return (
                                  <View style={styles.acceptanceBadge}>
                                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                                    <Text style={styles.acceptanceBadgeText}>
                                      {childTaskStages.length}
                                    </Text>
                                  </View>
                                );
                              }
                              return null;
                            })()}
                          </View>
                          <Text style={styles.taskCardProgress}>
                            {task.progress_percentage != null && typeof task.progress_percentage === 'number'
                              ? `${task.progress_percentage}%`
                              : '0%'}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.emptyTasksContainer}>
                        <Text style={styles.emptyTasksText}>Chưa có công việc con</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
            {taskHierarchy.rootTasks.length === 0 && tasks.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Chưa có công việc</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <TaskFormModal
        visible={showTaskModal}
        task={selectedTask}
        tasks={tasks}
        projectId={id}
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
    gap: 12,
    alignItems: "center",
  },
  viewModeButton: {
    padding: 4,
  },
  createButtonHeader: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
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
  taskCardInfo: {
    flex: 1,
  },
  taskCardName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  taskPhaseName: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  taskPhaseWarning: {
    fontSize: 11,
    color: "#F59E0B",
    marginTop: 2,
    fontStyle: "italic",
  },
  phaseCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  emptyTasksContainer: {
    padding: 16,
    alignItems: "center",
  },
  emptyTasksText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
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
  acceptanceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
    marginBottom: 12,
  },
  acceptanceInfoText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#3B82F6",
  },
  acceptanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#10B98120",
    borderRadius: 10,
  },
  acceptanceBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#10B981",
  },
});

