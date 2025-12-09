import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { workScheduleApi, WorkSchedule } from "@/api/workScheduleApi";
import { timeTrackingApi, TimeTracking } from "@/api/timeTrackingApi";
import { Ionicons } from "@expo/vector-icons";
import CalendarView from "@/components/CalendarView";

export default function CalendarScreen() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any>({});
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [selectedDateSchedules, setSelectedDateSchedules] = useState<
    WorkSchedule[]
  >([]);
  const [selectedDateTimeTracking, setSelectedDateTimeTracking] = useState<
    TimeTracking[]
  >([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadCalendar();
  }, [currentMonth, currentYear]);

  useEffect(() => {
    if (selectedDate) {
      loadDateDetails();
    }
  }, [selectedDate]);

  const loadCalendar = async () => {
    try {
      setLoading(true);
      const [scheduleRes, timeTrackingRes] = await Promise.all([
        workScheduleApi.getCalendar({
          month: currentMonth,
          year: currentYear,
        }),
        timeTrackingApi.getTimeTracking({
          start_date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`,
          end_date: `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`,
        }),
      ]);

      const scheduleData: any = {};
      if (scheduleRes.success && scheduleRes.data?.data) {
        Object.keys(scheduleRes.data.data).forEach((date) => {
          scheduleData[date] = scheduleRes.data.data[date];
        });
      }

      // Add time tracking data to calendar
      if (timeTrackingRes.success && timeTrackingRes.data?.data) {
        timeTrackingRes.data.data.forEach((tracking: TimeTracking) => {
          const date = tracking.check_in_at.split("T")[0];
          if (!scheduleData[date]) {
            scheduleData[date] = [];
          }
          scheduleData[date].push({
            type: "work",
            timeTracking: tracking,
          });
        });
      }

      setSchedules(scheduleData);
    } catch (error) {
      console.error("Error loading calendar:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadDateDetails = async () => {
    try {
      const [scheduleRes, timeTrackingRes] = await Promise.all([
        workScheduleApi.getWorkSchedule({
          start_date: selectedDate,
          end_date: selectedDate,
        }),
        timeTrackingApi.getTimeTracking({
          start_date: selectedDate,
          end_date: selectedDate,
        }),
      ]);

      if (scheduleRes.success) {
        setSelectedDateSchedules(scheduleRes.data?.data || []);
      }

      if (timeTrackingRes.success) {
        setSelectedDateTimeTracking(timeTrackingRes.data?.data || []);
      }
    } catch (error) {
      console.error("Error loading date details:", error);
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleMonthChange = (month: any) => {
    const date = new Date(month.dateString);
    setCurrentMonth(date.getMonth() + 1);
    setCurrentYear(date.getFullYear());
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lịch Làm Việc</Text>
      </View>

      <CalendarView
        schedules={schedules}
        month={currentMonth}
        year={currentYear}
        onDateSelect={handleDateSelect}
      />

      <View style={styles.detailsContainer}>
        <Text style={styles.sectionTitle}>
          Chi tiết ngày {new Date(selectedDate).toLocaleDateString("vi-VN")}
        </Text>

        {selectedDateSchedules.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Lịch làm việc</Text>
            {selectedDateSchedules.map((schedule) => (
              <View key={schedule.id} style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>
                    {schedule.start_time} - {schedule.end_time}
                  </Text>
                </View>
                <Text style={styles.detailType}>
                  {schedule.type === "work"
                    ? "Làm việc"
                    : schedule.type === "leave"
                      ? "Nghỉ phép"
                      : schedule.type === "holiday"
                        ? "Lễ"
                        : "Tăng ca"}
                </Text>
                {schedule.notes && (
                  <Text style={styles.detailNotes}>{schedule.notes}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {selectedDateTimeTracking.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Chấm công</Text>
            {selectedDateTimeTracking.map((tracking) => (
              <View key={tracking.id} style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <Ionicons name="log-in-outline" size={16} color="#10B981" />
                  <Text style={styles.detailText}>
                    Check-in: {new Date(tracking.check_in_at).toLocaleTimeString("vi-VN")}
                  </Text>
                </View>
                {tracking.check_out_at && (
                  <View style={styles.detailRow}>
                    <Ionicons name="log-out-outline" size={16} color="#EF4444" />
                    <Text style={styles.detailText}>
                      Check-out: {new Date(tracking.check_out_at).toLocaleTimeString("vi-VN")}
                    </Text>
                  </View>
                )}
                {tracking.total_hours && (
                  <Text style={styles.detailHours}>
                    Tổng giờ: {tracking.total_hours} giờ
                  </Text>
                )}
                {tracking.project && (
                  <Text style={styles.detailProject}>
                    Dự án: {tracking.project.name}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {selectedDateSchedules.length === 0 &&
          selectedDateTimeTracking.length === 0 && (
            <View style={styles.emptyDetails}>
              <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyDetailsText}>
                Không có dữ liệu cho ngày này
              </Text>
            </View>
          )}
      </View>
    </ScrollView>
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
  },
  header: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  detailsContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#6B7280",
  },
  detailType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
    marginTop: 4,
  },
  detailNotes: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    fontStyle: "italic",
  },
  detailHours: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
    marginTop: 8,
  },
  detailProject: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  emptyDetails: {
    padding: 40,
    alignItems: "center",
  },
  emptyDetailsText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
});
