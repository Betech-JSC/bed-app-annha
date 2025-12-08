import React from "react";
import {
    View,
    Text,
    TouchableOpacity,
    ImageBackground,
    Image,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAvatarUrl } from "@/constants/avatars";
import { getAirlineLogo } from "@/constants/airlines";

interface OrderDetailContentProps {
    order: any;
    loading?: boolean;
    error?: string | null;
    onRetry?: () => void;
}

export default function OrderDetailContent({
    order,
    loading = false,
    error = null,
    onRetry,
}: OrderDetailContentProps) {
    const router = useRouter();

    const getStatusLabel = (status: string) => {
        const statusMap: { [key: string]: { label: string; step: number } } = {
            'confirmed': { label: 'Đã xác nhận', step: 1 },
            'picked_up': { label: 'Đã lấy hàng', step: 2 },
            'in_transit': { label: 'Đang vận chuyển', step: 3 },
            'delivered': { label: 'Đã giao hàng', step: 3 },
            'completed': { label: 'Hoàn thành', step: 4 },
            'cancelled': { label: 'Đã hủy', step: 0 },
        };
        return statusMap[status] || { label: status, step: 0 };
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

    const formatTime = (dateString: string | null | undefined): string | null => {
        if (!dateString) return null;
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return null;
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        } catch {
            return null;
        }
    };

    const formatAirport = (airport: string | null | undefined): string | null => {
        if (!airport || airport.trim() === '') return null;
        return airport.trim();
    };

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#2563EB" />
                <Text className="mt-4 text-gray-600 dark:text-gray-400">Đang tải...</Text>
            </View>
        );
    }

    if (error || !order) {
        return (
            <View className="flex-1 items-center justify-center px-6">
                <MaterialIcons name="error-outline" size={64} color="#EF4444" />
                <Text className="mt-4 text-center text-lg font-semibold text-gray-700 dark:text-gray-300">
                    {error || 'Không tìm thấy đơn hàng'}
                </Text>
                {onRetry && (
                    <TouchableOpacity
                        onPress={onRetry}
                        className="mt-6 rounded-lg bg-primary px-6 py-3"
                    >
                        <Text className="font-bold text-white">Thử lại</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    const partner = order.partner || (order.is_sender ? order.customer : order.sender) || {};
    const flight = order.flight || {};
    const request = order.request || {};
    const statusInfo = getStatusLabel(order.status || 'confirmed');
    const isSender = order.is_sender || false;

    return (
        <>
            <ScrollView className="flex-1 px-4 pb-32" showsVerticalScrollIndicator={false}>
                {/* Progress Bar */}
                <View className="bg-card-light dark:bg-card-dark rounded-xl p-4 shadow-sm mb-4 mt-4">
                    <View className="flex-row justify-between mb-3">
                        <Text className="font-bold text-base">{statusInfo.label}</Text>
                        <Text className="text-sm font-medium text-secondary-light dark:text-secondary-dark">
                            {statusInfo.step}/4 bước
                        </Text>
                    </View>

                    <View className="h-2 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
                        <View
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(statusInfo.step / 4) * 100}%` }}
                        />
                    </View>

                    <View className="flex-row justify-between mt-2 text-xs text-secondary-light dark:text-secondary-dark">
                        <Text className={statusInfo.step >= 1 ? 'font-bold text-primary' : ''}>Tìm đối tác</Text>
                        <Text className={statusInfo.step >= 2 ? 'font-bold text-primary' : ''}>Ghép nối</Text>
                        <Text className={statusInfo.step >= 3 ? 'font-bold text-primary' : ''}>Vận chuyển</Text>
                        <Text className={statusInfo.step >= 4 ? 'font-bold text-primary' : ''}>Hoàn thành</Text>
                    </View>
                </View>

                {/* Thông tin đơn hàng */}
                <View className="bg-card-light dark:bg-card-dark rounded-xl p-4 shadow-sm mb-4">
                    <Text className="text-lg font-bold mb-4">Thông tin đơn hàng</Text>

                    {(formatAirport(flight.from_airport) || formatAirport(flight.to_airport)) && (
                        <View className="flex-row items-center gap-3 mb-4">
                            <MaterialIcons name="flight-takeoff" size={24} color="#2463EB" />
                            <View className="flex-1">
                                <Text className="text-sm text-secondary-light dark:text-secondary-dark">
                                    Tuyến đường
                                </Text>
                                <Text className="font-semibold text-base">
                                    {formatAirport(flight.from_airport) || 'Chưa có'} → {formatAirport(flight.to_airport) || 'Chưa có'}
                                </Text>
                            </View>
                        </View>
                    )}

                    {formatDate(flight.flight_date) && (
                        <View className="flex-row items-center gap-3 mb-4">
                            <MaterialIcons name="schedule" size={24} color="#2463EB" />
                            <View className="flex-1">
                                <Text className="text-sm text-secondary-light dark:text-secondary-dark">
                                    Thời gian
                                </Text>
                                <Text className="font-semibold text-base">
                                    {formatDate(flight.flight_date)}
                                </Text>
                                {request.time_slot && (
                                    <Text className="text-xs text-gray-500 mt-1">
                                        Khung giờ: {request.time_slot === 'morning' ? 'Buổi sáng' :
                                            request.time_slot === 'afternoon' ? 'Buổi chiều' :
                                                request.time_slot === 'evening' ? 'Buổi tối' : 'Bất kỳ'}
                                    </Text>
                                )}
                            </View>
                        </View>
                    )}

                    {request.item_description && (
                        <View className="flex-row items-center gap-3 mb-4">
                            <MaterialIcons name="folder" size={24} color="#2463EB" />
                            <View className="flex-1">
                                <Text className="text-sm text-secondary-light dark:text-secondary-dark">
                                    Mô tả tài liệu
                                </Text>
                                <Text className="font-semibold text-base">{request.item_description}</Text>
                            </View>
                        </View>
                    )}

                    <View className="flex-row items-center gap-3 mb-4">
                        <MaterialIcons name="payments" size={24} color="#2463EB" />
                        <View className="flex-1">
                            <Text className="text-sm text-secondary-light dark:text-secondary-dark">
                                Phần thưởng
                            </Text>
                            <Text className="font-semibold text-base">
                                {Number(order.reward || 0).toLocaleString('vi-VN')} VNĐ
                            </Text>
                        </View>
                    </View>

                    {request.item_value && (
                        <View className="flex-row items-center gap-3 mb-4">
                            <MaterialIcons name="attach-money" size={24} color="#2463EB" />
                            <View className="flex-1">
                                <Text className="text-sm text-secondary-light dark:text-secondary-dark">
                                    Giá trị tài liệu
                                </Text>
                                <Text className="font-semibold text-base">
                                    {Number(request.item_value || 0).toLocaleString('vi-VN')} VNĐ
                                </Text>
                            </View>
                        </View>
                    )}

                    {order.tracking_code && (
                        <View className="flex-row items-center gap-3">
                            <MaterialIcons name="qr-code" size={24} color="#2463EB" />
                            <View className="flex-1">
                                <Text className="text-sm text-secondary-light dark:text-secondary-dark">
                                    Mã theo dõi
                                </Text>
                                <Text className="font-semibold text-base">{order.tracking_code}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Thông tin đối tác */}
                <View className="flex-row bg-card-light dark:bg-card-dark rounded-xl p-4 shadow-sm mb-4 gap-4">
                    <View className="flex-1">
                        <Text className="text-lg font-bold mb-1">
                            {isSender ? 'Thông tin hành khách' : 'Thông tin người gửi'}
                        </Text>
                        <Text className="font-semibold text-base">{partner.name || 'Chưa có thông tin'}</Text>
                        {partner.phone && (
                            <Text className="text-sm text-secondary-light dark:text-secondary-dark mt-1">
                                {partner.phone}
                            </Text>
                        )}
                        {partner.email && (
                            <Text className="text-sm text-secondary-light dark:text-secondary-dark">
                                {partner.email}
                            </Text>
                        )}
                        <TouchableOpacity
                            onPress={() => {
                                // partner có thể là sender hoặc customer object từ API
                                const partnerId = partner.id || partner.user_id || (isSender ? order.customer_id : order.sender_id);
                                if (partnerId) {
                                    router.push({
                                        pathname: '/user_profile/[userId]',
                                        params: {
                                            userId: String(partnerId),
                                            userName: partner.name || partner.name,
                                            userAvatar: getAvatarUrl(partner.avatar),
                                            userRole: partner.role || (isSender ? 'customer' : 'sender'),
                                        },
                                    });
                                }
                            }}
                            className="mt-3 px-4 py-2 border border-border-light dark:border-border-dark rounded-lg self-start"
                        >
                            <Text className="text-sm font-semibold text-primary">Xem hồ sơ</Text>
                        </TouchableOpacity>
                    </View>

                    <ImageBackground
                        source={{
                            uri: getAvatarUrl(partner.avatar),
                        }}
                        className="w-20 h-20 rounded-full overflow-hidden"
                        resizeMode="cover"
                    />
                </View>

                {/* Thông tin chuyến bay */}
                {flight.flight_number && (
                    <View className="bg-card-light dark:bg-card-dark rounded-xl p-4 shadow-sm mb-4">
                        <Text className="text-lg font-bold mb-3">Thông tin chuyến bay</Text>
                        <View className="flex-row items-center gap-3 mb-3">
                            <Image
                                source={{ uri: getAirlineLogo(flight.airline) }}
                                className="h-12 w-12"
                                resizeMode="contain"
                            />
                            <View className="flex-1">
                                <Text className="text-sm text-secondary-light dark:text-secondary-dark mb-1">
                                    Hãng bay:
                                </Text>
                                <Text className="font-semibold text-base">{flight.airline || 'Chưa có thông tin'}</Text>
                            </View>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-sm text-secondary-light dark:text-secondary-dark">
                                Số hiệu chuyến:
                            </Text>
                            <Text className="font-semibold text-base">{flight.flight_number}</Text>
                        </View>
                    </View>
                )}


                {/* Ghi chú */}
                {(request.note || order.customer_note) && (
                    <View className="bg-card-light dark:bg-card-dark rounded-xl p-4 shadow-sm mb-4">
                        <Text className="text-lg font-bold mb-3">Ghi chú</Text>
                        <Text className="text-sm text-text-primary-light dark:text-text-primary-dark">
                            {order.customer_note || request.note || ''}
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Floating Action Button */}
            {partner.name && order.chat_id && (
                <View className="absolute bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                    <TouchableOpacity
                        onPress={() => {
                            router.push({
                                pathname: '/chat/[chatId]',
                                params: {
                                    chatId: order.chat_id,
                                    partnerName: partner.name,
                                    partnerAvatar: partner.avatar,
                                }
                            });
                        }}
                        className="flex-row items-center justify-center bg-primary h-12 rounded-xl shadow-lg mx-4"
                    >
                        <MaterialIcons name="chat" size={20} color="white" />
                        <Text className="text-white font-bold text-base ml-2">
                            Mở chat với {partner.name}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </>
    );
}

