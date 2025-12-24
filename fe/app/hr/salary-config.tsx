import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import {
  salaryConfigApi,
  EmployeeSalaryConfig,
  CreateSalaryConfigData,
} from "@/api/salaryConfigApi";
import { employeesApi } from "@/api/employeesApi";
import { Ionicons } from "@expo/vector-icons";
import SalaryConfigForm from "@/components/SalaryConfigForm";
import { formatVNDWithoutSymbol } from "@/utils/format";
import { PermissionGuard } from "@/components/PermissionGuard";
import BackButton from "@/components/BackButton";

export default function SalaryConfigScreen() {
  const router = useRouter();
  const [configs, setConfigs] = useState<EmployeeSalaryConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<EmployeeSalaryConfig | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [filterUserId, setFilterUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, [filterUserId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadConfigs(), loadEmployees()]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadConfigs = async () => {
    try {
      const params: any = { page: 1 };
      if (filterUserId) {
        params.user_id = filterUserId;
      }
      const response = await salaryConfigApi.getSalaryConfig(params);
      console.log("Salary config response:", response);
      if (response.success) {
        // Backend trả về paginated data
        let data = [];
        if (Array.isArray(response.data)) {
          data = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          data = response.data.data;
        }
        console.log("Loaded configs:", data.length, data);
        setConfigs(data);
      } else {
        console.error("Response not successful:", response);
      }
    } catch (error: any) {
      console.error("Error loading salary configs:", error);
      console.error("Error details:", error.response?.data);
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải danh sách cấu hình lương");
    }
  };

  const loadEmployees = async () => {
    try {
      const response = await employeesApi.getEmployees({ page: 1, per_page: 100 });
      if (response.success) {
        // Backend trả về paginated data
        let data = [];
        if (Array.isArray(response.data)) {
          data = response.data;
        } else if (response.data?.data && Array.isArray(response.data.data)) {
          data = response.data.data;
        }
        setEmployees(data);
        console.log("Loaded employees:", data.length);
      }
    } catch (error) {
      console.error("Error loading employees:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreate = async (data: CreateSalaryConfigData) => {
    try {
      const response = await salaryConfigApi.createSalaryConfig(data);
      if (response.success) {
        Alert.alert("Thành công", "Đã tạo cấu hình lương");
        setShowCreateModal(false);
        loadConfigs();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể tạo cấu hình lương");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể tạo cấu hình lương"
      );
    }
  };

  const handleUpdate = async (data: Partial<CreateSalaryConfigData>) => {
    if (!editingConfig) return;

    try {
      const response = await salaryConfigApi.updateSalaryConfig(
        editingConfig.id,
        data
      );
      if (response.success) {
        Alert.alert("Thành công", "Đã cập nhật cấu hình lương");
        setShowEditModal(false);
        setEditingConfig(null);
        loadConfigs();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể cập nhật cấu hình lương");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể cập nhật cấu hình lương"
      );
    }
  };

  const openEditModal = (config: EmployeeSalaryConfig) => {
    setEditingConfig(config);
    setShowEditModal(true);
  };

  const handleDelete = (config: EmployeeSalaryConfig) => {
    Alert.alert(
      "Xác nhận",
      `Bạn có chắc chắn muốn xóa cấu hình lương này?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await salaryConfigApi.deleteSalaryConfig(config.id);
              if (response.success) {
                Alert.alert("Thành công", "Đã xóa cấu hình lương");
                loadConfigs();
              } else {
                Alert.alert("Lỗi", response.message || "Không thể xóa cấu hình lương");
              }
            } catch (error: any) {
              Alert.alert(
                "Lỗi",
                error.response?.data?.message || "Không thể xóa cấu hình lương"
              );
            }
          },
        },
      ]
    );
  };

  const getSalaryTypeLabel = (type: string) => {
    switch (type) {
      case "hourly":
        return "Theo giờ";
      case "daily":
        return "Theo ngày";
      case "monthly":
        return "Theo tháng";
      case "project_based":
        return "Theo dự án";
      default:
        return type;
    }
  };

  const getSalaryAmount = (config: EmployeeSalaryConfig) => {
    switch (config.salary_type) {
      case "hourly":
        return config.hourly_rate ? formatVNDWithoutSymbol(config.hourly_rate) + "/giờ" : "N/A";
      case "daily":
        return config.daily_rate ? formatVNDWithoutSymbol(config.daily_rate) + "/ngày" : "N/A";
      case "monthly":
        return config.monthly_salary ? formatVNDWithoutSymbol(config.monthly_salary) + "/tháng" : "N/A";
      case "project_based":
        return config.project_rate ? formatVNDWithoutSymbol(config.project_rate) + "/dự án" : "N/A";
      default:
        return "N/A";
    }
  };

  const isCurrent = (config: EmployeeSalaryConfig) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = new Date(config.effective_from);
    from.setHours(0, 0, 0, 0);
    const to = config.effective_to ? new Date(config.effective_to) : null;
    if (to) to.setHours(0, 0, 0, 0);
    return from <= today && (!to || to >= today);
  };

  const filteredConfigs = configs.filter((config) => {
    // Nếu có filterUserId, chỉ hiển thị config của user đó
    if (filterUserId && config.user_id !== filterUserId) {
      return false;
    }
    
    // Nếu có search query, filter theo tên, email hoặc loại lương
    if (searchQuery.trim() !== "") {
      const employee = employees.find((e) => e.id === config.user_id);
      const searchLower = searchQuery.toLowerCase();
      return (
        employee?.name?.toLowerCase().includes(searchLower) ||
        employee?.email?.toLowerCase().includes(searchLower) ||
        getSalaryTypeLabel(config.salary_type).toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  const renderItem = ({ item }: { item: EmployeeSalaryConfig }) => {
    const current = isCurrent(item);
    const employee = employees.find((e) => e.id === item.user_id);

    return (
      <View style={[styles.itemCard, current && styles.itemCardCurrent]}>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <View style={styles.itemTitleRow}>
              <View style={styles.employeeInfo}>
                <Text style={styles.itemTitle}>
                  {employee?.name || `User #${item.user_id}`}
                </Text>
                {employee?.email && (
                  <Text style={styles.itemEmail}>{employee.email}</Text>
                )}
              </View>
              {current && (
                <View style={styles.currentBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
                  <Text style={styles.currentBadgeText}>Đang áp dụng</Text>
                </View>
              )}
            </View>
            <View style={styles.salaryTypeContainer}>
              <View style={styles.salaryTypeBadge}>
                <Ionicons
                  name={
                    item.salary_type === "hourly"
                      ? "time-outline"
                      : item.salary_type === "daily"
                        ? "calendar-outline"
                        : item.salary_type === "monthly"
                          ? "calendar-number-outline"
                          : "folder-outline"
                  }
                  size={14}
                  color="#3B82F6"
                />
                <Text style={styles.salaryTypeText}>
                  {getSalaryTypeLabel(item.salary_type)}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.itemActions}>
            <PermissionGuard permission="hr.salary_config.update">
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => openEditModal(item)}
              >
                <Ionicons name="create-outline" size={20} color="#3B82F6" />
              </TouchableOpacity>
            </PermissionGuard>
            <PermissionGuard permission="hr.salary_config.delete">
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item)}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </PermissionGuard>
          </View>
        </View>

        <View style={styles.itemBody}>
          <View style={styles.salaryAmountContainer}>
            <Text style={styles.salaryAmountLabel}>Mức lương</Text>
            <Text style={styles.salaryAmountValue}>
              {getSalaryAmount(item)}
            </Text>
          </View>

          {item.overtime_rate && (
            <View style={styles.overtimeContainer}>
              <Ionicons name="flash-outline" size={16} color="#F59E0B" />
              <Text style={styles.overtimeText}>
                Tăng ca: {formatVNDWithoutSymbol(item.overtime_rate)}/giờ
              </Text>
            </View>
          )}

          <View style={styles.dateContainer}>
            <View style={styles.dateItem}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text style={styles.dateText}>
                Từ: {new Date(item.effective_from).toLocaleDateString("vi-VN")}
              </Text>
            </View>
            {item.effective_to && (
              <View style={styles.dateItem}>
                <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                <Text style={styles.dateText}>
                  Đến: {new Date(item.effective_to).toLocaleDateString("vi-VN")}
                </Text>
              </View>
            )}
            {!item.effective_to && (
              <View style={styles.dateItem}>
                <Ionicons name="infinite-outline" size={14} color="#10B981" />
                <Text style={[styles.dateText, styles.dateTextIndefinite]}>
                  Không giới hạn
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton />
        <Text style={styles.headerTitle}>Cấu Hình Lương</Text>
        <PermissionGuard permission="hr.salary_config.create">
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </PermissionGuard>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo tên, email, loại lương..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                !filterUserId && styles.filterButtonActive,
              ]}
              onPress={() => setFilterUserId(null)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  !filterUserId && styles.filterButtonTextActive,
                ]}
              >
                Tất cả
              </Text>
            </TouchableOpacity>
            {employees.slice(0, 10).map((employee) => (
              <TouchableOpacity
                key={employee.id}
                style={[
                  styles.filterButton,
                  filterUserId === employee.id && styles.filterButtonActive,
                ]}
                onPress={() => setFilterUserId(employee.id)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    filterUserId === employee.id && styles.filterButtonTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {employee.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredConfigs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cash-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>
              {searchQuery || filterUserId
                ? "Không tìm thấy cấu hình lương phù hợp"
                : "Chưa có cấu hình lương"}
            </Text>
            {!searchQuery && !filterUserId && (
              <PermissionGuard permission="hr.salary_config.create">
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => setShowCreateModal(true)}
                >
                  <Text style={styles.emptyButtonText}>Tạo cấu hình lương</Text>
                </TouchableOpacity>
              </PermissionGuard>
            )}
          </View>
        }
      />

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo Cấu Hình Lương</Text>
              <TouchableOpacity
                onPress={() => setShowCreateModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <SalaryConfigForm
                onSubmit={handleCreate}
                onCancel={() => setShowCreateModal(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingConfig(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chỉnh Sửa Cấu Hình Lương</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditModal(false);
                  setEditingConfig(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {editingConfig && (
                <SalaryConfigForm
                  onSubmit={handleUpdate}
                  onCancel={() => {
                    setShowEditModal(false);
                    setEditingConfig(null);
                  }}
                  initialData={editingConfig}
                />
              )}
            </View>
          </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
    marginLeft: 8,
  },
  addButton: {
    backgroundColor: "#3B82F6",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  searchFilterContainer: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterScroll: {
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: "#3B82F6",
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemCardCurrent: {
    borderColor: "#10B981",
    borderWidth: 2,
    backgroundColor: "#F0FDF4",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 8,
  },
  employeeInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  itemEmail: {
    fontSize: 13,
    color: "#6B7280",
  },
  currentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  salaryTypeContainer: {
    marginTop: 8,
  },
  salaryTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  salaryTypeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3B82F6",
  },
  itemActions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  itemBody: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  salaryAmountContainer: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#3B82F6",
  },
  salaryAmountLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
    fontWeight: "500",
  },
  salaryAmountValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  overtimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    padding: 10,
    borderRadius: 8,
  },
  overtimeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#F59E0B",
  },
  dateContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  dateItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: "#6B7280",
  },
  dateTextIndefinite: {
    color: "#10B981",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: 16,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#3B82F6",
    borderRadius: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "95%",
    minHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalBody: {
    flex: 1,
    minHeight: 400,
  },
  closeButton: {
    padding: 4,
  },
});

