<?php

namespace App\Services;

use App\Models\User;
use App\Models\Payroll;
use App\Models\TimeTracking;
use App\Models\EmployeeSalaryConfig;
use App\Models\Bonus;
use App\Models\EmployeeProfile;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PayrollCalculationService
{
    protected $taxCalculationService;
    protected $socialInsuranceService;

    // Mức lương tối thiểu vùng (có thể cấu hình)
    const MINIMUM_SALARY_REGION_1 = 4680000; // Vùng I
    const MINIMUM_SALARY_REGION_2 = 4160000; // Vùng II
    const MINIMUM_SALARY_REGION_3 = 3640000; // Vùng III
    const MINIMUM_SALARY_REGION_4 = 3250000; // Vùng IV

    public function __construct(
        TaxCalculationService $taxCalculationService,
        SocialInsuranceService $socialInsuranceService
    ) {
        $this->taxCalculationService = $taxCalculationService;
        $this->socialInsuranceService = $socialInsuranceService;
    }
    /**
     * Tính lương cho user trong kỳ
     */
    public function calculatePayroll(User $user, Carbon $periodStart, Carbon $periodEnd, string $periodType, ?int $projectId = null): Payroll
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

        // Validation: mức lương >= mức lương tối thiểu vùng
        $minimumSalary = self::MINIMUM_SALARY_REGION_3; // Mặc định vùng III, có thể lấy từ config
        if ($grossSalary > 0 && $grossSalary < $minimumSalary) {
            Log::warning("Gross salary is below minimum wage", [
                'user_id' => $user->id,
                'gross_salary' => $grossSalary,
                'minimum_salary' => $minimumSalary,
            ]);
        }

        // Tính bảo hiểm (BHXH, BHYT, BHTN) - người lao động đóng
        $insuranceData = $this->socialInsuranceService->calculateSocialInsurance($grossSalary, false);
        $employeeInsuranceTotal = $insuranceData['employee']['total'];

        // Thu nhập chịu thuế = Gross - Bảo hiểm
        $taxableIncome = max(0, $grossSalary - $employeeInsuranceTotal);

        // Lấy số người phụ thuộc từ EmployeeProfile (nếu có)
        $dependentsCount = 0;
        $employeeProfile = EmployeeProfile::where('user_id', $user->id)->first();
        if ($employeeProfile && isset($employeeProfile->dependents_count)) {
            $dependentsCount = (int) $employeeProfile->dependents_count;
        }

        // Tính thuế TNCN
        $taxData = $this->taxCalculationService->calculateTax($taxableIncome, $dependentsCount);
        $tax = $taxData['tax'];

        // Calculate net salary = Gross - Bảo hiểm (employee) - Thuế - Khấu trừ
        $netSalary = $grossSalary - $employeeInsuranceTotal - $tax - ($deductions ?? 0);

        // Determine project_id
        // Priority: 1. Use provided project_id, 2. Use from time trackings if all same project, 3. null
        if ($projectId === null) {
            $projectIds = $timeTrackings->pluck('project_id')->filter()->unique();
            $projectId = $projectIds->count() === 1 ? $projectIds->first() : null;
        }

        // Create or update payroll
        $payroll = Payroll::updateOrCreate(
            [
                'user_id' => $user->id,
                'period_type' => $periodType,
                'period_start' => $periodStart->toDateString(),
                'period_end' => $periodEnd->toDateString(),
            ],
            [
                'project_id' => $projectId,
                'base_salary' => $baseSalary,
                'total_hours' => $timeTrackings->sum('total_hours'),
                'overtime_hours' => $overtimeData['overtime_hours'],
                'overtime_rate' => $overtimeData['overtime_rate'],
                'bonus_amount' => $bonusAmount,
                'deductions' => $deductions ?? 0,
                'gross_salary' => $grossSalary,
                'social_insurance_amount' => $insuranceData['employee']['social_insurance'],
                'health_insurance_amount' => $insuranceData['employee']['health_insurance'],
                'unemployment_insurance_amount' => $insuranceData['employee']['unemployment_insurance'],
                'taxable_income' => $taxData['taxable_income'],
                'personal_deduction' => $taxData['personal_deduction'],
                'dependent_deduction' => $taxData['dependent_deduction'],
                'dependents_count' => $dependentsCount,
                'tax' => $tax,
                'net_salary' => $netSalary,
                'status' => 'calculated',
                'calculated_at' => now(),
            ]
        );

        Log::info("Payroll calculated for user {$user->id}", [
            'user_id' => $user->id,
            'payroll_id' => $payroll->id,
            'gross_salary' => $grossSalary,
            'insurance_total' => $employeeInsuranceTotal,
            'tax' => $tax,
            'net_salary' => $netSalary,
        ]);

        // Validate calculation
        $validationService = app(\App\Services\CalculationValidationService::class);
        $validation = $validationService->validatePayrollCalculation($payroll);
        
        if (!empty($validation['warnings'])) {
            Log::warning("Payroll calculation warnings for payroll {$payroll->id}", [
                'payroll_id' => $payroll->id,
                'warnings' => $validation['warnings'],
            ]);
        }
        
        if (!empty($validation['errors'])) {
            Log::error("Payroll calculation errors for payroll {$payroll->id}", [
                'payroll_id' => $payroll->id,
                'errors' => $validation['errors'],
            ]);
            throw new \Exception("Payroll calculation validation failed: " . json_encode($validation['errors']));
        }

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
     * Overtime is calculated based on time windows:
     * - Hours before 7:30 AM = overtime
     * - Hours after 5:30 PM (17:30) = overtime
     */
    protected function calculateOvertime(EmployeeSalaryConfig $config, $timeTrackings): array
    {
        $overtimeHours = 0;
        $overtimeRate = 0;

        // Calculate overtime hours based on time windows for each tracking
        foreach ($timeTrackings as $tracking) {
            $overtimeData = $tracking->calculateOvertimeHours();
            $overtimeHours += $overtimeData['overtime_hours'];
        }

        // Determine overtime rate
        // Priority: 1. Use overtime_rate from config if set, 2. Fallback to hourly_rate or daily_rate/8
        if ($config->overtime_rate) {
            $overtimeRate = $config->overtime_rate;
        } elseif ($config->salary_type === 'hourly' && $config->hourly_rate) {
            $overtimeRate = $config->hourly_rate;
        } elseif ($config->salary_type === 'daily' && $config->daily_rate) {
            // For daily rate, calculate hourly equivalent
            $overtimeRate = $config->daily_rate / 8;
        }

        $overtimeAmount = $overtimeHours * $overtimeRate;

        return [
            'overtime_hours' => round($overtimeHours, 2),
            'overtime_rate' => $overtimeRate,
            'overtime_amount' => round($overtimeAmount, 2),
        ];
    }


    /**
     * Tính lương thực nhận
     */
    public function calculateNetSalary(float $grossSalary, float $tax, float $deductions = 0): float
    {
        return $grossSalary - $tax - $deductions;
    }
}
