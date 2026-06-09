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
        $hasKpiCreate = $this->crmCan($user, Permissions::KPI_CREATE);
        $canManageKpi = $hasKpiView || $hasKpiCreate;
        
        $query = Kpi::with([
            'user:id,name,email,image',
            'creator:id,name',
            'children.user:id,name,email,image',
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
        } else {
            $topEmployees = Kpi::where('target_value', '>', 0)
                ->selectRaw('user_id, AVG(LEAST(current_value / target_value * 100, 100)) as avg_pct, COUNT(*) as kpi_count')
                ->groupBy('user_id')
                ->orderByDesc('avg_pct')
                ->limit(8)
                ->with('user:id,name')
                ->get();
        }

        if ($canManageKpi) {
            $users = User::employees()->whereNull('deleted_at')
                ->orderBy('name')
                ->get(['id', 'name', 'email']);
        } else {
            $users = User::where('id', $user->id)->get(['id', 'name', 'email']);
        }

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
            ],
            'users' => $users,
            'filters' => [
                'search' => $request->get('search', ''),
                'user_id' => $request->get('user_id', ''),
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
                'project_id'    => null,
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
                        'project_id'    => null,
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
            // Update parent metadata only (preserve target_value/current_value/status)
            $parentData = collect($validated)->except(['items'])->toArray();
            $kpi->update($parentData);

            // Sync children if items provided
            if (isset($validated['items'])) {
                $submittedIds = collect($validated['items'])->pluck('id')->filter()->values();

                // Delete children not in submitted list
                $kpi->children()->whereNotIn('id', $submittedIds)->delete();

                foreach ($validated['items'] as $item) {
                    if (!empty($item['id'])) {
                        // Existing child → update metadata only, PRESERVE status & progress
                        $child = Kpi::find($item['id']);
                        if ($child) {
                            $child->update([
                                'parent_id'    => $kpi->id,
                                'user_id'      => $kpi->user_id,
                                'project_id'   => null,
                                'title'        => $item['title'],
                                'description'  => $item['description'] ?? null,
                                'target_value' => $item['target_value'],
                                'unit'         => $item['unit'],
                                'start_date'   => $kpi->start_date,
                                'end_date'     => $kpi->end_date,
                                // status & current_value NOT touched
                            ]);
                            continue;
                        }
                    }

                    // New child → create with pending status
                    Kpi::create([
                        'parent_id'    => $kpi->id,
                        'user_id'      => $kpi->user_id,
                        'project_id'   => null,
                        'title'        => $item['title'],
                        'description'  => $item['description'] ?? null,
                        'target_value' => $item['target_value'],
                        'current_value' => 0,
                        'unit'         => $item['unit'],
                        'start_date'   => $kpi->start_date,
                        'end_date'     => $kpi->end_date,
                        'status'       => 'pending',
                        'created_by'   => $user->id,
                    ]);
                }

                // Recalculate parent from children
                $this->recalculateParent($kpi);
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
        $kpi = Kpi::findOrFail($id);
        $parentId = $kpi->parent_id;

        $kpi->delete();

        // Recalculate parent if this was a child
        if ($parentId) {
            $parent = Kpi::find($parentId);
            if ($parent) {
                $this->recalculateParent($parent);
            }
        }

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

        // Auto-cascade: recalculate parent status when child is verified
        if ($kpi->parent_id) {
            $parent = Kpi::find($kpi->parent_id);
            if ($parent) {
                $this->recalculateParent($parent);
            }
        }

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

        // Recalculate parent if this is a child KPI
        if ($kpi->parent_id) {
            $parent = Kpi::find($kpi->parent_id);
            if ($parent) {
                $this->recalculateParent($parent);
            }
        }

        return redirect()->back()->with('success', 'Đã cập nhật tiến độ KPI.');
    }

    /**
     * Recalculate parent KPI from children progress & status.
     * - current_value = AVG(children percentage) mapped to parent target
     * - status auto-updates: all completed → completed, all verified_success → verified_success
     */
    private function recalculateParent(Kpi $parent): void
    {
        $children = $parent->children()->get();

        if ($children->isEmpty()) {
            return;
        }

        // Calculate average completion percentage across all children
        $avgPct = $children->avg(function ($child) {
            if ($child->target_value <= 0) return 0;
            return min(($child->current_value / $child->target_value) * 100, 100);
        });

        // Map back to parent's scale (parent target_value is 100 when has children)
        $parent->current_value = round($avgPct, 2);

        // Auto-derive parent status from children
        $statuses = $children->pluck('status')->unique();

        if ($statuses->count() === 1 && $statuses->first() === 'verified_success') {
            // All children verified success → parent auto verified
            $parent->status = 'verified_success';
        } elseif ($statuses->contains('verified_fail')) {
            // Any child failed → keep parent for manual review, mark completed
            if ($parent->status === 'pending') {
                $parent->status = 'completed';
            }
        } elseif ($statuses->every(fn($s) => in_array($s, ['completed', 'verified_success', 'verified_fail']))) {
            // All children are done (mix of completed/verified) → parent completed
            $parent->status = 'completed';
        } elseif ($avgPct >= 100 && $parent->status === 'pending') {
            $parent->status = 'completed';
        }

        $parent->save();
    }
}
