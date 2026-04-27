<?php

use App\Http\Controllers\ImagesController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// Redirect root to CRM dashboard if authenticated, otherwise to login
Route::get('/', function () {
    if ($user = auth('admin')->user()) {
        if ($user->hasPermission(\App\Constants\Permissions::DASHBOARD_VIEW)) {
            return redirect('/dashboard');
        }
        // Fallback to projects list if dashboard is restricted
        return redirect('/projects');
    }
    return redirect()->route('admin.login');
});

// Redirect /login to admin login
Route::get('/login', function () {
    return redirect()->route('admin.login');
})->name('login');

Route::post('/login', function () {
    return redirect()->route('admin.login');
});

// Images (keep for file serving)
Route::get('/img/{path}', [ImagesController::class, 'show'])
    ->where('path', '.*')
    ->name('image');

// Privacy Policy for App Store Review
Route::get('/privacy-policy', function () {
    return view('privacy');
})->name('privacy-policy');

// Admin routes
require __DIR__ . '/admin.php';
