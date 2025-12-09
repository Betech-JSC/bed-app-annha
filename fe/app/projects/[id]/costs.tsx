import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { projectApi } from "@/api/projectApi";
import { Ionicons } from "@expo/vector-icons";

export default function CostsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [costs, setCosts] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCosts();
  }, [id]);

  const loadCosts = async () => {
    try {
      setLoading(true);
      // This would call a backend endpoint to calculate costs
      // For now, we'll use project data
      const response = await projectApi.getProject(id!);
      if (response.success) {
        const project = response.data;
        // Calculate costs from project data
        const contractValue = project.contract?.contract_value || 0;
        const additionalCosts = project.additional_costs
          ?.filter((c: any) => c.status === "approved")
          .reduce((sum: number, c: any) => sum + c.amount, 0) || 0;
        const subcontractorCosts =
          project.subcontractors?.reduce(
            (sum: number, s: any) => sum + s.total_quote,
            0
          ) || 0;

        setCosts({
          contract_value: contractValue,
          additional_costs: additionalCosts,
          subcontractor_costs: subcontractorCosts,
          total: contractValue + additionalCosts + subcontractorCosts,
        });
      }
    } catch (error) {
      console.error("Error loading costs:", error);
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi Phí Dự Án</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.costCard}>
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Giá trị hợp đồng</Text>
            <Text style={styles.costValue}>
              {costs ? formatCurrency(costs.contract_value) : "0 VND"}
            </Text>
          </View>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Chi phí phát sinh</Text>
            <Text style={styles.costValue}>
              {costs ? formatCurrency(costs.additional_costs) : "0 VND"}
            </Text>
          </View>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Nhà thầu phụ</Text>
            <Text style={styles.costValue}>
              {costs ? formatCurrency(costs.subcontractor_costs) : "0 VND"}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.costRow}>
            <Text style={styles.totalLabel}>Tổng chi phí</Text>
            <Text style={styles.totalValue}>
              {costs ? formatCurrency(costs.total) : "0 VND"}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#3B82F6" />
          <Text style={styles.infoText}>
            Dữ liệu được tính toán tự động từ hợp đồng, chi phí phát sinh và nhà thầu phụ.
          </Text>
        </View>
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
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  content: {
    padding: 16,
  },
  costCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  costLabel: {
    fontSize: 16,
    color: "#6B7280",
  },
  costValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#3B82F6",
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1E40AF",
    lineHeight: 20,
  },
});
