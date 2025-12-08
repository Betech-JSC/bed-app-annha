import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, ScrollView } from 'react-native';
import axios from 'axios';

export default function ReportScreen({ navigation }) {
    const [formData, setFormData] = useState({
        type: '',
        title: '',
        message: '',
    });

    const [loading, setLoading] = useState(false);

    const handleChange = (key: string, value: string) => {
        setFormData({ ...formData, [key]: value });
    };

    const handleSubmit = async () => {
        if (!formData.title || !formData.message) {
            Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ tiêu đề và nội dung phản hồi.');
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post('https://api.skysend.app/api/report', formData);
            Alert.alert('Thành công', 'Cảm ơn bạn đã gửi phản hồi. Chúng tôi sẽ xử lý sớm nhất có thể.');
            setFormData({ type: '', title: '', message: '' });
            navigation?.goBack?.();
        } catch (error: any) {
            console.log('Report error:', error.response?.data || error.message);
            Alert.alert('Lỗi', 'Gửi phản hồi thất bại. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Text className="text-xl font-semibold mb-4">Báo cáo sự cố / Gửi phản hồi</Text>

                {/* Type */}
                <Text className="text-sm text-gray-700 mb-2">Loại phản hồi</Text>
                <View className="flex-row mb-4 gap-x-3">
                    {['Lỗi hệ thống', 'Vận đơn', 'Đề xuất'].map((type) => (
                        <TouchableOpacity
                            key={type}
                            onPress={() => handleChange('type', type)}
                            className={`px-4 py-2 rounded-full border ${formData.type === type ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                }`}
                        >
                            <Text className={`text-sm ${formData.type === type ? 'text-white' : 'text-gray-700'}`}>{type}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Title */}
                <Text className="text-sm text-gray-700 mb-2">Tiêu đề</Text>
                <TextInput
                    className="p-4 border border-gray-300 rounded-[16px] text-base mb-4"
                    placeholder="Nhập tiêu đề phản hồi..."
                    value={formData.title}
                    onChangeText={(text) => handleChange('title', text)}
                />

                {/* Message */}
                <Text className="text-sm text-gray-700 mb-2">Nội dung</Text>
                <TextInput
                    className="p-4 border border-gray-300 rounded-[16px] text-base mb-6"
                    placeholder="Mô tả chi tiết sự cố hoặc góp ý của bạn..."
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    style={{ minHeight: 150 }}
                    value={formData.message}
                    onChangeText={(text) => handleChange('message', text)}
                />

                {/* Submit */}
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}
                    className={`rounded-xl py-4 ${loading ? 'bg-gray-400' : 'bg-blue-600'}`}
                >
                    <Text className="text-center text-white font-semibold text-base">
                        {loading ? 'Đang gửi...' : 'Gửi phản hồi'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}
