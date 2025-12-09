<?php

namespace App\Services;

use App\Models\ProjectPayment;
use Carbon\Carbon;

class PaymentReminderService
{
    /**
     * Gửi nhắc nhở thanh toán cho các đợt sắp đến hạn
     */
    public function sendReminders(int $daysBefore = 7): array
    {
        $today = Carbon::today();
        $reminderDate = $today->copy()->addDays($daysBefore);

        // Get payments due soon
        $payments = ProjectPayment::where('status', 'pending')
            ->whereBetween('due_date', [$today, $reminderDate])
            ->where(function ($q) {
                // Not reminded in last 3 days
                $q->whereNull('reminder_sent_at')
                    ->orWhere('reminder_sent_at', '<', Carbon::now()->subDays(3));
            })
            ->with(['project.customer'])
            ->get();

        $reminded = [];

        foreach ($payments as $payment) {
            // Increment reminder count
            $payment->incrementReminder();

            // TODO: Send notification/email here
            // NotificationService::sendPaymentReminder($payment);

            $reminded[] = [
                'payment_id' => $payment->id,
                'project_id' => $payment->project_id,
                'amount' => $payment->amount,
                'due_date' => $payment->due_date,
                'customer' => $payment->project->customer->name ?? 'N/A',
            ];
        }

        return $reminded;
    }

    /**
     * Đánh dấu các thanh toán quá hạn
     */
    public function markOverduePayments(): int
    {
        $today = Carbon::today();

        $count = ProjectPayment::where('status', 'pending')
            ->where('due_date', '<', $today)
            ->get()
            ->each(function ($payment) {
                $payment->markAsOverdue();
            })
            ->count();

        return $count;
    }

    /**
     * Tính toán ngày thanh toán tiếp theo dựa trên nghiệm thu
     */
    public function calculateNextPaymentDate(Project $project, Carbon $fromDate = null): ?Carbon
    {
        $contract = $project->contract;

        if (!$contract || !$contract->signed_date) {
            return null;
        }

        $fromDate = $fromDate ?? Carbon::parse($contract->signed_date);

        // Default: 30 days after previous payment or acceptance
        return $fromDate->copy()->addDays(30);
    }
}
