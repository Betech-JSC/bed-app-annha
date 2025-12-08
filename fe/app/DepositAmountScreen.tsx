// DepositAmountScreen.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
    Image,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { MaterialIcons } from '@expo/vector-icons';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
    }).format(amount);
};

import { useRouter, useLocalSearchParams, Stack } from 'expo-router';

export default function DepositAmountScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { colorScheme } = useColorScheme();
    const method = (params?.method as string) || 'MoMo';

    const [amount, setAmount] = useState(100000); // đơn vị: đồng

    const quickAmounts = [100000, 200000, 500000, 1000000];

    const momoLogo =
        'https://lh3.googleusercontent.com/aida-public/AB6AXuACH73R5cuqdB273kxf_ByHEUJS3uuO7kfNIIwyBe3DBsAdCeJDGu8BefbyvGS1deuWyfqiQMXmr8DwdL8JzyPay_WTG_oYnPPokVYAua01EsflgGS6hThgOlPs3lB7ooTze8uk_2CC6m3BRVVEjvrYaWjaCRZFMlFP6d-C3_ckFGD0CWddWe3h7HkabSQ1-z2ZugPIEcx8y9YK4l-cR4JeqTR9dtWrcEIOai-RdwxARdMJkpAf-8UBU9gkb_MLPNCEyNDOaOiEwOfW';

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Nạp tiền vào ví',
                    headerShown: true,
                }}
            />
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

                <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                    {/* Phương thức thanh toán */}
                    <View className="flex-row items-center gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-6">
                        <Image source={{ uri: momoLogo }} className="w-10 h-10" resizeMode="contain" />
                        <Text className="flex-1 text-base font-medium text-text-dark-gray dark:text-gray-200 truncate">
                            Qua Momo - 09x.xxx.xxx
                        </Text>
                    </View>

                    {/* Nhập số tiền */}
                    <View className="mb-6">
                        <Text className="text-base font-medium text-text-dark-gray dark:text-gray-200 mb-2">
                            Số tiền cần nạp
                        </Text>
                        <TextInput
                            value={amount > 0 ? formatCurrency(amount) : ''}
                            onChangeText={(text) => {
                                const num = parseInt(text.replace(/\D/g, '')) || 0;
                                setAmount(num);
                            }}
                            placeholder="0 VNĐ"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            className="h-14 px-4 bg-white dark:bg-gray-800 rounded-lg text-lg font-bold text-text-dark-gray dark:text-white"
                        />

                        {/* Chip chọn nhanh */}
                        <View className="flex-row flex-wrap gap-3 mt-3">
                            {quickAmounts.map((val) => (
                                <TouchableOpacity
                                    key={val}
                                    onPress={() => setAmount(val)}
                                    className={`flex-1 h-10 items-center justify-center rounded-full ${amount === val ? 'bg-primary/20' : 'bg-white dark:bg-gray-800'
                                        }`}
                                >
                                    <Text
                                        className={`text-sm font-bold ${amount === val ? 'text-primary' : 'text-text-dark-gray dark:text-gray-200'
                                            }`}
                                    >
                                        {formatCurrency(val).replace('₫', 'đ')}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View className="flex-grow" />

                    {/* Tóm tắt giao dịch */}
                    <View className="mt-8">
                        <Text className="text-lg font-bold text-text-dark-gray dark:text-white mb-3">
                            Tóm tắt giao dịch
                        </Text>
                        <View className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm space-y-4">
                            <View className="flex-row justify-between">
                                <Text className="text-gray-600 dark:text-gray-300">Số tiền nạp</Text>
                                <Text className="font-medium text-text-dark-gray dark:text-gray-100">
                                    {formatCurrency(amount)}
                                </Text>
                            </View>
                            <View className="flex-row justify-between">
                                <Text className="text-gray-600 dark:text-gray-300">Phí giao dịch</Text>
                                <Text className="font-medium text-text-dark-gray dark:text-gray-100">Miễn phí</Text>
                            </View>
                            <View className="border-t border-dashed border-gray-200 dark:border-gray-700 my-3" />
                            <View className="flex-row justify-between items-center">
                                <Text className="font-medium text-gray-600 dark:text-gray-300">Tổng tiền thanh toán</Text>
                                <Text className="text-xl font-bold text-primary">{formatCurrency(amount)}</Text>
                            </View>
                        </View>
                    </View>

                    <View className="h-32" />
                </ScrollView>

                {/* Nút xác nhận cố định */}
                <View className="absolute bottom-0 left-0 right-0 bg-background-light dark:bg-background-dark px-4 pt-4 pb-6">
                    <TouchableOpacity
                        onPress={() => navigation.navigate('DepositSuccess')}
                        className="h-14 w-full bg-primary rounded-lg items-center justify-center shadow-md shadow-primary/30"
                    >
                        <Text className="text-white text-base font-bold">Xác nhận nạp tiền</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </>
    );
}