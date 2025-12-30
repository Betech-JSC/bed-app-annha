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
import { predictiveAnalyticsApi, PredictiveAnalysis } from "@/api/predictiveAnalyticsApi";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function PredictionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState<PredictiveAnalysis | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await predictiveAnalyticsApi.getFullAnalysis(id!);
      if (response.success) {
        setAnalysis(response.data);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải phân tích dự đoán");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case "critical":
        return "#DC2626";
      case "high":
        return "#EF4444";
      case "medium":
        return "#F59E0B";
      case "low":
        return "#10B981";
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Chưa có dữ liệu";
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  if (loading && !analysis) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Dự Đoán & Phân Tích" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Dự Đoán & Phân Tích" />
        <View style={styles.emptyContainer}>
          <Ionicons name="information-circle-outline" size={64} color="#D1D5DB" />
          <Text style={styles.emptyText}>Không có dữ liệu phân tích</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Dự Đoán & Phân Tích" />
      <ScrollView
        style={[styles.scrollView, { marginBottom: tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Overall Risk */}
        <View style={styles.riskCard}>
          <View
            style={[
              styles.riskBadge,
              { backgroundColor: getRiskLevelColor(analysis.overall_risk_level) + "20" },
            ]}
          >
            <Ionicons
              name="alert-circle-outline"
              size={24}
              color={getRiskLevelColor(analysis.overall_risk_level)}
            />
            <Text
              style={[styles.riskText, { color: getRiskLevelColor(analysis.overall_risk_level) }]}
            >
              Rủi ro tổng thể: {analysis.overall_risk_level === 'critical' ? 'Rất Cao' :
                analysis.overall_risk_level === 'high' ? 'Cao' :
                analysis.overall_risk_level === 'medium' ? 'Trung Bình' :
                analysis.overall_risk_level === 'low' ? 'Thấp' : 'Không xác định'}
            </Text>
          </View>
          <Text style={styles.riskScore}>Điểm Rủi Ro: {analysis.overall_risk_score}/100</Text>
        </View>

        {/* Completion Prediction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dự Đoán Ngày Hoàn Thành</Text>
          <View style={styles.predictionCard}>
            <View style={styles.predictionRow}>
              <Text style={styles.predictionLabel}>Ngày dự đoán</Text>
              <Text style={styles.predictionValue}>
                {formatDate(analysis.completion_prediction.predicted_date)}
              </Text>
            </View>
            <View style={styles.predictionRow}>
              <Text style={styles.predictionLabel}>Ngày kế hoạch</Text>
              <Text style={styles.predictionValue}>
                {formatDate(analysis.completion_prediction.planned_end_date)}
              </Text>
            </View>
            <View style={styles.predictionRow}>
              <Text style={styles.predictionLabel}>Chênh lệch</Text>
              <Text
                style={[
                  styles.predictionValue,
                  {
                    color:
                      analysis.completion_prediction.delay_days > 0 ? "#EF4444" : "#10B981",
                  },
                ]}
              >
                {analysis.completion_prediction.delay_days > 0 ? "+" : ""}
                {analysis.completion_prediction.delay_days} ngày
              </Text>
            </View>
            <View style={styles.predictionRow}>
              <Text style={styles.predictionLabel}>Độ tin cậy</Text>
              <Text style={styles.predictionValue}>
                {(analysis.completion_prediction.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Cost Prediction */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dự Đoán Chi Phí</Text>
          <View style={styles.predictionCard}>
            <View style={styles.predictionRow}>
              <Text style={styles.predictionLabel}>Chi phí dự đoán</Text>
              {analysis.cost_prediction.predicted_cost != null ? (
                <Text style={styles.predictionValue}>
                  {formatCurrency(analysis.cost_prediction.predicted_cost)}
                </Text>
              ) : (
                <Text style={[styles.predictionValue, { color: "#6B7280", fontSize: 14 }]}>
                  Chưa có dữ liệu
                </Text>
              )}
            </View>
            <View style={styles.predictionRow}>
              <Text style={styles.predictionLabel}>Ngân sách</Text>
              {analysis.cost_prediction.budget != null && analysis.cost_prediction.budget > 0 ? (
                <Text style={styles.predictionValue}>
                  {formatCurrency(analysis.cost_prediction.budget)}
                </Text>
              ) : (
                <Text style={[styles.predictionValue, { color: "#6B7280", fontSize: 14 }]}>
                  Chưa có ngân sách
                </Text>
              )}
            </View>
            <View style={styles.predictionRow}>
              <Text style={styles.predictionLabel}>Vượt ngân sách</Text>
              {analysis.cost_prediction.overrun_percentage != null && 
               analysis.cost_prediction.overrun_amount != null ? (
                <Text
                  style={[
                    styles.predictionValue,
                    {
                      color:
                        analysis.cost_prediction.overrun_percentage > 0 ? "#EF4444" : "#10B981",
                    },
                  ]}
                >
                  {formatCurrency(analysis.cost_prediction.overrun_amount)} (
                  {analysis.cost_prediction.overrun_percentage.toFixed(2)}%)
                </Text>
              ) : (
                <Text style={[styles.predictionValue, { color: "#6B7280", fontSize: 14 }]}>
                  Chưa có dữ liệu
                </Text>
              )}
            </View>
            <View style={styles.predictionRow}>
              <Text style={styles.predictionLabel}>Độ tin cậy</Text>
              <Text style={styles.predictionValue}>
                {(analysis.cost_prediction.confidence * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Delay Risk */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phân Tích Rủi Ro Delay</Text>
          <View
            style={[
              styles.riskAnalysisCard,
              { borderLeftColor: getRiskLevelColor(analysis.delay_risk.risk_level) },
            ]}
          >
            <View style={styles.riskAnalysisHeader}>
              <View
                style={[
                  styles.riskLevelBadge,
                  { backgroundColor: getRiskLevelColor(analysis.delay_risk.risk_level) + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.riskLevelText,
                    { color: getRiskLevelColor(analysis.delay_risk.risk_level) },
                  ]}
                >
                  {analysis.delay_risk.risk_level === 'critical' ? 'Rất Cao' :
                    analysis.delay_risk.risk_level === 'high' ? 'Cao' :
                    analysis.delay_risk.risk_level === 'medium' ? 'Trung Bình' :
                    analysis.delay_risk.risk_level === 'low' ? 'Thấp' : 'Không xác định'}
                </Text>
              </View>
              <Text style={styles.riskScoreText}>Điểm: {analysis.delay_risk.risk_score}/100</Text>
            </View>
            <Text style={styles.riskDetailText}>
              Chậm tiến độ: {analysis.delay_risk.delay_days} ngày
            </Text>
            <Text style={styles.riskDetailText}>
              Công việc quá hạn: {analysis.delay_risk.delayed_tasks_count}
            </Text>
            {analysis.delay_risk.recommendations && analysis.delay_risk.recommendations.length > 0 && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>Khuyến nghị:</Text>
                {analysis.delay_risk.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Cost Risk */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phân Tích Rủi Ro Chi Phí</Text>
          <View
            style={[
              styles.riskAnalysisCard,
              { borderLeftColor: getRiskLevelColor(analysis.cost_risk.risk_level) },
            ]}
          >
            <View style={styles.riskAnalysisHeader}>
              <View
                style={[
                  styles.riskLevelBadge,
                  { backgroundColor: getRiskLevelColor(analysis.cost_risk.risk_level) + "20" },
                ]}
              >
                <Text
                  style={[
                    styles.riskLevelText,
                    { color: getRiskLevelColor(analysis.cost_risk.risk_level) },
                  ]}
                >
                  {analysis.cost_risk.risk_level === 'critical' ? 'Rất Cao' :
                    analysis.cost_risk.risk_level === 'high' ? 'Cao' :
                    analysis.cost_risk.risk_level === 'medium' ? 'Trung Bình' :
                    analysis.cost_risk.risk_level === 'low' ? 'Thấp' :
                    analysis.cost_risk.risk_level === 'unknown' ? 'Không xác định' : 'Không xác định'}
                </Text>
              </View>
              <Text style={styles.riskScoreText}>Điểm: {analysis.cost_risk.risk_score}/100</Text>
            </View>
            {analysis.cost_risk.overrun_percentage != null ? (
              <Text style={styles.riskDetailText}>
                Vượt ngân sách: {analysis.cost_risk.overrun_percentage.toFixed(2)}%
              </Text>
            ) : (
              <Text style={styles.riskDetailText}>
                Vượt ngân sách: Chưa có dữ liệu
              </Text>
            )}
            {analysis.cost_risk.overrun_amount != null && analysis.cost_risk.overrun_amount !== 0 ? (
              <Text style={styles.riskDetailText}>
                Số tiền: {formatCurrency(analysis.cost_risk.overrun_amount)}
              </Text>
            ) : null}
            {analysis.cost_risk.recommendations && analysis.cost_risk.recommendations.length > 0 && (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>Khuyến nghị:</Text>
                {analysis.cost_risk.recommendations.map((rec, index) => (
                  <View key={index} style={styles.recommendationItem}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.recommendationText}>{rec}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Alerts */}
        {analysis.alerts && analysis.alerts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cảnh Báo</Text>
            {analysis.alerts.map((alert, index) => (
              <View
                key={index}
                style={[
                  styles.alertCard,
                  { borderLeftColor: getRiskLevelColor(alert.severity) },
                ]}
              >
                <Ionicons
                  name={alert.type === "delay" ? "time-outline" : "cash-outline"}
                  size={20}
                  color={getRiskLevelColor(alert.severity)}
                />
                <Text style={styles.alertText}>{alert.message}</Text>
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
  riskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  riskText: {
    fontSize: 16,
    fontWeight: "600",
  },
  riskScore: {
    fontSize: 14,
    color: "#6B7280",
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
  predictionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  predictionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  predictionLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  predictionValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  riskAnalysisCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  riskAnalysisHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  riskLevelBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  riskLevelText: {
    fontSize: 12,
    fontWeight: "700",
  },
  riskScoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  riskDetailText: {
    fontSize: 14,
    color: "#1F2937",
    marginBottom: 8,
  },
  recommendationsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  recommendationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 20,
  },
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  alertText: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
  },
});

