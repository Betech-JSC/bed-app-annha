import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount';
import api from '@/api/api';
import ItemOrder from 'app/components/ItemOrder';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useOrderMatchList } from '@/hooks/useOrderMatchList';
import BannerSlider from '../../components/BannerSlider';
import SearchFlightModal from '../../components/SearchFlightModal';

const Home = () => {
  const user = useSelector((state: RootState) => state.user);
  const role = user?.role;
  const unreadNotificationCount = useUnreadNotificationCount();

  const [orders, setOrders] = useState([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  // State cho available customers
  const [availableCustomers, setAvailableCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // State cho modal tìm kiếm
  const [searchModalVisible, setSearchModalVisible] = useState(false);

  // Stats data
  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    totalEarnings: 0,
  });

  useEffect(() => {
    // Chỉ fetch khi user đã đăng nhập
    if (!user?.token) {
      setOrders([]);
      setAvailableCustomers([]);
      setStats({
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        totalEarnings: 0,
      });
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        const response = await api.get('orders/getList');

        // Xử lý response structure
        let ordersData = [];
        if (response.data?.success && response.data?.data) {
          // Response có structure: { success: true, data: { data: [...], current_page: ... } }
          if (response.data.data?.data) {
            ordersData = response.data.data.data;
          } else if (Array.isArray(response.data.data)) {
            ordersData = response.data.data;
          }
        } else if (response.data?.status === 'success' && response.data?.data) {
          // Fallback cho structure cũ
          if (response.data.data?.orders?.data) {
            ordersData = response.data.data.orders.data;
          } else if (Array.isArray(response.data.data)) {
            ordersData = response.data.data;
          }
        }

        setOrders(ordersData);
      } catch (err: any) {
        // Chỉ log error nếu không phải 401 (unauthorized)
        if (err.response?.status !== 401) {
          console.error('Error fetching orders:', err);
          setError('Error fetching orders');
        }
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    fetchAvailableCustomers();
    fetchStats();
  }, [user?.token]);

  // Fetch stats
  const fetchStats = async () => {
    // Kiểm tra authentication trước khi gọi API
    if (!user?.token) {
      setStats({
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        totalEarnings: 0,
      });
      return;
    }

    try {
      const response = await api.get('orders/getList');
      let ordersData = [];
      if (response.data?.success && response.data?.data) {
        if (response.data.data?.data) {
          ordersData = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          ordersData = response.data.data;
        }
      }

      const completed = ordersData.filter((o: any) => o.status === 'completed').length;
      const pending = ordersData.filter((o: any) =>
        ['pending', 'confirmed', 'in_transit'].includes(o.status)
      ).length;

      const earnings = ordersData
        .filter((o: any) => o.status === 'completed')
        .reduce((sum: number, o: any) => sum + (o.reward || 0), 0);

      setStats({
        totalOrders: ordersData.length,
        completedOrders: completed,
        pendingOrders: pending,
        totalEarnings: earnings,
      });
    } catch (err: any) {
      // Chỉ log error nếu không phải 401 (unauthorized)
      if (err.response?.status !== 401) {
        console.error('Error fetching stats:', err);
      }
      setStats({
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        totalEarnings: 0,
      });
    }
  };

  // Fetch available customers
  const fetchAvailableCustomers = async () => {
    // Kiểm tra authentication trước khi gọi API
    if (!user?.token) {
      setAvailableCustomers([]);
      setLoadingCustomers(false);
      return;
    }

    try {
      setLoadingCustomers(true);
      const response = await api.get('sender/available-customers');

      let customersData = [];
      if (response.data?.success && response.data?.data) {
        if (Array.isArray(response.data.data)) {
          customersData = response.data.data;
        }
      }

      setAvailableCustomers(customersData);
    } catch (err: any) {
      // Chỉ log error nếu không phải 401 (unauthorized)
      if (err.response?.status !== 401) {
        console.error('Error fetching available customers:', err);
      }
      setAvailableCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useOrderMatchList(
    orders.map((o) => o.id),
    (chatId) => {
      router.push(`/chat/${chatId}`);
    }
  );

  const handleSearch = async (searchParams: any) => {
    console.log('Dữ liệu gửi lên API:', searchParams);

    setSearchLoading(true);
    setSearchModalVisible(false);

    try {
      // Gọi API sử dụng instance api đã config sẵn
      const response = await api.get('flights/search', {
        params: {
          from_airport: searchParams.from_airport,
          to_airport: searchParams.to_airport,
          date: searchParams.date,
          time_slot: searchParams.time_slot,
          item_type: searchParams.item_type,
          item_value: searchParams.item_value,
        },
      });

      console.log('API Response:', response.data);

      // Kiểm tra response thành công
      if (response.data.success) {
        router.push({
          pathname: '/PassengerSearchResultsScreen',
          params: {
            departureCode: searchParams.from_airport,
            departureLabel: searchParams.departureLabel,
            arrivalCode: searchParams.to_airport,
            arrivalLabel: searchParams.arrivalLabel,
            date: searchParams.date,
            timeSlot: searchParams.time_slot,
            searchResults: JSON.stringify(response.data.data || []),
          },
        });
      } else {
        Alert.alert('Lỗi', response.data.message || 'Không tìm thấy kết quả phù hợp');
      }
    } catch (err: any) {
      console.error('Search error:', err);

      // Xử lý lỗi chi tiết
      const errorMessage =
        err.response?.data?.message ||
        err.message ||
        'Có lỗi xảy ra khi tìm kiếm';

      Alert.alert('Lỗi', errorMessage);
    } finally {
      setSearchLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      {/* Header cố định */}
      <View className="sticky top-0 z-10 border-b border-gray-200 bg-background-light px-4 pb-2 pt-4 dark:border-gray-700 dark:bg-background-dark">
        <View className="h-12 flex-row items-center justify-between">
          <Text className="text-text-primary text-3xl font-bold dark:text-white">
            Xin chào, {user?.name || 'Bạn'}!
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            className="relative"
          >
            <MaterialIcons name="notifications" size={28} color="#2563EB" />
            {unreadNotificationCount > 0 && (
              <View className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full items-center justify-center border-2 border-white">
                <Text className="text-white text-xs font-bold">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <Text className="text-text-secondary mt-1 dark:text-gray-400">
          Bạn cần gửi tài liệu đi đâu hôm nay?
        </Text>
      </View>

      <ScrollView className="flex-1 px-4 pb-32" showsVerticalScrollIndicator={false}>
        {/* Banner Slider */}
        <View className="mt-4">
          <BannerSlider
            items={[
              {
                id: '1',
                title: 'Gửi hàng nhanh chóng',
                description: 'Tìm hành khách phù hợp trong vài phút',
                icon: 'local-shipping',
                color: '#2563EB',
                action: () => {
                  // Scroll to search form
                },
              },
              {
                id: '2',
                title: 'An toàn & Bảo đảm',
                description: 'Hệ thống bảo vệ giao dịch của bạn',
                icon: 'verified',
                color: '#10B981',
                action: () => router.push('/upload_guide_screen'),
              },
              {
                id: '3',
                title: 'Kiếm thêm thu nhập',
                description: `Đã kiếm được ${stats.totalEarnings.toLocaleString('vi-VN')} VND`,
                icon: 'attach-money',
                color: '#F59E0B',
                action: () => router.push('/(tabs)/(sender)/list_orders'),
              },
            ]}
            height={140}
          />
        </View>

        {/* Quick Stats */}
        <View className="mb-4 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-800">
          <Text className="mb-3 text-base font-bold text-text-primary dark:text-white">
            Thống kê nhanh
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <View className="flex-1 min-w-[45%] rounded-lg bg-primary/10 p-3 dark:bg-primary/20">
              <View className="flex-row items-center gap-2 mb-1">
                <MaterialIcons name="shopping-bag" size={20} color="#2563EB" />
                <Text className="text-xs text-text-secondary dark:text-gray-400">
                  Tổng đơn hàng
                </Text>
              </View>
              <Text className="text-xl font-bold text-primary">
                {stats.totalOrders}
              </Text>
            </View>

            <View className="flex-1 min-w-[45%] rounded-lg bg-green-100 p-3 dark:bg-green-900/30">
              <View className="flex-row items-center gap-2 mb-1">
                <MaterialIcons name="check-circle" size={20} color="#10B981" />
                <Text className="text-xs text-text-secondary dark:text-gray-400">
                  Đã hoàn thành
                </Text>
              </View>
              <Text className="text-xl font-bold text-green-600 dark:text-green-400">
                {stats.completedOrders}
              </Text>
            </View>

            <View className="flex-1 min-w-[45%] rounded-lg bg-orange-100 p-3 dark:bg-orange-900/30">
              <View className="flex-row items-center gap-2 mb-1">
                <MaterialIcons name="schedule" size={20} color="#F59E0B" />
                <Text className="text-xs text-text-secondary dark:text-gray-400">
                  Đang xử lý
                </Text>
              </View>
              <Text className="text-xl font-bold text-orange-600 dark:text-orange-400">
                {stats.pendingOrders}
              </Text>
            </View>

            <View className="flex-1 min-w-[45%] rounded-lg bg-purple-100 p-3 dark:bg-purple-900/30">
              <View className="flex-row items-center gap-2 mb-1">
                <MaterialIcons name="attach-money" size={20} color="#8B5CF6" />
                <Text className="text-xs text-text-secondary dark:text-gray-400">
                  Tổng thu nhập
                </Text>
              </View>
              <Text className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {stats.totalEarnings.toLocaleString('vi-VN')} đ
              </Text>
            </View>
          </View>
        </View>


        {/* Tips Section */}
        <View className="mb-4 rounded-xl bg-blue-50 p-4 dark:bg-blue-900/20">
          <View className="mb-2 flex-row items-center gap-2">
            <MaterialIcons name="lightbulb" size={24} color="#2563EB" />
            <Text className="text-base font-bold text-text-primary dark:text-white">
              Mẹo sử dụng
            </Text>
          </View>
          <View className="gap-2">
            <View className="flex-row items-start gap-2">
              <MaterialIcons name="check-circle" size={16} color="#10B981" style={{ marginTop: 2 }} />
              <Text className="flex-1 text-sm text-text-secondary dark:text-gray-300">
                Điền đầy đủ thông tin để tìm được hành khách phù hợp nhất
              </Text>
            </View>
            <View className="flex-row items-start gap-2">
              <MaterialIcons name="check-circle" size={16} color="#10B981" style={{ marginTop: 2 }} />
              <Text className="flex-1 text-sm text-text-secondary dark:text-gray-300">
                Ước tính giá trị tài liệu chính xác để đặt mức thưởng phù hợp
              </Text>
            </View>
            <View className="flex-row items-start gap-2">
              <MaterialIcons name="check-circle" size={16} color="#10B981" style={{ marginTop: 2 }} />
              <Text className="flex-1 text-sm text-text-secondary dark:text-gray-300">
                Kiểm tra thông báo thường xuyên để không bỏ lỡ cơ hội
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Floating Action Button - Tìm hành khách */}
      <TouchableOpacity
        onPress={() => setSearchModalVisible(true)}
        className="absolute bottom-6 right-6 h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg"
        style={{
          shadowColor: '#2563EB',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <MaterialIcons name="search" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Search Modal */}
      <SearchFlightModal
        visible={searchModalVisible}
        onClose={() => setSearchModalVisible(false)}
        onSearch={handleSearch}
        searchLoading={searchLoading}
      />
    </SafeAreaView>
  );
};

export default Home;
