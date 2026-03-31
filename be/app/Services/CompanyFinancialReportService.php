<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Cost;
use App\Models\ProjectPayment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CompanyFinancialReportService
{
    /**
     * Lấy báo cáo tài chính tổng hợp của công ty
     * 
     * @param Carbon|null $startDate
     * @param Carbon|null $endDate
     * @return array
     */
    public function getCompanyFinancialSummary(?Carbon $startDate = null, ?Carbon $endDate = null): array
    {
        // Default: Tháng hiện tại
        if (!$startDate) {
            $startDate = Carbon::now()->startOfMonth();
        }
        if (!$endDate) {
            $endDate = Carbon::now()->endOfMonth();
        }

        // 1. DOANH THU
        $revenueData = $this->calculateTotalRevenue($startDate, $endDate);

        // 2. CHI PHÍ DỰ ÁN
        $projectCostsData = $this->calculateProjectCosts($startDate, $endDate);

        // 3. CHI PHÍ CÔNG TY
        $companyCostsData = $this->calculateCompanyCosts($startDate, $endDate);

        // 4. TÍNH TOÁN LỢI NHUẬN
        $grossProfit = $revenueData['total_revenue'] - $projectCostsData['total'];
        $netProfit = $grossProfit - $companyCostsData['total'];

        $grossMargin = $revenueData['total_revenue'] > 0 
            ? ($grossProfit / $revenueData['total_revenue']) * 100 
            : 0;

        $netMargin = $revenueData['total_revenue'] > 0 
            ? ($netProfit / $revenueData['total_revenue']) * 100 
            : 0;

        return [
            'period' => [
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
            ],
            'revenue' => $revenueData,
            'project_costs' => $projectCostsData,
            'company_costs' => $companyCostsData,
            'summary' => [
                'total_revenue' => $revenueData['total_revenue'],
                'total_project_costs' => $projectCostsData['total'],
                'total_company_costs' => $companyCostsData['total'],
                'total_all_costs' => $projectCostsData['total'] + $companyCostsData['total'],
                'gross_profit' => $grossProfit,
                'gross_margin' => round($grossMargin, 2),
                'net_profit' => $netProfit,
                'net_margin' => round($netMargin, 2),
            ],
        ];
    }

    /**
     * Tính tổng doanh thu từ tất cả dự án
     */
    private function calculateTotalRevenue(Carbon $startDate, Carbon $endDate): array
    {
        // Doanh thu từ hợp đồng đã approved
        $totalContractValue = Project::whereHas('contract', function ($query) {
                $query->where('status', 'approved');
            })
            ->with('contract')
            ->get()
            ->sum(fn($project) => $project->contract?->contract_value ?? 0);

        // Thanh toán đã nhận trong kỳ
        $paidPayments = ProjectPayment::where('status', 'paid')
            ->whereBetween('paid_date', [$startDate, $endDate])
            ->sum('amount');

        // Thanh toán đã nhận tổng cộng
        $totalPaidPayments = ProjectPayment::where('status', 'paid')
            ->sum('amount');

        return [
            'total_contract_value' => (float) $totalContractValue,
            'paid_in_period' => (float) $paidPayments,
            'total_paid' => (float) $totalPaidPayments,
            'total_revenue' => (float) $totalContractValue, // Dùng contract value làm revenue
            'outstanding' => (float) ($totalContractValue - $totalPaidPayments),
        ];
    }

    /**
     * Tính tổng chi phí dự án
     */
    private function calculateProjectCosts(Carbon $startDate, Carbon $endDate): array
    {
        // Chi phí dự án đã approved trong kỳ
        $costsQuery = Cost::whereNotNull('project_id')
            ->where('status', 'approved')
            ->whereBetween('cost_date', [$startDate, $endDate]);

        // Phân loại theo cost group
        $costsByGroup = $costsQuery->clone()
            ->select('cost_group_id', DB::raw('SUM(amount) as total'))
            ->groupBy('cost_group_id')
            ->with('costGroup')
            ->get()
            ->map(function ($item) {
                return [
                    'cost_group_id' => $item->cost_group_id,
                    'cost_group_name' => $item->costGroup?->name ?? 'N/A',
                    'total' => (float) $item->total,
                ];
            });

        // Tổng chi phí dự án
        $totalProjectCosts = $costsQuery->sum('amount');

        // Chi phí theo loại
        $materialCosts = Cost::whereNotNull('project_id')
            ->whereNotNull('material_id')
            ->where('status', 'approved')
            ->whereBetween('cost_date', [$startDate, $endDate])
            ->sum('amount');

        $equipmentCosts = Cost::whereNotNull('project_id')
            ->whereNotNull('equipment_allocation_id')
            ->where('status', 'approved')
            ->whereBetween('cost_date', [$startDate, $endDate])
            ->sum('amount');

        $subcontractorCosts = Cost::whereNotNull('project_id')
            ->whereNotNull('subcontractor_payment_id') // CHỈ tính các khoản thực chi
            ->where('status', 'approved')
            ->whereBetween('cost_date', [$startDate, $endDate])
            ->sum('amount');

        $otherCosts = Cost::whereNotNull('project_id')
            ->whereNull('material_id')
            ->whereNull('equipment_allocation_id')
            ->whereNull('subcontractor_payment_id') // Loại trừ payment thầu phụ (đã tính ở trên)
            ->where('status', 'approved')
            ->whereBetween('cost_date', [$startDate, $endDate])
            ->sum('amount');

        return [
            'total' => (float) $totalProjectCosts,
            'by_type' => [
                'material' => (float) $materialCosts,
                'equipment' => (float) $equipmentCosts,
                'subcontractor' => (float) $subcontractorCosts,
                'other' => (float) $otherCosts,
            ],
            'by_cost_group' => $costsByGroup->toArray(),
        ];
    }

    /**
     * Tính tổng chi phí công ty
     */
    private function calculateCompanyCosts(Carbon $startDate, Carbon $endDate): array
    {
        // Chi phí công ty đã approved trong kỳ
        $costsQuery = Cost::whereNull('project_id')
            ->where('status', 'approved')
            ->whereBetween('cost_date', [$startDate, $endDate]);

        // Phân loại theo cost group
        $costsByGroup = $costsQuery->clone()
            ->select('cost_group_id', DB::raw('SUM(amount) as total'))
            ->groupBy('cost_group_id')
            ->with('costGroup')
            ->get()
            ->map(function ($item) {
                return [
                    'cost_group_id' => $item->cost_group_id,
                    'cost_group_name' => $item->costGroup?->name ?? 'N/A',
                    'total' => (float) $item->total,
                ];
            });

        // Tổng chi phí công ty
        $totalCompanyCosts = $costsQuery->sum('amount');

        // Số lượng chi phí theo status
        $statusBreakdown = Cost::whereNull('project_id')
            ->whereBetween('cost_date', [$startDate, $endDate])
            ->select('status', DB::raw('COUNT(*) as count'), DB::raw('SUM(amount) as total'))
            ->groupBy('status')
            ->get()
            ->mapWithKeys(function ($item) {
                return [
                    $item->status => [
                        'count' => $item->count,
                        'total' => (float) $item->total,
                    ]
                ];
            });

        return [
            'total' => (float) $totalCompanyCosts,
            'by_cost_group' => $costsByGroup->toArray(),
            'by_status' => $statusBreakdown->toArray(),
        ];
    }

    /**
     * Lấy báo cáo P&L (Profit & Loss) chi tiết
     */
    public function getProfitLossStatement(?Carbon $startDate = null, ?Carbon $endDate = null): array
    {
        $summary = $this->getCompanyFinancialSummary($startDate, $endDate);

        // Format theo chuẩn P&L
        return [
            'period' => $summary['period'],
            'income' => [
                'revenue' => $summary['revenue']['total_revenue'],
                'total_income' => $summary['revenue']['total_revenue'],
            ],
            'cost_of_goods_sold' => [
                'project_costs' => $summary['project_costs']['total'],
                'total_cogs' => $summary['project_costs']['total'],
            ],
            'gross_profit' => $summary['summary']['gross_profit'],
            'operating_expenses' => [
                'company_costs' => $summary['company_costs']['total'],
                'total_operating_expenses' => $summary['company_costs']['total'],
            ],
            'net_profit' => $summary['summary']['net_profit'],
            'margins' => [
                'gross_margin' => $summary['summary']['gross_margin'],
                'net_margin' => $summary['summary']['net_margin'],
            ],
        ];
    }

    /**
     * Lấy xu hướng tài chính theo tháng
     */
    public function getFinancialTrend(int $months = 6): array
    {
        $trends = [];
        $endDate = Carbon::now();

        for ($i = $months - 1; $i >= 0; $i--) {
            $monthStart = Carbon::now()->subMonths($i)->startOfMonth();
            $monthEnd = Carbon::now()->subMonths($i)->endOfMonth();

            $summary = $this->getCompanyFinancialSummary($monthStart, $monthEnd);

            $trends[] = [
                'month' => $monthStart->format('Y-m'),
                'month_name' => $monthStart->format('M Y'),
                'revenue' => $summary['summary']['total_revenue'],
                'project_costs' => $summary['summary']['total_project_costs'],
                'company_costs' => $summary['summary']['total_company_costs'],
                'gross_profit' => $summary['summary']['gross_profit'],
                'net_profit' => $summary['summary']['net_profit'],
                'gross_margin' => $summary['summary']['gross_margin'],
                'net_margin' => $summary['summary']['net_margin'],
            ];
        }

        return $trends;
    }

    /**
     * So sánh hiệu suất giữa các kỳ
     */
    public function comparePerformance(Carbon $period1Start, Carbon $period1End, Carbon $period2Start, Carbon $period2End): array
    {
        $period1 = $this->getCompanyFinancialSummary($period1Start, $period1End);
        $period2 = $this->getCompanyFinancialSummary($period2Start, $period2End);

        $calculateChange = function ($old, $new) {
            if ($old == 0) return $new > 0 ? 100 : 0;
            return (($new - $old) / $old) * 100;
        };

        return [
            'period_1' => [
                'period' => $period1['period'],
                'summary' => $period1['summary'],
            ],
            'period_2' => [
                'period' => $period2['period'],
                'summary' => $period2['summary'],
            ],
            'changes' => [
                'revenue_change' => $calculateChange(
                    $period1['summary']['total_revenue'],
                    $period2['summary']['total_revenue']
                ),
                'project_costs_change' => $calculateChange(
                    $period1['summary']['total_project_costs'],
                    $period2['summary']['total_project_costs']
                ),
                'company_costs_change' => $calculateChange(
                    $period1['summary']['total_company_costs'],
                    $period2['summary']['total_company_costs']
                ),
                'net_profit_change' => $calculateChange(
                    $period1['summary']['net_profit'],
                    $period2['summary']['net_profit']
                ),
            ],
        ];
    }
}
