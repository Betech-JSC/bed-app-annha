import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Alert,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import api from "@/api/api";
import { getAvatarUrl } from "@/constants/avatars";

interface UserProfile {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
    role?: string;
    rating?: number;
    total_orders?: number;
    completed_orders?: number;
    verified?: boolean;
}

export default function UserProfileScreen() {
    const router = useRouter();
    const { userId, userName, userAvatar, userRole } = useLocalSearchParams<{
        userId: string;
        userName?: string;
        userAvatar?: string;
        userRole?: string;
    }>();
    const currentUser = useSelector((state: RootState) => state.user);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userId) {
            fetchUserProfile();
        } else {
            setError("Không tìm thấy ID người dùng");
            setLoading(false);
        }
    }, [userId]);

    const fetchUserProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch từ API
            const response = await api.get(`users/${userId}`);

            if (response.data?.success && response.data?.data) {
                const userData = response.data.data;
                setProfile({
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone,
                    avatar: userData.avatar,
                    role: userData.role,
                    rating: userData.rating || 5.0,
                    total_orders: userData.total_orders || 0,
                    completed_orders: userData.completed_orders || 0,
                    verified: userData.verified || userData.kyc_status === 'verified',
                });
            } else {
                setError("Không thể tải thông tin người dùng");
            }
        } catch (err: any) {
            console.error("Error fetching user profile:", err);
            setError(
                err.response?.data?.message ||
                "Không thể tải thông tin người dùng. Vui lòng thử lại."
            );
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <>
                <Stack.Screen
                    options={{
                        title: "Hồ sơ đối tác",
                        headerShown: true,
                    }}
                />
                <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator size="large" color="#2563EB" />
                        <Text className="mt-4 text-text-secondary dark:text-gray-400">
                            Đang tải...
                        </Text>
                    </View>
                </SafeAreaView>
            </>
        );
    }

    if (error || !profile) {
        return (
            <>
                <Stack.Screen
                    options={{
                        title: "Hồ sơ đối tác",
                        headerShown: true,
                    }}
                />
                <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
                    <View className="flex-1 justify-center items-center px-8">
                        <MaterialIcons name="error-outline" size={64} color="#EF4444" />
                        <Text className="mt-4 text-lg font-bold text-text-primary dark:text-white text-center">
                            {error || "Không tìm thấy thông tin người dùng"}
                        </Text>
                        <TouchableOpacity
                            onPress={fetchUserProfile}
                            className="mt-4 bg-primary px-6 py-3 rounded-lg"
                        >
                            <Text className="text-white font-bold">Thử lại</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </>
        );
    }

    const isSender = profile.role === "sender";
    const isCustomer = profile.role === "customer";

    return (
        <>
            <Stack.Screen
                options={{
                    title: `Hồ sơ ${isSender ? "Người gửi" : isCustomer ? "Hành khách" : "Đối tác"}`,
                    headerShown: true,
                }}
            />
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">

                <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                    <View className="px-4 pt-4 pb-32 gap-y-4">
                        {/* Avatar + Info */}
                        <View className="items-center rounded-xl bg-card-light dark:bg-card-dark p-6 shadow-sm">
                            <View className="h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-xl">
                                <Image
                                    source={{
                                        uri: getAvatarUrl(profile.avatar),
                                    }}
                                    className="h-full w-full"
                                    resizeMode="cover"
                                />
                            </View>

                            <Text className="mt-4 text-xl font-bold text-text-primary-light dark:text-text-primary-dark">
                                {profile.name || "Người dùng"}
                            </Text>
                            {profile.role && (
                                <View className="mt-2 px-3 py-1 rounded-full bg-primary/10">
                                    <Text className="text-xs font-semibold text-primary">
                                        {isSender
                                            ? "Người gửi"
                                            : isCustomer
                                                ? "Hành khách"
                                                : profile.role}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Thông tin liên hệ */}
                        <View className="rounded-xl bg-card-light dark:bg-card-dark p-4 shadow-sm gap-y-4">
                            <Text className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark mb-2">
                                Thông tin liên hệ
                            </Text>

                            {profile.phone && (
                                <View className="flex-row items-center gap-3">
                                    <MaterialIcons name="phone" size={24} color="#2563EB" />
                                    <View className="flex-1">
                                        <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                            Số điện thoại
                                        </Text>
                                        <Text className="font-semibold text-base text-text-primary-light dark:text-text-primary-dark">
                                            {profile.phone}
                                        </Text>
                                    </View>
                                </View>
                            )}

                            {profile.email && (
                                <>
                                    {profile.phone && (
                                        <View className="h-px bg-border-light dark:bg-border-dark" />
                                    )}
                                    <View className="flex-row items-center gap-3">
                                        <MaterialIcons
                                            name="email"
                                            size={24}
                                            color="#2563EB"
                                        />
                                        <View className="flex-1">
                                            <Text className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                                                Email
                                            </Text>
                                            <Text className="font-semibold text-base text-text-primary-light dark:text-text-primary-dark">
                                                {profile.email}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Stats */}
                        <View className="rounded-xl bg-card-light dark:bg-card-dark p-4 shadow-sm gap-y-4">
                            <Text className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark mb-2">
                                Thống kê
                            </Text>

                            {/* Số đơn hàng */}
                            {(profile.total_orders !== undefined ||
                                profile.completed_orders !== undefined) && (
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center gap-3">
                                            <MaterialIcons
                                                name="shopping-bag"
                                                size={24}
                                                color="#2563EB"
                                            />
                                            <Text className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                                                {isSender
                                                    ? "Số đơn đã gửi"
                                                    : "Số đơn đã nhận"}
                                            </Text>
                                        </View>
                                        <Text className="text-lg font-bold text-primary">
                                            {profile.total_orders || profile.completed_orders || 0}
                                        </Text>
                                    </View>
                                )}

                            {profile.completed_orders !== undefined &&
                                profile.total_orders !== undefined &&
                                profile.total_orders > 0 && (
                                    <>
                                        <View className="h-px bg-border-light dark:bg-border-dark" />
                                        <View className="flex-row items-center justify-between">
                                            <View className="flex-row items-center gap-3">
                                                <MaterialIcons
                                                    name="check-circle"
                                                    size={24}
                                                    color="#16A34A"
                                                />
                                                <Text className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                                                    Đơn đã hoàn thành
                                                </Text>
                                            </View>
                                            <Text className="text-lg font-bold text-green-600 dark:text-green-400">
                                                {profile.completed_orders}
                                            </Text>
                                        </View>
                                    </>
                                )}

                            {/* Xác minh KYC */}
                            {profile.verified !== undefined && (
                                <>
                                    {(profile.total_orders !== undefined ||
                                        profile.completed_orders !== undefined) && (
                                            <View className="h-px bg-border-light dark:bg-border-dark" />
                                        )}
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center gap-3">
                                            <MaterialIcons
                                                name="verified-user"
                                                size={24}
                                                color="#2563EB"
                                            />
                                            <Text className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                                                Trạng thái xác minh
                                            </Text>
                                        </View>
                                        <View className="flex-row items-center gap-1">
                                            {profile.verified ? (
                                                <>
                                                    <MaterialIcons
                                                        name="check-circle"
                                                        size={20}
                                                        color="#16A34A"
                                                    />
                                                    <Text className="font-semibold text-sm text-green-600 dark:text-green-400">
                                                        Đã xác minh KYC
                                                    </Text>
                                                </>
                                            ) : (
                                                <>
                                                    <MaterialIcons
                                                        name="cancel"
                                                        size={20}
                                                        color="#EF4444"
                                                    />
                                                    <Text className="font-semibold text-sm text-red-600 dark:text-red-400">
                                                        Chưa xác minh
                                                    </Text>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Báo cáo */}
                        {currentUser?.id !== profile.id && (
                            <View className="justify-center pt-2">
                                <TouchableOpacity className="flex-row items-center justify-center rounded-lg border border-red-300 dark:border-red-800 px-6 py-3">
                                    <MaterialIcons
                                        name="flag"
                                        size={20}
                                        color="#DC2626"
                                        className="dark:text-red-400"
                                    />
                                    <Text className="ml-2 font-semibold text-red-600 dark:text-red-400">
                                        Báo cáo người dùng này
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>

                {/* Fixed Bottom Button */}
                <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 pb-6 pt-4">
                    <TouchableOpacity
                        onPress={() => router.back()}
                        className="w-full rounded-xl bg-primary py-4 shadow-lg"
                    >
                        <Text className="text-center text-base font-bold text-white">
                            Quay lại
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </>
    );
}



