<?php

use App\Http\Controllers\Api\AirlineController;
use App\Http\Controllers\Api\AirportController;
use App\Http\Controllers\Api\AttachmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\FlightController;
use App\Http\Controllers\Api\FlightSearchController;
use App\Http\Controllers\Api\PaymentMethodController;
use App\Http\Controllers\Api\WalletController;
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
use App\Http\Controllers\Api\AcceptanceStageController;
use App\Http\Controllers\Api\DefectController;
use App\Http\Controllers\Api\ProjectProgressController;
use App\Http\Controllers\Api\ProjectDocumentController;
use App\Http\Controllers\Api\RevenueController;
use App\Http\Controllers\Api\CostController;
use App\Http\Controllers\Api\TimeTrackingController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\BonusController;
use App\Http\Controllers\Api\EmployeeSalaryConfigController;
use App\Http\Controllers\Api\WorkScheduleController;
use App\Http\Controllers\Api\PersonnelRoleController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\UserPermissionController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\EmployeeProfileController;
use App\Http\Controllers\Api\TeamCheckInController;
use App\Http\Controllers\Api\OvertimeRuleController;
use App\Http\Controllers\Api\OvertimeCategoryController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Controllers\Api\TeamContractController;
use App\Http\Controllers\Api\LaborStandardController;
use App\Http\Controllers\Api\WorkVolumeController;
use App\Http\Controllers\Api\SubcontractorPaymentController;
use App\Http\Controllers\Api\ProjectPhaseController;
use App\Http\Controllers\Api\ProjectTaskController;
use App\Http\Controllers\Api\ProjectTaskDependencyController;
use App\Http\Controllers\Api\AcceptanceItemController;

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
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::put('notifications/{notification}', [NotificationController::class, 'markAsRead']);
    Route::put('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']); // Đánh dấu tất cả đã đọc
    Route::post('notifications/broadcast', [NotificationController::class, 'broadcast']); // Gửi thông báo hệ thống

    Route::get('user/profile', [UserController::class, 'show']);
    Route::put('user/profile', [UserController::class, 'update']);
    Route::post('user/change-password', [UserController::class, 'changePassword']);
    Route::post('user/upload-avatar', [UserController::class, 'uploadAvatar']);
    Route::delete('user/account', [UserController::class, 'deleteAccount']); // Xóa tài khoản (yêu cầu Apple)

    // Public user profile (lấy thông tin user khác)
    Route::get('users/{id}', [UserController::class, 'showById']);

    // KYC Verification
    Route::post('kyc/submit', [\App\Http\Controllers\Api\KycController::class, 'submit']);
    Route::get('kyc/status', [\App\Http\Controllers\Api\KycController::class, 'status']);




    // ===================================================================
    // PROJECT MANAGEMENT ROUTES
    // ===================================================================
    Route::prefix('projects')->group(function () {
        // Projects CRUD
        Route::get('/', [ProjectController::class, 'index']);
        Route::get('/customers', [ProjectController::class, 'getCustomers']);
        Route::get('/project-managers', [ProjectController::class, 'getProjectManagers']);
        Route::post('/', [ProjectController::class, 'store']);
        Route::get('/{id}', [ProjectController::class, 'show']);
        Route::put('/{id}', [ProjectController::class, 'update']);
        Route::delete('/{id}', [ProjectController::class, 'destroy']);

        // Contracts
        Route::get('/{projectId}/contract', [ContractController::class, 'show']);
        Route::post('/{projectId}/contract', [ContractController::class, 'store']);
        Route::put('/{projectId}/contract', [ContractController::class, 'update']);
        Route::post('/{projectId}/contract/approve', [ContractController::class, 'approve']);

        // Payments
        Route::get('/{projectId}/payments', [ProjectPaymentController::class, 'index']);
        Route::post('/{projectId}/payments', [ProjectPaymentController::class, 'store']);
        Route::put('/{projectId}/payments/{id}', [ProjectPaymentController::class, 'update']);
        Route::post('/{projectId}/payments/{id}/confirm', [ProjectPaymentController::class, 'confirm']);

        // Additional Costs
        Route::get('/{projectId}/additional-costs', [AdditionalCostController::class, 'index']);
        Route::post('/{projectId}/additional-costs', [AdditionalCostController::class, 'store']);
        Route::post('/{projectId}/additional-costs/{id}/approve', [AdditionalCostController::class, 'approve']);
        Route::post('/{projectId}/additional-costs/{id}/reject', [AdditionalCostController::class, 'reject']);

        // Revenue Management
        Route::get('/{projectId}/revenue/summary', [RevenueController::class, 'projectSummary']);
        Route::get('/{projectId}/revenue/dashboard', [RevenueController::class, 'dashboard']);
        Route::get('/{projectId}/revenue/costs-by-category', [RevenueController::class, 'costsByCategory']);

        // Costs Management
        Route::get('/{projectId}/costs', [CostController::class, 'index']);
        Route::post('/{projectId}/costs', [CostController::class, 'store']);
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

        // Construction Logs
        Route::get('/{projectId}/logs', [ConstructionLogController::class, 'index']);
        Route::post('/{projectId}/logs', [ConstructionLogController::class, 'store']);
        Route::put('/{projectId}/logs/{id}', [ConstructionLogController::class, 'update']);
        Route::delete('/{projectId}/logs/{id}', [ConstructionLogController::class, 'destroy']);

        // Acceptance Stages
        Route::get('/{projectId}/acceptance', [AcceptanceStageController::class, 'index']);
        Route::post('/{projectId}/acceptance', [AcceptanceStageController::class, 'store']);
        Route::get('/{projectId}/acceptance/{id}', [AcceptanceStageController::class, 'show'])->where('id', '[0-9]+');
        Route::put('/{projectId}/acceptance/{id}', [AcceptanceStageController::class, 'update'])->where('id', '[0-9]+');
        Route::delete('/{projectId}/acceptance/{id}', [AcceptanceStageController::class, 'destroy'])->where('id', '[0-9]+');
        Route::post('/{projectId}/acceptance/{id}/approve', [AcceptanceStageController::class, 'approve'])->where('id', '[0-9]+');
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

        // Defects
        Route::get('/{projectId}/defects', [DefectController::class, 'index']);
        Route::post('/{projectId}/defects', [DefectController::class, 'store']);
        Route::put('/{projectId}/defects/{id}', [DefectController::class, 'update']);

        // Progress
        Route::get('/{projectId}/progress', [ProjectProgressController::class, 'show']);

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

        // Work Volumes
        Route::get('/{projectId}/work-volumes', [WorkVolumeController::class, 'index']);
        Route::post('/{projectId}/work-volumes', [WorkVolumeController::class, 'store']);
        Route::get('/{projectId}/work-volumes/{id}', [WorkVolumeController::class, 'show']);
        Route::put('/{projectId}/work-volumes/{id}', [WorkVolumeController::class, 'update']);
        Route::delete('/{projectId}/work-volumes/{id}', [WorkVolumeController::class, 'destroy']);
        Route::post('/{projectId}/work-volumes/{id}/verify', [WorkVolumeController::class, 'verify']);

        // Subcontractor Payments
        Route::get('/{projectId}/subcontractor-payments', [SubcontractorPaymentController::class, 'index']);
        Route::post('/{projectId}/subcontractor-payments', [SubcontractorPaymentController::class, 'store']);
        Route::get('/{projectId}/subcontractor-payments/{id}', [SubcontractorPaymentController::class, 'show']);
        Route::put('/{projectId}/subcontractor-payments/{id}', [SubcontractorPaymentController::class, 'update']);
        Route::delete('/{projectId}/subcontractor-payments/{id}', [SubcontractorPaymentController::class, 'destroy']);
        Route::post('/{projectId}/subcontractor-payments/{id}/approve', [SubcontractorPaymentController::class, 'approve']);
        Route::post('/{projectId}/subcontractor-payments/{id}/mark-paid', [SubcontractorPaymentController::class, 'markAsPaid']);
    });

    // ===================================================================
    // HR MANAGEMENT ROUTES
    // ===================================================================
    Route::middleware(['auth:sanctum', 'hr'])->prefix('hr')->group(function () {
        // Time Tracking
        Route::get('/time-tracking', [TimeTrackingController::class, 'index']);
        Route::post('/time-tracking', [TimeTrackingController::class, 'store']);
        Route::post('/time-tracking/check-in/qr', [TimeTrackingController::class, 'checkInByQR']);
        Route::post('/time-tracking/check-in/gps', [TimeTrackingController::class, 'checkInByGPS']);
        Route::post('/time-tracking/check-in/faceid', [TimeTrackingController::class, 'checkInByFaceID']);
        Route::put('/time-tracking/{id}', [TimeTrackingController::class, 'update']);
        Route::post('/time-tracking/{id}/approve', [TimeTrackingController::class, 'approve']);
        Route::post('/time-tracking/{id}/reject', [TimeTrackingController::class, 'reject']);

        // Team Check-ins (Chấm công tập thể)
        Route::get('/team-check-ins', [TeamCheckInController::class, 'index']);
        Route::post('/team-check-ins', [TeamCheckInController::class, 'store']);
        Route::get('/team-check-ins/{id}', [TeamCheckInController::class, 'show']);
        Route::post('/team-check-ins/{id}/approve', [TeamCheckInController::class, 'approve']);
        Route::post('/team-check-ins/{id}/sync', [TeamCheckInController::class, 'sync']);

        // Overtime Rules (Quy định OT)
        Route::get('/overtime-rules', [OvertimeRuleController::class, 'index']);
        Route::post('/overtime-rules', [OvertimeRuleController::class, 'store']);
        Route::put('/overtime-rules/{id}', [OvertimeRuleController::class, 'update']);
        Route::delete('/overtime-rules/{id}', [OvertimeRuleController::class, 'destroy']);

        // Overtime Categories (Hạng mục OT)
        Route::get('/overtime-categories', [OvertimeCategoryController::class, 'index']);
        Route::post('/overtime-categories', [OvertimeCategoryController::class, 'store']);
        Route::put('/overtime-categories/{id}', [OvertimeCategoryController::class, 'update']);
        Route::delete('/overtime-categories/{id}', [OvertimeCategoryController::class, 'destroy']);

        // Payroll
        Route::get('/payroll', [PayrollController::class, 'index']);
        Route::post('/payroll/calculate', [PayrollController::class, 'calculate']);
        Route::post('/payroll/calculate-all', [PayrollController::class, 'calculateAll']);
        // Route cụ thể phải đặt trước route có parameter {id}
        Route::get('/payroll/export', [PayrollController::class, 'export']);
        // Routes có parameter {id} đặt sau
        Route::get('/payroll/{id}', [PayrollController::class, 'show']);
        Route::post('/payroll/{id}/approve', [PayrollController::class, 'approve']);
        Route::post('/payroll/{id}/pay', [PayrollController::class, 'markAsPaid']);

        // Bonuses
        Route::get('/bonuses', [BonusController::class, 'index']);
        Route::post('/bonuses', [BonusController::class, 'store']);
        Route::put('/bonuses/{id}', [BonusController::class, 'update']);
        Route::delete('/bonuses/{id}', [BonusController::class, 'destroy']);
        Route::post('/bonuses/calculate-project/{projectId}', [BonusController::class, 'calculateFromProject']);
        Route::post('/bonuses/{id}/approve', [BonusController::class, 'approve']);
        Route::post('/bonuses/{id}/pay', [BonusController::class, 'markAsPaid']);

        // Salary Config
        Route::get('/salary-config', [EmployeeSalaryConfigController::class, 'index']);
        Route::post('/salary-config', [EmployeeSalaryConfigController::class, 'store']);
        Route::put('/salary-config/{id}', [EmployeeSalaryConfigController::class, 'update']);
        Route::delete('/salary-config/{id}', [EmployeeSalaryConfigController::class, 'destroy']);
        Route::get('/salary-config/user/{userId}', [EmployeeSalaryConfigController::class, 'getCurrentConfig']);

        // Work Schedule
        Route::get('/work-schedule', [WorkScheduleController::class, 'index']);
        Route::post('/work-schedule', [WorkScheduleController::class, 'store']);
        Route::put('/work-schedule/{id}', [WorkScheduleController::class, 'update']);
        Route::delete('/work-schedule/{id}', [WorkScheduleController::class, 'destroy']);
        Route::get('/work-schedule/calendar', [WorkScheduleController::class, 'calendar']);
        Route::get('/work-schedule/statistics', [WorkScheduleController::class, 'statistics']);
        Route::post('/work-schedule/bulk-create', [WorkScheduleController::class, 'bulkCreate']);

        // Employees (using AdminUserController)
        Route::get('/employees', [AdminUserController::class, 'index']);
        Route::post('/employees', [AdminUserController::class, 'store']); // Tạo user mới
        // Routes cụ thể phải đặt trước routes có parameter {id}
        Route::get('/employees/stats', [AdminUserController::class, 'stats']);
        Route::get('/employees/dashboard', [AdminUserController::class, 'dashboard']);
        // Routes có parameter {id} đặt sau
        Route::get('/employees/{id}', [AdminUserController::class, 'show']);
        Route::put('/employees/{id}', [AdminUserController::class, 'update']);
        Route::get('/employees/{id}/stats', [AdminUserController::class, 'employeeStats']);
        Route::get('/employees/{id}/roles', [AdminUserController::class, 'getUserRoles']); // Lấy roles của user
        Route::post('/employees/{id}/roles', [AdminUserController::class, 'syncUserRoles']); // Gán roles cho user

        // Employee Profiles (Hồ sơ nhân sự)
        Route::get('/employee-profiles', [EmployeeProfileController::class, 'index']);
        Route::get('/employee-profiles/statistics', [EmployeeProfileController::class, 'statistics']);
        Route::get('/employee-profiles/user/{userId}', [EmployeeProfileController::class, 'getByUserId']);
        Route::get('/employee-profiles/{id}', [EmployeeProfileController::class, 'show']);
        Route::post('/employee-profiles', [EmployeeProfileController::class, 'store']);
        Route::put('/employee-profiles/{id}', [EmployeeProfileController::class, 'update']);
        Route::delete('/employee-profiles/{id}', [EmployeeProfileController::class, 'destroy']);

        // Roles Management
        Route::get('/roles', [RoleController::class, 'index']); // Danh sách roles
        Route::get('/roles/{id}', [RoleController::class, 'show']); // Chi tiết role
        Route::post('/roles', [RoleController::class, 'store']); // Tạo role mới
        Route::put('/roles/{id}', [RoleController::class, 'update']); // Cập nhật role
        Route::delete('/roles/{id}', [RoleController::class, 'destroy']); // Xóa role

        // Personnel Roles Management
        Route::get('/personnel-roles', [PersonnelRoleController::class, 'index']);
        Route::get('/personnel-roles/with-usage', [PersonnelRoleController::class, 'withUsage']);
        Route::get('/personnel-roles/{id}', [PersonnelRoleController::class, 'show']);
        Route::post('/personnel-roles', [PersonnelRoleController::class, 'store']);
        Route::put('/personnel-roles/{id}', [PersonnelRoleController::class, 'update']);
        Route::delete('/personnel-roles/{id}', [PersonnelRoleController::class, 'destroy']);
        Route::get('/personnel-roles/permissions/{roleName}', [PersonnelRoleController::class, 'getDefaultPermissions']);
        Route::get('/personnel-roles/{id}/permissions', [PersonnelRoleController::class, 'getRolePermissions']);
        Route::post('/personnel-roles/{id}/permissions', [PersonnelRoleController::class, 'syncPermissions']);
        Route::get('/permissions/all', [PersonnelRoleController::class, 'getAllPermissions']);

        // User Permissions Management
        Route::get('/users/{id}/permissions', [UserPermissionController::class, 'getUserPermissions']);
        Route::post('/users/{id}/permissions', [UserPermissionController::class, 'syncUserPermissions']);
    });

    // User routes (không cần HR role)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/my-time-tracking', [TimeTrackingController::class, 'myTimeTracking']);
        Route::post('/time-tracking/check-in', [TimeTrackingController::class, 'checkIn']);
        Route::put('/time-tracking/check-out/{id}', [TimeTrackingController::class, 'checkOut']);
        Route::get('/my-payroll', [PayrollController::class, 'myPayroll']);
        Route::get('/my-bonuses', [BonusController::class, 'myBonuses']);

        // Permission checking routes
        Route::get('/permissions/my-permissions', [PermissionController::class, 'myPermissions']);
        Route::get('/permissions/check/{permission}', [PermissionController::class, 'checkPermission']);
        Route::get('/permissions/project/{projectId}/check/{permission}', [PermissionController::class, 'checkProjectPermission']);
        Route::get('/permissions/project/{projectId}/all', [PermissionController::class, 'projectPermissions']);
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



// routes/api.php
Route::post('/upload', [AttachmentController::class, 'upload'])
    ->name('upload.file');

// ===================================================================
// ADMIN API ROUTES - Yêu cầu authentication và admin role
// ===================================================================
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {

    // ========== QUẢN LÝ NGƯỜI DÙNG ==========
    Route::prefix('users')->group(function () {
        Route::get('/', [AdminUserController::class, 'index']); // Danh sách users
        Route::get('/{id}', [AdminUserController::class, 'show']); // Chi tiết user
        Route::put('/{id}', [AdminUserController::class, 'update']); // Cập nhật user
        Route::post('/{id}/ban', [AdminUserController::class, 'ban']); // Khóa tài khoản
        Route::post('/{id}/unban', [AdminUserController::class, 'unban']); // Mở khóa tài khoản
        Route::delete('/{id}', [AdminUserController::class, 'destroy']); // Xóa vĩnh viễn
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
});
