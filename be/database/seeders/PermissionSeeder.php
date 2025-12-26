<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
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
            // ===================================================================
            // PROJECT MODULE
            // ===================================================================
            ['name' => 'projects.view', 'description' => 'Xem danh sách dự án'],
            ['name' => 'projects.create', 'description' => 'Tạo dự án mới'],
            ['name' => 'projects.update', 'description' => 'Cập nhật dự án'],
            ['name' => 'projects.delete', 'description' => 'Xóa dự án'],
            ['name' => 'projects.manage', 'description' => 'Quản lý toàn bộ dự án'],

            // ===================================================================
            // CONTRACT MODULE
            // ===================================================================
            ['name' => 'contracts.view', 'description' => 'Xem hợp đồng'],
            ['name' => 'contracts.create', 'description' => 'Tạo hợp đồng'],
            ['name' => 'contracts.update', 'description' => 'Cập nhật hợp đồng'],
            ['name' => 'contracts.approve', 'description' => 'Duyệt hợp đồng'],

            // ===================================================================
            // PAYMENT MODULE
            // ===================================================================
            ['name' => 'payments.view', 'description' => 'Xem thanh toán'],
            ['name' => 'payments.create', 'description' => 'Tạo đợt thanh toán'],
            ['name' => 'payments.update', 'description' => 'Cập nhật thanh toán'],
            ['name' => 'payments.confirm', 'description' => 'Xác nhận thanh toán'],

            // ===================================================================
            // COST MODULE
            // ===================================================================
            ['name' => 'costs.view', 'description' => 'Xem chi phí'],
            ['name' => 'costs.create', 'description' => 'Tạo chi phí'],
            ['name' => 'costs.update', 'description' => 'Cập nhật chi phí'],
            ['name' => 'costs.delete', 'description' => 'Xóa chi phí'],
            ['name' => 'costs.submit', 'description' => 'Gửi chi phí để duyệt'],
            ['name' => 'costs.approve_management', 'description' => 'Duyệt chi phí (Ban điều hành)'],
            ['name' => 'costs.approve_accountant', 'description' => 'Xác nhận chi phí (Kế toán)'],
            ['name' => 'costs.reject', 'description' => 'Từ chối chi phí'],

            // ===================================================================
            // ADDITIONAL COST MODULE
            // ===================================================================
            ['name' => 'additional_costs.view', 'description' => 'Xem chi phí phát sinh'],
            ['name' => 'additional_costs.create', 'description' => 'Tạo chi phí phát sinh'],
            ['name' => 'additional_costs.update', 'description' => 'Cập nhật chi phí phát sinh'],
            ['name' => 'additional_costs.approve', 'description' => 'Duyệt chi phí phát sinh'],
            ['name' => 'additional_costs.reject', 'description' => 'Từ chối chi phí phát sinh'],

            // ===================================================================
            // REVENUE MODULE
            // ===================================================================
            ['name' => 'revenue.view', 'description' => 'Xem doanh thu'],
            ['name' => 'revenue.dashboard', 'description' => 'Xem dashboard doanh thu'],
            ['name' => 'revenue.export', 'description' => 'Xuất báo cáo doanh thu'],

            // ===================================================================
            // PERSONNEL MODULE
            // ===================================================================
            ['name' => 'personnel.view', 'description' => 'Xem nhân sự dự án'],
            ['name' => 'personnel.assign', 'description' => 'Gán nhân sự vào dự án'],
            ['name' => 'personnel.remove', 'description' => 'Gỡ nhân sự khỏi dự án'],

            // ===================================================================
            // SUBCONTRACTOR MODULE
            // ===================================================================
            ['name' => 'subcontractors.view', 'description' => 'Xem nhà thầu phụ'],
            ['name' => 'subcontractors.create', 'description' => 'Tạo nhà thầu phụ'],
            ['name' => 'subcontractors.update', 'description' => 'Cập nhật nhà thầu phụ'],
            ['name' => 'subcontractors.delete', 'description' => 'Xóa nhà thầu phụ'],

            // ===================================================================
            // DOCUMENTS MODULE
            // ===================================================================
            ['name' => 'documents.view', 'description' => 'Xem tài liệu'],
            ['name' => 'documents.upload', 'description' => 'Upload tài liệu'],
            ['name' => 'documents.delete', 'description' => 'Xóa tài liệu'],

            // ===================================================================
            // CONSTRUCTION LOGS MODULE
            // ===================================================================
            ['name' => 'logs.view', 'description' => 'Xem nhật ký công trình'],
            ['name' => 'logs.create', 'description' => 'Tạo nhật ký công trình'],
            ['name' => 'logs.update', 'description' => 'Cập nhật nhật ký công trình'],
            ['name' => 'logs.delete', 'description' => 'Xóa nhật ký công trình'],

            // ===================================================================
            // ACCEPTANCE MODULE
            // ===================================================================
            ['name' => 'acceptance.view', 'description' => 'Xem nghiệm thu'],
            ['name' => 'acceptance.create', 'description' => 'Tạo giai đoạn nghiệm thu'],
            ['name' => 'acceptance.update', 'description' => 'Cập nhật nghiệm thu'],
            ['name' => 'acceptance.approve', 'description' => 'Duyệt nghiệm thu'],
            ['name' => 'acceptance.attach_files', 'description' => 'Đính kèm file nghiệm thu'],

            // ===================================================================
            // DEFECTS MODULE
            // ===================================================================
            ['name' => 'defects.view', 'description' => 'Xem lỗi'],
            ['name' => 'defects.create', 'description' => 'Tạo lỗi'],
            ['name' => 'defects.update', 'description' => 'Cập nhật lỗi'],
            ['name' => 'defects.delete', 'description' => 'Xóa lỗi'],
            ['name' => 'defects.verify', 'description' => 'Xác nhận đã sửa lỗi'],

            // ===================================================================
            // PROGRESS MODULE
            // ===================================================================
            ['name' => 'progress.view', 'description' => 'Xem tiến độ'],
            ['name' => 'progress.update', 'description' => 'Cập nhật tiến độ'],

            // ===================================================================
            // HR MODULE - TIME TRACKING
            // ===================================================================
            ['name' => 'hr.time_tracking.view', 'description' => 'Xem chấm công'],
            ['name' => 'hr.time_tracking.create', 'description' => 'Tạo chấm công'],
            ['name' => 'hr.time_tracking.update', 'description' => 'Cập nhật chấm công'],
            ['name' => 'hr.time_tracking.delete', 'description' => 'Xóa chấm công'],
            ['name' => 'hr.time_tracking.approve', 'description' => 'Duyệt chấm công'],
            ['name' => 'hr.time_tracking.reject', 'description' => 'Từ chối chấm công'],
            ['name' => 'hr.time_tracking.check_in', 'description' => 'Chấm công vào'],
            ['name' => 'hr.time_tracking.check_out', 'description' => 'Chấm công ra'],

            // ===================================================================
            // HR MODULE - PAYROLL
            // ===================================================================
            ['name' => 'hr.payroll.view', 'description' => 'Xem bảng lương'],
            ['name' => 'hr.payroll.calculate', 'description' => 'Tính lương'],
            ['name' => 'hr.payroll.approve', 'description' => 'Duyệt bảng lương'],
            ['name' => 'hr.payroll.pay', 'description' => 'Xác nhận thanh toán lương'],
            ['name' => 'hr.payroll.export', 'description' => 'Xuất bảng lương'],

            // ===================================================================
            // HR MODULE - BONUSES
            // ===================================================================
            ['name' => 'hr.bonuses.view', 'description' => 'Xem thưởng'],
            ['name' => 'hr.bonuses.create', 'description' => 'Tạo thưởng'],
            ['name' => 'hr.bonuses.update', 'description' => 'Cập nhật thưởng'],
            ['name' => 'hr.bonuses.delete', 'description' => 'Xóa thưởng'],
            ['name' => 'hr.bonuses.approve', 'description' => 'Duyệt thưởng'],
            ['name' => 'hr.bonuses.pay', 'description' => 'Xác nhận thanh toán thưởng'],

            // ===================================================================
            // HR MODULE - EMPLOYEES
            // ===================================================================
            ['name' => 'hr.employees.view', 'description' => 'Xem nhân viên'],
            ['name' => 'hr.employees.create', 'description' => 'Tạo nhân viên'],
            ['name' => 'hr.employees.update', 'description' => 'Cập nhật nhân viên'],
            ['name' => 'hr.employees.delete', 'description' => 'Xóa nhân viên'],

            // ===================================================================
            // HR MODULE - EMPLOYEE PROFILES
            // ===================================================================
            ['name' => 'hr.employee_profiles.view', 'description' => 'Xem hồ sơ nhân sự'],
            ['name' => 'hr.employee_profiles.create', 'description' => 'Tạo hồ sơ nhân sự'],
            ['name' => 'hr.employee_profiles.update', 'description' => 'Cập nhật hồ sơ nhân sự'],
            ['name' => 'hr.employee_profiles.delete', 'description' => 'Xóa hồ sơ nhân sự'],

            // ===================================================================
            // HR MODULE - SALARY CONFIG
            // ===================================================================
            ['name' => 'hr.salary_config.view', 'description' => 'Xem cấu hình lương'],
            ['name' => 'hr.salary_config.create', 'description' => 'Tạo cấu hình lương'],
            ['name' => 'hr.salary_config.update', 'description' => 'Cập nhật cấu hình lương'],
            ['name' => 'hr.salary_config.delete', 'description' => 'Xóa cấu hình lương'],

            // ===================================================================
            // HR MODULE - WORK SCHEDULE
            // ===================================================================
            ['name' => 'hr.work_schedule.view', 'description' => 'Xem lịch làm việc'],
            ['name' => 'hr.work_schedule.create', 'description' => 'Tạo lịch làm việc'],
            ['name' => 'hr.work_schedule.update', 'description' => 'Cập nhật lịch làm việc'],
            ['name' => 'hr.work_schedule.delete', 'description' => 'Xóa lịch làm việc'],
            ['name' => 'hr.work_schedule.bulk_create', 'description' => 'Tạo lịch làm việc hàng loạt'],

            // ===================================================================
            // HR MODULE - TEAM CHECK-INS
            // ===================================================================
            ['name' => 'hr.team_check_ins.view', 'description' => 'Xem chấm công tập thể'],
            ['name' => 'hr.team_check_ins.create', 'description' => 'Tạo chấm công tập thể'],
            ['name' => 'hr.team_check_ins.update', 'description' => 'Cập nhật chấm công tập thể'],
            ['name' => 'hr.team_check_ins.delete', 'description' => 'Xóa chấm công tập thể'],
            ['name' => 'hr.team_check_ins.approve', 'description' => 'Duyệt chấm công tập thể'],

            // ===================================================================
            // HR MODULE - OVERTIME RULES
            // ===================================================================
            ['name' => 'hr.overtime_rules.view', 'description' => 'Xem quy định tăng ca'],
            ['name' => 'hr.overtime_rules.create', 'description' => 'Tạo quy định tăng ca'],
            ['name' => 'hr.overtime_rules.update', 'description' => 'Cập nhật quy định tăng ca'],
            ['name' => 'hr.overtime_rules.delete', 'description' => 'Xóa quy định tăng ca'],

            // ===================================================================
            // HR MODULE - OVERTIME CATEGORIES
            // ===================================================================
            ['name' => 'hr.overtime_categories.view', 'description' => 'Xem hạng mục tăng ca'],
            ['name' => 'hr.overtime_categories.create', 'description' => 'Tạo hạng mục tăng ca'],
            ['name' => 'hr.overtime_categories.update', 'description' => 'Cập nhật hạng mục tăng ca'],
            ['name' => 'hr.overtime_categories.delete', 'description' => 'Xóa hạng mục tăng ca'],

            // ===================================================================
            // HR MODULE - ROLES
            // ===================================================================
            ['name' => 'hr.roles.view', 'description' => 'Xem vai trò'],
            ['name' => 'hr.roles.create', 'description' => 'Tạo vai trò'],
            ['name' => 'hr.roles.update', 'description' => 'Cập nhật vai trò'],
            ['name' => 'hr.roles.delete', 'description' => 'Xóa vai trò'],

            // ===================================================================
            // HR MODULE - PERMISSIONS
            // ===================================================================
            ['name' => 'hr.permissions.view', 'description' => 'Xem quyền'],
            ['name' => 'hr.permissions.manage', 'description' => 'Quản lý quyền'],

            // ===================================================================
            // TEAMS MODULE
            // ===================================================================
            ['name' => 'teams.view', 'description' => 'Xem đội/tổ'],
            ['name' => 'teams.create', 'description' => 'Tạo đội/tổ'],
            ['name' => 'teams.update', 'description' => 'Cập nhật đội/tổ'],
            ['name' => 'teams.delete', 'description' => 'Xóa đội/tổ'],
            ['name' => 'teams.manage_members', 'description' => 'Quản lý thành viên đội'],

            // ===================================================================
            // TEAM CONTRACTS MODULE
            // ===================================================================
            ['name' => 'team_contracts.view', 'description' => 'Xem hợp đồng khoán'],
            ['name' => 'team_contracts.create', 'description' => 'Tạo hợp đồng khoán'],
            ['name' => 'team_contracts.update', 'description' => 'Cập nhật hợp đồng khoán'],
            ['name' => 'team_contracts.delete', 'description' => 'Xóa hợp đồng khoán'],
            ['name' => 'team_contracts.approve', 'description' => 'Duyệt hợp đồng khoán'],

            // ===================================================================
            // LABOR STANDARDS MODULE
            // ===================================================================
            ['name' => 'labor_standards.view', 'description' => 'Xem định mức nhân công'],
            ['name' => 'labor_standards.create', 'description' => 'Tạo định mức nhân công'],
            ['name' => 'labor_standards.update', 'description' => 'Cập nhật định mức nhân công'],
            ['name' => 'labor_standards.delete', 'description' => 'Xóa định mức nhân công'],

            // ===================================================================
            // WORK VOLUMES MODULE
            // ===================================================================
            ['name' => 'work_volumes.view', 'description' => 'Xem khối lượng hoàn thành'],
            ['name' => 'work_volumes.create', 'description' => 'Tạo khối lượng hoàn thành'],
            ['name' => 'work_volumes.update', 'description' => 'Cập nhật khối lượng hoàn thành'],
            ['name' => 'work_volumes.delete', 'description' => 'Xóa khối lượng hoàn thành'],
            ['name' => 'work_volumes.verify', 'description' => 'Xác nhận nghiệm thu khối lượng'],

            // ===================================================================
            // SUBCONTRACTOR PAYMENTS MODULE
            // ===================================================================
            ['name' => 'subcontractor_payments.view', 'description' => 'Xem thanh toán thầu phụ'],
            ['name' => 'subcontractor_payments.create', 'description' => 'Tạo thanh toán thầu phụ'],
            ['name' => 'subcontractor_payments.update', 'description' => 'Cập nhật thanh toán thầu phụ'],
            ['name' => 'subcontractor_payments.delete', 'description' => 'Xóa thanh toán thầu phụ'],
            ['name' => 'subcontractor_payments.approve', 'description' => 'Duyệt thanh toán thầu phụ'],
            ['name' => 'subcontractor_payments.mark_paid', 'description' => 'Xác nhận đã thanh toán'],
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
        // Tạo hoặc lấy Admin role
        $adminRole = Role::firstOrCreate(
            ['name' => 'Admin'],
            ['description' => 'Quản trị viên hệ thống, có toàn quyền']
        );

        // Gán TẤT CẢ permissions cho Admin role
        $allPermissions = Permission::all()->pluck('id');
        $adminRole->permissions()->sync($allPermissions);
        $this->command->info("✅ Đã gán toàn quyền cho Admin role (" . $allPermissions->count() . " permissions)");

        // Gán Admin role cho tất cả users có role = 'admin' và owner = true
        $adminUsers = User::where('role', 'admin')
            ->where('owner', true)
            ->get();
        
        foreach ($adminUsers as $user) {
            $user->roles()->syncWithoutDetaching([$adminRole->id]);
            $this->command->info("✅ Đã gán Admin role cho user: {$user->name} ({$user->email})");
        }

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
                'additional_costs.approve',
                'revenue.view',
                'revenue.dashboard',
                'revenue.export',
                'hr.payroll.view',
                'hr.payroll.calculate',
                'hr.payroll.approve',
                'hr.payroll.pay',
                'hr.payroll.export',
                'hr.bonuses.view',
                'hr.bonuses.approve',
                'hr.bonuses.pay',
                'hr.employees.view',
                'subcontractor_payments.view',
                'subcontractor_payments.approve',
                'subcontractor_payments.mark_paid',
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
                'hr.team_check_ins.view',
                'hr.team_check_ins.create',
                'hr.team_check_ins.update',
                'logs.view',
                'logs.create',
                'defects.view',
                'defects.create',
                'defects.update',
                'work_volumes.view',
                'work_volumes.create',
                'work_volumes.update',
                'teams.view',
                'teams.manage_members',
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
                'work_volumes.view',
                'work_volumes.verify',
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
                'work_volumes.view',
                'work_volumes.verify',
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
                'subcontractors.view',
                'subcontractors.create',
                'subcontractors.update',
                'documents.view',
                'documents.upload',
                'documents.delete',
                'logs.view',
                'logs.create',
                'defects.view',
                'defects.create',
                'defects.update',
                'acceptance.view',
                'acceptance.create',
                'acceptance.update',
                'acceptance.attach_files',
                'progress.view',
                'progress.update',
                'teams.view',
                'teams.create',
                'teams.update',
                'team_contracts.view',
                'team_contracts.create',
                'team_contracts.update',
                'labor_standards.view',
                'labor_standards.create',
                'labor_standards.update',
                'work_volumes.view',
                'work_volumes.create',
                'work_volumes.update',
                'subcontractor_payments.view',
                'subcontractor_payments.create',
                'subcontractor_payments.update',
            ])->pluck('id');
            $projectManagerRole->permissions()->sync($projectManagerPermissions);
            $this->command->info("✅ Đã gán quyền cho Quản lý dự án");
        }
    }
}
