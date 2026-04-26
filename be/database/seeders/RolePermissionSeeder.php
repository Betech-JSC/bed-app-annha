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
            Permissions::ACCEPTANCE_REVERT,

            // Cost - Full access
            Permissions::COST_VIEW,
            Permissions::COST_CREATE,
            Permissions::COST_UPDATE,
            Permissions::COST_DELETE,
            Permissions::COST_SUBMIT,
            Permissions::COST_APPROVE_MANAGEMENT,
            Permissions::COST_APPROVE_ACCOUNTANT,
            Permissions::COST_REJECT,
            Permissions::COST_REVERT,

            // Additional Cost
            Permissions::ADDITIONAL_COST_VIEW,
            Permissions::ADDITIONAL_COST_CREATE,
            Permissions::ADDITIONAL_COST_UPDATE,
            Permissions::ADDITIONAL_COST_DELETE,
            Permissions::ADDITIONAL_COST_APPROVE,
            Permissions::ADDITIONAL_COST_REJECT,
            Permissions::ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER,
            Permissions::ADDITIONAL_COST_CONFIRM,
            Permissions::ADDITIONAL_COST_REVERT,

            // Material
            Permissions::MATERIAL_VIEW,
            Permissions::MATERIAL_CREATE,
            Permissions::MATERIAL_UPDATE,
            Permissions::MATERIAL_DELETE,
            Permissions::MATERIAL_APPROVE,
            Permissions::MATERIAL_APPROVE_MANAGEMENT,
            Permissions::MATERIAL_APPROVE_ACCOUNTANT,
            Permissions::MATERIAL_REVERT,

            // Equipment
            Permissions::EQUIPMENT_VIEW,
            Permissions::EQUIPMENT_CREATE,
            Permissions::EQUIPMENT_UPDATE,
            Permissions::EQUIPMENT_DELETE,
            Permissions::EQUIPMENT_APPROVE,
            Permissions::EQUIPMENT_REVERT,

            // Report - Full access (HR reports removed)
            Permissions::REPORT_VIEW,
            Permissions::REPORT_EXPORT,
            Permissions::REPORT_FINANCIAL,
            Permissions::REPORT_PROGRESS,

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
            Permissions::CONTRACT_REVERT,

            // Payment
            Permissions::PAYMENT_VIEW,
            Permissions::PAYMENT_CREATE,
            Permissions::PAYMENT_UPDATE,
            Permissions::PAYMENT_DELETE,
            Permissions::PAYMENT_APPROVE,
            Permissions::PAYMENT_CONFIRM,
            Permissions::PAYMENT_MARK_AS_PAID_BY_CUSTOMER,
            Permissions::PAYMENT_REVERT,

            // Subcontractor
            Permissions::SUBCONTRACTOR_VIEW,
            Permissions::SUBCONTRACTOR_CREATE,
            Permissions::SUBCONTRACTOR_UPDATE,
            Permissions::SUBCONTRACTOR_DELETE,
            Permissions::SUBCONTRACTOR_APPROVE,
            Permissions::SUBCONTRACTOR_REVERT,

            // Subcontractor Payment
            Permissions::SUBCONTRACTOR_PAYMENT_VIEW,
            Permissions::SUBCONTRACTOR_PAYMENT_CREATE,
            Permissions::SUBCONTRACTOR_PAYMENT_UPDATE,
            Permissions::SUBCONTRACTOR_PAYMENT_DELETE,
            Permissions::SUBCONTRACTOR_PAYMENT_APPROVE,
            Permissions::SUBCONTRACTOR_PAYMENT_MARK_PAID,
            Permissions::SUBCONTRACTOR_PAYMENT_REVERT,

            // Document
            Permissions::DOCUMENT_VIEW,
            Permissions::DOCUMENT_UPLOAD,
            Permissions::DOCUMENT_DELETE,

            // Construction Log
            Permissions::LOG_VIEW,
            Permissions::LOG_CREATE,
            Permissions::LOG_UPDATE,
            Permissions::LOG_DELETE,
            Permissions::LOG_REVERT,

            // Project Task
            Permissions::PROJECT_TASK_VIEW,
            Permissions::PROJECT_TASK_CREATE,
            Permissions::PROJECT_TASK_UPDATE,
            Permissions::PROJECT_TASK_DELETE,

            // Project Comment
            Permissions::PROJECT_COMMENT_VIEW,
            Permissions::PROJECT_COMMENT_CREATE,
            Permissions::PROJECT_COMMENT_UPDATE,
            Permissions::PROJECT_COMMENT_DELETE,

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
            Permissions::DASHBOARD_VIEW,

            // Settings
            Permissions::SETTINGS_VIEW,
            Permissions::SETTINGS_MANAGE,
            // Missing Modules for Admin
            Permissions::KPI_VIEW, Permissions::KPI_CREATE, Permissions::KPI_UPDATE, Permissions::KPI_DELETE, Permissions::KPI_VERIFY,
            Permissions::BUDGET_VIEW, Permissions::BUDGET_CREATE, Permissions::BUDGET_UPDATE, Permissions::BUDGET_DELETE, Permissions::BUDGET_APPROVE, Permissions::BUDGET_REVERT,
            Permissions::PROJECT_PHASE_VIEW, Permissions::PROJECT_PHASE_CREATE, Permissions::PROJECT_PHASE_UPDATE, Permissions::PROJECT_PHASE_DELETE,
            Permissions::PROJECT_DOCUMENT_VIEW, Permissions::PROJECT_DOCUMENT_UPLOAD, Permissions::PROJECT_DOCUMENT_DELETE,
            Permissions::RECEIPT_VIEW, Permissions::RECEIPT_CREATE, Permissions::RECEIPT_UPDATE, Permissions::RECEIPT_DELETE, Permissions::RECEIPT_VERIFY,
            Permissions::SUPPLIER_VIEW, Permissions::SUPPLIER_CREATE, Permissions::SUPPLIER_UPDATE, Permissions::SUPPLIER_DELETE,
            Permissions::SUPPLIER_CONTRACT_VIEW, Permissions::SUPPLIER_CONTRACT_CREATE, Permissions::SUPPLIER_CONTRACT_UPDATE, Permissions::SUPPLIER_CONTRACT_DELETE, Permissions::SUPPLIER_CONTRACT_APPROVE,
            Permissions::SUPPLIER_ACCEPTANCE_VIEW, Permissions::SUPPLIER_ACCEPTANCE_CREATE, Permissions::SUPPLIER_ACCEPTANCE_UPDATE, Permissions::SUPPLIER_ACCEPTANCE_DELETE,
            Permissions::CHANGE_REQUEST_VIEW, Permissions::CHANGE_REQUEST_CREATE, Permissions::CHANGE_REQUEST_UPDATE, Permissions::CHANGE_REQUEST_DELETE, Permissions::CHANGE_REQUEST_APPROVE, Permissions::CHANGE_REQUEST_REJECT, Permissions::CHANGE_REQUEST_REVERT,
            Permissions::PROJECT_RISK_VIEW, Permissions::PROJECT_RISK_CREATE, Permissions::PROJECT_RISK_UPDATE, Permissions::PROJECT_RISK_DELETE,
            Permissions::ISSUE_VIEW, Permissions::ISSUE_CREATE, Permissions::ISSUE_UPDATE, Permissions::ISSUE_DELETE, Permissions::ISSUE_RESOLVE,
            Permissions::ACCEPTANCE_TEMPLATE_VIEW, Permissions::ACCEPTANCE_TEMPLATE_CREATE, Permissions::ACCEPTANCE_TEMPLATE_UPDATE, Permissions::ACCEPTANCE_TEMPLATE_DELETE,
            Permissions::GANTT_VIEW, Permissions::GANTT_UPDATE, Permissions::WBS_TEMPLATE_VIEW, Permissions::WBS_TEMPLATE_CREATE,
            Permissions::FINANCE_VIEW, Permissions::FINANCE_MANAGE,
            Permissions::ATTENDANCE_VIEW, Permissions::ATTENDANCE_CHECK_IN, Permissions::ATTENDANCE_MANAGE, Permissions::ATTENDANCE_APPROVE, Permissions::ATTENDANCE_REVERT,
            Permissions::LABOR_PRODUCTIVITY_VIEW, Permissions::LABOR_PRODUCTIVITY_CREATE, Permissions::LABOR_PRODUCTIVITY_UPDATE, Permissions::LABOR_PRODUCTIVITY_DELETE,
            Permissions::EVM_VIEW, Permissions::PREDICTIVE_VIEW,
            Permissions::COMPANY_FINANCIAL_VIEW,
            Permissions::SHAREHOLDER_VIEW, Permissions::SHAREHOLDER_CREATE, Permissions::SHAREHOLDER_UPDATE, Permissions::SHAREHOLDER_DELETE,
            Permissions::COMPANY_ASSET_VIEW, Permissions::COMPANY_ASSET_CREATE, Permissions::COMPANY_ASSET_UPDATE, Permissions::COMPANY_ASSET_DELETE, Permissions::COMPANY_ASSET_ASSIGN, Permissions::COMPANY_ASSET_DEPRECIATE,
            Permissions::OPERATIONS_DASHBOARD_VIEW,
            Permissions::PROJECT_MONITORING_VIEW,
            Permissions::PROJECT_SUMMARY_REPORT_VIEW,
            Permissions::WARRANTY_VIEW, Permissions::WARRANTY_CREATE, Permissions::WARRANTY_UPDATE, Permissions::WARRANTY_DELETE, Permissions::WARRANTY_APPROVE, Permissions::WARRANTY_REVERT,
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
            Permissions::ACCEPTANCE_REVERT,

            // Cost - View and approve
            Permissions::COST_VIEW,
            Permissions::COST_APPROVE_MANAGEMENT,
            Permissions::COST_REJECT,
            Permissions::COST_REVERT,

            // Additional Cost
            Permissions::ADDITIONAL_COST_VIEW,
            Permissions::ADDITIONAL_COST_APPROVE,
            Permissions::ADDITIONAL_COST_REJECT,
            Permissions::ADDITIONAL_COST_REVERT,
            Permissions::ADDITIONAL_COST_CONFIRM,

            // Material
            Permissions::MATERIAL_VIEW,
            Permissions::MATERIAL_APPROVE,
            Permissions::MATERIAL_APPROVE_MANAGEMENT,
            Permissions::MATERIAL_REVERT,

            // Equipment
            Permissions::EQUIPMENT_VIEW,
            Permissions::EQUIPMENT_APPROVE,
            Permissions::EQUIPMENT_REVERT,

            // Contract
            Permissions::CONTRACT_VIEW,
            Permissions::CONTRACT_APPROVE_LEVEL_2, // Final approval for Project Owner
            Permissions::CONTRACT_REVERT,

            // Payment
            Permissions::PAYMENT_VIEW,
            Permissions::PAYMENT_CONFIRM,
            Permissions::PAYMENT_REVERT,

            // Invoice
            Permissions::INVOICE_VIEW,
            Permissions::INVOICE_APPROVE,

            // Document
            Permissions::DOCUMENT_VIEW,

            // Construction Log
            Permissions::LOG_VIEW,

            // Project Task
            Permissions::PROJECT_TASK_VIEW,

            // Project Comment
            Permissions::PROJECT_COMMENT_VIEW,
            Permissions::PROJECT_COMMENT_CREATE,
            Permissions::PROJECT_COMMENT_UPDATE,
            Permissions::PROJECT_COMMENT_DELETE,

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
            Permissions::DASHBOARD_VIEW,
            // Missing Modules for Project Owner
            Permissions::PROJECT_MONITORING_VIEW, Permissions::PROJECT_SUMMARY_REPORT_VIEW,
            Permissions::CHANGE_REQUEST_VIEW, Permissions::CHANGE_REQUEST_APPROVE, Permissions::CHANGE_REQUEST_REJECT, Permissions::CHANGE_REQUEST_REVERT,
            Permissions::WARRANTY_VIEW, Permissions::WARRANTY_APPROVE, Permissions::WARRANTY_REVERT,
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
            Permissions::ACCEPTANCE_REVERT,

            // Cost - Full access
            Permissions::COST_VIEW,
            Permissions::COST_CREATE,
            Permissions::COST_UPDATE,
            Permissions::COST_DELETE,
            Permissions::COST_SUBMIT,
            Permissions::COST_APPROVE_MANAGEMENT,
            Permissions::COST_REJECT,
            Permissions::COST_REVERT,

            // Additional Cost
            Permissions::ADDITIONAL_COST_VIEW,
            Permissions::ADDITIONAL_COST_CREATE,
            Permissions::ADDITIONAL_COST_UPDATE,
            Permissions::ADDITIONAL_COST_DELETE,
            Permissions::ADDITIONAL_COST_APPROVE,
            Permissions::ADDITIONAL_COST_REJECT,
            Permissions::ADDITIONAL_COST_REVERT,
            Permissions::ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER,
            Permissions::ADDITIONAL_COST_CONFIRM,

            // Material
            Permissions::MATERIAL_VIEW,
            Permissions::MATERIAL_CREATE,
            Permissions::MATERIAL_UPDATE,
            Permissions::MATERIAL_DELETE,
            Permissions::MATERIAL_APPROVE,
            Permissions::MATERIAL_APPROVE_MANAGEMENT,
            Permissions::MATERIAL_REVERT,

            // Equipment
            Permissions::EQUIPMENT_VIEW,
            Permissions::EQUIPMENT_CREATE,
            Permissions::EQUIPMENT_UPDATE,
            Permissions::EQUIPMENT_DELETE,
            Permissions::EQUIPMENT_APPROVE,
            Permissions::EQUIPMENT_REVERT,

            // Contract
            Permissions::CONTRACT_VIEW,
            Permissions::CONTRACT_CREATE,
            Permissions::CONTRACT_UPDATE,
            Permissions::CONTRACT_APPROVE_LEVEL_1, // First level approval for Project Manager
            Permissions::CONTRACT_REVERT,

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
            Permissions::SUBCONTRACTOR_PAYMENT_REVERT,

            // Document
            Permissions::DOCUMENT_VIEW,
            Permissions::DOCUMENT_UPLOAD,
            Permissions::DOCUMENT_DELETE,

            // Construction Log
            Permissions::LOG_VIEW,
            Permissions::LOG_CREATE,
            Permissions::LOG_UPDATE,
            Permissions::LOG_DELETE,
            Permissions::LOG_REVERT,

            // Project Task
            Permissions::PROJECT_TASK_VIEW,
            Permissions::PROJECT_TASK_CREATE,
            Permissions::PROJECT_TASK_UPDATE,
            Permissions::PROJECT_TASK_DELETE,

            // Project Comment
            Permissions::PROJECT_COMMENT_VIEW,
            Permissions::PROJECT_COMMENT_CREATE,
            Permissions::PROJECT_COMMENT_UPDATE,
            Permissions::PROJECT_COMMENT_DELETE,

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
            Permissions::DASHBOARD_VIEW,

            // Settings
            Permissions::SETTINGS_VIEW,
            Permissions::SETTINGS_MANAGE,
            // Missing Modules for PM
            Permissions::PROJECT_PHASE_VIEW, Permissions::PROJECT_PHASE_CREATE, Permissions::PROJECT_PHASE_UPDATE, Permissions::PROJECT_PHASE_DELETE,
            Permissions::PROJECT_DOCUMENT_VIEW, Permissions::PROJECT_DOCUMENT_UPLOAD, Permissions::PROJECT_DOCUMENT_DELETE,
            Permissions::SUPPLIER_VIEW, Permissions::SUPPLIER_CREATE, Permissions::SUPPLIER_UPDATE,
            Permissions::SUPPLIER_CONTRACT_VIEW, Permissions::SUPPLIER_CONTRACT_CREATE, Permissions::SUPPLIER_CONTRACT_UPDATE, Permissions::SUPPLIER_CONTRACT_APPROVE,
            Permissions::SUPPLIER_ACCEPTANCE_VIEW, Permissions::SUPPLIER_ACCEPTANCE_CREATE, Permissions::SUPPLIER_ACCEPTANCE_UPDATE,
            Permissions::CHANGE_REQUEST_VIEW, Permissions::CHANGE_REQUEST_CREATE, Permissions::CHANGE_REQUEST_UPDATE, Permissions::CHANGE_REQUEST_DELETE, Permissions::CHANGE_REQUEST_APPROVE, Permissions::CHANGE_REQUEST_REJECT, Permissions::CHANGE_REQUEST_REVERT,
            Permissions::PROJECT_RISK_VIEW, Permissions::PROJECT_RISK_CREATE, Permissions::PROJECT_RISK_UPDATE, Permissions::PROJECT_RISK_DELETE,
            Permissions::ISSUE_VIEW, Permissions::ISSUE_CREATE, Permissions::ISSUE_UPDATE, Permissions::ISSUE_DELETE, Permissions::ISSUE_RESOLVE,
            Permissions::GANTT_VIEW, Permissions::GANTT_UPDATE,
            Permissions::LABOR_PRODUCTIVITY_VIEW, Permissions::LABOR_PRODUCTIVITY_CREATE, Permissions::LABOR_PRODUCTIVITY_UPDATE,
            Permissions::EVM_VIEW, Permissions::PREDICTIVE_VIEW,
            Permissions::PROJECT_MONITORING_VIEW, Permissions::PROJECT_SUMMARY_REPORT_VIEW,
            Permissions::WARRANTY_VIEW, Permissions::WARRANTY_CREATE, Permissions::WARRANTY_UPDATE, Permissions::WARRANTY_APPROVE, Permissions::WARRANTY_REVERT,
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
            Permissions::ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER,
            Permissions::ADDITIONAL_COST_CONFIRM,

            // Material
            Permissions::MATERIAL_VIEW,
            Permissions::MATERIAL_CREATE,
            Permissions::MATERIAL_UPDATE,

            // Equipment
            Permissions::EQUIPMENT_VIEW,
            Permissions::EQUIPMENT_CREATE,
            Permissions::EQUIPMENT_UPDATE,

            // HR permissions removed - HR module deleted

            // Document
            Permissions::DOCUMENT_VIEW,
            Permissions::DOCUMENT_UPLOAD,

            // Construction Log
            Permissions::LOG_VIEW,
            Permissions::LOG_CREATE,
            Permissions::LOG_UPDATE,
            Permissions::LOG_DELETE,
            Permissions::LOG_REVERT,

            // Project Task
            Permissions::PROJECT_TASK_VIEW,
            Permissions::PROJECT_TASK_CREATE,
            Permissions::PROJECT_TASK_UPDATE,

            // Project Comment
            Permissions::PROJECT_COMMENT_VIEW,
            Permissions::PROJECT_COMMENT_CREATE,
            Permissions::PROJECT_COMMENT_UPDATE,

            // Defect
            Permissions::DEFECT_VIEW,
            Permissions::DEFECT_CREATE,
            Permissions::DEFECT_UPDATE,
            Permissions::DEFECT_VERIFY,

            // Personnel
            Permissions::PERSONNEL_VIEW,
            Permissions::PERSONNEL_ASSIGN,
            Permissions::DASHBOARD_VIEW,

            // Missing Modules for Site Supervisor
            Permissions::ISSUE_VIEW, Permissions::ISSUE_CREATE, Permissions::ISSUE_UPDATE,
            Permissions::LABOR_PRODUCTIVITY_VIEW, Permissions::LABOR_PRODUCTIVITY_CREATE, Permissions::LABOR_PRODUCTIVITY_UPDATE,
            Permissions::ATTENDANCE_VIEW, Permissions::ATTENDANCE_CHECK_IN,
            Permissions::PROJECT_PHASE_VIEW,
            Permissions::GANTT_VIEW,
            Permissions::PROJECT_DOCUMENT_VIEW, Permissions::PROJECT_DOCUMENT_UPLOAD,
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
            Permissions::COST_REJECT,
            Permissions::COST_REVERT,

            // Additional Cost
            Permissions::ADDITIONAL_COST_VIEW,
            Permissions::ADDITIONAL_COST_APPROVE,
            Permissions::ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER,
            Permissions::MATERIAL_APPROVE_ACCOUNTANT,

            // Contract
            Permissions::CONTRACT_VIEW,

            // Payment
            Permissions::PAYMENT_VIEW,
            Permissions::PAYMENT_CREATE,
            Permissions::PAYMENT_UPDATE,
            Permissions::PAYMENT_CONFIRM,
            Permissions::PAYMENT_MARK_AS_PAID_BY_CUSTOMER,
            Permissions::PAYMENT_REVERT,

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
            Permissions::SUBCONTRACTOR_PAYMENT_REVERT,

            // HR permissions removed - HR module deleted

            // Report
            Permissions::REPORT_VIEW,
            Permissions::REPORT_EXPORT,
            Permissions::REPORT_FINANCIAL,

            // Revenue
            Permissions::REVENUE_VIEW,
            Permissions::REVENUE_DASHBOARD,
            Permissions::REVENUE_EXPORT,
            Permissions::DASHBOARD_VIEW,
            // Missing Modules for Accountant
            Permissions::BUDGET_VIEW,
            Permissions::RECEIPT_VIEW, Permissions::RECEIPT_CREATE, Permissions::RECEIPT_UPDATE, Permissions::RECEIPT_VERIFY,
            Permissions::SUPPLIER_CONTRACT_VIEW, Permissions::SUPPLIER_ACCEPTANCE_VIEW,
            Permissions::FINANCE_VIEW, Permissions::FINANCE_MANAGE,
            Permissions::COMPANY_FINANCIAL_VIEW,
            Permissions::COMPANY_ASSET_VIEW, Permissions::COMPANY_ASSET_CREATE, Permissions::COMPANY_ASSET_UPDATE, Permissions::COMPANY_ASSET_DEPRECIATE,
            Permissions::WARRANTY_VIEW,
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
            // Progress
            Permissions::PROGRESS_VIEW,

            // Acceptance - View and final approval
            Permissions::ACCEPTANCE_VIEW,
            Permissions::ACCEPTANCE_APPROVE_LEVEL_3,

            // Cost (REMOVED - sensitive internal data)
            // Permissions::COST_VIEW,

            // Contract
            Permissions::CONTRACT_VIEW,
            Permissions::CONTRACT_APPROVE_LEVEL_2, // Final approval for Client

            // Payment
            Permissions::PAYMENT_VIEW,
            Permissions::PAYMENT_CREATE,
            Permissions::PAYMENT_APPROVE,
            Permissions::PAYMENT_MARK_AS_PAID_BY_CUSTOMER,

            // Additional Cost
            Permissions::ADDITIONAL_COST_VIEW,
            Permissions::ADDITIONAL_COST_APPROVE,
            Permissions::ADDITIONAL_COST_REJECT,
            Permissions::ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER,

            // Invoice
            Permissions::INVOICE_VIEW,

            // Document
            Permissions::DOCUMENT_VIEW,

            // Construction Log
            Permissions::LOG_VIEW,

            // Project Task
            Permissions::PROJECT_TASK_VIEW,

            // Project Comment
            Permissions::PROJECT_COMMENT_VIEW,
            Permissions::PROJECT_COMMENT_CREATE,

            // Defect
            Permissions::DEFECT_VIEW,

            // Report
            Permissions::REPORT_VIEW,
            Permissions::REPORT_EXPORT,
            Permissions::REPORT_PROGRESS,

            // Revenue (REMOVED - sensitive internal data)
            // Permissions::REVENUE_VIEW,
        ];

        $permissionIds = Permission::whereIn('name', $permissions)->pluck('id');
        $role->permissions()->sync($permissionIds);

        $this->command->info("✅ Client: {$permissionIds->count()} permissions");
    }
}
