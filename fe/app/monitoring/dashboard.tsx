import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { monitoringApi, MonitoringAlert } from "@/api/monitoringApi";
import { companyFinancialReportApi, CompanyFinancialSummary } from '@/api/companyFinancialReportApi';
import { ScreenHeader, PermissionGuard } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { usePermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";
import { LineChart, BarChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export default function MonitoringDashboardScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const { hasPermission } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [financialSummary, setFinancialSummary] = useState<CompanyFinancialSummary | null>(null);
  const [financialTrends, setFinancialTrends] = useState<any[]>([]);
  const [unauthorized, setUnauthorized] = useState(false);

  const canViewFinance = hasPermission(Permissions.OPERATIONS_DASHBOARD_VIEW);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const promises: Promise<any>[] = [monitoringApi.getDashboard()];
      
      if (canViewFinance) {
        promises.push(companyFinancialReportApi.getSummary());
        promises.push(companyFinancialReportApi.getTrend(6));
      }

      const results = await Promise.all(promises);
      
      if (results[0].success) {
        setDashboardData(results[0].data);
      }

      if (canViewFinance && results[1]?.success && results[2]?.success) {
        setFinancialSummary(results[1].data);
        setFinancialTrends(results[2].data);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setUnauthorized(true);
      } else {
        Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải dữ liệu dashboard");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "#DC2626";
      case "high":
        return "#EF4444";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#6B7280";
      default:
        return "#6B7280";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return "alert-circle";
      case "high":
        return "warning";
      case "medium":
        return "information-circle";
      case "low":
        return "checkmark-circle";
      default:
        return "ellipse";
    }
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case "delay":
        return "time-outline";
      case "budget":
        return "cash-outline";
      case "defects":
        return "bug-outline";
      case "risk":
        return "warning-outline";
      case "change_request":
        return "document-text-outline";
      case "deadline":
        return "calendar-outline";
      default:
        return "alert-circle-outline";
    }
  };

  if (loading && !dashboardData && !unauthorized) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Giám sát Dự án" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (unauthorized) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Tổng quan Dashboard" />
        <View style={styles.emptyContainer}>
          <Ionicons name="lock-closed-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Hạn chế truy cập</Text>
          <Text style={styles.emptySubtext}>Bạn không có quyền xem dữ liệu tổng quan này. Vui lòng liên hệ quản trị viên.</Text>
          <TouchableOpacity 
            style={{ marginTop: 24, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#3B82F6', borderRadius: 8 }}
            onPress={() => router.back()}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Quay lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Tổng quan Dashboard" />
      <ScrollView
        style={[styles.scrollView, { marginBottom: tabBarHeight }]}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Section 1: Financial Overview (Only for enabled users) */}
        {canViewFinance && financialSummary && (
          <View style={styles.financialSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tình hình Tài chính</Text>
              <TouchableOpacity onPress={() => router.push('/company-financial')}>
                <Text style={styles.seeMoreText}>Chi tiết</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.summaryGrid}>
              <View style={[styles.summaryCard, { borderLeftColor: '#8B5CF6', borderLeftWidth: 4 }]}>
                <Ionicons name="business-outline" size={20} color="#8B5CF6" />
                <Text style={styles.summaryLabel}>Vốn Công Ty</Text>
                <Text style={styles.summaryValue}>
                  {formatCompact((financialSummary.summary as any).total_capital || 0)}
                </Text>
              </View>

              <View style={[styles.summaryCard, styles.revenueCard]}>
                <Ionicons name="trending-up" size={20} color="#10B981" />
                <Text style={styles.summaryLabel}>Doanh Thu</Text>
                <Text style={styles.summaryValue}>
                  {formatCompact(financialSummary.summary.total_revenue)}
                </Text>
              </View>

              <View style={[styles.summaryCard, styles.profitCard]}>
                <Ionicons name="cash-outline" size={20} color="#3B82F6" />
                <Text style={styles.summaryLabel}>Lợi Nhuận</Text>
                <Text style={styles.summaryValue}>
                  {formatCompact(financialSummary.summary.net_profit)}
                </Text>
              </View>
            </View>

            {/* Financial Trends Chart */}
            {financialTrends.length > 0 && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Lợi nhuận 6 tháng</Text>
                <LineChart
                  data={{
                    labels: financialTrends.map(t => t.month_name.split(' ')[0]),
                    datasets: [{ data: financialTrends.map(t => t.net_profit) }]
                  }}
                  width={screenWidth - 48}
                  height={180}
                  chartConfig={chartConfig}
                  bezier
                  style={styles.chart}
                />
              </View>
            )}
          </View>
        )}

        {/* Section 2: Project Monitoring Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giám sát Dự án</Text>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{dashboardData?.total_projects || 0}</Text>
              <Text style={styles.summaryLabel}>Tổng dự án</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{dashboardData?.active_projects || 0}</Text>
              <Text style={styles.summaryLabel}>Đang thực hiện</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: "#EF4444" }]}>
                {dashboardData?.at_risk_projects || 0}
              </Text>
              <Text style={styles.summaryLabel}>Có rủi ro</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={[styles.summaryValue, { color: "#F59E0B" }]}>
                {dashboardData?.total_alerts || 0}
              </Text>
              <Text style={styles.summaryLabel}>Cảnh báo</Text>
            </View>
          </View>
        </View>

        {/* Progress Overview */}
        {dashboardData?.progress_overview && dashboardData.progress_overview.length > 0 && (
          <View style={styles.progressSection}>
            <Text style={styles.sectionTitle}>Tổng Quan Tiến Độ</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {dashboardData.progress_overview.map((project: any) => (
                <TouchableOpacity
                  key={project.project_id}
                  style={styles.progressCard}
                  onPress={() => router.push(`/projects/${project.project_id}/progress-overview`)}
                >
                  <Text style={styles.progressProjectName} numberOfLines={1}>
                    {project.project_name}
                  </Text>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${project.overall_progress}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressPercentage}>
                      {project.overall_progress.toFixed(0)}%
                    </Text>
                  </View>
                  <View style={styles.progressStats}>
                    <View style={styles.progressStatItem}>
                      <Text style={styles.progressStatLabel}>Tổng</Text>
                      <Text style={styles.progressStatValue}>{project.total_tasks}</Text>
                    </View>
                    {project.delayed_tasks > 0 && (
                      <View style={styles.progressStatItem}>
                        <Text style={[styles.progressStatLabel, { color: "#EF4444" }]}>Trễ</Text>
                        <Text style={[styles.progressStatValue, { color: "#EF4444" }]}>
                          {project.delayed_tasks}
                        </Text>
                      </View>
                    )}
                    {project.high_priority_tasks > 0 && (
                      <View style={styles.progressStatItem}>
                        <Text style={[styles.progressStatLabel, { color: "#F59E0B" }]}>Ưu tiên</Text>
                        <Text style={[styles.progressStatValue, { color: "#F59E0B" }]}>
                          {project.high_priority_tasks}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Alert Summary */}
        {dashboardData?.summary && (
          <View style={styles.alertSummaryContainer}>
            <Text style={styles.sectionTitle}>Tổng hợp Cảnh báo</Text>
            <View style={styles.alertSummaryRow}>
              <View style={[styles.alertSummaryBadge, { backgroundColor: "#DC262620" }]}>
                <Text style={[styles.alertSummaryText, { color: "#DC2626" }]}>
                  {dashboardData.summary.critical_alerts} Critical
                </Text>
              </View>
              <View style={[styles.alertSummaryBadge, { backgroundColor: "#EF444420" }]}>
                <Text style={[styles.alertSummaryText, { color: "#EF4444" }]}>
                  {dashboardData.summary.high_alerts} High
                </Text>
              </View>
              <View style={[styles.alertSummaryBadge, { backgroundColor: "#F59E0B20" }]}>
                <Text style={[styles.alertSummaryText, { color: "#F59E0B" }]}>
                  {dashboardData.summary.medium_alerts} Medium
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Critical & High Alerts */}
        {dashboardData?.alerts && dashboardData.alerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cảnh báo ({dashboardData.alerts.length})</Text>
            {dashboardData.alerts
              .filter((alert: MonitoringAlert) => alert.severity === "critical" || alert.severity === "high")
              .map((alert: MonitoringAlert, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.alertCard, { borderLeftColor: getSeverityColor(alert.severity) }]}
                  onPress={() => router.push(`/projects/${alert.project_id}`)}
                >
                  <View style={styles.alertHeader}>
                    <View style={[styles.alertIconContainer, { backgroundColor: getSeverityColor(alert.severity) + "20" }]}>
                      <Ionicons
                        name={getAlertTypeIcon(alert.type) as any}
                        size={20}
                        color={getSeverityColor(alert.severity)}
                      />
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertProjectName}>{alert.project_name}</Text>
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                    </View>
                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) + "20" }]}>
                      <Ionicons
                        name={getSeverityIcon(alert.severity) as any}
                        size={16}
                        color={getSeverityColor(alert.severity)}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {/* Overdue Tasks */}
        {dashboardData?.overdue_tasks && dashboardData.overdue_tasks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Công việc quá hạn ({dashboardData.overdue_tasks.length})
            </Text>
            {dashboardData.overdue_tasks.map((task: any, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.taskCard}
                onPress={() => router.push(`/projects/${task.project_id}/construction-plan`)}
              >
                <View style={styles.taskHeader}>
                  <Ionicons name="time-outline" size={18} color="#EF4444" />
                  <View style={styles.taskContent}>
                    <Text style={styles.taskName}>{task.name}</Text>
                    <Text style={styles.taskProject}>{task.project_name}</Text>
                  </View>
                  <View style={styles.overdueBadge}>
                    <Text style={styles.overdueText}>+{task.overdue_days} ngày</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* All Alerts (if any remaining) */}
        {dashboardData?.alerts && dashboardData.alerts.filter((a: MonitoringAlert) => a.severity !== "critical" && a.severity !== "high").length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cảnh báo khác</Text>
            {dashboardData.alerts
              .filter((alert: MonitoringAlert) => alert.severity !== "critical" && alert.severity !== "high")
              .map((alert: MonitoringAlert, index: number) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.alertCard, styles.alertCardMedium, { borderLeftColor: getSeverityColor(alert.severity) }]}
                  onPress={() => router.push(`/projects/${alert.project_id}`)}
                >
                  <View style={styles.alertHeader}>
                    <View style={[styles.alertIconContainer, { backgroundColor: getSeverityColor(alert.severity) + "20" }]}>
                      <Ionicons
                        name={getAlertTypeIcon(alert.type) as any}
                        size={18}
                        color={getSeverityColor(alert.severity)}
                      />
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={styles.alertProjectName}>{alert.project_name}</Text>
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
          </View>
        )}

        {(!dashboardData?.alerts || dashboardData.alerts.length === 0) &&
          (!dashboardData?.overdue_tasks || dashboardData.overdue_tasks.length === 0) && (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Không có cảnh báo</Text>
              <Text style={styles.emptySubtext}>Tất cả dự án đang hoạt động bình thường</Text>
            </View>
          )}
      </ScrollView>
    </View>
  );
}

// Helper functions for formatting
const formatCompact = (amount: number) => {
  if (amount >= 1000000000) return `${(amount / 1000000000).toFixed(1)}B`;
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toString();
};

const chartConfig = {
  backgroundColor: '#FFFFFF',
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#FFFFFF',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#3B82F6' },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  financialSection: {
    padding: 16,
    paddingBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeMoreText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  revenueCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  profitCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  chart: {
    borderRadius: 16,
    marginLeft: -16,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },
  section: {
    padding: 16,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  // ... rest of the styles carried over from project monitoring
  alertSummaryContainer: {
    padding: 16,
    paddingTop: 0,
  },
  alertSummaryRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  alertSummaryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  alertSummaryText: {
    fontSize: 12,
    fontWeight: "600",
  },
  alertCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  alertCardMedium: {
    opacity: 0.9,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  alertContent: {
    flex: 1,
  },
  alertProjectName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  severityBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  taskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#EF4444",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  taskProject: {
    fontSize: 12,
    color: "#6B7280",
  },
  overdueBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  overdueText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
    textAlign: "center",
  },
  progressSection: {
    padding: 16,
    paddingTop: 16,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  progressProjectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  progressBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    minWidth: 45,
  },
  progressStats: {
    flexDirection: "row",
    gap: 16,
  },
  progressStatItem: {
    alignItems: "center",
  },
  progressStatLabel: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
  },
  progressStatValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
});


