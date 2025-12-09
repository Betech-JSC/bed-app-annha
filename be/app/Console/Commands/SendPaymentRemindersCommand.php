<?php

namespace App\Console\Commands;

use App\Services\PaymentReminderService;
use Illuminate\Console\Command;

class SendPaymentRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'projects:send-payment-reminders {--days=7 : Số ngày trước khi đến hạn}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Gửi nhắc nhở thanh toán cho các đợt sắp đến hạn';

    /**
     * Execute the console command.
     */
    public function handle(PaymentReminderService $service): int
    {
        $days = (int) $this->option('days');

        $this->info("Đang gửi nhắc nhở thanh toán (trước {$days} ngày)...");

        // Mark overdue payments
        $overdueCount = $service->markOverduePayments();
        if ($overdueCount > 0) {
            $this->info("Đã đánh dấu {$overdueCount} thanh toán quá hạn.");
        }

        // Send reminders
        $reminded = $service->sendReminders($days);

        if (empty($reminded)) {
            $this->info('Không có thanh toán nào cần nhắc nhở.');
            return Command::SUCCESS;
        }

        $this->info("Đã gửi nhắc nhở cho " . count($reminded) . " thanh toán:");

        foreach ($reminded as $payment) {
            $this->line("  - Dự án #{$payment['project_id']}: {$payment['amount']} VND (Đến hạn: {$payment['due_date']})");
        }

        return Command::SUCCESS;
    }
}
