<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Constants\Permissions;
use App\Models\Kpi;
use App\Models\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CrmKpiController extends Controller
{
    use CrmAuthorization;
    public function index(Request $request)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::KPI_VIEW);
        $query = Kpi::with([
            'user:id,name,email,image',
            'project:id,name,code',
            'creator:id,name',
        ])->orderByDesc('created_at');

        // Filters
        if ($userId = $request->get('user_id')) {
            $query->where('user_id', $userId);
        }
        if ($projectId = $request->get('project_id')) {
            $query->where('project_id', $projectId);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $kpis = $query->paginate(20)->withQueryString();

        // Stats
        $totalKpi = Kpi::count();
        $pendingKpi = Kpi::where('status', 'pending')->count();
        $completedKpi = Kpi::where('status', 'completed')->count();
        $verifiedSuccess = Kpi::where('status', 'verified_success')->count();
        $verifiedFail = Kpi::where('status', 'verified_fail')->count();

        // Average completion rate
        $avgCompletion = Kpi::where('target_value', '>', 0)
            ->selectRaw('AVG(LEAST(current_value / target_value * 100, 100)) as avg_pct')
            ->value('avg_pct') ?? 0;

        // Chart: KPIs by Status
        $byStatus = Kpi::selectRaw('status, COUNT(*) as cnt')
            ->groupBy('status')
            ->get();

        $statusLabels = [
            'pending' => 'Đang thực hiện',
            'completed' => 'Đã hoàn thành',
            'verified_success' => 'Đạt KPI',
            'verified_fail' => 'Không đạt',
        ];
        $statusColors = [
            'pending' => '#3B82F6',
            'completed' => '#F59E0B',
            'verified_success' => '#10B981',
            'verified_fail' => '#EF4444',
        ];

        // Chart: Top employees by KPI completion
        $topEmployees = Kpi::where('target_value', '>', 0)
            ->selectRaw('user_id, AVG(LEAST(current_value / target_value * 100, 100)) as avg_pct, COUNT(*) as kpi_count')
            ->groupBy('user_id')
            ->orderByDesc('avg_pct')
            ->limit(8)
            ->with('user:id,name')
            ->get();

        // Chart: KPI by Project
        $byProject = Kpi::whereNotNull('project_id')
            ->selectRaw('project_id, COUNT(*) as cnt, SUM(CASE WHEN status = "verified_success" THEN 1 ELSE 0 END) as success_cnt')
            ->groupBy('project_id')
            ->orderByDesc('cnt')
            ->limit(6)
            ->with('project:id,name,code')
            ->get();

        // Dropdown data
        $users = User::whereNull('deleted_at')
            ->orderBy('name')
            ->get(['id', 'name', 'email']);

        $projects = Project::orderByDesc('created_at')
            ->get(['id', 'name', 'code']);

        return Inertia::render('Crm/Hr/Kpi/Index', [
            'kpis' => $kpis,
            'stats' => [
                'totalKpi' => $totalKpi,
                'pendingKpi' => $pendingKpi,
                'completedKpi' => $completedKpi,
                'verifiedSuccess' => $verifiedSuccess,
                'verifiedFail' => $verifiedFail,
                'avgCompletion' => round($avgCompletion, 1),
            ],
            'charts' => [
                'byStatus' => [
                    'labels' => $byStatus->map(fn($s) => $statusLabels[$s->status] ?? $s->status)->toArray(),
                    'data' => $byStatus->pluck('cnt')->toArray(),
                    'colors' => $byStatus->map(fn($s) => $statusColors[$s->status] ?? '#9CA3AF')->toArray(),
                ],
                'topEmployees' => [
                    'labels' => $topEmployees->map(fn($e) => $e->user->name ?? 'N/A')->toArray(),
                    'data' => $topEmployees->map(fn($e) => round($e->avg_pct, 1))->toArray(),
                    'counts' => $topEmployees->pluck('kpi_count')->toArray(),
                ],
                'byProject' => [
                    'labels' => $byProject->map(fn($p) => $p->project->code ?? 'N/A')->toArray(),
                    'data' => $byProject->pluck('cnt')->toArray(),
                    'success' => $byProject->pluck('success_cnt')->toArray(),
                ],
            ],
            'users' => $users,
            'projects' => $projects,
            'filters' => [
                'search' => $request->get('search', ''),
                'user_id' => $request->get('user_id', ''),
                'project_id' => $request->get('project_id', ''),
                'status' => $request->get('status', ''),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::KPI_CREATE);
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'project_id' => 'nullable|exists:projects,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'target_value' => 'required|numeric|min:0.01',
            'unit' => 'required|string|max:50',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        Kpi::create([
            ...$validated,
            'current_value' => 0,
            'status' => 'pending',
            // created_by is nullable — admin IDs can't satisfy FK to users table
        ]);

        return redirect()->back()->with('success', 'Đã tạo KPI thành công.');
    }

    public function update(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::KPI_UPDATE);
        $kpi = Kpi::findOrFail($id);

        $validated = $request->validate([
            'user_id' => 'sometimes|required|exists:users,id',
            'project_id' => 'nullable|exists:projects,id',
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'target_value' => 'sometimes|required|numeric|min:0.01',
            'current_value' => 'sometimes|required|numeric|min:0',
            'unit' => 'sometimes|required|string|max:50',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $kpi->update($validated);

        // Auto-mark completed if current >= target
        if ($kpi->current_value >= $kpi->target_value && $kpi->status === 'pending') {
            $kpi->update(['status' => 'completed']);
        }

        return redirect()->back()->with('success', 'Đã cập nhật KPI.');
    }

    public function destroy($id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::KPI_DELETE);
        Kpi::findOrFail($id)->delete();
        return redirect()->back()->with('success', 'Đã xóa KPI.');
    }

    /**
     * Verify KPI (mark as success or fail)
     */
    public function verify(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::KPI_VERIFY);
        $kpi = Kpi::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:verified_success,verified_fail,pending',
        ]);

        $kpi->update(['status' => $validated['status']]);

        return redirect()->back()->with('success', 'Đã cập nhật xác nhận KPI.');
    }

    /**
     * Update KPI progress (current_value only)
     */
    public function updateProgress(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::KPI_UPDATE);
        $kpi = Kpi::findOrFail($id);

        $validated = $request->validate([
            'current_value' => 'required|numeric|min:0',
        ]);

        $kpi->current_value = $validated['current_value'];

        if ($kpi->current_value >= $kpi->target_value && $kpi->status === 'pending') {
            $kpi->status = 'completed';
        }

        $kpi->save();

        return redirect()->back()->with('success', 'Đã cập nhật tiến độ KPI.');
    }
}
