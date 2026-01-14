<?php

namespace Database\Seeders;

use App\Constants\Permissions;
use App\Constants\Roles;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Maps permissions to roles explicitly.
     * No implicit inheritance - each role gets exactly what's defined here.
     */
    public function run(): void
    {
        $this->command->info('Mapping permissions to roles...');

        // Super Admin: All permissions
        $this->assignAllPermissions(Roles::SUPER_ADMIN, 'Super Admin');

        // Admin: Most permissions except super admin functions
        $this->assignAdminPermissions();

        // Project Owner: Full project control
        $this->assignProjectOwnerPermissions();

        // Project Manager: Project management and coordination
        $this->assignProjectManagerPermissions();

        // Site Supervisor: Site operations and supervision
        $this->assignSiteSupervisorPermissions();

        // Accountant: Financial operations
        $this->assignAccountantPermissions();

        // Client: View and approval permissions
        $this->assignClientPermissions();

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Role-permission mappings completed!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
    }

    /**
     * Assign all permissions to a role
     */
    private function assignAllPermissions(string $roleName, string $displayName): void
    {
        $role = Role::where('name', $roleName)->first();
        if (!$role) {
            $this->command->warn("⚠️  Role '{$roleName}' not found. Run RoleSeeder first.");
            return;
        }

        $allPermissions = Permission::all()->pluck('id');
        $role->permissions()->sync($allPermissions);

        $this->command->info("✅ {$displayName}: All permissions ({$allPermissions->count()})");
    }

    /**
     * Assign permissions to Admin role
     */
    private function assignAdminPermissions(): void
    {
        $role = Role::where('name', Roles::ADMIN)->first();
        if (!$role) {
            $this->command->warn("⚠️  Role '" . Roles::ADMIN . "' not found.");
            return;
        }

        $permissions = [
            // Project - Full access
            Permissions::PROJECT_VIEW,
            Permissions::PROJECT_CREATE,
            Permissions::PROJECT_UPDATE,
            Permissions::PROJECT_DELETE,
            Permissions::PROJECT_MANAGE,

            // Progress
            Permissions::PROGRESS_VIEW,
            Permissions::PROGRESS_UPDATE,

            // Acceptance - All levels
            Permissions::ACCEPTANCE_VIEW,
            Permissions::ACCEPTANCE_CREATE,
            Permissions::ACCEPTANCE_UPDATE,
            Permissions::ACCEPTANCE_DELETE,
            Permissions::ACCEPTANCE_ATTACH_FILES,
            Permissions::ACCEPTANCE_APPROVE_LEVEL_1,
            Permissions::ACCEPTANCE_APPROVE_LEVEL_2,
            Permissions::ACCEPTANCE_APPROVE_LEVEL_3,

            // Cost - Full access
            Permissions::COST_VIEW,
            Permissions::COST_CREATE,
            Permissions::COST_UPDATE,
            Permissions::COST_DELETE,
            Permissions::COST_SUBMIT,
            Permissions::COST_APPROVE_MANAGEMENT,
            Permissions::COST_APPROVE_ACCOUNTANT,
            Permissions::COST_REJECT,

            // Additional Cost
            Permissions::ADDITIONAL_COST_VIEW,
            Permissions::ADDITIONAL_COST_CREATE,
            Permissions::ADDITIONAL_COST_UPDATE,
            Permissions::ADDITIONAL_COST_DELETE,
            Permissions::ADDITIONAL_COST_APPROVE,
            Permissions::ADDITIONAL_COST_REJECT,

            // Material
            Permissions::MATERIAL_VIEW,
            Permissions::MATERIAL_CREATE,
            Permissions::MATERIAL_UPDATE,
            Permissions::MATERIAL_DELETE,
            Permissions::MATERIAL_APPROVE,

            // Equipment
            Permissions::EQUIPMENT_VIEW,
            Permissions::EQUIPMENT_CREATE,
            Permissions::EQUIPMENT_UPDATE,
            Permissions::EQUIPMENT_DELETE,
            Permissions::EQUIPMENT_APPROVE,

            // HR - Full access
            Permissions::HR_TIME_TRACKING_VIEW,
            Permissions::HR_TIME_TRACKING_CREATE,
            Permissions::HR_TIME_TRACKING_UPDATE,
            Permissions::HR_TIME_TRACKING_DELETE,
            Permissions::HR_TIME_TRACKING_APPROVE,
            Permissions::HR_TIME_TRACKING_REJECT,
            Permissions::HR_TIME_TRACKING_CHECK_IN,
            Permissions::HR_TIME_TRACKING_CHECK_OUT,
            Permissions::HR_PAYROLL_VIEW,
            Permissions::HR_PAYROLL_CALCULATE,
            Permissions::HR_PAYROLL_APPROVE,
            Permissions::HR_PAYROLL_PAY,
            Permissions::HR_PAYROLL_EXPORT,
            Permissions::HR_BONUS_VIEW,
            Permissions::HR_BONUS_CREATE,
            Permissions::HR_BONUS_UPDATE,
            Permissions::HR_BONUS_DELETE,
            Permissions::HR_BONUS_APPROVE,
            Permissions::HR_BONUS_PAY,
            Permissions::HR_EMPLOYEE_VIEW,
            Permissions::HR_EMPLOYEE_CREATE,
            Permissions::HR_EMPLOYEE_UPDATE,
            Permissions::HR_EMPLOYEE_DELETE,

            // Report - Full access
            Permissions::REPORT_VIEW,
            Permissions::REPORT_EXPORT,
            Permissions::REPORT_FINANCIAL,
            Permissions::REPORT_PROGRESS,
            Permissions::REPORT_HR,

            // Invoice
            Permissions::INVOICE_VIEW,
            Permissions::INVOICE_CREATE,
            Permissions::INVOICE_UPDATE,
            Permissions::INVOICE_DELETE,
            Permissions::INVOICE_APPROVE,
            Permissions::INVOICE_SEND,

            // Contract
            Permissions::CONTRACT_VIEW,
            Permissions::CONTRACT_CREATE,
            Permissions::CONTRACT_UPDATE,
            Permissions::CONTRACT_DELETE,
            Permissions::CONTRACT_APPROVE_LEVEL_1,
            Permissions::CONTRACT_APPROVE_LEVEL_2,

            // Payment
            Permissions::PAYMENT_VIEW,
            Permissions::PAYMENT_CREATE,
            Permissions::PAYMENT_UPDATE,
            Permissions::PAYMENT_DELETE,
            Permissions::PAYMENT_CONFIRM,

            // Subcontractor
            Permissions::SUBCONTRACTOR_VIEW,
            Permissions::SUBCONTRACTOR_CREATE,
            Permissions::SUBCONTRACTOR_UPDATE,
            Permissions::SUBCONTRACTOR_DELETE,

            // Subcontractor Payment
            Permissions::SUBCONTRACTOR_PAYMENT_VIEW,
            Permissions::SUBCONTRACTOR_PAYMENT_CREATE,
            Permissions::SUBCONTRACTOR_PAYMENT_UPDATE,
            Permissions::SUBCONTRACTOR_PAYMENT_DELETE,
            Permissions::SUBCONTRACTOR_PAYMENT_APPROVE,
            Permissions::SUBCONTRACTOR_PAYMENT_MARK_PAID,

            // Document
            Permissions::DOCUMENT_VIEW,
            Permissions::DOCUMENT_UPLOAD,
            Permissions::DOCUMENT_DELETE,

            // Construction Log
            Permissions::LOG_VIEW,
            Permissions::LOG_CREATE,
            Permissions::LOG_UPDATE,
            Permissions::LOG_DELETE,

            // Defect
            Permissions::DEFECT_VIEW,
            Permissions::DEFECT_CREATE,
            Permissions::DEFECT_UPDATE,
            Permissions::DEFECT_DELETE,
            Permissions::DEFECT_VERIFY,

            // Personnel
            Permissions::PERSONNEL_VIEW,
            Permissions::PERSONNEL_ASSIGN,
            Permissions::PERSONNEL_REMOVE,

            // Revenue
            Permissions::REVENUE_VIEW,
            Permissions::REVENUE_DASHBOARD,
            Permissions::REVENUE_EXPORT,

            // Settings
            Permissions::SETTINGS_VIEW,
            Permissions::SETTINGS_MANAGE,
        ];

        $permissionIds = Permission::whereIn('name', $permissions)->pluck('id');
        $role->permissions()->sync($permissionIds);

        $this->command->info("✅ Admin: {$permissionIds->count()} permissions");
    }

    /**
     * Assign permissions to Project Owner role
     */
    private function assignProjectOwnerPermissions(): void
    {
        $role = Role::where('name', Roles::PROJECT_OWNER)->first();
        if (!$role) {
            $this->command->warn("⚠️  Role '" . Roles::PROJECT_OWNER . "' not found.");
            return;
        }

        $permissions = [
            // Project - Full control
            Permissions::PROJECT_VIEW,
            Permissions::PROJECT_UPDATE,
            Permissions::PROJECT_MANAGE,

            // Progress
            Permissions::PROGRESS_VIEW,
            Permissions::PROGRESS_UPDATE,

            // Acceptance - View and final approval
            Permissions::ACCEPTANCE_VIEW,
            Permissions::ACCEPTANCE_APPROVE_LEVEL_3, // Final approval

            // Cost - View and approve
            Permissions::COST_VIEW,
            Permissions::COST_APPROVE_MANAGEMENT,

            // Additional Cost
            Permissions::ADDITIONAL_COST_VIEW,
            Permissions::ADDITIONAL_COST_APPROVE,

            // Material
            Permissions::MATERIAL_VIEW,
            Permissions::MATERIAL_APPROVE,

            // Equipment
            Permissions::EQUIPMENT_VIEW,
            Permissions::EQUIPMENT_APPROVE,

            // Contract
            Permissions::CONTRACT_VIEW,
            Permissions::CONTRACT_APPROVE_LEVEL_2, // Final approval for Project Owner

            // Payment
            Permissions::PAYMENT_VIEW,
            Permissions::PAYMENT_CONFIRM,

            // Invoice
            Permissions::INVOICE_VIEW,
            Permissions::INVOICE_APPROVE,

            // Document
            Permissions::DOCUMENT_VIEW,

            // Construction Log
            Permissions::LOG_VIEW,

            // Defect
            Permissions::DEFECT_VIEW,

            // Report
            Permissions::REPORT_VIEW,
            Permissions::REPORT_EXPORT,
            Permissions::REPORT_FINANCIAL,
            Permissions::REPORT_PROGRESS,

            // Revenue
            Permissions::REVENUE_VIEW,
            Permissions::REVENUE_DASHBOARD,
            Permissions::REVENUE_EXPORT,
        ];

        $permissionIds = Permission::whereIn('name', $permissions)->pluck('id');
        $role->permissions()->sync($permissionIds);

        $this->command->info("✅ Project Owner: {$permissionIds->count()} permissions");
    }

    /**
     * Assign permissions to Project Manager role
     */
    private function assignProjectManagerPermissions(): void
    {
        $role = Role::where('name', Roles::PROJECT_MANAGER)->first();
        if (!$role) {
            $this->command->warn("⚠️  Role '" . Roles::PROJECT_MANAGER . "' not found.");
            return;
        }

        $permissions = [
            // Project - Full management
            Permissions::PROJECT_VIEW,
            Permissions::PROJECT_CREATE,
            Permissions::PROJECT_UPDATE,
            Permissions::PROJECT_MANAGE,

            // Progress
            Permissions::PROGRESS_VIEW,
            Permissions::PROGRESS_UPDATE,

            // Acceptance - Create and approve level 2
            Permissions::ACCEPTANCE_VIEW,
            Permissions::ACCEPTANCE_CREATE,
            Permissions::ACCEPTANCE_UPDATE,
            Permissions::ACCEPTANCE_DELETE,
            Permissions::ACCEPTANCE_ATTACH_FILES,
            Permissions::ACCEPTANCE_APPROVE_LEVEL_2,

            // Cost - Full access
            Permissions::COST_VIEW,
            Permissions::COST_CREATE,
            Permissions::COST_UPDATE,
            Permissions::COST_DELETE,
            Permissions::COST_SUBMIT,
            Permissions::COST_APPROVE_MANAGEMENT,

            // Additional Cost
            Permissions::ADDITIONAL_COST_VIEW,
            Permissions::ADDITIONAL_COST_CREATE,
            Permissions::ADDITIONAL_COST_UPDATE,
            Permissions::ADDITIONAL_COST_DELETE,
            Permissions::ADDITIONAL_COST_APPROVE,

            // Material
            Permissions::MATERIAL_VIEW,
            Permissions::MATERIAL_CREATE,
            Permissions::MATERIAL_UPDATE,
            Permissions::MATERIAL_DELETE,
            Permissions::MATERIAL_APPROVE,

            // Equipment
            Permissions::EQUIPMENT_VIEW,
            Permissions::EQUIPMENT_CREATE,
            Permissions::EQUIPMENT_UPDATE,
            Permissions::EQUIPMENT_DELETE,
            Permissions::EQUIPMENT_APPROVE,

            // Contract
            Permissions::CONTRACT_VIEW,
            Permissions::CONTRACT_CREATE,
            Permissions::CONTRACT_UPDATE,
            Permissions::CONTRACT_APPROVE_LEVEL_1, // First level approval for Project Manager

            // Payment
            Permissions::PAYMENT_VIEW,
            Permissions::PAYMENT_CREATE,
            Permissions::PAYMENT_UPDATE,

            // Subcontractor
            Permissions::SUBCONTRACTOR_VIEW,
            Permissions::SUBCONTRACTOR_CREATE,
            Permissions::SUBCONTRACTOR_UPDATE,
            Permissions::SUBCONTRACTOR_DELETE,

            // Subcontractor Payment
            Permissions::SUBCONTRACTOR_PAYMENT_VIEW,
            Permissions::SUBCONTRACTOR_PAYMENT_CREATE,
            Permissions::SUBCONTRACTOR_PAYMENT_UPDATE,
            Permissions::SUBCONTRACTOR_PAYMENT_APPROVE,

            // Document
            Permissions::DOCUMENT_VIEW,
            Permissions::DOCUMENT_UPLOAD,
            Permissions::DOCUMENT_DELETE,

            // Construction Log
            Permissions::LOG_VIEW,
            Permissions::LOG_CREATE,
            Permissions::LOG_UPDATE,
            Permissions::LOG_DELETE,

            // Defect
            Permissions::DEFECT_VIEW,
            Permissions::DEFECT_CREATE,
            Permissions::DEFECT_UPDATE,
            Permissions::DEFECT_DELETE,
            Permissions::DEFECT_VERIFY,

            // Personnel
            Permissions::PERSONNEL_VIEW,
            Permissions::PERSONNEL_ASSIGN,
            Permissions::PERSONNEL_REMOVE,

            // Report
            Permissions::REPORT_VIEW,
            Permissions::REPORT_EXPORT,
            Permissions::REPORT_FINANCIAL,
            Permissions::REPORT_PROGRESS,

            // Revenue
            Permissions::REVENUE_VIEW,
            Permissions::REVENUE_DASHBOARD,
            Permissions::REVENUE_EXPORT,

            // Settings
            Permissions::SETTINGS_VIEW,
            Permissions::SETTINGS_MANAGE,
        ];

        $permissionIds = Permission::whereIn('name', $permissions)->pluck('id');
        $role->permissions()->sync($permissionIds);

        $this->command->info("✅ Project Manager: {$permissionIds->count()} permissions");
    }

    /**
     * Assign permissions to Site Supervisor role
     */
    private function assignSiteSupervisorPermissions(): void
    {
        $role = Role::where('name', Roles::SITE_SUPERVISOR)->first();
        if (!$role) {
            $this->command->warn("⚠️  Role '" . Roles::SITE_SUPERVISOR . "' not found.");
            return;
        }

        $permissions = [
            // Project
            Permissions::PROJECT_VIEW,
            Permissions::PROJECT_UPDATE,

            // Progress
            Permissions::PROGRESS_VIEW,
            Permissions::PROGRESS_UPDATE,

            // Acceptance - Create and approve level 1
            Permissions::ACCEPTANCE_VIEW,
            Permissions::ACCEPTANCE_CREATE,
            Permissions::ACCEPTANCE_UPDATE,
            Permissions::ACCEPTANCE_ATTACH_FILES,
            Permissions::ACCEPTANCE_APPROVE_LEVEL_1,

            // Cost - Create and submit
            Permissions::COST_VIEW,
            Permissions::COST_CREATE,
            Permissions::COST_UPDATE,
            Permissions::COST_SUBMIT,

            // Additional Cost
            Permissions::ADDITIONAL_COST_VIEW,
            Permissions::ADDITIONAL_COST_CREATE,
            Permissions::ADDITIONAL_COST_UPDATE,

            // Material
            Permissions::MATERIAL_VIEW,
            Permissions::MATERIAL_CREATE,
            Permissions::MATERIAL_UPDATE,

            // Equipment
            Permissions::EQUIPMENT_VIEW,
            Permissions::EQUIPMENT_CREATE,
            Permissions::EQUIPMENT_UPDATE,

            // HR - Time tracking approval
            Permissions::HR_TIME_TRACKING_VIEW,
            Permissions::HR_TIME_TRACKING_APPROVE,
            Permissions::HR_TIME_TRACKING_REJECT,

            // Document
            Permissions::DOCUMENT_VIEW,
            Permissions::DOCUMENT_UPLOAD,

            // Construction Log
            Permissions::LOG_VIEW,
            Permissions::LOG_CREATE,
            Permissions::LOG_UPDATE,
            Permissions::LOG_DELETE,

            // Defect
            Permissions::DEFECT_VIEW,
            Permissions::DEFECT_CREATE,
            Permissions::DEFECT_UPDATE,
            Permissions::DEFECT_VERIFY,

            // Personnel
            Permissions::PERSONNEL_VIEW,
            Permissions::PERSONNEL_ASSIGN,
        ];

        $permissionIds = Permission::whereIn('name', $permissions)->pluck('id');
        $role->permissions()->sync($permissionIds);

        $this->command->info("✅ Site Supervisor: {$permissionIds->count()} permissions");
    }

    /**
     * Assign permissions to Accountant role
     */
    private function assignAccountantPermissions(): void
    {
        $role = Role::where('name', Roles::ACCOUNTANT)->first();
        if (!$role) {
            $this->command->warn("⚠️  Role '" . Roles::ACCOUNTANT . "' not found.");
            return;
        }

        $permissions = [
            // Project
            Permissions::PROJECT_VIEW,

            // Cost - View and accountant approval
            Permissions::COST_VIEW,
            Permissions::COST_APPROVE_ACCOUNTANT,

            // Additional Cost
            Permissions::ADDITIONAL_COST_VIEW,
            Permissions::ADDITIONAL_COST_APPROVE,

            // Contract
            Permissions::CONTRACT_VIEW,

            // Payment
            Permissions::PAYMENT_VIEW,
            Permissions::PAYMENT_CREATE,
            Permissions::PAYMENT_UPDATE,
            Permissions::PAYMENT_CONFIRM,

            // Invoice
            Permissions::INVOICE_VIEW,
            Permissions::INVOICE_CREATE,
            Permissions::INVOICE_UPDATE,
            Permissions::INVOICE_APPROVE,
            Permissions::INVOICE_SEND,

            // Input Invoice - Full access (hóa đơn đầu vào từ nhà cung cấp)
            Permissions::INPUT_INVOICE_VIEW,
            Permissions::INPUT_INVOICE_CREATE,
            Permissions::INPUT_INVOICE_UPDATE,
            Permissions::INPUT_INVOICE_DELETE,

            // Subcontractor Payment
            Permissions::SUBCONTRACTOR_PAYMENT_VIEW,
            Permissions::SUBCONTRACTOR_PAYMENT_APPROVE,
            Permissions::SUBCONTRACTOR_PAYMENT_MARK_PAID,

            // HR - Payroll and bonus
            Permissions::HR_PAYROLL_VIEW,
            Permissions::HR_PAYROLL_CALCULATE,
            Permissions::HR_PAYROLL_APPROVE,
            Permissions::HR_PAYROLL_PAY,
            Permissions::HR_PAYROLL_EXPORT,
            Permissions::HR_BONUS_VIEW,
            Permissions::HR_BONUS_APPROVE,
            Permissions::HR_BONUS_PAY,

            // Report
            Permissions::REPORT_VIEW,
            Permissions::REPORT_EXPORT,
            Permissions::REPORT_FINANCIAL,

            // Revenue
            Permissions::REVENUE_VIEW,
            Permissions::REVENUE_DASHBOARD,
            Permissions::REVENUE_EXPORT,
        ];

        $permissionIds = Permission::whereIn('name', $permissions)->pluck('id');
        $role->permissions()->sync($permissionIds);

        $this->command->info("✅ Accountant: {$permissionIds->count()} permissions");
    }

    /**
     * Assign permissions to Client role
     */
    private function assignClientPermissions(): void
    {
        $role = Role::where('name', Roles::CLIENT)->first();
        if (!$role) {
            $this->command->warn("⚠️  Role '" . Roles::CLIENT . "' not found.");
            return;
        }

        $permissions = [
            // Project
            Permissions::PROJECT_VIEW,

            // Progress
            Permissions::PROGRESS_VIEW,

            // Acceptance - View and final approval
            Permissions::ACCEPTANCE_VIEW,
            Permissions::ACCEPTANCE_APPROVE_LEVEL_3,

            // Cost
            Permissions::COST_VIEW,

            // Contract
            Permissions::CONTRACT_VIEW,
            Permissions::CONTRACT_APPROVE_LEVEL_2, // Final approval for Client

            // Payment
            Permissions::PAYMENT_VIEW,

            // Invoice
            Permissions::INVOICE_VIEW,

            // Document
            Permissions::DOCUMENT_VIEW,

            // Construction Log
            Permissions::LOG_VIEW,

            // Defect
            Permissions::DEFECT_VIEW,

            // Report
            Permissions::REPORT_VIEW,
            Permissions::REPORT_EXPORT,
            Permissions::REPORT_PROGRESS,

            // Revenue
            Permissions::REVENUE_VIEW,
        ];

        $permissionIds = Permission::whereIn('name', $permissions)->pluck('id');
        $role->permissions()->sync($permissionIds);

        $this->command->info("✅ Client: {$permissionIds->count()} permissions");
    }
}
