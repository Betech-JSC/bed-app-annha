<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel
{
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule)
    {
        // Chạy command listen chat mỗi phút
        $schedule->command('firebase:listen-chat')->everyMinute();

        // Gửi nhắc nhở thanh toán hàng ngày lúc 9:00
        $schedule->command('projects:send-payment-reminders')->dailyAt('09:00');

        // Tính lại tiến độ dự án mỗi ngày lúc 23:00
        $schedule->command('projects:calculate-progress')->dailyAt('23:00');

        // Tính lương hàng tháng vào ngày 1 mỗi tháng lúc 8:00
        $schedule->command('hr:calculate-monthly-payroll')->monthlyOn(1, '08:00');

        // Tính thưởng từ dự án mỗi ngày lúc 22:00
        $schedule->command('hr:calculate-project-bonuses')->dailyAt('22:00');

        // Gửi reminders mỗi giờ
        $schedule->command('reminders:send')->hourly();

        // Kiểm tra hiệu suất dự án mỗi 6 giờ
        $schedule->command('projects:check-performance')->everySixHours();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands()
    {
        $this->load(__DIR__ . '/Commands');

        require base_path('routes/console.php');
    }
}
