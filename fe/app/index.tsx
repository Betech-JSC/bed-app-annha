// app/index.tsx - Entry point with auth check
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import '../global.css';

export default function Index() {
  const router = useRouter();
  const user = useSelector((state: any) => state.user);

  useEffect(() => {
    // Check if user is logged in
    if (user?.token && user?.role) {
      // Redirect to appropriate home based on role
      if (user.role === "sender") {
        router.replace("/(tabs)/(sender)/home");
      } else if (user.role === "customer") {
        router.replace("/(tabs)/(customer)/home_customer");
      }
    } else {
      // Not logged in, go to welcome screen
      router.replace("/welcome");
    }
  }, [user, router]);

  // Show loading while checking auth
  return (
    <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
      <ActivityIndicator size="large" color="#2563EB" />
    </View>
  );
}