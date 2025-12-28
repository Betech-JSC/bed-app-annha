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
import { reportApi, MaterialProcurementReport } from "@/api/reportApi";
import BackButton from "@/components/BackButton";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function MaterialProcurementReportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<MaterialProcurementReport | null>(null);
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
      const response = await reportApi.getMaterialProcurement(Number(id), {
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
        <Text style={styles.headerTitle}>Báo Cáo Mua Vật Liệu</Text>
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
              <Ionicons name="cube" size={24} color="#10B981" />
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
                  <Text style={styles.statLabel}>Số lượng:</Text>
                  <Text style={styles.statValue}>
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

        {/* Supplier Statistics */}
        {report.supplier_statistics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thống Kê Theo Nhà Cung Cấp</Text>
            {report.supplier_statistics.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Text style={styles.statCardTitle}>{stat.supplier?.name || "N/A"}</Text>
                <View style={styles.statCardBody}>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Số giao dịch:</Text>
                    <Text style={styles.statValue}>{stat.transaction_count}</Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel}>Tổng giá trị:</Text>
                    <Text style={[styles.statValue, styles.amountValue]}>
                      {formatCurrency(stat.total_amount)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Daily Statistics */}
        {report.daily_statistics && report.daily_statistics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thống Kê Theo Ngày</Text>
            {report.daily_statistics.slice(0, 10).map((stat, index) => (
              <View key={index} style={styles.dailyCard}>
                <Text style={styles.dailyDate}>
                  {stat.transaction_date ? new Date(stat.transaction_date).toLocaleDateString("vi-VN") : "N/A"}
                </Text>
                <View style={styles.dailyStats}>
                  <Text style={styles.dailyStatText}>
                    {stat.transaction_count || 0} giao dịch
                  </Text>
                  <Text style={styles.dailyStatText}>
                    {(stat.total_quantity || 0).toFixed(2)} đơn vị
                  </Text>
                  <Text style={[styles.dailyStatText, styles.amountValue]}>
                    {formatCurrency(stat.total_amount || 0)}
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
  amountValue: {
    color: "#10B981",
  },
  dailyCard: {
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
  dailyDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  dailyStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dailyStatText: {
    fontSize: 13,
    color: "#6B7280",
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  },
});

