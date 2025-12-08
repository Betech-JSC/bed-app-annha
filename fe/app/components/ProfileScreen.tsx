// Shared Profile Screen Component for both Sender and Customer
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Image,
    Switch,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '@/reducers/userSlice';
import { RootState } from '@/store';
import api from '@/api/api';
import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { DEMO_AVATAR, getAvatarUrl } from '@/constants/avatars';

interface UserProfile {
    id: string;
    name: string;
    email: string;
    phone: string;
    avatar?: string;
    role: string;
    kyc_status?: 'pending' | 'verified' | 'rejected' | null;
}

export default function ProfileScreen() {
    const router = useRouter();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.user);
    const role = user?.role || 'customer';
    const isSender = role === 'sender';

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [kycStatus, setKycStatus] = useState<string | null>(null);

    // Load user profile and KYC status
    useEffect(() => {
        loadUserProfile();
        // loadKycStatus();
    }, []);

    const loadUserProfile = async () => {
        try {
            setLoading(true);
            const response = await api.get('user/profile');
            if (response.data) {
                const userData = response.data.data?.user || response.data.data || response.data.user || response.data;

                // Xử lý avatar URL
                let avatarUrl = null;
                if (userData.avatar_url) {
                    avatarUrl = userData.avatar_url;
                } else if (userData.avatar) {
                    // Nếu là relative path, convert thành full URL
                    if (userData.avatar.startsWith('storage/') || userData.avatar.startsWith('avatars/')) {
                        const baseUrl = API_URL || 'http://localhost:8000';
                        avatarUrl = `${baseUrl}/storage/${userData.avatar.replace('storage/', '')}`;
                    } else if (userData.avatar.startsWith('http')) {
                        avatarUrl = userData.avatar;
                    }
                }

                setProfile({
                    id: userData.id || user?.id || '',
                    name: userData.name || user?.name || 'Người dùng',
                    email: userData.email || user?.email || '',
                    phone: userData.phone || user?.phone || 'Chưa có số điện thoại',
                    avatar: avatarUrl,
                    role: userData.role || user?.role || 'customer',
                    kyc_status: userData.kyc_status || null,
                });
            }
        } catch (error: any) {
            console.error('Error loading user profile:', error);
            // Fallback to Redux store data
            if (user) {
                setProfile({
                    id: user.id || '',
                    name: user.name || 'Người dùng',
                    email: user.email || '',
                    phone: user.phone || 'Chưa có số điện thoại',
                    avatar: (user as any).avatar || null,
                    role: user.role || 'customer',
                    kyc_status: null,
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const loadKycStatus = async () => {
        try {
            const response = await api.get('kyc/status');
            if (response.data?.success && response.data?.data) {
                setKycStatus(response.data.data.kyc_status);
            }
        } catch (error: any) {
            console.error('Error loading KYC status:', error);
        }
    };

    const toggleRole = () => {
        if (!user) return;
        const newRole = isSender ? 'customer' : 'sender';
        dispatch(setUser({ ...user, role: newRole }));
    };

    const logout = async () => {
        Alert.alert(
            'Xác nhận',
            'Bạn có chắc chắn muốn đăng xuất?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Đăng xuất',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.post('logout');
                            await AsyncStorage.removeItem('user');
                            Alert.alert('Đăng xuất thành công');
                            router.replace('/login');
                        } catch (error: any) {
                            Alert.alert('Lỗi', error.response?.data?.message || 'Đăng xuất thất bại');
                        }
                    },
                },
            ]
        );
    };

    const getAvatarUri = () => {
        return getAvatarUrl(profile?.avatar, API_URL);
    };

    const getKycStatusBadge = () => {
        const status = kycStatus || profile?.kyc_status;

        switch (status) {
            case 'verified':
                return (
                    <View className="mt-3 flex-row items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 dark:bg-green-900/40">
                        <MaterialIcons name="verified" size={18} color="#16A34A" />
                        <Text className="text-sm font-medium text-green-800 dark:text-green-300">
                            Đã xác minh danh tính
                        </Text>
                    </View>
                );
            case 'pending':
                return (
                    <View className="mt-3 flex-row items-center gap-2 rounded-full bg-yellow-100 px-3 py-1.5 dark:bg-yellow-900/40">
                        <MaterialIcons name="hourglass-empty" size={18} color="#D97706" />
                        <Text className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                            Đang chờ duyệt KYC
                        </Text>
                    </View>
                );
            case 'rejected':
                return (
                    <View className="mt-3 flex-row items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 dark:bg-red-900/40">
                        <MaterialIcons name="cancel" size={18} color="#EF4444" />
                        <Text className="text-sm font-medium text-red-800 dark:text-red-300">
                            KYC bị từ chối
                        </Text>
                    </View>
                );
            default:
                return (
                    <View className="mt-3 flex-row items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-800">
                        <MaterialIcons name="info" size={18} color="#6B7280" />
                        <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Chưa xác minh danh tính
                        </Text>
                    </View>
                );
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-background-light dark:bg-background-dark justify-center items-center">
                <ActivityIndicator size="large" color="#2563EB" />
                <Text className="mt-4 text-gray-600 dark:text-gray-400">Đang tải...</Text>
            </View>
        );
    }

    const displayProfile = profile || {
        id: user?.id || '',
        name: user?.name || 'Người dùng',
        email: user?.email || '',
        phone: user?.phone || 'Chưa có số điện thoại',
        avatar: null,
        role: user?.role || 'customer',
    };

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Top App Bar */}
            <View className="sticky top-0 z-10 flex-row items-center justify-between bg-background-light dark:bg-background-dark px-4 py-4">
                <Text className="absolute left-0 right-0 text-center text-xl font-bold text-text-primary dark:text-white">
                    Tài khoản
                </Text>
                <View className="w-10" />
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Avatar + Info */}
                <View className="items-center px-4 pt-8">
                    <View className="h-28 w-28 overflow-hidden rounded-full border-4 border-white shadow-xl">
                        <Image
                            source={{
                                uri: getAvatarUri(),
                            }}
                            className="h-full w-full"
                            resizeMode="cover"
                            defaultSource={require("@assets/images/avatar.webp")}
                        />
                    </View>

                    <Text className="mt-4 text-2xl font-bold text-text-primary dark:text-white">
                        {displayProfile.name}
                    </Text>
                    <Text className="mt-1 text-base text-text-secondary dark:text-slate-400">
                        {displayProfile.phone}
                    </Text>
                    {displayProfile.email && (
                        <Text className="mt-1 text-sm text-text-secondary dark:text-slate-400">
                            {displayProfile.email}
                        </Text>
                    )}

                    {/* KYC Status Badge */}
                    {getKycStatusBadge()}
                </View>

                {/* Menu List */}
                <View className="mt-8 px-4 gap-y-4 pb-20">
                    {/* Group 1 */}
                    <View className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-800/50">
                        {/* Hồ sơ & KYC */}
                        <TouchableOpacity
                            onPress={() => router.push('/update_profile')}
                            className="flex-row items-center justify-between px-4 py-4"
                        >
                            <View className="flex-row items-center gap-4">
                                <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <MaterialIcons name="person" size={24} color="#2563EB" />
                                </View>
                                <Text className="text-base font-medium text-text-primary dark:text-white">
                                    Hồ sơ & Xác minh KYC
                                </Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
                        </TouchableOpacity>

                        <View className="mx-4 border-t border-slate-100 dark:border-slate-700" />

                    </View>

                    {/* Group 2 */}
                    <View className="overflow-hidden rounded-xl bg-white shadow-sm dark:bg-slate-800/50">
                        <TouchableOpacity className="flex-row items-center justify-between px-4 py-4">
                            <View className="flex-row items-center gap-4">
                                <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <MaterialIcons name="gavel" size={24} color="#2563EB" />
                                </View>
                                <Text className="text-base font-medium text-text-primary dark:text-white">
                                    Hợp đồng & Điều khoản
                                </Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
                        </TouchableOpacity>

                        <View className="mx-4 border-t border-slate-100 dark:border-slate-700" />

                        <TouchableOpacity className="flex-row items-center justify-between px-4 py-4">
                            <View className="flex-row items-center gap-4">
                                <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                    <Ionicons name="help-circle" size={24} color="#2563EB" />
                                </View>
                                <Text className="text-base font-medium text-text-primary dark:text-white">
                                    Trung tâm hỗ trợ
                                </Text>
                            </View>
                            <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    {/* Đăng xuất */}
                    <TouchableOpacity
                        onPress={logout}
                        className="flex-row items-center gap-4 rounded-xl bg-white px-4 py-4 shadow-sm dark:bg-slate-800/50"
                    >
                        <View className="h-10 w-10 items-center justify-center rounded-lg bg-red-100 dark:bg-red-500/20">
                            <MaterialIcons name="logout" size={24} color="#DC2626" />
                        </View>
                        <Text className="text-base font-medium text-red-600 dark:text-red-400">
                            Đăng xuất
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

