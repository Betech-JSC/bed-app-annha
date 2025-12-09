import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface CalendarViewProps {
  schedules?: any;
  month?: number;
  year?: number;
  onDateSelect?: (date: string) => void;
  markedDates?: any;
}

const DAYS_OF_WEEK = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
];

export default function CalendarView({
  schedules,
  month,
  year,
  onDateSelect,
  markedDates,
}: CalendarViewProps) {
  const currentDate = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    month || currentDate.getMonth() + 1
  );
  const [currentYear, setCurrentYear] = useState(year || currentDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string>(
    currentDate.toISOString().split("T")[0]
  );

  const calendarData = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: Array<{
      date: number;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      hasSchedule: boolean;
      scheduleType?: string;
    }> = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDate = new Date(currentYear, currentMonth - 2, 0);
      const date = prevMonthDate.getDate() - startingDayOfWeek + i + 1;
      const dateString = `${currentYear}-${String(currentMonth - 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
      days.push({
        date,
        dateString,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        hasSchedule: false,
      });
    }

    // Add days of the current month
    const today = new Date();
    for (let i = 1; i <= daysInMonth; i++) {
      const dateString = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const isToday =
        i === today.getDate() &&
        currentMonth === today.getMonth() + 1 &&
        currentYear === today.getFullYear();
      const isSelected = dateString === selectedDate;

      // Check if date has schedule
      let hasSchedule = false;
      let scheduleType = "";
      if (schedules && schedules[dateString]) {
        hasSchedule = true;
        const schedule = schedules[dateString];
        if (Array.isArray(schedule) && schedule.length > 0) {
          scheduleType = schedule[0].type || "work";
        } else if (schedule?.type) {
          scheduleType = schedule.type;
        }
      }

      days.push({
        date: i,
        dateString,
        isCurrentMonth: true,
        isToday,
        isSelected,
        hasSchedule,
        scheduleType,
      });
    }

    // Add empty cells for remaining days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      days.push({
        date: i,
        dateString,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false,
        hasSchedule: false,
      });
    }

    return days;
  }, [currentMonth, currentYear, selectedDate, schedules]);

  const handleDayPress = (dateString: string) => {
    setSelectedDate(dateString);
    onDateSelect?.(dateString);
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today.getMonth() + 1);
    setCurrentYear(today.getFullYear());
    setSelectedDate(today.toISOString().split("T")[0]);
  };

  const getScheduleColor = (type?: string) => {
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
        return "#3B82F6";
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <View style={styles.monthYearContainer}>
          <Text style={styles.monthYearText}>
            {MONTHS[currentMonth - 1]} {currentYear}
          </Text>
        </View>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Today Button */}
      <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
        <Text style={styles.todayButtonText}>Hôm nay</Text>
      </TouchableOpacity>

      {/* Days of week header */}
      <View style={styles.daysOfWeekContainer}>
        {DAYS_OF_WEEK.map((day, index) => (
          <View key={index} style={styles.dayOfWeek}>
            <Text style={styles.dayOfWeekText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarData.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayCell,
              !day.isCurrentMonth && styles.dayCellDisabled,
              day.isToday && styles.dayCellToday,
              day.isSelected && styles.dayCellSelected,
            ]}
            onPress={() => day.isCurrentMonth && handleDayPress(day.dateString)}
            disabled={!day.isCurrentMonth}
          >
            <Text
              style={[
                styles.dayText,
                !day.isCurrentMonth && styles.dayTextDisabled,
                day.isToday && styles.dayTextToday,
                day.isSelected && styles.dayTextSelected,
              ]}
            >
              {day.date}
            </Text>
            {day.hasSchedule && (
              <View
                style={[
                  styles.scheduleDot,
                  { backgroundColor: getScheduleColor(day.scheduleType) },
                ]}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
          <Text style={styles.legendText}>Làm việc</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
          <Text style={styles.legendText}>Nghỉ phép</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#F59E0B" }]} />
          <Text style={styles.legendText}>Lễ</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#8B5CF6" }]} />
          <Text style={styles.legendText}>Tăng ca</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthYearContainer: {
    flex: 1,
    alignItems: "center",
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  todayButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    marginBottom: 16,
  },
  todayButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  daysOfWeekContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayOfWeek: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayOfWeekText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    padding: 4,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayCellToday: {
    backgroundColor: "#DBEAFE",
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  dayText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  dayTextDisabled: {
    color: "#D1D5DB",
  },
  dayTextToday: {
    color: "#3B82F6",
    fontWeight: "700",
  },
  dayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scheduleDot: {
    position: "absolute",
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    paddingTop: 16,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: "#6B7280",
  },
});
