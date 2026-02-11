<?php

use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\RegionsController;
use App\Http\Controllers\Api\RequestController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AdminFlightController;
use App\Http\Controllers\Api\AdminOrderController;
use App\Http\Controllers\Api\AdminAirlineController;
use App\Http\Controllers\Api\AdminAirportController;
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

Route::post('register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);
Route::post('forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('reset-password', [AuthController::class, 'resetPassword']);
Route::get('regions', [RegionsController::class, 'index']);
Route::post('/users/save-token', [UserController::class, 'savePushToken']);

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/chat/send', [ChatController::class, 'sendMessage']);
    Route::post('logout', [AuthController::class, 'logout']);

    // Orders
    Route::get('orders/getList', [OrderController::class, 'index']);
    Route::post('orders/store', [OrderController::class, 'store']);
    Route::get('orders/{id}/show', [OrderController::class, 'show']);
    Route::put('orders/{id}/status', [OrderController::class, 'updateStatus']);


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

    // KYC Verification
    Route::post('kyc/submit', [\App\Http\Controllers\Api\KycController::class, 'submit']);
    Route::get('kyc/status', [\App\Http\Controllers\Api\KycController::class, 'status']);




    // ===================================================================
    // PROJECT MANAGEMENT ROUTES
    // ===================================================================

    // Monitoring Dashboard (tổng quan tất cả projects)
    Route::get('monitoring/dashboard', [ProjectMonitoringController::class, 'dashboard']);

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

        // Subcontractors
        Route::get('/{projectId}/subcontractors', [SubcontractorController::class, 'index']);
        Route::post('/{projectId}/subcontractors', [SubcontractorController::class, 'store']);
        Route::get('/{projectId}/subcontractors/{id}', [SubcontractorController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{projectId}/subcontractors/{id}', [SubcontractorController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{projectId}/subcontractors/{id}', [SubcontractorController::class, 'destroy'])->where('id', '[0-9]+');
        Route::post('/{projectId}/subcontractors/{id}/approve', [SubcontractorController::class, 'approve'])->where('id', '[0-9]+');

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

        // Construction Logs
        Route::get('/{projectId}/logs', [ConstructionLogController::class, 'index']);
        Route::post('/{projectId}/logs', [ConstructionLogController::class, 'store']);
        Route::put('/{projectId}/logs/{id}', [ConstructionLogController::class, 'update']);
        Route::delete('/{projectId}/logs/{id}', [ConstructionLogController::class, 'destroy']);

        // Budgets
        Route::get('/{projectId}/budgets', [BudgetController::class, 'index']);
        Route::post('/{projectId}/budgets', [BudgetController::class, 'store']);
        Route::get('/{projectId}/budgets/{id}', [BudgetController::class, 'show']);
        Route::get('/{projectId}/budgets/{id}/compare', [BudgetController::class, 'compareWithActual']);
        Route::put('/{projectId}/budgets/{id}', [BudgetController::class, 'update']);
        Route::delete('/{projectId}/budgets/{id}', [BudgetController::class, 'destroy']);
        Route::post('/{projectId}/budgets/sync', [BudgetController::class, 'sync']);
        Route::post('/{projectId}/budgets/{id}/sync', [BudgetController::class, 'sync']);

        // Materials
        Route::get('/{projectId}/materials', [MaterialController::class, 'getByProject']);
        Route::post('/{projectId}/materials/transactions', [MaterialController::class, 'createTransaction']);

        // Equipment
        Route::get('/{projectId}/equipment', [EquipmentController::class, 'getByProject']);
        Route::post('/{projectId}/equipment/allocations', [EquipmentController::class, 'createAllocation']);

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
        Route::get('/{projectId}/defects', [DefectController::class, 'index']);
        Route::post('/{projectId}/defects', [DefectController::class, 'store']);
        Route::get('/{projectId}/defects/{id}', [DefectController::class, 'show']);
        Route::put('/{projectId}/defects/{id}', [DefectController::class, 'update']);

        // Project Risks
        Route::get('/{projectId}/risks', [ProjectRiskController::class, 'index']);
        Route::post('/{projectId}/risks', [ProjectRiskController::class, 'store']);
        Route::get('/{projectId}/risks/{id}', [ProjectRiskController::class, 'show']);
        Route::put('/{projectId}/risks/{id}', [ProjectRiskController::class, 'update']);
        Route::delete('/{projectId}/risks/{id}', [ProjectRiskController::class, 'destroy']);
        Route::post('/{projectId}/risks/{id}/resolve', [ProjectRiskController::class, 'markAsResolved']);

        // Change Requests
        Route::get('/{projectId}/change-requests', [ChangeRequestController::class, 'index']);
        Route::post('/{projectId}/change-requests', [ChangeRequestController::class, 'store']);
        Route::get('/{projectId}/change-requests/{id}', [ChangeRequestController::class, 'show']);
        Route::put('/{projectId}/change-requests/{id}', [ChangeRequestController::class, 'update']);
        Route::delete('/{projectId}/change-requests/{id}', [ChangeRequestController::class, 'destroy']);
        Route::post('/{projectId}/change-requests/{id}/submit', [ChangeRequestController::class, 'submit']);
        Route::post('/{projectId}/change-requests/{id}/approve', [ChangeRequestController::class, 'approve']);
        Route::post('/{projectId}/change-requests/{id}/reject', [ChangeRequestController::class, 'reject']);
        Route::post('/{projectId}/change-requests/{id}/implement', [ChangeRequestController::class, 'markAsImplemented']);

        // EVM Metrics
        Route::get('/{projectId}/evm/latest', [ProjectEvmController::class, 'latest']);
        Route::post('/{projectId}/evm/calculate', [ProjectEvmController::class, 'calculate']);
        Route::get('/{projectId}/evm/history', [ProjectEvmController::class, 'history']);
        Route::get('/{projectId}/evm/analyze', [ProjectEvmController::class, 'analyze']);

        // Predictive Analytics
        Route::get('/{projectId}/predictions/completion', [PredictiveAnalyticsController::class, 'predictCompletion']);
        Route::get('/{projectId}/predictions/cost', [PredictiveAnalyticsController::class, 'predictCost']);
        Route::get('/{projectId}/predictions/delay-risk', [PredictiveAnalyticsController::class, 'analyzeDelayRisk']);
        Route::get('/{projectId}/predictions/cost-risk', [PredictiveAnalyticsController::class, 'analyzeCostRisk']);
        Route::get('/{projectId}/predictions/full', [PredictiveAnalyticsController::class, 'fullAnalysis']);

        // Project Monitoring
        Route::get('/{projectId}/monitoring', [ProjectMonitoringController::class, 'projectMonitoring']);

        // Comments
        Route::get('/{projectId}/comments', [ProjectCommentController::class, 'index']);
        Route::get('/{projectId}/comments/latest', [ProjectCommentController::class, 'getLatest']);
        Route::post('/{projectId}/comments', [ProjectCommentController::class, 'store']);
        Route::put('/{projectId}/comments/{id}', [ProjectCommentController::class, 'update']);
        Route::delete('/{projectId}/comments/{id}', [ProjectCommentController::class, 'destroy']);

        // Báo cáo tổng hợp dự án
        Route::get('/{projectId}/summary-report', [ProjectSummaryReportController::class, 'getSummaryReport']);
        Route::get('/{projectId}/summary-report/costs/{type}', [ProjectSummaryReportController::class, 'getCostDetails']);

        // Progress
        Route::get('/{projectId}/progress', [ProjectProgressController::class, 'show']);
        Route::get('/{projectId}/progress/overview', [ProjectProgressController::class, 'overview']);

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

        // Gantt Chart - Task Dependencies
        Route::post('/{projectId}/tasks/{taskId}/dependencies', [ProjectTaskDependencyController::class, 'store']);
        Route::delete('/{projectId}/tasks/{taskId}/dependencies/{id}', [ProjectTaskDependencyController::class, 'destroy']);
        Route::post('/{projectId}/tasks/{taskId}/dependencies/validate', [ProjectTaskDependencyController::class, 'validateCircular']);

        // Teams Management
        Route::get('/{projectId}/teams', [TeamController::class, 'index']);
        Route::post('/{projectId}/teams', [TeamController::class, 'store']);
        Route::get('/{projectId}/teams/{id}', [TeamController::class, 'show']);
        Route::put('/{projectId}/teams/{id}', [TeamController::class, 'update']);
        Route::delete('/{projectId}/teams/{id}', [TeamController::class, 'destroy']);
        Route::post('/{projectId}/teams/{id}/members', [TeamController::class, 'addMember']);
        Route::delete('/{projectId}/teams/{id}/members', [TeamController::class, 'removeMember']);

        // Team Contracts
        Route::get('/{projectId}/team-contracts', [TeamContractController::class, 'index']);
        Route::post('/{projectId}/team-contracts', [TeamContractController::class, 'store']);
        Route::get('/{projectId}/team-contracts/{id}', [TeamContractController::class, 'show']);
        Route::put('/{projectId}/team-contracts/{id}', [TeamContractController::class, 'update']);
        Route::delete('/{projectId}/team-contracts/{id}', [TeamContractController::class, 'destroy']);
        Route::post('/{projectId}/team-contracts/{id}/approve', [TeamContractController::class, 'approve']);

        // Labor Standards
        Route::get('/{projectId}/labor-standards', [LaborStandardController::class, 'index']);
        Route::post('/{projectId}/labor-standards', [LaborStandardController::class, 'store']);
        Route::get('/{projectId}/labor-standards/{id}', [LaborStandardController::class, 'show']);
        Route::put('/{projectId}/labor-standards/{id}', [LaborStandardController::class, 'update']);
        Route::delete('/{projectId}/labor-standards/{id}', [LaborStandardController::class, 'destroy']);

        // Subcontractor Payments
        Route::get('/{projectId}/subcontractor-payments', [SubcontractorPaymentController::class, 'index']);
        Route::post('/{projectId}/subcontractor-payments', [SubcontractorPaymentController::class, 'store']);
        Route::get('/{projectId}/subcontractor-payments/{id}', [SubcontractorPaymentController::class, 'show']);
        Route::put('/{projectId}/subcontractor-payments/{id}', [SubcontractorPaymentController::class, 'update']);
        Route::delete('/{projectId}/subcontractor-payments/{id}', [SubcontractorPaymentController::class, 'destroy']);
        Route::post('/{projectId}/subcontractor-payments/{id}/submit', [SubcontractorPaymentController::class, 'submit']);
        Route::post('/{projectId}/subcontractor-payments/{id}/approve', [SubcontractorPaymentController::class, 'approve']);
        Route::post('/{projectId}/subcontractor-payments/{id}/reject', [SubcontractorPaymentController::class, 'reject']);
        Route::post('/{projectId}/subcontractor-payments/{id}/mark-paid', [SubcontractorPaymentController::class, 'markAsPaid']);
    });

    // Acceptance Templates (outside projects prefix)
    Route::get('/acceptance-templates', [AcceptanceTemplateController::class, 'index']);
    Route::post('/acceptance-templates', [AcceptanceTemplateController::class, 'store']);
    Route::get('/acceptance-templates/{id}', [AcceptanceTemplateController::class, 'show'])->where('id', '[0-9]+');
    Route::put('/acceptance-templates/{id}', [AcceptanceTemplateController::class, 'update'])->where('id', '[0-9]+');
    Route::delete('/acceptance-templates/{id}', [AcceptanceTemplateController::class, 'destroy'])->where('id', '[0-9]+');

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

// Social Login Routes (Google & Facebook)
Route::controller(AuthController::class)->group(function () {
    // Redirect to provider (for web - optional)
    Route::get('auth/{provider}/redirect', 'redirectToProvider');

    // Handle callback - support both GET (web) and POST (mobile app)
    Route::get('auth/{provider}/callback', 'handleProviderCallback');
    Route::post('auth/{provider}/callback', 'handleProviderCallback');

    // Direct login with access token (for mobile app - recommended)
    Route::post('auth/{provider}/login', 'handleProviderCallback');
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

    // ========== QUẢN LÝ CHUYẾN BAY ==========
    Route::prefix('flights')->group(function () {
        Route::get('/', [AdminFlightController::class, 'index']); // Danh sách flights
        Route::get('/statistics', [AdminFlightController::class, 'statistics']); // Thống kê
        Route::get('/{id}', [AdminFlightController::class, 'show']); // Chi tiết flight
        Route::post('/{id}/verify', [AdminFlightController::class, 'verify']); // Xác thực flight
        Route::post('/{id}/reject', [AdminFlightController::class, 'reject']); // Từ chối flight
        Route::post('/{id}/cancel', [AdminFlightController::class, 'cancel']); // Hủy flight
    });

    // ========== QUẢN LÝ ĐƠN HÀNG ==========
    Route::prefix('orders')->group(function () {
        Route::get('/', [AdminOrderController::class, 'index']); // Danh sách orders
        Route::get('/statistics', [AdminOrderController::class, 'statistics']); // Thống kê
        Route::get('/{id}', [AdminOrderController::class, 'show']); // Chi tiết order
        Route::put('/{id}/status', [AdminOrderController::class, 'updateStatus']); // Cập nhật trạng thái
        Route::post('/{id}/cancel', [AdminOrderController::class, 'cancel']); // Hủy đơn hàng
    });

    // ========== QUẢN LÝ HÃNG HÀNG KHÔNG ==========
    Route::prefix('airlines')->group(function () {
        Route::get('/', [AdminAirlineController::class, 'index']); // Danh sách airlines
        Route::post('/', [AdminAirlineController::class, 'store']); // Tạo mới airline
        Route::get('/{id}', [AdminAirlineController::class, 'show']); // Chi tiết airline
        Route::put('/{id}', [AdminAirlineController::class, 'update']); // Cập nhật airline
        Route::delete('/{id}', [AdminAirlineController::class, 'destroy']); // Xóa airline
    });

    // ========== QUẢN LÝ SÂN BAY ==========
    Route::prefix('airports')->group(function () {
        Route::get('/', [AdminAirportController::class, 'index']); // Danh sách airports
        Route::post('/', [AdminAirportController::class, 'store']); // Tạo mới airport
        Route::get('/{id}', [AdminAirportController::class, 'show']); // Chi tiết airport
        Route::put('/{id}', [AdminAirportController::class, 'update']); // Cập nhật airport
        Route::delete('/{id}', [AdminAirportController::class, 'destroy']); // Xóa airport
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

    // Materials
    Route::prefix('materials')->group(function () {
        Route::get('/', [MaterialController::class, 'index']);
        Route::post('/', [MaterialController::class, 'store']);
        Route::get('/{id}', [MaterialController::class, 'show']);
        Route::get('/{id}/stock', [MaterialController::class, 'getStock']);
        Route::get('/{id}/transactions', [MaterialController::class, 'getTransactions']);
        Route::put('/{id}', [MaterialController::class, 'update']);
        Route::delete('/{id}', [MaterialController::class, 'destroy']);
        Route::post('/{id}/adjust-stock', [MaterialController::class, 'adjustStock']);
    });

    // Equipment
    Route::prefix('equipment')->group(function () {
        Route::get('/', [EquipmentController::class, 'index']);
        Route::post('/', [EquipmentController::class, 'store']);
        Route::get('/{id}', [EquipmentController::class, 'show']);
        Route::get('/{id}/allocations', [EquipmentController::class, 'getAllocations']);
        Route::get('/{id}/maintenance', [EquipmentController::class, 'getMaintenance']);
        Route::put('/{id}', [EquipmentController::class, 'update']);
        Route::delete('/{id}', [EquipmentController::class, 'destroy']);
    });


    // Receipts
    Route::prefix('receipts')->group(function () {
        Route::get('/', [ReceiptController::class, 'index']);
        Route::post('/', [ReceiptController::class, 'store']);
        Route::get('/{id}', [ReceiptController::class, 'show']);
        Route::post('/{id}/verify', [ReceiptController::class, 'verify']);
        Route::put('/{id}', [ReceiptController::class, 'update']);
        Route::delete('/{id}', [ReceiptController::class, 'destroy']);
    });

    // Leave Management
    Route::prefix('leave')->group(function () {
        Route::get('/requests', [LeaveController::class, 'getRequests']);
        Route::post('/requests', [LeaveController::class, 'createRequest']);
        Route::post('/requests/{id}/approve', [LeaveController::class, 'approve']);
        Route::post('/requests/{id}/reject', [LeaveController::class, 'reject']);
        Route::get('/balance', [LeaveController::class, 'getBalance']);
    });

    // Employment Contracts
    Route::prefix('employment-contracts')->group(function () {
        Route::get('/', [EmploymentContractController::class, 'index']);
        Route::post('/', [EmploymentContractController::class, 'store']);
        Route::get('/{id}', [EmploymentContractController::class, 'show']);
        Route::put('/{id}', [EmploymentContractController::class, 'update']);
        Route::post('/{id}/renew', [EmploymentContractController::class, 'renew']);
        Route::post('/{id}/terminate', [EmploymentContractController::class, 'terminate']);
        Route::delete('/{id}', [EmploymentContractController::class, 'destroy']);
    });

    // Insurance & Benefits
    Route::prefix('insurance')->group(function () {
        Route::get('/', [InsuranceController::class, 'getInsurance']);
        Route::put('/', [InsuranceController::class, 'updateInsurance']);
        Route::get('/benefits', [InsuranceController::class, 'getBenefits']);
        Route::post('/benefits', [InsuranceController::class, 'createBenefit']);
        Route::put('/benefits/{id}', [InsuranceController::class, 'updateBenefit']);
        Route::delete('/benefits/{id}', [InsuranceController::class, 'deleteBenefit']);
    });

    // Performance Evaluations
    Route::prefix('performance')->group(function () {
        Route::get('/evaluations', [PerformanceController::class, 'getEvaluations']);
        Route::post('/evaluations', [PerformanceController::class, 'createEvaluation']);
        Route::get('/evaluations/{id}', [PerformanceController::class, 'showEvaluation']);
        Route::put('/evaluations/{id}', [PerformanceController::class, 'updateEvaluation']);
    });

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
