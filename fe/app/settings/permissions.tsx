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
import { roleApi } from "@/api/roleApi";
import { Ionicons } from "@expo/vector-icons";
import { ScreenHeader } from "@/components";
import { usePermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";
import { getModuleLabel as getTranslatedModuleLabel, getPermissionDetail } from "@/utils/permissionTranslation";

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
        roleApi.getRolesWithUsage(),
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
    return getTranslatedModuleLabel(module);
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

  const getModuleIcon = (module: string): any => {
    const icons: Record<string, string> = {
      project: "folder-open",
      progress: "trending-up",
      acceptance: "checkmark-done",
      cost: "wallet",
      additional_cost: "add-circle",
      revenue: "analytics",
      hr: "people",
      material: "cube",
      equipment: "construct",
      report: "document-text",
      invoice: "receipt",
      input_invoice: "download",
      contract: "document-attach",
      payment: "card",
      subcontractor: "business",
      subcontractor_payment: "cash",
      document: "file-tray-full",
      log: "calendar",
      defect: "warning",
      personnel: "people-circle",
      budgets: "calculator",
      receipts: "receipt-outline",
      suppliers: "storefront",
      change_request: "git-merge",
      issue: "bug",
      settings: "settings",
    };
    return icons[module] || "options";
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
          <View style={{ paddingBottom: 40 }}>
            {myPermissions.includes("*") ? (
              <View style={styles.fullAccessCard}>
                <View style={styles.fullAccessIconContainer}>
                  <Ionicons name="shield-checkmark" size={60} color="#10B981" />
                </View>
                <Text style={styles.fullAccessTitle}>Toàn Quyền Hệ Thống</Text>
                <Text style={styles.fullAccessText}>
                  Bạn đang có quyền cao nhất (Super Admin). Bạn có thể truy cập, sửa đổi và quản lý tất cả dữ liệu trong hệ thống mà không có bất kỳ hạn chế nào.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryInfo}>
                    <Text style={styles.summaryTitle}>Quyền Hạn Của Bạn</Text>
                    <Text style={styles.summaryValue}>
                      {myPermissions.length} <Text style={styles.summaryValueLabel}>quyền được cấp</Text>
                    </Text>
                  </View>
                  <View style={styles.summaryIconContainer}>
                    <Ionicons name="key" size={32} color="#FFFFFF" />
                  </View>
                </View>

                {Object.entries(groupedPermissions).sort().map(([module, perms]) => (
                  <View key={module} style={styles.moduleCard}>
                    <View style={styles.moduleHeader}>
                      <View style={styles.moduleHeaderLeft}>
                        <View style={styles.moduleIconBox}>
                          <Ionicons name={getModuleIcon(module)} size={20} color="#3B82F6" />
                        </View>
                        <Text style={styles.moduleTitle}>
                          {getModuleLabel(module)}
                        </Text>
                      </View>
                      <View style={styles.moduleBadge}>
                        <Text style={styles.moduleBadgeText}>{perms.length}</Text>
                      </View>
                    </View>
                    <View style={styles.permissionsList}>
                      {perms.map((perm, index) => {
                        const detail = getPermissionDetail(perm);
                        return (
                          <View key={index} style={[
                            styles.permissionItem,
                            index === perms.length - 1 && { borderBottomWidth: 0 }
                          ]}>
                            <View style={styles.checkIconContainer}>
                              <Ionicons
                                name="checkmark-circle"
                                size={18}
                                color="#10B981"
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.permissionText}>{detail.label}</Text>
                              <Text style={styles.permissionDescText}>
                                {detail.description || `Cho phép thực hiện hành động ${perm}`}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
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
                  onPress={() => {
                    // Navigate to role details if needed
                    // router.push(`/settings/roles/${role.id}` as any)
                  }}
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

            {Object.entries(groupPermissionObjectsByModule(allPermissions)).sort().map(([module, perms]) => (
              <View key={module} style={styles.moduleCard}>
                <View style={styles.moduleHeader}>
                  <View style={styles.moduleHeaderLeft}>
                    <View style={styles.moduleIconBox}>
                      <Ionicons name={getModuleIcon(module)} size={20} color="#3B82F6" />
                    </View>
                    <Text style={styles.moduleTitle}>
                      {getModuleLabel(module)}
                    </Text>
                  </View>
                  <View style={styles.moduleBadge}>
                    <Text style={styles.moduleBadgeText}>{perms.length}</Text>
                  </View>
                </View>
                <View style={styles.permissionsList}>
                  {perms.map((perm) => (
                    <View key={perm.id} style={styles.permissionItemManage}>
                      <View style={styles.permissionInfoManage}>
                        <Text style={styles.permissionNameManage}>
                          {getPermissionDetail(perm.name).label}
                        </Text>
                        <Text style={styles.permissionCodeManage}>
                          Code: {perm.name}
                        </Text>
                        {(perm.description || getPermissionDetail(perm.name).description) && (
                          <Text style={styles.permissionDescriptionManage}>
                            {perm.description || getPermissionDetail(perm.name).description}
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
        presentationStyle="fullScreen"
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
          <ScreenHeader
            title={editingPermission ? "Chỉnh Sửa Quyền" : "Tạo Quyền Mới"}
            rightComponent={
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setEditingPermission(null);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            }
          />

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
    backgroundColor: "#F3F4F6",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#3B82F6",
  },
  tabText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#3B82F6",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  fullAccessCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 30,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 10,
  },
  fullAccessIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  fullAccessTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#065F46",
    marginBottom: 12,
  },
  fullAccessText: {
    fontSize: 15,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 22,
  },
  summaryCard: {
    backgroundColor: "#3B82F6",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  summaryValueLabel: {
    fontSize: 16,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.9)",
  },
  summaryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  moduleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  moduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  moduleHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  moduleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  moduleBadge: {
    backgroundColor: "#3B82F6",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  moduleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  permissionsList: {
    paddingHorizontal: 16,
  },
  permissionItem: {
    flexDirection: "row",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 12,
  },
  checkIconContainer: {
    marginTop: 2,
  },
  permissionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  permissionDescText: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  roleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
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
    fontWeight: "700",
    color: "#1F2937",
  },
  roleCount: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
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
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
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
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    marginBottom: 10,
  },
  permissionInfoManage: {
    flex: 1,
  },
  permissionNameManage: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  permissionCodeManage: {
    fontSize: 11,
    color: "#9CA3AF",
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 6,
  },
  permissionDescriptionManage: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  permissionActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  addButton: {
    backgroundColor: "#1F2937",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
    marginBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
  },
  modalContent: {
    padding: 24,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 10,
  },
  required: {
    color: "#EF4444",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: "#1F2937",
  },
  textArea: {
    height: 120,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    gap: 16,
    marginTop: 16,
    marginBottom: 40,
  },
  modalButton: {
    flex: 1,
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B5563",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
