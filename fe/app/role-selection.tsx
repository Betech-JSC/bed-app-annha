// app/role-selection.tsx
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { MaterialIcons } from '@expo/vector-icons';

export default function RoleSelectionScreen() {
    const router = useRouter();
    const user = useSelector((state: RootState) => state.user);

    // Redirect nếu đã đăng nhập
    useEffect(() => {
        if (user?.token && user?.role) {
            if (user.role === "sender") {
                router.replace("/(tabs)/(sender)/home");
            } else if (user.role === "customer") {
                router.replace("/(tabs)/(customer)/home_customer");
            }
        }
    }, [user, router]);

    // Nếu đang check auth, hiển thị loading
    if (user?.token && user?.role) {
        return (
            <View className="flex-1 items-center justify-center bg-background-light dark:bg-background-dark">
                <ActivityIndicator size="large" color="#2563EB" />
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            <ScrollView
                contentContainerStyle={{ flexGrow: 1 }}
                showsVerticalScrollIndicator={false}
            >
                <View className="flex-1 justify-center px-6 py-8">
                    {/* Header */}
                    <View className="items-center mb-8">
                        <TouchableOpacity
                            onPress={() => router.back()}
                            className="absolute left-0 top-0"
                        >
                            <MaterialIcons name="arrow-back" size={28} color="#1F2937" className="dark:text-white" />
                        </TouchableOpacity>
                        <Text className="text-3xl font-bold text-primary mb-2">Chọn vai trò của bạn</Text>
                        <Text className="text-base text-center text-text-secondary dark:text-gray-400 max-w-xs">
                            Bạn muốn sử dụng SkySend với vai trò nào?
                        </Text>
                    </View>

                    {/* Role Selection Cards */}
                    <View className="gap-4 mb-8">
                        {/* Sender Card */}
                        <TouchableOpacity
                            onPress={() => router.push({ pathname: '/register', params: { role: 'sender' } })}
                            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-2 border-transparent active:border-primary"
                            activeOpacity={0.8}
                        >
                            <View className="flex-row items-center gap-4">
                                <View className="h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
                                    <MaterialIcons name="send" size={36} color="#2563EB" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xl font-bold text-text-primary dark:text-white mb-2">
                                        Người gửi hàng
                                    </Text>
                                    <Text className="text-sm text-text-secondary dark:text-gray-400 mb-2">
                                        Tôi muốn gửi hàng qua chuyến bay
                                    </Text>
                                    <View className="flex-row items-center gap-2 mt-2">
                                        <MaterialIcons name="check-circle" size={16} color="#10B981" />
                                        <Text className="text-xs text-green-600 dark:text-green-400">
                                            Tìm hành khách phù hợp
                                        </Text>
                                    </View>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
                            </View>
                        </TouchableOpacity>

                        {/* Customer Card */}
                        <TouchableOpacity
                            onPress={() => router.push({ pathname: '/register', params: { role: 'customer' } })}
                            className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border-2 border-transparent active:border-primary"
                            activeOpacity={0.8}
                        >
                            <View className="flex-row items-center gap-4">
                                <View className="h-20 w-20 items-center justify-center rounded-2xl bg-green-500/10">
                                    <MaterialIcons name="flight" size={36} color="#10B981" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-xl font-bold text-text-primary dark:text-white mb-2">
                                        Hành khách
                                    </Text>
                                    <Text className="text-sm text-text-secondary dark:text-gray-400 mb-2">
                                        Tôi có chuyến bay và muốn nhận hàng mang hộ
                                    </Text>
                                    <View className="flex-row items-center gap-2 mt-2">
                                        <MaterialIcons name="check-circle" size={16} color="#10B981" />
                                        <Text className="text-xs text-green-600 dark:text-green-400">
                                            Kiếm thêm thu nhập
                                        </Text>
                                    </View>
                                </View>
                                <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Login Link */}
                    <View className="items-center mt-4">
                        <Text className="text-text-secondary dark:text-gray-400 mb-2">
                            Đã có tài khoản?
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push('/login')}
                            className="px-6 py-2"
                        >
                            <Text className="text-primary font-semibold text-base">
                                Đăng nhập ngay
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

