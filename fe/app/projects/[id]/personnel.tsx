import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { personnelApi, ProjectPersonnel, CreatePersonnelData } from "@/api/personnelApi";
import { employeesApi, Employee } from "@/api/employeesApi";
import { optionsApi, Option } from "@/api/optionsApi";
import { Ionicons } from "@expo/vector-icons";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";

export default function PersonnelScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const [personnel, setPersonnel] = useState<ProjectPersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [personnelRoles, setPersonnelRoles] = useState<Option[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const { hasPermission } = useProjectPermissions(id!);

  useEffect(() => {
    loadPersonnel();
    loadPersonnelRoles();
  }, [id]);

  const loadPersonnelRoles = async () => {
    try {
      setLoadingRoles(true);
      const roles = await optionsApi.getPersonnelRoles();
      setPersonnelRoles(roles);
    } catch (error) {
      console.error("Error loading personnel roles:", error);
    } finally {
      setLoadingRoles(false);
    }
  };

  const loadPersonnel = async () => {
    try {
      setLoading(true);
      const response = await personnelApi.getPersonnel(id!);
      if (response.success) {
        setPersonnel(response.data || []);
      }
    } catch (error) {
      console.error("Error loading personnel:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPersonnel();
  };

  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const response = await employeesApi.getEmployees({ per_page: 100 });
      if (response.success) {
        // Filter out employees already in project
        const assignedUserIds = personnel.map((p) => p.user_id);
        const availableEmployees = (response.data || []).filter(
          (emp: Employee) => !assignedUserIds.includes(emp.id)
        );
        setEmployees(availableEmployees);
      }
    } catch (error) {
      console.error("Error loading employees:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách nhân viên");
    } finally {
      setLoadingEmployees(false);
    }
  };

  const handleOpenAddModal = () => {
    setShowAddModal(true);
    setSelectedUser(null);
    setSelectedRole("");
    loadEmployees();
  };

  const handleAddPersonnel = async () => {
    if (!selectedUser || !selectedRole) {
      Alert.alert("Lỗi", "Vui lòng chọn nhân viên và vai trò");
      return;
    }

    try {
      setSubmitting(true);
      const data: CreatePersonnelData = {
        user_id: selectedUser,
        role: selectedRole as any,
      };

      const response = await personnelApi.addPersonnel(id!, data);
      if (response.success) {
        Alert.alert("Thành công", "Đã thêm nhân sự vào dự án");
        setShowAddModal(false);
        setSelectedUser(null);
        setSelectedRole("");
        loadPersonnel();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể thêm nhân sự");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể thêm nhân sự"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemovePersonnel = async (personnelId: number) => {
    Alert.alert(
      "Xác nhận",
      "Bạn có chắc chắn muốn xóa nhân sự này khỏi dự án?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await personnelApi.removePersonnel(id!, personnelId);
              if (response.success) {
                Alert.alert("Thành công", "Đã xóa nhân sự khỏi dự án");
                loadPersonnel();
              } else {
                Alert.alert("Lỗi", response.message || "Không thể xóa nhân sự");
              }
            } catch (error: any) {
              Alert.alert(
                "Lỗi",
                error.response?.data?.message || "Không thể xóa nhân sự"
              );
            }
          },
        },
      ]
    );
  };

  const getRoleText = (role: string) => {
    const roleOption = personnelRoles.find(r => r.value === role);
    return roleOption?.label || role;
  };

  const getRoleLabel = (role: string) => {
    const roleOption = personnelRoles.find(r => r.value === role);
    return roleOption?.label || role;
  };

  // Legacy function - keeping for backward compatibility
  const getRoleTextOld = (role: string) => {
    const roleMap: Record<string, string> = {
      project_manager: "Quản lý dự án",
      supervisor: "Giám sát",
      accountant: "Kế toán",
      editor: "Chỉnh sửa",
      viewer: "Xem",
      management: "Ban điều hành",
      team_leader: "Tổ trưởng",
      worker: "Thợ",
      guest: "Khách",
      supervisor_guest: "Giám sát khách",
      designer: "Bên Thiết Kế",
    };
    return roleMap[role] || role;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "project_manager":
        return "#3B82F6";
      case "supervisor":
        return "#10B981";
      case "accountant":
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const renderPersonnelItem = ({ item }: { item: ProjectPersonnel }) => (
    <View style={styles.personnelCard}>
      <View style={styles.personnelHeader}>
        <View style={styles.personnelInfo}>
          <Text style={styles.personnelName}>
            {item.user?.name || `User #${item.user_id}`}
          </Text>
          <Text style={styles.personnelEmail}>
            {item.user?.email || "N/A"}
          </Text>
        </View>
        <View
          style={[
            styles.roleBadge,
            { backgroundColor: getRoleColor(item.role) + "20" },
          ]}
        >
          <Text
            style={[styles.roleText, { color: getRoleColor(item.role) }]}
          >
            {getRoleText(item.role)}
          </Text>
        </View>
      </View>
      {hasPermission("personnel.remove") && (
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemovePersonnel(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={styles.removeButtonText}>Xóa</Text>
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
      <ScreenHeader
        title="Nhân Sự Tham Gia"
        showBackButton
        rightComponent={
          <PermissionGuard permission="personnel.assign" projectId={id}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleOpenAddModal}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </PermissionGuard>
        }
      />

      <FlatList
        data={personnel}
        renderItem={renderPersonnelItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyText}>Chưa có nhân sự nào</Text>
            <PermissionGuard permission="personnel.assign" projectId={id}>
              <TouchableOpacity
                style={styles.emptyAddButton}
                onPress={handleOpenAddModal}
              >
                <Ionicons name="add-circle" size={20} color="#3B82F6" />
                <Text style={styles.emptyAddButtonText}>
                  Thêm nhân sự đầu tiên
                </Text>
              </TouchableOpacity>
            </PermissionGuard>
          </View>
        }
      />

      {/* Add Personnel Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thêm Nhân Sự</Text>
            <TouchableOpacity
              onPress={() => {
                setShowAddModal(false);
                setSelectedUser(null);
                setSelectedRole("");
              }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Select Employee */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Chọn nhân viên <Text style={styles.required}>*</Text>
              </Text>
              {loadingEmployees ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <ScrollView
                  style={styles.employeeList}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                >
                  {employees.length === 0 ? (
                    <Text style={styles.emptyText}>
                      Không còn nhân viên nào để thêm
                    </Text>
                  ) : (
                    employees.map((employee) => (
                      <TouchableOpacity
                        key={employee.id}
                        style={[
                          styles.employeeItem,
                          selectedUser === employee.id &&
                          styles.employeeItemSelected,
                        ]}
                        onPress={() => setSelectedUser(employee.id)}
                      >
                        <View style={styles.employeeItemContent}>
                          <View
                            style={[
                              styles.radioButton,
                              selectedUser === employee.id &&
                              styles.radioButtonSelected,
                            ]}
                          >
                            {selectedUser === employee.id && (
                              <View style={styles.radioButtonInner} />
                            )}
                          </View>
                          <View style={styles.employeeInfo}>
                            <Text style={styles.employeeName}>
                              {employee.name}
                            </Text>
                            <Text style={styles.employeeEmail}>
                              {employee.email}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              )}
            </View>

            {/* Select Role */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Vai trò <Text style={styles.required}>*</Text>
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.roleScroll}
              >
                {personnelRoles.map((role) => (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleChip,
                      selectedRole === role.value && styles.roleChipSelected,
                    ]}
                    onPress={() => setSelectedRole(role.value)}
                  >
                    <Text
                      style={[
                        styles.roleChipText,
                        selectedRole === role.value &&
                        styles.roleChipTextSelected,
                      ]}
                    >
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowAddModal(false);
                setSelectedUser(null);
                setSelectedRole("");
              }}
            >
              <Text style={styles.cancelButtonText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.saveButton,
                (!selectedUser || !selectedRole || submitting) &&
                styles.saveButtonDisabled,
              ]}
              onPress={handleAddPersonnel}
              disabled={!selectedUser || !selectedRole || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Thêm</Text>
              )}
            </TouchableOpacity>
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
  },
  personnelCard: {
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
  personnelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  personnelInfo: {
    flex: 1,
    marginRight: 12,
  },
  personnelName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  personnelEmail: {
    fontSize: 14,
    color: "#6B7280",
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
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
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
  },
  emptyAddButtonText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  removeButtonText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
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
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  required: {
    color: "#EF4444",
  },
  employeeList: {
    maxHeight: 300,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  employeeItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  employeeItemSelected: {
    backgroundColor: "#EFF6FF",
  },
  employeeItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  radioButtonSelected: {
    borderColor: "#3B82F6",
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#3B82F6",
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  employeeEmail: {
    fontSize: 14,
    color: "#6B7280",
  },
  roleScroll: {
    marginTop: 8,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginRight: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  roleChipSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  roleChipText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  roleChipTextSelected: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
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
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
