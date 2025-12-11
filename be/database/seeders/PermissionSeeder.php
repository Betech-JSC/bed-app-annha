<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Tạo các permissions cho tất cả các modules trong hệ thống
     */
    public function run(): void
    {
        $permissions = [
            // PROJECT MODULE
            ['name' => 'projects.view', 'description' => 'Xem danh sách dự án'],
            ['name' => 'projects.create', 'description' => 'Tạo dự án mới'],
            ['name' => 'projects.update', 'description' => 'Cập nhật dự án'],
            ['name' => 'projects.delete', 'description' => 'Xóa dự án'],
            ['name' => 'projects.manage', 'description' => 'Quản lý toàn bộ dự án'],

            // CONTRACT MODULE
            ['name' => 'contracts.view', 'description' => 'Xem hợp đồng'],
            ['name' => 'contracts.create', 'description' => 'Tạo hợp đồng'],
            ['name' => 'contracts.update', 'description' => 'Cập nhật hợp đồng'],
            ['name' => 'contracts.approve', 'description' => 'Duyệt hợp đồng'],

            // PAYMENT MODULE
            ['name' => 'payments.view', 'description' => 'Xem thanh toán'],
            ['name' => 'payments.create', 'description' => 'Tạo đợt thanh toán'],
            ['name' => 'payments.update', 'description' => 'Cập nhật thanh toán'],
            ['name' => 'payments.confirm', 'description' => 'Xác nhận thanh toán'],

            // COST MODULE
            ['name' => 'costs.view', 'description' => 'Xem chi phí'],
            ['name' => 'costs.create', 'description' => 'Tạo chi phí'],
            ['name' => 'costs.update', 'description' => 'Cập nhật chi phí'],
            ['name' => 'costs.delete', 'description' => 'Xóa chi phí'],
            ['name' => 'costs.approve_management', 'description' => 'Duyệt chi phí (Ban điều hành)'],
            ['name' => 'costs.approve_accountant', 'description' => 'Xác nhận chi phí (Kế toán)'],

            // ADDITIONAL COST MODULE
            ['name' => 'additional_costs.view', 'description' => 'Xem chi phí phát sinh'],
            ['name' => 'additional_costs.create', 'description' => 'Tạo chi phí phát sinh'],
            ['name' => 'additional_costs.approve', 'description' => 'Duyệt chi phí phát sinh'],

            // REVENUE MODULE
            ['name' => 'revenue.view', 'description' => 'Xem doanh thu'],
            ['name' => 'revenue.dashboard', 'description' => 'Xem dashboard doanh thu'],
            ['name' => 'revenue.export', 'description' => 'Xuất báo cáo doanh thu'],

            // PERSONNEL MODULE
            ['name' => 'personnel.view', 'description' => 'Xem nhân sự dự án'],
            ['name' => 'personnel.assign', 'description' => 'Gán nhân sự vào dự án'],
            ['name' => 'personnel.remove', 'description' => 'Gỡ nhân sự khỏi dự án'],

            // HR MODULE - TIME TRACKING
            ['name' => 'hr.time_tracking.view', 'description' => 'Xem chấm công'],
            ['name' => 'hr.time_tracking.create', 'description' => 'Tạo chấm công'],
            ['name' => 'hr.time_tracking.update', 'description' => 'Cập nhật chấm công'],
            ['name' => 'hr.time_tracking.approve', 'description' => 'Duyệt chấm công'],

            // HR MODULE - PAYROLL
            ['name' => 'hr.payroll.view', 'description' => 'Xem bảng lương'],
            ['name' => 'hr.payroll.calculate', 'description' => 'Tính lương'],
            ['name' => 'hr.payroll.approve', 'description' => 'Duyệt bảng lương'],
            ['name' => 'hr.payroll.pay', 'description' => 'Xác nhận thanh toán lương'],
            ['name' => 'hr.payroll.export', 'description' => 'Xuất bảng lương'],

            // HR MODULE - BONUSES
            ['name' => 'hr.bonuses.view', 'description' => 'Xem thưởng'],
            ['name' => 'hr.bonuses.create', 'description' => 'Tạo thưởng'],
            ['name' => 'hr.bonuses.update', 'description' => 'Cập nhật thưởng'],
            ['name' => 'hr.bonuses.approve', 'description' => 'Duyệt thưởng'],
            ['name' => 'hr.bonuses.pay', 'description' => 'Xác nhận thanh toán thưởng'],

            // HR MODULE - EMPLOYEES
            ['name' => 'hr.employees.view', 'description' => 'Xem nhân viên'],
            ['name' => 'hr.employees.create', 'description' => 'Tạo nhân viên'],
            ['name' => 'hr.employees.update', 'description' => 'Cập nhật nhân viên'],
            ['name' => 'hr.employees.delete', 'description' => 'Xóa nhân viên'],

            // HR MODULE - ROLES
            ['name' => 'hr.roles.view', 'description' => 'Xem vai trò'],
            ['name' => 'hr.roles.create', 'description' => 'Tạo vai trò'],
            ['name' => 'hr.roles.update', 'description' => 'Cập nhật vai trò'],
            ['name' => 'hr.roles.delete', 'description' => 'Xóa vai trò'],

            // DOCUMENTS MODULE
            ['name' => 'documents.view', 'description' => 'Xem tài liệu'],
            ['name' => 'documents.upload', 'description' => 'Upload tài liệu'],
            ['name' => 'documents.delete', 'description' => 'Xóa tài liệu'],

            // DEFECTS MODULE
            ['name' => 'defects.view', 'description' => 'Xem lỗi'],
            ['name' => 'defects.create', 'description' => 'Tạo lỗi'],
            ['name' => 'defects.update', 'description' => 'Cập nhật lỗi'],

            // ACCEPTANCE MODULE
            ['name' => 'acceptance.view', 'description' => 'Xem nghiệm thu'],
            ['name' => 'acceptance.approve', 'description' => 'Duyệt nghiệm thu'],

            // LOGS MODULE
            ['name' => 'logs.view', 'description' => 'Xem nhật ký'],
            ['name' => 'logs.create', 'description' => 'Tạo nhật ký'],
        ];

        $this->command->info('Đang tạo các permissions...');

        foreach ($permissions as $permissionData) {
            $permission = Permission::firstOrCreate(
                ['name' => $permissionData['name']],
                $permissionData
            );

            if ($permission->wasRecentlyCreated) {
                $this->command->info("✅ Đã tạo permission: {$permission->name}");
            }
        }

        // Gán permissions cho các roles mặc định
        $this->assignPermissionsToRoles();

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã tạo ' . count($permissions) . ' permissions!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
    }

    /**
     * Gán permissions cho các roles mặc định
     */
    private function assignPermissionsToRoles(): void
    {
        // Ban điều hành - Toàn quyền
        $managementRole = Role::where('name', 'Ban điều hành')->first();
        if ($managementRole) {
            $managementRole->permissions()->sync(Permission::all()->pluck('id'));
            $this->command->info("✅ Đã gán toàn quyền cho Ban điều hành");
        }

        // Kế toán - Quyền tài chính
        $accountantRole = Role::where('name', 'Kế toán')->first();
        if ($accountantRole) {
            $accountantPermissions = Permission::whereIn('name', [
                'projects.view',
                'contracts.view',
                'payments.view',
                'payments.confirm',
                'costs.view',
                'costs.approve_accountant',
                'additional_costs.view',
                'revenue.view',
                'revenue.dashboard',
                'revenue.export',
                'hr.payroll.view',
                'hr.payroll.calculate',
                'hr.payroll.approve',
                'hr.payroll.pay',
                'hr.payroll.export',
                'hr.bonuses.view',
                'hr.employees.view',
            ])->pluck('id');
            $accountantRole->permissions()->sync($accountantPermissions);
            $this->command->info("✅ Đã gán quyền cho Kế toán");
        }

        // Tổ trưởng - Quản lý nhóm
        $teamLeaderRole = Role::where('name', 'Tổ trưởng')->first();
        if ($teamLeaderRole) {
            $teamLeaderPermissions = Permission::whereIn('name', [
                'projects.view',
                'personnel.view',
                'personnel.assign',
                'hr.time_tracking.view',
                'hr.time_tracking.create',
                'hr.time_tracking.update',
                'logs.view',
                'logs.create',
                'defects.view',
                'defects.create',
                'defects.update',
            ])->pluck('id');
            $teamLeaderRole->permissions()->sync($teamLeaderPermissions);
            $this->command->info("✅ Đã gán quyền cho Tổ trưởng");
        }

        // Thợ - Chỉ xem và chấm công
        $workerRole = Role::where('name', 'Thợ')->first();
        if ($workerRole) {
            $workerPermissions = Permission::whereIn('name', [
                'projects.view',
                'hr.time_tracking.view',
                'hr.time_tracking.create',
                'logs.view',
                'logs.create',
            ])->pluck('id');
            $workerRole->permissions()->sync($workerPermissions);
            $this->command->info("✅ Đã gán quyền cho Thợ");
        }

        // Khách - Chỉ xem
        $guestRole = Role::where('name', 'Khách')->first();
        if ($guestRole) {
            $guestPermissions = Permission::whereIn('name', [
                'projects.view',
                'contracts.view',
                'payments.view',
                'revenue.view',
                'acceptance.view',
            ])->pluck('id');
            $guestRole->permissions()->sync($guestPermissions);
            $this->command->info("✅ Đã gán quyền cho Khách");
        }

        // Giám sát khách - Xem và duyệt một số công việc
        $supervisorGuestRole = Role::where('name', 'Giám sát khách')->first();
        if ($supervisorGuestRole) {
            $supervisorGuestPermissions = Permission::whereIn('name', [
                'projects.view',
                'contracts.view',
                'contracts.approve',
                'payments.view',
                'additional_costs.view',
                'additional_costs.approve',
                'revenue.view',
                'acceptance.view',
                'acceptance.approve',
                'defects.view',
                'defects.create',
            ])->pluck('id');
            $supervisorGuestRole->permissions()->sync($supervisorGuestPermissions);
            $this->command->info("✅ Đã gán quyền cho Giám sát khách");
        }

        // Bên Thiết Kế - Xem và chỉnh sửa thiết kế
        $designerRole = Role::where('name', 'Bên Thiết Kế')->first();
        if ($designerRole) {
            $designerPermissions = Permission::whereIn('name', [
                'projects.view',
                'documents.view',
                'documents.upload',
                'documents.delete',
                'defects.view',
                'defects.create',
                'defects.update',
            ])->pluck('id');
            $designerRole->permissions()->sync($designerPermissions);
            $this->command->info("✅ Đã gán quyền cho Bên Thiết Kế");
        }

        // Giám sát - Quản lý và giám sát
        $supervisorRole = Role::where('name', 'Giám sát')->first();
        if ($supervisorRole) {
            $supervisorPermissions = Permission::whereIn('name', [
                'projects.view',
                'projects.update',
                'personnel.view',
                'personnel.assign',
                'personnel.remove',
                'hr.time_tracking.view',
                'hr.time_tracking.approve',
                'costs.view',
                'costs.create',
                'costs.update',
                'costs.approve_management',
                'logs.view',
                'logs.create',
                'defects.view',
                'defects.create',
                'defects.update',
                'acceptance.view',
                'acceptance.approve',
            ])->pluck('id');
            $supervisorRole->permissions()->sync($supervisorPermissions);
            $this->command->info("✅ Đã gán quyền cho Giám sát");
        }

        // Quản lý dự án - Toàn quyền dự án
        $projectManagerRole = Role::where('name', 'Quản lý dự án')->first();
        if ($projectManagerRole) {
            $projectManagerPermissions = Permission::whereIn('name', [
                'projects.view',
                'projects.create',
                'projects.update',
                'projects.delete',
                'projects.manage',
                'contracts.view',
                'contracts.create',
                'contracts.update',
                'payments.view',
                'payments.create',
                'payments.update',
                'costs.view',
                'costs.create',
                'costs.update',
                'costs.delete',
                'additional_costs.view',
                'additional_costs.create',
                'revenue.view',
                'revenue.dashboard',
                'personnel.view',
                'personnel.assign',
                'personnel.remove',
                'documents.view',
                'documents.upload',
                'documents.delete',
                'logs.view',
                'logs.create',
                'defects.view',
                'defects.create',
                'defects.update',
                'acceptance.view',
            ])->pluck('id');
            $projectManagerRole->permissions()->sync($projectManagerPermissions);
            $this->command->info("✅ Đã gán quyền cho Quản lý dự án");
        }
    }
}
