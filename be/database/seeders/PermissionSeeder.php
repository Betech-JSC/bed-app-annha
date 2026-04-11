<?php

namespace Database\Seeders;

use App\Constants\Permissions;
use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Creates all permissions from constants.
     * Uses updateOrCreate to ensure idempotency.
     */
    public function run(): void
    {
        $this->command->info('Creating permissions...');

        $permissions = Permissions::all();
        $grouped = Permissions::groupedByModule();
        $labels = $this->vietnameseLabels();

        $createdCount = 0;
        $updatedCount = 0;

        foreach ($permissions as $permissionName) {
            // Use Vietnamese label if available, otherwise auto-generate
            $description = $labels[$permissionName]
                ?? $this->generateFallbackDescription($permissionName);

            $permission = Permission::where('name', $permissionName)->first();

            if ($permission) {
                if ($permission->description !== $description) {
                    $permission->update(['description' => $description]);
                    $updatedCount++;
                }
            } else {
                Permission::create([
                    'name' => $permissionName,
                    'description' => $description,
                ]);
                $createdCount++;
                $this->command->info("✅ Created: {$permissionName}");
            }
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info("✅ Permissions created: {$createdCount}");
        if ($updatedCount > 0) {
            $this->command->info("🔄 Permissions updated: {$updatedCount}");
        }
        $this->command->info("📊 Total permissions: " . count($permissions));
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();

        // Display summary by module
        $this->command->info('📋 Permissions by module:');
        foreach ($grouped as $module => $modulePermissions) {
            $this->command->info("   {$module}: " . count($modulePermissions) . " permissions");
        }
        $this->command->newLine();
    }

    /**
     * All Vietnamese labels — single source of truth
     */
    private function vietnameseLabels(): array
    {
        return [
            // ===== TỔNG QUAN =====
            'crm.dashboard.view' => 'Xem màn hình Tổng quan CRM',

            // ===== CHI PHÍ CÔNG TY =====
            'company_cost.view' => 'Xem chi phí công ty',
            'company_cost.create' => 'Tạo chi phí công ty',
            'company_cost.update' => 'Sửa chi phí công ty',
            'company_cost.delete' => 'Xóa chi phí công ty',
            'company_cost.submit' => 'Gửi duyệt chi phí công ty',
            'company_cost.approve.management' => 'BĐH duyệt chi phí công ty',
            'company_cost.approve.accountant' => 'Kế toán duyệt chi phí công ty',
            'company_cost.reject' => 'Từ chối chi phí công ty',

            // ===== DỰ ÁN =====
            'project.view'    => 'Xem danh sách & chi tiết dự án',
            'project.create'  => 'Tạo dự án mới',
            'project.update'  => 'Chỉnh sửa thông tin dự án',
            'project.delete'  => 'Xóa dự án',
            'project.manage'  => 'Quản lý toàn quyền dự án',

            // Bình luận dự án
            'project.comment.view'   => 'Xem bình luận trong dự án',
            'project.comment.create' => 'Viết bình luận dự án',
            'project.comment.update' => 'Sửa bình luận dự án',
            'project.comment.delete' => 'Xóa bình luận dự án',

            // Tiến độ
            'progress.view'   => 'Xem tiến độ thi công',
            'progress.update' => 'Cập nhật tiến độ thi công',

            // Công việc / Hạng mục
            'project.task.view'   => 'Xem danh sách công việc',
            'project.task.create' => 'Tạo công việc / hạng mục mới',
            'project.task.update' => 'Sửa công việc / hạng mục',
            'project.task.delete' => 'Xóa công việc / hạng mục',

            // Giai đoạn dự án
            'project.phase.view'   => 'Xem giai đoạn dự án',
            'project.phase.create' => 'Tạo giai đoạn dự án',
            'project.phase.update' => 'Sửa giai đoạn dự án',
            'project.phase.delete' => 'Xóa giai đoạn dự án',

            // Tài liệu dự án
            'project.document.view'   => 'Xem tài liệu dự án',
            'project.document.upload' => 'Tải lên tài liệu dự án',
            'project.document.delete' => 'Xóa tài liệu dự án',

            // Rủi ro dự án
            'project.risk.view'   => 'Xem danh sách rủi ro',
            'project.risk.create' => 'Tạo hồ sơ rủi ro mới',
            'project.risk.update' => 'Cập nhật thông tin rủi ro',
            'project.risk.delete' => 'Xóa hồ sơ rủi ro',

            // Giám sát dự án
            'project.monitoring.view' => 'Xem tổng quan giám sát dự án',

            // ===== CHI PHÍ NỘI BỘ =====
            'cost.view'               => 'Xem danh sách chi phí nội bộ',
            'cost.create'             => 'Tạo khoản chi phí nội bộ',
            'cost.update'             => 'Sửa thông tin chi phí nội bộ',
            'cost.delete'             => 'Xóa khoản chi phí nội bộ',
            'cost.submit'             => 'Gửi chi phí chờ duyệt',
            'cost.approve.management' => 'Ban quản lý duyệt chi phí',
            'cost.approve.accountant' => 'Kế toán xác nhận chi phí',
            'cost.reject'             => 'Từ chối chi phí nội bộ',

            // ===== CHI PHÍ PHÁT SINH =====
            'additional_cost.view'                  => 'Xem chi phí phát sinh',
            'additional_cost.create'                => 'Tạo khoản chi phí phát sinh',
            'additional_cost.update'                => 'Sửa chi phí phát sinh',
            'additional_cost.delete'                => 'Xóa chi phí phát sinh',
            'additional_cost.approve'               => 'Duyệt chi phí phát sinh',
            'additional_cost.reject'                => 'Từ chối chi phí phát sinh',
            'additional_cost.confirm'               => 'Kế toán xác nhận đã nhận tiền phát sinh',
            'additional_cost.mark_paid_by_customer' => 'KH xác nhận đã thanh toán CP phát sinh',

            // ===== VẬT TƯ / VẬT LIỆU =====
            'material.view'    => 'Xem kho vật tư / vật liệu',
            'material.create'  => 'Thêm vật tư vào kho',
            'material.update'  => 'Sửa thông tin vật tư',
            'material.delete'  => 'Xóa vật tư khỏi kho',
            'material.approve' => 'Duyệt yêu cầu xuất vật tư',

            // ===== THIẾT BỊ =====
            'equipment.view'    => 'Xem danh sách thiết bị',
            'equipment.create'  => 'Thêm thiết bị mới',
            'equipment.update'  => 'Sửa thông tin thiết bị',
            'equipment.delete'  => 'Xóa thiết bị',
            'equipment.approve' => 'Duyệt yêu cầu thiết bị',

            // ===== BẢO HÀNH & BẢO TRÌ =====
            'warranty.view'    => 'Xem danh sách bảo hành',
            'warranty.create'  => 'Tạo phiếu bảo hành mới',
            'warranty.update'  => 'Cập nhật thông tin bảo hành',
            'warranty.delete'  => 'Xóa phiếu bảo hành',
            'warranty.approve' => 'Duyệt yêu cầu bảo hành',

            // ===== BÁO CÁO =====
            'report.view'                 => 'Xem trang báo cáo',
            'report.export'               => 'Xuất báo cáo ra Excel / PDF',
            'report.financial'            => 'Xem báo cáo tài chính',
            'report.progress'             => 'Xem báo cáo tiến độ',
            'report.project_summary.view' => 'Xem báo cáo tổng hợp dự án',

            // ===== HÓA ĐƠN ĐẦU RA =====
            'invoice.view'    => 'Xem hóa đơn đầu ra',
            'invoice.create'  => 'Tạo hóa đơn đầu ra',
            'invoice.update'  => 'Sửa hóa đơn đầu ra',
            'invoice.delete'  => 'Xóa hóa đơn đầu ra',
            'invoice.approve' => 'Duyệt hóa đơn đầu ra',
            'invoice.send'    => 'Gửi hóa đơn cho khách hàng',

            // ===== HÓA ĐƠN ĐẦU VÀO =====
            'input_invoice.view'   => 'Xem hóa đơn đầu vào',
            'input_invoice.create' => 'Nhập hóa đơn đầu vào',
            'input_invoice.update' => 'Sửa hóa đơn đầu vào',
            'input_invoice.delete' => 'Xóa hóa đơn đầu vào',

            // ===== HỢP ĐỒNG =====
            'contract.view'            => 'Xem hợp đồng dự án',
            'contract.create'          => 'Tạo hợp đồng mới',
            'contract.update'          => 'Sửa thông tin hợp đồng',
            'contract.delete'          => 'Xóa hợp đồng',
            'contract.approve.level_1' => 'Duyệt hợp đồng — cấp Kỹ thuật',
            'contract.approve.level_2' => 'Phê duyệt hợp đồng — cấp Ban Giám đốc',

            // ===== THANH TOÁN (đợt TT từ KH) =====
            'payment.view'                  => 'Xem các đợt thanh toán',
            'payment.create'                => 'Tạo đợt thanh toán mới',
            'payment.update'                => 'Sửa thông tin đợt thanh toán',
            'payment.delete'                => 'Xóa đợt thanh toán',
            'payment.confirm'               => 'Kế toán xác nhận đã nhận tiền',
            'payment.approve'               => 'Duyệt đợt thanh toán',
            'payment.mark_paid_by_customer' => 'KH xác nhận đã chuyển tiền',

            // ===== NHÀ THẦU PHỤ =====
            'subcontractor.view'   => 'Xem danh sách nhà thầu phụ',
            'subcontractor.create' => 'Thêm nhà thầu phụ',
            'subcontractor.update' => 'Sửa thông tin nhà thầu phụ',
            'subcontractor.delete' => 'Xóa nhà thầu phụ',

            // Thanh toán nhà thầu phụ
            'subcontractor_payment.view'      => 'Xem thanh toán nhà thầu phụ',
            'subcontractor_payment.create'    => 'Tạo yêu cầu thanh toán NTP',
            'subcontractor_payment.update'    => 'Sửa thanh toán nhà thầu phụ',
            'subcontractor_payment.delete'    => 'Xóa thanh toán nhà thầu phụ',
            'subcontractor_payment.approve'   => 'Duyệt thanh toán nhà thầu phụ',
            'subcontractor_payment.mark_paid' => 'Xác nhận đã trả tiền cho NTP',

            // ===== TÀI LIỆU =====
            'document.view'   => 'Xem danh sách tài liệu',
            'document.upload' => 'Tải lên tài liệu mới',
            'document.delete' => 'Xóa tài liệu',

            // ===== NHẬT KÝ CÔNG TRÌNH =====
            'log.view'    => 'Xem nhật ký công trình',
            'log.create'  => 'Viết nhật ký công trình',
            'log.update'  => 'Sửa nhật ký công trình',
            'log.delete'  => 'Xóa nhật ký công trình',
            'log.approve' => 'Duyệt nhật ký công trình',

            // ===== LỖI / KHUYẾT TẬT =====
            'defect.view'   => 'Xem danh sách lỗi / khuyết tật',
            'defect.create' => 'Báo cáo lỗi mới',
            'defect.update' => 'Cập nhật tình trạng lỗi',
            'defect.delete' => 'Xóa báo cáo lỗi',
            'defect.verify' => 'Xác nhận lỗi đã được sửa',

            // ===== NHÂN SỰ DỰ ÁN =====
            'personnel.view'   => 'Xem nhân sự tham gia dự án',
            'personnel.assign' => 'Thêm nhân sự vào dự án',
            'personnel.remove' => 'Gỡ nhân sự khỏi dự án',

            // ===== KPI NHÂN SỰ =====
            'kpi.view'   => 'Xem chỉ tiêu KPI nhân sự',
            'kpi.create' => 'Tạo chỉ tiêu KPI',
            'kpi.update' => 'Sửa chỉ tiêu KPI',
            'kpi.delete' => 'Xóa chỉ tiêu KPI',
            'kpi.verify' => 'Đánh giá / xác nhận KPI',

            // ===== DOANH THU =====
            'revenue.view'      => 'Xem thông tin doanh thu',
            'revenue.dashboard' => 'Xem bảng thống kê doanh thu',
            'revenue.export'    => 'Xuất báo cáo doanh thu',

            // ===== NGÂN SÁCH DỰ ÁN =====
            'budgets.view'    => 'Xem ngân sách dự án',
            'budgets.create'  => 'Tạo ngân sách dự án',
            'budgets.update'  => 'Sửa ngân sách dự án',
            'budgets.delete'  => 'Xóa ngân sách dự án',
            'budgets.approve' => 'Duyệt ngân sách dự án',

            // ===== NGHIỆM THU =====
            'acceptance.view'            => 'Xem hồ sơ nghiệm thu',
            'acceptance.create'          => 'Tạo đợt nghiệm thu mới',
            'acceptance.update'          => 'Sửa thông tin nghiệm thu',
            'acceptance.delete'          => 'Xóa đợt nghiệm thu',
            'acceptance.attach_files'    => 'Đính kèm tài liệu nghiệm thu',
            'acceptance.approve.level_1' => 'Giám sát duyệt nghiệm thu',
            'acceptance.approve.level_2' => 'Quản lý dự án duyệt nghiệm thu',
            'acceptance.approve.level_3' => 'Khách hàng phê duyệt nghiệm thu',

            // Mẫu nghiệm thu
            'acceptance.template.view'   => 'Xem bộ mẫu nghiệm thu',
            'acceptance.template.create' => 'Tạo mẫu nghiệm thu mới',
            'acceptance.template.update' => 'Sửa mẫu nghiệm thu',
            'acceptance.template.delete' => 'Xóa mẫu nghiệm thu',

            // ===== PHIẾU THU / CHI =====
            'receipts.view'   => 'Xem phiếu thu / phiếu chi',
            'receipts.create' => 'Tạo phiếu thu / phiếu chi',
            'receipts.update' => 'Sửa phiếu thu / phiếu chi',
            'receipts.delete' => 'Xóa phiếu thu / phiếu chi',
            'receipts.verify' => 'Xác minh phiếu thu / phiếu chi',

            // ===== NHÀ CUNG CẤP =====
            'suppliers.view'   => 'Xem danh sách nhà cung cấp',
            'suppliers.create' => 'Thêm nhà cung cấp mới',
            'suppliers.update' => 'Sửa thông tin nhà cung cấp',
            'suppliers.delete' => 'Xóa nhà cung cấp',

            // Hợp đồng NCC
            'supplier.contract.view'    => 'Xem hợp đồng nhà cung cấp',
            'supplier.contract.create'  => 'Tạo hợp đồng với NCC',
            'supplier.contract.update'  => 'Sửa hợp đồng NCC',
            'supplier.contract.delete'  => 'Xóa hợp đồng NCC',
            'supplier.contract.approve' => 'Duyệt hợp đồng NCC',

            // Nghiệm thu NCC
            'supplier.acceptance.view'   => 'Xem nghiệm thu nhà cung cấp',
            'supplier.acceptance.create' => 'Tạo biên bản nghiệm thu NCC',
            'supplier.acceptance.update' => 'Sửa nghiệm thu NCC',
            'supplier.acceptance.delete' => 'Xóa nghiệm thu NCC',

            // ===== YÊU CẦU THAY ĐỔI =====
            'change_request.view'    => 'Xem yêu cầu thay đổi',
            'change_request.create'  => 'Tạo yêu cầu thay đổi mới',
            'change_request.update'  => 'Sửa yêu cầu thay đổi',
            'change_request.delete'  => 'Xóa yêu cầu thay đổi',
            'change_request.approve' => 'Duyệt yêu cầu thay đổi',
            'change_request.reject'  => 'Từ chối yêu cầu thay đổi',

            // ===== SỰ CỐ =====
            'issue.view'    => 'Xem danh sách sự cố',
            'issue.create'  => 'Báo cáo sự cố mới',
            'issue.update'  => 'Cập nhật sự cố',
            'issue.delete'  => 'Xóa sự cố',
            'issue.resolve' => 'Đánh dấu đã giải quyết sự cố',

            // ===== GANTT & WBS =====
            'gantt.view'          => 'Xem biểu đồ Gantt tiến độ',
            'gantt.update'        => 'Chỉnh sửa biểu đồ Gantt',
            'wbs.template.view'   => 'Xem mẫu cấu trúc công việc (WBS)',
            'wbs.template.create' => 'Tạo mẫu cấu trúc công việc (WBS)',

            // ===== TỔNG HỢP TÀI CHÍNH =====
            'finance.view'   => 'Xem tổng hợp tài chính dự án',
            'finance.manage' => 'Quản lý dữ liệu tài chính',

            // ===== CHẤM CÔNG =====
            'attendance.view'     => 'Xem bảng chấm công',
            'attendance.check_in' => 'Điểm danh vào / ra',
            'attendance.manage'   => 'Quản lý dữ liệu chấm công',
            'attendance.approve'  => 'Duyệt bản ghi chấm công',

            // ===== NĂNG SUẤT LAO ĐỘNG =====
            'labor_productivity.view'   => 'Xem báo cáo năng suất lao động',
            'labor_productivity.create' => 'Nhập dữ liệu năng suất',
            'labor_productivity.update' => 'Sửa dữ liệu năng suất',
            'labor_productivity.delete' => 'Xóa dữ liệu năng suất',

            // ===== PHÂN TÍCH EVM & DỰ BÁO =====
            'evm.view'        => 'Xem phân tích giá trị thu được (EVM)',
            'predictive.view' => 'Xem dự báo chi phí & tiến độ',

            // ===== TÀI CHÍNH CÔNG TY =====
            'company_financial.view' => 'Xem báo cáo tài chính toàn công ty',

            // ===== VẬN HÀNH — CỔ ĐÔNG =====
            'shareholder.view'   => 'Xem danh sách cổ đông',
            'shareholder.create' => 'Thêm cổ đông mới',
            'shareholder.update' => 'Sửa thông tin cổ đông',
            'shareholder.delete' => 'Xóa cổ đông',

            // ===== VẬN HÀNH — TÀI SẢN CÔNG TY =====
            'company_asset.view'       => 'Xem danh sách tài sản công ty',
            'company_asset.create'     => 'Thêm tài sản công ty',
            'company_asset.update'     => 'Sửa thông tin tài sản',
            'company_asset.delete'     => 'Xóa tài sản công ty',
            'company_asset.assign'     => 'Phân bổ tài sản cho dự án / bộ phận',
            'company_asset.depreciate' => 'Chạy tính khấu hao tài sản',

            'operations.dashboard.view' => 'Xem tổng quan vận hành công ty',

            // ===== CÀI ĐẶT =====
            'settings.view'   => 'Xem cài đặt hệ thống',
            'settings.manage' => 'Thay đổi cài đặt hệ thống',
        ];
    }

    /**
     * Fallback: auto-generate description for permissions not in the map
     */
    private function generateFallbackDescription(string $permissionName): string
    {
        $parts = explode('.', $permissionName);
        $action = end($parts);
        $module = $parts[0];

        $actionNames = [
            'view' => 'Xem', 'create' => 'Tạo', 'update' => 'Sửa',
            'delete' => 'Xóa', 'manage' => 'Quản lý', 'submit' => 'Gửi duyệt',
            'approve' => 'Duyệt', 'reject' => 'Từ chối', 'confirm' => 'Xác nhận',
            'verify' => 'Xác minh', 'assign' => 'Phân bổ', 'remove' => 'Gỡ bỏ',
            'upload' => 'Tải lên', 'export' => 'Xuất', 'send' => 'Gửi',
        ];

        $actionName = $actionNames[$action] ?? ucfirst($action);
        $moduleName = ucfirst(str_replace('_', ' ', $module));

        return "{$actionName} {$moduleName}";
    }
}
