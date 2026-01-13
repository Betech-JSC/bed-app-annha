import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Image,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { constructionLogApi, ConstructionLog } from "@/api/constructionLogApi";
import { ganttApi } from "@/api/ganttApi";
import { ProjectTask } from "@/types/ganttTypes";
import { Ionicons } from "@expo/vector-icons";
import UniversalFileUploader, { UploadedFile } from "@/components/UniversalFileUploader";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import DateTimePicker from "@react-native-community/datetimepicker";

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

export default function ConstructionLogsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const [logs, setLogs] = useState<ConstructionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedDateLog, setSelectedDateLog] = useState<ConstructionLog | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingLog, setEditingLog] = useState<ConstructionLog | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Partial<ProjectTask> | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  // BUSINESS RULE: Date is auto-set to current day and NOT editable
  const today = new Date().toISOString().split("T")[0];
  const [formData, setFormData] = useState({
    log_date: today, // Always set to today
    task_id: null as number | null,
    weather: "",
    personnel_count: "",
    completion_percentage: 0, // Use number for slider
    notes: "",
  });
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [minCompletionPercentage, setMinCompletionPercentage] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Helper function to ensure completion_percentage is always a valid number
  const getCompletionPercentage = (value: any): number => {
    if (value == null || value === undefined) return 0;
    const num = typeof value === 'number' ? value : Number(value);
    return isNaN(num) ? 0 : Math.max(0, Math.min(100, num));
  };

  useEffect(() => {
    loadLogs();
    loadTasks();
  }, [id]);

  useEffect(() => {
    if (currentMonth && currentYear) {
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const endDate = new Date(currentYear, currentMonth, 0).toISOString().split("T")[0];
      loadLogs(startDate, endDate);
    }
  }, [id, currentMonth, currentYear]);

  const loadLogs = async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true);
      const response = await constructionLogApi.getLogs(id!, {
        start_date: startDate,
        end_date: endDate,
      });
      if (response.success) {
        setLogs(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    try {
      setLoadingTasks(true);
      // BUSINESS RULE: Only load leaf tasks (tasks without children)
      // Parent tasks (A) progress is auto-calculated from children
      const response = await ganttApi.getTasks(id!, { leaf_only: true });
      if (response.success) {
        const allTasks = response.data.data || response.data || [];
        // Additional filter on frontend to ensure only leaf tasks
        const leafTasks = Array.isArray(allTasks)
          ? allTasks.filter((task: ProjectTask) => {
            // Check if task has children by checking if any other task has this as parent
            const hasChildren = allTasks.some((t: ProjectTask) => (t as any).parent_id === task.id);
            return !hasChildren;
          })
          : [];
        setTasks(leafTasks);
      }
    } catch (error) {
      console.error("Error loading tasks:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const openEditModal = (log: ConstructionLog) => {
    setEditingLog(log);
    // BUSINESS RULE: When editing, allow selecting date in the past, but not future
    // Use the log's original date as default
    const logDate = log.log_date.split('T')[0]; // Get date part only
    setFormData({
      log_date: logDate, // Use log's date, can be edited to past dates
      task_id: log.task_id || null,
      weather: log.weather || "",
      personnel_count: log.personnel_count?.toString() || "",
      completion_percentage: getCompletionPercentage(log.completion_percentage),
      notes: log.notes || "",
    });
    setSelectedTask(log.task || null);

    // Calculate minimum completion percentage (last recorded % for this task)
    const taskId = log.task_id;
    if (taskId) {
      const taskLogs = logs
        .filter(l => l.task_id === taskId && l.id !== log.id)
        .sort((a, b) => {
          const dateA = new Date(a.log_date).getTime();
          const dateB = new Date(b.log_date).getTime();
          return dateB - dateA;
        });
      const lastLog = taskLogs.find(l => l.completion_percentage != null);
      setMinCompletionPercentage(getCompletionPercentage(lastLog?.completion_percentage ?? log.completion_percentage));
    } else {
      setMinCompletionPercentage(getCompletionPercentage(log.completion_percentage));
    }

    setUploadedFiles(
      (log.attachments || []).map((att: any) => ({
        id: att.id,
        attachment_id: att.id,
        file_name: att.file_name,
        file_path: att.file_path,
        file_size: att.file_size,
        mime_type: att.mime_type,
        file_url: att.file_path ? `http://localhost:8000/storage/${att.file_path}` : att.file_url,
      }))
    );
    setModalVisible(true);
  };

  const handleDelete = async (log: ConstructionLog) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc chắn muốn xóa nhật ký này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await constructionLogApi.deleteLog(id!, log.id);
              if (response.success) {
                Alert.alert("Thành công", "Đã xóa nhật ký");
                loadLogs();
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa nhật ký");
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!formData.log_date) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày");
      return;
    }

    try {
      const attachmentIds = uploadedFiles
        .filter(f => f.attachment_id || f.id)
        .map(f => f.attachment_id || f.id!);

      // BUSINESS RULE: Use selected date (can be today or past date, but not future)
      const logDate = formData.log_date;

      const data = {
        log_date: logDate,
        task_id: formData.task_id || undefined,
        weather: formData.weather || undefined,
        personnel_count: formData.personnel_count
          ? parseInt(formData.personnel_count)
          : undefined,
        completion_percentage: formData.completion_percentage > 0
          ? formData.completion_percentage
          : undefined,
        notes: formData.notes || undefined,
        attachment_ids: attachmentIds.length > 0 ? attachmentIds : undefined,
      };

      let response;
      if (editingLog) {
        response = await constructionLogApi.updateLog(id!, editingLog.id, data);
      } else {
        response = await constructionLogApi.createLog(id!, data);
      }

      if (response.success) {
        Alert.alert("Thành công", editingLog ? "Nhật ký đã được cập nhật." : "Nhật ký đã được tạo.");
        handleCloseModal();
        loadLogs();
        loadTasks(); // Reload tasks to get updated progress
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setEditingLog(null);
    setSelectedTask(null);
    setShowDatePicker(false);
    setFormData({
      log_date: today, // Default to today for new logs
      task_id: null,
      weather: "",
      personnel_count: "",
      completion_percentage: 0,
      notes: "",
    });
    setMinCompletionPercentage(0);
    setUploadedFiles([]);
  };

  const handleDateClick = (dateString: string) => {
    // Normalize dateString và tìm log với log_date đã normalize
    const log = logs.find(l => {
      const normalizedLogDate = l.log_date.split('T')[0].split(' ')[0];
      return normalizedLogDate === dateString;
    });
    if (log) {
      // If log exists, open edit modal (can edit date to past dates)
      openEditModal(log);
    } else {
      // BUSINESS RULE: Allow creating logs for today or past dates, but not future
      const clickedDate = new Date(dateString);
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      clickedDate.setHours(0, 0, 0, 0);

      if (clickedDate.getTime() <= todayDate.getTime()) {
        // Allow creating log for today or past dates
        setFormData(prev => ({ ...prev, log_date: dateString }));
        setSelectedDate(dateString);
        setMinCompletionPercentage(0);
        setEditingLog(null); // New log
        setModalVisible(true);
      } else {
        // Cannot create logs for future dates
        Alert.alert(
          "Thông báo",
          "Không thể tạo nhật ký cho ngày tương lai. Vui lòng chọn ngày hôm nay hoặc ngày trong quá khứ."
        );
      }
    }
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
    const todayDate = new Date();
    setCurrentMonth(todayDate.getMonth() + 1);
    setCurrentYear(todayDate.getFullYear());
  };

  // Tạo map các ngày có log
  const logsByDate = useMemo(() => {
    const map: Record<string, ConstructionLog> = {};
    logs.forEach(log => {
      // Normalize log_date to YYYY-MM-DD format (remove time part if exists)
      const normalizedDate = log.log_date.split('T')[0].split(' ')[0];
      map[normalizedDate] = log;
    });
    return map;
  }, [logs]);

  // Tạo calendar data
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
      hasLog: boolean;
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
        hasLog: false,
      });
    }

    // Add days of the current month
    const todayDate = new Date();
    const todayString = todayDate.toISOString().split("T")[0];
    for (let i = 1; i <= daysInMonth; i++) {
      const dateString = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
      const isToday = dateString === todayString;
      const hasLog = !!logsByDate[dateString];

      days.push({
        date: i,
        dateString,
        isCurrentMonth: true,
        isToday,
        hasLog,
      });
    }

    return days;
  }, [currentYear, currentMonth, logsByDate]);

  if (loading && logs.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Nhật Ký Công Trình"
        showBackButton
        rightComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              handleCloseModal();
              setModalVisible(true);
            }}
          >
            <Ionicons name="add" size={24} color="#3B82F6" />
          </TouchableOpacity>
        }
      />

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === "calendar" && styles.viewModeButtonActive]}
          onPress={() => setViewMode("calendar")}
        >
          <Ionicons name="calendar-outline" size={20} color={viewMode === "calendar" ? "#FFFFFF" : "#6B7280"} />
          <Text style={[styles.viewModeText, viewMode === "calendar" && styles.viewModeTextActive]}>
            Lịch
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === "list" && styles.viewModeButtonActive]}
          onPress={() => setViewMode("list")}
        >
          <Ionicons name="list-outline" size={20} color={viewMode === "list" ? "#FFFFFF" : "#6B7280"} />
          <Text style={[styles.viewModeText, viewMode === "list" && styles.viewModeTextActive]}>
            Danh sách
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === "calendar" ? (
        <ScrollView style={styles.content}>
          {/* Calendar Header */}
          <View style={styles.calendarHeader}>
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
            {calendarData.map((day, index) => {
              // BUSINESS RULE: Always highlight today
              const isTodayDate = day.dateString === today;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayCell,
                    !day.isCurrentMonth && styles.dayCellDisabled,
                    isTodayDate && styles.dayCellToday,
                    day.hasLog && !isTodayDate && styles.dayCellHasLog,
                    !day.hasLog && day.isCurrentMonth && !isTodayDate && styles.dayCellNoLog,
                  ]}
                  onPress={() => {
                    if (day.isCurrentMonth) {
                      handleDateClick(day.dateString);
                    }
                  }}
                  disabled={!day.isCurrentMonth}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !day.isCurrentMonth && styles.dayTextDisabled,
                      isTodayDate && styles.dayTextToday,
                      day.hasLog && !isTodayDate && styles.dayTextHasLog,
                      !day.hasLog && day.isCurrentMonth && !isTodayDate && styles.dayTextNoLog,
                    ]}
                  >
                    {day.date}
                  </Text>
                  {isTodayDate && (
                    <View style={styles.todayIndicator} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
              <Text style={styles.legendText}>Có báo cáo</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
              <Text style={styles.legendText}>Không có báo cáo</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={logs}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.logCard}
              onPress={() => {
                setSelectedDateLog(item);
                setSelectedDate(item.log_date);
                setDetailModalVisible(true);
              }}
            >
              <View style={styles.logCardContent}>
                {/* Preview files bên trái - Compact */}
                {item.attachments && item.attachments.length > 0 && (
                  <View style={styles.logCardLeft}>
                    {item.attachments.slice(0, 2).map((attachment: any, index: number) => (
                      <View key={attachment.id || index} style={styles.logCardAttachmentItem}>
                        {attachment.mime_type?.startsWith("image/") ? (
                          <Image
                            source={{
                              uri: attachment.file_path
                                ? `http://localhost:8000/storage/${attachment.file_path}`
                                : attachment.file_url
                            }}
                            style={styles.logCardAttachmentImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.logCardAttachmentFile}>
                            <Ionicons name="document-outline" size={16} color="#3B82F6" />
                          </View>
                        )}
                      </View>
                    ))}
                    {item.attachments.length > 2 && (
                      <View style={styles.logCardAttachmentMore}>
                        <Text style={styles.logCardAttachmentMoreText}>
                          +{item.attachments.length - 2}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Nội dung bên phải - Compact */}
                <View style={styles.logCardRight}>
                  {/* Header với ngày và actions */}
                  <View style={styles.logHeader}>
                    <View style={styles.logHeaderLeft}>
                      <Text style={styles.logDate} numberOfLines={1}>
                        {new Date(item.log_date).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </Text>
                      {item.completion_percentage > 0 && (
                        <View style={styles.progressBadge}>
                          <Text style={styles.progressText}>
                            {item.completion_percentage}%
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.logActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          openEditModal(item);
                        }}
                      >
                        <Ionicons name="create-outline" size={18} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDelete(item);
                        }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Task name - Compact */}
                  {item.task && (
                    <View style={styles.taskInfo}>
                      <Ionicons name="checkmark-circle-outline" size={14} color="#3B82F6" />
                      <Text style={styles.taskName} numberOfLines={1}>
                        {item.task.name}
                      </Text>
                    </View>
                  )}

                  {/* Details - Inline compact */}
                  {(item.weather || item.personnel_count) && (
                    <View style={styles.logDetails}>
                      {item.weather && (
                        <View style={styles.detailRow}>
                          <Ionicons name="partly-sunny-outline" size={14} color="#6B7280" />
                          <Text style={styles.detailText} numberOfLines={1}>
                            {item.weather}
                          </Text>
                        </View>
                      )}
                      {item.personnel_count && (
                        <View style={styles.detailRow}>
                          <Ionicons name="people-outline" size={14} color="#6B7280" />
                          <Text style={styles.detailText}>
                            {item.personnel_count} người
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Notes - Compact */}
                  {item.notes && (
                    <Text style={styles.notes} numberOfLines={1}>
                      {item.notes}
                    </Text>
                  )}

                  {/* Attachments count - Compact */}
                  {item.attachments && item.attachments.length > 0 && (
                    <View style={styles.attachmentsCountRow}>
                      <Ionicons name="images-outline" size={12} color="#6B7280" />
                      <Text style={styles.attachmentsCountText}>
                        {item.attachments.length} ảnh
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có nhật ký nào</Text>
            </View>
          }
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseModal}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingLog ? "Chỉnh Sửa Nhật Ký" : "Thêm Nhật Ký"}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Ngày *</Text>
              {/* BUSINESS RULE: Allow selecting date in the past, but not future */}
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.selectButtonText}>
                  {new Date(formData.log_date).toLocaleDateString("vi-VN")}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
              </TouchableOpacity>
              <Text style={styles.helperText}>
                {editingLog
                  ? "Có thể chọn ngày trong quá khứ để chỉnh sửa nhật ký"
                  : "Có thể chọn ngày hôm nay hoặc ngày trong quá khứ. Không thể chọn ngày tương lai."}
              </Text>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(formData.log_date)}
                  mode="date"
                  display="default"
                  maximumDate={new Date()} // Cannot select future dates
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      const dateString = selectedDate.toISOString().split('T')[0];
                      setFormData(prev => ({ ...prev, log_date: dateString }));
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tiến độ công việc</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => {
                  loadTasks();
                  setShowTaskPicker(true);
                }}
              >
                <Text style={[
                  styles.selectButtonText,
                  !selectedTask && styles.selectButtonTextPlaceholder
                ]}>
                  {selectedTask ? selectedTask.name : "Chọn tiến độ công việc"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
              {selectedTask && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => {
                    setSelectedTask(null);
                    setFormData({ ...formData, task_id: null });
                  }}
                >
                  <Ionicons name="close-circle" size={16} color="#EF4444" />
                  <Text style={styles.clearButtonText}>Xóa lựa chọn</Text>
                </TouchableOpacity>
              )}
            </View>

            {selectedTask && (
              <View style={styles.formGroup}>
                <View style={styles.sliderHeader}>
                  <Text style={styles.label}>% Hoàn thành</Text>
                  <Text style={styles.sliderValue}>
                    {getCompletionPercentage(formData.completion_percentage).toFixed(0)}%
                  </Text>
                </View>
                {/* BUSINESS RULE: Use slider input, value can ONLY increase, minimum = last recorded %} */}
                <View style={styles.sliderContainer}>
                  <View style={styles.sliderTrack}>
                    <View
                      style={[
                        styles.sliderFill,
                        { width: `${((getCompletionPercentage(formData.completion_percentage) - minCompletionPercentage) / (100 - minCompletionPercentage)) * 100}%` }
                      ]}
                    />
                    <View
                      style={[
                        styles.sliderThumb,
                        { left: `${((getCompletionPercentage(formData.completion_percentage) - minCompletionPercentage) / (100 - minCompletionPercentage)) * 100}%` }
                      ]}
                    />
                  </View>
                  <View style={styles.sliderInputContainer}>
                    <TouchableOpacity
                      style={styles.sliderButton}
                      onPress={() => {
                        const currentValue = getCompletionPercentage(formData.completion_percentage);
                        const newValue = Math.max(minCompletionPercentage, currentValue - 1);
                        setFormData({ ...formData, completion_percentage: newValue });
                      }}
                      disabled={getCompletionPercentage(formData.completion_percentage) <= minCompletionPercentage}
                    >
                      <Ionicons
                        name="remove-circle-outline"
                        size={24}
                        color={getCompletionPercentage(formData.completion_percentage) <= minCompletionPercentage ? "#D1D5DB" : "#3B82F6"}
                      />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.sliderInput}
                      value={getCompletionPercentage(formData.completion_percentage).toFixed(0)}
                      onChangeText={(text) => {
                        const numValue = parseInt(text) || minCompletionPercentage;
                        const newValue = Math.max(minCompletionPercentage, Math.min(100, numValue));
                        setFormData({ ...formData, completion_percentage: newValue });
                      }}
                      keyboardType="numeric"
                      editable={true}
                    />
                    <Text style={styles.sliderPercent}>%</Text>
                    <TouchableOpacity
                      style={styles.sliderButton}
                      onPress={() => {
                        const currentValue = getCompletionPercentage(formData.completion_percentage);
                        const newValue = Math.min(100, currentValue + 1);
                        setFormData({ ...formData, completion_percentage: newValue });
                      }}
                      disabled={getCompletionPercentage(formData.completion_percentage) >= 100}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={24}
                        color={getCompletionPercentage(formData.completion_percentage) >= 100 ? "#D1D5DB" : "#3B82F6"}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabel}>
                    Tối thiểu: {minCompletionPercentage}%
                  </Text>
                  <Text style={styles.sliderLabel}>100%</Text>
                </View>
                <Text style={styles.helperText}>
                  Phần trăm hoàn thành chỉ có thể tăng. Giá trị tối thiểu: {minCompletionPercentage}%
                </Text>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Thời tiết</Text>
              <TextInput
                style={styles.input}
                value={formData.weather}
                onChangeText={(text) =>
                  setFormData({ ...formData, weather: text })
                }
                placeholder="Ví dụ: Nắng, Mưa..."
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Số nhân sự</Text>
              <TextInput
                style={styles.input}
                value={formData.personnel_count}
                onChangeText={(text) =>
                  setFormData({ ...formData, personnel_count: text })
                }
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ghi chú</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) =>
                  setFormData({ ...formData, notes: text })
                }
                placeholder="Nhập ghi chú..."
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Hình ảnh thực tế tại công trình</Text>
              <UniversalFileUploader
                onUploadComplete={(files) => {
                  setUploadedFiles(files);
                }}
                multiple={true}
                accept="image"
                maxFiles={10}
                initialFiles={uploadedFiles}
                label="Chọn hình ảnh..."
                showPreview={true}
              />

            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>
                  {editingLog ? "Cập nhật" : "Tạo"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Task Picker Modal */}
          {showTaskPicker && (
            <View style={styles.pickerModalOverlay}>
              <View style={styles.pickerModalContainer}>
                <View style={styles.pickerModalHeader}>
                  <Text style={styles.pickerModalTitle}>Chọn Tiến Độ Công Việc</Text>
                  <TouchableOpacity onPress={() => setShowTaskPicker(false)}>
                    <Ionicons name="close" size={24} color="#1F2937" />
                  </TouchableOpacity>
                </View>
                {loadingTasks ? (
                  <View style={styles.pickerLoadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                  </View>
                ) : (
                  <FlatList
                    data={tasks}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.taskItem,
                          selectedTask?.id === item.id && styles.taskItemActive,
                        ]}
                        onPress={() => {
                          setSelectedTask(item);
                          setFormData({ ...formData, task_id: item.id });

                          // Calculate minimum completion percentage (last recorded % for this task)
                          const taskLogs = logs
                            .filter(l => l.task_id === item.id)
                            .sort((a, b) => {
                              const dateA = new Date(a.log_date).getTime();
                              const dateB = new Date(b.log_date).getTime();
                              return dateB - dateA;
                            });
                          const lastLog = taskLogs.find(l => l.completion_percentage != null);
                          const minPercentage = getCompletionPercentage(lastLog?.completion_percentage);
                          setMinCompletionPercentage(minPercentage);
                          setFormData(prev => ({ ...prev, completion_percentage: minPercentage }));

                          setShowTaskPicker(false);
                        }}
                      >
                        <View style={styles.taskItemContent}>
                          <Text
                            style={[
                              styles.taskItemName,
                              selectedTask?.id === item.id && styles.taskItemNameActive,
                            ]}
                          >
                            {item.name}
                          </Text>
                          {item.progress_percentage !== undefined && (
                            <Text style={styles.taskItemProgress}>
                              Tiến độ: {item.progress_percentage}%
                            </Text>
                          )}
                        </View>
                        {selectedTask?.id === item.id && (
                          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                        )}
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <View style={styles.pickerEmptyContainer}>
                        <Ionicons name="list-outline" size={48} color="#D1D5DB" />
                        <Text style={styles.pickerEmptyText}>Chưa có công việc nào</Text>
                      </View>
                    }
                  />
                )}
              </View>
            </View>
          )}
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setDetailModalVisible(false);
          setSelectedDateLog(null);
          setSelectedDate(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setDetailModalVisible(false);
                setSelectedDateLog(null);
                setSelectedDate(null);
              }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedDate ? new Date(selectedDate).toLocaleDateString("vi-VN") : "Chi tiết nhật ký"}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalScroll}>
            {selectedDateLog ? (
              <>
                {selectedDateLog.task && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Tiến độ công việc</Text>
                    <Text style={styles.detailValue}>{selectedDateLog.task.name}</Text>
                    {selectedDateLog.task.progress_percentage !== undefined && (
                      <Text style={styles.detailLabel}>
                        Tiến độ: {selectedDateLog.task.progress_percentage}%
                      </Text>
                    )}
                  </View>
                )}

                {selectedDateLog.completion_percentage > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>% Hoàn thành</Text>
                    <Text style={styles.detailValue}>{selectedDateLog.completion_percentage}%</Text>
                  </View>
                )}

                {selectedDateLog.weather && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Thời tiết</Text>
                    <Text style={styles.detailValue}>{selectedDateLog.weather}</Text>
                  </View>
                )}

                {selectedDateLog.personnel_count && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Số nhân sự</Text>
                    <Text style={styles.detailValue}>{selectedDateLog.personnel_count} người</Text>
                  </View>
                )}

                {selectedDateLog.notes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Ghi chú</Text>
                    <Text style={styles.detailValue}>{selectedDateLog.notes}</Text>
                  </View>
                )}

                {selectedDateLog.attachments && selectedDateLog.attachments.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Hình ảnh thực tế</Text>
                    <View style={styles.imagesGrid}>
                      {selectedDateLog.attachments.map((attachment: any, index: number) => (
                        <View key={attachment.id || index} style={styles.imageItem}>
                          {attachment.mime_type?.startsWith("image/") ? (
                            <Image
                              source={{ uri: attachment.file_path ? `http://localhost:8000/storage/${attachment.file_path}` : attachment.file_url }}
                              style={styles.detailImage}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.detailFile}>
                              <Ionicons name="document-outline" size={32} color="#3B82F6" />
                              <Text style={styles.detailFileName} numberOfLines={2}>
                                {attachment.file_name || "File"}
                              </Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <View style={styles.detailActions}>
                  <TouchableOpacity
                    style={[styles.detailActionButton, styles.editButton]}
                    onPress={() => {
                      setDetailModalVisible(false);
                      openEditModal(selectedDateLog);
                    }}
                  >
                    <Ionicons name="create-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.detailActionButtonText}>Chỉnh sửa</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.detailActionButton, styles.deleteButton]}
                    onPress={() => {
                      setDetailModalVisible(false);
                      handleDelete(selectedDateLog);
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.detailActionButtonText}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>Chưa có nhật ký cho ngày này</Text>
                {/* BUSINESS RULE: Only allow creating logs for today */}
                {selectedDate === today && (
                  <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => {
                      setDetailModalVisible(false);
                      setFormData(prev => ({ ...prev, log_date: today }));
                      setMinCompletionPercentage(0);
                      setModalVisible(true);
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.createButtonText}>Tạo nhật ký</Text>
                  </TouchableOpacity>
                )}
                {selectedDate !== today && (
                  <Text style={styles.helperText}>
                    Chỉ có thể tạo nhật ký cho ngày hôm nay
                  </Text>
                )}
              </View>
            )}
          </ScrollView>
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
    backgroundColor: "#F9FAFB",
  },
  addButton: {
    padding: 4,
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
  content: {
    flex: 1,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
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
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    marginBottom: 16,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
  daysOfWeekContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  dayOfWeek: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayOfWeekText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  dayCellDisabled: {
    backgroundColor: "#F9FAFB",
    opacity: 0.3,
  },
  dayCellToday: {
    borderColor: "#3B82F6",
    borderWidth: 2,
  },
  dayCellHasLog: {
    backgroundColor: "#10B981",
  },
  dayCellNoLog: {
    backgroundColor: "#EF4444",
  },
  dayText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
  },
  dayTextDisabled: {
    color: "#9CA3AF",
  },
  dayTextToday: {
    fontWeight: "700",
    color: "#3B82F6",
  },
  dayTextHasLog: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dayTextNoLog: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  todayIndicator: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#3B82F6",
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    padding: 16,
    backgroundColor: "#FFFFFF",
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
    fontSize: 12,
    color: "#6B7280",
  },
  listContent: {
    padding: 16,
  },
  logCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    overflow: "hidden",
  },
  logCardContent: {
    flexDirection: "row",
    padding: 12,
    minHeight: 80,
  },
  logCardLeft: {
    width: 70,
    marginRight: 10,
    gap: 6,
  },
  logCardAttachmentItem: {
    marginBottom: 4,
  },
  logCardAttachmentImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
  },
  logCardAttachmentFile: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  logCardAttachmentMore: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  logCardAttachmentMoreText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280",
  },
  logCardRight: {
    flex: 1,
    minWidth: 0, // Prevent overflow
  },
  attachmentsCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  attachmentsCountText: {
    fontSize: 11,
    color: "#6B7280",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  logHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minWidth: 0, // Prevent overflow
  },
  logActions: {
    flexDirection: "row",
    gap: 4,
    marginLeft: 8,
  },
  actionButton: {
    padding: 4,
  },
  logDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flexShrink: 1,
  },
  progressBadge: {
    backgroundColor: "#3B82F620",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3B82F6",
  },
  taskInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
    padding: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 6,
  },
  taskName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3B82F6",
    flex: 1,
  },
  logDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: "#6B7280",
    flexShrink: 1,
  },
  notes: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
    marginTop: 4,
  },
  attachmentsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  attachmentsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  attachmentsScroll: {
    marginTop: 8,
  },
  attachmentItem: {
    marginRight: 8,
    position: "relative",
  },
  attachmentImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  attachmentFile: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  attachmentFileName: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    position: "relative",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
    textAlign: "center",
    marginLeft: -24,
  },
  modalScroll: {
    flex: 1,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    minHeight: 48,
  },
  selectButtonText: {
    fontSize: 16,
    color: "#1F2937",
    flex: 1,
  },
  selectButtonTextPlaceholder: {
    color: "#9CA3AF",
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  clearButtonText: {
    fontSize: 12,
    color: "#EF4444",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
  },
  cancelButtonText: {
    color: "#1F2937",
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  pickerModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    zIndex: 9999,
    elevation: 9999,
  },
  pickerModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    zIndex: 10000,
    elevation: 10000,
  },
  pickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  pickerLoadingContainer: {
    padding: 32,
    alignItems: "center",
  },
  pickerEmptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  pickerEmptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  taskItemActive: {
    backgroundColor: "#EFF6FF",
  },
  taskItemContent: {
    flex: 1,
  },
  taskItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  taskItemNameActive: {
    color: "#3B82F6",
  },
  taskItemProgress: {
    fontSize: 12,
    color: "#6B7280",
  },
  detailSection: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  imagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
  },
  imageItem: {
    width: "48%",
    aspectRatio: 1,
  },
  detailImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  detailFile: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  detailFileName: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  detailActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  detailActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 8,
  },
  editButton: {
    backgroundColor: "#3B82F6",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
  detailActionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
    marginTop: 24,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  disabledInput: {
    backgroundColor: "#F3F4F6",
    opacity: 0.7,
  },
  disabledText: {
    color: "#6B7280",
  },
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sliderValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3B82F6",
  },
  sliderContainer: {
    marginVertical: 8,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    position: "relative",
    marginBottom: 16,
  },
  sliderFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  sliderThumb: {
    position: "absolute",
    top: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3B82F6",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    marginLeft: -12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  sliderInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  sliderButton: {
    padding: 4,
  },
  sliderInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "center",
    minWidth: 60,
    backgroundColor: "#FFFFFF",
  },
  sliderPercent: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sliderLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  uploadedImagesContainer: {
    marginTop: 12,
  },
  uploadedImagesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  uploadedImagesScroll: {
    marginTop: 8,
  },
  uploadedImageItem: {
    marginRight: 12,
    position: "relative",
  },
  uploadedImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  uploadedFileIcon: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
  },
});
