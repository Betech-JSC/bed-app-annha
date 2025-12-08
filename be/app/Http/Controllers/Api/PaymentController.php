<?php


namespace App\Http\Controllers\Api;

use App\Models\Order;
use Illuminate\Http\Request;
use App\Helpers\ApiResponse;
use App\Http\Controllers\Controller;

class PaymentController extends Controller
{
    // Tạo đơn hàng
    public function create(Request $request)
    {
        $request->validate([
            'description' => 'required|string|max:255',
            'role' => 'required|in:sender,carrier', // Vai trò phải là sender hoặc carrier
        ]);

        $order = Order::create([
            'user_id' => $request->user()->id,
            'role' => $request->role,
            'description' => $request->description,
        ]);

        return ApiResponse::success($order, 'Order created successfully');
    }

    // Lấy danh sách đơn hàng của người dùng
    public function index(Request $request)
    {
        $orders = Order::where('user_id', $request->user()->id)->get();

        return ApiResponse::success($orders, 'Orders retrieved successfully');
    }

    // Khớp đơn hàng giữa người gửi và người vận chuyển
    public function matchOrder(Request $request)
    {
        // Lấy đơn hàng của người gửi và người vận chuyển
        $senderOrder = Order::where('role', 'sender')->where('status', 'pending')->first();
        $carrierOrder = Order::where('role', 'carrier')->where('status', 'pending')->first();

        if (!$senderOrder || !$carrierOrder) {
            return ApiResponse::error('No matching orders found', 'Matching failed', 404);
        }

        // Cập nhật trạng thái đơn hàng
        $senderOrder->status = 'matched';
        $carrierOrder->status = 'matched';

        // Lưu lại
        $senderOrder->save();
        $carrierOrder->save();

        return ApiResponse::success(null, 'Orders matched successfully');
    }

    // Cập nhật trạng thái đơn hàng
    public function updateStatus(Request $request, Order $order)
    {
        $request->validate([
            'status' => 'required|string|in:pending,matched,completed,cancelled', // Các trạng thái có thể có
        ]);

        $order->status = $request->status;
        $order->save();

        return ApiResponse::success($order, 'Order status updated successfully');
    }
}
