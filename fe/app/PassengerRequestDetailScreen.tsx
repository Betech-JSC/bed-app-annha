import React from "react";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    Image,
    Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function RequestDetailScreen() {
    const router = useRouter();

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Top App Bar */}
            <View className="flex-row items-center justify-between px-4 pt-4 pb-3 bg-background-light dark:bg-background-dark sticky top-0 z-10">
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={28} color="#1F2937" className="dark:text-white" />
                </TouchableOpacity>

                <Text className="flex-1 text-center text-lg font-bold text-text-primary dark:text-white -ml-10">
                    Chi tiết yêu cầu
                </Text>

                <TouchableOpacity>
                    <MaterialIcons name="more-horiz" size={28} color="#1F2937" className="dark:text-white" />
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4 pb-32">
                <View className="gap-y-4">

                    {/* Chuyến bay */}
                    <View className="flex-row items-center gap-4 bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                        <View className="w-12 h-12 rounded-lg bg-primary/10 justify-center items-center">
                            <MaterialIcons name="flight-takeoff" size={28} color="#2563EB" />
                        </View>
                        <View>
                            <Text className="text-base font-bold text-text-primary dark:text-white">
                                SGN → HAN
                            </Text>
                            <Text className="text-sm text-text-secondary dark:text-gray-400">
                                Thứ Ba, 28 tháng 5, 2024
                            </Text>
                        </View>
                    </View>

                    {/* Thông tin tài liệu */}
                    <View className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                        <View className="mb-3">
                            <Text className="text-sm text-text-secondary dark:text-gray-400">
                                Thông tin tài liệu
                            </Text>
                            <Text className="text-lg font-bold text-text-primary dark:text-white mt-1">
                                Hợp đồng kinh doanh
                            </Text>
                            <Text className="text-base text-text-secondary dark:text-gray-400 mt-2">
                                Tài liệu được niêm phong trong phong bì A4 màu nâu. Vui lòng không làm gãy hoặc gấp.
                            </Text>
                        </View>

                        {/* Ảnh tài liệu */}
                        <Image
                            source={{
                                uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuBkcEv7xyUpIo_XqwcUuPbY68zl56Xnyf4TPRyWIom28OnwrYVg-eX5OT7-XSwGWgCgIZBog2KiwS5azcyibkhJbA5KIzX6LKM0Efynn9N4TGjlPSScoTCsIgmr0sNyDRGYZlDIZtQxlsT_HxzSMGlHul3r4aHM9uRl2ovZLRRiFhPp5ZOpXLOUjiiPFZV1t3whfYyeXm5qfClFSAgfimDNRhCM5ehLEn0WjR07cG4SHfsfL_zUtjIHwc0IUrSMJ8181ckM0M2VMGm9",
                            }}
                            className="w-full h-48 rounded-lg"
                            resizeMode="cover"
                        />
                    </View>

                    {/* Phí nhận được */}
                    <View className="flex-row items-center justify-between bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
                        <View>
                            <Text className="text-base font-bold text-text-primary dark:text-white">
                                Phí bạn nhận được
                            </Text>
                            <Text className="text-3xl font-extrabold text-primary mt-1">
                                250.000đ
                            </Text>
                        </View>
                        <View className="w-14 h-14 rounded-lg bg-primary/10 justify-center items-center">
                            <MaterialIcons name="payments" size={32} color="#2563EB" />
                        </View>
                    </View>

                    {/* Người gửi */}
                    <View className="flex-row items-center justify-between bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm">
                        <View className="flex-row items-center gap-4 flex-1">
                            <Image
                                source={{
                                    uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuB01HdOzsEJ_bH8JF-OYtmJZS-d_wV5HFAjuW2GsXmqCP-ordhKHogJmYGvpBeFpLX_7rY43xZK_4yWzx8UO6_YYytsBHfZ6_bhRtQW1mR7PmNjJ8TsvjFlBd3x-x6a4RE4887mgLApifktknQbpLrpGWIRbTJxJK7--COrlELKLgHl3D6vwlBAhwwb9GCS8Bw0qlBD0luE0mcDWon1DFR8Nz62Wj4kSIxQyXFJFwLSOCkCwnyPB9fbbz3rlcEUYMYilrz8XvW4cVAX",
                                }}
                                className="w-10 h-10 rounded-full"
                            />
                            <Text className="text-base font-medium text-text-primary dark:text-white flex-1">
                                Nguyễn Văn A***
                            </Text>
                        </View>

                        <View className="flex-row items-center gap-1 bg-secondary/10 px-2 py-1 rounded-full">
                            <Text className="text-sm font-bold text-secondary">4.8</Text>
                            <MaterialIcons name="star" size={16} color="#F97316" />
                        </View>
                    </View>

                </View>
            </ScrollView>

            {/* Footer cố định */}
            <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 p-4">
                <View className="flex-row items-center gap-3">
                    {/* Nút chat */}
                    <TouchableOpacity className="w-12 h-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 justify-center items-center">
                        <MaterialIcons name="chat-bubble" size={26} color="#6B7280" className="dark:text-gray-300" />
                    </TouchableOpacity>

                    {/* Nút nhận mang hộ */}
                    <TouchableOpacity className="flex-1 h-12 rounded-lg bg-primary justify-center items-center">
                        <Text className="text-white text-base font-bold">
                            Nhận mang hộ
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}