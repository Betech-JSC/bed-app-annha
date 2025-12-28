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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBonus, setEditingBonus] = useState<Bonus | null>(null);
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

  const handleUpdateBonus = async (data: Partial<CreateBonusData>) => {
    if (!editingBonus) return;

    try {
      const response = await bonusApi.updateBonus(editingBonus.id, data);
      if (response.success) {
        Alert.alert("Thành công", "Đã cập nhật thưởng thành công");
        setShowEditModal(false);
        setEditingBonus(null);
        loadBonuses();
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể cập nhật thưởng"
      );
    }
  };

  const handleDeleteBonus = async (bonus: Bonus) => {
    // Không cho phép xóa thưởng đã thanh toán
    if (bonus.status === "paid") {
      Alert.alert("Lỗi", "Không thể xóa thưởng đã được thanh toán");
      return;
    }

    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc chắn muốn xóa thưởng này?`,
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await bonusApi.deleteBonus(bonus.id);
              if (response.success) {
                Alert.alert("Thành công", "Đã xóa thưởng");
                loadBonuses();
              } else {
                Alert.alert("Lỗi", response.message || "Không thể xóa thưởng");
              }
            } catch (error: any) {
              Alert.alert(
                "Lỗi",
                error.response?.data?.message || "Không thể xóa thưởng"
              );
            }
          },
        },
      ]
    );
  };

  const openEditModal = (bonus: Bonus) => {
    setEditingBonus(bonus);
    setShowEditModal(true);
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
      <View style={styles.cardActions}>
        {item.status === "pending" && (
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item.id)}
          >
            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Duyệt</Text>
          </TouchableOpacity>
        )}
        {item.status !== "paid" && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => openEditModal(item)}
            >
              <Ionicons name="create-outline" size={18} color="#3B82F6" />
              <Text style={[styles.actionButtonText, styles.editButtonText]}>
                Sửa
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteBonus(item)}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
                Xóa
              </Text>
            </TouchableOpacity>
          </>
        )}
        {item.status === "approved" && (
          <TouchableOpacity
            style={[styles.actionButton, styles.payButton]}
            onPress={async () => {
              try {
                const response = await bonusApi.markAsPaid(item.id);
                if (response.success) {
                  Alert.alert("Thành công", "Đã đánh dấu thanh toán");
                  loadBonuses();
                }
              } catch (error: any) {
                Alert.alert(
                  "Lỗi",
                  error.response?.data?.message || "Không thể đánh dấu thanh toán"
                );
              }
            }}
          >
            <Ionicons name="cash-outline" size={18} color="#10B981" />
            <Text style={[styles.actionButtonText, styles.payButtonText]}>
              Đánh dấu đã trả
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
      <ScreenHeader
        title="Quản Lý Thưởng"
        rightComponent={
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Thêm thưởng</Text>
          </TouchableOpacity>
        }
      />

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

      {/* Create Modal */}
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

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingBonus(null);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chỉnh Sửa Thưởng</Text>
            <TouchableOpacity
              onPress={() => {
                setShowEditModal(false);
                setEditingBonus(null);
              }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>
          {editingBonus && (
            <BonusForm
              onSubmit={handleUpdateBonus}
              onCancel={() => {
                setShowEditModal(false);
                setEditingBonus(null);
              }}
              initialData={{
                user_id: editingBonus.user_id,
                project_id: editingBonus.project_id,
                bonus_type: editingBonus.bonus_type,
                amount: editingBonus.amount,
                calculation_method: editingBonus.calculation_method,
                period_start: editingBonus.period_start,
                period_end: editingBonus.period_end,
                description: editingBonus.description,
              }}
            />
          )}
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
  cardActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  approveButton: {
    backgroundColor: "#3B82F6",
  },
  editButton: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  deleteButton: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  payButton: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#10B981",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  approveButtonText: {
    color: "#FFFFFF",
  },
  editButtonText: {
    color: "#3B82F6",
  },
  deleteButtonText: {
    color: "#EF4444",
  },
  payButtonText: {
    color: "#10B981",
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
