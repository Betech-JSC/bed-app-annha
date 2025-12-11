import React from "react";
import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { store, persistor } from "@/store"; // import persistor
import { PersistGate } from "redux-persist/integration/react";
import { usePushNotifications } from "@/notifications/usePushNotifications";
import { useHeadsUpNotification } from "@/hooks/useHeadsUpNotification";
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from "react-native";

function AppContent() {
  const { notification, isVisible, onDismiss, onPress } = useHeadsUpNotification();

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: true, // Hide header for tabs, show for nested screens
          animation: 'slide_from_right',
        }}
      >
        {/* Auth screens - no tabs */}
        <Stack.Screen
          name="login"
          options={{
            headerShown: true,
            presentation: "fullScreenModal",
          }}
        />
        <Stack.Screen
          name="register"
          options={{
            headerShown: true,
            presentation: "fullScreenModal",
          }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{
            headerShown: true,
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="reset-password"
          options={{
            headerShown: true,
            presentation: "modal",
          }}
        />

        {/* Tabs layout - main app */}
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: true,
          }}
        />

        {/* Nested screens - projects and hr modules */}
        <Stack.Screen
          name="projects"
          options={{
            headerShown: true,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="hr"
          options={{
            headerShown: true,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: true,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="time-tracking"
          options={{
            headerShown: true,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="my-payroll"
          options={{
            headerShown: true,
            title: "Bảng Lương Của Tôi",
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="my-bonuses"
          options={{
            headerShown: true,
            title: "Thưởng Của Tôi",
            presentation: "card",
          }}
        />
      </Stack>
    </>
  );
}

export default function Layout() {
  // Configure notification handler
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const isAppInForeground = notification.request.trigger?.type !== 'push';

      return {
        shouldShowAlert: false,   // Không hiển thị alert mặc định, dùng heads-up thay thế khi foreground
        shouldPlaySound: true,     // Phát âm thanh cho cả foreground và background
        shouldSetBadge: true,     // Cập nhật badge số
      };
    },
  });

  usePushNotifications();

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
