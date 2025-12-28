import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { revenueApi, RevenueSummary, RevenueDashboard } from "@/api/revenueApi";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart, PieChart, StackedBarChart } from "react-native-chart-kit";
import { ScreenHeader } from "@/components";
import { Dimensions } from "react-native";

const screenWidth = Dimensions.get("window").width;

export default function RevenueScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [dashboard, setDashboard] = useState<RevenueDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "dashboard">("summary");
  const [period, setPeriod] = useState<"all" | "month" | "quarter" | "year">("all");

  useEffect(() => {
    loadData();
  }, [id, activeTab, period]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === "summary") {
        const response = await revenueApi.getProjectSummary(id!);
        if (response.success) {
          setSummary(response.data);
        }
      } else {
        const response = await revenueApi.getDashboard(id!, { period });
        if (response.success) {
          setDashboard(response.data);
        }
      }
    } catch (error) {
      console.error("Error loading revenue:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <ScreenHeader title="Báo Cáo Tổng Hợp" showBackButton />

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "summary" && styles.tabActive]}
          onPress={() => setActiveTab("summary")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "summary" && styles.tabTextActive,
            ]}
          >
            Tổng Hợp
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "dashboard" && styles.tabActive]}
          onPress={() => setActiveTab("dashboard")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "dashboard" && styles.tabTextActive,
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === "summary" && summary && (
        <View style={styles.content}>
          {/* Các Chỉ Số */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Các Chỉ Số</Text>
            <View style={styles.card}>
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Giá trị hợp đồng</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(summary.revenue.contract_value)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Giá trị phát sinh</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(summary.revenue.additional_costs || 0)}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.statRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Đã thanh toán</Text>
                  <Text style={styles.statValue}>
                    {formatCurrency(summary.revenue.paid_payments)}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Số tiền còn lại</Text>
                  <Text
                    style={[
                      styles.statValue,
                      (summary.revenue.remaining_payment || 0) === 0
                        ? styles.completedValue
                        : styles.remainingValue,
                    ]}
                  >
                    {formatCurrency(summary.revenue.remaining_payment || 0)}
                  </Text>
                  {(summary.revenue.remaining_payment || 0) === 0 && (
                    <Text style={styles.completedBadge}>Dự án hoàn thành</Text>
                  )}
              </View>
              </View>
            </View>
          </View>

          {/* Tổng Hợp Từ Hệ Thống */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tổng Hợp Từ Hệ Thống</Text>
            <View style={styles.card}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tổng doanh thu</Text>
                <Text style={[styles.summaryValue, styles.revenueValue]}>
                  {formatCurrency(summary.revenue.total_revenue)}
                    </Text>
                  </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tổng chi phí</Text>
                <Text style={[styles.summaryValue, styles.costTotal]}>
                  {formatCurrency(summary.costs.total_costs)}
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Lợi nhuận</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    summary.profit.amount >= 0
                      ? styles.profitPositive
                      : styles.profitNegative,
                  ]}
                >
                  {formatCurrency(summary.profit.amount)}
                </Text>
              </View>
            </View>
          </View>

          {/* Lợi Nhuận */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lợi Nhuận</Text>
            <View style={styles.card}>
              <View style={styles.profitRow}>
                <Text style={styles.profitLabel}>Lợi nhuận</Text>
                <Text
                  style={[
                    styles.profitValue,
                    summary.profit.amount >= 0
                      ? styles.profitPositive
                      : styles.profitNegative,
                  ]}
                >
                  {formatCurrency(summary.profit.amount)}
                </Text>
              </View>
              <View style={styles.profitRow}>
                <Text style={styles.profitLabel}>Tỷ suất lợi nhuận</Text>
                <Text
                  style={[
                    styles.profitValue,
                    summary.profit.margin >= 0
                      ? styles.profitPositive
                      : styles.profitNegative,
                  ]}
                >
                  {summary.profit.margin.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {activeTab === "dashboard" && dashboard && (
        <View style={styles.content}>
          {/* Period Filter */}
          <View style={styles.filterContainer}>
            <Text style={styles.filterLabel}>Kỳ báo cáo:</Text>
            <View style={styles.filterButtons}>
              {(["all", "month", "quarter", "year"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.filterButton,
                    period === p && styles.filterButtonActive,
                  ]}
                  onPress={() => setPeriod(p)}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      period === p && styles.filterButtonTextActive,
                    ]}
                  >
                    {p === "all"
                      ? "Tất cả"
                      : p === "month"
                        ? "Tháng"
                        : p === "quarter"
                          ? "Quý"
                          : "Năm"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* KPI Cards */}
          <View style={styles.kpiContainer}>
            <View style={styles.kpiCard}>
              <Ionicons name="trending-up-outline" size={32} color="#10B981" />
              <Text style={styles.kpiValue}>
                {formatCurrency(dashboard.kpi.revenue)}
              </Text>
              <Text style={styles.kpiLabel}>Doanh thu</Text>
            </View>
            <View style={styles.kpiCard}>
              <Ionicons name="trending-down-outline" size={32} color="#EF4444" />
              <Text style={styles.kpiValue}>
                {formatCurrency(dashboard.kpi.costs)}
              </Text>
              <Text style={styles.kpiLabel}>Chi phí</Text>
            </View>
            <View style={styles.kpiCard}>
              <Ionicons name="cash-outline" size={32} color="#3B82F6" />
              <Text
                style={[
                  styles.kpiValue,
                  dashboard.kpi.profit >= 0
                    ? styles.profitPositive
                    : styles.profitNegative,
                ]}
              >
                {formatCurrency(dashboard.kpi.profit)}
              </Text>
              <Text style={styles.kpiLabel}>Lợi nhuận</Text>
            </View>
            <View style={styles.kpiCard}>
              <Ionicons name="pie-chart-outline" size={32} color="#F59E0B" />
              <Text
                style={[
                  styles.kpiValue,
                  dashboard.kpi.profit_margin >= 0
                    ? styles.profitPositive
                    : styles.profitNegative,
                ]}
              >
                {dashboard.kpi.profit_margin.toFixed(2)}%
              </Text>
              <Text style={styles.kpiLabel}>Tỷ suất LN</Text>
            </View>
          </View>

          {/* Chart 1: Doanh thu theo tháng */}
          {dashboard.charts.monthly_profit.length > 0 && (
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>Doanh Thu Theo Tháng</Text>
              <LineChart
                data={{
                  labels: dashboard.charts.monthly_profit.map((item) => {
                    const [year, month] = item.period.split("-");
                    return `${month}/${year.slice(2)}`;
                  }),
                  datasets: [
                    {
                      data: dashboard.charts.monthly_profit.map(
                        (item) => item.revenue
                      ),
                      color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                      strokeWidth: 3,
                    },
                  ],
                }}
                width={screenWidth - 32}
                height={220}
                chartConfig={{
                  backgroundColor: "#FFFFFF",
                  backgroundGradientFrom: "#F0FDF4",
                  backgroundGradientTo: "#FFFFFF",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                    stroke: "#10B981",
                  },
                }}
                bezier
                style={styles.chart}
                withVerticalLabels={true}
                withHorizontalLabels={true}
              />
            </View>
          )}

          {/* Chart 2: Chi phí theo tháng */}
          {dashboard.charts.monthly_costs.length > 0 && (
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>Chi Phí Theo Tháng</Text>
              <LineChart
                data={{
                  labels: dashboard.charts.monthly_costs.map((item) => {
                    const [year, month] = item.period.split("-");
                    return `${month}/${year.slice(2)}`;
                  }),
                  datasets: [
                    {
                      data: dashboard.charts.monthly_costs.map(
                        (item) => item.amount
                      ),
                      color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                      strokeWidth: 3,
                    },
                  ],
                }}
                width={screenWidth - 32}
                height={220}
                chartConfig={{
                  backgroundColor: "#FFFFFF",
                  backgroundGradientFrom: "#FEF2F2",
                  backgroundGradientTo: "#FFFFFF",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  propsForDots: {
                    r: "6",
                    strokeWidth: "2",
                    stroke: "#EF4444",
                  },
                }}
                bezier
                style={styles.chart}
                withVerticalLabels={true}
                withHorizontalLabels={true}
              />
            </View>
          )}

          {/* Chart 3: So sánh Doanh thu vs Chi phí */}
          {dashboard.charts.monthly_profit.length > 0 && (
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>So Sánh Doanh Thu vs Chi Phí</Text>
              <BarChart
                data={{
                  labels: dashboard.charts.monthly_profit.map((item) => {
                    const [year, month] = item.period.split("-");
                    return `${month}/${year.slice(2)}`;
                  }),
                  datasets: [
                    {
                      data: dashboard.charts.monthly_profit.map(
                        (item) => item.revenue
                      ),
                      color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                    },
                    {
                      data: dashboard.charts.monthly_profit.map(
                        (item) => item.costs
                      ),
                      color: (opacity = 1) => `rgba(239, 68, 68, ${opacity})`,
                    },
                  ],
                }}
                width={screenWidth - 32}
                height={220}
                chartConfig={{
                  backgroundColor: "#FFFFFF",
                  backgroundGradientFrom: "#FFFFFF",
                  backgroundGradientTo: "#FFFFFF",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  barPercentage: 0.7,
                }}
                style={styles.chart}
                showValuesOnTopOfBars={false}
                withInnerLines={true}
              />
              <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#10B981" }]} />
                  <Text style={styles.legendText}>Doanh thu</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#EF4444" }]} />
                  <Text style={styles.legendText}>Chi phí</Text>
                </View>
              </View>
            </View>
          )}

          {/* Chart 4: Lợi nhuận theo tháng */}
          {dashboard.charts.monthly_profit.length > 0 && (
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>Lợi Nhuận Theo Tháng</Text>
              <BarChart
                data={{
                  labels: dashboard.charts.monthly_profit.map((item) => {
                    const [year, month] = item.period.split("-");
                    return `${month}/${year.slice(2)}`;
                  }),
                  datasets: [
                    {
                      data: dashboard.charts.monthly_profit.map((item) =>
                        Math.max(0, item.profit)
                      ),
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    },
                  ],
                }}
                width={screenWidth - 32}
                height={220}
                chartConfig={{
                  backgroundColor: "#FFFFFF",
                  backgroundGradientFrom: "#EFF6FF",
                  backgroundGradientTo: "#FFFFFF",
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
                  barPercentage: 0.6,
                }}
                style={styles.chart}
                showValuesOnTopOfBars
                withInnerLines={true}
              />
            </View>
          )}

          {/* Chart 5: Chi phí theo nhóm (Pie Chart) */}
          {dashboard.charts.costs_by_group && dashboard.charts.costs_by_group.length > 0 && (
            <View style={styles.chartSection}>
              <Text style={styles.chartTitle}>Phân Bổ Chi Phí Theo Nhóm</Text>
              <PieChart
                data={dashboard.charts.costs_by_group.map((group, index) => {
                  const colors = [
                    "#3B82F6",
                    "#10B981",
                    "#F59E0B",
                    "#EF4444",
                    "#8B5CF6",
                    "#EC4899",
                    "#14B8A6",
                    "#F97316",
                  ];
                  return {
                    name: group.name || "Khác",
                    amount: group.amount,
                    color: colors[index % colors.length],
                    legendFontColor: "#6B7280",
                    legendFontSize: 12,
                  };
                })}
                width={screenWidth - 32}
                height={220}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="amount"
                backgroundColor="transparent"
                paddingLeft="15"
                absolute
                style={styles.chart}
              />
            </View>
          )}
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
  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#3B82F6",
  },
  tabText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  content: {
    padding: 16,
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statRow: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3B82F6",
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  costLabel: {
    fontSize: 16,
    color: "#6B7280",
  },
  costValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  costTotal: {
    color: "#EF4444",
  },
  profitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  profitLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  profitValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  profitPositive: {
    color: "#10B981",
  },
  profitNegative: {
    color: "#EF4444",
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1E40AF",
    lineHeight: 20,
  },
  kpiContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "47%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 8,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  chartSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  chart: {
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    padding: 16,
  },
  completedValue: {
    color: "#10B981",
  },
  remainingValue: {
    color: "#F59E0B",
  },
  completedBadge: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  revenueValue: {
    color: "#3B82F6",
  },
  filterContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  filterButtons: {
    flexDirection: "row",
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#3B82F6",
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#6B7280",
  },
});

