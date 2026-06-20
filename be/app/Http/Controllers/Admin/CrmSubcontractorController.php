<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Constants\Permissions;
use App\Models\Subcontractor;
use App\Models\Project;
use App\Models\GlobalSubcontractor;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CrmSubcontractorController extends Controller
{
    use CrmAuthorization;
    public function index(Request $request)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_VIEW);
        $query = Subcontractor::with([
            'project:id,name,code',
            'approver:id,name',
            'attachments',
            'payments' => function ($q) {
                $q->with('attachments')->orderByDesc('created_at');
            }
        ])->withCount('payments')->orderByDesc('created_at');

        // Filters
        if ($projectId = $request->get('project_id')) {
            $query->where('project_id', $projectId);
        }
        if ($progressStatus = $request->get('progress_status')) {
            $query->where('progress_status', $progressStatus);
        }
        if ($paymentStatus = $request->get('payment_status')) {
            $query->where('payment_status', $paymentStatus);
        }
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('category', 'like', "%{$search}%");
            });
        }

        $subcontractors = $query->paginate(20)->withQueryString();

        // Stats
        $totalSubs = Subcontractor::count();
        $totalQuote = Subcontractor::sum('total_quote') ?: 0;
        $totalPaid = Subcontractor::sum('total_paid') ?: 0;
        $inProgress = Subcontractor::where('progress_status', 'in_progress')->count();
        $completed = Subcontractor::where('progress_status', 'completed')->count();
        $delayed = Subcontractor::where('progress_status', 'delayed')->count();

        // Chart: By Progress Status
        $byProgress = Subcontractor::selectRaw('progress_status, COUNT(*) as cnt')
            ->groupBy('progress_status')
            ->get();

        $progressLabels = [
            'not_started' => 'Chưa bắt đầu',
            'in_progress' => 'Đang thi công',
            'completed' => 'Hoàn thành',
            'delayed' => 'Chậm tiến độ',
        ];
        $progressColors = [
            'not_started' => '#9CA3AF',
            'in_progress' => '#3B82F6',
            'completed' => '#10B981',
            'delayed' => '#EF4444',
        ];

        // Chart: By Payment Status
        $byPayment = Subcontractor::selectRaw('payment_status, COUNT(*) as cnt, SUM(total_quote) as total_quote')
            ->groupBy('payment_status')
            ->get();

        $paymentLabels = [
            'pending' => 'Chưa TT',
            'partial' => 'TT 1 phần',
            'completed' => 'Đã TT đủ',
        ];
        $paymentColors = [
            'pending' => '#F59E0B',
            'partial' => '#3B82F6',
            'completed' => '#10B981',
        ];

        // Chart: Top 6 by Quote Value
        $topByValue = Subcontractor::orderByDesc('total_quote')
            ->limit(6)
            ->get(['id', 'name', 'total_quote', 'total_paid']);

        // Projects for filter
        $projects = Project::orderByDesc('created_at')->get(['id', 'name', 'code']);
        $activeProjects = Project::where('status', 'in_progress')->orderByDesc('created_at')->get(['id', 'name', 'code']);

        $globalSubcontractors = GlobalSubcontractor::select('id', 'name', 'category', 'bank_name', 'bank_account_number', 'bank_account_name')->orderBy('name')->get();
        $costGroups = \App\Models\CostGroup::where('is_active', true)->orderBy('name')->get(['id', 'name']);

        return Inertia::render('Crm/Subcontractors/Index', [
            'subcontractors' => $subcontractors,
            'activeProjects' => $activeProjects,
            'stats' => [
                'totalSubs' => $totalSubs,
                'totalQuote' => $totalQuote,
                'totalPaid' => $totalPaid,
                'inProgress' => $inProgress,
                'completed' => $completed,
                'delayed' => $delayed,
            ],
            'charts' => [
                'byProgress' => [
                    'labels' => $byProgress->map(fn($s) => $progressLabels[$s->progress_status] ?? $s->progress_status)->toArray(),
                    'data' => $byProgress->pluck('cnt')->toArray(),
                    'colors' => $byProgress->map(fn($s) => $progressColors[$s->progress_status] ?? '#9CA3AF')->toArray(),
                ],
                'byPayment' => [
                    'labels' => $byPayment->map(fn($s) => $paymentLabels[$s->payment_status] ?? $s->payment_status)->toArray(),
                    'data' => $byPayment->pluck('cnt')->toArray(),
                    'colors' => $byPayment->map(fn($s) => $paymentColors[$s->payment_status] ?? '#9CA3AF')->toArray(),
                ],
                'topByValue' => [
                    'labels' => $topByValue->pluck('name')->toArray(),
                    'quotes' => $topByValue->pluck('total_quote')->toArray(),
                    'paid' => $topByValue->pluck('total_paid')->toArray(),
                ],
            ],
            'projects' => $projects,
            'globalSubcontractors' => $globalSubcontractors,
            'costGroups' => $costGroups,
            'filters' => [
                'search' => $request->get('search', ''),
                'project_id' => $request->get('project_id', ''),
                'progress_status' => $request->get('progress_status', ''),
                'payment_status' => $request->get('payment_status', ''),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_CREATE);
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'global_subcontractor_id' => 'nullable|exists:global_subcontractors,id',
            'name' => 'required_without:global_subcontractor_id|string|max:255',
            'category' => 'nullable|string|max:255',
            'total_quote' => 'required|numeric|min:0',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_account_name' => 'nullable|string|max:255',
            'progress_start_date' => 'nullable|date',
            'progress_end_date' => 'nullable|date|after_or_equal:progress_start_date',
            'progress_status' => 'nullable|in:not_started,in_progress,completed,delayed',
            'create_cost' => 'nullable|boolean',
            'cost_group_id' => 'nullable|exists:cost_groups,id',
        ]);

        if (!empty($validated['global_subcontractor_id'])) {
            $gs = GlobalSubcontractor::findOrFail($validated['global_subcontractor_id']);
            $validated['name'] = $gs->name;
            $validated['bank_name'] = $validated['bank_name'] ?? $gs->bank_name;
            $validated['bank_account_number'] = $validated['bank_account_number'] ?? $gs->bank_account_number;
            $validated['bank_account_name'] = $validated['bank_account_name'] ?? $gs->bank_account_name;
        }

        DB::transaction(function () use ($validated, $request, $user) {
            $subData = collect($validated)->except(['create_cost', 'cost_group_id'])->toArray();
            
            $subcontractor = Subcontractor::create([
                ...$subData,
                'advance_payment' => 0,
                'total_paid' => 0,
                'payment_status' => 'pending',
                'progress_status' => $validated['progress_status'] ?? 'not_started',
                'created_by' => $user->id,
            ]);

            if ($request->input('create_cost') && $request->input('cost_group_id')) {
                \App\Models\Cost::create([
                    'project_id' => $validated['project_id'],
                    'subcontractor_id' => $subcontractor->id,
                    'name' => "Hợp đồng thầu phụ: " . $subcontractor->name,
                    'amount' => $subcontractor->total_quote,
                    'cost_date' => $subcontractor->progress_start_date ?: now(),
                    'cost_group_id' => $request->input('cost_group_id'),
                    'category' => 'other',
                    'status' => 'draft',
                    'created_by' => $user->id,
                ]);
            }
        });

        return redirect()->back()->with('success', 'Đã thêm nhà thầu phụ.');
    }

    public function update(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_UPDATE);
        $sub = Subcontractor::findOrFail($id);

        $validated = $request->validate([
            'global_subcontractor_id' => 'nullable|exists:global_subcontractors,id',
            'name' => 'required_without:global_subcontractor_id|string|max:255',
            'category' => 'nullable|string|max:255',
            'total_quote' => 'required|numeric|min:0',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_account_name' => 'nullable|string|max:255',
            'progress_start_date' => 'nullable|date',
            'progress_end_date' => 'nullable|date|after_or_equal:progress_start_date',
            'progress_status' => 'nullable|in:not_started,in_progress,completed,delayed',
        ]);

        if (!empty($validated['global_subcontractor_id'])) {
            $gs = GlobalSubcontractor::findOrFail($validated['global_subcontractor_id']);
            $validated['name'] = $gs->name;
            $validated['bank_name'] = $validated['bank_name'] ?? $gs->bank_name;
            $validated['bank_account_number'] = $validated['bank_account_number'] ?? $gs->bank_account_number;
            $validated['bank_account_name'] = $validated['bank_account_name'] ?? $gs->bank_account_name;
        }

        $sub->update([
            ...$validated,
            'updated_by' => $user->id,
        ]);

        return redirect()->back()->with('success', 'Đã cập nhật nhà thầu phụ.');
    }

    public function destroy($id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_DELETE);
        $sub = Subcontractor::findOrFail($id);

        // Detach costs
        \App\Models\Cost::where('subcontractor_id', $sub->id)
            ->update(['subcontractor_id' => null]);

        $sub->delete();

        return redirect()->back()->with('success', 'Đã xóa nhà thầu phụ.');
    }
}
