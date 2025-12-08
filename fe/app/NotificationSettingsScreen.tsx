// NotificationSettingsScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Switch,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { MaterialIcons } from '@expo/vector-icons';

import { useRouter, Stack } from 'expo-router';

export default function NotificationSettingsScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();

    // Trạng thái các switch (có thể lưu vào AsyncStorage / Redux sau)
    const [settings, setSettings] = useState({
        newOrder: true,
        orderStatus: true,
        newMessage: true,
        promotion: false,
        system: true,
    });

    const toggle = (key: keyof typeof settings) => {
        setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const items = [
        { key: 'newOrder', label: 'Thông báo đơn hàng mới' },
        { key: 'orderStatus', label: 'Cập nhật trạng thái đơn hàng' },
        { key: 'newMessage', label: 'Tin nhắn trò chuyện mới' },
        { key: 'promotion', label: 'Ưu đãi & Khuyến mãi' },
        { key: 'system', label: 'Thông báo hệ thống quan trọng' },
    ];

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Cài đặt thông báo',
                    headerShown: true,
                }}
            />
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

                {/* Danh sách cài đặt */}
                <View className="flex-1 px-4 py-6">
                    <View className="rounded-xl bg-white dark:bg-neutral-800 p-2 shadow-sm">
                        {items.map((item, index) => (
                            <View key={item.key}>
                                <View className="flex-row items-center justify-between min-h-14 px-3 py-2">
                                    <Text className="text-base font-medium text-text-primary dark:text-neutral-100">
                                        {item.label}
                                    </Text>

                                    {/* Custom Switch đẹp như web */}
                                    <View className="relative">
                                        <Switch
                                            trackColor={{ false: '#E5E7EB', true: '#2563EB' }}
                                            thumbColor={settings[item.key as keyof typeof settings] ? '#ffffff' : '#f4f3f4'}
                                            ios_backgroundColor="#E5E7EB"
                                            onValueChange={() => toggle(item.key as keyof typeof settings)}
                                            value={settings[item.key as keyof typeof settings]}
                                        />
                                    </View>
                                </View>

                                {index < items.length - 1 && (
                                    <View className="border-t border-neutral-100 dark:border-neutral-700/50 mx-3" />
                                )}
                            </View>
                        ))}
                    </View>
                </View>

                {/* Nút Lưu – Sticky Footer */}
                <View className="border-t border-neutral-200 dark:border-neutral-200/10 bg-white dark:bg-background-dark p-4">
                    <TouchableOpacity
                        onPress={() => {
                            // TODO: lưu vào API / AsyncStorage
                            alert('Đã lưu cài đặt thông báo!');
                            navigation.goBack();
                        }}
                        className="h-12 w-full rounded-xl bg-primary justify-center items-center shadow-sm"
                    >
                        <Text className="text-white text-base font-bold">Lưu thay đổi</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </>
    );
}