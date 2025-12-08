import React, { useState, useEffect } from "react";
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import api from "@/api/api";
import OrderDetailContent from "../app/components/OrderDetailContent";

/**
 * Màn hình chi tiết đơn hàng - Sử dụng chung cho cả sender và customer
 * Component này chỉ xử lý logic fetch data và navigation
 * UI được render bởi OrderDetailContent component
 */
export default function OrderDetailScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const orderId = params.orderId as string || params.id as string || '';

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails();
        }
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.get(`orders/${orderId}/show`);
            let orderData = response.data?.data || response.data;

            if (!orderData) {
                throw new Error('Không tìm thấy đơn hàng');
            }

            setOrder(orderData);
        } catch (err: any) {
            console.error('Error fetching order details:', err);
            setError(err.response?.data?.message || 'Không thể tải thông tin đơn hàng');
            if (err.response?.status === 401) {
                Alert.alert('Phiên hết hạn', 'Vui lòng đăng nhập lại', [
                    { text: 'OK', onPress: () => router.replace('/login') },
                ]);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: order ? `Đơn hàng #${order.uuid || order.id}` : 'Chi tiết đơn hàng',
                    headerShown: true,
                }}
            />
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
                {/* Order Detail Content - Component chung cho cả sender và customer */}
                <OrderDetailContent
                    order={order}
                    loading={loading}
                    error={error}
                    onRetry={fetchOrderDetails}
                />
            </SafeAreaView>
        </>
    );
}

