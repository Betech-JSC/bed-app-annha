/**
 * Permission Constants
 * 
 * These constants match the backend Permission constants.
 * Always use these constants instead of hardcoded strings.
 */

export const Permissions = {
    // ===================================================================
    // PROJECT MODULE
    // ===================================================================
    PROJECT_VIEW: 'project.view',
    PROJECT_CREATE: 'project.create',
    PROJECT_UPDATE: 'project.update',
    PROJECT_DELETE: 'project.delete',
    PROJECT_MANAGE: 'project.manage',

    // ===================================================================
    // PROJECT COMMENT MODULE
    // ===================================================================
    PROJECT_COMMENT_VIEW: 'project.comment.view',
    PROJECT_COMMENT_CREATE: 'project.comment.create',
    PROJECT_COMMENT_UPDATE: 'project.comment.update',
    PROJECT_COMMENT_DELETE: 'project.comment.delete',

    // ===================================================================
    // PROGRESS MODULE
    // ===================================================================
    PROGRESS_VIEW: 'progress.view',
    PROGRESS_UPDATE: 'progress.update',

    // ===================================================================
    // ACCEPTANCE MODULE
    // ===================================================================
    ACCEPTANCE_VIEW: 'acceptance.view',
    ACCEPTANCE_CREATE: 'acceptance.create',
    ACCEPTANCE_UPDATE: 'acceptance.update',
    ACCEPTANCE_DELETE: 'acceptance.delete',
    ACCEPTANCE_ATTACH_FILES: 'acceptance.attach_files',
    ACCEPTANCE_APPROVE_LEVEL_1: 'acceptance.approve.level_1',
    ACCEPTANCE_APPROVE_LEVEL_2: 'acceptance.approve.level_2',
    ACCEPTANCE_APPROVE_LEVEL_3: 'acceptance.approve.level_3',

    // ===================================================================
    // COST MODULE
    // ===================================================================
    COST_VIEW: 'cost.view',
    COST_CREATE: 'cost.create',
    COST_UPDATE: 'cost.update',
    COST_DELETE: 'cost.delete',
    COST_SUBMIT: 'cost.submit',
    COST_APPROVE_MANAGEMENT: 'cost.approve.management',
    COST_APPROVE_ACCOUNTANT: 'cost.approve.accountant',
    COST_REJECT: 'cost.reject',

    // ===================================================================
    // ADDITIONAL COST MODULE
    // ===================================================================
    ADDITIONAL_COST_VIEW: 'additional_cost.view',
    ADDITIONAL_COST_CREATE: 'additional_cost.create',
    ADDITIONAL_COST_UPDATE: 'additional_cost.update',
    ADDITIONAL_COST_DELETE: 'additional_cost.delete',
    ADDITIONAL_COST_APPROVE: 'additional_cost.approve',
    ADDITIONAL_COST_REJECT: 'additional_cost.reject',

    // ===================================================================
    // MATERIAL MODULE
    // ===================================================================
    MATERIAL_VIEW: 'material.view',
    MATERIAL_CREATE: 'material.create',
    MATERIAL_UPDATE: 'material.update',
    MATERIAL_DELETE: 'material.delete',
    MATERIAL_APPROVE: 'material.approve',

    // ===================================================================
    // EQUIPMENT MODULE
    // ===================================================================
    EQUIPMENT_VIEW: 'equipment.view',
    EQUIPMENT_CREATE: 'equipment.create',
    EQUIPMENT_UPDATE: 'equipment.update',
    EQUIPMENT_DELETE: 'equipment.delete',
    EQUIPMENT_APPROVE: 'equipment.approve',

    // ===================================================================
    // HR MODULE - TIME TRACKING
    // ===================================================================
    HR_TIME_TRACKING_VIEW: 'hr.time_tracking.view',
    HR_TIME_TRACKING_CREATE: 'hr.time_tracking.create',
    HR_TIME_TRACKING_UPDATE: 'hr.time_tracking.update',
    HR_TIME_TRACKING_DELETE: 'hr.time_tracking.delete',
    HR_TIME_TRACKING_APPROVE: 'hr.time_tracking.approve',
    HR_TIME_TRACKING_REJECT: 'hr.time_tracking.reject',
    HR_TIME_TRACKING_CHECK_IN: 'hr.time_tracking.check_in',
    HR_TIME_TRACKING_CHECK_OUT: 'hr.time_tracking.check_out',

    // ===================================================================
    // HR MODULE - PAYROLL
    // ===================================================================
    HR_PAYROLL_VIEW: 'hr.payroll.view',
    HR_PAYROLL_CALCULATE: 'hr.payroll.calculate',
    HR_PAYROLL_APPROVE: 'hr.payroll.approve',
    HR_PAYROLL_PAY: 'hr.payroll.pay',
    HR_PAYROLL_EXPORT: 'hr.payroll.export',

    // ===================================================================
    // HR MODULE - BONUSES
    // ===================================================================
    HR_BONUS_VIEW: 'hr.bonus.view',
    HR_BONUS_CREATE: 'hr.bonus.create',
    HR_BONUS_UPDATE: 'hr.bonus.update',
    HR_BONUS_DELETE: 'hr.bonus.delete',
    HR_BONUS_APPROVE: 'hr.bonus.approve',
    HR_BONUS_PAY: 'hr.bonus.pay',

    // ===================================================================
    // HR MODULE - EMPLOYEES
    // ===================================================================
    HR_EMPLOYEE_VIEW: 'hr.employee.view',
    HR_EMPLOYEE_CREATE: 'hr.employee.create',
    HR_EMPLOYEE_UPDATE: 'hr.employee.update',
    HR_EMPLOYEE_DELETE: 'hr.employee.delete',

    // ===================================================================
    // REPORT MODULE
    // ===================================================================
    REPORT_VIEW: 'report.view',
    REPORT_EXPORT: 'report.export',
    REPORT_FINANCIAL: 'report.financial',
    REPORT_PROGRESS: 'report.progress',
    REPORT_HR: 'report.hr',

    // ===================================================================
    // INVOICE MODULE (Output - Hóa đơn đầu ra cho khách hàng)
    // ===================================================================
    INVOICE_VIEW: 'invoice.view',
    INVOICE_CREATE: 'invoice.create',
    INVOICE_UPDATE: 'invoice.update',
    INVOICE_DELETE: 'invoice.delete',
    INVOICE_APPROVE: 'invoice.approve',
    INVOICE_SEND: 'invoice.send',

    // ===================================================================
    // INPUT INVOICE MODULE (Input - Hóa đơn đầu vào từ nhà cung cấp)
    // ===================================================================
    INPUT_INVOICE_VIEW: 'input_invoice.view',
    INPUT_INVOICE_CREATE: 'input_invoice.create',
    INPUT_INVOICE_UPDATE: 'input_invoice.update',
    INPUT_INVOICE_DELETE: 'input_invoice.delete',

    // ===================================================================
    // CONTRACT MODULE
    // ===================================================================
    CONTRACT_VIEW: 'contract.view',
    CONTRACT_CREATE: 'contract.create',
    CONTRACT_UPDATE: 'contract.update',
    CONTRACT_DELETE: 'contract.delete',
    CONTRACT_APPROVE_LEVEL_1: 'contract.approve.level_1',
    CONTRACT_APPROVE_LEVEL_2: 'contract.approve.level_2',

    // ===================================================================
    // PAYMENT MODULE
    // ===================================================================
    PAYMENT_VIEW: 'payment.view',
    PAYMENT_CREATE: 'payment.create',
    PAYMENT_UPDATE: 'payment.update',
    PAYMENT_DELETE: 'payment.delete',
    PAYMENT_CONFIRM: 'payment.confirm',
    PAYMENT_APPROVE: 'payment.approve',

    // ===================================================================
    // SUBCONTRACTOR MODULE
    // ===================================================================
    SUBCONTRACTOR_VIEW: 'subcontractor.view',
    SUBCONTRACTOR_CREATE: 'subcontractor.create',
    SUBCONTRACTOR_UPDATE: 'subcontractor.update',
    SUBCONTRACTOR_DELETE: 'subcontractor.delete',

    // ===================================================================
    // SUBCONTRACTOR PAYMENT MODULE
    // ===================================================================
    SUBCONTRACTOR_PAYMENT_VIEW: 'subcontractor_payment.view',
    SUBCONTRACTOR_PAYMENT_CREATE: 'subcontractor_payment.create',
    SUBCONTRACTOR_PAYMENT_UPDATE: 'subcontractor_payment.update',
    SUBCONTRACTOR_PAYMENT_DELETE: 'subcontractor_payment.delete',
    SUBCONTRACTOR_PAYMENT_APPROVE: 'subcontractor_payment.approve',
    SUBCONTRACTOR_PAYMENT_MARK_PAID: 'subcontractor_payment.mark_paid',

    // ===================================================================
    // DOCUMENT MODULE
    // ===================================================================
    DOCUMENT_VIEW: 'document.view',
    DOCUMENT_UPLOAD: 'document.upload',
    DOCUMENT_DELETE: 'document.delete',

    // ===================================================================
    // CONSTRUCTION LOG MODULE
    // ===================================================================
    LOG_VIEW: 'log.view',
    LOG_CREATE: 'log.create',
    LOG_UPDATE: 'log.update',
    LOG_DELETE: 'log.delete',

    // ===================================================================
    // DEFECT MODULE
    // ===================================================================
    DEFECT_VIEW: 'defect.view',
    DEFECT_CREATE: 'defect.create',
    DEFECT_UPDATE: 'defect.update',
    DEFECT_DELETE: 'defect.delete',
    DEFECT_VERIFY: 'defect.verify',

    // ===================================================================
    // PERSONNEL MODULE
    // ===================================================================
    PERSONNEL_VIEW: 'personnel.view',
    PERSONNEL_ASSIGN: 'personnel.assign',
    PERSONNEL_REMOVE: 'personnel.remove',

    // ===================================================================
    // REVENUE MODULE
    // ===================================================================
    REVENUE_VIEW: 'revenue.view',
    REVENUE_DASHBOARD: 'revenue.dashboard',
    REVENUE_EXPORT: 'revenue.export',

    // ===================================================================
    // SETTINGS MODULE
    // ===================================================================
    SETTINGS_VIEW: 'settings.view',
    SETTINGS_MANAGE: 'settings.manage',
} as const;

// Type for permission values
export type Permission = typeof Permissions[keyof typeof Permissions];

// Helper function to get all permissions as array
export const getAllPermissions = (): string[] => {
    return Object.values(Permissions);
};

// Helper function to check if a string is a valid permission
export const isValidPermission = (permission: string): boolean => {
    return Object.values(Permissions).includes(permission as Permission);
};
