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

        $notifications = Notification::where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($notifications);
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

        // Cập nhật trạng thái thành 'read' nếu đang là 'unread'
        if ($notification->status === 'unread') {
            $notification->status = 'read';
            $notification->save();
        }

        return response()->json([
            'message' => 'Thông báo đã được đánh dấu là đã đọc.',
            'notification' => $notification
        ]);
    }

    /**
     * Đánh dấu tất cả notifications của user đã đọc
     */
    public function markAllAsRead(Request $request)
    {
        $user = $request->user();

        $updated = Notification::where('user_id', $user->id)
            ->where('status', 'unread')
            ->update(['status' => 'read']);

        return response()->json([
            'success' => true,
            'message' => "Đã đánh dấu {$updated} thông báo là đã đọc.",
            'updated_count' => $updated
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
