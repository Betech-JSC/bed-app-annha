// src/notifications/registerPushToken.ts
import * as Notifications from "expo-notifications";
import api from "@/api/api";

/**
 * Đăng ký push token cho user
 * @param userId - ID người dùng hiện tại
 */
export async function registerPushToken(userId: string) {
    try {
        // Lấy token từ Expo
        const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({
            projectId: '363ab25f-f7bc-4a57-869d-c054d3e254f7',
        });


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
