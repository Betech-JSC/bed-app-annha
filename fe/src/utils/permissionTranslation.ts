import { Permissions } from "@/constants/Permissions";

export interface PermissionDetail {
    label: string;
    description: string;
}

const PERMISSION_DETAILS: Record<string, PermissionDetail> = {
    // Project Module
    [Permissions.PROJECT_VIEW]: {
        label: "Xem dự án",
        description: "Cho phép xem danh sách và chi tiết các dự án"
    },
    [Permissions.PROJECT_CREATE]: {
        label: "Tạo dự án",
        description: "Cho phép tạo dự án mới"
    },
    [Permissions.PROJECT_UPDATE]: {
        label: "Cập nhật dự án",
        description: "Cho phép chỉnh sửa thông tin dự án hiện có"
    },
    [Permissions.PROJECT_DELETE]: {
        label: "Xóa dự án",
        description: "Cho phép xóa dự án khỏi hệ thống"
    },
    [Permissions.PROJECT_MANAGE]: {
        label: "Quản lý dự án tổng thể",
        description: "Quyền quản trị cao nhất trong một dự án"
    },

    // Acceptance Module
    [Permissions.ACCEPTANCE_VIEW]: {
        label: "Xem nghiệm thu",
        description: "Cho phép xem danh sách và chi tiết các biên bản nghiệm thu"
    },
    [Permissions.ACCEPTANCE_CREATE]: {
        label: "Tạo nghiệm thu",
        description: "Cho phép tạo mới các yêu cầu hoặc biên bản nghiệm thu"
    },
    [Permissions.ACCEPTANCE_UPDATE]: {
        label: "Sửa nghiệm thu",
        description: "Cho phép chỉnh sửa nội dung biên bản nghiệm thu"
    },
    [Permissions.ACCEPTANCE_DELETE]: {
        label: "Xóa nghiệm thu",
        description: "Cho phép xóa biên bản nghiệm thu"
    },
    [Permissions.ACCEPTANCE_APPROVE_LEVEL_1]: {
        label: "Nghiệm thu cấp 1 (Tổ trưởng/Kỹ thuật)",
        description: "Quyền ký duyệt nghiệm thu bước đầu tại công trường"
    },
    [Permissions.ACCEPTANCE_APPROVE_LEVEL_2]: {
        label: "Nghiệm thu cấp 2 (Chỉ huy trưởng/PM)",
        description: "Quyền ký duyệt nghiệm thu cấp quản lý dự án"
    },
    [Permissions.ACCEPTANCE_APPROVE_LEVEL_3]: {
        label: "Nghiệm thu cấp 3 (Ban lãnh đạo/Giám đốc)",
        description: "Quyền ký duyệt nghiệm thu cấp cao nhất để hoàn tất hồ sơ"
    },

    // Cost Module
    [Permissions.COST_VIEW]: {
        label: "Xem chi phí",
        description: "Cho phép xem các khoản chi phí của dự án"
    },
    [Permissions.COST_CREATE]: {
        label: "Đề xuất chi phí",
        description: "Cho phép tạo các yêu cầu chi phí, vật tư, thiết bị"
    },
    [Permissions.COST_SUBMIT]: {
        label: "Gửi duyệt chi phí",
        description: "Cho phép gửi các đề xuất chi phí lên cấp trên"
    },
    [Permissions.COST_APPROVE_MANAGEMENT]: {
        label: "Ban điều hành duyệt chi phí",
        description: "Cho phép Ban điều hành phê duyệt các khoản chi"
    },
    [Permissions.COST_APPROVE_ACCOUNTANT]: {
        label: "Kế toán xác nhận thanh toán",
        description: "Cho phép kế toán xác nhận đã chi tiền/thanh toán"
    },

    // Revenue Module
    [Permissions.REVENUE_VIEW]: {
        label: "Xem báo cáo tài chính dự án",
        description: "Cho phép xem tổng quát doanh thu, chi phí, lợi nhuận dự án"
    },
    [Permissions.REVENUE_DASHBOARD]: {
        label: "Xem Dashboard tài chính",
        description: "Cho phép xem các biểu đồ phân tích tài chính dự án"
    },

    // User/Settings
    [Permissions.SETTINGS_VIEW]: {
        label: "Xem cài đặt",
        description: "Cho phép truy cập vào mục cài đặt hệ thống"
    },
    [Permissions.SETTINGS_MANAGE]: {
        label: "Quản lý hệ thống",
        description: "Cho phép quản lý tài khoản, vai trò, phân quyền và cấu hình chung"
    },
};

const MODULE_LABELS: Record<string, string> = {
    projects: "Quản Lý Dự Án",
    project: "Quản Lý Dự Án",
    acceptance: "Hồ Sơ Nghiệm Thu",
    cost: "Quản Lý Chi Phí",
    costs: "Quản Lý Chi Phí",
    additional_cost: "Chi Phí Phát Sinh",
    revenue: "Báo Cáo Tài Chính",
    hr: "Nhân Sự & Tiền Lương",
    material: "Vật Tư & Kho",
    equipment: "Thiết Bị",
    contract: "Hợp Đồng",
    payment: "Thanh Toán Khách Hàng",
    subcontractor: "Nhà Thầu Phụ",
    defect: "Thay Đổi & Sai Sót",
    document: "Tài Liệu & Bản Vẽ",
    logs: "Nhật Ký Công Trình",
    settings: "Cài Đặt Hệ Thống",
};

export const getPermissionDetail = (permissionName: string): PermissionDetail => {
    return PERMISSION_DETAILS[permissionName] || {
        label: permissionName,
        description: ""
    };
};

export const getModuleLabel = (moduleName: string): string => {
    return MODULE_LABELS[moduleName] || moduleName;
};
