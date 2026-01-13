import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform, ViewStyle, TextStyle } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

interface DatePickerInputProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
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

  const handlePress = () => {
    if (!disabled) {
      setShowPicker(true);
    }
  };

  const handleChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "set" && selectedDate) {
        onChange(selectedDate);
      }
    } else {
      // iOS
      if (event.type === "set" && selectedDate) {
        onChange(selectedDate);
        setShowPicker(false);
      } else if (event.type === "dismissed") {
        setShowPicker(false);
      }
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {showLabel && label && (
        <Text style={[styles.label, labelStyle]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
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
        <Text style={[styles.selectButtonText, !value && styles.placeholder]}>
          {value ? value.toLocaleDateString("vi-VN") : placeholder}
        </Text>
        <Ionicons name="calendar-outline" size={20} color={disabled ? "#9CA3AF" : error ? "#EF4444" : "#6B7280"} />
      </TouchableOpacity>
      {error && <Text style={styles.errorText}>{error}</Text>}
      {showPicker && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
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
});
