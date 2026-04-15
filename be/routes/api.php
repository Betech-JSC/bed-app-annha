<?php

use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ContractController;
use App\Http\Controllers\Api\ProjectPaymentController;
use App\Http\Controllers\Api\AdditionalCostController;
use App\Http\Controllers\Api\ProjectPersonnelController;
use App\Http\Controllers\Api\SubcontractorController;
use App\Http\Controllers\Api\SubcontractorItemController;
use App\Http\Controllers\Api\ConstructionLogController;
use App\Http\Controllers\Api\GlobalSubcontractorController;
use App\Http\Controllers\Api\CostGroupController;
use App\Http\Controllers\Api\AcceptanceStageController;
use App\Http\Controllers\Api\AcceptanceTemplateController;
use App\Http\Controllers\Api\DefectController;
use App\Http\Controllers\Api\ProjectProgressController;
use App\Http\Controllers\Api\ProjectRiskController;
use App\Http\Controllers\Api\ChangeRequestController;
use App\Http\Controllers\Api\ProjectEvmController;
use App\Http\Controllers\Api\PredictiveAnalyticsController;
use App\Http\Controllers\Api\ProjectCommentController;
use App\Http\Controllers\Api\ProjectWarrantyController;
use App\Http\Controllers\Api\ProjectSummaryReportController;
use App\Http\Controllers\Api\ProjectMonitoringController;
use App\Http\Controllers\Api\ProjectDocumentController;
use App\Http\Controllers\Api\RevenueController;
use App\Http\Controllers\Api\CostController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SubcontractorPaymentController;
use App\Http\Controllers\Api\ProjectPhaseController;
use App\Http\Controllers\Api\ProjectTaskController;
use App\Http\Controllers\Api\ProjectTaskDependencyController;
use App\Http\Controllers\Api\AcceptanceItemController;
use App\Http\Controllers\Api\DepartmentController;
use App\Http\Controllers\Api\MaterialController;
use App\Http\Controllers\Api\EquipmentController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\InputInvoiceController;
use App\Http\Controllers\Api\ReceiptController;
use App\Http\Controllers\Api\ReminderController;
use App\Http\Controllers\Api\OptionsController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\SubcontractorAcceptanceController;
use App\Http\Controllers\Api\SubcontractorContractController;
use App\Http\Controllers\Api\SubcontractorProgressController;
use App\Http\Controllers\Api\SupplierAcceptanceController;
use App\Http\Controllers\Api\SupplierContractController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\KpiController;
use App\Http\Controllers\Api\OfficeKpiController;
// NOTE: TeamController, TeamContractController, LaborStandardController removed — models don't exist
use App\Http\Controllers\Api\ApprovalCenterController;
use App\Http\Controllers\Api\WbsTemplateController;
use App\Http\Controllers\Api\GanttController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\MaterialQuotaController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\LaborProductivityController;
use App\Http\Controllers\Api\OperationsController;
use App\Http\Controllers\Api\EquipmentRentalController;
use App\Http\Controllers\Api\EquipmentPurchaseController;
use App\Http\Controllers\Api\AssetUsageController;
use App\Http\Controllers\Api\EquipmentCategoryController;

Route::post('login', [AuthController::class, 'login']);
Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('reset-password', [AuthController::class, 'resetPassword']);
Route::post('/users/save-token', [UserController::class, 'savePushToken']);

Route::middleware('auth:sanctum')->group(function () {

    Route::post('logout', [AuthController::class, 'logout']);


    // Notifications
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::get('/unread-count', [NotificationController::class, 'getUnreadCount']);
        Route::get('/settings', [NotificationController::class, 'getSettings']);
        Route::put('/settings', [NotificationController::class, 'updateSettings']);
        Route::post('/mark-all-read', [NotificationController::class, 'markAllAsRead']);
        Route::get('/{notification}', [NotificationController::class, 'show']);
        Route::put('/{notification}/read', [NotificationController::class, 'markAsRead']);
        Route::delete('/{notification}', [NotificationController::class, 'delete']);
        Route::post('/broadcast', [NotificationController::class, 'broadcast']); // Gửi thông báo hệ thống (admin only)
    });

    Route::get('user/profile', [UserController::class, 'show']);
    Route::put('user/profile', [UserController::class, 'update']);
    Route::post('user/change-password', [UserController::class, 'changePassword']);
    Route::post('user/upload-avatar', [UserController::class, 'uploadAvatar']);
    Route::delete('user/account', [UserController::class, 'deleteAccount']); // Xóa tài khoản (yêu cầu Apple)

    // Public user profile (lấy thông tin user khác)
    Route::get('users/{id}', [UserController::class, 'showById']);

    // Options for dropdowns (project statuses, equipment statuses, roles, etc.)
    Route::get('options', [OptionsController::class, 'index']);

    // ===================================================================
    // OPERATIONS MODULE (Shareholders, Assets, Dashboard)
    // ===================================================================
    Route::prefix('operations')->group(function () {
        Route::get('/dashboard', [OperationsController::class, 'dashboard']);

        // Shareholders
        Route::get('/shareholders', [OperationsController::class, 'shareholders']);
        Route::post('/shareholders', [OperationsController::class, 'storeShareholder']);
        Route::put('/shareholders/{id}', [OperationsController::class, 'updateShareholder']);
        Route::delete('/shareholders/{id}', [OperationsController::class, 'destroyShareholder']);

        // Company Assets
        Route::get('/assets', [OperationsController::class, 'assets']);
        Route::post('/assets', [OperationsController::class, 'storeAsset']);
        Route::get('/assets/{id}', [OperationsController::class, 'showAsset']);
        Route::put('/assets/{id}', [OperationsController::class, 'updateAsset']);
        Route::delete('/assets/{id}', [OperationsController::class, 'destroyAsset']);
        Route::post('/assets/{id}/assign', [OperationsController::class, 'assignAsset']);
        Route::post('/assets/run-depreciation', [OperationsController::class, 'runDepreciation']);
    });

    // ===================================================================
    // APPROVAL CENTER (Trung tâm duyệt yêu cầu)
    // ===================================================================
    Route::prefix('approval-center')->group(function () {
        Route::get('/', [ApprovalCenterController::class, 'index']);
        Route::post('/quick-approve', [ApprovalCenterController::class, 'quickApprove']);
        Route::post('/quick-reject', [ApprovalCenterController::class, 'quickReject']);
    });



    // ===================================================================
    // OFFICE/HR KPI ROUTES (Not tied to specific projects)
    // ===================================================================
    Route::prefix('hr/kpis')->group(function () {
        Route::get('/', [OfficeKpiController::class, 'index']);
        Route::post('/', [OfficeKpiController::class, 'store']);
        Route::get('/{id}', [OfficeKpiController::class, 'show']);
        Route::put('/{id}', [OfficeKpiController::class, 'update']);
        Route::delete('/{id}', [OfficeKpiController::class, 'destroy']);
        Route::post('/{id}/verify', [OfficeKpiController::class, 'verify']);
    });

    // ===================================================================
    // CHẤM CÔNG & PHÂN CA (Attendance & Shift Management)
    // ===================================================================
    Route::prefix('attendance')->group(function () {
        Route::get('/', [AttendanceController::class, 'index']);
        Route::post('/check-in', [AttendanceController::class, 'checkIn']);
        Route::post('/check-out', [AttendanceController::class, 'checkOut']);
        Route::post('/', [AttendanceController::class, 'store']);
        Route::post('/{id}/approve', [AttendanceController::class, 'approve']);
        Route::post('/{id}/submit', [AttendanceController::class, 'submit']);
        Route::post('/{id}/reject', [AttendanceController::class, 'reject']);
        Route::get('/statistics', [AttendanceController::class, 'statistics']);
        Route::post('/generate-labor-costs', [AttendanceController::class, 'generateLaborCosts']);
    });

    Route::prefix('shifts')->group(function () {
        Route::get('/', [AttendanceController::class, 'shifts']);
        Route::post('/', [AttendanceController::class, 'createShift']);
        Route::put('/{id}', [AttendanceController::class, 'updateShift']);
        Route::delete('/{id}', [AttendanceController::class, 'deleteShift']);
        Route::get('/assignments', [AttendanceController::class, 'shiftAssignments']);
        Route::post('/assignments', [AttendanceController::class, 'assignShifts']);
        Route::delete('/assignments/{id}', [AttendanceController::class, 'removeAssignment']);
    });

    // ===================================================================
    // PROJECT MANAGEMENT ROUTES
    // ===================================================================

    // Monitoring Dashboard (tổng quan tất cả projects)
    Route::get('monitoring/dashboard', [ProjectMonitoringController::class, 'dashboard'])->middleware('permission:dashboard.view');

    // Company Costs (Chi phí công ty - không gắn với dự án cụ thể)
    Route::prefix('company-costs')->group(function () {
        Route::get('/', [\App\Http\Controllers\Api\CompanyCostController::class, 'index']);
        Route::get('/summary', [\App\Http\Controllers\Api\CompanyCostController::class, 'summary']);
        Route::post('/', [\App\Http\Controllers\Api\CompanyCostController::class, 'store']);
        Route::get('/{id}', [\App\Http\Controllers\Api\CompanyCostController::class, 'show']);
        Route::put('/{id}', [\App\Http\Controllers\Api\CompanyCostController::class, 'update']);
        Route::delete('/{id}', [\App\Http\Controllers\Api\CompanyCostController::class, 'destroy']);
        Route::post('/{id}/submit', [\App\Http\Controllers\Api\CompanyCostController::class, 'submit']);
        Route::post('/{id}/approve-management', [\App\Http\Controllers\Api\CompanyCostController::class, 'approveByManagement']);
        Route::post('/{id}/approve-accountant', [\App\Http\Controllers\Api\CompanyCostController::class, 'approveByAccountant']);
        Route::post('/{id}/reject', [\App\Http\Controllers\Api\CompanyCostController::class, 'reject']);
    });

    // Company Financial Reports (Báo cáo tài chính toàn công ty)
    Route::prefix('company-financial-reports')->group(function () {
        Route::get('/summary', [\App\Http\Controllers\Api\CompanyFinancialReportController::class, 'summary']);
        Route::get('/profit-loss', [\App\Http\Controllers\Api\CompanyFinancialReportController::class, 'profitLoss']);
        Route::get('/trend', [\App\Http\Controllers\Api\CompanyFinancialReportController::class, 'trend']);
        Route::get('/compare', [\App\Http\Controllers\Api\CompanyFinancialReportController::class, 'compare']);
    });

    // Input Invoices (Global - không cần project, chỉ kế toán)
    Route::prefix('accounting')->group(function () {
        Route::get('/input-invoices', [InputInvoiceController::class, 'index']);
        Route::post('/input-invoices', [InputInvoiceController::class, 'store']);
        Route::get('/input-invoices/{id}', [InputInvoiceController::class, 'show']);
        Route::put('/input-invoices/{id}', [InputInvoiceController::class, 'update']);
        Route::delete('/input-invoices/{id}', [InputInvoiceController::class, 'destroy']);
    });

    Route::prefix('projects')->group(function () {
        // Projects CRUD
        Route::get('/', [ProjectController::class, 'index']);
        Route::get('/customers', [ProjectController::class, 'getCustomers']);
        Route::get('/project-managers', [ProjectController::class, 'getProjectManagers']);
        Route::get('/all-users', [ProjectController::class, 'getAllUsers']);
        Route::post('/', [ProjectController::class, 'store']);
        Route::get('/{id}', [ProjectController::class, 'show']);
        Route::put('/{id}', [ProjectController::class, 'update']);
        Route::delete('/{id}', [ProjectController::class, 'destroy']);

        // Contracts
        Route::get('/{projectId}/contract', [ContractController::class, 'show']);
        Route::post('/{projectId}/contract', [ContractController::class, 'store']);
        Route::put('/{projectId}/contract', [ContractController::class, 'update']);
        Route::post('/{projectId}/contract/approve', [ContractController::class, 'approve']);
        Route::post('/{projectId}/contract/attach-files', [ContractController::class, 'attachFiles']);

        // Payments
        Route::get('/{projectId}/payments', [ProjectPaymentController::class, 'index']);
        Route::get('/{projectId}/payments/{id}', [ProjectPaymentController::class, 'show']);
        Route::post('/{projectId}/payments', [ProjectPaymentController::class, 'store']);
        Route::put('/{projectId}/payments/{id}', [ProjectPaymentController::class, 'update']);
        Route::post('/{projectId}/payments/{id}/upload-proof', [ProjectPaymentController::class, 'uploadPaymentProof']);
        Route::post('/{projectId}/payments/{id}/mark-paid-by-customer', [ProjectPaymentController::class, 'markAsPaidByCustomer']);
        Route::post('/{projectId}/payments/{id}/approve-by-customer', [ProjectPaymentController::class, 'approveByCustomer']);
        Route::post('/{projectId}/payments/{id}/reject-by-customer', [ProjectPaymentController::class, 'rejectByCustomer']);
        Route::post('/{projectId}/payments/{id}/confirm', [ProjectPaymentController::class, 'confirm']);
        Route::post('/{projectId}/payments/{id}/reject', [ProjectPaymentController::class, 'reject']);

        // Additional Costs
        Route::get('/{projectId}/additional-costs', [AdditionalCostController::class, 'index']);
        Route::post('/{projectId}/additional-costs', [AdditionalCostController::class, 'store']);
        Route::get('/{projectId}/additional-costs/{id}', [AdditionalCostController::class, 'show']);
        Route::post('/{projectId}/additional-costs/{id}/attach-files', [AdditionalCostController::class, 'attachFiles']);
        Route::post('/{projectId}/additional-costs/{id}/mark-paid-by-customer', [AdditionalCostController::class, 'markAsPaidByCustomer']);
        Route::post('/{projectId}/additional-costs/{id}/confirm', [AdditionalCostController::class, 'confirm']);
        Route::post('/{projectId}/additional-costs/{id}/approve', [AdditionalCostController::class, 'approve']);
        Route::post('/{projectId}/additional-costs/{id}/reject', [AdditionalCostController::class, 'reject']);
        Route::delete('/{projectId}/additional-costs/{id}', [AdditionalCostController::class, 'destroy']);

        // Revenue Management
        Route::get('/{projectId}/revenue/summary', [RevenueController::class, 'projectSummary']);
        Route::get('/{projectId}/revenue/dashboard', [RevenueController::class, 'dashboard']);
        Route::get('/{projectId}/revenue/costs-by-category', [RevenueController::class, 'costsByCategory']);

        // Costs Management
        Route::get('/{projectId}/costs', [CostController::class, 'index']);
        Route::post('/{projectId}/costs', [CostController::class, 'store']);
        Route::get('/{projectId}/costs/{id}', [CostController::class, 'show']);
        Route::put('/{projectId}/costs/{id}', [CostController::class, 'update']);
        Route::delete('/{projectId}/costs/{id}', [CostController::class, 'destroy']);
        Route::post('/{projectId}/costs/{id}/submit', [CostController::class, 'submit']);
        Route::post('/{projectId}/costs/{id}/approve-management', [CostController::class, 'approveByManagement']);
        Route::post('/{projectId}/costs/{id}/approve-accountant', [CostController::class, 'approveByAccountant']);
        Route::post('/{projectId}/costs/{id}/reject', [CostController::class, 'reject']);

        // Personnel
        Route::get('/{projectId}/personnel', [ProjectPersonnelController::class, 'index']);
        Route::post('/{projectId}/personnel', [ProjectPersonnelController::class, 'store']);
        Route::delete('/{projectId}/personnel/{id}', [ProjectPersonnelController::class, 'destroy']);

        // KPIs
        Route::get('/{projectId}/kpis', [KpiController::class, 'index']);
        Route::post('/{projectId}/kpis', [KpiController::class, 'store']);
        Route::get('/{projectId}/kpis/{id}', [KpiController::class, 'show']);
        Route::put('/{projectId}/kpis/{id}', [KpiController::class, 'update']);
        Route::delete('/{projectId}/kpis/{id}', [KpiController::class, 'destroy']);
        Route::post('/{projectId}/kpis/{id}/verify', [KpiController::class, 'verify']);

        // Subcontractors
        Route::get('/{projectId}/subcontractors', [SubcontractorController::class, 'index'])->middleware('permission:subcontractor.view,projectId');
        Route::post('/{projectId}/subcontractors', [SubcontractorController::class, 'store'])->middleware('permission:subcontractor.create,projectId');
        Route::get('/{projectId}/subcontractors/{id}', [SubcontractorController::class, 'show'])->where('id', '[0-9]+')->middleware('permission:subcontractor.view,projectId');
        Route::put('/{projectId}/subcontractors/{id}', [SubcontractorController::class, 'update'])->where('id', '[0-9]+')->middleware('permission:subcontractor.update,projectId');
        Route::delete('/{projectId}/subcontractors/{id}', [SubcontractorController::class, 'destroy'])->where('id', '[0-9]+')->middleware('permission:subcontractor.delete,projectId');
        Route::post('/{projectId}/subcontractors/{id}/approve', [SubcontractorController::class, 'approve'])->where('id', '[0-9]+')->middleware('permission:subcontractor.update,projectId');

        // Subcontractor Items
        Route::get('/{projectId}/subcontractors/{subcontractorId}/items', [SubcontractorItemController::class, 'index'])->where(['subcontractorId' => '[0-9]+']);
        Route::post('/{projectId}/subcontractors/{subcontractorId}/items', [SubcontractorItemController::class, 'store'])->where(['subcontractorId' => '[0-9]+']);
        Route::put('/{projectId}/subcontractors/{subcontractorId}/items/{id}', [SubcontractorItemController::class, 'update'])->where(['subcontractorId' => '[0-9]+', 'id' => '[0-9]+']);
        Route::delete('/{projectId}/subcontractors/{subcontractorId}/items/{id}', [SubcontractorItemController::class, 'destroy'])->where(['subcontractorId' => '[0-9]+', 'id' => '[0-9]+']);
        Route::post('/{projectId}/subcontractors/{subcontractorId}/items/reorder', [SubcontractorItemController::class, 'reorder'])->where('subcontractorId', '[0-9]+');

        // Documents
        Route::get('/{projectId}/documents', [ProjectDocumentController::class, 'index']);
        Route::post('/{projectId}/documents', [ProjectDocumentController::class, 'store']);
        Route::put('/{projectId}/documents/{id}', [ProjectDocumentController::class, 'update']);
        Route::delete('/{projectId}/documents/{id}', [ProjectDocumentController::class, 'destroy']);

        // Construction Logs (Enhanced Sprint 1)
        Route::get('/{projectId}/logs', [ConstructionLogController::class, 'index']);
        Route::post('/{projectId}/logs', [ConstructionLogController::class, 'store']);
        Route::put('/{projectId}/logs/{id}', [ConstructionLogController::class, 'update']);
        Route::delete('/{projectId}/logs/{id}', [ConstructionLogController::class, 'destroy']);
        Route::get('/{projectId}/logs/daily-report', [ConstructionLogController::class, 'dailyReport']);
        Route::post('/{projectId}/logs/{logId}/approve', [ConstructionLogController::class, 'approveLog']);
        Route::get('/{projectId}/logs/progress-comparison', [ConstructionLogController::class, 'progressComparison']);
        Route::post('/{projectId}/logs/{logId}/request-adjustment', [ConstructionLogController::class, 'requestAdjustment']);

        // Budgets
        Route::get('/{projectId}/budgets', [BudgetController::class, 'index'])->middleware('permission:budgets.view,projectId');
        Route::post('/{projectId}/budgets', [BudgetController::class, 'store'])->middleware('permission:budgets.create,projectId');
        Route::get('/{projectId}/budgets/{id}', [BudgetController::class, 'show'])->middleware('permission:budgets.view,projectId');
        Route::get('/{projectId}/budgets/{id}/compare', [BudgetController::class, 'compareWithActual'])->middleware('permission:budgets.view,projectId');
        Route::put('/{projectId}/budgets/{id}', [BudgetController::class, 'update'])->middleware('permission:budgets.update,projectId');
        Route::delete('/{projectId}/budgets/{id}', [BudgetController::class, 'destroy'])->middleware('permission:budgets.delete,projectId');
        Route::post('/{projectId}/budgets/{id}/submit', [BudgetController::class, 'submitForApproval'])->middleware('permission:budgets.update,projectId');
        Route::post('/{projectId}/budgets/{id}/approve', [BudgetController::class, 'approve'])->middleware('permission:budgets.approve,projectId');
        Route::post('/{projectId}/budgets/{id}/reject', [BudgetController::class, 'reject'])->middleware('permission:budgets.approve,projectId');
        Route::post('/{projectId}/budgets/{id}/activate', [BudgetController::class, 'activate'])->middleware('permission:budgets.approve,projectId');
        Route::post('/{projectId}/budgets/{id}/archive', [BudgetController::class, 'archive'])->middleware('permission:budgets.approve,projectId');
        Route::post('/{projectId}/budgets/sync', [BudgetController::class, 'sync'])->middleware('permission:budgets.update,projectId');
        Route::post('/{projectId}/budgets/{id}/sync', [BudgetController::class, 'sync'])->middleware('permission:budgets.update,projectId');

        // Materials
        Route::get('/{projectId}/materials', [MaterialController::class, 'getByProject']);
        Route::post('/{projectId}/materials/transactions', [MaterialController::class, 'createTransaction']);
        Route::post('/{projectId}/materials/batch-transactions', [MaterialController::class, 'batchTransactions']);

        // Material Bills (Hóa đơn vật liệu)
        Route::prefix('/{projectId}/material-bills')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\MaterialBillController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\Api\MaterialBillController::class, 'store']);
            Route::get('/{id}', [\App\Http\Controllers\Api\MaterialBillController::class, 'show']);
            Route::put('/{id}', [\App\Http\Controllers\Api\MaterialBillController::class, 'update']);
            Route::delete('/{id}', [\App\Http\Controllers\Api\MaterialBillController::class, 'destroy']);
            Route::post('/{id}/submit', [\App\Http\Controllers\Api\MaterialBillController::class, 'submit']);
            Route::post('/{id}/approve-management', [\App\Http\Controllers\Api\MaterialBillController::class, 'approveManagement']);
            Route::post('/{id}/approve-accountant', [\App\Http\Controllers\Api\MaterialBillController::class, 'approveAccountant']);
            Route::post('/{id}/reject', [\App\Http\Controllers\Api\MaterialBillController::class, 'reject']);
        });

        // Equipment (legacy)
        Route::get('/{projectId}/equipment', [EquipmentController::class, 'getByProject']);
        Route::post('/{projectId}/equipment/allocations', [EquipmentController::class, 'createAllocation']);

        // ─── Equipment Module V2: Thuê thiết bị ───
        Route::prefix('{projectId}/equipment-rentals')->group(function () {
            Route::get('/', [EquipmentRentalController::class, 'index']);
            Route::post('/', [EquipmentRentalController::class, 'store']);
            Route::get('/{id}', [EquipmentRentalController::class, 'show']);
            Route::put('/{id}', [EquipmentRentalController::class, 'update']);
            Route::delete('/{id}', [EquipmentRentalController::class, 'destroy']);
            // Workflow
            Route::post('/{id}/submit', [EquipmentRentalController::class, 'submit']);
            Route::post('/{id}/approve-management', [EquipmentRentalController::class, 'approveManagement']);
            Route::post('/{id}/reject-management', [EquipmentRentalController::class, 'rejectManagement']);
            Route::post('/{id}/confirm-accountant', [EquipmentRentalController::class, 'confirmAccountant']);
            // Return lifecycle
            Route::post('/{id}/request-return', [EquipmentRentalController::class, 'requestReturn']);
            Route::post('/{id}/confirm-return', [EquipmentRentalController::class, 'confirmReturn']);
        });

        // ─── Equipment Module V2: Mua thiết bị — DISABLED: Chuyển sang module Kho công ty ───
        // Route::prefix('{projectId}/equipment-purchases')->group(function () {
        //     Route::get('/', [EquipmentPurchaseController::class, 'index']);
        //     Route::post('/', [EquipmentPurchaseController::class, 'store']);
        //     Route::get('/{id}', [EquipmentPurchaseController::class, 'show']);
        //     Route::put('/{id}', [EquipmentPurchaseController::class, 'update']);
        //     Route::delete('/{id}', [EquipmentPurchaseController::class, 'destroy']);
        //     Route::post('/{id}/submit', [EquipmentPurchaseController::class, 'submit']);
        //     Route::post('/{id}/approve-management', [EquipmentPurchaseController::class, 'approveManagement']);
        //     Route::post('/{id}/reject-management', [EquipmentPurchaseController::class, 'rejectManagement']);
        //     Route::post('/{id}/confirm-accountant', [EquipmentPurchaseController::class, 'confirmAccountant']);
        // });

        // ─── Equipment Module V2: Sử dụng thiết bị (3-level approval) ───
        Route::prefix('{projectId}/asset-usages')->group(function () {
            Route::get('/', [AssetUsageController::class, 'index']);
            Route::post('/', [AssetUsageController::class, 'store']);
            Route::get('/{id}', [AssetUsageController::class, 'show']);
            Route::put('/{id}', [AssetUsageController::class, 'update']);
            Route::delete('/{id}', [AssetUsageController::class, 'destroy']);
            // 3-level workflow
            Route::post('/{id}/submit', [AssetUsageController::class, 'submit']);
            Route::post('/{id}/approve-management', [AssetUsageController::class, 'approveManagement']);
            Route::post('/{id}/reject', [AssetUsageController::class, 'reject']);
            Route::post('/{id}/confirm-accountant', [AssetUsageController::class, 'confirmAccountant']);
            // Lifecycle (after approval)
            Route::post('/{id}/request-return', [AssetUsageController::class, 'requestReturn']);
            Route::post('/{id}/confirm-return', [AssetUsageController::class, 'confirmReturn']);
        });

        // Invoices (Output - gửi cho khách hàng)
        Route::get('/{projectId}/invoices/summary-by-cost-group', [InvoiceController::class, 'summaryByCostGroup'])->name('invoices.summaryByCostGroup');
        Route::get('/{projectId}/invoices', [InvoiceController::class, 'index']);
        Route::post('/{projectId}/invoices', [InvoiceController::class, 'store']);
        Route::get('/{projectId}/invoices/{id}', [InvoiceController::class, 'show']);
        Route::put('/{projectId}/invoices/{id}', [InvoiceController::class, 'update']);
        Route::delete('/{projectId}/invoices/{id}', [InvoiceController::class, 'destroy']);

        // Input Invoices (Đầu vào - từ nhà cung cấp, chỉ kế toán, có thể gắn với project)
        Route::get('/{projectId}/input-invoices', [InputInvoiceController::class, 'index']);
        Route::post('/{projectId}/input-invoices', [InputInvoiceController::class, 'store']);
        Route::get('/{projectId}/input-invoices/{id}', [InputInvoiceController::class, 'show']);
        Route::put('/{projectId}/input-invoices/{id}', [InputInvoiceController::class, 'update']);
        Route::delete('/{projectId}/input-invoices/{id}', [InputInvoiceController::class, 'destroy']);

        // Acceptance Stages
        Route::get('/{projectId}/acceptance', [AcceptanceStageController::class, 'index']);
        Route::post('/{projectId}/acceptance', [AcceptanceStageController::class, 'store']);
        Route::get('/{projectId}/acceptance/{id}', [AcceptanceStageController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{projectId}/acceptance/{id}', [AcceptanceStageController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{projectId}/acceptance/{id}', [AcceptanceStageController::class, 'destroy'])->where('id', '[0-9]+');
        Route::post('/{projectId}/acceptance/{id}/approve', [AcceptanceStageController::class, 'approve'])->where('id', '[0-9]+');
        Route::post('/{projectId}/acceptance/{id}/supervisor-approve', [AcceptanceStageController::class, 'supervisorApprove'])->where('id', '[0-9]+');
        Route::post('/{projectId}/acceptance/{id}/project-manager-approve', [AcceptanceStageController::class, 'projectManagerApprove'])->where('id', '[0-9]+');
        Route::post('/{projectId}/acceptance/{id}/customer-approve', [AcceptanceStageController::class, 'customerApprove'])->where('id', '[0-9]+');
        Route::post('/{projectId}/acceptance/{id}/attach-files', [AcceptanceStageController::class, 'attachFiles'])->where('id', '[0-9]+');

        // Acceptance Items
        Route::get('/{projectId}/acceptance/{stageId}/items', [AcceptanceItemController::class, 'index'])->where('stageId', '[0-9]+');
        Route::post('/{projectId}/acceptance/{stageId}/items', [AcceptanceItemController::class, 'store'])->where('stageId', '[0-9]+');
        Route::get('/{projectId}/acceptance/{stageId}/items/{id}', [AcceptanceItemController::class, 'show'])->where(['stageId' => '[0-9]+', 'id' => '[0-9]+']);
        Route::put('/{projectId}/acceptance/{stageId}/items/{id}', [AcceptanceItemController::class, 'update'])->where(['stageId' => '[0-9]+', 'id' => '[0-9]+']);
        Route::delete('/{projectId}/acceptance/{stageId}/items/{id}', [AcceptanceItemController::class, 'destroy'])->where(['stageId' => '[0-9]+', 'id' => '[0-9]+']);
        Route::post('/{projectId}/acceptance/{stageId}/items/{id}/approve', [AcceptanceItemController::class, 'approve'])->where(['stageId' => '[0-9]+', 'id' => '[0-9]+']);
        Route::post('/{projectId}/acceptance/{stageId}/items/{id}/reject', [AcceptanceItemController::class, 'reject'])->where(['stageId' => '[0-9]+', 'id' => '[0-9]+']);
        Route::post('/{projectId}/acceptance/{stageId}/items/{id}/reset', [AcceptanceItemController::class, 'reset'])->where(['stageId' => '[0-9]+', 'id' => '[0-9]+']);
        Route::post('/{projectId}/acceptance/{stageId}/items/reorder', [AcceptanceItemController::class, 'reorder'])->where('stageId', '[0-9]+');
        Route::post('/{projectId}/acceptance/{stageId}/items/{id}/attach-files', [AcceptanceItemController::class, 'attachFiles'])->where(['stageId' => '[0-9]+', 'id' => '[0-9]+']);
        Route::post('/{projectId}/acceptance/{stageId}/items/{id}/submit', [AcceptanceItemController::class, 'submit'])->where(['stageId' => '[0-9]+', 'id' => '[0-9]+']);
        Route::post('/{projectId}/acceptance/{stageId}/items/{id}/supervisor-approve', [AcceptanceItemController::class, 'supervisorApprove'])->where(['stageId' => '[0-9]+', 'id' => '[0-9]+']);
        Route::post('/{projectId}/acceptance/{stageId}/items/{id}/project-manager-approve', [AcceptanceItemController::class, 'projectManagerApprove'])->where(['stageId' => '[0-9]+', 'id' => '[0-9]+']);
        Route::post('/{projectId}/acceptance/{stageId}/items/{id}/customer-approve', [AcceptanceItemController::class, 'customerApprove'])->where(['stageId' => '[0-9]+', 'id' => '[0-9]+']);
        Route::post('/{projectId}/acceptance/{stageId}/items/{id}/workflow-reject', [AcceptanceItemController::class, 'workflowReject'])->where(['stageId' => '[0-9]+', 'id' => '[0-9]+']);

        // Defects
        Route::get('/{projectId}/defects', [DefectController::class, 'index'])->middleware('permission:defect.view,projectId');
        Route::post('/{projectId}/defects', [DefectController::class, 'store'])->middleware('permission:defect.create,projectId');
        Route::get('/{projectId}/defects/{id}', [DefectController::class, 'show'])->middleware('permission:defect.view,projectId');
        Route::put('/{projectId}/defects/{id}', [DefectController::class, 'update'])->middleware('permission:defect.update,projectId');

        // Project Risks
        Route::get('/{projectId}/risks', [ProjectRiskController::class, 'index'])->middleware('permission:project.risk.view,projectId');
        Route::post('/{projectId}/risks', [ProjectRiskController::class, 'store'])->middleware('permission:project.risk.create,projectId');
        Route::get('/{projectId}/risks/{id}', [ProjectRiskController::class, 'show'])->middleware('permission:project.risk.view,projectId');
        Route::put('/{projectId}/risks/{id}', [ProjectRiskController::class, 'update'])->middleware('permission:project.risk.update,projectId');
        Route::delete('/{projectId}/risks/{id}', [ProjectRiskController::class, 'destroy'])->middleware('permission:project.risk.delete,projectId');
        Route::post('/{projectId}/risks/{id}/resolve', [ProjectRiskController::class, 'markAsResolved'])->middleware('permission:project.risk.update,projectId');

        // Change Requests
        Route::get('/{projectId}/change-requests', [ChangeRequestController::class, 'index'])->middleware('permission:change_request.view,projectId');
        Route::post('/{projectId}/change-requests', [ChangeRequestController::class, 'store'])->middleware('permission:change_request.create,projectId');
        Route::get('/{projectId}/change-requests/{id}', [ChangeRequestController::class, 'show'])->middleware('permission:change_request.view,projectId');
        Route::put('/{projectId}/change-requests/{id}', [ChangeRequestController::class, 'update'])->middleware('permission:change_request.update,projectId');
        Route::delete('/{projectId}/change-requests/{id}', [ChangeRequestController::class, 'destroy'])->middleware('permission:change_request.delete,projectId');
        Route::post('/{projectId}/change-requests/{id}/submit', [ChangeRequestController::class, 'submit'])->middleware('permission:change_request.create,projectId');
        Route::post('/{projectId}/change-requests/{id}/approve', [ChangeRequestController::class, 'approve'])->middleware('permission:change_request.approve,projectId');
        Route::post('/{projectId}/change-requests/{id}/reject', [ChangeRequestController::class, 'reject'])->middleware('permission:change_request.reject,projectId');
        Route::post('/{projectId}/change-requests/{id}/implement', [ChangeRequestController::class, 'markAsImplemented'])->middleware('permission:change_request.update,projectId');

        // EVM Metrics
        Route::get('/{projectId}/evm/latest', [ProjectEvmController::class, 'latest'])->middleware('permission:evm.view,projectId');
        Route::post('/{projectId}/evm/calculate', [ProjectEvmController::class, 'calculate'])->middleware('permission:evm.view,projectId');
        Route::get('/{projectId}/evm/history', [ProjectEvmController::class, 'history'])->middleware('permission:evm.view,projectId');
        Route::get('/{projectId}/evm/analyze', [ProjectEvmController::class, 'analyze'])->middleware('permission:evm.view,projectId');

        // Predictive Analytics
        Route::get('/{projectId}/predictions/completion', [PredictiveAnalyticsController::class, 'predictCompletion'])->middleware('permission:predictive.view,projectId');
        Route::get('/{projectId}/predictions/cost', [PredictiveAnalyticsController::class, 'predictCost'])->middleware('permission:predictive.view,projectId');
        Route::get('/{projectId}/predictions/delay-risk', [PredictiveAnalyticsController::class, 'analyzeDelayRisk'])->middleware('permission:predictive.view,projectId');
        Route::get('/{projectId}/predictions/cost-risk', [PredictiveAnalyticsController::class, 'analyzeCostRisk'])->middleware('permission:predictive.view,projectId');
        Route::get('/{projectId}/predictions/full', [PredictiveAnalyticsController::class, 'fullAnalysis'])->middleware('permission:predictive.view,projectId');

        // Project Monitoring
        Route::get('/{projectId}/monitoring', [ProjectMonitoringController::class, 'projectMonitoring'])->middleware('permission:project.monitoring.view,projectId');

        // Comments
        Route::get('/{projectId}/comments', [ProjectCommentController::class, 'index']);
        Route::get('/{projectId}/comments/latest', [ProjectCommentController::class, 'getLatest']);
        Route::post('/{projectId}/comments', [ProjectCommentController::class, 'store']);
        Route::put('/{projectId}/comments/{id}', [ProjectCommentController::class, 'update']);
        Route::delete('/{projectId}/comments/{id}', [ProjectCommentController::class, 'destroy']);

        // Báo cáo tổng hợp dự án
        Route::get('/{projectId}/summary-report', [ProjectSummaryReportController::class, 'getSummaryReport'])->middleware('permission:report.project_summary.view,projectId');
        Route::get('/{projectId}/summary-report/costs/{type}', [ProjectSummaryReportController::class, 'getCostDetails'])->middleware('permission:report.project_summary.view,projectId');

        // Progress
        Route::get('/{projectId}/progress', [ProjectProgressController::class, 'show'])->middleware('permission:progress.view,projectId');
        Route::get('/{projectId}/progress/overview', [ProjectProgressController::class, 'overview'])->middleware('permission:progress.view,projectId');

        // Gantt Chart - Phases
        Route::get('/{projectId}/phases', [ProjectPhaseController::class, 'index']);
        Route::post('/{projectId}/phases', [ProjectPhaseController::class, 'store']);
        Route::get('/{projectId}/phases/{id}', [ProjectPhaseController::class, 'show']);
        Route::put('/{projectId}/phases/{id}', [ProjectPhaseController::class, 'update']);
        Route::delete('/{projectId}/phases/{id}', [ProjectPhaseController::class, 'destroy']);
        Route::post('/{projectId}/phases/reorder', [ProjectPhaseController::class, 'reorder']);

        // Gantt Chart - Tasks
        Route::get('/{projectId}/tasks', [ProjectTaskController::class, 'index']);
        Route::post('/{projectId}/tasks', [ProjectTaskController::class, 'store']);
        Route::get('/{projectId}/tasks/{id}', [ProjectTaskController::class, 'show']);
        Route::put('/{projectId}/tasks/{id}', [ProjectTaskController::class, 'update']);
        Route::delete('/{projectId}/tasks/{id}', [ProjectTaskController::class, 'destroy']);
        Route::post('/{projectId}/tasks/reorder', [ProjectTaskController::class, 'reorder']);
        Route::post('/{projectId}/tasks/{id}/progress', [ProjectTaskController::class, 'updateProgress']);
        Route::post('/{projectId}/tasks/recalculate-all', [ProjectTaskController::class, 'recalculateAll']);
        Route::post('/{projectId}/tasks/import-template', [WbsTemplateController::class, 'importToProject']);

        // Gantt Chart - Task Dependencies
        Route::post('/{projectId}/tasks/{taskId}/dependencies', [ProjectTaskDependencyController::class, 'store']);
        Route::delete('/{projectId}/tasks/{taskId}/dependencies/{id}', [ProjectTaskDependencyController::class, 'destroy']);
        Route::post('/{projectId}/tasks/{taskId}/dependencies/validate', [ProjectTaskDependencyController::class, 'validateCircular']);

        // Gantt & CPM API (Sprint 1 — Module 1)
        Route::get('/{projectId}/gantt', [GanttController::class, 'ganttData'])->middleware('permission:gantt.view,projectId');
        Route::get('/{projectId}/gantt/cpm', [GanttController::class, 'cpm'])->middleware('permission:gantt.view,projectId');
        Route::put('/{projectId}/gantt/auto-adjust', [GanttController::class, 'autoAdjust'])->middleware('permission:gantt.update,projectId');
        Route::get('/{projectId}/gantt/delay-warnings', [GanttController::class, 'delayWarnings'])->middleware('permission:gantt.view,projectId');
        Route::get('/{projectId}/gantt/progress-comparison', [GanttController::class, 'progressComparison'])->middleware('permission:gantt.view,projectId');

        // Schedule Adjustments (Sprint 1 — Module 1)
        Route::get('/{projectId}/schedule-adjustments', [GanttController::class, 'adjustments'])->middleware('permission:gantt.view,projectId');
        Route::post('/{projectId}/schedule-adjustments', [GanttController::class, 'createAdjustment'])->middleware('permission:gantt.update,projectId');
        Route::post('/{projectId}/schedule-adjustments/{adjustmentId}/approve', [GanttController::class, 'approveAdjustment'])->middleware('permission:gantt.update,projectId');
        Route::post('/{projectId}/schedule-adjustments/{adjustmentId}/reject', [GanttController::class, 'rejectAdjustment'])->middleware('permission:gantt.update,projectId');

        // NOTE: Teams, Team Contracts, Labor Standards routes removed — models don't exist

        // ============ Sprint 2 — Module 3: Finance ============
        Route::get('/{projectId}/cash-flow', [FinanceController::class, 'cashFlow'])->middleware('permission:finance.view,projectId');
        Route::post('/{projectId}/cash-flow', [FinanceController::class, 'storeCashFlow'])->middleware('permission:finance.manage,projectId');
        Route::get('/{projectId}/profit-loss', [FinanceController::class, 'profitLoss'])->middleware('permission:finance.view,projectId');
        Route::get('/{projectId}/budget-vs-actual', [FinanceController::class, 'budgetVsActual'])->middleware('permission:finance.view,projectId');
        Route::get('/{projectId}/subcontractor-debt', [FinanceController::class, 'subcontractorDebt'])->middleware('permission:finance.view,projectId');
        Route::get('/{projectId}/tax-summary', [FinanceController::class, 'taxSummary'])->middleware('permission:finance.view,projectId');
        Route::get('/{projectId}/warranty-retentions', [FinanceController::class, 'warrantyRetentions'])->middleware('permission:finance.view,projectId');
        Route::post('/{projectId}/warranty-retentions', [FinanceController::class, 'storeWarrantyRetention'])->middleware('permission:finance.manage,projectId');
        Route::post('/{projectId}/warranty-retentions/{id}/release', [FinanceController::class, 'releaseWarranty'])->middleware('permission:finance.manage,projectId');

        // ============ Sprint 2 — Module 4: Material Quotas (Cost tracking — no inventory) ============
        Route::get('/{projectId}/materials/quotas', [MaterialQuotaController::class, 'quotas'])->middleware('permission:material.view,projectId');
        Route::post('/{projectId}/materials/quotas', [MaterialQuotaController::class, 'storeQuota'])->middleware('permission:material.create,projectId');
        Route::put('/{projectId}/materials/quotas/{id}', [MaterialQuotaController::class, 'updateQuota'])->middleware('permission:material.update,projectId');
        Route::get('/{projectId}/materials/warnings', [MaterialQuotaController::class, 'warnings'])->middleware('permission:material.view,projectId');
        Route::get('/{projectId}/materials/history', [MaterialQuotaController::class, 'history'])->middleware('permission:material.view,projectId');

        // ============ Năng suất lao động (Labor Productivity) ============
        Route::get('/{projectId}/labor-productivity', [LaborProductivityController::class, 'index'])->middleware('permission:labor_productivity.view,projectId');
        Route::post('/{projectId}/labor-productivity', [LaborProductivityController::class, 'store'])->middleware('permission:labor_productivity.create,projectId');
        Route::put('/{projectId}/labor-productivity/{id}', [LaborProductivityController::class, 'update'])->middleware('permission:labor_productivity.update,projectId');
        Route::delete('/{projectId}/labor-productivity/{id}', [LaborProductivityController::class, 'destroy'])->middleware('permission:labor_productivity.delete,projectId');
        Route::get('/{projectId}/labor-productivity/dashboard', [LaborProductivityController::class, 'dashboard'])->middleware('permission:labor_productivity.view,projectId');

        // Subcontractor Payments
        Route::get('/{projectId}/subcontractor-payments', [SubcontractorPaymentController::class, 'index'])->middleware('permission:subcontractor_payment.view,projectId');
        Route::post('/{projectId}/subcontractor-payments', [SubcontractorPaymentController::class, 'store'])->middleware('permission:subcontractor_payment.create,projectId');
        Route::get('/{projectId}/subcontractor-payments/{id}', [SubcontractorPaymentController::class, 'show'])->middleware('permission:subcontractor_payment.view,projectId');
        Route::put('/{projectId}/subcontractor-payments/{id}', [SubcontractorPaymentController::class, 'update'])->middleware('permission:subcontractor_payment.update,projectId');
        Route::delete('/{projectId}/subcontractor-payments/{id}', [SubcontractorPaymentController::class, 'destroy'])->middleware('permission:subcontractor_payment.delete,projectId');
        Route::post('/{projectId}/subcontractor-payments/{id}/submit', [SubcontractorPaymentController::class, 'submit'])->middleware('permission:subcontractor_payment.create,projectId');
        Route::post('/{projectId}/subcontractor-payments/{id}/approve', [SubcontractorPaymentController::class, 'approve'])->middleware('permission:subcontractor_payment.approve,projectId');
        Route::post('/{projectId}/subcontractor-payments/{id}/reject', [SubcontractorPaymentController::class, 'reject'])->middleware('permission:subcontractor_payment.approve,projectId');
        Route::post('/{projectId}/subcontractor-payments/{id}/mark-paid', [SubcontractorPaymentController::class, 'markAsPaid'])->middleware('permission:subcontractor_payment.mark_paid,projectId');

        // Warranty & Maintenance
        Route::get('/{projectId}/warranties', [ProjectWarrantyController::class, 'index'])->middleware('permission:warranty.view,projectId');
        Route::post('/{projectId}/warranties', [ProjectWarrantyController::class, 'storeWarranty'])->middleware('permission:warranty.create,projectId');
        Route::put('/{projectId}/warranties/{uuid}', [ProjectWarrantyController::class, 'updateWarranty'])->middleware('permission:warranty.update,projectId');
        Route::post('/{projectId}/warranties/{uuid}/submit', [ProjectWarrantyController::class, 'submitWarranty'])->middleware('permission:warranty.update,projectId');
        Route::post('/{projectId}/warranties/{uuid}/approve', [ProjectWarrantyController::class, 'approveWarranty'])->middleware('permission:warranty.approve,projectId');
        Route::post('/{projectId}/warranties/{uuid}/reject', [ProjectWarrantyController::class, 'rejectWarranty'])->middleware('permission:warranty.approve,projectId');
        Route::delete('/{projectId}/warranties/{uuid}', [ProjectWarrantyController::class, 'destroyWarranty'])->middleware('permission:warranty.delete,projectId');
        Route::post('/{projectId}/maintenances', [ProjectWarrantyController::class, 'storeMaintenance'])->middleware('permission:warranty.create,projectId');
        Route::put('/{projectId}/maintenances/{uuid}', [ProjectWarrantyController::class, 'updateMaintenance'])->middleware('permission:warranty.update,projectId');
        Route::post('/{projectId}/maintenances/{uuid}/submit', [ProjectWarrantyController::class, 'submitMaintenance'])->middleware('permission:warranty.update,projectId');
        Route::post('/{projectId}/maintenances/{uuid}/approve', [ProjectWarrantyController::class, 'approveMaintenance'])->middleware('permission:warranty.approve,projectId');
        Route::post('/{projectId}/maintenances/{uuid}/reject', [ProjectWarrantyController::class, 'rejectMaintenance'])->middleware('permission:warranty.approve,projectId');
        Route::delete('/{projectId}/maintenances/{uuid}', [ProjectWarrantyController::class, 'destroyMaintenance'])->middleware('permission:warranty.delete,projectId');
    });

    // Acceptance Templates (outside projects prefix)
    Route::get('/acceptance-templates', [AcceptanceTemplateController::class, 'index']);
    Route::post('/acceptance-templates', [AcceptanceTemplateController::class, 'store']);
    Route::get('/acceptance-templates/{id}', [AcceptanceTemplateController::class, 'show'])->where('id', '[0-9]+');
    Route::put('/acceptance-templates/{id}', [AcceptanceTemplateController::class, 'update'])->where('id', '[0-9]+');
    Route::delete('/acceptance-templates/{id}', [AcceptanceTemplateController::class, 'destroy'])->where('id', '[0-9]+');

    // WBS Templates (Sprint 1 — Module 1)
    Route::prefix('wbs-templates')->group(function () {
        Route::get('/', [WbsTemplateController::class, 'index']);
        Route::post('/', [WbsTemplateController::class, 'store']);
        Route::get('/{id}', [WbsTemplateController::class, 'show']);
    });

    // ===================================================================

    // User routes
    Route::middleware('auth:sanctum')->group(function () {
        // Permission checking routes
        Route::get('/permissions/my-permissions', [PermissionController::class, 'myPermissions']);
        Route::get('/permissions/check/{permission}', [PermissionController::class, 'checkPermission']);
        Route::get('/permissions/project/{projectId}/check/{permission}', [PermissionController::class, 'checkProjectPermission']);
        Route::get('/permissions/project/{projectId}/all', [PermissionController::class, 'projectPermissions']);
    });

    // ===================================================================
    // SETTINGS ROUTES - Quản lý cấu hình hệ thống
    // ===================================================================
    // Cost Groups - View endpoint (accessible to users with costs.view or costs.create)
    Route::middleware(['auth:sanctum'])->prefix('settings')->group(function () {
        Route::get('/cost-groups', [CostGroupController::class, 'index']);
        Route::get('/cost-groups/{id}', [CostGroupController::class, 'show']);

        // Equipment list for project modules
        Route::get('/equipment', [EquipmentController::class, 'index']);
        Route::get('/equipment/{id}', [EquipmentController::class, 'show']);
    });

    // Cost Groups - Manage endpoints (require settings.manage permission)
    Route::middleware(['auth:sanctum', 'check.permission:settings.manage'])->prefix('settings')->group(function () {
        // Permissions Management
        Route::get('/permissions', [PermissionController::class, 'index']);
        Route::post('/permissions', [PermissionController::class, 'store']);
        Route::put('/permissions/{id}', [PermissionController::class, 'update']);
        Route::delete('/permissions/{id}', [PermissionController::class, 'destroy']);

        // Roles Management
        Route::get('/roles', [RoleController::class, 'index']);
        Route::get('/roles/{id}', [RoleController::class, 'show']);
        Route::post('/roles', [RoleController::class, 'store']);
        Route::put('/roles/{id}', [RoleController::class, 'update']);
        Route::delete('/roles/{id}', [RoleController::class, 'destroy']);

        Route::post('/cost-groups', [CostGroupController::class, 'store']);
        Route::put('/cost-groups/{id}', [CostGroupController::class, 'update']);
        Route::delete('/cost-groups/{id}', [CostGroupController::class, 'destroy']);



        // Global Subcontractors (Nhà thầu phụ hệ thống)
        Route::get('/subcontractors', [GlobalSubcontractorController::class, 'index']);
        Route::post('/subcontractors', [GlobalSubcontractorController::class, 'store']);
        Route::get('/subcontractors/{id}', [GlobalSubcontractorController::class, 'show']);
        Route::put('/subcontractors/{id}', [GlobalSubcontractorController::class, 'update']);
        Route::delete('/subcontractors/{id}', [GlobalSubcontractorController::class, 'destroy']);

        // Suppliers (Nhà cung cấp - NCC)
        Route::prefix('suppliers')->group(function () {
            Route::get('/', [SupplierController::class, 'index']);
            Route::post('/', [SupplierController::class, 'store']);
            Route::get('/{id}', [SupplierController::class, 'show']);
            Route::get('/{id}/debt-statistics', [SupplierController::class, 'debtStatistics']);
            Route::put('/{id}', [SupplierController::class, 'update']);
            Route::delete('/{id}', [SupplierController::class, 'destroy']);
        });

        // Subcontractor Contracts (Hợp đồng thầu phụ)
        Route::prefix('subcontractor-contracts')->group(function () {
            Route::get('/', [SubcontractorContractController::class, 'index']);
            Route::post('/', [SubcontractorContractController::class, 'store']);
            Route::get('/{id}', [SubcontractorContractController::class, 'show']);
            Route::put('/{id}', [SubcontractorContractController::class, 'update']);
            Route::delete('/{id}', [SubcontractorContractController::class, 'destroy']);
            Route::post('/{id}/sign', [SubcontractorContractController::class, 'sign']);
        });

        // Supplier Contracts (Hợp đồng NCC)
        Route::prefix('supplier-contracts')->group(function () {
            Route::get('/', [SupplierContractController::class, 'index']);
            Route::post('/', [SupplierContractController::class, 'store']);
            Route::get('/{id}', [SupplierContractController::class, 'show']);
            Route::put('/{id}', [SupplierContractController::class, 'update']);
            Route::delete('/{id}', [SupplierContractController::class, 'destroy']);
            Route::post('/{id}/sign', [SupplierContractController::class, 'sign']);
        });

        // Subcontractor Acceptances (Nghiệm thu thầu phụ)
        Route::prefix('subcontractor-acceptances')->group(function () {
            Route::get('/', [SubcontractorAcceptanceController::class, 'index']);
            Route::post('/', [SubcontractorAcceptanceController::class, 'store']);
            Route::get('/{id}', [SubcontractorAcceptanceController::class, 'show']);
            Route::put('/{id}', [SubcontractorAcceptanceController::class, 'update']);
            Route::delete('/{id}', [SubcontractorAcceptanceController::class, 'destroy']);
            Route::post('/{id}/approve', [SubcontractorAcceptanceController::class, 'approve']);
            Route::post('/{id}/reject', [SubcontractorAcceptanceController::class, 'reject']);
        });

        // Supplier Acceptances (Nghiệm thu NCC)
        Route::prefix('supplier-acceptances')->group(function () {
            Route::get('/', [SupplierAcceptanceController::class, 'index']);
            Route::post('/', [SupplierAcceptanceController::class, 'store']);
            Route::get('/{id}', [SupplierAcceptanceController::class, 'show']);
            Route::put('/{id}', [SupplierAcceptanceController::class, 'update']);
            Route::delete('/{id}', [SupplierAcceptanceController::class, 'destroy']);
            Route::post('/{id}/approve', [SupplierAcceptanceController::class, 'approve']);
            Route::post('/{id}/reject', [SupplierAcceptanceController::class, 'reject']);
        });

        // Subcontractor Progress (Tiến độ thi công thầu phụ)
        Route::prefix('subcontractor-progress')->group(function () {
            Route::get('/', [SubcontractorProgressController::class, 'index']);
            Route::post('/', [SubcontractorProgressController::class, 'store']);
            Route::get('/{id}', [SubcontractorProgressController::class, 'show']);
            Route::put('/{id}', [SubcontractorProgressController::class, 'update']);
            Route::delete('/{id}', [SubcontractorProgressController::class, 'destroy']);
            Route::post('/{id}/verify', [SubcontractorProgressController::class, 'verify']);
        });
    });
});





// ===================================================================
// FILE UPLOAD ROUTE - Yêu cầu authentication
// ===================================================================
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/upload', [AttachmentController::class, 'upload'])
        ->name('upload.file');

    // Attachment management
    Route::get('/attachments/{id}', [AttachmentController::class, 'show'])
        ->name('attachments.show');
    Route::delete('/attachments/{id}', [AttachmentController::class, 'destroy'])
        ->name('attachments.destroy');
});

// ===================================================================
// ADMIN API ROUTES - Yêu cầu authentication và admin role
// ===================================================================
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {

    // ========== QUẢN LÝ NGƯỜI DÙNG ==========
    Route::prefix('users')->group(function () {
        Route::get('/', [AdminUserController::class, 'index']); // Danh sách users
        Route::post('/', [AdminUserController::class, 'store']); // Tạo user mới
        Route::get('/{id}', [AdminUserController::class, 'show']); // Chi tiết user
        Route::put('/{id}', [AdminUserController::class, 'update']); // Cập nhật user
        Route::post('/{id}/ban', [AdminUserController::class, 'ban']); // Khóa tài khoản
        Route::post('/{id}/unban', [AdminUserController::class, 'unban']); // Mở khóa tài khoản
        Route::delete('/{id}', [AdminUserController::class, 'destroy']); // Xóa vĩnh viễn
        Route::get('/{id}/roles', [AdminUserController::class, 'getUserRoles']); // Lấy roles của user
        Route::post('/{id}/roles', [AdminUserController::class, 'syncUserRoles']); // Gán roles cho user
    });



    // ========== NEW MODULES ROUTES ==========

    // Departments
    Route::prefix('departments')->group(function () {
        Route::get('/', [DepartmentController::class, 'index']);
        Route::post('/', [DepartmentController::class, 'store']);
        Route::get('/{id}', [DepartmentController::class, 'show']);
        Route::get('/{id}/statistics', [DepartmentController::class, 'statistics']);
        Route::put('/{id}', [DepartmentController::class, 'update']);
        Route::delete('/{id}', [DepartmentController::class, 'destroy']);
    });

    // Materials (catalog management — no inventory/stock)
    Route::prefix('materials')->group(function () {
        Route::get('/', [MaterialController::class, 'index']);
        Route::post('/', [MaterialController::class, 'store']);
        Route::get('/{id}', [MaterialController::class, 'show']);
        Route::get('/{id}/transactions', [MaterialController::class, 'getTransactions']);
        Route::put('/{id}', [MaterialController::class, 'update']);
        Route::delete('/{id}', [MaterialController::class, 'destroy']);
    });

    // Equipment (Company Warehouse)
    Route::prefix('equipment')->group(function () {
        Route::get('/', [EquipmentController::class, 'index']);
        Route::post('/', [EquipmentController::class, 'store']);
        Route::get('/{id}', [EquipmentController::class, 'show']);
        Route::get('/{id}/allocations', [EquipmentController::class, 'getAllocations']);
        Route::get('/{id}/maintenance', [EquipmentController::class, 'getMaintenance']);
        Route::put('/{id}', [EquipmentController::class, 'update']);
        Route::delete('/{id}', [EquipmentController::class, 'destroy']);
        
        // Workflow actions (gọi từ mobile app)
        Route::post('/{id}/submit', [\App\Http\Controllers\Admin\CrmEquipmentController::class, 'submit']);
        Route::post('/{id}/approve-management', [\App\Http\Controllers\Admin\CrmEquipmentController::class, 'approveManagement']);
        Route::post('/{id}/confirm-accountant', [\App\Http\Controllers\Admin\CrmEquipmentController::class, 'confirmAccountant']);
        Route::post('/{id}/reject', [\App\Http\Controllers\Admin\CrmEquipmentController::class, 'reject']);
    });

    // Moved Settings: Danh mục thiết bị to settings group above

    // Thiết bị kho công ty còn tồn (cho dropdown Module Sử dụng tài sản)
    Route::get('/available-assets', [AssetUsageController::class, 'availableAssets']);


    // Receipts
    Route::prefix('receipts')->group(function () {
        Route::get('/', [ReceiptController::class, 'index']);
        Route::post('/', [ReceiptController::class, 'store']);
        Route::get('/{id}', [ReceiptController::class, 'show']);
        Route::post('/{id}/verify', [ReceiptController::class, 'verify']);
        Route::put('/{id}', [ReceiptController::class, 'update']);
        Route::delete('/{id}', [ReceiptController::class, 'destroy']);
    });

    // NOTE: Leave, Employment Contracts, Insurance, Performance modules
    // have been removed — controllers were never implemented.

    // Reminders
    Route::prefix('reminders')->group(function () {
        Route::get('/', [ReminderController::class, 'index']);
        Route::post('/', [ReminderController::class, 'store']);
        Route::get('/{id}', [ReminderController::class, 'show']);
        Route::put('/{id}', [ReminderController::class, 'update']);
        Route::delete('/{id}', [ReminderController::class, 'destroy']);
        Route::post('/send-pending', [ReminderController::class, 'sendPendingReminders']);
        Route::post('/{id}/mark-sent', [ReminderController::class, 'markAsSent']);
    });

    // Reports (Báo cáo)
    Route::prefix('reports')->group(function () {
        Route::get('/projects/{projectId}/progress', [ReportController::class, 'progressReport']);
        Route::get('/projects/{projectId}/construction-progress', [ReportController::class, 'constructionProgress']);
        Route::get('/projects/{projectId}/material-procurement', [ReportController::class, 'materialProcurement']);
        Route::get('/projects/{projectId}/revenue-expense-by-work', [ReportController::class, 'revenueExpenseByWork']);
        Route::get('/projects/{projectId}/revenue-expense', [ReportController::class, 'projectRevenueExpense']);
        Route::get('/projects/{projectId}/material-usage', [ReportController::class, 'materialUsage']);
        Route::get('/projects/{projectId}/construction-logs', [ReportController::class, 'constructionLogs']);
        Route::get('/projects/{projectId}/debt-payment', [ReportController::class, 'debtAndPayment']);
    });
});
