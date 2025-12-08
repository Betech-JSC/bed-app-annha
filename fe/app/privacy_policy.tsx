import React from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, Linking } from 'react-native';
// This component uses nativewind (https://github.com/vadimdemedes/treeshake-tailwindcss) or similar
// Make sure you've configured nativewind or tailwind-react-native-classnames in your project.

export default function PrivacyPolicyScreen({ navigation }) {
    const handleAccept = () => {
        // example: go back or set a flag in storage
        // navigation.goBack?.();
        // or AsyncStorage.setItem('privacy_accepted', '1')
        if (navigation && navigation.replace) navigation.replace('Home');
    };

    const openLink = async (url) => {
        try {
            await Linking.openURL(url);
        } catch (err) {
            console.warn('Cannot open url', url, err);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
                <Text className="text-lg font-semibold">Chính sách bảo mật</Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                <Text className="text-sm text-gray-700 mb-4">Cập nhật lần cuối: 01/11/2025</Text>

                <View className="mb-6">
                    <Text className="text-base font-semibold mb-2">1. Giới thiệu</Text>
                    <Text className="text-sm text-gray-700 leading-6">
                        Chào mừng bạn đến với Skysend. Chúng tôi cam kết bảo vệ quyền riêng tư của bạn. Văn bản dưới đây mô tả thông tin chúng tôi thu thập, cách sử dụng và chia sẻ thông tin đó khi bạn sử dụng ứng dụng Skysend.
                    </Text>
                </View>

                <View className="mb-6">
                    <Text className="text-base font-semibold mb-2">2. Thông tin chúng tôi thu thập</Text>
                    <Text className="text-sm text-gray-700 leading-6 mb-2">Loại thông tin bao gồm:</Text>
                    <View className="pl-3">
                        <Text className="text-sm text-gray-700">• Thông tin nhận dạng: tên, số điện thoại, địa chỉ email.</Text>
                        <Text className="text-sm text-gray-700">• Dữ liệu về đặt chỗ/giao nhận: địa chỉ gửi, địa chỉ nhận, mô tả kiện hàng.</Text>
                        <Text className="text-sm text-gray-700">• Dữ liệu kỹ thuật: dữ liệu thiết bị, log, địa chỉ IP và thông tin về hệ điều hành.</Text>
                    </View>
                </View>

                <View className="mb-6">
                    <Text className="text-base font-semibold mb-2">3. Mục đích sử dụng</Text>
                    <Text className="text-sm text-gray-700 leading-6">Chúng tôi sử dụng thông tin để:</Text>
                    <View className="pl-3">
                        <Text className="text-sm text-gray-700">• Cung cấp và cải thiện dịch vụ.</Text>
                        <Text className="text-sm text-gray-700">• Xử lý giao dịch và hỗ trợ khách hàng.</Text>
                        <Text className="text-sm text-gray-700">• Gửi thông báo quan trọng và cập nhật dịch vụ.</Text>
                        <Text className="text-sm text-gray-700">• Phân tích, phòng chống gian lận và đảm bảo an toàn.</Text>
                    </View>
                </View>

                <View className="mb-6">
                    <Text className="text-base font-semibold mb-2">4. Chia sẻ thông tin</Text>
                    <Text className="text-sm text-gray-700 leading-6">Chúng tôi có thể chia sẻ thông tin với:</Text>
                    <View className="pl-3">
                        <Text className="text-sm text-gray-700">• Đối tác cung cấp dịch vụ (vận chuyển, thanh toán).</Text>
                        <Text className="text-sm text-gray-700">• Cơ quan pháp luật khi có yêu cầu hợp lệ.</Text>
                        <Text className="text-sm text-gray-700">• Bên thứ ba để tuân thủ pháp luật hoặc bảo vệ quyền lợi của Skysend.</Text>
                    </View>
                </View>

                <View className="mb-6">
                    <Text className="text-base font-semibold mb-2">5. Bảo mật dữ liệu</Text>
                    <Text className="text-sm text-gray-700 leading-6">Chúng tôi áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để bảo vệ dữ liệu cá nhân khỏi truy cập trái phép, rò rỉ hoặc mất mát. Tuy nhiên, không có phương pháp truyền hoặc lưu trữ nào an toàn tuyệt đối — nếu bạn có mối quan ngại cụ thể, vui lòng liên hệ với chúng tôi.</Text>
                </View>

                <View className="mb-6">
                    <Text className="text-base font-semibold mb-2">6. Quyền của bạn</Text>
                    <Text className="text-sm text-gray-700 leading-6">Bạn có quyền truy cập, sửa đổi hoặc yêu cầu xóa dữ liệu cá nhân của mình. Để thực hiện quyền này, vui lòng gửi yêu cầu tới email: </Text>
                    <TouchableOpacity onPress={() => openLink('mailto:privacy@skysend.app')} className="mt-2">
                        <Text className="text-sm text-blue-600">privacy@skysend.app</Text>
                    </TouchableOpacity>
                </View>

                <View className="mb-6">
                    <Text className="text-base font-semibold mb-2">7. Cookie và công nghệ tương tự</Text>
                    <Text className="text-sm text-gray-700 leading-6">Ứng dụng có thể sử dụng cookie và các công nghệ tương tự để thu thập dữ liệu phân tích sử dụng và tuỳ chỉnh trải nghiệm người dùng.</Text>
                </View>

                <View className="mb-6">
                    <Text className="text-base font-semibold mb-2">8. Thay đổi chính sách</Text>
                    <Text className="text-sm text-gray-700 leading-6">Chúng tôi có thể cập nhật chính sách này. Mọi thay đổi sẽ được công bố trong ứng dụng hoặc trên website chính thức của Skysend.</Text>
                </View>

                <View className="mb-10">
                    <Text className="text-base font-semibold mb-2">9. Liên hệ</Text>
                    <Text className="text-sm text-gray-700 leading-6">Nếu bạn có câu hỏi về chính sách này, hãy liên hệ với chúng tôi:</Text>
                    <TouchableOpacity onPress={() => openLink('mailto:support@skysend.app')} className="mt-2">
                        <Text className="text-sm text-blue-600">support@skysend.app</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}
