<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Hash;

class FreshStartSeeder extends Seeder
{
    /**
     * Xóa TOÀN BỘ data, chỉ giữ lại:
     * - 1 Super Admin (CRM) trong bảng admins
     * - 1 Super Admin (APP) trong bảng users
     * - RBAC: roles, permissions, role-permission mappings
     * - Master data: settings, cost_groups, personnel_roles, departments
     *
     * ⚠️  CẢNH BÁO: Seeder này XÓA SẠCH dữ liệu! Chỉ dùng cho môi trường DEV/STAGING.
     *
     * Chạy: php artisan db:seed --class=FreshStartSeeder
     */
    public function run(): void
    {
        $this->command->warn('');
        $this->command->warn('╔══════════════════════════════════════════════════════╗');
        $this->command->warn('║  ⚠️  CẢNH BÁO: XÓA TOÀN BỘ DỮ LIỆU!               ║');
        $this->command->warn('║  Chỉ giữ lại 1 Super Admin + RBAC + Master Data     ║');
        $this->command->warn('╚══════════════════════════════════════════════════════╝');
        $this->command->warn('');

        // ── 1. Disable FK checks ──
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');

        // ── 2. Xóa toàn bộ business data ──
        $businessTables = [
            // Project core data
            'projects',
            'contracts',
            'project_payments',
            'additional_costs',
            'project_personnel',
            'construction_logs',
            'acceptance_stages',
            'acceptance_items',
            'acceptance_criteria',
            'acceptance_criteria_results',
            'defects',
            'project_progress',
            'project_phases',
            'project_tasks',
            'project_task_dependencies',
            'change_requests',
            'project_risks',
            'project_warranties',
            'project_maintenances',
            'invoices',
            'budgets',
            'budget_items',
            'project_documents',
            'schedule_adjustments',
            'warranty_retentions',

            // Subcontractors
            'subcontractors',
            'project_subcontractors',
            'subcontractor_items',
            'subcontractor_payments',
            'global_subcontractors',

            // Materials
            'material_transactions',
            'material_bills',
            'material_bill_items',
            'material_quotas',
            'material_quota_items',

            // Equipment
            'equipment_allocations',
            'equipment_rentals',
            'equipment_purchases',
            'equipment_purchase_items',
            'asset_usages',
            'equipment',

            // Finance / Costs
            'costs',
            'company_costs',
            'cash_flows',

            // Operations module
            'shareholders',
            'company_assets',
            'asset_depreciations',
            'asset_assignments',

            // HR data
            'employee_salary_configs',
            'payrolls',
            'payroll_items',
            'bonuses',
            'work_schedules',
            'team_check_ins',
            'team_check_in_members',
            'teams',
            'team_members',
            'team_contracts',
            'labor_standards',
            'work_volumes',
            'employee_profiles',
            'kpis',

            // Attendance system
            'attendances',
            'work_shifts',
            'shift_assignments',
            'labor_productivity',

            // Templates
            'wbs_templates',
            'wbs_template_items',

            // Attachments / Files / Comments
            'attachments',
            'comments',

            // Notifications / Logs
            'notifications',

            // Misc
            'reminders',
            'personal_access_tokens',
            'cost_groups',
            'departments',

            // Materials master (nếu muốn xóa luôn kho vật tư — uncomment nếu cần)
            // 'materials',
            // 'material_suppliers',

            // Suppliers master (nếu muốn xóa luôn danh mục NCC — uncomment nếu cần)
            // 'suppliers',
        ];

        $truncatedCount = 0;
        foreach ($businessTables as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->truncate();
                $truncatedCount++;
                $this->command->line("   🗑️  Truncated: {$table}");
            }
        }

        // ── 3. Xóa pivot tables (user/admin assignments) ──
        $pivotTables = [
            'role_user',
            'permission_user',
            'admin_role',
        ];

        foreach ($pivotTables as $table) {
            if (Schema::hasTable($table)) {
                DB::table($table)->truncate();
                $this->command->line("   🗑️  Truncated pivot: {$table}");
            }
        }

        // ── 4. Xóa toàn bộ users (APP) ──
        if (Schema::hasTable('users')) {
            // Bypass soft deletes
            DB::table('users')->delete();
            $this->command->line("   🗑️  Deleted all users");
        }

        // ── 5. Xóa toàn bộ admins (CRM) ──
        if (Schema::hasTable('admins')) {
            DB::table('admins')->truncate();
            $this->command->line("   🗑️  Truncated: admins");
        }

        // ── 6. Re-enable FK checks ──
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $this->command->newLine();
        $this->command->info("✅ Đã xóa {$truncatedCount} bảng dữ liệu.");
        $this->command->newLine();

        // ══════════════════════════════════════════════
        // TẠO LẠI SUPER ADMIN
        // ══════════════════════════════════════════════

        // ── 7. Tạo CRM Super Admin ──
        $admin = \App\Models\Admin::create([
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'email' => 'admin@betech.vn',
            'password' => Hash::make('Admin@2026'),
            'super_admin' => true,
        ]);

        // Gán role "Super Admin" nếu có
        $superAdminRole = \App\Models\Role::where('name', 'Super Admin')->first();
        if ($superAdminRole) {
            $admin->roles()->syncWithoutDetaching([$superAdminRole->id]);
        }

        // ── 8. Tạo APP Super Admin (User) ──
        $superAdminRoleApp = \App\Models\Role::where('name', \App\Constants\Roles::SUPER_ADMIN)->first();

        $user = \App\Models\User::create([
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'name' => 'Super Admin',
            'email' => 'admin@betech.vn',
            'phone' => '+84901234567',
            'password' => Hash::make('Admin@2026'),
            'role' => 'admin',
            'owner' => true,
            'email_verified_at' => now(),
        ]);

        if ($superAdminRoleApp) {
            DB::table('role_user')->insert([
                'user_id' => $user->id,
                'role_id' => $superAdminRoleApp->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // ══════════════════════════════════════════════
        // ĐẢM BẢO RBAC NGUYÊN VẸN
        // ══════════════════════════════════════════════

        // Chạy lại seeders RBAC để đảm bảo roles + permissions đầy đủ
        $this->call([
            RoleSeeder::class,
            PermissionSeeder::class,
            RolePermissionSeeder::class,
            SettingSeeder::class,
            PersonnelRoleSeeder::class,
        ]);

        // ══════════════════════════════════════════════
        // OUTPUT
        // ══════════════════════════════════════════════

        $this->command->newLine();
        $this->command->info('╔══════════════════════════════════════════════════════╗');
        $this->command->info('║  ✅ FRESH START HOÀN TẤT!                            ║');
        $this->command->info('╠══════════════════════════════════════════════════════╣');
        $this->command->info('║                                                      ║');
        $this->command->info('║  📧 CRM (Admin Panel):                               ║');
        $this->command->info('║     Email:    admin@betech.vn                        ║');
        $this->command->info('║     Password: Admin@2026                             ║');
        $this->command->info('║     Quyền:    Super Admin (toàn quyền)               ║');
        $this->command->info('║                                                      ║');
        $this->command->info('║  📱 APP (Mobile):                                     ║');
        $this->command->info('║     Email:    admin@betech.vn                        ║');
        $this->command->info('║     Password: Admin@2026                             ║');
        $this->command->info('║     Quyền:    Super Admin (toàn quyền)               ║');
        $this->command->info('║                                                      ║');
        $this->command->info('╚══════════════════════════════════════════════════════╝');
        $this->command->newLine();
    }
}
