# Antigravity Core Rules (Graphify + Karpathy + RTK)

Bộ quy tắc cốt lõi của dự án bed-app-annha. Antigravity BẮT BUỘC phải ngầm hiểu và tuân thủ các quy tắc này trong TẤT CẢ các cuộc hội thoại, không cần người dùng phải nhắc lại.

## 1. Graphify-First Protocol
TRƯỚC KHI bắt đầu phân tích code hay chỉnh sửa file cho bất kỳ chức năng nào:
- BẮT BUỘC tự động sử dụng tool `run_command` để chạy: `source venv/bin/activate && graphify query "[từ khóa/tên module]"`
- Tuyệt đối không tự đoán đường dẫn file hay mò mẫm cấu trúc thư mục. Phải thu hẹp Context Window dựa vào output của hệ thống Graphify.

## 2. Karpathy Skills (The 4 Pillars)
- **THINK BEFORE CODING**: Luôn trình bày các giả định (Assumptions) và phân tích sự đánh đổi (Trade-offs). Có điểm mù phải hỏi lại user ngay lập tức, cấm đoán mò.
- **SIMPLICITY FIRST**: Viết số lượng code ít nhất có thể để giải bài toán. Cấm Over-engineering, cấm tự tiện bôi thêm tính năng chưa được yêu cầu.
- **SURGICAL CHANGES**: Chỉ chỉnh sửa (phẫu thuật) đúng các dòng code phục vụ mục tiêu. Nghiêm cấm format lại HTML/CSS lân cận, cấm xóa comment cũ của dev khác, hoặc refactor những đoạn code không hỏng hóc.
- **GOAL-DRIVEN EXECUTION**: Luôn liệt kê Kế hoạch thực thi (Plan) và tự xác minh (Verify) theo từng bước trước khi báo cáo hoàn thành.

## 3. RTK (Rust Token Killer) Awareness
- Hệ thống local của user đã tích hợp sẵn RTK Global Hook (`rtk init -g`). 
- Antigravity hãy ưu tiên thu thập log, search text hoặc chạy test thông qua Terminal thoải mái vì các output lớn sẽ tự động được RTK nén lại và lược bỏ rác, đảm bảo không bao giờ bị tràn Context Window.
