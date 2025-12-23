import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { ProjectPhase, ProjectTask } from "@/types/ganttTypes";
import GanttTaskBar from "./GanttTaskBar";
import { Ionicons } from "@expo/vector-icons";

interface GanttChartProps {
  phases: ProjectPhase[];
  tasks: ProjectTask[];
  onTaskPress?: (task: ProjectTask) => void;
  onPhasePress?: (phase: ProjectPhase) => void;
}

type ViewMode = "day" | "week" | "month";

const screenWidth = Dimensions.get("window").width;
const DAY_WIDTH = 40;
const WEEK_WIDTH = 280;
const MONTH_WIDTH = 1200;
const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 60;

export default function GanttChart({
  phases,
  tasks,
  onTaskPress,
  onPhasePress,
}: GanttChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Calculate date range
  const dateRange = useMemo(() => {
    const allDates: Date[] = [];
    
    // Get dates from phases
    phases.forEach((phase) => {
      if (phase.start_date) allDates.push(new Date(phase.start_date));
      if (phase.end_date) allDates.push(new Date(phase.end_date));
    });
    
    // Get dates from tasks
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
  }, [phases, tasks]);

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

  // Group tasks by phase
  const tasksByPhase = useMemo(() => {
    const grouped: { [key: number]: ProjectTask[] } = {};
    const standalone: ProjectTask[] = [];

    tasks.forEach((task) => {
      if (task.phase_id) {
        if (!grouped[task.phase_id]) {
          grouped[task.phase_id] = [];
        }
        grouped[task.phase_id].push(task);
      } else {
        standalone.push(task);
      }
    });

    return { grouped, standalone };
  }, [tasks]);

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
      return `Tuần ${Math.ceil(date.getDate() / 7)}/${date.getMonth() + 1}`;
    } else {
      return date.toLocaleDateString("vi-VN", { month: "short", year: "numeric" });
    }
  };

  return (
    <View style={styles.container}>
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={styles.scrollView}
      >
        <View style={[styles.chartContainer, { width: Math.max(chartWidth, screenWidth) }]}>
          {/* Timeline header */}
          <View style={styles.timelineHeader}>
            <View style={styles.phaseHeader} />
            <View style={styles.datesContainer}>
              {timelineDates.map((date, index) => (
                <View
                  key={index}
                  style={[
                    styles.dateCell,
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
                  <Text style={styles.dateText}>{formatDate(date, viewMode)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Phases and tasks */}
          <ScrollView style={styles.tasksContainer}>
            {phases.map((phase, phaseIndex) => {
              const phaseTasks = tasksByPhase.grouped[phase.id] || [];
              return (
                <View key={phase.id} style={styles.phaseRow}>
                  {/* Phase label */}
                  <TouchableOpacity
                    style={styles.phaseLabel}
                    onPress={() => onPhasePress?.(phase)}
                  >
                    <Text style={styles.phaseLabelText} numberOfLines={1}>
                      {phase.name}
                    </Text>
                  </TouchableOpacity>

                  {/* Tasks row */}
                  <View style={styles.tasksRow}>
                    {phaseTasks.map((task, taskIndex) => {
                      const position = getTaskPosition(task);
                      if (!position) return null;

                      return (
                        <GanttTaskBar
                          key={task.id}
                          task={task}
                          left={position.left}
                          width={position.width}
                          top={taskIndex * ROW_HEIGHT}
                          height={ROW_HEIGHT - 4}
                          onPress={() => onTaskPress?.(task)}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            })}

            {/* Standalone tasks */}
            {tasksByPhase.standalone.length > 0 && (
              <View style={styles.phaseRow}>
                <View style={styles.phaseLabel}>
                  <Text style={styles.phaseLabelText}>Không thuộc giai đoạn</Text>
                </View>
                <View style={styles.tasksRow}>
                  {tasksByPhase.standalone.map((task, taskIndex) => {
                    const position = getTaskPosition(task);
                    if (!position) return null;

                    return (
                      <GanttTaskBar
                        key={task.id}
                        task={task}
                        left={position.left}
                        width={position.width}
                        top={taskIndex * ROW_HEIGHT}
                        height={ROW_HEIGHT - 4}
                        onPress={() => onTaskPress?.(task)}
                      />
                    );
                  })}
                </View>
              </View>
            )}

            {phases.length === 0 && tasksByPhase.standalone.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
                <Text style={styles.emptyText}>Chưa có giai đoạn hoặc công việc</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
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
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  viewModeButtonActive: {
    backgroundColor: "#3B82F6",
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  viewModeTextActive: {
    color: "#FFFFFF",
  },
  scrollView: {
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
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  phaseHeader: {
    width: 120,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
  },
  datesContainer: {
    flexDirection: "row",
  },
  dateCell: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  tasksContainer: {
    flex: 1,
  },
  phaseRow: {
    flexDirection: "row",
    minHeight: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  phaseLabel: {
    width: 120,
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
  },
  phaseLabelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  tasksRow: {
    flex: 1,
    position: "relative",
    backgroundColor: "#FAFAFA",
    minHeight: ROW_HEIGHT,
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
});

