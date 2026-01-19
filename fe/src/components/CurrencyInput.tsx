import React, { useState, useEffect, ReactNode } from "react";
import { TextInput, TextInputProps, View, Text, StyleSheet } from "react-native";

interface CurrencyInputProps extends Omit<TextInputProps, "value" | "onChangeText" | "keyboardType"> {
  value: number | null | undefined;
  onChangeText: (value: number) => void;
  label?: string | ReactNode;
  error?: string;
  helperText?: string;
}

/**
 * Component input tiền tệ với format VND
 * - Hiển thị số tiền với dấu . ngăn cách hàng nghìn (ví dụ: 1.000.000)
 * - Lưu giá trị số thực (number) vào state
 * - Type là number
 */
export default function CurrencyInput({
  value,
  onChangeText,
  label,
  error,
  helperText,
  style,
  ...props
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState("");

  // Format số tiền theo định dạng VND (1.000.000)
  const formatCurrency = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined || isNaN(amount) || amount === 0) {
      return "";
    }
    return new Intl.NumberFormat("vi-VN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Parse chuỗi đã format về số
  const parseCurrency = (text: string): number => {
    // Loại bỏ tất cả dấu . và khoảng trắng
    const cleaned = text.replace(/\./g, "").replace(/\s/g, "");
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Cập nhật displayValue khi value thay đổi từ bên ngoài
  useEffect(() => {
    if (value !== null && value !== undefined && value > 0) {
      setDisplayValue(formatCurrency(value));
    } else {
      setDisplayValue("");
    }
  }, [value]);

  const handleChangeText = (text: string) => {
    // Cho phép xóa hết
    if (text === "") {
      setDisplayValue("");
      onChangeText(0);
      return;
    }

    // Chỉ cho phép số và dấu .
    const cleaned = text.replace(/[^\d.]/g, "");
    
    // Loại bỏ các dấu . không hợp lệ (chỉ giữ lại dấu . ngăn cách hàng nghìn)
    // Tạm thời cho phép user nhập số tự do, sau đó format lại
    const numericValue = parseCurrency(cleaned);
    
    // Format lại để hiển thị
    const formatted = formatCurrency(numericValue);
    setDisplayValue(formatted);
    
    // Gọi onChangeText với giá trị số
    onChangeText(numericValue);
  };

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelContainer}>
          {typeof label === "string" ? (
            <Text style={styles.label}>{label}</Text>
          ) : (
            label
          )}
        </View>
      )}
      <TextInput
        {...props}
        style={[styles.input, error && styles.inputError, style]}
        value={displayValue}
        onChangeText={handleChangeText}
        keyboardType="numeric"
        placeholder={props.placeholder || "0"}
        placeholderTextColor="#9CA3AF"
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
      {helperText && !error && <Text style={styles.helperText}>{helperText}</Text>}
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
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  inputError: {
    borderColor: "#EF4444",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
});
