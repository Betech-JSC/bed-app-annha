<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Flight;
use App\Models\Order;
use App\Models\Request as ModelsRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    /**
     * Dashboard báo cáo
     */
    public function index(): Response
    {
        // Thống kê tổng quan
        $overview = [
            'users' => [
                'total' => User::count(),
                'senders' => User::where('role', 'sender')->count(),
                'customers' => User::where('role', 'customer')->count(),
                'new_today' => User::whereDate('created_at', today())->count(),
                'new_this_month' => User::whereMonth('created_at', now()->month)->count(),
            ],
            'flights' => [
                'total' => Flight::count(),
                'verified' => Flight::where('verified', true)->count(),
                'pending' => Flight::where('verified', false)->where('status', 'pending')->count(),
                'with_orders' => Flight::has('orders')->count(),
            ],
            'requests' => [
                'total' => ModelsRequest::count(),
                'pending' => ModelsRequest::where('status', 'pending')->count(),
                'accepted' => ModelsRequest::where('status', 'accepted')->count(),
                'expired' => ModelsRequest::where('status', 'expired')->count(),
            ],
            'orders' => [
                'total' => Order::count(),
                'completed' => Order::where('status', 'completed')->count(),
                'cancelled' => Order::where('status', 'cancelled')->count(),
                'total_revenue' => Order::where('status', 'completed')->sum('total_amount'),
                'total_escrow' => Order::whereIn('escrow_status', ['held', 'paid'])->sum('escrow_amount'),
            ],
        ];

        // Doanh thu theo thời gian
        $revenueByPeriod = [
            'today' => Order::where('status', 'completed')
                ->whereDate('completed_at', today())
                ->sum('total_amount'),
            'this_week' => Order::where('status', 'completed')
                ->whereBetween('completed_at', [now()->startOfWeek(), now()->endOfWeek()])
                ->sum('total_amount'),
            'this_month' => Order::where('status', 'completed')
                ->whereMonth('completed_at', now()->month)
                ->sum('total_amount'),
            'this_year' => Order::where('status', 'completed')
                ->whereYear('completed_at', now()->year)
                ->sum('total_amount'),
        ];

        // Top routes
        $topRoutes = Flight::select('from_airport', 'to_airport', DB::raw('count(*) as count'))
            ->groupBy('from_airport', 'to_airport')
            ->orderByDesc('count')
            ->limit(10)
            ->get()
            ->map(function ($flight) {
                return [
                    'route' => $flight->from_airport . ' → ' . $flight->to_airport,
                    'count' => $flight->count,
                ];
            });

        // Top users - Senders
        $topSendersData = Order::select('sender_id', DB::raw('count(*) as orders_count'))
            ->where('status', 'completed')
            ->groupBy('sender_id')
            ->orderByDesc('orders_count')
            ->limit(10)
            ->get();

        $topSenders = [];
        foreach ($topSendersData as $item) {
            $user = User::find($item->sender_id);
            if ($user) {
                $topSenders[] = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'orders_count' => $item->orders_count,
                ];
            }
        }

        // Top users - Customers
        $topCustomersData = Flight::select('customer_id', DB::raw('count(*) as flights_count'))
            ->where('verified', true)
            ->groupBy('customer_id')
            ->orderByDesc('flights_count')
            ->limit(10)
            ->get();

        $topCustomers = [];
        foreach ($topCustomersData as $item) {
            $user = User::find($item->customer_id);
            if ($user) {
                $topCustomers[] = [
                    'id' => $user->id,
                    'name' => $user->name,
                    'flights_count' => $item->flights_count,
                ];
            }
        }

        // Orders theo status
        $ordersByStatus = Order::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status')
            ->toArray();

        // Orders theo tháng (12 tháng gần nhất)
        $ordersByMonth = Order::select(
            DB::raw('DATE_FORMAT(created_at, "%Y-%m") as month'),
            DB::raw('count(*) as count')
        )
            ->where('created_at', '>=', now()->subMonths(12))
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'month' => $item->month,
                    'count' => $item->count,
                ];
            });

        return Inertia::render('Admin/Reports/Index', [
            'overview' => $overview,
            'revenueByPeriod' => $revenueByPeriod,
            'topRoutes' => $topRoutes,
            'topSenders' => $topSenders,
            'topCustomers' => $topCustomers,
            'ordersByStatus' => $ordersByStatus,
            'ordersByMonth' => $ordersByMonth,
        ]);
    }
}
