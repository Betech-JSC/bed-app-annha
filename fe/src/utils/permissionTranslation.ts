import { Permissions } from "@/constants/Permissions";

export interface PermissionDetail {
    label: string;
    description: string;
}

const PERMISSION_DETAILS: Record<string, PermissionDetail> = {
    // ===================================================================
    // PROJECT MODULE
    // ===================================================================
    [Permissions.PROJECT_VIEW]: { label: "Xem dự án", description: "Xem danh sách và chi tiết các dự án đang tham gia" },
    [Permissions.PROJECT_CREATE]: { label: "Tạo dự án", description: "Khởi tạo dự án mới trong hệ thống" },
    [Permissions.PROJECT_UPDATE]: { label: "Cập nhật dự án", description: "Chỉnh sửa thông tin mô tả, thời gian, trạng thái dự án" },
    [Permissions.PROJECT_DELETE]: { label: "Xóa dự án", description: "Gỡ bỏ dự án khỏi hệ thống (Hành động quan trọng)" },
    [Permissions.PROJECT_MANAGE]: { label: "Quản trị dự án", description: "Quyền quản trị cao nhất, cấu hình và phân quyền trong dự án" },

    // Project Documents
    [Permissions.PROJECT_DOCUMENT_VIEW]: { label: "Xem tài liệu dự án", description: "Truy cập các tài liệu, hồ sơ chung của dự án" },
    [Permissions.PROJECT_DOCUMENT_UPLOAD]: { label: "Tải lên tài liệu", description: "Thêm tài liệu mới vào kho dự án" },
    [Permissions.PROJECT_DOCUMENT_DELETE]: { label: "Xóa tài liệu", description: "Gỡ bỏ tài liệu khỏi dự án" },

    // Project Phases
    [Permissions.PROJECT_PHASE_VIEW]: { label: "Xem giai đoạn", description: "Xem các giai đoạn triển khai của dự án" },
    [Permissions.PROJECT_PHASE_CREATE]: { label: "Tạo giai đoạn", description: "Thiết lập các giai đoạn thi công mới" },
    [Permissions.PROJECT_PHASE_UPDATE]: { label: "Cập nhật giai đoạn", description: "Điều chỉnh thông tin giai đoạn" },
    [Permissions.PROJECT_PHASE_DELETE]: { label: "Xóa giai đoạn", description: "Xóa bỏ giai đoạn khỏi dự án" },

    // Project Risks
    [Permissions.PROJECT_RISK_VIEW]: { label: "Xem rủi ro", description: "Theo dõi danh sách các rủi ro đã nhận diện" },
    [Permissions.PROJECT_RISK_CREATE]: { label: "Nhận diện rủi ro", description: "Thêm mới rủi ro vào sổ tay quản lý" },
    [Permissions.PROJECT_RISK_UPDATE]: { label: "Cập nhật rủi ro", description: "Đánh giá lại mức độ hoặc cập nhật trạng thái rủi ro" },
    [Permissions.PROJECT_RISK_DELETE]: { label: "Xóa rủi ro", description: "Xóa rủi ro khỏi danh sách" },

    // Project Monitoring
    [Permissions.PROJECT_MONITORING_VIEW]: { label: "Giám sát dự án", description: "Xem Camera hoặc dữ liệu giám sát thời gian thực" },

    // Project Comments
    [Permissions.PROJECT_COMMENT_VIEW]: { label: "Xem thảo luận", description: "Xem các trao đổi trong dự án" },
    [Permissions.PROJECT_COMMENT_CREATE]: { label: "Gửi thảo luận", description: "Đăng ý kiến hoặc phản hồi mới" },
    [Permissions.PROJECT_COMMENT_UPDATE]: { label: "Sửa thảo luận", description: "Chỉnh sửa nội dung thảo luận của mình" },
    [Permissions.PROJECT_COMMENT_DELETE]: { label: "Xóa thảo luận", description: "Xóa thảo luận (Của mình hoặc quản lý)" },

    // ===================================================================
    // PROGRESS & TASKS
    // ===================================================================
    [Permissions.PROGRESS_VIEW]: { label: "Xem tiến độ", description: "Theo dõi tiến độ tổng thể và chi tiết" },
    [Permissions.PROGRESS_UPDATE]: { label: "Cập nhật tiến độ", description: "Báo cáo % hoàn thành công việc" },

    [Permissions.PROJECT_TASK_VIEW]: { label: "Xem công việc", description: "Xem danh sách nhiệm vụ được giao" },
    [Permissions.PROJECT_TASK_CREATE]: { label: "Giao việc", description: "Tạo nhiệm vụ mới cho thành viên" },
    [Permissions.PROJECT_TASK_UPDATE]: { label: "Cập nhật công việc", description: "Sửa thông tin, hạn chót hoặc trạng thái công việc" },
    [Permissions.PROJECT_TASK_DELETE]: { label: "Xóa công việc", description: "Hủy bỏ nhiệm vụ" },

    // ===================================================================
    // ACCEPTANCE MODULE (Nghiệm Thu)
    // ===================================================================
    [Permissions.ACCEPTANCE_VIEW]: { label: "Xem nghiệm thu", description: "Xem hồ sơ nghiệm thu các hạng mục" },
    [Permissions.ACCEPTANCE_CREATE]: { label: "Tạo biên bản nghiệm thu", description: "Khởi tạo yêu cầu nghiệm thu nội bộ" },
    [Permissions.ACCEPTANCE_UPDATE]: { label: "Sửa biên bản nghiệm thu", description: "Cập nhật thông tin biên bản" },
    [Permissions.ACCEPTANCE_DELETE]: { label: "Xóa biên bản nghiệm thu", description: "Hủy bỏ hồ sơ nghiệm thu" },
    [Permissions.ACCEPTANCE_ATTACH_FILES]: { label: "Đính kèm hồ sơ", description: "Tải lên hình ảnh/tài liệu minh chứng" },

    [Permissions.ACCEPTANCE_APPROVE_LEVEL_1]: { label: "Duyệt nghiệm thu (Cấp 1 - TVGS)", description: "Giám sát xác nhận khối lượng và chất lượng" },
    [Permissions.ACCEPTANCE_APPROVE_LEVEL_2]: { label: "Duyệt nghiệm thu (Cấp 2 - PM)", description: "Quản lý dự án phê duyệt hồ sơ" },
    [Permissions.ACCEPTANCE_APPROVE_LEVEL_3]: { label: "Xác nhận Khách hàng duyệt (Cấp 3)", description: "Đánh giá hạng mục đã được khách hàng ký nghiệm thu" },

    [Permissions.ACCEPTANCE_TEMPLATE_VIEW]: { label: "Xem mẫu nghiệm thu", description: "Quản lý thư viện mẫu biên bản" },
    [Permissions.ACCEPTANCE_TEMPLATE_CREATE]: { label: "Tạo mẫu nghiệm thu", description: "Thêm mẫu biên bản mới" },
    [Permissions.ACCEPTANCE_TEMPLATE_UPDATE]: { label: "Sửa mẫu nghiệm thu", description: "Điều chỉnh nội dung mẫu" },
    [Permissions.ACCEPTANCE_TEMPLATE_DELETE]: { label: "Xóa mẫu nghiệm thu", description: "Xóa mẫu biên bản" },

    // ===================================================================
    // COST & BUDGET (Tài Chính Nội Bộ)
    // ===================================================================
    [Permissions.COST_VIEW]: { label: "Xem chi phí nội bộ", description: "Xem danh sách các khoản chi dự án" },
    [Permissions.COST_CREATE]: { label: "Tạo đề xuất chi", description: "Lập phiếu yêu cầu thanh toán/tạm ứng" },
    [Permissions.COST_UPDATE]: { label: "Sửa đề xuất chi", description: "Điều chỉnh thông tin yêu cầu chi" },
    [Permissions.COST_DELETE]: { label: "Xóa đề xuất chi", description: "Hủy bỏ yêu cầu chi" },
    [Permissions.COST_SUBMIT]: { label: "Gửi duyệt chi", description: "Chuyển yêu cầu lên cấp trên phê duyệt" },
    [Permissions.COST_APPROVE_MANAGEMENT]: { label: "Duyệt chi (Quản lý)", description: "Quản lý phê duyệt yêu cầu chi phí" },
    [Permissions.COST_APPROVE_ACCOUNTANT]: { label: "Duyệt chi (Kế toán)", description: "Kế toán kiểm tra và xác nhận chi tiền" },
    [Permissions.COST_REJECT]: { label: "Từ chối chi", description: "Trả lại hoặc bác bỏ yêu cầu chi" },

    [Permissions.BUDGET_VIEW]: { label: "Xem ngân sách", description: "Theo dõi ngân sách dự án" },
    [Permissions.BUDGET_CREATE]: { label: "Lập ngân sách", description: "Thiết lập các khoản mục ngân sách dự kiến" },
    [Permissions.BUDGET_UPDATE]: { label: "Điều chỉnh ngân sách", description: "Cập nhật định mức ngân sách" },
    [Permissions.BUDGET_DELETE]: { label: "Xóa ngân sách", description: "Xóa khoản mục ngân sách" },
    [Permissions.BUDGET_APPROVE]: { label: "Duyệt ngân sách", description: "Phê duyệt kế hoạch ngân sách" },

    // ===================================================================
    // ADDITIONAL COST (Phát Sinh & Khách Hàng)
    // ===================================================================
    [Permissions.ADDITIONAL_COST_VIEW]: { label: "Xem phát sinh", description: "Xem các hạng mục phát sinh ngoài hợp đồng" },
    [Permissions.ADDITIONAL_COST_CREATE]: { label: "Báo giá phát sinh", description: "Tạo báo giá cho hạng mục phát sinh" },
    [Permissions.ADDITIONAL_COST_UPDATE]: { label: "Sửa phát sinh", description: "Điều chỉnh báo giá phát sinh" },
    [Permissions.ADDITIONAL_COST_DELETE]: { label: "Xóa phát sinh", description: "Hủy bỏ hạng mục phát sinh" },
    [Permissions.ADDITIONAL_COST_APPROVE]: { label: "Duyệt nội bộ phát sinh", description: "Phê duyệt báo giá trước khi gửi khách" },
    [Permissions.ADDITIONAL_COST_REJECT]: { label: "Từ chối phát sinh", description: "Không duyệt báo giá phát sinh" },
    [Permissions.ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER]: { label: "Xác nhận KH đã trả (Phát sinh)", description: "Đánh giá khách hàng đã thanh toán (chờ kế toán duyệt)" },
    [Permissions.ADDITIONAL_COST_CONFIRM]: { label: "Kế toán xác nhận tiền (Phát sinh)", description: "Xác nhận tiền phát sinh đã về tài khoản" },

    // ===================================================================
    // REVENUE & INVOICE (Doanh Thu & Hóa Đơn)
    // ===================================================================
    [Permissions.REVENUE_VIEW]: { label: "Xem doanh thu", description: "Theo dõi dòng tiền thu về của dự án" },
    [Permissions.REVENUE_DASHBOARD]: { label: "Dashboard tài chính", description: "Xem biểu đồ tổng quan tài chính" },
    [Permissions.REVENUE_EXPORT]: { label: "Xuất báo cáo doanh thu", description: "Xuất file Excel/PDF báo cáo doanh thu" },

    [Permissions.INVOICE_VIEW]: { label: "Xem hóa đơn (Đầu ra)", description: "Quản lý hóa đơn xuất cho khách hàng" },
    [Permissions.INVOICE_CREATE]: { label: "Tạo hóa đơn", description: "Lập hóa đơn bán hàng/dịch vụ" },
    [Permissions.INVOICE_UPDATE]: { label: "Sửa hóa đơn", description: "Chỉnh sửa thông tin hóa đơn" },
    [Permissions.INVOICE_DELETE]: { label: "Hủy hóa đơn", description: "Hủy bỏ hóa đơn đã tạo" },
    [Permissions.INVOICE_APPROVE]: { label: "Duyệt hóa đơn", description: "Phê duyệt phát hành hóa đơn" },
    [Permissions.INVOICE_SEND]: { label: "Gửi hóa đơn", description: "Gửi hóa đơn cho khách hàng" },

    [Permissions.INPUT_INVOICE_VIEW]: { label: "Xem hóa đơn (Đầu vào)", description: "Quản lý hóa đơn mua hàng/dịch vụ" },
    [Permissions.INPUT_INVOICE_CREATE]: { label: "Nhập hóa đơn đầu vào", description: "Lưu trữ hóa đơn từ nhà cung cấp" },
    [Permissions.INPUT_INVOICE_UPDATE]: { label: "Sửa hóa đơn đầu vào", description: "Cập nhật thông tin hóa đơn mua vào" },
    [Permissions.INPUT_INVOICE_DELETE]: { label: "Xóa hóa đơn đầu vào", description: "Gỡ bỏ hóa đơn mua vào" },

    // ===================================================================
    // CONTRACTS & PAYMENTS (Hợp Đồng & Thanh Toán)
    // ===================================================================
    [Permissions.CONTRACT_VIEW]: { label: "Xem hợp đồng", description: "Xem nội dung hợp đồng với khách hàng" },
    [Permissions.CONTRACT_CREATE]: { label: "Tạo hợp đồng", description: "Soạn thảo hoặc tải lên hợp đồng mới" },
    [Permissions.CONTRACT_UPDATE]: { label: "Cập nhật hợp đồng", description: "Điều chỉnh điều khoản hợp đồng" },
    [Permissions.CONTRACT_DELETE]: { label: "Xóa hợp đồng", description: "Hủy hợp đồng" },
    [Permissions.CONTRACT_APPROVE_LEVEL_1]: { label: "Duyệt hợp đồng (Kỹ thuật)", description: "Rà soát kỹ thuật/phạm vi công việc" },
    [Permissions.CONTRACT_APPROVE_LEVEL_2]: { label: "Duyệt hợp đồng (Ban GĐ)", description: "Phê duyệt ký kết hợp đồng" },

    [Permissions.PAYMENT_VIEW]: { label: "Xem đợt thanh toán", description: "Theo dõi tiến độ thanh toán theo hợp đồng" },
    [Permissions.PAYMENT_CREATE]: { label: "Tạo đợt thanh toán", description: "Lập kế hoạch thu tiền (Payment Schedule)" },
    [Permissions.PAYMENT_UPDATE]: { label: "Sửa đợt thanh toán", description: "Điều chỉnh kế hoạch thu tiền" },
    [Permissions.PAYMENT_DELETE]: { label: "Xóa đợt thanh toán", description: "Hủy đợt thanh toán" },
    [Permissions.PAYMENT_MARK_AS_PAID_BY_CUSTOMER]: { label: "Xác nhận KH đã trả (Hợp đồng)", description: "Đánh dấu khách đã chuyển khoản (Cần kế toán xác nhận)" },
    [Permissions.PAYMENT_CONFIRM]: { label: "Kế toán xác nhận tiền (Hợp đồng)", description: "Xác nhận tiền hợp đồng đã về tài khoản" },
    [Permissions.PAYMENT_APPROVE]: { label: "Duyệt kế hoạch thanh toán", description: "Phê duyệt tiến độ thu tiền" },

    // ===================================================================
    // MATERIAL & EQUIPMENT (Vật Tư & Thiết Bị)
    // ===================================================================
    [Permissions.MATERIAL_VIEW]: { label: "Xem kho vật liệu", description: "Xem danh mục và tồn kho vật liệu" },
    [Permissions.MATERIAL_CREATE]: { label: "Thêm vật liệu", description: "Khai báo vật liệu mới" },
    [Permissions.MATERIAL_UPDATE]: { label: "Cập nhật vật liệu", description: "Sửa thông tin/đơn giá vật liệu" },
    [Permissions.MATERIAL_DELETE]: { label: "Xóa vật liệu", description: "Gỡ bỏ vật liệu khỏi danh mục" },
    [Permissions.MATERIAL_APPROVE]: { label: "Duyệt vật liệu", description: "Phê duyệt yêu cầu vật tư" },

    [Permissions.EQUIPMENT_VIEW]: { label: "Xem thiết bị", description: "Quản lý danh sách máy móc thiết bị" },
    [Permissions.EQUIPMENT_CREATE]: { label: "Thêm thiết bị", description: "Khai báo máy móc mới" },
    [Permissions.EQUIPMENT_UPDATE]: { label: "Cập nhật thiết bị", description: "Sửa thông tin/tình trạng thiết bị" },
    [Permissions.EQUIPMENT_DELETE]: { label: "Xóa thiết bị", description: "Thanh lý hoặc xóa thiết bị" },
    [Permissions.EQUIPMENT_APPROVE]: { label: "Duyệt thiết bị", description: "Phê duyệt điều phối thiết bị" },

    [Permissions.RECEIPT_VIEW]: { label: "Xem phiếu kho", description: "Xem lịch sử nhập/xuất kho" },
    [Permissions.RECEIPT_CREATE]: { label: "Tạo phiếu nhập/xuất", description: "Lập phiếu kho" },
    [Permissions.RECEIPT_UPDATE]: { label: "Sửa phiếu kho", description: "Điều chỉnh phiếu kho" },
    [Permissions.RECEIPT_DELETE]: { label: "Hủy phiếu kho", description: "Hủy phiếu nhập/xuất" },
    [Permissions.RECEIPT_VERIFY]: { label: "Xác nhận kho", description: "Thủ kho xác nhận phiếu" },

    // ===================================================================
    // SUBCONTRACTORS (Thầu Phụ)
    // ===================================================================
    [Permissions.SUBCONTRACTOR_VIEW]: { label: "Xem danh sách Thầu phụ", description: "Quản lý thông tin các nhà thầu phụ (Teams)" },
    [Permissions.SUBCONTRACTOR_CREATE]: { label: "Thêm Thầu phụ", description: "Tạo hồ sơ thầu phụ mới" },
    [Permissions.SUBCONTRACTOR_UPDATE]: { label: "Cập nhật Thầu phụ", description: "Sửa thông tin liên hệ thầu phụ" },
    [Permissions.SUBCONTRACTOR_DELETE]: { label: "Xóa Thầu phụ", description: "Gỡ bỏ thầu phụ" },

    [Permissions.SUBCONTRACTOR_PAYMENT_VIEW]: { label: "Xem thanh toán Thầu phụ", description: "Theo dõi công nợ thầu phụ" },
    [Permissions.SUBCONTRACTOR_PAYMENT_CREATE]: { label: "Tạo yêu cầu thanh toán TP", description: "Lập phiếu đề nghị trả tiền thầu phụ" },
    [Permissions.SUBCONTRACTOR_PAYMENT_UPDATE]: { label: "Sửa thanh toán TP", description: "Chỉnh sửa đề nghị thanh toán" },
    [Permissions.SUBCONTRACTOR_PAYMENT_DELETE]: { label: "Xóa thanh toán TP", description: "Hủy đề nghị thanh toán" },
    [Permissions.SUBCONTRACTOR_PAYMENT_APPROVE]: { label: "Duyệt chi Thầu phụ", description: "Phê duyệt trả tiền cho thầu phụ" },
    [Permissions.SUBCONTRACTOR_PAYMENT_MARK_PAID]: { label: "Xác nhận đã trả TP", description: "Kế toán xác nhận đã chuyển tiền cho TP" },

    // ===================================================================
    // SUPPLIERS (Nhà Cung Cấp)
    // ===================================================================
    [Permissions.SUPPLIER_VIEW]: { label: "Xem Nhà cung cấp", description: "Quản lý danh sách đối tác cung ứng" },
    [Permissions.SUPPLIER_CREATE]: { label: "Thêm NCC", description: "Thêm mới nhà cung cấp" },
    [Permissions.SUPPLIER_UPDATE]: { label: "Sửa NCC", description: "Cập nhật thông tin nhà cung cấp" },
    [Permissions.SUPPLIER_DELETE]: { label: "Xóa NCC", description: "Gỡ bỏ nhà cung cấp" },

    [Permissions.SUPPLIER_CONTRACT_VIEW]: { label: "Xem hợp đồng NCC", description: "Quản lý các hợp đồng mua sắm" },
    [Permissions.SUPPLIER_CONTRACT_CREATE]: { label: "Tạo hợp đồng NCC", description: "Lập hợp đồng mua hàng mới" },
    [Permissions.SUPPLIER_CONTRACT_UPDATE]: { label: "Sửa hợp đồng NCC", description: "Đàm phán/Điều chỉnh hợp đồng" },
    [Permissions.SUPPLIER_CONTRACT_DELETE]: { label: "Xóa hợp đồng NCC", description: "Hủy hợp đồng mua hàng" },
    [Permissions.SUPPLIER_CONTRACT_APPROVE]: { label: "Duyệt hợp đồng NCC", description: "Phê duyệt hợp đồng cung ứng" },

    [Permissions.SUPPLIER_ACCEPTANCE_VIEW]: { label: "Xem nghiệm thu NCC", description: "Kiểm tra hàng hóa/dịch vụ từ NCC" },
    [Permissions.SUPPLIER_ACCEPTANCE_CREATE]: { label: "Tạo nghiệm thu NCC", description: "Lập biên bản nhận hàng/nghiệm thu" },
    [Permissions.SUPPLIER_ACCEPTANCE_UPDATE]: { label: "Sửa nghiệm thu NCC", description: "Chỉnh sửa biên bản nghiệm thu" },
    [Permissions.SUPPLIER_ACCEPTANCE_DELETE]: { label: "Xóa nghiệm thu NCC", description: "Hủy biên bản nghiệm thu" },

    // ===================================================================
    // HR & PERSONNEL (Nhân Sự & Lương)
    // ===================================================================
    [Permissions.PERSONNEL_VIEW]: { label: "Xem thành viên dự án", description: "Xem danh sách nhân sự tham gia dự án" },
    [Permissions.PERSONNEL_ASSIGN]: { label: "Phân công nhân sự", description: "Thêm thành viên vào dự án" },
    [Permissions.PERSONNEL_REMOVE]: { label: "Rút nhân sự", description: "Đưa thành viên ra khỏi dự án" },

    [Permissions.HR_EMPLOYEE_VIEW]: { label: "Xem hồ sơ nhân viên", description: "Quản lý dữ liệu nhân sự công ty" },
    [Permissions.HR_EMPLOYEE_CREATE]: { label: "Thêm nhân viên", description: "Tạo mới hồ sơ nhân sự" },
    [Permissions.HR_EMPLOYEE_UPDATE]: { label: "Cập nhật hồ sơ", description: "Sửa thông tin nhân viên" },
    [Permissions.HR_EMPLOYEE_DELETE]: { label: "Xóa nhân viên", description: "Thôi việc/Xóa hồ sơ" },

    [Permissions.HR_TIME_TRACKING_VIEW]: { label: "Xem chấm công", description: "Xem dữ liệu chấm công" },
    [Permissions.HR_TIME_TRACKING_CHECK_IN]: { label: "Chấm công (Vào)", description: "Check-in đầu ca" },
    [Permissions.HR_TIME_TRACKING_CHECK_OUT]: { label: "Chấm công (Ra)", description: "Check-out cuối ca" },
    [Permissions.HR_TIME_TRACKING_CREATE]: { label: "Tạo công bổ sung", description: "Khai báo công tay (nếu quên chấm)" },
    [Permissions.HR_TIME_TRACKING_UPDATE]: { label: "Sửa công", description: "Điều chỉnh dữ liệu chấm công" },
    [Permissions.HR_TIME_TRACKING_DELETE]: { label: "Xóa công", description: "Hủy dữ liệu chấm công" },
    [Permissions.HR_TIME_TRACKING_APPROVE]: { label: "Duyệt công", description: "Phê duyệt bảng công nhân viên" },
    [Permissions.HR_TIME_TRACKING_REJECT]: { label: "Từ chối công", description: "Không ghi nhận công" },

    [Permissions.HR_PAYROLL_VIEW]: { label: "Xem lương", description: "Xem bảng tính lương" },
    [Permissions.HR_PAYROLL_CALCULATE]: { label: "Tính lương", description: "Chạy bảng tính lương cuối kỳ" },
    [Permissions.HR_PAYROLL_APPROVE]: { label: "Duyệt lương", description: "Phê duyệt chi trả lương" },
    [Permissions.HR_PAYROLL_PAY]: { label: "Chi lương", description: "Xác nhận đã chuyển khoản lương" },
    [Permissions.HR_PAYROLL_EXPORT]: { label: "Xuất bảng lương", description: "Xuất Excel bảng lương" },

    [Permissions.HR_BONUS_VIEW]: { label: "Xem thưởng/phạt", description: "Theo dõi các khoản phụ cấp, thưởng phạt" },
    [Permissions.HR_BONUS_CREATE]: { label: "Tạo thưởng/phạt", description: "Đề xuất thưởng hoặc ghi nhận vi phạm" },
    [Permissions.HR_BONUS_UPDATE]: { label: "Sửa thưởng/phạt", description: "Tham chiếu lại mức thưởng phạt" },
    [Permissions.HR_BONUS_DELETE]: { label: "Xóa thưởng/phạt", description: "Hủy khoản thưởng phạt" },
    [Permissions.HR_BONUS_APPROVE]: { label: "Duyệt thưởng/phạt", description: "Phê duyệt quyết định thưởng/phạt" },
    [Permissions.HR_BONUS_PAY]: { label: "Chi thưởng", description: "Xác nhận chi trả thưởng" },

    // ===================================================================
    // REPORTS & LOGS & OTHERS
    // ===================================================================
    [Permissions.REPORT_VIEW]: { label: "Xem báo cáo chung", description: "Truy cập trung tâm báo cáo" },
    [Permissions.REPORT_EXPORT]: { label: "Xuất dữ liệu báo cáo", description: "Tải về các báo cáo hệ thống" },
    [Permissions.REPORT_FINANCIAL]: { label: "Báo cáo tài chính", description: "Xem chuyên sâu về P&L, dòng tiền" },
    [Permissions.REPORT_PROGRESS]: { label: "Báo cáo tiến độ", description: "Xem thống kê hiệu suất thi công" },
    [Permissions.PROJECT_SUMMARY_REPORT_VIEW]: { label: "Báo cáo tổng hợp dự án", description: "Xem Dashboard tổng quan dự án" },

    [Permissions.LOG_VIEW]: { label: "Xem nhật ký thi công", description: "Đọc nhật ký công trường hàng ngày" },
    [Permissions.LOG_CREATE]: { label: "Viết nhật ký", description: "Ghi chép tình hình thi công trong ngày" },
    [Permissions.LOG_UPDATE]: { label: "Sửa nhật ký", description: "Chỉnh sửa nội dung nhật ký" },
    [Permissions.LOG_DELETE]: { label: "Xóa nhật ký", description: "Xóa bỏ nhật ký" },

    [Permissions.DEFECT_VIEW]: { label: "Xem lỗi/sai sót", description: "Theo dõi danh sách lỗi defect" },
    [Permissions.DEFECT_CREATE]: { label: "Báo lỗi", description: "Ghi nhận lỗi mới phát hiện" },
    [Permissions.DEFECT_UPDATE]: { label: "Cập nhật lỗi", description: "Cập nhật trạng thái xử lý lỗi" },
    [Permissions.DEFECT_DELETE]: { label: "Xóa lỗi", description: "Hủy bỏ ghi nhận lỗi" },
    [Permissions.DEFECT_VERIFY]: { label: "Duyệt khắc phục lỗi", description: "Xác nhận lỗi đã được sửa xong (Close)" },

    [Permissions.ISSUE_VIEW]: { label: "Xem sự cố", description: "Theo dõi vấn đề phát sinh nghiêm trọng" },
    [Permissions.ISSUE_CREATE]: { label: "Báo cáo sự cố", description: "Khai báo sự cố công trình" },
    [Permissions.ISSUE_UPDATE]: { label: "Cập nhật sự cố", description: "Cập nhật diễn biến xử lý sự cố" },
    [Permissions.ISSUE_DELETE]: { label: "Xóa sự cố", description: "Gỡ bỏ báo cáo sự cố" },
    [Permissions.ISSUE_RESOLVE]: { label: "Giải quyết sự cố", description: "Đánh dấu sự cố đã được xử lý" },

    [Permissions.CHANGE_REQUEST_VIEW]: { label: "Xem Yêu cầu thay đổi", description: "Quản lý Change Requests (CR)" },
    [Permissions.CHANGE_REQUEST_CREATE]: { label: "Tạo CR", description: "Đề xuất thay đổi phạm vi/thiết kế" },
    [Permissions.CHANGE_REQUEST_UPDATE]: { label: "Sửa CR", description: "Điều chỉnh nội dung đề xuất thay đổi" },
    [Permissions.CHANGE_REQUEST_DELETE]: { label: "Xóa CR", description: "Hủy đề xuất thay đổi" },
    [Permissions.CHANGE_REQUEST_APPROVE]: { label: "Duyệt CR", description: "Phê duyệt chấp thuận thay đổi" },
    [Permissions.CHANGE_REQUEST_REJECT]: { label: "Từ chối CR", description: "Không đồng ý thay đổi" },

    [Permissions.DOCUMENT_VIEW]: { label: "Thư viện tài liệu (Chung)", description: "Truy cập kho tài liệu công ty" },
    [Permissions.DOCUMENT_UPLOAD]: { label: "Tải lên tài liệu (Chung)", description: "Thêm tài liệu vào kho chung" },
    [Permissions.DOCUMENT_DELETE]: { label: "Xóa tài liệu (Chung)", description: "Quản lý tài liệu chung" },

    [Permissions.SETTINGS_VIEW]: { label: "Xem cài đặt", description: "Truy cập trang cấu hình" },
    [Permissions.SETTINGS_MANAGE]: { label: "Quản trị hệ thống", description: "Toàn quyền cấu hình (Admin)" },
};

const MODULE_LABELS: Record<string, string> = {
    project: "Dự Án & Tiến Độ",
    progress: "Tiến Độ",
    acceptance: "Nghiệm Thu",
    cost: "Chi Phí Nội Bộ",
    additional_cost: "Phát Sinh & Báo Giá",
    revenue: "Doanh Thu & Tài Chính",
    hr: "Nhân Sự & Tiền Lương",
    material: "Kho & Vật Tư",
    equipment: "Máy Móc & Thiết Bị",
    report: "Báo Cáo",
    invoice: "Hóa Đơn Đầu Ra",
    input_invoice: "Hóa Đơn Đầu Vào",
    contract: "Hợp Đồng Khách Hàng",
    payment: "Thanh Toán & Công Nợ KH",
    subcontractor: "Thầu Phụ (Teams)",
    subcontractor_payment: "Thanh Toán Thầu Phụ",
    document: "Tài Liệu",
    log: "Nhật Ký Thi Công",
    defect: "Lỗi & Defect",
    personnel: "Nhân Sự Dự Án",
    budgets: "Ngân Sách",
    receipts: "Phiếu Kho / Thu Chi",
    suppliers: "Nhà Cung Cấp (NCC)",
    supplier: "Hợp Đồng & Nghiệm Thu NCC",
    change_request: "Yêu Cầu Thay Đổi (CR)",
    issue: "Sự Cố & Vấn Đề",
    settings: "Cài Đặt Hệ Thống",
};

export const getPermissionDetail = (permissionName: string): PermissionDetail => {
    return PERMISSION_DETAILS[permissionName] || {
        label: permissionName,
        description: ""
    };
};

export const getModuleLabel = (moduleName: string): string => {
    return MODULE_LABELS[moduleName] || moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
};
