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
    // PROJECT MODULE
    // ===================================================================
    public const PROJECT_VIEW = 'project.view';
    public const PROJECT_CREATE = 'project.create';
    public const PROJECT_UPDATE = 'project.update';
    public const PROJECT_DELETE = 'project.delete';
    public const PROJECT_MANAGE = 'project.manage';

    // ===================================================================
    // PROGRESS MODULE
    // ===================================================================
    public const PROGRESS_VIEW = 'progress.view';
    public const PROGRESS_UPDATE = 'progress.update';

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
    // HR MODULE - TIME TRACKING
    // ===================================================================
    public const HR_TIME_TRACKING_VIEW = 'hr.time_tracking.view';
    public const HR_TIME_TRACKING_CREATE = 'hr.time_tracking.create';
    public const HR_TIME_TRACKING_UPDATE = 'hr.time_tracking.update';
    public const HR_TIME_TRACKING_DELETE = 'hr.time_tracking.delete';
    public const HR_TIME_TRACKING_APPROVE = 'hr.time_tracking.approve';
    public const HR_TIME_TRACKING_REJECT = 'hr.time_tracking.reject';
    public const HR_TIME_TRACKING_CHECK_IN = 'hr.time_tracking.check_in';
    public const HR_TIME_TRACKING_CHECK_OUT = 'hr.time_tracking.check_out';

    // ===================================================================
    // HR MODULE - PAYROLL
    // ===================================================================
    public const HR_PAYROLL_VIEW = 'hr.payroll.view';
    public const HR_PAYROLL_CALCULATE = 'hr.payroll.calculate';
    public const HR_PAYROLL_APPROVE = 'hr.payroll.approve';
    public const HR_PAYROLL_PAY = 'hr.payroll.pay';
    public const HR_PAYROLL_EXPORT = 'hr.payroll.export';

    // ===================================================================
    // HR MODULE - BONUSES
    // ===================================================================
    public const HR_BONUS_VIEW = 'hr.bonus.view';
    public const HR_BONUS_CREATE = 'hr.bonus.create';
    public const HR_BONUS_UPDATE = 'hr.bonus.update';
    public const HR_BONUS_DELETE = 'hr.bonus.delete';
    public const HR_BONUS_APPROVE = 'hr.bonus.approve';
    public const HR_BONUS_PAY = 'hr.bonus.pay';

    // ===================================================================
    // HR MODULE - EMPLOYEES
    // ===================================================================
    public const HR_EMPLOYEE_VIEW = 'hr.employee.view';
    public const HR_EMPLOYEE_CREATE = 'hr.employee.create';
    public const HR_EMPLOYEE_UPDATE = 'hr.employee.update';
    public const HR_EMPLOYEE_DELETE = 'hr.employee.delete';

    // ===================================================================
    // REPORT MODULE
    // ===================================================================
    public const REPORT_VIEW = 'report.view';
    public const REPORT_EXPORT = 'report.export';
    public const REPORT_FINANCIAL = 'report.financial';
    public const REPORT_PROGRESS = 'report.progress';
    public const REPORT_HR = 'report.hr';

    // ===================================================================
    // INVOICE MODULE
    // ===================================================================
    public const INVOICE_VIEW = 'invoice.view';
    public const INVOICE_CREATE = 'invoice.create';
    public const INVOICE_UPDATE = 'invoice.update';
    public const INVOICE_DELETE = 'invoice.delete';
    public const INVOICE_APPROVE = 'invoice.approve';
    public const INVOICE_SEND = 'invoice.send';

    // ===================================================================
    // CONTRACT MODULE
    // ===================================================================
    public const CONTRACT_VIEW = 'contract.view';
    public const CONTRACT_CREATE = 'contract.create';
    public const CONTRACT_UPDATE = 'contract.update';
    public const CONTRACT_DELETE = 'contract.delete';
    public const CONTRACT_APPROVE = 'contract.approve';

    // ===================================================================
    // PAYMENT MODULE
    // ===================================================================
    public const PAYMENT_VIEW = 'payment.view';
    public const PAYMENT_CREATE = 'payment.create';
    public const PAYMENT_UPDATE = 'payment.update';
    public const PAYMENT_DELETE = 'payment.delete';
    public const PAYMENT_CONFIRM = 'payment.confirm';

    // ===================================================================
    // SUBCONTRACTOR MODULE
    // ===================================================================
    public const SUBCONTRACTOR_VIEW = 'subcontractor.view';
    public const SUBCONTRACTOR_CREATE = 'subcontractor.create';
    public const SUBCONTRACTOR_UPDATE = 'subcontractor.update';
    public const SUBCONTRACTOR_DELETE = 'subcontractor.delete';

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
    // REVENUE MODULE
    // ===================================================================
    public const REVENUE_VIEW = 'revenue.view';
    public const REVENUE_DASHBOARD = 'revenue.dashboard';
    public const REVENUE_EXPORT = 'revenue.export';

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
            // Project
            self::PROJECT_VIEW,
            self::PROJECT_CREATE,
            self::PROJECT_UPDATE,
            self::PROJECT_DELETE,
            self::PROJECT_MANAGE,

            // Progress
            self::PROGRESS_VIEW,
            self::PROGRESS_UPDATE,

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

            // Additional Cost
            self::ADDITIONAL_COST_VIEW,
            self::ADDITIONAL_COST_CREATE,
            self::ADDITIONAL_COST_UPDATE,
            self::ADDITIONAL_COST_DELETE,
            self::ADDITIONAL_COST_APPROVE,
            self::ADDITIONAL_COST_REJECT,

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

            // HR - Time Tracking
            self::HR_TIME_TRACKING_VIEW,
            self::HR_TIME_TRACKING_CREATE,
            self::HR_TIME_TRACKING_UPDATE,
            self::HR_TIME_TRACKING_DELETE,
            self::HR_TIME_TRACKING_APPROVE,
            self::HR_TIME_TRACKING_REJECT,
            self::HR_TIME_TRACKING_CHECK_IN,
            self::HR_TIME_TRACKING_CHECK_OUT,

            // HR - Payroll
            self::HR_PAYROLL_VIEW,
            self::HR_PAYROLL_CALCULATE,
            self::HR_PAYROLL_APPROVE,
            self::HR_PAYROLL_PAY,
            self::HR_PAYROLL_EXPORT,

            // HR - Bonus
            self::HR_BONUS_VIEW,
            self::HR_BONUS_CREATE,
            self::HR_BONUS_UPDATE,
            self::HR_BONUS_DELETE,
            self::HR_BONUS_APPROVE,
            self::HR_BONUS_PAY,

            // HR - Employee
            self::HR_EMPLOYEE_VIEW,
            self::HR_EMPLOYEE_CREATE,
            self::HR_EMPLOYEE_UPDATE,
            self::HR_EMPLOYEE_DELETE,

            // Report
            self::REPORT_VIEW,
            self::REPORT_EXPORT,
            self::REPORT_FINANCIAL,
            self::REPORT_PROGRESS,
            self::REPORT_HR,

            // Invoice
            self::INVOICE_VIEW,
            self::INVOICE_CREATE,
            self::INVOICE_UPDATE,
            self::INVOICE_DELETE,
            self::INVOICE_APPROVE,
            self::INVOICE_SEND,

            // Contract
            self::CONTRACT_VIEW,
            self::CONTRACT_CREATE,
            self::CONTRACT_UPDATE,
            self::CONTRACT_DELETE,
            self::CONTRACT_APPROVE,

            // Payment
            self::PAYMENT_VIEW,
            self::PAYMENT_CREATE,
            self::PAYMENT_UPDATE,
            self::PAYMENT_DELETE,
            self::PAYMENT_CONFIRM,

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

            // Revenue
            self::REVENUE_VIEW,
            self::REVENUE_DASHBOARD,
            self::REVENUE_EXPORT,

            // Settings
            self::SETTINGS_VIEW,
            self::SETTINGS_MANAGE,
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
            'project' => [
                self::PROJECT_VIEW,
                self::PROJECT_CREATE,
                self::PROJECT_UPDATE,
                self::PROJECT_DELETE,
                self::PROJECT_MANAGE,
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
            'additional_cost' => [
                self::ADDITIONAL_COST_VIEW,
                self::ADDITIONAL_COST_CREATE,
                self::ADDITIONAL_COST_UPDATE,
                self::ADDITIONAL_COST_DELETE,
                self::ADDITIONAL_COST_APPROVE,
                self::ADDITIONAL_COST_REJECT,
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
            'hr' => [
                // Time Tracking
                self::HR_TIME_TRACKING_VIEW,
                self::HR_TIME_TRACKING_CREATE,
                self::HR_TIME_TRACKING_UPDATE,
                self::HR_TIME_TRACKING_DELETE,
                self::HR_TIME_TRACKING_APPROVE,
                self::HR_TIME_TRACKING_REJECT,
                self::HR_TIME_TRACKING_CHECK_IN,
                self::HR_TIME_TRACKING_CHECK_OUT,
                // Payroll
                self::HR_PAYROLL_VIEW,
                self::HR_PAYROLL_CALCULATE,
                self::HR_PAYROLL_APPROVE,
                self::HR_PAYROLL_PAY,
                self::HR_PAYROLL_EXPORT,
                // Bonus
                self::HR_BONUS_VIEW,
                self::HR_BONUS_CREATE,
                self::HR_BONUS_UPDATE,
                self::HR_BONUS_DELETE,
                self::HR_BONUS_APPROVE,
                self::HR_BONUS_PAY,
                // Employee
                self::HR_EMPLOYEE_VIEW,
                self::HR_EMPLOYEE_CREATE,
                self::HR_EMPLOYEE_UPDATE,
                self::HR_EMPLOYEE_DELETE,
            ],
            'report' => [
                self::REPORT_VIEW,
                self::REPORT_EXPORT,
                self::REPORT_FINANCIAL,
                self::REPORT_PROGRESS,
                self::REPORT_HR,
            ],
            'invoice' => [
                self::INVOICE_VIEW,
                self::INVOICE_CREATE,
                self::INVOICE_UPDATE,
                self::INVOICE_DELETE,
                self::INVOICE_APPROVE,
                self::INVOICE_SEND,
            ],
            'contract' => [
                self::CONTRACT_VIEW,
                self::CONTRACT_CREATE,
                self::CONTRACT_UPDATE,
                self::CONTRACT_DELETE,
                self::CONTRACT_APPROVE,
            ],
            'payment' => [
                self::PAYMENT_VIEW,
                self::PAYMENT_CREATE,
                self::PAYMENT_UPDATE,
                self::PAYMENT_DELETE,
                self::PAYMENT_CONFIRM,
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
            'revenue' => [
                self::REVENUE_VIEW,
                self::REVENUE_DASHBOARD,
                self::REVENUE_EXPORT,
            ],
        ];
    }
}
