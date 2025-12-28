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
} from "react-native";
import { useRouter } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "@/reducers/index";
import { permissionApi } from "@/api/permissionApi";
import { personnelRoleApi } from "@/api/personnelRoleApi";
import { userApi } from "@/api/userApi";
import { Ionicons } from "@expo/vector-icons";
import LogoutButton from "@/components/LogoutButton";
import { usePermissions } from "@/hooks/usePermissions";
import { setUser } from "@/reducers/userSlice";
import { ScreenHeader } from "@/components";

export default function SettingsScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.user);
  const { permissions, loading: permissionsLoading } = usePermissions();
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await personnelRoleApi.getRolesWithUsage();
      if (response.success) {
        setRoles(response.data || []);
      }
    } catch (error) {
      console.error("Error loading roles:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRoles();
  };

  const hasPermission = (permission: string): boolean => {
    // Admin và owner luôn có toàn quyền
    if (user?.owner || user?.role === "admin") return true;
    if (permissions.includes("*")) return true;
    return permissions.includes(permission);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await userApi.deleteAccount();
      if (response.success) {
        // Clear user data from Redux
        dispatch(setUser(null));
        // Redirect to login
        router.replace("/login");
        Alert.alert("Thành công", "Tài khoản đã được xóa thành công.");
      } else {
        Alert.alert("Lỗi", response.message || "Không thể xóa tài khoản");
        setShowDeleteModal(false);
      }
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.response?.data?.message || "Không thể xóa tài khoản. Vui lòng thử lại."
      );
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const menuItems = [
    {
      title: "Nhóm Chi Phí Dự Án",
      icon: "folder-outline",
      route: "/settings/cost-groups",
      permission: "settings.manage",
      description: "Quản lý các nhóm chi phí áp dụng cho toàn bộ dự án",
    },
    {
      title: "Nhà Cung Cấp (NCC)",
      icon: "storefront-outline",
      route: "/settings/suppliers",
      permission: "suppliers.view",
      description: "Quản lý danh sách nhà cung cấp, hợp đồng và công nợ",
    },
    {
      title: "Nhà Thầu Phụ",
      icon: "business-outline",
      route: "/settings/subcontractors",
      permission: "settings.manage",
      description: "Quản lý danh sách nhà thầu phụ tập trung",
    },
    {
      title: "Phòng Ban",
      icon: "business-outline",
      route: "/settings/departments",
      permission: "departments.view",
      description: "Quản lý phòng ban và tổ chức",
    },
    {
      title: "Vật Liệu",
      icon: "cube-outline",
      route: "/materials",
      permission: "materials.view",
      description: "Quản lý vật liệu và tồn kho",
    },
    {
      title: "Thiết Bị",
      icon: "construct-outline",
      route: "/equipment",
      permission: "equipment.view",
      description: "Quản lý thiết bị và bảo trì",
    },
    {
      title: "Bộ Tài Liệu Nghiệm Thu",
      icon: "document-text-outline",
      route: "/settings/acceptance-templates",
      permission: "settings.manage",
      description: "Quản lý các bộ tài liệu nghiệm thu (tên công việc, mô tả, tiêu chuẩn, hình ảnh mẫu)",
    },
    {
      title: "Cấu Hình Vai Trò",
      icon: "people-circle-outline",
      route: "/settings/roles",
      permission: "hr.roles.view",
      description: "Quản lý các vai trò và phân quyền trong hệ thống",
    },
    {
      title: "Phân Quyền Hệ Thống",
      icon: "shield-checkmark-outline",
      route: "/settings/permissions",
      permission: "permissions.view",
      description: "Xem và quản lý permissions của các roles",
    },
    {
      title: "Thông Tin Tài Khoản",
      icon: "person-outline",
      route: "/settings/profile",
      permission: null, // Always accessible
      description: "Xem và chỉnh sửa thông tin tài khoản",
    },
  ];

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Cấu Hình" />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      {/* User Info Card */}
      <View style={styles.userCard}>
        <View style={styles.userAvatar}>
          <Ionicons name="person" size={32} color="#3B82F6" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
          <Text style={styles.userEmail}>{user?.email || ""}</Text>
          <View style={styles.userBadges}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {user?.role?.toUpperCase() || "USER"}
              </Text>
            </View>
            {user?.owner && (
              <View style={[styles.badge, styles.superAdminBadge]}>
                <Text style={styles.superAdminBadgeText}>SUPER ADMIN</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Permissions Summary */}
      {permissions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quyền Truy Cập</Text>
          <View style={styles.permissionsCard}>
            <Text style={styles.permissionsCount}>
              {permissions.includes("*")
                ? "Toàn quyền"
                : `${permissions.length} quyền`}
            </Text>
            <Text style={styles.permissionsDescription}>
              {permissions.includes("*")
                ? "Bạn có toàn quyền truy cập tất cả các tính năng"
                : "Số lượng permissions bạn có trong hệ thống"}
            </Text>
          </View>
        </View>
      )}

      {/* Menu Items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cấu Hình</Text>
        {menuItems.map((item, index) => {
          // Admin và owner luôn thấy tất cả menu items
          // Kiểm tra cả owner flag và role admin
          const isAdminOrOwner =
            (user && (user as any).owner === true) ||
            (user && (user as any).role === "admin");

          // Check permission if required (skip check for admin/owner)
          if (item.permission && !isAdminOrOwner && !hasPermission(item.permission)) {
            return null;
          }

          return (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
            >
              <View
                style={[
                  styles.menuIconContainer,
                  { backgroundColor: "#3B82F6" + "20" },
                ]}
              >
                <Ionicons
                  name={item.icon as any}
                  size={24}
                  color="#3B82F6"
                />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuDescription}>{item.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Roles Summary */}
      {roles.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vai Trò Trong Hệ Thống</Text>
          <View style={styles.rolesContainer}>
            {roles.slice(0, 5).map((role, index) => (
              <View key={role.id} style={styles.roleChip}>
                <Text style={styles.roleChipText}>{role.name}</Text>
                {role.users_count > 0 && (
                  <Text style={styles.roleChipCount}>
                    {role.users_count} người
                  </Text>
                )}
              </View>
            ))}
            {roles.length > 5 && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push("/hr/personnel-roles" as any)}
              >
                <Text style={styles.viewAllText}>
                  Xem tất cả ({roles.length})
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Delete Account */}
      <View style={styles.section}>
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => setShowDeleteModal(true)}
        >
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={styles.deleteAccountText}>Xóa Tài Khoản</Text>
        </TouchableOpacity>
      </View>

      {/* Logout */}
      <View style={styles.section}>
        <LogoutButton variant="button" />
      </View>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={48} color="#EF4444" />
              <Text style={styles.modalTitle}>Xóa Tài Khoản</Text>
              <Text style={styles.modalDescription}>
                Bạn có chắc chắn muốn xóa tài khoản của mình? Hành động này không thể hoàn tác.
                Tất cả dữ liệu của bạn sẽ bị xóa vĩnh viễn.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton]}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteButtonText}>Xóa Tài Khoản</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  userCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    margin: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
  },
  userBadges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },
  superAdminBadge: {
    backgroundColor: "#FEF3C7",
  },
  superAdminBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#D97706",
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 12,
  },
  permissionsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  permissionsCount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#3B82F6",
    marginBottom: 4,
  },
  permissionsDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
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
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 12,
    color: "#6B7280",
  },
  rolesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  roleChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  roleChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
  },
  roleChipCount: {
    fontSize: 12,
    color: "#6B7280",
  },
  viewAllButton: {
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: "center",
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3B82F6",
  },
  deleteAccountButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    gap: 8,
  },
  deleteAccountText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  deleteButton: {
    backgroundColor: "#EF4444",
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
