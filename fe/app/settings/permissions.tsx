import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { permissionApi, Permission, CreatePermissionData } from "@/api/permissionApi";
import { personnelRoleApi } from "@/api/personnelRoleApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { usePermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";

export default function PermissionsScreen() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const [myPermissions, setMyPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "roles" | "manage">("my");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [formData, setFormData] = useState<CreatePermissionData>({
    name: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [permissionsResponse, rolesResponse, allPermissionsResponse] = await Promise.all([
        permissionApi.getMyPermissions(),
        personnelRoleApi.getRolesWithUsage(),
        hasPermission(Permissions.SETTINGS_MANAGE) ? permissionApi.getAllPermissions() : Promise.resolve({ success: false }),
      ]);

      if (permissionsResponse.success) {
        setMyPermissions(permissionsResponse.data || []);
      }

      if (rolesResponse.success) {
        setRoles(rolesResponse.data || []);
      }

      if (allPermissionsResponse.success) {
        setAllPermissions(allPermissionsResponse.data || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const groupPermissionsByModule = (permissions: string[]) => {
    const grouped: Record<string, string[]> = {};

    permissions.forEach((perm) => {
      const parts = perm.split(".");
      const module = parts[0] || "other";
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(perm);
    });

    return grouped;
  };

  const getModuleLabel = (module: string) => {
    const labels: Record<string, string> = {
      projects: "Quản Lý Dự Án",
      contracts: "Hợp Đồng",
      payments: "Thanh Toán",
      costs: "Chi Phí",
      additional_costs: "Chi Phí Phát Sinh",
      revenue: "Doanh Thu",
      personnel: "Nhân Sự",
      hr: "Quản Lý Nhân Sự",
      documents: "Tài Liệu",
      defects: "Lỗi",
      acceptance: "Nghiệm Thu",
      logs: "Nhật Ký",
      permissions: "Phân Quyền",
      project: "Quản Lý Dự Án",
      settings: "Cài Đặt",
    };
    return labels[module] || module;
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên quyền");
      return;
    }

    try {
      setSubmitting(true);
      const response = await permissionApi.createPermission(formData);
      if (response.success) {
        Alert.alert("Thành công", "Đã tạo quyền mới");
        setShowCreateModal(false);
        resetForm();
        loadData();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể tạo quyền");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể tạo quyền"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingPermission || !formData.name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên quyền");
      return;
    }

    try {
      setSubmitting(true);
      const response = await permissionApi.updatePermission(editingPermission.id, formData);
      if (response.success) {
        Alert.alert("Thành công", "Đã cập nhật quyền");
        setEditingPermission(null);
        resetForm();
        loadData();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể cập nhật quyền");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể cập nhật quyền"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (permission: Permission) => {
    Alert.alert(
      "Xác nhận",
      `Bạn có chắc chắn muốn xóa quyền "${permission.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await permissionApi.deletePermission(permission.id);
              if (response.success) {
                Alert.alert("Thành công", "Đã xóa quyền");
                loadData();
              } else {
                Alert.alert("Lỗi", response.message || "Không thể xóa quyền");
              }
            } catch (error: any) {
              Alert.alert(
                "Lỗi",
                error.response?.data?.message || "Không thể xóa quyền"
              );
            }
          },
        },
      ]
    );
  };

  const openEditModal = (permission: Permission) => {
    setEditingPermission(permission);
    setFormData({
      name: permission.name,
      description: permission.description || "",
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
    });
    setEditingPermission(null);
  };

  const groupPermissionObjectsByModule = (permissions: Permission[]) => {
    const grouped: Record<string, Permission[]> = {};

    permissions.forEach((perm) => {
      const parts = perm.name.split(".");
      const module = parts[0] || "other";
      if (!grouped[module]) {
        grouped[module] = [];
      }
      grouped[module].push(perm);
    });

    return grouped;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const groupedPermissions = groupPermissionsByModule(myPermissions);

  return (
    <View style={styles.container}>
      <ScreenHeader title="Phân Quyền Hệ Thống" showBackButton />

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "my" && styles.tabActive]}
          onPress={() => setActiveTab("my")}
        >
          <Text
            style={[styles.tabText, activeTab === "my" && styles.tabTextActive]}
          >
            Quyền Của Tôi
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "roles" && styles.tabActive]}
          onPress={() => setActiveTab("roles")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "roles" && styles.tabTextActive,
            ]}
          >
            Vai Trò & Quyền
          </Text>
        </TouchableOpacity>
        {hasPermission(Permissions.SETTINGS_MANAGE) && (
          <TouchableOpacity
            style={[styles.tab, activeTab === "manage" && styles.tabActive]}
            onPress={() => setActiveTab("manage")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "manage" && styles.tabTextActive,
              ]}
            >
              Quản Lý Quyền
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "my" && (
          <View>
            {myPermissions.includes("*") ? (
              <View style={styles.fullAccessCard}>
                <Ionicons name="shield-checkmark" size={48} color="#10B981" />
                <Text style={styles.fullAccessTitle}>Toàn Quyền</Text>
                <Text style={styles.fullAccessText}>
                  Bạn có toàn quyền truy cập tất cả các tính năng trong hệ
                  thống
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Tổng Quan</Text>
                  <Text style={styles.summaryValue}>
                    {myPermissions.length} quyền
                  </Text>
                </View>

                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <View key={module} style={styles.moduleCard}>
                    <View style={styles.moduleHeader}>
                      <Text style={styles.moduleTitle}>
                        {getModuleLabel(module)}
                      </Text>
                      <Text style={styles.moduleCount}>{perms.length}</Text>
                    </View>
                    <View style={styles.permissionsList}>
                      {perms.map((perm, index) => (
                        <View key={index} style={styles.permissionItem}>
                          <Ionicons
                            name="checkmark-circle"
                            size={16}
                            color="#10B981"
                          />
                          <Text style={styles.permissionText}>{perm}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        )}

        {activeTab === "roles" && (
          <View>
            {roles.map((role) => (
              <View key={role.id} style={styles.roleCard}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleName}>{role.name}</Text>
                  {role.users_count !== undefined && (
                    <Text style={styles.roleCount}>
                      {role.users_count} người
                    </Text>
                  )}
                </View>
                {role.description && (
                  <Text style={styles.roleDescription}>{role.description}</Text>
                )}
                <TouchableOpacity
                  style={styles.viewDetailsButton}
                  onPress={() =>
                    router.push(`/hr/personnel-roles` as any)
                  }
                >
                  <Text style={styles.viewDetailsText}>Xem chi tiết</Text>
                  <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {activeTab === "manage" && hasPermission(Permissions.SETTINGS_MANAGE) && (
          <View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Tổng Quan</Text>
              <Text style={styles.summaryValue}>
                {allPermissions.length} quyền
              </Text>
            </View>

            {Object.entries(groupPermissionObjectsByModule(allPermissions)).map(([module, perms]) => (
              <View key={module} style={styles.moduleCard}>
                <View style={styles.moduleHeader}>
                  <Text style={styles.moduleTitle}>
                    {getModuleLabel(module)}
                  </Text>
                  <Text style={styles.moduleCount}>{perms.length}</Text>
                </View>
                <View style={styles.permissionsList}>
                  {perms.map((perm) => (
                    <View key={perm.id} style={styles.permissionItemManage}>
                      <View style={styles.permissionInfoManage}>
                        <Text style={styles.permissionNameManage}>
                          {perm.name}
                        </Text>
                        {perm.description && (
                          <Text style={styles.permissionDescriptionManage}>
                            {perm.description}
                          </Text>
                        )}
                      </View>
                      <View style={styles.permissionActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => openEditModal(perm)}
                        >
                          <Ionicons name="pencil" size={18} color="#3B82F6" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDelete(perm)}
                        >
                          <Ionicons name="trash" size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                resetForm();
                setShowCreateModal(true);
              }}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Thêm Quyền Mới</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal
        visible={showCreateModal || editingPermission !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowCreateModal(false);
          setEditingPermission(null);
          resetForm();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingPermission ? "Chỉnh Sửa Quyền" : "Tạo Quyền Mới"}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setShowCreateModal(false);
                setEditingPermission(null);
                resetForm();
              }}
            >
              <Ionicons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>
                Tên quyền <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="VD: project.view, cost.create"
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
                placeholder="Nhập mô tả quyền (tùy chọn)"
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
                  setEditingPermission(null);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={editingPermission ? handleUpdate : handleCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingPermission ? "Cập nhật" : "Tạo"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  },
  placeholder: {
    width: 32,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#3B82F6",
  },
  tabText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#3B82F6",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  fullAccessCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  fullAccessTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#10B981",
    marginTop: 16,
    marginBottom: 8,
  },
  fullAccessText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#3B82F6",
  },
  moduleCard: {
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
  moduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  moduleCount: {
    fontSize: 14,
    color: "#6B7280",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permissionsList: {
    gap: 8,
  },
  permissionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  permissionText: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
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
    alignItems: "center",
    marginBottom: 8,
  },
  roleName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  roleCount: {
    fontSize: 12,
    color: "#6B7280",
  },
  roleDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 14,
    color: "#3B82F6",
    fontWeight: "600",
  },
  permissionItemManage: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
  },
  permissionInfoManage: {
    flex: 1,
  },
  permissionNameManage: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  permissionDescriptionManage: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  permissionActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  addButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 32,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
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
