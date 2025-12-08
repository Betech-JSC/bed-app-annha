import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { MaterialIcons } from '@expo/vector-icons';

import { useRouter, Stack } from 'expo-router';

export default function UploadGuideScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();

    const steps = [
        {
            icon: 'photo-camera',
            title: 'Bước 1: Chụp ảnh rõ nét',
            desc: 'Chụp ảnh rõ nét toàn bộ vé, không bị mờ hoặc chói sáng.',
        },
        {
            icon: 'checklist',
            title: 'Bước 2: Đảm bảo đủ thông tin',
            desc: 'Đảm bảo thấy rõ Mã chuyến bay, Tên hành khách và Ngày bay.',
        },
        {
            icon: 'upload-file',
            title: 'Bước 3: Tải lên định dạng phù hợp',
            desc: 'Chúng tôi chấp nhận các định dạng file JPG, PNG, hoặc PDF.',
        },
    ];

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Hướng dẫn tải vé máy bay',
                    headerShown: true,
                }}
            />
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

                {/* Main Content */}
                <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                    <View className="gap-5 pb-32 pt-2">
                        {steps.map((step, index) => (
                            <View
                                key={index}
                                className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-gray-800"
                            >
                                {/* Icon Area */}
                                <View className="h-48 items-center justify-center bg-primary/10 dark:bg-primary/20">
                                    <MaterialIcons
                                        name={step.icon}
                                        size={80}
                                        color="#2563EB"
                                        style={{ opacity: 0.9 }}
                                    />
                                </View>

                                {/* Text Area */}
                                <View className="p-5">
                                    <Text className="text-lg font-bold text-text-dark-gray dark:text-white">
                                        {step.title}
                                    </Text>
                                    <Text className="mt-1 text-base text-text-light-gray dark:text-gray-300">
                                        {step.desc}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </ScrollView>

                {/* Bottom Button - Sticky */}
                <View className="absolute bottom-0 left-0 right-0 bg-background-light dark:bg-background-dark p-4 shadow-2xl">
                    <TouchableOpacity
                        onPress={() => navigation.navigate('UploadTicket')} // hoặc mở picker
                        className="h-14 w-full items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30"
                    >
                        <Text className="text-base font-bold text-white tracking-wide">
                            Tải vé lên ngay
                        </Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </>
    );
}