// app/edit-flight-customer.tsx
import React, { useState, useEffect } from "react";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import CitySelectModal from './components/CitySelectModal';
import DatePickerInput from './components/DatePickerInput';
import ItemTypeSelect from './components/ItemTypeSelect'; // ĐÃ THÊM LẠI
import FlightNumberSelect from './components/FlightNumberSelect';
import api from "@/api/api";

export default function EditFlightScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [isVerified, setIsVerified] = useState(false); // Trạng thái xác thực

    // Form states
    const [departureAirport, setDepartureAirport] = useState({ value: '', label: '' });
    const [arrivalAirport, setArrivalAirport] = useState({ value: '', label: '' });
    const [flightDateTime, setFlightDateTime] = useState('');
    const [airline, setAirline] = useState('');
    const [flightCode, setFlightCode] = useState('');
    const [allowedWeight, setAllowedWeight] = useState('');
    const [itemType, setItemType] = useState(''); // ĐÃ THÊM LẠI – QUAN TRỌNG!!!

    // Lấy ID an toàn
    const flightId = React.useMemo(() => {
        if (!id) return null;
        return Array.isArray(id) ? id[0] : id;
    }, [id]);

    // Load dữ liệu chuyến bay
    useEffect(() => {
        if (flightId) {
            fetchFlightDetail(flightId);
        } else {
            Alert.alert('Lỗi', 'Không tìm thấy ID chuyến bay');
            router.back();
        }
    }, [flightId]);

    const fetchFlightDetail = async (fid: string) => {
        try {
            setLoading(true);
            const response = await api.get(`flights/${fid}/show`);

            let data = response.data;
            if (data?.data) data = data.data;
            if (data?.flight) data = data.flight;

            if (!data) throw new Error('Dữ liệu không hợp lệ');

            // Kiểm tra trạng thái xác thực
            const verified = data.verified === true || data.verified === 1 || data.status === 'verified';
            setIsVerified(verified);

            setDepartureAirport({ value: data.from_airport, label: data.from_airport });
            setArrivalAirport({ value: data.to_airport, label: data.to_airport });
            setFlightDateTime(data.flight_date || '');
            setAirline(data.airline || '');
            setFlightCode(data.flight_number || '');
            setAllowedWeight(data.max_weight?.toString() || '');
            setItemType(data.item_type || ''); // ĐÃ THÊM – BẮT BUỘC

            // Nếu đã xác thực, hiển thị thông báo
            if (verified) {
                Alert.alert(
                    'Chuyến bay đã được xác thực',
                    'Chuyến bay này đã được xác thực và không thể chỉnh sửa. Bạn chỉ có thể xem thông tin.',
                    [{ text: 'OK' }]
                );
            }

        } catch (err: any) {
            const msg = err.response?.data?.message || 'Không thể tải thông tin chuyến bay';
            Alert.alert('Lỗi', msg, [{ text: 'OK', onPress: () => router.back() }]);
        } finally {
            setLoading(false);
        }
    };

    // Cập nhật chuyến bay – ĐÃ FIX LỖI item_type
    const handleUpdateFlight = async () => {
        // Kiểm tra nếu đã xác thực thì không cho phép chỉnh sửa
        if (isVerified) {
            Alert.alert('Không thể chỉnh sửa', 'Chuyến bay đã được xác thực và không thể chỉnh sửa.');
            return;
        }

        if (!departureAirport.value) return Alert.alert('Lỗi', 'Vui lòng chọn sân bay đi');
        if (!arrivalAirport.value) return Alert.alert('Lỗi', 'Vui lòng chọn sân bay đến');
        if (!flightDateTime) return Alert.alert('Lỗi', 'Vui lòng chọn ngày giờ bay');
        if (!airline.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập hãng bay');
        if (!flightCode.trim()) return Alert.alert('Lỗi', 'Vui lòng nhập mã chuyến bay');
        if (!allowedWeight || isNaN(parseFloat(allowedWeight))) return Alert.alert('Lỗi', 'Khối lượng phải là số');
        if (!itemType) return Alert.alert('Lỗi', 'Vui lòng chọn loại tài liệu'); // BẮT BUỘC

        const updateData = {
            from_airport: departureAirport.value,
            to_airport: arrivalAirport.value,
            flight_date: flightDateTime,
            airline: airline.trim(),
            flight_number: flightCode.trim(),
            max_weight: parseFloat(allowedWeight),
            item_type: itemType, // ĐÃ GỬI LÊN → HẾT LỖI 1048 NGAY!!!
        };

        setSubmitting(true);

        try {
            await api.put(`flights/${flightId}/update`, updateData);

            Alert.alert('Thành công!', 'Chuyến bay đã được cập nhật thành công', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (err: any) {
            console.error('Update error:', err.response?.data);

            if (err.response?.status === 401) {
                Alert.alert('Phiên hết hạn', 'Vui lòng đăng nhập lại', [
                    { text: 'OK', onPress: () => router.replace('/login') }
                ]);
                return;
            }

            const msg = err.response?.data?.message || 'Cập nhật thất bại';
            Alert.alert('Lỗi', msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelFlight = () => {
        // Kiểm tra nếu đã xác thực thì không cho phép hủy
        if (isVerified) {
            Alert.alert('Không thể hủy', 'Chuyến bay đã được xác thực và không thể hủy.');
            return;
        }

        Alert.alert('Hủy chuyến bay', 'Bạn có chắc chắn muốn hủy?', [
            { text: 'Không', style: 'cancel' },
            {
                text: 'Hủy chuyến bay',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await api.delete(`flights/${flightId}`);
                        Alert.alert('Thành công', 'Đã hủy chuyến bay', [
                            { text: 'OK', onPress: () => router.replace('/(tabs)/(customer)/home_customer') }
                        ]);
                    } catch (err: any) {
                        Alert.alert('Lỗi', err.response?.data?.message || 'Không thể hủy');
                    }
                }
            }
        ]);
    };

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark justify-center items-center">
                <ActivityIndicator size="large" color="#2563EB" />
                <Text className="mt-4 text-gray-600 dark:text-gray-400">Đang tải...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="h-16 flex-row items-center justify-between border-b border-gray-200 bg-white px-4 dark:bg-gray-800 dark:border-gray-700">
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={24} color="#1F2937" className="dark:text-white" />
                </TouchableOpacity>
                <Text className="flex-1 text-center text-lg font-bold text-text-dark-gray dark:text-white -ml-10">
                    Chỉnh sửa chuyến bay
                </Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 140 }}>
                <View className="p-4 gap-6">

                    {/* Form chỉnh sửa */}
                    <View className="bg-white rounded-2xl p-5 shadow-sm dark:bg-gray-800">
                        <Text className="text-lg font-bold text-text-dark-gray dark:text-white mb-5">
                            Thông tin chuyến bay
                        </Text>

                        {isVerified && (
                            <View className="mb-4 rounded-xl bg-yellow-50 border border-yellow-200 p-4 dark:bg-yellow-900/20 dark:border-yellow-800">
                                <View className="flex-row items-center gap-2">
                                    <MaterialIcons name="lock" size={20} color="#F59E0B" />
                                    <Text className="flex-1 text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                                        Chuyến bay đã được xác thực - Không thể chỉnh sửa
                                    </Text>
                                </View>
                            </View>
                        )}

                        <View className="gap-5" pointerEvents={isVerified ? 'none' : 'auto'} style={{ opacity: isVerified ? 0.6 : 1 }}>

                            {/* Sân bay đi / đến */}
                            <View className="grid grid-cols-2 gap-4">
                                <View>
                                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sân bay đi</Text>
                                    <CitySelectModal
                                        placeholder="Chọn sân bay"
                                        iconName="flight-takeoff"
                                        value={departureAirport.value}
                                        onValueChange={(value, label) => setDepartureAirport({ value, label })}
                                    />
                                </View>
                                <View>
                                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sân bay đến</Text>
                                    <CitySelectModal
                                        placeholder="Chọn sân bay"
                                        iconName="flight-land"
                                        value={arrivalAirport.value}
                                        onValueChange={(value, label) => setArrivalAirport({ value, label })}
                                    />
                                </View>
                            </View>

                            {/* Ngày giờ bay */}
                            <View>
                                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ngày & giờ bay</Text>
                                <DatePickerInput
                                    placeholder="Chọn ngày giờ"
                                    value={flightDateTime}
                                    onValueChange={setFlightDateTime}
                                    minimumDate={new Date()}
                                />
                            </View>

                            {/* Mã chuyến bay */}
                            <View>
                                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Mã chuyến bay
                                </Text>
                                <FlightNumberSelect
                                    placeholder="Chọn hãng bay và nhập số chuyến"
                                    value={flightCode}
                                    airline={airline}
                                    onValueChange={(value) => {
                                        setFlightCode(value);
                                    }}
                                    onAirlineChange={(airlineCode, airlineName) => {
                                        setAirline(airlineName);
                                    }}
                                />
                            </View>

                            {/* Loại tài liệu – ĐÃ THÊM LẠI */}
                            <View>
                                <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Loại tài liệu được mang
                                </Text>
                                <ItemTypeSelect
                                    placeholder="Chọn loại tài liệu"
                                    value={itemType}
                                    onValueChange={setItemType}
                                />
                            </View>

                            {/* Khối lượng */}
                            <InputField
                                label="Khối lượng tối đa (kg)"
                                placeholder="VD: 5"
                                keyboardType="numeric"
                                value={allowedWeight}
                                onChangeText={setAllowedWeight}
                            />
                        </View>
                    </View>

                    {/* Vé đã xác thực - chỉ hiển thị khi đã verified */}
                    {isVerified && (
                        <View className="bg-green-50 rounded-2xl p-5 dark:bg-green-900/20">
                            <View className="flex-row items-center gap-3">
                                <MaterialIcons name="check-circle" size={28} color="#10B981" />
                                <View>
                                    <Text className="font-semibold text-text-dark-gray dark:text-white">
                                        Vé máy bay đã được xác thực
                                    </Text>
                                    <Text className="text-sm text-gray-600 dark:text-gray-400">
                                        Không thể thay đổi vé sau khi xác thực
                                    </Text>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Nút cố định */}
            <View className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 px-4 py-4 shadow-2xl border-t border-gray-200 dark:border-gray-700">
                {!isVerified ? (
                    <>
                        <TouchableOpacity
                            onPress={handleUpdateFlight}
                            disabled={submitting}
                            className={`h-14 rounded-xl justify-center items-center mb-3 ${submitting ? 'bg-gray-400' : 'bg-primary'}`}
                        >
                            {submitting ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white font-bold text-base">Lưu thay đổi</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleCancelFlight}
                            disabled={submitting}
                            className="h-14 rounded-xl border-2 border-red-600 justify-center items-center"
                        >
                            <Text className="text-red-600 font-bold text-base">Hủy chuyến bay</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View className="h-14 rounded-xl bg-gray-200 dark:bg-gray-700 justify-center items-center">
                        <Text className="text-gray-600 dark:text-gray-400 font-bold text-base">
                            Chuyến bay đã được xác thực - Không thể chỉnh sửa
                        </Text>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

// Component Input
const InputField = ({
    label,
    placeholder,
    keyboardType,
    value,
    onChangeText,
}: {
    label: string;
    placeholder: string;
    keyboardType?: "default" | "numeric";
    value: string;
    onChangeText: (text: string) => void;
}) => (
    <View>
        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{label}</Text>
        <TextInput
            placeholder={placeholder}
            keyboardType={keyboardType}
            value={value}
            onChangeText={onChangeText}
            className="h-12 px-4 rounded-xl border border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 text-text-dark-gray dark:text-white"
        />
    </View>
);
