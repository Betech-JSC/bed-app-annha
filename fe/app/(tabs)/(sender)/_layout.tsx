// app/(sender)/_layout.tsx
import { Tabs } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { View, Text } from "react-native";
import { useUnreadChatCount } from "@/hooks/useUnreadChatCount";

function ChatIconWithBadge({ color }: { color: string }) {
    const unreadCount = useUnreadChatCount();

    return (
        <View style={{ position: "relative" }}>
            <MaterialIcons name="chat" size={28} color={color} />
            {unreadCount > 0 && (
                <View
                    style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        backgroundColor: "#EF4444",
                        borderRadius: 10,
                        minWidth: 20,
                        height: 20,
                        paddingHorizontal: 6,
                        justifyContent: "center",
                        alignItems: "center",
                        borderWidth: 2,
                        borderColor: "#FFFFFF",
                    }}
                >
                    <Text
                        style={{
                            color: "#FFFFFF",
                            fontSize: 11,
                            fontWeight: "bold",
                        }}
                    >
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                </View>
            )}
        </View>
    );
}

export default function SenderLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: "#2563EB",
                tabBarInactiveTintColor: "#6B7280",
                tabBarStyle: { height: 70, paddingBottom: 20, paddingTop: 8 },
            }}
        >
            <Tabs.Screen name="home" options={{ title: "Trang chủ", tabBarIcon: ({ color }) => <MaterialIcons name="home" size={28} color={color} /> }} />
            <Tabs.Screen name="list_orders" options={{ title: "Đơn hàng", tabBarIcon: ({ color }) => <MaterialIcons name="work" size={28} color={color} /> }} />
            <Tabs.Screen name="wallet" options={{
                href: null, // Ẩn tab khỏi tab bar
            }} />
            <Tabs.Screen name="profile" options={{ title: "Tài khoản", tabBarIcon: ({ color }) => <MaterialIcons name="person" size={28} color={color} /> }} />
            <Tabs.Screen name="chat" options={{ title: "Chat", tabBarIcon: ({ color }) => <ChatIconWithBadge color={color} /> }} />
        </Tabs>
    );
}