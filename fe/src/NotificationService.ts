import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import Constants from "expo-constants";

const DEFAULT_CHANNEL_ID = "default";
const DEFAULT_SOUND = "noti.wav";

export class NotificationService {
    static async setup() {
        if (Platform.OS === "android") {
            await Notifications.setNotificationChannelAsync(DEFAULT_CHANNEL_ID, {
                name: "Default Channel",
                importance: Notifications.AndroidImportance.HIGH,
                sound: DEFAULT_SOUND,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: "#FF231F7C",
            });
        }

        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
            console.warn("Permission for notifications not granted!");
        }

        // Bật hiển thị notification khi app ở foreground
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
            }),
        });

    }

    static async sendLocalNotification({
        title,
        body,
        attachments,
    }: {
        title: string;
        body: string;
        attachments?: { url: string }[];
    }) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: DEFAULT_SOUND,
                attachments,
                priority: Notifications.AndroidNotificationPriority.HIGH,
            },
            trigger: null, // gửi ngay lập tức
        });
    }

    static async getExpoPushToken() {
        try {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status !== 'granted') return null;

            // Lấy projectId từ app config (cần thiết cho Expo SDK 54+)
            const projectId = Constants.expoConfig?.extra?.eas?.projectId;

            const tokenData = await Notifications.getExpoPushTokenAsync(
                projectId ? { projectId } : undefined
            );
            return tokenData.data;
        } catch (error) {
            console.error('Error getting expo push token:', error);
            return null;
        }
    }
}

