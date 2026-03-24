<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Cost;
use App\Models\Contract;
use App\Models\ProjectPayment;
use App\Models\ProjectPhase;
use App\Models\Equipment;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CrmReportController extends Controller
{
    public function index(Request $request)
    {
        $now = Carbon::now();
        $year = $request->get('year', $now->year);
        $startOfYear = Carbon::createFromDate($year, 1, 1)->startOfYear();
        $endOfYear = Carbon::createFromDate($year, 12, 31)->endOfYear();

        // ============================================================
        // 1. OVERVIEW STATS
        // ============================================================
        $stats = $this->getOverviewStats($startOfYear, $endOfYear);

        // ============================================================
        // 2. REVENUE & COST BY MONTH (Bar + Line Chart)
        // ============================================================
        $revenueVsCost = $this->getRevenueVsCostByMonth($year);

        // ============================================================
        // 3. PROJECT STATUS BREAKDOWN (Donut Chart)
        // ============================================================
        $projectStatus = $this->getProjectStatusBreakdown();

        // ============================================================
        // 4. COST BY GROUP (Horizontal Bar)
        // ============================================================
        $costByGroup = $this->getCostByGroup($startOfYear, $endOfYear);

        // ============================================================
        // 5. TOP PROJECTS BY VALUE (Table)
        // ============================================================
        $topProjects = $this->getTopProjects();

        // ============================================================
        // 6. COST TREND (Line Chart - 12 months)
        // ============================================================
        $costTrend = $this->getCostTrend($year);

        // ============================================================
        // 7. PROJECT TIMELINE (Gantt-style data)
        // ============================================================
        $projectTimelines = $this->getProjectTimelines();

        // ============================================================
        // 8. PAYMENT PROGRESS per project
        // ============================================================
        $paymentProgress = $this->getPaymentProgress();

        // ============================================================
        // 9. PENDING COSTS SUMMARY
        // ============================================================
        $pendingApprovals = $this->getPendingApprovals();

        // ============================================================
        // 10. AVAILABLE YEARS for filter
        // ============================================================
        $availableYears = Project::selectRaw('DISTINCT YEAR(created_at) as year')
            ->orderByDesc('year')
            ->pluck('year')
            ->toArray();

        if (empty($availableYears)) {
            $availableYears = [$now->year];
        }

        return Inertia::render('Crm/Reports/Index', [
            'stats' => $stats,
            'charts' => [
                'revenueVsCost' => $revenueVsCost,
                'projectStatus' => $projectStatus,
                'costByGroup' => $costByGroup,
                'costTrend' => $costTrend,
            ],
            'topProjects' => $topProjects,
            'projectTimelines' => $projectTimelines,
            'paymentProgress' => $paymentProgress,
            'pendingApprovals' => $pendingApprovals,
            'filters' => [
                'year' => (int) $year,
                'availableYears' => $availableYears,
            ],
        ]);
    }

    // ============================================================
    // PRIVATE HELPERS
    // ============================================================

    private function getOverviewStats($startOfYear, $endOfYear)
    {
        $totalProjects = Project::count();
        $activeProjects = Project::where('status', 'in_progress')->count();
        $completedProjects = Project::where('status', 'completed')->count();
        $planningProjects = Project::where('status', 'planning')->count();

        $totalContractValue = Contract::sum('contract_value') ?: 0;
        $yearContractValue = Contract::whereBetween('created_at', [$startOfYear, $endOfYear])
            ->sum('contract_value') ?: 0;

        $totalCosts = Cost::where('status', '!=', 'rejected')->sum('amount') ?: 0;
        $yearCosts = Cost::where('status', '!=', 'rejected')
            ->whereBetween('created_at', [$startOfYear, $endOfYear])
            ->sum('amount') ?: 0;

        $totalPayments = ProjectPayment::sum('amount') ?: 0;
        $pendingCostsCount = Cost::whereIn('status', ['pending_management_approval', 'pending_accountant_approval'])->count();
        $pendingCostsAmount = Cost::whereIn('status', ['pending_management_approval', 'pending_accountant_approval'])->sum('amount') ?: 0;

        $profit = $totalContractValue - $totalCosts;
        $profitMargin = $totalContractValue > 0 ? round(($profit / $totalContractValue) * 100, 1) : 0;

        return [
            'totalProjects' => $totalProjects,
            'activeProjects' => $activeProjects,
            'completedProjects' => $completedProjects,
            'planningProjects' => $planningProjects,
            'totalContractValue' => $totalContractValue,
            'yearContractValue' => $yearContractValue,
            'totalCosts' => $totalCosts,
            'yearCosts' => $yearCosts,
            'totalPayments' => $totalPayments,
            'profit' => $profit,
            'profitMargin' => $profitMargin,
            'pendingCostsCount' => $pendingCostsCount,
            'pendingCostsAmount' => $pendingCostsAmount,
            'totalEmployees' => User::count(),
        ];
    }

    private function getRevenueVsCostByMonth($year)
    {
        $labels = [];
        $revenue = [];
        $costs = [];
        $profit = [];

        for ($m = 1; $m <= 12; $m++) {
            $monthStart = Carbon::createFromDate($year, $m, 1)->startOfMonth();
            $monthEnd = $monthStart->copy()->endOfMonth();

            $labels[] = "Tháng $m";

            $monthRevenue = Contract::whereHas('project', function ($q) use ($monthStart, $monthEnd) {
                $q->whereBetween('created_at', [$monthStart, $monthEnd]);
            })->sum('contract_value') ?: 0;

            $monthCost = Cost::whereBetween('created_at', [$monthStart, $monthEnd])
                ->where('status', '!=', 'rejected')
                ->sum('amount') ?: 0;

            $revenue[] = $monthRevenue;
            $costs[] = $monthCost;
            $profit[] = $monthRevenue - $monthCost;
        }

        return compact('labels', 'revenue', 'costs', 'profit');
    }

    private function getProjectStatusBreakdown()
    {
        $statusLabels = [
            'planning' => 'Lập kế hoạch',
            'in_progress' => 'Đang thi công',
            'completed' => 'Hoàn thành',
            'suspended' => 'Tạm dừng',
            'cancelled' => 'Hủy bỏ',
        ];

        $statuses = Project::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        return [
            'labels' => array_map(fn($s) => $statusLabels[$s] ?? $s, array_keys($statuses)),
            'data' => array_values($statuses),
        ];
    }

    private function getCostByGroup($startOfYear, $endOfYear)
    {
        $groups = Cost::leftJoin('cost_groups', 'costs.cost_group_id', '=', 'cost_groups.id')
            ->selectRaw("COALESCE(cost_groups.name, 'Chưa phân nhóm') as group_name, SUM(costs.amount) as total")
            ->where('costs.status', '!=', 'rejected')
            ->whereBetween('costs.created_at', [$startOfYear, $endOfYear])
            ->groupBy('group_name')
            ->orderByDesc('total')
            ->limit(8)
            ->get();

        return [
            'labels' => $groups->pluck('group_name')->toArray(),
            'data' => $groups->pluck('total')->map(fn($v) => (float) $v)->toArray(),
        ];
    }

    private function getCostTrend($year)
    {
        $labels = [];
        $approved = [];
        $pending = [];
        $rejected = [];

        for ($m = 1; $m <= 12; $m++) {
            $monthStart = Carbon::createFromDate($year, $m, 1)->startOfMonth();
            $monthEnd = $monthStart->copy()->endOfMonth();

            $labels[] = "T$m";

            $approved[] = Cost::where('status', 'approved')
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->sum('amount') ?: 0;

            $pending[] = Cost::whereIn('status', ['pending_management_approval', 'pending_accountant_approval'])
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->sum('amount') ?: 0;

            $rejected[] = Cost::where('status', 'rejected')
                ->whereBetween('created_at', [$monthStart, $monthEnd])
                ->sum('amount') ?: 0;
        }

        return compact('labels', 'approved', 'pending', 'rejected');
    }

    private function getTopProjects()
    {
        return Project::with([
            'contract:id,project_id,contract_value',
            'projectManager:id,name',
        ])
            ->withSum(['costs as total_costs' => function ($q) {
                $q->where('status', '!=', 'rejected');
            }], 'amount')
            ->withCount('costs')
            ->whereHas('contract')
            ->orderByDesc('total_costs')
            ->take(10)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'code' => $p->code,
                'status' => $p->status,
                'manager' => $p->projectManager->name ?? '—',
                'contract_value' => $p->contract->contract_value ?? 0,
                'total_costs' => (float) ($p->total_costs ?? 0),
                'costs_count' => $p->costs_count,
                'profit' => ($p->contract->contract_value ?? 0) - (float) ($p->total_costs ?? 0),
                'profit_margin' => ($p->contract->contract_value ?? 0) > 0
                    ? round((($p->contract->contract_value - (float) ($p->total_costs ?? 0)) / $p->contract->contract_value) * 100, 1)
                    : 0,
                'start_date' => $p->start_date?->format('d/m/Y'),
                'end_date' => $p->end_date?->format('d/m/Y'),
            ]);
    }

    private function getProjectTimelines()
    {
        return Project::whereIn('status', ['planning', 'in_progress'])
            ->with('projectManager:id,name')
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->orderBy('start_date')
            ->take(10)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'code' => $p->code,
                'status' => $p->status,
                'manager' => $p->projectManager->name ?? '—',
                'start_date' => $p->start_date->format('Y-m-d'),
                'end_date' => $p->end_date->format('Y-m-d'),
                'days_total' => $p->start_date->diffInDays($p->end_date),
                'days_elapsed' => $p->start_date->diffInDays(now()),
                'progress_pct' => $p->end_date->isPast()
                    ? 100
                    : ($p->start_date->isFuture() ? 0 : round(($p->start_date->diffInDays(now()) / max($p->start_date->diffInDays($p->end_date), 1)) * 100)),
            ]);
    }

    private function getPaymentProgress()
    {
        return Project::with(['contract:id,project_id,contract_value'])
            ->withSum('payments', 'amount')
            ->whereHas('contract')
            ->orderByDesc('created_at')
            ->take(10)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'code' => $p->code,
                'contract_value' => $p->contract->contract_value ?? 0,
                'total_paid' => (float) ($p->payments_sum_amount ?? 0),
                'remaining' => ($p->contract->contract_value ?? 0) - (float) ($p->payments_sum_amount ?? 0),
                'paid_pct' => ($p->contract->contract_value ?? 0) > 0
                    ? round(((float) ($p->payments_sum_amount ?? 0) / $p->contract->contract_value) * 100, 1)
                    : 0,
            ]);
    }

    private function getPendingApprovals()
    {
        $pendingManagement = Cost::where('status', 'pending_management_approval')
            ->with(['creator:id,name', 'costGroup:id,name'])
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'amount' => (float) $c->amount,
                'creator' => $c->creator->name ?? 'N/A',
                'group' => $c->costGroup->name ?? 'N/A',
                'created_at' => $c->created_at->format('d/m/Y'),
                'level' => 'management',
            ]);

        $pendingAccountant = Cost::where('status', 'pending_accountant_approval')
            ->with(['creator:id,name', 'costGroup:id,name'])
            ->orderByDesc('created_at')
            ->take(5)
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'amount' => (float) $c->amount,
                'creator' => $c->creator->name ?? 'N/A',
                'group' => $c->costGroup->name ?? 'N/A',
                'created_at' => $c->created_at->format('d/m/Y'),
                'level' => 'accountant',
            ]);

        return [
            'management' => $pendingManagement,
            'accountant' => $pendingAccountant,
            'total' => $pendingManagement->count() + $pendingAccountant->count(),
        ];
    }
}
