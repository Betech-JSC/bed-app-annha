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
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

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

  const toggleTask = (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "not_started":
        return "#6B7280";
      case "in_progress":
        return "#3B82F6";
      case "completed":
        return "#10B981";
      case "delayed":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  // Render task tree recursively - Tree folder style with parent-child aligned
  const renderTaskTree = (
    task: ProjectTask & { children: ProjectTask[] },
    level: number = 0
  ) => {
    const hasChildren = task.children && task.children.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const statusColor = getStatusColor(task.status || "not_started");
    const taskStages = acceptanceStages.filter(
      (stage: any) => stage.task_id === task.id
    );

    return (
      <View key={task.id} style={styles.treeTaskItem}>
        <TouchableOpacity
          style={[styles.treeTaskRow, { paddingLeft: 12 + level * 20 }]}
          onPress={() => handleTaskPress(task)}
          activeOpacity={0.7}
        >
          <View style={styles.treeTaskLeft}>
            {/* Expand/Collapse Icon */}
            {hasChildren ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  toggleTask(task.id);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.treeExpandButton}
              >
                <Ionicons
                  name={isExpanded ? "chevron-down" : "chevron-forward"}
                  size={18}
                  color="#6B7280"
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.treeExpandIconPlaceholder} />
            )}

            {/* Folder/File Icon */}
            <View style={styles.treeIconContainer}>
              <Ionicons
                name={hasChildren ? (isExpanded ? "folder-open" : "folder") : "document"}
                size={20}
                color={hasChildren ? "#3B82F6" : "#6B7280"}
              />
            </View>

            {/* Task Info */}
            <View style={styles.treeTaskInfo}>
              <View style={styles.treeTaskNameRow}>
                <Text style={styles.treeTaskName} numberOfLines={1}>
                  {task.name}
                </Text>
                {/* Acceptance badge */}
                {taskStages.length > 0 && (
                  <View style={styles.treeAcceptanceBadge}>
                    <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                    <Text style={styles.treeAcceptanceBadgeText}>
                      {taskStages.length}
                    </Text>
                  </View>
                )}
              </View>
              {/* Status indicator */}
              <View style={styles.treeTaskMeta}>
                <View style={[styles.treeStatusDot, { backgroundColor: statusColor }]} />
                <Text style={styles.treeTaskStatus}>
                  {task.status === "completed" ? "Hoàn thành" :
                    task.status === "in_progress" ? "Đang thực hiện" :
                      task.status === "delayed" ? "Trễ tiến độ" : "Chưa bắt đầu"}
                </Text>
              </View>
            </View>
          </View>

          {/* Progress */}
          <View style={styles.treeTaskRight}>
            <View style={styles.treeProgressContainer}>
              <View style={styles.treeProgressBar}>
                <View
                  style={[
                    styles.treeProgressFill,
                    {
                      width: `${task.progress_percentage || 0}%`,
                      backgroundColor: statusColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.treeProgressText}>
                {task.progress_percentage != null && typeof task.progress_percentage === 'number'
                  ? `${task.progress_percentage.toFixed(0)}%`
                  : '0%'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

        {/* Render children recursively - aligned directly below parent */}
        {hasChildren && isExpanded && (
          <View style={styles.treeChildrenContainer}>
            {task.children.map((child: ProjectTask & { children: ProjectTask[] }) =>
              renderTaskTree(child, level + 1)
            )}
          </View>
        )}
      </View>
    );
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
            {/* Tree folder view - parent and child aligned */}
            {taskHierarchy.rootTasks.length === 0 && tasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="folder-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Chưa có công việc</Text>
              </View>
            ) : (
              <View style={styles.treeContainer}>
                {taskHierarchy.rootTasks.map((rootTask) => renderTaskTree(rootTask, 0))}
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
    padding: 0,
  },
  treeContainer: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  treeTaskItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  treeTaskRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingRight: 16,
    backgroundColor: "#FFFFFF",
  },
  treeTaskLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  treeExpandButton: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  treeExpandIconPlaceholder: {
    width: 24,
  },
  treeIconContainer: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  treeTaskInfo: {
    flex: 1,
  },
  treeTaskNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  treeTaskName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  treeTaskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  treeStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  treeTaskStatus: {
    fontSize: 12,
    color: "#6B7280",
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
  treeTaskRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  treeProgressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 80,
  },
  treeProgressBar: {
    width: 60,
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  treeProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  treeProgressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
    minWidth: 35,
  },
  treeChildrenContainer: {
    backgroundColor: "#F9FAFB",
    borderLeftWidth: 2,
    borderLeftColor: "#E5E7EB",
  },
  treeAcceptanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "#10B98120",
    borderRadius: 10,
  },
  treeAcceptanceBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#10B981",
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

