import React from "react";
import { Redirect } from "expo-router";
import { usePermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";
import { ActivityIndicator, View } from "react-native";

export default function TabsIndex() {
  const { hasAnyPermission, loading } = usePermissions();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // If leader/admin has dashboard permissions, land them on Overview first
  const showDashboard = hasAnyPermission([
    Permissions.PROJECT_MONITORING_VIEW,
    Permissions.COST_APPROVE_MANAGEMENT,
    Permissions.REVENUE_DASHBOARD
  ]);

  if (showDashboard) {
    return <Redirect href="/monitoring/dashboard" />;
  }

  // Otherwise default to projects tab
  return <Redirect href="/(tabs)/projects" />;
}
