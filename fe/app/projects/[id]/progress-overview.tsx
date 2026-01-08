import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ganttApi } from "@/api/ganttApi";
import { ProjectPhase, ProjectTask } from "@/types/ganttTypes";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Ionicons } from "@expo/vector-icons";

/**
 * Progress Overview Screen
 * 
 * BUSINESS RULES:
 * - READ-ONLY view - no editing allowed
 * - Displays all progress items with hierarchy
 * - Shows percentage, status, priority, and timeline
 * - Progress % is calculated from Daily Logs (displayed only)
 * - Status is system-calculated (displayed only)
 */
export default function ProgressOverviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const [phases, setPhases] = useState<ProjectPhase[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"day" | "week" | "month" | "year">("month");
  const timelineScrollRef = useRef<ScrollView>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

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
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const togglePhase = (phaseId: number) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
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

  // Build task hierarchy
  const taskHierarchy = useMemo(() => {
    const taskMap = new Map<number, ProjectTask & { children: ProjectTask[] }>();
    const rootTasks: (ProjectTask & { children: ProjectTask[] })[] = [];

    // Initialize all tasks
    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });

    // Build hierarchy
    tasks.forEach(task => {
      const taskWithChildren = taskMap.get(task.id)!;
      if (task.parent_id) {
        const parent = taskMap.get(task.parent_id);
        if (parent) {
          parent.children.push(taskWithChildren);
        } else {
          // Parent not found, treat as root
          rootTasks.push(taskWithChildren);
        }
      } else {
        // Root level task (no parent)
        rootTasks.push(taskWithChildren);
      }
    });

    return { taskMap, rootTasks };
  }, [tasks]);

  // Get tasks for a phase (including hierarchy)
  const getPhaseTasks = (phaseId: number) => {
    return taskHierarchy.rootTasks.filter(t => t.phase_id === phaseId);
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

  // Get priority color and icon
  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case "urgent":
        return { color: "#DC2626", bg: "#DC262620", icon: "alert-circle", label: "Khẩn cấp" };
      case "high":
        return { color: "#F59E0B", bg: "#F59E0B20", icon: "warning", label: "Cao" };
      case "medium":
        return { color: "#3B82F6", bg: "#3B82F620", icon: "information-circle", label: "Trung bình" };
      case "low":
        return { color: "#10B981", bg: "#10B98120", icon: "checkmark-circle", label: "Thấp" };
      default:
        return { color: "#6B7280", bg: "#6B728020", icon: "ellipse", label: priority };
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  // Timeline utilities
  const getTimelineRange = () => {
    const today = new Date();
    const allTasks = [...tasks, ...phases.map(p => ({ start_date: p.start_date, end_date: p.end_date }))];

    if (allTasks.length === 0) {
      return { start: today, end: today };
    }

    const dates = allTasks
      .filter(t => t.start_date || t.end_date)
      .flatMap(t => [
        t.start_date ? new Date(t.start_date) : null,
        t.end_date ? new Date(t.end_date) : null,
      ])
      .filter(d => d !== null) as Date[];

    if (dates.length === 0) {
      return { start: today, end: today };
    }

    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    // Extend range for better visualization
    minDate.setMonth(minDate.getMonth() - 1);
    maxDate.setMonth(maxDate.getMonth() + 1);

    return { start: minDate, end: maxDate };
  };

  // Generate timeline periods based on view mode
  const generateTimelinePeriods = () => {
    const { start, end } = getTimelineRange();
    const periods: Array<{ date: Date; label: string; key: string }> = [];
    const current = new Date(start);

    if (viewMode === "day") {
      // Day view: show 30 days
      const daysToShow = 30;
      for (let i = 0; i < daysToShow; i++) {
        const date = new Date(current);
        date.setDate(date.getDate() + i);
        periods.push({
          date,
          label: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
          key: date.toISOString().split("T")[0],
        });
      }
    } else if (viewMode === "week") {
      // Week view: show 12 weeks
      const weeksToShow = 12;
      for (let i = 0; i < weeksToShow; i++) {
        const weekStart = new Date(current);
        weekStart.setDate(weekStart.getDate() + i * 7);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        periods.push({
          date: weekStart,
          label: `${weekStart.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} - ${weekEnd.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`,
          key: `week-${i}`,
        });
      }
    } else if (viewMode === "month") {
      // Month view: show 12 months (full year)
      const monthsToShow = 12;
      for (let i = 0; i < monthsToShow; i++) {
        const date = new Date(current);
        date.setMonth(date.getMonth() + i);
        periods.push({
          date,
          label: date.toLocaleDateString("vi-VN", { month: "short", year: "numeric" }),
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        });
      }
    } else {
      // Year view: show 12 months horizontally (full year)
      const currentYear = new Date().getFullYear();
      const monthsToShow = 12;
      for (let i = 0; i < monthsToShow; i++) {
        const date = new Date(currentYear, i, 1);
        periods.push({
          date,
          label: date.toLocaleDateString("vi-VN", { month: "short" }),
          key: `${currentYear}-${String(i + 1).padStart(2, "0")}`,
        });
      }
    }

    return periods;
  };

  // Auto-scroll to current date/month
  useEffect(() => {
    if (timelineScrollRef.current && !loading) {
      const periods = generateTimelinePeriods();
      const today = new Date();
      let scrollIndex = 0;

      if (viewMode === "day") {
        scrollIndex = periods.findIndex(p =>
          p.date.toDateString() === today.toDateString()
        );
      } else if (viewMode === "week") {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        scrollIndex = periods.findIndex(p => {
          const pWeekStart = new Date(p.date);
          pWeekStart.setDate(pWeekStart.getDate() - pWeekStart.getDay());
          return pWeekStart.toDateString() === weekStart.toDateString();
        });
      } else if (viewMode === "month") {
        scrollIndex = periods.findIndex(p =>
          p.date.getMonth() === today.getMonth() &&
          p.date.getFullYear() === today.getFullYear()
        );
      } else {
        // Year view: scroll to current month
        scrollIndex = periods.findIndex(p =>
          p.date.getMonth() === today.getMonth()
        );
      }

      if (scrollIndex >= 0) {
        // Scroll to current period after a short delay
        setTimeout(() => {
          const cellWidth = viewMode === "day" ? 60 : viewMode === "week" ? 120 : viewMode === "month" ? 100 : 80;
          const scrollX = Math.max(0, scrollIndex * cellWidth - Dimensions.get("window").width / 2);
          timelineScrollRef.current?.scrollTo({ x: scrollX, animated: true });
        }, 100);
      }
    }
  }, [viewMode, loading, tasks.length, phases.length]);

  // Check if task overlaps with period
  const taskOverlapsPeriod = (task: ProjectTask, period: { date: Date; key: string }) => {
    if (!task.start_date && !task.end_date) return false;

    const taskStart = task.start_date ? new Date(task.start_date) : null;
    const taskEnd = task.end_date ? new Date(task.end_date) : null;

    if (viewMode === "day") {
      const periodDate = period.date.toDateString();
      return (
        (taskStart && taskStart.toDateString() === periodDate) ||
        (taskEnd && taskEnd.toDateString() === periodDate) ||
        (taskStart && taskEnd && taskStart <= period.date && taskEnd >= period.date)
      );
    } else if (viewMode === "week") {
      const weekStart = new Date(period.date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return (
        (taskStart && taskStart <= weekEnd && taskStart >= weekStart) ||
        (taskEnd && taskEnd >= weekStart && taskEnd <= weekEnd) ||
        (taskStart && taskEnd && taskStart <= weekStart && taskEnd >= weekEnd)
      );
    } else if (viewMode === "month") {
      const periodMonth = period.date.getMonth();
      const periodYear = period.date.getFullYear();
      return (
        (taskStart && taskStart.getMonth() === periodMonth && taskStart.getFullYear() === periodYear) ||
        (taskEnd && taskEnd.getMonth() === periodMonth && taskEnd.getFullYear() === periodYear) ||
        (taskStart && taskEnd &&
          taskStart <= new Date(periodYear, periodMonth + 1, 0) &&
          taskEnd >= new Date(periodYear, periodMonth, 1))
      );
    } else {
      // Year view: check if task overlaps with month
      const periodMonth = period.date.getMonth();
      const periodYear = period.date.getFullYear();
      return (
        (taskStart && taskStart.getMonth() === periodMonth && taskStart.getFullYear() === periodYear) ||
        (taskEnd && taskEnd.getMonth() === periodMonth && taskEnd.getFullYear() === periodYear) ||
        (taskStart && taskEnd &&
          taskStart <= new Date(periodYear, periodMonth + 1, 0) &&
          taskEnd >= new Date(periodYear, periodMonth, 1))
      );
    }
  };

  // Render task with hierarchy
  const renderTask = (task: ProjectTask & { children: ProjectTask[] }, level: number = 0) => {
    const hasChildren = task.children.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const priorityConfig = getPriorityConfig(task.priority || "medium");
    const statusColor = getStatusColor(task.status || "not_started");

    return (
      <View key={task.id} style={[styles.taskItem, { marginLeft: level * 20 }]}>
        <TouchableOpacity
          style={styles.taskRow}
          onPress={() => hasChildren && toggleTask(task.id)}
        >
          <View style={styles.taskLeft}>
            {hasChildren && (
              <Ionicons
                name={isExpanded ? "chevron-down" : "chevron-forward"}
                size={16}
                color="#6B7280"
                style={styles.expandIcon}
              />
            )}
            {!hasChildren && <View style={styles.expandIcon} />}

            {/* Priority Badge */}
            <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.bg }]}>
              <Ionicons name={priorityConfig.icon as any} size={14} color={priorityConfig.color} />
            </View>

            <View style={styles.taskInfo}>
              <Text style={styles.taskName}>{task.name}</Text>
              <View style={styles.taskMeta}>
                <Text style={styles.taskDates}>
                  {formatDate(task.start_date)} - {formatDate(task.end_date)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {getStatusLabel(task.status || "not_started")}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.taskRight}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${task.progress_percentage || 0}%`,
                      backgroundColor: statusColor,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {(task.progress_percentage != null && typeof task.progress_percentage === 'number'
                  ? task.progress_percentage.toFixed(0)
                  : 0)}%
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <View style={styles.childrenContainer}>
            {task.children.map((child: ProjectTask & { children: ProjectTask[] }) => renderTask(child, level + 1))}
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
      <ScreenHeader title="Tổng Quan Tiến Độ" showBackButton />

      {/* View Mode Selector */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === "day" && styles.viewModeButtonActive]}
          onPress={() => setViewMode("day")}
        >
          <Text style={[styles.viewModeText, viewMode === "day" && styles.viewModeTextActive]}>
            Ngày
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === "week" && styles.viewModeButtonActive]}
          onPress={() => setViewMode("week")}
        >
          <Text style={[styles.viewModeText, viewMode === "week" && styles.viewModeTextActive]}>
            Tuần
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === "month" && styles.viewModeButtonActive]}
          onPress={() => setViewMode("month")}
        >
          <Text style={[styles.viewModeText, viewMode === "month" && styles.viewModeTextActive]}>
            Tháng
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === "year" && styles.viewModeButtonActive]}
          onPress={() => setViewMode("year")}
        >
          <Text style={[styles.viewModeText, viewMode === "year" && styles.viewModeTextActive]}>
            Năm
          </Text>
        </TouchableOpacity>
      </View>

      {/* Timeline View */}
      {(
        <View style={styles.timelineContainer}>
          <ScrollView
            ref={timelineScrollRef}
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.timelineScroll}
            contentContainerStyle={styles.timelineContent}
          >
            {generateTimelinePeriods().map((period, index) => {
              const isToday = viewMode === "day"
                ? period.date.toDateString() === new Date().toDateString()
                : viewMode === "week"
                  ? (() => {
                    const today = new Date();
                    const weekStart = new Date(period.date);
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekEnd.getDate() + 6);
                    return today >= weekStart && today <= weekEnd;
                  })()
                  : viewMode === "month"
                    ? (period.date.getMonth() === new Date().getMonth() &&
                      period.date.getFullYear() === new Date().getFullYear())
                    : (period.date.getMonth() === new Date().getMonth());

              return (
                <View
                  key={period.key}
                  style={[
                    styles.timelineCell,
                    isToday && styles.timelineCellToday,
                    { width: viewMode === "day" ? 60 : viewMode === "week" ? 120 : viewMode === "month" ? 100 : 80 },
                  ]}
                >
                  <Text
                    style={[
                      styles.timelineLabel,
                      isToday && styles.timelineLabelToday,
                    ]}
                    numberOfLines={1}
                  >
                    {period.label}
                  </Text>
                  {/* Show tasks in this period */}
                  <View style={styles.timelineTasks}>
                    {tasks
                      .filter(task => taskOverlapsPeriod(task, period))
                      .slice(0, 3)
                      .map(task => (
                        <View
                          key={task.id}
                          style={[
                            styles.timelineTaskDot,
                            {
                              backgroundColor: getStatusColor(task.status || "not_started"),
                            },
                          ]}
                        />
                      ))}
                    {tasks.filter(task => taskOverlapsPeriod(task, period)).length > 3 && (
                      <Text style={styles.timelineTaskMore}>
                        +{tasks.filter(task => taskOverlapsPeriod(task, period)).length - 3}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: tabBarHeight }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {phases.length === 0 && taskHierarchy.rootTasks.length === 0 ? (
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
          <>
            {/* Phases */}
            {phases.map(phase => {
              const phaseTasks = getPhaseTasks(phase.id);
              const isExpanded = expandedPhases.has(phase.id);

              // Calculate phase progress from tasks
              const phaseProgress = phaseTasks.length > 0
                ? phaseTasks.reduce((sum, t) => sum + (t.progress_percentage || 0), 0) / phaseTasks.length
                : 0;

              return (
                <View key={phase.id} style={styles.phaseCard}>
                  <TouchableOpacity
                    style={styles.phaseHeader}
                    onPress={() => togglePhase(phase.id)}
                  >
                    <View style={styles.phaseLeft}>
                      <Ionicons
                        name={isExpanded ? "chevron-down" : "chevron-forward"}
                        size={20}
                        color="#6B7280"
                      />
                      <View style={styles.phaseInfo}>
                        <Text style={styles.phaseName}>{phase.name}</Text>
                        <Text style={styles.phaseDates}>
                          {formatDate(phase.start_date)} - {formatDate(phase.end_date)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.phaseProgressContainer}>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${phaseProgress}%`,
                              backgroundColor: "#3B82F6",
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {phaseProgress.toFixed(0)}%
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.tasksContainer}>
                      {phaseTasks.length === 0 ? (
                        <Text style={styles.noTasksText}>Chưa có công việc</Text>
                      ) : (
                        phaseTasks.map(task => renderTask(task, 0))
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Tasks without phase */}
            {taskHierarchy.rootTasks.filter(t => !t.phase_id).length > 0 && (
              <View style={styles.phaseCard}>
                <View style={styles.phaseHeader}>
                  <Text style={styles.phaseName}>Công việc không thuộc giai đoạn</Text>
                </View>
                <View style={styles.tasksContainer}>
                  {taskHierarchy.rootTasks
                    .filter(t => !t.phase_id)
                    .map(task => renderTask(task, 0))}
                </View>
              </View>
            )}
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
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
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
  content: {
    flex: 1,
    padding: 16,
  },
  phaseCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  phaseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  phaseLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  phaseInfo: {
    flex: 1,
  },
  phaseName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  phaseDates: {
    fontSize: 12,
    color: "#6B7280",
  },
  phaseProgressContainer: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 80,
  },
  tasksContainer: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  taskItem: {
    marginBottom: 8,
  },
  taskRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  taskLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expandIcon: {
    width: 16,
  },
  priorityBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  taskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  taskDates: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  taskRight: {
    alignItems: "flex-end",
    minWidth: 80,
  },
  progressContainer: {
    alignItems: "flex-end",
    gap: 4,
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
  childrenContainer: {
    marginTop: 4,
    marginLeft: 20,
  },
  noTasksText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
    textAlign: "center",
    padding: 16,
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
    marginBottom: 24,
  },
  createButton: {
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
  timelineContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 12,
  },
  timelineScroll: {
    maxHeight: 80,
  },
  timelineContent: {
    paddingHorizontal: 16,
  },
  timelineCell: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 60,
  },
  timelineCellToday: {
    backgroundColor: "#3B82F620",
    borderColor: "#3B82F6",
    borderWidth: 2,
  },
  timelineLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 4,
  },
  timelineLabelToday: {
    color: "#3B82F6",
    fontWeight: "700",
  },
  timelineTasks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  timelineTaskDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timelineTaskMore: {
    fontSize: 8,
    color: "#6B7280",
    fontWeight: "600",
  },
});

