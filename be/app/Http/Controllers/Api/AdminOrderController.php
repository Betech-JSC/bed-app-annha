<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\WalletService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AdminOrderController extends Controller
{
    public function __construct(
        private WalletService $walletService
    ) {}

    /**
     * Danh sách đơn hàng với filter và pagination
     */
    public function index(Request $request)
    {
        $query = Order::with(['sender', 'customer', 'flight']);

        // Filter theo status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter theo sender
        if ($request->has('sender_id')) {
            $query->where('sender_id', $request->sender_id);
        }

        // Filter theo customer
        if ($request->has('customer_id')) {
            $query->where('customer_id', $request->customer_id);
        }

        // Filter theo flight
        if ($request->has('flight_id')) {
            $query->where('flight_id', $request->flight_id);
        }

        // Filter theo escrow_status
        if ($request->has('escrow_status')) {
            $query->where('escrow_status', $request->escrow_status);
        }

        // Filter theo ngày
        if ($request->has('created_from')) {
            $query->whereDate('created_at', '>=', $request->created_from);
        }
        if ($request->has('created_to')) {
            $query->whereDate('created_at', '<=', $request->created_to);
        }

        // Search theo tracking_code, uuid, sender name, customer name
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('tracking_code', 'like', "%{$search}%")
                    ->orWhere('uuid', 'like', "%{$search}%")
                    ->orWhereHas('sender', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    })
                    ->orWhereHas('customer', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $orders = $query->paginate($perPage);

        // Transform data
        $orders->getCollection()->transform(function ($order) {
            return [
                'id' => $order->id,
                'uuid' => $order->uuid,
                'tracking_code' => $order->tracking_code,
                'sender' => [
                    'id' => $order->sender->id ?? null,
                    'name' => $order->sender->name ?? 'N/A',
                    'email' => $order->sender->email ?? 'N/A',
                ],
                'customer' => [
                    'id' => $order->customer->id ?? null,
                    'name' => $order->customer->name ?? 'N/A',
                    'email' => $order->customer->email ?? 'N/A',
                ],
                'flight' => $order->flight ? [
                    'id' => $order->flight->id,
                    'from_airport' => $order->flight->from_airport,
                    'to_airport' => $order->flight->to_airport,
                    'flight_date' => $order->flight->flight_date,
                ] : null,
                'status' => $order->status,
                'escrow_status' => $order->escrow_status,
                'reward' => $order->reward,
                'total_amount' => $order->total_amount,
                'escrow_amount' => $order->escrow_amount,
                'created_at' => $order->created_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $orders->items(),
            'pagination' => [
                'current_page' => $orders->currentPage(),
                'last_page' => $orders->lastPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
            ],
        ]);
    }

    /**
     * Chi tiết đơn hàng
     */
    public function show($id)
    {
        $order = Order::with([
            'sender',
            'customer',
            'flight',
            'request',
            'attachments',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $order,
        ]);
    }

    /**
     * Cập nhật trạng thái đơn hàng (Admin có quyền cập nhật bất kỳ trạng thái nào)
     */
    public function updateStatus(Request $request, $id)
    {
        $order = Order::with(['sender', 'customer', 'flight'])->findOrFail($id);

        $request->validate([
            'status' => [
                'required',
                'string',
                Rule::in([
                    'confirmed',
                    'picked_up',
                    'in_transit',
                    'arrived',
                    'delivered',
                    'completed',
                    'cancelled',
                ])
            ],
            'cancel_reason' => 'required_if:status,cancelled|string|max:500',
            'note' => 'sometimes|string|max:1000',
        ]);

        $newStatus = $request->status;
        $admin = $request->user('sanctum');

        return DB::transaction(function () use ($order, $newStatus, $request, $admin) {
            // Cập nhật trạng thái
            $order->updateStatus($newStatus, $admin);

            // Nếu có note từ admin
            if ($request->has('note')) {
                $order->sender_note = ($order->sender_note ? $order->sender_note . "\n\n" : '') 
                    . '[Admin Note] ' . $request->note;
                $order->save();
            }

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

            // Load lại dữ liệu
            $order->load(['sender', 'customer', 'flight']);

            return response()->json([
                'success' => true,
                'message' => $this->getStatusMessage($newStatus),
                'data' => $order,
            ]);
        });
    }

    /**
     * Hủy đơn hàng
     */
    public function cancel(Request $request, $id)
    {
        $order = Order::findOrFail($id);

        $request->validate([
            'cancel_reason' => 'required|string|max:500',
        ]);

        // Kiểm tra xem đơn đã hoàn thành hoặc đã hủy chưa
        if (in_array($order->status, ['completed', 'cancelled'])) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể hủy đơn hàng ở trạng thái này',
            ], 400);
        }

        return DB::transaction(function () use ($order, $request) {
            $order->updateStatus('cancelled', $request->user('sanctum'));
            $order->cancel_reason = $request->cancel_reason;
            $order->save();

            // Hoàn tiền escrow
            if (in_array($order->escrow_status, ['held', 'paid'])) {
                $this->walletService->refundEscrowToSender($order);
                $order->refundEscrow();
            }

            return response()->json([
                'success' => true,
                'message' => 'Đã hủy đơn hàng thành công',
                'data' => $order->fresh(['sender', 'customer', 'flight']),
            ]);
        });
    }

    /**
     * Thống kê đơn hàng
     */
    public function statistics()
    {
        $total = Order::count();
        $byStatus = Order::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $totalRevenue = Order::where('status', 'completed')
            ->sum('total_amount');

        $totalEscrow = Order::whereIn('escrow_status', ['held', 'paid'])
            ->sum('escrow_amount');

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'by_status' => $byStatus,
                'total_revenue' => $totalRevenue,
                'total_escrow' => $totalEscrow,
                'completion_rate' => $total > 0 ? round((($byStatus['completed'] ?? 0) / $total) * 100, 2) : 0,
            ],
        ]);
    }

    /**
     * Thông báo thân thiện theo từng trạng thái
     */
    private function getStatusMessage(string $status): string
    {
        return match ($status) {
            'confirmed' => 'Đã xác nhận đơn hàng',
            'picked_up' => 'Đã nhận hàng từ người gửi',
            'in_transit' => 'Hàng đang trên chuyến bay',
            'arrived' => 'Đã đến sân bay đích',
            'delivered' => 'Đã giao hàng cho người nhận',
            'completed' => 'Đơn hàng đã hoàn tất',
            'cancelled' => 'Đơn hàng đã được hủy',
            default => 'Trạng thái đã được cập nhật',
        };
    }
}

