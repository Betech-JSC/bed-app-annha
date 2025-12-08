import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

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

        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: false,   // không hiển thị khi app foreground
                shouldPlaySound: false,   // không phát âm thanh khi foreground
                shouldSetBadge: false,
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

    // Hàm gửi notification qua Expo
    static async sendPushNotification(
        expoPushToken: string, 
        title: string, 
        body: string, 
        data?: Record<string, any>
    ) {
        if (!expoPushToken) return;

        try {
            const response = await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Accept-encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    to: expoPushToken,
                    sound: "default",
                    title,
                    body,
                    data: data || {},
                }),
            });

            if (!response.ok) {
                console.error("Failed to send push notification:", await response.text());
            }
        } catch (error) {
            console.error("Error sending push notification:", error);
        }
    }
}
