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
        $user = auth()->user();

        // Check permission
        $authService = app(\App\Services\AuthorizationService::class);
        if (!$authService->can($user, \App\Constants\Permissions::REVENUE_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem thông tin doanh thu của dự án này.'
            ], 403);
        }

        // Sử dụng FinancialCalculationService để tính toán
        $revenue = $this->financialCalculationService->calculateRevenue($project);
        $costs = $this->financialCalculationService->calculateTotalCosts($project);
        $profit = $this->financialCalculationService->calculateProfit($project);
        $allCostsByGroup = $this->financialCalculationService->calculateCostsByGroup($project);

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
                    'additional_costs' => (float) $revenue['additional_costs'],
                    'paid_payments' => (float) $revenue['paid_payments'],
                    'remaining_payment' => (float) ($revenue['total_revenue'] - $revenue['paid_payments']),
                    'total_revenue' => (float) $revenue['total_revenue'],
                ],
                'costs' => [
                    'by_group' => $allCostsByGroup,
                    'breakdown' => [
                        'subcontractor_costs' => (float) $costs['subcontractor_costs'],
                        'payroll_costs' => (float) $costs['payroll_costs'],
                        'other_costs' => (float) $costs['other_costs'],
                    ],
                    'total_costs' => (float) $costs['total_costs'],
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
        $user = auth()->user();

        // Check permission
        $authService = app(\App\Services\AuthorizationService::class);
        if (!$authService->can($user, \App\Constants\Permissions::REVENUE_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem thông tin chi tiết doanh thu của dự án này.'
            ], 403);
        }

        $status = $request->query('status', 'approved');
        $allGroups = $this->financialCalculationService->calculateCostsByGroup($project, $status);

        // Filter by category if requested
        if ($categoryFilter = $request->query('category')) {
            $allGroups = collect($allGroups)->filter(function($group) use ($categoryFilter) {
                return $group['category'] === $categoryFilter;
            })->values()->all();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'grouped' => $allGroups,
                'summary' => [
                    'total_amount' => (float) collect($allGroups)->sum('total'),
                    'total_count' => collect($allGroups)->sum('count'),
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
        $user = auth()->user();

        // Check permission
        $authService = app(\App\Services\AuthorizationService::class);
        if (!$authService->can($user, \App\Constants\Permissions::REVENUE_DASHBOARD, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem dashboard doanh thu của dự án này.'
            ], 403);
        }

        $period = $request->query('period', 'all');
        $dateFilter = $this->getDateFilter($period);
        $startDate = $dateFilter ? $dateFilter[0] : null;
        $endDate = $dateFilter ? $dateFilter[1] : null;

        // KPI
        $revenueData = $this->financialCalculationService->calculateRevenue($project, $startDate, $endDate);
        $profitData = $this->financialCalculationService->calculateProfit($project, $startDate, $endDate);

        // Financial Stats (Charts)
        $financialStats = $this->financialCalculationService->getMonthlyFinancialStats($project);
        
        // Distribution
        $costsByGroup = $this->financialCalculationService->calculateCostsByGroup($project);

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
                    'monthly_costs' => $financialStats['monthly_costs'],
                    'monthly_revenue' => $financialStats['monthly_revenue'],
                    'monthly_profit' => $financialStats['monthly_profit'],
                    'costs_by_group' => $costsByGroup,
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
