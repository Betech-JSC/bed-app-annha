// components/UserProfileInfo.tsx
import React from 'react';
import { View, Text, Image, ImageSourcePropType } from 'react-native';
import { DEMO_AVATAR, getAvatarUrl } from '@/constants/avatars';

interface UserProfileInfoProps {
    avatar?: string | ImageSourcePropType;
    name?: string;
    subtitle?: string;
    size?: 'small' | 'medium' | 'large';
    showVerified?: boolean;
    showUrgent?: boolean;
    className?: string;
}

const sizeConfig = {
    small: {
        avatar: 'w-10 h-10',
        name: 'text-sm',
        subtitle: 'text-xs',
    },
    medium: {
        avatar: 'w-12 h-12',
        name: 'text-base',
        subtitle: 'text-sm',
    },
    large: {
        avatar: 'w-14 h-14',
        name: 'text-lg',
        subtitle: 'text-sm',
    },
};

export default function UserProfileInfo({
    avatar,
    name,
    subtitle,
    size = 'medium',
    showVerified = false,
    showUrgent = false,
    className = '',
}: UserProfileInfoProps) {
    const config = sizeConfig[size];

    // Xử lý avatar - có thể là string URI hoặc ImageSourcePropType
    const avatarSource = typeof avatar === 'string'
        ? { uri: getAvatarUrl(avatar) }
        : avatar || { uri: DEMO_AVATAR };

    return (
        <View className={`flex-row items-center gap-3 ${className}`}>
            <Image
                source={avatarSource}
                className={`${config.avatar} rounded-full`}
                resizeMode="cover"
            />
            <View className="flex-1">
                <View className="flex-row items-center gap-2">
                    <Text className={`${config.name} font-bold text-text-dark-gray dark:text-white`} numberOfLines={1}>
                        {name || 'Người dùng'}
                    </Text>
                    {showVerified && (
                        <View className="bg-green-500/10 px-2 py-0.5 rounded-full">
                            <Text className="text-xs font-medium text-green-600 dark:text-green-400">✓</Text>
                        </View>
                    )}
                    {showUrgent && (
                        <View className="bg-red-500/10 px-2 py-0.5 rounded-full">
                            <Text className="text-xs font-bold text-red-600">Khẩn cấp</Text>
                        </View>
                    )}
                </View>
                {subtitle && (
                    <Text className={`${config.subtitle} text-gray-500 dark:text-gray-400`} numberOfLines={1}>
                        {subtitle}
                    </Text>
                )}
            </View>
        </View>
    );
}

