<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\NotificationController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\FileController;
use App\Http\Controllers\Admin\CrmSystemLogController;

// Admin Auth Routes (public)
Route::prefix('admin')->name('admin.')->group(function () {
    Route::middleware('guest:admin')->group(function () {
        Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');
        Route::post('/login', [AuthController::class, 'login']);
    });

    Route::middleware('auth:admin')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

        // Dashboard
        Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // Users Management
        Route::prefix('users')->name('users.')->group(function () {
            Route::get('/', [UserController::class, 'index'])->name('index');
            Route::get('/{id}', [UserController::class, 'show'])->name('show');
            Route::put('/{id}', [UserController::class, 'update'])->name('update');
            Route::post('/{id}/ban', [UserController::class, 'ban'])->name('ban');
            Route::post('/{id}/unban', [UserController::class, 'unban'])->name('unban');
            Route::delete('/{id}', [UserController::class, 'destroy'])->name('destroy');
        });

        // Reports & Analytics
        Route::prefix('reports')->name('reports.')->group(function () {
            Route::get('/', [ReportController::class, 'index'])->name('index');
        });

        // Notifications Management
        Route::prefix('notifications')->name('notifications.')->group(function () {
            Route::get('/', [NotificationController::class, 'index'])->name('index');
            Route::get('/create', [NotificationController::class, 'create'])->name('create');
            Route::post('/broadcast', [NotificationController::class, 'broadcast'])->name('broadcast');
        });

        // Settings Management
        Route::prefix('settings')->name('settings.')->group(function () {
            Route::get('/', [SettingController::class, 'index'])->name('index');
            Route::post('/', [SettingController::class, 'store'])->name('store');
            Route::put('/', [SettingController::class, 'update'])->name('update');
            Route::delete('/{id}', [SettingController::class, 'destroy'])->name('destroy');
        });

        // Roles Management
        Route::prefix('roles')->name('roles.')->group(function () {
            Route::get('/', [RoleController::class, 'index'])->name('index');
            Route::get('/create', [RoleController::class, 'create'])->name('create');
            Route::post('/', [RoleController::class, 'store'])->name('store');
            Route::get('/{id}', [RoleController::class, 'show'])->name('show');
            Route::get('/{id}/edit', [RoleController::class, 'edit'])->name('edit');
            Route::put('/{id}', [RoleController::class, 'update'])->name('update');
            Route::delete('/{id}', [RoleController::class, 'destroy'])->name('destroy');
        });

        // Permissions Management
        Route::prefix('permissions')->name('permissions.')->group(function () {
            Route::get('/', [PermissionController::class, 'index'])->name('index');
            Route::get('/create', [PermissionController::class, 'create'])->name('create');
            Route::post('/', [PermissionController::class, 'store'])->name('store');
            Route::get('/{id}/edit', [PermissionController::class, 'edit'])->name('edit');
            Route::put('/{id}', [PermissionController::class, 'update'])->name('update');
            Route::delete('/{id}', [PermissionController::class, 'destroy'])->name('destroy');
            Route::get('/admin-roles', [PermissionController::class, 'manageAdminRoles'])->name('adminRoles');
            Route::put('/admins/{id}/roles', [PermissionController::class, 'updateAdminRole'])->name('updateAdminRole');
        });

        // Files Management
        Route::prefix('files')->name('files.')->group(function () {
            Route::get('/', [FileController::class, 'index'])->name('index');
            Route::get('/{id}/download', [FileController::class, 'download'])->name('download');
            Route::delete('/{id}', [FileController::class, 'destroy'])->name('destroy');
        });
    });
});

// ============================================================
// CRM Routes
// ============================================================
use App\Http\Controllers\Admin\CrmDashboardController;
use App\Http\Controllers\Admin\CrmProjectsController;
use App\Http\Controllers\Admin\CrmHrController;
use App\Http\Controllers\Admin\CrmFinanceController;
use App\Http\Controllers\Admin\CrmMaterialsController;
use App\Http\Controllers\Admin\CrmCostGroupsController;
use App\Http\Controllers\Admin\CrmEquipmentController;
use App\Http\Controllers\Admin\CrmSettingsController;
use App\Http\Controllers\Admin\CrmApprovalController;
use App\Http\Controllers\Admin\CrmReportController;
use App\Http\Controllers\Admin\CrmRolesController;
use App\Http\Controllers\Admin\CrmNotificationController;
use App\Http\Controllers\Admin\CrmFilesController;
use App\Http\Controllers\Admin\CrmKpiController;
use App\Http\Controllers\Admin\CrmSubcontractorController;
use App\Http\Controllers\Admin\CrmAcceptanceTemplateController;

Route::name('crm.')->middleware(['auth:admin'])->group(function () {
    // Dashboard
    Route::get('/', [CrmDashboardController::class, 'index'])->name('dashboard');
    Route::get('/dashboard', [CrmDashboardController::class, 'index']);

    // Approval Center (Trung tâm duyệt yêu cầu)
    Route::prefix('approvals')->name('approvals.')->group(function () {
        Route::get('/', [CrmApprovalController::class, 'index'])->name('index');
        Route::post('/{id}/approve-management', [CrmApprovalController::class, 'approveManagement'])->name('approve.management');
        Route::post('/{id}/approve-accountant', [CrmApprovalController::class, 'approveAccountant'])->name('approve.accountant');
        Route::post('/{id}/reject', [CrmApprovalController::class, 'reject'])->name('reject');

        // Customer Acceptance
        Route::post('/acceptance/{id}/approve', [CrmApprovalController::class, 'approveCustomerAcceptance'])->name('acceptance.approve');
        Route::post('/acceptance/{id}/reject', [CrmApprovalController::class, 'rejectCustomerAcceptance'])->name('acceptance.reject');

        // Change Request
        Route::post('/change-request/{id}/approve', [CrmApprovalController::class, 'approveChangeRequest'])->name('change-request.approve');
        Route::post('/change-request/{id}/reject', [CrmApprovalController::class, 'rejectChangeRequest'])->name('change-request.reject');

        // Additional Cost
        Route::post('/additional-cost/{id}/approve', [CrmApprovalController::class, 'approveAdditionalCost'])->name('additional-cost.approve');
        Route::post('/additional-cost/{id}/reject', [CrmApprovalController::class, 'rejectAdditionalCost'])->name('additional-cost.reject');

        // Subcontractor Payment
        Route::post('/sub-payment/{id}/approve', [CrmApprovalController::class, 'approveSubPayment'])->name('sub-payment.approve');
        Route::post('/sub-payment/{id}/confirm', [CrmApprovalController::class, 'confirmSubPayment'])->name('sub-payment.confirm');
        Route::post('/sub-payment/{id}/reject', [CrmApprovalController::class, 'rejectSubPayment'])->name('sub-payment.reject');

        // Contract (KH duyệt hợp đồng)
        Route::post('/contract/{id}/approve', [CrmApprovalController::class, 'approveContract'])->name('contract.approve');
        Route::post('/contract/{id}/reject', [CrmApprovalController::class, 'rejectContract'])->name('contract.reject');

        // Project Payment (KH duyệt thanh toán)
        Route::post('/payment/{id}/approve', [CrmApprovalController::class, 'approvePayment'])->name('payment.approve');
        Route::post('/payment/{id}/reject', [CrmApprovalController::class, 'rejectPayment'])->name('payment.reject');

        // Material Bill (Phiếu vật tư)
        Route::post('/material-bill/{id}/approve', [CrmApprovalController::class, 'approveMaterialBill'])->name('material-bill.approve');
        Route::post('/material-bill/{id}/reject', [CrmApprovalController::class, 'rejectMaterialBill'])->name('material-bill.reject');

        // Subcontractor Acceptance (Nghiệm thu NTP)
        Route::post('/sub-acceptance/{id}/approve', [CrmApprovalController::class, 'approveSubAcceptance'])->name('sub-acceptance.approve');
        Route::post('/sub-acceptance/{id}/reject', [CrmApprovalController::class, 'rejectSubAcceptance'])->name('sub-acceptance.reject');

        // Supplier Acceptance (Nghiệm thu NCC)
        Route::post('/supplier-acceptance/{id}/approve', [CrmApprovalController::class, 'approveSupplierAcceptance'])->name('supplier-acceptance.approve');
        Route::post('/supplier-acceptance/{id}/reject', [CrmApprovalController::class, 'rejectSupplierAcceptance'])->name('supplier-acceptance.reject');

        // Construction Log (Nhật ký công trường)
        Route::post('/construction-log/{id}/approve', [CrmApprovalController::class, 'approveConstructionLog'])->name('construction-log.approve');
        Route::post('/construction-log/{id}/reject', [CrmApprovalController::class, 'rejectConstructionLog'])->name('construction-log.reject');

        // Schedule Adjustment (Điều chỉnh tiến độ)
        Route::post('/schedule-adjustment/{id}/approve', [CrmApprovalController::class, 'approveScheduleAdjustment'])->name('schedule-adjustment.approve');
        Route::post('/schedule-adjustment/{id}/reject', [CrmApprovalController::class, 'rejectScheduleAdjustment'])->name('schedule-adjustment.reject');
    });

    // Reports (Báo cáo dự án)
    Route::get('/reports', [CrmReportController::class, 'index'])->name('reports.index');

    // Roles & Permissions (Phân quyền vai trò)
    Route::prefix('roles')->name('roles.')->group(function () {
        Route::get('/', [CrmRolesController::class, 'index'])->name('index');
        Route::post('/', [CrmRolesController::class, 'store'])->name('store');
        Route::put('/{id}', [CrmRolesController::class, 'update'])->name('update');
        Route::delete('/{id}', [CrmRolesController::class, 'destroy'])->name('destroy');
        Route::post('/{id}/assign-user', [CrmRolesController::class, 'assignUser'])->name('assign-user');
        Route::post('/{id}/remove-user', [CrmRolesController::class, 'removeUser'])->name('remove-user');
    });

    // Notifications (Thông báo hệ thống)
    Route::prefix('notifications')->name('notifications.')->group(function () {
        Route::get('/', [CrmNotificationController::class, 'index'])->name('index');
        Route::post('/send', [CrmNotificationController::class, 'send'])->name('send');
        Route::put('/{id}/read', [CrmNotificationController::class, 'markAsRead'])->name('read');
        Route::put('/read-all', [CrmNotificationController::class, 'markAllRead'])->name('read-all');
        Route::delete('/{id}', [CrmNotificationController::class, 'destroy'])->name('destroy');
        Route::post('/bulk-delete', [CrmNotificationController::class, 'bulkDestroy'])->name('bulk-destroy');
    });

    // Files (Tổng hợp File)
    Route::prefix('files')->name('files.')->group(function () {
        Route::get('/', [CrmFilesController::class, 'index'])->name('index');
        Route::get('/{id}/download', [CrmFilesController::class, 'download'])->name('download');
        Route::delete('/{id}', [CrmFilesController::class, 'destroy'])->name('destroy');
        Route::post('/bulk-delete', [CrmFilesController::class, 'bulkDestroy'])->name('bulk-destroy');
    });

    // System Logs (Nhật ký hệ thống)
    Route::prefix('system-logs')->name('system-logs.')->group(function () {
        Route::get('/', [CrmSystemLogController::class, 'index'])->name('index');
        Route::post('/clear', [CrmSystemLogController::class, 'clear'])->name('clear');
        Route::get('/download', [CrmSystemLogController::class, 'download'])->name('download');
    });

    // User Guide (Hướng dẫn sử dụng)
    Route::get('/user-guide', function () {
        return \Inertia\Inertia::render('Crm/UserGuide/Index');
    })->name('user-guide');

    // Projects
    Route::prefix('projects')->name('projects.')->group(function () {
        Route::get('/', [CrmProjectsController::class, 'index'])->name('index');
        Route::post('/', [CrmProjectsController::class, 'store'])->name('store');
        Route::get('/{id}', [CrmProjectsController::class, 'show'])->name('show');
        Route::put('/{id}', [CrmProjectsController::class, 'update'])->name('update');
        Route::delete('/{id}', [CrmProjectsController::class, 'destroy'])->name('destroy');

        // Sub-item CRUD (nested under project)
        // Costs
        Route::post('/{project}/costs', [CrmProjectsController::class, 'storeCost'])->name('costs.store');
        Route::get('/{project}/costs/{cost}', function ($project) {
            return redirect("/projects/{$project}");
        })->name('costs.show');
        Route::put('/{project}/costs/{cost}', [CrmProjectsController::class, 'updateCost'])->name('costs.update');
        Route::delete('/{project}/costs/{cost}', [CrmProjectsController::class, 'destroyCost'])->name('costs.destroy');
        Route::post('/{project}/costs/{cost}/submit', [CrmProjectsController::class, 'submitCost'])->name('costs.submit');
        Route::post('/{project}/costs/{cost}/approve-management', [CrmProjectsController::class, 'approveCostManagement'])->name('costs.approve.management');
        Route::post('/{project}/costs/{cost}/approve-accountant', [CrmProjectsController::class, 'approveCostAccountant'])->name('costs.approve.accountant');
        Route::post('/{project}/costs/{cost}/reject', [CrmProjectsController::class, 'rejectCost'])->name('costs.reject');
        Route::post('/{project}/costs/{cost}/attach-files', [CrmProjectsController::class, 'attachFilesToCost'])->name('costs.attach-files');

        // Payments
        Route::post('/{project}/payments', [CrmProjectsController::class, 'storePayment'])->name('payments.store');
        Route::put('/{project}/payments/{payment}', [CrmProjectsController::class, 'updatePayment'])->name('payments.update');
        Route::post('/{project}/payments/{payment}/mark-paid', [CrmProjectsController::class, 'markPaymentPaidByCustomer'])->name('payments.mark-paid');
        Route::post('/{project}/payments/{payment}/upload-proof', [CrmProjectsController::class, 'uploadPaymentProof'])->name('payments.upload-proof');
        Route::post('/{project}/payments/{payment}/customer-approve', [CrmProjectsController::class, 'approvePaymentByCustomer'])->name('payments.customer-approve');
        Route::post('/{project}/payments/{payment}/customer-reject', [CrmProjectsController::class, 'rejectPaymentByCustomer'])->name('payments.customer-reject');
        Route::post('/{project}/payments/{payment}/confirm', [CrmProjectsController::class, 'confirmPayment'])->name('payments.confirm');
        Route::post('/{project}/payments/{payment}/reject', [CrmProjectsController::class, 'rejectPayment'])->name('payments.reject');
        Route::delete('/{project}/payments/{payment}', [CrmProjectsController::class, 'destroyPayment'])->name('payments.destroy');
        Route::post('/{project}/payments/{payment}/attach-files', [CrmProjectsController::class, 'attachFilesToPayment'])->name('payments.attach-files');

        // Personnel
        Route::post('/{project}/personnel', [CrmProjectsController::class, 'storePersonnel'])->name('personnel.store');
        Route::delete('/{project}/personnel/{personnel}', [CrmProjectsController::class, 'destroyPersonnel'])->name('personnel.destroy');

        // Construction Logs
        Route::post('/{project}/logs', [CrmProjectsController::class, 'storeLog'])->name('logs.store');
        Route::put('/{project}/logs/{log}', [CrmProjectsController::class, 'updateLog'])->name('logs.update');
        Route::post('/{project}/logs/{log}/approve', [CrmProjectsController::class, 'approveLog'])->name('logs.approve');
        Route::delete('/{project}/logs/{log}', [CrmProjectsController::class, 'destroyLog'])->name('logs.destroy');
        Route::post('/{project}/logs/{log}/attach-files', [CrmProjectsController::class, 'attachFilesToLog'])->name('logs.attach-files');

        // Comments
        Route::post('/{project}/comments', [CrmProjectsController::class, 'storeComment'])->name('comments.store');
        Route::delete('/{project}/comments/{comment}', [CrmProjectsController::class, 'destroyComment'])->name('comments.destroy');

        // Defects
        Route::post('/{project}/defects', [CrmProjectsController::class, 'storeDefect'])->name('defects.store');
        Route::put('/{project}/defects/{defect}', [CrmProjectsController::class, 'updateDefect'])->name('defects.update');
        Route::delete('/{project}/defects/{defect}', [CrmProjectsController::class, 'destroyDefect'])->name('defects.destroy');
        Route::post('/{project}/defects/{defect}/attach-files', [CrmProjectsController::class, 'attachFilesToDefect'])->name('defects.attach-files');
        // Defect Workflow Actions (matching APP)
        Route::post('/{project}/defects/{defect}/mark-in-progress', [CrmProjectsController::class, 'markDefectInProgress'])->name('defects.mark-in-progress');
        Route::post('/{project}/defects/{defect}/mark-fixed', [CrmProjectsController::class, 'markDefectFixed'])->name('defects.mark-fixed');
        Route::post('/{project}/defects/{defect}/verify', [CrmProjectsController::class, 'verifyDefect'])->name('defects.verify');
        Route::post('/{project}/defects/{defect}/reject-fix', [CrmProjectsController::class, 'rejectDefectFix'])->name('defects.reject-fix');

        // Change Requests
        Route::post('/{project}/change-requests', [CrmProjectsController::class, 'storeChangeRequest'])->name('change-requests.store');
        Route::put('/{project}/change-requests/{cr}', [CrmProjectsController::class, 'updateChangeRequest'])->name('change-requests.update');
        Route::post('/{project}/change-requests/{cr}/submit', [CrmProjectsController::class, 'submitChangeRequest'])->name('change-requests.submit');
        Route::post('/{project}/change-requests/{cr}/approve', [CrmProjectsController::class, 'approveChangeRequest'])->name('change-requests.approve');
        Route::post('/{project}/change-requests/{cr}/reject', [CrmProjectsController::class, 'rejectChangeRequest'])->name('change-requests.reject');
        Route::post('/{project}/change-requests/{cr}/implement', [CrmProjectsController::class, 'implementChangeRequest'])->name('change-requests.implement');
        Route::delete('/{project}/change-requests/{cr}', [CrmProjectsController::class, 'destroyChangeRequest'])->name('change-requests.destroy');

        // Risks
        Route::post('/{project}/risks', [CrmProjectsController::class, 'storeRisk'])->name('risks.store');
        Route::put('/{project}/risks/{risk}', [CrmProjectsController::class, 'updateRisk'])->name('risks.update');
        Route::post('/{project}/risks/{risk}/resolve', [CrmProjectsController::class, 'resolveRisk'])->name('risks.resolve');
        Route::delete('/{project}/risks/{risk}', [CrmProjectsController::class, 'destroyRisk'])->name('risks.destroy');

        // Tasks (Tiến độ)
        Route::post('/{project}/tasks', [CrmProjectsController::class, 'storeTask'])->name('tasks.store');
        Route::put('/{project}/tasks/{task}', [CrmProjectsController::class, 'updateTask'])->name('tasks.update');
        Route::delete('/{project}/tasks/{task}', [CrmProjectsController::class, 'destroyTask'])->name('tasks.destroy');

        // Contract
        Route::post('/{project}/contract', [CrmProjectsController::class, 'storeContract'])->name('contract.store');
        Route::put('/{project}/contract', [CrmProjectsController::class, 'updateContract'])->name('contract.update');
        Route::post('/{project}/contracts/{contract}/attach-files', [CrmProjectsController::class, 'attachFilesToContract'])->name('contracts.attach-files');

        // Subcontractors
        Route::post('/{project}/subcontractors', [CrmProjectsController::class, 'storeSubcontractor'])->name('subcontractors.store');
        Route::put('/{project}/subcontractors/{sub}', [CrmProjectsController::class, 'updateSubcontractor'])->name('subcontractors.update');
        Route::post('/{project}/subcontractors/{sub}/approve', [CrmProjectsController::class, 'approveSubcontractor'])->name('subcontractors.approve');
        Route::delete('/{project}/subcontractors/{sub}', [CrmProjectsController::class, 'destroySubcontractor'])->name('subcontractors.destroy');
        Route::post('/{project}/subcontractors/{sub}/attach-files', [CrmProjectsController::class, 'attachFilesToSubcontractor'])->name('subcontractors.attach-files');

        // Subcontractor Items (matching APP SubcontractorItemController)
        Route::post('/{project}/subcontractors/{sub}/items', [CrmProjectsController::class, 'storeSubcontractorItem'])->name('subcontractors.items.store');
        Route::put('/{project}/subcontractors/{sub}/items/{item}', [CrmProjectsController::class, 'updateSubcontractorItem'])->name('subcontractors.items.update');
        Route::delete('/{project}/subcontractors/{sub}/items/{item}', [CrmProjectsController::class, 'destroySubcontractorItem'])->name('subcontractors.items.destroy');

        // Subcontractor Payments
        Route::post('/{project}/subcontractors/{sub}/payments', [CrmProjectsController::class, 'storeSubPayment'])->name('subcontractors.payments.store');
        Route::post('/{project}/subcontractors/{sub}/payments/{payment}/submit', [CrmProjectsController::class, 'submitSubPayment'])->name('subcontractors.payments.submit');
        Route::post('/{project}/subcontractors/{sub}/payments/{payment}/approve', [CrmProjectsController::class, 'approveSubPayment'])->name('subcontractors.payments.approve');
        Route::post('/{project}/subcontractors/{sub}/payments/{payment}/reject', [CrmProjectsController::class, 'rejectSubPayment'])->name('subcontractors.payments.reject');
        Route::post('/{project}/subcontractors/{sub}/payments/{payment}/confirm', [CrmProjectsController::class, 'confirmSubPayment'])->name('subcontractors.payments.confirm');
        Route::delete('/{project}/subcontractors/{sub}/payments/{payment}', [CrmProjectsController::class, 'destroySubPayment'])->name('subcontractors.payments.destroy');

        // Additional Costs
        Route::post('/{project}/additional-costs', [CrmProjectsController::class, 'storeAdditionalCost'])->name('additional-costs.store');
        Route::post('/{project}/additional-costs/{ac}/approve', [CrmProjectsController::class, 'approveAdditionalCost'])->name('additional-costs.approve');
        Route::post('/{project}/additional-costs/{ac}/reject', [CrmProjectsController::class, 'rejectAdditionalCost'])->name('additional-costs.reject');
        Route::delete('/{project}/additional-costs/{ac}', [CrmProjectsController::class, 'destroyAdditionalCost'])->name('additional-costs.destroy');
        Route::post('/{project}/additional-costs/{ac}/attach-files', [CrmProjectsController::class, 'attachFilesToAdditionalCost'])->name('additional-costs.attach-files');

        // Budgets
        Route::post('/{project}/budgets', [CrmProjectsController::class, 'storeBudget'])->name('budgets.store');
        Route::put('/{project}/budgets/{budget}', [CrmProjectsController::class, 'updateBudget'])->name('budgets.update');
        Route::delete('/{project}/budgets/{budget}', [CrmProjectsController::class, 'destroyBudget'])->name('budgets.destroy');

        // Invoices
        Route::post('/{project}/invoices', [CrmProjectsController::class, 'storeInvoice'])->name('invoices.store');
        Route::put('/{project}/invoices/{invoice}', [CrmProjectsController::class, 'updateInvoice'])->name('invoices.update');
        Route::delete('/{project}/invoices/{invoice}', [CrmProjectsController::class, 'destroyInvoice'])->name('invoices.destroy');

        // Acceptance Stages
        Route::get('/{project}/acceptance', fn($project) => redirect("/projects/{$project}?tab=acceptance"))->name('acceptance.index');
        Route::post('/{project}/acceptance', [CrmProjectsController::class, 'storeAcceptance'])->name('acceptance.store');
        Route::put('/{project}/acceptance/{stage}', [CrmProjectsController::class, 'updateAcceptance'])->name('acceptance.update');
        Route::post('/{project}/acceptance/{stage}/approve', [CrmProjectsController::class, 'approveAcceptance'])->name('acceptance.approve');
        Route::delete('/{project}/acceptance/{stage}', [CrmProjectsController::class, 'destroyAcceptance'])->name('acceptance.destroy');
        Route::post('/{project}/acceptance/{stage}/attach-files', [CrmProjectsController::class, 'attachFilesToAcceptance'])->name('acceptance.attach-files');

        // Acceptance Items (matching APP AcceptanceItemController)
        Route::post('/{project}/acceptance/{stage}/items', [CrmProjectsController::class, 'storeAcceptanceItem'])->name('acceptance.items.store');
        Route::put('/{project}/acceptance/{stage}/items/{item}', [CrmProjectsController::class, 'updateAcceptanceItem'])->name('acceptance.items.update');
        Route::delete('/{project}/acceptance/{stage}/items/{item}', [CrmProjectsController::class, 'destroyAcceptanceItem'])->name('acceptance.items.destroy');
        Route::post('/{project}/acceptance/{stage}/items/{item}/submit', [CrmProjectsController::class, 'submitAcceptanceItem'])->name('acceptance.items.submit');
        Route::post('/{project}/acceptance/{stage}/items/{item}/approve-supervisor', [CrmProjectsController::class, 'approveAcceptanceItemSupervisor'])->name('acceptance.items.approve.supervisor');
        Route::post('/{project}/acceptance/{stage}/items/{item}/approve-pm', [CrmProjectsController::class, 'approveAcceptanceItemPM'])->name('acceptance.items.approve.pm');
        Route::post('/{project}/acceptance/{stage}/items/{item}/approve-customer', [CrmProjectsController::class, 'approveAcceptanceItemCustomer'])->name('acceptance.items.approve.customer');
        Route::post('/{project}/acceptance/{stage}/items/{item}/reject', [CrmProjectsController::class, 'rejectAcceptanceItem'])->name('acceptance.items.reject');
        Route::post('/{project}/acceptance/{stage}/items/{item}/attach-files', [CrmProjectsController::class, 'attachFilesToAcceptanceItem'])->name('acceptance.items.attach-files');

        // Documents
        Route::post('/{project}/documents', [CrmProjectsController::class, 'storeDocument'])->name('documents.store');
        Route::put('/{project}/documents/{doc}', [CrmProjectsController::class, 'updateDocument'])->name('documents.update');
        Route::delete('/{project}/documents/{doc}', [CrmProjectsController::class, 'destroyDocument'])->name('documents.destroy');

        // Project Materials (batch transaction — matching mobile APP)
        Route::post('/{project}/materials/batch', [CrmProjectsController::class, 'storeMaterialBatch'])->name('materials.batch');

        // Project Equipment (allocation — matching mobile APP)
        Route::post('/{project}/equipment/allocate', [CrmProjectsController::class, 'storeEquipmentAllocation'])->name('equipment.allocate');
        Route::post('/{project}/equipment/{allocation}/return', [CrmProjectsController::class, 'returnEquipment'])->name('equipment.return');

        // Material Bills (matching APP MaterialBillController)
        Route::post('/{project}/material-bills', [CrmProjectsController::class, 'storeMaterialBill'])->name('material-bills.store');
        Route::put('/{project}/material-bills/{bill}', [CrmProjectsController::class, 'updateMaterialBill'])->name('material-bills.update');
        Route::delete('/{project}/material-bills/{bill}', [CrmProjectsController::class, 'destroyMaterialBill'])->name('material-bills.destroy');
        Route::post('/{project}/material-bills/{bill}/submit', [CrmProjectsController::class, 'submitMaterialBill'])->name('material-bills.submit');
        Route::post('/{project}/material-bills/{bill}/approve-management', [CrmProjectsController::class, 'approveMaterialBillManagement'])->name('material-bills.approve.management');
        Route::post('/{project}/material-bills/{bill}/approve-accountant', [CrmProjectsController::class, 'approveMaterialBillAccountant'])->name('material-bills.approve.accountant');
        Route::post('/{project}/material-bills/{bill}/reject', [CrmProjectsController::class, 'rejectMaterialBill'])->name('material-bills.reject');

        // Material Quotas (matching APP MaterialQuotaController)
        Route::post('/{project}/material-quotas', [CrmProjectsController::class, 'storeMaterialQuota'])->name('material-quotas.store');
        Route::put('/{project}/material-quotas/{quota}', [CrmProjectsController::class, 'updateMaterialQuota'])->name('material-quotas.update');
        Route::delete('/{project}/material-quotas/{quota}', [CrmProjectsController::class, 'destroyMaterialQuota'])->name('material-quotas.destroy');
    });

    // HR
    Route::prefix('hr')->name('hr.')->group(function () {
        Route::get('/employees', [CrmHrController::class, 'employees'])->name('employees');
        Route::post('/employees', [CrmHrController::class, 'storeEmployee'])->name('employees.store');
        Route::put('/employees/{id}', [CrmHrController::class, 'updateEmployee'])->name('employees.update');
        Route::delete('/employees/{id}', [CrmHrController::class, 'destroyEmployee'])->name('employees.destroy');

        Route::get('/departments', [CrmHrController::class, 'departments'])->name('departments');
        Route::post('/departments', [CrmHrController::class, 'storeDepartment'])->name('departments.store');
        Route::put('/departments/{id}', [CrmHrController::class, 'updateDepartment'])->name('departments.update');
        Route::delete('/departments/{id}', [CrmHrController::class, 'destroyDepartment'])->name('departments.destroy');

        // Org Chart
        Route::get('/org-chart', [CrmHrController::class, 'orgChart'])->name('org-chart');

        // KPI
        Route::get('/kpi', [CrmKpiController::class, 'index'])->name('kpi');
        Route::post('/kpi', [CrmKpiController::class, 'store'])->name('kpi.store');
        Route::put('/kpi/{id}', [CrmKpiController::class, 'update'])->name('kpi.update');
        Route::delete('/kpi/{id}', [CrmKpiController::class, 'destroy'])->name('kpi.destroy');
        Route::patch('/kpi/{id}/verify', [CrmKpiController::class, 'verify'])->name('kpi.verify');
        Route::patch('/kpi/{id}/progress', [CrmKpiController::class, 'updateProgress'])->name('kpi.progress');
    });

    // Subcontractors
    Route::prefix('subcontractors')->name('subcontractors.')->group(function () {
        Route::get('/', [CrmSubcontractorController::class, 'index'])->name('index');
        Route::post('/', [CrmSubcontractorController::class, 'store'])->name('store');
        Route::put('/{id}', [CrmSubcontractorController::class, 'update'])->name('update');
        Route::delete('/{id}', [CrmSubcontractorController::class, 'destroy'])->name('destroy');
    });

    // Acceptance Templates (Bộ tài liệu nghiệm thu)
    Route::prefix('acceptance-templates')->name('acceptance-templates.')->group(function () {
        Route::get('/', [CrmAcceptanceTemplateController::class, 'index'])->name('index');
        Route::get('/{id}', [CrmAcceptanceTemplateController::class, 'show'])->name('show');
        Route::post('/', [CrmAcceptanceTemplateController::class, 'store'])->name('store');
        Route::put('/{id}', [CrmAcceptanceTemplateController::class, 'update'])->name('update');
        Route::put('/{id}/toggle-active', [CrmAcceptanceTemplateController::class, 'toggleActive'])->name('toggle-active');
        Route::delete('/{id}', [CrmAcceptanceTemplateController::class, 'destroy'])->name('destroy');
    });

    // Finance
    Route::prefix('finance')->name('finance.')->group(function () {
        Route::get('/', [CrmFinanceController::class, 'index'])->name('index');
        Route::get('/company-costs', [CrmFinanceController::class, 'companyCosts'])->name('company-costs');
        Route::post('/company-costs', [CrmFinanceController::class, 'storeCompanyCost'])->name('company-costs.store');
        Route::put('/company-costs/{id}', [CrmFinanceController::class, 'updateCompanyCost'])->name('company-costs.update');
        Route::delete('/company-costs/{id}', [CrmFinanceController::class, 'destroyCompanyCost'])->name('company-costs.destroy');
        Route::post('/company-costs/{id}/submit', [CrmFinanceController::class, 'submitCompanyCost'])->name('company-costs.submit');
    });

    // Materials
    Route::prefix('materials')->name('materials.')->group(function () {
        Route::get('/', [CrmMaterialsController::class, 'index'])->name('index');
        Route::post('/', [CrmMaterialsController::class, 'store'])->name('store');
        Route::put('/{id}', [CrmMaterialsController::class, 'update'])->name('update');
        Route::delete('/{id}', [CrmMaterialsController::class, 'destroy'])->name('destroy');
    });

    // Cost Groups
    Route::prefix('cost-groups')->name('cost-groups.')->group(function () {
        Route::get('/', [CrmCostGroupsController::class, 'index'])->name('index');
        Route::post('/', [CrmCostGroupsController::class, 'store'])->name('store');
        Route::put('/{id}', [CrmCostGroupsController::class, 'update'])->name('update');
        Route::put('/{id}/toggle-active', [CrmCostGroupsController::class, 'toggleActive'])->name('toggle-active');
        Route::delete('/{id}', [CrmCostGroupsController::class, 'destroy'])->name('destroy');
    });

    // Equipment
    Route::prefix('equipment')->name('equipment.')->group(function () {
        Route::get('/', [CrmEquipmentController::class, 'index'])->name('index');
        Route::post('/', [CrmEquipmentController::class, 'store'])->name('store');
        Route::put('/{id}', [CrmEquipmentController::class, 'update'])->name('update');
        Route::delete('/{id}', [CrmEquipmentController::class, 'destroy'])->name('destroy');
    });

    // Settings
    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('/', [CrmSettingsController::class, 'index'])->name('index');
        Route::put('/update', [CrmSettingsController::class, 'updateSetting'])->name('update');
        Route::post('/logo', [CrmSettingsController::class, 'uploadLogo'])->name('logo');
        Route::put('/smtp', [CrmSettingsController::class, 'updateSmtp'])->name('smtp');
        Route::post('/smtp/test', [CrmSettingsController::class, 'testSmtp'])->name('smtp.test');
    });
});

