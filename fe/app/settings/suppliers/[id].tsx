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
import { supplierApi, SupplierDebtStatistics } from "@/api/supplierApi";
import { ScreenHeader } from "@/components";

export default function SupplierDebtScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [statistics, setStatistics] = useState<SupplierDebtStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, [id]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const response = await supplierApi.getDebtStatistics(Number(id));
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
      <ScreenHeader title="Công Nợ Nhà Cung Cấp" showBackButton />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Supplier Info */}
        <View style={styles.section}>
          <View style={styles.supplierCard}>
            <Ionicons name="storefront" size={32} color="#3B82F6" />
            <Text style={styles.supplierName}>{statistics.supplier.name}</Text>
          </View>
        </View>

        {/* Debt Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thống Kê Công Nợ</Text>
          <View style={styles.statCard}>
            <View style={styles.statRow}>
              <Ionicons name="document-text" size={24} color="#3B82F6" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Tổng giá trị hợp đồng</Text>
                <Text style={styles.statValue}>
                  {formatCurrency(statistics.statistics.total_contract_value)}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Tổng đã nghiệm thu</Text>
                <Text style={[styles.statValue, styles.positiveValue]}>
                  {formatCurrency(statistics.statistics.total_accepted)}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Ionicons name="cash" size={24} color="#10B981" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Tổng đã thanh toán</Text>
                <Text style={[styles.statValue, styles.positiveValue]}>
                  {formatCurrency(statistics.statistics.total_paid)}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Ionicons name="alert-circle" size={24} color="#EF4444" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Tổng công nợ</Text>
                <Text style={[styles.statValue, styles.debtValue]}>
                  {formatCurrency(statistics.statistics.total_debt)}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Ionicons name="hourglass" size={24} color="#F59E0B" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Công nợ còn lại</Text>
                <Text style={[styles.statValue, styles.debtValue]}>
                  {formatCurrency(statistics.statistics.remaining_debt)}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Ionicons name="pie-chart" size={24} color="#8B5CF6" />
              <View style={styles.statContent}>
                <Text style={styles.statLabel}>Tỷ lệ thanh toán</Text>
                <Text style={[styles.statValue, styles.percentageValue]}>
                  {statistics.statistics.payment_percentage.toFixed(2)}%
                </Text>
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
  supplierCard: {
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
  supplierName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 12,
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
  positiveValue: {
    color: "#10B981",
  },
  debtValue: {
    color: "#EF4444",
  },
  percentageValue: {
    color: "#8B5CF6",
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

