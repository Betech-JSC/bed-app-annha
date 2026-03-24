<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Contract;
use App\Models\Cost;
use App\Models\CostGroup;
use App\Models\Project;
use App\Models\Supplier;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CrmFinanceController extends Controller
{
    public function index(Request $request)
    {
        // Summary stats
        $totalContractValue = Contract::sum('contract_value');
        $totalCosts = Cost::sum('amount');
        $projectCount = Project::count();

        // Recent costs
        $recentCosts = Cost::with(['project:id,name,code', 'creator:id,name'])
            ->orderByDesc('created_at')
            ->paginate(20)
            ->withQueryString();

        // Contract summary by project
        $contracts = Contract::with('project:id,name,code')
            ->orderByDesc('created_at')
            ->get();

        return Inertia::render('Crm/Finance/Index', [
            'stats' => [
                'total_contract_value' => $totalContractValue,
                'total_costs' => $totalCosts,
                'profit' => $totalContractValue - $totalCosts,
                'project_count' => $projectCount,
            ],
            'recentCosts' => $recentCosts,
            'contracts' => $contracts,
        ]);
    }

    /**
     * Company Costs — Chi phí công ty (không thuộc dự án nào)
     */
    public function companyCosts(Request $request)
    {
        $query = Cost::companyCosts()
            ->with(['creator:id,name', 'managementApprover:id,name', 'accountantApprover:id,name', 'costGroup:id,name', 'supplier:id,name', 'attachments'])
            ->orderByDesc('cost_date');

        // Filter by status
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }

        // Filter by cost_group_id
        if ($groupId = $request->get('cost_group_id')) {
            $query->where('cost_group_id', $groupId);
        }

        // Filter by date range
        if ($startDate = $request->get('start_date')) {
            $query->whereDate('cost_date', '>=', $startDate);
        }
        if ($endDate = $request->get('end_date')) {
            $query->whereDate('cost_date', '<=', $endDate);
        }

        // Search
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $costs = $query->paginate(20)->withQueryString();

        // Stats
        $totalAmount = Cost::companyCosts()->where('status', '!=', 'rejected')->sum('amount') ?: 0;
        $approvedAmount = Cost::companyCosts()->approved()->sum('amount') ?: 0;
        $pendingCount = Cost::companyCosts()->pending()->count();
        $draftCount = Cost::companyCosts()->draft()->count();
        $rejectedCount = Cost::companyCosts()->where('status', 'rejected')->count();
        $totalCount = Cost::companyCosts()->count();

        // Chart: Monthly Company Costs (6 months)
        $monthlyCosts = [];
        $monthLabels = [];
        $now = Carbon::now();
        for ($i = 5; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $monthLabels[] = 'T' . $month->format('m');
            $monthlyCosts[] = Cost::companyCosts()
                ->where('status', '!=', 'rejected')
                ->whereBetween('cost_date', [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()])
                ->sum('amount') ?: 0;
        }

        // Chart: By Cost Group  
        $byGroup = Cost::companyCosts()
            ->where('status', '!=', 'rejected')
            ->whereNotNull('cost_group_id')
            ->selectRaw('cost_group_id, SUM(amount) as total')
            ->groupBy('cost_group_id')
            ->orderByDesc('total')
            ->with('costGroup:id,name')
            ->get();

        // Chart: By Status
        $byStatus = Cost::companyCosts()
            ->selectRaw('status, COUNT(*) as cnt, SUM(amount) as total')
            ->groupBy('status')
            ->get();

        $statusLabels = [
            'draft' => 'Nháp',
            'pending_management_approval' => 'Chờ BĐH',
            'pending_accountant_approval' => 'Chờ KT',
            'approved' => 'Đã duyệt',
            'rejected' => 'Từ chối',
        ];

        $statusColors = [
            'draft' => '#9CA3AF',
            'pending_management_approval' => '#F59E0B',
            'pending_accountant_approval' => '#3B82F6',
            'approved' => '#10B981',
            'rejected' => '#EF4444',
        ];

        // Cost Groups for filter
        $costGroups = CostGroup::active()->ordered()->get(['id', 'name']);

        // Suppliers for form
        $suppliers = Supplier::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Crm/Finance/CompanyCosts', [
            'costs' => $costs,
            'stats' => [
                'totalAmount' => $totalAmount,
                'approvedAmount' => $approvedAmount,
                'pendingCount' => $pendingCount,
                'draftCount' => $draftCount,
                'rejectedCount' => $rejectedCount,
                'totalCount' => $totalCount,
            ],
            'charts' => [
                'monthly' => [
                    'labels' => $monthLabels,
                    'data' => $monthlyCosts,
                ],
                'byGroup' => [
                    'labels' => $byGroup->map(fn($g) => $g->costGroup->name ?? 'Khác')->toArray(),
                    'data' => $byGroup->pluck('total')->toArray(),
                ],
                'byStatus' => [
                    'labels' => $byStatus->map(fn($s) => $statusLabels[$s->status] ?? $s->status)->toArray(),
                    'data' => $byStatus->pluck('cnt')->toArray(),
                    'amounts' => $byStatus->pluck('total')->toArray(),
                    'colors' => $byStatus->map(fn($s) => $statusColors[$s->status] ?? '#9CA3AF')->toArray(),
                ],
            ],
            'costGroups' => $costGroups,
            'suppliers' => $suppliers,
            'filters' => [
                'search' => $request->get('search', ''),
                'status' => $request->get('status', ''),
                'cost_group_id' => $request->get('cost_group_id', ''),
                'start_date' => $request->get('start_date', ''),
                'end_date' => $request->get('end_date', ''),
            ],
        ]);
    }

    /**
     * Store company cost from CRM
     */
    public function storeCompanyCost(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'cost_group_id' => 'required|exists:cost_groups,id',
            'cost_date' => 'required|date',
            'description' => 'nullable|string',
            'quantity' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'supplier_id' => 'nullable|exists:suppliers,id',
        ]);

        $cost = Cost::create([
            'project_id' => null,
            'name' => $validated['name'],
            'amount' => $validated['amount'],
            'cost_group_id' => $validated['cost_group_id'],
            'cost_date' => $validated['cost_date'],
            'description' => $validated['description'] ?? null,
            'quantity' => $validated['quantity'] ?? null,
            'unit' => $validated['unit'] ?? null,
            'supplier_id' => $validated['supplier_id'] ?? null,
            'status' => 'draft',
            'created_by' => Auth::id(),
        ]);

        return redirect()->back()->with('success', 'Đã tạo chi phí công ty thành công.');
    }

    /**
     * Update company cost
     */
    public function updateCompanyCost(Request $request, $id)
    {
        $cost = Cost::companyCosts()->findOrFail($id);

        if (!in_array($cost->status, ['draft', 'rejected'])) {
            return redirect()->back()->with('error', 'Chỉ có thể chỉnh sửa chi phí ở trạng thái nháp hoặc bị từ chối.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'cost_group_id' => 'required|exists:cost_groups,id',
            'cost_date' => 'required|date',
            'description' => 'nullable|string',
            'quantity' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:50',
            'supplier_id' => 'nullable|exists:suppliers,id',
        ]);

        $cost->update($validated);

        return redirect()->back()->with('success', 'Đã cập nhật chi phí công ty.');
    }

    /**
     * Delete company cost
     */
    public function destroyCompanyCost($id)
    {
        $cost = Cost::companyCosts()->findOrFail($id);

        if (!in_array($cost->status, ['draft', 'rejected'])) {
            return redirect()->back()->with('error', 'Chỉ có thể xóa chi phí ở trạng thái nháp hoặc bị từ chối.');
        }

        $cost->delete();

        return redirect()->back()->with('success', 'Đã xóa chi phí công ty.');
    }

    /**
     * Submit company cost for approval
     */
    public function submitCompanyCost($id)
    {
        $cost = Cost::companyCosts()->findOrFail($id);

        if (!$cost->submitForManagementApproval()) {
            return redirect()->back()->with('error', 'Không thể gửi duyệt chi phí này.');
        }

        return redirect()->back()->with('success', 'Đã gửi chi phí để ban điều hành duyệt.');
    }
}
