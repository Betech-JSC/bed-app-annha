<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Flight;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminFlightController extends Controller
{
    /**
     * Danh sách chuyến bay với filter và pagination
     */
    public function index(Request $request)
    {
        $query = Flight::with(['customer', 'requests', 'orders']);

        // Filter theo verified status
        if ($request->has('verified')) {
            $query->where('verified', filter_var($request->verified, FILTER_VALIDATE_BOOLEAN));
        }

        // Filter theo status
        if ($request->has('status') && $request->status) {
            $query->where('status', $request->status);
        }

        // Filter theo route
        if ($request->has('from_airport')) {
            $query->where('from_airport', $request->from_airport);
        }
        if ($request->has('to_airport')) {
            $query->where('to_airport', $request->to_airport);
        }

        // Filter theo ngày
        if ($request->has('flight_date_from')) {
            $query->where('flight_date', '>=', $request->flight_date_from);
        }
        if ($request->has('flight_date_to')) {
            $query->where('flight_date', '<=', $request->flight_date_to);
        }

        // Search theo flight_number, airline
        if ($request->has('search')) {
            $search = $request->search;
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
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $flights = $query->paginate($perPage);

        // Transform data
        $flights->getCollection()->transform(function ($flight) {
            return [
                'id' => $flight->id,
                'uuid' => $flight->uuid,
                'customer' => [
                    'id' => $flight->customer->id ?? null,
                    'name' => $flight->customer->name ?? 'N/A',
                    'email' => $flight->customer->email ?? 'N/A',
                ],
                'from_airport' => $flight->from_airport,
                'to_airport' => $flight->to_airport,
                'flight_date' => $flight->flight_date,
                'airline' => $flight->airline,
                'flight_number' => $flight->flight_number,
                'status' => $flight->status,
                'verified' => $flight->verified,
                'verified_at' => $flight->verified_at,
                'max_weight' => $flight->max_weight,
                'booked_weight' => $flight->booked_weight,
                'available_weight' => $flight->available_weight,
                'requests_count' => $flight->requests->count(),
                'orders_count' => $flight->orders->count(),
                'created_at' => $flight->created_at,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $flights->items(),
            'pagination' => [
                'current_page' => $flights->currentPage(),
                'last_page' => $flights->lastPage(),
                'per_page' => $flights->perPage(),
                'total' => $flights->total(),
            ],
        ]);
    }

    /**
     * Chi tiết chuyến bay
     */
    public function show($id)
    {
        $flight = Flight::with([
            'customer',
            'requests.sender',
            'orders.sender',
            'orders.customer',
            'attachments',
        ])->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $flight,
        ]);
    }

    /**
     * Xác thực chuyến bay
     */
    public function verify(Request $request, $id)
    {
        $flight = Flight::findOrFail($id);

        if ($flight->verified) {
            return response()->json([
                'success' => false,
                'message' => 'Chuyến bay đã được xác thực trước đó',
            ], 400);
        }

        $admin = $request->user('sanctum');

        DB::transaction(function () use ($flight, $admin) {
            $flight->markAsVerified($admin);
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã xác thực chuyến bay thành công',
            'data' => $flight->fresh(),
        ]);
    }

    /**
     * Từ chối chuyến bay (reject)
     */
    public function reject(Request $request, $id)
    {
        $flight = Flight::findOrFail($id);

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        // Nếu chuyến bay đã verified, không thể reject
        if ($flight->verified) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể từ chối chuyến bay đã được xác thực',
            ], 400);
        }

        // Cập nhật status và note
        $flight->update([
            'status' => 'rejected',
            'note' => ($flight->note ? $flight->note . "\n\n" : '') . 'Lý do từ chối: ' . $request->reason,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối chuyến bay',
            'data' => $flight->fresh(),
        ]);
    }

    /**
     * Hủy chuyến bay
     */
    public function cancel(Request $request, $id)
    {
        $flight = Flight::findOrFail($id);

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        // Kiểm tra xem có đơn hàng đang xử lý không
        $activeOrders = $flight->orders()
            ->whereIn('status', ['confirmed', 'picked_up', 'in_transit', 'arrived', 'delivered'])
            ->count();

        if ($activeOrders > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể hủy chuyến bay vì có đơn hàng đang xử lý',
            ], 400);
        }

        DB::transaction(function () use ($flight, $request) {
            // Cập nhật status
            $flight->update([
                'status' => 'cancelled',
                'note' => ($flight->note ? $flight->note . "\n\n" : '') . 'Lý do hủy: ' . $request->reason,
            ]);

            // Từ chối tất cả requests pending
            $flight->requests()
                ->where('status', 'pending')
                ->update([
                    'status' => 'expired',
                ]);
        });

        return response()->json([
            'success' => true,
            'message' => 'Đã hủy chuyến bay thành công',
            'data' => $flight->fresh(),
        ]);
    }

    /**
     * Thống kê chuyến bay
     */
    public function statistics()
    {
        $total = Flight::count();
        $verified = Flight::where('verified', true)->count();
        $pending = Flight::where('verified', false)->where('status', 'pending')->count();
        $cancelled = Flight::where('status', 'cancelled')->count();
        $withOrders = Flight::has('orders')->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'verified' => $verified,
                'pending' => $pending,
                'cancelled' => $cancelled,
                'with_orders' => $withOrders,
                'verification_rate' => $total > 0 ? round(($verified / $total) * 100, 2) : 0,
            ],
        ]);
    }
}

