// app/(tabs)/home.tsx
import React, { useState, useEffect } from "react";
import {
    SafeAreaView,
    ScrollView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Image,
    FlatList,
    Alert,
    ActivityIndicator,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import CitySelectModal from '../../components/CitySelectModal';
import DatePickerInput from '../../components/DatePickerInput';
import ItemTypeSelect from '../../components/ItemTypeSelect';
import FlightNumberSelect from '../../components/FlightNumberSelect';
import UserProfileInfo from '../../components/UserProfileInfo';
import api from '@/api/api';
import { getAvatarUrl } from '@/constants/avatars';

export default function HomeScreen() {
    const router = useRouter();
    const user = useSelector((state: RootState) => state.user);
    const unreadNotificationCount = useUnreadNotificationCount();

    // State cho form đăng chuyến bay
    const [departureAirport, setDepartureAirport] = useState({ value: '', label: '' });
    const [arrivalAirport, setArrivalAirport] = useState({ value: '', label: '' });
    const [flightDateTime, setFlightDateTime] = useState('');
    const [airline, setAirline] = useState('');
    const [flightCode, setFlightCode] = useState('');
    const [allowedWeight, setAllowedWeight] = useState('');
    const [itemType, setItemType] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State cho Priority Requests từ API
    const [priorityRequestsAPI, setPriorityRequestsAPI] = useState([]);
    const [loadingPriority, setLoadingPriority] = useState(false);

    // State cho Matching Requests từ API
    const [matchingRequestsAPI, setMatchingRequestsAPI] = useState([]);
    const [loadingMatching, setLoadingMatching] = useState(false);

    // Dữ liệu Yêu cầu Ưu tiên Demo (scroll ngang)
    const priorityRequestsDemo = [
        {
            name: "Lê Minh Anh",
            item: "Tài liệu gấp",
            route: "SGN → HAN",
            reward: "250.000đ",
            avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuA9W_inshPmtJpr0zofvRT153vXvWy34rBoI8vWbCWELoZryiCn_pRAH076kf-Gqtk3_gPt4Mqmn8R05zbfru-yX_7PCfCYYQKCznDUAKSKrdlv2Uas5zVUk3FI_mFid8pLeBHpzmQisR45o-IQZHVPtXb58uuD8eHFEWvthutXM23bnS7KGNtqI9EGaphnB-YRt6jBTFf2gx6d1OU2VQPT9yD9VH3Ds2TuGE2dLgiOAXL3rlAdCNEcFfBiN61Qwcz0MJ2ANBDWM5tJ",
        },
        {
            name: "Phạm Văn",
            item: "Hồ sơ công ty",
            route: "DAD → SGN",
            reward: "200.000đ",
            avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBgNBKB8x2XrJGMh-G4Ky70ghqMewFKZF7WsX_ZfsJS8afazchW_uPIRmle2Qgy4Wbmfozv-H7tzsAfHSx1N5CssnjF57uSR0p5mOkQZRYvaKouLdkfe2r-nL1snAvrG2D7i1k-GdtY0gYnsr4KTsKEyE4mwYVtfWrTetJA6ZyaiZbNPkQYcXAbyKKmB6C1QA4EIKHge5GxWt59g7xKKkBDrXl16dFdm20tUpDjAoadqlD02Npp_ChF4S9ewqyUg0IDzH4EOmVQaz4y",
        },
        {
            name: "Ngọc Trinh",
            item: "Giấy tờ cá nhân",
            route: "PQC → HAN",
            reward: "180.000đ",
            avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuAlYQ44LQ_Eq8dLPux09V7kbWCePMxr0Px3Nrw77YJd0rn1faQZ-_XwtVISQPZXSTi_WXqd3uawfsIRNtVzSk1WEQPSvphmbo8-yyfPZjxXW3bZbBhZB_oI8ByW7YLvvWcKXAuwEx_bXAINzI3JuqSDuO_Ur7k8b1PGdMlD9mOR4uqMusqVed-dqHBYUVyqVG_UtNJCQaKnHeVhY-CKNGCmPaxUnf6cR2dAXOfia6CnsbNErtM1WwXOE8Uv355BYVz91Lf7fJo7gKiR",
        },
    ];

    // Fetch Priority Requests từ API
    const fetchPriorityRequests = async () => {
        // Kiểm tra authentication trước khi gọi API
        if (!user?.token) {
            setPriorityRequestsAPI([]);
            return;
        }

        try {
            setLoadingPriority(true);
            const response = await api.get('customer/requests/priority');
            let data = response.data;

            // Xử lý response structure
            if (data?.data) data = data.data;
            if (data?.requests) data = data.requests;

            if (Array.isArray(data)) {
                setPriorityRequestsAPI(data);
            }
        } catch (err: any) {
            // Chỉ log error nếu không phải 401 (unauthorized)
            if (err.response?.status !== 401) {
                console.error('Lỗi tải priority requests:', err);
            }
            setPriorityRequestsAPI([]);
        } finally {
            setLoadingPriority(false);
        }
    };

    // Fetch Matching Requests từ API
    const fetchMatchingRequests = async () => {
        // Kiểm tra authentication trước khi gọi API
        if (!user?.token) {
            setMatchingRequestsAPI([]);
            return;
        }

        try {
            setLoadingMatching(true);
            const response = await api.get('customer/requests/matching');
            let data = response.data;

            // Xử lý response structure
            if (data?.data) data = data.data;
            if (data?.requests) data = data.requests;

            if (Array.isArray(data)) {
                setMatchingRequestsAPI(data);
            }
        } catch (err: any) {
            // Chỉ log error nếu không phải 401 (unauthorized)
            if (err.response?.status !== 401) {
                console.error('Lỗi tải matching requests:', err);
            }
            setMatchingRequestsAPI([]);
        } finally {
            setLoadingMatching(false);
        }
    };

    // Load data khi component mount hoặc user thay đổi
    useEffect(() => {
        // Chỉ fetch khi user đã đăng nhập
        if (user?.token) {
            fetchPriorityRequests();
            fetchMatchingRequests();
        } else {
            // Clear data khi logout
            setPriorityRequestsAPI([]);
            setMatchingRequestsAPI([]);
        }
    }, [user?.token]);

    // Kết hợp data demo + API
    const allPriorityRequests = [...priorityRequestsAPI];

    // Hàm xử lý đăng chuyến bay
    const handlePostFlight = async () => {
        if (!departureAirport.value) return Alert.alert('Thông báo', 'Vui lòng chọn sân bay đi');
        if (!arrivalAirport.value) return Alert.alert('Thông báo', 'Vui lòng chọn sân bay đến');
        if (!flightDateTime) return Alert.alert('Thông báo', 'Vui lòng chọn ngày và giờ bay');
        if (!airline) return Alert.alert('Thông báo', 'Vui lòng nhập hãng bay');
        if (!flightCode) return Alert.alert('Thông báo', 'Vui lòng nhập mã chuyến bay');
        if (!allowedWeight || isNaN(parseFloat(allowedWeight))) {
            return Alert.alert('Thông báo', 'Vui lòng nhập khối lượng hợp lệ (số)');
        }

        const flightData = {
            from_airport: departureAirport.value,
            to_airport: arrivalAirport.value,
            flight_date: flightDateTime,
            airline: airline.trim(),
            flight_number: flightCode.trim(),
            max_weight: parseFloat(allowedWeight),
        };

        setIsSubmitting(true);

        try {
            const response = await api.post('flights/store', flightData);
            console.log('API Response đầy đủ:', response.data);

            // Lấy ID chuyến bay mới tạo – xử lý mọi cấu trúc response phổ biến
            let newFlightId: any = null;

            if (response.data?.data?.id) {
                newFlightId = response.data.data.id;
            } else if (response.data?.flight?.id) {
                newFlightId = response.data.flight.id;
            } else if (response.data?.id) {
                newFlightId = response.data.id;
            } else if (typeof response.data === 'object' && response.data) {
                newFlightId = (response.data as any).id || (response.data as any).flight_id;
            }

            if (!newFlightId) {
                console.warn('Không lấy được ID từ response:', response.data);
                Alert.alert('Cảnh báo', 'Đăng thành công nhưng không lấy được ID chuyến bay');
            }

            // CHUYỂN SANG MÀN HÌNH THÀNH CÔNG + TRUYỀN ĐÚNG ID
            router.replace({
                pathname: "/flight_posted_success",
                params: {
                    flightId: String(newFlightId || ''),
                },
            });

        } catch (err: any) {
            console.error('Lỗi API:', err.response?.data || err);
            const errorMessage =
                err.response?.data?.message ||
                err.response?.data?.errors?.[0] ||
                err.message ||
                'Đăng chuyến bay thất bại. Vui lòng thử lại.';
            Alert.alert('Lỗi', errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 pt-4 pb-2 bg-background-light dark:bg-background-dark sticky top-0 z-10">
                <View className="w-12" />
                <Text className="text-lg font-bold text-text-dark-gray dark:text-white">Trang chủ</Text>
                <TouchableOpacity
                    onPress={() => router.push('/notifications')}
                    className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-sm justify-center items-center relative"
                >
                    <MaterialIcons name="notifications" size={24} color="#1F2937" />
                    {unreadNotificationCount > 0 && (
                        <View className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center border-2 border-white">
                            <Text className="text-white text-xs font-bold">
                                {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                <Text className="text-[32px] font-bold text-text-dark-gray dark:text-white pt-4">
                    Xin chào, {user?.name || 'Bạn'}!
                </Text>
                <Text className="text-base text-text-dark-gray/80 dark:text-white/80 pb-6">
                    Chia sẻ chuyến bay, kiếm thêm thu nhập.
                </Text>

                {/* Form đăng chuyến bay */}
                <View className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
                    <Text className="text-lg font-bold text-text-dark-gray dark:text-white mb-4">
                        Thêm chuyến bay của bạn
                    </Text>

                    <View className="grid grid-cols-2 gap-4 mb-4">
                        <View className="col-span-1">
                            <Text className="text-sm font-medium text-text-dark-gray dark:text-white/90 pb-2">
                                Sân bay đi
                            </Text>
                            <CitySelectModal
                                placeholder="VD: SGN"
                                iconName="flight-takeoff"
                                value={departureAirport.value}
                                onValueChange={(value, label) => setDepartureAirport({ value, label })}
                            />
                        </View>

                        <View className="col-span-1">
                            <Text className="text-sm font-medium text-text-dark-gray dark:text-white/90 pb-2">
                                Sân bay đến
                            </Text>
                            <CitySelectModal
                                placeholder="VD: HAN"
                                iconName="flight-land"
                                value={arrivalAirport.value}
                                onValueChange={(value, label) => setArrivalAirport({ value, label })}
                            />
                        </View>
                    </View>

                    <View className="mb-4 w-full">
                        <DatePickerInput
                            label="Ngày & giờ bay"
                            placeholder="Chọn ngày và giờ"
                            value={flightDateTime}
                            onValueChange={setFlightDateTime}
                            minimumDate={new Date()}
                        />
                    </View>

                    <View className="mb-4">
                        <Text className="text-sm font-medium text-text-dark-gray dark:text-white/90 pb-2">
                            Mã chuyến bay
                        </Text>
                        <FlightNumberSelect
                            placeholder="Chọn hãng bay và nhập số chuyến"
                            value={flightCode}
                            onValueChange={(value) => {
                                setFlightCode(value);
                                // Extract airline name from flight number if needed
                                const airlineCode = value.match(/^([A-Z]{2,3})/)?.[1];
                                if (airlineCode) {
                                    // You can fetch airline name by code if needed
                                }
                            }}
                            onAirlineChange={(airlineCode, airlineName) => {
                                setAirline(airlineName);
                            }}
                        />
                    </View>

                    <View className="mb-6">
                        <Input
                            label="Khối lượng cho phép (kg)"
                            placeholder="VD: 5"
                            keyboardType="numeric"
                            value={allowedWeight}
                            onChangeText={setAllowedWeight}
                        />
                    </View>

                    <TouchableOpacity
                        onPress={handlePostFlight}
                        disabled={isSubmitting}
                        className={`h-14 rounded-lg justify-center items-center ${isSubmitting ? 'bg-gray-400' : 'bg-primary'}`}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text className="text-white text-base font-bold">Đăng chuyến bay</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Yêu cầu Ưu tiên */}
                {allPriorityRequests.length > 0 && (
                    <>
                        <View className="flex-row items-center justify-between mb-4">
                            <Text className="text-xl font-bold text-text-dark-gray dark:text-white">
                                Yêu cầu Ưu tiên
                            </Text>
                            {loadingPriority && (
                                <ActivityIndicator size="small" color="#2563EB" />
                            )}
                        </View>
                        <FlatList
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            data={allPriorityRequests}
                            keyExtractor={(item, index) => item.id?.toString() || `demo-${index}`}
                            renderItem={({ item }) => (
                                <View className="w-72 mr-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                                    <UserProfileInfo
                                        avatar={getAvatarUrl(item.avatar || item.sender?.avatar)}
                                        name={item.name || item.sender?.name}
                                        subtitle={item.item || item.item_type}
                                        size="medium"
                                    />
                                    <Text className="mt-4 font-semibold text-lg text-text-dark-gray dark:text-white">
                                        {item.route || `${item.from_airport || 'SGN'} → ${item.to_airport || 'HAN'}`}
                                    </Text>
                                    <Text className="text-base font-bold text-primary mt-1">
                                        + {item.reward || item.price || '0đ'}
                                    </Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (item.id) {
                                                // Điều hướng đến chi tiết request từ API
                                                router.push(`/request-detail/${item.id}`);
                                            }
                                        }}
                                        className="mt-4 bg-secondary rounded-lg py-3 items-center"
                                    >
                                        <Text className="text-white font-bold text-sm">Nhận ngay</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            contentContainerStyle={{ paddingHorizontal: 4, paddingBottom: 16 }}
                        />
                    </>
                )}

                {/* Yêu cầu phù hợp */}
                {matchingRequestsAPI.length > 0 && (
                    <>
                        <View className="flex-row items-center justify-between mt-8 mb-4">
                            <Text className="text-xl font-bold text-text-dark-gray dark:text-white">
                                Các yêu cầu gửi phù hợp
                            </Text>
                            {loadingMatching && (
                                <ActivityIndicator size="small" color="#2563EB" />
                            )}
                        </View>
                        <View className="gap-4 pb-32">
                            {matchingRequestsAPI.map((req: any, i: number) => (
                                <View key={req.id || i} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                                    <UserProfileInfo
                                        avatar={getAvatarUrl(req.sender?.avatar || req.avatar || priorityRequestsDemo[0]?.avatar)}
                                        name={req.sender?.name || req.name}
                                        subtitle={req.item_type || req.item}
                                        size="small"
                                        showUrgent={req.is_urgent}
                                    />
                                    <View className="flex-row items-center justify-between mt-4">
                                        <View>
                                            <Text className="font-semibold text-text-dark-gray dark:text-white">
                                                {req.from_airport || 'SGN'} → {req.to_airport || 'HAN'}
                                            </Text>
                                            <Text className="text-sm font-bold text-primary">
                                                + {req.price || req.reward || '0đ'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={() => {
                                                if (req.id) {
                                                    router.push(`/request-detail/${req.id}`);
                                                }
                                            }}
                                            className="bg-primary/10 px-6 py-2.5 rounded-lg"
                                        >
                                            <Text className="text-primary font-bold text-sm">Nhận mang hộ</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

// Component Input nhỏ gọn
const Input = ({
    label,
    placeholder,
    keyboardType,
    value,
    onChangeText
}: {
    label: string;
    placeholder: string;
    keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
    value?: string;
    onChangeText?: (text: string) => void;
}) => (
    <View>
        <Text className="text-sm font-medium text-text-dark-gray dark:text-white/90 pb-2">{label}</Text>
        <TextInput
            placeholder={placeholder}
            keyboardType={keyboardType}
            value={value}
            onChangeText={onChangeText}
            className="h-12 px-4 rounded-lg border border-[#dbdee6] dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-text-dark-gray dark:text-white"
        />
    </View>
);
