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
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/hr/payroll/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View>
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

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Lương thực nhận:</Text>
        <Text style={styles.amount}>{item.net_salary.toLocaleString()} VND</Text>
      </View>

      {item.status === "calculated" && (
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleApprove(item.id)}
        >
          <Text style={styles.approveButtonText}>Duyệt</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
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
      <FlatList
        data={payrolls}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
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
    marginBottom: 12,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  period: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  amountLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#10B981",
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
  },
});
