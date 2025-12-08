<?php


namespace App\Http\Controllers\Api;

use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;
use App\Models\PaymentMethod;

class PaymentMethodController extends Controller
{
    public function index()
    {
        $methods = PaymentMethod::where('is_active', true)
            ->orderBy('type')
            ->get();

        return ApiResponse::success($methods, 'Danh sách phương thức nạp tiền');
    }

    public function show(string $code)
    {
        $method = PaymentMethod::where('code', strtoupper($code))
            ->orWhere('code', $code)
            ->firstOrFail();

        return ApiResponse::success($method, 'Thông tin phương thức nạp tiền');
    }
}
