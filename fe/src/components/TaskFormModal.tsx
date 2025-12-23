import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ProjectTask,
  CreateTaskData,
  UpdateTaskData,
  TaskStatus,
  TaskPriority,
} from "@/types/ganttTypes";
import { ProjectPhase } from "@/types/ganttTypes";

interface TaskFormModalProps {
  visible: boolean;
  task?: ProjectTask | null;
  phases: ProjectPhase[];
  onClose: () => void;
  onSubmit: (data: CreateTaskData | UpdateTaskData) => Promise<void>;
}

const STATUS_OPTIONS: TaskStatus[] = [
  "not_started",
  "in_progress",
  "completed",
  "cancelled",
  "on_hold",
];

const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high", "urgent"];

const STATUS_LABELS: { [key in TaskStatus]: string } = {
  not_started: "Chưa bắt đầu",
  in_progress: "Đang thực hiện",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  on_hold: "Tạm dừng",
};

const PRIORITY_LABELS: { [key in TaskPriority]: string } = {
  low: "Thấp",
  medium: "Trung bình",
  high: "Cao",
  urgent: "Khẩn cấp",
};

export default function TaskFormModal({
  visible,
  task,
  phases,
  onClose,
  onSubmit,
}: TaskFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [phaseId, setPhaseId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<TaskStatus>("not_started");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setName(task.name);
      setDescription(task.description || "");
      setPhaseId(task.phase_id || null);
      setStartDate(task.start_date ? new Date(task.start_date) : null);
      setEndDate(task.end_date ? new Date(task.end_date) : null);
      setProgress(task.progress_percentage);
      setStatus(task.status);
      setPriority(task.priority);
    } else {
      resetForm();
    }
  }, [task, visible]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setPhaseId(null);
    setStartDate(null);
    setEndDate(null);
    setProgress(0);
    setStatus("not_started");
    setPriority("medium");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên công việc");
      return;
    }

    try {
      setSubmitting(true);
      const data: CreateTaskData | UpdateTaskData = {
        name: name.trim(),
        description: description.trim() || undefined,
        phase_id: phaseId || undefined,
        start_date: startDate?.toISOString().split("T")[0],
        end_date: endDate?.toISOString().split("T")[0],
        progress_percentage: progress,
        status,
        priority,
      };

      await onSubmit(data);
      resetForm();
      onClose();
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể lưu công việc"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {task ? "Sửa công việc" : "Tạo công việc mới"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Tên công việc *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nhập tên công việc"
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Nhập mô tả"
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Phase */}
            <View style={styles.field}>
              <Text style={styles.label}>Giai đoạn</Text>
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    phaseId === null && styles.optionButtonActive,
                  ]}
                  onPress={() => setPhaseId(null)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      phaseId === null && styles.optionTextActive,
                    ]}
                  >
                    Không thuộc giai đoạn
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.optionsRow}>
                  {phases.map((phase) => (
                    <TouchableOpacity
                      key={phase.id}
                      style={[
                        styles.optionButton,
                        phaseId === phase.id && styles.optionButtonActive,
                      ]}
                      onPress={() => setPhaseId(phase.id)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          phaseId === phase.id && styles.optionTextActive,
                        ]}
                      >
                        {phase.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Dates */}
            <View style={styles.field}>
              <Text style={styles.label}>Ngày bắt đầu</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {startDate
                    ? startDate.toLocaleDateString("vi-VN")
                    : "Chọn ngày"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate || new Date()}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowStartDatePicker(false);
                    if (date) setStartDate(date);
                  }}
                />
              )}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Ngày kết thúc</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {endDate ? endDate.toLocaleDateString("vi-VN") : "Chọn ngày"}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate || new Date()}
                  mode="date"
                  display="default"
                  minimumDate={startDate || undefined}
                  onChange={(event, date) => {
                    setShowEndDatePicker(false);
                    if (date) setEndDate(date);
                  }}
                />
              )}
            </View>

            {/* Progress */}
            <View style={styles.field}>
              <Text style={styles.label}>Tiến độ: {progress}%</Text>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: `${progress}%` }]}
                  />
                </View>
                <TextInput
                  style={styles.progressInput}
                  value={progress.toString()}
                  onChangeText={(text) => {
                    const value = parseInt(text) || 0;
                    setProgress(Math.min(100, Math.max(0, value)));
                  }}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Status */}
            <View style={styles.field}>
              <Text style={styles.label}>Trạng thái</Text>
              <View style={styles.optionsRow}>
                {STATUS_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.optionButton,
                      status === s && styles.optionButtonActive,
                    ]}
                    onPress={() => setStatus(s)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        status === s && styles.optionTextActive,
                      ]}
                    >
                      {STATUS_LABELS[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Priority */}
            <View style={styles.field}>
              <Text style={styles.label}>Độ ưu tiên</Text>
              <View style={styles.optionsRow}>
                {PRIORITY_OPTIONS.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.optionButton,
                      priority === p && styles.optionButtonActive,
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        priority === p && styles.optionTextActive,
                      ]}
                    >
                      {PRIORITY_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Lưu</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  content: {
    padding: 16,
  },
  field: {
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
    fontSize: 14,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  dateText: {
    fontSize: 14,
    color: "#1F2937",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  progressInput: {
    width: 60,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 6,
    padding: 8,
    textAlign: "center",
    fontSize: 14,
  },
  optionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  optionButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  optionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
  },
  optionTextActive: {
    color: "#FFFFFF",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});

