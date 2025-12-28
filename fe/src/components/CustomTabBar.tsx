import React from "react";
import { View, TouchableOpacity, Text, StyleSheet, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { RootState } from "@/reducers/index";

const tabs = [
  {
    name: "Dự Án",
    route: "/(tabs)/projects",
    icon: "folder-outline",
    iconFocused: "folder",
  },
  {
    name: "Nhân Sự",
    route: "/(tabs)/hr",
    icon: "people-outline",
    iconFocused: "people",
  },
  {
    name: "Báo Cáo",
    route: "/(tabs)/reports",
    icon: "bar-chart-outline",
    iconFocused: "bar-chart",
  },
  {
    name: "Cấu Hình",
    route: "/(tabs)/settings",
    icon: "settings-outline",
    iconFocused: "settings",
  },
];

export default function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = useSelector((state: RootState) => state.user);
  const insets = useSafeAreaInsets();

  // Ẩn tab bar ở các màn hình auth
  const hideTabBarRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ];

  if (!user || hideTabBarRoutes.some((route) => pathname?.startsWith(route))) {
    return null;
  }

  const isActive = (route: string) => {
    if (route === "/(tabs)/projects") {
      return pathname?.startsWith("/projects") || pathname === "/(tabs)/projects";
    }
    if (route === "/(tabs)/hr") {
      return pathname?.startsWith("/hr") || pathname === "/(tabs)/hr";
    }
    if (route === "/(tabs)/reports") {
      return pathname?.startsWith("/(tabs)/reports") || pathname === "/(tabs)/reports";
    }
    if (route === "/(tabs)/settings") {
      return pathname?.startsWith("/settings") || pathname === "/(tabs)/settings";
    }
    return pathname === route;
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {tabs.map((tab) => {
        const active = isActive(tab.route);
        return (
          <TouchableOpacity
            key={tab.route}
            style={styles.tab}
            onPress={() => router.push(tab.route as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={active ? (tab.iconFocused as any) : (tab.icon as any)}
              size={active ? 26 : 24}
              color={active ? "#3B82F6" : "#9CA3AF"}
            />
            <Text
              style={[
                styles.label,
                active && styles.labelActive,
              ]}
            >
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    minHeight: Platform.OS === "ios" ? 60 : 60,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    color: "#9CA3AF",
  },
  labelActive: {
    color: "#3B82F6",
  },
});

