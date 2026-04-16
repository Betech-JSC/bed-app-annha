<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ConstructionLog;
use App\Models\SubcontractorProgress;
use App\Models\MaterialTransaction;
use App\Models\Cost;
use App\Models\ProjectPayment;
use App\Models\SupplierAcceptance;
use App\Models\Kpi;
use App\Models\ProjectTask;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ProjectReportingService
{
    /**
     * Get high-level global project statistics for CRM Index.
     */
    public function getGlobalProjectStats(): array
    {
        return [
            'total' => Project::count(),
            'in_progress' => Project::where('status', 'in_progress')->count(),
            'planning' => Project::where('status', 'planning')->count(),
            'completed' => Project::where('status', 'completed')->count(),
            'total_contract_value' => (float) \App\Models\Contract::where('status', 'approved')->sum('contract_value'),
            'total_revenue_collected' => (float) ProjectPayment::where('status', 'paid')->sum('amount'),
            'total_costs' => (float) Cost::where('status', 'approved')->sum('amount'),
        ];
    }

    /**
     * Get overall project progress percentage.
     * Delegates to ProjectProgress model — single source of truth.
     * Priority: Acceptance → Tasks → Logs → Subcontractors
     */
    public function calculateOverallProgress(Project $project): float
    {
        $progress = $project->progress;

        if (!$progress) {
            $progress = $project->progress()->create([
                'overall_percentage' => 0,
                'calculated_from'    => 'manual',
            ]);
        }

        return (float) $progress->calculateOverall();
    }

    /**
     * Get weekly construction statistics.
     */
    public function getWeeklyConstructionStats(string $projectId, string $fromDate, string $toDate): array
    {
        $logs = ConstructionLog::where('project_id', $projectId)
            ->whereBetween('log_date', [$fromDate, $toDate])
            ->get();

        $weeklyStats = [];
        $startDate = Carbon::parse($fromDate);
        $endDate = Carbon::parse($toDate);

        while ($startDate <= $endDate) {
            $weekStart = $startDate->copy()->startOfWeek();
            $weekEnd = $startDate->copy()->endOfWeek();

            $weekLogs = $logs->filter(fn($log) => Carbon::parse($log->log_date)->between($weekStart, $weekEnd));

            $weeklyStats[] = [
                'week' => $weekStart->format('Y-m-d') . ' - ' . $weekEnd->format('Y-m-d'),
                'week_start' => $weekStart->toDateString(),
                'week_end' => $weekEnd->toDateString(),
                'average_progress' => round($weekLogs->avg('completion_percentage') ?? 0, 2),
                'average_personnel' => round($weekLogs->avg('personnel_count') ?? 0, 0),
                'log_count' => $weekLogs->count(),
            ];

            $startDate->addWeek();
        }

        return $weeklyStats;
    }

    /**
     * Get material procurement summary (Inbound).
     */
    public function getMaterialProcurementSummary(string $projectId, string $fromDate, string $toDate): array
    {
        $query = MaterialTransaction::where('project_id', $projectId)
            ->where('type', 'in')
            ->whereBetween('transaction_date', [$fromDate, $toDate]);

        $transactions = (clone $query)->with(['material', 'supplier', 'creator'])->orderBy('transaction_date', 'desc')->get();

        $materialStats = (clone $query)
            ->select('material_id', DB::raw('SUM(quantity) as total_quantity'), DB::raw('SUM(total_amount) as total_amount'))
            ->groupBy('material_id')
            ->with('material')
            ->get()
            ->map(fn($item) => [
                'material' => [
                    'id' => $item->material->id,
                    'name' => $item->material->name,
                    'code' => $item->material->code,
                    'unit' => $item->material->unit,
                ],
                'total_quantity' => (float) $item->total_quantity,
                'total_amount' => (float) $item->total_amount,
            ]);

        return [
            'summary' => [
                'total_transactions' => $transactions->count(),
                'total_quantity' => (float) $transactions->sum('quantity'),
                'total_amount' => (float) $transactions->sum('total_amount'),
            ],
            'transactions' => $transactions,
            'material_statistics' => $materialStats,
        ];
    }

    /**
     * Get debt and payment report.
     */
    public function getDebtAndPaymentReport(Project $project): array
    {
        // 1. Subcontractor Debts
        $subcontractorDebts = $project->subcontractors->map(function ($sub) {
            $totalPaid = $sub->payments()->where('status', 'paid')->sum('amount');
            return [
                'subcontractor' => [
                    'id' => $sub->id,
                    'name' => $sub->name,
                    'category' => $sub->category,
                ],
                'contract_value' => (float) $sub->total_quote,
                'total_paid' => (float) $totalPaid,
                'remaining_debt' => (float) ($sub->total_quote - $totalPaid),
                'payment_percentage' => $sub->total_quote > 0 ? round(($totalPaid / $sub->total_quote) * 100, 2) : 0,
            ];
        });

        // 2. Supplier Debts (from Approved Acceptances)
        $supplierAcceptances = SupplierAcceptance::whereHas('supplier.contracts', fn($q) => $q->where('project_id', $project->id))
            ->with(['supplier'])
            ->where('status', 'approved')
            ->get();

        $supplierDebts = $supplierAcceptances->groupBy('supplier_id')->map(function ($group, $supplierId) {
            $supplier = $group->first()->supplier;
            $totalAccepted = $group->sum('accepted_amount');
            $totalPaid = (float) $supplier->total_paid;

            return [
                'supplier' => [
                    'id' => $supplier->id,
                    'name' => $supplier->name,
                ],
                'total_accepted' => (float)$totalAccepted,
                'total_paid' => $totalPaid,
                'remaining_debt' => max(0, (float)$totalAccepted - $totalPaid),
            ];
        })->values();

        $totalSubcontractorDebt = $subcontractorDebts->sum('remaining_debt');
        $totalSupplierDebt = $supplierDebts->sum('remaining_debt');

        return [
            'summary' => [
                'total_subcontractor_debt' => (float) $totalSubcontractorDebt,
                'total_supplier_debt' => (float) $totalSupplierDebt,
                'total_debt' => (float) ($totalSubcontractorDebt + $totalSupplierDebt),
            ],
            'subcontractor_debts' => $subcontractorDebts,
            'supplier_debts' => $supplierDebts,
            'project_payments' => ProjectPayment::where('project_id', $project->id)->orderByRaw('COALESCE(paid_date, due_date) DESC')->get(),
        ];
    }

    /**
     * Get hierarchical progress report.
     */
    public function getProgressReport(Project $project): array
    {
        $taskProgressService = app(TaskProgressService::class);

        $tasks = ProjectTask::where('project_id', $project->id)
            ->whereNull('deleted_at')
            ->with(['parent', 'children'])
            ->orderBy('order')
            ->get();

        $rootTasks = $tasks->whereNull('parent_id');
        $columns = [];

        foreach ($rootTasks as $parentTask) {
            $columnTasks = [];
            $columnTasks[] = $this->buildTaskRecursiveData($parentTask, $tasks, $taskProgressService);
            
            $childTasks = $tasks->where('parent_id', $parentTask->id);
            foreach ($childTasks as $childTask) {
                $columnTasks[] = $this->buildTaskRecursiveData($childTask, $tasks, $taskProgressService);
            }

            $columns[] = [
                'parent_task' => [
                    'id' => $parentTask->id,
                    'name' => $parentTask->name,
                    'order' => $parentTask->order,
                ],
                'tasks' => $columnTasks,
            ];
        }

        $overallProgress = $this->calculateOverallProgress($project);

        return [
            'overall_progress' => $overallProgress,
            'columns' => $columns,
            'statistics' => [
                'total_tasks' => $tasks->count(),
                'tasks_by_status' => [
                    'not_started' => $tasks->where('status', 'not_started')->count(),
                    'in_progress' => $tasks->where('status', 'in_progress')->count(),
                    'delayed' => $tasks->where('status', 'delayed')->count(),
                    'completed' => $tasks->where('status', 'completed')->count(),
                ],
            ],
        ];
    }

    private function buildTaskRecursiveData(ProjectTask $task, $allTasks, TaskProgressService $service): array
    {
        $children = $allTasks->where('parent_id', $task->id);
        $childData = [];
        
        foreach ($children as $child) {
            $childData[] = $this->buildTaskRecursiveData($child, $allTasks, $service);
        }

        return [
            'id' => $task->id,
            'name' => $task->name,
            'start_date' => $task->start_date?->toDateString(),
            'end_date' => $task->end_date?->toDateString(),
            'progress_percentage' => (float) ($task->progress_percentage ?? 0),
            'status' => $task->status,
            'priority' => $task->priority,
            'has_children' => $children->isNotEmpty(),
            'children' => $childData,
        ];
    }

    /**
     * Detailed Multi-dimensional Revenue and Expense Report
     */
    public function getProjectRevenueExpenseDetailed(Project $project, ?string $fromDate = null, ?string $toDate = null): array
    {
        $financialService = app(FinancialCalculationService::class);
        
        $revenue = $financialService->calculateRevenue($project);
        $costs = $financialService->calculateTotalCosts($project);
        $profit = $financialService->calculateProfit($project);

        // Group by Cost Group
        $costsByGroup = Cost::where('project_id', $project->id)
            ->where('status', 'approved')
            ->with('costGroup')
            ->select('cost_group_id', DB::raw('SUM(amount) as total'))
            ->groupBy('cost_group_id')
            ->get()
            ->map(fn($item) => [
                'id' => $item->cost_group_id,
                'name' => $item->costGroup ? $item->costGroup->name : 'Chưa phân loại',
                'amount' => (float) $item->total,
            ]);

        // Monthly Stats
        $monthlyStats = [];
        $startDate = $fromDate ? Carbon::parse($fromDate) : Carbon::parse($project->start_date ?? now()->subMonths(6));
        $endDate = $toDate ? Carbon::parse($toDate) : now();

        $current = $startDate->copy()->startOfMonth();
        while ($current <= $endDate) {
            $monthStart = $current->copy()->startOfMonth();
            $monthEnd = $current->copy()->endOfMonth();

            $monthRevenue = ProjectPayment::where('project_id', $project->id)
                ->whereBetween('paid_date', [$monthStart, $monthEnd])
                ->where('status', 'paid')
                ->sum('amount');

            $monthExpenses = Cost::where('project_id', $project->id)
                ->where('status', 'approved')
                ->whereBetween('cost_date', [$monthStart, $monthEnd])
                ->sum('amount');

            $monthlyStats[] = [
                'month' => $current->format('Y-m'),
                'month_label' => $current->format('m/Y'),
                'revenue' => (float) $monthRevenue,
                'expenses' => (float) $monthExpenses,
                'profit' => (float) $monthRevenue - (float) $monthExpenses,
            ];

            $current->addMonth();
        }

        return [
            'summary' => [
                'total_revenue' => $revenue['total_revenue'] ?? 0,
                'total_expenses' => $costs['total_costs'] ?? 0,
                'total_profit' => $profit['profit'] ?? 0,
                'profit_margin' => $profit['profit_margin'] ?? 0,
            ],
            'revenue_breakdown' => $revenue,
            'costs_breakdown' => [
                'by_group' => $costsByGroup,
                'total_costs' => (float) ($costs['total_costs'] ?? 0),
            ],
            'monthly_statistics' => $monthlyStats,
        ];
    }

    /**
     * Material usage statistics and comparison.
     */
    public function getMaterialUsageStats(string $projectId, string $fromDate, string $toDate): array
    {
        $outTransactions = MaterialTransaction::where('project_id', $projectId)
            ->where('type', 'out')
            ->whereBetween('transaction_date', [$fromDate, $toDate])
            ->with(['material', 'creator'])
            ->orderBy('transaction_date', 'desc')
            ->get();

        $materialStats = MaterialTransaction::where('project_id', $projectId)
            ->where('type', 'out')
            ->whereBetween('transaction_date', [$fromDate, $toDate])
            ->select('material_id', DB::raw('SUM(quantity) as total_quantity'), DB::raw('SUM(total_amount) as total_amount'))
            ->groupBy('material_id')
            ->with('material')
            ->get()
            ->map(fn($item) => [
                'material' => [
                    'id' => $item->material->id,
                    'name' => $item->material->name,
                    'code' => $item->material->code,
                    'unit' => $item->material->unit,
                ],
                'total_quantity' => (float) $item->total_quantity,
                'total_amount' => (float) $item->total_amount,
            ]);

        return [
            'summary' => [
                'total_transactions' => $outTransactions->count(),
                'total_quantity' => (float) $outTransactions->sum('quantity'),
                'total_amount' => (float) $outTransactions->sum('total_amount'),
            ],
            'transactions' => $outTransactions,
            'material_statistics' => $materialStats,
        ];
    }

    /**
     * Construction logs summary and analysis.
     */
    public function getConstructionLogsSummary(string $projectId, string $fromDate, string $toDate): array
    {
        $logs = ConstructionLog::where('project_id', $projectId)
            ->whereBetween('log_date', [$fromDate, $toDate])
            ->with(['creator'])
            ->orderBy('log_date', 'desc')
            ->get();

        $weatherStats = $logs->groupBy('weather')
            ->map(fn($group, $weather) => [
                'weather' => $weather ?? 'Không xác định',
                'count' => $group->count(),
                'avg_progress' => round($group->avg('completion_percentage') ?? 0, 2),
            ])
            ->values();

        return [
            'summary' => [
                'total_logs' => $logs->count(),
                'average_progress' => round($logs->avg('completion_percentage') ?? 0, 2),
                'average_personnel' => round($logs->avg('personnel_count') ?? 0, 0),
            ],
            'logs' => $logs,
            'weather_statistics' => $weatherStats,
        ];
    }

    /**
     * Get comprehensive dashboard metrics for CRM Home.
     */
    public function getDashboardMetrics(): array
    {
        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();

        // 1. Core Summary Stats
        $totalProjects = Project::count();
        $activeProjects = Project::where('status', 'in_progress')->count();
        $completedProjects = Project::where('status', 'completed')->count();
        $planningProjects = Project::where('status', 'planning')->count();
        $totalEmployees = \App\Models\User::count();

        // Revenue
        $totalRevenue = \App\Models\Contract::sum('contract_value') ?: 0;
        $monthRevenue = \App\Models\Contract::whereHas('project', function ($q) use ($startOfMonth) {
            $q->where('created_at', '>=', $startOfMonth);
        })->sum('contract_value') ?: 0;

        // Costs
        $totalCosts = Cost::where('status', 'approved')->sum('amount') ?: 0;
        $monthCosts = Cost::where('status', 'approved')
            ->where('created_at', '>=', $startOfMonth)
            ->sum('amount') ?: 0;

        $profit = $totalRevenue - $totalCosts;
        $profitMargin = $totalRevenue > 0 ? round(($profit / $totalRevenue) * 100, 1) : 0;

        // 2. 12-month Trends
        $revenueByMonth = [];
        $costByMonth = [];
        $profitByMonth = [];
        $labels12m = [];

        for ($i = 11; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $labels12m[] = 'T' . $month->format('m');
            $monthStart = $month->copy()->startOfMonth();
            $monthEnd = $month->copy()->endOfMonth();

            $rev = \App\Models\Contract::whereHas('project', function ($q) use ($monthStart, $monthEnd) {
                $q->whereBetween('created_at', [$monthStart, $monthEnd]);
            })->sum('contract_value') ?: 0;

            $cost = Cost::where('status', 'approved')
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->sum('amount') ?: 0;

            $revenueByMonth[] = $rev;
            $costByMonth[] = $cost;
            $profitByMonth[] = $rev - $cost;
        }

        // 3. Distributions
        $projectStatuses = Project::selectRaw('status, COUNT(*) as count')->groupBy('status')->pluck('count', 'status')->toArray();
        $statusLabels = ['planning' => 'Lập kế hoạch', 'in_progress' => 'Đang thi công', 'completed' => 'Hoàn thành', 'suspended' => 'Tạm dừng', 'cancelled' => 'Hủy bỏ'];
        
        $projectStatusChart = ['labels' => [], 'data' => []];
        foreach ($projectStatuses as $status => $count) {
            $projectStatusChart['labels'][] = $statusLabels[$status] ?? $status;
            $projectStatusChart['data'][] = $count;
        }

        $costByGroupRaw = Cost::select('cost_group_id', DB::raw('SUM(amount) as total'))
            ->where('status', 'approved')
            ->whereNotNull('cost_group_id')
            ->groupBy('cost_group_id')
            ->orderByDesc('total')
            ->limit(8)
            ->with('costGroup:id,name')
            ->get();

        $costGroupChart = [
            'labels' => $costByGroupRaw->pluck('costGroup.name')->toArray(),
            'data' => $costByGroupRaw->pluck('total')->toArray(),
        ];

        // 4. Budget Utilization
        $budgetUtilization = Project::select('id', 'name')
            ->whereHas('contract')
            ->with('contract:id,project_id,contract_value')
            ->withSum(['costs' => fn($q) => $q->where('status', 'approved')], 'amount')
            ->limit(6)->get()->filter(fn($p) => $p->contract && $p->contract->contract_value > 0)
            ->map(fn($p) => [
                'name' => mb_strlen($p->name) > 18 ? mb_substr($p->name, 0, 18) . '...' : $p->name,
                'spent' => $p->costs_sum_amount ?? 0,
                'budget' => $p->contract->contract_value,
                'pct' => round(($p->costs_sum_amount ?? 0) / $p->contract->contract_value * 100, 1),
            ]);

        return [
            'stats' => [
                'totalProjects' => $totalProjects,
                'activeProjects' => $activeProjects,
                'completedProjects' => $completedProjects,
                'planningProjects' => $planningProjects,
                'totalEmployees' => $totalEmployees,
                'totalRevenue' => $totalRevenue,
                'monthRevenue' => $monthRevenue,
                'totalCosts' => $totalCosts,
                'monthCosts' => $monthCosts,
                'profit' => $profit,
                'profitMargin' => $profitMargin,
            ],
            'charts' => [
                'revenueChart' => [
                    'labels' => $labels12m,
                    'revenue' => $revenueByMonth,
                    'cost' => $costByMonth,
                    'profit' => $profitByMonth,
                ],
                'projectStatus' => $projectStatusChart,
                'costByType' => $costGroupChart,
                'budgetUtilization' => [
                    'labels' => $budgetUtilization->pluck('name')->values()->toArray(),
                    'spent' => $budgetUtilization->pluck('spent')->values()->toArray(),
                    'budget' => $budgetUtilization->pluck('budget')->values()->toArray(),
                    'pct' => $budgetUtilization->pluck('pct')->values()->toArray(),
                ],
            ],
        ];
    }
}
