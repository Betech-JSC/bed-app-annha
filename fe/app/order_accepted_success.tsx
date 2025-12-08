// app/(sender)/order_accepted_success.tsx
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function OrderAcceptedSuccessScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Close Button Top Right */}
            <View className="flex-row justify-end p-4 pb-2">
                <TouchableOpacity
                    onPress={() => router.replace('/(sender)/home')}
                    className="h-10 w-10 items-center justify-center rounded-full bg-black/5 dark:bg-white/10"
                >
                    <MaterialIcons name="close" size={28} color="#1F2937" className="dark:text-white" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <View className="flex-1 items-center px-4 pt-4 pb-8">
                    {/* Big Success Icon */}
                    <View className="h-28 w-28 items-center justify-center rounded-full bg-primary/10">
                        <MaterialIcons name="task-alt" size={100} color="#2563EB" />
                    </View>

                    {/* Title */}
                    <Text className="mt-8 px-4 text-center text-3xl font-bold tracking-tight text-text-dark-gray dark:text-white">
                        Bạn đã nhận mang hộ thành công!
                    </Text>

                    {/* Subtitle */}
                    <Text className="mt-2 px-4 text-center text-base font-normal text-text-dark-gray/70 dark:text-white/70">
                        Cảm ơn bạn đã đồng hành cùng SkySend.
                    </Text>

                    {/* Order Summary Card */}
                    <View className="mt-10 w-full max-w-md">
                        <View className="rounded-2xl bg-white dark:bg-[#1F2937] dark:border dark:border-white/10 p-6 shadow-xl">
                            {/* Mã đơn hàng */}
                            <View className="mb-5 flex-row items-center gap-4">
                                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                                    <MaterialIcons name="qr-code-2" size={28} color="#2563EB" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm text-text-dark-gray/60 dark:text-white/60">Mã đơn hàng</Text>
                                    <Text className="text-base font-bold text-text-dark-gray dark:text-white">SK8866</Text>
                                </View>
                            </View>

                            {/* Tuyến đường */}
                            <View className="mb-5 flex-row items-center gap-4">
                                <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                                    <MaterialIcons name="flight-takeoff" size={28} color="#2563EB" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm text-text-dark-gray/60 dark:text-white/60">Tuyến đường</Text>
                                    <Text className="text-base font-bold text-text-dark-gray dark:text-white">
                                        Hà Nội (HAN) to TP. HCM (SGN)
                                    </Text>
                                </View>
                            </View>

                            {/* Phí nhận được */}
                            <View className="flex-row items-center gap-4">
                                <View className="h-11 w-11 items-center justify-center rounded-full bg-secondary/10">
                                    <MaterialIcons name="account-balance-wallet" size={28} color="#F97316" />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm text-text-dark-gray/60 dark:text-white/60">Phí nhận được</Text>
                                    <Text className="text-base font-bold text-secondary">350.000đ</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Spacer để đẩy nút xuống dưới */}
                    <View className="flex-grow" />

                    {/* CTA Buttons */}
                    <View className="w-full max-w-md pt-10 gap-y-3">
                        <TouchableOpacity
                            onPress={() => router.push('/orders_details')}
                            className="h-14 w-full items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30"
                        >
                            <Text className="text-base font-bold text-white">Xem chi tiết đơn hàng</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/chat')}
                            className="h-14 w-full items-center justify-center rounded-full border border-primary/20 bg-transparent"
                        >
                            <Text className="text-base font-bold text-primary">
                                Bắt đầu trò chuyện với người gửi
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}