import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { personnelRoleApi, PersonnelRole } from "@/api/personnelRoleApi";
import { Ionicons } from "@expo/vector-icons";

export default function PersonnelRolesScreen() {
  const router = useRouter();
  const [roles, setRoles] = useState<PersonnelRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<PersonnelRole | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await personnelRoleApi.getRolesWithUsage();
      if (response.success) {
        setRoles(response.data);
      }
    } catch (error) {
      console.error("Error loading roles:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách vai trò");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRoles();
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên vai trò");
      return;
    }

    try {
      const response = await personnelRoleApi.createRole(formData);
      if (response.success) {
        Alert.alert("Thành công", "Đã tạo vai trò mới");
        setShowCreateModal(false);
        resetForm();
        loadRoles();
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể tạo vai trò"
      );
    }
  };

  const handleUpdate = async () => {
    if (!editingRole || !formData.name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên vai trò");
      return;
    }

    try {
      const response = await personnelRoleApi.updateRole(
        editingRole.id,
        formData
      );
      if (response.success) {
        Alert.alert("Thành công", "Đã cập nhật vai trò");
        setEditingRole(null);
        resetForm();
        loadRoles();
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể cập nhật vai trò"
      );
    }
  };

  const handleDelete = async (role: PersonnelRole) => {
    Alert.alert(
      "Xác nhận",
      `Bạn có chắc chắn muốn xóa vai trò "${role.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await personnelRoleApi.deleteRole(role.id);
              if (response.success) {
                Alert.alert("Thành công", "Đã xóa vai trò");
                loadRoles();
              }
            } catch (error: any) {
              Alert.alert(
                "Lỗi",
                error.response?.data?.message || "Không thể xóa vai trò"
              );
            }
          },
        },
      ]
    );
  };

  const openEditModal = (role: PersonnelRole) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
    });
    setEditingRole(null);
  };

  const renderRoleItem = (role: PersonnelRole) => (
    <View style={styles.roleCard}>
      <View style={styles.roleHeader}>
        <View style={styles.roleInfo}>
          <Text style={styles.roleName}>{role.name}</Text>
          {role.description && (
            <Text style={styles.roleDescription}>{role.description}</Text>
          )}
        </View>
        <View style={styles.roleActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/settings/role-permissions?id=${role.id}`)}
          >
            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openEditModal(role)}
          >
            <Ionicons name="pencil" size={20} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(role)}
          >
            <Ionicons name="trash" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
      {role.users_count !== undefined && (
        <View style={styles.usageInfo}>
          <Ionicons name="people" size={16} color="#6B7280" />
          <Text style={styles.usageText}>
            Đang được sử dụng bởi {role.users_count} nhân sự
          </Text>
        </View>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cấu Hình Vai Trò</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowCreateModal(true);
          }}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#3B82F6" />
          <Text style={styles.infoText}>
            Quản lý các vai trò trong hệ thống. Gán vai trò để kiểm soát quyền
            truy cập của nhân sự.
          </Text>
        </View>

        {roles.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>Chưa có vai trò nào</Text>
          </View>
        ) : (
          roles.map((role) => (
            <View key={role.id}>{renderRoleItem(role)}</View>
          ))
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal || editingRole !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCreateModal(false);
          setEditingRole(null);
          resetForm();
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingRole ? "Chỉnh Sửa Vai Trò" : "Tạo Vai Trò Mới"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                setEditingRole(null);
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Tên vai trò <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Nhập tên vai trò"
                value={formData.name}
                onChangeText={(text) =>
                  setFormData({ ...formData, name: text })
                }
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Mô tả</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Nhập mô tả vai trò (tùy chọn)"
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
                  setEditingRole(null);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={editingRole ? handleUpdate : handleCreate}
              >
                <Text style={styles.saveButtonText}>
                  {editingRole ? "Cập nhật" : "Tạo"}
                </Text>
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
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1E40AF",
    lineHeight: 20,
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
  roleCard: {
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
  roleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  roleActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  usageInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  usageText: {
    fontSize: 12,
    color: "#6B7280",
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
  required: {
    color: "#EF4444",
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
