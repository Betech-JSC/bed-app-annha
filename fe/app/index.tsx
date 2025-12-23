import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { permissionApi } from "@/api/permissionApi";

/**
 * Xác định đường dẫn redirect dựa trên permissions và role của user
 */
function determineRedirectPath(user: any, permissions: string[]): string {
  const userRole = user?.role?.toLowerCase();
  const isOwner = user?.owner === true;

  // Super Admin (owner = true) có toàn quyền, mặc định vào projects
  if (isOwner && userRole === "admin") {
    return "/projects";
  }

  // Kiểm tra permissions để quyết định module
  const hasHRPermissions = permissions.some((perm) =>
    perm.startsWith("hr.")
  );
  const hasProjectPermissions = permissions.some((perm) =>
    perm.startsWith("projects.")
  );

  // Nếu có quyền HR và không có quyền projects -> vào HR
  if (hasHRPermissions && !hasProjectPermissions) {
    return "/hr";
  }

  // Nếu có quyền projects (hoặc cả hai) -> vào Projects
  if (hasProjectPermissions) {
    return "/projects";
  }

  // Nếu có quyền HR -> vào HR
  if (hasHRPermissions) {
    return "/hr";
  }

  // Mặc định vào projects
  return "/projects";
}

export default function IndexScreen() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAndRedirect = async () => {
      // Check if user is logged in
      if (user?.token) {
        try {
          // Get user permissions to determine redirect
          const permissionsResponse = await permissionApi.getMyPermissions();
          const permissions: string[] = permissionsResponse.success
            ? permissionsResponse.data || []
            : [];

          // Redirect to tabs layout (main app)
          router.replace("/(tabs)");
        } catch (error: any) {
          console.error("Error getting permissions:", error);

          // If 401, token is invalid/expired - redirect to login
          if (error.response?.status === 401) {
            router.replace("/login");
            return;
          }

          // Fallback to role-based redirect if permissions API fails for other reasons
          const userRole = user?.role?.toLowerCase();
          const isOwner = user?.owner === true;

          // Redirect to tabs layout
          router.replace("/(tabs)/projects");
        }
      } else {
        // User is not logged in, redirect to login
        router.replace("/login");
      }
      setChecking(false);
    };

    checkAndRedirect();
  }, [user?.token, user?.role, user?.owner]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3B82F6" />
      <Text style={styles.loadingText}>Đang tải...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6B7280",
  },
});
