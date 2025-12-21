import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView } from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { ProjectProgress } from "@/api/progressApi";
import { Ionicons } from "@expo/vector-icons";

interface ProgressChartProps {
  progress: ProjectProgress;
  logs?: Array<{ log_date: string; completion_percentage: number }>;
  type?: "line" | "bar" | "pie" | "progress";
}

const screenWidth = Dimensions.get("window").width;

export default function ProgressChart({
  progress,
  logs = [],
  type = "progress",
}: ProgressChartProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    if (!logs || logs.length === 0) {
      return null;
    }
    const percentages = logs.map((log) => log.completion_percentage);
    return {
      min: Math.min(...percentages),
      max: Math.max(...percentages),
      average: Math.round(
        percentages.reduce((sum, val) => sum + val, 0) / percentages.length
      ),
      current: percentages[percentages.length - 1],
      trend:
        percentages.length > 1
          ? percentages[percentages.length - 1] >
            percentages[percentages.length - 2]
            ? "up"
            : "down"
          : "stable",
    };
  }, [logs]);

  const chartConfig = {
    backgroundColor: "#FFFFFF",
    backgroundGradientFrom: "#F8FAFC",
    backgroundGradientTo: "#FFFFFF",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    fillShadowGradient: "#3B82F6",
    fillShadowGradientOpacity: 0.1,
    strokeWidth: 3,
    barPercentage: 0.7,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "3",
      stroke: "#3B82F6",
      fill: "#FFFFFF",
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: "#E5E7EB",
      strokeWidth: 1,
    },
  };

  if (type === "progress") {
    return (
      <View style={styles.container}>
        <View style={styles.progressCard}>
          <Text style={styles.progressLabel}>Tiến độ tổng thể</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress.overall_percentage}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {progress.overall_percentage}%
          </Text>
          <Text style={styles.progressMethod}>
            Tính từ: {progress.calculated_from}
          </Text>
        </View>
      </View>
    );
  }

  if (type === "line" && logs.length > 0) {
    const data = {
      labels: logs.map((log) =>
        new Date(log.log_date).toLocaleDateString("vi-VN", {
          month: "short",
          day: "numeric",
        })
      ),
      datasets: [
        {
          data: logs.map((log) => log.completion_percentage),
          color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
          strokeWidth: 3,
        },
      ],
    };

    return (
      <View style={styles.container}>
        <View style={styles.chartCard}>
          {/* Header */}
          <View style={styles.chartHeader}>
            <View style={styles.chartHeaderLeft}>
              <Ionicons name="trending-up" size={24} color="#3B82F6" />
              <View style={styles.chartHeaderText}>
                <Text style={styles.chartTitle}>Biểu Đồ Đường Tiến Độ</Text>
                <Text style={styles.chartSubtitle}>
                  Theo dõi tiến độ theo thời gian
                </Text>
              </View>
            </View>
          </View>

          {/* Statistics */}
          {stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Hiện tại</Text>
                <View style={styles.statValueContainer}>
                  <Text style={styles.statValue}>{stats.current}%</Text>
                  {stats.trend === "up" && (
                    <Ionicons name="arrow-up" size={16} color="#10B981" />
                  )}
                  {stats.trend === "down" && (
                    <Ionicons name="arrow-down" size={16} color="#EF4444" />
                  )}
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Trung bình</Text>
                <Text style={styles.statValue}>{stats.average}%</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Cao nhất</Text>
                <Text style={[styles.statValue, styles.statValueMax]}>
                  {stats.max}%
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Thấp nhất</Text>
                <Text style={[styles.statValue, styles.statValueMin]}>
                  {stats.min}%
                </Text>
              </View>
            </View>
          )}

          {/* Chart */}
          <View style={styles.chartWrapper}>
            <LineChart
              data={data}
              width={screenWidth - 64}
              height={280}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={true}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              withDots={true}
              withShadow={true}
              segments={4}
            />
          </View>

          {/* Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: "#3B82F6" }]} />
              <Text style={styles.legendText}>Tiến độ hoàn thành (%)</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  if (type === "bar" && logs.length > 0) {
    const data = {
      labels: logs.map((log) =>
        new Date(log.log_date).toLocaleDateString("vi-VN", {
          month: "short",
          day: "numeric",
        })
      ),
      datasets: [
        {
          data: logs.map((log) => log.completion_percentage),
        },
      ],
    };

    return (
      <View style={styles.container}>
        <View style={styles.chartCard}>
          {/* Header */}
          <View style={styles.chartHeader}>
            <View style={styles.chartHeaderLeft}>
              <Ionicons name="bar-chart" size={24} color="#8B5CF6" />
              <View style={styles.chartHeaderText}>
                <Text style={styles.chartTitle}>Biểu Đồ Cột Tiến Độ</Text>
                <Text style={styles.chartSubtitle}>
                  So sánh tiến độ theo từng giai đoạn
                </Text>
              </View>
            </View>
          </View>

          {/* Statistics */}
          {stats && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Hiện tại</Text>
                <View style={styles.statValueContainer}>
                  <Text style={styles.statValue}>{stats.current}%</Text>
                  {stats.trend === "up" && (
                    <Ionicons name="arrow-up" size={16} color="#10B981" />
                  )}
                  {stats.trend === "down" && (
                    <Ionicons name="arrow-down" size={16} color="#EF4444" />
                  )}
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Trung bình</Text>
                <Text style={styles.statValue}>{stats.average}%</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Cao nhất</Text>
                <Text style={[styles.statValue, styles.statValueMax]}>
                  {stats.max}%
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Thấp nhất</Text>
                <Text style={[styles.statValue, styles.statValueMin]}>
                  {stats.min}%
                </Text>
              </View>
            </View>
          )}

          {/* Chart */}
          <View style={styles.chartWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={data}
                width={Math.max(screenWidth - 64, logs.length * 60)}
                height={280}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                  fillShadowGradient: "#8B5CF6",
                }}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix="%"
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
                showValuesOnTopOfBars={true}
                fromZero={true}
                segments={4}
              />
            </ScrollView>
          </View>

          {/* Legend */}
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: "#8B5CF6" }]}
              />
              <Text style={styles.legendText}>Tiến độ hoàn thành (%)</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.emptyCard}>
        <Ionicons name="bar-chart-outline" size={64} color="#D1D5DB" />
        <Text style={styles.noDataTitle}>Chưa có dữ liệu</Text>
        <Text style={styles.noDataText}>
          {type === "line"
            ? "Chưa có dữ liệu nhật ký để hiển thị biểu đồ đường"
            : "Chưa có dữ liệu nhật ký để hiển thị biểu đồ cột"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  progressBar: {
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 6,
  },
  progressText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3B82F6",
    textAlign: "center",
    marginBottom: 8,
  },
  progressMethod: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  chartHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chartHeaderText: {
    flex: 1,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 14,
    color: "#6B7280",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    fontWeight: "500",
  },
  statValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  statValueMax: {
    color: "#10B981",
  },
  statValueMin: {
    color: "#EF4444",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E5E7EB",
  },
  chartWrapper: {
    alignItems: "center",
    marginBottom: 16,
    overflow: "hidden",
  },
  chart: {
    borderRadius: 16,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 48,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  noDataTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 8,
  },
  noDataText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
});
