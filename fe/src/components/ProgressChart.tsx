import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart, BarChart } from "react-native-chart-kit";
import { ProjectProgress } from "@/api/progressApi";

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
  const chartConfig = {
    backgroundColor: "#FFFFFF",
    backgroundGradientFrom: "#FFFFFF",
    backgroundGradientTo: "#FFFFFF",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: "6",
      strokeWidth: "2",
      stroke: "#3B82F6",
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
          strokeWidth: 2,
        },
      ],
    };

    return (
      <View style={styles.container}>
        <LineChart
          data={data}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
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
        <BarChart
          data={data}
          width={screenWidth - 32}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          yAxisLabel=""
          yAxisSuffix="%"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.noDataText}>Không có dữ liệu để hiển thị</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    padding: 32,
  },
});
