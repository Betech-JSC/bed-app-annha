<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\AuthController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\Admin\FlightController;
use App\Http\Controllers\Admin\OrderController;
use App\Http\Controllers\Admin\RequestController;
use App\Http\Controllers\Admin\ReviewController;
use App\Http\Controllers\Admin\ReportController;
use App\Http\Controllers\Admin\NotificationController;
use App\Http\Controllers\Admin\SettingController;
use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\FileController;
use App\Http\Controllers\Admin\AirlineController;
use App\Http\Controllers\Admin\AirportController;

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

        // Flights Management
        Route::prefix('flights')->name('flights.')->group(function () {
            Route::get('/', [FlightController::class, 'index'])->name('index');
            Route::get('/{id}', [FlightController::class, 'show'])->name('show');
            Route::post('/{id}/verify', [FlightController::class, 'verify'])->name('verify');
            Route::post('/{id}/reject', [FlightController::class, 'reject'])->name('reject');
            Route::post('/{id}/cancel', [FlightController::class, 'cancel'])->name('cancel');
        });

        // Orders Management
        Route::prefix('orders')->name('orders.')->group(function () {
            Route::get('/', [OrderController::class, 'index'])->name('index');
            Route::get('/{id}', [OrderController::class, 'show'])->name('show');
            Route::put('/{id}/status', [OrderController::class, 'updateStatus'])->name('updateStatus');
            Route::post('/{id}/cancel', [OrderController::class, 'cancel'])->name('cancel');
        });

        // Requests Management
        Route::prefix('requests')->name('requests.')->group(function () {
            Route::get('/', [RequestController::class, 'index'])->name('index');
            Route::get('/{id}', [RequestController::class, 'show'])->name('show');
            Route::delete('/{id}', [RequestController::class, 'destroy'])->name('destroy');
        });

        // Reviews Management
        Route::prefix('reviews')->name('reviews.')->group(function () {
            Route::get('/', [ReviewController::class, 'index'])->name('index');
            Route::delete('/{id}', [ReviewController::class, 'destroy'])->name('destroy');
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

        // Airlines Management
        Route::prefix('airlines')->name('airlines.')->group(function () {
            Route::get('/', [AirlineController::class, 'index'])->name('index');
            Route::get('/create', [AirlineController::class, 'create'])->name('create');
            Route::post('/', [AirlineController::class, 'store'])->name('store');
            Route::get('/{id}', [AirlineController::class, 'show'])->name('show');
            Route::get('/{id}/edit', [AirlineController::class, 'edit'])->name('edit');
            Route::put('/{id}', [AirlineController::class, 'update'])->name('update');
            Route::delete('/{id}', [AirlineController::class, 'destroy'])->name('destroy');
        });

        // Airports Management
        Route::prefix('airports')->name('airports.')->group(function () {
            Route::get('/', [AirportController::class, 'index'])->name('index');
            Route::get('/create', [AirportController::class, 'create'])->name('create');
            Route::post('/', [AirportController::class, 'store'])->name('store');
            Route::get('/{id}', [AirportController::class, 'show'])->name('show');
            Route::get('/{id}/edit', [AirportController::class, 'edit'])->name('edit');
            Route::put('/{id}', [AirportController::class, 'update'])->name('update');
            Route::delete('/{id}', [AirportController::class, 'destroy'])->name('destroy');
        });
    });
});
