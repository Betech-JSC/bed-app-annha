<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    /**
     * Danh sách người dùng với filter và pagination
     */
    public function index(Request $request)
    {
        $query = User::with(['wallet']);

        // Filter theo role (chỉ admin)
        if ($request->has('role') && $request->role === 'admin') {
            $query->where('role', 'admin');
        }

        // Filter theo status (active/banned)
        if ($request->has('status')) {
            if ($request->status === 'banned') {
                $query->whereNotNull('deleted_at');
            } elseif ($request->status === 'active') {
                $query->whereNull('deleted_at');
            }
        }

        // Search theo name, email, phone
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = $request->get('per_page', 15);
        $users = $query->paginate($perPage);

        // Transform data
        $users->getCollection()->transform(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'wallet_balance' => $user->wallet ? $user->wallet->balance : 0,
                'created_at' => $user->created_at,
                'deleted_at' => $user->deleted_at,
                'is_banned' => $user->deleted_at !== null,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $users->items(),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    /**
     * Chi tiết người dùng
     */
    public function show($id)
    {
        $user = User::with(['wallet', 'transactions' => function ($q) {
            $q->latest()->limit(10);
        }])->withTrashed()->findOrFail($id);

        // Thống kê đơn hàng
        $ordersAsSender = \App\Models\Order::where('sender_id', $user->id)->count();
        $ordersAsCustomer = \App\Models\Order::where('customer_id', $user->id)->count();
        $flightsCount = \App\Models\Flight::where('customer_id', $user->id)->count();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role,
                'avatar' => $user->avatar,
                'fcm_token' => $user->fcm_token,
                'wallet' => $user->wallet,
                'recent_transactions' => $user->transactions,
                'statistics' => [
                    'orders_as_sender' => $ordersAsSender,
                    'orders_as_customer' => $ordersAsCustomer,
                    'flights_count' => $flightsCount,
                    'total_orders' => $ordersAsSender + $ordersAsCustomer,
                ],
                'created_at' => $user->created_at,
                'deleted_at' => $user->deleted_at,
                'is_banned' => $user->deleted_at !== null,
            ],
        ]);
    }

    /**
     * Cập nhật thông tin người dùng
     */
    public function update(Request $request, $id)
    {
        $user = User::withTrashed()->findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'phone' => 'sometimes|string|max:20',
            'role' => ['sometimes', Rule::in(['admin'])],
            'password' => 'sometimes|string|min:6',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'Cập nhật thông tin người dùng thành công',
            'data' => $user,
        ]);
    }

    /**
     * Khóa tài khoản (ban)
     */
    public function ban($id)
    {
        $user = User::findOrFail($id);

        if ($user->deleted_at) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản đã bị khóa trước đó',
            ], 400);
        }

        $user->delete(); // Soft delete

        return response()->json([
            'success' => true,
            'message' => 'Đã khóa tài khoản thành công',
        ]);
    }

    /**
     * Mở khóa tài khoản (unban)
     */
    public function unban($id)
    {
        $user = User::withTrashed()->findOrFail($id);

        if (!$user->deleted_at) {
            return response()->json([
                'success' => false,
                'message' => 'Tài khoản không bị khóa',
            ], 400);
        }

        $user->restore();

        return response()->json([
            'success' => true,
            'message' => 'Đã mở khóa tài khoản thành công',
        ]);
    }

    /**
     * Xóa vĩnh viễn tài khoản
     */
    public function destroy($id)
    {
        $user = User::withTrashed()->findOrFail($id);

        // Kiểm tra xem user có đơn hàng đang xử lý không
        $activeOrders = \App\Models\Order::where(function ($q) use ($user) {
            $q->where('sender_id', $user->id)
                ->orWhere('customer_id', $user->id);
        })
            ->whereIn('status', ['confirmed', 'picked_up', 'in_transit', 'arrived', 'delivered'])
            ->count();

        if ($activeOrders > 0) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa tài khoản vì có đơn hàng đang xử lý',
            ], 400);
        }

        $user->forceDelete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa tài khoản vĩnh viễn',
        ]);
    }

    /**
     * Thống kê tổng quan nhân viên (HR dashboard)
     */
    public function stats()
    {
        $totalEmployees = User::whereNull('deleted_at')->count();
        $activeEmployees = User::whereNull('deleted_at')->count();
        $onLeave = 0; // TODO: Implement leave tracking

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $totalEmployees,
                'active' => $activeEmployees,
                'on_leave' => $onLeave,
            ],
        ]);
    }

    /**
     * Thống kê chi tiết nhân viên
     */
    public function employeeStats(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $month = $request->get('month', date('m'));
        $year = $request->get('year', date('Y'));

        // Get time tracking stats
        $timeTrackings = \App\Models\TimeTracking::where('user_id', $user->id)
            ->whereYear('check_in_at', $year)
            ->whereMonth('check_in_at', $month)
            ->where('status', 'approved')
            ->get();

        $totalHours = $timeTrackings->sum('total_hours') ?? 0;
        $totalDays = $timeTrackings->count();

        // Get payroll stats
        $payrolls = \App\Models\Payroll::where('user_id', $user->id)
            ->whereYear('period_start', $year)
            ->whereMonth('period_start', $month)
            ->get();

        $totalSalary = $payrolls->sum('net_salary') ?? 0;

        // Get bonuses
        $bonuses = \App\Models\Bonus::where('user_id', $user->id)
            ->whereYear('created_at', $year)
            ->whereMonth('created_at', $month)
            ->get();

        $totalBonuses = $bonuses->sum('amount') ?? 0;

        return response()->json([
            'success' => true,
            'data' => [
                'employee' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'time_tracking' => [
                    'total_hours' => $totalHours,
                    'total_days' => $totalDays,
                ],
                'payroll' => [
                    'total_salary' => $totalSalary,
                ],
                'bonuses' => [
                    'total' => $totalBonuses,
                    'count' => $bonuses->count(),
                ],
            ],
        ]);
    }
}
