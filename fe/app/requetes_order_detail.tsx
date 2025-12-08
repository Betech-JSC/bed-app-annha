// app/(customer)/order_detail.tsx   (hoặc order_matched.tsx)
import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function OrderDetailScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Top App Bar - Blur effect */}
            <View className="sticky top-0 z-50 flex-row items-center bg-background-light/80 dark:bg-background-dark/80 px-4 py-4 backdrop-blur-sm">
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={28} color="#1E293B" className="dark:text-white" />
                </TouchableOpacity>
                <Text className="flex-1 text-center text-lg font-bold text-text-primary dark:text-white pr-10">
                    Chi tiết yêu cầu
                </Text>
                <View className="w-10" />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                <View className="px-4 pt-2 pb-32 gap-y-6">
                    {/* Status Card */}
                    <View className="flex-row items-center gap-4 rounded-xl bg-white dark:bg-slate-800 p-4 shadow-lg">
                        <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <MaterialIcons name="task-alt" size={32} color="#2563EB" />
                        </View>
                        <View>
                            <Text className="text-base font-bold text-primary">
                                Đã tìm thấy hành khách phù hợp
                            </Text>
                            <Text className="text-sm text-text-secondary dark:text-slate-400">
                                Trạng thái yêu cầu
                            </Text>
                        </View>
                    </View>

                    {/* Thông tin lộ trình */}
                    <View className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow-lg">
                        <Text className="text-lg font-bold text-text-primary dark:text-white mb-3">
                            Thông tin lộ trình
                        </Text>

                        {/* Từ */}
                        <View className="flex-row items-center gap-4 py-2">
                            <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-light dark:bg-slate-700">
                                <MaterialIcons name="flight-takeoff" size={24} color="#1E293B" className="dark:text-white" />
                            </View>
                            <Text className="flex-1 text-base font-medium text-text-primary dark:text-white">
                                SGN (Ho Chi Minh)
                            </Text>
                        </View>

                        {/* Đường nối chấm */}
                        <View className="items-center py-1">
                            <View className="h-6 w-0.5 border-l-2 border-dashed border-slate-300 dark:border-slate-600" />
                        </View>

                        {/* Đến */}
                        <View className="flex-row items-center gap-4 pb-3">
                            <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-light dark:bg-slate-700">
                                <MaterialIcons name="flight-land" size={24} color="#1E293B" className="dark:text-white" />
                            </View>
                            <Text className="flex-1 text-base font-medium text-text-primary dark:text-white">
                                HAN (Hanoi)
                            </Text>
                        </View>

                        <View className="h-px bg-slate-200 dark:bg-slate-700 my-3" />

                        {/* Ngày giờ */}
                        <View className="flex-row items-center gap-4 py-2">
                            <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-light dark:bg-slate-700">
                                <MaterialIcons name="calendar-month" size={24} color="#1E293B" className="dark:text-white" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-base font-medium text-text-primary dark:text-white">
                                    25 Tháng 12, 2023
                                </Text>
                                <Text className="text-sm text-text-secondary dark:text-slate-400">
                                    08:00 - 10:00
                                </Text>
                            </View>
                        </View>

                        <View className="h-px bg-slate-200 dark:bg-slate-700 my-3" />

                        <Text className="text-lg font-bold text-text-primary dark:text-white pt-2">
                            Chi tiết tài liệu
                        </Text>

                        {/* Loại tài liệu */}
                        <View className="flex-row items-center gap-4 py-2">
                            <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-light dark:bg-slate-700">
                                <MaterialIcons name="description" size={24} color="#1E293B" className="dark:text-white" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm text-text-secondary dark:text-slate-400">Loại tài liệu</Text>
                                <Text className="text-base font-medium text-text-primary dark:text-white">
                                    Hợp đồng kinh doanh
                                </Text>
                            </View>
                        </View>

                        {/* Giá trị */}
                        <View className="flex-row items-center gap-4 py-2">
                            <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-light dark:bg-slate-700">
                                <MaterialIcons name="payments" size={24} color="#1E293B" className="dark:text-white" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm text-text-secondary dark:text-slate-400">Giá trị ước tính</Text>
                                <Text className="text-base font-medium text-text-primary dark:text-white">
                                    5,000,000 VNĐ
                                </Text>
                            </View>
                        </View>

                    </View>

                    {/* Thông tin hành khách */}
                    <View className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow-lg">
                        <Text className="text-lg font-bold text-text-primary dark:text-white mb-4">
                            Thông tin hành khách
                        </Text>

                        <View className="flex-row items-center gap-4">
                            <Image
                                source={{
                                    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuACO5JKaFu3Om-1qBJVkwDifHRqWjLzUg4aoVpOCiVknQSMzAn_yTsBzqki1D5yWFU3ZX76mGDqjqEmarVPtyI-yN8RwA0hLDQnvmEK0i6QWlVAGEAAj1wmodzbs0yoSdxxRnmwjIlFJBbUcoCCBxS0GCgnQ9Hv0DaN8sKX1iv55kpkhqTYHmKTjfH1kASYnMjrrJ31fOqrs0d6bVNTkw6rqu4QwOzJRwx0ogglnHWc0XJZ05bxDjE_kG8OvUgjcaHGWSKZhetsRN5u',
                                }}
                                className="h-14 w-14 rounded-full object-cover"
                            />
                            <View className="flex-1">
                                <Text className="text-base font-bold text-text-primary dark:text-white">
                                    Nguyễn Văn An
                                </Text>
                                <View className="flex-row items-center gap-1 mt-1">
                                    <MaterialIcons name="star" size={18} color="#F97316" />
                                    <Text className="text-sm font-medium text-text-secondary dark:text-slate-400">
                                        4.8 (25 chuyến)
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Sticky Bottom Buttons */}
            <View className="absolute bottom-0 left-0 right-0 bg-background-light/80 dark:bg-background-dark/80 p-4 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700">
                <View className="gap-y-3">
                    <TouchableOpacity
                        onPress={() => router.push('/customer_profile')}
                        className="w-full h-12 rounded-xl bg-primary justify-center shadow-lg shadow-primary/30"
                    >
                        <Text className="text-center text-base font-bold text-white">
                            Xem chi tiết hành khách
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity className="w-full h-12 rounded-xl border border-slate-300 dark:border-slate-600 justify-center">
                        <Text className="text-center text-base font-bold text-text-secondary dark:text-slate-400">
                            Hủy yêu cầu
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}