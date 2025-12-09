import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { ProjectPayment } from "@/api/paymentApi";
import { Ionicons } from "@expo/vector-icons";

interface PaymentScheduleProps {
  payments: ProjectPayment[];
}

export default function PaymentSchedule({ payments }: PaymentScheduleProps) {
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

  return (
    <ScrollView style={styles.container}>
      {payments.map((payment) => (
        <View key={payment.id} style={styles.paymentItem}>
          <View style={styles.paymentHeader}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentNumber}>Đợt {payment.payment_number}</Text>
              <Text style={styles.paymentAmount}>
                {formatCurrency(payment.amount)}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    getStatusColor(payment.due_date, payment.due_date) + "20",
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusColor(payment.due_date, payment.due_date) },
                ]}
              >
                {getStatusText(payment.status)}
              </Text>
            </View>
          </View>

          <View style={styles.paymentDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="#6B7280" />
              <Text style={styles.detailLabel}>Hạn thanh toán:</Text>
              <Text style={styles.detailValue}>{formatDate(payment.due_date)}</Text>
            </View>
            {payment.paid_date && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color="#10B981"
                />
                <Text style={styles.detailLabel}>Đã thanh toán:</Text>
                <Text style={styles.detailValue}>
                  {formatDate(payment.paid_date)}
                </Text>
              </View>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  paymentItem: {
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
  paymentInfo: {
    flex: 1,
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
});
