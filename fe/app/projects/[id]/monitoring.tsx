import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { monitoringApi, ProjectMonitoringData } from "@/api/monitoringApi";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function ProjectMonitoringScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [monitoringData, setMonitoringData] = useState<ProjectMonitoringData | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await monitoringApi.getProjectMonitoring(id!);
      if (response.success) {
        setMonitoringData(response.data);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải dữ liệu giám sát");
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

  const handleAlertPress = (alert: any) => {
    switch (alert.type) {
      case "risk":
        router.push(`/projects/${id}/risks`);
        break;
      case "change_request":
        router.push(`/projects/${id}/change-requests`);
        break;
      case "delay":
      case "deadline":
        router.push(`/projects/${id}/construction-plan`);
        break;
      case "budget":
        router.push(`/projects/${id}/budget`);
        break;
      case "defects":
        router.push(`/projects/${id}/defects`);
        break;
      default:
        break;
    }
  };

  if (loading && !monitoringData) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Giám Sát Dự Án" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (!monitoringData) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Giám Sát Dự Án" />
        <View style={styles.emptyContainer}>
          <Ionicons name="information-circle-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Không có dữ liệu giám sát</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Giám Sát Dự Án" />
      <ScrollView
        style={[styles.scrollView, { marginBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Metrics */}
        <View style={styles.metricsContainer}>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {monitoringData.metrics.progress != null
                ? monitoringData.metrics.progress.toFixed(1)
                : "0.0"}
              %
            </Text>
            <Text style={styles.metricLabel}>Tiến độ</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {monitoringData.metrics.open_defects ?? 0}
            </Text>
            <Text style={styles.metricLabel}>Lỗi mở</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: "#EF4444" }]}>
              {monitoringData.metrics.high_risks ?? 0}
            </Text>
            <Text style={styles.metricLabel}>Rủi ro cao</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricValue}>
              {monitoringData.metrics.pending_changes ?? 0}
            </Text>
            <Text style={styles.metricLabel}>Yêu cầu thay đổi</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={[styles.metricValue, { color: "#F59E0B" }]}>
              {monitoringData.metrics.overdue_tasks ?? 0}
            </Text>
            <Text style={styles.metricLabel}>Công việc quá hạn</Text>
          </View>
        </View>

        {/* Alerts */}
        {monitoringData.alerts && monitoringData.alerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cảnh báo ({monitoringData.alerts.length})</Text>
            {monitoringData.alerts.map((alert, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.alertCard,
                  { borderLeftColor: getSeverityColor(alert.severity) },
                ]}
                onPress={() => handleAlertPress(alert)}
              >
                <View style={styles.alertHeader}>
                  <View
                    style={[
                      styles.alertIconContainer,
                      { backgroundColor: getSeverityColor(alert.severity) + "20" },
                    ]}
                  >
                    <Ionicons
                      name={getAlertTypeIcon(alert.type) as any}
                      size={20}
                      color={getSeverityColor(alert.severity)}
                    />
                  </View>
                  <View style={styles.alertContent}>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                    <View style={styles.alertMeta}>
                      <View
                        style={[
                          styles.severityBadge,
                          { backgroundColor: getSeverityColor(alert.severity) + "20" },
                        ]}
                      >
                        <Text
                          style={[styles.severityText, { color: getSeverityColor(alert.severity) }]}
                        >
                          {alert.severity}
                        </Text>
                      </View>
                      <Text style={styles.alertType}>{alert.type}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push(`/projects/${id}/risks`)}
            >
              <Ionicons name="shield-outline" size={24} color="#EF4444" />
              <Text style={styles.quickActionText}>Rủi ro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push(`/projects/${id}/change-requests`)}
            >
              <Ionicons name="document-text-outline" size={24} color="#6366F1" />
              <Text style={styles.quickActionText}>Yêu cầu thay đổi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push(`/projects/${id}/evm`)}
            >
              <Ionicons name="analytics-outline" size={24} color="#06B6D4" />
              <Text style={styles.quickActionText}>EVM</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => router.push(`/projects/${id}/predictions`)}
            >
              <Ionicons name="trending-up-outline" size={24} color="#F59E0B" />
              <Text style={styles.quickActionText}>Dự đoán</Text>
            </TouchableOpacity>
          </View>
        </View>

        {(!monitoringData.alerts || monitoringData.alerts.length === 0) && (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Không có cảnh báo</Text>
            <Text style={styles.emptySubtext}>Dự án đang hoạt động bình thường</Text>
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
  metricsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: "30%",
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
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
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
  alertMessage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 6,
  },
  alertMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  alertType: {
    fontSize: 12,
    color: "#6B7280",
    textTransform: "capitalize",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 8,
    textAlign: "center",
  },
});

