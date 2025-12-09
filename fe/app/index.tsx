import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/reducers/index";

export default function IndexScreen() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);

  useEffect(() => {
    // Check if user is logged in
    if (user?.token) {
      // User is logged in, redirect based on role
      const userRole = user?.role?.toLowerCase();
      if (userRole === "admin") {
        // Super Admin hoặc Admin -> vào HR module
        router.replace("/hr");
      } else {
        // User thường -> vào projects
        router.replace("/projects");
      }
    } else {
      // User is not logged in, redirect to login
      router.replace("/login");
    }
  }, [user?.token, user?.role]);

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
