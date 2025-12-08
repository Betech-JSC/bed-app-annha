<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Services\WalletService;
use App\Services\FirebaseService;
use App\Services\ExpoPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    public function __construct(
        private WalletService $walletService,
        private FirebaseService $firebaseService
    ) {}
    /**
     * Danh sách đơn hàng của user hiện tại
     * - Sender thấy đơn mình đặt
     * - Customer thấy đơn mình nhận mang
     */
    public function index(Request $request)
    {
        $user = auth()->user();

        $query = Order::with([
            'flight',
        ])
            ->when($user->role === 'sender' || !$user->role, function ($q) use ($user) {
                $q->where('sender_id', $user->id);
            })
            ->when($user->role === 'customer', function ($q) use ($user) {
                $q->where('customer_id', $user->id);
            })
            ->orderByDesc('created_at');

        // Bộ lọc theo trạng thái (từ query string)
        if ($status = $request->query('status')) {
            $allowed = ['confirmed', 'picked_up', 'in_transit', 'delivered', 'completed', 'cancelled'];
            if (in_array($status, $allowed)) {
                $query->where('status', $status);
            }
        }

        // Phân trang đẹp
        $orders = $query->paginate(15);

        // Thêm thông tin ngắn gọn cho frontend
        $orders->getCollection()->transform(function ($order) use ($user) {
            $order->is_sender = $order->sender_id === $user->id;
            $order->partner = $order->is_sender ? $order->customer : $order->sender;
            $order->can_chat = in_array($order->status, ['confirmed', 'picked_up', 'in_transit']);
            $order->can_rate = $order->status === 'completed' && (
                ($order->is_sender && !$order->sender_rating) ||
                (!$order->is_sender && !$order->customer_rating)
            );
            return $order;
        });

        return response()->json([
            'success' => true,
            'data'    => $orders
        ]);
    }

    /**
     * Chi tiết 1 đơn hàng
     */
    public function show(string $id)
    {
        $user = auth()->user();

        $order = Order::with([
            'flight',
            'sender',
            'customer',
            'request',
            'attachments',
        ])
            ->where('id', $id)
            ->firstOrFail();

        // Chỉ cho phép xem đơn của chính mình
        if ($order->sender_id !== $user->id && $order->customer_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền truy cập đơn hàng này.'
            ], 403);
        }

        $order->is_sender = $order->sender_id === $user->id;
        $order->partner = $order->is_sender ? $order->customer : $order->sender;

        return response()->json([
            'success' => true,
            'data'    => $order
        ]);
    }

    /**
     * Cập nhật trạng thái đơn hàng
     * Chỉ người liên quan mới được phép đổi
     */
    public function updateStatus(Request $request, string $uuid)
    {
        $user = auth()->user();

        $order = Order::with(['sender', 'customer', 'flight'])
            ->where('uuid', $uuid)
            ->firstOrFail();

        // Kiểm tra quyền: chỉ sender hoặc customer của đơn mới được thao tác
        if (!in_array($user->id, [$order->sender_id, $order->customer_id])) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền thực hiện hành động này.'
            ], 403);
        }

        $request->validate([
            'status' => [
                'required',
                'string',
                Rule::in([
                    'picked_up',      // Customer đã nhận hàng từ Sender
                    'in_transit',     // Đang trên máy bay
                    'arrived',        // Đã đến sân bay đích
                    'delivered',      // Customer đã giao hàng cho Sender
                    'completed',      // Cả hai xác nhận hoàn tất
                    'cancelled'       // Hủy đơn (có lý do)
                ])
            ],
            'cancel_reason' => 'required_if:status,cancelled|string|max:500',
        ]);

        $newStatus = $request->status;

        // Kiểm tra luồng trạng thái hợp lệ (rất quan trọng!)
        $validTransitions = [
            'confirmed'   => ['picked_up', 'cancelled'],
            'picked_up'   => ['in_transit', 'cancelled'],
            'in_transit'  => ['arrived'],
            'arrived'     => ['delivered'],
            'delivered'   => ['completed'],
        ];

        if (
            !isset($validTransitions[$order->status]) ||
            !in_array($newStatus, $validTransitions[$order->status])
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể chuyển sang trạng thái này lúc này.'
            ], 400);
        }

        // Kiểm tra người được phép đổi trạng thái nào
        $isSender = $order->sender_id === $user->id;
        $isCustomer = $order->customer_id === $user->id;

        $allowedByRole = [
            'picked_up'   => $isCustomer,  // Chỉ Customer mới xác nhận đã nhận hàng
            'in_transit'  => $isCustomer,
            'arrived'     => $isCustomer,
            'delivered'   => $isCustomer,
            'completed'   => true,         // Cả 2 đều được bấm hoàn tất
            'cancelled'   => true,
        ];

        if (!$allowedByRole[$newStatus]) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không được phép thực hiện hành động này.'
            ], 403);
        }

        // Bắt đầu transaction
        return DB::transaction(function () use ($order, $newStatus, $request, $user) {

            // Dùng hàm tiện ích có sẵn trong model Order của bạn
            $order->updateStatus($newStatus, $user);

            // Nếu hủy đơn
            if ($newStatus === 'cancelled') {
                $order->cancel_reason = $request->cancel_reason;
                $order->save();

                // Hoàn tiền escrow (nếu đã nạp)
                if (in_array($order->escrow_status, ['held', 'paid'])) {
                    $this->walletService->refundEscrowToSender($order);
                    $order->refundEscrow();
                }
            }

            // Nếu hoàn tất → giải ngân tiền thưởng cho Customer
            if ($newStatus === 'completed') {
                if ($order->escrow_status === 'held') {
                    $this->walletService->releaseEscrowToCustomer($order);
                    $order->releaseEscrow();
                }
            }

            // Push notification vào Firebase cho đối tác
            $this->pushOrderStatusNotification($order, $newStatus, $user);

            // Load lại dữ liệu đẹp cho frontend
            $order->load(['sender', 'customer', 'flight']);

            return response()->json([
                'success' => true,
                'message' => $this->getStatusMessage($newStatus),
                'data'    => $order
            ], 200);
        });
    }

    // Thông báo thân thiện theo từng trạng thái
    private function getStatusMessage(string $status): string
    {
        return match ($status) {
            'picked_up'   => 'Đã nhận hàng từ người gửi thành công!',
            'in_transit'  => 'Hàng đang trên chuyến bay.',
            'arrived'     => 'Đã đến sân bay đích.',
            'delivered'   => 'Đã giao hàng cho người nhận thành công!',
            'completed'   => 'Đơn hàng đã hoàn tất. Cảm ơn bạn!',
            'cancelled'   => 'Đơn hàng đã được hủy.',
            default       => 'Trạng thái đã được cập nhật.',
        };
    }

    /**
     * Push notification vào Firebase khi order status thay đổi
     */
    private function pushOrderStatusNotification(Order $order, string $newStatus, $user): void
    {
        try {
            // Xác định đối tác (người cần nhận notification)
            $partnerId = $order->sender_id === $user->id ? $order->customer_id : $order->sender_id;

            if (!$partnerId) {
                return;
            }

            // Tạo title và body dựa trên status
            $statusLabels = [
                'picked_up'   => 'Đã nhận hàng',
                'in_transit'  => 'Đang vận chuyển',
                'arrived'     => 'Đã đến nơi',
                'delivered'   => 'Đã giao hàng',
                'completed'   => 'Hoàn tất',
                'cancelled'   => 'Đã hủy',
            ];

            $title = 'Cập nhật đơn hàng';
            $body = $this->getStatusMessage($newStatus);

            if ($order->tracking_code) {
                $body .= " - Mã đơn: {$order->tracking_code}";
            }

            // Push vào Firebase
            $this->firebaseService->pushNotification($partnerId, $title, $body, [
                'type' => 'order_status',
                'order_id' => $order->id,
                'order_uuid' => $order->uuid,
                'tracking_code' => $order->tracking_code,
                'status' => $newStatus,
            ]);

            // Gửi push notification qua Expo (cho background/killed state)
            $partner = User::find($partnerId);
            if ($partner && $partner->fcm_token) {
                ExpoPushService::sendNotification(
                    $partner->fcm_token,
                    $title,
                    $body,
                    [
                        'type' => 'order_status',
                        'order_id' => $order->id,
                        'order_uuid' => $order->uuid,
                        'tracking_code' => $order->tracking_code,
                        'status' => $newStatus,
                    ]
                );
            }
        } catch (\Exception $e) {
            \Log::error('Error pushing order status notification: ' . $e->getMessage());
        }
    }
}
