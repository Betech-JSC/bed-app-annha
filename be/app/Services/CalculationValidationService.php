<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Payroll;
use App\Models\Cost;
use Illuminate\Support\Facades\Log;

class CalculationValidationService
{
    /**
     * Kiểm tra tính toán chi phí dự án
     * 
     * @param Project $project
     * @return array
     */
    public function validateCostCalculation(Project $project): array
    {
        $errors = [];
        $warnings = [];

        // 1. Kiểm tra double counting Payroll
        $payrollCosts = $project->payrolls()
            ->where('status', 'approved')
            ->sum('net_salary');
        
        $payrollCostsFromCosts = $project->costs()
            ->whereNotNull('payroll_id')
            ->where('status', 'approved')
            ->sum('amount');

        if ($payrollCostsFromCosts > 0 && $payrollCosts > 0) {
            // Kiểm tra xem có Payroll nào đã tạo Cost chưa
            $payrollsWithCosts = $project->payrolls()
                ->where('status', 'approved')
                ->whereHas('costs')
                ->count();
            
            $payrollsWithoutCosts = $project->payrolls()
                ->where('status', 'approved')
                ->whereDoesntHave('costs')
                ->count();

            if ($payrollsWithCosts > 0 && $payrollsWithoutCosts > 0) {
                $warnings[] = [
                    'type' => 'mixed_payroll_counting',
                    'message' => 'Một số Payroll đã tạo Cost record, một số chưa. Cần kiểm tra logic tính toán.',
                    'payrolls_with_costs' => $payrollsWithCosts,
                    'payrolls_without_costs' => $payrollsWithoutCosts,
                ];
            }
        }

        // 2. Kiểm tra double counting TimeTracking
        $timeTrackingCount = $project->timeTrackings()
            ->where('status', 'approved')
            ->count();
        
        $timeTrackingCostsCount = $project->costs()
            ->whereNotNull('time_tracking_id')
            ->where('status', 'approved')
            ->count();

        if ($timeTrackingCount > 0 && $timeTrackingCostsCount < $timeTrackingCount) {
            $missingCount = $timeTrackingCount - $timeTrackingCostsCount;
            $warnings[] = [
                'type' => 'missing_time_tracking_costs',
                'message' => "Có {$missingCount} TimeTracking records chưa có Cost record tương ứng.",
                'time_tracking_count' => $timeTrackingCount,
                'cost_records_count' => $timeTrackingCostsCount,
                'missing_count' => $missingCount,
            ];
        }

        // 3. Kiểm tra tính nhất quán: Tổng chi phí từ các nguồn
        $totalCostsFromSources = 
            $project->additionalCosts()->where('status', 'approved')->sum('amount') +
            $project->subcontractors()->sum('total_quote') +
            $project->bonuses()->where('status', 'approved')->sum('amount') +
            $project->costs()
                ->where('status', 'approved')
                ->where(function ($q) {
                    $q->whereNotNull('time_tracking_id')
                        ->orWhereNotNull('payroll_id')
                        ->orWhere(function ($q2) {
                            $q2->whereNull('time_tracking_id')
                                ->whereNull('payroll_id');
                        });
                })
                ->sum('amount');

        $totalCostsFromCostsTable = $project->costs()
            ->where('status', 'approved')
            ->sum('amount');

        // Cho phép sai số nhỏ do làm tròn
        $difference = abs($totalCostsFromSources - $totalCostsFromCostsTable);
        if ($difference > 1000) { // Cho phép sai số 1000 VNĐ
            $warnings[] = [
                'type' => 'cost_calculation_mismatch',
                'message' => 'Tổng chi phí từ các nguồn không khớp với tổng Cost records.',
                'total_from_sources' => $totalCostsFromSources,
                'total_from_costs_table' => $totalCostsFromCostsTable,
                'difference' => $difference,
            ];
        }

        return [
            'is_valid' => count($errors) === 0,
            'errors' => $errors,
            'warnings' => $warnings,
        ];
    }

    /**
     * Kiểm tra tính toán doanh thu
     * 
     * @param Project $project
     * @return array
     */
    public function validateRevenueCalculation(Project $project): array
    {
        $errors = [];
        $warnings = [];

        $contract = $project->contract;
        if (!$contract || $contract->status !== 'approved') {
            return [
                'is_valid' => true,
                'errors' => [],
                'warnings' => [
                    [
                        'type' => 'no_approved_contract',
                        'message' => 'Dự án chưa có hợp đồng được duyệt.',
                    ],
                ],
            ];
        }

        // Kiểm tra: Doanh thu từ contract = tổng payment schedule
        $totalPaymentSchedule = $project->payments()->sum('amount');
        $contractValue = $contract->contract_value;
        
        $difference = abs($totalPaymentSchedule - $contractValue);
        if ($difference > 0.01) {
            $warnings[] = [
                'type' => 'payment_schedule_mismatch',
                'message' => 'Tổng payment schedule không khớp với giá trị hợp đồng.',
                'contract_value' => $contractValue,
                'total_payment_schedule' => $totalPaymentSchedule,
                'difference' => $difference,
            ];
        }

        // Kiểm tra: Tổng thanh toán đã trả <= Tổng payment schedule
        $totalPaid = $project->payments()->where('status', 'paid')->sum('amount');
        if ($totalPaid > $totalPaymentSchedule + 0.01) {
            $errors[] = [
                'type' => 'over_payment',
                'message' => 'Tổng thanh toán đã trả vượt quá tổng payment schedule.',
                'total_paid' => $totalPaid,
                'total_payment_schedule' => $totalPaymentSchedule,
            ];
        }

        return [
            'is_valid' => count($errors) === 0,
            'errors' => $errors,
            'warnings' => $warnings,
        ];
    }

    /**
     * Kiểm tra tính toán lương
     * 
     * @param Payroll $payroll
     * @return array
     */
    public function validatePayrollCalculation(Payroll $payroll): array
    {
        $errors = [];
        $warnings = [];

        // Kiểm tra: Net salary = Gross - Insurance - Tax - Deductions
        $calculatedNet = $payroll->gross_salary 
            - ($payroll->social_insurance_amount ?? 0)
            - ($payroll->health_insurance_amount ?? 0)
            - ($payroll->unemployment_insurance_amount ?? 0)
            - ($payroll->tax ?? 0)
            - ($payroll->deductions ?? 0);

        $difference = abs($calculatedNet - $payroll->net_salary);
        if ($difference > 0.01) {
            $errors[] = [
                'type' => 'net_salary_mismatch',
                'message' => 'Net salary không khớp với công thức tính toán.',
                'calculated_net' => $calculatedNet,
                'stored_net' => $payroll->net_salary,
                'difference' => $difference,
            ];
        }

        // Kiểm tra: Taxable income = Gross - Insurance
        $calculatedTaxable = $payroll->gross_salary 
            - ($payroll->social_insurance_amount ?? 0)
            - ($payroll->health_insurance_amount ?? 0)
            - ($payroll->unemployment_insurance_amount ?? 0);

        $difference = abs($calculatedTaxable - ($payroll->taxable_income ?? 0));
        if ($difference > 0.01) {
            $warnings[] = [
                'type' => 'taxable_income_mismatch',
                'message' => 'Taxable income không khớp với công thức tính toán.',
                'calculated_taxable' => $calculatedTaxable,
                'stored_taxable' => $payroll->taxable_income,
                'difference' => $difference,
            ];
        }

        // Kiểm tra: Gross salary >= 0
        if ($payroll->gross_salary < 0) {
            $errors[] = [
                'type' => 'negative_gross_salary',
                'message' => 'Gross salary không được âm.',
                'gross_salary' => $payroll->gross_salary,
            ];
        }

        // Kiểm tra: Net salary >= 0
        if ($payroll->net_salary < 0) {
            $warnings[] = [
                'type' => 'negative_net_salary',
                'message' => 'Net salary là số âm (có thể do khấu trừ quá nhiều).',
                'net_salary' => $payroll->net_salary,
            ];
        }

        return [
            'is_valid' => count($errors) === 0,
            'errors' => $errors,
            'warnings' => $warnings,
        ];
    }
}

