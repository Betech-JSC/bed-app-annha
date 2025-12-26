<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reminder;
use App\Services\ReminderService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReminderController extends Controller
{
    protected $reminderService;

    public function __construct(ReminderService $reminderService)
    {
        $this->reminderService = $reminderService;
    }

    public function index(Request $request)
    {
        $user = auth()->user();
        
        $query = Reminder::with(['remindable', 'user', 'creator']);

        // Nếu không phải admin/owner, chỉ xem của mình
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission('reminders.view')) {
            $query->where('user_id', $user->id);
        } elseif ($request->query('user_id')) {
            $query->where('user_id', $request->query('user_id'));
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($reminderType = $request->query('reminder_type')) {
            $query->where('reminder_type', $reminderType);
        }

        if ($request->query('upcoming') === 'true') {
            $query->where('reminder_date', '>=', now())
                ->where('status', 'pending');
        }

        $reminders = $query->orderBy('reminder_date', 'asc')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $reminders
        ]);
    }

    public function store(Request $request)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('reminders.create') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo nhắc nhở.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'remindable_type' => 'required|string',
            'remindable_id' => 'required|integer',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'reminder_type' => 'required|in:payment_due,deadline,maintenance,contract_expiry,leave_balance,custom',
            'reminder_date' => 'required|date',
            'due_date' => 'nullable|date',
            'user_id' => 'nullable|exists:users,id',
            'is_recurring' => 'boolean',
            'recurrence_pattern' => 'nullable|in:daily,weekly,monthly',
            'recurrence_interval' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $reminder = Reminder::create([
            'remindable_type' => $request->remindable_type,
            'remindable_id' => $request->remindable_id,
            'title' => $request->title,
            'description' => $request->description,
            'reminder_type' => $request->reminder_type,
            'reminder_date' => $request->reminder_date,
            'due_date' => $request->due_date,
            'user_id' => $request->user_id ?? $user->id,
            'is_recurring' => $request->is_recurring ?? false,
            'recurrence_pattern' => $request->recurrence_pattern,
            'recurrence_interval' => $request->recurrence_interval ?? 1,
            'next_reminder_date' => $request->is_recurring ? $this->reminderService->calculateNextReminderDate(
                $request->reminder_date,
                $request->recurrence_pattern,
                $request->recurrence_interval
            ) : null,
            'status' => 'pending',
            'created_by' => $user->id,
        ]);

        $reminder->load(['remindable', 'user', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo nhắc nhở thành công.',
            'data' => $reminder
        ], 201);
    }

    public function show(string $id)
    {
        $user = auth()->user();
        
        $reminder = Reminder::with(['remindable', 'user', 'creator'])->findOrFail($id);

        // Kiểm tra quyền
        if ($reminder->user_id !== $user->id && !$user->owner && $user->role !== 'admin' && !$user->hasPermission('reminders.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem nhắc nhở này.'
            ], 403);
        }

        return response()->json([
            'success' => true,
            'data' => $reminder
        ]);
    }

    public function update(Request $request, string $id)
    {
        $user = auth()->user();
        
        $reminder = Reminder::findOrFail($id);

        // Kiểm tra quyền
        if ($reminder->user_id !== $user->id && !$user->owner && $user->role !== 'admin' && !$user->hasPermission('reminders.update')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật nhắc nhở này.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'reminder_date' => 'sometimes|required|date',
            'due_date' => 'nullable|date',
            'is_recurring' => 'boolean',
            'recurrence_pattern' => 'nullable|in:daily,weekly,monthly',
            'recurrence_interval' => 'nullable|integer|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $updateData = $request->only([
            'title', 'description', 'reminder_date', 'due_date',
            'is_recurring', 'recurrence_pattern', 'recurrence_interval'
        ]);

        if ($request->has('is_recurring') && $request->is_recurring) {
            $updateData['next_reminder_date'] = $this->reminderService->calculateNextReminderDate(
                $request->reminder_date ?? $reminder->reminder_date,
                $request->recurrence_pattern ?? $reminder->recurrence_pattern,
                $request->recurrence_interval ?? $reminder->recurrence_interval
            );
        }

        $reminder->update($updateData);
        $reminder->load(['remindable', 'user', 'creator']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật nhắc nhở thành công.',
            'data' => $reminder
        ]);
    }

    public function destroy(string $id)
    {
        $user = auth()->user();
        
        $reminder = Reminder::findOrFail($id);

        // Kiểm tra quyền
        if ($reminder->user_id !== $user->id && !$user->owner && $user->role !== 'admin' && !$user->hasPermission('reminders.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa nhắc nhở này.'
            ], 403);
        }

        $reminder->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa nhắc nhở thành công.'
        ]);
    }

    public function sendPendingReminders()
    {
        $user = auth()->user();
        
        if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission('reminders.send')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền gửi nhắc nhở.'
            ], 403);
        }

        $sent = $this->reminderService->sendPendingReminders();

        return response()->json([
            'success' => true,
            'message' => "Đã gửi {$sent} nhắc nhở.",
            'data' => ['sent_count' => $sent]
        ]);
    }

    public function markAsSent(string $id)
    {
        $user = auth()->user();
        
        $reminder = Reminder::findOrFail($id);

        if ($reminder->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Nhắc nhở đã được xử lý.'
            ], 422);
        }

        $reminder->update(['status' => 'sent']);

        // Nếu là recurring, tạo reminder mới
        if ($reminder->is_recurring && $reminder->next_reminder_date) {
            $newReminder = $reminder->replicate();
            $newReminder->reminder_date = $reminder->next_reminder_date;
            $newReminder->status = 'pending';
            $newReminder->next_reminder_date = $this->reminderService->calculateNextReminderDate(
                $reminder->next_reminder_date,
                $reminder->recurrence_pattern,
                $reminder->recurrence_interval
            );
            $newReminder->save();
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã đánh dấu nhắc nhở đã gửi.',
            'data' => $reminder
        ]);
    }
}
