import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/reducers/index";
import { Platform } from "react-native";
import { useEffect, useState } from "react";
import { permissionApi } from "@/api/permissionApi";

export default function TabsLayout() {
  const user = useSelector((state: RootState) => state.user);
  const [hasManagementAccess, setHasManagementAccess] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkManagementAccess = async () => {
      if (!user?.token) {
        setChecking(false);
        return;
      }

      try {
        // Check if user has financial_view or financial_approve permission
        // or if user is owner/admin
        if (user.owner === true && user.role === "admin") {
          setHasManagementAccess(true);
        } else {
          const permissionsResponse = await permissionApi.getMyPermissions();
          const permissions: string[] = permissionsResponse.success
            ? permissionsResponse.data || []
            : [];

          // Check for management-related permissions
          const hasFinancialPermission =
            permissions.some((p) =>
              p.includes("financial") || p.includes("management")
            ) ||
            permissions.some((p) => p === "view" && user.role === "admin");

          // Also check if user has role "Ban điều hành" or "management"
          setHasManagementAccess(hasFinancialPermission || user.owner === true);
        }
      } catch (error) {
        console.error("Error checking management access:", error);
        // Default to false on error
        setHasManagementAccess(false);
      } finally {
        setChecking(false);
      }
    };

    checkManagementAccess();
  }, [user?.token, user?.role, user?.owner]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#3B82F6",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 0,
          height: Platform.OS === "ios" ? 85 : 70,
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
          paddingTop: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="projects"
        options={{
          title: "Dự Án",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "folder" : "folder-outline"}
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="hr"
        options={{
          title: "Nhân Sự",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "people" : "people-outline"}
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Cấu Hình",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={focused ? 26 : 24}
              color={color}
            />
          ),
        }}
      />
      {!checking && hasManagementAccess && (
        <Tabs.Screen
          name="reports"
          options={{
            title: "Báo Cáo",
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons
                name={focused ? "bar-chart" : "bar-chart-outline"}
                size={focused ? 26 : 24}
                color={color}
              />
            ),
          }}
        />
      )}
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Ẩn tab index khỏi bottom navigation
        }}
      />
      {!checking && !hasManagementAccess && (
        <Tabs.Screen
          name="reports"
          options={{
            href: null, // Ẩn tab reports nếu không có quyền
          }}
        />
      )}
    </Tabs>
  );
}
