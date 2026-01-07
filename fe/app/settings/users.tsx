import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { adminUserApi, SystemUser, CreateSystemUserData } from "@/api/adminUserApi";
import { roleApi, Role } from "@/api/roleApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { useTabBarHeight } from "@/hooks/useTabBarHeight";
import { usePermissions } from "@/hooks/usePermissions";

export default function SystemUsersScreen() {
  const router = useRouter();
  const tabBarHeight = useTabBarHeight();
  const { hasPermission } = usePermissions();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateSystemUserData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    role_ids: [],
  });

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await adminUserApi.getUsers({
        search: searchQuery || undefined,
        per_page: 50,
      });
      if (response.success) {
        setUsers(response.data || []);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải danh sách tài khoản");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await roleApi.getRoles();
      if (response.success) {
        setRoles(response.data || []);
      }
    } catch (error) {
      console.error("Error loading roles:", error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };

  const handleOpenCreateModal = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      password: "",
      role_ids: [],
    });
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (user: SystemUser) => {
    setSelectedUser(user);
    setFormData({
      first_name: user.name.split(" ")[0] || "",
      last_name: user.name.split(" ").slice(1).join(" ") || "",
      email: user.email,
      phone: user.phone || "",
      password: "",
      role_ids: user.roles?.map((r) => r.id) || [],
    });
    setShowEditModal(true);
  };

  const handleOpenRolesModal = async (user: SystemUser) => {
    setSelectedUser(user);
    try {
      const response = await adminUserApi.getUserRoles(user.id);
      if (response.success) {
        setSelectedRoleIds(response.data.role_ids || []);
        setShowRolesModal(true);
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tải vai trò");
    }
  };

  const handleCreateUser = async () => {
    if (!formData.first_name || !formData.email || !formData.password) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }

    try {
      setSubmitting(true);
      const response = await adminUserApi.createUser(formData);
      if (response.success) {
        Alert.alert("Thành công", "Đã tạo tài khoản thành công");
        setShowCreateModal(false);
        loadUsers();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể tạo tài khoản");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser || !formData.first_name || !formData.email) {
      Alert.alert("Lỗi", "Vui lòng điền đầy đủ thông tin bắt buộc");
      return;
    }

    try {
      setSubmitting(true);
      const updateData: any = {
        name: `${formData.first_name} ${formData.last_name}`.trim(),
        email: formData.email,
        phone: formData.phone || undefined,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      const response = await adminUserApi.updateUser(selectedUser.id, updateData);
      if (response.success) {
        Alert.alert("Thành công", "Đã cập nhật tài khoản thành công");
        setShowEditModal(false);
        loadUsers();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể cập nhật tài khoản");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncRoles = async () => {
    if (!selectedUser) return;

    try {
      setSubmitting(true);
      const response = await adminUserApi.syncUserRoles(selectedUser.id, selectedRoleIds);
      if (response.success) {
        Alert.alert("Thành công", "Đã cập nhật vai trò thành công");
        setShowRolesModal(false);
        loadUsers();
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.response?.data?.message || "Không thể cập nhật vai trò");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBanUser = (user: SystemUser) => {
    Alert.alert(
      "Xác nhận",
      `Bạn có chắc chắn muốn khóa tài khoản "${user.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Khóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await adminUserApi.banUser(user.id);
              if (response.success) {
                Alert.alert("Thành công", "Đã khóa tài khoản");
                loadUsers();
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể khóa tài khoản");
            }
          },
        },
      ]
    );
  };

  const handleUnbanUser = (user: SystemUser) => {
    Alert.alert(
      "Xác nhận",
      `Bạn có chắc chắn muốn mở khóa tài khoản "${user.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Mở khóa",
          onPress: async () => {
            try {
              const response = await adminUserApi.unbanUser(user.id);
              if (response.success) {
                Alert.alert("Thành công", "Đã mở khóa tài khoản");
                loadUsers();
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.response?.data?.message || "Không thể mở khóa tài khoản");
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: SystemUser }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#3B82F6" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardSubtitle}>{item.email}</Text>
            {item.phone && <Text style={styles.cardMeta}>{item.phone}</Text>}
          </View>
        </View>
        {item.is_banned && (
          <View style={styles.bannedBadge}>
            <Text style={styles.bannedText}>Đã khóa</Text>
          </View>
        )}
      </View>

      {item.roles && item.roles.length > 0 && (
        <View style={styles.rolesContainer}>
          {item.roles.map((role) => (
            <View key={role.id} style={styles.roleBadge}>
              <Text style={styles.roleText}>{role.name}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleOpenRolesModal(item)}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color="#3B82F6" />
          <Text style={styles.actionText}>Phân quyền</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleOpenEditModal(item)}
        >
          <Ionicons name="create-outline" size={18} color="#6B7280" />
          <Text style={styles.actionText}>Sửa</Text>
        </TouchableOpacity>
        {item.is_banned ? (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleUnbanUser(item)}
          >
            <Ionicons name="lock-open-outline" size={18} color="#10B981" />
            <Text style={[styles.actionText, { color: "#10B981" }]}>Mở khóa</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleBanUser(item)}
          >
            <Ionicons name="lock-closed-outline" size={18} color="#EF4444" />
            <Text style={[styles.actionText, { color: "#EF4444" }]}>Khóa</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
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
      <ScreenHeader
        title="Tài Khoản Hệ Thống"
        showBackButton
        rightComponent={
          <TouchableOpacity onPress={handleOpenCreateModal} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#3B82F6" />
          </TouchableOpacity>
        }
      />

      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight }]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>Chưa có tài khoản nào</Text>
          </View>
        }
      />

      {/* Create User Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tạo Tài Khoản</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Họ *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập họ"
                value={formData.first_name}
                onChangeText={(text) => setFormData({ ...formData, first_name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tên</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập tên"
                value={formData.last_name}
                onChangeText={(text) => setFormData({ ...formData, last_name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập email"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Số điện thoại</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập số điện thoại"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mật khẩu *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Vai trò (tùy chọn)</Text>
              <Text style={styles.helperText}>
                Có thể phân quyền sau khi tạo tài khoản
              </Text>
              {roles.map((role) => (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.checkboxItem,
                    formData.role_ids?.includes(role.id) && styles.checkboxItemActive,
                  ]}
                  onPress={() => {
                    const currentIds = formData.role_ids || [];
                    const newIds = currentIds.includes(role.id)
                      ? currentIds.filter((id) => id !== role.id)
                      : [...currentIds, role.id];
                    setFormData({ ...formData, role_ids: newIds });
                  }}
                >
                  <Ionicons
                    name={formData.role_ids?.includes(role.id) ? "checkbox" : "square-outline"}
                    size={24}
                    color={formData.role_ids?.includes(role.id) ? "#3B82F6" : "#9CA3AF"}
                  />
                  <View style={styles.checkboxInfo}>
                    <Text style={styles.checkboxText}>{role.name}</Text>
                    {role.description && (
                      <Text style={styles.checkboxDescription}>{role.description}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, submitting && styles.saveButtonDisabled]}
                onPress={handleCreateUser}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Tạo</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Sửa Tài Khoản</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Họ *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập họ"
                value={formData.first_name}
                onChangeText={(text) => setFormData({ ...formData, first_name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tên</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập tên"
                value={formData.last_name}
                onChangeText={(text) => setFormData({ ...formData, last_name: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập email"
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Số điện thoại</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập số điện thoại"
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mật khẩu mới (để trống nếu không đổi)</Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập mật khẩu mới"
                value={formData.password}
                onChangeText={(text) => setFormData({ ...formData, password: text })}
                secureTextEntry
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, submitting && styles.saveButtonDisabled]}
                onPress={handleUpdateUser}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Lưu</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Roles Modal */}
      <Modal
        visible={showRolesModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRolesModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRolesModal(false)}>
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Phân Quyền: {selectedUser?.name}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalBody}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.checkboxItem,
                  selectedRoleIds.includes(role.id) && styles.checkboxItemActive,
                ]}
                onPress={() => {
                  const newIds = selectedRoleIds.includes(role.id)
                    ? selectedRoleIds.filter((id) => id !== role.id)
                    : [...selectedRoleIds, role.id];
                  setSelectedRoleIds(newIds);
                }}
              >
                <Ionicons
                  name={selectedRoleIds.includes(role.id) ? "checkbox" : "square-outline"}
                  size={24}
                  color={selectedRoleIds.includes(role.id) ? "#3B82F6" : "#9CA3AF"}
                />
                <View style={styles.checkboxInfo}>
                  <Text style={styles.checkboxText}>{role.name}</Text>
                  {role.description && (
                    <Text style={styles.checkboxDescription}>{role.description}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRolesModal(false)}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, submitting && styles.saveButtonDisabled]}
                onPress={handleSyncRoles}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>Lưu</Text>
                )}
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
  },
  listContent: {
    padding: 16,
  },
  card: {
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
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  cardMeta: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  bannedBadge: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bannedText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "500",
  },
  rolesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "500",
  },
  cardActions: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#F9FAFB",
  },
  actionText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#9CA3AF",
    marginTop: 16,
  },
  addButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  checkboxItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  checkboxItemActive: {
    backgroundColor: "#EFF6FF",
  },
  checkboxInfo: {
    marginLeft: 12,
    flex: 1,
  },
  checkboxText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
  },
  checkboxDescription: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 2,
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
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});




