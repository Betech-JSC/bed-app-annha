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
        
        $paidPayments = $paidPaymentsQuery->sum(\DB::raw('COALESCE(actual_amount, amount)'));

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

        // Chi phí nhà thầu phụ (Actual Cost) - CHỈ tính từ các payment đã được duyệt
        // Bỏ fallback quote để tránh double counting khi cộng dồn vào tổng chi phí dự án
        $subcontractorCostsQuery = $project->costs()
            ->whereNotNull('subcontractor_id')
            ->whereNotNull('subcontractor_payment_id') // Quan trọng: Chỉ lấy chi phí thực chi (từ payment)
            ->where('status', 'approved');
            
        if ($startDate && $endDate) {
            $subcontractorCostsQuery->whereBetween('cost_date', [$startDate, $endDate]);
        }
        $subcontractorCosts = (float) $subcontractorCostsQuery->sum('amount');

        // Chi phí cam kết (Committed Cost) - Từ tổng giá trị hợp đồng/báo giá
        $committedSubcontractorCosts = (float) $project->subcontractors()->sum('total_quote');

        // Chi phí lương/payroll
        $payrollCostsQuery = $project->costs()
            ->whereNotNull('payroll_id')
            ->where('status', 'approved');
        if ($startDate && $endDate) {
            $payrollCostsQuery->whereBetween('cost_date', [$startDate, $endDate]);
        }
        $payrollCosts = (float) $payrollCostsQuery->sum('amount');

        // Chi phí khác từ Cost (Vật liệu, Thiết bị, Vận chuyển, v.v.)
        $otherCostsQuery = $project->costs()
            ->whereNull('payroll_id')
            ->whereNull('subcontractor_id')
            ->where('status', 'approved');
        if ($startDate && $endDate) {
            $otherCostsQuery->whereBetween('cost_date', [$startDate, $endDate]);
        }
        $otherCosts = (float) $otherCostsQuery->sum('amount');

        // Tổng chi phí công trình thực tế (Actual Spent)
        $totalCosts = $subcontractorCosts + $payrollCosts + $otherCosts;

        $result = [
            'subcontractor_costs' => $subcontractorCosts,
            'committed_subcontractor_costs' => $committedSubcontractorCosts,
            'remaining_subcontractor_costs' => max(0, $committedSubcontractorCosts - $subcontractorCosts),
            'payroll_costs' => $payrollCosts,
            'other_costs' => $otherCosts,
            'total_costs' => $totalCosts,
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

    /**
     * Get costs aggregated by group (CostGroup) or legacy category
     */
    public function calculateCostsByGroup(Project $project, ?string $status = 'approved'): array
    {
        $query = $project->costs();
        if ($status) {
            $query->where('status', $status);
        }

        $costs = $query->with('costGroup')->get();

        // Group by cost_group_id if available, otherwise category
        $grouped = $costs->groupBy(function ($cost) {
            if ($cost->cost_group_id) {
                return 'group_' . $cost->cost_group_id;
            }
            return $cost->category ?? 'other';
        });

        // Map to standard format
        return $grouped->map(function ($items, $key) {
            $firstItem = $items->first();
            
            if (str_starts_with($key, 'group_')) {
                // Cost Group
                $categoryLabel = $firstItem->costGroup ? $firstItem->costGroup->name : 'Nhóm đã xóa';
                $categoryCode = $key;
            } else {
                // Legacy Category
                $categoryLabel = match($firstItem->category) {
                    'construction_materials' => 'Vật liệu xây dựng',
                    'labor' => 'Nhân công',
                    'equipment' => 'Thiết bị',
                    'subcontractor' => 'Thầu phụ',
                    'transportation' => 'Vận chuyển',
                    'other' => 'Chi phí khác',
                    default => 'Khác',
                };
                $categoryCode = $firstItem->category ?? 'other';
            }

            return [
                'category' => $categoryCode,
                'category_label' => $categoryLabel,
                'total' => (float) $items->sum('amount'),
                'count' => $items->count(),
                'items' => $items,
            ];
        })->values()->all();
    }

    /**
     * Get monthly financial statistics (Revenue vs Costs) for charts
     */
    public function getMonthlyFinancialStats(Project $project): array
    {
        // Monthly Costs
        $monthlyCosts = \App\Models\Cost::where('project_id', $project->id)
            ->where('status', 'approved')
            ->select(
                \Illuminate\Support\Facades\DB::raw('YEAR(cost_date) as year'),
                \Illuminate\Support\Facades\DB::raw('MONTH(cost_date) as month'),
                \Illuminate\Support\Facades\DB::raw('SUM(amount) as total')
            )
            ->groupBy('year', 'month')
            ->orderBy('year')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'period' => "{$item->year}-" . str_pad($item->month, 2, '0', STR_PAD_LEFT),
                    'amount' => (float) $item->total,
                ];
            });

        // Monthly Revenue from payments
        $monthlyRevenue = \Illuminate\Support\Facades\DB::table('project_payments')
            ->where('project_id', $project->id)
            ->where('status', 'paid')
            ->select(
                \Illuminate\Support\Facades\DB::raw('YEAR(COALESCE(paid_date, due_date)) as year'),
                \Illuminate\Support\Facades\DB::raw('MONTH(COALESCE(paid_date, due_date)) as month'),
                \Illuminate\Support\Facades\DB::raw('SUM(amount) as total')
            )
            ->groupBy('year', 'month')
            ->orderBy('year')
            ->orderBy('month')
            ->get()
            ->map(function ($item) {
                return [
                    'period' => "{$item->year}-" . str_pad($item->month, 2, '0', STR_PAD_LEFT),
                    'amount' => (float) $item->total,
                ];
            });

        // Merge periods
        $allPeriods = collect($monthlyCosts->pluck('period'))
            ->merge($monthlyRevenue->pluck('period'))
            ->unique()
            ->sort()
            ->values();

        $monthlyProfitData = [];
        foreach ($allPeriods as $period) {
            $revenueItem = $monthlyRevenue->firstWhere('period', $period);
            $costItem = $monthlyCosts->firstWhere('period', $period);
            
            $rev = $revenueItem ? $revenueItem['amount'] : 0;
            $cst = $costItem ? $costItem['amount'] : 0;
            
            $monthlyProfitData[] = [
                'period' => $period,
                'revenue' => (float) $rev,
                'costs' => (float) $cst,
                'profit' => (float) ($rev - $cst),
            ];
        }

        return [
            'monthly_costs' => $monthlyCosts->values()->all(),
            'monthly_revenue' => $monthlyRevenue->values()->all(),
            'monthly_profit' => $monthlyProfitData,
        ];
    }
}

