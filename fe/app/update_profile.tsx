import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Pressable,
    Alert,
    ScrollView,
    Image,
    ActivityIndicator,
    SafeAreaView,
    TouchableOpacity,
    Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from '@react-native-community/datetimepicker';
import api from "@/api/api";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/store";
import { setUser } from "@/reducers/userSlice";
import { useRouter, Stack } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import { DEMO_AVATAR, getAvatarUrl } from "@/constants/avatars";

type TabType = 'profile' | 'kyc';

export default function ProfileUpdate() {
    const router = useRouter();
    const dispatch = useDispatch();
    const user = useSelector((state: RootState) => state.user);
    const [activeTab, setActiveTab] = useState<TabType>('profile');

    // Profile update states
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        password: "",
        password_confirmation: "",
    });
    const [avatar, setAvatar] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // KYC states
    const [kycData, setKycData] = useState({
        fullName: '',
        idNumber: '',
        dateOfBirth: null as Date | null,
    });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [frontImage, setFrontImage] = useState<string | null>(null);
    const [backImage, setBackImage] = useState<string | null>(null);
    const [kycSubmitting, setKycSubmitting] = useState(false);
    const [kycStatus, setKycStatus] = useState<string | null>(null);
    const [kycRejectionReason, setKycRejectionReason] = useState<string | null>(null);

    // Load user data and KYC status
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
                phone: user.phone || "",
                password: "",
                password_confirmation: "",
            });
            setAvatar((user as any).avatar || null);
        }
        // loadKycStatus();
    }, [user]);

    const loadKycStatus = async () => {
        try {
            const response = await api.get('kyc/status');
            if (response.data?.success && response.data?.data) {
                const data = response.data.data;
                setKycStatus(data.kyc_status);
                setKycRejectionReason(data.kyc_rejection_reason);

                // Load existing KYC data if available
                if (data.documents) {
                    setKycData({
                        fullName: data.documents.full_name || '',
                        idNumber: data.documents.id_number || '',
                        dateOfBirth: data.documents.date_of_birth ? new Date(data.documents.date_of_birth) : null,
                    });
                    setFrontImage(data.documents.front_image || null);
                    setBackImage(data.documents.back_image || null);
                }
            }
        } catch (error: any) {
            console.error('Error loading KYC status:', error);
        }
    };

    const handleInputChange = (name: string, value: string) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // Profile Image Picker
    const pickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permissionResult.granted) {
            Alert.alert("Quyền truy cập", "Vui lòng cấp quyền truy cập thư viện ảnh.");
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.7,
        });

        if (!result.canceled && result.assets[0].uri) {
            setAvatar(result.assets[0].uri);
        }
    };

    // KYC Image Picker
    const pickKycImage = async (side: 'front' | 'back') => {
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();

        if (libraryStatus !== 'granted' || cameraStatus !== 'granted') {
            Alert.alert('Quyền truy cập', 'Cần cấp quyền truy cập thư viện ảnh và camera!');
            return;
        }

        Alert.alert(
            'Chọn ảnh',
            'Bạn muốn chọn ảnh từ đâu?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Thư viện',
                    onPress: async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: 0.8,
                            allowsEditing: true,
                            aspect: [3, 2],
                        });

                        if (!result.canceled && result.assets[0].uri) {
                            if (side === 'front') setFrontImage(result.assets[0].uri);
                            else setBackImage(result.assets[0].uri);
                        }
                    },
                },
                {
                    text: 'Camera',
                    onPress: async () => {
                        const result = await ImagePicker.launchCameraAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: 0.8,
                            allowsEditing: true,
                            aspect: [3, 2],
                        });

                        if (!result.canceled && result.assets[0].uri) {
                            if (side === 'front') setFrontImage(result.assets[0].uri);
                            else setBackImage(result.assets[0].uri);
                        }
                    },
                },
            ]
        );
    };

    const formatDate = (date: Date | null): string => {
        if (!date) return '';
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Update Profile Handler
    const handleUpdate = async () => {
        const { name, email, phone, password, password_confirmation } = formData;

        if (!name || !email) {
            Alert.alert("Thiếu thông tin", "Vui lòng nhập đầy đủ họ tên và email.");
            return;
        }

        setLoading(true);

        try {
            const data = new FormData();
            data.append("name", name);
            data.append("email", email);
            data.append("phone", phone);
            if (password) {
                data.append("password", password);
                data.append("password_confirmation", password_confirmation);
            }

            if (avatar && !avatar.startsWith("http")) {
                const filename = avatar.split("/").pop()!;
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;
                data.append("avatar", {
                    uri: avatar,
                    name: filename,
                    type,
                } as any);
            }

            const response = await api.put("user/profile", data, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (response.status === 200 && response.data?.success) {
                if (response.data?.data?.user) {
                    dispatch(setUser(response.data.data.user));
                }
                Alert.alert("Thành công", response.data?.message || "Cập nhật thông tin thành công!");
            } else {
                const message =
                    response.data?.message ||
                    Object.values(response.data?.errors || {}).join("\n") ||
                    "Vui lòng thử lại.";
                Alert.alert("Cập nhật thất bại", message);
            }
        } catch (error: any) {
            console.error(error);
            if (error.response?.data?.errors) {
                const errMsg = Object.values(error.response.data.errors).join("\n");
                Alert.alert("Lỗi", errMsg);
            } else {
                Alert.alert("Lỗi mạng", "Không thể kết nối đến server.");
            }
        } finally {
            setLoading(false);
        }
    };

    // Submit KYC Handler
    const handleSubmitKyc = async () => {
        if (!kycData.fullName || !kycData.idNumber || !kycData.dateOfBirth || !frontImage || !backImage) {
            Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ và tải lên cả hai mặt CMND/CCCD');
            return;
        }

        if (kycStatus === 'verified') {
            Alert.alert('Đã xác minh', 'Bạn đã được xác minh KYC rồi.');
            return;
        }

        if (kycStatus === 'pending') {
            Alert.alert('Đang chờ duyệt', 'Thông tin KYC của bạn đang được xét duyệt. Vui lòng chờ.');
            return;
        }

        setKycSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('full_name', kycData.fullName);
            formData.append('id_number', kycData.idNumber);
            formData.append('date_of_birth', kycData.dateOfBirth!.toISOString().split('T')[0]);

            // Append front image
            const frontFilename = frontImage.split('/').pop() || 'front.jpg';
            const frontMatch = /\.(\w+)$/.exec(frontFilename);
            const frontType = frontMatch ? `image/${frontMatch[1]}` : 'image/jpeg';
            formData.append('front_image', {
                uri: frontImage,
                name: frontFilename,
                type: frontType,
            } as any);

            // Append back image
            const backFilename = backImage.split('/').pop() || 'back.jpg';
            const backMatch = /\.(\w+)$/.exec(backFilename);
            const backType = backMatch ? `image/${backMatch[1]}` : 'image/jpeg';
            formData.append('back_image', {
                uri: backImage,
                name: backFilename,
                type: backType,
            } as any);

            const response = await api.post('kyc/submit', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (response.data?.success) {
                Alert.alert('Thành công', 'Thông tin KYC đã được gửi đi xét duyệt!', [
                    { text: 'OK', onPress: () => loadKycStatus() },
                ]);
            } else {
                Alert.alert('Lỗi', response.data?.message || 'Gửi thông tin KYC thất bại');
            }
        } catch (error: any) {
            console.error('KYC submission error:', error);
            const errorMessage =
                error.response?.data?.message ||
                error.response?.data?.errors?.[0] ||
                'Có lỗi xảy ra. Vui lòng thử lại.';
            Alert.alert('Lỗi', errorMessage);
        } finally {
            setKycSubmitting(false);
        }
    };

    const getKycStatusBadge = () => {
        switch (kycStatus) {
            case 'verified':
                return (
                    <View className="flex-row items-center gap-2 bg-green-100 dark:bg-green-900/30 px-4 py-3 rounded-xl">
                        <MaterialIcons name="check-circle" size={20} color="#16A34A" />
                        <Text className="text-green-700 dark:text-green-300 font-semibold">
                            Đã xác minh
                        </Text>
                    </View>
                );
            case 'pending':
                return (
                    <View className="flex-row items-center gap-2 bg-yellow-100 dark:bg-yellow-900/30 px-4 py-3 rounded-xl">
                        <MaterialIcons name="hourglass-empty" size={20} color="#D97706" />
                        <Text className="text-yellow-700 dark:text-yellow-300 font-semibold">
                            Đang chờ duyệt
                        </Text>
                    </View>
                );
            case 'rejected':
                return (
                    <View className="flex-row items-center gap-2 bg-red-100 dark:bg-red-900/30 px-4 py-3 rounded-xl">
                        <MaterialIcons name="cancel" size={20} color="#EF4444" />
                        <Text className="text-red-700 dark:text-red-300 font-semibold">
                            Bị từ chối
                        </Text>
                    </View>
                );
            default:
                return (
                    <View className="flex-row items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-xl">
                        <MaterialIcons name="info" size={20} color="#6B7280" />
                        <Text className="text-gray-700 dark:text-gray-300 font-semibold">
                            Chưa xác minh
                        </Text>
                    </View>
                );
        }
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Hồ sơ & Xác minh',
                    headerShown: true,
                }}
            />
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">

                {/* Tabs */}
                <View className="flex-row bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <TouchableOpacity
                        onPress={() => setActiveTab('profile')}
                        className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'profile'
                            ? 'border-primary'
                            : 'border-transparent'
                            }`}
                    >
                        <Text
                            className={`font-semibold ${activeTab === 'profile'
                                ? 'text-primary'
                                : 'text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            Thông tin cá nhân
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('kyc')}
                        className={`flex-1 py-4 items-center border-b-2 ${activeTab === 'kyc'
                            ? 'border-primary'
                            : 'border-transparent'
                            }`}
                    >
                        <Text
                            className={`font-semibold ${activeTab === 'kyc'
                                ? 'text-primary'
                                : 'text-gray-500 dark:text-gray-400'
                                }`}
                        >
                            Xác minh KYC
                        </Text>
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                    {activeTab === 'profile' ? (
                        // Profile Update Section
                        <View className="p-4">
                            <Text className="text-xl font-bold text-text-dark-gray dark:text-white mb-6">
                                Cập nhật thông tin
                            </Text>

                            {/* Avatar */}
                            <Pressable onPress={pickImage} className="mb-6 items-center">
                                <View className="relative">
                                    <Image
                                        source={
                                            avatar
                                                ? { uri: avatar }
                                                : (user as any)?.avatar
                                                    ? { uri: getAvatarUrl((user as any).avatar) }
                                                    : { uri: DEMO_AVATAR }
                                        }
                                        className="w-24 h-24 rounded-full"
                                    />
                                    <View className="absolute bottom-0 right-0 bg-primary rounded-full p-2">
                                        <MaterialIcons name="camera-alt" size={20} color="white" />
                                    </View>
                                </View>
                                <Text className="text-primary mt-2 font-medium">Đổi ảnh đại diện</Text>
                            </Pressable>

                            {/* Họ tên */}
                            <View className="mb-4">
                                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Họ và tên
                                </Text>
                                <TextInput
                                    className="h-14 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-base text-text-dark-gray dark:text-white"
                                    placeholder="Nhập họ và tên"
                                    placeholderTextColor="#9CA3AF"
                                    value={formData.name}
                                    onChangeText={(v) => handleInputChange("name", v)}
                                />
                            </View>

                            {/* Email */}
                            <View className="mb-4">
                                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Email
                                </Text>
                                <TextInput
                                    className="h-14 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-base text-text-dark-gray dark:text-white"
                                    placeholder="Nhập email"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="email-address"
                                    value={formData.email}
                                    onChangeText={(v) => handleInputChange("email", v)}
                                />
                            </View>

                            {/* Số điện thoại */}
                            <View className="mb-4">
                                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Số điện thoại
                                </Text>
                                <TextInput
                                    className="h-14 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-base text-text-dark-gray dark:text-white"
                                    placeholder="Nhập số điện thoại"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="phone-pad"
                                    value={formData.phone}
                                    onChangeText={(v) => handleInputChange("phone", v)}
                                />
                            </View>

                            {/* Mật khẩu */}
                            <View className="mb-4">
                                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Mật khẩu mới (để trống nếu không đổi)
                                </Text>
                                <TextInput
                                    className="h-14 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-base text-text-dark-gray dark:text-white"
                                    placeholder="Nhập mật khẩu mới"
                                    placeholderTextColor="#9CA3AF"
                                    secureTextEntry
                                    value={formData.password}
                                    onChangeText={(v) => handleInputChange("password", v)}
                                />
                            </View>

                            {/* Xác nhận mật khẩu */}
                            {formData.password ? (
                                <View className="mb-6">
                                    <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Xác nhận mật khẩu
                                    </Text>
                                    <TextInput
                                        className="h-14 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-base text-text-dark-gray dark:text-white"
                                        placeholder="Nhập lại mật khẩu"
                                        placeholderTextColor="#9CA3AF"
                                        secureTextEntry
                                        value={formData.password_confirmation}
                                        onChangeText={(v) => handleInputChange("password_confirmation", v)}
                                    />
                                </View>
                            ) : null}

                            <Pressable
                                onPress={handleUpdate}
                                className={`bg-primary w-full py-4 rounded-xl mb-6 ${loading ? "opacity-70" : ""
                                    }`}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white text-center text-base font-semibold">
                                        Cập nhật thông tin
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    ) : (
                        // KYC Section
                        <View className="p-4">
                            <Text className="text-xl font-bold text-text-dark-gray dark:text-white mb-4">
                                Xác minh danh tính (KYC)
                            </Text>

                            {/* KYC Status Badge */}
                            {kycStatus && (
                                <View className="mb-6">
                                    {getKycStatusBadge()}
                                    {kycStatus === 'rejected' && kycRejectionReason && (
                                        <View className="mt-3 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl">
                                            <Text className="text-red-700 dark:text-red-300 text-sm">
                                                <Text className="font-semibold">Lý do từ chối: </Text>
                                                {kycRejectionReason}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            <Text className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                Vui lòng cung cấp thông tin chính xác để đảm bảo an toàn và tăng độ tin cậy. Thông tin của bạn sẽ được bảo mật.
                            </Text>

                            {/* Họ và tên */}
                            <View className="mb-4">
                                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Họ và tên
                                </Text>
                                <TextInput
                                    className="h-14 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-base text-text-dark-gray dark:text-white"
                                    placeholder="Nhập họ và tên của bạn"
                                    placeholderTextColor="#9CA3AF"
                                    value={kycData.fullName}
                                    onChangeText={(value) => setKycData({ ...kycData, fullName: value })}
                                    editable={kycStatus !== 'verified' && kycStatus !== 'pending'}
                                />
                            </View>

                            {/* Số CMND/CCCD */}
                            <View className="mb-4">
                                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Số CMND/CCCD
                                </Text>
                                <TextInput
                                    className="h-14 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-base text-text-dark-gray dark:text-white"
                                    placeholder="Nhập số CMND/CCCD"
                                    placeholderTextColor="#9CA3AF"
                                    keyboardType="numeric"
                                    value={kycData.idNumber}
                                    onChangeText={(value) => setKycData({ ...kycData, idNumber: value })}
                                    editable={kycStatus !== 'verified' && kycStatus !== 'pending'}
                                />
                            </View>

                            {/* Ngày sinh */}
                            <View className="mb-4">
                                <Text className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Ngày sinh
                                </Text>
                                <TouchableOpacity
                                    onPress={() => setShowDatePicker(true)}
                                    disabled={kycStatus === 'verified' || kycStatus === 'pending'}
                                    className="h-14 px-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl justify-center"
                                >
                                    <Text
                                        className={`text-base ${kycData.dateOfBirth
                                            ? 'text-text-dark-gray dark:text-white'
                                            : 'text-gray-400'
                                            }`}
                                    >
                                        {formatDate(kycData.dateOfBirth) || 'dd/mm/yyyy'}
                                    </Text>
                                </TouchableOpacity>
                                {showDatePicker && (
                                    <DateTimePicker
                                        value={kycData.dateOfBirth || new Date()}
                                        mode="date"
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(event, selectedDate) => {
                                            setShowDatePicker(Platform.OS === 'ios');
                                            if (selectedDate) {
                                                setKycData({ ...kycData, dateOfBirth: selectedDate });
                                            }
                                        }}
                                        maximumDate={new Date()}
                                    />
                                )}
                            </View>

                            {/* Upload CMND/CCCD */}
                            <View className="mb-6">
                                <Text className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Tải lên ảnh CMND/CCCD
                                </Text>

                                <View className="flex-row gap-4">
                                    {/* Mặt trước */}
                                    <TouchableOpacity
                                        onPress={() => pickKycImage('front')}
                                        disabled={kycStatus === 'verified' || kycStatus === 'pending'}
                                        className="flex-1 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl aspect-[3/2] items-center justify-center p-4"
                                    >
                                        {frontImage ? (
                                            <Image
                                                source={{ uri: frontImage }}
                                                className="w-full h-full rounded-lg"
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <>
                                                <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mb-2">
                                                    <MaterialIcons name="add-a-photo" size={36} color="#2563EB" />
                                                </View>
                                                <Text className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                    Mặt trước
                                                </Text>
                                                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Nhấn để tải lên
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>

                                    {/* Mặt sau */}
                                    <TouchableOpacity
                                        onPress={() => pickKycImage('back')}
                                        disabled={kycStatus === 'verified' || kycStatus === 'pending'}
                                        className="flex-1 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl aspect-[3/2] items-center justify-center p-4"
                                    >
                                        {backImage ? (
                                            <Image
                                                source={{ uri: backImage }}
                                                className="w-full h-full rounded-lg"
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <>
                                                <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mb-2">
                                                    <MaterialIcons name="add-a-photo" size={36} color="#2563EB" />
                                                </View>
                                                <Text className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                                    Mặt sau
                                                </Text>
                                                <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Nhấn để tải lên
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Pressable
                                onPress={handleSubmitKyc}
                                disabled={
                                    kycSubmitting ||
                                    kycStatus === 'verified' ||
                                    kycStatus === 'pending' ||
                                    !kycData.fullName ||
                                    !kycData.idNumber ||
                                    !kycData.dateOfBirth ||
                                    !frontImage ||
                                    !backImage
                                }
                                className={`w-full py-4 rounded-xl mb-6 ${kycSubmitting ||
                                    kycStatus === 'verified' ||
                                    kycStatus === 'pending' ||
                                    !kycData.fullName ||
                                    !kycData.idNumber ||
                                    !kycData.dateOfBirth ||
                                    !frontImage ||
                                    !backImage
                                    ? 'bg-gray-400'
                                    : 'bg-primary'
                                    }`}
                            >
                                {kycSubmitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text className="text-white text-center text-base font-semibold">
                                        {kycStatus === 'verified'
                                            ? 'Đã xác minh'
                                            : kycStatus === 'pending'
                                                ? 'Đang chờ duyệt'
                                                : 'Gửi xác minh'}
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    )}
                </ScrollView>
            </SafeAreaView>
        </>
    );
}
