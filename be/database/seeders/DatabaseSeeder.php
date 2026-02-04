<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('🚀 Bắt đầu seeding dữ liệu mẫu cho hệ thống...');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();

        // Chạy các seeders theo thứ tự
        $this->call([
            // ============================================================
            // 1. RBAC System - Must run in this order
            // ============================================================
            RoleSeeder::class, // Create core roles first
            PermissionSeeder::class, // Create all permissions
            RolePermissionSeeder::class, // Map permissions to roles

            // ============================================================
            // 2. Users & Admin Accounts
            // ============================================================
            SuperAdminSeeder::class, // Create super admin (superadmin@skysend.com)
            AdminSeeder::class, // Create admin accounts (if needed)
            AssignSuperAdminRoleSeeder::class, // Assign super_admin role to existing super admin users
            RBACTestUsersSeeder::class, // Create RBAC test users with all roles

            // ============================================================
            // 3. Settings & Master Data
            // ============================================================
            PersonnelRoleSeeder::class, // Create personnel roles for projects
            CostGroupSeeder::class, // Create cost groups for budgets and costs
            SettingSeeder::class, // System settings

            // ============================================================
            // 4. Projects & Project Management
            // ============================================================
            ProjectSeeder::class, // Create projects (10-11 projects)
            ProjectPersonnelSeeder::class, // Assign personnel to projects
            ProjectPhaseTaskSeeder::class, // Create phases and tasks for projects
            AcceptanceWorkflowSeeder::class, // Create acceptance stages and items

            // ============================================================
            // 5. Project Financial Data
            // ============================================================
            BudgetSeeder::class, // Create budgets for projects
            SampleDataSeeder::class, // Create contracts, payments, costs, defects, logs, change requests

            // ============================================================
            // 6. HR Module (Optional - if needed for testing)
            // ============================================================
            // DepartmentSeeder::class,
            // PersonnelRoleSeeder::class,
            // WorkScheduleSeeder::class,
            // PayrollSeeder::class,
            // LeaveSeeder::class,
            // PerformanceSeeder::class,

            // ============================================================
            // 7. Other Modules (Optional)
            // ============================================================
            // MaterialSeeder::class,
            // EquipmentSeeder::class,
            // InvoiceSeeder::class,
            // ReceiptSeeder::class,

            // ============================================================
            // 8. Reminders & Notifications
            // ============================================================
            ReminderSeeder::class, // Create reminders
        ]);

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Hoàn thành seeding dữ liệu mẫu!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
        $this->command->info('📋 Tài khoản test chính:');
        $this->command->info('   Super Admin: superadmin@skysend.com / superadmin123');
        $this->command->info('   Super Admin Test: superadmin.test@test.com / superadmin123');
        $this->command->info('   Admin: admin1@test.com / admin123');
        $this->command->info('   Project Owner: projectowner1@test.com / owner123');
        $this->command->info('   Project Manager: pm1@test.com / pm123');
        $this->command->info('   Site Supervisor: supervisor1@test.com / supervisor123');
        $this->command->info('   Accountant: accountant1@test.com / accountant123');
        $this->command->info('   Client: client1@test.com / client123');
        $this->command->info('   (Xem thêm trong RBACTestUsersSeeder output)');
        $this->command->newLine();
    }
}
