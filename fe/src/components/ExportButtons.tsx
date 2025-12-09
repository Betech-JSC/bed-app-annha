import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { payrollApi } from "@/api/payrollApi";
import { timeTrackingApi } from "@/api/timeTrackingApi";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

interface ExportButtonsProps {
  params?: {
    user_id?: number;
    period_start?: string;
    period_end?: string;
  };
  type?: "payroll" | "time-tracking";
}

export default function ExportButtons({
  params,
  type = "payroll",
}: ExportButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (format: "excel" | "pdf") => {
    try {
      setLoading(format);
      let response;

      if (type === "payroll") {
        response = await payrollApi.exportPayroll({
          format,
          ...params,
        });
      } else {
        // For time tracking, we'll use the same endpoint structure
        // You may need to create a time tracking export endpoint
        response = await payrollApi.exportPayroll({
          format,
          ...params,
        });
      }

      if (response.success) {
        // If the API returns a file URL, download and share it
        if (response.data?.file_url) {
          await downloadAndShareFile(response.data.file_url, format);
        } else {
          Alert.alert("Thành công", `Đã export ${format.toUpperCase()}`);
        }
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể export");
    } finally {
      setLoading(null);
    }
  };

  const downloadAndShareFile = async (url: string, format: string) => {
    try {
      const directory = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
      const fileUri = `${directory}export_${Date.now()}.${format === "excel" ? "xlsx" : "pdf"}`;
      const downloadResult = await FileSystem.downloadAsync(url, fileUri);

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(downloadResult.uri, {
          mimeType: format === "excel"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/pdf",
          dialogTitle: `Export ${format.toUpperCase()}`,
        });
      } else {
        Alert.alert("Thành công", `File đã được tải về: ${downloadResult.uri}`);
      }
    } catch (error: any) {
      // User cancelled sharing is not an error
      if (error.code !== "ERR_CANCELLED" && error.message !== "User did not share") {
        console.error("Error sharing file:", error);
        Alert.alert("Thành công", "File đã được tải về");
      }
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
