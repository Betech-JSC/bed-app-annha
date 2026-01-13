import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { progressApi } from "@/api/progressApi";
import { ProgressChart, ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { ganttApi } from "@/api/ganttApi";
import { ProjectPhase, ProjectTask } from "@/types/ganttTypes";
import { constructionLogApi } from "@/api/constructionLogApi";
import { Ionicons } from "@expo/vector-icons";

interface PhaseWithProgress extends ProjectPhase {
  calculated_progress?: number;
  isDelayed?: boolean;
  lastUpdated?: string;
  needsUpdate?: boolean;
}

interface TaskWithAlerts extends ProjectTask {
  isDelayed?: boolean;
  lastUpdated?: string;
  needsUpdate?: boolean;
}

export default function ProgressScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const [progressData, setProgressData] = useState<any>(null);
  const [phases, setPhases] = useState<PhaseWithProgress[]>([]);
  const [tasks, setTasks] = useState<TaskWithAlerts[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"structure" | "report">("structure");
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadAllData();
  }, [id]);

  // Refresh data when screen comes into focus (e.g., after creating/updating logs)
  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [id])
  );

  const loadAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadProgress(),
        loadPhasesAndTasks(),
        loadLogs(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const response = await progressApi.getProgress(id!);
      if (response.success) {
        setProgressData(response.data);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  };

  const loadPhasesAndTasks = async () => {
    try {
      // First, ensure all progress is recalculated from logs
      // This ensures progress_percentage is always up-to-date
      try {
        await ganttApi.recalculateAllTasks(id!);
      } catch (error) {
        console.warn("Error recalculating tasks (non-critical):", error);
        // Continue even if recalculate fails
      }

      const [phasesResponse, tasksResponse] = await Promise.all([
        ganttApi.getPhases(id!),
        ganttApi.getTasks(id!),
      ]);

      // Parse phases data - handle different response structures
      let phasesData: any[] = [];
      if (phasesResponse) {
        if (phasesResponse.success && phasesResponse.data) {
          phasesData = Array.isArray(phasesResponse.data) ? phasesResponse.data : [];
        } else if (Array.isArray(phasesResponse)) {
          phasesData = phasesResponse;
        } else if (phasesResponse.data && Array.isArray(phasesResponse.data)) {
          phasesData = phasesResponse.data;
        }
      }
      console.log("Loaded phases:", phasesData.length, phasesData);
      setPhases(phasesData);

      // Parse tasks data - handle different response structures
      let tasksData: any[] = [];
      if (tasksResponse) {
        if (tasksResponse.success && tasksResponse.data) {
          tasksData = Array.isArray(tasksResponse.data) ? tasksResponse.data : [];
        } else if (Array.isArray(tasksResponse)) {
          tasksData = tasksResponse;
        } else if (tasksResponse.data && Array.isArray(tasksResponse.data)) {
          tasksData = tasksResponse.data;
        }
      }
      console.log("Loaded tasks:", tasksData.length, tasksData);
      setTasks(tasksData);
    } catch (error) {
      console.error("Error loading phases and tasks:", error);
    }
  };

  const loadLogs = async () => {
    try {
      const response = await constructionLogApi.getLogs(id!);
      if (response.success) {
        setLogs(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading logs:", error);
    }
  };

  // Tính % hoàn thành tự động cho phase từ tasks
  const calculatePhaseProgress = (phase: ProjectPhase): number => {
    const phaseTasks = tasks.filter(t => t.phase_id === phase.id);
    if (phaseTasks.length === 0) return 0;

    const totalProgress = phaseTasks.reduce((sum, task) => sum + (task.progress_percentage || 0), 0);
    return Math.round(totalProgress / phaseTasks.length);
  };

  // Kiểm tra trễ tiến độ
  const checkDelayed = (item: ProjectPhase | ProjectTask): boolean => {
    if (!item.end_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(item.end_date);
    endDate.setHours(0, 0, 0, 0);

    if (today > endDate) {
      // Nếu đã quá ngày kết thúc và chưa hoàn thành
      if ('status' in item && 'progress_percentage' in item) {
        return item.status !== 'completed' && ((item as ProjectTask).progress_percentage || 0) < 100;
      }
      return true;
    }
    return false;
  };

  // Kiểm tra chưa cập nhật theo ngày
  const checkNeedsUpdate = (item: ProjectPhase | ProjectTask): boolean => {
    // Tìm log gần nhất liên quan đến task này
    const relatedLogs = logs.filter(log => {
      if ('id' in item && log.task_id === item.id) {
        return true;
      }
      // Nếu là phase, kiểm tra tasks trong phase
      if ('phase_id' in item === false) {
        const phaseTasks = tasks.filter(t => t.phase_id === (item as ProjectPhase).id);
        return phaseTasks.some(t => log.task_id === t.id);
      }
      return false;
    });

    if (relatedLogs.length === 0) {
      // Chưa có log nào, cần cập nhật nếu đã bắt đầu
      if (item.start_date) {
        const startDate = new Date(item.start_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today >= startDate;
      }
      return false;
    }

    // Kiểm tra log gần nhất
    const latestLog = relatedLogs.sort((a, b) =>
      new Date(b.log_date).getTime() - new Date(a.log_date).getTime()
    )[0];

    const logDate = new Date(latestLog.log_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysSinceUpdate = Math.floor((today.getTime() - logDate.getTime()) / (1000 * 60 * 60 * 24));

    // Nếu đã quá 3 ngày chưa cập nhật và đang trong thời gian thi công
    return daysSinceUpdate > 3 && item.start_date && new Date(item.start_date) <= today;
  };

  // Phases với progress và alerts
  const phasesWithProgress = useMemo(() => {
    return phases.map(phase => {
      const calculatedProgress = calculatePhaseProgress(phase);
      const isDelayed = checkDelayed(phase);
      const needsUpdate = checkNeedsUpdate(phase);

      return {
        ...phase,
        calculated_progress: calculatedProgress,
        isDelayed,
        needsUpdate,
      };
    });
  }, [phases, tasks, logs]);

  // Tasks với alerts
  const tasksWithAlerts = useMemo(() => {
    return tasks.map(task => {
      const isDelayed = checkDelayed(task);
      const needsUpdate = checkNeedsUpdate(task);

      return {
        ...task,
        isDelayed,
        needsUpdate,
      };
    });
  }, [tasks, logs]);

  // Build task hierarchy for tree view
  const taskHierarchy = useMemo(() => {
    const taskMap = new Map<number, TaskWithAlerts & { children: TaskWithAlerts[] }>();
    const rootTasks: (TaskWithAlerts & { children: TaskWithAlerts[] })[] = [];

    // Initialize all tasks
    tasksWithAlerts.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });

    // Build hierarchy
    tasksWithAlerts.forEach(task => {
      const taskWithChildren = taskMap.get(task.id)!;
      const parentId = (task as any).parent_id;
      if (parentId && taskMap.has(parentId)) {
        const parent = taskMap.get(parentId)!;
        parent.children.push(taskWithChildren);
      } else {
        rootTasks.push(taskWithChildren);
      }
    });

    return { taskMap, rootTasks };
  }, [tasksWithAlerts]);

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

  // Get status label
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "not_started":
        return "Chưa bắt đầu";
      case "in_progress":
        return "Đang thực hiện";
      case "completed":
        return "Hoàn thành";
      case "delayed":
        return "Trễ tiến độ";
      default:
        return status;
    }
  };

  // Get priority config
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "urgent":
        return { color: "#DC2626", bg: "#DC262620", icon: "alert-circle" };
      case "high":
        return { color: "#F59E0B", bg: "#F59E0B20", icon: "warning" };
      case "medium":
        return { color: "#3B82F6", bg: "#3B82F620", icon: "information-circle" };
      case "low":
        return { color: "#10B981", bg: "#10B98120", icon: "checkmark-circle" };
      default:
        return { color: "#6B7280", bg: "#6B728020", icon: "ellipse" };
    }
  };

  // Render task tree recursively
  const renderTaskTree = (
    task: TaskWithAlerts & { children: TaskWithAlerts[] },
    level: number = 0
  ) => {
    const hasChildren = task.children && task.children.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const statusColor = getStatusColor(task.status || "not_started");
    const priorityConfig = getPriorityConfig(task.priority || "medium");

    return (
      <View key={task.id} style={styles.treeTaskItem}>
        <TouchableOpacity
          style={[styles.treeTaskRow, { paddingLeft: 12 + level * 24 }]}
          onPress={() => {
            // Navigate to task detail or open modal
            router.push({
              pathname: `/projects/${id}/construction-plan`,
              params: { taskId: task.id.toString() },
            });
          }}
        >
          <View style={styles.treeTaskLeft}>
            {hasChildren ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  toggleTask(task.id);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={isExpanded ? "chevron-down" : "chevron-forward"}
                  size={18}
                  color="#6B7280"
                  style={styles.treeExpandIcon}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.treeExpandIcon} />
            )}

            {/* Priority Badge */}
            <View style={[styles.treePriorityBadge, { backgroundColor: priorityConfig.bg }]}>
              <Ionicons name={priorityConfig.icon as any} size={14} color={priorityConfig.color} />
            </View>

            <View style={styles.treeTaskInfo}>
              <View style={styles.treeTaskNameRow}>
                <Text style={styles.treeTaskName} numberOfLines={1}>
                  {task.name}
                </Text>
                {/* Show acceptance stage badge if task has acceptance stages */}
                {(() => {
                  const taskStages = (task as any).acceptanceStages || [];
                  if (taskStages.length > 0) {
                    return (
                      <View style={styles.treeAcceptanceBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                        <Text style={styles.treeAcceptanceBadgeText}>
                          {taskStages.length}
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })()}
              </View>
              <View style={styles.treeTaskMeta}>
                <Text style={styles.treeTaskDates}>
                  {formatDate(task.start_date)} - {formatDate(task.end_date)}
                </Text>
                <View style={[styles.treeStatusBadge, { backgroundColor: statusColor + "20" }]}>
                  <Text style={[styles.treeStatusText, { color: statusColor }]}>
                    {getStatusLabel(task.status || "not_started")}
                  </Text>
                </View>
                {(task.isDelayed || task.needsUpdate) && (
                  <View style={styles.treeAlertBadges}>
                    {task.isDelayed && (
                      <View style={[styles.treeAlertBadge, { backgroundColor: "#EF444420" }]}>
                        <Ionicons name="warning" size={10} color="#EF4444" />
                      </View>
                    )}
                    {task.needsUpdate && (
                      <View style={[styles.treeAlertBadge, { backgroundColor: "#F59E0B20" }]}>
                        <Ionicons name="time" size={10} color="#F59E0B" />
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>

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
                {(task.progress_percentage != null && typeof task.progress_percentage === 'number'
                  ? task.progress_percentage.toFixed(0)
                  : 0)}%
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </View>
        </TouchableOpacity>

        {/* Render children recursively */}
        {hasChildren && isExpanded && (
          <View style={styles.treeChildrenContainer}>
            {task.children.map((child: TaskWithAlerts & { children: TaskWithAlerts[] }) =>
              renderTaskTree(child, level + 1)
            )}
          </View>
        )}
      </View>
    );
  };

  // Tổng hợp cảnh báo
  const warnings = useMemo(() => {
    const delayedPhases = phasesWithProgress.filter(p => p.isDelayed);
    const delayedTasks = tasksWithAlerts.filter(t => t.isDelayed);
    const needsUpdatePhases = phasesWithProgress.filter(p => p.needsUpdate);
    const needsUpdateTasks = tasksWithAlerts.filter(t => t.needsUpdate);

    return {
      delayed: [...delayedPhases, ...delayedTasks],
      needsUpdate: [...needsUpdatePhases, ...needsUpdateTasks],
    };
  }, [phasesWithProgress, tasksWithAlerts]);

  const togglePhase = (phaseId: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("vi-VN");
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
      <ScreenHeader
        title="Tiến Độ Thi Công"
        showBackButton
        rightComponent={
          <TouchableOpacity
            style={styles.createButtonHeader}
            onPress={() => router.push(`/projects/${id}/construction-plan`)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="add" size={24} color="#3B82F6" />
          </TouchableOpacity>
        }
      />

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === "structure" && styles.viewModeButtonActive]}
          onPress={() => setViewMode("structure")}
        >
          <Ionicons name="list-outline" size={20} color={viewMode === "structure" ? "#FFFFFF" : "#6B7280"} />
          <Text style={[styles.viewModeText, viewMode === "structure" && styles.viewModeTextActive]}>
            Cấu trúc tiến độ
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === "report" && styles.viewModeButtonActive]}
          onPress={() => setViewMode("report")}
        >
          <Ionicons name="bar-chart-outline" size={20} color={viewMode === "report" ? "#FFFFFF" : "#6B7280"} />
          <Text style={[styles.viewModeText, viewMode === "report" && styles.viewModeTextActive]}>
            Báo cáo tiến độ
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadAllData}
            colors={["#3B82F6"]}
            tintColor="#3B82F6"
          />
        }
      >
        {viewMode === "structure" ? (
          <>
            {/* Cảnh báo */}
            {(warnings.delayed.length > 0 || warnings.needsUpdate.length > 0) && (
              <View style={styles.warningsSection}>
                <Text style={styles.sectionTitle}>Cảnh báo</Text>

                {warnings.delayed.length > 0 && (
                  <View style={styles.warningCard}>
                    <View style={[styles.warningIcon, { backgroundColor: "#EF444420" }]}>
                      <Ionicons name="warning-outline" size={24} color="#EF4444" />
                    </View>
                    <View style={styles.warningContent}>
                      <Text style={[styles.warningTitle, { color: "#EF4444" }]}>
                        Trễ tiến độ ({warnings.delayed.length})
                      </Text>
                      <Text style={styles.warningText}>
                        {warnings.delayed.slice(0, 3).map((item: any) => item.name).join(", ")}
                        {warnings.delayed.length > 3 && ` và ${warnings.delayed.length - 3} hạng mục khác`}
                      </Text>
                    </View>
                  </View>
                )}

                {warnings.needsUpdate.length > 0 && (
                  <View style={styles.warningCard}>
                    <View style={[styles.warningIcon, { backgroundColor: "#F59E0B20" }]}>
                      <Ionicons name="time-outline" size={24} color="#F59E0B" />
                    </View>
                    <View style={styles.warningContent}>
                      <Text style={[styles.warningTitle, { color: "#F59E0B" }]}>
                        Chưa cập nhật theo ngày ({warnings.needsUpdate.length})
                      </Text>
                      <Text style={styles.warningText}>
                        {warnings.needsUpdate.slice(0, 3).map((item: any) => item.name).join(", ")}
                        {warnings.needsUpdate.length > 3 && ` và ${warnings.needsUpdate.length - 3} hạng mục khác`}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Tree View - Cấu trúc tiến độ phân cấp */}
            <View style={styles.structureSection}>
              <Text style={styles.sectionTitle}>Cấu trúc tiến độ</Text>

              {taskHierarchy.rootTasks.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="folder-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Chưa có hạng mục công việc</Text>
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => router.push(`/projects/${id}/construction-plan`)}
                  >
                    <Text style={styles.createButtonText}>Tạo kế hoạch thi công</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.treeContainer}>
                  {taskHierarchy.rootTasks.map((rootTask) => renderTaskTree(rootTask, 0))}
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            {/* Báo cáo tiến độ */}
            <View style={styles.reportSection}>
              <Text style={styles.sectionTitle}>Báo cáo tiến độ</Text>

              {progressData && progressData.progress ? (
                <>
                  <View style={styles.chartContainer}>
                    <ProgressChart
                      progress={progressData.progress}
                      logs={progressData.logs || []}
                      type="progress"
                    />
                  </View>

                  {progressData.logs && progressData.logs.length > 0 && (
                    <View style={styles.chartContainer}>
                      <ProgressChart
                        progress={progressData.progress}
                        logs={progressData.logs}
                        type="line"
                      />
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="bar-chart-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Chưa có dữ liệu tiến độ</Text>
                </View>
              )}

              {/* Tóm tắt cảnh báo */}
              {(warnings.delayed.length > 0 || warnings.needsUpdate.length > 0) && (
                <View style={styles.summarySection}>
                  <Text style={styles.summaryTitle}>Tóm tắt cảnh báo</Text>

                  <View style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <View style={[styles.summaryIcon, { backgroundColor: "#EF444420" }]}>
                        <Ionicons name="warning-outline" size={20} color="#EF4444" />
                      </View>
                      <View style={styles.summaryContent}>
                        <Text style={styles.summaryLabel}>Trễ tiến độ</Text>
                        <Text style={styles.summaryValue}>{warnings.delayed.length} hạng mục</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.summaryCard}>
                    <View style={[styles.summaryIcon, { backgroundColor: "#F59E0B20" }]}>
                      <Ionicons name="time-outline" size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.summaryContent}>
                      <Text style={styles.summaryLabel}>Chưa cập nhật</Text>
                      <Text style={styles.summaryValue}>{warnings.needsUpdate.length} hạng mục</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
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
  viewModeContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  viewModeButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  viewModeTextActive: {
    color: "#FFFFFF",
  },
  warningsSection: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  warningIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  structureSection: {
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  phaseCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  phaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  phaseHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  phaseInfo: {
    flex: 1,
  },
  phaseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  phaseName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  alertBadges: {
    flexDirection: "row",
    gap: 4,
  },
  alertBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  alertBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  alertBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  phaseDates: {
    marginTop: 4,
  },
  phaseDateText: {
    fontSize: 12,
    color: "#6B7280",
  },
  phaseProgressContainer: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 80,
  },
  progressBar: {
    width: 80,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  tasksContainer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  noTasksText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  taskDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  taskDateText: {
    fontSize: 12,
    color: "#6B7280",
  },
  taskProgressContainer: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 60,
  },
  taskProgressText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  reportSection: {
    padding: 16,
  },
  chartContainer: {
    marginBottom: 16,
  },
  summarySection: {
    marginTop: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  quickActions: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
  createButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  createButtonHeader: {
    padding: 8,
    marginRight: 8,
  },
  treeContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
  treeExpandIcon: {
    width: 24,
    alignItems: "center",
  },
  treePriorityBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  treeTaskInfo: {
    flex: 1,
  },
  treeTaskNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  treeTaskName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
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
  treeTaskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  treeTaskDates: {
    fontSize: 12,
    color: "#6B7280",
  },
  treeStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  treeStatusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  treeAlertBadges: {
    flexDirection: "row",
    gap: 4,
  },
  treeAlertBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
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
    marginLeft: 24,
  },
});
