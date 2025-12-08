import React, { useState, useEffect } from "react";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    Modal,
    TextInput,
    Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import api from "@/api/api";
import UserProfileInfo from "./components/UserProfileInfo";
import CitySelectModal from "./components/CitySelectModal";
import DatePickerInput from "./components/DatePickerInput";
import ItemTypeSelect from "./components/ItemTypeSelect";

export default function PassengerSearchResultsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [flights, setFlights] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterModalOpen, setFilterModalOpen] = useState(false);

    // Filter states
    const [filterDepartureCity, setFilterDepartureCity] = useState({
        value: params.departureCode as string || '',
        label: params.departureLabel as string || ''
    });
    const [filterArrivalCity, setFilterArrivalCity] = useState({
        value: params.arrivalCode as string || '',
        label: params.arrivalLabel as string || ''
    });
    const [filterDate, setFilterDate] = useState(params.date as string || '');
    const [filterTimeSlot, setFilterTimeSlot] = useState(params.timeSlot as string || '');
    const [filterItemType, setFilterItemType] = useState(params.item_type as string || '');
    const [filterItemValue, setFilterItemValue] = useState(params.item_value as string || '');

    // Extract params (for initial display)
    const departureCode = filterDepartureCity.value || params.departureCode as string || '';
    const departureLabel = filterDepartureCity.label || params.departureLabel as string || '';
    const arrivalCode = filterArrivalCity.value || params.arrivalCode as string || '';
    const arrivalLabel = filterArrivalCity.label || params.arrivalLabel as string || '';
    const date = filterDate || params.date as string || '';
    const timeSlot = filterTimeSlot || params.timeSlot as string || '';

    // Format date for display
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
            const dayName = days[date.getDay()];
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${dayName}, ${day}/${month}/${year}`;
        } catch {
            return dateStr;
        }
    };

    // Format flight date time
    const formatFlightDateTime = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
            const dayName = days[date.getDay()];
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${dayName}, ${day}/${month}/${year} • ${hours}:${minutes}`;
        } catch {
            return dateStr;
        }
    };

    useEffect(() => {
        fetchSearchResults();
    }, []);

    const fetchSearchResults = async (useFilter = false) => {
        try {
            setLoading(true);
            setError(null);

            // Determine which params to use
            const searchParams: any = {};

            if (useFilter) {
                // Use filter values
                if (filterDepartureCity.value) searchParams.from_airport = filterDepartureCity.value;
                if (filterArrivalCity.value) searchParams.to_airport = filterArrivalCity.value;
                if (filterDate) searchParams.date = filterDate;
                if (filterTimeSlot) searchParams.time_slot = filterTimeSlot;
                if (filterItemType) searchParams.item_type = filterItemType;
                if (filterItemValue) searchParams.item_value = filterItemValue;
            } else {
                // Use initial params or filter values
                if (filterDepartureCity.value || params.departureCode) {
                    searchParams.from_airport = filterDepartureCity.value || params.departureCode;
                }
                if (filterArrivalCity.value || params.arrivalCode) {
                    searchParams.to_airport = filterArrivalCity.value || params.arrivalCode;
                }
                if (filterDate || params.date) {
                    searchParams.date = filterDate || params.date;
                }
                if (filterTimeSlot || params.timeSlot) {
                    searchParams.time_slot = filterTimeSlot || params.timeSlot;
                }
                if (filterItemType || params.item_type) {
                    searchParams.item_type = filterItemType || params.item_type;
                }
                if (filterItemValue || params.item_value) {
                    searchParams.item_value = filterItemValue || params.item_value;
                }
            }

            // Check if searchResults passed via params (only on initial load)
            if (!useFilter && params.searchResults) {
                try {
                    const parsed = JSON.parse(params.searchResults as string);
                    if (Array.isArray(parsed)) {
                        setFlights(parsed);
                        setLoading(false);
                        return;
                    }
                } catch (e) {
                    console.error('Error parsing searchResults:', e);
                }
            }

            const response = await api.get('flights/search', { params: searchParams });

            let flightsData = [];
            if (response.data?.success && response.data?.data) {
                // Handle paginated response
                if (response.data.data?.data) {
                    flightsData = response.data.data.data;
                } else if (Array.isArray(response.data.data)) {
                    flightsData = response.data.data;
                }
            } else if (Array.isArray(response.data)) {
                flightsData = response.data;
            }

            setFlights(flightsData);
        } catch (err: any) {
            console.error('Error fetching search results:', err);
            setError(err.response?.data?.message || 'Không thể tải kết quả tìm kiếm');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilter = async () => {
        try {
            console.log('Applying filter:', {
                departure: filterDepartureCity.value,
                arrival: filterArrivalCity.value,
                date: filterDate,
                timeSlot: filterTimeSlot,
                itemType: filterItemType,
                itemValue: filterItemValue,
            });
            setFilterModalOpen(false);
            await fetchSearchResults(true);
        } catch (error) {
            console.error('Error applying filter:', error);
            setFilterModalOpen(false);
        }
    };

    const handleResetFilter = async () => {
        // Reset về giá trị ban đầu từ params
        const initialDeparture = params.departureCode as string || '';
        const initialDepartureLabel = params.departureLabel as string || '';
        const initialArrival = params.arrivalCode as string || '';
        const initialArrivalLabel = params.arrivalLabel as string || '';
        const initialDate = params.date as string || '';
        const initialTimeSlot = params.timeSlot as string || '';
        const initialItemType = params.item_type as string || '';
        const initialItemValue = params.item_value as string || '';

        setFilterDepartureCity({ value: initialDeparture, label: initialDepartureLabel });
        setFilterArrivalCity({ value: initialArrival, label: initialArrivalLabel });
        setFilterDate(initialDate);
        setFilterTimeSlot(initialTimeSlot);
        setFilterItemType(initialItemType);
        setFilterItemValue(initialItemValue);

        // Fetch lại với giá trị ban đầu
        setTimeout(async () => {
            await fetchSearchResults(false);
        }, 100);
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Kết quả tìm kiếm',
                    headerShown: true,
                }}
            />
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">

                {/* Filter Summary Bar */}
                <View className="px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-gray-700">
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: 8 }}
                    >
                        <View className="flex-row gap-2 items-center">
                            {filterDepartureCity.value && filterArrivalCity.value && (
                                <View className="flex-row items-center h-10 rounded-full bg-primary/10 dark:bg-primary/20 px-3 gap-2">
                                    <MaterialIcons name="flight-takeoff" size={16} color="#2563EB" />
                                    <Text className="text-xs font-medium text-text-dark-gray dark:text-gray-200" numberOfLines={1}>
                                        {filterDepartureCity.value} → {filterArrivalCity.value}
                                    </Text>
                                </View>
                            )}
                            {filterDate && (
                                <View className="flex-row items-center h-10 rounded-full bg-primary/10 dark:bg-primary/20 px-3 gap-2">
                                    <MaterialIcons name="calendar-month" size={16} color="#2563EB" />
                                    <Text className="text-xs font-medium text-text-dark-gray dark:text-gray-200" numberOfLines={1}>
                                        {formatDate(filterDate).split(',')[0]}
                                    </Text>
                                </View>
                            )}
                            {filterTimeSlot && (
                                <View className="flex-row items-center h-10 rounded-full bg-primary/10 dark:bg-primary/20 px-3 gap-2">
                                    <MaterialIcons name="schedule" size={16} color="#2563EB" />
                                    <Text className="text-xs font-medium text-text-dark-gray dark:text-gray-200" numberOfLines={1}>
                                        {filterTimeSlot}
                                    </Text>
                                </View>
                            )}
                            {filterItemType && (
                                <View className="flex-row items-center h-10 rounded-full bg-primary/10 dark:bg-primary/20 px-3 gap-2">
                                    <MaterialIcons name="category" size={16} color="#2563EB" />
                                    <Text className="text-xs font-medium text-text-dark-gray dark:text-gray-200" numberOfLines={1}>
                                        {filterItemType}
                                    </Text>
                                </View>
                            )}

                            {/* Nút filter */}
                            <TouchableOpacity
                                onPress={() => setFilterModalOpen(true)}
                                className="w-10 h-10 rounded-full bg-primary/20 dark:bg-primary/30 justify-center items-center"
                            >
                                <MaterialIcons name="filter-list" size={20} color="#2563EB" />
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </View>

                {/* Danh sách hành khách */}
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ padding: 16 }}
                    showsVerticalScrollIndicator={false}
                >
                    {loading ? (
                        <View className="py-20 items-center">
                            <ActivityIndicator size="large" color="#2563EB" />
                            <Text className="mt-4 text-gray-500 dark:text-gray-400">
                                Đang tải kết quả...
                            </Text>
                        </View>
                    ) : error ? (
                        <View className="py-20 items-center">
                            <MaterialIcons name="error-outline" size={48} color="#EF4444" />
                            <Text className="mt-4 text-gray-600 dark:text-gray-400 text-center">
                                {error}
                            </Text>
                            <TouchableOpacity
                                onPress={() => fetchSearchResults()}
                                className="mt-4 bg-primary px-6 py-3 rounded-lg">
                                <Text className="text-white font-bold">Thử lại</Text>
                            </TouchableOpacity>
                        </View>
                    ) : flights.length === 0 ? (
                        <View className="py-20 items-center">
                            <MaterialIcons name="flight" size={48} color="#9CA3AF" />
                            <Text className="mt-4 text-gray-600 dark:text-gray-400 text-center">
                                Không tìm thấy hành khách phù hợp
                            </Text>
                        </View>
                    ) : (
                        <View className="gap-4">
                            {flights.map((flight: any, index: number) => {
                                const customer = flight.customer || {};
                                const availableWeight = flight.available_weight || 0;
                                const flightNumber = flight.flight_number || '';
                                const route = flight.from_airport && flight.to_airport
                                    ? `${flight.from_airport} → ${flight.to_airport}`
                                    : '';

                                return (
                                    <View
                                        key={flight.id || flight.uuid || index}
                                        className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                                    >
                                        {/* Header: Avatar + tên + rating */}
                                        <View className="flex-row items-center justify-between mb-3">
                                            <View className="flex-row items-center flex-1">
                                                <UserProfileInfo
                                                    avatar={customer.avatar}
                                                    name={customer.name || 'Người dùng'}
                                                    size="large"
                                                    showVerified={true}
                                                />
                                            </View>
                                            <View className="flex-row items-center gap-1">
                                                <MaterialIcons name="star" size={16} color="#F97316" />
                                                <Text className="text-sm font-semibold text-secondary">
                                                    5.0
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="h-px bg-gray-200 dark:bg-slate-700 mb-4" />

                                        {/* Thông tin chi tiết */}
                                        <View className="flex-row gap-3 mb-3">
                                            <View className="flex-1">
                                                <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    Chuyến bay
                                                </Text>
                                                <Text className="text-sm font-semibold text-text-dark-gray dark:text-white" numberOfLines={2}>
                                                    {flightNumber ? `${flightNumber}` : 'N/A'}
                                                </Text>
                                                {route && (
                                                    <Text className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                                        {route}
                                                    </Text>
                                                )}
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                    Hành lý trống
                                                </Text>
                                                <Text className="text-base font-bold text-primary">
                                                    {availableWeight}kg
                                                </Text>
                                            </View>
                                        </View>

                                        <View className="mb-4">
                                            <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                Thời gian
                                            </Text>
                                            <Text className="text-sm font-semibold text-text-dark-gray dark:text-white">
                                                {formatFlightDateTime(flight.flight_date || date)}
                                            </Text>
                                        </View>

                                        {/* Nút gửi yêu cầu */}
                                        <TouchableOpacity
                                            onPress={() => {
                                                router.push({
                                                    pathname: '/request_order',
                                                    params: {
                                                        flight_id: flight.id || flight.uuid,
                                                        customer_id: customer.id,
                                                        flight_data: JSON.stringify({
                                                            id: flight.id || flight.uuid,
                                                            from_airport: flight.from_airport,
                                                            to_airport: flight.to_airport,
                                                            flight_number: flight.flight_number,
                                                            flight_date: flight.flight_date,
                                                            customer: customer,
                                                        }),
                                                    }
                                                });
                                            }}
                                            className="h-12 rounded-xl bg-primary justify-center items-center shadow-sm"
                                            activeOpacity={0.8}
                                        >
                                            <Text className="text-white text-base font-bold">
                                                Gửi yêu cầu
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </ScrollView>

                {/* Filter Modal - Full Screen */}
                <Modal
                    visible={filterModalOpen}
                    animationType="slide"
                    transparent={false}
                    onRequestClose={() => setFilterModalOpen(false)}
                >
                    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
                        {/* Header */}
                        <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                            <Text className="text-lg font-bold text-text-dark-gray dark:text-white">
                                Bộ lọc tìm kiếm
                            </Text>
                            <TouchableOpacity
                                onPress={() => setFilterModalOpen(false)}
                                className="p-2"
                            >
                                <MaterialIcons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView className="flex-1 px-4 py-4 bg-background-light dark:bg-background-dark" showsVerticalScrollIndicator={false}>
                            <View className="gap-4 pb-6">
                                {/* Sân bay đi / đến */}
                                <View className="flex-row gap-3">
                                    <View className="flex-1">
                                        <Text className="text-sm font-medium text-text-dark-gray dark:text-white/90 pb-2">
                                            Sân bay đi
                                        </Text>
                                        <CitySelectModal
                                            placeholder="VD: SGN"
                                            iconName="flight-takeoff"
                                            value={filterDepartureCity.value}
                                            onValueChange={(value, label) => setFilterDepartureCity({ value, label })}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm font-medium text-text-dark-gray dark:text-white/90 pb-2">
                                            Sân bay đến
                                        </Text>
                                        <CitySelectModal
                                            placeholder="VD: HAN"
                                            iconName="flight-land"
                                            value={filterArrivalCity.value}
                                            onValueChange={(value, label) => setFilterArrivalCity({ value, label })}
                                        />
                                    </View>
                                </View>

                                {/* Ngày gửi */}
                                <View>
                                    <DatePickerInput
                                        label="Ngày gửi"
                                        placeholder="Chọn ngày"
                                        value={filterDate}
                                        onValueChange={setFilterDate}
                                        minimumDate={new Date()}
                                    />
                                </View>

                                {/* Khung giờ */}
                                <View>
                                    <Text className="text-sm font-medium text-text-dark-gray dark:text-white/90 pb-2">
                                        Khung giờ ưu tiên
                                    </Text>
                                    <View className="relative">
                                        <MaterialIcons
                                            name="schedule"
                                            size={20}
                                            color="#6b7280"
                                            style={{ position: 'absolute', left: 12, top: 17, zIndex: 10 }}
                                        />
                                        <TextInput
                                            placeholder="Buổi sáng (6h-12h)"
                                            value={filterTimeSlot}
                                            onChangeText={setFilterTimeSlot}
                                            className="h-14 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 pl-10 pr-4 text-text-dark-gray dark:text-white"
                                        />
                                    </View>
                                </View>

                                {/* Loại tài liệu */}
                                <View>
                                    <Text className="text-sm font-medium text-text-dark-gray dark:text-white/90 pb-2">
                                        Loại tài liệu
                                    </Text>
                                    <ItemTypeSelect
                                        placeholder="Chọn loại tài liệu"
                                        value={filterItemType}
                                        onValueChange={setFilterItemType}
                                    />
                                </View>

                                {/* Giá trị ước tính */}
                                <View>
                                    <Text className="text-sm font-medium text-text-dark-gray dark:text-white/90 pb-2">
                                        Giá trị ước tính tài liệu (VND)
                                    </Text>
                                    <View className="relative">
                                        <MaterialIcons
                                            name="payments"
                                            size={20}
                                            color="#6b7280"
                                            style={{ position: 'absolute', left: 12, top: 17, zIndex: 10 }}
                                        />
                                        <TextInput
                                            placeholder="Ví dụ: 5,000,000"
                                            keyboardType="numeric"
                                            value={filterItemValue}
                                            onChangeText={setFilterItemValue}
                                            className="h-14 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 pl-10 pr-4 text-text-dark-gray dark:text-white"
                                        />
                                    </View>
                                </View>
                            </View>
                        </ScrollView>

                        {/* Footer buttons */}
                        <View className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 flex-row gap-3 bg-white dark:bg-gray-800">
                            <TouchableOpacity
                                onPress={handleResetFilter}
                                className="flex-1 h-12 rounded-xl border-2 border-gray-300 dark:border-gray-600 justify-center items-center"
                                activeOpacity={0.7}
                            >
                                <Text className="text-gray-700 dark:text-gray-300 font-bold text-base">
                                    Đặt lại
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={handleApplyFilter}
                                className="flex-1 h-12 rounded-xl bg-primary justify-center items-center shadow-sm"
                                activeOpacity={0.8}
                            >
                                <Text className="text-white font-bold text-base">
                                    Áp dụng
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </Modal>
            </SafeAreaView>
        </>
    );
}