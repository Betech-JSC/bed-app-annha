import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { evmApi, EvmAnalysis } from "@/api/evmApi";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function ProjectEvmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState<EvmAnalysis | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await evmApi.analyzePerformance(id!);
      if (response.success) {
        setAnalysis(response.data);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải dữ liệu EVM");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "on_track":
        return "#10B981";
      case "at_risk":
        return "#F59E0B";
      case "off_track":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const formatCurrency = (value?: number) => {
    if (value === null || value === undefined || value === 0) return "0 VNĐ";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const formatPercentage = (value?: number) => {
    if (value === null || value === undefined || typeof value !== 'number' || isNaN(value)) return "0%";
    return `${value.toFixed(2)}%`;
  };

  if (loading && !analysis) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Phân Tích EVM" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Phân Tích EVM" />
        <View style={styles.emptyContainer}>
          <Ionicons name="information-circle-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Không có dữ liệu EVM</Text>
        </View>
      </View>
    );
  }

  const metric = analysis.metric;

  return (
    <View style={styles.container}>
      <ScreenHeader title="EVM Analysis" />
      <ScrollView
        style={[styles.scrollView, { marginBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status Overview */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(analysis.status) + "20" }]}>
            <Ionicons name="pulse-outline" size={24} color={getStatusColor(analysis.status)} />
            <Text style={[styles.statusText, { color: getStatusColor(analysis.status) }]}>
              {analysis.status === "on_track" ? "Đúng tiến độ" : 
               analysis.status === "at_risk" ? "Có rủi ro" : "Chậm tiến độ"}
            </Text>
          </View>
        </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chỉ số Hiệu suất</Text>
          
          <View style={styles.metricRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>CPI (Chỉ Số Hiệu Suất Chi Phí)</Text>
              {metric.cost_performance_index != null && typeof metric.cost_performance_index === 'number' ? (
                <>
                  <Text style={[styles.metricValue, { color: metric.cost_performance_index >= 1 ? "#10B981" : "#EF4444" }]}>
                    {metric.cost_performance_index.toFixed(3)}
                  </Text>
                  <Text style={styles.metricDescription}>
                    {metric.cost_performance_index >= 1 
                      ? "Đang trong ngân sách" 
                      : metric.cost_performance_index === 0
                        ? "Chưa có tiến độ"
                        : "Vượt ngân sách"}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.metricValue, { color: "#6B7280", fontSize: 16 }]}>
                    Chưa có dữ liệu
                  </Text>
                  <Text style={styles.metricDescription}>
                    {metric.actual_cost === 0 || !metric.actual_cost
                      ? "Chưa có chi phí thực tế để tính toán"
                      : "Không thể tính toán"}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>SPI (Chỉ Số Hiệu Suất Tiến Độ)</Text>
              {metric.schedule_performance_index != null && typeof metric.schedule_performance_index === 'number' ? (
                <>
                  <Text style={[styles.metricValue, { color: metric.schedule_performance_index >= 1 ? "#10B981" : "#EF4444" }]}>
                    {metric.schedule_performance_index.toFixed(3)}
                  </Text>
                  <Text style={styles.metricDescription}>
                    {metric.schedule_performance_index >= 1 
                      ? "Đúng tiến độ" 
                      : metric.schedule_performance_index === 0
                        ? "Chưa có tiến độ"
                        : "Chậm tiến độ"}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.metricValue, { color: "#6B7280", fontSize: 16 }]}>
                    Chưa có dữ liệu
                  </Text>
                  <Text style={styles.metricDescription}>
                    {metric.planned_value === 0 || !metric.planned_value
                      ? "Chưa có ngân sách hoặc chưa đến thời điểm bắt đầu"
                      : "Không thể tính toán"}
                  </Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Values */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giá trị EVM</Text>
          
          <View style={styles.valueCard}>
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>Giá Trị Kế Hoạch (PV)</Text>
              <Text style={styles.valueAmount}>{formatCurrency(metric.planned_value)}</Text>
            </View>
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>Giá Trị Đạt Được (EV)</Text>
              <Text style={styles.valueAmount}>{formatCurrency(metric.earned_value)}</Text>
            </View>
            <View style={styles.valueRow}>
              <Text style={styles.valueLabel}>Chi Phí Thực Tế (AC)</Text>
              <Text style={styles.valueAmount}>{formatCurrency(metric.actual_cost)}</Text>
            </View>
          </View>
        </View>

        {/* Variances */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chênh lệch</Text>
          
          <View style={styles.varianceCard}>
            <View style={styles.varianceRow}>
              <Text style={styles.varianceLabel}>Chênh Lệch Chi Phí (CV)</Text>
              <Text style={[styles.varianceValue, { color: (metric.cost_variance || 0) >= 0 ? "#10B981" : "#EF4444" }]}>
                {formatCurrency(metric.cost_variance)}
              </Text>
            </View>
            <View style={styles.varianceRow}>
              <Text style={styles.varianceLabel}>Chênh Lệch Tiến Độ (SV)</Text>
              <Text style={[styles.varianceValue, { color: (metric.schedule_variance || 0) >= 0 ? "#10B981" : "#EF4444" }]}>
                {formatCurrency(metric.schedule_variance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Estimates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dự đoán</Text>
          
          <View style={styles.estimateCard}>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Ngân Sách Hoàn Thành (BAC)</Text>
              <Text style={styles.estimateValue}>{formatCurrency(metric.budget_at_completion)}</Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Ước Tính Hoàn Thành (EAC)</Text>
              <Text style={styles.estimateValue}>{formatCurrency(metric.estimate_at_completion)}</Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Ước Tính Còn Lại (ETC)</Text>
              <Text style={styles.estimateValue}>{formatCurrency(metric.estimate_to_complete)}</Text>
            </View>
            <View style={styles.estimateRow}>
              <Text style={styles.estimateLabel}>Chênh Lệch Hoàn Thành (VAC)</Text>
              <Text style={[styles.estimateValue, { color: (metric.variance_at_completion || 0) >= 0 ? "#10B981" : "#EF4444" }]}>
                {formatCurrency(metric.variance_at_completion)}
              </Text>
            </View>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tiến độ</Text>
          <View style={styles.progressCard}>
            <Text style={styles.progressValue}>
              {metric.progress_percentage != null && typeof metric.progress_percentage === 'number'
                ? `${metric.progress_percentage.toFixed(2)}%`
                : "0%"}
            </Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${metric.progress_percentage != null && typeof metric.progress_percentage === 'number'
                      ? Math.max(0, Math.min(100, metric.progress_percentage))
                      : 0}%` 
                  }
                ]} 
              />
            </View>
            {metric.progress_percentage == null && (
              <Text style={styles.progressNote}>
                Chưa có dữ liệu tiến độ. Vui lòng cập nhật tiến độ dự án.
              </Text>
            )}
          </View>
        </View>

        {/* Warnings & Recommendations */}
        {analysis.warnings && analysis.warnings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cảnh báo</Text>
            {analysis.warnings.map((warning, index) => (
              <View key={index} style={styles.warningCard}>
                <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                <Text style={styles.warningText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}

        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Khuyến nghị</Text>
            {analysis.recommendations.map((rec, index) => (
              <View key={index} style={styles.recommendationCard}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                <Text style={styles.recommendationText}>{rec}</Text>
              </View>
            ))}
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
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
  statusCard: {
    padding: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderRadius: 12,
    alignSelf: "center",
  },
  statusText: {
    fontSize: 16,
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
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  metricDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  valueCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  valueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  valueLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  valueAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  varianceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  varianceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  varianceLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  varianceValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  estimateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  estimateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  estimateLabel: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  estimateValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  progressValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 16,
  },
  progressBar: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
  },
  progressNote: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#FEF3C7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: "#92400E",
    lineHeight: 20,
  },
  recommendationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#D1FAE5",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: "#065F46",
    lineHeight: 20,
  },
});

