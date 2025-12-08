// app/detail-flight-customer.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router'; // ĐÃ THÊM useFocusEffect
import api from '@/api/api';
import { getAvatarUrl } from '@/constants/avatars';
import { getAirlineLogo } from '@/constants/airlines';

interface FlightDetail {
  id: number;
  from_airport: string;
  to_airport: string;
  flight_date: string;
  airline: string;
  flight_number: string;
  max_weight: number;
  boarding_pass?: string;
  status: string;
  verified?: boolean;
  departure_time?: string;
  arrival_time?: string;
  from_city?: string;
  to_city?: string;
}

export default function FlightDetailScreen() {
  const { colorScheme } = useColorScheme();
  const { id } = useLocalSearchParams();

  const [flightDetail, setFlightDetail] = useState<FlightDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const flightId = React.useMemo(() => (Array.isArray(id) ? id[0] : id), [id]);

  const fetchFlightDetail = async (fid: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`flights/${fid}/show`);
      let data = response.data;
      if (data?.data) data = data.data;
      if (data?.flight) data = data.flight;

      if (!data || !data.id) throw new Error('Dữ liệu không hợp lệ');

      setFlightDetail(data as FlightDetail);

      // Nếu flight đã verified, fetch requests
      if (data.verified || data.status === 'verified') {
        fetchRequests(fid);
      }
    } catch (err: any) {
      console.error('Lỗi tải chi tiết:', err);
      setFlightDetail(null);
      const msg = err.response?.data?.message || 'Không thể tải thông tin chuyến bay';
      setError(msg);

      if (err.response?.status === 401) {
        Alert.alert('Phiên hết hạn', 'Vui lòng đăng nhập lại', [
          { text: 'OK', onPress: () => router.replace('/login') },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async (fid: string) => {
    try {
      setLoadingRequests(true);
      const response = await api.get(`flights/${fid}/requests`);
      let requestsData = [];
      if (response.data?.success && response.data?.data) {
        requestsData = Array.isArray(response.data.data) ? response.data.data : [];
      }
      setRequests(requestsData);
    } catch (err: any) {
      console.error('Lỗi tải requests:', err);
      setRequests([]);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn chấp nhận yêu cầu này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chấp nhận',
          onPress: async () => {
            try {
              await api.post(`requests/${requestId}/accept`);
              Alert.alert('Thành công', 'Đã chấp nhận yêu cầu');
              if (flightId) {
                fetchRequests(flightId);
                fetchFlightDetail(flightId);
              }
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể chấp nhận yêu cầu');
            }
          },
        },
      ]
    );
  };

  const handleDeclineRequest = async (requestId: number) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc chắn muốn từ chối yêu cầu này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Từ chối',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`requests/${requestId}/decline`);
              Alert.alert('Thành công', 'Đã từ chối yêu cầu');
              if (flightId) {
                fetchRequests(flightId);
              }
            } catch (err: any) {
              Alert.alert('Lỗi', err.response?.data?.message || 'Không thể từ chối yêu cầu');
            }
          },
        },
      ]
    );
  };

  // QUAN TRỌNG: TỰ ĐỘNG RELOAD KHI QUAY LẠI MÀN HÌNH
  useFocusEffect(
    useCallback(() => {
      if (flightId) {
        fetchFlightDetail(flightId);
      }
    }, [flightId])
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Không xác định';
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return `${days[date.getDay()]}, ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '--:--';
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      pending: 'Đang xác thực',
      verified: 'Đã xác thực',
      rejected: 'Bị từ chối',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-500/10',
      verified: 'bg-green-500/10',
      rejected: 'bg-red-500/10',
      completed: 'bg-blue-500/10',
      cancelled: 'bg-gray-500/10',
    };
    return map[status] || 'bg-gray-500/10';
  };

  const getStatusTextColor = (status: string) => {
    const map: Record<string, string> = {
      pending: 'text-yellow-600',
      verified: 'text-green-600',
      rejected: 'text-red-600',
      completed: 'text-blue-600',
      cancelled: 'text-gray-600',
    };
    return map[status] || 'text-gray-600';
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="mt-4 text-gray-600 dark:text-gray-400">Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !flightDetail) {
    return (
      <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <View className="sticky top-0 z-10 flex-row items-center justify-between bg-background-light/80 px-4 py-4 backdrop-blur-sm dark:bg-background-dark/80">
          <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800">
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-text-dark-gray -ml-10 flex-1 text-center dark:text-white">
            Chi tiết chuyến bay
          </Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons name="error-outline" size={64} color="#EF4444" />
          <Text className="mt-4 text-center text-lg font-semibold text-gray-700 dark:text-gray-300">
            {error || 'Không tìm thấy chuyến bay'}
          </Text>
          <TouchableOpacity onPress={() => flightId && fetchFlightDetail(flightId)} className="mt-6 rounded-lg bg-primary px-6 py-3">
            <Text className="font-bold text-white">Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <View className="sticky top-0 z-10 flex-row items-center justify-between bg-background-light/80 px-4 py-4 backdrop-blur-sm dark:bg-background-dark/80">
        <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm dark:bg-gray-800">
          <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-dark-gray -ml-10 flex-1 text-center dark:text-white">
          Chuyến bay #{flightDetail.id}
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => flightId && fetchFlightDetail(flightId)} />}
        className="flex-1 px-4 pb-32"
      >
        <View className="mt-4 gap-6">
          {/* Thông tin chuyến bay */}
          <View className="rounded-xl bg-white p-5 shadow-lg dark:bg-gray-800">
            <View className="flex-row items-center justify-between pb-4">
              <View className="flex-row items-center gap-3">
                <Image 
                  source={{ uri: getAirlineLogo(flightDetail.airline) }} 
                  className="h-10 w-10" 
                  resizeMode="contain" 
                />
                <View>
                  <Text className="text-base font-bold text-text-dark-gray dark:text-white">{flightDetail.airline}</Text>
                  <Text className="text-sm text-gray-500">{flightDetail.flight_number}</Text>
                </View>
              </View>
              <View className={`rounded-full px-3 py-1 ${getStatusColor(flightDetail.status)}`}>
                <Text className={`text-sm font-semibold ${getStatusTextColor(flightDetail.status)}`}>
                  {getStatusText(flightDetail.status)}
                </Text>
              </View>
            </View>

            <View className="relative flex-row items-center justify-between py-4">
              <View className="items-start flex-1">
                <Text className="text-3xl font-bold text-text-dark-gray dark:text-white">{flightDetail.from_airport}</Text>
                <Text className="text-sm text-gray-500">
                  {flightDetail.departure_time ? formatTime(flightDetail.departure_time) : formatTime(flightDetail.flight_date)}
                </Text>
              </View>
              <View className="flex-1 flex-row items-center px-4">
                <View className="flex-1 border-t-2 border-gray-300 dark:border-gray-600" />
                <MaterialIcons name="flight-takeoff" size={28} color="#2563EB" />
                <View className="flex-1 border-t-2 border-gray-300 dark:border-gray-600" />
              </View>
              <View className="items-end flex-1">
                <Text className="text-3xl font-bold text-text-dark-gray dark:text-white">{flightDetail.to_airport}</Text>
                <Text className="text-sm text-gray-500">
                  {flightDetail.arrival_time ? formatTime(flightDetail.arrival_time) : '--:--'}
                </Text>
              </View>
            </View>

            <View className="mt-1 flex-row justify-between">
              <Text className="text-xs text-gray-400">{flightDetail.from_city || flightDetail.from_airport}</Text>
              <Text className="text-xs text-gray-400">{flightDetail.to_city || flightDetail.to_airport}</Text>
            </View>

            <View className="mt-4 border-t border-dashed border-gray-200 pt-4 dark:border-gray-700">
              <Text className="text-sm text-gray-500">Ngày bay</Text>
              <Text className="font-bold text-text-dark-gray dark:text-white">{formatDate(flightDetail.flight_date)}</Text>
            </View>
          </View>

          {/* Boarding Pass */}
          {/* <View className="rounded-xl bg-white p-5 shadow-lg dark:bg-gray-800">
            <Text className="text-base font-bold text-text-dark-gray dark:text-white">Vé máy bay của bạn</Text>
            {flightDetail.boarding_pass ? (
              <TouchableOpacity
                onPress={() => Linking.openURL(flightDetail.boarding_pass!).catch(() => Alert.alert('Lỗi', 'Không thể mở file'))}
                className="mt-3 flex-row items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700"
              >
                <View className="flex-row items-center gap-3">
                  <Image source={{ uri: 'https://i.imgur.com/8YkA7vC.png' }} className="h-14 w-14 rounded-lg" resizeMode="cover" />
                  <View>
                    <Text className="font-semibold text-text-dark-gray dark:text-white">
                      {flightDetail.boarding_pass.split('/').pop() || 'boarding-pass.pdf'}
                    </Text>
                    <Text className="text-sm text-gray-500">Boarding Pass</Text>
                  </View>
                </View>
                <Text className="text-sm font-bold text-primary">Xem chi tiết</Text>
              </TouchableOpacity>
            ) : (
              <Text className="mt-3 text-sm text-gray-500">Chưa có boarding pass</Text>
            )}
          </View> */}

          {/* Thông tin mang tài liệu */}
          {/* <View className="rounded-xl bg-white p-5 shadow-lg dark:bg-gray-800">
            <Text className="text-base font-bold text-text-dark-gray dark:text-white">Thông tin mang tài liệu</Text>
            <View className="mt-3 flex-row justify-between">
              <Text className="text-sm text-gray-600">Khối lượng tối đa cho phép</Text>
              <Text className="font-bold text-text-dark-gray dark:text-white">{flightDetail.max_weight} kg</Text>
            </View>
          </View> */}

          {/* Danh sách yêu cầu từ senders (chỉ hiển thị khi flight đã verified) */}
          {(flightDetail.verified || flightDetail.status === 'verified') && (
            <View className="rounded-xl bg-white p-5 shadow-lg dark:bg-gray-800">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-base font-bold text-text-dark-gray dark:text-white">
                  Yêu cầu từ người gửi ({requests.length})
                </Text>
                {loadingRequests && <ActivityIndicator size="small" color="#2563EB" />}
              </View>

              {requests.length === 0 ? (
                <Text className="text-sm text-gray-500 text-center py-4">
                  Chưa có yêu cầu nào
                </Text>
              ) : (
                <View className="gap-4">
                  {requests.map((req: any) => {
                    const sender = req.sender || {};
                    const isUrgent = req.priority_level === 'urgent';
                    const isPriority = req.priority_level === 'priority';

                    return (
                      <View
                        key={req.id || req.uuid}
                        className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                      >
                        {/* Header: Sender info + Status */}
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-row items-center gap-3 flex-1">
                            <Image
                              source={{ uri: getAvatarUrl(sender.avatar) }}
                              className="w-10 h-10 rounded-full"
                            />
                            <View className="flex-1">
                              <Text className="font-bold text-text-dark-gray dark:text-white">
                                {sender.name || 'Người gửi'}
                              </Text>
                              <Text className="text-xs text-gray-500">
                                {sender.phone || ''}
                              </Text>
                            </View>
                          </View>
                          {(isUrgent || isPriority) && (
                            <View className={`px-2 py-1 rounded-full ${isUrgent ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'}`}>
                              <Text className={`text-xs font-bold ${isUrgent ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                {isUrgent ? 'Khẩn cấp' : 'Ưu tiên'}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Request details */}
                        <View className="gap-2 mb-3">
                          <View className="flex-row justify-between">
                            <Text className="text-sm text-gray-600">Phần thưởng:</Text>
                            <Text className="font-bold text-text-dark-gray dark:text-white">
                              {Number(req.reward).toLocaleString('vi-VN')}đ
                            </Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className="text-sm text-gray-600">Giá trị tài liệu:</Text>
                            <Text className="font-semibold text-text-dark-gray dark:text-white">
                              {Number(req.item?.value || 0).toLocaleString('vi-VN')}đ
                            </Text>
                          </View>
                          <View className="flex-row justify-between">
                            <Text className="text-sm text-gray-600">Khung giờ:</Text>
                            <Text className="text-sm text-text-dark-gray dark:text-white">
                              {req.time_slot === 'morning' ? 'Buổi sáng' :
                                req.time_slot === 'afternoon' ? 'Buổi chiều' :
                                  req.time_slot === 'evening' ? 'Buổi tối' : 'Bất kỳ'}
                            </Text>
                          </View>
                          {req.item?.description && (
                            <View className="mt-2">
                              <Text className="text-xs text-gray-500 mb-1">Mô tả:</Text>
                              <Text className="text-sm text-text-dark-gray dark:text-white">
                                {req.item.description}
                              </Text>
                            </View>
                          )}
                          {req.note && (
                            <View className="mt-2">
                              <Text className="text-xs text-gray-500 mb-1">Ghi chú:</Text>
                              <Text className="text-sm text-text-dark-gray dark:text-white">
                                {req.note}
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Action buttons */}
                        <View className="flex-row gap-2 mt-3">
                          <TouchableOpacity
                            onPress={() => handleDeclineRequest(req.id)}
                            className="flex-1 h-10 items-center justify-center rounded-lg border-2 border-red-600"
                          >
                            <Text className="text-sm font-bold text-red-600">Từ chối</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleAcceptRequest(req.id)}
                            className="flex-1 h-10 items-center justify-center rounded-lg bg-primary"
                          >
                            <Text className="text-sm font-bold text-white">Chấp nhận</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="absolute bottom-0 left-0 right-0 bg-white px-4 py-4 shadow-2xl dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/edit-flight-customer', params: { id: flightDetail.id.toString() } })}
          className="mb-3 h-14 w-full items-center justify-center rounded-lg bg-primary"
        >
          <Text className="text-base font-bold text-white">Chỉnh sửa chuyến bay</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            Alert.alert('Xác nhận hủy', 'Bạn có chắc chắn muốn hủy chuyến bay này?', [
              { text: 'Không', style: 'cancel' },
              {
                text: 'Hủy chuyến bay',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await api.delete(`flights/${flightDetail.id}/destroy`);
                    Alert.alert('Thành công', 'Chuyến bay đã được hủy');
                    router.push('/home_customer');
                  } catch (err: any) {
                    Alert.alert('Lỗi', err.response?.data?.message || 'Không thể hủy');
                  }
                },
              },
            ]);
          }}
          className="h-14 w-full items-center justify-center rounded-lg border-2 border-red-600"
        >
          <Text className="text-base font-bold text-red-600">Hủy chuyến bay</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
