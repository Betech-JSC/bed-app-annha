import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { reportApi, ConstructionProgressReport } from "@/api/reportApi";
import BackButton from "@/components/BackButton";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function ConstructionProgressReportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<ConstructionProgressReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState(new Date());
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  useEffect(() => {
    loadReport();
  }, [id, fromDate, toDate]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await reportApi.getConstructionProgress(Number(id), {
        from_date: fromDate.toISOString().split("T")[0],
        to_date: toDate.toISOString().split("T")[0],
      });
      if (response.success) {
        setReport(response.data);
      }
    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReport();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Không tìm thấy dữ liệu báo cáo</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Báo Cáo Tiến Độ Thi Công</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Date Filters */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowFromDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            <Text style={styles.dateButtonText}>
              Từ: {fromDate.toLocaleDateString("vi-VN")}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowToDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            <Text style={styles.dateButtonText}>
              Đến: {toDate.toLocaleDateString("vi-VN")}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Overall Progress */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Tiến Độ Tổng Thể</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${report.overall_progress}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {report.overall_progress.toFixed(2)}%
            </Text>
          </View>
        </View>

        {/* Weekly Statistics */}
        {report.weekly_statistics && report.weekly_statistics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thống Kê Theo Tuần</Text>
            {report.weekly_statistics.map((week, index) => (
            <View key={index} style={styles.weekCard}>
              <Text style={styles.weekLabel}>{week.week}</Text>
              <View style={styles.weekStats}>
                <View style={styles.weekStatItem}>
                  <Text style={styles.weekStatLabel}>Tiến độ TB</Text>
                  <Text style={styles.weekStatValue}>
                    {(week.average_progress || 0).toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.weekStatItem}>
                  <Text style={styles.weekStatLabel}>Nhân lực TB</Text>
                  <Text style={styles.weekStatValue}>
                    {(week.average_personnel || 0).toFixed(0)} người
                  </Text>
                </View>
                <View style={styles.weekStatItem}>
                  <Text style={styles.weekStatLabel}>Số bản ghi</Text>
                  <Text style={styles.weekStatValue}>{week.log_count}</Text>
                </View>
              </View>
            </View>
            ))}
          </View>
        )}

        {/* Subcontractor Progress */}
        {report.subcontractor_progress.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tiến Độ Thầu Phụ</Text>
            {report.subcontractor_progress.map((progress, index) => (
              <View key={index} style={styles.progressCard}>
                <Text style={styles.progressCardTitle}>
                  {progress.subcontractor?.name || "N/A"}
                </Text>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Kế hoạch:</Text>
                  <Text style={styles.progressValue}>
                    {(progress.planned_progress || 0).toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>Thực tế:</Text>
                  <Text style={styles.progressValue}>
                    {(progress.actual_progress || 0).toFixed(2)}%
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        progress.status === "on_schedule"
                          ? "#10B98120"
                          : progress.status === "delayed"
                          ? "#EF444420"
                          : "#F59E0B20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          progress.status === "on_schedule"
                            ? "#10B981"
                            : progress.status === "delayed"
                            ? "#EF4444"
                            : "#F59E0B",
                      },
                    ]}
                  >
                    {progress.status === "on_schedule"
                      ? "Đúng tiến độ"
                      : progress.status === "delayed"
                      ? "Chậm tiến độ"
                      : "Sớm tiến độ"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Date Pickers */}
      {showFromDatePicker && (
        <DateTimePicker
          value={fromDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowFromDatePicker(false);
            if (selectedDate) setFromDate(selectedDate);
          }}
        />
      )}
      {showToDatePicker && (
        <DateTimePicker
          value={toDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowToDatePicker(false);
            if (selectedDate) setToDate(selectedDate);
          }}
        />
      )}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  filterContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dateButtonText: {
    fontSize: 14,
    color: "#1F2937",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 24,
    backgroundColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 12,
  },
  progressText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3B82F6",
    minWidth: 60,
    textAlign: "right",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  weekCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  weekStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  weekStatItem: {
    alignItems: "center",
  },
  weekStatLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  weekStatValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  progressCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  progressValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  },
});

