import React from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MotiView } from 'moti';

export default function FlightPostedSuccessScreen() {
  const router = useRouter();
  const { flightId } = useLocalSearchParams();

  // Kiểm tra flightId có tồn tại không (debug)
  React.useEffect(() => {
    console.log('FlightPostedSuccess - flightId nhận được:', flightId);
    if (!flightId) {
      Alert.alert('Lỗi', 'Không nhận được ID chuyến bay từ màn hình trước!');
    }
  }, [flightId]);

  const handleViewDetail = () => {
    if (!flightId) {
      Alert.alert('Lỗi', 'Không có ID chuyến bay để xem chi tiết');
      return;
    }

    // Ép kiểu thành string để tránh lỗi params bị object
    const idString = Array.isArray(flightId) ? flightId[0] : String(flightId);

    router.push({
      pathname: '/detail-flight-customer',
      params: { id: idString },
    });
  };

  const handleGoHome = () => {
    router.replace('/(tabs)/home'); // replace để không quay lại màn này
  };

  return (
    <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
      <View className="flex-1 justify-between p-6">
        {/* Nội dung chính */}
        <View className="flex-1 items-center justify-center">
          <MotiView
            from={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', delay: 100 }}>
            <View className="h-32 w-32 items-center justify-center rounded-full bg-green-500 shadow-lg">
              <MaterialIcons name="check" size={80} color="white" />
            </View>
          </MotiView>

          <MotiView
            from={{ translateY: 30, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            transition={{ delay: 300, type: 'timing', duration: 600 }}
            className="mt-10 items-center px-8">
            <Text className="text-text-dark-gray text-center text-2xl font-bold dark:text-white">
              Đăng chuyến bay thành công!
            </Text>
            <Text className="mt-3 max-w-xs text-center text-base text-gray-600 dark:text-gray-400">
              Chuyến bay của bạn đang chờ hệ thống xác thực. Chúng tôi sẽ thông báo cho bạn khi có kết quả.
            </Text>
          </MotiView>
        </View>

        {/* 2 nút dưới cùng */}
        <View className="gap-y-3">
          <TouchableOpacity
            onPress={handleViewDetail}
            className="h-14 items-center justify-center rounded-lg bg-primary shadow-sm">
            <Text className="text-base font-bold text-white">Xem chi tiết chuyến bay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGoHome}
            className="h-14 items-center justify-center rounded-lg border border-gray-300 bg-transparent dark:border-gray-700">
            <Text className="text-base font-bold text-gray-700 dark:text-gray-300">
              Quay về Trang chủ
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
