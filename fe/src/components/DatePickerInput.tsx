import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, ViewStyle, TextStyle, Modal, SafeAreaView } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface DatePickerInputProps {
  label?: string | React.ReactNode;
  value: Date | string | null;
  onChange?: (date: Date | null) => void;
  onDateChange?: (date: string) => void; // For backward compatibility with string format
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: ViewStyle;
  labelStyle?: TextStyle;
  showLabel?: boolean;
}

export default function DatePickerInput({
  label,
  value,
  onChange,
  onDateChange,
  placeholder = "Chọn ngày",
  minimumDate,
  maximumDate,
  disabled = false,
  required = false,
  error,
  containerStyle,
  inputStyle,
  labelStyle,
  showLabel = true,
}: DatePickerInputProps) {
  const [showPicker, setShowPicker] = useState(false);

  // Convert value to Date if it's a string
  const getDateValue = (): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  };

  const dateValue = getDateValue();
  const [tempDate, setTempDate] = useState<Date>(dateValue || new Date());
  const insets = useSafeAreaInsets();

  // Update tempDate when value changes
  useEffect(() => {
    const newDateValue = getDateValue();
    if (newDateValue) {
      setTempDate(newDateValue);
    }
  }, [value]);

  const handlePress = () => {
    if (!disabled) {
      setTempDate(dateValue || new Date());
      setShowPicker(true);
    }
  };

  const handleConfirm = () => {
    if (onChange) {
      onChange(tempDate);
    }
    if (onDateChange) {
      onDateChange(tempDate.toISOString().split("T")[0]);
    }
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
    const currentDateValue = getDateValue();
    setTempDate(currentDateValue || new Date());
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {showLabel && label && (
        <View style={styles.labelContainer}>
          {typeof label === "string" ? (
            <Text style={[styles.label, labelStyle]}>
              {label}
              {required && <Text style={styles.required}> *</Text>}
            </Text>
          ) : (
            label
          )}
        </View>
      )}
      <TouchableOpacity
        style={[
          styles.selectButton,
          disabled && styles.disabled,
          error && styles.errorBorder,
          inputStyle,
        ]}
        onPress={handlePress}
        disabled={disabled}
      >
        <Text style={[styles.selectButtonText, !dateValue && styles.placeholder]}>
          {dateValue ? dateValue.toLocaleDateString("vi-VN") : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={disabled ? "#9CA3AF" : error ? "#EF4444" : "#6B7280"} />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={showPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancel}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn Ngày</Text>
              <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerContainer}>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={handleDateChange}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                locale="vi-VN"
              />
            </View>

            <View style={[styles.modalActions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>Xác Nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  required: {
    color: "#EF4444",
  },
  selectButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  disabled: {
    backgroundColor: "#F3F4F6",
    opacity: 0.6,
  },
  errorBorder: {
    borderColor: "#EF4444",
  },
  selectButtonText: {
    fontSize: 14,
    color: "#1F2937",
  },
  placeholder: {
    color: "#9CA3AF",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
  pickerContainer: {
    paddingVertical: 20,
    alignItems: "center",
    minHeight: 200,
    justifyContent: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
  },
  confirmButton: {
    backgroundColor: "#3B82F6",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
