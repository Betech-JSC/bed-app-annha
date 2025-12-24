import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, BarChart, PieChart } from "react-native-gifted-charts";
import { Dimensions } from "react-native";
import {
  summaryReportApi,
  SummaryReport,
  ProjectProfit,
} from "@/api/summaryReportApi";

const screenWidth = Dimensions.get("window").width;

export default function ReportsTab() {
  const router = useRouter();
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<"all" | "month" | "quarter" | "year">(
    "all"
  );
  const [showCapitalModal, setShowCapitalModal] = useState(false);
  const [showFixedCostsModal, setShowFixedCostsModal] = useState(false);
  const [capitalAmount, setCapitalAmount] = useState("");
  const [fixedCostsAmount, setFixedCostsAmount] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await summaryReportApi.getSummaryReport(period);
      if (response.success) {
        setReport(response.data);
        setCapitalAmount(response.data.company_capital.amount.toString());
        setFixedCostsAmount(response.data.fixed_costs.total.toString());
      }
    } catch (error: any) {
      console.error("Error loading summary report:", error);
      Alert.alert("Lỗi", "Không thể tải báo cáo tổng");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUpdateCapital = async () => {
    try {
      setSaving(true);
      const amount = parseFloat(capitalAmount);
      if (isNaN(amount) || amount < 0) {
        Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ");
        return;
      }
      await summaryReportApi.updateCompanyCapital(amount);
      setShowCapitalModal(false);
      loadData();
      Alert.alert("Thành công", "Đã cập nhật vốn công ty");
    } catch (error: any) {
      Alert.alert("Lỗi", "Không thể cập nhật vốn công ty");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFixedCosts = async () => {
    try {
      setSaving(true);
      const amount = parseFloat(fixedCostsAmount);
      if (isNaN(amount) || amount < 0) {
        Alert.alert("Lỗi", "Vui lòng nhập số tiền hợp lệ");
        return;
      }
      await summaryReportApi.updateFixedCosts(amount);
      setShowFixedCostsModal(false);
      loadData();
      Alert.alert("Thành công", "Đã cập nhật chi phí cố định");
    } catch (error: any) {
      Alert.alert("Lỗi", "Không thể cập nhật chi phí cố định");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatNumber = (amount: number) => {
    return new Intl.NumberFormat("vi-VN").format(amount);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Đang tải báo cáo...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="document-text-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyText}>Không có dữ liệu</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: "#FFFFFF",
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#FFFFFF",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    fillShadowGradient: "#3B82F6",
    fillShadowGradientOpacity: 0.1,
    strokeWidth: 3,
    barPercentage: 0.7,
    formatYLabel: (value) => {
      const num = parseFloat(value);
      if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}T`;
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return value;
    },
    style: {
      borderRadius: 16,
    },
  };

  // Prepare chart data
  const monthlyData = report.charts.monthly;
  const hasMonthlyData = monthlyData.length > 0;

  // Calculate project costs (total expenses - salary costs - fixed costs)
  const projectCosts = Math.max(0, report.summary.total_expenses - report.salary_costs.total - report.fixed_costs.total);
  
  // Pie chart data for expenses breakdown with better details
  const expensesData = [
    {
      name: "Chi phí công trình",
      amount: projectCosts,
      color: "#3B82F6",
      legendFontColor: "#1F2937",
      legendFontSize: 13,
    },
    {
      name: "Chi phí lương",
      amount: report.salary_costs.total,
      color: "#F59E0B",
      legendFontColor: "#1F2937",
      legendFontSize: 13,
    },
    {
      name: "Chi phí cố định",
      amount: report.fixed_costs.total,
      color: "#8B5CF6",
      legendFontColor: "#1F2937",
      legendFontSize: 13,
    },
  ].filter((item) => item.amount > 0);

  // Calculate percentages for expense breakdown
  const totalExpensesForBreakdown = expensesData.reduce((sum, item) => sum + item.amount, 0);
  const expensesWithPercentage = expensesData.map((item) => ({
    ...item,
    percentage: totalExpensesForBreakdown > 0 
      ? ((item.amount / totalExpensesForBreakdown) * 100).toFixed(1)
      : "0",
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Báo Cáo Tổng</Text>
          <Ionicons name="bar-chart" size={28} color="#3B82F6" />
        </View>
        <View style={styles.periodSelector}>
          {(["all", "month", "quarter", "year"] as const).map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodButton,
                period === p && styles.periodButtonActive,
              ]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  period === p && styles.periodButtonTextActive,
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

      {/* Summary Cards - Grid Layout */}
      <View style={styles.summarySection}>
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
            <View style={styles.summaryCardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="wallet" size={20} color="#3B82F6" />
              </View>
              <TouchableOpacity
                onPress={() => setShowCapitalModal(true)}
                style={styles.editButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="create-outline" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.summaryCardLabel}>Vốn Công Ty</Text>
            <Text style={styles.summaryCardValue}>
              {formatCurrency(report.company_capital.amount)}
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.summaryCardSuccess]}>
            <View style={styles.summaryCardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="trending-up" size={20} color="#10B981" />
              </View>
            </View>
            <Text style={styles.summaryCardLabel}>Lợi Nhuận Ròng</Text>
            <Text
              style={[
                styles.summaryCardValue,
                {
                  color:
                    report.summary.net_profit >= 0 ? "#10B981" : "#EF4444",
                },
              ]}
            >
              {formatCurrency(report.summary.net_profit)}
            </Text>
            <View style={styles.marginBadge}>
              <Text style={styles.marginText}>
                {report.summary.profit_margin >= 0 ? "↑" : "↓"}{" "}
                {Math.abs(report.summary.profit_margin).toFixed(1)}%
              </Text>
            </View>
          </View>

          <View style={[styles.summaryCard, styles.summaryCardWarning]}>
            <View style={styles.summaryCardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: "#FFFBEB" }]}>
                <Ionicons name="cash" size={20} color="#F59E0B" />
              </View>
            </View>
            <Text style={styles.summaryCardLabel}>Tổng Doanh Thu</Text>
            <Text style={styles.summaryCardValue}>
              {formatCurrency(report.summary.total_revenue)}
            </Text>
          </View>

          <View style={[styles.summaryCard, styles.summaryCardDanger]}>
            <View style={styles.summaryCardHeader}>
              <View style={[styles.iconContainer, { backgroundColor: "#FEF2F2" }]}>
                <Ionicons name="receipt" size={20} color="#EF4444" />
              </View>
            </View>
            <Text style={styles.summaryCardLabel}>Tổng Chi Phí</Text>
            <Text style={styles.summaryCardValue}>
              {formatCurrency(report.summary.total_expenses)}
            </Text>
          </View>
        </View>
      </View>

      {/* Project Profits Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIconContainer, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="folder" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.sectionTitle}>Lợi Nhuận Công Trình</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Tổng lợi nhuận</Text>
            <Text style={styles.statValue}>
              {formatCurrency(report.project_profits.total_profit)}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Số lượng công trình</Text>
            <Text style={styles.statValue}>
              {report.project_profits.project_count}
            </Text>
          </View>
        </View>

        {/* Project List */}
        {report.project_profits.projects.length > 0 && (
          <View style={styles.projectList}>
            {report.project_profits.projects.map((project) => (
              <TouchableOpacity
                key={project.id}
                style={styles.projectItem}
                onPress={() => router.push(`/projects/${project.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.projectItemHeader}>
                  <View style={styles.projectItemLeft}>
                    <Text style={styles.projectName} numberOfLines={1}>
                      {project.name}
                    </Text>
                    <Text style={styles.projectCode}>{project.code}</Text>
                  </View>
                  <View style={styles.projectItemRight}>
                    <Text
                      style={[
                        styles.projectProfit,
                        {
                          color: project.profit >= 0 ? "#10B981" : "#EF4444",
                        },
                      ]}
                    >
                      {formatCurrency(project.profit)}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#9CA3AF"
                    />
                  </View>
                </View>
                <View style={styles.projectDetails}>
                  <View style={styles.projectDetailItem}>
                    <Ionicons name="arrow-down-circle" size={14} color="#10B981" />
                    <Text style={styles.projectDetailLabel}>Thu:</Text>
                    <Text style={styles.projectDetailValue}>
                      {formatCurrency(project.revenue)}
                    </Text>
                  </View>
                  <View style={styles.projectDetailItem}>
                    <Ionicons name="arrow-up-circle" size={14} color="#EF4444" />
                    <Text style={styles.projectDetailLabel}>Chi:</Text>
                    <Text style={styles.projectDetailValue}>
                      {formatCurrency(project.total_costs)}
                    </Text>
                  </View>
                  <View style={styles.projectDetailItem}>
                    <Ionicons name="percent" size={14} color="#6B7280" />
                    <Text style={styles.projectDetailLabel}>Biên:</Text>
                    <Text
                      style={[
                        styles.projectDetailValue,
                        {
                          color:
                            project.profit_margin >= 0 ? "#10B981" : "#EF4444",
                        },
                      ]}
                    >
                      {project.profit_margin.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Fixed Costs & Salary Costs - Side by Side */}
      <View style={styles.costsRow}>
        <View style={[styles.section, styles.costCard]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIconContainer, { backgroundColor: "#F5F3FF" }]}>
                <Ionicons name="document-text" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.sectionTitle}>Chi Phí Cố Định</Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowFixedCostsModal(true)}
              style={styles.editButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="create-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionValue}>
            {formatCurrency(report.fixed_costs.total)}
          </Text>
          <Text style={styles.sectionSubtitle}>
            Nhập tay bằng phiếu chi
          </Text>
        </View>

        <View style={[styles.section, styles.costCard]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIconContainer, { backgroundColor: "#FFFBEB" }]}>
                <Ionicons name="people" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.sectionTitle}>Chi Phí Lương</Text>
            </View>
          </View>
          <Text style={styles.sectionValue}>
            {formatCurrency(report.salary_costs.total)}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {report.salary_costs.count} bảng lương
          </Text>
        </View>
      </View>

      {/* Charts Section */}
      {hasMonthlyData && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <View style={[styles.sectionIconContainer, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="analytics" size={20} color="#3B82F6" />
              </View>
              <Text style={styles.sectionTitle}>Biểu Đồ Phân Tích</Text>
            </View>
          </View>

          {/* Revenue vs Costs Line Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Doanh Thu vs Chi Phí</Text>
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
            <LineChart
              data={monthlyData.map((d) => ({
                value: d.revenue,
                label: (() => {
                  const [year, month] = d.period.split("-");
                  return `${month}/${year.slice(2)}`;
                })(),
              }))}
              data2={monthlyData.map((d) => ({
                value: d.total_costs,
              }))}
              width={screenWidth - 64}
              height={260}
              spacing={40}
              thickness={3}
              color="#10B981"
              color2="#EF4444"
              hideRules={false}
              rulesType="solid"
              rulesColor="#E5E7EB"
              yAxisColor="#E5E7EB"
              xAxisColor="#E5E7EB"
              yAxisTextStyle={{ color: "#6B7280", fontSize: 10 }}
              xAxisLabelTextStyle={{ color: "#6B7280", fontSize: 10, rotation: 0 }}
              curved
              areaChart
              startFillColor="#10B981"
              startOpacity={0.1}
              endFillColor="#10B981"
              endOpacity={0}
              startFillColor2="#EF4444"
              startOpacity2={0.1}
              endFillColor2="#EF4444"
              endOpacity2={0}
              hideDataPoints={false}
              dataPointsColor="#10B981"
              dataPointsColor2="#EF4444"
              dataPointsRadius={5}
              textShiftY={-2}
              textShiftX={-5}
              textFontSize={10}
              textColor="#6B7280"
              formatYLabel={(value) => {
                const num = parseFloat(value);
                if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}T`;
                if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
                return value;
              }}
            />
          </View>

          {/* Profit Bar Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Lợi Nhuận Theo Tháng</Text>
              <View style={styles.profitSummary}>
                <Text style={styles.profitSummaryText}>
                  Tổng: {formatCurrency(monthlyData.reduce((sum, d) => sum + d.profit, 0))}
                </Text>
              </View>
            </View>
            <BarChart
              data={monthlyData.map((d, index) => {
                const profitValue = d.profit;
                return {
                  value: profitValue,
                  label: (() => {
                    const [year, month] = d.period.split("-");
                    return `${month}/${year.slice(2)}`;
                  })(),
                  frontColor: profitValue >= 0 ? "#10B981" : "#EF4444",
                  topLabelComponent: () => (
                    <Text
                      style={{
                        color: profitValue >= 0 ? "#10B981" : "#EF4444",
                        fontSize: 10,
                        fontWeight: "600",
                      }}
                    >
                      {profitValue >= 0 ? "+" : ""}
                      {Math.abs(profitValue) >= 1000000
                        ? formatNumber(Math.round(profitValue / 1000000)) + "M"
                        : Math.abs(profitValue) >= 1000
                        ? formatNumber(Math.round(profitValue / 1000)) + "K"
                        : formatNumber(Math.round(profitValue))}
                    </Text>
                  ),
                };
              })}
              width={screenWidth - 64}
              height={260}
              barWidth={30}
              spacing={20}
              roundedTop
              roundedBottom
              hideRules={false}
              rulesType="solid"
              rulesColor="#E5E7EB"
              yAxisThickness={1}
              xAxisThickness={1}
              yAxisColor="#E5E7EB"
              xAxisColor="#E5E7EB"
              yAxisTextStyle={{ color: "#6B7280", fontSize: 10 }}
              xAxisLabelTextStyle={{ color: "#6B7280", fontSize: 10 }}
              formatYLabel={(value) => {
                const num = parseFloat(value);
                if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}T`;
                if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
                return value;
              }}
              noOfSections={4}
              maxValue={Math.max(...monthlyData.map((d) => Math.abs(d.profit))) * 1.2}
              minValue={Math.min(...monthlyData.map((d) => d.profit)) * 1.2}
            />
          </View>

          {/* Expenses Pie Chart */}
          {expensesData.length > 0 && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.chartTitle}>Phân Bổ Chi Phí</Text>
                <Text style={styles.chartSubtitle}>
                  Tổng: {formatCurrency(totalExpensesForBreakdown)}
                </Text>
              </View>
              <View style={styles.pieChartContainer}>
                <PieChart
                  data={expensesData.map((item) => ({
                    value: item.amount,
                    color: item.color,
                    gradientCenterColor: item.color,
                    focused: false,
                  }))}
                  donut
                  radius={90}
                  innerRadius={60}
                  innerCircleColor="#FFFFFF"
                  centerLabelComponent={() => (
                    <View style={styles.pieCenterLabel}>
                      <Text style={styles.pieCenterText}>
                        {formatCurrency(totalExpensesForBreakdown)}
                      </Text>
                      <Text style={styles.pieCenterSubtext}>Tổng chi phí</Text>
                    </View>
                  )}
                  textColor="#1F2937"
                  textSize={12}
                  showText
                  showValuesAsLabels
                  labelsPosition="outward"
                />
                {/* Custom Legend with percentages */}
                <View style={styles.expenseLegend}>
                  {expensesWithPercentage.map((item, index) => (
                    <View key={index} style={styles.expenseLegendItem}>
                      <View style={styles.expenseLegendLeft}>
                        <View style={[styles.expenseLegendDot, { backgroundColor: item.color }]} />
                        <View style={styles.expenseLegendTextContainer}>
                          <Text style={styles.expenseLegendName}>{item.name}</Text>
                          <Text style={styles.expenseLegendAmount}>
                            {formatCurrency(item.amount)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.expenseLegendRight}>
                        <View style={[styles.percentageBadge, { backgroundColor: item.color + "20" }]}>
                          <Text style={[styles.percentageText, { color: item.color }]}>
                            {item.percentage}%
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Update Capital Modal */}
      <Modal
        visible={showCapitalModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCapitalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cập Nhật Vốn Công Ty</Text>
            <TextInput
              style={styles.modalInput}
              value={capitalAmount}
              onChangeText={setCapitalAmount}
              placeholder="Nhập số tiền"
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowCapitalModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleUpdateCapital}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Update Fixed Costs Modal */}
      <Modal
        visible={showFixedCostsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFixedCostsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cập Nhật Chi Phí Cố Định</Text>
            <TextInput
              style={styles.modalInput}
              value={fixedCostsAmount}
              onChangeText={setFixedCostsAmount}
              placeholder="Nhập số tiền"
              keyboardType="numeric"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowFixedCostsModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleUpdateFixedCosts}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingBottom: 24,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.5,
  },
  periodSelector: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    minWidth: 70,
    alignItems: "center",
  },
  periodButtonActive: {
    backgroundColor: "#3B82F6",
  },
  periodButtonText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  periodButtonTextActive: {
    color: "#FFFFFF",
  },
  summarySection: {
    padding: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    width: (screenWidth - 44) / 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  summaryCardPrimary: {
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
  },
  summaryCardSuccess: {
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  summaryCardWarning: {
    borderLeftWidth: 4,
    borderLeftColor: "#F59E0B",
  },
  summaryCardDanger: {
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
  },
  summaryCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryCardLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    marginBottom: 8,
  },
  summaryCardValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.5,
  },
  summaryCardSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  marginBadge: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#ECFDF5",
  },
  marginText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10B981",
  },
  editButton: {
    padding: 4,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.3,
  },
  sectionValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  costsRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  costCard: {
    flex: 1,
    marginHorizontal: 0,
    marginBottom: 0,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 6,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    letterSpacing: -0.3,
  },
  projectList: {
    gap: 12,
    marginTop: 4,
  },
  projectItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  projectItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  projectItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  projectItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  projectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  projectCode: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  projectProfit: {
    fontSize: 16,
    fontWeight: "700",
  },
  projectDetails: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  projectDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  projectDetailLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  projectDetailValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
    letterSpacing: -0.3,
  },
  chartLegend: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  chart: {
    borderRadius: 12,
    marginTop: 8,
  },
  chartSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    marginTop: 4,
  },
  profitSummary: {
    marginTop: 8,
  },
  profitSummaryText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600",
  },
  barValuesContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
    paddingHorizontal: 8,
  },
  barValueItem: {
    flex: 1,
    alignItems: "center",
  },
  barValueText: {
    fontSize: 10,
    fontWeight: "600",
  },
  pieChartContainer: {
    alignItems: "center",
  },
  expenseLegend: {
    width: "100%",
    marginTop: 20,
    gap: 12,
  },
  expenseLegendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  expenseLegendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  expenseLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  expenseLegendTextContainer: {
    flex: 1,
  },
  expenseLegendName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  expenseLegendAmount: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  expenseLegendRight: {
    marginLeft: 12,
  },
  percentageBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
  },
  percentageText: {
    fontSize: 13,
    fontWeight: "700",
  },
  pieCenterLabel: {
    alignItems: "center",
    justifyContent: "center",
  },
  pieCenterText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  pieCenterSubtext: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 20,
    letterSpacing: -0.3,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
    fontWeight: "500",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  modalButtonCancel: {
    backgroundColor: "#F3F4F6",
  },
  modalButtonSave: {
    backgroundColor: "#3B82F6",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
});

