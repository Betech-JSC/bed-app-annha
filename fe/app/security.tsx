// app/(tabs)/settings/security.tsx
import React from 'react';
import { View, Text, Switch } from 'react-native';

export default function SecurityScreen() {
    const [biometric, setBiometric] = React.useState(true);

    return (
        <View className="flex-1 bg-white p-4">
            <Text className="text-2xl font-bold mb-6">Bảo mật</Text>

            <View className="flex-row justify-between items-center py-4 border-b border-gray-300">
                <Text className="text-base">Mở khóa vân tay / FaceID</Text>
                <Switch value={biometric} onValueChange={setBiometric} />
            </View>

            <View className="flex-row justify-between items-center py-4 border-b border-gray-300">
                <Text className="text-base">Thay đổi mật khẩu</Text>
            </View>
        </View>
    );
}
