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

export default function ReviewSuccessScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Main Content - Center */}
            <View className="flex-1 justify-center items-center px-6">
                <View className="items-center max-w-sm w-full">
                    {/* Success Icon */}
                    <View className="w-24 h-24 rounded-full bg-success-green/10 justify-center items-center mb-8">
                        <MaterialIcons
                            name="check-circle"
                            size={60}
                            color="#10B981"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                        />
                    </View>

                    {/* Title & Description */}
                    <Text className="text-[28px] font-bold text-text-dark-gray dark:text-white text-center leading-tight tracking-tight px-4">
                        Đánh giá thành công!
                    </Text>
                    <Text className="text-base text-text-dark-gray/80 dark:text-white/80 text-center mt-3 px-4">
                        Cảm ơn bạn đã chia sẻ trải nghiệm của mình với SkySend.
                    </Text>
                </View>
            </View>

            {/* Bottom Buttons */}
            <View className="p-4 gap-y-3 bg-background-light dark:bg-background-dark">
                {/* Nút chính */}
                <TouchableOpacity
                    onPress={() => router.push("/home")}
                    className="h-12 rounded-xl bg-primary justify-center items-center shadow-sm"
                >
                    <Text className="text-white text-base font-bold">
                        Quay về Trang chủ
                    </Text>
                </TouchableOpacity>

                {/* Nút phụ */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="h-12 rounded-xl border border-gray-300 dark:border-gray-700 justify-center items-center bg-transparent"
                >
                    <Text className="text-base font-bold text-text-dark-gray dark:text-white">
                        Xem lại đánh giá
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}