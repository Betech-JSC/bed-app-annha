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
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import api from "@/api/api";
import { getAvatarUrl } from "@/constants/avatars";
import UserProfileInfo from "../components/UserProfileInfo";

interface RequestDetail {
    id: number;
    uuid: string;
    sender_id: number;
    flight_id: number;
    reward: number;
    item_value: number;
    item_description: string;
    time_slot: string;
    note?: string;
    priority_level: string;
    status: string;
    expires_at: string;
    created_at: string;
    updated_at: string;
    flight?: {
        id: number;
        from_airport: string;
        to_airport: string;
        flight_number: string;
        flight_date: string;
        customer?: {
            id: number;
            name: string;
            email?: string;
            avatar?: string;
            phone?: string;
            kyc_status?: string;
        };
    };
    sender?: {
        id: number;
        name: string;
        avatar?: string;
        phone?: string;
    };
}

export default function PrivateRequestDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const user = useSelector((state: RootState) => state.user);
    const [loading, setLoading] = useState(true);
    const [request, setRequest] = useState<RequestDetail | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            setError("Request ID không hợp lệ");
            setLoading(false);
            return;
        }

        fetchRequestDetail();
    }, [id]);

    const fetchRequestDetail = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get(`private-requests/${id}/show`);

            if (response.data?.success && response.data?.data) {
                // Transform data từ API để match với interface
                const apiData = response.data.data;
                const transformedData: RequestDetail = {
                    id: apiData.id,
                    uuid: apiData.uuid,
                    sender_id: apiData.sender?.id || 0,
                    flight_id: apiData.flight?.id || 0,
                    reward: apiData.reward || 0,
                    item_value: apiData.item?.value || 0,
                    item_description: apiData.item?.description || "",
                    time_slot: apiData.time_slot || "",
                    note: apiData.note,
                    priority_level: apiData.priority_level || "normal",
                    status: apiData.status || "pending",
                    expires_at: apiData.expires_at || "",
                    created_at: apiData.created_at || "",
                    updated_at: apiData.updated_at || "",
                    flight: apiData.flight ? {
                        id: apiData.flight.id,
                        from_airport: apiData.flight.from_airport,
                        to_airport: apiData.flight.to_airport,
                        flight_number: apiData.flight.flight_number,
                        flight_date: apiData.flight.flight_date,
                        customer: apiData.flight.customer ? {
                            id: apiData.flight.customer.id,
                            name: apiData.flight.customer.name,
                            email: apiData.flight.customer.email,
                            phone: apiData.flight.customer.phone,
                            avatar: apiData.flight.customer.avatar,
                            kyc_status: apiData.flight.customer.kyc_status,
                        } : undefined,
                    } : undefined,
                    sender: apiData.sender,
                };
                setRequest(transformedData);
            } else {
                setError("Không thể tải thông tin yêu cầu");
            }
        } catch (err: any) {
            console.error("Error fetching request detail:", err);
            setError(
                err.response?.data?.message ||
                "Không thể tải thông tin yêu cầu. Vui lòng thử lại."
            );
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(amount);
    };

    const formatDate = (dateString: string | null | undefined): string | null => {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return null;
            const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
            return `${days[date.getDay()]}, ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        } catch {
            return null;
        }
    };

    const formatAirport = (airport: string | null | undefined): string | null => {
        if (!airport || airport.trim() === '') return null;
        return airport.trim();
    };

    const formatFlightNumber = (flightNumber: string | null | undefined): string | null => {
        if (!flightNumber || flightNumber.trim() === '') return null;
        return flightNumber.trim();
    };

    const formatName = (name: string | null | undefined): string | null => {
        if (!name || name.trim() === '') return null;
        return name.trim();
    };

    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, { label: string; color: string }> = {
            pending: { label: "Đang chờ", color: "#F59E0B" },
            accepted: { label: "Đã chấp nhận", color: "#10B981" },
            declined: { label: "Đã từ chối", color: "#EF4444" },
            expired: { label: "Đã hết hạn", color: "#6B7280" },
            confirmed: { label: "Đã xác nhận", color: "#2563EB" },
        };
        return statusMap[status] || { label: status, color: "#6B7280" };
    };

    const getPriorityLabel = (priority: string) => {
        const priorityMap: Record<string, { label: string; color: string }> = {
            urgent: { label: "Gấp", color: "#EF4444" },
            priority: { label: "Ưu tiên", color: "#F59E0B" },
            normal: { label: "Bình thường", color: "#6B7280" },
        };
        return priorityMap[priority] || { label: priority, color: "#6B7280" };
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
                <View className="flex-1 justify-center items-center">
                    <ActivityIndicator size="large" color="#2563EB" />
                    <Text className="mt-4 text-text-secondary dark:text-gray-400">
                        Đang tải...
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (error || !request) {
        return (
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
                <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
                    <TouchableOpacity onPress={() => router.back()}>
                        <MaterialIcons
                            name="arrow-back"
                            size={28}
                            color="#1F2937"
                        />
                    </TouchableOpacity>
                    <Text className="flex-1 text-center text-lg font-bold text-text-primary dark:text-white -ml-10">
                        Chi tiết yêu cầu
                    </Text>
                    <View className="w-10" />
                </View>
                <View className="flex-1 justify-center items-center px-8">
                    <MaterialIcons name="error-outline" size={64} color="#EF4444" />
                    <Text className="mt-4 text-lg font-bold text-text-primary dark:text-white text-center">
                        {error || "Không tìm thấy yêu cầu"}
                    </Text>
                    <TouchableOpacity
                        onPress={fetchRequestDetail}
                        className="mt-4 bg-primary px-6 py-3 rounded-lg"
                    >
                        <Text className="text-white font-bold">Thử lại</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const statusInfo = getStatusLabel(request.status);
    const priorityInfo = getPriorityLabel(request.priority_level);
    const flight = request.flight;
    const customer = flight?.customer;

    return (
        <>
            <Stack.Screen
                options={{
                    title: `Yêu cầu #${request.uuid}`,
                    headerShown: true,
                }}
            />
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">

                <ScrollView className="flex-1 px-4 pb-32">
                    <View className="gap-y-4">
                        {/* Status Card */}
                        <View className="flex-row items-center gap-4 rounded-xl bg-white dark:bg-slate-800 p-4 shadow-lg">
                            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                                <MaterialIcons
                                    name="task-alt"
                                    size={32}
                                    color={statusInfo.color}
                                />
                            </View>
                            <View className="flex-1">
                                <Text
                                    className="text-base font-bold"
                                    style={{ color: statusInfo.color }}
                                >
                                    {statusInfo.label}
                                </Text>
                                <Text className="text-sm text-text-secondary dark:text-slate-400">
                                    Trạng thái yêu cầu
                                </Text>
                            </View>
                            <View
                                className="px-3 py-1 rounded-full"
                                style={{ backgroundColor: `${priorityInfo.color}20` }}
                            >
                                <Text
                                    className="text-xs font-bold"
                                    style={{ color: priorityInfo.color }}
                                >
                                    {priorityInfo.label}
                                </Text>
                            </View>
                        </View>

                        {/* Thông tin lộ trình */}
                        {flight && (
                            <View className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow-lg">
                                <Text className="text-lg font-bold text-text-primary dark:text-white mb-3">
                                    Thông tin chuyến bay
                                </Text>

                                {/* Từ */}
                                <View className="flex-row items-center gap-4 py-2">
                                    <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-light dark:bg-slate-700">
                                        <MaterialIcons
                                            name="flight-takeoff"
                                            size={24}
                                            color="#1E293B"
                                            className="dark:text-white"
                                        />
                                    </View>
                                    <Text className="flex-1 text-base font-medium text-text-primary dark:text-white">
                                        {formatAirport(flight.from_airport) || "Chưa có thông tin"}
                                    </Text>
                                </View>

                                {/* Đường nối chấm */}
                                <View className="items-center py-1">
                                    <View className="h-6 w-0.5 border-l-2 border-dashed border-slate-300 dark:border-slate-600" />
                                </View>

                                {/* Đến */}
                                <View className="flex-row items-center gap-4 pb-3">
                                    <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-light dark:bg-slate-700">
                                        <MaterialIcons
                                            name="flight-land"
                                            size={24}
                                            color="#1E293B"
                                            className="dark:text-white"
                                        />
                                    </View>
                                    <Text className="flex-1 text-base font-medium text-text-primary dark:text-white">
                                        {formatAirport(flight.to_airport) || "Chưa có thông tin"}
                                    </Text>
                                </View>

                                <View className="h-px bg-slate-200 dark:bg-slate-700 my-3" />

                                {/* Thông tin chuyến bay */}
                                <View className="flex-row items-center gap-4 py-2">
                                    <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-light dark:bg-slate-700">
                                        <MaterialIcons
                                            name="flight"
                                            size={24}
                                            color="#1E293B"
                                            className="dark:text-white"
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm text-text-secondary dark:text-slate-400">
                                            Số hiệu chuyến bay
                                        </Text>
                                        <Text className="text-base font-medium text-text-primary dark:text-white">
                                            {formatFlightNumber(flight.flight_number) || "Chưa có thông tin"}
                                        </Text>
                                    </View>
                                </View>

                                <View className="h-px bg-slate-200 dark:bg-slate-700 my-3" />

                                {/* Ngày giờ */}
                                <View className="flex-row items-center gap-4 py-2">
                                    <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-light dark:bg-slate-700">
                                        <MaterialIcons
                                            name="calendar-month"
                                            size={24}
                                            color="#1E293B"
                                            className="dark:text-white"
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-base font-medium text-text-primary dark:text-white">
                                            {formatDate(flight.flight_date) || "Chưa có thông tin"}
                                        </Text>
                                        {request.time_slot && (
                                            <Text className="text-sm text-text-secondary dark:text-slate-400">
                                                {request.time_slot}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Chi tiết tài liệu */}
                        <View className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow-lg">
                            <Text className="text-lg font-bold text-text-primary dark:text-white mb-3">
                                Chi tiết tài liệu
                            </Text>

                            {/* Mô tả */}
                            <View className="flex-row items-start gap-4 py-2">
                                <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-light dark:bg-slate-700">
                                    <MaterialIcons
                                        name="description"
                                        size={24}
                                        color="#1E293B"
                                        className="dark:text-white"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm text-text-secondary dark:text-slate-400">
                                        Mô tả
                                    </Text>
                                    <Text className="text-base font-medium text-text-primary dark:text-white">
                                        {request.item_description || "Chưa có mô tả"}
                                    </Text>
                                </View>
                            </View>

                            <View className="h-px bg-slate-200 dark:bg-slate-700 my-3" />

                            {/* Giá trị */}
                            <View className="flex-row items-center gap-4 py-2">
                                <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-light dark:bg-slate-700">
                                    <MaterialIcons
                                        name="payments"
                                        size={24}
                                        color="#1E293B"
                                        className="dark:text-white"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm text-text-secondary dark:text-slate-400">
                                        Giá trị ước tính
                                    </Text>
                                    <Text className="text-base font-medium text-text-primary dark:text-white">
                                        {formatCurrency(request.item_value)}
                                    </Text>
                                </View>
                            </View>

                            <View className="h-px bg-slate-200 dark:bg-slate-700 my-3" />

                            {/* Phí nhận được */}
                            <View className="flex-row items-center gap-4 py-2">
                                <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-light dark:bg-slate-700">
                                    <MaterialIcons
                                        name="local-shipping"
                                        size={24}
                                        color="#1E293B"
                                        className="dark:text-white"
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm text-text-secondary dark:text-slate-400">
                                        Phí bạn nhận được
                                    </Text>
                                    <Text className="text-lg font-bold text-primary">
                                        {formatCurrency(request.reward)}
                                    </Text>
                                </View>
                            </View>

                            {request.note && (
                                <>
                                    <View className="h-px bg-slate-200 dark:bg-slate-700 my-3" />
                                    <View className="flex-row items-start gap-4 py-2">
                                        <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-light dark:bg-slate-700">
                                            <MaterialIcons
                                                name="note"
                                                size={24}
                                                color="#1E293B"
                                                className="dark:text-white"
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm text-text-secondary dark:text-slate-400">
                                                Ghi chú
                                            </Text>
                                            <Text className="text-base font-medium text-text-primary dark:text-white">
                                                {request.note}
                                            </Text>
                                        </View>
                                    </View>
                                </>
                            )}
                        </View>

                        {/* Thông tin hành khách */}
                        {customer && (
                            <View className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow-lg">
                                <View className="flex-row items-center justify-between mb-4">
                                    <Text className="text-lg font-bold text-text-primary dark:text-white">
                                        Thông tin hành khách
                                    </Text>
                                    {customer.kyc_status === 'verified' && (
                                        <View className="flex-row items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                                            <MaterialIcons name="verified" size={16} color="#10B981" />
                                            <Text className="text-xs font-semibold text-green-600 dark:text-green-400">
                                                Đã xác minh
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* Avatar và tên */}
                                <View className="flex-row items-center gap-4 mb-4">
                                    <Image
                                        source={{
                                            uri: getAvatarUrl(customer.avatar),
                                        }}
                                        className="h-16 w-16 rounded-full border-2 border-primary/20"
                                    />
                                    <View className="flex-1">
                                        <Text className="text-lg font-bold text-text-primary dark:text-white">
                                            {formatName(customer.name) || "Chưa có thông tin"}
                                        </Text>
                                        <View className="flex-row items-center gap-1 mt-1">
                                            <MaterialIcons name="star" size={14} color="#F97316" />
                                            <Text className="text-sm font-semibold text-secondary">
                                                5.0
                                            </Text>
                                            <Text className="text-xs text-text-secondary dark:text-slate-400">
                                                (Đánh giá)
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <View className="h-px bg-gray-200 dark:bg-slate-700 mb-4" />

                                {/* Thông tin liên hệ */}
                                <View className="gap-3">
                                    {customer.phone && (
                                        <View className="flex-row items-center gap-3">
                                            <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                                <MaterialIcons name="phone" size={20} color="#2563EB" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-xs text-text-secondary dark:text-slate-400 mb-0.5">
                                                    Số điện thoại
                                                </Text>
                                                <Text className="text-base font-medium text-text-primary dark:text-white">
                                                    {customer.phone}
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    // Có thể thêm chức năng gọi điện
                                                }}
                                                className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10"
                                            >
                                                <MaterialIcons name="call" size={20} color="#2563EB" />
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {customer.email && (
                                        <View className="flex-row items-center gap-3">
                                            <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                                <MaterialIcons name="email" size={20} color="#2563EB" />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-xs text-text-secondary dark:text-slate-400 mb-0.5">
                                                    Email
                                                </Text>
                                                <Text className="text-base font-medium text-text-primary dark:text-white" numberOfLines={1}>
                                                    {customer.email}
                                                </Text>
                                            </View>
                                        </View>
                                    )}

                                    {/* Xem profile */}
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (customer.id) {
                                                router.push(`/user_profile/${customer.id}`);
                                            }
                                        }}
                                        className="flex-row items-center justify-between mt-2 p-3 rounded-lg bg-primary/5 dark:bg-primary/10"
                                    >
                                        <View className="flex-row items-center gap-3">
                                            <MaterialIcons name="person" size={20} color="#2563EB" />
                                            <Text className="text-base font-semibold text-primary">
                                                Xem hồ sơ hành khách
                                            </Text>
                                        </View>
                                        <MaterialIcons name="chevron-right" size={20} color="#2563EB" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Thông tin hết hạn */}
                        {request.expires_at && (
                            <View className="rounded-xl bg-white dark:bg-slate-800 p-4 shadow-lg">
                                <View className="flex-row items-center gap-4">
                                    <View className="h-10 w-10 items-center justify-center rounded-lg bg-background-light dark:bg-slate-700">
                                        <MaterialIcons
                                            name="schedule"
                                            size={24}
                                            color="#1E293B"
                                            className="dark:text-white"
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm text-text-secondary dark:text-slate-400">
                                            Hết hạn vào
                                        </Text>
                                        <Text className="text-base font-medium text-text-primary dark:text-white">
                                            {formatDate(request.expires_at) || "Không xác định"}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

