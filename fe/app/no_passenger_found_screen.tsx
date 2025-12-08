import React from "react";
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function NoPassengerFoundScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Top App Bar */}
            <View className="flex-row items-center justify-between px-4 pt-4 pb-2 bg-background-light dark:bg-background-dark sticky top-0 z-10">
                <TouchableOpacity onPress={() => router.back()}>
                    <View className="w-10 h-10 rounded-full justify-center items-center">
                        <MaterialIcons name="arrow-back" size={24} color="#1F2937" className="dark:text-white" />
                    </View>
                </TouchableOpacity>

                <Text className="flex-1 text-center text-lg font-bold text-text-primary-light dark:text-text-primary-dark -ml-10">
                    Tìm kiếm hành khách
                </Text>

                <View className="w-10" />
            </View>

            {/* Main Content - Empty State */}
            <View className="flex-1 justify-center items-center px-6 py-8">
                <View className="items-center gap-8">
                    {/* Icon vòng tròn lồng nhau */}
                    <View className="w-40 h-40 rounded-full bg-primary/10 justify-center items-center">
                        <View className="w-32 h-32 rounded-full bg-primary/20 justify-center items-center">
                            <MaterialIcons name="search-off" size={80} color="#2563EB" />
                        </View>
                    </View>

                    {/* Text */}
                    <View className="max-w-md items-center gap-3">
                        <Text className="text-2xl font-bold text-center text-text-primary-light dark:text-text-primary-dark leading-tight">
                            Rất tiếc, chưa tìm thấy hành khách phù hợp!
                        </Text>
                        <Text className="text-base text-center text-text-secondary-light dark:text-text-secondary-dark">
                            Yêu cầu của bạn vẫn đang được theo dõi. Chúng tôi sẽ thông báo ngay khi có người sẵn sàng.
                        </Text>
                    </View>
                </View>
            </View>

            {/* Action Buttons - Footer */}
            <View className="p-6 pt-4">
                <View className="gap-3">
                    {/* Nút chính */}
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="h-14 rounded-xl bg-primary justify-center items-center shadow-sm"
                    >
                        <Text className="text-white text-base font-bold">
                            Chỉnh sửa yêu cầu
                        </Text>
                    </TouchableOpacity>

                    {/* Nút phụ */}
                    <TouchableOpacity className="h-14 rounded-xl border border-gray-300 dark:border-gray-700 justify-center items-center bg-transparent">
                        <Text className="text-base font-bold text-text-secondary-light dark:text-text-secondary-dark">
                            Hủy yêu cầu
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}