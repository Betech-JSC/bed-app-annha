import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { paymentApi, ProjectPayment } from "@/api/paymentApi";
import { Ionicons } from "@expo/vector-icons";

export default function PaymentsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [payments, setPayments] = useState<ProjectPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, [id]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await paymentApi.getPayments(id!);
      if (response.success) {
        setPayments(response.data || []);
      }
    } catch (error) {
      console.error("Error loading payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("vi-VN");
  };

  const getStatusColor = (status: string, dueDate: string) => {
    if (status === "paid") return "#10B981";
    if (status === "overdue") return "#EF4444";
    const due = new Date(dueDate);
    const today = new Date();
    if (due < today) return "#EF4444";
    return "#F59E0B";
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Chờ thanh toán";
      case "paid":
        return "Đã thanh toán";
      case "overdue":
        return "Quá hạn";
      default:
        return status;
    }
  };

  const renderPaymentItem = ({ item }: { item: ProjectPayment }) => (
    <View style={styles.paymentCard}>
      <View style={styles.paymentHeader}>
        <View>
          <Text style={styles.paymentNumber}>
            Đợt {item.payment_number}
          </Text>
          <Text style={styles.paymentAmount}>
            {formatCurrency(item.amount)}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                getStatusColor(item.due_date, item.due_date) + "20",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.due_date, item.due_date) },
            ]}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
          <Text style={styles.detailLabel}>Hạn thanh toán:</Text>
          <Text style={styles.detailValue}>{formatDate(item.due_date)}</Text>
        </View>
        {item.paid_date && (
          <View style={styles.detailRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
            <Text style={styles.detailLabel}>Đã thanh toán:</Text>
            <Text style={styles.detailValue}>{formatDate(item.paid_date)}</Text>
          </View>
        )}
      </View>

      {item.attachments && item.attachments.length > 0 && (
        <View style={styles.attachmentsRow}>
          <Ionicons name="document-outline" size={16} color="#3B82F6" />
          <Text style={styles.attachmentsText}>
            {item.attachments.length} chứng từ
          </Text>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đã Thanh Toán</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            // Navigate to add payment screen
            Alert.alert("Thông báo", "Tính năng thêm đợt thanh toán sẽ được triển khai");
          }}
        >
          <Ionicons name="add" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={payments}
        renderItem={renderPaymentItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cash-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có đợt thanh toán nào</Text>
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
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  addButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  paymentNumber: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
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
  paymentDetails: {
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  attachmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  attachmentsText: {
    fontSize: 14,
    color: "#3B82F6",
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
});
