<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Contract;
use App\Models\ProjectPayment;
use App\Models\Cost;
use App\Models\AdditionalCost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RevenueController extends Controller
{
    /**
     * Tổng hợp doanh thu, chi phí, lợi nhuận cho một dự án
     */
    public function projectSummary(string $projectId)
    {
        $project = Project::findOrFail($projectId);

        // Doanh thu từ hợp đồng
        $contract = $project->contract;
        $contractValue = $contract && $contract->status === 'approved'
            ? $contract->contract_value
            : 0;

        // Doanh thu từ thanh toán đã xác nhận
        $paidPayments = $project->payments()
            ->where('status', 'paid')
            ->sum('amount');

        $totalRevenue = $contractValue; // Hoặc có thể dùng $paidPayments nếu muốn tính theo thanh toán thực tế

        // Chi phí theo nhóm
        $costsByCategory = Cost::where('project_id', $project->id)
            ->where('status', 'approved')
            ->select('category', DB::raw('SUM(amount) as total'))
            ->groupBy('category')
            ->get()
            ->mapWithKeys(function ($item) {
                return [$item->category => $item->total];
            });

        $totalCosts = Cost::where('project_id', $project->id)
            ->where('status', 'approved')
            ->sum('amount');

        // Chi phí phát sinh đã duyệt
        $additionalCosts = AdditionalCost::where('project_id', $project->id)
            ->where('status', 'approved')
            ->sum('amount');

        // Tổng chi phí
        $totalAllCosts = $totalCosts + $additionalCosts;

        // Lợi nhuận
        $profit = $totalRevenue - $totalAllCosts;
        $profitMargin = $totalRevenue > 0 ? ($profit / $totalRevenue) * 100 : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'revenue' => [
                    'contract_value' => (float) $contractValue,
                    'paid_payments' => (float) $paidPayments,
                    'total_revenue' => (float) $totalRevenue,
                ],
                'costs' => [
                    'by_category' => [
                        'construction_materials' => (float) ($costsByCategory['construction_materials'] ?? 0),
                        'concrete' => (float) ($costsByCategory['concrete'] ?? 0),
                        'labor' => (float) ($costsByCategory['labor'] ?? 0),
                        'equipment' => (float) ($costsByCategory['equipment'] ?? 0),
                        'transportation' => (float) ($costsByCategory['transportation'] ?? 0),
                        'other' => (float) ($costsByCategory['other'] ?? 0),
                    ],
                    'additional_costs' => (float) $additionalCosts,
                    'total_costs' => (float) $totalAllCosts,
                ],
                'profit' => [
                    'amount' => (float) $profit,
                    'margin' => round($profitMargin, 2),
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
     */
    public function dashboard(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);

        $period = $request->query('period', 'all'); // all, month, quarter, year

        // Tính toán theo period
        $dateFilter = $this->getDateFilter($period);

        // Doanh thu
        $contract = $project->contract;
        $revenue = $contract && $contract->status === 'approved'
            ? $contract->contract_value
            : 0;

        // Chi phí
        $costsQuery = Cost::where('project_id', $project->id)
            ->where('status', 'approved');

        if ($dateFilter) {
            $costsQuery->whereBetween('cost_date', $dateFilter);
        }

        $totalCosts = $costsQuery->sum('amount');

        // Chi phí phát sinh
        $additionalCostsQuery = AdditionalCost::where('project_id', $project->id)
            ->where('status', 'approved');

        if ($dateFilter) {
            $additionalCostsQuery->whereBetween('created_at', $dateFilter);
        }

        $additionalCosts = $additionalCostsQuery->sum('amount');

        // Lợi nhuận
        $profit = $revenue - $totalCosts - $additionalCosts;

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
        $monthlyProfit = [];
        foreach ($monthlyCosts as $cost) {
            $monthlyProfit[] = [
                'period' => $cost['period'],
                'revenue' => $revenue / 12, // Giả định phân bổ đều, có thể tính chính xác hơn
                'costs' => $cost['amount'],
                'profit' => ($revenue / 12) - $cost['amount'],
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'kpi' => [
                    'revenue' => (float) $revenue,
                    'costs' => (float) ($totalCosts + $additionalCosts),
                    'profit' => (float) $profit,
                    'profit_margin' => $revenue > 0 ? round(($profit / $revenue) * 100, 2) : 0,
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
