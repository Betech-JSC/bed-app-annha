// app/flight-history.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import api from '@/api/api';

interface Flight {
  id: number;
  uuid: string;
  customer_id: number;
  from_airport: string;
  to_airport: string;
  flight_date: string;
  airline: string;
  flight_number: string;
  boarding_pass_url: string | null;
  verified: boolean;
  verified_at: string | null;
  verified_by: number | null;
  max_weight: string;
  booked_weight: string;
  note: string | null;
  created_at: string;
  updated_at: string;
  item_type: string;
  item_value: string | null;
  status: string;
  available_weight: number;
  is_fully_booked: boolean;
  requests: any[];
}

export default function FlightHistoryScreen() {
  const { colorScheme } = useColorScheme();
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFlights = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await api.get('flights/');
      let data = response.data;

      // Xử lý response structure
      if (data?.data) data = data.data;
      if (data?.flights) data = data.flights;

      if (Array.isArray(data)) {
        setFlights(data);
      } else {
        throw new Error('Dữ liệu không hợp lệ');
      }
    } catch (err: any) {
      console.error('Lỗi tải danh sách chuyến bay:', err);
      const msg = err.response?.data?.message || 'Không thể tải danh sách chuyến bay';
      setError(msg);

      if (err.response?.status === 401) {
        Alert.alert('Phiên hết hạn', 'Vui lòng đăng nhập lại', [
          { text: 'OK', onPress: () => router.replace('/login') },
        ]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Tự động load khi vào màn hình
  useFocusEffect(
    useCallback(() => {
      fetchFlights();
    }, [])
  );

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Không xác định';
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      { icon: string; color: string; bgColor: string; label: string }
    > = {
      pending: {
        icon: 'hourglass-empty',
        color: '#D97706',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/50',
        label: 'Chờ xác thực',
      },
      verified: {
        icon: 'schedule',
        color: '#2563EB',
        bgColor: 'bg-blue-100 dark:bg-blue-900/50',
        label: 'Sắp tới',
      },
      completed: {
        icon: 'task-alt',
        color: '#6B7280',
        bgColor: 'bg-gray-100 dark:bg-gray-700',
        label: 'Đã hoàn thành',
      },
      cancelled: {
        icon: 'cancel',
        color: '#DC2626',
        bgColor: 'bg-red-100 dark:bg-red-900/50',
        label: 'Đã hủy',
      },
    };

    const config = statusMap[status] || statusMap.pending;

    return (
      <View className={`flex-row items-center gap-1.5 rounded-lg px-2.5 py-1 ${config.bgColor}`}>
        <MaterialIcons name={config.icon as any} size={16} color={config.color} />
        <Text
          className="text-xs font-medium"
          style={{ color: config.color }}
        >
          {config.label}
        </Text>
      </View>
    );
  };

  const getFlightIcon = (status: string) => {
    if (status === 'verified') return 'flight-takeoff';
    if (status === 'completed') return 'flight-land';
    if (status === 'cancelled') return 'no-transfer';
    return 'hourglass-empty';
  };

  const getFlightIconBg = (status: string) => {
    if (status === 'verified') return 'bg-blue-100 dark:bg-blue-900/50';
    if (status === 'completed') return 'bg-gray-100 dark:bg-gray-700';
    return 'bg-gray-100 dark:bg-gray-700';
  };

  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-background-light dark:bg-background-dark">
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <View className="sticky top-0 z-10 flex-row items-center justify-between bg-background-light/80 px-4 py-4 backdrop-blur-sm dark:bg-background-dark/80">
          <View className="w-10" />
          <Text className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
            Lịch sử Chuyến bay
          </Text>
          <TouchableOpacity className="p-2">
            <MaterialIcons
              name="filter-list"
              size={28}
              color={colorScheme === 'dark' ? '#F5F7FB' : '#1F2937'}
            />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="mt-4 text-gray-600 dark:text-gray-400">Đang tải...</Text>
        </View>
      </View>
    );
  }

  if (error && flights.length === 0) {
    return (
      <View className="flex-1 bg-background-light dark:bg-background-dark">
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
        <View className="sticky top-0 z-10 flex-row items-center justify-between bg-background-light/80 px-4 py-4 backdrop-blur-sm dark:bg-background-dark/80">
          <View className="w-10" />
          <Text className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
            Lịch sử Chuyến bay
          </Text>
          <TouchableOpacity className="p-2">
            <MaterialIcons
              name="filter-list"
              size={28}
              color={colorScheme === 'dark' ? '#F5F7FB' : '#1F2937'}
            />
          </TouchableOpacity>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <MaterialIcons name="error-outline" size={64} color="#EF4444" />
          <Text className="mt-4 text-center text-lg font-semibold text-gray-700 dark:text-gray-300">
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => fetchFlights()}
            className="mt-6 rounded-lg bg-primary px-6 py-3"
          >
            <Text className="font-bold text-white">Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View className="sticky top-0 z-10 flex-row items-center justify-between bg-background-light/80 px-4 py-4 backdrop-blur-sm dark:bg-background-dark/80">
        <View className="w-10" />
        <Text className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
          Lịch sử Chuyến bay
        </Text>
        <TouchableOpacity className="p-2">
          <MaterialIcons
            name="filter-list"
            size={28}
            color={colorScheme === 'dark' ? '#F5F7FB' : '#1F2937'}
          />
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        className="flex-1 px-4 pb-32"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchFlights(true)} />
        }
      >
        {flights.length === 0 ? (
          <View className="mt-20 items-center justify-center px-6">
            <MaterialIcons name="flight" size={64} color="#9CA3AF" />
            <Text className="mt-4 text-center text-lg font-semibold text-gray-700 dark:text-gray-300">
              Chưa có chuyến bay nào
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500">
              Thêm chuyến bay đầu tiên của bạn
            </Text>
          </View>
        ) : (
          <View className="gap-4 py-2">
            {flights.map((flight) => (
              <TouchableOpacity
                key={flight.id}
                onPress={() =>
                  router.push({
                    pathname: '/detail-flight-customer',
                    params: { id: flight.id.toString() },
                  })
                }
              >
                <View className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
                  {/* Header */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <View
                        className={`h-10 w-10 items-center justify-center rounded-full ${getFlightIconBg(
                          flight.status
                        )}`}
                      >
                        <MaterialIcons
                          name={getFlightIcon(flight.status) as any}
                          size={24}
                          color="#2563EB"
                        />
                      </View>
                      <View>
                        <Text className="text-base font-bold text-text-primary-light dark:text-text-primary-dark">
                          {flight.flight_number}
                        </Text>
                        <Text className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                          {formatDateTime(flight.flight_date)}
                        </Text>
                      </View>
                    </View>

                    {flight.requests && flight.requests.length > 0 && (
                      <View className="rounded-full bg-secondary px-3 py-2">
                        <Text className="text-sm font-bold text-white">
                          {flight.requests.length} Yêu cầu
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Route */}
                  <View className="my-4 flex-row items-center justify-between">
                    <View className="items-center">
                      <Text className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
                        {flight.from_airport}
                      </Text>
                      {/* <Text className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                        {flight.from_airport}
                      </Text> */}
                    </View>

                    <View className="flex-1 flex-row items-center px-4">
                      <View className="flex-1 border-t border-gray-300 dark:border-gray-600" />
                      <MaterialIcons name="flight" size={24} color="#9CA3AF" />
                      <View className="flex-1 border-t border-gray-300 dark:border-gray-600" />
                    </View>

                    <View className="items-center">
                      <Text className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
                        {flight.to_airport}
                      </Text>
                      {/* <Text className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                        {flight.to_airport}
                      </Text> */}
                    </View>
                  </View>

                  {/* Badges */}
                  <View className="flex-row gap-2">
                    {flight.verified && (
                      <View className="flex-row items-center gap-1.5 rounded-lg bg-green-100 px-2.5 py-1 dark:bg-green-900/50">
                        <MaterialIcons name="verified" size={16} color="#16A34A" />
                        <Text className="text-xs font-medium text-green-800 dark:text-green-200">
                          Đã xác thực
                        </Text>
                      </View>
                    )}
                    {!flight.verified && flight.status === 'pending' && (
                      <View className="flex-row items-center gap-1.5 rounded-lg bg-yellow-100 px-2.5 py-1 dark:bg-yellow-900/50">
                        <MaterialIcons name="hourglass-empty" size={16} color="#D97706" />
                        <Text className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                          Chờ xác thực
                        </Text>
                      </View>
                    )}
                    {getStatusBadge(flight.status)}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <View className="absolute bottom-6 right-6">
        <TouchableOpacity
          onPress={() => router.push('/home_customer')}
          className="flex-row items-center gap-2 rounded-full bg-primary px-6 py-4 shadow-lg"
        >
          <MaterialIcons name="add" size={28} color="white" />
          <Text className="text-base font-semibold text-white">Thêm chuyến bay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
