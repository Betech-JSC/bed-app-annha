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
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { additionalCostApi, AdditionalCost } from "@/api/additionalCostApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader, PermissionGuard } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Permissions } from "@/constants/Permissions";

export default function AdditionalCostsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const [costs, setCosts] = useState<AdditionalCost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCosts();
  }, [id]);

  // Reload data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadCosts();
    }, [id])
  );

  const loadCosts = async () => {
    try {
      setLoading(true);
      const response = await additionalCostApi.getAdditionalCosts(id!);
      if (response.success) {
        setCosts(response.data || []);
      }
    } catch (error) {
      console.error("Error loading costs:", error);
    } finally {
      setLoading(false);
    }
  };


  const handleConfirm = async (costId: number) => {
    try {
      const response = await additionalCostApi.confirmAdditionalCost(id!, costId);
      if (response.success) {
        Alert.alert("Thành công", "Đã xác nhận đã nhận tiền.");
        loadCosts();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleApprove = async (costId: number) => {
    try {
      const response = await additionalCostApi.approveAdditionalCost(id!, costId);
      if (response.success) {
        Alert.alert("Thành công", "Chi phí phát sinh đã được duyệt.");
        loadCosts();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
    }
  };

  const handleMarkPaid = async (costId: number) => {
    Alert.alert(
      "Xác nhận thanh toán",
      "Bạn có chắc chắn đã thanh toán chi phí này?",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Xác nhận",
          onPress: async () => {
            try {
              const response = await additionalCostApi.markAsPaidByCustomer(id!, costId, {
                paid_date: new Date().toISOString().split("T")[0],
              });
              if (response.success) {
                Alert.alert("Thành công", "Đã đánh dấu thanh toán. Đang chờ kế toán xác nhận.");
                loadCosts();
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Có lỗi xảy ra");
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
      case "approved":
        return "#10B981";
      case "customer_paid":
        return "#3B82F6";
      case "pending":
      case "pending_approval":
        return "#F59E0B";
      case "rejected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Chờ thanh toán";
      case "customer_paid":
        return "Khách đã thanh toán";
      case "confirmed":
        return "Đã nhận tiền";
      case "pending_approval":
        return "Chờ duyệt";
      case "approved":
        return "Đã duyệt";
      case "rejected":
        return "Đã từ chối";
      default:
        return status;
    }
  };

  const renderCostItem = ({ item }: { item: AdditionalCost }) => (
    <TouchableOpacity
      style={styles.costCard}
      onPress={() => router.push(`/projects/${id}/additional-costs/${item.id}`)}
    >
      <View style={styles.costHeader}>
        <Text style={styles.costAmount}>{formatCurrency(item.amount)}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + "20" },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.status) },
            ]}
          >
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>
      <Text style={styles.costDescription} numberOfLines={2}>
        {item.description}
      </Text>

      {/* Hiển thị số lượng file đính kèm */}
      {item.attachments && item.attachments.length > 0 && (
        <View style={styles.attachmentsBadge}>
          <Ionicons name="attach" size={14} color="#6B7280" />
          <Text style={styles.attachmentsText}>
            {item.attachments.length} file đính kèm
          </Text>
        </View>
      )}

      {/* Khách hàng đánh dấu đã thanh toán */}
      {item.status === "pending" && (
        <PermissionGuard permission={Permissions.ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER} projectId={id}>
          <TouchableOpacity
            style={styles.markPaidButton}
            onPress={(e) => {
              e.stopPropagation();
              handleMarkPaid(item.id);
            }}
          >
            <Text style={styles.markPaidButtonText}>Đã thanh toán</Text>
          </TouchableOpacity>
        </PermissionGuard>
      )}

      {/* Kế toán xác nhận đã nhận tiền */}
      {item.status === "customer_paid" && (
        <PermissionGuard permission={Permissions.ADDITIONAL_COST_CONFIRM} projectId={id}>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={(e) => {
              e.stopPropagation();
              handleConfirm(item.id);
            }}
          >
            <Text style={styles.confirmButtonText}>Xác nhận đã nhận tiền</Text>
          </TouchableOpacity>
        </PermissionGuard>
      )}

      {/* Backward compatible: pending_approval → approve */}
      {item.status === "pending_approval" && (
        <PermissionGuard permission={Permissions.ADDITIONAL_COST_APPROVE} projectId={id}>
          <TouchableOpacity
            style={styles.approveButton}
            onPress={(e) => {
              e.stopPropagation();
              handleApprove(item.id);
            }}
          >
            <Text style={styles.approveButtonText}>Duyệt</Text>
          </TouchableOpacity>
        </PermissionGuard>
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
      <ScreenHeader
        title="Phát Sinh Ngoài Báo Giá"
        showBackButton
        rightComponent={
          <PermissionGuard permission={Permissions.ADDITIONAL_COST_CREATE} projectId={id}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push(`/projects/${id}/additional-costs/create`)}
            >
              <Ionicons name="add" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </PermissionGuard>
        }
      />

      <FlatList
        data={costs}
        renderItem={renderCostItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="add-circle-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có chi phí phát sinh</Text>
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
  addButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
  },
  costCard: {
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
  costHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  costAmount: {
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
  costDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  markPaidButton: {
    backgroundColor: "#3B82F6",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  markPaidButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#10B981",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  approveButton: {
    backgroundColor: "#10B981",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
  attachmentsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  attachmentsText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
});
