import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Payroll } from "@/api/payrollApi";
import { Ionicons } from "@expo/vector-icons";
import { formatVNDWithoutSymbol } from "@/utils/format";

interface PayrollCardProps {
  payroll: Payroll;
  onPress?: () => void;
  showActions?: boolean;
  onApprove?: () => void;
}

export default function PayrollCard({
  payroll,
  onPress,
  showActions = false,
  onApprove,
}: PayrollCardProps) {
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

  const Component = onPress ? TouchableOpacity : View;

  return (
    <Component style={styles.card} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.employeeName}>
            {payroll.user?.name || "N/A"}
          </Text>
          <Text style={styles.period}>
            {new Date(payroll.period_start).toLocaleDateString("vi-VN")} -{" "}
            {new Date(payroll.period_end).toLocaleDateString("vi-VN")}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(payroll.status) + "20" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(payroll.status) },
            ]}
          >
            {payroll.status === "paid"
              ? "Đã thanh toán"
              : payroll.status === "approved"
                ? "Đã duyệt"
                : payroll.status === "calculated"
                  ? "Đã tính"
                  : "Nháp"}
          </Text>
        </View>
      </View>

      <View style={styles.breakdown}>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Lương cơ bản:</Text>
          <Text style={styles.breakdownValue}>
            {formatVNDWithoutSymbol(payroll.base_salary)}
          </Text>
        </View>
        {payroll.overtime_hours > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Overtime:</Text>
            <Text style={styles.breakdownValue}>
              {payroll.overtime_hours} giờ
            </Text>
          </View>
        )}
        {payroll.bonus_amount > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Thưởng:</Text>
            <Text style={styles.breakdownValue}>
              {formatVNDWithoutSymbol(payroll.bonus_amount)}
            </Text>
          </View>
        )}
        {payroll.tax > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Thuế:</Text>
            <Text style={styles.breakdownValue}>
              -{formatVNDWithoutSymbol(payroll.tax)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Lương thực nhận:</Text>
        <Text style={styles.amount}>
          {formatVNDWithoutSymbol(payroll.net_salary)}
        </Text>
      </View>

      {showActions && payroll.status === "calculated" && (
        <TouchableOpacity
          style={styles.approveButton}
          onPress={onApprove}
        >
          <Text style={styles.approveButtonText}>Duyệt</Text>
        </TouchableOpacity>
      )}
    </Component>
  );
}

const styles = StyleSheet.create({
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
  breakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: "#E5E7EB",
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  amount: {
    fontSize: 20,
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
});
