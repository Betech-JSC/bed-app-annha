// Welcome/Onboarding Screen
import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, SafeAreaView, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { MaterialIcons } from '@expo/vector-icons';

export default function WelcomeScreen() {
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
                    {/* Logo & Branding */}
                    <View className="items-center mb-12">
                        <View className="h-24 w-24 items-center justify-center rounded-full bg-primary/10 mb-6">
                            <MaterialIcons name="flight" size={48} color="#2563EB" />
                        </View>
                        <Text className="text-4xl font-bold text-primary mb-2">SkySend</Text>
                        <Text className="text-lg text-center text-text-secondary dark:text-gray-400 max-w-xs">
                            Vận chuyển hàng hóa qua chuyến bay nhanh chóng và an toàn
                        </Text>
                    </View>

                    {/* Features */}
                    <View className="gap-4 mb-12">
                        <View className="flex-row items-center gap-4">
                            <View className="h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30">
                                <MaterialIcons name="check-circle" size={24} color="#10B981" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-base font-semibold text-text-primary dark:text-white">
                                    Nhanh chóng
                                </Text>
                                <Text className="text-sm text-text-secondary dark:text-gray-400">
                                    Gửi hàng trong ngày với hàng trăm chuyến bay
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center gap-4">
                            <View className="h-12 w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                                <MaterialIcons name="security" size={24} color="#2563EB" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-base font-semibold text-text-primary dark:text-white">
                                    An toàn
                                </Text>
                                <Text className="text-sm text-text-secondary dark:text-gray-400">
                                    Bảo hiểm và theo dõi real-time
                                </Text>
                            </View>
                        </View>

                        <View className="flex-row items-center gap-4">
                            <View className="h-12 w-12 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/30">
                                <MaterialIcons name="attach-money" size={24} color="#F97316" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-base font-semibold text-text-primary dark:text-white">
                                    Tiết kiệm
                                </Text>
                                <Text className="text-sm text-text-secondary dark:text-gray-400">
                                    Chi phí thấp hơn vận chuyển truyền thống
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View className="gap-4">
                        <TouchableOpacity
                            onPress={() => router.push('/role-selection')}
                            className="bg-primary rounded-2xl py-4 px-6 shadow-lg active:opacity-80"
                        >
                            <Text className="text-white text-center text-lg font-bold">
                                Bắt đầu ngay
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/login')}
                            className="bg-white dark:bg-slate-800 rounded-2xl py-4 px-6 border-2 border-primary"
                        >
                            <Text className="text-primary text-center text-lg font-semibold">
                                Đã có tài khoản? Đăng nhập
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Terms */}
                    <View className="mt-8 px-4">
                        <Text className="text-xs text-center text-text-secondary dark:text-gray-400 leading-5">
                            Bằng cách tiếp tục, bạn đồng ý với{' '}
                            <Text className="text-primary font-semibold">Điều khoản sử dụng</Text>
                            {' '}và{' '}
                            <Text className="text-primary font-semibold">Chính sách bảo mật</Text>
                            {' '}của SkySend
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

