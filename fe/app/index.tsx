import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";

export default function IndexScreen() {
  const router = useRouter();
  const user = useSelector((state: RootState) => state.user);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAndRedirect = async () => {
      // Check if user is logged in
      if (user?.token) {
        // Permissions sẽ được load tự động bởi usePermissions hook
        // Không cần gọi API ở đây nữa
        // Redirect to tabs layout (main app)
        router.replace("/(tabs)");
      } else {
        // User is not logged in, redirect to login
        router.replace("/login");
      }
      setChecking(false);
    };

    checkAndRedirect();
  }, [user?.token]);

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
