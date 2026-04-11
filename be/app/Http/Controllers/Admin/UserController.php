<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Pagination\LengthAwarePaginator;

class UserController extends Controller
{
    /**
     * Danh sách người dùng
     */
    public function index(): Response
    {
        $query = User::with(['wallet', 'roles']);

        // Filter theo role (Duyệt qua các role mới)
        if (Request::has('role_id')) {
            $query->whereHas('roles', function($q) {
                $q->where('roles.id', Request::get('role_id'));
            });
        }

        // Filter theo status
        if (Request::has('status')) {
            if (Request::get('status') === 'banned') {
                $query->onlyTrashed();
            } elseif (Request::get('status') === 'active') {
                $query->whereNull('deleted_at');
            }
        }

        // Search
        if (Request::has('search')) {
            $search = Request::get('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        // Sort
        $sortBy = Request::get('sort_by', 'created_at');
        $sortOrder = Request::get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        // Pagination
        $perPage = Request::get('per_page', 15);
        $usersPaginated = $query->paginate($perPage)->appends(Request::all());

        // Transform data
        $transformedUsers = $usersPaginated->items();
        foreach ($transformedUsers as $key => $user) {
            $transformedUsers[$key] = [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'roles_list' => $user->roles->pluck('name')->join(', '),
                'avatar' => $user->avatar,
                'wallet_balance' => $user->wallet ? $user->wallet->balance : 0,
                'created_at' => $user->created_at->format('Y-m-d H:i:s'),
                'deleted_at' => $user->deleted_at?->format('Y-m-d H:i:s'),
                'is_banned' => $user->deleted_at !== null,
            ];
        }

        // Create new paginator with transformed data
        $users = new LengthAwarePaginator(
            $transformedUsers,
            $usersPaginated->total(),
            $usersPaginated->perPage(),
            $usersPaginated->currentPage(),
            ['path' => $usersPaginated->path()]
        );
        $users->appends(Request::all());

        return Inertia::render('Admin/Users/Index', [
            'filters' => Request::only(['search', 'role_id', 'status', 'sort_by', 'sort_order']),
            'users' => $users,
            'roles' => \App\Models\Role::select('id', 'name')->get(),
        ]);
    }

    /**
     * Chi tiết người dùng
     */
    public function show($id): Response
    {
        $user = User::with(['wallet', 'roles', 'transactions' => function ($q) {
            $q->latest()->limit(10);
        }])->withTrashed()->findOrFail($id);

        // Thống kê
        $ordersAsSender = class_exists('\App\Models\Order') ? \App\Models\Order::where('sender_id', $user->id)->count() : 0;
        $ordersAsCustomer = class_exists('\App\Models\Order') ? \App\Models\Order::where('customer_id', $user->id)->count() : 0;
        $flightsCount = class_exists('\App\Models\Flight') ? \App\Models\Flight::where('customer_id', $user->id)->count() : 0;

        return Inertia::render('Admin/Users/Show', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'roles' => $user->roles,
                'avatar' => $user->avatar,
                'wallet' => $user->wallet,
                'recent_transactions' => $user->transactions,
                'statistics' => [
                    'orders_as_sender' => $ordersAsSender,
                    'orders_as_customer' => $ordersAsCustomer,
                    'flights_count' => $flightsCount,
                    'total_orders' => $ordersAsSender + $ordersAsCustomer,
                ],
                'created_at' => $user->created_at->format('Y-m-d H:i:s'),
                'deleted_at' => $user->deleted_at?->format('Y-m-d H:i:s'),
                'is_banned' => $user->deleted_at !== null,
            ],
        ]);
    }

    /**
     * Cập nhật người dùng
     */
    public function update($id): RedirectResponse
    {
        $user = User::withTrashed()->findOrFail($id);

        $validated = Request::validate([
            'name' => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'phone' => 'sometimes|string|max:20',
            'role_ids' => 'sometimes|array',
            'role_ids.*' => 'exists:roles,id',
            'password' => 'sometimes|string|min:6',
        ]);

        $data = Request::only(['name', 'email', 'phone']);

        if (Request::has('password') && Request::get('password')) {
            $data['password'] = Hash::make(Request::get('password'));
        }

        $user->update($data);

        if (Request::has('role_ids')) {
            $user->roles()->sync(Request::get('role_ids'));
        }

        return redirect()->back()->with('success', 'Cập nhật thông tin người dùng thành công');
    }

    /**
     * Khóa tài khoản
     */
    public function ban($id): RedirectResponse
    {
        $user = User::findOrFail($id);

        if ($user->deleted_at) {
            return redirect()->back()->with('error', 'Tài khoản đã bị khóa trước đó');
        }

        $user->delete();

        return redirect()->back()->with('success', 'Đã khóa tài khoản thành công');
    }

    /**
     * Mở khóa tài khoản
     */
    public function unban($id): RedirectResponse
    {
        $user = User::withTrashed()->findOrFail($id);

        if (!$user->deleted_at) {
            return redirect()->back()->with('error', 'Tài khoản không bị khóa');
        }

        $user->restore();

        return redirect()->back()->with('success', 'Đã mở khóa tài khoản thành công');
    }

    /**
     * Xóa vĩnh viễn
     */
    public function destroy($id): RedirectResponse
    {
        $user = User::withTrashed()->findOrFail($id);

        // Kiểm tra đơn hàng đang xử lý (Nếu có dùng bảng Order)
        $activeOrders = 0;
        if (class_exists('\App\Models\Order')) {
            $activeOrders = \App\Models\Order::where(function ($q) use ($user) {
                $q->where('sender_id', $user->id)
                    ->orWhere('customer_id', $user->id);
            })
            ->whereIn('status', ['confirmed', 'picked_up', 'in_transit', 'arrived', 'delivered'])
            ->count();
        }

        if ($activeOrders > 0) {
            return redirect()->back()->with('error', 'Không thể xóa tài khoản vì có đơn hàng đang xử lý');
        }

        $user->forceDelete();

        return redirect()->route('admin.users.index')->with('success', 'Đã xóa tài khoản vĩnh viễn');
    }
}
