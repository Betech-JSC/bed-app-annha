<?php

namespace App\Services;

use App\Models\User;
use App\Models\Payroll;
use App\Models\TimeTracking;
use App\Models\EmployeeSalaryConfig;
use App\Models\Bonus;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PayrollCalculationService
{
    /**
     * Tính lương cho user trong kỳ
     */
    public function calculatePayroll(User $user, Carbon $periodStart, Carbon $periodEnd, string $periodType): Payroll
    {
        // Get current salary config
        $config = EmployeeSalaryConfig::forUser($user->id)
            ->current()
            ->first();

        if (!$config) {
            throw new \Exception("User {$user->id} chưa có cấu hình lương.");
        }

        // Get time tracking records for the period
        $timeTrackings = TimeTracking::forUser($user->id)
            ->approved()
            ->byDateRange($periodStart, $periodEnd)
            ->get();

        // Calculate base salary
        $baseSalary = $this->calculateBaseSalary($config, $timeTrackings, $periodStart, $periodEnd, $periodType);

        // Calculate overtime
        $overtimeData = $this->calculateOvertime($config, $timeTrackings);

        // Get bonuses for the period
        $bonusAmount = Bonus::forUser($user->id)
            ->where('status', 'approved')
            ->where(function ($q) use ($periodStart, $periodEnd) {
                $q->whereNull('period_start')
                    ->orWhere(function ($q2) use ($periodStart, $periodEnd) {
                        $q2->whereBetween('period_start', [$periodStart, $periodEnd])
                            ->orWhereBetween('period_end', [$periodStart, $periodEnd]);
                    });
            })
            ->sum('amount');

        // Calculate gross salary
        $grossSalary = $baseSalary + $overtimeData['overtime_amount'] + $bonusAmount;

        // Apply tax (simplified - 10% for now)
        $tax = $this->applyTax($grossSalary);

        // Calculate net salary
        $netSalary = $grossSalary - $tax;

        // Create or update payroll
        $payroll = Payroll::updateOrCreate(
            [
                'user_id' => $user->id,
                'period_type' => $periodType,
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodEnd->toDateString(),
            ],
            [
                'base_salary' => $baseSalary,
                'total_hours' => $timeTrackings->sum('total_hours'),
                'overtime_hours' => $overtimeData['overtime_hours'],
                'overtime_rate' => $overtimeData['overtime_rate'],
                'bonus_amount' => $bonusAmount,
                'deductions' => 0, // Can be extended
                'gross_salary' => $grossSalary,
                'tax' => $tax,
                'net_salary' => $netSalary,
                'status' => 'calculated',
                'calculated_at' => now(),
            ]
        );

        return $payroll;
    }

    /**
     * Tính lương cơ bản
     */
    protected function calculateBaseSalary(
        EmployeeSalaryConfig $config,
        $timeTrackings,
        Carbon $periodStart,
        Carbon $periodEnd,
        string $periodType
    ): float {
        switch ($config->salary_type) {
            case 'hourly':
                $totalHours = $timeTrackings->sum('total_hours');
                return $totalHours * ($config->hourly_rate ?? 0);

            case 'daily':
                $workDays = $timeTrackings->groupBy(function ($tracking) {
                    return $tracking->check_in_at->format('Y-m-d');
                })->count();
                return $workDays * ($config->daily_rate ?? 0);

            case 'monthly':
                // Monthly salary is fixed
                return $config->monthly_salary ?? 0;

            case 'project_based':
                // For project-based, we need to count projects worked on
                $projectCount = $timeTrackings->pluck('project_id')->unique()->count();
                return $projectCount * ($config->project_rate ?? 0);

            default:
                return 0;
        }
    }

    /**
     * Tính overtime
     */
    protected function calculateOvertime(EmployeeSalaryConfig $config, $timeTrackings): array
    {
        $overtimeHours = 0;
        $overtimeRate = 0;

        // Overtime is hours > 8 per day
        foreach ($timeTrackings as $tracking) {
            $hours = $tracking->total_hours ?? 0;
            if ($hours > 8) {
                $overtimeHours += ($hours - 8);
            }
        }

        // Overtime rate is 1.5x hourly rate
        if ($config->salary_type === 'hourly' && $config->hourly_rate) {
            $overtimeRate = $config->hourly_rate * 1.5;
        } elseif ($config->salary_type === 'daily' && $config->daily_rate) {
            // For daily rate, calculate hourly equivalent
            $hourlyRate = $config->daily_rate / 8;
            $overtimeRate = $hourlyRate * 1.5;
        }

        $overtimeAmount = $overtimeHours * $overtimeRate;

        return [
            'overtime_hours' => $overtimeHours,
            'overtime_rate' => $overtimeRate,
            'overtime_amount' => $overtimeAmount,
        ];
    }

    /**
     * Tính thuế
     */
    protected function applyTax(float $grossSalary): float
    {
        // Simplified tax calculation - 10% for now
        // Can be extended with tax brackets
        return round($grossSalary * 0.1, 2);
    }

    /**
     * Tính lương thực nhận
     */
    public function calculateNetSalary(float $grossSalary, float $tax, float $deductions = 0): float
    {
        return $grossSalary - $tax - $deductions;
    }
}
