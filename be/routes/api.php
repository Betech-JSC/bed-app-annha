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

    // Ví điện tử
    Route::get('wallets/me', [WalletController::class, 'me']);
    Route::get('wallets/transactions', [WalletController::class, 'transactions']);
    Route::post('wallets/deposit', [WalletController::class, 'deposit']);
    Route::post('wallets/deposits/{uuid}/confirm', [WalletController::class, 'confirmDeposit']);
    Route::post('wallets/deposits/{uuid}/approve', [WalletController::class, 'approveDeposit']);

    // Tìm kiếm Flight phù hợp (Filter Search cho Sender)
    Route::get('/flights/search', [FlightSearchController::class, 'index'])
        ->name('flights.search');

    // Danh sách chuyến bay
    Route::get('/flights', [FlightController::class, 'index']);

    // Đăng chuyến bay
    Route::post('/flights/store', [FlightController::class, 'store'])
        ->name('flights.store');

    // Chi tiết chuyến bay
    Route::get('flights/{id}/show', [FlightController::class, 'show']);
    Route::put('flights/{id}/update', [FlightController::class, 'update']);

    // Hủy chuyến bay
    Route::delete('/flights/{id}/destroy', [FlightController::class, 'destroy'])
        ->name('flights.destroy');

    // Xác thực chuyến bay
    Route::post('/flights/{id}/verify', [FlightController::class, 'verify']);

    // Gửi yêu cầu riêng cho 1 hành khách (Private Request)
    Route::post('private-requests/sent', [RequestController::class, 'sent']);

    // Tạo request cho chuyến bay
    Route::post('private-requests/store', [RequestController::class, 'store']);

    // Hủy request
    Route::post('private-requests/{id}/cancel', [RequestController::class, 'cancel']);

    // Lấy danh sách yêu cầu riêng đã gửi
    Route::get('private-requests', [RequestController::class, 'index']);

    // Chi tiết requests
    Route::get('private-requests/{id}/show', [RequestController::class, 'show']);

    // Lấy danh sách requests của một flight (cho customer)
    Route::get('flights/{flightId}/requests', [RequestController::class, 'getRequestsByFlight']);

    // Xác nhận request 
    Route::post('/requests/{id}/accept', [RequestController::class, 'accept']);
    Route::post('/requests/{id}/decline', [RequestController::class, 'decline']);

    // Danh sách requets đang chờ
    Route::get('/requests/listPendingRequests', [RequestController::class, 'listPendingRequests']);

    // Customer: danh sách yêu cầu ưu tiên/gấp
    Route::get('/customer/requests/priority', [RequestController::class, 'priorityForCustomer']);

    // Customer: danh sách yêu cầu phù hợp
    Route::get('/customer/requests/matching', [RequestController::class, 'matchingForCustomer']);

    // Sender: danh sách khách hàng có sẵn để gửi request
    Route::get('/sender/available-customers', [FlightController::class, 'availableCustomers']);
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

// Lấy danh sách tất cả sân bay
Route::get('/airports', [AirportController::class, 'index']);

// Tìm kiếm sân bay theo từ khóa (code, name_vi, name_en, city_code)
Route::get('/airports/search', [AirportController::class, 'search']);

// Lấy chi tiết 1 sân bay theo code (IATA/ICAO)
Route::get('/airports/{code}', [AirportController::class, 'show']);

// Danh sách hãng hàng không nội địa
Route::get('/airlines', [AirlineController::class, 'index']);

// Tìm kiếm hãng hàng không
Route::get('/airlines/search', [AirlineController::class, 'search']);

// Chi tiết hãng hàng không theo mã IATA/ICAO
Route::get('/airlines/{code}', [AirlineController::class, 'show']);

// Phương thức thanh toán
Route::get('/payment-methods', [PaymentMethodController::class, 'index']);
Route::get('/payment-methods/{code}', [PaymentMethodController::class, 'show']);


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
