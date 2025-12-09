import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { payrollApi } from "@/api/payrollApi";

interface ExportButtonsProps {
  params?: {
    user_id?: number;
    period_start?: string;
    period_end?: string;
  };
}

export default function ExportButtons({ params }: ExportButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (format: "excel" | "pdf") => {
    try {
      setLoading(format);
      const response = await payrollApi.exportPayroll({
        format,
        ...params,
      });
      if (response.success) {
        Alert.alert("Thành công", `Đã export ${format.toUpperCase()}`);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể export");
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.excelButton]}
        onPress={() => handleExport("excel")}
        disabled={!!loading}
      >
        {loading === "excel" ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Export Excel</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.pdfButton]}
        onPress={() => handleExport("pdf")}
        disabled={!!loading}
      >
        {loading === "pdf" ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="document-outline" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Export PDF</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  excelButton: {
    backgroundColor: "#10B981",
  },
  pdfButton: {
    backgroundColor: "#EF4444",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
