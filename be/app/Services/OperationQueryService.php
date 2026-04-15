<?php

namespace App\Services;

use App\Models\Shareholder;
use App\Models\Equipment;
use App\Models\MaterialInventory;
use App\Models\Material;
use App\Models\Cost;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class OperationQueryService
{
    /**
     * Get operations dashboard data
     */
    public function getDashboardData(): array
    {
        // Total capital
        $totalCapital = Shareholder::where('status', 'active')->sum('contributed_amount');

        // Project revenue (completed projects - joining with contracts)
        $projectRevenue = \App\Models\Contract::whereHas('project', function($query) {
                $query->where('status', 'completed');
            })
            ->where('status', 'approved')
            ->sum('contract_value');

        // Project costs
        $projectCosts = Cost::whereNotNull('project_id')->where('status', 'approved')->sum('amount');

        // Operations costs (company costs)
        $operationsCosts = Cost::whereNull('project_id')->where('status', 'approved')->sum('amount');

        // Asset stats
        $totalAssets = Equipment::count();
        $totalAssetValue = Equipment::sum('current_value');
        $totalPurchaseValue = Equipment::sum('purchase_price');
        $totalDepreciation = Equipment::sum('accumulated_depreciation');

        // Assets by status
        $assetsByStatus = Equipment::selectRaw('status, count(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        // Material stats
        $materialStats = [
            'total_items' => Material::count(),
            'total_value' => (float) MaterialInventory::join('materials', 'material_inventory.material_id', '=', 'materials.id')
                ->selectRaw('SUM(material_inventory.current_stock * materials.unit_price) as total_value')
                ->value('total_value'),
            'low_stock_count' => MaterialInventory::lowStock()->count(),
        ];

        // Monthly expense breakdown (last 6 months)
        $monthlyExpenses = $this->getMonthlyExpenseBreakdown(6);

        // Top 5 shareholders
        $topShareholders = Shareholder::where('status', 'active')
            ->orderBy('contributed_amount', 'desc')
            ->take(5)
            ->get(['id', 'name', 'contributed_amount', 'share_percentage']);

        return [
            'total_capital' => (float) $totalCapital,
            'project_revenue' => (float) $projectRevenue,
            'project_costs' => (float) $projectCosts,
            'operations_costs' => (float) $operationsCosts,
            'assets' => [
                'total' => $totalAssets,
                'total_value' => (float) $totalAssetValue,
                'total_purchase' => (float) $totalPurchaseValue,
                'total_depreciation' => (float) $totalDepreciation,
                'by_status' => $assetsByStatus,
            ],
            'materials' => $materialStats,
            'monthly_expenses' => $monthlyExpenses,
            'top_shareholders' => $topShareholders,
        ];
    }

    /**
     * Get monthly expense breakdown for the company
     */
    private function getMonthlyExpenseBreakdown(int $months = 6): array
    {
        $monthlyExpenses = [];
        for ($i = $months - 1; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $monthlyExpenses[] = [
                'month' => $month->format('m/Y'),
                'label' => 'T' . $month->format('m'),
                'capex' => (float) Cost::whereNull('project_id')
                    ->where('status', 'approved')
                    ->where('expense_category', 'capex')
                    ->whereYear('cost_date', $month->year)
                    ->whereMonth('cost_date', $month->month)
                    ->sum('amount'),
                'opex' => (float) Cost::whereNull('project_id')
                    ->where('status', 'approved')
                    ->where('expense_category', 'opex')
                    ->whereYear('cost_date', $month->year)
                    ->whereMonth('cost_date', $month->month)
                    ->sum('amount'),
                'payroll' => (float) Cost::whereNull('project_id')
                    ->where('status', 'approved')
                    ->where('expense_category', 'payroll')
                    ->whereYear('cost_date', $month->year)
                    ->whereMonth('cost_date', $month->month)
                    ->sum('amount'),
            ];
        }
        return $monthlyExpenses;
    }
}
