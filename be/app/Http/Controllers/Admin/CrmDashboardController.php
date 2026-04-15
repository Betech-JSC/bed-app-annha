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

    protected $reportingService;

    public function __construct(
        \App\Services\ProjectReportingService $reportingService
    ) {
        $this->reportingService = $reportingService;
    }

    public function index()
    {
        $user = Auth::guard('admin')->user();
        if (!$user->hasPermission(Permissions::DASHBOARD_VIEW)) {
            return redirect('/projects');
        }

        // Get centralized metrics from service
        $metrics = $this->reportingService->getDashboardMetrics();

        // Recent Projects (still kept in controller as it's a simple CRUD fetch with pagination/limit)
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
        // Note: We merge service metrics with local controller data (recent projects)
        return Inertia::render('Crm/Dashboard/Index', [
            'stats' => array_merge($metrics['stats'], [
                'unreadNotifications' => class_exists(Notification::class) ? Notification::where('status', 'unread')->count() : 0,
            ]),
            'charts' => array_merge($metrics['charts'], [
                // Minimal chart logic kept for cost approval status if not in service
                'costStatus' => $this->getCostStatusStats(),
                'newProjects' => $this->getNewProjectsTrend(),
                'topProjectsCost' => $this->getTopProjectsByCost(),
            ]),
            'recentProjects' => $recentProjects,
        ]);
    }

    /**
     * Helper for mini Charts not yet in reporting service
     */
    private function getCostStatusStats(): array
    {
        $counts = Cost::selectRaw('status, COUNT(*) as cnt')->groupBy('status')->pluck('cnt', 'status')->toArray();
        $labels = ['draft' => 'Nháp', 'pending_management' => 'Chờ BĐH', 'pending_accountant' => 'Chờ KT', 'approved' => 'Đã duyệt', 'rejected' => 'Từ chối'];
        $colors = ['draft' => '#9CA3AF', 'pending_management' => '#F59E0B', 'pending_accountant' => '#3B82F6', 'approved' => '#10B981', 'rejected' => '#EF4444'];

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
