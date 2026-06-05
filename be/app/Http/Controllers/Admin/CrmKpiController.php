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
        $hasKpiView = $this->crmCan($user, Permissions::KPI_VIEW);
        
        $query = Kpi::with([
            'user:id,name,email,image',
            'project:id,name,code',
            'creator:id,name',
            'children.user:id,name,email,image',
            'children.project:id,name,code',
        ])
        ->whereNull('parent_id')
        ->orderByDesc('created_at');

        // Apply Scope Filters
        if (!$hasKpiView) {
            $query->where('user_id', $user->id);
        } else {
            if ($userId = $request->get('user_id')) {
                $query->where('user_id', $userId);
            }
        }

        if ($projectId = $request->get('project_id')) {
            $query->where('project_id', $projectId);
        }

        if ($status = $request->get('status')) {
            $query->where(function($q) use($status) {
                $q->where('status', $status)
                  ->orWhereHas('children', function($cq) use($status) {
                      $cq->where('status', $status);
                  });
            });
        }

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('children', function($cq) use($search) {
                      $cq->where('title', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                  });
            });
        }

        $kpis = $query->paginate(20)->withQueryString();

        // Stats & Charts Calculations with respect to permissions
        if (!$hasKpiView) {
            $totalKpi = Kpi::where('user_id', $user->id)->count();
            $pendingKpi = Kpi::where('user_id', $user->id)->where('status', 'pending')->count();
            $completedKpi = Kpi::where('user_id', $user->id)->where('status', 'completed')->count();
            $verifiedSuccess = Kpi::where('user_id', $user->id)->where('status', 'verified_success')->count();
            $verifiedFail = Kpi::where('user_id', $user->id)->where('status', 'verified_fail')->count();

            $avgCompletion = Kpi::where('user_id', $user->id)->where('target_value', '>', 0)
                ->selectRaw('AVG(LEAST(current_value / target_value * 100, 100)) as avg_pct')
                ->value('avg_pct') ?? 0;

            $byStatus = Kpi::where('user_id', $user->id)
                ->selectRaw('status, COUNT(*) as cnt')
                ->groupBy('status')
                ->get();
        } else {
            $totalKpi = Kpi::count();
            $pendingKpi = Kpi::where('status', 'pending')->count();
            $completedKpi = Kpi::where('status', 'completed')->count();
            $verifiedSuccess = Kpi::where('status', 'verified_success')->count();
            $verifiedFail = Kpi::where('status', 'verified_fail')->count();

            $avgCompletion = Kpi::where('target_value', '>', 0)
                ->selectRaw('AVG(LEAST(current_value / target_value * 100, 100)) as avg_pct')
                ->value('avg_pct') ?? 0;

            $byStatus = Kpi::selectRaw('status, COUNT(*) as cnt')
                ->groupBy('status')
                ->get();
        }

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
        if (!$hasKpiView) {
            $topEmployees = Kpi::where('user_id', $user->id)->where('target_value', '>', 0)
                ->selectRaw('user_id, AVG(LEAST(current_value / target_value * 100, 100)) as avg_pct, COUNT(*) as kpi_count')
                ->groupBy('user_id')
                ->with('user:id,name')
                ->get();

            $byProject = Kpi::where('user_id', $user->id)->whereNotNull('project_id')
                ->selectRaw('project_id, COUNT(*) as cnt, SUM(CASE WHEN status = "verified_success" THEN 1 ELSE 0 END) as success_cnt')
                ->groupBy('project_id')
                ->orderByDesc('cnt')
                ->with('project:id,name,code')
                ->get();

            $users = User::where('id', $user->id)->get(['id', 'name', 'email']);
        } else {
            $topEmployees = Kpi::where('target_value', '>', 0)
                ->selectRaw('user_id, AVG(LEAST(current_value / target_value * 100, 100)) as avg_pct, COUNT(*) as kpi_count')
                ->groupBy('user_id')
                ->orderByDesc('avg_pct')
                ->limit(8)
                ->with('user:id,name')
                ->get();

            $byProject = Kpi::whereNotNull('project_id')
                ->selectRaw('project_id, COUNT(*) as cnt, SUM(CASE WHEN status = "verified_success" THEN 1 ELSE 0 END) as success_cnt')
                ->groupBy('project_id')
                ->orderByDesc('cnt')
                ->limit(6)
                ->with('project:id,name,code')
                ->get();

            $users = User::whereNull('deleted_at')
                ->orderBy('name')
                ->get(['id', 'name', 'email']);
        }

        $projects = Project::orderByDesc('created_at')
            ->get(['id', 'name', 'code']);

        // Parent KPI options
        $parentKpis = Kpi::whereNull('parent_id')
            ->when(!$hasKpiView, function($q) use($user) {
                $q->where('user_id', $user->id);
            })
            ->orderByDesc('created_at')
            ->get(['id', 'title']);

        return Inertia::render('Crm/Hr/Kpi/Index', [
            'parentKpis' => $parentKpis,
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
            'user_id'     => 'required|exists:users,id',
            'project_id'  => 'nullable|exists:projects,id',
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'month'       => 'nullable|string|max:7', // YYYY-MM
            'start_date'  => 'nullable|date',
            'end_date'    => 'nullable|date|after_or_equal:start_date',
            'items'       => 'nullable|array',
            'items.*.title'        => 'required_with:items|string|max:255',
            'items.*.target_value' => 'required_with:items|numeric|min:0.01',
            'items.*.unit'         => 'required_with:items|string|max:50',
            'items.*.description'  => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $hasItems = !empty($validated['items']);

            // Parent KPI — target_value = 100% when has children, otherwise required
            $parent = Kpi::create([
                'user_id'       => $validated['user_id'],
                'project_id'    => $validated['project_id'] ?? null,
                'title'         => $validated['title'],
                'description'   => $validated['description'] ?? null,
                'target_value'  => $hasItems ? 100 : $request->input('target_value', 100),
                'current_value' => 0,
                'unit'          => $hasItems ? '%' : $request->input('unit', '%'),
                'start_date'    => $validated['start_date'] ?? null,
                'end_date'      => $validated['end_date'] ?? null,
                'status'        => 'pending',
                'created_by'    => $user->id,
            ]);

            // Create children
            if ($hasItems) {
                foreach ($validated['items'] as $item) {
                    Kpi::create([
                        'parent_id'     => $parent->id,
                        'user_id'       => $validated['user_id'],
                        'project_id'    => $validated['project_id'] ?? null,
                        'title'         => $item['title'],
                        'description'   => $item['description'] ?? null,
                        'target_value'  => $item['target_value'],
                        'current_value' => 0,
                        'unit'          => $item['unit'],
                        'start_date'    => $validated['start_date'] ?? null,
                        'end_date'      => $validated['end_date'] ?? null,
                        'status'        => 'pending',
                        'created_by'    => $user->id,
                    ]);
                }
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Lỗi tạo KPI: ' . $e->getMessage()]);
        }

        return redirect()->back()->with('success', 'Đã tạo KPI thành công.');
    }

    public function update(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::KPI_UPDATE);
        $kpi = Kpi::findOrFail($id);

        $validated = $request->validate([
            'user_id'     => 'sometimes|required|exists:users,id',
            'project_id'  => 'nullable|exists:projects,id',
            'title'       => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'start_date'  => 'nullable|date',
            'end_date'    => 'nullable|date|after_or_equal:start_date',
            'items'       => 'nullable|array',
            'items.*.id'           => 'nullable|integer|exists:kpis,id',
            'items.*.title'        => 'required_with:items|string|max:255',
            'items.*.target_value' => 'required_with:items|numeric|min:0.01',
            'items.*.unit'         => 'required_with:items|string|max:50',
            'items.*.description'  => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Update parent (no target_value if has items)
            $parentData = collect($validated)->except(['items'])->toArray();
            $kpi->update($parentData);

            // Sync children if items provided
            if (isset($validated['items'])) {
                $submittedIds = collect($validated['items'])->pluck('id')->filter()->values();

                // Delete children not in submitted list
                $kpi->children()->whereNotIn('id', $submittedIds)->delete();

                foreach ($validated['items'] as $item) {
                    $childData = [
                        'parent_id'    => $kpi->id,
                        'user_id'      => $kpi->user_id,
                        'project_id'   => $kpi->project_id,
                        'title'        => $item['title'],
                        'description'  => $item['description'] ?? null,
                        'target_value' => $item['target_value'],
                        'unit'         => $item['unit'],
                        'start_date'   => $kpi->start_date,
                        'end_date'     => $kpi->end_date,
                        'status'       => 'pending',
                        'created_by'   => $user->id,
                    ];

                    if (!empty($item['id'])) {
                        $child = Kpi::find($item['id']);
                        if ($child) {
                            $child->update($childData);
                            continue;
                        }
                    }

                    Kpi::create($childData);
                }
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->withErrors(['error' => 'Lỗi cập nhật KPI: ' . $e->getMessage()]);
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
