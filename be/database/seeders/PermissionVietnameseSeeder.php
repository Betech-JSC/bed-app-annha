<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Permission;

class PermissionVietnameseSeeder extends Seeder
{
    public function run(): void
    {
        $map = [
            // ===== DỰ ÁN =====
            'project.view' => 'Xem danh sách dự án',
            'project.create' => 'Tạo dự án mới',
            'project.update' => 'Chỉnh sửa dự án',
            'project.delete' => 'Xóa dự án',
            'project.manage' => 'Quản lý toàn quyền dự án',

            // Bình luận dự án
            'project.comment.view' => 'Xem bình luận dự án',
            'project.comment.create' => 'Viết bình luận dự án',
            'project.comment.update' => 'Sửa bình luận dự án',
            'project.comment.delete' => 'Xóa bình luận dự án',

            // Tiến độ
            'progress.view' => 'Xem tiến độ dự án',
            'progress.update' => 'Cập nhật tiến độ dự án',

            // Công việc dự án
            'project.task.view' => 'Xem công việc dự án',
            'project.task.create' => 'Tạo công việc dự án',
            'project.task.update' => 'Sửa công việc dự án',
            'project.task.delete' => 'Xóa công việc dự án',

            // Giai đoạn dự án
            'project.phase.view' => 'Xem giai đoạn dự án',
            'project.phase.create' => 'Tạo giai đoạn dự án',
            'project.phase.update' => 'Sửa giai đoạn dự án',
            'project.phase.delete' => 'Xóa giai đoạn dự án',

            // Tài liệu dự án
            'project.document.view' => 'Xem tài liệu dự án',
            'project.document.upload' => 'Tải lên tài liệu dự án',
            'project.document.delete' => 'Xóa tài liệu dự án',

            // Rủi ro dự án
            'project.risk.view' => 'Xem rủi ro dự án',
            'project.risk.create' => 'Tạo rủi ro dự án',
            'project.risk.update' => 'Sửa rủi ro dự án',
            'project.risk.delete' => 'Xóa rủi ro dự án',

            // Giám sát dự án
            'project.monitoring.view' => 'Xem giám sát dự án',

            // ===== CHI PHÍ (NỘI BỘ) =====
            'cost.view' => 'Xem chi phí nội bộ',
            'cost.create' => 'Tạo chi phí nội bộ',
            'cost.update' => 'Sửa chi phí nội bộ',
            'cost.delete' => 'Xóa chi phí nội bộ',
            'cost.submit' => 'Gửi duyệt chi phí nội bộ',
            'cost.approve.management' => 'Duyệt chi phí (Ban quản lý)',
            'cost.approve.accountant' => 'Duyệt chi phí (Kế toán)',
            'cost.reject' => 'Từ chối chi phí nội bộ',

            // ===== CHI PHÍ PHÁT SINH =====
            'additional_cost.view' => 'Xem chi phí phát sinh',
            'additional_cost.create' => 'Tạo chi phí phát sinh',
            'additional_cost.update' => 'Sửa chi phí phát sinh',
            'additional_cost.delete' => 'Xóa chi phí phát sinh',
            'additional_cost.approve' => 'Duyệt chi phí phát sinh',
            'additional_cost.confirm' => 'Xác nhận chi phí phát sinh',
            'additional_cost.reject' => 'Từ chối chi phí phát sinh',
            'additional_cost.mark_paid_by_customer' => 'Xác nhận KH đã thanh toán CPPS',

            // ===== VẬT LIỆU =====
            'material.view' => 'Xem vật tư/vật liệu',
            'material.create' => 'Tạo vật tư/vật liệu',
            'material.update' => 'Sửa vật tư/vật liệu',
            'material.delete' => 'Xóa vật tư/vật liệu',
            'material.approve' => 'Duyệt yêu cầu vật tư',

            // ===== THIẾT BỊ =====
            'equipment.view' => 'Xem thiết bị',
            'equipment.create' => 'Tạo thiết bị',
            'equipment.update' => 'Sửa thiết bị',
            'equipment.delete' => 'Xóa thiết bị',
            'equipment.approve' => 'Duyệt yêu cầu thiết bị',

            // ===== BÁO CÁO =====
            'report.view' => 'Xem báo cáo',
            'report.export' => 'Xuất báo cáo (Excel/PDF)',
            'report.financial' => 'Xem báo cáo tài chính',
            'report.progress' => 'Xem báo cáo tiến độ',
            'report.project_summary.view' => 'Xem tổng hợp dự án',

            // ===== HÓA ĐƠN ĐẦU RA =====
            'invoice.view' => 'Xem hóa đơn đầu ra',
            'invoice.create' => 'Tạo hóa đơn đầu ra',
            'invoice.update' => 'Sửa hóa đơn đầu ra',
            'invoice.delete' => 'Xóa hóa đơn đầu ra',
            'invoice.approve' => 'Duyệt hóa đơn đầu ra',
            'invoice.send' => 'Gửi hóa đơn đầu ra',

            // ===== HÓA ĐƠN ĐẦU VÀO =====
            'input_invoice.view' => 'Xem hóa đơn đầu vào',
            'input_invoice.create' => 'Tạo hóa đơn đầu vào',
            'input_invoice.update' => 'Sửa hóa đơn đầu vào',
            'input_invoice.delete' => 'Xóa hóa đơn đầu vào',

            // ===== HỢP ĐỒNG =====
            'contract.view' => 'Xem hợp đồng',
            'contract.create' => 'Tạo hợp đồng',
            'contract.update' => 'Sửa hợp đồng',
            'contract.delete' => 'Xóa hợp đồng',
            'contract.approve.level_1' => 'Duyệt hợp đồng (Kỹ thuật)',
            'contract.approve.level_2' => 'Phê duyệt hợp đồng (Ban GĐ)',

            // ===== THANH TOÁN =====
            'payment.view' => 'Xem đợt thanh toán',
            'payment.create' => 'Tạo đợt thanh toán',
            'payment.update' => 'Sửa đợt thanh toán',
            'payment.delete' => 'Xóa đợt thanh toán',
            'payment.confirm' => 'Kế toán xác nhận đã nhận tiền',
            'payment.mark_paid_by_customer' => 'KH xác nhận đã chuyển tiền',

            // ===== NHÀ THẦU PHỤ =====
            'subcontractor.view' => 'Xem nhà thầu phụ',
            'subcontractor.create' => 'Tạo nhà thầu phụ',
            'subcontractor.update' => 'Sửa nhà thầu phụ',
            'subcontractor.delete' => 'Xóa nhà thầu phụ',

            // Thanh toán thầu phụ
            'subcontractor_payment.view' => 'Xem thanh toán NTP',
            'subcontractor_payment.create' => 'Tạo thanh toán NTP',
            'subcontractor_payment.update' => 'Sửa thanh toán NTP',
            'subcontractor_payment.delete' => 'Xóa thanh toán NTP',
            'subcontractor_payment.approve' => 'Duyệt thanh toán NTP',
            'subcontractor_payment.mark_paid' => 'Đánh dấu đã trả tiền NTP',

            // ===== TÀI LIỆU =====
            'document.view' => 'Xem tài liệu',
            'document.upload' => 'Tải lên tài liệu',
            'document.delete' => 'Xóa tài liệu',

            // ===== NHẬT KÝ CÔNG TRÌNH =====
            'log.view' => 'Xem nhật ký công trình',
            'log.create' => 'Tạo nhật ký công trình',
            'log.update' => 'Sửa nhật ký công trình',
            'log.delete' => 'Xóa nhật ký công trình',

            // ===== LỖI PHÁT SINH =====
            'defect.view' => 'Xem lỗi phát sinh',
            'defect.create' => 'Tạo lỗi phát sinh',
            'defect.update' => 'Sửa lỗi phát sinh',
            'defect.delete' => 'Xóa lỗi phát sinh',
            'defect.verify' => 'Xác minh lỗi phát sinh',

            // ===== NHÂN SỰ DỰ ÁN =====
            'personnel.view' => 'Xem nhân sự dự án',
            'personnel.assign' => 'Gán nhân sự vào dự án',
            'personnel.remove' => 'Gỡ nhân sự khỏi dự án',

            // ===== DOANH THU =====
            'revenue.view' => 'Xem doanh thu',
            'revenue.dashboard' => 'Xem dashboard doanh thu',
            'revenue.export' => 'Xuất báo cáo doanh thu',

            // ===== NGÂN SÁCH =====
            'budgets.view' => 'Xem ngân sách',
            'budgets.create' => 'Tạo ngân sách',
            'budgets.update' => 'Sửa ngân sách',
            'budgets.delete' => 'Xóa ngân sách',

            // ===== NGHIỆM THU =====
            'acceptance.view' => 'Xem nghiệm thu',
            'acceptance.create' => 'Tạo nghiệm thu',
            'acceptance.update' => 'Sửa nghiệm thu',
            'acceptance.delete' => 'Xóa nghiệm thu',
            'acceptance.approve.level_1' => 'Duyệt nghiệm thu cấp 1',
            'acceptance.approve.level_2' => 'Duyệt nghiệm thu cấp 2',
            'acceptance.approve.level_3' => 'Duyệt nghiệm thu cấp 3',
            'acceptance.attach_files' => 'Đính kèm file nghiệm thu',

            // Mẫu nghiệm thu
            'acceptance.template.view' => 'Xem mẫu nghiệm thu',
            'acceptance.template.create' => 'Tạo mẫu nghiệm thu',
            'acceptance.template.update' => 'Sửa mẫu nghiệm thu',
            'acceptance.template.delete' => 'Xóa mẫu nghiệm thu',

            // ===== PHIẾU THU/CHI =====
            'receipts.view' => 'Xem phiếu thu/chi',
            'receipts.create' => 'Tạo phiếu thu/chi',
            'receipts.update' => 'Sửa phiếu thu/chi',
            'receipts.delete' => 'Xóa phiếu thu/chi',
            'receipts.verify' => 'Xác minh phiếu thu/chi',

            // ===== NHÀ CUNG CẤP =====
            'suppliers.view' => 'Xem nhà cung cấp',
            'suppliers.create' => 'Tạo nhà cung cấp',
            'suppliers.update' => 'Sửa nhà cung cấp',
            'suppliers.delete' => 'Xóa nhà cung cấp',

            // Hợp đồng NCC
            'supplier.contract.view' => 'Xem hợp đồng NCC',
            'supplier.contract.create' => 'Tạo hợp đồng NCC',
            'supplier.contract.update' => 'Sửa hợp đồng NCC',
            'supplier.contract.delete' => 'Xóa hợp đồng NCC',
            'supplier.contract.approve' => 'Duyệt hợp đồng NCC',

            // Nghiệm thu NCC
            'supplier.acceptance.view' => 'Xem nghiệm thu NCC',
            'supplier.acceptance.create' => 'Tạo nghiệm thu NCC',
            'supplier.acceptance.update' => 'Sửa nghiệm thu NCC',
            'supplier.acceptance.delete' => 'Xóa nghiệm thu NCC',

            // ===== YÊU CẦU THAY ĐỔI =====
            'change_request.view' => 'Xem yêu cầu thay đổi',
            'change_request.create' => 'Tạo yêu cầu thay đổi',
            'change_request.update' => 'Sửa yêu cầu thay đổi',
            'change_request.delete' => 'Xóa yêu cầu thay đổi',
            'change_request.approve' => 'Duyệt yêu cầu thay đổi',
            'change_request.reject' => 'Từ chối yêu cầu thay đổi',

            // ===== SỰ CỐ =====
            'issue.view' => 'Xem sự cố/vấn đề',
            'issue.create' => 'Tạo sự cố/vấn đề',
            'issue.update' => 'Sửa sự cố/vấn đề',
            'issue.delete' => 'Xóa sự cố/vấn đề',
            'issue.resolve' => 'Giải quyết sự cố',

            // ===== EVM =====
            'evm.view' => 'Xem phân tích EVM',
            'evm.create' => 'Tạo bản ghi EVM',

            // ===== KPI NHÂN SỰ =====
            'kpi.view' => 'Xem KPI nhân sự',
            'kpi.create' => 'Tạo KPI nhân sự',
            'kpi.update' => 'Sửa KPI nhân sự',
            'kpi.delete' => 'Xóa KPI nhân sự',
            'kpi.verify' => 'Xác minh/Đánh giá KPI',

            // ===== CÀI ĐẶT =====
            'settings.view' => 'Xem cài đặt hệ thống',
            'settings.manage' => 'Quản lý cài đặt hệ thống',

            // ===== PHÒNG BAN =====
            'departments.view' => 'Xem phòng ban',
            'departments.create' => 'Tạo phòng ban',
            'departments.update' => 'Sửa phòng ban',
            'departments.delete' => 'Xóa phòng ban',

            // ===== PHIẾU VẬT TƯ =====
            'material_bill.view' => 'Xem phiếu xuất vật tư',
            'material_bill.create' => 'Tạo phiếu xuất vật tư',
            'material_bill.update' => 'Sửa phiếu xuất vật tư',
            'material_bill.delete' => 'Xóa phiếu xuất vật tư',
            'material_bill.approve' => 'Duyệt phiếu xuất vật tư',

            // ===== NHẮC NHỞ =====
            'reminder.view' => 'Xem nhắc nhở',
            'reminder.create' => 'Tạo nhắc nhở',
            'reminder.update' => 'Sửa nhắc nhở',
            'reminder.delete' => 'Xóa nhắc nhở',

            // ===== CHI PHÍ CÔNG TY =====
            'company_cost.view' => 'Xem chi phí công ty',
            'company_cost.create' => 'Tạo chi phí công ty',
            'company_cost.update' => 'Sửa chi phí công ty',
            'company_cost.delete' => 'Xóa chi phí công ty',
            'company_cost.submit' => 'Gửi duyệt chi phí công ty',
            'company_cost.approve.management' => 'Duyệt chi phí công ty (BQL)',
            'company_cost.approve.accountant' => 'Duyệt chi phí công ty (KT)',
            'company_cost.reject' => 'Từ chối chi phí công ty',

            // ===== THẦU PHỤ (SETTINGS) =====
            'subcontractor.contract.view' => 'Xem hợp đồng thầu phụ',
            'subcontractor.contract.create' => 'Tạo hợp đồng thầu phụ',
            'subcontractor.contract.update' => 'Sửa hợp đồng thầu phụ',
            'subcontractor.contract.delete' => 'Xóa hợp đồng thầu phụ',
            'subcontractor.contract.approve' => 'Duyệt hợp đồng thầu phụ',
            'subcontractor.acceptance.view' => 'Xem nghiệm thu thầu phụ',
            'subcontractor.acceptance.create' => 'Tạo nghiệm thu thầu phụ',
            'subcontractor.acceptance.update' => 'Sửa nghiệm thu thầu phụ',
            'subcontractor.acceptance.delete' => 'Xóa nghiệm thu thầu phụ',
            'subcontractor.progress.view' => 'Xem tiến độ thầu phụ',
            'subcontractor.progress.update' => 'Cập nhật tiến độ thầu phụ',
        ];

        foreach ($map as $name => $description) {
            Permission::where('name', $name)->update(['description' => $description]);
        }

        $this->command->info('Updated ' . count($map) . ' permissions with Vietnamese descriptions.');
    }
}
