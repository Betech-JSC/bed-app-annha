import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    SafeAreaView,
    FlatList,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
    StyleSheet,
    Animated,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { Stack, useRouter } from "expo-router";
import { Swipeable } from "react-native-gesture-handler";
import { getDatabase, ref, onValue, off, set, remove } from "firebase/database";
import { app } from "@/firebaseConfig";

interface Notification {
    id: string;
    type: "chat_message" | "order_status" | "flight_status" | "new_request" | "request_accepted" | "request_declined" | "system";
    title: string;
    body: string;
    timestamp: number;
    read: boolean;
    data?: {
        chat_id?: string;
        order_id?: number;
        order_uuid?: string;
        tracking_code?: string;
        request_id?: number;
        request_uuid?: string;
        flight_id?: number;
        flight_uuid?: string;
        flight_number?: string;
        status?: string;
        [key: string]: any;
    };
}

// Helper function để format thời gian
function formatTimeAgo(timestamp: number): string {
    const now = Date.now() / 1000;
    const diff = now - timestamp;

    if (diff < 60) {
        return "Vừa xong";
    } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        return `${minutes} phút trước`;
    } else if (diff < 86400) {
        const hours = Math.floor(diff / 3600);
        return `${hours} giờ trước`;
    } else if (diff < 604800) {
        const days = Math.floor(diff / 86400);
        return `${days} ngày trước`;
    } else {
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString("vi-VN", { day: "numeric", month: "short" });
    }
}

// Helper function để lấy icon và color cho notification type
function getNotificationIcon(type: Notification["type"]): { icon: string; color: string } {
    switch (type) {
        case "chat_message":
            return { icon: "chat-bubble", color: "#8B5CF6" }; // secondary color
        case "order_status":
            return { icon: "local-shipping", color: "#2563EB" }; // primary color
        case "flight_status":
            return { icon: "flight", color: "#F97316" }; // orange
        case "new_request":
            return { icon: "inventory-2", color: "#2563EB" }; // primary color
        case "request_accepted":
            return { icon: "check-circle", color: "#16A34A" }; // green
        case "request_declined":
            return { icon: "cancel", color: "#EF4444" }; // red
        case "system":
            return { icon: "campaign", color: "#6B7280" }; // gray
        default:
            return { icon: "notifications", color: "#6B7280" };
    }
}

export default function NotificationScreen() {
    const user = useSelector((state: RootState) => state.user);
    const router = useRouter();
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
    const db = getDatabase(app);
    const listenerRef = useRef<(() => void) | null>(null);

    // Listen Firebase real-time notifications
    useEffect(() => {
        if (!user?.id) {
            setLoading(false);
            return;
        }

        const notificationsRef = ref(db, `notifications/${user.id}`);

        // Listen for changes
        const unsubscribe = onValue(
            notificationsRef,
            (snapshot) => {
                const data = snapshot.val();
                if (data) {
                    // Convert Firebase object to array
                    const notificationsList: Notification[] = Object.keys(data).map((key) => ({
                        id: key,
                        ...data[key],
                    }));

                    // Sort by timestamp (newest first)
                    notificationsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

                    setNotifications(notificationsList);
                } else {
                    setNotifications([]);
                }
                setLoading(false);
                setRefreshing(false);
            },
            (error) => {
                console.error("Error listening to notifications:", error);
                setLoading(false);
                setRefreshing(false);
            }
        );

        listenerRef.current = () => {
            off(notificationsRef);
        };

        return () => {
            if (listenerRef.current) {
                listenerRef.current();
            }
        };
    }, [user?.id, db]);

    // Filter notifications
    const filteredNotifications =
        filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

    // Navigate based on notification type
    const handleNavigate = useCallback(
        (notification: Notification) => {
            try {
                const { type, data } = notification;

                switch (type) {
                    case "chat_message":
                        if (data?.chat_id) {
                            router.push(`/chat/${data.chat_id}`);
                        }
                        break;
                    case "order_status":
                        // Navigate to order detail
                        if (data?.order_uuid) {
                            router.push({
                                pathname: '/orders_details',
                                params: { orderId: data.order_uuid }
                            });
                        } else if (data?.order_id) {
                            router.push({
                                pathname: '/orders_details',
                                params: { orderId: String(data.order_id) }
                            });
                        } else if (data?.tracking_code) {
                            // Fallback: try to find order by tracking code
                            router.push({
                                pathname: '/orders_details',
                                params: { orderId: data.tracking_code }
                            });
                        }
                        break;
                    case "flight_status":
                        // Navigate to flight detail or flight list
                        if (data?.flight_uuid) {
                            router.push({
                                pathname: '/flights/[id]',
                                params: { id: data.flight_uuid }
                            });
                        } else if (data?.flight_id) {
                            router.push({
                                pathname: '/flights/[id]',
                                params: { id: String(data.flight_id) }
                            });
                        } else {
                            // Fallback: navigate to flights list
                            router.push('/flights');
                        }
                        break;
                    case "new_request":
                    case "request_accepted":
                    case "request_declined":
                        // Navigate to request detail
                        if (data?.request_uuid) {
                            router.push({
                                pathname: '/private-requests/[id]',
                                params: { id: data.request_uuid }
                            });
                        } else if (data?.request_id) {
                            router.push({
                                pathname: '/private-requests/[id]',
                                params: { id: String(data.request_id) }
                            });
                        }
                        break;
                    case "system":
                        // System notifications don't navigate
                        break;
                }
            } catch (error) {
                console.error("Navigation error:", error);
                // Không hiển thị lỗi cho user, chỉ log
            }
        },
        [router]
    );

    // Mark notification as read
    const handleMarkAsRead = useCallback(
        async (notification: Notification) => {
            if (notification.read) return;

            // Kiểm tra user hợp lệ trước khi thực hiện
            if (!user?.id || !user?.token) {
                Alert.alert("Lỗi", "Vui lòng đăng nhập lại.");
                return;
            }

            try {
                // Optimistic update
                setNotifications((prev) =>
                    prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
                );

                // Update Firebase (source of truth - không cần sync với backend)
                const notificationRef = ref(db, `notifications/${user.id}/${notification.id}`);
                await set(notificationRef, {
                    ...notification,
                    read: true,
                });

                // Không tự động navigate khi mark as read
                // Chỉ navigate khi user thực sự click vào notification
            } catch (error) {
                console.error("Error marking notification as read:", error);
                // Revert optimistic update chỉ khi Firebase update thất bại
                setNotifications((prev) =>
                    prev.map((n) => (n.id === notification.id ? { ...n, read: false } : n))
                );
                Alert.alert("Lỗi", "Không thể đánh dấu thông báo là đã đọc.");
            }
        },
        [user?.id, user?.token, db, handleNavigate]
    );

    // Mark all as read
    const handleMarkAllAsRead = useCallback(async () => {
        if (markingAllAsRead) return;

        // Kiểm tra user hợp lệ
        if (!user?.id || !user?.token) {
            Alert.alert("Lỗi", "Vui lòng đăng nhập lại.");
            return;
        }

        const unreadNotifications = notifications.filter((n) => !n.read);
        if (unreadNotifications.length === 0) {
            Alert.alert("Thông báo", "Tất cả thông báo đã được đánh dấu đã đọc.");
            return;
        }

        try {
            setMarkingAllAsRead(true);

            // Update all in Firebase (source of truth - không cần sync với backend)
            await Promise.all(
                unreadNotifications.map((notif) => {
                    const notificationRef = ref(db, `notifications/${user.id}/${notif.id}`);
                    return set(notificationRef, { ...notif, read: true });
                })
            );

            Alert.alert("Thành công", `Đã đánh dấu ${unreadNotifications.length} thông báo là đã đọc.`);
        } catch (error) {
            console.error("Error marking all as read:", error);
            Alert.alert("Lỗi", "Không thể đánh dấu tất cả thông báo là đã đọc.");
        } finally {
            setMarkingAllAsRead(false);
        }
    }, [notifications, user?.id, user?.token, db, markingAllAsRead]);

    // Refresh
    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // The Firebase listener will automatically update
    }, []);

    // Delete notification
    const handleDeleteNotification = useCallback(
        async (notification: Notification) => {
            if (!user?.id) return;

            try {
                // Optimistic update - remove from state immediately
                setNotifications((prev) => prev.filter((n) => n.id !== notification.id));

                // Delete from Firebase
                const notificationRef = ref(db, `notifications/${user.id}/${notification.id}`);
                await remove(notificationRef);
            } catch (error) {
                console.error("Error deleting notification:", error);
                // Revert optimistic update on error
                setNotifications((prev) => [...prev, notification].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
                Alert.alert("Lỗi", "Không thể xóa thông báo.");
            }
        },
        [user?.id, db]
    );

    // Render right actions for swipe (delete button)
    const renderRightActions = useCallback(
        (notification: Notification, progress: Animated.AnimatedInterpolation<number>) => {
            const scale = progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
            });

            return (
                <View className="flex-row items-center justify-end pr-4">
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert(
                                "Xóa thông báo",
                                "Bạn có chắc chắn muốn xóa thông báo này?",
                                [
                                    { text: "Hủy", style: "cancel" },
                                    {
                                        text: "Xóa",
                                        style: "destructive",
                                        onPress: () => handleDeleteNotification(notification),
                                    },
                                ]
                            );
                        }}
                        className="bg-red-500 h-full justify-center items-center px-5 rounded-r-lg"
                        style={{ minWidth: 70 }}
                    >
                        <Animated.View style={{ transform: [{ scale }] }}>
                            <MaterialIcons name="delete" size={24} color="#fff" />
                        </Animated.View>
                    </TouchableOpacity>
                </View>
            );
        },
        [handleDeleteNotification]
    );

    // Handle notification click
    const handleNotificationPress = useCallback(
        (notification: Notification) => {
            if (!notification.read) {
                handleMarkAsRead(notification);
            } else {
                handleNavigate(notification);
            }
        },
        [handleMarkAsRead, handleNavigate]
    );

    if (loading) {
        return (
            <>
                <Stack.Screen
                    options={{
                        title: "Thông báo",
                        headerShown: true,
                    }}
                />
                <SafeAreaView style={styles.container}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#2563EB" />
                        <Text style={styles.loadingText}>Đang tải thông báo...</Text>
                    </View>
                </SafeAreaView>
            </>

        );
    }

    const hasNotifications = filteredNotifications.length > 0;

    return (
        <>
            <Stack.Screen
                options={{
                    title: "Thông báo",
                    headerShown: true,
                }}
            />
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
                {/* Top App Bar - Compact */}
                <View className="flex-row items-center justify-between px-4 pt-3 pb-2 bg-background-light/80 dark:bg-background-dark/80">
                    <Text className="flex-1 text-center text-base font-bold text-text-primary-light dark:text-text-primary-dark -ml-6">
                        Thông báo
                    </Text>
                    <TouchableOpacity
                        onPress={handleMarkAllAsRead}
                        disabled={markingAllAsRead || filteredNotifications.filter((n) => !n.read).length === 0}
                    >
                        <Text
                            className={`text-xs font-semibold ${markingAllAsRead || filteredNotifications.filter((n) => !n.read).length === 0
                                ? "text-gray-400"
                                : "text-primary"
                                }`}
                        >
                            {markingAllAsRead ? "Đang xử lý..." : "Đánh dấu đã đọc"}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Filter - Compact */}
                <View className="px-4 py-2">
                    <View className="flex-row border-b border-gray-200 dark:border-gray-700">
                        {(["Tất cả", "Chưa đọc"] as const).map((tab) => {
                            const isActive = filter === (tab === "Tất cả" ? "all" : "unread");
                            return (
                                <TouchableOpacity
                                    key={tab}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        const newFilter = tab === "Tất cả" ? "all" : "unread";
                                        if (filter !== newFilter) {
                                            setFilter(newFilter);
                                        }
                                    }}
                                    className={`flex-1 pb-2 items-center border-b-2 ${isActive
                                        ? "border-primary"
                                        : "border-transparent"
                                        }`}
                                >
                                    <Text
                                        className={`text-xs font-semibold ${isActive
                                            ? "text-primary"
                                            : "text-text-secondary-light dark:text-text-secondary-dark"
                                            }`}
                                    >
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Notification List */}
                <FlatList
                    data={hasNotifications ? filteredNotifications : []}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item: notif }) => {
                        const { icon, color } = getNotificationIcon(notif.type);
                        return (
                            <View className="px-3 mb-2">
                                <Swipeable
                                    renderRightActions={(progress) => renderRightActions(notif, progress)}
                                    overshootRight={false}
                                    friction={2}
                                >
                                    <TouchableOpacity
                                        onPress={() => handleNotificationPress(notif)}
                                        activeOpacity={0.7}
                                        className={`flex-row items-center p-3 rounded-lg ${!notif.read
                                            ? "bg-card-light dark:bg-card-dark border-l-2 border-primary"
                                            : "bg-card-light/50 dark:bg-card-dark/50"
                                            }`}
                                    >
                                        {/* Icon - Compact */}
                                        <View
                                            style={{ backgroundColor: `${color}15` }}
                                            className="w-10 h-10 rounded-full justify-center items-center mr-3"
                                        >
                                            <MaterialIcons name={icon as any} size={20} color={color} />
                                        </View>

                                        {/* Content - Compact */}
                                        <View className="flex-1 mr-2">
                                            <View className="flex-row items-center justify-between mb-0.5">
                                                <Text
                                                    className={`text-sm font-semibold flex-1 ${!notif.read
                                                        ? "text-text-primary-light dark:text-text-primary-dark"
                                                        : "text-text-primary-light/70 dark:text-text-primary-dark/70"
                                                        }`}
                                                    numberOfLines={1}
                                                >
                                                    {notif.title}
                                                </Text>
                                                {/* Unread dot - Compact */}
                                                {!notif.read && (
                                                    <View className="w-2 h-2 rounded-full bg-primary ml-2" />
                                                )}
                                            </View>
                                            <Text
                                                className={`text-xs ${!notif.read
                                                    ? "text-text-secondary-light dark:text-text-secondary-dark"
                                                    : "text-text-secondary-light/70 dark:text-text-secondary-dark/70"
                                                    }`}
                                                numberOfLines={2}
                                            >
                                                {notif.body}
                                            </Text>
                                            <Text className="text-xs text-text-secondary-light/60 dark:text-text-secondary-dark/60 mt-0.5">
                                                {formatTimeAgo(notif.timestamp)}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Swipeable>
                            </View>
                        );
                    }}
                    ListEmptyComponent={() => (
                        <View className="items-center py-12 px-4">
                            <View className="w-16 h-16 rounded-full bg-slate-200/60 dark:bg-slate-800 justify-center items-center">
                                <MaterialIcons name="notifications" size={40} color="#94A3B8" />
                            </View>
                            <Text className="mt-4 text-base font-bold text-text-primary-light dark:text-text-primary-dark">
                                {filter === "unread" ? "Không có thông báo chưa đọc" : "Chưa có thông báo nào"}
                            </Text>
                            <Text className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark text-center px-8">
                                {filter === "unread"
                                    ? "Tất cả thông báo của bạn đã được đọc."
                                    : "Tất cả thông báo của bạn sẽ được hiển thị ở đây."}
                            </Text>
                        </View>
                    )}
                    contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }}
                    ItemSeparatorComponent={() => <View style={{ height: 2 }} />}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />
            </SafeAreaView>
        </>

    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f8f8",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: "#555",
    },
});
