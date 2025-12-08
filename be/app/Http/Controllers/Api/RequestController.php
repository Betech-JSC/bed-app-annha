<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePrivateRequestRequest;
use App\Models\Flight;
use App\Models\Order;
use App\Models\Request as ModelsRequest;
use App\Models\User;
use App\Services\WalletService;
use App\Services\FirebaseService;
use App\Services\ExpoPushService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RequestController extends Controller
{
    public function __construct(
        private WalletService $walletService,
        private FirebaseService $firebaseService
    ) {}
    public function index(Request $request)
    {
        $query = ModelsRequest::with(['flight'])
            ->where('sender_id', auth()->id());

        // Filter theo status nếu có
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $requests = $query->orderByDesc('created_at')->paginate(20);

        return response()->json($requests);
    }

    public function store(StorePrivateRequestRequest $request) // Laravel tự validate
    {
        $validated = $request->validated(); // Đã được validate và an toàn

        $flight = Flight::with('customer')->findOrFail($validated['flight_id']);

        if (($flight->max_weight - $flight->booked_weight) < 0.5) {
            return response()->json([
                'success' => false,
                'message' => 'Hành khách đã hết chỗ mang thêm (dưới 0.5kg)'
            ], 400);
        }

        $exists = ModelsRequest::where('sender_id', auth()->id())
            ->where('flight_id', $flight->id)
            ->where('status', 'pending')
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn đã gửi yêu cầu cho chuyến bay này rồi!'
            ], 400);
        }

        $priorityLevel = $validated['priority_level'] ?? 'normal';
        $expiresInHours = match ($priorityLevel) {
            'urgent'   => 12,
            'priority' => 24,
            default    => 48,
        };

        $privateReq = ModelsRequest::create([
            'uuid'             => ModelsRequest::generateRequestUuid(),
            'sender_id'        => auth()->id(),
            'flight_id'        => $flight->id,
            'reward'           => $validated['reward'],
            'item_value'       => $validated['item_value'],
            'item_description' => $validated['item_description'],
            'time_slot'        => $validated['time_slot'],
            'note'             => $validated['note'],
            'priority_level'   => $priorityLevel,
            'status'           => 'pending',
            'expires_at'       => now()->addHours($expiresInHours),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi yêu cầu thành công! Hành khách sẽ phản hồi trong 24h.',
            'data'    => $privateReq
        ], 201);
    }

    public function sent(Request $request)
    {
        // Validate input
        $validated = $request->validate([
            'flight_id'           => 'required|exists:flights,id',
            'reward'              => 'required|numeric|min:50000|max:10000000',
            'item_value'          => 'required|numeric|min:100000',
            'item_description'    => 'required|string|max:1000',
            'note'                => 'nullable|string|max:500',
        ]);

        // Get flight with customer info
        $flight = Flight::with('customer')->findOrFail($validated['flight_id']);

        // Check if flight is verified
        if (!$flight->verified) {
            return response()->json([
                'success' => false,
                'message' => 'Chuyến bay chưa được xác thực. Vui lòng chọn chuyến bay đã được xác thực.'
            ], 400);
        }

        // Check available weight
        $availableWeight = $flight->max_weight - $flight->booked_weight;
        if ($availableWeight < 0.5) {
            return response()->json([
                'success' => false,
                'message' => 'Hành khách đã hết chỗ mang thêm (dưới 0.5kg)'
            ], 400);
        }

        // Check if sender already sent a pending request for this flight
        $exists = ModelsRequest::where('sender_id', auth()->id())
            ->where('flight_id', $flight->id)
            ->where('status', 'pending')
            ->exists();

        if ($exists) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn đã gửi yêu cầu cho chuyến bay này rồi!'
            ], 400);
        }

        // Check if sender is trying to send request to their own flight
        if ($flight->customer_id === auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không thể gửi yêu cầu cho chuyến bay của chính mình.'
            ], 400);
        }

        // Set priority level (default to normal)
        $priorityLevel = 'normal';
        $expiresInHours = 48; // Default 48 hours

        // Create the request
        $privateReq = ModelsRequest::create([
            'uuid'             => ModelsRequest::generateRequestUuid(),
            'sender_id'        => auth()->id(),
            'flight_id'        => $flight->id,
            'reward'           => $validated['reward'],
            'item_value'       => $validated['item_value'],
            'item_description' => $validated['item_description'],
            'note'             => $validated['note'] ?? null,
            'priority_level'   => $priorityLevel,
            'status'           => 'pending',
            'expires_at'       => now()->addHours($expiresInHours),
        ]);

        // Gửi notification tới customer (push notification + Firebase)
        $customer = $flight->customer;
        if ($customer) {
            $sender = auth()->user();

            // Push notification vào Firebase
            $this->firebaseService->pushNotification(
                $customer->id,
                'Yêu cầu mới',
                "Bạn có yêu cầu mới từ {$sender->name} với phần thưởng " . number_format($validated['reward']) . ' VNĐ',
                [
                    'type' => 'new_request',
                    'request_id' => $privateReq->id,
                    'request_uuid' => $privateReq->uuid,
                    'flight_id' => $flight->id,
                    'sender_id' => $sender->id,
                    'sender_name' => $sender->name,
                    'reward' => $validated['reward'],
                ]
            );

            // Gửi push notification qua Expo (nếu có token)
            if ($customer->fcm_token) {
                ExpoPushService::sendNotification(
                    $customer->fcm_token,
                    'Yêu cầu mới',
                    "Bạn có yêu cầu mới từ {$sender->name} với phần thưởng " . number_format($validated['reward']) . ' VNĐ',
                    [
                        'type' => 'new_request',
                        'request_id' => $privateReq->id,
                        'flight_id' => $flight->id,
                    ]
                );
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi yêu cầu thành công! Hành khách sẽ phản hồi trong 24h.',
            'data'    => $privateReq
        ], 201);
    }

    public function accept(string $id)
    {
        return $this->updateStatus($id, 'accepted');
    }

    public function decline(string $id)
    {
        return $this->updateStatus($id, 'declined');
    }

    private function updateStatus(string $id, string $newStatus = 'accepted')
    {
        $request = ModelsRequest::with('flight')->where('id', $id)->firstOrFail();

        // 1. Kiểm tra quyền: chỉ customer của chuyến bay mới được thao tác
        if ($request->flight->customer_id !== auth()->id()) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền thực hiện hành động này.'
            ], 403);
        }

        // 2. Không cho thao tác nếu đã hết hạn hoặc đã xử lý rồi
        if ($request->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Yêu cầu này đã được xử lý trước đó.'
            ], 400);
        }

        if ($request->expires_at->isPast()) {
            $request->update(['status' => 'expired']);
            return response()->json([
                'success' => false,
                'message' => 'Yêu cầu đã hết hạn.'
            ], 400);
        }

        // Nếu là decline, chỉ cập nhật status và gửi notification
        if ($newStatus === 'declined') {
            $request->update([
                'status' => 'declined',
                'responded_at' => now(),
            ]);

            // Push notification vào Firebase cho sender
            $sender = $request->sender;
            if ($sender) {
                $customer = $request->flight->customer;
                $this->firebaseService->pushNotification(
                    $sender->id,
                    'Yêu cầu bị từ chối',
                    "Yêu cầu của bạn đã bị {$customer->name} từ chối.",
                    [
                        'type' => 'request_declined',
                        'request_id' => $request->id,
                        'request_uuid' => $request->uuid,
                        'flight_id' => $request->flight_id,
                    ]
                );

                // Gửi push notification qua Expo (cho background/killed state)
                if ($sender->fcm_token) {
                    ExpoPushService::sendNotification(
                        $sender->fcm_token,
                        'Yêu cầu bị từ chối',
                        "Yêu cầu của bạn đã bị {$customer->name} từ chối.",
                        [
                            'type' => 'request_declined',
                            'request_id' => $request->id,
                            'request_uuid' => $request->uuid,
                            'flight_id' => $request->flight_id,
                        ]
                    );
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Đã từ chối yêu cầu.',
                'data' => $request->fresh()
            ], 200);
        }

        // Nếu là accept, tạo order
        try {
            // 3. Tạo Order + cập nhật trạng thái trong transaction (an toàn tuyệt đối)
            return DB::transaction(function () use ($request) {
                // Tạo chat room trên Firebase trước
                $chatId = $this->firebaseService->createChatRoomForOrder(
                    $request->id, // Tạm thời dùng request_id, sẽ update sau khi có order_id
                    $request->sender_id,
                    $request->flight->customer_id
                );

                // Tạo đơn hàng
                $order = Order::create([
                    'uuid'                   => Order::generateOrderUuid(),
                    'request_id'             => $request->id,
                    'sender_id'              => $request->sender_id,
                    'customer_id'            => $request->flight->customer_id,
                    'flight_id'              => $request->flight_id,
                    'chat_id'                => $chatId, // Lưu chat_id vào order
                    'reward'                 => $request->reward,
                    'service_fee'            => 0, // bạn tính sau hoặc để config
                    'insurance_fee'          => 0,
                    'total_amount'           => $request->reward, // tạm thời = reward
                    'escrow_amount'          => $request->reward, // tiền sẽ giữ hộ
                    'escrow_status'          => 'held',
                    'tracking_code'          => \App\Models\Order::generateTrackingCode(), // Format: SK + random số và string
                    'status'                 => 'confirmed', // trạng thái đầu tiên
                    'confirmed_at'           => now(),
                    'customer_note'          => $request->note,
                    'meeting_point_departure' => null, // sẽ update sau khi chat
                    'insured'                => false,
                    'metadata'               => [
                        'time_slot'  => $request->time_slot,
                        'item_value' => $request->item_value,
                    ],
                ]);

                // Cập nhật chat room trên Firebase với order_id thực tế
                if ($chatId) {
                    $this->firebaseService->update("chats/{$chatId}", [
                        'order_id' => $order->id,
                        'updated_at' => now()->timestamp,
                    ]);
                }

                $order->load(['sender', 'customer', 'flight']);

                // $this->walletService->holdEscrow($order);

                // Cập nhật request
                $request->update([
                    'status'        => 'accepted',
                ]);

                // Tự động từ chối các request pending khác cùng chuyến bay
                ModelsRequest::where('flight_id', $request->flight_id)
                    ->where('id', '!=', $request->id)
                    ->where('status', 'pending')
                    ->update([
                        'status'        => 'auto_declined',
                    ]);

                // Push notification vào Firebase cho sender
                $sender = $request->sender;
                if ($sender) {
                    $customer = $request->flight->customer;
                    $this->firebaseService->pushNotification(
                        $sender->id,
                        'Yêu cầu được chấp nhận',
                        "Yêu cầu của bạn đã được {$customer->name} chấp nhận. Đơn hàng #{$order->tracking_code} đã được tạo.",
                        [
                            'type' => 'request_accepted',
                            'request_id' => $request->id,
                            'request_uuid' => $request->uuid,
                            'order_id' => $order->id,
                            'order_uuid' => $order->uuid,
                            'tracking_code' => $order->tracking_code,
                            'chat_id' => $chatId,
                        ]
                    );

                    // Gửi push notification qua Expo (cho background/killed state)
                    if ($sender->fcm_token) {
                        ExpoPushService::sendNotification(
                            $sender->fcm_token,
                            'Yêu cầu được chấp nhận',
                            "Yêu cầu của bạn đã được {$customer->name} chấp nhận. Đơn hàng #{$order->tracking_code} đã được tạo.",
                            [
                                'type' => 'request_accepted',
                                'request_id' => $request->id,
                                'request_uuid' => $request->uuid,
                                'order_id' => $order->id,
                                'order_uuid' => $order->uuid,
                                'tracking_code' => $order->tracking_code,
                                'chat_id' => $chatId,
                            ]
                        );
                    }
                }

                // Trả về thông tin đẹp cho Customer
                return response()->json([
                    'success' => true,
                    'message' => 'Đã chấp nhận yêu cầu, giữ hộ tiền và tạo đơn hàng thành công!',
                    'data' => [
                        'order'    => $order,
                        'request'  => $request,
                    ]
                ], 200);
            });
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => $e->getMessage() ?: 'Không thể giữ hộ tiền do ví không đủ.',
                'errors'  => $e->errors(),
            ], 422);
        }
    }

    // danh sách requests đang chờ
    public function listPendingRequests()
    {
        $requests = ModelsRequest::with(['sender', 'flight'])
            ->whereHas('flight', fn($q) => $q->where('customer_id', auth()->id()))
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->latest()
            ->get();

        return response()->json([
            'success' => true,
            'data' => $requests
        ]);
    }

    public function priorityForCustomer(Request $request)
    {
        $customerId = $request->user()->id;
        $perPage = (int) min($request->query('per_page', 10), 50);

        $requests = ModelsRequest::with([
            'sender:id,name,avatar,phone',
            'flight',
        ])
            ->whereHas('flight', fn($q) => $q->where('customer_id', $customerId))
            ->priorityOnly()
            ->active()
            ->orderByRaw("FIELD(priority_level, 'urgent','priority','normal')")
            ->orderBy('expires_at')
            ->paginate($perPage);

        $requests->getCollection()->transform(fn($req) => $this->transformCustomerRequest($req, $customerId));

        return response()->json([
            'success' => true,
            'data'    => $requests,
        ]);
    }

    public function matchingForCustomer(Request $request)
    {
        $customerId = $request->user()->id;
        $perPage = (int) min($request->query('per_page', 15), 50);

        $builder = ModelsRequest::with([
            'sender',
            'flight',
        ])
            ->whereHas('flight', fn($q) => $q->where('customer_id', $customerId))
            ->active();

        if ($request->filled('priority_level') && in_array($request->priority_level, ['normal', 'priority', 'urgent'])) {
            $builder->where('priority_level', $request->priority_level);
        }

        if ($request->filled('time_slot')) {
            $builder->where('time_slot', $request->time_slot);
        }

        if ($request->filled('min_reward')) {
            $builder->where('reward', '>=', (int) $request->min_reward);
        }

        if ($request->filled('max_reward')) {
            $builder->where('reward', '<=', (int) $request->max_reward);
        }

        $requests = $builder
            ->orderByDesc('reward')
            ->orderBy('expires_at')
            ->paginate($perPage);

        $requests->getCollection()->transform(fn($req) => $this->transformCustomerRequest($req, $customerId));

        return response()->json([
            'success' => true,
            'data'    => $requests,
        ]);
    }

    /**
     * Lấy danh sách requests của một flight (cho customer xem)
     */
    public function getRequestsByFlight(Request $request, string $flightId)
    {
        $user = auth()->user();

        $flight = Flight::findOrFail($flightId);

        // Chỉ customer của flight mới được xem requests
        if ($flight->customer_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem requests của chuyến bay này.'
            ], 403);
        }

        $requests = ModelsRequest::with([
            'sender',
            'flight',
        ])
            ->where('flight_id', $flightId)
            ->where('status', 'pending')
            ->orderByRaw("FIELD(priority_level, 'urgent','priority','normal')")
            ->orderByDesc('reward')
            ->orderBy('expires_at')
            ->get();

        $requests->transform(fn($req) => $this->transformCustomerRequest($req, $user->id));

        return response()->json([
            'success' => true,
            'data'    => $requests,
        ]);
    }

    private function transformCustomerRequest(ModelsRequest $request, ?int $customerId = null): array
    {
        $flight = $request->flight;
        $sender = $request->sender;

        return [
            'id'              => $request->id,
            'uuid'            => $request->uuid,
            'status'          => $request->status,
            'priority_level'  => $request->priority_level,
            'priority_label'  => $request->priority_label,
            'reward'          => (float) $request->reward,
            'expires_at'      => $request->expires_at?->toIso8601String(),
            'time_slot'       => $request->time_slot,
            'can_accept'      => $request->can_accept && $flight?->customer_id === $customerId,
            'is_expired'      => $request->is_expired,
            'item'            => [
                'type'        => $request->item_type,
                'value'       => $request->item_value,
                'description' => $request->item_description,
            ],
            'sender'          => [
                'id'     => $sender?->id,
                'name'   => $sender?->name,
                'avatar' => $sender?->avatar,
                'phone'  => $sender?->phone,
            ],
            'flight'          => $flight ? [
                'id'               => $flight->id,
                'uuid'             => $flight->uuid,
                'from_airport'     => $flight->from_airport,
                'to_airport'       => $flight->to_airport,
                'flight_date'      => $flight->flight_date?->toDateString(),
                'airline'          => $flight->airline,
                'flight_number'    => $flight->flight_number,
                'available_weight' => $flight->available_weight,
            ] : null,
        ];
    }

    // CHi tiết
    public function show(string $id)
    {
        $user = auth()->user();

        $request = ModelsRequest::with([
            'sender',
            'flight.customer',
            'order'
        ])
            ->where('id', $id)
            ->firstOrFail();

        // === KIỂM TRA QUYỀN TRUY CẬP ===
        $isSender   = $request->sender_id === $user->id;
        $isCustomer = $request->flight->customer_id === $user->id;

        if (!$isSender && !$isCustomer) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem yêu cầu này.'
            ], 403);
        }

        // Chỉ Customer mới được xem nếu request còn pending hoặc đã xử lý của chính mình
        if (!$isSender && !in_array($request->status, ['pending', 'accepted', 'declined', 'auto_declined'])) {
            return response()->json([
                'success' => false,
                'message' => 'Yêu cầu này không còn tồn tại hoặc đã hết hạn.'
            ], 404);
        }

        // Transform dữ liệu đẹp cho frontend
        $data = [
            'id'              => $request->id,
            'uuid'              => $request->uuid,
            'status'            => $request->status,
            'status_label'      => $request->status,
            'created_at'        => $request->created_at->timezone('Asia/Ho_Chi_Minh')->format('d/m/Y H:i'),
            'expires_at'        => $request->expires_at?->timezone('Asia/Ho_Chi_Minh')->format('d/m/Y H:i'),
            'responded_at'      => $request->responded_at?->timezone('Asia/Ho_Chi_Minh')->format('d/m/Y H:i'),
            'can_accept'        => $isCustomer && $request->status === 'pending' && !$request->expires_at?->isPast(),
            'can_decline'       => $isCustomer && $request->status === 'pending' && !$request->expires_at?->isPast(),

            // Thông tin người gửi (Sender)
            'sender' => [
                'id'      => $request->sender->id,
                'name'    => $request->sender->name,
                'avatar'  => $request->sender->avatar,
                'phone'   => $request->sender->phone,
                'rating'  =>  0,
            ],

            // Thông tin chuyến bay
            'flight' => [
                'id'            => $request->flight->id,
                'uuid'          => $request->flight->uuid,
                'flight_number' => $request->flight->flight_number,
                'airline'       => $request->flight->airline,
                'from_airport'  => $request->flight->from_airport,
                'to_airport'    => $request->flight->to_airport,
                'flight_date'   => $request->flight->flight_date->format('d/m/Y'),
                'available_weight' => round($request->flight->max_weight - $request->flight->booked_weight, 2),
                'customer'      => $request->flight->customer ? [
                    'id'        => $request->flight->customer->id,
                    'name'      => $request->flight->customer->name,
                    'email'     => $request->flight->customer->email,
                    'phone'     => $request->flight->customer->phone,
                    'avatar'    => $request->flight->customer->avatar,
                    'kyc_status' => $request->flight->customer->kyc_status,
                ] : null,
            ],

            // Nội dung yêu cầu
            'reward'            => (int) $request->reward,
            'item_value'        => (int) $request->item_value,
            'item_description'  => $request->item_description,
            'note'              => $request->note,

            // Nếu đã được chấp nhận → có đơn hàng
            'order' => $request->order ? [
                'uuid'          => $request->order->uuid,
                'tracking_code' => $request->order->tracking_code,
                'status'        => $request->order->status,
                'escrow_status' => $request->order->escrow_status,
            ] : null,
        ];

        return response()->json([
            'success' => true,
            'data'    => $data
        ]);
    }

    /**
     * Sender hủy request đã gửi (chỉ được hủy khi còn pending)
     */
    public function cancel(string $id)
    {
        $user = auth()->user();

        $request = ModelsRequest::with('flight.customer')
            ->where('id', $id)
            ->firstOrFail();

        // 1. Chỉ người gửi mới được hủy
        if ($request->sender_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền hủy yêu cầu này.'
            ], 403);
        }

        // 2. Chỉ được hủy khi còn pending hoặc expired (không được hủy nếu đã accepted)
        if (!in_array($request->status, ['pending', 'expired'])) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể hủy yêu cầu này vì đã được xử lý.'
            ], 400);
        }

        // 3. Nếu đã hết hạn thì chỉ đánh dấu, không cần thông báo
        if ($request->expires_at?->isPast()) {
            $request->update(['status' => 'expired']);
            return response()->json([
                'success' => true,
                'message' => 'Yêu cầu đã hết hạn từ trước.'
            ]);
        }

        // 4. HỦY THÀNH CÔNG → cập nhật trạng thái
        $request->update([
            'status'       => 'cancelled',
        ]);

        // 5. (Tùy chọn) Gửi thông báo cho Customer (nếu bạn có notification system)
        // Notification::send($request->flight->customer, new RequestCancelled($request));

        return response()->json([
            'success' => true,
            'message' => 'Đã hủy yêu cầu thành công!',
            'data'    => $request
        ], 200);
    }
}
