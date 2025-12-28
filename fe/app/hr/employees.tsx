import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { employeesApi, Employee } from "@/api/employeesApi";
import { roleApi, Role } from "@/api/roleApi";
import { ScreenHeader } from "@/components";

export default function EmployeesScreen() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Create user modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    role_ids: [] as number[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Roles
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);

  // Assign roles modal
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedUserRoles, setSelectedUserRoles] = useState<number[]>([]);
  const [savingRoles, setSavingRoles] = useState(false);

  useEffect(() => {
    loadEmployees();
    loadRoles();
  }, []);

  const loadEmployees = async (pageNum: number = 1, search: string = "") => {
    try {
      setLoading(pageNum === 1);
      const response = await employeesApi.getEmployees({
        page: pageNum,
        search: search || undefined,
        per_page: 20,
      });
      if (response.success) {
        if (pageNum === 1) {
          setEmployees(response.data || []);
        } else {
          setEmployees((prev) => [...prev, ...(response.data || [])]);
        }
        setHasMore(
          response.pagination?.current_page < response.pagination?.last_page
        );
      }
    } catch (error) {
      console.error("Error loading employees:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách nhân viên");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadEmployees(1, searchQuery);
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    setPage(1);
    loadEmployees(1, text);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadEmployees(nextPage, searchQuery);
    }
  };

  const loadRoles = async () => {
    try {
      setLoadingRoles(true);
      const response = await roleApi.getRoles();
      if (response.success) {
        setRoles(response.data || []);
      }
    } catch (error) {
      console.error("Error loading roles:", error);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleCreateUser = async () => {
    if (!createFormData.first_name || !createFormData.email || !createFormData.password) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    if (createFormData.password !== createFormData.confirm_password) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
      return;
    }

    if (createFormData.password.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    try {
      setSubmitting(true);
      const response = await employeesApi.createEmployee({
        first_name: createFormData.first_name,
        last_name: createFormData.last_name || undefined,
        email: createFormData.email,
        phone: createFormData.phone || undefined,
        password: createFormData.password,
        role_ids: createFormData.role_ids.length > 0 ? createFormData.role_ids : undefined,
      });

      if (response.success) {
        Alert.alert("Thành công", "Đã tạo tài khoản thành công");
        setShowCreateModal(false);
        setCreateFormData({
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          password: "",
          confirm_password: "",
          role_ids: [],
        });
        loadEmployees();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể tạo tài khoản");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể tạo tài khoản"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRolesModal = async (userId: number) => {
    try {
      setSelectedUserId(userId);
      setLoadingRoles(true);
      const response = await employeesApi.getUserRoles(userId);
      if (response.success) {
        setSelectedUserRoles(response.data.role_ids || []);
        setShowRolesModal(true);
      }
    } catch (error) {
      console.error("Error loading user roles:", error);
      Alert.alert("Lỗi", "Không thể tải vai trò của người dùng");
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleSaveRoles = async () => {
    if (!selectedUserId) return;

    try {
      setSavingRoles(true);
      const response = await employeesApi.syncUserRoles(selectedUserId, selectedUserRoles);

      if (response.success) {
        Alert.alert("Thành công", "Đã cập nhật vai trò thành công");
        setShowRolesModal(false);
        setSelectedUserId(null);
        setSelectedUserRoles([]);
        loadEmployees();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể cập nhật vai trò");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể cập nhật vai trò"
      );
    } finally {
      setSavingRoles(false);
    }
  };

  const toggleRole = (roleId: number) => {
    setSelectedUserRoles((prev) => {
      if (prev.includes(roleId)) {
        return prev.filter((id) => id !== roleId);
      } else {
        return [...prev, roleId];
      }
    });
  };

  const renderItem = ({ item }: { item: Employee }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={() => router.push(`/hr/employees/${item.id}`)}
      >
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={48} color="#3B82F6" />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.employeeName}>{item.name || "N/A"}</Text>
          <Text style={styles.employeeEmail}>{item.email || "N/A"}</Text>
          {item.phone && (
            <Text style={styles.employeePhone}>{item.phone}</Text>
          )}
          {item.role && (
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{item.role}</Text>
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleOpenRolesModal(item.id)}
        >
          <Ionicons name="people" size={18} color="#3B82F6" />
          <Text style={[styles.actionButtonText, { color: "#3B82F6" }]}>Vai trò</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/hr/user-permissions?id=${item.id}`)}
        >
          <Ionicons name="shield-checkmark" size={18} color="#10B981" />
          <Text style={styles.actionButtonText}>Quản lý quyền</Text>
        </TouchableOpacity>
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
      <ScreenHeader title="Nhân Viên" />
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm nhân viên..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#9CA3AF"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => handleSearch("")}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={employees}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>
              {searchQuery ? "Không tìm thấy nhân viên" : "Không có dữ liệu"}
            </Text>
          </View>
        }
      />

      {/* FAB Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create User Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo Tài Khoản Mới</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Họ *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập họ"
                  value={createFormData.first_name}
                  onChangeText={(text) =>
                    setCreateFormData({ ...createFormData, first_name: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Tên</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập tên"
                  value={createFormData.last_name}
                  onChangeText={(text) =>
                    setCreateFormData({ ...createFormData, last_name: text })
                  }
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập email"
                  value={createFormData.email}
                  onChangeText={(text) =>
                    setCreateFormData({ ...createFormData, email: text })
                  }
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Số điện thoại</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nhập số điện thoại"
                  value={createFormData.phone}
                  onChangeText={(text) =>
                    setCreateFormData({ ...createFormData, phone: text })
                  }
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mật khẩu *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Nhập mật khẩu"
                    value={createFormData.password}
                    onChangeText={(text) =>
                      setCreateFormData({ ...createFormData, password: text })
                    }
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Xác nhận mật khẩu *</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Nhập lại mật khẩu"
                    value={createFormData.confirm_password}
                    onChangeText={(text) =>
                      setCreateFormData({
                        ...createFormData,
                        confirm_password: text,
                      })
                    }
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={20}
                      color="#6B7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vai trò</Text>
                {loadingRoles ? (
                  <ActivityIndicator size="small" color="#3B82F6" />
                ) : (
                  <View style={styles.rolesContainer}>
                    {roles.map((role) => (
                      <TouchableOpacity
                        key={role.id}
                        style={[
                          styles.roleChip,
                          createFormData.role_ids.includes(role.id) &&
                          styles.roleChipActive,
                        ]}
                        onPress={() => {
                          const isSelected = createFormData.role_ids.includes(
                            role.id
                          );
                          setCreateFormData({
                            ...createFormData,
                            role_ids: isSelected
                              ? createFormData.role_ids.filter(
                                (id) => id !== role.id
                              )
                              : [...createFormData.role_ids, role.id],
                          });
                        }}
                      >
                        <Text
                          style={[
                            styles.roleChipText,
                            createFormData.role_ids.includes(role.id) &&
                            styles.roleChipTextActive,
                          ]}
                        >
                          {role.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  submitting && styles.submitButtonDisabled,
                ]}
                onPress={handleCreateUser}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Tạo tài khoản</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Assign Roles Modal */}
      <Modal
        visible={showRolesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRolesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gán Vai Trò</Text>
              <TouchableOpacity onPress={() => setShowRolesModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {loadingRoles ? (
                <ActivityIndicator size="large" color="#3B82F6" />
              ) : (
                roles.map((role) => {
                  const isSelected = selectedUserRoles.includes(role.id);
                  return (
                    <TouchableOpacity
                      key={role.id}
                      style={[
                        styles.roleItem,
                        isSelected && styles.roleItemSelected,
                      ]}
                      onPress={() => toggleRole(role.id)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxChecked,
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        )}
                      </View>
                      <View style={styles.roleItemInfo}>
                        <Text style={styles.roleItemName}>{role.name}</Text>
                        {role.description && (
                          <Text style={styles.roleItemDescription}>
                            {role.description}
                          </Text>
                        )}
                        {role.permissions_count !== undefined && (
                          <Text style={styles.roleItemCount}>
                            {role.permissions_count} quyền
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowRolesModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  savingRoles && styles.submitButtonDisabled,
                ]}
                onPress={handleSaveRoles}
                disabled={savingRoles}
              >
                {savingRoles ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Lưu</Text>
                )}
              </TouchableOpacity>
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
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  clearButton: {
    padding: 4,
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
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 14,
    color: "#10B981",
    fontWeight: "600",
  },
  avatarContainer: {
    marginRight: 12,
  },
  infoContainer: {
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
    marginBottom: 2,
  },
  employeePhone: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#3B82F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
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
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
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
    maxHeight: "90%",
    paddingBottom: 20,
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
    padding: 20,
    maxHeight: 500,
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
    backgroundColor: "#FFFFFF",
  },
  passwordInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: "#1F2937",
  },
  passwordToggle: {
    padding: 12,
  },
  rolesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  roleChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  roleChipTextActive: {
    color: "#3B82F6",
  },
  roleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  roleItemSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  roleItemInfo: {
    flex: 1,
  },
  roleItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  roleItemDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  roleItemCount: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  submitButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#3B82F6",
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
