<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\WalletService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Pagination\LengthAwarePaginator;

class OrderController extends Controller
{
    public function __construct(
        private WalletService $walletService
    ) {}

    /**
     * Danh sách đơn hàng
     */
    public function index(): Response
    {
        $query = Order::with(['sender', 'customer', 'flight']);

        // Filter theo status
        if (Request::has('status') && Request::get('status')) {
            $query->where('status', Request::get('status'));
        }

        // Filter theo sender
        if (Request::has('sender_id')) {
            $query->where('sender_id', Request::get('sender_id'));
        }

        // Filter theo customer
        if (Request::has('customer_id')) {
            $query->where('customer_id', Request::get('customer_id'));
        }

        // Filter theo flight
        if (Request::has('flight_id')) {
            $query->where('flight_id', Request::get('flight_id'));
        }

        // Filter theo escrow_status
        if (Request::has('escrow_status')) {
            $query->where('escrow_status', Request::get('escrow_status'));
        }

        // Filter theo ngày
        if (Request::has('created_from')) {
            $query->whereDate('created_at', '>=', Request::get('created_from'));
        }
        if (Request::has('created_to')) {
            $query->whereDate('created_at', '<=', Request::get('created_to'));
        }

        // Search
        if (Request::has('search')) {
            $search = Request::get('search');
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
        $sortBy = Request::get('sort_by', 'created_at');
        $sortOrder = Request::get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = Request::get('per_page', 15);
        $ordersPaginated = $query->paginate($perPage)->appends(Request::all());

        // Transform data
        $transformedOrders = $ordersPaginated->items();
        foreach ($transformedOrders as $key => $order) {
            $transformedOrders[$key] = [
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
                    'flight_date' => $order->flight->flight_date->format('Y-m-d'),
                ] : null,
                'status' => $order->status,
                'escrow_status' => $order->escrow_status,
                'reward' => $order->reward,
                'total_amount' => $order->total_amount,
                'escrow_amount' => $order->escrow_amount,
                'created_at' => $order->created_at->format('Y-m-d H:i:s'),
            ];
        }

        // Create new paginator with transformed data
        $orders = new LengthAwarePaginator(
            $transformedOrders,
            $ordersPaginated->total(),
            $ordersPaginated->perPage(),
            $ordersPaginated->currentPage(),
            ['path' => $ordersPaginated->path()]
        );
        $orders->appends(Request::all());

        return Inertia::render('Admin/Orders/Index', [
            'filters' => Request::only('search', 'status', 'sender_id', 'customer_id', 'flight_id', 'escrow_status', 'created_from', 'created_to', 'sort_by', 'sort_order'),
            'orders' => $orders,
        ]);
    }

    /**
     * Chi tiết đơn hàng
     */
    public function show($id): Response
    {
        $order = Order::with([
            'sender',
            'customer',
            'flight',
            'request',
            'attachments',
        ])->findOrFail($id);

        return Inertia::render('Admin/Orders/Show', [
            'order' => $order,
        ]);
    }

    /**
     * Cập nhật trạng thái đơn hàng
     */
    public function updateStatus($id): RedirectResponse
    {
        $order = Order::with(['sender', 'customer', 'flight'])->findOrFail($id);

        Request::validate([
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

        $newStatus = Request::get('status');
        $admin = auth('admin')->user();

        return DB::transaction(function () use ($order, $newStatus, $admin) {
            $order->updateStatus($newStatus, $admin);

            // Nếu có note từ admin
            if (Request::has('note')) {
                $order->sender_note = ($order->sender_note ? $order->sender_note . "\n\n" : '')
                    . '[Admin Note] ' . Request::get('note');
                $order->save();
            }

            // Nếu hủy đơn
            if ($newStatus === 'cancelled') {
                $order->cancel_reason = Request::get('cancel_reason');
                $order->save();

                // Hoàn tiền escrow
                if (in_array($order->escrow_status, ['held', 'paid'])) {
                    $this->walletService->refundEscrowToSender($order);
                    $order->refundEscrow();
                }
            }

            // Nếu hoàn tất → giải ngân
            if ($newStatus === 'completed') {
                if ($order->escrow_status === 'held') {
                    $this->walletService->releaseEscrowToCustomer($order);
                    $order->releaseEscrow();
                }
            }

            return redirect()->back()->with('success', $this->getStatusMessage($newStatus));
        });
    }

    /**
     * Hủy đơn hàng
     */
    public function cancel($id): RedirectResponse
    {
        $order = Order::findOrFail($id);

        Request::validate([
            'cancel_reason' => 'required|string|max:500',
        ]);

        if (in_array($order->status, ['completed', 'cancelled'])) {
            return redirect()->back()->with('error', 'Không thể hủy đơn hàng ở trạng thái này');
        }

        return DB::transaction(function () use ($order) {
            $order->updateStatus('cancelled', auth('admin')->user());
            $order->cancel_reason = Request::get('cancel_reason');
            $order->save();

            // Hoàn tiền escrow
            if (in_array($order->escrow_status, ['held', 'paid'])) {
                $this->walletService->refundEscrowToSender($order);
                $order->refundEscrow();
            }

            return redirect()->back()->with('success', 'Đã hủy đơn hàng thành công');
        });
    }

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
