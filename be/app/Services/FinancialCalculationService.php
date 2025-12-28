<?php

namespace App\Services;

use App\Models\Project;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class FinancialCalculationService
{
    /**
     * Tính doanh thu của dự án
     * 
     * @param Project $project
     * @param Carbon|null $startDate
     * @param Carbon|null $endDate
     * @return array
     */
    public function calculateRevenue(Project $project, ?Carbon $startDate = null, ?Carbon $endDate = null): array
    {
        $contract = $project->contract;
        $contractValue = $contract && $contract->status === 'approved'
            ? $contract->contract_value
            : 0;

        // Doanh thu từ thanh toán đã xác nhận
        $paidPaymentsQuery = $project->payments()->where('status', 'paid');
        
        if ($startDate && $endDate) {
            $paidPaymentsQuery->whereBetween('paid_date', [$startDate, $endDate]);
        }
        
        $paidPayments = $paidPaymentsQuery->sum('amount');

        // Tổng doanh thu (theo contract value hoặc paid payments)
        $totalRevenue = $contractValue;

        return [
            'contract_value' => (float) $contractValue,
            'paid_payments' => (float) $paidPayments,
            'total_revenue' => (float) $totalRevenue,
        ];
    }

    /**
     * Tính tổng chi phí dự án
     * 
     * @param Project $project
     * @param Carbon|null $startDate
     * @param Carbon|null $endDate
     * @return array
     */
    public function calculateTotalCosts(Project $project, ?Carbon $startDate = null, ?Carbon $endDate = null): array
    {
        Log::info("Calculating total costs for project {$project->id}", [
            'project_id' => $project->id,
            'start_date' => $startDate?->toDateString(),
            'end_date' => $endDate?->toDateString(),
        ]);

        $contractValue = $project->contract?->contract_value ?? 0;

        // Chi phí phát sinh
        $additionalCostsQuery = $project->additionalCosts()->where('status', 'approved');
        if ($startDate && $endDate) {
            $additionalCostsQuery->whereBetween('created_at', [$startDate, $endDate]);
        }
        $additionalCosts = $additionalCostsQuery->sum('amount');

        // Chi phí nhà thầu phụ - Ưu tiên từ Cost records (nếu đã tạo Cost)
        $subcontractorCostsFromCostsQuery = $project->costs()
            ->whereNotNull('subcontractor_id')
            ->where('status', 'approved');
        if ($startDate && $endDate) {
            $subcontractorCostsFromCostsQuery->whereBetween('cost_date', [$startDate, $endDate]);
        }
        $subcontractorCostsFromCosts = $subcontractorCostsFromCostsQuery->sum('amount');

        // Nếu chưa có Cost record, tính từ total_quote (backward compatible)
        $subcontractorCostsFromQuote = $project->subcontractors()->sum('total_quote');
        
        // Ưu tiên Cost records, nếu không có thì dùng quote
        $subcontractorCosts = $subcontractorCostsFromCosts > 0 
            ? $subcontractorCostsFromCosts 
            : $subcontractorCostsFromQuote;

        // Chi phí nhân công từ Payroll (đã approved)
        $payrollCostsQuery = $project->payrolls()->where('status', 'approved');
        if ($startDate && $endDate) {
            $payrollCostsQuery->whereBetween('period_end', [$startDate, $endDate]);
        }
        $payrollCosts = $payrollCostsQuery->sum('net_salary');

        // Chi phí nhân công từ TimeTracking (đã tạo Cost record)
        $timeTrackingCostsQuery = $project->costs()
            ->whereNotNull('time_tracking_id')
            ->where('status', 'approved');
        if ($startDate && $endDate) {
            $timeTrackingCostsQuery->whereBetween('cost_date', [$startDate, $endDate]);
        }
        $timeTrackingCosts = $timeTrackingCostsQuery->sum('amount');

        // Chi phí từ Payroll đã tạo Cost record (tránh double counting)
        $payrollCostsFromCostsQuery = $project->costs()
            ->whereNotNull('payroll_id')
            ->where('status', 'approved');
        if ($startDate && $endDate) {
            $payrollCostsFromCostsQuery->whereBetween('cost_date', [$startDate, $endDate]);
        }
        $payrollCostsFromCosts = $payrollCostsFromCostsQuery->sum('amount');

        // Validation: Nếu Payroll đã tạo Cost, thì chỉ tính Cost, không tính Payroll nữa
        $actualPayrollCosts = $payrollCostsFromCosts > 0 
            ? $payrollCostsFromCosts 
            : $payrollCosts;

        // Log để track double counting
        if ($payrollCostsFromCosts > 0 && $payrollCosts > 0) {
            Log::warning("Potential double counting detected for payroll costs", [
                'project_id' => $project->id,
                'payroll_costs' => $payrollCosts,
                'payroll_costs_from_costs' => $payrollCostsFromCosts,
                'using' => 'payroll_costs_from_costs',
            ]);
        }

        // Thưởng từ Bonus (đã approved)
        $bonusCostsQuery = $project->bonuses()->where('status', 'approved');
        if ($startDate && $endDate) {
            $bonusCostsQuery->whereBetween('created_at', [$startDate, $endDate]);
        }
        $bonusCosts = $bonusCostsQuery->sum('amount');

        // Chi phí khác từ Cost (không phải từ Payroll hoặc TimeTracking)
        $otherCostsQuery = $project->costs()
            ->whereNull('time_tracking_id')
            ->whereNull('payroll_id')
            ->where('status', 'approved');
        if ($startDate && $endDate) {
            $otherCostsQuery->whereBetween('cost_date', [$startDate, $endDate]);
        }
        $otherCosts = $otherCostsQuery->sum('amount');

        // Tính tổng chi phí (không bao gồm contract_value vì đó là doanh thu)
        $totalCosts = $additionalCosts 
            + $subcontractorCosts 
            + $actualPayrollCosts 
            + $timeTrackingCosts 
            + $bonusCosts
            + $otherCosts;

        $result = [
            'contract_value' => $contractValue,
            'additional_costs' => $additionalCosts,
            'subcontractor_costs' => $subcontractorCosts,
            'payroll_costs' => $actualPayrollCosts,
            'time_tracking_costs' => $timeTrackingCosts,
            'bonus_costs' => $bonusCosts,
            'other_costs' => $otherCosts,
            'total' => $contractValue + $totalCosts, // Tổng bao gồm contract_value
            'total_costs' => $totalCosts, // Tổng chi phí không bao gồm contract_value
        ];

        Log::info("Total costs calculated for project {$project->id}", $result);

        return $result;
    }

    /**
     * Tính lợi nhuận dự án
     * 
     * @param Project $project
     * @param Carbon|null $startDate
     * @param Carbon|null $endDate
     * @return array
     */
    public function calculateProfit(Project $project, ?Carbon $startDate = null, ?Carbon $endDate = null): array
    {
        $revenue = $this->calculateRevenue($project, $startDate, $endDate);
        $costs = $this->calculateTotalCosts($project, $startDate, $endDate);
        
        $totalPaidQuery = $project->payments()->where('status', 'paid');
        if ($startDate && $endDate) {
            $totalPaidQuery->whereBetween('paid_date', [$startDate, $endDate]);
        }
        $totalPaid = $totalPaidQuery->sum('amount');

        // Tính tổng chi phí (không bao gồm contract_value vì đó là doanh thu)
        $totalCosts = $costs['additional_costs'] 
            + $costs['subcontractor_costs']
            + $costs['payroll_costs']
            + $costs['time_tracking_costs']
            + $costs['bonus_costs']
            + $costs['other_costs'];

        // Lợi nhuận = Doanh thu - Tổng chi phí
        $profit = $revenue['total_revenue'] - $totalCosts;
        $profitMargin = $revenue['total_revenue'] > 0
            ? ($profit / $revenue['total_revenue']) * 100
            : 0;

        return [
            'revenue' => $revenue['total_revenue'],
            'total_costs' => $totalCosts,
            'cost_breakdown' => [
                'additional_costs' => $costs['additional_costs'],
                'subcontractor_costs' => $costs['subcontractor_costs'],
                'payroll_costs' => $costs['payroll_costs'],
                'time_tracking_costs' => $costs['time_tracking_costs'],
                'bonus_costs' => $costs['bonus_costs'],
                'other_costs' => $costs['other_costs'],
            ],
            'profit' => $profit,
            'profit_margin' => round($profitMargin, 2),
            'total_paid' => $totalPaid,
            'remaining' => $revenue['total_revenue'] - $totalPaid,
        ];
    }

    /**
     * Kiểm tra tính nhất quán của tính toán
     * 
     * @param Project $project
     * @return array
     */
    public function validateCalculation(Project $project): array
    {
        $errors = [];
        $warnings = [];

        // Kiểm tra double counting Payroll
        $payrollCosts = $project->payrolls()
            ->where('status', 'approved')
            ->sum('net_salary');
        
        $payrollCostsFromCosts = $project->costs()
            ->whereNotNull('payroll_id')
            ->where('status', 'approved')
            ->sum('amount');

        if ($payrollCostsFromCosts > 0 && $payrollCosts > 0) {
            $warnings[] = [
                'type' => 'potential_double_counting',
                'message' => 'Payroll costs may be double counted. Both Payroll records and Cost records from Payroll exist.',
                'payroll_costs' => $payrollCosts,
                'payroll_costs_from_costs' => $payrollCostsFromCosts,
            ];
        }

        // Kiểm tra double counting TimeTracking
        $timeTrackingCount = $project->timeTrackings()
            ->where('status', 'approved')
            ->count();
        
        $timeTrackingCostsCount = $project->costs()
            ->whereNotNull('time_tracking_id')
            ->where('status', 'approved')
            ->count();

        if ($timeTrackingCount > 0 && $timeTrackingCostsCount < $timeTrackingCount) {
            $warnings[] = [
                'type' => 'missing_cost_records',
                'message' => 'Some TimeTracking records may not have corresponding Cost records.',
                'time_tracking_count' => $timeTrackingCount,
                'cost_records_count' => $timeTrackingCostsCount,
            ];
        }

        // Kiểm tra tính nhất quán: Doanh thu từ contract = tổng payment schedule
        $contract = $project->contract;
        if ($contract && $contract->status === 'approved') {
            $totalPaymentSchedule = $project->payments()->sum('amount');
            $contractValue = $contract->contract_value;
            
            if (abs($totalPaymentSchedule - $contractValue) > 0.01) {
                $warnings[] = [
                    'type' => 'payment_schedule_mismatch',
                    'message' => 'Total payment schedule does not match contract value.',
                    'contract_value' => $contractValue,
                    'total_payment_schedule' => $totalPaymentSchedule,
                    'difference' => abs($totalPaymentSchedule - $contractValue),
                ];
            }
        }

        return [
            'is_valid' => count($errors) === 0,
            'errors' => $errors,
            'warnings' => $warnings,
        ];
    }
}

