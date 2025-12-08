// src/notifications/usePushNotifications.ts
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';

export function usePushNotifications() {
    useEffect(() => {
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
                    case 'chat_message':
                        if (data?.chat_id) {
                            router.push(`/chat/${data.chat_id}`);
                        }
                        break;
                    case 'order_status':
                        if (data?.order_uuid) {
                            router.push({
                                pathname: '/orders_details',
                                params: { orderId: data.order_uuid },
                            });
                        } else if (data?.order_id) {
                            router.push({
                                pathname: '/orders_details',
                                params: { orderId: String(data.order_id) },
                            });
                        }
                        break;
                    case 'flight_status':
                        if (data?.flight_uuid) {
                            router.push({
                                pathname: '/flights/[id]',
                                params: { id: data.flight_uuid },
                            });
                        } else if (data?.flight_id) {
                            router.push({
                                pathname: '/flights/[id]',
                                params: { id: String(data.flight_id) },
                            });
                        } else {
                            router.push('/flights');
                        }
                        break;
                    case 'new_request':
                    case 'request_accepted':
                    case 'request_declined':
                        if (data?.request_uuid) {
                            router.push({
                                pathname: '/private-requests/[id]',
                                params: { id: data.request_uuid },
                            });
                        } else if (data?.request_id) {
                            router.push({
                                pathname: '/private-requests/[id]',
                                params: { id: String(data.request_id) },
                            });
                        }
                        break;
                    case 'system':
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
