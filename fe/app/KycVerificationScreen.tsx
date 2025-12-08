// KycVerificationScreen.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
    Alert,
    Image,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api from '@/api/api';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function KycVerificationScreen() {
    const router = useRouter();

    const [fullName, setFullName] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [dob, setDob] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [frontImage, setFrontImage] = useState<string | null>(null);
    const [backImage, setBackImage] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [kycStatus, setKycStatus] = useState<string | null>(null);

    // Load KYC status
    useEffect(() => {
        loadKycStatus();
    }, []);

    const loadKycStatus = async () => {
        try {
            const response = await api.get('kyc/status');
            if (response.data?.success && response.data?.data) {
                const status = response.data.data.kyc_status;
                setKycStatus(status);
                
                if (status === 'verified') {
                    Alert.alert('Đã xác minh', 'Bạn đã được xác minh KYC rồi.');
                    router.back();
                } else if (status === 'pending') {
                    Alert.alert('Đang chờ duyệt', 'Thông tin KYC của bạn đang được xét duyệt. Vui lòng chờ.');
                } else if (status === 'rejected' && response.data.data.kyc_rejection_reason) {
                    Alert.alert('Bị từ chối', `Lý do: ${response.data.data.kyc_rejection_reason}`);
                }
            }
        } catch (error: any) {
            console.error('Error loading KYC status:', error);
        }
    };

    const pickImage = async (side: 'front' | 'back') => {
        // Request permissions
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();

        if (libraryStatus !== 'granted' || cameraStatus !== 'granted') {
            Alert.alert('Quyền truy cập', 'Cần cấp quyền truy cập thư viện ảnh và camera!');
            return;
        }

        // Show action sheet
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

    const submitKyc = async () => {
        if (!fullName || !idNumber || !dob || !frontImage || !backImage) {
            Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ và tải lên cả hai mặt CMND/CCCD');
            return;
        }

        setSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('full_name', fullName);
            formData.append('id_number', idNumber);
            formData.append('date_of_birth', dob!.toISOString().split('T')[0]);

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
                    { text: 'OK', onPress: () => router.back() },
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
            setSubmitting(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background-light">
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-gray-200">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="h-10 w-10 items-center justify-center rounded-full"
                >
                    <MaterialIcons name="arrow-back" size={28} color="#111318" />
                </TouchableOpacity>

                <Text className="flex-1 text-center text-lg font-bold text-[#111318] -ml-10">
                    Xác minh danh tính (KYC)
                </Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
                {/* Hướng dẫn */}
                <Text className="text-sm text-gray-600 text-center mt-2 px-2">
                    Vui lòng cung cấp thông tin chính xác để đảm bảo an toàn và tăng độ tin cậy. Thông tin của bạn sẽ được bảo mật.
                </Text>

                {/* Form thông tin cá nhân */}
                <View className="mt-6 space-y-5">
                    {/* Họ và tên */}
                    <View>
                        <Text className="text-base font-medium text-gray-800 mb-2">Họ và tên</Text>
                        <TextInput
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Nhập họ và tên của bạn"
                            placeholderTextColor="#9CA3AF"
                            className="h-14 px-4 bg-white border border-gray-300 rounded-xl text-base"
                        />
                    </View>

                    {/* Số CMND/CCCD */}
                    <View>
                        <Text className="text-base font-medium text-gray-800 mb-2">Số CMND/CCCD</Text>
                        <TextInput
                            value={idNumber}
                            onChangeText={setIdNumber}
                            placeholder="Nhập số CMND/CCCD"
                            keyboardType="numeric"
                            placeholderTextColor="#9CA3AF"
                            className="h-14 px-4 bg-white border border-gray-300 rounded-xl text-base"
                        />
                    </View>

                    {/* Ngày sinh */}
                    <View>
                        <Text className="text-base font-medium text-gray-800 mb-2">Ngày sinh</Text>
                        <TouchableOpacity
                            onPress={() => setShowDatePicker(true)}
                            className="h-14 px-4 bg-white border border-gray-300 rounded-xl justify-center"
                        >
                            <Text className={`text-base ${dob ? 'text-gray-900' : 'text-gray-400'}`}>
                                {formatDate(dob) || 'dd/mm/yyyy'}
                            </Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={dob || new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(Platform.OS === 'ios');
                                    if (selectedDate) {
                                        setDob(selectedDate);
                                    }
                                }}
                                maximumDate={new Date()}
                            />
                        )}
                    </View>
                </View>

                {/* Upload CMND/CCCD */}
                <View className="mt-8">
                    <Text className="text-base font-medium text-gray-800 mb-4">
                        Tải lên ảnh CMND/CCCD
                    </Text>

                    <View className="flex-row gap-4">
                        {/* Mặt trước */}
                        <TouchableOpacity
                            onPress={() => pickImage('front')}
                            className="flex-1 bg-white border-2 border-dashed border-gray-300 rounded-xl aspect-[3/2] items-center justify-center p-4"
                        >
                            {frontImage ? (
                                <Image source={{ uri: frontImage }} className="w-full h-full rounded-lg" resizeMode="cover" />
                            ) : (
                                <>
                                    <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mb-2">
                                        <MaterialIcons name="add-a-photo" size={36} color="#2563EB" />
                                    </View>
                                    <Text className="text-sm font-medium text-gray-800">Mặt trước</Text>
                                    <Text className="text-xs text-gray-500 mt-1">Nhấn để tải lên</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        {/* Mặt sau */}
                        <TouchableOpacity
                            onPress={() => pickImage('back')}
                            className="flex-1 bg-white border-2 border-dashed border-gray-300 rounded-xl aspect-[3/2] items-center justify-center p-4"
                        >
                            {backImage ? (
                                <Image source={{ uri: backImage }} className="w-full h-full rounded-lg" resizeMode="cover" />
                            ) : (
                                <>
                                    <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center mb-2">
                                        <MaterialIcons name="add-a-photo" size={36} color="#2563EB" />
                                    </View>
                                    <Text className="text-sm font-medium text-gray-800">Mặt sau</Text>
                                    <Text className="text-xs text-gray-500 mt-1">Nhấn để tải lên</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <View className="h-32" />
            </ScrollView>

            {/* Sticky Footer Button */}
            <View className="absolute bottom-0 left-0 right-0 bg-background-light p-4 pt-2 border-t border-gray-200">
                <TouchableOpacity
                    onPress={submitKyc}
                    disabled={submitting || kycStatus === 'pending'}
                    className={`h-14 w-full rounded-xl items-center justify-center shadow-lg ${
                        submitting || kycStatus === 'pending' ? 'bg-gray-400' : 'bg-primary'
                    }`}
                >
                    {submitting ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-white text-base font-bold">
                            {kycStatus === 'pending' ? 'Đang chờ duyệt' : 'Gửi xác minh'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}
