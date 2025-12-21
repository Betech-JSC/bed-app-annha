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
     * Tạo người dùng mới
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:6',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        try {
            $user = User::create([
                'first_name' => $validated['first_name'],
                'last_name' => $validated['last_name'] ?? '',
                'email' => $validated['email'],
                'phone' => $validated['phone'] ?? null,
                'password' => Hash::make($validated['password']),
                'name' => trim(($validated['first_name'] ?? '') . ' ' . ($validated['last_name'] ?? '')),
            ]);

            // Gán roles nếu có
            if (!empty($validated['role_ids'])) {
                $user->roles()->sync($validated['role_ids']);
            }

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo tài khoản thành công',
                'data' => $user->load(['roles']),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi tạo tài khoản',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Danh sách người dùng với filter và pagination
     */
    public function index(Request $request)
    {
        $query = User::with(['wallet', 'roles']);

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
                'roles' => $user->roles,
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
        try {
            $user = User::with(['wallet', 'roles', 'employeeProfile', 'transactions' => function ($q) {
                $q->latest()->limit(10);
            }])->withTrashed()->findOrFail($id);

            // Thống kê liên quan đến dự án (nếu có)
            $projectsCount = 0;
            $timeTrackingsCount = 0;
            $payrollsCount = 0;

            try {
                if (class_exists(\App\Models\ProjectPersonnel::class)) {
                    $projectsCount = \App\Models\ProjectPersonnel::where('user_id', $user->id)->distinct('project_id')->count();
                }
                if (class_exists(\App\Models\TimeTracking::class)) {
                    $timeTrackingsCount = \App\Models\TimeTracking::where('user_id', $user->id)->count();
                }
                if (class_exists(\App\Models\Payroll::class)) {
                    $payrollsCount = \App\Models\Payroll::where('user_id', $user->id)->count();
                }
            } catch (\Exception $e) {
                // Ignore errors from statistics
            }

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
                    'roles' => $user->roles,
                    'employee_profile' => $user->employeeProfile,
                    'recent_transactions' => $user->transactions ?? [],
                    'statistics' => [
                        'projects_count' => $projectsCount,
                        'time_trackings_count' => $timeTrackingsCount,
                        'payrolls_count' => $payrollsCount,
                    ],
                    'created_at' => $user->created_at,
                    'deleted_at' => $user->deleted_at,
                    'is_banned' => $user->deleted_at !== null,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể tải thông tin người dùng',
                'error' => $e->getMessage(),
            ], 500);
        }
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

    /**
     * Lấy roles của user
     */
    public function getUserRoles($id)
    {
        $user = User::with('roles')->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ],
                'roles' => $user->roles,
                'role_ids' => $user->roles->pluck('id')->toArray(),
            ],
        ]);
    }

    /**
     * Gán roles cho user
     */
    public function syncUserRoles(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'role_ids' => 'required|array',
            'role_ids.*' => 'exists:roles,id',
        ]);

        $user->roles()->sync($validated['role_ids']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật vai trò cho tài khoản thành công',
            'data' => $user->load('roles'),
        ]);
    }
}
