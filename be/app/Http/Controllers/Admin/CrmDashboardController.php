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
use App\Models\Subcontractor;
use App\Models\SubcontractorPayment;
use App\Models\ProjectPayment;
use App\Models\Approval;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CrmDashboardController extends Controller
{

    protected $reportingService;

    public function __construct(
        \App\Services\ProjectReportingService $reportingService
    ) {
        $this->reportingService = $reportingService;
    }

    public function index(Request $request)
    {
        $user = Auth::guard('admin')->user();
        if (!$user->hasPermission(Permissions::DASHBOARD_VIEW)) {
            return redirect('/projects');
        }

        // ── Period Filter ──────────────────────────────────────
        $period = $request->get('period', 'month'); // month, quarter, year, custom
        $compare = $request->boolean('compare', false);

        $now = Carbon::now();
        [$periodStart, $periodEnd, $prevStart, $prevEnd] = $this->resolvePeriodRange($period, $now, $request);

        // ── Get centralized metrics from service ──────────────
        $metrics = $this->reportingService->getDashboardMetrics();

        // ── Period-filtered stats ─────────────────────────────
        $periodStats = $this->getPeriodStats($periodStart, $periodEnd);
        $prevStats = $compare ? $this->getPeriodStats($prevStart, $prevEnd) : null;

        // ── Additional data points for CEO dashboard ──────────
        $pendingCosts = Cost::whereIn('status', ['pending_management_approval', 'pending_accountant_approval'])->count();
        $pendingCostsAmount = Cost::whereIn('status', ['pending_management_approval', 'pending_accountant_approval'])->sum('amount');

        $totalEquipment = Equipment::count();
        $activeEquipment = Equipment::where('status', 'active')->count();

        $paidPayments = ProjectPayment::where('status', 'paid')->sum('amount');
        $periodPaidPayments = ProjectPayment::where('status', 'paid')
            ->whereBetween('paid_date', [$periodStart, $periodEnd])
            ->sum('amount');

        // Subcontractor debt
        $subDebtData = $this->getSubcontractorDebtSummary();

        // Project progress for active projects
        $projectProgress = $this->getActiveProjectProgress();

        // Pending costs list (top 5)
        $pendingCostsList = Cost::whereIn('status', ['pending_management_approval', 'pending_accountant_approval'])
            ->with(['project:id,name,code', 'creator:id,name', 'costGroup:id,name'])
            ->orderByDesc('amount')
            ->take(5)
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'amount' => $c->amount,
                'status' => $c->status,
                'project' => $c->project?->name ?? '—',
                'project_id' => $c->project_id,
                'creator' => $c->creator?->name ?? '—',
                'group' => $c->costGroup?->name ?? '—',
                'created_at' => $c->created_at?->format('d/m/Y'),
            ]);

        // Monthly revenue vs cost comparison (stacked bar)
        $monthlyComparison = $this->getMonthlyRevenueVsCost(6);

        // Recent Projects
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

        // RENDER
        return Inertia::render('Crm/Dashboard/Index', [
            'stats' => array_merge($metrics['stats'], [
                'unreadNotifications' => class_exists(Notification::class) ? Notification::where('status', 'unread')->count() : 0,
                'pendingCosts' => $pendingCosts,
                'pendingCostsAmount' => (float) $pendingCostsAmount,
                'totalEquipment' => $totalEquipment,
                'activeEquipment' => $activeEquipment,
                'paidPayments' => (float) $paidPayments,
                'totalSubcontractorDebt' => (float) $subDebtData['total'],
            ]),
            'charts' => array_merge($metrics['charts'], [
                'costStatus' => $this->getCostStatusStats(),
                'newProjects' => $this->getNewProjectsTrend(),
                'topProjectsCost' => $this->getTopProjectsByCost(),
                'monthlyComparison' => $monthlyComparison,
            ]),
            'periodStats' => $periodStats,
            'prevPeriodStats' => $prevStats,
            'projectProgress' => $projectProgress,
            'pendingCostsList' => $pendingCostsList,
            'subcontractorDebt' => $subDebtData['details'],
            'recentProjects' => $recentProjects,
            'filters' => [
                'period' => $period,
                'compare' => $compare,
                'periodLabel' => $this->getPeriodLabel($period, $periodStart, $periodEnd),
                'prevLabel' => $compare ? $this->getPeriodLabel($period, $prevStart, $prevEnd) : null,
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════════
    // PERIOD RESOLUTION
    // ══════════════════════════════════════════════════════════════

    private function resolvePeriodRange(string $period, Carbon $now, Request $request): array
    {
        switch ($period) {
            case 'quarter':
                $start = $now->copy()->startOfQuarter();
                $end = $now->copy()->endOfQuarter();
                $prevStart = $start->copy()->subQuarter();
                $prevEnd = $end->copy()->subQuarter();
                break;
            case 'year':
                $start = $now->copy()->startOfYear();
                $end = $now->copy()->endOfYear();
                $prevStart = $start->copy()->subYear();
                $prevEnd = $end->copy()->subYear();
                break;
            case 'custom':
                $start = Carbon::parse($request->get('from', $now->copy()->startOfMonth()));
                $end = Carbon::parse($request->get('to', $now));
                $diff = $start->diffInDays($end);
                $prevStart = $start->copy()->subDays($diff + 1);
                $prevEnd = $start->copy()->subDay();
                break;
            default: // month
                $start = $now->copy()->startOfMonth();
                $end = $now->copy()->endOfMonth();
                $prevStart = $start->copy()->subMonth();
                $prevEnd = $end->copy()->subMonth();
                break;
        }
        return [$start, $end, $prevStart, $prevEnd];
    }

    private function getPeriodLabel(string $period, Carbon $start, Carbon $end): string
    {
        return match ($period) {
            'quarter' => 'Q' . $start->quarter . '/' . $start->year,
            'year' => 'Năm ' . $start->year,
            'custom' => $start->format('d/m/Y') . ' - ' . $end->format('d/m/Y'),
            default => 'T' . $start->format('m/Y'),
        };
    }

    // ══════════════════════════════════════════════════════════════
    // PERIOD-FILTERED STATS
    // ══════════════════════════════════════════════════════════════

    private function getPeriodStats(Carbon $start, Carbon $end): array
    {
        $revenue = Contract::whereHas('project', fn($q) => $q->whereBetween('created_at', [$start, $end]))
            ->sum('contract_value') ?: 0;

        $costs = Cost::where('status', 'approved')
            ->whereBetween('cost_date', [$start, $end])
            ->sum('amount') ?: 0;

        $paidPayments = ProjectPayment::where('status', 'paid')
            ->whereBetween('paid_date', [$start, $end])
            ->sum('amount') ?: 0;

        $newProjects = Project::whereBetween('created_at', [$start, $end])->count();
        $completedProjects = Project::where('status', 'completed')
            ->whereBetween('updated_at', [$start, $end])
            ->count();

        return [
            'revenue' => (float) $revenue,
            'costs' => (float) $costs,
            'profit' => (float) ($revenue - $costs),
            'profitMargin' => $revenue > 0 ? round(($revenue - $costs) / $revenue * 100, 1) : 0,
            'paidPayments' => (float) $paidPayments,
            'newProjects' => $newProjects,
            'completedProjects' => $completedProjects,
        ];
    }

    // ══════════════════════════════════════════════════════════════
    // SUBCONTRACTOR DEBT
    // ══════════════════════════════════════════════════════════════

    private function getSubcontractorDebtSummary(): array
    {
        $subs = Subcontractor::select('id', 'name', 'project_id', 'total_quote')
            ->withSum(['payments' => fn($q) => $q->whereIn('status', ['paid', 'accountant_confirmed'])], 'amount')
            ->having(DB::raw('total_quote - COALESCE(payments_sum_amount, 0)'), '>', 0)
            ->orderByDesc(DB::raw('total_quote - COALESCE(payments_sum_amount, 0)'))
            ->limit(8)
            ->get();

        $details = $subs->map(fn($s) => [
            'id' => $s->id,
            'name' => mb_strlen($s->name) > 25 ? mb_substr($s->name, 0, 25) . '...' : $s->name,
            'total_quote' => (float) $s->total_quote,
            'paid' => (float) ($s->payments_sum_amount ?? 0),
            'debt' => (float) ($s->total_quote - ($s->payments_sum_amount ?? 0)),
        ]);

        return [
            'total' => $details->sum('debt'),
            'details' => $details->values()->toArray(),
        ];
    }

    // ══════════════════════════════════════════════════════════════
    // PROJECT PROGRESS
    // ══════════════════════════════════════════════════════════════

    private function getActiveProjectProgress(): array
    {
        return Project::where('status', 'in_progress')
            ->with(['progress:id,project_id,overall_percentage', 'projectManager:id,name'])
            ->take(8)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => mb_strlen($p->name) > 28 ? mb_substr($p->name, 0, 28) . '...' : $p->name,
                'code' => $p->code,
                'progress' => (float) ($p->progress->overall_percentage ?? 0),
                'manager' => $p->projectManager->name ?? '—',
                'end_date' => $p->end_date?->format('d/m/Y'),
                'is_overdue' => $p->end_date && $p->end_date->isPast(),
            ])->toArray();
    }

    // ══════════════════════════════════════════════════════════════
    // MONTHLY REVENUE VS COST (STACKED BAR)
    // ══════════════════════════════════════════════════════════════

    private function getMonthlyRevenueVsCost(int $months = 6): array
    {
        $now = Carbon::now();
        $labels = [];
        $revenue = [];
        $cost = [];

        for ($i = $months - 1; $i >= 0; $i--) {
            $m = $now->copy()->subMonths($i);
            $labels[] = 'T' . $m->format('m');
            $monthStart = $m->copy()->startOfMonth();
            $monthEnd = $m->copy()->endOfMonth();

            $revenue[] = (float) (ProjectPayment::where('status', 'paid')
                ->whereBetween('paid_date', [$monthStart, $monthEnd])
                ->sum('amount') ?: 0);

            $cost[] = (float) (Cost::where('status', 'approved')
                ->whereBetween('cost_date', [$monthStart, $monthEnd])
                ->sum('amount') ?: 0);
        }

        return compact('labels', 'revenue', 'cost');
    }

    // ══════════════════════════════════════════════════════════════
    // EXISTING HELPERS (kept)
    // ══════════════════════════════════════════════════════════════

    private function getCostStatusStats(): array
    {
        $counts = Cost::selectRaw('status, COUNT(*) as cnt')->groupBy('status')->pluck('cnt', 'status')->toArray();
        $labels = [
            'draft' => 'Nháp',
            'pending_management_approval' => 'Chờ BĐH',
            'pending_accountant_approval' => 'Chờ KT',
            'approved' => 'Đã duyệt',
            'rejected' => 'Từ chối',
        ];
        $colors = [
            'draft' => '#9CA3AF',
            'pending_management_approval' => '#F59E0B',
            'pending_accountant_approval' => '#3B82F6',
            'approved' => '#10B981',
            'rejected' => '#EF4444',
        ];

        $chart = ['labels' => [], 'data' => [], 'colors' => []];
        foreach ($counts as $st => $cnt) {
            $chart['labels'][] = $labels[$st] ?? $st;
            $chart['data'][] = $cnt;
            $chart['colors'][] = $colors[$st] ?? '#9CA3AF';
        }
        return $chart;
    }

    private function getNewProjectsTrend(): array
    {
        $now = Carbon::now();
        $data = []; $labels = [];
        for ($i = 5; $i >= 0; $i--) {
            $m = $now->copy()->subMonths($i);
            $labels[] = 'T' . $m->format('m');
            $data[] = Project::whereBetween('created_at', [$m->copy()->startOfMonth(), $m->copy()->endOfMonth()])->count();
        }
        return ['labels' => $labels, 'data' => $data];
    }

    private function getTopProjectsByCost(): array
    {
        $top = Project::select('id', 'name', 'code')
            ->withSum(['costs' => fn($q) => $q->where('status', 'approved')], 'amount')
            ->having('costs_sum_amount', '>', 0)
            ->orderByDesc('costs_sum_amount')
            ->limit(5)->get();

        return [
            'labels' => $top->pluck('name')->map(fn($n) => mb_strlen($n) > 20 ? mb_substr($n, 0, 20) . '...' : $n)->toArray(),
            'data' => $top->pluck('costs_sum_amount')->toArray(),
        ];
    }
}
