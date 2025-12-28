<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectBudget;
use App\Models\BudgetItem;
use App\Models\Cost;
use Illuminate\Support\Facades\Log;

class BudgetComparisonService
{
    protected $financialCalculationService;

    public function __construct(FinancialCalculationService $financialCalculationService)
    {
        $this->financialCalculationService = $financialCalculationService;
    }

    /**
     * So sánh budget vs actual costs
     * 
     * @param ProjectBudget $budget
     * @return array
     */
    public function compareBudget(ProjectBudget $budget): array
    {
        $project = $budget->project;
        $costs = $this->financialCalculationService->calculateTotalCosts($project);

        // Tính actual cost cho từng budget item
        $items = $budget->items->map(function ($item) use ($project) {
            $actualAmount = 0;

            // Nếu có cost_group_id, lấy costs từ cùng cost_group
            if ($item->cost_group_id) {
                $actualAmount = $project->costs()
                    ->where('cost_group_id', $item->cost_group_id)
                    ->where('status', 'approved')
                    ->sum('amount');
            } else {
                // Nếu không có cost_group, thử match theo tên hoặc category
                // TODO: Có thể cải thiện logic matching
            }

            $item->actual_amount = $actualAmount;
            $item->remaining_amount = max(0, $item->estimated_amount - $actualAmount);
            $item->variance = $actualAmount - $item->estimated_amount;
            $item->variance_percentage = $item->estimated_amount > 0 
                ? (($item->variance / $item->estimated_amount) * 100) 
                : 0;
            $item->is_over_budget = $actualAmount > $item->estimated_amount;

            return $item;
        });

        $totalActual = $items->sum('actual_amount');
        $totalVariance = $totalActual - $budget->total_budget;
        $variancePercentage = $budget->total_budget > 0 
            ? (($totalVariance / $budget->total_budget) * 100) 
            : 0;

        return [
            'budget' => $budget,
            'items' => $items,
            'summary' => [
                'total_budget' => $budget->total_budget,
                'total_actual' => $totalActual,
                'total_variance' => $totalVariance,
                'variance_percentage' => round($variancePercentage, 2),
                'is_over_budget' => $totalActual > $budget->total_budget,
                'budget_utilization' => $budget->total_budget > 0 
                    ? round(($totalActual / $budget->total_budget) * 100, 2)
                    : 0,
            ],
        ];
    }

    /**
     * So sánh budget vs actual theo category
     * 
     * @param ProjectBudget $budget
     * @return array
     */
    public function compareByCategory(ProjectBudget $budget): array
    {
        $project = $budget->project;

        // Lấy costs theo category
        $costsByCategory = Cost::where('project_id', $project->id)
            ->where('status', 'approved')
            ->select('category', \Illuminate\Support\Facades\DB::raw('SUM(amount) as total'))
            ->groupBy('category')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->category => $item->total];
            });

        // Group budget items by category (nếu có)
        // Lấy category từ costs trong cost_group
        $budgetByCategory = [];
        foreach ($budget->items as $item) {
            // Lấy category từ costs trong cost_group
            $category = 'other';
            if ($item->cost_group_id) {
                $firstCost = Cost::where('cost_group_id', $item->cost_group_id)
                    ->where('project_id', $project->id)
                    ->first();
                if ($firstCost) {
                    $category = $firstCost->category ?? 'other';
                }
            }
            
            if (!isset($budgetByCategory[$category])) {
                $budgetByCategory[$category] = 0;
            }
            $budgetByCategory[$category] += $item->estimated_amount;
        }

        $comparison = [];
        $allCategories = array_unique(array_merge(array_keys($costsByCategory->toArray()), array_keys($budgetByCategory)));

        foreach ($allCategories as $category) {
            $budgetAmount = $budgetByCategory[$category] ?? 0;
            $actualAmount = $costsByCategory[$category] ?? 0;
            $variance = $actualAmount - $budgetAmount;
            $variancePercentage = $budgetAmount > 0 
                ? (($variance / $budgetAmount) * 100) 
                : 0;

            $comparison[] = [
                'category' => $category,
                'budget' => $budgetAmount,
                'actual' => $actualAmount,
                'variance' => $variance,
                'variance_percentage' => round($variancePercentage, 2),
                'is_over_budget' => $actualAmount > $budgetAmount,
            ];
        }

        return $comparison;
    }

    /**
     * Phân tích variance theo thời gian
     * 
     * @param Project $project
     * @return array
     */
    public function getVarianceAnalysis(Project $project): array
    {
        $budgets = $project->budgets()
            ->where('status', 'approved')
            ->orderBy('budget_date', 'desc')
            ->get();

        if ($budgets->isEmpty()) {
            return [
                'message' => 'Chưa có ngân sách được duyệt cho dự án này.',
            ];
        }

        $latestBudget = $budgets->first();
        $comparison = $this->compareBudget($latestBudget);
        $categoryComparison = $this->compareByCategory($latestBudget);

        // Tính variance theo tháng
        $monthlyVariance = [];
        $monthlyCosts = Cost::where('project_id', $project->id)
            ->where('status', 'approved')
            ->select(
                \Illuminate\Support\Facades\DB::raw('YEAR(cost_date) as year'),
                \Illuminate\Support\Facades\DB::raw('MONTH(cost_date) as month'),
                \Illuminate\Support\Facades\DB::raw('SUM(amount) as total')
            )
            ->groupBy('year', 'month')
            ->orderBy('year')
            ->orderBy('month')
            ->get();

        foreach ($monthlyCosts as $cost) {
            $period = "{$cost->year}-" . str_pad($cost->month, 2, '0', STR_PAD_LEFT);
            // Tính budget cho tháng này (phân bổ đều)
            $monthlyBudget = $latestBudget->total_budget / 12; // Có thể cải thiện logic phân bổ
            
            $monthlyVariance[] = [
                'period' => $period,
                'budget' => $monthlyBudget,
                'actual' => (float) $cost->total,
                'variance' => (float) $cost->total - $monthlyBudget,
                'variance_percentage' => $monthlyBudget > 0 
                    ? round((((float) $cost->total - $monthlyBudget) / $monthlyBudget) * 100, 2)
                    : 0,
            ];
        }

        return [
            'budget_comparison' => $comparison,
            'category_comparison' => $categoryComparison,
            'monthly_variance' => $monthlyVariance,
            'alerts' => $this->generateAlerts($comparison, $categoryComparison),
        ];
    }

    /**
     * Tạo cảnh báo khi vượt ngân sách
     * 
     * @param array $comparison
     * @param array $categoryComparison
     * @return array
     */
    protected function generateAlerts(array $comparison, array $categoryComparison): array
    {
        $alerts = [];

        // Cảnh báo tổng thể
        if ($comparison['summary']['is_over_budget']) {
            $alerts[] = [
                'type' => 'over_budget',
                'severity' => 'high',
                'message' => "Dự án đã vượt ngân sách {$comparison['summary']['variance_percentage']}%",
                'variance' => $comparison['summary']['total_variance'],
            ];
        } elseif ($comparison['summary']['budget_utilization'] > 80) {
            $alerts[] = [
                'type' => 'approaching_budget',
                'severity' => 'medium',
                'message' => "Dự án đã sử dụng {$comparison['summary']['budget_utilization']}% ngân sách",
                'utilization' => $comparison['summary']['budget_utilization'],
            ];
        }

        // Cảnh báo theo category
        foreach ($categoryComparison as $category) {
            if ($category['is_over_budget'] && $category['variance_percentage'] > 10) {
                $alerts[] = [
                    'type' => 'category_over_budget',
                    'severity' => 'medium',
                    'message' => "Hạng mục {$category['category']} vượt ngân sách {$category['variance_percentage']}%",
                    'category' => $category['category'],
                    'variance' => $category['variance'],
                ];
            }
        }

        return $alerts;
    }
}

