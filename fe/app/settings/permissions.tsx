import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { permissionApi } from "@/api/permissionApi";
import { personnelRoleApi } from "@/api/personnelRoleApi";
import { Ionicons } from "@expo/vector-icons";

export default function PermissionsScreen() {
  const router = useRouter();
  const [myPermissions, setMyPermissions] = useState<string[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"my" | "roles">("my");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [permissionsResponse, rolesResponse] = await Promise.all([
        permissionApi.getMyPermissions(),
        personnelRoleApi.getRolesWithUsage(),
      ]);

      if (permissionsResponse.success) {
        setMyPermissions(permissionsResponse.data || []);
      }

      if (rolesResponse.success) {
        setRoles(rolesResponse.data || []);
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
    };
    return labels[module] || module;
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
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phân Quyền Hệ Thống</Text>
        <View style={styles.placeholder} />
      </View>

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
      </ScrollView>
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
});
