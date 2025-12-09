<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\PayrollCalculationService;
use Illuminate\Console\Command;
use Carbon\Carbon;

class CalculateMonthlyPayrollCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hr:calculate-monthly-payroll {--month= : Tháng cần tính (YYYY-MM), mặc định là tháng trước}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Tự động tính lương hàng tháng cho tất cả nhân viên';

    /**
     * Execute the console command.
     */
    public function handle(PayrollCalculationService $service): int
    {
        $month = $this->option('month');

        if ($month) {
            $periodStart = Carbon::parse($month . '-01');
        } else {
            // Default to previous month
            $periodStart = Carbon::now()->subMonth()->startOfMonth();
        }

        $periodEnd = $periodStart->copy()->endOfMonth();

        $this->info("Đang tính lương cho tháng {$periodStart->format('m/Y')}...");

        $users = User::all();
        $calculated = 0;
        $errors = 0;

        foreach ($users as $user) {
            try {
                $payroll = $service->calculatePayroll(
                    $user,
                    $periodStart,
                    $periodEnd,
                    'monthly'
                );
                $calculated++;
                $this->line("  ✓ {$user->name}: {$payroll->net_salary} VND");
            } catch (\Exception $e) {
                $errors++;
                $this->error("  ✗ {$user->name}: {$e->getMessage()}");
            }
        }

        $this->info("Hoàn thành! Đã tính lương cho {$calculated} nhân viên.");
        if ($errors > 0) {
            $this->warn("Có {$errors} lỗi xảy ra.");
        }

        return Command::SUCCESS;
    }
}
