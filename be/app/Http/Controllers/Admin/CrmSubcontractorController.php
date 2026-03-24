<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
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
    public function index(Request $request)
    {
        $query = Subcontractor::with([
            'project:id,name,code',
            'approver:id,name',
            'attachments',
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

        return Inertia::render('Crm/Subcontractors/Index', [
            'subcontractors' => $subcontractors,
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
        $validated = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'name' => 'required|string|max:255',
            'category' => 'nullable|string|max:255',
            'total_quote' => 'required|numeric|min:0',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_account_name' => 'nullable|string|max:255',
            'progress_start_date' => 'nullable|date',
            'progress_end_date' => 'nullable|date|after_or_equal:progress_start_date',
            'progress_status' => 'nullable|in:not_started,in_progress,completed,delayed',
        ]);

        Subcontractor::create([
            ...$validated,
            'advance_payment' => 0,
            'total_paid' => 0,
            'payment_status' => 'pending',
            'progress_status' => $validated['progress_status'] ?? 'not_started',
            // created_by is nullable — skip for admin guard (FK to users table)
        ]);

        return redirect()->back()->with('success', 'Đã thêm nhà thầu phụ.');
    }

    public function update(Request $request, $id)
    {
        $sub = Subcontractor::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'nullable|string|max:255',
            'total_quote' => 'required|numeric|min:0',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_account_name' => 'nullable|string|max:255',
            'progress_start_date' => 'nullable|date',
            'progress_end_date' => 'nullable|date|after_or_equal:progress_start_date',
            'progress_status' => 'nullable|in:not_started,in_progress,completed,delayed',
        ]);

        $sub->update([
            ...$validated,
            // updated_by not set from CRM (admin guard FK incompatible)
        ]);

        return redirect()->back()->with('success', 'Đã cập nhật nhà thầu phụ.');
    }

    public function destroy($id)
    {
        $sub = Subcontractor::findOrFail($id);

        // Detach costs
        \App\Models\Cost::where('subcontractor_id', $sub->id)
            ->update(['subcontractor_id' => null]);

        $sub->delete();

        return redirect()->back()->with('success', 'Đã xóa nhà thầu phụ.');
    }
}
