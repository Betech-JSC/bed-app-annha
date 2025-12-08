// useChatNotifications.ts
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

export function useChatNotifications() {
    useEffect(() => {
        const subscription = Notifications.addNotificationReceivedListener(notification => {
            console.log("Received notification:", notification);
        });

        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            console.log("Notification tapped:", response);
        });

        return () => {
            subscription.remove();
            responseSubscription.remove();
        };
    }, []);
}
