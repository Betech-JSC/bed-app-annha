import React, { useEffect, useRef } from "react";
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    PanResponder,
    StyleSheet,
    Dimensions,
    Platform,
    StatusBar,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";

interface HeadsUpNotificationProps {
    notification: {
        id: string;
        type: "chat_message" | "order_status" | "flight_status" | "new_request" | "request_accepted" | "request_declined" | "system";
        title: string;
        body: string;
        timestamp: number;
        data?: {
            chat_id?: string;
            order_id?: number;
            order_uuid?: string;
            request_id?: number;
            request_uuid?: string;
            flight_id?: number;
            flight_uuid?: string;
            [key: string]: any;
        };
    };
    onDismiss: () => void;
    onPress: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HeadsUpNotification({
    notification,
    onDismiss,
    onPress,
}: HeadsUpNotificationProps) {
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const pan = useRef(new Animated.ValueXY()).current;

    // Get icon and color based on type
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case "chat_message":
                return { icon: "chat-bubble", color: "#8B5CF6" };
            case "order_status":
                return { icon: "local-shipping", color: "#2563EB" };
            case "flight_status":
                return { icon: "flight", color: "#F97316" };
            case "new_request":
                return { icon: "inventory-2", color: "#2563EB" };
            case "request_accepted":
                return { icon: "check-circle", color: "#16A34A" };
            case "request_declined":
                return { icon: "cancel", color: "#EF4444" };
            case "system":
                return { icon: "campaign", color: "#6B7280" };
            default:
                return { icon: "notifications", color: "#6B7280" };
        }
    };

    const { icon, color } = getNotificationIcon(notification.type);

    // Show animation
    useEffect(() => {
        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto dismiss after 5 seconds
        const timer = setTimeout(() => {
            handleDismiss();
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    // Pan responder for swipe to dismiss
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return Math.abs(gestureState.dy) > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy < 0) {
                    // Only allow swipe up
                    pan.setValue({ x: 0, y: gestureState.dy });
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy < -50 || gestureState.vy < -0.5) {
                    // Swipe up enough to dismiss
                    handleDismiss();
                } else {
                    // Spring back
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss();
        });
    };

    const handlePress = () => {
        handleDismiss();
        onPress();
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [
                        { translateY: Animated.add(translateY, pan.y) },
                    ],
                    opacity,
                },
            ]}
            {...panResponder.panHandlers}
        >
            <TouchableOpacity
                onPress={handlePress}
                activeOpacity={0.9}
                style={styles.content}
            >
                <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
                    <MaterialIcons name={icon as any} size={20} color={color} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title} numberOfLines={1}>
                        {notification.title}
                    </Text>
                    <Text style={styles.body} numberOfLines={2}>
                        {notification.body}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={handleDismiss}
                    style={styles.closeButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialIcons name="close" size={18} color="#6B7280" />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
}

const STATUS_BAR_HEIGHT = Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 0;

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        top: STATUS_BAR_HEIGHT,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingHorizontal: 12,
        paddingTop: 8,
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
        borderLeftWidth: 3,
        borderLeftColor: "#2563EB",
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontSize: 13,
        fontWeight: "600",
        color: "#1F2937",
        marginBottom: 2,
    },
    body: {
        fontSize: 12,
        color: "#6B7280",
        lineHeight: 16,
    },
    closeButton: {
        padding: 4,
    },
});

