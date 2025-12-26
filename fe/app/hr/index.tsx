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

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/hr/leave-requests")}
        >
          <Ionicons name="calendar-outline" size={24} color="#F59E0B" />
          <Text style={styles.menuText}>Nghỉ Phép</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/hr/employment-contracts")}
        >
          <Ionicons name="document-text-outline" size={24} color="#8B5CF6" />
          <Text style={styles.menuText}>Hợp Đồng Lao Động</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/hr/insurance")}
        >
          <Ionicons name="shield-outline" size={24} color="#10B981" />
          <Text style={styles.menuText}>Bảo Hiểm & Phúc Lợi</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push("/hr/performance")}
        >
          <Ionicons name="star-outline" size={24} color="#F59E0B" />
          <Text style={styles.menuText}>Đánh Giá Hiệu Suất</Text>
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
