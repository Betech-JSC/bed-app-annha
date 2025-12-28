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
import { reportApi, MaterialUsageReport } from "@/api/reportApi";
import BackButton from "@/components/BackButton";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function MaterialUsageReportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<MaterialUsageReport | null>(null);
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
      const response = await reportApi.getMaterialUsage(Number(id), {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
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
        <Text style={styles.headerTitle}>Báo Cáo Vật Liệu Sử Dụng</Text>
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
              <Text style={styles.summaryLabel}>Số giao dịch</Text>
              <Text style={styles.summaryValue}>{report.summary.total_transactions}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="cube" size={24} color="#EF4444" />
              <Text style={styles.summaryLabel}>Tổng số lượng</Text>
              <Text style={styles.summaryValue}>
                {report.summary.total_quantity.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="cash" size={24} color="#F59E0B" />
              <Text style={styles.summaryLabel}>Tổng giá trị</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(report.summary.total_amount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Material Statistics */}
        {report.material_statistics && report.material_statistics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thống Kê Theo Vật Liệu</Text>
            {report.material_statistics.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={styles.statCardHeader}>
                <Text style={styles.statCardTitle}>{stat.material?.name || "N/A"}</Text>
                {stat.material?.code && (
                  <Text style={styles.statCardCode}>Mã: {stat.material.code}</Text>
                )}
              </View>
              <View style={styles.statCardBody}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Số lượng đã sử dụng:</Text>
                  <Text style={[styles.statValue, styles.usageValue]}>
                    {(stat.total_quantity || 0).toFixed(2)} {stat.material?.unit || ""}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel}>Giá trị:</Text>
                  <Text style={[styles.statValue, styles.amountValue]}>
                    {formatCurrency(stat.total_amount)}
                  </Text>
                </View>
              </View>
            </View>
            ))}
          </View>
        )}

        {/* In/Out Comparison */}
        {report.in_out_comparison && report.in_out_comparison.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>So Sánh Nhập - Xuất</Text>
            {report.in_out_comparison.map((item, index) => (
              <View key={index} style={styles.comparisonCard}>
                <Text style={styles.comparisonTitle}>{item.material?.name || "N/A"}</Text>
                <View style={styles.comparisonRow}>
                  <View style={styles.comparisonItem}>
                    <Ionicons name="arrow-down-circle" size={20} color="#10B981" />
                    <Text style={styles.comparisonLabel}>Nhập</Text>
                    <Text style={[styles.comparisonValue, styles.inValue]}>
                      {(item.in_quantity || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.comparisonItem}>
                    <Ionicons name="arrow-up-circle" size={20} color="#EF4444" />
                    <Text style={styles.comparisonLabel}>Xuất</Text>
                    <Text style={[styles.comparisonValue, styles.outValue]}>
                      {(item.out_quantity || 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.comparisonItem}>
                    <Ionicons name="cube" size={20} color="#3B82F6" />
                    <Text style={styles.comparisonLabel}>Còn lại</Text>
                    <Text
                      style={[
                        styles.comparisonValue,
                        (item.remaining || 0) >= 0 ? styles.remainingValue : styles.negativeValue,
                      ]}
                    >
                      {(item.remaining || 0).toFixed(2)}
                    </Text>
                  </View>
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
  statCard: {
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
  statCardHeader: {
    marginBottom: 12,
  },
  statCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  statCardCode: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  statCardBody: {
    gap: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  usageValue: {
    color: "#EF4444",
  },
  amountValue: {
    color: "#10B981",
  },
  comparisonCard: {
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
  comparisonTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  comparisonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  comparisonItem: {
    alignItems: "center",
  },
  comparisonLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 4,
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  inValue: {
    color: "#10B981",
  },
  outValue: {
    color: "#EF4444",
  },
  remainingValue: {
    color: "#3B82F6",
  },
  negativeValue: {
    color: "#EF4444",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  },
});

