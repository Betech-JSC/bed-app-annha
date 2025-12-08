<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Flight;
use App\Models\User;
use App\Services\FirebaseService;
use App\Services\ExpoPushService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Pagination\LengthAwarePaginator;

class FlightController extends Controller
{
    public function __construct(
        private FirebaseService $firebaseService
    ) {}
    /**
     * Danh sách chuyến bay
     */
    public function index(): Response
    {
        $query = Flight::with(['customer', 'requests', 'orders']);

        // Filter theo verified
        if (Request::has('verified')) {
            $query->where('verified', filter_var(Request::get('verified'), FILTER_VALIDATE_BOOLEAN));
        }

        // Filter theo status
        if (Request::has('status') && Request::get('status')) {
            $query->where('status', Request::get('status'));
        }

        // Filter theo route
        if (Request::has('from_airport')) {
            $query->where('from_airport', Request::get('from_airport'));
        }
        if (Request::has('to_airport')) {
            $query->where('to_airport', Request::get('to_airport'));
        }

        // Filter theo ngày
        if (Request::has('flight_date_from')) {
            $query->where('flight_date', '>=', Request::get('flight_date_from'));
        }
        if (Request::has('flight_date_to')) {
            $query->where('flight_date', '<=', Request::get('flight_date_to'));
        }

        // Search
        if (Request::has('search')) {
            $search = Request::get('search');
            $query->where(function ($q) use ($search) {
                $q->where('flight_number', 'like', "%{$search}%")
                    ->orWhere('airline', 'like', "%{$search}%")
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
        $flightsPaginated = $query->paginate($perPage)->appends(Request::all());

        // Transform data
        $transformedFlights = $flightsPaginated->items();
        foreach ($transformedFlights as $key => $flight) {
            $transformedFlights[$key] = [
                'id' => $flight->id,
                'uuid' => $flight->uuid,
                'customer' => [
                    'id' => $flight->customer->id ?? null,
                    'name' => $flight->customer->name ?? 'N/A',
                    'email' => $flight->customer->email ?? 'N/A',
                ],
                'from_airport' => $flight->from_airport,
                'to_airport' => $flight->to_airport,
                'flight_date' => $flight->flight_date->format('Y-m-d'),
                'airline' => $flight->airline,
                'flight_number' => $flight->flight_number,
                'status' => $flight->status,
                'verified' => $flight->verified,
                'verified_at' => $flight->verified_at?->format('Y-m-d H:i:s'),
                'max_weight' => $flight->max_weight,
                'booked_weight' => $flight->booked_weight,
                'available_weight' => $flight->available_weight,
                'requests_count' => $flight->requests->count(),
                'orders_count' => $flight->orders->count(),
                'created_at' => $flight->created_at->format('Y-m-d H:i:s'),
            ];
        }

        // Create new paginator with transformed data
        $flights = new LengthAwarePaginator(
            $transformedFlights,
            $flightsPaginated->total(),
            $flightsPaginated->perPage(),
            $flightsPaginated->currentPage(),
            ['path' => $flightsPaginated->path()]
        );
        $flights->appends(Request::all());

        return Inertia::render('Admin/Flights/Index', [
            'filters' => Request::only('search', 'verified', 'status', 'from_airport', 'to_airport', 'flight_date_from', 'flight_date_to', 'sort_by', 'sort_order'),
            'flights' => $flights,
        ]);
    }

    /**
     * Chi tiết chuyến bay
     */
    public function show($id): Response
    {
        $flight = Flight::with([
            'customer',
            'requests.sender',
            'orders.sender',
            'orders.customer',
            'attachments',
        ])->findOrFail($id);

        return Inertia::render('Admin/Flights/Show', [
            'flight' => $flight,
        ]);
    }

    /**
     * Xác thực chuyến bay
     */
    public function verify($id): RedirectResponse
    {
        $flight = Flight::with('customer')->findOrFail($id);

        if ($flight->verified) {
            return redirect()->back()->with('error', 'Chuyến bay đã được xác thực trước đó');
        }

        $admin = auth('admin')->user();
        $oldStatus = $flight->status;

        DB::transaction(function () use ($flight, $admin, $oldStatus) {
            // Cập nhật status và verified flag
            $flight->update([
                'status' => 'verified',
                'verified' => true,
                'verified_at' => now(),
            ]);

            // Refresh để có dữ liệu mới nhất và load customer relationship
            $flight->refresh();
            $flight->load('customer');

            // Log để debug
            Log::info('Flight verified', [
                'flight_id' => $flight->id,
                'customer_id' => $flight->customer_id,
                'old_status' => $oldStatus,
                'new_status' => $flight->status,
            ]);

            // Gửi notification cho customer khi flight được verify
            $this->pushFlightStatusNotification($flight->fresh(['customer']), $oldStatus, 'verified');
        });

        return redirect()->back()->with('success', 'Đã xác thực chuyến bay thành công');
    }

    /**
     * Từ chối chuyến bay
     */
    public function reject($id): RedirectResponse
    {
        $flight = Flight::with('customer')->findOrFail($id);

        Request::validate([
            'reason' => 'required|string|max:500',
        ]);

        if ($flight->verified) {
            return redirect()->back()->with('error', 'Không thể từ chối chuyến bay đã được xác thực');
        }

        $oldStatus = $flight->status;

        $flight->update([
            'status' => 'rejected',
            'note' => ($flight->note ? $flight->note . "\n\n" : '') . 'Lý do từ chối: ' . Request::get('reason'),
        ]);

        // Gửi notification cho customer khi flight bị từ chối
        $this->pushFlightStatusNotification($flight, $oldStatus, 'rejected');

        return redirect()->back()->with('success', 'Đã từ chối chuyến bay');
    }

    /**
     * Hủy chuyến bay
     */
    public function cancel($id): RedirectResponse
    {
        $flight = Flight::with('customer')->findOrFail($id);

        Request::validate([
            'reason' => 'required|string|max:500',
        ]);

        // Kiểm tra đơn hàng đang xử lý
        $activeOrders = $flight->orders()
            ->whereIn('status', ['confirmed', 'picked_up', 'in_transit', 'arrived', 'delivered'])
            ->count();

        if ($activeOrders > 0) {
            return redirect()->back()->with('error', 'Không thể hủy chuyến bay vì có đơn hàng đang xử lý');
        }

        $oldStatus = $flight->status;

        DB::transaction(function () use ($flight, $oldStatus) {
            $flight->update([
                'status' => 'cancelled',
                'note' => ($flight->note ? $flight->note . "\n\n" : '') . 'Lý do hủy: ' . Request::get('reason'),
            ]);

            // Từ chối tất cả requests pending
            $flight->requests()
                ->where('status', 'pending')
                ->update(['status' => 'expired']);

            // Gửi notification cho customer khi flight bị hủy
            $this->pushFlightStatusNotification($flight, $oldStatus, 'cancelled');
        });

        return redirect()->back()->with('success', 'Đã hủy chuyến bay thành công');
    }

    /**
     * Push notification vào Firebase khi flight status thay đổi
     */
    private function pushFlightStatusNotification(Flight $flight, string $oldStatus, string $newStatus): void
    {
        try {
            // Reload customer relationship để đảm bảo có dữ liệu
            $flight->load('customer');
            $customer = $flight->customer;

            if (!$customer) {
                Log::warning('Cannot send flight notification: customer not found', [
                    'flight_id' => $flight->id,
                    'customer_id' => $flight->customer_id,
                ]);
                return;
            }

            // Tạo title và body dựa trên status
            $statusMessages = [
                'pending' => 'Chuyến bay của bạn đang chờ xác thực',
                'verified' => 'Chuyến bay của bạn đã được xác thực thành công!',
                'rejected' => 'Chuyến bay của bạn đã bị từ chối',
                'cancelled' => 'Chuyến bay của bạn đã bị hủy',
                'completed' => 'Chuyến bay của bạn đã hoàn tất',
            ];

            $title = 'Cập nhật chuyến bay';
            $body = $statusMessages[$newStatus] ?? "Trạng thái chuyến bay đã được cập nhật thành: {$newStatus}";

            if ($flight->flight_number) {
                $body .= " - Chuyến bay: {$flight->flight_number}";
            }
            if ($flight->from_airport && $flight->to_airport) {
                $body .= " ({$flight->from_airport} → {$flight->to_airport})";
            }

            $notificationData = [
                'type' => 'flight_status',
                'flight_id' => $flight->id,
                'flight_uuid' => $flight->uuid,
                'flight_number' => $flight->flight_number,
                'status' => $newStatus,
                'old_status' => $oldStatus,
            ];

            Log::info('Pushing flight status notification', [
                'customer_id' => $customer->id,
                'title' => $title,
                'body' => $body,
                'data' => $notificationData,
            ]);

            // Push vào Firebase
            $result = $this->firebaseService->pushNotification($customer->id, $title, $body, $notificationData);

            if ($result) {
                Log::info('Firebase notification pushed successfully', [
                    'customer_id' => $customer->id,
                ]);
            } else {
                Log::error('Failed to push Firebase notification', [
                    'customer_id' => $customer->id,
                ]);
            }

            // Gửi push notification qua Expo (cho background/killed state)
            if ($customer->fcm_token) {
                ExpoPushService::sendNotification(
                    $customer->fcm_token,
                    $title,
                    $body,
                    $notificationData
                );
                Log::info('Expo push notification sent', [
                    'customer_id' => $customer->id,
                    'fcm_token' => $customer->fcm_token,
                ]);
            } else {
                Log::warning('Customer has no FCM token', [
                    'customer_id' => $customer->id,
                ]);
            }

            // Nếu flight bị hủy hoặc từ chối, thông báo cho các sender đã gửi request
            if (in_array($newStatus, ['cancelled', 'rejected'])) {
                $requests = $flight->requests()->where('status', 'pending')->get();
                foreach ($requests as $request) {
                    $sender = $request->sender;
                    if ($sender) {
                        $message = $newStatus === 'cancelled'
                            ? "Chuyến bay {$flight->flight_number} ({$flight->from_airport} → {$flight->to_airport}) mà bạn đã gửi yêu cầu đã bị hủy."
                            : "Chuyến bay {$flight->flight_number} ({$flight->from_airport} → {$flight->to_airport}) mà bạn đã gửi yêu cầu đã bị từ chối.";

                        $this->firebaseService->pushNotification(
                            $sender->id,
                            'Chuyến bay đã bị ' . ($newStatus === 'cancelled' ? 'hủy' : 'từ chối'),
                            $message,
                            [
                                'type' => 'flight_status',
                                'flight_id' => $flight->id,
                                'flight_uuid' => $flight->uuid,
                                'request_id' => $request->id,
                                'status' => $newStatus,
                            ]
                        );

                        if ($sender->fcm_token) {
                            ExpoPushService::sendNotification(
                                $sender->fcm_token,
                                'Chuyến bay đã bị ' . ($newStatus === 'cancelled' ? 'hủy' : 'từ chối'),
                                $message,
                                [
                                    'type' => 'flight_status',
                                    'flight_id' => $flight->id,
                                    'flight_uuid' => $flight->uuid,
                                    'request_id' => $request->id,
                                    'status' => $newStatus,
                                ]
                            );
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('Error pushing flight status notification: ' . $e->getMessage());
        }
    }
}
