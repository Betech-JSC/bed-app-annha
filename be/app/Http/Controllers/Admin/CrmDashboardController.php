<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Constants\Permissions;
use App\Models\Project;
use App\Models\User;
use App\Models\Cost;
use App\Models\Equipment;
use App\Models\Contract;
use App\Models\Invoice;
use App\Models\Notification;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CrmDashboardController extends Controller
{
    use CrmAuthorization;

    public function index()
    {
        $this->crmRequire(Auth::guard('admin')->user(), Permissions::DASHBOARD_VIEW);

        $now = Carbon::now();
        $startOfMonth = $now->copy()->startOfMonth();
        $startOfYear = $now->copy()->startOfYear();

        // ============================================================
        // STATS (enhanced)
        // ============================================================
        $totalProjects = Project::count();
        $activeProjects = Project::where('status', 'in_progress')->count();
        $completedProjects = Project::where('status', 'completed')->count();
        $planningProjects = Project::where('status', 'planning')->count();
        $totalEmployees = User::count();

        // Revenue
        $totalRevenue = Contract::sum('contract_value') ?: 0;
        $monthRevenue = Contract::whereHas('project', function ($q) use ($startOfMonth) {
            $q->where('created_at', '>=', $startOfMonth);
        })->sum('contract_value') ?: 0;

        // Costs (Only 'approved' counts as actual expenditure)
        $totalCosts = Cost::where('status', 'approved')->sum('amount') ?: 0;
        $monthCosts = Cost::where('status', 'approved')
            ->where('created_at', '>=', $startOfMonth)
            ->sum('amount') ?: 0;


        // Profit
        $profit = $totalRevenue - $totalCosts;
        $profitMargin = $totalRevenue > 0 ? round(($profit / $totalRevenue) * 100, 1) : 0;

        // Notifications
        $unreadNotifications = 0;
        if (class_exists(Notification::class)) {
            $unreadNotifications = Notification::where('status', 'unread')->count();
        }

        // ============================================================
        // CHART 1: Revenue & Cost (12 months — Area Line)
        // ============================================================
        $revenueByMonth = [];
        $costByMonth = [];
        $profitByMonth = [];
        $labels12m = [];

        for ($i = 11; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $labels12m[] = 'T' . $month->format('m');

            $monthStart = $month->copy()->startOfMonth();
            $monthEnd = $month->copy()->endOfMonth();

            $rev = Contract::whereHas('project', function ($q) use ($monthStart, $monthEnd) {
                $q->whereBetween('created_at', [$monthStart, $monthEnd]);
            })->sum('contract_value') ?: 0;

            $cost = Cost::whereBetween('created_at', [$monthStart, $monthEnd])
                ->where('status', 'approved')
                ->sum('amount') ?: 0;

            $revenueByMonth[] = $rev;
            $costByMonth[] = $cost;
            $profitByMonth[] = $rev - $cost;
        }

        // ============================================================
        // CHART 2: Project Status (Doughnut)
        // ============================================================
        $projectStatuses = Project::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $statusLabels = [
            'planning' => 'Lập kế hoạch',
            'in_progress' => 'Đang thi công',
            'completed' => 'Hoàn thành',
            'suspended' => 'Tạm dừng',
            'cancelled' => 'Hủy bỏ',
        ];

        $projectStatusChart = ['labels' => [], 'data' => []];
        foreach ($projectStatuses as $status => $count) {
            $projectStatusChart['labels'][] = $statusLabels[$status] ?? $status;
            $projectStatusChart['data'][] = $count;
        }

        // ============================================================
        // CHART 3: Cost by Group (Horizontal Bar)
        // ============================================================
        $costByGroup = [];
        if (class_exists(\App\Models\CostGroup::class)) {
            $costByGroup = Cost::select('cost_group_id', DB::raw('SUM(amount) as total'))
                ->where('status', 'approved')
                ->whereNotNull('cost_group_id')
                ->groupBy('cost_group_id')
                ->orderByDesc('total')
                ->limit(8)
                ->with('costGroup:id,name')
                ->get()
                ->map(fn($c) => [
                    'label' => $c->costGroup->name ?? 'Khác',
                    'value' => $c->total,
                ]);
        }

        if (empty($costByGroup) || (is_object($costByGroup) && $costByGroup->isEmpty())) {
            // Fallback to category field
            $costByGroup = Cost::selectRaw("COALESCE(category, 'Khác') as label, SUM(amount) as value")
                ->where('status', 'approved')
                ->groupBy('category')
                ->orderByDesc('value')
                ->limit(8)
                ->get()
                ->map(fn($c) => [
                    'label' => ucfirst($c->label),
                    'value' => $c->value,
                ]);
        }

        $costGroupChart = [
            'labels' => collect($costByGroup)->pluck('label')->toArray(),
            'data' => collect($costByGroup)->pluck('value')->toArray(),
        ];

        // ============================================================
        // CHART 4: Cost Approval Status (Donut — mini)
        // ============================================================
        $costStatusCounts = Cost::selectRaw('status, COUNT(*) as cnt')
            ->groupBy('status')
            ->pluck('cnt', 'status')
            ->toArray();

        $costStatusLabels = [
            'draft' => 'Nháp',
            'pending_management' => 'Chờ BĐH',
            'pending_accountant' => 'Chờ KT',
            'approved' => 'Đã duyệt',
            'rejected' => 'Từ chối',
        ];

        $costStatusChart = ['labels' => [], 'data' => [], 'colors' => []];
        $costStatusColors = [
            'draft' => '#9CA3AF',
            'pending_management' => '#F59E0B',
            'pending_accountant' => '#3B82F6',
            'approved' => '#10B981',
            'rejected' => '#EF4444',
        ];

        foreach ($costStatusCounts as $st => $cnt) {
            $costStatusChart['labels'][] = $costStatusLabels[$st] ?? $st;
            $costStatusChart['data'][] = $cnt;
            $costStatusChart['colors'][] = $costStatusColors[$st] ?? '#9CA3AF';
        }

        // ============================================================
        // CHART 5: Monthly New Projects (Bar)
        // ============================================================
        $newProjectsByMonth = [];
        $labelsNewProjects = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $labelsNewProjects[] = 'T' . $month->format('m');
            $monthStart = $month->copy()->startOfMonth();
            $monthEnd = $month->copy()->endOfMonth();
            $newProjectsByMonth[] = Project::whereBetween('created_at', [$monthStart, $monthEnd])->count();
        }

        // ============================================================
        // CHART 6: Top 5 Projects by Cost (Bar)
        // ============================================================
        $topProjectsByCost = Project::select('projects.id', 'projects.name', 'projects.code')
            ->withSum(['costs' => fn($q) => $q->where('status', 'approved')], 'amount')
            ->having('costs_sum_amount', '>', 0)
            ->orderByDesc('costs_sum_amount')
            ->limit(5)
            ->get()
            ->map(fn($p) => [
                'name' => mb_strlen($p->name) > 20 ? mb_substr($p->name, 0, 20) . '...' : $p->name,
                'cost' => $p->costs_sum_amount ?? 0,
                'code' => $p->code,
            ]);

        $topProjectsCostChart = [
            'labels' => $topProjectsByCost->pluck('name')->toArray(),
            'data' => $topProjectsByCost->pluck('cost')->toArray(),
        ];

        // ============================================================
        // CHART 7: Budget Utilization per project (% spent vs contract)
        // ============================================================
        $budgetUtilization = Project::select('projects.id', 'projects.name')
            ->whereHas('contract')
            ->with('contract:id,project_id,contract_value')
            ->withSum(['costs' => fn($q) => $q->where('status', 'approved')], 'amount')
            ->limit(6)
            ->get()
            ->filter(fn($p) => $p->contract && $p->contract->contract_value > 0)
            ->map(fn($p) => [
                'name' => mb_strlen($p->name) > 18 ? mb_substr($p->name, 0, 18) . '...' : $p->name,
                'spent' => $p->costs_sum_amount ?? 0,
                'budget' => $p->contract->contract_value,
                'pct' => round(($p->costs_sum_amount ?? 0) / $p->contract->contract_value * 100, 1),
            ]);

        $budgetChart = [
            'labels' => $budgetUtilization->pluck('name')->values()->toArray(),
            'spent' => $budgetUtilization->pluck('spent')->values()->toArray(),
            'budget' => $budgetUtilization->pluck('budget')->values()->toArray(),
            'pct' => $budgetUtilization->pluck('pct')->values()->toArray(),
        ];

        // ============================================================
        // Recent Projects
        // ============================================================
        $recentProjects = Project::with(['projectManager:id,name', 'contract:id,project_id,contract_value'])
            ->latest()
            ->take(6)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'code' => $p->code,
                'status' => $p->status,
                'manager' => $p->projectManager->name ?? '—',
                'contract_value' => $p->contract->contract_value ?? 0,
                'start_date' => $p->start_date?->format('d/m/Y'),
                'end_date' => $p->end_date?->format('d/m/Y'),
            ]);

        // ============================================================
        // RENDER
        // ============================================================
        return Inertia::render('Crm/Dashboard/Index', [
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
                'unreadNotifications' => $unreadNotifications,
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
                'costStatus' => $costStatusChart,
                'newProjects' => [
                    'labels' => $labelsNewProjects,
                    'data' => $newProjectsByMonth,
                ],
                'topProjectsCost' => $topProjectsCostChart,
                'budgetUtilization' => $budgetChart,
            ],
            'recentProjects' => $recentProjects,
        ]);
    }
}
