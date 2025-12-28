<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Cost;
use App\Models\CostGroup;
use App\Services\ProjectService;
use App\Services\FinancialCalculationService;
use App\Services\RevenueAllocationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class RevenueController extends Controller
{
    protected $projectService;
    protected $financialCalculationService;
    protected $revenueAllocationService;

    public function __construct(
        ProjectService $projectService,
        FinancialCalculationService $financialCalculationService,
        RevenueAllocationService $revenueAllocationService
    ) {
        $this->projectService = $projectService;
        $this->financialCalculationService = $financialCalculationService;
        $this->revenueAllocationService = $revenueAllocationService;
    }
    /**
     * Tổng hợp doanh thu, chi phí, lợi nhuận cho một dự án
     * Sử dụng ProjectService và FinancialCalculationService để đảm bảo tính nhất quán
     */
    public function projectSummary(string $projectId)
    {
        $project = Project::findOrFail($projectId);

        // Sử dụng FinancialCalculationService để tính toán
        $revenue = $this->financialCalculationService->calculateRevenue($project);
        $costs = $this->financialCalculationService->calculateTotalCosts($project);
        $profit = $this->financialCalculationService->calculateProfit($project);

        // Validate calculation
        $validationService = app(\App\Services\CalculationValidationService::class);
        $costValidation = $validationService->validateCostCalculation($project);
        $revenueValidation = $validationService->validateRevenueCalculation($project);
        
        if (!empty($costValidation['warnings']) || !empty($revenueValidation['warnings'])) {
            Log::warning("Calculation warnings for project {$project->id}", [
                'project_id' => $project->id,
                'cost_warnings' => $costValidation['warnings'],
                'revenue_warnings' => $revenueValidation['warnings'],
            ]);
        }

        // Chi phí theo nhóm (CostGroup) từ Cost records - ĐỘNG từ hệ thống
        $costsByGroup = Cost::where('project_id', $project->id)
            ->where('status', 'approved')
            ->with('costGroup')
            ->select('cost_group_id', DB::raw('SUM(amount) as total'))
            ->groupBy('cost_group_id')
            ->get()
            ->mapWithKeys(function ($item) {
                $groupName = $item->costGroup 
                    ? $item->costGroup->name 
                    : 'Chưa phân loại';
                $groupId = $item->cost_group_id ?? 'other';
                return [$groupId => [
                    'id' => $item->cost_group_id,
                    'name' => $groupName,
                    'amount' => (float) $item->total,
                ]];
            });

        // Chi phí không có cost_group_id (fallback về category cũ)
        $costsWithoutGroup = Cost::where('project_id', $project->id)
            ->where('status', 'approved')
            ->whereNull('cost_group_id')
            ->select('category', DB::raw('SUM(amount) as total'))
            ->groupBy('category')
            ->get()
            ->mapWithKeys(function ($item) {
                $categoryLabel = match ($item->category) {
                    'construction_materials' => 'Vật liệu xây dựng',
                    'concrete' => 'Bê tông',
                    'labor' => 'Nhân công',
                    'equipment' => 'Thiết bị',
                    'transportation' => 'Vận chuyển',
                    'other' => 'Chi phí khác',
                    default => 'Khác',
                };
                return ["category_{$item->category}" => [
                    'id' => null,
                    'name' => $categoryLabel,
                    'amount' => (float) $item->total,
                ]];
            });

        // Merge cả hai
        $allCostsByGroup = $costsByGroup->merge($costsWithoutGroup);

        return response()->json([
            'success' => true,
            'data' => [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'revenue' => [
                    'contract_value' => (float) $revenue['contract_value'],
                    'additional_costs' => (float) $costs['additional_costs'], // Giá trị phát sinh
                    'paid_payments' => (float) $revenue['paid_payments'],
                    'remaining_payment' => (float) ($revenue['contract_value'] - $revenue['paid_payments']), // Số tiền còn lại
                    'total_revenue' => (float) $revenue['total_revenue'],
                ],
                'costs' => [
                    'by_group' => $allCostsByGroup->values()->all(), // Chi phí theo nhóm động
                    'breakdown' => [
                        'additional_costs' => (float) $costs['additional_costs'],
                        'subcontractor_costs' => (float) $costs['subcontractor_costs'],
                        'payroll_costs' => (float) $costs['payroll_costs'],
                        'time_tracking_costs' => (float) $costs['time_tracking_costs'],
                        'bonus_costs' => (float) $costs['bonus_costs'],
                        'other_costs' => (float) $costs['other_costs'],
                    ],
                    'total_costs' => (float) $profit['total_costs'],
                ],
                'profit' => [
                    'amount' => (float) $profit['profit'],
                    'margin' => (float) $profit['profit_margin'],
                ],
            ],
        ]);
    }

    /**
     * Danh sách chi phí theo nhóm
     */
    public function costsByCategory(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);

        $query = Cost::where('project_id', $project->id)
            ->with(['creator', 'managementApprover', 'accountantApprover', 'attachments']);

        // Filter theo category
        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        // Filter theo status
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        // Chỉ lấy approved nếu không có filter
        if (!$request->has('status')) {
            $query->where('status', 'approved');
        }

        $costs = $query->orderByDesc('cost_date')->get();

        // Group by category
        $grouped = $costs->groupBy('category')->map(function ($items, $category) {
            return [
                'category' => $category,
                'category_label' => $items->first()->category_label ?? '',
                'total' => $items->sum('amount'),
                'count' => $items->count(),
                'items' => $items,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'grouped' => $grouped->values(),
                'summary' => [
                    'total_amount' => $costs->sum('amount'),
                    'total_count' => $costs->count(),
                ],
            ],
        ]);
    }

    /**
     * Dashboard KPI cho dự án
     * Sử dụng FinancialCalculationService để đảm bảo tính nhất quán
     */
    public function dashboard(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);

        $period = $request->query('period', 'all'); // all, month, quarter, year

        // Tính toán theo period
        $dateFilter = $this->getDateFilter($period);
        $startDate = $dateFilter ? $dateFilter[0] : null;
        $endDate = $dateFilter ? $dateFilter[1] : null;

        // Sử dụng FinancialCalculationService với date filter
        $revenueData = $this->financialCalculationService->calculateRevenue($project, $startDate, $endDate);
        $costsData = $this->financialCalculationService->calculateTotalCosts($project, $startDate, $endDate);
        $profitData = $this->financialCalculationService->calculateProfit($project, $startDate, $endDate);

        // Chart data - Chi phí theo tháng
        $monthlyCosts = Cost::where('project_id', $project->id)
            ->where('status', 'approved')
            ->select(
                DB::raw('YEAR(cost_date) as year'),
                DB::raw('MONTH(cost_date) as month'),
                DB::raw('SUM(amount) as total')
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

        // Chart data - Lợi nhuận theo tháng
        // Sử dụng RevenueAllocationService để phân bổ doanh thu theo payment schedule
        $monthlyProfit = [];
        foreach ($monthlyCosts as $cost) {
            $periodParts = explode('-', $cost['period']);
            $year = (int) $periodParts[0];
            $month = (int) $periodParts[1];
            
            // Phân bổ doanh thu theo tháng dựa trên payment schedule
            $monthlyRevenue = $this->revenueAllocationService->allocateByMonth($project, $year, $month);
            
            // Nếu không có payment trong tháng, phân bổ đều (fallback)
            if ($monthlyRevenue == 0 && $revenueData['total_revenue'] > 0) {
                // Tính số tháng từ start_date đến end_date của dự án
                $projectStart = $project->start_date ?? now();
                $projectEnd = $project->end_date ?? $projectStart->copy()->addMonths(12);
                $totalMonths = max(1, $projectStart->diffInMonths($projectEnd) + 1);
                $monthlyRevenue = $revenueData['total_revenue'] / $totalMonths;
            }
            
            $monthlyProfit[] = [
                'period' => $cost['period'],
                'revenue' => $monthlyRevenue,
                'costs' => $cost['amount'],
                'profit' => $monthlyRevenue - $cost['amount'],
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'kpi' => [
                    'revenue' => (float) $revenueData['total_revenue'],
                    'costs' => (float) $profitData['total_costs'],
                    'profit' => (float) $profitData['profit'],
                    'profit_margin' => (float) $profitData['profit_margin'],
                ],
                'charts' => [
                    'monthly_costs' => $monthlyCosts,
                    'monthly_profit' => $monthlyProfit,
                ],
            ],
        ]);
    }

    /**
     * Lấy date filter theo period
     */
    private function getDateFilter(string $period): ?array
    {
        return match ($period) {
            'month' => [now()->startOfMonth(), now()->endOfMonth()],
            'quarter' => [now()->startOfQuarter(), now()->endOfQuarter()],
            'year' => [now()->startOfYear(), now()->endOfYear()],
            default => null,
        };
    }
}
