import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { payrollApi, Payroll } from "@/api/payrollApi";
import { Ionicons } from "@expo/vector-icons";
import ExportButtons from "@/components/ExportButtons";
import { formatVNDWithoutSymbol } from "@/utils/format";

export default function PayrollScreen() {
  const router = useRouter();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPayrolls();
  }, []);

  const loadPayrolls = async () => {
    try {
      setLoading(true);
      const response = await payrollApi.getPayroll({ page: 1 });
      if (response.success) {
        setPayrolls(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading payrolls:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPayrolls();
  };

  const handleApprove = async (id: number) => {
    try {
      const response = await payrollApi.approvePayroll(id);
      if (response.success) {
        Alert.alert("Thành công", "Đã duyệt bảng lương");
        loadPayrolls();
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể duyệt bảng lương");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "#10B981";
      case "approved":
        return "#3B82F6";
      case "calculated":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const renderItem = ({ item }: { item: Payroll }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.user?.name || "N/A"}</Text>
          <Text style={styles.period}>
            {new Date(item.period_start).toLocaleDateString("vi-VN")} -{" "}
            {new Date(item.period_end).toLocaleDateString("vi-VN")}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text
            style={[styles.statusText, { color: getStatusColor(item.status) }]}
          >
            {item.status === "paid"
              ? "Đã thanh toán"
              : item.status === "approved"
                ? "Đã duyệt"
                : item.status === "calculated"
                  ? "Đã tính"
                  : "Nháp"}
          </Text>
        </View>
      </View>

      {/* Chi tiết bảng lương */}
      <View style={styles.breakdown}>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Lương cơ bản:</Text>
          <Text style={styles.breakdownValue}>
            {formatVNDWithoutSymbol(item.base_salary)}
          </Text>
        </View>

        {item.total_hours > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Tổng giờ làm việc:</Text>
            {/* <Text style={styles.breakdownValue}>
              {(item.total_hours || 0).toFixed(1)} giờ
            </Text> */}
          </View>
        )}

        {item.overtime_hours > 0 && (
          <>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Giờ tăng ca:</Text>
              {/* <Text style={styles.breakdownValue}>
                {(item.overtime_hours || 0).toFixed(1)} giờ
              </Text> */}
            </View>
            {item.overtime_rate > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Lương tăng ca:</Text>
                <Text style={styles.breakdownValue}>
                  {formatVNDWithoutSymbol((item.overtime_hours || 0) * (item.overtime_rate || 0))}
                </Text>
              </View>
            )}
          </>
        )}

        {item.bonus_amount > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Thưởng:</Text>
            <Text style={[styles.breakdownValue, styles.positiveValue]}>
              +{formatVNDWithoutSymbol(item.bonus_amount)}
            </Text>
          </View>
        )}

        {item.deductions > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Khấu trừ:</Text>
            <Text style={[styles.breakdownValue, styles.negativeValue]}>
              -{formatVNDWithoutSymbol(item.deductions)}
            </Text>
          </View>
        )}

        {item.tax > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Thuế:</Text>
            <Text style={[styles.breakdownValue, styles.negativeValue]}>
              -{formatVNDWithoutSymbol(item.tax)}
            </Text>
          </View>
        )}

        <View style={styles.grossRow}>
          <Text style={styles.grossLabel}>Tổng lương (Gross):</Text>
          <Text style={styles.grossValue}>
            {formatVNDWithoutSymbol(item.gross_salary)}
          </Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Lương thực nhận (Net):</Text>
        <Text style={styles.amount}>{formatVNDWithoutSymbol(item.net_salary)}</Text>
      </View>

      {item.status === "calculated" && (
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleApprove(item.id)}
        >
          <Text style={styles.approveButtonText}>Duyệt</Text>
        </TouchableOpacity>
      )}

      {item.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Ghi chú:</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bảng Lương</Text>
        <ExportButtons />
      </View>

      <FlatList
        data={payrolls}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cash-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>Không có dữ liệu</Text>
          </View>
        }
      />
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
  },
  header: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginBottom: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  period: {
    fontSize: 13,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  breakdown: {
    marginTop: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    textAlign: "right",
  },
  positiveValue: {
    color: "#10B981",
  },
  negativeValue: {
    color: "#EF4444",
  },
  grossRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  grossLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  grossValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3B82F6",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 16,
    paddingBottom: 12,
    borderTopWidth: 2,
    borderTopColor: "#E5E7EB",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  amount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#10B981",
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: "#1F2937",
    lineHeight: 18,
  },
  approveButton: {
    backgroundColor: "#3B82F6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
});
