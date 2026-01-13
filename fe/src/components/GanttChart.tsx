import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { ProjectTask } from "@/types/ganttTypes";
import GanttTaskBar from "./GanttTaskBar";
import { Ionicons } from "@expo/vector-icons";

interface GanttChartProps {
  tasks: ProjectTask[]; // Parent tasks act as "phases"
  onTaskPress?: (task: ProjectTask) => void;
  projectName?: string;
  projectStartDate?: string;
}

type ViewMode = "day" | "week" | "month";

const screenWidth = Dimensions.get("window").width;
const DAY_WIDTH = 50;
const WEEK_WIDTH = 280;
const MONTH_WIDTH = 1200;
const ROW_HEIGHT = 56;
const HEADER_HEIGHT = 80;
const TASK_NAME_WIDTH = 300;

export default function GanttChart({
  tasks,
  onTaskPress,
  projectName,
  projectStartDate,
}: GanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const horizontalScrollRef = useRef<ScrollView>(null);
  const verticalScrollRef = useRef<ScrollView>(null);
  const [expandedTasks, setExpandedTasks] = useState<Set<number>>(new Set());

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

  // Calculate date range
  const dateRange = useMemo(() => {
    const allDates: Date[] = [];

    // Get dates from tasks only
    tasks.forEach((task) => {
      if (task.start_date) allDates.push(new Date(task.start_date));
      if (task.end_date) allDates.push(new Date(task.end_date));
    });

    if (allDates.length === 0) {
      const today = new Date();
      return {
        start: new Date(today.getFullYear(), today.getMonth(), 1),
        end: new Date(today.getFullYear(), today.getMonth() + 3, 0),
      };
    }

    const sortedDates = allDates.sort((a, b) => a.getTime() - b.getTime());
    return {
      start: sortedDates[0],
      end: sortedDates[sortedDates.length - 1],
    };
  }, [tasks]);

  // Generate timeline dates
  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const current = new Date(start);

    while (current <= end) {
      dates.push(new Date(current));
      if (viewMode === "day") {
        current.setDate(current.getDate() + 1);
      } else if (viewMode === "week") {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }

    return dates;
  }, [dateRange, viewMode]);

  // Group weeks by month for better visualization
  const monthGroups = useMemo(() => {
    if (viewMode !== "week") return [];

    const groups: Array<{ month: number; year: number; startIndex: number; endIndex: number; weeks: Date[] }> = [];
    let currentMonth = -1;
    let currentYear = -1;
    let groupStart = 0;

    timelineDates.forEach((date, index) => {
      const month = date.getMonth();
      const year = date.getFullYear();

      if (month !== currentMonth || year !== currentYear) {
        if (currentMonth !== -1) {
          groups.push({
            month: currentMonth,
            year: currentYear,
            startIndex: groupStart,
            endIndex: index - 1,
            weeks: timelineDates.slice(groupStart, index),
          });
        }
        currentMonth = month;
        currentYear = year;
        groupStart = index;
      }
    });

    // Add last group
    if (currentMonth !== -1) {
      groups.push({
        month: currentMonth,
        year: currentYear,
        startIndex: groupStart,
        endIndex: timelineDates.length - 1,
        weeks: timelineDates.slice(groupStart),
      });
    }

    return groups;
  }, [timelineDates, viewMode]);

  // Calculate task position
  const getTaskPosition = (task: ProjectTask) => {
    if (!task.start_date || !task.end_date) return null;

    const startDate = new Date(task.start_date);
    const endDate = new Date(task.end_date);

    let left = 0;
    let width = 0;

    if (viewMode === "day") {
      const daysDiff = Math.floor(
        (startDate.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24)
      );
      const duration = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      left = daysDiff * DAY_WIDTH;
      width = Math.max(duration * DAY_WIDTH, 60);
    } else if (viewMode === "week") {
      const weeksDiff = Math.floor(
        (startDate.getTime() - dateRange.start.getTime()) /
        (1000 * 60 * 60 * 24 * 7)
      );
      const duration = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
      );
      left = weeksDiff * WEEK_WIDTH;
      width = Math.max(duration * WEEK_WIDTH, 100);
    } else {
      const monthsDiff =
        (startDate.getFullYear() - dateRange.start.getFullYear()) * 12 +
        (startDate.getMonth() - dateRange.start.getMonth());
      const duration =
        (endDate.getFullYear() - startDate.getFullYear()) * 12 +
        (endDate.getMonth() - startDate.getMonth()) +
        1;
      left = monthsDiff * MONTH_WIDTH;
      width = Math.max(duration * MONTH_WIDTH, 200);
    }

    return { left, width };
  };

  // Auto-scroll to current date
  useEffect(() => {
    if (horizontalScrollRef.current && timelineDates.length > 0) {
      const today = new Date();
      let scrollIndex = -1;

      if (viewMode === "day") {
        scrollIndex = timelineDates.findIndex(
          d => d.toDateString() === today.toDateString()
        );
      } else if (viewMode === "week") {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        scrollIndex = timelineDates.findIndex(d => {
          const dWeekStart = new Date(d);
          dWeekStart.setDate(dWeekStart.getDate() - dWeekStart.getDay());
          return dWeekStart.toDateString() === weekStart.toDateString();
        });
      } else {
        scrollIndex = timelineDates.findIndex(
          d => d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
        );
      }

      if (scrollIndex >= 0) {
        setTimeout(() => {
          const cellWidth = viewMode === "day" ? DAY_WIDTH : viewMode === "week" ? WEEK_WIDTH : MONTH_WIDTH;
          const scrollX = Math.max(0, scrollIndex * cellWidth - screenWidth / 2);
          horizontalScrollRef.current?.scrollTo({ x: scrollX, animated: true });
        }, 300);
      }
    }
  }, [viewMode, timelineDates.length]);

  const toggleTask = (taskId: number) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // Render task tree recursively
  const renderTaskTree = (
    task: ProjectTask & { children?: ProjectTask[] },
    level: number = 0
  ): React.ReactNode[] => {
    const hasChildren = task.children && task.children.length > 0;
    const isExpanded = expandedTasks.has(task.id);
    const position = getTaskPosition(task);
    if (!position) return [];

    const nodes: React.ReactNode[] = [
      <GanttTaskBar
        key={task.id}
        task={task}
        left={position.left}
        width={position.width}
        top={level * ROW_HEIGHT}
        height={ROW_HEIGHT - 4}
        onPress={() => onTaskPress?.(task)}
      />,
    ];

    // Render children if expanded
    if (hasChildren && isExpanded && task.children) {
      task.children.forEach(child => {
        nodes.push(...renderTaskTree(child, level + 1));
      });
    }

    return nodes;
  };

  const chartWidth = useMemo(() => {
    if (viewMode === "day") {
      return timelineDates.length * DAY_WIDTH;
    } else if (viewMode === "week") {
      return timelineDates.length * WEEK_WIDTH;
    } else {
      return timelineDates.length * MONTH_WIDTH;
    }
  }, [timelineDates.length, viewMode]);

  const formatDate = (date: Date, mode: ViewMode): string => {
    if (mode === "day") {
      return date.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
    } else if (mode === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
    } else {
      return date.toLocaleDateString("vi-VN", { month: "short", year: "numeric" });
    }
  };

  const formatDateShort = (date: Date): string => {
    return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  };

  const getMonthName = (month: number): string => {
    const months = [
      "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
      "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
    ];
    return months[month];
  };

  // Get phase color based on task name or phase
  const getPhaseColor = (task: ProjectTask): string => {
    const name = task.name.toLowerCase();
    if (name.includes("phần thô") || name.includes("rough") || name.includes("móng") || name.includes("foundation")) {
      return "#10B981"; // Green for rough construction
    } else if (name.includes("phần hoàn thiện") || name.includes("finishing") || name.includes("hoàn thiện")) {
      return "#EC4899"; // Pink for finishing
    } else if (task.status === "completed") {
      return "#10B981";
    } else if (task.status === "in_progress") {
      return "#3B82F6";
    } else if (task.status === "delayed") {
      return "#EF4444";
    }
    return "#6B7280";
  };

  // Check if date is today
  const isToday = (date: Date, mode: ViewMode): boolean => {
    const today = new Date();
    if (mode === "day") {
      return date.toDateString() === today.toDateString();
    } else if (mode === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return today >= weekStart && today <= weekEnd;
    } else {
      return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    }
  };

  // Get project start date
  const actualStartDate = projectStartDate
    ? new Date(projectStartDate)
    : (tasks.length > 0 && tasks[0].start_date ? new Date(tasks[0].start_date) : dateRange.start);

  return (
    <View style={styles.container}>
      {/* Project Header */}
      {(projectName || actualStartDate) && (
        <View style={styles.projectHeader}>
          {projectName && (
            <Text style={styles.projectTitle}>{projectName}</Text>
          )}
          {actualStartDate && (
            <Text style={styles.startDateText}>
              Ngày bắt đầu: {formatDateShort(actualStartDate)}
            </Text>
          )}
        </View>
      )}

      {/* View mode selector */}
      <View style={styles.controls}>
        <View style={styles.viewModeSelector}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === "day" && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode("day")}
          >
            <Text
              style={[
                styles.viewModeText,
                viewMode === "day" && styles.viewModeTextActive,
              ]}
            >
              Ngày
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === "week" && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode("week")}
          >
            <Text
              style={[
                styles.viewModeText,
                viewMode === "week" && styles.viewModeTextActive,
              ]}
            >
              Tuần
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              viewMode === "month" && styles.viewModeButtonActive,
            ]}
            onPress={() => setViewMode("month")}
          >
            <Text
              style={[
                styles.viewModeText,
                viewMode === "month" && styles.viewModeTextActive,
              ]}
            >
              Tháng
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Gantt Chart */}
      <View style={styles.chartWrapper}>
        <ScrollView
          ref={horizontalScrollRef}
          horizontal
          showsHorizontalScrollIndicator={true}
          style={styles.horizontalScroll}
          contentContainerStyle={{ minWidth: Math.max(chartWidth, screenWidth) }}
        >
          <View style={[styles.chartContainer, { width: Math.max(chartWidth, screenWidth) }]}>
            {/* Timeline header */}
            <View style={styles.timelineHeader}>
              <View style={[styles.phaseHeader, { width: TASK_NAME_WIDTH }]}>
                <Text style={styles.phaseHeaderText}>TÊN CÔNG TÁC</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                scrollEnabled={false}
              >
                {viewMode === "week" && monthGroups.length > 0 ? (
                  <View style={styles.datesContainer}>
                    {monthGroups.map((group, groupIndex) => (
                      <View key={`group-${groupIndex}`} style={styles.monthGroup}>
                        <View style={styles.monthHeader}>
                          <Text style={styles.monthHeaderText}>
                            {getMonthName(group.month)} {group.year}
                          </Text>
                        </View>
                        <View style={styles.weeksContainer}>
                          {group.weeks.map((date, weekIndex) => {
                            const globalIndex = group.startIndex + weekIndex;
                            const isTodayDate = isToday(date, viewMode);
                            const weekNumber = globalIndex + 1;
                            return (
                              <View
                                key={globalIndex}
                                style={[
                                  styles.weekCell,
                                  isTodayDate && styles.dateCellToday,
                                  { width: WEEK_WIDTH },
                                ]}
                              >
                                <Text style={[styles.weekNumberText, isTodayDate && styles.dateTextToday]}>
                                  {weekNumber}
                                </Text>
                                <Text style={[styles.dateText, isTodayDate && styles.dateTextToday]}>
                                  {formatDate(date, viewMode)}
                                </Text>
                                {isTodayDate && (
                                  <View style={styles.todayIndicator} />
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.datesContainer}>
                    {timelineDates.map((date, index) => {
                      const isTodayDate = isToday(date, viewMode);
                      return (
                        <View
                          key={index}
                          style={[
                            styles.dateCell,
                            isTodayDate && styles.dateCellToday,
                            {
                              width:
                                viewMode === "day"
                                  ? DAY_WIDTH
                                  : viewMode === "week"
                                    ? WEEK_WIDTH
                                    : MONTH_WIDTH,
                            },
                          ]}
                        >
                          <Text style={[styles.dateText, isTodayDate && styles.dateTextToday]}>
                            {formatDate(date, viewMode)}
                          </Text>
                          {isTodayDate && (
                            <View style={styles.todayIndicator} />
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Parent tasks (act as "phases") and their children */}
            <ScrollView
              ref={verticalScrollRef}
              style={styles.tasksContainer}
              nestedScrollEnabled={true}
            >
              {taskHierarchy.rootTasks.map((parentTask) => {
                const childTasks = parentTask.children || [];
                const hasChildren = childTasks.length > 0;
                const isExpanded = expandedTasks.has(parentTask.id);
                const phaseColor = getPhaseColor(parentTask);
                const position = getTaskPosition(parentTask);

                return (
                  <View key={parentTask.id} style={styles.phaseSection}>
                    {/* Parent task row (acts as "phase") */}
                    <View style={styles.phaseRow}>
                      <TouchableOpacity
                        style={[styles.phaseLabel, { width: TASK_NAME_WIDTH }]}
                        onPress={() => {
                          if (hasChildren) {
                            toggleTask(parentTask.id);
                          } else {
                            onTaskPress?.(parentTask);
                          }
                        }}
                      >
                        {hasChildren && (
                          <Ionicons
                            name={isExpanded ? "chevron-down" : "chevron-forward"}
                            size={16}
                            color="#6B7280"
                            style={styles.expandIcon}
                          />
                        )}
                        <View style={styles.phaseLabelContent}>
                          <Text style={styles.phaseLabelText}>
                            {parentTask.name}
                          </Text>
                          {parentTask.description && (
                            <Text style={styles.phaseDescription} numberOfLines={3}>
                              {parentTask.description}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => onTaskPress?.(parentTask)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="create-outline" size={18} color="#3B82F6" />
                        </TouchableOpacity>
                      </TouchableOpacity>
                      <View style={styles.tasksRow}>
                        {/* Parent task bar */}
                        {position && (
                          <View style={styles.phaseBarContainer}>
                            <View
                              style={[
                                styles.phaseBar,
                                {
                                  left: position.left,
                                  width: position.width,
                                  backgroundColor: phaseColor + "20",
                                  borderColor: phaseColor,
                                },
                              ]}
                            >
                              {/* Triangle indicator at start */}
                              <View style={[styles.triangleIndicator, { borderLeftColor: phaseColor }]} />
                              {/* Completion date at end */}
                              {parentTask.end_date && position.width > 120 && (
                                <Text style={[styles.completionDate, { color: phaseColor }]}>
                                  {formatDateShort(new Date(parentTask.end_date))}
                                </Text>
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Children tasks (with hierarchy) */}
                    {hasChildren && isExpanded && (
                      <View style={styles.childrenContainer}>
                        {childTasks.map((childTask, childIndex) => {
                          const childPosition = getTaskPosition(childTask);
                          const childColor = getPhaseColor(childTask);
                          return (
                            <View key={childTask.id} style={styles.childTaskRow}>
                              <View style={[styles.taskLabel, { width: TASK_NAME_WIDTH }]}>
                                <View style={styles.taskLabelContent}>
                                  <Text style={styles.taskLabelText}>
                                    {childIndex + 1}. {childTask.name}
                                  </Text>
                                  {childTask.description && (
                                    <Text style={styles.taskDescription} numberOfLines={2}>
                                      {childTask.description}
                                    </Text>
                                  )}
                                </View>
                              </View>
                              <View style={styles.tasksRow}>
                                {childPosition && (
                                  <GanttTaskBar
                                    task={childTask}
                                    left={childPosition.left}
                                    width={childPosition.width}
                                    top={0}
                                    height={ROW_HEIGHT - 4}
                                    onPress={() => onTaskPress?.(childTask)}
                                    phaseColor={childColor}
                                    showTriangle={true}
                                  />
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                );
              })}

              {taskHierarchy.rootTasks.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
                  <Text style={styles.emptyText}>Chưa có công việc</Text>
                  <Text style={styles.emptySubtext}>
                    Nhấn nút + ở góc trên để tạo công việc mới
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  projectHeader: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#E5E7EB",
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
    textAlign: "center",
  },
  startDateText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  controls: {
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  viewModeSelector: {
    flexDirection: "row",
    gap: 8,
  },
  viewModeButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  viewModeButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  viewModeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  viewModeTextActive: {
    color: "#FFFFFF",
  },
  chartWrapper: {
    flex: 1,
  },
  horizontalScroll: {
    flex: 1,
  },
  chartContainer: {
    minHeight: 400,
  },
  timelineHeader: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 2,
    borderBottomColor: "#E5E7EB",
    position: "relative",
    zIndex: 10,
  },
  phaseHeader: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
  },
  phaseHeaderText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  datesContainer: {
    flexDirection: "row",
  },
  monthGroup: {
    borderRightWidth: 2,
    borderRightColor: "#D1D5DB",
  },
  monthHeader: {
    backgroundColor: "#F3F4F6",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    alignItems: "center",
  },
  monthHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
    textTransform: "uppercase",
  },
  weeksContainer: {
    flexDirection: "row",
  },
  weekCell: {
    padding: 8,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "#FFFFFF",
  },
  dateCell: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    backgroundColor: "#FFFFFF",
  },
  dateCellToday: {
    backgroundColor: "#EFF6FF",
    borderRightColor: "#3B82F6",
  },
  weekNumberText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#3B82F6",
    marginBottom: 2,
  },
  dateText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F2937",
  },
  dateTextToday: {
    color: "#3B82F6",
    fontWeight: "700",
  },
  todayIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#3B82F6",
  },
  todayLineContainer: {
    flexDirection: "row",
    position: "absolute",
    top: HEADER_HEIGHT,
    left: 0,
    right: 0,
    height: 2,
    zIndex: 5,
    pointerEvents: "none",
  },
  todayLineWrapper: {
    flex: 1,
    position: "relative",
  },
  todayLine: {
    position: "absolute",
    top: 0,
    width: 2,
    height: "100%",
    backgroundColor: "#3B82F6",
    zIndex: 5,
  },
  tasksContainer: {
    flex: 1,
  },
  phaseSection: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  phaseRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
  },
  phaseLabel: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    minHeight: ROW_HEIGHT,
  },
  expandIcon: {
    marginRight: 4,
    marginTop: 2,
  },
  phaseLabelContent: {
    flex: 1,
    flexShrink: 1,
  },
  phaseLabelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
    lineHeight: 18,
    flexWrap: "wrap",
  },
  phaseDescription: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 15,
  },
  tasksRow: {
    flex: 1,
    position: "relative",
    backgroundColor: "#FAFAFA",
    minHeight: ROW_HEIGHT,
  },
  phaseBarContainer: {
    flex: 1,
    position: "relative",
    height: ROW_HEIGHT,
  },
  phaseBar: {
    position: "absolute",
    top: 8,
    height: ROW_HEIGHT - 16,
    borderRadius: 4,
    borderWidth: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
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
  completionDate: {
    fontSize: 10,
    fontWeight: "600",
  },
  childrenContainer: {
    backgroundColor: "#FFFFFF",
  },
  childTaskRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  taskRow: {
    flexDirection: "row",
    minHeight: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  taskLabel: {
    padding: 12,
    paddingLeft: 32,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    minHeight: ROW_HEIGHT,
  },
  taskLabelContent: {
    flex: 1,
    flexShrink: 1,
  },
  taskLabelText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#1F2937",
    lineHeight: 16,
    flexWrap: "wrap",
  },
  taskDescription: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 14,
  },
  taskPhaseName: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  taskPhaseWarning: {
    fontSize: 10,
    color: "#F59E0B",
    marginTop: 2,
    fontStyle: "italic",
  },
  phaseLabelWarning: {
    backgroundColor: "#FEF3C7",
  },
  phaseLabelTextWarning: {
    color: "#F59E0B",
  },
  emptyContainer: {
    padding: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});

