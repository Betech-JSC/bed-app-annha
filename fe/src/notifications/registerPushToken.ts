// src/notifications/registerPushToken.ts
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import api from "@/api/api";

/**
 * Đăng ký push token cho user
 * @param userId - ID người dùng hiện tại
 */
export async function registerPushToken(userId: string) {
    try {
        // Lấy projectId từ app config (cần thiết cho Expo SDK 54+)
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;

        // Lấy token từ Expo
        const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync(
            projectId ? { projectId } : undefined
        );


        if (!expoPushToken) return null;

        // Gửi token lên backend để lưu
        await api.post("/users/save-token", {
            user_id: userId,
            token: expoPushToken,
        });

        return expoPushToken;
    } catch (err) {
        console.error("Failed to register push token", err);
        return null;
    }
}
