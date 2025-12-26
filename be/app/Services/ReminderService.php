<?php

namespace App\Services;

use App\Models\Reminder;
use App\Services\ExpoPushService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ReminderService
{
    /**
     * Gửi các reminders đang chờ
     */
    public function sendPendingReminders(): int
    {
        $now = now();
        $reminders = Reminder::where('status', 'pending')
            ->where('reminder_date', '<=', $now)
            ->with(['user', 'remindable'])
            ->get();

        $sentCount = 0;

        foreach ($reminders as $reminder) {
            try {
                $this->sendReminder($reminder);
                $sentCount++;
            } catch (\Exception $e) {
                Log::error('Failed to send reminder: ' . $e->getMessage(), [
                    'reminder_id' => $reminder->id,
                    'error' => $e->getMessage()
                ]);
            }
        }

        return $sentCount;
    }

    /**
     * Gửi một reminder cụ thể
     */
    public function sendReminder(Reminder $reminder): bool
    {
        if (!$reminder->user || !$reminder->user->fcm_token) {
            Log::warning('Reminder user has no FCM token', ['reminder_id' => $reminder->id]);
            return false;
        }

        $title = $reminder->title;
        $body = $reminder->description ?? $this->generateReminderBody($reminder);

        // Gửi push notification
        ExpoPushService::sendNotification(
            $reminder->user->fcm_token,
            $title,
            $body,
            [
                'type' => 'reminder',
                'reminder_id' => $reminder->id,
                'reminder_type' => $reminder->reminder_type,
                'remindable_type' => $reminder->remindable_type,
                'remindable_id' => $reminder->remindable_id,
            ]
        );

        // Đánh dấu đã gửi
        $reminder->update(['status' => 'sent']);

        // Nếu là recurring, tạo reminder mới
        if ($reminder->is_recurring && $reminder->next_reminder_date) {
            $newReminder = $reminder->replicate();
            $newReminder->reminder_date = $reminder->next_reminder_date;
            $newReminder->status = 'pending';
            $newReminder->next_reminder_date = $this->calculateNextReminderDate(
                $reminder->next_reminder_date,
                $reminder->recurrence_pattern,
                $reminder->recurrence_interval
            );
            $newReminder->save();
        }

        return true;
    }

    /**
     * Tính ngày reminder tiếp theo
     */
    public function calculateNextReminderDate(string $currentDate, ?string $pattern, int $interval = 1): ?string
    {
        if (!$pattern) {
            return null;
        }

        $date = Carbon::parse($currentDate);

        switch ($pattern) {
            case 'daily':
                return $date->addDays($interval)->toDateTimeString();
            case 'weekly':
                return $date->addWeeks($interval)->toDateTimeString();
            case 'monthly':
                return $date->addMonths($interval)->toDateTimeString();
            default:
                return null;
        }
    }

    /**
     * Tạo nội dung reminder tự động
     */
    protected function generateReminderBody(Reminder $reminder): string
    {
        $remindable = $reminder->remindable;

        switch ($reminder->reminder_type) {
            case 'payment_due':
                return "Thanh toán đến hạn: " . ($remindable->amount ?? 'N/A') . " VNĐ";
            case 'deadline':
                return "Deadline: " . ($reminder->due_date ? Carbon::parse($reminder->due_date)->format('d/m/Y') : 'N/A');
            case 'maintenance':
                return "Bảo trì thiết bị: " . ($remindable->name ?? 'N/A');
            case 'contract_expiry':
                return "Hợp đồng hết hạn: " . ($remindable->end_date ? Carbon::parse($remindable->end_date)->format('d/m/Y') : 'N/A');
            case 'leave_balance':
                return "Số ngày phép còn lại: " . ($remindable->remaining_days ?? 'N/A') . " ngày";
            default:
                return $reminder->title;
        }
    }

    /**
     * Tạo reminder tự động cho payment due
     */
    public function createPaymentDueReminder($payment, int $daysBefore = 3): ?Reminder
    {
        if (!$payment->due_date) {
            return null;
        }

        $reminderDate = Carbon::parse($payment->due_date)->subDays($daysBefore);

        return Reminder::create([
            'remindable_type' => get_class($payment),
            'remindable_id' => $payment->id,
            'title' => "Thanh toán đến hạn: {$payment->amount} VNĐ",
            'description' => "Đợt thanh toán số {$payment->payment_number} của dự án sẽ đến hạn vào " . Carbon::parse($payment->due_date)->format('d/m/Y'),
            'reminder_type' => 'payment_due',
            'reminder_date' => $reminderDate,
            'due_date' => $payment->due_date,
            'user_id' => $payment->project->customer_id ?? null,
            'status' => 'pending',
            'created_by' => auth()->id() ?? 1,
        ]);
    }

    /**
     * Tạo reminder tự động cho contract expiry
     */
    public function createContractExpiryReminder($contract, int $daysBefore = 30): ?Reminder
    {
        if (!$contract->end_date) {
            return null;
        }

        $reminderDate = Carbon::parse($contract->end_date)->subDays($daysBefore);

        return Reminder::create([
            'remindable_type' => get_class($contract),
            'remindable_id' => $contract->id,
            'title' => "Hợp đồng sắp hết hạn",
            'description' => "Hợp đồng sẽ hết hạn vào " . Carbon::parse($contract->end_date)->format('d/m/Y'),
            'reminder_type' => 'contract_expiry',
            'reminder_date' => $reminderDate,
            'due_date' => $contract->end_date,
            'user_id' => $contract->user_id ?? null,
            'status' => 'pending',
            'created_by' => auth()->id() ?? 1,
        ]);
    }
}

