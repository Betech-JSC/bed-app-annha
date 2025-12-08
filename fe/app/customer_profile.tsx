// app/(customer)/sender_profile.tsx
import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export default function SenderProfileScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Top App Bar */}
            <View className="sticky top-0 z-50 flex-row items-center justify-between bg-card-light dark:bg-card-dark px-4 py-4 shadow-sm">
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={28} color="#1F2937" className="dark:text-white" />
                </TouchableOpacity>
                <Text className="absolute left-0 right-0 text-center text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
                    Hồ sơ Đối tác
                </Text>
                <View className="w-10" />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                <View className="px-4 pt-4 pb-32 gap-y-4">
                    {/* Avatar + Info */}
                    <View className="items-center rounded-xl bg-card-light dark:bg-card-dark p-6 shadow-sm">
                        <View className="h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-xl">
                            <Image
                                source={{
                                    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFo5XDeGQQixCh592qCFO1BMjesd1MZYmbBe-vvMxPKdvwpOWnDZAf5B4lVwDge5nGrI1PY0IPj_XlKGudJV8BR605QD4mXxJaoSOnCLFtAXAmsiP_UdmQjyLOiDIgnX9oYHMVaGN5ze6QFC1b8CFh14sj4c_4lKg8Mf8c4JjN8WZENlqsB9wXW4IZl4WpLGmxR6I75Qla6G9TDvud5DkN3GExhodb6zDKbwkb3HHyphaWXV_7ONs_JyP_blfhAUjgxop2VuqCcrrC',
                                }}
                                className="h-full w-full"
                                resizeMode="cover"
                            />
                        </View>

                        <Text className="mt-4 text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
                            Nguyễn Văn An
                        </Text>

                        <View className="mt-2 flex-row items-center gap-2">
                            <FontAwesome5 name="star" size={18} color="#F59E0B" solid />
                            <Text className="font-bold text-text-primary-light dark:text-text-primary-dark">4.9</Text>
                            <Text className="text-text-secondary-light dark:text-text-secondary-dark">(125 đánh giá)</Text>
                        </View>
                    </View>

                    {/* Stats */}
                    <View className="rounded-xl bg-card-light dark:bg-card-dark p-4 shadow-sm gap-y-4">
                        {/* Số chuyến */}
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <MaterialIcons name="luggage" size={24} color="#2563EB" />
                                <Text className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                                    Số chuyến đã hoàn thành
                                </Text>
                            </View>
                            <Text className="text-lg font-bold text-primary">25</Text>
                        </View>

                        <View className="h-px bg-border-light dark:bg-border-dark" />

                        {/* Tuyến bay thường xuyên */}
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <MaterialIcons name="sync-alt" size={24} color="#2563EB" />
                                <Text className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                                    Các tuyến bay thường xuyên
                                </Text>
                            </View>
                            <Text className="font-medium text-text-secondary-light dark:text-text-secondary-dark">
                                SGN ↔ HAN, DAD
                            </Text>
                        </View>

                        <View className="h-px bg-border-light dark:bg-border-dark" />

                        {/* Xác minh KYC */}
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <MaterialIcons name="verified-user" size={24} color="#2563EB" />
                                <Text className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                                    Trạng thái xác minh
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                                <MaterialIcons name="check-circle" size={20} color="#16A34A" />
                                <Text className="font-semibold text-sm text-green-600 dark:text-green-400">
                                    Đã xác minh KYC
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Đánh giá */}
                    <View className="rounded-xl bg-card-light dark:bg-card-dark p-4 shadow-sm">
                        <Text className="mb-4 text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
                            Đánh giá từ người gửi
                        </Text>

                        {/* Review 1 */}
                        <View className="mb-4">
                            <View className="flex-row items-center justify-between mb-2">
                                <View className="flex-row items-center gap-3">
                                    <View className="h-8 w-8 rounded-full bg-slate-300 dark:bg-slate-600" />
                                    <Text className="font-semibold text-sm text-text-primary-light dark:text-text-primary-dark">
                                        Trần Thị Bích
                                    </Text>
                                </View>
                                <View className="flex-row">
                                    {[...Array(5)].map((_, i) => (
                                        <FontAwesome5 key={i} name="star" size={14} color="#F59E0B" solid />
                                    ))}
                                </View>
                            </View>
                            <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                "Hành khách rất nhiệt tình và giao hàng đúng hẹn. Rất hài lòng!"
                            </Text>
                        </View>

                        <View className="h-px bg-border-light dark:bg-border-dark" />

                        {/* Review 2 */}
                        <View className="pt-4">
                            <View className="flex-row items-center justify-between mb-2">
                                <View className="flex-row items-center gap-3">
                                    <View className="h-8 w-8 rounded-full bg-slate-300 dark:bg-slate-600" />
                                    <Text className="font-semibold text-sm text-text-primary-light dark:text-text-primary-dark">
                                        Lê Minh Hoàng
                                    </Text>
                                </View>
                                <View className="flex-row">
                                    {[...Array(5)].map((_, i) => (
                                        <FontAwesome5 key={i} name="star" size={14} color="#F59E0B" solid />
                                    ))}
                                </View>
                            </View>
                            <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                "Giao tiếp tốt, mọi thứ suôn sẻ."
                            </Text>
                        </View>
                    </View>

                    {/* Báo cáo */}
                    <View className="justify-center pt-2">
                        <TouchableOpacity className="flex-row items-center justify-center rounded-lg border border-red-300 dark:border-red-800 px-6 py-3 hover:bg-red-50 dark:hover:bg-red-900/20">
                            <MaterialIcons name="flag" size={20} color="#DC2626" className="dark:text-red-400" />
                            <Text className="ml-2 font-semibold text-red-600 dark:text-red-400">
                                Báo cáo người dùng này
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Fixed Bottom Button */}
            <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background-light to-transparent dark:from-background-dark px-4 pb-6 pt-10">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="w-full rounded-xl bg-primary py-4 shadow-lg shadow-primary/30"
                >
                    <Text className="text-center text-base font-bold text-white">
                        Quay lại đơn hàng
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}