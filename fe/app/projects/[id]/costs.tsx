import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { costApi, Cost, revenueApi } from "@/api/revenueApi";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useProjectPermissions } from "@/hooks/usePermissions";

export default function CostsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hasPermission } = useProjectPermissions(id);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [summary, setSummary] = useState<{
    grouped?: Array<{
      category: string;
      category_label: string;
      total: number;
      count: number;
    }>;
    summary?: {
      total_amount: number;
      total_count: number;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<
    Cost["category"] | null
  >(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    category: "other" as Cost["category"],
    name: "",
    amount: "",
    description: "",
    cost_date: new Date(),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadCosts();
    loadSummary();
  }, [id, filterStatus, filterCategory]);

  const loadCosts = async () => {
    try {
      setLoading(true);
      const response = await costApi.getCosts(id!, {
        status: filterStatus || undefined,
        category: filterCategory || undefined,
      });
      if (response.success) {
        setCosts(response.data.data || []);
      }
    } catch (error) {
      console.error("Error loading costs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSummary = async () => {
    try {
      const response = await revenueApi.getCostsByCategory(id!);
      if (response.success) {
        setSummary(response.data);
      }
    } catch (error) {
      console.error("Error loading summary:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCosts();
    loadSummary();
  };

  const handleCreateCost = async () => {
    if (!formData.name || !formData.amount) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      const response = await costApi.createCost(id!, {
        category: formData.category,
        name: formData.name,
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        cost_date: formData.cost_date.toISOString().split("T")[0],
      });

      if (response.success) {
        Alert.alert("Thành công", "Đã tạo chi phí");
        setShowCreateModal(false);
        resetForm();
        loadCosts();
        loadSummary();
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể tạo chi phí"
      );
    }
  };

  const handleSubmit = async (costId: number) => {
    try {
      const response = await costApi.submitCost(id!, costId);
      if (response.success) {
        Alert.alert("Thành công", "Đã gửi để Ban điều hành duyệt");
        loadCosts();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể submit");
    }
  };

  const handleApproveManagement = async (costId: number) => {
    try {
      const response = await costApi.approveByManagement(id!, costId);
      if (response.success) {
        Alert.alert("Thành công", "Đã duyệt (Ban điều hành)");
        loadCosts();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể duyệt");
    }
  };

  const handleApproveAccountant = async (costId: number) => {
    try {
      const response = await costApi.approveByAccountant(id!, costId);
      if (response.success) {
        Alert.alert("Thành công", "Đã xác nhận (Kế toán)");
        loadCosts();
        loadSummary();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể xác nhận");
    }
  };

  const resetForm = () => {
    setFormData({
      category: "other",
      name: "",
      amount: "",
      description: "",
      cost_date: new Date(),
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
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
      case "draft":
        return "Nháp";
      case "pending_management_approval":
        return "Chờ Ban điều hành";
      case "pending_accountant_approval":
        return "Chờ Kế toán";
      case "approved":
        return "Đã duyệt";
      case "rejected":
        return "Từ chối";
      default:
        return status;
    }
  };

  const getCategoryLabel = (category: Cost["category"]) => {
    const labels: Record<Cost["category"], string> = {
      construction_materials: "Vật liệu xây dựng",
      concrete: "Bê tông",
      labor: "Nhân công",
      equipment: "Thiết bị",
      transportation: "Vận chuyển",
      other: "Chi phí khác",
    };
    return labels[category] || category;
  };

  const renderCostItem = ({ item }: { item: Cost }) => (
    <View style={styles.costCard}>
      <View style={styles.costHeader}>
        <View style={styles.costHeaderLeft}>
          <Text style={styles.costName}>{item.name}</Text>
          <Text style={styles.costCategory}>
            {item.category_label || getCategoryLabel(item.category)}
          </Text>
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

      <View style={styles.costDetails}>
        <Text style={styles.costAmount}>
          {formatCurrency(item.amount)}
        </Text>
        <Text style={styles.costDate}>
          {new Date(item.cost_date).toLocaleDateString("vi-VN")}
        </Text>
      </View>

      {item.description && (
        <Text style={styles.costDescription}>{item.description}</Text>
      )}

      {/* Actions based on status */}
      {item.status === "draft" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.submitButton]}
            onPress={() => handleSubmit(item.id)}
          >
            <Text style={styles.actionButtonText}>Gửi duyệt</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === "pending_management_approval" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApproveManagement(item.id)}
          >
            <Text style={styles.actionButtonText}>Duyệt (Ban điều hành)</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === "pending_accountant_approval" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApproveAccountant(item.id)}
          >
            <Text style={styles.actionButtonText}>Xác nhận (Kế toán)</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  if (loading && !refreshing) {
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
        <Text style={styles.headerTitle}>Chi Phí Dự Án</Text>
        <PermissionGuard permission="costs.create" projectId={id}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </PermissionGuard>
      </View>

      {/* Summary by Category */}
      {summary && summary.grouped && summary.grouped.length > 0 && (
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Tổng Hợp Theo Nhóm</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {summary.grouped.map((group: any, index: number) => (
              <View key={index} style={styles.summaryCard}>
                <Text style={styles.summaryCategory}>{group.category_label}</Text>
                <Text style={styles.summaryAmount}>
                  {formatCurrency(group.total)}
                </Text>
                <Text style={styles.summaryCount}>{group.count} mục</Text>
              </View>
            ))}
          </ScrollView>
          <View style={styles.totalSummary}>
            <Text style={styles.totalSummaryLabel}>Tổng chi phí</Text>
            <Text style={styles.totalSummaryValue}>
              {formatCurrency(summary.summary.total_amount)}
            </Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filters}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              !filterStatus && styles.filterChipActive,
            ]}
            onPress={() => setFilterStatus(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                !filterStatus && styles.filterChipTextActive,
              ]}
            >
              Tất cả
            </Text>
          </TouchableOpacity>
          {["draft", "pending_management_approval", "pending_accountant_approval", "approved"].map(
            (status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  filterStatus === status && styles.filterChipActive,
                ]}
                onPress={() =>
                  setFilterStatus(filterStatus === status ? null : status)
                }
              >
                <Text
                  style={[
                    styles.filterChipText,
                    filterStatus === status && styles.filterChipTextActive,
                  ]}
                >
                  {getStatusText(status as Cost["status"])}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      </View>

      {/* Costs List */}
      <FlatList
        data={costs}
        renderItem={renderCostItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
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

      {/* Create Cost Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thêm Chi Phí</Text>
            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nhóm chi phí *</Text>
              <View style={styles.categoryGrid}>
                {[
                  "construction_materials",
                  "concrete",
                  "labor",
                  "equipment",
                  "transportation",
                  "other",
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      formData.category === cat && styles.categoryButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, category: cat as Cost["category"] })
                    }
                  >
                    <Text
                      style={[
                        styles.categoryButtonText,
                        formData.category === cat &&
                        styles.categoryButtonTextActive,
                      ]}
                    >
                      {getCategoryLabel(cat as Cost["category"])}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tên chi phí *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập tên chi phí"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Số tiền *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập số tiền"
                value={formData.amount}
                onChangeText={(text) =>
                  setFormData({ ...formData, amount: text })
                }
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Ngày phát sinh *</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                <Text style={styles.dateButtonText}>
                  {formData.cost_date.toLocaleDateString("vi-VN")}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formData.cost_date}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setFormData({ ...formData, cost_date: date });
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhập mô tả (tùy chọn)"
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleCreateCost}
              >
                <Text style={styles.saveButtonText}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    flex: 1,
    marginLeft: 12,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  summarySection: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
    alignItems: "center",
  },
  summaryCategory: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
    textAlign: "center",
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  totalSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  totalSummaryLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  totalSummaryValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#EF4444",
  },
  filters: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#3B82F6",
  },
  filterChipText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  costHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  costHeaderLeft: {
    flex: 1,
  },
  costName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  costCategory: {
    fontSize: 14,
    color: "#6B7280",
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
  costDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  costAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: "#EF4444",
  },
  costDate: {
    fontSize: 14,
    color: "#6B7280",
  },
  costDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  submitButton: {
    backgroundColor: "#3B82F6",
  },
  approveButton: {
    backgroundColor: "#10B981",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalContent: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  categoryButtonActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  categoryButtonText: {
    fontSize: 14,
    color: "#6B7280",
  },
  categoryButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#1F2937",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 32,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#E5E7EB",
  },
  cancelButtonText: {
    color: "#1F2937",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
