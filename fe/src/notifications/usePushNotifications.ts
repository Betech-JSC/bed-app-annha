import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
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
        // ... (existing listeners code)
        // 1️⃣ App đang foreground - không hiển thị alert, để heads-up notification xử lý
        const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
            // Heads-up notification sẽ xử lý việc hiển thị
            console.log('Notification received in foreground:', notification.request.content);
        });

        // 2️⃣ App background / killed → user tap notification
        const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
            const data = response.notification.request.content.data;
            const { type } = data || {};

            console.log('Notification tapped from background/killed state:', data);

            // Navigate based on notification type
            try {
                switch (type) {
                    case 'project_cost':
                        if (data?.project_id && data?.cost_id) {
                            router.push(`/projects/${data.project_id}/costs/${data.cost_id}`);
                        } else if (data?.project_id) {
                            router.push(`/projects/${data.project_id}/costs`);
                        }
                        break;
                    case 'project_invoice':
                        if (data?.project_id && data?.invoice_id) {
                            router.push(`/projects/${data.project_id}/invoices/${data.invoice_id}`);
                        } else if (data?.project_id) {
                            router.push(`/projects/${data.project_id}/invoices`);
                        }
                        break;
                    case 'project_comment':
                        if (data?.project_id) {
                            router.push(`/projects/${data.project_id}/comments`);
                        }
                        break;
                    case 'project_update':
                    case 'assignment':
                        if (data?.project_id) {
                            router.push(`/projects/${data.project_id}`);
                        }
                        break;
                    case 'chat_message':
                        if (data?.chat_id) {
                            router.push(`/chat/${data.chat_id}`);
                        }
                        break;
                    case 'system':
                    default:
                        router.push('/notifications');
                        break;
                }
            } catch (error) {
                console.error('Navigation error from notification:', error);
            }
        });

        return () => {
            foregroundSubscription.remove();
            responseSubscription.remove();
        };
    }, []);
}
