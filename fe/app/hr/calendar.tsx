import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { workScheduleApi, WorkSchedule } from "@/api/workScheduleApi";
import { timeTrackingApi, TimeTracking } from "@/api/timeTrackingApi";
import { employeesApi, Employee } from "@/api/employeesApi";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";
import CalendarView from "@/components/CalendarView";
import WeekView from "@/components/WeekView";
import BulkScheduleForm from "@/components/BulkScheduleForm";
import WorkScheduleForm from "@/components/WorkScheduleForm";

type ViewMode = "month" | "week";

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
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    return monday;
  });

  // Filters
  const [selectedUser, setSelectedUser] = useState<Employee | null>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [users, setUsers] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Statistics
  const [statistics, setStatistics] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [showStats, setShowStats] = useState(true);

  // Forms
  const [showBulkForm, setShowBulkForm] = useState(false);
  const [showSingleForm, setShowSingleForm] = useState(false);
  const [formInitialDate, setFormInitialDate] = useState<Date | undefined>();

  useEffect(() => {
    loadUsers();
    loadProjects();
  }, []);

  useEffect(() => {
    loadCalendar();
  }, [currentMonth, currentYear, viewMode, weekStart, selectedUser, selectedProject, selectedTypes]);

  useEffect(() => {
    if (selectedDate) {
      loadDateDetails();
    }
  }, [selectedDate]);

  useEffect(() => {
    loadStatistics();
  }, [selectedUser, selectedProject, currentMonth, currentYear, viewMode, weekStart]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await employeesApi.getEmployees({ per_page: 100 });
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadProjects = async () => {
    try {
      setLoadingProjects(true);
      const response = await projectApi.getProjects({ page: 1 });
      if (response.success) {
        setProjects(response.data?.data || []);
      }
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadCalendar = async () => {
    try {
      setLoading(true);
      const params: any = {
        user_id: selectedUser?.id,
        project_id: selectedProject?.id,
      };

      if (viewMode === "month") {
        params.month = currentMonth;
        params.year = currentYear;
      } else {
        params.week_start = weekStart.toISOString().split("T")[0];
      }

      const [scheduleRes, timeTrackingRes] = await Promise.all([
        workScheduleApi.getCalendar(params),
        timeTrackingApi.getTimeTracking({
          start_date: viewMode === "month"
            ? `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`
            : weekStart.toISOString().split("T")[0],
          end_date: viewMode === "month"
            ? `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`
            : new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        }),
      ]);

      let scheduleData: any = {};
      if (scheduleRes.success && scheduleRes.data?.data) {
        Object.keys(scheduleRes.data.data).forEach((date) => {
          let daySchedules = scheduleRes.data.data[date];
          // Filter by type if selected
          if (selectedTypes.length > 0) {
            daySchedules = daySchedules.filter((s: any) =>
              selectedTypes.includes(s.type)
            );
          }
          if (daySchedules.length > 0) {
            scheduleData[date] = daySchedules;
          }
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
          user_id: selectedUser?.id,
          project_id: selectedProject?.id,
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

  const loadStatistics = async () => {
    try {
      setLoadingStats(true);
      const startDate =
        viewMode === "month"
          ? `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`
          : weekStart.toISOString().split("T")[0];
      const endDate =
        viewMode === "month"
          ? `${currentYear}-${String(currentMonth).padStart(2, "0")}-31`
          : new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];

      const response = await workScheduleApi.getStatistics({
        user_id: selectedUser?.id,
        project_id: selectedProject?.id,
        start_date: startDate,
        end_date: endDate,
      });

      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error("Error loading statistics:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleWeekChange = (direction: "prev" | "next") => {
    const newWeekStart = new Date(weekStart);
    if (direction === "prev") {
      newWeekStart.setDate(weekStart.getDate() - 7);
    } else {
      newWeekStart.setDate(weekStart.getDate() + 7);
    }
    setWeekStart(newWeekStart);
  };

  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter((t) => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const handleClearFilters = () => {
    setSelectedUser(null);
    setSelectedProject(null);
    setSelectedTypes([]);
  };

  const handleBulkCreate = async (data: any) => {
    try {
      const response = await workScheduleApi.bulkCreateSchedule(data);
      if (response.success) {
        Alert.alert("Thành công", response.message || "Đã tạo lịch hàng loạt");
        setShowBulkForm(false);
        loadCalendar();
        loadStatistics();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleSingleCreate = async (data: any) => {
    try {
      const response = await workScheduleApi.createSchedule(data);
      if (response.success) {
        Alert.alert("Thành công", response.message || "Đã tạo lịch làm việc");
        setShowSingleForm(false);
        loadCalendar();
        loadDateDetails();
        loadStatistics();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
      throw error;
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      !userSearch ||
      user.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredProjects = projects.filter(
    (project) =>
      !projectSearch ||
      project.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  if (loading && !statistics) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lịch Làm Việc</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              setFormInitialDate(new Date(selectedDate));
              setShowSingleForm(true);
            }}
          >
            <Ionicons name="add" size={20} color="#3B82F6" />
            <Text style={styles.headerButtonText}>Tạo mới</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowBulkForm(true)}
          >
            <Ionicons name="layers" size={20} color="#10B981" />
            <Text style={styles.headerButtonText}>Tạo hàng loạt</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* View Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === "month" && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode("month")}
        >
          <Text
            style={[
              styles.toggleButtonText,
              viewMode === "month" && styles.toggleButtonTextActive,
            ]}
          >
            Tháng
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            viewMode === "week" && styles.toggleButtonActive,
          ]}
          onPress={() => setViewMode("week")}
        >
          <Text
            style={[
              styles.toggleButtonText,
              viewMode === "week" && styles.toggleButtonTextActive,
            ]}
          >
            Tuần
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedUser && styles.filterChipActive,
          ]}
          onPress={() => setShowUserModal(true)}
        >
          <Ionicons name="person-outline" size={16} color={selectedUser ? "#3B82F6" : "#6B7280"} />
          <Text
            style={[
              styles.filterChipText,
              selectedUser && styles.filterChipTextActive,
            ]}
          >
            {selectedUser ? selectedUser.name : "Nhân viên"}
          </Text>
          {selectedUser && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setSelectedUser(null);
              }}
            >
              <Ionicons name="close-circle" size={16} color="#3B82F6" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            selectedProject && styles.filterChipActive,
          ]}
          onPress={() => setShowProjectModal(true)}
        >
          <Ionicons name="folder-outline" size={16} color={selectedProject ? "#3B82F6" : "#6B7280"} />
          <Text
            style={[
              styles.filterChipText,
              selectedProject && styles.filterChipTextActive,
            ]}
          >
            {selectedProject ? selectedProject.name : "Dự án"}
          </Text>
          {selectedProject && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setSelectedProject(null);
              }}
            >
              <Ionicons name="close-circle" size={16} color="#3B82F6" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {(["work", "leave", "holiday", "overtime"] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterChip,
              selectedTypes.includes(type) && styles.filterChipActive,
            ]}
            onPress={() => handleTypeToggle(type)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedTypes.includes(type) && styles.filterChipTextActive,
              ]}
            >
              {type === "work"
                ? "Làm việc"
                : type === "leave"
                  ? "Nghỉ phép"
                  : type === "holiday"
                    ? "Lễ"
                    : "Tăng ca"}
            </Text>
          </TouchableOpacity>
        ))}

        {(selectedUser || selectedProject || selectedTypes.length > 0) && (
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={handleClearFilters}
          >
            <Ionicons name="close-circle" size={16} color="#EF4444" />
            <Text style={styles.clearFilterText}>Xóa filter</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Statistics Panel */}
      {showStats && statistics && (
        <View style={styles.statsPanel}>
          <TouchableOpacity
            style={styles.statsHeader}
            onPress={() => setShowStats(!showStats)}
          >
            <Text style={styles.statsTitle}>Thống kê</Text>
            <Ionicons
              name={showStats ? "chevron-up" : "chevron-down"}
              size={20}
              color="#6B7280"
            />
          </TouchableOpacity>
          {showStats && (
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{statistics.work_days}</Text>
                <Text style={styles.statLabel}>Ngày công</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {(statistics.total_hours || 0).toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>Giờ làm việc</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{statistics.leave_days}</Text>
                <Text style={styles.statLabel}>Nghỉ phép</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {statistics.holiday_days}
                </Text>
                <Text style={styles.statLabel}>Ngày lễ</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {(statistics.overtime_hours || 0).toFixed(1)}
                </Text>
                <Text style={styles.statLabel}>Giờ tăng ca</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Calendar/Week View */}
      <ScrollView style={styles.content}>
        {viewMode === "month" ? (
          <CalendarView
            schedules={schedules}
            month={currentMonth}
            year={currentYear}
            onDateSelect={handleDateSelect}
          />
        ) : (
          <WeekView
            schedules={schedules}
            weekStart={weekStart}
            onDateSelect={handleDateSelect}
            onWeekChange={handleWeekChange}
          />
        )}

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
                      Check-in:{" "}
                      {new Date(tracking.check_in_at).toLocaleTimeString(
                        "vi-VN"
                      )}
                    </Text>
                  </View>
                  {tracking.check_out_at && (
                    <View style={styles.detailRow}>
                      <Ionicons
                        name="log-out-outline"
                        size={16}
                        color="#EF4444"
                      />
                      <Text style={styles.detailText}>
                        Check-out:{" "}
                        {new Date(tracking.check_out_at).toLocaleTimeString(
                          "vi-VN"
                        )}
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

      {/* User Selection Modal */}
      <Modal
        visible={showUserModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn nhân viên</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm nhân viên..."
              value={userSearch}
              onChangeText={setUserSearch}
            />
            {loadingUsers ? (
              <ActivityIndicator size="large" color="#3B82F6" />
            ) : (
              <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.userItem,
                      selectedUser?.id === item.id && styles.userItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedUser(item);
                      setShowUserModal(false);
                      setUserSearch("");
                    }}
                  >
                    <Text style={styles.userName}>{item.name}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Project Selection Modal */}
      <Modal
        visible={showProjectModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProjectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn dự án</Text>
              <TouchableOpacity onPress={() => setShowProjectModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm dự án..."
              value={projectSearch}
              onChangeText={setProjectSearch}
            />
            {loadingProjects ? (
              <ActivityIndicator size="large" color="#3B82F6" />
            ) : (
              <FlatList
                data={filteredProjects}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.userItem,
                      selectedProject?.id === item.id &&
                      styles.userItemSelected,
                    ]}
                    onPress={() => {
                      setSelectedProject(item);
                      setShowProjectModal(false);
                      setProjectSearch("");
                    }}
                  >
                    <Text style={styles.userName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Single Create Modal */}
      <WorkScheduleForm
        visible={showSingleForm}
        initialDate={formInitialDate}
        onSubmit={handleSingleCreate}
        onCancel={() => {
          setShowSingleForm(false);
          setFormInitialDate(undefined);
        }}
      />

      {/* Bulk Create Modal */}
      <Modal
        visible={showBulkForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBulkForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bulkModalContent}>
            <BulkScheduleForm
              onSubmit={handleBulkCreate}
              onCancel={() => setShowBulkForm(false)}
            />
          </View>
        </View>
      </Modal>
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
  },
  header: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#3B82F6",
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  toggleButtonTextActive: {
    color: "#FFFFFF",
  },
  filterBar: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 8,
  },
  filterBarContent: {
    paddingHorizontal: 8,
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterChipTextActive: {
    color: "#3B82F6",
  },
  clearFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#EF4444",
  },
  statsPanel: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3B82F6",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  content: {
    flex: 1,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    padding: 16,
  },
  bulkModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 14,
  },
  userItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  userItemSelected: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  userEmail: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
});
