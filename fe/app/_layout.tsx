import React from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, StyleSheet } from "react-native";
import * as Notifications from "expo-notifications";

import { store, persistor } from "@/store";
import { usePushNotifications } from "@/notifications/usePushNotifications";
import CustomTabBar from "@/components/CustomTabBar";

function AppContent() {
  usePushNotifications();

  return (
    <View style={styles.container}>
      <Stack
        screenOptions={{
          headerShown: false, // ✅ TẮT TOÀN BỘ HEADER
          animation: "slide_from_right",
        }}
      >
        {/* Auth screens */}
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />

        {/* Main App */}
        <Stack.Screen name="(tabs)" />

        {/* Other screens */}
        <Stack.Screen name="projects" />
        <Stack.Screen name="hr" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="time-tracking" />
        <Stack.Screen name="my-payroll" />
        <Stack.Screen name="my-bonuses" />
      </Stack>
      <CustomTabBar />
    </View>
  );
}

export default function Layout() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: false,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <AppContent />
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
