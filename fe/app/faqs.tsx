import React from 'react';
import { ScrollView, View, Text, StyleSheet, Image } from 'react-native';
import AccordionItem from './components/AccordionItem';

export default function FaqsScreen() {
    const faqs = [
        {
            question: 'SkySend là gì?',
            answer:
                'SkySend là ứng dụng giao hàng nhanh, giúp kết nối người gửi và tài xế gần nhất. Bạn có thể gửi hàng hóa, tài liệu hoặc đồ ăn trong thời gian ngắn nhất với chi phí hợp lý.',
        },
        {
            question: 'Làm thế nào để đặt đơn hàng?',
            answer:
                'Chỉ cần chọn điểm gửi, điểm nhận, nhập thông tin hàng hóa và xác nhận. Hệ thống sẽ tự động tìm tài xế gần nhất cho bạn.',
        },
        {
            question: 'Tôi có thể theo dõi đơn hàng không?',
            answer:
                'Có! Bạn có thể theo dõi vị trí tài xế theo thời gian thực trên bản đồ, xem trạng thái đơn hàng và thời gian dự kiến giao đến.',
        },
        {
            question: 'Nếu đơn hàng bị hư hỏng hoặc thất lạc thì sao?',
            answer:
                'SkySend cam kết hỗ trợ bồi thường theo quy định nếu hàng hóa bị hư hỏng hoặc thất lạc trong quá trình vận chuyển.',
        },
        {
            question: 'Phí giao hàng được tính như thế nào?',
            answer:
                'Phí giao hàng được tính dựa trên khoảng cách, trọng lượng và loại hàng hóa. Bạn sẽ thấy chi phí hiển thị trước khi xác nhận đặt đơn.',
        },
        {
            question: 'SkySend hoạt động ở khu vực nào?',
            answer:
                'Hiện tại SkySend hoạt động tại TP.HCM, Hà Nội và các thành phố lớn khác. Chúng tôi sẽ mở rộng thêm trong thời gian tới.',
        },
    ];

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Câu hỏi thường gặp</Text>
                <Text style={styles.subtitle}>
                    Giải đáp các thắc mắc phổ biến của người dùng SkySend
                </Text>
            </View>

            <View style={{ marginTop: 10 }}>
                {faqs.map((item, index) => (
                    <AccordionItem
                        key={index}
                        question={item.question}
                        answer={item.answer}
                    />
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        paddingHorizontal: 16,
    },
    header: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#222',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginTop: 4,
    },
});
