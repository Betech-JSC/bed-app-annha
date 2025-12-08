import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    StatusBar,
    Alert,
    Linking,
    Modal,
} from 'react-native';
import { useColorScheme } from 'nativewind';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
// import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export default function ReportIssueScreen() {
    const router = useRouter();
    const { colorScheme } = useColorScheme();
    const [issueType, setIssueType] = useState('order');
    const [description, setDescription] = useState('');
    const [files, setFiles] = useState<any[]>([]);
    const [showPicker, setShowPicker] = useState(false);

    const issueTypes = [
        { label: 'Vấn đề đơn hàng', value: 'order' },
        { label: 'Vấn đề thanh toán', value: 'payment' },
        { label: 'Vấn đề đối tác', value: 'partner' },
        { label: 'Lỗi ứng dụng', value: 'app_error' },
        { label: 'Khác', value: 'other' },
    ];

    const pickFile = async () => {
        if (files.length >= 3) {
            Alert.alert('Giới hạn', 'Chỉ được tải lên tối đa 3 tệp');
            return;
        }

        // const result = await DocumentPicker.getDocumentAsync({
        //     multiple: true,
        //     type: ['image/*', 'video/*', 'application/pdf'],
        // });

        // if (!result.canceled && result.assets) {
        //     setFiles([...files, ...result.assets]);
        // }
    };

    const removeFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    return (
        <>
            <Stack.Screen
                options={{
                    title: 'Báo cáo sự cố',
                    headerShown: true,
                }}
            />
            <SafeAreaView className="flex-1 bg-background-light dark:bg-background-dark">
                <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

                <ScrollView className="flex-1 px-4 py-4" showsVerticalScrollIndicator={false}>
                    <View className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm space-y-6">

                        {/* Loại sự cố */}
                        <View>
                            <Text className="text-base font-medium text-text-primary dark:text-gray-200 mb-2">
                                Chọn loại sự cố
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowPicker(true)}
                                className="w-full h-14 px-4 pr-12 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg flex-row items-center justify-between"
                            >
                                <Text className="text-base text-text-primary dark:text-white">
                                    {issueTypes.find(t => t.value === issueType)?.label || 'Chọn loại sự cố'}
                                </Text>
                                <MaterialIcons name="keyboard-arrow-down" size={24} color="#616e89" />
                            </TouchableOpacity>

                            {/* Picker Modal */}
                            <Modal
                                visible={showPicker}
                                transparent={true}
                                animationType="slide"
                                onRequestClose={() => setShowPicker(false)}
                            >
                                <TouchableOpacity
                                    className="flex-1 bg-black/50 justify-end"
                                    activeOpacity={1}
                                    onPress={() => setShowPicker(false)}
                                >
                                    <View className="bg-white dark:bg-gray-800 rounded-t-3xl p-4 max-h-96">
                                        <View className="flex-row items-center justify-between mb-4">
                                            <Text className="text-lg font-bold text-text-primary dark:text-white">
                                                Chọn loại sự cố
                                            </Text>
                                            <TouchableOpacity onPress={() => setShowPicker(false)}>
                                                <MaterialIcons name="close" size={24} color="#6B7280" />
                                            </TouchableOpacity>
                                        </View>
                                        <ScrollView>
                                            {issueTypes.map((type) => (
                                                <TouchableOpacity
                                                    key={type.value}
                                                    onPress={() => {
                                                        setIssueType(type.value);
                                                        setShowPicker(false);
                                                    }}
                                                    className={`px-4 py-4 rounded-lg mb-2 ${issueType === type.value
                                                            ? 'bg-primary/10 border-2 border-primary'
                                                            : 'bg-gray-50 dark:bg-gray-700'
                                                        }`}
                                                >
                                                    <Text
                                                        className={`text-base ${issueType === type.value
                                                                ? 'font-bold text-primary'
                                                                : 'text-text-primary dark:text-white'
                                                            }`}
                                                    >
                                                        {type.label}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                </TouchableOpacity>
                            </Modal>
                        </View>

                        {/* Mô tả chi tiết */}
                        <View>
                            <Text className="text-base font-medium text-text-primary dark:text-gray-200 mb-2">
                                Mô tả chi tiết
                            </Text>
                            <TextInput
                                value={description}
                                onChangeText={setDescription}
                                placeholder="Vui lòng mô tả vấn đề bạn đang gặp phải..."
                                placeholderTextColor="#9CA3AF"
                                multiline
                                numberOfLines={6}
                                textAlignVertical="top"
                                className="w-full min-h-36 px-4 py-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-text-primary dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                            />
                        </View>

                        {/* Upload file */}
                        <View className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl px-6 py-8 items-center">
                            <MaterialIcons name="cloud-upload" size={48} color="#9CA3AF" />
                            <Text className="mt-2 text-base font-bold text-text-primary dark:text-gray-200 text-center">
                                Tệp đính kèm
                            </Text>
                            <Text className="text-sm text-text-secondary dark:text-gray-400 text-center mt-1">
                                Tải lên ảnh/video minh chứng (tối đa 3 tệp)
                            </Text>

                            <TouchableOpacity
                                onPress={pickFile}
                                className="mt-4 h-10 px-5 bg-gray-100 dark:bg-gray-700 rounded-lg justify-center"
                            >
                                <Text className="text-sm font-bold text-text-primary dark:text-white">
                                    Nhấn để tải lên
                                </Text>
                            </TouchableOpacity>

                            {/* Danh sách file đã chọn */}
                            {files.length > 0 && (
                                <View className="mt-4 w-full space-y-2">
                                    {files.map((file, index) => (
                                        <View key={index} className="flex-row items-center justify-between bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded-lg">
                                            <Text className="text-sm text-text-primary dark:text-white flex-1" numberOfLines={1}>
                                                {file.name || `File ${index + 1}`}
                                            </Text>
                                            <TouchableOpacity onPress={() => removeFile(index)}>
                                                <MaterialIcons name="close" size={20} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Hỗ trợ nhanh */}
                    <View className="mt-6">
                        <Text className="text-lg font-bold text-text-primary dark:text-white mb-4">
                            Cần hỗ trợ nhanh?
                        </Text>
                        <TouchableOpacity
                            onPress={() => Linking.openURL('tel:19001234')}
                            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex-row items-center justify-between"
                        >
                            <View className="flex-row items-center gap-4">
                                <View className="h-12 w-12 bg-primary/10 rounded-full items-center justify-center">
                                    <MaterialIcons name="call" size={28} color="#2563EB" />
                                </View>
                                <View>
                                    <Text className="font-bold text-text-primary dark:text-white">Hotline</Text>
                                    <Text className="text-lg font-semibold text-primary">1900 1234</Text>
                                </View>
                            </View>
                            <MaterialIcons name="chevron-right" size={28} color="#2563EB" />
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                {/* Nút gửi báo cáo */}
                <View className="p-4 bg-background-light dark:bg-background-dark shadow-2xl">
                    <TouchableOpacity
                        onPress={() => {
                            Alert.alert('Thành công', 'Báo cáo của bạn đã được gửi!', [
                                {
                                    text: 'OK',
                                    onPress: () => router.back(),
                                },
                            ]);
                        }}
                        className="h-14 w-full bg-primary rounded-xl justify-center items-center shadow-lg shadow-primary/30"
                    >
                        <Text className="text-white text-base font-bold">Gửi báo cáo</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </>
    );
}