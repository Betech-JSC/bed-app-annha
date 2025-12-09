import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { progressApi } from "@/api/progressApi";
import { ProgressChart } from "@/components";
import { Ionicons } from "@expo/vector-icons";

export default function ProgressScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [progressData, setProgressData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<"progress" | "line" | "bar">("progress");

  useEffect(() => {
    loadProgress();
  }, [id]);

  const loadProgress = async () => {
    try {
      setLoading(true);
      const response = await progressApi.getProgress(id!);
      if (response.success) {
        setProgressData(response.data);
      }
    } catch (error) {
      console.error("Error loading progress:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!progressData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Không có dữ liệu tiến độ</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tiến Độ Thi Công</Text>
      </View>

      <View style={styles.chartTypeSelector}>
        <TouchableOpacity
          style={[
            styles.chartTypeButton,
            chartType === "progress" && styles.chartTypeButtonActive,
          ]}
          onPress={() => setChartType("progress")}
        >
          <Text
            style={[
              styles.chartTypeText,
              chartType === "progress" && styles.chartTypeTextActive,
            ]}
          >
            Tổng quan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.chartTypeButton,
            chartType === "line" && styles.chartTypeButtonActive,
          ]}
          onPress={() => setChartType("line")}
        >
          <Text
            style={[
              styles.chartTypeText,
              chartType === "line" && styles.chartTypeTextActive,
            ]}
          >
            Biểu đồ đường
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.chartTypeButton,
            chartType === "bar" && styles.chartTypeButtonActive,
          ]}
          onPress={() => setChartType("bar")}
        >
          <Text
            style={[
              styles.chartTypeText,
              chartType === "bar" && styles.chartTypeTextActive,
            ]}
          >
            Biểu đồ cột
          </Text>
        </TouchableOpacity>
      </View>

      <ProgressChart
        progress={progressData.progress}
        logs={progressData.logs}
        type={chartType}
      />

      {progressData.subcontractors && progressData.subcontractors.length > 0 && (
        <View style={styles.subcontractorsSection}>
          <Text style={styles.sectionTitle}>Tiến độ nhà thầu phụ</Text>
          {progressData.subcontractors.map((sub: any, index: number) => (
            <View key={index} style={styles.subcontractorItem}>
              <Text style={styles.subcontractorName}>{sub.name}</Text>
              <View style={styles.subcontractorProgress}>
                <View style={styles.subcontractorProgressBar}>
                  <View
                    style={[
                      styles.subcontractorProgressFill,
                      {
                        width: `${sub.progress_status === "completed"
                          ? 100
                          : sub.progress_status === "in_progress"
                            ? 50
                            : 0
                          }%`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.subcontractorProgressText}>
                  {sub.progress_status === "completed"
                    ? "Hoàn thành"
                    : sub.progress_status === "in_progress"
                      ? "Đang thi công"
                      : "Chưa bắt đầu"}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  chartTypeSelector: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
    backgroundColor: "#FFFFFF",
  },
  chartTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  chartTypeButtonActive: {
    backgroundColor: "#3B82F6",
  },
  chartTypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  chartTypeTextActive: {
    color: "#FFFFFF",
  },
  subcontractorsSection: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  subcontractorItem: {
    marginBottom: 16,
  },
  subcontractorName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  subcontractorProgress: {
    gap: 8,
  },
  subcontractorProgressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  subcontractorProgressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  subcontractorProgressText: {
    fontSize: 12,
    color: "#6B7280",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  },
});
