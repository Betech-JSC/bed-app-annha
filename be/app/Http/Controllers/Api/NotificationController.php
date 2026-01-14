<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\ExpoPushService;
use Illuminate\Http\Request;
use App\Models\Notification;
use Illuminate\Support\Facades\Log;

class NotificationController extends Controller
{
    /**
     * Lấy danh sách thông báo của user đang đăng nhập, phân trang.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Notification::forUser($user->id)
            ->notExpired();

        // Filter by type
        if ($request->has('type')) {
            $query->byType($request->type);
        }

        // Filter by category
        if ($request->has('category')) {
            $query->byCategory($request->category);
        }

        // Filter by status (unread only)
        if ($request->has('unread_only') && $request->boolean('unread_only')) {
            $query->unread();
        } else if ($request->has('status')) {
            if ($request->status === 'read') {
                $query->read();
            } else if ($request->status === 'unread') {
                $query->unread();
            }
        }

        // Filter by priority
        if ($request->has('priority')) {
            $query->byPriority($request->priority);
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('body', 'like', "%{$search}%")
                    ->orWhere('message', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 20);
        $notifications = $query->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json($notifications);
    }

    /**
     * Lấy chi tiết một notification
     */
    public function show(Request $request, Notification $notification)
    {
        $user = $request->user();

        if ($notification->user_id !== $user->id) {
            return response()->json([
                'message' => 'Không có quyền xem thông báo này.'
            ], 403);
        }

        return response()->json($notification);
    }

    /**
     * Đánh dấu một thông báo đã đọc.
     */
    public function markAsRead(Request $request, Notification $notification)
    {
        $user = $request->user();

        // Kiểm tra thông báo có thuộc về user không
        if ($notification->user_id !== $user->id) {
            return response()->json([
                'message' => 'Không có quyền thao tác trên thông báo này.'
            ], 403);
        }

        $notification->markAsRead();

        return response()->json([
            'success' => true,
            'message' => 'Thông báo đã được đánh dấu là đã đọc.',
            'notification' => $notification->fresh()
        ]);
    }

    /**
     * Đánh dấu tất cả notifications của user đã đọc
     */
    public function markAllAsRead(Request $request)
    {
        $user = $request->user();

        $notifications = Notification::forUser($user->id)
            ->unread()
            ->get();

        $updated = 0;
        foreach ($notifications as $notification) {
            if ($notification->markAsRead()) {
                $updated++;
            }
        }

        return response()->json([
            'success' => true,
            'message' => "Đã đánh dấu {$updated} thông báo là đã đọc.",
            'updated_count' => $updated
        ]);
    }

    /**
     * Lấy số lượng notifications chưa đọc
     */
    public function getUnreadCount(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $count = Notification::forUser($user->id)
                ->unread()
                ->notExpired()
                ->count();

            return response()->json([
                'success' => true,
                'unread_count' => $count
            ]);
        } catch (\Exception $e) {
            Log::error('Error getting unread count: ' . $e->getMessage(), [
                'user_id' => $request->user()?->id,
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi lấy số lượng thông báo chưa đọc: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Xóa một notification
     */
    public function delete(Request $request, Notification $notification)
    {
        $user = $request->user();

        if ($notification->user_id !== $user->id) {
            return response()->json([
                'message' => 'Không có quyền xóa thông báo này.'
            ], 403);
        }

        $notification->delete();

        return response()->json([
            'success' => true,
            'message' => 'Thông báo đã được xóa.'
        ]);
    }

    /**
     * Lấy notification preferences (placeholder - có thể implement sau)
     */
    public function getSettings(Request $request)
    {
        $user = $request->user();

        // TODO: Implement notification preferences table
        return response()->json([
            'success' => true,
            'settings' => [
                'push_enabled' => true,
                'email_enabled' => false,
            ]
        ]);
    }

    /**
     * Cập nhật notification preferences (placeholder - có thể implement sau)
     */
    public function updateSettings(Request $request)
    {
        $request->validate([
            'push_enabled' => 'boolean',
            'email_enabled' => 'boolean',
        ]);

        // TODO: Implement notification preferences table
        return response()->json([
            'success' => true,
            'message' => 'Cài đặt đã được cập nhật.',
            'settings' => [
                'push_enabled' => $request->get('push_enabled', true),
                'email_enabled' => $request->get('email_enabled', false),
            ]
        ]);
    }

    /**
     * Gửi thông báo hệ thống tới tất cả thiết bị (cho admin)
     */
    public function broadcast(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string|max:1000',
            'data' => 'nullable|array',
        ]);

        try {
            // Lấy tất cả users có fcm_token
            $users = User::whereNotNull('fcm_token')
                ->where('fcm_token', '!=', '')
                ->get();

            if ($users->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Không có thiết bị nào để gửi thông báo.'
                ], 400);
            }

            // Lấy tất cả tokens
            $tokens = $users->pluck('fcm_token')->filter()->toArray();

            // Gửi notification tới tất cả tokens
            $result = ExpoPushService::sendNotification(
                $tokens,
                $request->title,
                $request->body,
                $request->data ?? []
            );

            // Lưu thông báo vào database cho từng user
            foreach ($users as $user) {
                Notification::create([
                    'user_id' => $user->id,
                    'type' => 'system',
                    'title' => $request->title,
                    'body' => $request->body,
                    'data' => $request->data ?? [],
                    'status' => 'unread',
                ]);
            }

            return response()->json([
                'success' => true,
                'message' => "Đã gửi thông báo tới {$users->count()} thiết bị.",
                'sent_count' => $users->count(),
                'result' => $result,
            ]);
        } catch (\Exception $e) {
            Log::error('Broadcast notification error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi gửi thông báo: ' . $e->getMessage()
            ], 500);
        }
    }
}
