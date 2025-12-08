<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Flight;
use App\Models\Order;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * Dashboard tổng quan
     */
    public function index(): Response
    {
        // Thống kê users
        $usersStats = [
            'total' => User::count(),
            'senders' => User::where('role', 'sender')->count(),
            'customers' => User::where('role', 'customer')->count(),
            'banned' => User::onlyTrashed()->count(),
        ];

        // Thống kê flights
        $flightsStats = [
            'total' => Flight::count(),
            'verified' => Flight::where('verified', true)->count(),
            'pending' => Flight::where('verified', false)->where('status', 'pending')->count(),
            'cancelled' => Flight::where('status', 'cancelled')->count(),
            'with_orders' => Flight::has('orders')->count(),
        ];

        // Thống kê orders
        $ordersStats = [
            'total' => Order::count(),
            'confirmed' => Order::where('status', 'confirmed')->count(),
            'in_transit' => Order::whereIn('status', ['picked_up', 'in_transit', 'arrived'])->count(),
            'completed' => Order::where('status', 'completed')->count(),
            'cancelled' => Order::where('status', 'cancelled')->count(),
            'total_revenue' => Order::where('status', 'completed')->sum('total_amount'),
            'total_escrow' => Order::whereIn('escrow_status', ['held', 'paid'])->sum('escrow_amount'),
        ];

        // Đơn hàng gần đây
        $recentOrders = Order::with(['sender', 'customer', 'flight'])
            ->latest()
            ->limit(10)
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->id,
                    'uuid' => $order->uuid,
                    'tracking_code' => $order->tracking_code,
                    'sender_name' => $order->sender->name ?? 'N/A',
                    'customer_name' => $order->customer->name ?? 'N/A',
                    'status' => $order->status,
                    'reward' => $order->reward,
                    'created_at' => $order->created_at->format('Y-m-d H:i:s'),
                ];
            });

        return Inertia::render('Admin/Dashboard/Index', [
            'usersStats' => $usersStats,
            'flightsStats' => $flightsStats,
            'ordersStats' => $ordersStats,
            'recentOrders' => $recentOrders,
        ]);
    }
}
