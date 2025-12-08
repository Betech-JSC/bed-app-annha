// app/request_order.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Image,
    ActivityIndicator,
    SafeAreaView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import api from '@/api/api';
import ItemTypeSelect from './components/ItemTypeSelect';
import { getAvatarUrl } from '@/constants/avatars';

export default function RequestOrderScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    // Form state
    const [reward, setReward] = useState('');
    const [itemValue, setItemValue] = useState('');
    const [itemDescription, setItemDescription] = useState('');
    const [timeSlot, setTimeSlot] = useState('');
    const [note, setNote] = useState('');
    const [itemType, setItemType] = useState('');

    // UI state
    const [terms1, setTerms1] = useState(false);
    const [terms2, setTerms2] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Get flight info from params
    const flightId = params.flight_id as string || '';
    const flightInfo = params.flight_data ? JSON.parse(params.flight_data as string) : null;

    const handleSubmit = async () => {
        // Validation
        if (!reward || Number(reward) < 300000) {
            Alert.alert('Lỗi', 'Vui lòng nhập phần thưởng tối thiểu 300.000đ');
            return;
        }
        if (!itemValue || Number(itemValue) < 100000) {
            Alert.alert('Lỗi', 'Vui lòng nhập giá trị tài liệu tối thiểu 100,000đ');
            return;
        }
        if (!itemDescription || itemDescription.trim().length < 10) {
            Alert.alert('Lỗi', 'Vui lòng nhập mô tả tài liệu (tối thiểu 10 ký tự)');
            return;
        }

        if (!terms1 || !terms2) {
            Alert.alert('Lỗi', 'Vui lòng xác nhận các điều khoản');
            return;
        }

        try {
            setSubmitting(true);

            const requestData = {
                flight_id: Number(flightId),
                reward: Number(reward),
                item_value: Number(itemValue),
                item_description: itemDescription.trim(),
                note: note.trim() || undefined,
            };

            const response = await api.post('private-requests/sent', requestData);

            if (response.data?.success) {
                Alert.alert(
                    'Thành công',
                    response.data.message || 'Đã gửi yêu cầu thành công! Hành khách sẽ phản hồi trong 24h.',
                    [
                        {
                            text: 'OK',
                            onPress: () => router.back(),
                        },
                    ]
                );
            } else {
                Alert.alert('Lỗi', response.data?.message || 'Không thể gửi yêu cầu');
            }
        } catch (err: any) {
            console.error('Error sending request:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Có lỗi xảy ra khi gửi yêu cầu';
            Alert.alert('Lỗi', errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const flight = flightInfo || {};
    const customer = flight.customer || {};
    const route = flight.from_airport && flight.to_airport
        ? `${flight.from_airport} → ${flight.to_airport}`
        : 'Chưa có thông tin';
    const flightDate = flight.flight_date
        ? (() => {
            try {
                const date = new Date(flight.flight_date);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleDateString('vi-VN');
                }
            } catch {}
            return 'Chưa có thông tin';
        })()
        : 'Chưa có thông tin';

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Top App Bar */}
            <View className="sticky top-0 z-50 flex-row items-center bg-background-light dark:bg-background-dark px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={28} color="#1F2937" className="dark:text-white" />
                </TouchableOpacity>
                <Text className="flex-1 text-center text-lg font-bold text-text-primary dark:text-white pr-10">
                    Gửi yêu cầu
                </Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                <View className="p-4 gap-y-4 pb-48">
                    {/* Thông tin tóm tắt */}
                    <View className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm">
                        <View className="gap-4">
                            {/* Customer Info */}
                            <View className="flex-row items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
                                <Image
                                    source={{ uri: getAvatarUrl(customer.avatar) }}
                                    className="w-12 h-12 rounded-full"
                                />
                                <View className="flex-1">
                                    <Text className="font-bold text-text-primary dark:text-white">
                                        {customer.name || 'Hành khách'}
                                    </Text>
                                    <Text className="text-sm text-text-secondary dark:text-gray-400">
                                        {flight.flight_number || ''}
                                    </Text>
                                </View>
                            </View>

                            {/* Tuyến đường */}
                            <View className="flex-row items-center gap-4">
                                <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    <MaterialIcons name="flight-takeoff" size={24} color="#2563EB" />
                                </View>
                                <View>
                                    <Text className="text-sm text-text-secondary dark:text-gray-400">Tuyến đường</Text>
                                    <Text className="font-semibold text-text-primary dark:text-white">
                                        {route}
                                    </Text>
                                </View>
                            </View>

                            {/* Ngày gửi */}
                            <View className="flex-row items-center gap-4">
                                <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                    <MaterialIcons name="calendar-month" size={24} color="#2563EB" />
                                </View>
                                <View>
                                    <Text className="text-sm text-text-secondary dark:text-gray-400">Ngày bay</Text>
                                    <Text className="font-semibold text-text-primary dark:text-white">{flightDate}</Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Form nhập thông tin */}
                    <View className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm gap-y-5">
                        {/* Phần thưởng */}
                        <View>
                            <Text className="mb-2 text-sm font-medium text-text-primary dark:text-white">
                                Phần thưởng cho hành khách (VND) <Text className="text-red-500">*</Text>
                            </Text>
                            <View className="relative">
                                <MaterialIcons
                                    name="payments"
                                    size={20}
                                    color="#6b7280"
                                    style={{ position: 'absolute', left: 12, top: 17, zIndex: 10 }}
                                />
                                <TextInput
                                    value={reward}
                                    onChangeText={setReward}
                                    placeholder="Ví dụ: 300.000đ"
                                    keyboardType="numeric"
                                    className="h-14 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-10 pr-4 text-sm text-text-primary dark:text-white"
                                />
                            </View>
                            <Text className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                                Tối thiểu: 300.000đ
                            </Text>
                        </View>

                        {/* Giá trị tài liệu */}
                        <View>
                            <Text className="mb-2 text-sm font-medium text-text-primary dark:text-white">
                                Giá trị ước tính tài liệu (VND) <Text className="text-red-500">*</Text>
                            </Text>
                            <View className="relative">
                                <MaterialIcons
                                    name="attach-money"
                                    size={20}
                                    color="#6b7280"
                                    style={{ position: 'absolute', left: 12, top: 17, zIndex: 10 }}
                                />
                                <TextInput
                                    value={itemValue}
                                    onChangeText={setItemValue}
                                    placeholder="Ví dụ: 10,000,000"
                                    keyboardType="numeric"
                                    className="h-14 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-10 pr-4 text-sm text-text-primary dark:text-white"
                                />
                            </View>
                            <Text className="mt-1 text-xs text-text-secondary dark:text-gray-400">
                                Tối thiểu: 100,000đ
                            </Text>
                        </View>

                        {/* Loại tài liệu */}
                        <View>
                            <Text className="mb-2 text-sm font-medium text-text-primary dark:text-white">
                                Loại tài liệu
                            </Text>
                            <ItemTypeSelect
                                placeholder="Chọn loại tài liệu"
                                value={itemType}
                                onValueChange={(value, label) => setItemType(value)}
                            />
                        </View>

                        {/* Mô tả tài liệu */}
                        <View>
                            <Text className="mb-2 text-sm font-medium text-text-primary dark:text-white">
                                Mô tả tài liệu <Text className="text-red-500">*</Text>
                            </Text>
                            <TextInput
                                value={itemDescription}
                                onChangeText={setItemDescription}
                                placeholder="Mô tả chi tiết về tài liệu cần gửi (tối thiểu 10 ký tự)..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={4}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-text-primary dark:text-white min-h-24"
                            />
                        </View>

                        {/* Ghi chú */}
                        <View>
                            <Text className="mb-2 text-sm font-medium text-text-primary dark:text-white">
                                Ghi chú (tùy chọn)
                            </Text>
                            <TextInput
                                value={note}
                                onChangeText={setNote}
                                placeholder="Thêm ghi chú hoặc yêu cầu đặc biệt..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={3}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-text-primary dark:text-white min-h-20"
                            />
                        </View>
                    </View>

                    {/* Điều khoản */}
                    <View className="rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm gap-y-4">
                        <TouchableOpacity
                            onPress={() => setTerms1(!terms1)}
                            className="flex-row items-start gap-3"
                        >
                            <View className={`h-5 w-5 rounded border-2 mt-0.5 ${terms1 ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600 bg-transparent'}`}>
                                {terms1 && <MaterialIcons name="check" size={16} color="white" className="self-center mt-0.5" />}
                            </View>
                            <Text className="flex-1 text-sm text-text-primary dark:text-white">
                                Tôi xác nhận thông tin cung cấp là chính xác.
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setTerms2(!terms2)}
                            className="flex-row items-start gap-3"
                        >
                            <View className={`h-5 w-5 rounded border-2 mt-0.5 ${terms2 ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600 bg-transparent'}`}>
                                {terms2 && <MaterialIcons name="check" size={16} color="white" className="self-center mt-0.5" />}
                            </View>
                            <Text className="flex-1 text-sm text-text-primary dark:text-white">
                                Tôi đã đọc và đồng ý với các điều khoản.
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity>
                            <Text className="text-sm font-bold text-secondary underline">
                                Xem hợp đồng mẫu
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Sticky Footer */}
            <View className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-2xl">
                <View className="p-2 gap-y-3">
                    {reward && (
                        <View className="gap-y-1.5 text-sm">
                            <View className="flex-row justify-between">
                                <Text className="text-text-secondary dark:text-gray-400">Phần thưởng:</Text>
                                <Text className="font-semibold text-text-primary dark:text-white">
                                    {Number(reward).toLocaleString('vi-VN')}đ
                                </Text>
                            </View>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={handleSubmit}
                        disabled={submitting}
                        className={`w-full rounded-lg py-4 ${submitting ? 'bg-gray-400' : 'bg-primary'} shadow-lg`}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text className="text-center text-base font-bold text-white">
                                Gửi yêu cầu đến hành khách
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}