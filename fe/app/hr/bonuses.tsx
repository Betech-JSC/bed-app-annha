import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { bonusApi, Bonus, CreateBonusData } from "@/api/bonusApi";
import { employeesApi } from "@/api/employeesApi";
import { Ionicons } from "@expo/vector-icons";
import BonusForm from "@/components/BonusForm";

export default function BonusesScreen() {
  const router = useRouter();
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    loadBonuses();
    loadEmployees();
  }, []);

  const loadBonuses = async () => {
    try {
      setLoading(true);
      const response = await bonusApi.getBonuses({ page: 1 });
      if (response.success) {
        setBonuses(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading bonuses:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await employeesApi.getEmployees({ per_page: 100 });
      if (response.success) {
        setEmployees(response.data || []);
      }
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBonuses();
  };

  const handleCreateBonus = async (data: CreateBonusData) => {
    try {
      const response = await bonusApi.createBonus(data);
      if (response.success) {
        Alert.alert("Thành công", "Đã tạo thưởng thành công");
        setShowCreateModal(false);
        loadBonuses();
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể tạo thưởng"
      );
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const response = await bonusApi.approveBonus(id);
      if (response.success) {
        Alert.alert("Thành công", "Đã duyệt thưởng");
        loadBonuses();
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể duyệt thưởng");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "#10B981";
      case "approved":
        return "#3B82F6";
      default:
        return "#F59E0B";
    }
  };

  const getBonusTypeText = (type: string) => {
    switch (type) {
      case "performance":
        return "Hiệu suất";
      case "project_completion":
        return "Hoàn thành dự án";
      case "manual":
        return "Thủ công";
      default:
        return "Khác";
    }
  };

  const renderItem = ({ item }: { item: Bonus }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.employeeName}>{item.user?.name || "N/A"}</Text>
          <Text style={styles.projectName}>
            {item.project?.name || "Không có dự án"}
          </Text>
          <View style={styles.bonusTypeBadge}>
            <Text style={styles.bonusTypeText}>
              {getBonusTypeText(item.bonus_type)}
            </Text>
          </View>
        </View>
        <View style={styles.cardHeaderRight}>
          <Text style={styles.amount}>
            {item.amount.toLocaleString()} VND
          </Text>
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
                  : "Chờ duyệt"}
            </Text>
          </View>
        </View>
      </View>
      {item.description && (
        <Text style={styles.description}>{item.description}</Text>
      )}
      {item.status === "pending" && (
        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => handleApprove(item.id)}
        >
          <Text style={styles.approveButtonText}>Duyệt</Text>
        </TouchableOpacity>
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
        <Text style={styles.title}>Quản Lý Thưởng</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Thêm thưởng</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={bonuses}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="gift-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>Không có dữ liệu</Text>
          </View>
        }
      />

      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tạo Thưởng Mới</Text>
            <TouchableOpacity
              onPress={() => setShowCreateModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>
          <BonusForm
            onSubmit={handleCreateBonus}
            onCancel={() => setShowCreateModal(false)}
          />
        </View>
      </Modal>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  addButton: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
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
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  cardHeaderRight: {
    alignItems: "flex-end",
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  projectName: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  bonusTypeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F59E0B20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bonusTypeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#F59E0B",
  },
  amount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F59E0B",
    marginBottom: 8,
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
  description: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
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
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  modalHeader: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  closeButton: {
    padding: 4,
  },
});
