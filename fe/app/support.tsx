// app/(tabs)/settings/help.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function HelpScreen() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-white p-4">
            <Text className="text-2xl font-bold mb-6">Trợ giúp</Text>

            <TouchableOpacity
                onPress={() => router.push('/faqs')}
                className="py-4 border-b border-gray-300">
                <Text className="text-base">FAQ</Text>
            </TouchableOpacity>

            <TouchableOpacity
                onPress={() => router.push('/privacy_policy')}
                className="py-4 border-b border-gray-300">
                <Text className="text-base">Chính sách bảo mật</Text>
            </TouchableOpacity>
        </View>
    );
}
