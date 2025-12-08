import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { MaterialIcons } from '@expo/vector-icons';

export default function RatingSuccessScreen({ navigation }: any) {
    const { colorScheme } = useColorScheme();

    return (
        <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

            {/* Main Content - Căn giữa */}
            <View className="flex-1 justify-center items-center px-6">
                <View className="items-center max-w-sm w-full">

                    {/* Icon Check Circle */}
                    <View className="w-24 h-24 bg-success-green/10 rounded-full items-center justify-center mb-8">
                        <MaterialIcons
                            name="check-circle"
                            size={80}
                            color="#10B981"
                        />
                    </View>

                    {/* Tiêu đề */}
                    <Text className="text-[28px] font-bold text-text-dark-gray dark:text-white text-center leading-tight px-4">
                        Đánh giá thành công!
                    </Text>

                    {/* Mô tả */}
                    <Text className="text-base text-text-dark-gray/80 dark:text-white/80 text-center mt-3 px-4">
                        Cảm ơn bạn đã chia sẻ trải nghiệm của mình với SkySend.
                    </Text>
                </View>
            </View>

            {/* Bottom Buttons - Sticky */}
            <View className="p-4 space-y-3 bg-background-light dark:bg-background-dark">
                {/* Nút chính */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('Home')}
                    className="h-12 rounded-xl bg-primary flex-row justify-center items-center"
                >
                    <Text className="text-white text-base font-bold">
                        Quay về Trang chủ
                    </Text>
                </TouchableOpacity>

                {/* Nút phụ */}
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="h-12 rounded-xl border border-gray-300 dark:border-gray-600 flex-row justify-center items-center"
                >
                    <Text className="text-text-dark-gray dark:text-white text-base font-bold">
                        Xem lại đánh giá
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}