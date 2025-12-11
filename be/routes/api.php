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
use App\Http\Controllers\Api\ConstructionLogController;
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
        Route::put('/{projectId}/subcontractors/{id}', [SubcontractorController::class, 'update']);

        // Documents
        Route::get('/{projectId}/documents', [ProjectDocumentController::class, 'index']);
        Route::post('/{projectId}/documents', [ProjectDocumentController::class, 'store']);

        // Construction Logs
        Route::get('/{projectId}/logs', [ConstructionLogController::class, 'index']);
        Route::post('/{projectId}/logs', [ConstructionLogController::class, 'store']);

        // Acceptance Stages
        Route::get('/{projectId}/acceptance', [AcceptanceStageController::class, 'index']);
        Route::post('/{projectId}/acceptance/{id}/approve', [AcceptanceStageController::class, 'approve']);

        // Defects
        Route::get('/{projectId}/defects', [DefectController::class, 'index']);
        Route::post('/{projectId}/defects', [DefectController::class, 'store']);
        Route::put('/{projectId}/defects/{id}', [DefectController::class, 'update']);

        // Progress
        Route::get('/{projectId}/progress', [ProjectProgressController::class, 'show']);
    });

    // ===================================================================
    // HR MANAGEMENT ROUTES
    // ===================================================================
    Route::middleware(['auth:sanctum', 'hr'])->prefix('hr')->group(function () {
        // Time Tracking
        Route::get('/time-tracking', [TimeTrackingController::class, 'index']);
        Route::post('/time-tracking', [TimeTrackingController::class, 'store']);
        Route::put('/time-tracking/{id}', [TimeTrackingController::class, 'update']);
        Route::post('/time-tracking/{id}/approve', [TimeTrackingController::class, 'approve']);
        Route::post('/time-tracking/{id}/reject', [TimeTrackingController::class, 'reject']);

        // Payroll
        Route::get('/payroll', [PayrollController::class, 'index']);
        Route::post('/payroll/calculate', [PayrollController::class, 'calculate']);
        Route::post('/payroll/calculate-all', [PayrollController::class, 'calculateAll']);
        Route::get('/payroll/{id}', [PayrollController::class, 'show']);
        Route::post('/payroll/{id}/approve', [PayrollController::class, 'approve']);
        Route::post('/payroll/{id}/pay', [PayrollController::class, 'markAsPaid']);
        Route::get('/payroll/export', [PayrollController::class, 'export']);

        // Bonuses
        Route::get('/bonuses', [BonusController::class, 'index']);
        Route::post('/bonuses', [BonusController::class, 'store']);
        Route::put('/bonuses/{id}', [BonusController::class, 'update']);
        Route::post('/bonuses/calculate-project/{projectId}', [BonusController::class, 'calculateFromProject']);
        Route::post('/bonuses/{id}/approve', [BonusController::class, 'approve']);
        Route::post('/bonuses/{id}/pay', [BonusController::class, 'markAsPaid']);

        // Salary Config
        Route::get('/salary-config', [EmployeeSalaryConfigController::class, 'index']);
        Route::post('/salary-config', [EmployeeSalaryConfigController::class, 'store']);
        Route::put('/salary-config/{id}', [EmployeeSalaryConfigController::class, 'update']);
        Route::get('/salary-config/user/{userId}', [EmployeeSalaryConfigController::class, 'getCurrentConfig']);

        // Work Schedule
        Route::get('/work-schedule', [WorkScheduleController::class, 'index']);
        Route::post('/work-schedule', [WorkScheduleController::class, 'store']);
        Route::put('/work-schedule/{id}', [WorkScheduleController::class, 'update']);
        Route::delete('/work-schedule/{id}', [WorkScheduleController::class, 'destroy']);
        Route::get('/work-schedule/calendar', [WorkScheduleController::class, 'calendar']);

        // Employees (using AdminUserController)
        Route::get('/employees', [AdminUserController::class, 'index']);
        Route::get('/employees/{id}', [AdminUserController::class, 'show']);
        Route::get('/employees/stats', [AdminUserController::class, 'stats']);
        Route::get('/employees/{id}/stats', [AdminUserController::class, 'employeeStats']);

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
