// Roles Selection Screen - Updated UI/UX with friendly colors
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View, SafeAreaView, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const Roles = () => {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>('sender');

  const handlePress = () => {
    if (!selectedRole) {
      Alert.alert('Vui lòng chọn vai trò', 'Bạn cần chọn một vai trò trước khi tiếp tục');
      return;
    }

    router.push({
      pathname: '/register',
      params: { role: selectedRole },
    });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Chọn vai trò',
          headerShown: false,
        }}
      />
      <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-1 px-6 py-8">
            {/* Header */}
            <View className="items-center mb-8">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                <MaterialIcons name="person-outline" size={40} color="#2563EB" />
              </View>
              <Text className="text-3xl font-bold text-center text-primary mb-2">
                Chọn vai trò của bạn
              </Text>
              <Text className="text-base text-center text-text-secondary dark:text-gray-400 max-w-xs">
                Bạn muốn sử dụng SkySend với vai trò nào?
              </Text>
            </View>

            {/* Illustration */}
            <View className="flex-row justify-center mb-8">
              <Image
                source={require('../assets/images/role.webp')}
                className="max-h-[240px] w-[240px]"
                resizeMode="contain"
              />
            </View>

            {/* Role Selection Cards */}
            <View className="gap-4 mb-6">
              {/* Sender Card */}
              <TouchableOpacity
                onPress={() => setSelectedRole('sender')}
                activeOpacity={0.8}
                className={`rounded-2xl p-5 border-2 ${
                  selectedRole === 'sender'
                    ? 'border-primary shadow-lg'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 shadow-sm'
                }`}
                style={{
                  backgroundColor: selectedRole === 'sender' 
                    ? '#EFF6FF' 
                    : undefined,
                  borderColor: selectedRole === 'sender' 
                    ? '#2563EB' 
                    : undefined,
                }}
              >
                <View className="flex-row items-start gap-4">
                  <View 
                    className={`h-14 w-14 items-center justify-center rounded-xl ${
                      selectedRole === 'sender'
                        ? 'bg-primary/20'
                        : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}
                  >
                    <MaterialIcons 
                      name="send" 
                      size={28} 
                      color={selectedRole === 'sender' ? '#2563EB' : '#60A5FA'} 
                    />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-2">
                      <Text 
                        className={`text-xl font-bold ${
                          selectedRole === 'sender'
                            ? 'text-primary'
                            : 'text-text-primary dark:text-white'
                        }`}
                      >
                        Người Gửi Hàng
                      </Text>
                      {selectedRole === 'sender' && (
                        <View className="h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <MaterialIcons name="check" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text 
                      className={`text-sm leading-5 ${
                        selectedRole === 'sender'
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-text-secondary dark:text-gray-400'
                      }`}
                    >
                      Tạo yêu cầu vận chuyển, chờ người đi đường nhận giao hàng giúp bạn
                    </Text>
                    {selectedRole === 'sender' && (
                      <View className="flex-row items-center gap-1 mt-3">
                        <MaterialIcons name="star" size={14} color="#F59E0B" />
                        <Text className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                          Phù hợp cho người cần gửi hàng
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>

              {/* Customer Card */}
              <TouchableOpacity
                onPress={() => setSelectedRole('customer')}
                activeOpacity={0.8}
                className={`rounded-2xl p-5 border-2 ${
                  selectedRole === 'customer'
                    ? 'border-green-500 shadow-lg'
                    : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700 shadow-sm'
                }`}
                style={{
                  backgroundColor: selectedRole === 'customer' 
                    ? '#F0FDF4' 
                    : undefined,
                  borderColor: selectedRole === 'customer' 
                    ? '#10B981' 
                    : undefined,
                }}
              >
                <View className="flex-row items-start gap-4">
                  <View 
                    className={`h-14 w-14 items-center justify-center rounded-xl ${
                      selectedRole === 'customer'
                        ? 'bg-green-500/20'
                        : 'bg-green-100 dark:bg-green-900/30'
                    }`}
                  >
                    <MaterialIcons 
                      name="flight" 
                      size={28} 
                      color={selectedRole === 'customer' ? '#10B981' : '#34D399'} 
                    />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-2">
                      <Text 
                        className={`text-xl font-bold ${
                          selectedRole === 'customer'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-text-primary dark:text-white'
                        }`}
                      >
                        Hành Khách
                      </Text>
                      {selectedRole === 'customer' && (
                        <View className="h-5 w-5 items-center justify-center rounded-full bg-green-500">
                          <MaterialIcons name="check" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text 
                      className={`text-sm leading-5 ${
                        selectedRole === 'customer'
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-text-secondary dark:text-gray-400'
                      }`}
                    >
                      Nhận đơn phù hợp với lịch trình, hỗ trợ giao hàng và kiếm thêm thu nhập
                    </Text>
                    {selectedRole === 'customer' && (
                      <View className="flex-row items-center gap-1 mt-3">
                        <MaterialIcons name="attach-money" size={14} color="#10B981" />
                        <Text className="text-xs text-green-600 dark:text-green-400 font-medium">
                          Kiếm thêm thu nhập khi đi du lịch
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Continue Button */}
            <TouchableOpacity
              onPress={handlePress}
              disabled={!selectedRole}
              className={`w-full rounded-2xl px-6 py-4 shadow-lg ${
                selectedRole
                  ? 'bg-primary'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              activeOpacity={0.8}
            >
              <View className="flex-row items-center justify-center gap-2">
                <Text className="text-white text-center text-lg font-bold">
                  Tiếp tục
                </Text>
                <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            {/* Login Link */}
            <View className="flex-row justify-center items-center gap-2 mt-6">
              <Text className="text-text-secondary dark:text-gray-400">
                Đã có tài khoản?
              </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text className="text-primary font-semibold">Đăng nhập</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

export default Roles;
