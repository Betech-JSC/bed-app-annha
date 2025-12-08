// app/(tabs)/settings/preferences.tsx
import React from 'react';
import { View, Text, Switch } from 'react-native';

export default function PreferencesScreen() {
    const [darkMode, setDarkMode] = React.useState(false);
    const [notifications, setNotifications] = React.useState(true);

    return (
        <View className="flex-1 bg-white p-4">
            <Text className="text-2xl font-bold mb-6">Cài đặt</Text>

            <View className="flex-row justify-between items-center py-4 border-b border-gray-300">
                <Text className="text-base">Chế độ tối</Text>
                <Switch value={darkMode} onValueChange={setDarkMode} />
            </View>

            <View className="flex-row justify-between items-center py-4 border-b border-gray-300">
                <Text className="text-base">Thông báo</Text>
                <Switch value={notifications} onValueChange={setNotifications} />
            </View>
        </View>
    );
}
