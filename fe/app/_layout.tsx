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
          headerShown: true,
          headerStyle: {
            backgroundColor: '#FFFFFF',
          },
          headerTintColor: '#1F2937',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerBackTitleVisible: false,
          headerShadowVisible: true,
          animation: 'slide_from_right',
        }}
      />
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
