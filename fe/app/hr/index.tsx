import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { timeTrackingApi } from "@/api/timeTrackingApi";
import { payrollApi } from "@/api/payrollApi";
import { bonusApi } from "@/api/bonusApi";
import { employeesApi } from "@/api/employeesApi";
import { Ionicons } from "@expo/vector-icons";

const screenWidth = Dimensions.get("window").width;

interface DashboardData {
  stats: {
    pending_time_tracking: number;
    pending_payroll: number;
    pending_bonuses: number;
    total_employees: number;
  };
  charts: {
    monthly_hours: Array<{ month: string; hours: number }>;
    role_distribution: Array<{ role: string; count: number }>;
    monthly_payroll: Array<{ month: string; amount: number }>;
    monthly_bonuses: Array<{ month: string; amount: number }>;
    time_tracking_status: Array<{ status: string; count: number }>;
  };
}

export default function HRDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await employeesApi.getHRDashboard({ months: 6 });
      if (response.success) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const pieChartConfig = {
    backgroundColor: "#FFFFFF",
    backgroundGradientFrom: "#F8FAFC",
    backgroundGradientTo: "#FFFFFF",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  };

  const stats = dashboardData?.stats || {
    pending_time_tracking: 0,
    pending_payroll: 0,
    pending_bonuses: 0,
    total_employees: 0,
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Quản Lý Nhân Sự</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="time-outline" size={32} color="#3B82F6" />
          <Text style={styles.statNumber}>{stats.pending_time_tracking}</Text>
          <Text style={styles.statLabel}>Chấm công chờ duyệt</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="cash-outline" size={32} color="#10B981" />
          <Text style={styles.statNumber}>{stats.pending_payroll}</Text>
          <Text style={styles.statLabel}>Bảng lương chờ duyệt</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="gift-outline" size={32} color="#F59E0B" />
          <Text style={styles.statNumber}>{stats.pending_bonuses}</Text>
          <Text style={styles.statLabel}>Thưởng chờ duyệt</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="people-outline" size={32} color="#8B5CF6" />
          <Text style={styles.statNumber}>{stats.total_employees}</Text>
          <Text style={styles.statLabel}>Tổng nhân viên</Text>
        </View>
      </View>

      {/* Charts Section */}
      {dashboardData && (
        <View style={styles.chartsContainer}>
          {/* Biểu đồ số giờ làm việc theo tháng */}
          {dashboardData.charts.monthly_hours.length > 0 && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Ionicons name="time" size={24} color="#3B82F6" />
                <Text style={styles.chartTitle}>Số Giờ Làm Việc Theo Tháng</Text>
              </View>
              <LineChart
                data={{
                  labels: dashboardData.charts.monthly_hours.map((item) => item.month),
                  datasets: [
                    {
                      data: dashboardData.charts.monthly_hours.map((item) => item.hours),
                    },
                  ],
                }}
                width={screenWidth - 64}
                height={220}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
              />
            </View>
          )}

          {/* Biểu đồ phân bố nhân viên theo vai trò */}
          {dashboardData.charts.role_distribution.length > 0 && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Ionicons name="people" size={24} color="#8B5CF6" />
                <Text style={styles.chartTitle}>Phân Bố Nhân Viên Theo Vai Trò</Text>
              </View>
              <BarChart
                data={{
                  labels: dashboardData.charts.role_distribution.map((item) => 
                    item.role.length > 8 ? item.role.substring(0, 8) + '...' : item.role
                  ),
                  datasets: [
                    {
                      data: dashboardData.charts.role_distribution.map((item) => item.count),
                    },
                  ],
                }}
                width={screenWidth - 64}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
                  fillShadowGradient: "#8B5CF6",
                }}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix=""
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
              />
            </View>
          )}

          {/* Biểu đồ lương theo tháng */}
          {dashboardData.charts.monthly_payroll.length > 0 && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Ionicons name="cash" size={24} color="#10B981" />
                <Text style={styles.chartTitle}>Lương Theo Tháng (VNĐ)</Text>
              </View>
              <BarChart
                data={{
                  labels: dashboardData.charts.monthly_payroll.map((item) => item.month),
                  datasets: [
                    {
                      data: dashboardData.charts.monthly_payroll.map((item) => item.amount / 1000000), // Convert to millions
                    },
                  ],
                }}
                width={screenWidth - 64}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                  fillShadowGradient: "#10B981",
                }}
                style={styles.chart}
                yAxisLabel=""
                yAxisSuffix="M"
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
              />
            </View>
          )}

          {/* Biểu đồ thưởng theo tháng */}
          {dashboardData.charts.monthly_bonuses.length > 0 && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Ionicons name="gift" size={24} color="#F59E0B" />
                <Text style={styles.chartTitle}>Thưởng Theo Tháng (VNĐ)</Text>
              </View>
              <LineChart
                data={{
                  labels: dashboardData.charts.monthly_bonuses.map((item) => item.month),
                  datasets: [
                    {
                      data: dashboardData.charts.monthly_bonuses.map((item) => item.amount / 1000000), // Convert to millions
                    },
                  ],
                }}
                width={screenWidth - 64}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
                  fillShadowGradient: "#F59E0B",
                }}
                bezier
                style={styles.chart}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLabels={true}
                withHorizontalLabels={true}
              />
            </View>
          )}

          {/* Biểu đồ trạng thái chấm công */}
          {dashboardData.charts.time_tracking_status.length > 0 && (
            <View style={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Ionicons name="pie-chart" size={24} color="#EF4444" />
                <Text style={styles.chartTitle}>Trạng Thái Chấm Công</Text>
              </View>
              <PieChart
                data={dashboardData.charts.time_tracking_status.map((item, index) => {
                  const colors = ["#10B981", "#F59E0B", "#EF4444"];
                  return {
                    name: item.status,
                    population: item.count,
                    color: colors[index % colors.length],
                    legendFontColor: "#6B7280",
                    legendFontSize: 12,
                  };
                })}
                width={screenWidth - 64}
                height={220}
                chartConfig={pieChartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
            </View>
          )}
        </View>
      )}

      <View style={styles.menuContainer}>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/hr/check-in-out")}
        >
          <Ionicons name="time" size={24} color="#3B82F6" />
          <Text style={styles.menuText}>Chấm Công</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/hr/time-tracking")}
        >
          <Ionicons name="list" size={24} color="#6366F1" />
          <Text style={styles.menuText}>Lịch Sử Chấm Công</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/hr/payroll-costs")}
        >
          <Ionicons name="calculator" size={24} color="#10B981" />
          <Text style={styles.menuText}>Tiền Lương & Chi Phí Nhân Công</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/hr/payroll")}
        >
          <Ionicons name="cash" size={24} color="#10B981" />
          <Text style={styles.menuText}>Bảng Lương</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/hr/bonuses")}
        >
          <Ionicons name="gift" size={24} color="#F59E0B" />
          <Text style={styles.menuText}>Thưởng</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/hr/employees")}
        >
          <Ionicons name="people" size={24} color="#8B5CF6" />
          <Text style={styles.menuText}>Nhân Viên</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/hr/calendar")}
        >
          <Ionicons name="calendar" size={24} color="#EF4444" />
          <Text style={styles.menuText}>Lịch Làm Việc</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/hr/salary-config")}
        >
          <Ionicons name="cash" size={24} color="#10B981" />
          <Text style={styles.menuText}>Cấu Hình Lương</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/hr/personnel-roles")}
        >
          <Ionicons name="people-circle" size={24} color="#6366F1" />
          <Text style={styles.menuText}>Cấu Hình Vai Trò</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
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
  },
  header: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 16,
    gap: 12,
  },
  statCard: {
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
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
  },
  menuContainer: {
    padding: 16,
  },
  menuItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 12,
  },
  chartsContainer: {
    padding: 16,
    gap: 16,
  },
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});
