import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface WeekViewProps {
  schedules?: any;
  weekStart: Date;
  onDateSelect?: (date: string) => void;
  onWeekChange?: (direction: "prev" | "next") => void;
}

const DAYS_OF_WEEK = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export default function WeekView({
  schedules,
  weekStart,
  onDateSelect,
  onWeekChange,
}: WeekViewProps) {
  const weekDays = useMemo(() => {
    const days = [];
    const start = new Date(weekStart);
    // Adjust to Monday if weekStart is not Monday
    const dayOfWeek = start.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday = 1
    start.setDate(start.getDate() + diff);

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateString = date.toISOString().split("T")[0];
      const isToday =
        dateString === new Date().toISOString().split("T")[0];

      days.push({
        date,
        dateString,
        dayName: DAYS_OF_WEEK[i],
        dayNumber: date.getDate(),
        isToday,
        schedules: schedules?.[dateString] || [],
      });
    }

    return days;
  }, [weekStart, schedules]);

  const getScheduleColor = (type: string) => {
    switch (type) {
      case "work":
        return "#10B981";
      case "leave":
        return "#EF4444";
      case "holiday":
        return "#F59E0B";
      case "overtime":
        return "#8B5CF6";
      default:
        return "#6B7280";
    }
  };

  const formatWeekRange = () => {
    const start = weekDays[0].date;
    const end = weekDays[6].date;
    return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
  };

  return (
    <View style={styles.container}>
      {/* Week Header */}
      <View style={styles.weekHeader}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => onWeekChange?.("prev")}
        >
          <Ionicons name="chevron-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <View style={styles.weekInfo}>
          <Text style={styles.weekRange}>{formatWeekRange()}</Text>
          <Text style={styles.weekLabel}>Tuần này</Text>
        </View>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => onWeekChange?.("next")}
        >
          <Ionicons name="chevron-forward" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Week Days */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.weekGrid}>
          {weekDays.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayColumn,
                day.isToday && styles.dayColumnToday,
              ]}
              onPress={() => onDateSelect?.(day.dateString)}
            >
              <View style={styles.dayHeader}>
                <Text
                  style={[
                    styles.dayName,
                    day.isToday && styles.dayNameToday,
                  ]}
                >
                  {day.dayName}
                </Text>
                <View
                  style={[
                    styles.dayNumber,
                    day.isToday && styles.dayNumberToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayNumberText,
                      day.isToday && styles.dayNumberTextToday,
                    ]}
                  >
                    {day.dayNumber}
                  </Text>
                </View>
              </View>

              <ScrollView
                style={styles.schedulesList}
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {day.schedules.length > 0 ? (
                  day.schedules.map((schedule: any, idx: number) => (
                    <View
                      key={idx}
                      style={[
                        styles.scheduleItem,
                        {
                          borderLeftColor: getScheduleColor(
                            schedule.type || "work"
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.scheduleTime}>
                        {schedule.start_time} - {schedule.end_time}
                      </Text>
                      <Text style={styles.scheduleType}>
                        {schedule.type === "work"
                          ? "Làm việc"
                          : schedule.type === "leave"
                            ? "Nghỉ phép"
                            : schedule.type === "holiday"
                              ? "Lễ"
                              : "Tăng ca"}
                      </Text>
                      {schedule.user && (
                        <Text style={styles.scheduleUser} numberOfLines={1}>
                          {schedule.user.name}
                        </Text>
                      )}
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyDay}>
                    <Text style={styles.emptyDayText}>Không có lịch</Text>
                  </View>
                )}
              </ScrollView>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  navButton: {
    padding: 8,
  },
  weekInfo: {
    alignItems: "center",
  },
  weekRange: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  weekLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  weekGrid: {
    flexDirection: "row",
    gap: 8,
  },
  dayColumn: {
    width: 120,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dayColumnToday: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
    borderWidth: 2,
  },
  dayHeader: {
    alignItems: "center",
    marginBottom: 8,
  },
  dayName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  dayNameToday: {
    color: "#3B82F6",
  },
  dayNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  dayNumberToday: {
    backgroundColor: "#3B82F6",
  },
  dayNumberText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  dayNumberTextToday: {
    color: "#FFFFFF",
  },
  schedulesList: {
    maxHeight: 300,
  },
  scheduleItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  scheduleTime: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  scheduleType: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 2,
  },
  scheduleUser: {
    fontSize: 9,
    color: "#9CA3AF",
  },
  emptyDay: {
    padding: 16,
    alignItems: "center",
  },
  emptyDayText: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});


