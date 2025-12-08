<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Request;
use Inertia\Inertia;
use Inertia\Response;
use Illuminate\Pagination\LengthAwarePaginator;

class NotificationController extends Controller
{
    /**
     * Danh sách thông báo đã gửi
     */
    public function index(): Response
    {
        $query = Notification::with('user')->latest();

        // Filter theo type
        if (Request::has('type') && Request::get('type')) {
            $query->where('type', Request::get('type'));
        }

        // Filter theo user
        if (Request::has('user_id')) {
            $query->where('user_id', Request::get('user_id'));
        }

        // Search
        if (Request::has('search')) {
            $search = Request::get('search');
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('message', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        // Pagination
        $perPage = Request::get('per_page', 15);
        $notificationsPaginated = $query->paginate($perPage)->appends(Request::all());

        // Transform
        $transformedNotifications = $notificationsPaginated->items();
        foreach ($transformedNotifications as $key => $notification) {
            $transformedNotifications[$key] = [
                'id' => $notification->id,
                'user' => $notification->user ? [
                    'id' => $notification->user->id,
                    'name' => $notification->user->name ?? 'N/A',
                    'email' => $notification->user->email ?? 'N/A',
                ] : null,
                'title' => $notification->title ?? $notification->message,
                'message' => $notification->message,
                'type' => $notification->type ?? 'info',
                'status' => $notification->status,
                'read_at' => $notification->read_at?->format('Y-m-d H:i:s'),
                'created_at' => $notification->created_at->format('Y-m-d H:i:s'),
            ];
        }

        $notifications = new LengthAwarePaginator(
            $transformedNotifications,
            $notificationsPaginated->total(),
            $notificationsPaginated->perPage(),
            $notificationsPaginated->currentPage(),
            ['path' => $notificationsPaginated->path()]
        );
        $notifications->appends(Request::all());

        return Inertia::render('Admin/Notifications/Index', [
            'filters' => Request::only('search', 'type', 'user_id', 'sort_by', 'sort_order'),
            'notifications' => $notifications,
        ]);
    }

    /**
     * Gửi thông báo hệ thống
     */
    public function broadcast(): RedirectResponse
    {
        Request::validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string|max:1000',
            'type' => 'sometimes|string|in:info,warning,error,success',
            'user_ids' => 'sometimes|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $userIds = Request::get('user_ids', []);

        // Nếu không có user_ids, gửi cho tất cả users
        if (empty($userIds)) {
            $userIds = User::whereNotNull('fcm_token')->pluck('id')->toArray();
        }

        // Tạo notifications
        foreach ($userIds as $userId) {
            Notification::create([
                'user_id' => $userId,
                'message' => Request::get('title') . ': ' . Request::get('message'),
                'status' => 'unread',
            ]);
        }

        // Gửi push notification qua API
        // (Có thể gọi API notification/broadcast ở đây)

        return redirect()->back()->with('success', 'Đã gửi thông báo thành công');
    }

    /**
     * Form gửi thông báo
     */
    public function create(): Response
    {
        $users = User::select('id', 'name', 'email', 'role')
            ->whereNotNull('fcm_token')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                ];
            });

        return Inertia::render('Admin/Notifications/Create', [
            'users' => $users,
        ]);
    }
}
