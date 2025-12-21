<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Payroll;
use App\Models\EmployeeSalaryConfig;
use App\Models\TimeTracking;
use App\Models\Bonus;
use App\Models\Project;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class PayrollSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Tạo dữ liệu mẫu cho module bảng lương
     */
    public function run(): void
    {
        $this->command->info('Đang tạo dữ liệu mẫu cho module bảng lương...');

        // Lấy các employees (users có role employee hoặc không phải admin)
        $employees = User::whereHas('roles', function ($query) {
            $query->whereIn('name', ['employee', 'worker', 'staff']);
        })->orWhereDoesntHave('roles', function ($query) {
            $query->whereIn('name', ['admin', 'super_admin', 'hr_admin']);
        })->limit(10)->get();

        if ($employees->isEmpty()) {
            // Nếu không có employees, lấy một số users bất kỳ
            $employees = User::where('email', '!=', 'superadmin@skysend.com')
                ->where('email', '!=', 'hradmin@skysend.com')
                ->limit(5)
                ->get();
        }

        if ($employees->isEmpty()) {
            $this->command->warn('Không tìm thấy nhân viên nào. Vui lòng tạo users trước.');
            return;
        }

        $this->command->info("Tìm thấy {$employees->count()} nhân viên. Đang tạo dữ liệu mẫu...");

        // Lấy projects để gán cho time tracking
        $projects = Project::all();

        // Tạo salary config và payroll cho mỗi employee
        foreach ($employees as $index => $employee) {
            $this->command->info("Đang tạo dữ liệu cho nhân viên: {$employee->name} ({$employee->email})");

            // 1. Tạo Employee Salary Config
            $salaryType = ['hourly', 'daily', 'monthly'][$index % 3];
            $salaryConfig = EmployeeSalaryConfig::firstOrCreate(
                [
                    'user_id' => $employee->id,
                    'effective_from' => now()->subMonths(3)->startOfMonth(),
                ],
                [
                    'user_id' => $employee->id,
                    'salary_type' => $salaryType,
                    'hourly_rate' => $salaryType === 'hourly' ? rand(50000, 100000) : null,
                    'daily_rate' => $salaryType === 'daily' ? rand(400000, 800000) : null,
                    'monthly_salary' => $salaryType === 'monthly' ? rand(8000000, 15000000) : null,
                    'project_rate' => null,
                    'overtime_rate' => rand(75000, 150000),
                    'effective_from' => now()->subMonths(3)->startOfMonth(),
                    'effective_to' => null,
                ]
            );

            // 2. Tạo Time Tracking records cho 3 tháng gần đây
            for ($monthOffset = 2; $monthOffset >= 0; $monthOffset--) {
                $monthStart = now()->subMonths($monthOffset)->startOfMonth();
                $monthEnd = now()->subMonths($monthOffset)->endOfMonth();
                
                // Tạo 15-20 ngày chấm công trong tháng
                $workDays = rand(15, 20);
                $dates = $this->generateRandomDates($monthStart, $monthEnd, $workDays);

                foreach ($dates as $date) {
                    $checkIn = Carbon::parse($date)->setTime(rand(7, 8), rand(0, 30), 0);
                    $checkOut = Carbon::parse($date)->setTime(rand(17, 18), rand(0, 30), 0);
                    
                    // Một số ngày có tăng ca (check out sau 17:30)
                    if (rand(1, 10) <= 3) {
                        $checkOut = Carbon::parse($date)->setTime(rand(18, 20), rand(0, 30), 0);
                    }

                    $project = $projects->random();
                    
                    TimeTracking::firstOrCreate(
                        [
                            'user_id' => $employee->id,
                            'check_in_at' => $checkIn,
                        ],
                        [
                            'user_id' => $employee->id,
                            'project_id' => $project->id,
                            'check_in_at' => $checkIn,
                            'check_out_at' => $checkOut,
                            'total_hours' => $checkIn->diffInHours($checkOut, true),
                            'status' => 'approved',
                            'approved_by' => 1, // Admin
                            'approved_at' => $checkOut->copy()->addHours(1),
                        ]
                    );
                }
            }

            // 3. Tạo Bonus records (một số tháng có thưởng)
            for ($monthOffset = 2; $monthOffset >= 0; $monthOffset--) {
                if (rand(1, 10) <= 4) { // 40% cơ hội có thưởng
                    $monthStart = now()->subMonths($monthOffset)->startOfMonth();
                    $monthEnd = now()->subMonths($monthOffset)->endOfMonth();
                    
                    Bonus::firstOrCreate(
                        [
                            'user_id' => $employee->id,
                            'period_start' => $monthStart,
                            'period_end' => $monthEnd,
                        ],
                        [
                            'user_id' => $employee->id,
                            'project_id' => $projects->random()->id,
                            'bonus_type' => ['performance', 'project_completion', 'manual'][rand(0, 2)],
                            'amount' => rand(500000, 2000000),
                            'calculation_method' => 'manual',
                            'period_start' => $monthStart,
                            'period_end' => $monthEnd,
                            'description' => 'Thưởng hiệu suất làm việc',
                            'status' => 'approved',
                            'approved_by' => 1,
                            'approved_at' => $monthEnd->copy()->addDays(1),
                        ]
                    );
                }
            }

            // 4. Tạo Payroll records cho 3 tháng gần đây
            for ($monthOffset = 2; $monthOffset >= 0; $monthOffset--) {
                $monthStart = now()->subMonths($monthOffset)->startOfMonth();
                $monthEnd = now()->subMonths($monthOffset)->endOfMonth();
                
                // Tính toán các giá trị
                $timeTrackings = TimeTracking::where('user_id', $employee->id)
                    ->whereBetween('check_in_at', [$monthStart, $monthEnd->endOfDay()])
                    ->where('status', 'approved')
                    ->get();

                $totalHours = $timeTrackings->sum('total_hours');
                $overtimeHours = $this->calculateOvertimeHours($timeTrackings);
                
                // Tính base salary
                $baseSalary = 0;
                if ($salaryType === 'hourly') {
                    $baseSalary = $totalHours * ($salaryConfig->hourly_rate ?? 0);
                } elseif ($salaryType === 'daily') {
                    $workDays = $timeTrackings->groupBy(function ($tracking) {
                        return $tracking->check_in_at->format('Y-m-d');
                    })->count();
                    $baseSalary = $workDays * ($salaryConfig->daily_rate ?? 0);
                } elseif ($salaryType === 'monthly') {
                    $baseSalary = $salaryConfig->monthly_salary ?? 0;
                }

                // Tính overtime amount
                $overtimeRate = $salaryConfig->overtime_rate ?? 0;
                $overtimeAmount = $overtimeHours * $overtimeRate;

                // Tính bonus
                $bonusAmount = Bonus::where('user_id', $employee->id)
                    ->where('status', 'approved')
                    ->whereBetween('period_start', [$monthStart, $monthEnd])
                    ->orWhereBetween('period_end', [$monthStart, $monthEnd])
                    ->sum('amount');

                // Tính gross salary
                $grossSalary = $baseSalary + $overtimeAmount + $bonusAmount;

                // Tính tax (10%)
                $tax = $grossSalary * 0.1;

                // Tính net salary
                $netSalary = $grossSalary - $tax;

                // Chọn status ngẫu nhiên
                $statuses = ['calculated', 'approved', 'paid'];
                $status = $statuses[rand(0, 2)];
                
                $calculatedAt = $monthEnd->copy()->addDays(1);
                $approvedAt = $status === 'approved' || $status === 'paid' 
                    ? $calculatedAt->copy()->addDays(rand(1, 3)) 
                    : null;
                $paidAt = $status === 'paid' 
                    ? $approvedAt->copy()->addDays(rand(1, 5)) 
                    : null;

                Payroll::firstOrCreate(
                    [
                        'user_id' => $employee->id,
                        'period_type' => 'monthly',
                        'period_start' => $monthStart,
                        'period_end' => $monthEnd,
                    ],
                    [
                        'user_id' => $employee->id,
                        'period_type' => 'monthly',
                        'period_start' => $monthStart,
                        'period_end' => $monthEnd,
                        'base_salary' => round($baseSalary, 2),
                        'total_hours' => round($totalHours, 2),
                        'overtime_hours' => round($overtimeHours, 2),
                        'overtime_rate' => round($overtimeRate, 2),
                        'bonus_amount' => round($bonusAmount, 2),
                        'deductions' => 0,
                        'gross_salary' => round($grossSalary, 2),
                        'tax' => round($tax, 2),
                        'net_salary' => round($netSalary, 2),
                        'status' => $status,
                        'calculated_at' => $calculatedAt,
                        'approved_by' => $status === 'approved' || $status === 'paid' ? 1 : null,
                        'approved_at' => $approvedAt,
                        'paid_at' => $paidAt,
                        'notes' => $monthOffset === 0 ? 'Bảng lương tháng hiện tại' : null,
                    ]
                );
            }

            // 5. Tạo thêm một số payroll ở trạng thái draft (chưa tính)
            if (rand(1, 10) <= 3) {
                $nextMonthStart = now()->addMonth()->startOfMonth();
                $nextMonthEnd = now()->addMonth()->endOfMonth();
                
                Payroll::firstOrCreate(
                    [
                        'user_id' => $employee->id,
                        'period_type' => 'monthly',
                        'period_start' => $nextMonthStart,
                        'period_end' => $nextMonthEnd,
                    ],
                    [
                        'user_id' => $employee->id,
                        'period_type' => 'monthly',
                        'period_start' => $nextMonthStart,
                        'period_end' => $nextMonthEnd,
                        'base_salary' => 0,
                        'total_hours' => 0,
                        'overtime_hours' => 0,
                        'overtime_rate' => 0,
                        'bonus_amount' => 0,
                        'deductions' => 0,
                        'gross_salary' => 0,
                        'tax' => 0,
                        'net_salary' => 0,
                        'status' => 'draft',
                        'notes' => 'Bảng lương chưa được tính toán',
                    ]
                );
            }
        }

        $this->command->info('Đã tạo dữ liệu mẫu cho module bảng lương thành công!');
        $this->command->info("Tổng số payroll records: " . Payroll::count());
    }

    /**
     * Generate random dates within a month
     */
    private function generateRandomDates(Carbon $start, Carbon $end, int $count): array
    {
        $dates = [];
        $current = $start->copy();
        
        while ($current <= $end && count($dates) < $count) {
            // Skip weekends (optional - có thể bỏ qua)
            if ($current->dayOfWeek !== Carbon::SATURDAY && $current->dayOfWeek !== Carbon::SUNDAY) {
                if (rand(1, 10) <= 7) { // 70% cơ hội có ngày làm việc
                    $dates[] = $current->copy()->toDateString();
                }
            }
            $current->addDay();
        }

        // Nếu chưa đủ số ngày, thêm ngẫu nhiên
        while (count($dates) < $count) {
            $randomDate = Carbon::createFromDate(
                $start->year,
                $start->month,
                rand(1, $end->day)
            );
            if (!in_array($randomDate->toDateString(), $dates)) {
                $dates[] = $randomDate->toDateString();
            }
        }

        return $dates;
    }

    /**
     * Calculate overtime hours from time trackings
     */
    private function calculateOvertimeHours($timeTrackings): float
    {
        $totalOvertime = 0;

        foreach ($timeTrackings as $tracking) {
            if (!$tracking->check_in_at || !$tracking->check_out_at) {
                continue;
            }

            $checkIn = $tracking->check_in_at instanceof Carbon 
                ? $tracking->check_in_at->copy() 
                : Carbon::parse($tracking->check_in_at);
            $checkOut = $tracking->check_out_at instanceof Carbon 
                ? $tracking->check_out_at->copy() 
                : Carbon::parse($tracking->check_out_at);

            $workStart = $checkIn->copy()->setTime(7, 30, 0);
            $workEnd = $checkIn->copy()->setTime(17, 30, 0);

            $overtimeHours = 0;

            // Calculate hours before 7:30 AM
            if ($checkIn->lt($workStart)) {
                $overtimeStart = $checkIn->copy();
                $overtimeEnd = $checkOut->lt($workStart) ? $checkOut->copy() : $workStart->copy();
                $overtimeHours += $overtimeStart->diffInMinutes($overtimeEnd) / 60;
            }

            // Calculate hours after 5:30 PM
            if ($checkOut->gt($workEnd)) {
                $overtimeStart = $checkIn->gt($workEnd) ? $checkIn->copy() : $workEnd->copy();
                $overtimeEnd = $checkOut->copy();
                $overtimeHours += $overtimeStart->diffInMinutes($overtimeEnd) / 60;
            }

            $totalOvertime += $overtimeHours;
        }

        return round($totalOvertime, 2);
    }
}

