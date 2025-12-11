import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { timeTrackingApi } from "@/api/timeTrackingApi";
import { payrollApi } from "@/api/payrollApi";
import { bonusApi } from "@/api/bonusApi";
import { employeesApi } from "@/api/employeesApi";
import { Ionicons } from "@expo/vector-icons";

export default function HRDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingTimeTracking: 0,
    pendingPayroll: 0,
    pendingBonuses: 0,
    totalEmployees: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [timeTrackingRes, payrollRes, bonusesRes, employeesRes] =
        await Promise.all([
          timeTrackingApi.getTimeTracking({ status: "pending", page: 1 }),
          payrollApi.getPayroll({ status: "calculated", page: 1 }),
          bonusApi.getBonuses({ status: "pending", page: 1 }),
          employeesApi.getEmployees({ page: 1, per_page: 1 }),
        ]);

      setStats({
        pendingTimeTracking: timeTrackingRes.data?.total || 0,
        pendingPayroll: payrollRes.data?.total || 0,
        pendingBonuses: bonusesRes.data?.total || 0,
        totalEmployees: employeesRes.data?.pagination?.total || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.statNumber}>{stats.pendingTimeTracking}</Text>
          <Text style={styles.statLabel}>Chấm công chờ duyệt</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="cash-outline" size={32} color="#10B981" />
          <Text style={styles.statNumber}>{stats.pendingPayroll}</Text>
          <Text style={styles.statLabel}>Bảng lương chờ duyệt</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="gift-outline" size={32} color="#F59E0B" />
          <Text style={styles.statNumber}>{stats.pendingBonuses}</Text>
          <Text style={styles.statLabel}>Thưởng chờ duyệt</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="people-outline" size={32} color="#8B5CF6" />
          <Text style={styles.statNumber}>{stats.totalEmployees}</Text>
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
});
