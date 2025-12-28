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
import { reportApi, RevenueExpenseReport } from "@/api/reportApi";
import BackButton from "@/components/BackButton";
import DateTimePicker from "@react-native-community/datetimepicker";

export default function RevenueExpenseReportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<RevenueExpenseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "monthly" | "details">("overview");

  useEffect(() => {
    loadReport();
  }, [id, fromDate, toDate]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await reportApi.getProjectRevenueExpense(Number(id), {
        from_date: fromDate ? fromDate.toISOString().split("T")[0] : undefined,
        to_date: toDate ? toDate.toISOString().split("T")[0] : undefined,
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
        <Text style={styles.headerTitle}>Báo Cáo Thu Chi</Text>
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
              {fromDate ? fromDate.toLocaleDateString("vi-VN") : "Từ ngày"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowToDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#3B82F6" />
            <Text style={styles.dateButtonText}>
              {toDate ? toDate.toLocaleDateString("vi-VN") : "Đến ngày"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "overview" && styles.tabActive]}
            onPress={() => setActiveTab("overview")}
          >
            <Text
              style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}
            >
              Tổng Quan
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "monthly" && styles.tabActive]}
            onPress={() => setActiveTab("monthly")}
          >
            <Text
              style={[styles.tabText, activeTab === "monthly" && styles.tabTextActive]}
            >
              Theo Tháng
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "details" && styles.tabActive]}
            onPress={() => setActiveTab("details")}
          >
            <Text
              style={[styles.tabText, activeTab === "details" && styles.tabTextActive]}
            >
              Chi Tiết
            </Text>
          </TouchableOpacity>
        </View>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Tổng Hợp</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Ionicons name="trending-up" size={32} color="#10B981" />
                  <Text style={styles.summaryLabel}>Tổng Thu</Text>
                  <Text style={[styles.summaryValue, styles.revenueValue]}>
                    {formatCurrency(report.summary.total_revenue)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Ionicons name="trending-down" size={32} color="#EF4444" />
                  <Text style={styles.summaryLabel}>Tổng Chi</Text>
                  <Text style={[styles.summaryValue, styles.expenseValue]}>
                    {formatCurrency(report.summary.total_expenses)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Ionicons name="wallet" size={32} color="#3B82F6" />
                  <Text style={styles.summaryLabel}>Lợi Nhuận</Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      report.summary.total_profit >= 0 ? styles.profitValue : styles.lossValue,
                    ]}
                  >
                    {formatCurrency(report.summary.total_profit)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Ionicons name="pie-chart" size={32} color="#8B5CF6" />
                  <Text style={styles.summaryLabel}>Tỷ Lệ LN</Text>
                  <Text style={[styles.summaryValue, styles.marginValue]}>
                    {report.summary.profit_margin.toFixed(2)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Revenue Breakdown */}
            {report.revenue_breakdown && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chi Tiết Doanh Thu</Text>
                <View style={styles.breakdownCard}>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Giá trị hợp đồng:</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(report.revenue_breakdown.contract_value || 0)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Đã thanh toán:</Text>
                    <Text style={styles.breakdownValue}>
                      {formatCurrency(report.revenue_breakdown.paid_payments || 0)}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Tổng doanh thu:</Text>
                    <Text style={[styles.breakdownValue, styles.revenueValue]}>
                      {formatCurrency(report.revenue_breakdown.total_revenue || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Costs Breakdown */}
            {report.costs_breakdown && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chi Tiết Chi Phí</Text>
                <View style={styles.breakdownCard}>
                  {report.costs_breakdown.by_group && report.costs_breakdown.by_group.length > 0 ? (
                    report.costs_breakdown.by_group.map((group, index) => (
                      <View key={index} style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{group.name || "Chưa phân loại"}:</Text>
                        <Text style={styles.breakdownValue}>
                          {formatCurrency(group.amount || 0)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>Chưa có chi phí</Text>
                  )}
                  <View style={styles.divider} />
                  <View style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, styles.totalLabel]}>Tổng chi phí:</Text>
                    <Text style={[styles.breakdownValue, styles.expenseValue, styles.totalValue]}>
                      {formatCurrency(report.costs_breakdown.total_costs || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Monthly Tab */}
        {activeTab === "monthly" && report.monthly_statistics && report.monthly_statistics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thống Kê Theo Tháng</Text>
            {report.monthly_statistics.map((stat, index) => (
              <View key={index} style={styles.monthlyCard}>
                <Text style={styles.monthlyLabel}>{stat.month_label}</Text>
                <View style={styles.monthlyStats}>
                  <View style={styles.monthlyStatItem}>
                    <Text style={styles.monthlyStatLabel}>Thu</Text>
                    <Text style={[styles.monthlyStatValue, styles.revenueValue]}>
                      {formatCurrency(stat.revenue)}
                    </Text>
                  </View>
                  <View style={styles.monthlyStatItem}>
                    <Text style={styles.monthlyStatLabel}>Chi</Text>
                    <Text style={[styles.monthlyStatValue, styles.expenseValue]}>
                      {formatCurrency(stat.expenses)}
                    </Text>
                  </View>
                  <View style={styles.monthlyStatItem}>
                    <Text style={styles.monthlyStatLabel}>LN</Text>
                    <Text
                      style={[
                        styles.monthlyStatValue,
                        stat.profit >= 0 ? styles.profitValue : styles.lossValue,
                      ]}
                    >
                      {formatCurrency(stat.profit)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Details Tab */}
        {activeTab === "details" && (
          <>
            {/* Payments */}
            {report.payments && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Thanh Toán ({report.payments.length || 0})</Text>
                {report.payments.length > 0 ? (
                  report.payments.slice(0, 20).map((payment, index) => (
                <View key={index} style={styles.detailCard}>
                  <View style={styles.detailHeader}>
                    <Text style={styles.detailTitle}>
                      {payment.payment_number || `Thanh toán #${payment.id}`}
                    </Text>
                    <Text style={[styles.detailAmount, styles.revenueValue]}>
                      {formatCurrency(payment.amount)}
                    </Text>
                  </View>
                    <Text style={styles.detailDate}>
                      {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString("vi-VN") : "N/A"}
                    </Text>
                  </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>Chưa có thanh toán</Text>
                )}
              </View>
            )}

            {/* Costs */}
            {report.cost_details && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chi Phí ({report.cost_details.length || 0})</Text>
                {report.cost_details.length > 0 ? (
                  report.cost_details.slice(0, 20).map((cost, index) => (
                <View key={index} style={styles.detailCard}>
                  <View style={styles.detailHeader}>
                    <Text style={styles.detailTitle}>{cost.name}</Text>
                    <Text style={[styles.detailAmount, styles.expenseValue]}>
                      {formatCurrency(cost.amount)}
                    </Text>
                  </View>
                    <Text style={styles.detailDate}>
                      {cost.cost_date ? new Date(cost.cost_date).toLocaleDateString("vi-VN") : "N/A"} •{" "}
                      {cost.costGroup?.name || "Chưa phân loại"}
                    </Text>
                  </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>Chưa có chi phí</Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Date Pickers */}
      {showFromDatePicker && (
        <DateTimePicker
          value={fromDate || new Date()}
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
          value={toDate || new Date()}
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
  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: "#3B82F6",
  },
  tabText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#FFFFFF",
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
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryItem: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
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
  revenueValue: {
    color: "#10B981",
  },
  expenseValue: {
    color: "#EF4444",
  },
  profitValue: {
    color: "#10B981",
  },
  lossValue: {
    color: "#EF4444",
  },
  marginValue: {
    color: "#8B5CF6",
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
  breakdownCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  totalLabel: {
    fontWeight: "700",
    color: "#1F2937",
  },
  totalValue: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  monthlyCard: {
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
  monthlyLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  monthlyStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  monthlyStatItem: {
    alignItems: "center",
  },
  monthlyStatLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  monthlyStatValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  detailCard: {
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
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  detailAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  detailDate: {
    fontSize: 12,
    color: "#6B7280",
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

