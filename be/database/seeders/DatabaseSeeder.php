<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('🚀 Bắt đầu seeding SYSTEM & RBAC...');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();

        $this->call([
            // 1. Core RBAC (Bắt buộc)
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,

            // 2. Accounts
            SuperAdminSeeder::class,          // Tạo superadmin gốc
            AssignSuperAdminRoleSeeder::class, // Gán role superadmin
            RBACTestUsersSeeder::class,       // Tạo 5 account test bạn yêu cầu

            // 3. Master Data (Cần thiết để test chức năng tạo mới)
            SettingSeeder::class,             // Cấu hình hệ thống
            CostGroupSeeder::class,           // Nhóm chi phí (để test tạo Cost)
            PersonnelRoleSeeder::class,       // Vai trò nhân sự (để test gán nhân sự)
            DepartmentSeeder::class,          // Phòng ban (để test HR/Users)
        ]);

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Hoàn thành! Môi trường test sẵn sàng.');
        $this->command->info('═══════════════════════════════════════════════════');
    }
}
