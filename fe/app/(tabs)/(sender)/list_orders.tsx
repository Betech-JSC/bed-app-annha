import React, { useEffect, useState } from "react";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import api from "@/api/api";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import ItemOrder from "app/components/ItemOrder";
import { router, Stack } from "expo-router";
import { getAvatarUrl } from "@/constants/avatars";

function ListOrder() {
    const user = useSelector((state: RootState) => state.user);
    const role = user?.role;

    const [activeTab, setActiveTab] = useState<'orders' | 'requests'>('orders');
    const [orderStatusFilter, setOrderStatusFilter] = useState<string>(''); // 'confirmed', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'
    const [requestStatusFilter, setRequestStatusFilter] = useState<string>(''); // 'pending', 'accepted', 'declined', 'confirmed', 'expired', 'cancelled'
    const [orders, setOrders] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingRequests, setLoadingRequests] = useState(false);



    // Map order status to Vietnamese
    const getStatusLabel = (status: string) => {
        const statusMap: { [key: string]: { label: string; color: string } } = {
            'confirmed': { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
            'picked_up': { label: 'Đã lấy hàng', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
            'in_transit': { label: 'Đang vận chuyển', color: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' },
            'delivered': { label: 'Đã giao hàng', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
            'completed': { label: 'Hoàn thành', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
            'cancelled': { label: 'Đã hủy', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
            'pending': { label: 'Chờ xác nhận', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
            'accepted': { label: 'Đã chấp nhận', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
            'declined': { label: 'Đã từ chối', color: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' },
            'expired': { label: 'Hết hạn', color: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400' },
        };
        return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400' };
    };

    // Danh sách các filter tabs cho orders
    const orderFilterTabs = [
        { label: 'Tất cả', status: '' },
        { label: 'Đã xác nhận', status: 'confirmed' },
        { label: 'Đã lấy hàng', status: 'picked_up' },
        { label: 'Đang vận chuyển', status: 'in_transit' },
        { label: 'Đã giao hàng', status: 'delivered' },
        { label: 'Hoàn thành', status: 'completed' },
        { label: 'Đã hủy', status: 'cancelled' },
    ];

    // Danh sách các filter tabs cho requests
    const requestFilterTabs = [
        { label: 'Tất cả', status: '' },
        { label: 'Chờ xác nhận', status: 'pending' },
        { label: 'Đã chấp nhận', status: 'accepted' },
        { label: 'Đã xác nhận', status: 'confirmed' },
        { label: 'Đã từ chối', status: 'declined' },
        { label: 'Hết hạn', status: 'expired' },
        { label: 'Đã hủy', status: 'cancelled' },
    ];

    useEffect(() => {
        if (activeTab === 'orders') {
            fetchOrders();
        } else {
            fetchRequests();
        }
    }, [activeTab, orderStatusFilter, requestStatusFilter, role]);

    const fetchOrders = async () => {
        if (!role) return;

        try {
            setLoading(true);
            setError(null);

            const params: any = {};
            if (orderStatusFilter) {
                params.status = orderStatusFilter;
            }

            const response = await api.get("orders/getList", { params });

            if (response.data?.success) {
                const ordersData = response.data.data?.data || response.data.data || [];
                setOrders(ordersData);
            } else if (response.data?.success) {
                const ordersData = response.data.data?.orders?.data || response.data.data || [];
                setOrders(ordersData);
            }
        } catch (err: any) {
            console.error('Error fetching orders:', err);
            setError(err.response?.data?.message || "Không thể tải danh sách đơn hàng");
        } finally {
            setLoading(false);
        }
    };

    const fetchRequests = async () => {
        try {
            setLoadingRequests(true);
            setError(null);

            const params: any = {};
            if (requestStatusFilter) {
                params.status = requestStatusFilter;
            }

            const response = await api.get("private-requests", { params });

            let requestsData = [];
            if (response.data?.data) {
                // Handle paginated response
                if (response.data.data?.data) {
                    requestsData = response.data.data.data;
                } else if (Array.isArray(response.data.data)) {
                    requestsData = response.data.data;
                }
            } else if (Array.isArray(response.data)) {
                requestsData = response.data;
            }

            setRequests(requestsData);
        } catch (err: any) {
            console.error('Error fetching requests:', err);
            setError(err.response?.data?.message || "Không thể tải danh sách yêu cầu");
        } finally {
            setLoadingRequests(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }


    return (
        <>
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
                {/* Main Tabs: Orders vs Requests */}
                <View className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <View className="flex-row mx-4">
                        <TouchableOpacity
                            onPress={() => {
                                setActiveTab('orders');
                                // Reset request filter khi chuyển sang tab orders
                                setRequestStatusFilter('');
                            }}
                            className="flex-1 items-center py-4"
                        >
                            <Text
                                className={`text-sm font-bold pb-3 ${activeTab === 'orders'
                                    ? "text-primary border-b-3 border-primary"
                                    : "text-text-secondary dark:text-gray-400 border-b-3 border-transparent"
                                    }`}
                            >
                                Đơn hàng
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                setActiveTab('requests');
                                // Reset order filter khi chuyển sang tab requests
                                setOrderStatusFilter('');
                            }}
                            className="flex-1 items-center py-4"
                        >
                            <Text
                                className={`text-sm font-bold pb-3 ${activeTab === 'requests'
                                    ? "text-primary border-b-3 border-primary"
                                    : "text-text-secondary dark:text-gray-400 border-b-3 border-transparent"
                                    }`}
                            >
                                Yêu cầu đã gửi
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Status Filter Tabs for Orders */}
                {activeTab === 'orders' && (
                    <View className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="flex-row"
                            contentContainerStyle={{ paddingHorizontal: 16 }}
                        >
                            {orderFilterTabs.map((tab) => {
                                const isActive = orderStatusFilter === tab.status;
                                return (
                                    <TouchableOpacity
                                        key={tab.status || 'all'}
                                        onPress={() => setOrderStatusFilter(tab.status)}
                                        className="items-center py-4 px-3 mr-2"
                                    >
                                        <Text
                                            className={`text-sm font-bold pb-3 ${isActive
                                                ? "text-primary border-b-2 border-primary"
                                                : "text-text-secondary dark:text-gray-400 border-b-2 border-transparent"
                                                }`}
                                        >
                                            {tab.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Status Filter Tabs for Requests */}
                {activeTab === 'requests' && (
                    <View className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="flex-row"
                            contentContainerStyle={{ paddingHorizontal: 16 }}
                        >
                            {requestFilterTabs.map((tab) => {
                                const isActive = requestStatusFilter === tab.status;
                                return (
                                    <TouchableOpacity
                                        key={tab.status || 'all'}
                                        onPress={() => setRequestStatusFilter(tab.status)}
                                        className="items-center py-4 px-3 mr-2"
                                    >
                                        <Text
                                            className={`text-sm font-bold pb-3 ${isActive
                                                ? "text-primary border-b-2 border-primary"
                                                : "text-text-secondary dark:text-gray-400 border-b-2 border-transparent"
                                                }`}
                                        >
                                            {tab.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Content List */}
                <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
                    {activeTab === 'orders' ? (
                        // Orders List
                        loading ? (
                            <View className="items-center pt-16">
                                <ActivityIndicator size="large" color="#2563EB" />
                            </View>
                        ) : orders.length === 0 ? (
                            <View className="items-center pt-16">
                                <View className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center">
                                    <MaterialIcons name="inventory-2" size={48} color="#9CA3AF" />
                                </View>
                                <Text className="mt-5 text-lg font-bold text-text-primary dark:text-white">
                                    Chưa có đơn hàng nào
                                </Text>
                                <Text className="text-sm text-text-secondary dark:text-gray-400 mt-1 text-center px-8">
                                    Khi bạn có đơn hàng, chúng sẽ xuất hiện ở đây.
                                </Text>
                            </View>
                        ) : (
                            orders.map((order: any) => {
                                const flight = order.flight || {};
                                const customer = order.customer || order.partner || {};
                                const statusInfo = getStatusLabel(order.status || 'pending');

                                return (
                                    <View
                                        key={order.id || order.uuid}
                                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-4"
                                    >
                                        {/* Header: ID + Status */}
                                        <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                            <Text className="text-sm font-semibold text-text-secondary dark:text-gray-400">
                                                #{order.uuid || order.id}
                                            </Text>
                                            <View className={`px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                                                <Text className="text-xs font-bold">{statusInfo.label}</Text>
                                            </View>
                                        </View>

                                        {/* Route */}
                                        <View className="px-4 py-6">
                                            <View className="flex-row items-center justify-between">
                                                <Text className="text-xl font-bold text-text-primary dark:text-white">
                                                    {flight.from_airport || order.from || 'Chưa có'}
                                                </Text>
                                                <View className="flex-row items-center gap-2">
                                                    <View className="w-4 h-px bg-gray-300 dark:bg-gray-600" />
                                                    <MaterialIcons name="flight-takeoff" size={20} color="#2563EB" />
                                                    <View className="w-4 h-px bg-gray-300 dark:bg-gray-600" />
                                                </View>
                                                <Text className="text-xl font-bold text-text-primary dark:text-white">
                                                    {flight.to_airport || order.to || 'Chưa có'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="h-px bg-gray-100 dark:bg-gray-700" />

                                        {/* Customer Info + Price */}
                                        <View className="flex-row items-center justify-between px-4 py-4 gap-3">
                                            <View className="flex-row items-center gap-3 flex-1">
                                                <Image
                                                    source={{ uri: getAvatarUrl(customer.avatar) }}
                                                    className="w-10 h-10 rounded-full"
                                                />
                                                <View>
                                                    <Text className="font-semibold text-text-primary dark:text-white text-sm">
                                                        {customer.name || 'Hành khách'}
                                                    </Text>
                                                    <View className="flex-row items-center gap-1 mt-0.5">
                                                        <Text className="text-xs text-text-secondary dark:text-gray-400">
                                                            Hành khách
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>

                                            <View className="items-end">
                                                <Text className="font-bold text-text-primary dark:text-white">
                                                    {order.reward ? `${Number(order.reward).toLocaleString('vi-VN')}đ` : 'Chưa có'}
                                                </Text>
                                                {order.fee && (
                                                    <Text className="text-xs text-text-secondary dark:text-gray-400">
                                                        Phí: {order.fee}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>

                                        {/* Action Buttons */}
                                        <View className="px-4 pb-4 pt-0 gap-2">
                                            <View className="flex-row gap-2">
                                                <TouchableOpacity
                                                    onPress={() => router.push({
                                                        pathname: '/orders_details',
                                                        params: { orderId: order.id || order.uuid }
                                                    })}
                                                    className="bg-primary flex-1 h-11 rounded-lg items-center justify-center"
                                                >
                                                    <Text className="text-white font-bold text-sm">Xem chi tiết</Text>
                                                </TouchableOpacity>

                                                {customer.name && (
                                                    <TouchableOpacity
                                                        onPress={() => {
                                                            // Use chat_id if available, otherwise use order id/uuid
                                                            const chatId = order.chat_id || order.id || order.uuid;
                                                            router.push({
                                                                pathname: '/chat/[chatId]',
                                                                params: {
                                                                    chatId: String(chatId),
                                                                    partnerName: customer.name || 'Hành khách',
                                                                    partnerAvatar: getAvatarUrl(customer.avatar),
                                                                }
                                                            } as any);
                                                        }}
                                                        className="bg-blue-600 h-11 rounded-lg items-center justify-center px-4"
                                                    >
                                                        <MaterialIcons name="chat" size={20} color="white" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )
                    ) : (
                        // Requests List
                        loadingRequests ? (
                            <View className="items-center pt-16">
                                <ActivityIndicator size="large" color="#2563EB" />
                            </View>
                        ) : requests.length === 0 ? (
                            <View className="items-center pt-16">
                                <View className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full items-center justify-center">
                                    <MaterialIcons name="send" size={48} color="#9CA3AF" />
                                </View>
                                <Text className="mt-5 text-lg font-bold text-text-primary dark:text-white">
                                    Chưa có yêu cầu nào
                                </Text>
                                <Text className="text-sm text-text-secondary dark:text-gray-400 mt-1 text-center px-8">
                                    Các yêu cầu bạn đã gửi tới hành khách sẽ xuất hiện ở đây.
                                </Text>
                            </View>
                        ) : (
                            requests.map((request: any) => {
                                const flight = request.flight || {};
                                const customer = flight.customer || {};
                                const statusInfo = getStatusLabel(request.status || 'pending');

                                return (
                                    <View
                                        key={request.id || request.uuid}
                                        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-4"
                                    >
                                        {/* Header: ID + Status */}
                                        <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                                            <Text className="text-sm font-semibold text-text-secondary dark:text-gray-400">
                                                #{request.uuid || request.id}
                                            </Text>
                                            <View className={`px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                                                <Text className="text-xs font-bold">{statusInfo.label}</Text>
                                            </View>
                                        </View>

                                        {/* Route */}
                                        <View className="px-4 py-6">
                                            <View className="flex-row items-center justify-between">
                                                <Text className="text-xl font-bold text-text-primary dark:text-white">
                                                    {flight.from_airport || 'Chưa có'}
                                                </Text>
                                                <View className="flex-row items-center gap-2">
                                                    <View className="w-4 h-px bg-gray-300 dark:bg-gray-600" />
                                                    <MaterialIcons name="flight-takeoff" size={20} color="#2563EB" />
                                                    <View className="w-4 h-px bg-gray-300 dark:bg-gray-600" />
                                                </View>
                                                <Text className="text-xl font-bold text-text-primary dark:text-white">
                                                    {flight.to_airport || 'Chưa có'}
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="h-px bg-gray-100 dark:bg-gray-700" />

                                        {/* Customer Info + Reward */}
                                        <View className="flex-row items-center justify-between px-4 py-4 gap-3">
                                            <View className="flex-row items-center gap-3 flex-1">
                                                <Image
                                                    source={{ uri: getAvatarUrl(customer.avatar) }}
                                                    className="w-10 h-10 rounded-full"
                                                />
                                                <View>
                                                    <Text className="font-semibold text-text-primary dark:text-white text-sm">
                                                        {customer.name || 'Hành khách'}
                                                    </Text>
                                                    <Text className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">
                                                        {flight.flight_number || ''} • {flight.flight_date ? new Date(flight.flight_date).toLocaleDateString('vi-VN') : ''}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View className="items-end">
                                                <Text className="font-bold text-text-primary dark:text-white">
                                                    {request.reward ? `${Number(request.reward).toLocaleString('vi-VN')}đ` : 'Chưa có'}
                                                </Text>
                                                <Text className="text-xs text-text-secondary dark:text-gray-400">
                                                    Phần thưởng
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Action Button */}
                                        <View className="px-4 pb-4 pt-0">
                                            <TouchableOpacity
                                                onPress={() => router.push({
                                                    pathname: '/private-requests/[id]',
                                                    params: { id: request.id || request.uuid }
                                                })}
                                                className="bg-primary h-11 rounded-lg items-center justify-center"
                                            >
                                                <Text className="text-white font-bold text-sm">Xem chi tiết</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })
                        )
                    )}
                </ScrollView>
            </SafeAreaView>
        </>
    );
}

export default ListOrder;
