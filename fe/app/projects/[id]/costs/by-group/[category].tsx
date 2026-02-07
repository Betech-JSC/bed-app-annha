import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { costApi, Cost } from "@/api/revenueApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function CostGroupDetailScreen() {
  const router = useRouter();
  const { id, category, label } = useLocalSearchParams<{ id: string; category: string; label?: string }>();
  const categoryParam = Array.isArray(category) ? category[0] : category;
  const labelParam = label ? (Array.isArray(label) ? label[0] : label) : undefined;
  const tabBarHeight = useTabBarHeight();
  const [costs, setCosts] = useState<Cost[]>([]);
  const [serverTotalAmount, setServerTotalAmount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadCosts();
    }, [id, category])
  );

  const loadCosts = async () => {
    try {
      setLoading(true);
      const response = await costApi.getCosts(id!, {
        category: categoryParam || undefined,
        limit: 50,
      } as any);
      if (response.success) {
        setCosts(response.data.data || []);
        if (response.meta?.total_amount !== undefined) {
          setServerTotalAmount(response.meta.total_amount);
        }
      }
    } catch (error: any) {
      console.error("Error loading costs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCosts();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const getStatusColor = (status: Cost["status"]) => {
    switch (status) {
      case "approved":
        return "#10B981";
      case "pending_management_approval":
        return "#F59E0B";
      case "pending_accountant_approval":
        return "#3B82F6";
      case "rejected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status: Cost["status"]) => {
    switch (status) {
      case "approved":
        return "Đã duyệt";
      case "pending_management_approval":
        return "Chờ Ban điều hành";
      case "pending_accountant_approval":
        return "Chờ Kế toán";
      case "rejected":
        return "Từ chối";
      case "draft":
        return "Nháp";
      default:
        return status;
    }
  };

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      material: "Chi phí vật liệu",
      subcontractor: "Chi phí thầu phụ",
      equipment: "Chi phí thuê thiết bị",
      labor: "Nhân công khoán",
      other: "Chi phí khác",
    };
    return labels[cat] || cat;
  };

  const renderItem = ({ item }: { item: Cost }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/projects/${id}/costs/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            {item.cost_group && (
              <Text style={styles.cardGroup}>{item.cost_group.name}</Text>
            )}
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
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={16} color="#3B82F6" />
            <Text style={styles.infoLabel}>Số tiền:</Text>
            <Text style={styles.infoValue}>{formatCurrency(item.amount)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text style={styles.infoLabel}>Ngày:</Text>
            <Text style={styles.infoValue}>{formatDate(item.cost_date)}</Text>
          </View>

          {item.description && (
            <View style={styles.descriptionRow}>
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const displayTotalAmount = serverTotalAmount !== null
    ? serverTotalAmount
    : costs.reduce((sum, cost) => sum + cost.amount, 0);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={labelParam || getCategoryLabel(categoryParam || "")}
        showBackButton
      />
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Tổng chi phí</Text>
        <Text style={styles.summaryAmount}>{formatCurrency(displayTotalAmount)}</Text>
        <Text style={styles.summaryCount}>{costs.length} mục hiển thị</Text>
      </View>
      <FlatList
        data={costs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="calculator-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>Chưa có chi phí nào</Text>
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
  summaryCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    margin: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3B82F6",
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  cardGroup: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardBody: {
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    flex: 1,
  },
  descriptionRow: {
    marginTop: 4,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    fontStyle: "italic",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
  },
});
