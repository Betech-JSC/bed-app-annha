// app/(customer)/wallet.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function WalletScreen() {
    const router = useRouter();

    const balance = '1,250,000đ';

    const transactions = [
        { type: 'income', title: 'Nạp tiền vào ví', date: '15/07/2024, 09:30', amount: '+ 2,000,000đ', icon: 'account-balance-wallet' },
        { type: 'expense', title: 'Thanh toán phí vận chuyển', date: '14/07/2024, 18:45', amount: '- 50,000đ', icon: 'receipt-long' },
        { type: 'income', title: 'Nhận tiền từ đơn #SKS123', date: '13/07/2024, 11:20', amount: '+ 300,000đ', icon: 'card-giftcard' },
        { type: 'expense', title: 'Rút tiền về tài khoản', date: '12/07/2024, 15:00', amount: '- 1,000,000đ', icon: 'credit-card' },
    ];

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Top App Bar */}
            <View className="sticky top-0 z-10 flex-row items-center justify-between bg-background-light dark:bg-background-dark px-4 py-4">
                <TouchableOpacity onPress={() => router.back()}>
                    <MaterialIcons name="arrow-back" size={28} color="#1F2937" className="dark:text-white" />
                </TouchableOpacity>
                <Text className="absolute left-0 right-0 text-center text-xl font-bold text-text-primary dark:text-white">
                    Ví tiền
                </Text>
                <View className="w-10" />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Balance Card */}
                <View className="px-4 pt-6">
                    <View className="rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-sm">
                        <Text className="text-center text-base font-medium text-text-secondary dark:text-slate-400">
                            Số dư khả dụng
                        </Text>
                        <Text className="mt-3 text-center text-4xl font-bold tracking-tight text-text-primary dark:text-white">
                            {balance}
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View className="mt-8 px-4">
                    <View className="grid grid-cols-2 gap-4">
                        <TouchableOpacity
                            onPress={() => router.push('/deposit')}
                            className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700"
                        >
                            <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto">
                                <MaterialIcons name="add" size={32} color="#2563EB" />
                            </View>
                            <Text className="mt-4 text-center text-base font-bold text-text-primary dark:text-white">
                                Nạp tiền
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => router.push('/withdraw')}
                            className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700"
                        >
                            <View className="h-14 w-14 items-center justify-center rounded-full bg-primary/10 mx-auto">
                                <MaterialIcons name="remove" size={32} color="#2563EB" />
                            </View>
                            <Text className="mt-4 text-center text-base font-bold text-text-primary dark:text-white">
                                Rút tiền
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Transaction History */}
                <View className="mt-10 px-4 pb-10">
                    <Text className="mb-4 text-lg font-bold text-text-primary dark:text-white">
                        Lịch sử giao dịch
                    </Text>

                    <View className="gap-y-3">
                        {transactions.map((tx, index) => (
                            <View
                                key={index}
                                className="flex-row items-center rounded-2xl bg-white dark:bg-slate-800 p-4 shadow-sm"
                            >
                                {/* Icon */}
                                <View
                                    className={`h-12 w-12 items-center justify-center rounded-full ${tx.type === 'income' ? 'bg-green-100 dark:bg-green-900/40' : 'bg-red-100 dark:bg-red-900/40'
                                        }`}
                                >
                                    <MaterialIcons
                                        name={tx.icon as any}
                                        size={24}
                                        color={tx.type === 'income' ? '#16A34A' : '#DC2626'}
                                    />
                                </View>

                                {/* Info */}
                                <View className="flex-1 ml-4">
                                    <Text className="font-semibold text-text-primary dark:text-white">
                                        {tx.title}
                                    </Text>
                                    <Text className="text-sm text-text-secondary dark:text-slate-400">
                                        {tx.date}
                                    </Text>
                                </View>

                                {/* Amount */}
                                <Text
                                    className={`font-bold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                        }`}
                                >
                                    {tx.amount}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}