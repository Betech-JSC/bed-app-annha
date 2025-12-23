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
import { AcceptanceItem } from "@/api/acceptanceApi";

interface AcceptanceItemFormProps {
  visible: boolean;
  item?: AcceptanceItem | null;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    start_date: string;
    end_date: string;
    notes?: string;
  }) => Promise<void>;
}

export default function AcceptanceItemForm({
  visible,
  item,
  onClose,
  onSubmit,
}: AcceptanceItemFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || "");
      setStartDate(new Date(item.start_date));
      setEndDate(new Date(item.end_date));
      setNotes(item.notes || "");
    } else {
      resetForm();
    }
  }, [item, visible]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setStartDate(new Date());
    setEndDate(new Date());
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên hạng mục");
      return;
    }

    if (endDate < startDate) {
      Alert.alert("Lỗi", "Ngày kết thúc phải sau ngày bắt đầu");
      return;
    }

    try {
      setSubmitting(true);
      const data = {
        name: name.trim(),
        description: description.trim() || undefined,
        start_date: startDate.toISOString().split("T")[0],
        end_date: endDate.toISOString().split("T")[0],
        notes: notes.trim() || undefined,
      };

      await onSubmit(data);
      resetForm();
      onClose();
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể lưu hạng mục"
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
              {item ? "Sửa hạng mục" : "Tạo hạng mục mới"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Tên hạng mục *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Nhập tên hạng mục"
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

            {/* Start Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Ngày bắt đầu *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {startDate.toLocaleDateString("vi-VN")}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowStartDatePicker(false);
                    if (date) {
                      setStartDate(date);
                      if (date > endDate) {
                        setEndDate(date);
                      }
                    }
                  }}
                />
              )}
            </View>

            {/* End Date */}
            <View style={styles.field}>
              <Text style={styles.label}>Ngày kết thúc *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {endDate.toLocaleDateString("vi-VN")}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="default"
                  minimumDate={startDate}
                  onChange={(event, date) => {
                    setShowEndDatePicker(false);
                    if (date) setEndDate(date);
                  }}
                />
              )}
            </View>

            {/* Notes */}
            <View style={styles.field}>
              <Text style={styles.label}>Ghi chú</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Nhập ghi chú (tùy chọn)"
                multiline
                numberOfLines={3}
              />
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

