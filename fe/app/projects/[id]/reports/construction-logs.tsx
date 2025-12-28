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
import { reportApi, ConstructionLogsReport } from "@/api/reportApi";
import BackButton from "@/components/BackButton";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function ConstructionLogsReportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<ConstructionLogsReport | null>(null);
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
      const response = await reportApi.getConstructionLogs(Number(id), {
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

  const getWeatherIcon = (weather: string) => {
    switch (weather?.toLowerCase()) {
      case "sunny":
      case "nắng":
        return "sunny";
      case "rainy":
      case "mưa":
        return "rainy";
      case "cloudy":
      case "nhiều mây":
        return "cloudy";
      default:
        return "partly-sunny";
    }
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
        <Text style={styles.headerTitle}>Báo Cáo Nhật Ký Thi Công</Text>
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

        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Tổng Hợp</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="document-text" size={24} color="#3B82F6" />
              <Text style={styles.summaryLabel}>Tổng số bản ghi</Text>
              <Text style={styles.summaryValue}>{report.summary.total_logs}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="trending-up" size={24} color="#10B981" />
              <Text style={styles.summaryLabel}>Tiến độ TB</Text>
              <Text style={styles.summaryValue}>
                {report.summary.average_progress.toFixed(2)}%
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="people" size={24} color="#F59E0B" />
              <Text style={styles.summaryLabel}>Nhân lực TB</Text>
              <Text style={styles.summaryValue}>
                {report.summary.average_personnel.toFixed(0)} người
              </Text>
            </View>
          </View>
        </View>

        {/* Weather Statistics */}
        {report.weather_statistics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thống Kê Theo Thời Tiết</Text>
            {report.weather_statistics.map((stat, index) => (
              <View key={index} style={styles.weatherCard}>
                <View style={styles.weatherHeader}>
                  <Ionicons
                    name={getWeatherIcon(stat.weather) as any}
                    size={24}
                    color="#3B82F6"
                  />
                  <Text style={styles.weatherLabel}>{stat.weather}</Text>
                </View>
                <View style={styles.weatherStats}>
                  <Text style={styles.weatherStatText}>
                    {stat.count} ngày
                  </Text>
                  <Text style={styles.weatherStatText}>
                    Tiến độ TB: {stat.avg_progress}%
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Logs List */}
        {report.logs && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Nhật Ký Chi Tiết ({report.logs.length || 0})
            </Text>
            {report.logs.length > 0 ? (
              report.logs.map((log, index) => (
            <View key={index} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={styles.logDateContainer}>
                  <Ionicons name="calendar" size={20} color="#3B82F6" />
                  <Text style={styles.logDate}>
                    {log.log_date ? new Date(log.log_date).toLocaleDateString("vi-VN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }) : "N/A"}
                  </Text>
                </View>
                <View
                  style={[
                    styles.progressBadge,
                    {
                      backgroundColor:
                        (log.completion_percentage || 0) >= 80
                          ? "#10B98120"
                          : (log.completion_percentage || 0) >= 50
                          ? "#F59E0B20"
                          : "#EF444420",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.progressBadgeText,
                      {
                        color:
                          (log.completion_percentage || 0) >= 80
                            ? "#10B981"
                            : (log.completion_percentage || 0) >= 50
                            ? "#F59E0B"
                            : "#EF4444",
                      },
                    ]}
                  >
                    {(log.completion_percentage || 0).toFixed(2)}%
                  </Text>
                </View>
              </View>
              <View style={styles.logDetails}>
                <View style={styles.logDetailRow}>
                  <Ionicons name="partly-sunny" size={16} color="#6B7280" />
                  <Text style={styles.logDetailText}>
                    Thời tiết: {log.weather || "Không xác định"}
                  </Text>
                </View>
                <View style={styles.logDetailRow}>
                  <Ionicons name="people" size={16} color="#6B7280" />
                  <Text style={styles.logDetailText}>
                    Nhân lực: {log.personnel_count || 0} người
                  </Text>
                </View>
                {log.notes && (
                  <View style={styles.logNotes}>
                    <Text style={styles.logNotesText}>{log.notes}</Text>
                  </View>
                )}
                {log.creator && (
                  <Text style={styles.logCreator}>
                    Ghi bởi: {log.creator.name || "N/A"}
                  </Text>
                )}
              </View>
            </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Chưa có nhật ký</Text>
            )}
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
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
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
  weatherCard: {
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
  weatherHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  weatherLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  weatherStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weatherStatText: {
    fontSize: 14,
    color: "#6B7280",
  },
  logCard: {
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
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  logDateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  logDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  progressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  progressBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  logDetails: {
    gap: 8,
  },
  logDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logDetailText: {
    fontSize: 14,
    color: "#6B7280",
  },
  logNotes: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  logNotesText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },
  logCreator: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 8,
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    padding: 16,
    fontStyle: "italic",
  },
});

