<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Pagination\LengthAwarePaginator;

class ReviewController extends Controller
{
    /**
     * Danh sách đánh giá
     */
    public function index(): Response
    {
        $query = Order::with(['sender', 'customer'])
            ->where(function ($q) {
                $q->whereNotNull('sender_rating')
                    ->orWhereNotNull('customer_rating');
            });

        // Filter theo rating
        if (Request::has('min_rating')) {
            $query->where(function ($q) {
                $q->where('sender_rating', '>=', Request::get('min_rating'))
                    ->orWhere('customer_rating', '>=', Request::get('min_rating'));
            });
        }

        // Filter theo user
        if (Request::has('user_id')) {
            $query->where(function ($q) {
                $q->where('sender_id', Request::get('user_id'))
                    ->orWhere('customer_id', Request::get('user_id'));
            });
        }

        // Search
        if (Request::has('search')) {
            $search = Request::get('search');
            $query->where(function ($q) use ($search) {
                $q->where('tracking_code', 'like', "%{$search}%")
                    ->orWhereHas('sender', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('customer', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
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
                'tracking_code' => $order->tracking_code,
                'sender' => [
                    'id' => $order->sender->id ?? null,
                    'name' => $order->sender->name ?? 'N/A',
                ],
                'customer' => [
                    'id' => $order->customer->id ?? null,
                    'name' => $order->customer->name ?? 'N/A',
                ],
                'sender_rating' => $order->sender_rating,
                'sender_review' => $order->sender_review,
                'customer_rating' => $order->customer_rating,
                'customer_review' => $order->customer_review,
                'created_at' => $order->created_at->format('Y-m-d H:i:s'),
            ];
        }

        $reviews = new LengthAwarePaginator(
            $transformedOrders,
            $ordersPaginated->total(),
            $ordersPaginated->perPage(),
            $ordersPaginated->currentPage(),
            ['path' => $ordersPaginated->path()]
        );
        $reviews->appends(Request::all());

        return Inertia::render('Admin/Reviews/Index', [
            'filters' => Request::only('search', 'min_rating', 'user_id', 'sort_by', 'sort_order'),
            'reviews' => $reviews,
        ]);
    }

    /**
     * Xóa đánh giá
     */
    public function destroy($id): RedirectResponse
    {
        $order = Order::findOrFail($id);

        Request::validate([
            'type' => 'required|in:sender,customer',
        ]);

        if (Request::get('type') === 'sender') {
            $order->sender_rating = null;
            $order->sender_review = null;
        } else {
            $order->customer_rating = null;
            $order->customer_review = null;
        }

        $order->save();

        return redirect()->back()->with('success', 'Đã xóa đánh giá thành công');
    }
}
