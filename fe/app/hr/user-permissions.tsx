import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { userPermissionApi, Permission } from "@/api/userPermissionApi";
import { Ionicons } from "@expo/vector-icons";

export default function UserPermissionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const userId = params.id as string;

  const [user, setUser] = useState<any>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [directPermissionIds, setDirectPermissionIds] = useState<number[]>([]);
  const [rolePermissionIds, setRolePermissionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userId) {
      loadData();
    }
  }, [userId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userPermissionsRes, allPermissionsRes] = await Promise.all([
        userPermissionApi.getUserPermissions(userId),
        userPermissionApi.getAllPermissions(),
      ]);

      if (userPermissionsRes.success) {
        setUser(userPermissionsRes.data.user);
        setDirectPermissionIds(userPermissionsRes.data.direct_permission_ids || []);
        setRolePermissionIds(userPermissionsRes.data.role_permission_ids || []);
      }

      if (allPermissionsRes.success) {
        setAllPermissions(allPermissionsRes.data || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const togglePermission = (permissionId: number) => {
    setDirectPermissionIds((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((id) => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleSelectAll = () => {
    const availablePermissions = allPermissions.filter(
      (p) => !rolePermissionIds.includes(p.id)
    );
    if (
      directPermissionIds.length === availablePermissions.length &&
      availablePermissions.every((p) => directPermissionIds.includes(p.id))
    ) {
      setDirectPermissionIds([]);
    } else {
      setDirectPermissionIds(availablePermissions.map((p) => p.id));
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    try {
      setSaving(true);
      const response = await userPermissionApi.syncUserPermissions(
        userId,
        directPermissionIds
      );

      if (response.success) {
        Alert.alert("Thành công", "Đã cập nhật quyền cho tài khoản");
        router.back();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể cập nhật quyền");
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể cập nhật quyền"
      );
    } finally {
      setSaving(false);
    }
  };

  const groupPermissionsByModule = (permissions: Permission[]) => {
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
    };
    return labels[module] || module;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  const groupedPermissions = groupPermissionsByModule(allPermissions);
  const availablePermissions = allPermissions.filter(
    (p) => !rolePermissionIds.includes(p.id)
  );
  const allDirectSelected =
    availablePermissions.length > 0 &&
    availablePermissions.every((p) => directPermissionIds.includes(p.id));
  const someDirectSelected =
    directPermissionIds.length > 0 &&
    !allDirectSelected;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Quản Lý Quyền</Text>
          {user && (
            <Text style={styles.headerSubtitle}>
              {user.name} ({user.email})
            </Text>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#3B82F6" />
          <Text style={styles.infoText}>
            Quyền từ vai trò (màu xám) không thể chỉnh sửa. Chỉ có thể thêm/bỏ
            quyền trực tiếp cho tài khoản này.
          </Text>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Từ vai trò:</Text>
            <Text style={styles.summaryValue}>
              {rolePermissionIds.length} quyền
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trực tiếp:</Text>
            <Text style={styles.summaryValue}>
              {directPermissionIds.length} quyền
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng cộng:</Text>
            <Text style={styles.summaryValue}>
              {new Set([...rolePermissionIds, ...directPermissionIds]).size}{" "}
              quyền
            </Text>
          </View>
        </View>

        {/* Select All (only for available permissions) */}
        {availablePermissions.length > 0 && (
          <TouchableOpacity
            style={styles.selectAllButton}
            onPress={handleSelectAll}
          >
            <View style={styles.selectAllContent}>
              <View
                style={[
                  styles.checkbox,
                  allDirectSelected && styles.checkboxChecked,
                  someDirectSelected && styles.checkboxPartial,
                ]}
              >
                {allDirectSelected && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
                {someDirectSelected && !allDirectSelected && (
                  <View style={styles.partialIndicator} />
                )}
              </View>
              <Text style={styles.selectAllText}>
                {allDirectSelected
                  ? "Bỏ chọn tất cả quyền trực tiếp"
                  : "Chọn tất cả quyền trực tiếp"}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Permissions by Module */}
        {Object.entries(groupedPermissions).map(([module, permissions]) => {
          const moduleDirectCount = permissions.filter(
            (p) => directPermissionIds.includes(p.id)
          ).length;
          const moduleRoleCount = permissions.filter((p) =>
            rolePermissionIds.includes(p.id)
          ).length;

          return (
            <View key={module} style={styles.moduleSection}>
              <View style={styles.moduleHeader}>
                <Text style={styles.moduleTitle}>{getModuleLabel(module)}</Text>
                <View style={styles.moduleCountContainer}>
                  {moduleRoleCount > 0 && (
                    <View style={styles.countBadge}>
                      <Text style={styles.countBadgeText}>
                        {moduleRoleCount} từ vai trò
                      </Text>
                    </View>
                  )}
                  {moduleDirectCount > 0 && (
                    <View style={[styles.countBadge, styles.countBadgeDirect]}>
                      <Text
                        style={[
                          styles.countBadgeText,
                          styles.countBadgeTextDirect,
                        ]}
                      >
                        {moduleDirectCount} trực tiếp
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {permissions.map((permission) => {
                const isFromRole = rolePermissionIds.includes(permission.id);
                const isDirectSelected = directPermissionIds.includes(
                  permission.id
                );
                const isAvailable = !isFromRole;

                return (
                  <TouchableOpacity
                    key={permission.id}
                    style={[
                      styles.permissionItem,
                      isDirectSelected && styles.permissionItemSelected,
                      isFromRole && styles.permissionItemFromRole,
                    ]}
                    onPress={() => {
                      if (isAvailable) {
                        togglePermission(permission.id);
                      }
                    }}
                    disabled={!isAvailable}
                  >
                    <View style={styles.permissionContent}>
                      {isFromRole ? (
                        <View style={styles.checkboxDisabled}>
                          <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.checkbox,
                            isDirectSelected && styles.checkboxChecked,
                          ]}
                        >
                          {isDirectSelected && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </View>
                      )}
                      <View style={styles.permissionInfo}>
                        <View style={styles.permissionNameRow}>
                          <Text style={styles.permissionName}>
                            {permission.name}
                          </Text>
                          {isFromRole && (
                            <View style={styles.roleBadge}>
                              <Text style={styles.roleBadgeText}>Từ vai trò</Text>
                            </View>
                          )}
                        </View>
                        {permission.description && (
                          <Text style={styles.permissionDescription}>
                            {permission.description}
                          </Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Lưu Quyền</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  placeholder: {
    width: 32,
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
    fontSize: 13,
    color: "#1E40AF",
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3B82F6",
  },
  selectAllButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectAllContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectAllText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  moduleSection: {
    marginBottom: 24,
  },
  moduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#E5E7EB",
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  moduleCountContainer: {
    flexDirection: "row",
    gap: 8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  countBadgeDirect: {
    backgroundColor: "#EFF6FF",
  },
  countBadgeText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  countBadgeTextDirect: {
    color: "#3B82F6",
  },
  permissionItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  permissionItemSelected: {
    borderColor: "#3B82F6",
    backgroundColor: "#EFF6FF",
  },
  permissionItemFromRole: {
    backgroundColor: "#F9FAFB",
    opacity: 0.8,
  },
  permissionContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  checkboxPartial: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  checkboxDisabled: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  partialIndicator: {
    width: 12,
    height: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 1,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  permissionName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
  },
  roleBadgeText: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
  },
  permissionDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
