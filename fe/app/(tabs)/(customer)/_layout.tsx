// app/(customer)/_layout.tsx
import { Tabs, router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { TouchableOpacity, View, Text } from 'react-native';
import { useUnreadChatCount } from '@/hooks/useUnreadChatCount';

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

export default function CustomerLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#2563EB',
                tabBarInactiveTintColor: '#6B7280',
                tabBarStyle: {
                    height: 70,
                    paddingBottom: 20,
                    paddingTop: 8,
                    // Quan trọng: tạo khoảng trống giữa cho FAB
                    paddingHorizontal: 20,
                },
                tabBarItemStyle: {
                    // Giúp các icon đều nhau, không bị lệch do FAB
                },
            }}
        >
            {/* Tab 1 */}
            <Tabs.Screen
                name="home_customer"
                options={{
                    tabBarLabel: ({ focused }) => (
                        <Text className={`text-xs ${focused ? 'font-bold text-primary' : 'text-gray-500'}`}>
                            Trang chủ
                        </Text>
                    ),
                    tabBarIcon: ({ focused }) => (
                        <MaterialIcons name="home" size={28} color={focused ? '#2563EB' : '#6B7280'} />
                    ),
                }}
            />

            {/* Tab 2 */}
            <Tabs.Screen
                name="flight-history-customer"
                options={{
                    tabBarLabel: ({ focused }) => (
                        <Text className={`text-xs ${focused ? 'font-bold text-primary' : 'text-gray-500'}`}>
                            Chuyến bay
                        </Text>
                    ),
                    tabBarIcon: ({ focused }) => (
                        <MaterialIcons name="flight" size={28} color={focused ? '#2563EB' : '#6B7280'} />
                    ),
                }}
            />

            {/* Tab 3 - Orders */}
            <Tabs.Screen
                name="list_orders_customer"
                options={{
                    tabBarLabel: ({ focused }) => (
                        <Text className={`text-xs ${focused ? 'font-bold text-primary' : 'text-gray-500'}`}>
                            Đơn hàng
                        </Text>
                    ),
                    tabBarIcon: ({ focused }) => (
                        <MaterialIcons name="inventory" size={28} color={focused ? '#2563EB' : '#6B7280'} />
                    ),
                }}
            />

            <Tabs.Screen
                name="chat"
                options={{
                    title: "Chat",
                    tabBarIcon: ({ color }) => <ChatIconWithBadge color={color} />
                }}
            />

            {/* Tab 4 - Wallet đã bị ẩn */}
            <Tabs.Screen
                name="wallet"
                options={{
                    href: null, // Ẩn tab khỏi tab bar
                }}
            />

            {/* Tab 5 */}
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarLabel: ({ focused }) => (
                        <Text className={`text-xs ${focused ? 'font-bold text-primary' : 'text-gray-500'}`}>
                            Tài khoản
                        </Text>
                    ),
                    tabBarIcon: ({ focused }) => (
                        <MaterialIcons name="person" size={28} color={focused ? '#2563EB' : '#6B7280'} />
                    ),
                }}
            />

            {/* FAB nổi - đặt ngoài Tabs.Screen, dùng tabBarStyle để chừa chỗ */}
            <Tabs.Screen
                name="index" // không quan trọng, chỉ để render
                options={{
                    tabBarButton: () => (
                        <TouchableOpacity
                            onPress={() => router.push('/(customer)/create_order')}
                            className="absolute bottom-8 left-1/2 -translate-x-1/2"
                            style={{ zIndex: 10 }}
                        >
                            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary shadow-2xl border-4 border-white">
                                <MaterialIcons name="add" size={36} color="white" />
                            </View>
                        </TouchableOpacity>
                    ),
                }}
            />
        </Tabs>
    );
}