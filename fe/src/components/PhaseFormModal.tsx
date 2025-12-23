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
  ProjectPhase,
  CreatePhaseData,
  UpdatePhaseData,
  PhaseStatus,
} from "@/types/ganttTypes";

interface PhaseFormModalProps {
  visible: boolean;
  phase?: ProjectPhase | null;
  onClose: () => void;
  onSubmit: (data: CreatePhaseData | UpdatePhaseData) => Promise<void>;
}

const STATUS_OPTIONS: PhaseStatus[] = [
  "planning",
  "in_progress",
  "completed",
  "cancelled",
];

const STATUS_LABELS: { [key in PhaseStatus]: string } = {
  planning: "Lập kế hoạch",
  in_progress: "Đang thực hiện",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export default function PhaseFormModal({
  visible,
  phase,
  onClose,
  onSubmit,
}: PhaseFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [status, setStatus] = useState<PhaseStatus>("planning");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (phase) {
      setName(phase.name);
      setDescription(phase.description || "");
      setStartDate(phase.start_date ? new Date(phase.start_date) : null);
      setEndDate(phase.end_date ? new Date(phase.end_date) : null);
      setStatus(phase.status);
    } else {
      resetForm();
    }
  }, [phase, visible]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setStartDate(null);
    setEndDate(null);
    setStatus("planning");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên giai đoạn");
      return;
    }

    try {
      setSubmitting(true);
      const data: CreatePhaseData | UpdatePhaseData = {
        name: name.trim(),
        description: description.trim() || undefined,
        start_date: startDate?.toISOString().split("T")[0],
        end_date: endDate?.toISOString().split("T")[0],
        status,
      };

      await onSubmit(data);
      resetForm();
      onClose();
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể lưu giai đoạn"
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
              {phase ? "Sửa giai đoạn" : "Tạo giai đoạn mới"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Tên giai đoạn *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nhập tên giai đoạn"
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

