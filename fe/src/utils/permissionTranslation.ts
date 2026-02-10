import { Permissions } from "@/constants/Permissions";

export interface PermissionDetail {
    label: string;
    description: string;
}

const PERMISSION_DETAILS: Record<string, PermissionDetail> = {
    // Project Module
    [Permissions.PROJECT_VIEW]: {
        label: "Xem dự án",
        description: "Cho phép xem danh sách và chi tiết các dự án đang tham gia"
    },
    [Permissions.PROJECT_CREATE]: {
        label: "Tạo dự án",
        description: "Cho phép khởi tạo dự án mới trong hệ thống"
    },
    [Permissions.PROJECT_UPDATE]: {
        label: "Cập nhật dự án",
        description: "Cho phép chỉnh sửa thông tin mô tả, ngày bắt đầu/kết thúc dự án"
    },
    [Permissions.PROJECT_DELETE]: {
        label: "Xóa dự án",
        description: "Cho phép gỡ bỏ dự án khỏi hệ thống (Hành động cực kỳ quan trọng)"
    },
    [Permissions.PROJECT_MANAGE]: {
        label: "Quản lý dự án tổng thể",
        description: "Quyền quản trị cao nhất, có thể điều phối nhân sự và cấu hình dự án"
    },

    // Project Comment Module
    [Permissions.PROJECT_COMMENT_VIEW]: {
        label: "Xem thảo luận",
        description: "Xem các ý kiến phản hồi và trao đổi trong dự án"
    },
    [Permissions.PROJECT_COMMENT_CREATE]: {
        label: "Tạo thảo luận",
        description: "Gửi thảo luận hoặc ý kiến phản hồi mới"
    },
    [Permissions.PROJECT_COMMENT_UPDATE]: {
        label: "Sửa thảo luận",
        description: "Chỉnh sửa nội dung thảo luận đã gửi"
    },
    [Permissions.PROJECT_COMMENT_DELETE]: {
        label: "Xóa thảo luận",
        description: "Gỡ bỏ các thảo luận trong dự án"
    },

    // Progress Module
    [Permissions.PROGRESS_VIEW]: {
        label: "Xem tiến độ",
        description: "Theo dõi tiến độ hoàn thành các hạng mục công việc"
    },
    [Permissions.PROGRESS_UPDATE]: {
        label: "Cập nhật tiến độ",
        description: "Báo cáo % hoàn thành hoặc trạng thái thực tế của công việc"
    },

    // Task Module
    [Permissions.PROJECT_TASK_VIEW]: {
        label: "Xem công việc",
        description: "Xem danh sách và chi tiết các đầu việc trong dự án"
    },
    [Permissions.PROJECT_TASK_CREATE]: {
        label: "Tạo công việc",
        description: "Thêm mới các đầu việc hoặc nhiệm vụ cho dự án"
    },
    [Permissions.PROJECT_TASK_UPDATE]: {
        label: "Cập nhật công việc",
        description: "Chỉnh sửa thông tin, người phụ trách hoặc thời hạn công việc"
    },
    [Permissions.PROJECT_TASK_DELETE]: {
        label: "Xóa công việc",
        description: "Xóa bỏ các đầu việc không còn cần thiết"
    },

    // Acceptance Module
    [Permissions.ACCEPTANCE_VIEW]: {
        label: "Xem nghiệm thu",
        description: "Xem danh sách và chi tiết các biên bản nghiệm thu hạng mục"
    },
    [Permissions.ACCEPTANCE_CREATE]: {
        label: "Tạo nghiệm thu",
        description: "Khởi tạo yêu cầu nghiệm thu cho các hạng mục đã hoàn thành"
    },
    [Permissions.ACCEPTANCE_UPDATE]: {
        label: "Sửa nghiệm thu",
        description: "Chỉnh sửa thông tin biên bản nghiệm thu trước khi duyệt"
    },
    [Permissions.ACCEPTANCE_DELETE]: {
        label: "Xóa nghiệm thu",
        description: "Xóa bỏ hồ sơ nghiệm thu"
    },
    [Permissions.ACCEPTANCE_ATTACH_FILES]: {
        label: "Đính kèm hồ sơ",
        description: "Tải lên hình ảnh, tài liệu minh chứng cho việc nghiệm thu"
    },
    [Permissions.ACCEPTANCE_APPROVE_LEVEL_1]: {
        label: "Nghiệm thu Cấp 1 (Giám sát)",
        description: "Dành cho giám sát trực tiếp xác nhận tại hiện trường"
    },
    [Permissions.ACCEPTANCE_APPROVE_LEVEL_2]: {
        label: "Nghiệm thu Cấp 2 (Quản lý dự án)",
        description: "Dành cho Project Manager phê duyệt kỹ thuật và khối lượng"
    },
    [Permissions.ACCEPTANCE_APPROVE_LEVEL_3]: {
        label: "Nghiệm thu Cấp 3 (Khách hàng)",
        description: "Khách hàng xác nhận cuối cùng để hoàn tất hạng mục"
    },

    // Cost Module (Internal)
    [Permissions.COST_VIEW]: {
        label: "Xem chi phí nội bộ",
        description: "Cho phép xem các khoản chi phí triển khai dự án"
    },
    [Permissions.COST_CREATE]: {
        label: "Tạo đề xuất chi",
        description: "Tạo yêu cầu tạm ứng hoặc thanh toán chi phí nội bộ"
    },
    [Permissions.COST_UPDATE]: {
        label: "Sửa đề xuất chi",
        description: "Cập nhật thông tin yêu cầu chi phí"
    },
    [Permissions.COST_DELETE]: {
        label: "Xóa đề xuất chi",
        description: "Xóa bỏ yêu cầu chi phí"
    },
    [Permissions.COST_SUBMIT]: {
        label: "Gửi duyệt chi phí",
        description: "Chuyển yêu cầu chi phí lên cấp trên phê duyệt"
    },
    [Permissions.COST_APPROVE_MANAGEMENT]: {
        label: "Quản lý duyệt chi",
        description: "Phê duyệt các khoản chi phí của cấp dưới"
    },
    [Permissions.COST_APPROVE_ACCOUNTANT]: {
        label: "Kế toán xác nhận chi",
        description: "Kế toán xác nhận đã xuất tiền hoặc thực hiện chuyển khoản"
    },
    [Permissions.COST_REJECT]: {
        label: "Từ chối chi phí",
        description: "Bác bỏ các yêu cầu chi phí không hợp lệ"
    },

    // Additional Cost Module
    [Permissions.ADDITIONAL_COST_VIEW]: {
        label: "Xem chi phí phát sinh",
        description: "Xem các hạng mục phát sinh ngoài báo giá ban đầu"
    },
    [Permissions.ADDITIONAL_COST_CREATE]: {
        label: "Tạo phát sinh",
        description: "Thêm mới các yêu cầu chi phí phát sinh gửi khách hàng"
    },
    [Permissions.ADDITIONAL_COST_UPDATE]: {
        label: "Sửa phát sinh",
        description: "Chỉnh sửa nội dung hoặc giá trị hạng mục phát sinh"
    },
    [Permissions.ADDITIONAL_COST_DELETE]: {
        label: "Xóa phát sinh",
        description: "Xóa bỏ hạng mục phát sinh"
    },
    [Permissions.ADDITIONAL_COST_APPROVE]: {
        label: "Duyệt phát sinh",
        description: "Quản lý phê duyệt hạng mục phát sinh trước khi gửi khách hàng"
    },
    [Permissions.ADDITIONAL_COST_REJECT]: {
        label: "Từ chối phát sinh",
        description: "Bác bỏ các yêu cầu phát sinh không hợp lý"
    },
    [Permissions.ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER]: {
        label: "Xác nhận đã thanh toán (Khách hàng)",
        description: "Dành cho khách hàng đánh dấu đã chuyển khoản đợt phát sinh"
    },
    [Permissions.ADDITIONAL_COST_CONFIRM]: {
        label: "Kế toán xác nhận (Phát sinh)",
        description: "Kế toán xác nhận đã nhận được tiền phát sinh từ khách hàng"
    },

    // Material Module
    [Permissions.MATERIAL_VIEW]: {
        label: "Xem vật liệu",
        description: "Xem danh mục vật liệu và tình hình sử dụng"
    },
    [Permissions.MATERIAL_CREATE]: {
        label: "Thêm vật liệu",
        description: "Tạo mới các loại vật liệu trong danh mục"
    },
    [Permissions.MATERIAL_UPDATE]: {
        label: "Sửa vật liệu",
        description: "Cập nhật thông tin, đơn giá hoặc quy cách vật liệu"
    },
    [Permissions.MATERIAL_DELETE]: {
        label: "Xóa vật liệu",
        description: "Gỡ bỏ vật liệu khỏi danh mục"
    },
    [Permissions.MATERIAL_APPROVE]: {
        label: "Duyệt vật liệu",
        description: "Phê duyệt định mức hoặc yêu cầu cấp phát vật liệu"
    },

    // Equipment Module
    [Permissions.EQUIPMENT_VIEW]: {
        label: "Xem thiết bị",
        description: "Xem danh sách máy móc, thiết bị thi công"
    },
    [Permissions.EQUIPMENT_CREATE]: {
        label: "Thêm thiết bị",
        description: "Khai báo thêm thiết bị mới vào hệ thống"
    },
    [Permissions.EQUIPMENT_UPDATE]: {
        label: "Sửa thiết bị",
        description: "Cập nhật tình trạng hoặc thông tin thiết bị"
    },
    [Permissions.EQUIPMENT_DELETE]: {
        label: "Xóa thiết bị",
        description: "Gỡ bỏ thiết bị khỏi danh sách"
    },
    [Permissions.EQUIPMENT_APPROVE]: {
        label: "Duyệt thiết bị",
        description: "Phê duyệt kế hoạch điều động hoặc thuê thiết bị"
    },

    // HR Module
    [Permissions.HR_TIME_TRACKING_VIEW]: { label: "Xem chấm công", description: "Theo dõi bảng chấm công của nhân viên" },
    [Permissions.HR_TIME_TRACKING_CHECK_IN]: { label: "Chấm công vào", description: "Thực hiện chấm công bắt đầu ca làm việc" },
    [Permissions.HR_TIME_TRACKING_CHECK_OUT]: { label: "Chấm công ra", description: "Thực hiện chấm công kết thúc ca làm việc" },
    [Permissions.HR_PAYROLL_VIEW]: { label: "Xem bảng lương", description: "Xem thông tin thu nhập và bảng lương cá nhân hoặc nhóm" },

    // Report Module
    [Permissions.REPORT_VIEW]: {
        label: "Xem báo cáo",
        description: "Truy cập hệ thống báo cáo tổng hợp"
    },
    [Permissions.REPORT_EXPORT]: {
        label: "Xuất dữ liệu",
        description: "Tải về các file Excel, PDF từ các báo cáo"
    },
    [Permissions.REPORT_FINANCIAL]: {
        label: "Báo cáo tài chính",
        description: "Xem các chỉ số tài chính, dòng tiền và lợi nhuận"
    },
    [Permissions.REPORT_PROGRESS]: {
        label: "Báo cáo tiến độ",
        description: "Xem thống kê tiến độ thi công toàn dự án"
    },

    // Invoice Module
    [Permissions.INVOICE_VIEW]: { label: "Xem hóa đơn đầu ra", description: "Xem danh sách hóa đơn gửi cho khách hàng" },
    [Permissions.INVOICE_CREATE]: { label: "Tạo hóa đơn đầu ra", description: "Khởi tạo hóa đơn thanh toán cho khách hàng" },
    [Permissions.INVOICE_APPROVE]: { label: "Duyệt hóa đơn", description: "Phê duyệt nội dung hóa đơn trước khi phát hành" },
    [Permissions.INVOICE_SEND]: { label: "Gửi hóa đơn", description: "Thực hiện gửi hóa đơn cho khách hàng qua Email/Hệ thống" },

    // Input Invoice
    [Permissions.INPUT_INVOICE_VIEW]: { label: "Xem hóa đơn đầu vào", description: "Xem hóa đơn từ nhà cung cấp" },
    [Permissions.INPUT_INVOICE_CREATE]: { label: "Nhập hóa đơn đầu vào", description: "Khai báo hóa đơn đầu vào để quản lý công nợ" },

    // Contract Module
    [Permissions.CONTRACT_VIEW]: { label: "Xem hợp đồng", description: "Xem nội dung và tình trạng các hợp đồng" },
    [Permissions.CONTRACT_CREATE]: { label: "Tạo hợp đồng", description: "Xây dựng dự thảo hoặc tải lên hợp đồng mới" },
    [Permissions.CONTRACT_APPROVE_LEVEL_1]: { label: "Duyệt hợp đồng (Kỹ thuật/Thầu phụ)", description: "Kiểm tra và xác nhận các điều khoản kỹ thuật" },
    [Permissions.CONTRACT_APPROVE_LEVEL_2]: { label: "Phê duyệt hợp đồng (CĐT/Quản lý)", description: "Phê duyệt chính thức hợp đồng để thực hiện" },

    // Payment Module
    [Permissions.PAYMENT_VIEW]: { label: "Xem đợt thanh toán", description: "Xem các giai đoạn thanh toán dự kiến" },
    [Permissions.PAYMENT_CREATE]: { label: "Tạo đợt thanh toán", description: "Lập kế hoạch các đợt thu tiền từ khách hàng" },
    [Permissions.PAYMENT_MARK_AS_PAID_BY_CUSTOMER]: { label: "Xác nhận đã thanh toán (Khách hàng)", description: "Khách hàng xác nhận đã chuyển khoản cho đợt thanh toán" },
    [Permissions.PAYMENT_CONFIRM]: { label: "Kế toán xác nhận (Thu tiền)", description: "Kế toán xác nhận đã nhận được tiền từ khách hàng" },

    // Subcontractor Module
    [Permissions.SUBCONTRACTOR_VIEW]: { label: "Xem NCC/Thầu phụ", description: "Xem danh sách các đối tác thi công" },
    [Permissions.SUBCONTRACTOR_CREATE]: { label: "Thêm NCC/Thầu phụ", description: "Khai báo đối tác mới vào hệ thống" },

    // Subcontractor Payment
    [Permissions.SUBCONTRACTOR_PAYMENT_VIEW]: { label: "Xem thanh toán thầu phụ", description: "Theo dõi các khoản phải trả cho nhà thầu phụ/NCC" },
    [Permissions.SUBCONTRACTOR_PAYMENT_APPROVE]: { label: "Duyệt trả tiền thầu phụ", description: "Phê duyệt phiếu chi cho nhà thầu phụ" },
    [Permissions.SUBCONTRACTOR_PAYMENT_MARK_PAID]: { label: "Đánh dấu đã trả tiền", description: "Xác nhận đã thực hiện chuyển tiền cho thầu phụ" },

    // Document Module
    [Permissions.DOCUMENT_VIEW]: { label: "Xem tài liệu/Bản vẽ", description: "Truy cập kho lưu trữ hồ sơ kỹ thuật và bản vẽ" },
    [Permissions.DOCUMENT_UPLOAD]: { label: "Tải lên tài liệu", description: "Thêm hồ sơ hoặc bản vẽ mới vào kho dữ liệu" },

    // Log Module
    [Permissions.LOG_VIEW]: { label: "Xem nhật ký", description: "Xem lịch sử thi công hàng ngày" },
    [Permissions.LOG_CREATE]: { label: "Ghi nhật ký", description: "Ghi lại diễn biến thi công và các vấn đề tại công trường" },

    // Defect Module
    [Permissions.DEFECT_VIEW]: { label: "Xem lỗi phát sinh", description: "Theo dõi các lỗi thi công hoặc sai sót kỹ thuật" },
    [Permissions.DEFECT_CREATE]: { label: "Báo cáo lỗi", description: "Ghi nhận và yêu cầu sửa chữa các hạng mục bị lỗi" },
    [Permissions.DEFECT_VERIFY]: { label: "Xác minh khắc phục", description: "Xác nhận lỗi đã được xử lý xong" },

    // Personnel Module
    [Permissions.PERSONNEL_VIEW]: { label: "Xem nhân sự dự án", description: "Xem danh sách nhân sự tham gia dự án" },
    [Permissions.PERSONNEL_ASSIGN]: { label: "Gán nhân sự", description: "Phân công nhân viên vào dự án" },

    // Revenue Module
    [Permissions.REVENUE_DASHBOARD]: { label: "Xem thống kê tổng hợp", description: "Xem biểu đồ phân tích hiệu quả tài chính" },

    // Settings
    [Permissions.SETTINGS_VIEW]: { label: "Xem cấu hình", description: "Xem các tham số cài đặt hệ thống" },
    [Permissions.SETTINGS_MANAGE]: { label: "Quản trị hệ thống", description: "Toàn quyền cấu hình tài khoản, phân quyền và danh mục dùng chung" },
};

const MODULE_LABELS: Record<string, string> = {
    project: "Dự Án & Thảo Luận",
    progress: "Tiến Độ Thi Công",
    acceptance: "Hồ Sơ Nghiệm Thu",
    cost: "Chi Phí Nội Bộ",
    additional_cost: "Chi Phí Phát Sinh",
    revenue: "Tài Chính & Doanh Thu",
    hr: "Nhân Sự & Tiền Lương",
    material: "Vật Tư & Kho",
    equipment: "Máy Móc & Thiết Bị",
    report: "Hệ Thống Báo Cáo",
    invoice: "Hóa Đơn Đầu Ra",
    input_invoice: "Hóa Đơn Đầu Vào",
    contract: "Quản Lý Hợp Đồng",
    payment: "Thanh Toán Đợt",
    subcontractor: "Nhà Thầu Phụ / NCC",
    subcontractor_payment: "Thanh Toán Thầu Phụ",
    document: "Tài Liệu & Bản Vẽ",
    log: "Nhật Ký Công Trình",
    defect: "Sai Sót & Lỗi",
    personnel: "Đội Ngũ Dự Án",
    budgets: "Ngân Sách Dự Án",
    receipts: "Phiếu Thu / Chi",
    suppliers: "Nhà Cung Cấp",
    supplier: "Hợp Đồng Cung Cấp",
    change_request: "Yêu Cầu Thay Đổi",
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

