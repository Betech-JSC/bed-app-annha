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
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function MonitoringDashboardScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await monitoringApi.getDashboard();
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải dữ liệu dashboard");
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

  if (loading && !dashboardData) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Giám sát Dự án" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Giám sát Dự án" />
      <ScrollView
        style={[styles.scrollView, { marginBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Cards */}
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
  summaryContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
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
  section: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
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
    paddingTop: 0,
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


