<?php

namespace App\Services;

use App\Models\Project;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class FinancialCalculationService
{
    public function calculateRevenue(Project $project, ?Carbon $startDate = null, ?Carbon $endDate = null): array
    {
        $contract = $project->contract;
        $contractValue = $contract && $contract->status === 'approved'
            ? $contract->contract_value
            : 0;

        // Doanh thu phát sinh (từ additional_costs table)
        // Đây là phần khách hàng trả thêm
        $additionalRevenueQuery = $project->additionalCosts()
            ->whereIn('status', ['approved', 'confirmed', 'customer_paid']);
        
        if ($startDate && $endDate) {
            $additionalRevenueQuery->whereBetween('created_at', [$startDate, $endDate]);
        }
        $additionalRevenue = $additionalRevenueQuery->sum('amount');

        // Doanh thu từ thanh toán đã xác nhận (đã thực thu)
        $paidPaymentsQuery = $project->payments()
            ->whereIn('status', ['paid', 'confirmed', 'customer_paid']);
        
        if ($startDate && $endDate) {
            $paidPaymentsQuery->whereBetween('paid_date', [$startDate, $endDate]);
        }
        
        $paidPayments = $paidPaymentsQuery->sum('amount');

        // Tổng doanh thu = Giá trị hợp đồng + Phát sinh
        $totalRevenue = $contractValue + $additionalRevenue;

        return [
            'contract_value' => (float) $contractValue,
            'additional_costs' => (float) $additionalRevenue,
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

        // Chi phí nhà thầu phụ - Ưu tiên từ Cost records
        $subcontractorCostsQuery = $project->costs()
            ->whereNotNull('subcontractor_id')
            ->where('status', 'approved');
        if ($startDate && $endDate) {
            $subcontractorCostsQuery->whereBetween('cost_date', [$startDate, $endDate]);
        }
        $subcontractorCostsFromCosts = $subcontractorCostsQuery->sum('amount');

        // Nếu chưa có Cost record, tính từ total_quote (fallback)
        $subcontractorCostsFromQuote = $project->subcontractors()->sum('total_quote');
        
        $subcontractorCosts = $subcontractorCostsFromCosts > 0 
            ? $subcontractorCostsFromCosts 
            : $subcontractorCostsFromQuote;

        // Chi phí lương/payroll
        $payrollCostsQuery = $project->costs()
            ->whereNotNull('payroll_id')
            ->where('status', 'approved');
        if ($startDate && $endDate) {
            $payrollCostsQuery->whereBetween('cost_date', [$startDate, $endDate]);
        }
        $payrollCosts = $payrollCostsQuery->sum('amount');

        // Chi phí khác từ Cost (Vật liệu, Thiết bị, Vận chuyển, v.v.)
        $otherCostsQuery = $project->costs()
            ->whereNull('payroll_id')
            ->whereNull('subcontractor_id')
            ->where('status', 'approved');
        if ($startDate && $endDate) {
            $otherCostsQuery->whereBetween('cost_date', [$startDate, $endDate]);
        }
        $otherCosts = $otherCostsQuery->sum('amount');

        // Tổng chi phí công trình (Subcontractor + Other costs)
        // Lưu ý: Payroll được tính riêng (là chi phí công ty)
        $totalCosts = $subcontractorCosts + $otherCosts;

        $result = [
            'subcontractor_costs' => (float) $subcontractorCosts,
            'payroll_costs' => (float) $payrollCosts,
            'other_costs' => (float) $otherCosts,
            'total_costs' => (float) $totalCosts,
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
        $revenueData = $this->calculateRevenue($project, $startDate, $endDate);
        $costsData = $this->calculateTotalCosts($project, $startDate, $endDate);
        
        $totalRevenue = $revenueData['total_revenue'];
        $totalCosts = $costsData['total_costs'];

        // Lợi nhuận = Doanh thu - Chi phí
        $profit = $totalRevenue - $totalCosts;
        $profitMargin = $totalRevenue > 0
            ? ($profit / $totalRevenue) * 100
            : 0;

        return [
            'revenue' => (float) $totalRevenue,
            'total_costs' => (float) $totalCosts,
            'cost_breakdown' => [
                'subcontractor_costs' => $costsData['subcontractor_costs'],
                'payroll_costs' => $costsData['payroll_costs'],
                'other_costs' => $costsData['other_costs'],
            ],
            'profit' => (float) $profit,
            'profit_margin' => round($profitMargin, 2),
            'total_paid' => (float) $revenueData['paid_payments'],
            'remaining' => (float) ($totalRevenue - $revenueData['paid_payments']),
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

        // Payroll costs check removed - HR module deleted
        // Only check costs from costs table with payroll_id
        $payrollCostsFromCosts = $project->costs()
            ->whereNotNull('payroll_id')
            ->where('status', 'approved')
            ->sum('amount');

        // Payroll double counting check removed - HR module deleted
        // No longer needed since payrolls() relationship doesn't exist



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

