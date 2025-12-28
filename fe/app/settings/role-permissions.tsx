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
import { personnelRoleApi } from "@/api/personnelRoleApi";
import { Ionicons } from "@expo/vector-icons";

interface Permission {
  id: number;
  name: string;
  description?: string;
}

interface Role {
  id: number;
  name: string;
  description?: string;
}

export default function RolePermissionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const roleId = params.id as string;

  const [role, setRole] = useState<Role | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (roleId) {
      loadData();
    }
  }, [roleId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roleRes, permissionsRes, rolePermissionsRes] = await Promise.all([
        personnelRoleApi.getRole(roleId),
        personnelRoleApi.getAllPermissions(),
        personnelRoleApi.getRolePermissions(roleId),
      ]);

      if (roleRes.success) {
        setRole(roleRes.data);
      }

      if (permissionsRes.success) {
        setAllPermissions(permissionsRes.data || []);
      }

      if (rolePermissionsRes.success) {
        setSelectedPermissionIds(rolePermissionsRes.data.permissions || []);
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
    setSelectedPermissionIds((prev) => {
      if (prev.includes(permissionId)) {
        return prev.filter((id) => id !== permissionId);
      } else {
        return [...prev, permissionId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPermissionIds.length === allPermissions.length) {
      setSelectedPermissionIds([]);
    } else {
      setSelectedPermissionIds(allPermissions.map((p) => p.id));
    }
  };

  const handleSave = async () => {
    if (!roleId) return;

    try {
      setSaving(true);
      const response = await personnelRoleApi.syncRolePermissions(
        roleId,
        selectedPermissionIds
      );

      if (response.success) {
        Alert.alert("Thành công", "Đã cập nhật quyền cho vai trò");
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
  const allSelected = selectedPermissionIds.length === allPermissions.length;
  const someSelected =
    selectedPermissionIds.length > 0 &&
    selectedPermissionIds.length < allPermissions.length;

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
          {role && <Text style={styles.headerSubtitle}>{role.name}</Text>}
        </View>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng quyền:</Text>
            <Text style={styles.summaryValue}>
              {allPermissions.length} quyền
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Đã chọn:</Text>
            <Text style={styles.summaryValue}>
              {selectedPermissionIds.length} quyền
            </Text>
          </View>
        </View>

        {/* Select All */}
        <TouchableOpacity
          style={styles.selectAllButton}
          onPress={handleSelectAll}
        >
          <View style={styles.selectAllContent}>
            <View
              style={[
                styles.checkbox,
                allSelected && styles.checkboxChecked,
                someSelected && styles.checkboxPartial,
              ]}
            >
              {allSelected && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
              {someSelected && !allSelected && (
                <View style={styles.partialIndicator} />
              )}
            </View>
            <Text style={styles.selectAllText}>
              {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Permissions by Module */}
        {Object.entries(groupedPermissions).map(([module, permissions]) => (
          <View key={module} style={styles.moduleSection}>
            <View style={styles.moduleHeader}>
              <Text style={styles.moduleTitle}>{getModuleLabel(module)}</Text>
              <Text style={styles.moduleCount}>
                {permissions.filter((p) =>
                  selectedPermissionIds.includes(p.id)
                ).length}{" "}
                / {permissions.length}
              </Text>
            </View>

            {permissions.map((permission) => {
              const isSelected = selectedPermissionIds.includes(permission.id);
              return (
                <TouchableOpacity
                  key={permission.id}
                  style={[
                    styles.permissionItem,
                    isSelected && styles.permissionItemSelected,
                  ]}
                  onPress={() => togglePermission(permission.id)}
                >
                  <View style={styles.permissionContent}>
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
                    <View style={styles.permissionInfo}>
                      <Text style={styles.permissionName}>
                        {permission.name}
                      </Text>
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
        ))}
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
  moduleCount: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
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
  partialIndicator: {
    width: 12,
    height: 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 1,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
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
