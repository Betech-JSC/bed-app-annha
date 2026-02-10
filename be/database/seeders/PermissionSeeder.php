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
     * Uses firstOrCreate to ensure idempotency.
     */
    public function run(): void
    {
        $this->command->info('Creating permissions...');

        $permissions = Permissions::all();
        $grouped = Permissions::groupedByModule();

        $createdCount = 0;
        $updatedCount = 0;

        foreach ($permissions as $permissionName) {
            // Extract module and action for description
            $parts = explode('.', $permissionName);
            $module = $parts[0];
            $action = end($parts);

            // Generate human-readable description
            $description = $this->generateDescription($permissionName, $module, $action);

            $permission = Permission::firstOrCreate(
                ['name' => $permissionName],
                ['description' => $description]
            );

            if ($permission->wasRecentlyCreated) {
                $createdCount++;
                $this->command->info("✅ Created: {$permissionName}");
            } else {
                // Update description if it changed
                if ($permission->description !== $description) {
                    $permission->update(['description' => $description]);
                    $updatedCount++;
                    $this->command->info("🔄 Updated: {$permissionName}");
                }
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
     * Generate human-readable description for permission
     */
    private function generateDescription(string $permissionName, string $module, string $action): string
    {
        $moduleNames = [
            'project' => 'Dự án',
            'progress' => 'Tiến độ',
            'acceptance' => 'Nghiệm thu',
            'cost' => 'Chi phí (nội bộ)',
            'additional_cost' => 'Chi phí phát sinh',
            'material' => 'Vật liệu',
            'equipment' => 'Thiết bị',
            'hr' => 'Nhân sự',
            'report' => 'Báo cáo',
            'invoice' => 'Hóa đơn đầu ra',
            'input_invoice' => 'Hóa đơn đầu vào',
            'contract' => 'Hợp đồng',
            'payment' => 'Thanh toán (đợt)',
            'subcontractor' => 'Nhà thầu phụ',
            'subcontractor_payment' => 'Thanh toán thầu phụ',
            'document' => 'Tài liệu',
            'log' => 'Nhật ký công trình',
            'defect' => 'Lỗi phát sinh',
            'personnel' => 'Nhân sự dự án',
            'revenue' => 'Doanh thu',
            'receipt' => 'Phiếu thu/chi',
            'supplier' => 'Nhà cung cấp',
            'change_request' => 'Yêu cầu thay đổi',
            'project_risk' => 'Rủi ro dự án',
            'issue' => 'Sự cố/Vấn đề',
            'settings' => 'Cài đặt hệ thống',
        ];

        $actionNames = [
            'view' => 'Xem danh sách và chi tiết',
            'create' => 'Tạo mới',
            'update' => 'Cập nhật/Chỉnh sửa',
            'delete' => 'Xóa',
            'manage' => 'Quản lý toàn quyền',
            'submit' => 'Gửi yêu cầu',
            'approve' => 'Duyệt yêu cầu',
            'reject' => 'Từ chối yêu cầu',
            'confirm' => 'Xác nhận (Kế toán)',
            'verify' => 'Kiểm tra/Xác minh',
            'assign' => 'Bổ nhiệm/Gán',
            'remove' => 'Gỡ bỏ',
            'upload' => 'Tải lên',
            'attach_files' => 'Đính kèm tệp tin',
            'calculate' => 'Tính toán',
            'pay' => 'Thực hiện thanh toán',
            'export' => 'Xuất báo cáo (Excel/PDF)',
            'send' => 'Gửi thông báo/Email',
            'check_in' => 'Điểm danh vào',
            'check_out' => 'Điểm danh ra',
            'mark_paid' => 'Đánh dấu đã trả tiền',
            'mark_paid_by_customer' => 'Xác nhận đã thanh toán (Khách hàng)',
            'dashboard' => 'Xem biểu đồ/Thống kê',
            'financial' => 'Thông tin tài chính',
            'progress' => 'Thông tin tiến độ',
        ];

        // Specific overrides for certain permissions to make them very clear
        $overrides = [
            'additional_cost.confirm' => 'Kế toán xác nhận đã nhận tiền phát sinh',
            'additional_cost.approve' => 'Quản lý duyệt hạng mục chi phí phát sinh',
            'additional_cost.mark_paid_by_customer' => 'Khách hàng xác nhận đã chuyển khoản chi phí phát sinh',
            'payment.confirm' => 'Kế toán xác nhận đã nhận tiền đợt thanh toán',
            'payment.mark_paid_by_customer' => 'Khách hàng xác nhận đã chuyển tiền đợt thanh toán',
            'acceptance.approve.level_1' => 'Duyệt nghiệm thu Cấp 1 (Giám sát)',
            'acceptance.approve.level_2' => 'Duyệt nghiệm thu Cấp 2 (Quản lý dự án)',
            'acceptance.approve.level_3' => 'Duyệt nghiệm thu Cấp 3 (Khách hàng)',
            'contract.approve.level_1' => 'Duyệt hợp đồng (Kỹ thuật/Thầu phụ)',
            'contract.approve.level_2' => 'Phê duyệt hợp đồng chính thức (Quản lý/CĐT)',
        ];

        if (isset($overrides[$permissionName])) {
            return $overrides[$permissionName];
        }

        $moduleName = $moduleNames[$module] ?? ucfirst($module);

        // Handle approval levels
        if (str_contains($permissionName, '.approve.level_')) {
            $level = substr($action, -1);
            return "Duyệt {$moduleName} (Cấp {$level})";
        }

        // Handle submodules (e.g., hr.time_tracking)
        if (str_contains($permissionName, '.')) {
            $parts = explode('.', $permissionName);
            if (count($parts) >= 3 && $module === 'hr') {
                $submodule = $parts[1];
                $submoduleNames = [
                    'time_tracking' => 'Chấm công',
                    'payroll' => 'Bảng lương',
                    'bonus' => 'Thưởng',
                    'employee' => 'Nhân viên',
                ];
                $submoduleName = $submoduleNames[$submodule] ?? ucfirst($submodule);
                $actionName = $actionNames[$action] ?? ucfirst($action);
                return "{$actionName} {$submoduleName}";
            }
        }

        $actionName = $actionNames[$action] ?? ucfirst($action);
        return "{$actionName} {$moduleName}";
    }
}
