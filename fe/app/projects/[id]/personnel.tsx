import React, { useState, useEffect, useMemo } from "react";
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
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { personnelApi, ProjectPersonnel, CreatePersonnelData } from "@/api/personnelApi";
import { projectApi } from "@/api/projectApi";
import { optionsApi, Option } from "@/api/optionsApi";
import { Ionicons } from "@expo/vector-icons";
import { PermissionGuard } from "@/components/PermissionGuard";
import { useProjectPermissions } from "@/hooks/usePermissions";
import { ScreenHeader, PermissionDenied } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { Permissions } from "@/constants/Permissions";

export default function PersonnelScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tabBarHeight = useTabBarHeight();
  const [personnel, setPersonnel] = useState<ProjectPersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [personnelRoles, setPersonnelRoles] = useState<Option[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [activeRoleFilter, setActiveRoleFilter] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState("");
  const { hasPermission } = useProjectPermissions(id!);

  useEffect(() => {
    loadPersonnel();
    loadPersonnelRoles();
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      loadPersonnel();
    }, [id])
  );

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
      setPermissionDenied(false);
      setPermissionMessage("");
      const response = await personnelApi.getPersonnel(id!);
      if (response.success) {
        setPersonnel(response.data || []);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        setPermissionDenied(true);
        setPermissionMessage(error.response?.data?.message || "Bạn không có quyền xem nhân sự của dự án này.");
        setPersonnel([]);
      } else {
        console.error("Error loading personnel:", error);
      }
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
      const response = await projectApi.getAllUsers();
      if (response.success) {
        const assignedUserIds = personnel.map((p) => p.user_id);
        const availableEmployees = (response.data || []).filter(
          (emp: any) => !assignedUserIds.includes(emp.id)
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
    setSelectedRoleId(null);
    setEmployeeSearch("");
    loadEmployees();
  };

  const filteredEmployees = useMemo(() => {
    if (!employeeSearch) return employees;
    const searchLower = employeeSearch.toLowerCase();
    return employees.filter(
      (emp) =>
        emp.name?.toLowerCase().includes(searchLower) ||
        emp.email?.toLowerCase().includes(searchLower) ||
        emp.phone?.toLowerCase().includes(searchLower)
    );
  }, [employees, employeeSearch]);

  const filteredPersonnel = useMemo(() => {
    if (!activeRoleFilter) return personnel;
    return personnel.filter(p => {
      const roleCode = p.personnelRole?.code || p.role;
      return roleCode === activeRoleFilter;
    });
  }, [personnel, activeRoleFilter]);

  const handleAddPersonnel = async () => {
    if (!selectedUser || !selectedRoleId) {
      Alert.alert("Lỗi", "Vui lòng chọn nhân viên và vai trò");
      return;
    }

    try {
      setSubmitting(true);
      const data: CreatePersonnelData = {
        user_id: selectedUser,
        role_id: selectedRoleId,
      };

      const response = await personnelApi.addPersonnel(id!, data);
      if (response.success) {
        Alert.alert("Thành công", "Đã thêm nhân sự vào dự án");
        setShowAddModal(false);
        setSelectedUser(null);
        setSelectedRoleId(null);
        loadPersonnel();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể thêm nhân sự");
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể thêm nhân sự");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemovePersonnel = async (personnelId: number) => {
    Alert.alert("Xác nhận", "Bạn có chắc chắn muốn xóa nhân sự này khỏi dự án?", [
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
            Alert.alert("Lỗi", error.response?.data?.message || "Không thể xóa nhân sự");
          }
        },
      },
    ]);
  };

  const getRoleText = (item: ProjectPersonnel) => {
    if (item.personnelRole) return item.personnelRole.name;
    if (item.role) {
      const roleOption = personnelRoles.find(r => r.value === item.role);
      return roleOption?.label || item.role;
    }
    return "N/A";
  };

  const getRoleCode = (item: ProjectPersonnel): string => {
    if (item.personnelRole) return item.personnelRole.code;
    return item.role || "";
  };

  const getRoleColor = (roleCode: string) => {
    switch (roleCode) {
      case "project_manager": return "#3B82F6";
      case "supervisor": return "#10B981";
      case "accountant": return "#F59E0B";
      default: return "#6B7280";
    }
  };

  const renderPersonnelItem = ({ item }: { item: ProjectPersonnel }) => (
    <View style={styles.personnelCard}>
      <View style={styles.personnelHeader}>
        <View style={styles.personnelInfo}>
          <Text style={styles.personnelName}>{item.user?.name || `User #${item.user_id}`}</Text>
          <Text style={styles.personnelEmail}>{item.user?.email || "N/A"}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(getRoleCode(item)) + "20" }]}>
          <Text style={[styles.roleText, { color: getRoleColor(getRoleCode(item)) }]}>
            {getRoleText(item)}
          </Text>
        </View>
      </View>
      <PermissionGuard permission={Permissions.PERSONNEL_REMOVE} projectId={id}>
        <TouchableOpacity style={styles.removeButton} onPress={() => handleRemovePersonnel(item.id)}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={styles.removeButtonText}>Xóa</Text>
        </TouchableOpacity>
      </PermissionGuard>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Nhân Sự Tham Gia" showBackButton />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Nhân Sự Tham Gia" showBackButton />
        <PermissionDenied message={permissionMessage} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Nhân Sự Tham Gia"
        showBackButton
        rightComponent={
          <View style={{ flexDirection: "row", gap: 12 }}>
            <PermissionGuard permission={Permissions.KPI_VIEW} projectId={id}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: "#10B981" }]}
                onPress={() => router.push(`/projects/${id}/kpis`)}
              >
                <Ionicons name="trophy-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </PermissionGuard>

            <PermissionGuard permission={Permissions.PERSONNEL_ASSIGN} projectId={id}>
              <TouchableOpacity style={styles.addButton} onPress={handleOpenAddModal}>
                <Ionicons name="add" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </PermissionGuard>
          </View>
        }
      />

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterChip, activeRoleFilter === null && styles.filterChipActive]}
            onPress={() => setActiveRoleFilter(null)}
          >
            <Text style={[styles.filterChipText, activeRoleFilter === null && styles.filterChipTextActive]}>Tất cả</Text>
          </TouchableOpacity>
          {personnelRoles.map((role) => (
            <TouchableOpacity
              key={role.value}
              style={[styles.filterChip, activeRoleFilter === role.value && styles.filterChipActive]}
              onPress={() => setActiveRoleFilter(role.value === activeRoleFilter ? null : role.value)}
            >
              <Text style={[styles.filterChipText, activeRoleFilter === role.value && styles.filterChipTextActive]}>
                {role.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <PermissionGuard permission={Permissions.PERSONNEL_VIEW} projectId={id}>
        <FlatList
          data={filteredPersonnel}
          renderItem={renderPersonnelItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 20 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>Chưa có nhân sự nào</Text>
            </View>
          }
        />
      </PermissionGuard>

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalFullContainer}>
          <View style={[styles.modalHeader, Platform.OS === 'android' && { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={() => setShowAddModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Thêm Nhân Sự</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={20} color="#9CA3AF" />
            <TextInput
              style={styles.searchInputField}
              placeholder="Tìm nhân viên theo tên, email..."
              value={employeeSearch}
              onChangeText={setEmployeeSearch}
              placeholderTextColor="#9CA3AF"
            />
            {employeeSearch.length > 0 && (
              <TouchableOpacity onPress={() => setEmployeeSearch("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formSection}>
              <Text style={styles.label}>Chọn nhân viên <Text style={styles.required}>*</Text></Text>
              {loadingEmployees ? (
                <View style={styles.loadingInModal}><ActivityIndicator size="small" color="#3B82F6" /></View>
              ) : (
                <View style={styles.employeeList}>
                  {filteredEmployees.length === 0 ? (
                    <View style={styles.emptyEmployees}>
                      <Ionicons name="person-remove-outline" size={48} color="#D1D5DB" />
                      <Text style={styles.emptyEmployeesText}>
                        {employeeSearch ? "Không tìm thấy kết quả" : "Tất cả nhân viên đã tham gia dự án"}
                      </Text>
                    </View>
                  ) : (
                    filteredEmployees.map((employee) => (
                      <TouchableOpacity
                        key={employee.id}
                        style={[styles.employeeItem, selectedUser === employee.id && styles.employeeItemSelected]}
                        onPress={() => setSelectedUser(employee.id)}
                      >
                        <View style={styles.employeeItemContent}>
                          <View style={[styles.radioButton, selectedUser === employee.id && styles.radioButtonSelected]}>
                            {selectedUser === employee.id && <View style={styles.radioButtonInner} />}
                          </View>
                          <View style={styles.employeeInfo}>
                            <Text style={styles.employeeName}>{employee.name}</Text>
                            <View style={styles.employeeSubDetails}>
                              <Text style={styles.employeeEmail} numberOfLines={1}>{employee.email}</Text>
                              {employee.phone && <Text style={styles.employeePhone}> • {employee.phone}</Text>}
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.label}>Vai trò <Text style={styles.required}>*</Text></Text>
              <View style={styles.roleGrid}>
                {personnelRoles.map((role) => (
                  <TouchableOpacity
                    key={role.value}
                    style={[styles.roleCard, selectedRoleId === role.id && styles.roleCardSelected]}
                    onPress={() => setSelectedRoleId(role.id || null)}
                  >
                    <Ionicons
                      name={selectedRoleId === role.id ? "shield-checkmark" : "shield-outline"}
                      size={20}
                      color={selectedRoleId === role.id ? "#3B82F6" : "#6B7280"}
                    />
                    <Text style={[styles.roleCardText, selectedRoleId === role.id && styles.roleCardTextSelected]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, (!selectedUser || !selectedRoleId || submitting) && styles.saveBtnDisabled]}
              onPress={handleAddPersonnel}
              disabled={!selectedUser || !selectedRoleId || submitting}
            >
              {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Thêm</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#3B82F6", justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16 },
  personnelCard: { backgroundColor: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  personnelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  personnelInfo: { flex: 1, marginRight: 12 },
  personnelName: { fontSize: 16, fontWeight: "600", color: "#1F2937", marginBottom: 2 },
  personnelEmail: { fontSize: 13, color: "#6B7280" },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  roleText: { fontSize: 12, fontWeight: "700" },
  removeButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  removeButtonText: { fontSize: 14, color: "#EF4444", fontWeight: "600" },
  filterWrapper: { backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F3F4F6", paddingVertical: 12 },
  filterContainer: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F3F4F6", borderWidth: 1, borderColor: "#E5E7EB" },
  filterChipActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  filterChipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  filterChipTextActive: { color: "#FFFFFF" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 80 },
  emptyText: { fontSize: 16, color: "#9CA3AF", marginTop: 12 },
  modalFullContainer: { flex: 1, backgroundColor: "#F9FAFB" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, backgroundColor: "#FFF", borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  searchContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 12, margin: 16, marginBottom: 8, height: 48, borderWidth: 1, borderColor: "#E5E7EB" },
  searchInputField: { flex: 1, fontSize: 15, color: "#1F2937", marginLeft: 8 },
  modalBody: { flex: 1, padding: 16 },
  formSection: { marginBottom: 24 },
  label: { fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 12 },
  required: { color: "#EF4444" },
  employeeList: { backgroundColor: "#FFF", borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", overflow: "hidden" },
  employeeItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  employeeItemSelected: { backgroundColor: "#EFF6FF" },
  employeeItemContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  radioButton: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#D1D5DB", alignItems: "center", justifyContent: "center" },
  radioButtonSelected: { borderColor: "#3B82F6" },
  radioButtonInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#3B82F6" },
  employeeInfo: { flex: 1 },
  employeeName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  employeeSubDetails: { flexDirection: "row", alignItems: "center" },
  employeeEmail: { fontSize: 12, color: "#6B7280" },
  employeePhone: { fontSize: 12, color: "#9CA3AF" },
  loadingInModal: { padding: 20, alignItems: "center" },
  emptyEmployees: { padding: 40, alignItems: "center" },
  emptyEmployeesText: { fontSize: 14, color: "#9CA3AF", marginTop: 12, textAlign: "center" },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  roleCard: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF", borderRadius: 12, padding: 12, width: "48%", borderWidth: 1.5, borderColor: "#E5E7EB" },
  roleCardSelected: { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
  roleCardText: { fontSize: 14, fontWeight: "500", color: "#4B5563" },
  roleCardTextSelected: { color: "#3B82F6", fontWeight: "700" },
  modalFooter: { flexDirection: "row", gap: 12, padding: 16, backgroundColor: "#FFF", borderTopWidth: 1, borderTopColor: "#E5E7EB" },
  cancelBtn: { flex: 1, height: 48, alignItems: "center", justifyContent: "center" },
  cancelBtnText: { fontSize: 16, color: "#6B7280", fontWeight: "600" },
  saveBtn: { flex: 1, height: 48, backgroundColor: "#3B82F6", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 16, color: "#FFF", fontWeight: "700" },
});
