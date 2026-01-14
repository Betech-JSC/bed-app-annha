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
            'cost' => 'Chi phí',
            'additional_cost' => 'Chi phí phát sinh',
            'material' => 'Vật liệu',
            'equipment' => 'Thiết bị',
            'hr' => 'Nhân sự',
            'report' => 'Báo cáo',
            'invoice' => 'Hóa đơn',
            'input_invoice' => 'Hóa đơn đầu vào',
            'contract' => 'Hợp đồng',
            'payment' => 'Thanh toán',
            'subcontractor' => 'Nhà thầu phụ',
            'subcontractor_payment' => 'Thanh toán nhà thầu phụ',
            'document' => 'Tài liệu',
            'log' => 'Nhật ký công trình',
            'defect' => 'Lỗi',
            'personnel' => 'Nhân sự dự án',
            'revenue' => 'Doanh thu',
        ];

        $actionNames = [
            'view' => 'Xem',
            'create' => 'Tạo',
            'update' => 'Cập nhật',
            'delete' => 'Xóa',
            'manage' => 'Quản lý',
            'submit' => 'Gửi',
            'approve' => 'Duyệt',
            'reject' => 'Từ chối',
            'confirm' => 'Xác nhận',
            'verify' => 'Xác minh',
            'assign' => 'Gán',
            'remove' => 'Gỡ',
            'upload' => 'Tải lên',
            'attach_files' => 'Đính kèm file',
            'calculate' => 'Tính toán',
            'pay' => 'Thanh toán',
            'export' => 'Xuất',
            'send' => 'Gửi',
            'check_in' => 'Chấm công vào',
            'check_out' => 'Chấm công ra',
            'mark_paid' => 'Đánh dấu đã thanh toán',
            'dashboard' => 'Dashboard',
            'financial' => 'Tài chính',
            'progress' => 'Tiến độ',
        ];

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
