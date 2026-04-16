import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { NotificationService } from '@/NotificationService';
import { userApi } from '@/api/userApi';

export function usePushNotifications() {
    const userId = useSelector((state: RootState) => state.user.id);
    const token = useSelector((state: RootState) => state.user.token);

    useEffect(() => {
        if (userId && token) {
            const registerToken = async () => {
                const expoPushToken = await NotificationService.getExpoPushToken();
                if (expoPushToken) {
                    try {
                        await userApi.savePushToken(Number(userId), expoPushToken);
                        console.log('Push token registered successfully');
                    } catch (error) {
                        console.error('Failed to register push token:', error);
                    }
                }
            };
            registerToken();
        }
    }, [userId, token]);

    useEffect(() => {
        // 1️⃣ App đang foreground - Expo tự show native banner (shouldShowAlert: true trong NotificationService.setup())
        // Khi user tap banner, addNotificationResponseReceivedListener sẽ handle navigation
        const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received in foreground:', notification.request.content);
            // Native banner tự hiển thị - không cần làm gì thêm
            // Unread/approval count sẽ được cập nhật qua polling
        });

        // 2️⃣ App background / killed → user tap notification
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;

            console.log('Notification tapped:', data);

            // Navigate dựa trên action_url (ưu tiên) hoặc data
            try {
                const actionUrl = data?.action_url;

                if (actionUrl && typeof actionUrl === 'string') {
                    router.push(actionUrl as any);
                    return;
                }

                // Fallback: navigate dựa trên data
                if (data?.project_id) {
                    router.push(`/projects/${data.project_id}`);
                } else {
                    // Default: mở notifications screen
                    router.push('/notifications');
                }
            } catch (error) {
                console.error('Navigation error from notification:', error);
                try {
                    router.push('/notifications');
                } catch (e) {
                    // Silent fail - app is in unknown state
                }
            }
        });

        return () => {
            foregroundSubscription.remove();
            responseSubscription.remove();
        };
    }, []);
}

