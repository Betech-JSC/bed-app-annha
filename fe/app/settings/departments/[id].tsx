import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { departmentApi } from "@/api/departmentApi";
import BackButton from "@/components/BackButton";

interface DepartmentStatistics {
  department: {
    id: number;
    name: string;
    code: string;
  };
  statistics: {
    employees: number;
    payroll: {
      total: number;
      approved: number;
      total_amount: number;
    };
    leave_requests: {
      total: number;
      pending: number;
      approved: number;
    };
    time_tracking: {
      total: number;
      total_hours: number;
    };
    costs: {
      total: number;
      total_amount: number;
    };
    projects: {
      total: number;
      active: number;
    };
  };
}

export default function DepartmentStatisticsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [statistics, setStatistics] = useState<DepartmentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, [id]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await departmentApi.getStatistics(Number(id));
      if (response.success) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error("Error loading statistics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStatistics();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!statistics) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Không tìm thấy dữ liệu</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Thống Kê Phòng Ban</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Department Info */}
        <View style={styles.section}>
          <View style={styles.departmentCard}>
            <Ionicons name="business" size={32} color="#3B82F6" />
            <Text style={styles.departmentName}>{statistics.department.name}</Text>
            {statistics.department.code && (
              <Text style={styles.departmentCode}>Mã: {statistics.department.code}</Text>
            )}
          </View>
        </View>

        {/* Employees */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nhân Sự</Text>
          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <Ionicons name="people" size={24} color="#3B82F6" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Tổng số nhân viên</Text>
                <Text style={styles.statValue}>{statistics.statistics.employees}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Payroll */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bảng Lương</Text>
          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <Ionicons name="cash" size={24} color="#10B981" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Tổng số bảng lương</Text>
                <Text style={styles.statValue}>{statistics.statistics.payroll.total}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Đã duyệt</Text>
                <Text style={styles.statValue}>{statistics.statistics.payroll.approved}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Ionicons name="wallet" size={24} color="#10B981" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Tổng chi phí lương</Text>
                <Text style={[styles.statValue, styles.amountValue]}>
                  {formatCurrency(statistics.statistics.payroll.total_amount)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Leave Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Đơn Nghỉ Phép</Text>
          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <Ionicons name="calendar" size={24} color="#F59E0B" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Tổng số đơn</Text>
                <Text style={styles.statValue}>{statistics.statistics.leave_requests.total}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Ionicons name="time" size={24} color="#F59E0B" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Chờ duyệt</Text>
                <Text style={styles.statValue}>{statistics.statistics.leave_requests.pending}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Đã duyệt</Text>
                <Text style={styles.statValue}>{statistics.statistics.leave_requests.approved}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Time Tracking */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chấm Công</Text>
          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <Ionicons name="time-outline" size={24} color="#3B82F6" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Tổng số bản ghi</Text>
                <Text style={styles.statValue}>{statistics.statistics.time_tracking.total}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Ionicons name="hourglass" size={24} color="#3B82F6" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Tổng giờ làm việc</Text>
                <Text style={styles.statValue}>
                  {statistics.statistics.time_tracking.total_hours.toFixed(2)} giờ
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Costs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chi Phí</Text>
          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <Ionicons name="receipt" size={24} color="#EF4444" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Tổng số chi phí</Text>
                <Text style={styles.statValue}>{statistics.statistics.costs.total}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Ionicons name="cash" size={24} color="#EF4444" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Tổng số tiền</Text>
                <Text style={[styles.statValue, styles.amountValue]}>
                  {formatCurrency(statistics.statistics.costs.total_amount)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Projects */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dự Án</Text>
          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <Ionicons name="folder" size={24} color="#8B5CF6" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Tổng số dự án</Text>
                <Text style={styles.statValue}>{statistics.statistics.projects.total}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Ionicons name="play-circle" size={24} color="#10B981" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Đang thực hiện</Text>
                <Text style={styles.statValue}>{statistics.statistics.projects.active}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
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
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 12,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  departmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  departmentName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 12,
  },
  departmentCode: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  amountValue: {
    color: "#3B82F6",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12,
    marginLeft: 36,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  },
});

