<?php

namespace App\Constants;

/**
 * Permission Constants
 * 
 * All permissions in the system are defined here as constants.
 * Format: MODULE.ACTION or MODULE.SUBMODULE.ACTION
 * 
 * This ensures:
 * - No duplicate permission strings
 * - Easy to reference in code
 * - Type-safe permission checks
 * - Centralized permission management
 */
class Permissions
{
    // ===================================================================
    // DASHBOARD MODULE
    // ===================================================================
    public const DASHBOARD_VIEW = 'dashboard.view';

    // ===================================================================
    // PROJECT MODULE
    // ===================================================================
    public const PROJECT_VIEW = 'project.view';
    public const PROJECT_CREATE = 'project.create';
    public const PROJECT_UPDATE = 'project.update';
    public const PROJECT_DELETE = 'project.delete';
    public const PROJECT_MANAGE = 'project.manage';

    // ===================================================================
    // PROJECT COMMENT MODULE
    // ===================================================================
    public const PROJECT_COMMENT_VIEW = 'project.comment.view';
    public const PROJECT_COMMENT_CREATE = 'project.comment.create';
    public const PROJECT_COMMENT_UPDATE = 'project.comment.update';
    public const PROJECT_COMMENT_DELETE = 'project.comment.delete';

    // ===================================================================
    // PROGRESS MODULE
    // ===================================================================
    public const PROGRESS_VIEW = 'progress.view';
    public const PROGRESS_UPDATE = 'progress.update';

    // ===================================================================
    // PROJECT TASK MODULE
    // ===================================================================
    public const PROJECT_TASK_VIEW = 'project.task.view';
    public const PROJECT_TASK_CREATE = 'project.task.create';
    public const PROJECT_TASK_UPDATE = 'project.task.update';
    public const PROJECT_TASK_DELETE = 'project.task.delete';

    // ===================================================================
    // ACCEPTANCE MODULE
    // ===================================================================
    public const ACCEPTANCE_VIEW = 'acceptance.view';
    public const ACCEPTANCE_CREATE = 'acceptance.create';
    public const ACCEPTANCE_UPDATE = 'acceptance.update';
    public const ACCEPTANCE_DELETE = 'acceptance.delete';
    public const ACCEPTANCE_ATTACH_FILES = 'acceptance.attach_files';

    // Approval levels for multi-level approval workflows
    public const ACCEPTANCE_APPROVE_LEVEL_1 = 'acceptance.approve.level_1'; // Supervisor
    public const ACCEPTANCE_APPROVE_LEVEL_2 = 'acceptance.approve.level_2'; // Project Manager
    public const ACCEPTANCE_APPROVE_LEVEL_3 = 'acceptance.approve.level_3'; // Client/Customer

    // ===================================================================
    // COST MODULE
    // ===================================================================
    public const COST_VIEW = 'cost.view';
    public const COST_CREATE = 'cost.create';
    public const COST_UPDATE = 'cost.update';
    public const COST_DELETE = 'cost.delete';
    public const COST_SUBMIT = 'cost.submit';

    // Approval levels for cost approval workflow
    public const COST_APPROVE_MANAGEMENT = 'cost.approve.management'; // Management approval
    public const COST_APPROVE_ACCOUNTANT = 'cost.approve.accountant'; // Accountant confirmation
    public const COST_REJECT = 'cost.reject';

    // ===================================================================
    // ADDITIONAL COST MODULE
    // ===================================================================
    public const ADDITIONAL_COST_VIEW = 'additional_cost.view';
    public const ADDITIONAL_COST_CREATE = 'additional_cost.create';
    public const ADDITIONAL_COST_UPDATE = 'additional_cost.update';
    public const ADDITIONAL_COST_DELETE = 'additional_cost.delete';
    public const ADDITIONAL_COST_APPROVE = 'additional_cost.approve';
    public const ADDITIONAL_COST_REJECT = 'additional_cost.reject';
    public const ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER = 'additional_cost.mark_paid_by_customer';
    public const ADDITIONAL_COST_CONFIRM = 'additional_cost.confirm';

    // ===================================================================
    // COMPANY COST MODULE
    // ===================================================================
    public const COMPANY_COST_VIEW = 'company_cost.view';
    public const COMPANY_COST_CREATE = 'company_cost.create';
    public const COMPANY_COST_UPDATE = 'company_cost.update';
    public const COMPANY_COST_DELETE = 'company_cost.delete';
    public const COMPANY_COST_SUBMIT = 'company_cost.submit';
    public const COMPANY_COST_APPROVE_MANAGEMENT = 'company_cost.approve.management';
    public const COMPANY_COST_APPROVE_ACCOUNTANT = 'company_cost.approve.accountant';
    public const COMPANY_COST_REJECT = 'company_cost.reject';

    // ===================================================================
    // MATERIAL MODULE
    // ===================================================================
    public const MATERIAL_VIEW = 'material.view';
    public const MATERIAL_CREATE = 'material.create';
    public const MATERIAL_UPDATE = 'material.update';
    public const MATERIAL_DELETE = 'material.delete';
    public const MATERIAL_APPROVE = 'material.approve';

    // ===================================================================
    // EQUIPMENT MODULE
    // ===================================================================
    public const EQUIPMENT_VIEW = 'equipment.view';
    public const EQUIPMENT_CREATE = 'equipment.create';
    public const EQUIPMENT_UPDATE = 'equipment.update';
    public const EQUIPMENT_DELETE = 'equipment.delete';
    public const EQUIPMENT_APPROVE = 'equipment.approve';

    // ===================================================================
    // WARRANTY MODULE
    // ===================================================================
    public const WARRANTY_VIEW = 'warranty.view';
    public const WARRANTY_CREATE = 'warranty.create';
    public const WARRANTY_UPDATE = 'warranty.update';
    public const WARRANTY_DELETE = 'warranty.delete';
    public const WARRANTY_APPROVE = 'warranty.approve';


    // ===================================================================
    // REPORT MODULE
    // ===================================================================
    public const REPORT_VIEW = 'report.view';
    public const REPORT_EXPORT = 'report.export';
    public const REPORT_FINANCIAL = 'report.financial';
    public const REPORT_PROGRESS = 'report.progress';

    // ===================================================================
    // INVOICE MODULE (Output - Hóa đơn đầu ra cho khách hàng)
    // ===================================================================
    public const INVOICE_VIEW = 'invoice.view';
    public const INVOICE_CREATE = 'invoice.create';
    public const INVOICE_UPDATE = 'invoice.update';
    public const INVOICE_DELETE = 'invoice.delete';
    public const INVOICE_APPROVE = 'invoice.approve';
    public const INVOICE_SEND = 'invoice.send';

    // ===================================================================
    // INPUT INVOICE MODULE (Input - Hóa đơn đầu vào từ nhà cung cấp)
    // ===================================================================
    public const INPUT_INVOICE_VIEW = 'input_invoice.view';
    public const INPUT_INVOICE_CREATE = 'input_invoice.create';
    public const INPUT_INVOICE_UPDATE = 'input_invoice.update';
    public const INPUT_INVOICE_DELETE = 'input_invoice.delete';

    // ===================================================================
    // CONTRACT MODULE
    // ===================================================================
    public const CONTRACT_VIEW = 'contract.view';
    public const CONTRACT_CREATE = 'contract.create';
    public const CONTRACT_UPDATE = 'contract.update';
    public const CONTRACT_DELETE = 'contract.delete';
    public const CONTRACT_APPROVE_LEVEL_1 = 'contract.approve.level_1';
    public const CONTRACT_APPROVE_LEVEL_2 = 'contract.approve.level_2';

    // ===================================================================
    // PAYMENT MODULE
    // ===================================================================
    public const PAYMENT_VIEW = 'payment.view';
    public const PAYMENT_CREATE = 'payment.create';
    public const PAYMENT_UPDATE = 'payment.update';
    public const PAYMENT_DELETE = 'payment.delete';
    public const PAYMENT_CONFIRM = 'payment.confirm';
    public const PAYMENT_APPROVE = 'payment.approve';
    public const PAYMENT_MARK_AS_PAID_BY_CUSTOMER = 'payment.mark_paid_by_customer';

    // ===================================================================
    // SUBCONTRACTOR MODULE
    // ===================================================================
    public const SUBCONTRACTOR_VIEW = 'subcontractor.view';
    public const SUBCONTRACTOR_CREATE = 'subcontractor.create';
    public const SUBCONTRACTOR_UPDATE = 'subcontractor.update';
    public const SUBCONTRACTOR_DELETE = 'subcontractor.delete';
    public const SUBCONTRACTOR_APPROVE = 'subcontractor.approve';

    // ===================================================================
    // SUBCONTRACTOR PAYMENT MODULE
    // ===================================================================
    public const SUBCONTRACTOR_PAYMENT_VIEW = 'subcontractor_payment.view';
    public const SUBCONTRACTOR_PAYMENT_CREATE = 'subcontractor_payment.create';
    public const SUBCONTRACTOR_PAYMENT_UPDATE = 'subcontractor_payment.update';
    public const SUBCONTRACTOR_PAYMENT_DELETE = 'subcontractor_payment.delete';
    public const SUBCONTRACTOR_PAYMENT_APPROVE = 'subcontractor_payment.approve';
    public const SUBCONTRACTOR_PAYMENT_MARK_PAID = 'subcontractor_payment.mark_paid';

    // ===================================================================
    // DOCUMENT MODULE
    // ===================================================================
    public const DOCUMENT_VIEW = 'document.view';
    public const DOCUMENT_UPLOAD = 'document.upload';
    public const DOCUMENT_DELETE = 'document.delete';

    // ===================================================================
    // CONSTRUCTION LOG MODULE
    // ===================================================================
    public const LOG_VIEW = 'log.view';
    public const LOG_CREATE = 'log.create';
    public const LOG_UPDATE = 'log.update';
    public const LOG_DELETE = 'log.delete';
    public const LOG_APPROVE = 'log.approve';

    // ===================================================================
    // DEFECT MODULE
    // ===================================================================
    public const DEFECT_VIEW = 'defect.view';
    public const DEFECT_CREATE = 'defect.create';
    public const DEFECT_UPDATE = 'defect.update';
    public const DEFECT_DELETE = 'defect.delete';
    public const DEFECT_VERIFY = 'defect.verify';

    // ===================================================================
    // PERSONNEL MODULE
    // ===================================================================
    public const PERSONNEL_VIEW = 'personnel.view';
    public const PERSONNEL_ASSIGN = 'personnel.assign';
    public const PERSONNEL_REMOVE = 'personnel.remove';

    // ===================================================================
    // KPI MODULE
    // ===================================================================
    public const KPI_VIEW = 'kpi.view';
    public const KPI_CREATE = 'kpi.create';
    public const KPI_UPDATE = 'kpi.update';
    public const KPI_DELETE = 'kpi.delete';
    public const KPI_VERIFY = 'kpi.verify';

    // ===================================================================
    // REVENUE MODULE
    // ===================================================================
    public const REVENUE_VIEW = 'revenue.view';
    public const REVENUE_DASHBOARD = 'revenue.dashboard';
    public const REVENUE_EXPORT = 'revenue.export';

    // ===================================================================
    // BUDGET MODULE
    // ===================================================================
    public const BUDGET_VIEW = 'budgets.view';
    public const BUDGET_CREATE = 'budgets.create';
    public const BUDGET_UPDATE = 'budgets.update';
    public const BUDGET_DELETE = 'budgets.delete';
    public const BUDGET_APPROVE = 'budgets.approve';

    // ===================================================================
    // PROJECT PHASE MODULE
    // ===================================================================
    public const PROJECT_PHASE_VIEW = 'project.phase.view';
    public const PROJECT_PHASE_CREATE = 'project.phase.create';
    public const PROJECT_PHASE_UPDATE = 'project.phase.update';
    public const PROJECT_PHASE_DELETE = 'project.phase.delete';

    // ===================================================================
    // PROJECT DOCUMENT MODULE
    // ===================================================================
    public const PROJECT_DOCUMENT_VIEW = 'project.document.view';
    public const PROJECT_DOCUMENT_UPLOAD = 'project.document.upload';
    public const PROJECT_DOCUMENT_DELETE = 'project.document.delete';

    // ===================================================================
    // RECEIPT MODULE
    // ===================================================================
    public const RECEIPT_VIEW = 'receipts.view';
    public const RECEIPT_CREATE = 'receipts.create';
    public const RECEIPT_UPDATE = 'receipts.update';
    public const RECEIPT_DELETE = 'receipts.delete';
    public const RECEIPT_VERIFY = 'receipts.verify';

    // ===================================================================
    // SUPPLIER MODULE
    // ===================================================================
    public const SUPPLIER_VIEW = 'suppliers.view';
    public const SUPPLIER_CREATE = 'suppliers.create';
    public const SUPPLIER_UPDATE = 'suppliers.update';
    public const SUPPLIER_DELETE = 'suppliers.delete';

    // ===================================================================
    // SUPPLIER CONTRACT MODULE
    // ===================================================================
    public const SUPPLIER_CONTRACT_VIEW = 'supplier.contract.view';
    public const SUPPLIER_CONTRACT_CREATE = 'supplier.contract.create';
    public const SUPPLIER_CONTRACT_UPDATE = 'supplier.contract.update';
    public const SUPPLIER_CONTRACT_DELETE = 'supplier.contract.delete';
    public const SUPPLIER_CONTRACT_APPROVE = 'supplier.contract.approve';

    // ===================================================================
    // SUPPLIER ACCEPTANCE MODULE
    // ===================================================================
    public const SUPPLIER_ACCEPTANCE_VIEW = 'supplier.acceptance.view';
    public const SUPPLIER_ACCEPTANCE_CREATE = 'supplier.acceptance.create';
    public const SUPPLIER_ACCEPTANCE_UPDATE = 'supplier.acceptance.update';
    public const SUPPLIER_ACCEPTANCE_DELETE = 'supplier.acceptance.delete';

    // ===================================================================
    // CHANGE REQUEST MODULE
    // ===================================================================
    public const CHANGE_REQUEST_VIEW = 'change_request.view';
    public const CHANGE_REQUEST_CREATE = 'change_request.create';
    public const CHANGE_REQUEST_UPDATE = 'change_request.update';
    public const CHANGE_REQUEST_DELETE = 'change_request.delete';
    public const CHANGE_REQUEST_APPROVE = 'change_request.approve';
    public const CHANGE_REQUEST_REJECT = 'change_request.reject';

    // ===================================================================
    // PROJECT RISK MODULE
    // ===================================================================
    public const PROJECT_RISK_VIEW = 'project.risk.view';
    public const PROJECT_RISK_CREATE = 'project.risk.create';
    public const PROJECT_RISK_UPDATE = 'project.risk.update';
    public const PROJECT_RISK_DELETE = 'project.risk.delete';

    // ===================================================================
    // ISSUE RECORD MODULE
    // ===================================================================
    public const ISSUE_VIEW = 'issue.view';
    public const ISSUE_CREATE = 'issue.create';
    public const ISSUE_UPDATE = 'issue.update';
    public const ISSUE_DELETE = 'issue.delete';
    public const ISSUE_RESOLVE = 'issue.resolve';

    // ===================================================================
    // ACCEPTANCE TEMPLATE MODULE
    // ===================================================================
    public const ACCEPTANCE_TEMPLATE_VIEW = 'acceptance.template.view';
    public const ACCEPTANCE_TEMPLATE_CREATE = 'acceptance.template.create';
    public const ACCEPTANCE_TEMPLATE_UPDATE = 'acceptance.template.update';
    public const ACCEPTANCE_TEMPLATE_DELETE = 'acceptance.template.delete';

    // ===================================================================
    // GANTT / WBS MODULE
    // ===================================================================
    public const GANTT_VIEW = 'gantt.view';
    public const GANTT_UPDATE = 'gantt.update';
    public const WBS_TEMPLATE_VIEW = 'wbs.template.view';
    public const WBS_TEMPLATE_CREATE = 'wbs.template.create';

    // ===================================================================
    // FINANCE MODULE (Cash Flow, P/L, BvA, Debt, Warranty)
    // ===================================================================
    public const FINANCE_VIEW = 'finance.view';
    public const FINANCE_MANAGE = 'finance.manage';

    // ===================================================================
    // ATTENDANCE MODULE
    // ===================================================================
    public const ATTENDANCE_VIEW = 'attendance.view';
    public const ATTENDANCE_CHECK_IN = 'attendance.check_in';
    public const ATTENDANCE_MANAGE = 'attendance.manage';
    public const ATTENDANCE_APPROVE = 'attendance.approve';

    // ===================================================================
    // LABOR PRODUCTIVITY MODULE
    // ===================================================================
    public const LABOR_PRODUCTIVITY_VIEW = 'labor_productivity.view';
    public const LABOR_PRODUCTIVITY_CREATE = 'labor_productivity.create';
    public const LABOR_PRODUCTIVITY_UPDATE = 'labor_productivity.update';
    public const LABOR_PRODUCTIVITY_DELETE = 'labor_productivity.delete';

    // ===================================================================
    // EVM & PREDICTIVE MODULE
    // ===================================================================
    public const EVM_VIEW = 'evm.view';
    public const PREDICTIVE_VIEW = 'predictive.view';

    // ===================================================================
    // COMPANY FINANCIAL REPORT MODULE
    // ===================================================================
    public const COMPANY_FINANCIAL_VIEW = 'company_financial.view';

    // ===================================================================
    // OPERATIONS MODULE (Shareholders, Company Assets)
    // ===================================================================
    public const SHAREHOLDER_VIEW = 'shareholder.view';
    public const SHAREHOLDER_CREATE = 'shareholder.create';
    public const SHAREHOLDER_UPDATE = 'shareholder.update';
    public const SHAREHOLDER_DELETE = 'shareholder.delete';

    public const COMPANY_ASSET_VIEW = 'company_asset.view';
    public const COMPANY_ASSET_CREATE = 'company_asset.create';
    public const COMPANY_ASSET_UPDATE = 'company_asset.update';
    public const COMPANY_ASSET_DELETE = 'company_asset.delete';
    public const COMPANY_ASSET_ASSIGN = 'company_asset.assign';
    public const COMPANY_ASSET_DEPRECIATE = 'company_asset.depreciate';

    public const OPERATIONS_DASHBOARD_VIEW = 'operations.dashboard.view';

    // ===================================================================
    // PROJECT MONITORING MODULE
    // ===================================================================
    public const PROJECT_MONITORING_VIEW = 'project.monitoring.view';

    // ===================================================================
    // PROJECT SUMMARY REPORT MODULE
    // ===================================================================
    public const PROJECT_SUMMARY_REPORT_VIEW = 'report.project_summary.view';

    // ===================================================================
    // SETTINGS MODULE
    // ===================================================================
    public const SETTINGS_MANAGE = 'settings.manage';
    public const SETTINGS_VIEW = 'settings.view';

    // ===================================================================
    // HELPER METHODS
    // ===================================================================

    /**
     * Get all permission constants as an array
     * 
     * @return array<string>
     */
    public static function all(): array
    {
        return [
            self::DASHBOARD_VIEW,
            // Project
            self::PROJECT_VIEW,
            self::PROJECT_CREATE,
            self::PROJECT_UPDATE,
            self::PROJECT_DELETE,
            self::PROJECT_MANAGE,
            // Project Comment
            self::PROJECT_COMMENT_VIEW,
            self::PROJECT_COMMENT_CREATE,
            self::PROJECT_COMMENT_UPDATE,
            self::PROJECT_COMMENT_DELETE,

            // Progress
            self::PROGRESS_VIEW,
            self::PROGRESS_UPDATE,

            // Project Task
            self::PROJECT_TASK_VIEW,
            self::PROJECT_TASK_CREATE,
            self::PROJECT_TASK_UPDATE,
            self::PROJECT_TASK_DELETE,

            // Acceptance
            self::ACCEPTANCE_VIEW,
            self::ACCEPTANCE_CREATE,
            self::ACCEPTANCE_UPDATE,
            self::ACCEPTANCE_DELETE,
            self::ACCEPTANCE_ATTACH_FILES,
            self::ACCEPTANCE_APPROVE_LEVEL_1,
            self::ACCEPTANCE_APPROVE_LEVEL_2,
            self::ACCEPTANCE_APPROVE_LEVEL_3,

            // Cost
            self::COST_VIEW,
            self::COST_CREATE,
            self::COST_UPDATE,
            self::COST_DELETE,
            self::COST_SUBMIT,
            self::COST_APPROVE_MANAGEMENT,
            self::COST_APPROVE_ACCOUNTANT,
            self::COST_REJECT,

            // Company Cost
            self::COMPANY_COST_VIEW,
            self::COMPANY_COST_CREATE,
            self::COMPANY_COST_UPDATE,
            self::COMPANY_COST_DELETE,
            self::COMPANY_COST_SUBMIT,
            self::COMPANY_COST_APPROVE_MANAGEMENT,
            self::COMPANY_COST_APPROVE_ACCOUNTANT,
            self::COMPANY_COST_REJECT,

            // Additional Cost
            self::ADDITIONAL_COST_VIEW,
            self::ADDITIONAL_COST_CREATE,
            self::ADDITIONAL_COST_UPDATE,
            self::ADDITIONAL_COST_DELETE,
            self::ADDITIONAL_COST_APPROVE,
            self::ADDITIONAL_COST_REJECT,
            self::ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER,
            self::ADDITIONAL_COST_CONFIRM,

            // Material
            self::MATERIAL_VIEW,
            self::MATERIAL_CREATE,
            self::MATERIAL_UPDATE,
            self::MATERIAL_DELETE,
            self::MATERIAL_APPROVE,

            // Equipment
            self::EQUIPMENT_VIEW,
            self::EQUIPMENT_CREATE,
            self::EQUIPMENT_UPDATE,
            self::EQUIPMENT_DELETE,
            self::EQUIPMENT_APPROVE,


            // Report
            self::REPORT_VIEW,
            self::REPORT_EXPORT,
            self::REPORT_FINANCIAL,
            self::REPORT_PROGRESS,

            // Invoice
            self::INVOICE_VIEW,
            self::INVOICE_CREATE,
            self::INVOICE_UPDATE,
            self::INVOICE_DELETE,
            self::INVOICE_APPROVE,
            self::INVOICE_SEND,

            // Input Invoice
            self::INPUT_INVOICE_VIEW,
            self::INPUT_INVOICE_CREATE,
            self::INPUT_INVOICE_UPDATE,
            self::INPUT_INVOICE_DELETE,

            // Contract
            self::CONTRACT_VIEW,
            self::CONTRACT_CREATE,
            self::CONTRACT_UPDATE,
            self::CONTRACT_DELETE,
            self::CONTRACT_APPROVE_LEVEL_1,
            self::CONTRACT_APPROVE_LEVEL_2,

            // Payment
            self::PAYMENT_VIEW,
            self::PAYMENT_CREATE,
            self::PAYMENT_UPDATE,
            self::PAYMENT_DELETE,
            self::PAYMENT_CONFIRM,
            self::PAYMENT_MARK_AS_PAID_BY_CUSTOMER,

            // Subcontractor
            self::SUBCONTRACTOR_VIEW,
            self::SUBCONTRACTOR_CREATE,
            self::SUBCONTRACTOR_UPDATE,
            self::SUBCONTRACTOR_DELETE,

            // Subcontractor Payment
            self::SUBCONTRACTOR_PAYMENT_VIEW,
            self::SUBCONTRACTOR_PAYMENT_CREATE,
            self::SUBCONTRACTOR_PAYMENT_UPDATE,
            self::SUBCONTRACTOR_PAYMENT_DELETE,
            self::SUBCONTRACTOR_PAYMENT_APPROVE,
            self::SUBCONTRACTOR_PAYMENT_MARK_PAID,

            // Document
            self::DOCUMENT_VIEW,
            self::DOCUMENT_UPLOAD,
            self::DOCUMENT_DELETE,

            // Construction Log
            self::LOG_VIEW,
            self::LOG_CREATE,
            self::LOG_UPDATE,
            self::LOG_DELETE,
            self::LOG_APPROVE,

            // Defect
            self::DEFECT_VIEW,
            self::DEFECT_CREATE,
            self::DEFECT_UPDATE,
            self::DEFECT_DELETE,
            self::DEFECT_VERIFY,

            // Personnel
            self::PERSONNEL_VIEW,
            self::PERSONNEL_ASSIGN,
            self::PERSONNEL_REMOVE,

            // KPI
            self::KPI_VIEW,
            self::KPI_CREATE,
            self::KPI_UPDATE,
            self::KPI_DELETE,
            self::KPI_VERIFY,

            // Revenue
            self::REVENUE_VIEW,
            self::REVENUE_DASHBOARD,
            self::REVENUE_EXPORT,

            // Budget
            self::BUDGET_VIEW,
            self::BUDGET_CREATE,
            self::BUDGET_UPDATE,
            self::BUDGET_DELETE,
            self::BUDGET_APPROVE,

            // Project Phase
            self::PROJECT_PHASE_VIEW,
            self::PROJECT_PHASE_CREATE,
            self::PROJECT_PHASE_UPDATE,
            self::PROJECT_PHASE_DELETE,

            // Project Document
            self::PROJECT_DOCUMENT_VIEW,
            self::PROJECT_DOCUMENT_UPLOAD,
            self::PROJECT_DOCUMENT_DELETE,

            // Receipt
            self::RECEIPT_VIEW,
            self::RECEIPT_CREATE,
            self::RECEIPT_UPDATE,
            self::RECEIPT_DELETE,
            self::RECEIPT_VERIFY,

            // Supplier
            self::SUPPLIER_VIEW,
            self::SUPPLIER_CREATE,
            self::SUPPLIER_UPDATE,
            self::SUPPLIER_DELETE,

            // Supplier Contract
            self::SUPPLIER_CONTRACT_VIEW,
            self::SUPPLIER_CONTRACT_CREATE,
            self::SUPPLIER_CONTRACT_UPDATE,
            self::SUPPLIER_CONTRACT_DELETE,
            self::SUPPLIER_CONTRACT_APPROVE,

            // Supplier Acceptance
            self::SUPPLIER_ACCEPTANCE_VIEW,
            self::SUPPLIER_ACCEPTANCE_CREATE,
            self::SUPPLIER_ACCEPTANCE_UPDATE,
            self::SUPPLIER_ACCEPTANCE_DELETE,

            // Change Request
            self::CHANGE_REQUEST_VIEW,
            self::CHANGE_REQUEST_CREATE,
            self::CHANGE_REQUEST_UPDATE,
            self::CHANGE_REQUEST_DELETE,
            self::CHANGE_REQUEST_APPROVE,
            self::CHANGE_REQUEST_REJECT,

            // Project Risk
            self::PROJECT_RISK_VIEW,
            self::PROJECT_RISK_CREATE,
            self::PROJECT_RISK_UPDATE,
            self::PROJECT_RISK_DELETE,

            // Issue Record
            self::ISSUE_VIEW,
            self::ISSUE_CREATE,
            self::ISSUE_UPDATE,
            self::ISSUE_DELETE,
            self::ISSUE_RESOLVE,

            // Acceptance Template
            self::ACCEPTANCE_TEMPLATE_VIEW,
            self::ACCEPTANCE_TEMPLATE_CREATE,
            self::ACCEPTANCE_TEMPLATE_UPDATE,
            self::ACCEPTANCE_TEMPLATE_DELETE,

            // Gantt / WBS
            self::GANTT_VIEW,
            self::GANTT_UPDATE,
            self::WBS_TEMPLATE_VIEW,
            self::WBS_TEMPLATE_CREATE,

            // Finance
            self::FINANCE_VIEW,
            self::FINANCE_MANAGE,

            // Attendance
            self::ATTENDANCE_VIEW,
            self::ATTENDANCE_CHECK_IN,
            self::ATTENDANCE_MANAGE,
            self::ATTENDANCE_APPROVE,

            // Labor Productivity
            self::LABOR_PRODUCTIVITY_VIEW,
            self::LABOR_PRODUCTIVITY_CREATE,
            self::LABOR_PRODUCTIVITY_UPDATE,
            self::LABOR_PRODUCTIVITY_DELETE,

            // EVM & Predictive
            self::EVM_VIEW,
            self::PREDICTIVE_VIEW,

            // Company Financial
            self::COMPANY_FINANCIAL_VIEW,

            // Operations
            self::SHAREHOLDER_VIEW,
            self::SHAREHOLDER_CREATE,
            self::SHAREHOLDER_UPDATE,
            self::SHAREHOLDER_DELETE,
            self::COMPANY_ASSET_VIEW,
            self::COMPANY_ASSET_CREATE,
            self::COMPANY_ASSET_UPDATE,
            self::COMPANY_ASSET_DELETE,
            self::COMPANY_ASSET_ASSIGN,
            self::COMPANY_ASSET_DEPRECIATE,
            self::OPERATIONS_DASHBOARD_VIEW,

            // Project Monitoring
            self::PROJECT_MONITORING_VIEW,

            // Project Summary Report
            self::PROJECT_SUMMARY_REPORT_VIEW,

            // Settings
            self::SETTINGS_VIEW,
            self::SETTINGS_MANAGE,

            // Warranty
            self::WARRANTY_VIEW,
            self::WARRANTY_CREATE,
            self::WARRANTY_UPDATE,
            self::WARRANTY_DELETE,
            self::WARRANTY_APPROVE,
        ];
    }

    /**
     * Get permissions grouped by module
     * 
     * @return array<string, array<string>>
     */
    public static function groupedByModule(): array
    {
        return [
            'dashboard' => [
                self::DASHBOARD_VIEW,
            ],
            'project' => [
                self::PROJECT_VIEW,
                self::PROJECT_CREATE,
                self::PROJECT_UPDATE,
                self::PROJECT_DELETE,
                self::PROJECT_MANAGE,
                // Project Comments
                self::PROJECT_COMMENT_VIEW,
                self::PROJECT_COMMENT_CREATE,
                self::PROJECT_COMMENT_UPDATE,
                self::PROJECT_COMMENT_DELETE,
            ],
            'progress' => [
                self::PROGRESS_VIEW,
                self::PROGRESS_UPDATE,
            ],
            'acceptance' => [
                self::ACCEPTANCE_VIEW,
                self::ACCEPTANCE_CREATE,
                self::ACCEPTANCE_UPDATE,
                self::ACCEPTANCE_DELETE,
                self::ACCEPTANCE_ATTACH_FILES,
                self::ACCEPTANCE_APPROVE_LEVEL_1,
                self::ACCEPTANCE_APPROVE_LEVEL_2,
                self::ACCEPTANCE_APPROVE_LEVEL_3,
            ],
            'cost' => [
                self::COST_VIEW,
                self::COST_CREATE,
                self::COST_UPDATE,
                self::COST_DELETE,
                self::COST_SUBMIT,
                self::COST_APPROVE_MANAGEMENT,
                self::COST_APPROVE_ACCOUNTANT,
                self::COST_REJECT,
            ],
            'company_cost' => [
                self::COMPANY_COST_VIEW,
                self::COMPANY_COST_CREATE,
                self::COMPANY_COST_UPDATE,
                self::COMPANY_COST_DELETE,
                self::COMPANY_COST_SUBMIT,
                self::COMPANY_COST_APPROVE_MANAGEMENT,
                self::COMPANY_COST_APPROVE_ACCOUNTANT,
                self::COMPANY_COST_REJECT,
            ],
            'additional_cost' => [
                self::ADDITIONAL_COST_VIEW,
                self::ADDITIONAL_COST_CREATE,
                self::ADDITIONAL_COST_UPDATE,
                self::ADDITIONAL_COST_DELETE,
                self::ADDITIONAL_COST_APPROVE,
                self::ADDITIONAL_COST_REJECT,
                self::ADDITIONAL_COST_MARK_AS_PAID_BY_CUSTOMER,
                self::ADDITIONAL_COST_CONFIRM,
            ],
            'material' => [
                self::MATERIAL_VIEW,
                self::MATERIAL_CREATE,
                self::MATERIAL_UPDATE,
                self::MATERIAL_DELETE,
                self::MATERIAL_APPROVE,
            ],
            'equipment' => [
                self::EQUIPMENT_VIEW,
                self::EQUIPMENT_CREATE,
                self::EQUIPMENT_UPDATE,
                self::EQUIPMENT_DELETE,
                self::EQUIPMENT_APPROVE,
            ],
            'hr' => [],
            'report' => [
                self::REPORT_VIEW,
                self::REPORT_EXPORT,
                self::REPORT_FINANCIAL,
                self::REPORT_PROGRESS,
            ],
            'invoice' => [
                self::INVOICE_VIEW,
                self::INVOICE_CREATE,
                self::INVOICE_UPDATE,
                self::INVOICE_DELETE,
                self::INVOICE_APPROVE,
                self::INVOICE_SEND,
            ],
            'input_invoice' => [
                self::INPUT_INVOICE_VIEW,
                self::INPUT_INVOICE_CREATE,
                self::INPUT_INVOICE_UPDATE,
                self::INPUT_INVOICE_DELETE,
            ],
            'contract' => [
                self::CONTRACT_VIEW,
                self::CONTRACT_CREATE,
                self::CONTRACT_UPDATE,
                self::CONTRACT_DELETE,
                self::CONTRACT_APPROVE_LEVEL_1,
                self::CONTRACT_APPROVE_LEVEL_2,
            ],
            'payment' => [
                self::PAYMENT_VIEW,
                self::PAYMENT_CREATE,
                self::PAYMENT_UPDATE,
                self::PAYMENT_DELETE,
                self::PAYMENT_CONFIRM,
                self::PAYMENT_MARK_AS_PAID_BY_CUSTOMER,
            ],
            'subcontractor' => [
                self::SUBCONTRACTOR_VIEW,
                self::SUBCONTRACTOR_CREATE,
                self::SUBCONTRACTOR_UPDATE,
                self::SUBCONTRACTOR_DELETE,
            ],
            'subcontractor_payment' => [
                self::SUBCONTRACTOR_PAYMENT_VIEW,
                self::SUBCONTRACTOR_PAYMENT_CREATE,
                self::SUBCONTRACTOR_PAYMENT_UPDATE,
                self::SUBCONTRACTOR_PAYMENT_DELETE,
                self::SUBCONTRACTOR_PAYMENT_APPROVE,
                self::SUBCONTRACTOR_PAYMENT_MARK_PAID,
            ],
            'document' => [
                self::DOCUMENT_VIEW,
                self::DOCUMENT_UPLOAD,
                self::DOCUMENT_DELETE,
            ],
            'log' => [
                self::LOG_VIEW,
                self::LOG_CREATE,
                self::LOG_UPDATE,
                self::LOG_DELETE,
                self::LOG_APPROVE,
            ],
            'defect' => [
                self::DEFECT_VIEW,
                self::DEFECT_CREATE,
                self::DEFECT_UPDATE,
                self::DEFECT_DELETE,
                self::DEFECT_VERIFY,
            ],
            'personnel' => [
                self::PERSONNEL_VIEW,
                self::PERSONNEL_ASSIGN,
                self::PERSONNEL_REMOVE,
            ],
            'kpi' => [
                self::KPI_VIEW,
                self::KPI_CREATE,
                self::KPI_UPDATE,
                self::KPI_DELETE,
                self::KPI_VERIFY,
            ],
            'revenue' => [
                self::REVENUE_VIEW,
                self::REVENUE_DASHBOARD,
                self::REVENUE_EXPORT,
            ],
            'receipt' => [
                self::RECEIPT_VIEW,
                self::RECEIPT_CREATE,
                self::RECEIPT_UPDATE,
                self::RECEIPT_DELETE,
                self::RECEIPT_VERIFY,
            ],
            'supplier' => [
                self::SUPPLIER_VIEW,
                self::SUPPLIER_CREATE,
                self::SUPPLIER_UPDATE,
                self::SUPPLIER_DELETE,
            ],
            'supplier_contract' => [
                self::SUPPLIER_CONTRACT_VIEW,
                self::SUPPLIER_CONTRACT_CREATE,
                self::SUPPLIER_CONTRACT_UPDATE,
                self::SUPPLIER_CONTRACT_DELETE,
                self::SUPPLIER_CONTRACT_APPROVE,
            ],
            'supplier_acceptance' => [
                self::SUPPLIER_ACCEPTANCE_VIEW,
                self::SUPPLIER_ACCEPTANCE_CREATE,
                self::SUPPLIER_ACCEPTANCE_UPDATE,
                self::SUPPLIER_ACCEPTANCE_DELETE,
            ],
            'change_request' => [
                self::CHANGE_REQUEST_VIEW,
                self::CHANGE_REQUEST_CREATE,
                self::CHANGE_REQUEST_UPDATE,
                self::CHANGE_REQUEST_DELETE,
                self::CHANGE_REQUEST_APPROVE,
                self::CHANGE_REQUEST_REJECT,
            ],
            'project_risk' => [
                self::PROJECT_RISK_VIEW,
                self::PROJECT_RISK_CREATE,
                self::PROJECT_RISK_UPDATE,
                self::PROJECT_RISK_DELETE,
            ],
            'issue' => [
                self::ISSUE_VIEW,
                self::ISSUE_CREATE,
                self::ISSUE_UPDATE,
                self::ISSUE_DELETE,
                self::ISSUE_RESOLVE,
            ],
            'acceptance_template' => [
                self::ACCEPTANCE_TEMPLATE_VIEW,
                self::ACCEPTANCE_TEMPLATE_CREATE,
                self::ACCEPTANCE_TEMPLATE_UPDATE,
                self::ACCEPTANCE_TEMPLATE_DELETE,
            ],
            'gantt' => [
                self::GANTT_VIEW,
                self::GANTT_UPDATE,
                self::WBS_TEMPLATE_VIEW,
                self::WBS_TEMPLATE_CREATE,
            ],
            'finance' => [
                self::FINANCE_VIEW,
                self::FINANCE_MANAGE,
            ],
            'attendance' => [
                self::ATTENDANCE_VIEW,
                self::ATTENDANCE_CHECK_IN,
                self::ATTENDANCE_MANAGE,
                self::ATTENDANCE_APPROVE,
            ],
            'labor_productivity' => [
                self::LABOR_PRODUCTIVITY_VIEW,
                self::LABOR_PRODUCTIVITY_CREATE,
                self::LABOR_PRODUCTIVITY_UPDATE,
                self::LABOR_PRODUCTIVITY_DELETE,
            ],
            'evm_predictive' => [
                self::EVM_VIEW,
                self::PREDICTIVE_VIEW,
            ],
            'company_financial' => [
                self::COMPANY_FINANCIAL_VIEW,
            ],
            'operations' => [
                self::OPERATIONS_DASHBOARD_VIEW,
                self::SHAREHOLDER_VIEW,
                self::SHAREHOLDER_CREATE,
                self::SHAREHOLDER_UPDATE,
                self::SHAREHOLDER_DELETE,
                self::COMPANY_ASSET_VIEW,
                self::COMPANY_ASSET_CREATE,
                self::COMPANY_ASSET_UPDATE,
                self::COMPANY_ASSET_DELETE,
                self::COMPANY_ASSET_ASSIGN,
                self::COMPANY_ASSET_DEPRECIATE,
            ],
            'project_monitoring' => [
                self::PROJECT_MONITORING_VIEW,
            ],
            'project_summary_report' => [
                self::PROJECT_SUMMARY_REPORT_VIEW,
            ],
            'warranty' => [
                self::WARRANTY_VIEW,
                self::WARRANTY_CREATE,
                self::WARRANTY_UPDATE,
                self::WARRANTY_DELETE,
                self::WARRANTY_APPROVE,
            ],
        ];
    }
}
