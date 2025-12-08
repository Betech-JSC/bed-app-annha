// app/(sender)/flight_cancel_success.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function FlightCancelSuccessScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Main Content - Center */}
            <View className="flex-1 items-center justify-center px-6">
                <View className="items-center max-w-sm">
                    {/* Big Icon */}
                    <View className="h-24 w-24 items-center justify-center rounded-full bg-primary/20 dark:bg-primary/30">
                        <MaterialIcons name="cloud-off" size={72} color="#2563EB" />
                    </View>

                    {/* Title & Description */}
                    <View className="mt-6 items-center gap-3">
                        <Text className="text-2xl font-bold tracking-tighter text-text-dark-gray dark:text-white text-center">
                            Hủy chuyến bay thành công!
                        </Text>
                        <Text className="text-base text-text-light-gray dark:text-gray-300 text-center leading-relaxed">
                            Chuyến bay VN256 của bạn đã được hủy. Các yêu cầu đang chờ khớp cho chuyến này sẽ không còn hiển thị.
                        </Text>
                    </View>
                </View>
            </View>

            {/* Sticky Footer Buttons */}
            <View className="border-t border-gray-200 dark:border-gray-700 bg-background-light dark:bg-background-dark p-4">
                <View className="space-y-3">
                    {/* Primary Button */}
                    <TouchableOpacity
                        onPress={() => router.push('/(sender)/create_flight')}
                        className="h-12 w-full items-center justify-center rounded-xl bg-primary shadow-lg"
                    >
                        <Text className="text-base font-bold text-white tracking-wide">
                            Đăng chuyến bay mới
                        </Text>
                    </TouchableOpacity>

                    {/* Secondary Button */}
                    <TouchableOpacity
                        onPress={() => router.replace('/(sender)/home')}
                        className="h-12 w-full items-center justify-center rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent"
                    >
                        <Text className="text-base font-bold text-text-light-gray dark:text-gray-300 tracking-wide">
                            Quay về Trang chủ
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}