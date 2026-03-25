<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CrmNotificationController extends Controller
{
    /**
     * List all notifications with filters
     */
    public function index(Request $request)
    {
        $query = Notification::with('user:id,name,email')
            ->orderByDesc('created_at');

        // Filter by type
        if ($type = $request->get('type')) {
            $query->where('type', $type);
        }

        // Filter by priority
        if ($priority = $request->get('priority')) {
            $query->where('priority', $priority);
        }

        // Filter by status
        if ($status = $request->get('status')) {
            if ($status === 'unread') {
                $query->unread();
            } elseif ($status === 'read') {
                $query->read();
            }
        }

        // Search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('body', 'like', "%{$search}%")
                  ->orWhere('message', 'like', "%{$search}%");
            });
        }

        $notifications = $query->paginate(20)->withQueryString();

        // Stats
        $stats = [
            'total' => Notification::count(),
            'unread' => Notification::unread()->count(),
            'urgent' => Notification::where('priority', 'urgent')->unread()->count(),
            'today' => Notification::whereDate('created_at', today())->count(),
        ];

        // Types for filter
        $types = [
            ['value' => '', 'label' => 'Tất cả'],
            ['value' => 'system', 'label' => 'Hệ thống'],
            ['value' => 'project_performance', 'label' => 'Hiệu suất dự án'],
            ['value' => 'workflow', 'label' => 'Quy trình'],
            ['value' => 'assignment', 'label' => 'Phân công'],
            ['value' => 'mention', 'label' => 'Đề cập'],
        ];

        $priorities = [
            ['value' => '', 'label' => 'Tất cả'],
            ['value' => 'urgent', 'label' => 'Khẩn cấp'],
            ['value' => 'high', 'label' => 'Cao'],
            ['value' => 'medium', 'label' => 'Trung bình'],
            ['value' => 'low', 'label' => 'Thấp'],
        ];

        $users = User::orderBy('name')
            ->select('id', 'name', 'email')
            ->get();

        return Inertia::render('Crm/Notifications/Index', [
            'notifications' => $notifications,
            'stats' => $stats,
            'types' => $types,
            'priorities' => $priorities,
            'users' => $users,
            'filters' => [
                'type' => $request->get('type', ''),
                'priority' => $request->get('priority', ''),
                'status' => $request->get('status', ''),
                'search' => $request->get('search', ''),
            ],
        ]);
    }

    /**
     * Send a new notification
     */
    public function send(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string|max:2000',
            'type' => 'required|string|in:system,workflow,assignment',
            'priority' => 'required|string|in:low,medium,high,urgent',
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
            'action_url' => 'nullable|string|max:500',
        ]);

        $notificationService = app(NotificationService::class);

        $notificationService->sendToUsers(
            $validated['user_ids'],
            $validated['type'],
            'system_update',
            $validated['title'],
            $validated['body'],
            [],
            $validated['priority'],
            $validated['action_url'] ?? null,
            null,
            null,
            true // sendPush = true
        );

        return redirect()->back()->with('success', "Đã gửi " . count($validated['user_ids']) . " thông báo thành công");
    }

    /**
     * Mark specific notification as read
     */
    public function markAsRead($id)
    {
        $notification = Notification::findOrFail($id);
        $notification->markAsRead();

        return redirect()->back()->with('success', 'Đã đánh dấu đã đọc');
    }

    /**
     * Mark all as read
     */
    public function markAllRead(Request $request)
    {
        Notification::unread()
            ->update(['status' => 'read', 'read_at' => now()]);

        return redirect()->back()->with('success', 'Đã đánh dấu tất cả đã đọc');
    }

    /**
     * Delete notification
     */
    public function destroy($id)
    {
        Notification::findOrFail($id)->delete();

        return redirect()->back()->with('success', 'Đã xóa thông báo');
    }

    /**
     * Bulk delete
     */
    public function bulkDestroy(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:notifications,id',
        ]);

        Notification::whereIn('id', $validated['ids'])->delete();

        return redirect()->back()->with('success', 'Đã xóa ' . count($validated['ids']) . ' thông báo');
    }
}
