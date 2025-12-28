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
import { reportApi, DebtPaymentReport } from "@/api/reportApi";
import BackButton from "@/components/BackButton";

export default function DebtPaymentReportScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<DebtPaymentReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await reportApi.getDebtPayment(Number(id));
      if (response.success) {
        setReport(response.data);
      }
    } catch (error) {
      console.error("Error loading report:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadReport();
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

  if (!report) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Không tìm thấy dữ liệu báo cáo</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Báo Cáo Công Nợ & Thanh Toán</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Tổng Hợp Công Nợ</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Ionicons name="business" size={32} color="#3B82F6" />
              <Text style={styles.summaryLabel}>Công nợ thầu phụ</Text>
              <Text style={[styles.summaryValue, styles.debtValue]}>
                {formatCurrency(report.summary.total_subcontractor_debt)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="storefront" size={32} color="#10B981" />
              <Text style={styles.summaryLabel}>Công nợ NCC</Text>
              <Text style={[styles.summaryValue, styles.debtValue]}>
                {formatCurrency(report.summary.total_supplier_debt)}
              </Text>
            </View>
            <View style={[styles.summaryItem, styles.totalItem]}>
              <Ionicons name="alert-circle" size={32} color="#EF4444" />
              <Text style={[styles.summaryLabel, styles.totalLabel]}>Tổng công nợ</Text>
              <Text style={[styles.summaryValue, styles.totalDebtValue]}>
                {formatCurrency(report.summary.total_debt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Subcontractor Debts */}
        {report.subcontractor_debts && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Công Nợ Thầu Phụ ({report.subcontractor_debts.length || 0})
            </Text>
            {report.subcontractor_debts.length > 0 ? (
              report.subcontractor_debts.map((debt, index) => (
            <View key={index} style={styles.debtCard}>
              <View style={styles.debtHeader}>
                <Text style={styles.debtTitle}>{debt.subcontractor?.name || "N/A"}</Text>
                {debt.subcontractor?.category && (
                  <Text style={styles.debtCategory}>{debt.subcontractor.category}</Text>
                )}
              </View>
              <View style={styles.debtDetails}>
                <View style={styles.debtRow}>
                  <Text style={styles.debtLabel}>Giá trị hợp đồng:</Text>
                  <Text style={styles.debtValue}>
                    {formatCurrency(debt.contract_value || 0)}
                  </Text>
                </View>
                <View style={styles.debtRow}>
                  <Text style={styles.debtLabel}>Đã thanh toán:</Text>
                  <Text style={[styles.debtValue, styles.paidValue]}>
                    {formatCurrency(debt.total_paid || 0)}
                  </Text>
                </View>
                <View style={styles.debtRow}>
                  <Text style={styles.debtLabel}>Còn nợ:</Text>
                  <Text style={[styles.debtValue, styles.remainingDebtValue]}>
                    {formatCurrency(debt.remaining_debt || 0)}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${debt.payment_percentage || 0}%`,
                        backgroundColor:
                          (debt.payment_percentage || 0) >= 80
                            ? "#10B981"
                            : (debt.payment_percentage || 0) >= 50
                            ? "#F59E0B"
                            : "#EF4444",
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  Đã thanh toán: {(debt.payment_percentage || 0).toFixed(2)}%
                </Text>
              </View>
            </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Chưa có công nợ thầu phụ</Text>
            )}
          </View>
        )}

        {/* Supplier Debts */}
        {report.supplier_debts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Công Nợ Nhà Cung Cấp ({report.supplier_debts.length})
            </Text>
            {report.supplier_debts.map((debt, index) => (
              <View key={index} style={styles.debtCard}>
                <Text style={styles.debtTitle}>{debt.supplier?.name || "N/A"}</Text>
                <View style={styles.debtDetails}>
                  <View style={styles.debtRow}>
                    <Text style={styles.debtLabel}>Đã nghiệm thu:</Text>
                    <Text style={styles.debtValue}>
                      {formatCurrency(debt.total_accepted || 0)}
                    </Text>
                  </View>
                  <View style={styles.debtRow}>
                    <Text style={styles.debtLabel}>Đã thanh toán:</Text>
                    <Text style={[styles.debtValue, styles.paidValue]}>
                      {formatCurrency(debt.total_paid || 0)}
                    </Text>
                  </View>
                  <View style={styles.debtRow}>
                    <Text style={styles.debtLabel}>Còn nợ:</Text>
                    <Text style={[styles.debtValue, styles.remainingDebtValue]}>
                      {formatCurrency(debt.remaining_debt || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Project Payments */}
        {report.project_payments && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Thanh Toán Dự Án ({report.project_payments.length || 0})
            </Text>
            {report.project_payments.length > 0 ? (
              report.project_payments.slice(0, 20).map((payment, index) => (
                <View key={index} style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <Text style={styles.paymentTitle}>
                      {payment.payment_number || `Thanh toán #${payment.id}`}
                    </Text>
                    <Text style={[styles.paymentAmount, styles.revenueValue]}>
                      {formatCurrency(payment.amount || 0)}
                    </Text>
                  </View>
                  <Text style={styles.paymentDate}>
                    {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString("vi-VN") : "N/A"}
                  </Text>
                  {payment.description && (
                    <Text style={styles.paymentDescription}>{payment.description}</Text>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Chưa có thanh toán</Text>
            )}
          </View>
        )}
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
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  summaryGrid: {
    gap: 12,
  },
  summaryItem: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  totalItem: {
    backgroundColor: "#FEF2F2",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 4,
  },
  totalLabel: {
    fontWeight: "700",
    color: "#1F2937",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  debtValue: {
    color: "#EF4444",
  },
  totalDebtValue: {
    fontSize: 20,
    color: "#EF4444",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  debtCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  debtHeader: {
    marginBottom: 12,
  },
  debtTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  debtCategory: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  debtDetails: {
    gap: 8,
  },
  debtRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  debtLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  paidValue: {
    color: "#10B981",
  },
  remainingDebtValue: {
    color: "#EF4444",
    fontWeight: "700",
  },
  progressBar: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "right",
  },
  paymentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  revenueValue: {
    color: "#10B981",
  },
  paymentDate: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  paymentDescription: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 4,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    padding: 16,
    fontStyle: "italic",
  },
});

