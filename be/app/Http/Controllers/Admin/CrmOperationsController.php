<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Equipment;
use App\Models\AssetAssignment;
use App\Models\Contract;
use App\Models\Cost;
use App\Models\Project;
use App\Models\Shareholder;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;

class CrmOperationsController extends Controller
{
    // ================================================================
    // DASHBOARD — Tổng hợp dòng tiền
    // ================================================================
    public function index()
    {
        // Nguồn vốn
        $totalCapital = Shareholder::active()->sum('contributed_amount');
        $shareholderCount = Shareholder::active()->count();

        // Doanh thu dự án
        $totalContractValue = Contract::sum('contract_value');
        $completedProjectsValue = Contract::whereHas('project', fn($q) => $q->where('status', 'completed'))
            ->sum('contract_value');

        // Chi phí dự án
        $totalProjectCosts = Cost::whereNotNull('project_id')->where('status', '!=', 'rejected')->sum('amount');

        // Chi phí vận hành
        $totalOperatingCosts = Cost::whereNull('project_id')->where('status', '!=', 'rejected')->sum('amount');
        $costsByCategory = Cost::whereNull('project_id')
            ->where('status', '!=', 'rejected')
            ->selectRaw("COALESCE(expense_category, 'uncategorized') as cat, SUM(amount) as total")
            ->groupBy('cat')
            ->pluck('total', 'cat')
            ->toArray();

        // Tài sản
        $totalAssetValue = Equipment::active()->sum('current_value');
        $assetCount = Equipment::active()->count();
        $totalDepreciation = Equipment::sum('accumulated_depreciation');

        // Monthly trend (6 months)
        $monthlyTrend = [];
        $now = Carbon::now();
        for ($i = 5; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $start = $month->copy()->startOfMonth();
            $end   = $month->copy()->endOfMonth();

            $monthlyTrend[] = [
                'month' => $month->format('m/Y'),
                'label' => 'T' . $month->format('m'),
                'project_costs' => Cost::whereNotNull('project_id')
                    ->where('status', '!=', 'rejected')
                    ->whereBetween('cost_date', [$start, $end])
                    ->sum('amount') ?: 0,
                'operating_costs' => Cost::whereNull('project_id')
                    ->where('status', '!=', 'rejected')
                    ->whereBetween('cost_date', [$start, $end])
                    ->sum('amount') ?: 0,
            ];
        }

        // Shareholders
        $shareholders = Shareholder::active()
            ->orderByDesc('contributed_amount')
            ->get();

        // Tài sản summary
        $assetsByCategory = Equipment::active()
            ->selectRaw('category, COUNT(*) as cnt, SUM(current_value) as total_value')
            ->groupBy('category')
            ->get();

        $assetsByStatus = Equipment::selectRaw('status, COUNT(*) as cnt')
            ->groupBy('status')
            ->pluck('cnt', 'status')
            ->toArray();

        return Inertia::render('Crm/Operations/Index', [
            'stats' => [
                'totalCapital'          => $totalCapital,
                'shareholderCount'      => $shareholderCount,
                'totalContractValue'    => $totalContractValue,
                'completedProjectsValue' => $completedProjectsValue,
                'totalProjectCosts'     => $totalProjectCosts,
                'totalOperatingCosts'   => $totalOperatingCosts,
                'totalAssetValue'       => $totalAssetValue,
                'assetCount'            => $assetCount,
                'totalDepreciation'     => $totalDepreciation,
                'costsByCategory'       => $costsByCategory,
            ],
            'monthlyTrend'     => $monthlyTrend,
            'shareholders'     => $shareholders,
            'assetsByCategory' => $assetsByCategory,
            'assetsByStatus'   => $assetsByStatus,
        ]);
    }

    // ================================================================
    // SHAREHOLDERS — Quản lý nguồn vốn
    // ================================================================
    public function shareholders()
    {
        $shareholders = Shareholder::with('creator:id,name')
            ->orderByDesc('contributed_amount')
            ->get();

        $totalCapital = $shareholders->where('status', 'active')->sum('contributed_amount');

        return Inertia::render('Crm/Operations/Shareholders', [
            'shareholders' => $shareholders,
            'totalCapital' => $totalCapital,
        ]);
    }

    public function storeShareholder(Request $request)
    {
        $validated = $request->validate([
            'name'               => 'required|string|max:255',
            'phone'              => 'nullable|string|max:20',
            'email'              => 'nullable|email|max:255',
            'id_number'          => 'nullable|string|max:50',
            'contributed_amount' => 'required|numeric|min:0',
            'share_percentage'   => 'required|numeric|min:0|max:100',
            'contribution_date'  => 'nullable|date',
            'notes'              => 'nullable|string',
        ]);

        Shareholder::create($validated);
        return redirect()->back()->with('success', 'Đã thêm cổ đông thành công.');
    }

    public function updateShareholder(Request $request, $id)
    {
        $shareholder = Shareholder::findOrFail($id);

        $validated = $request->validate([
            'name'               => 'required|string|max:255',
            'phone'              => 'nullable|string|max:20',
            'email'              => 'nullable|email|max:255',
            'id_number'          => 'nullable|string|max:50',
            'contributed_amount' => 'required|numeric|min:0',
            'share_percentage'   => 'required|numeric|min:0|max:100',
            'contribution_date'  => 'nullable|date',
            'status'             => 'nullable|in:active,inactive',
            'notes'              => 'nullable|string',
        ]);

        $shareholder->update($validated);
        return redirect()->back()->with('success', 'Đã cập nhật thông tin cổ đông.');
    }

    public function destroyShareholder($id)
    {
        Shareholder::findOrFail($id)->delete();
        return redirect()->back()->with('success', 'Đã xóa cổ đông.');
    }

    // ================================================================
    // COMPANY ASSETS — Quản lý tài sản
    // ================================================================
    public function assets(Request $request)
    {
        $query = Equipment::with(['assignedTo:id,name', 'project:id,name', 'creator:id,name'])
            ->orderByDesc('created_at');

        if ($cat = $request->get('category')) {
            $query->where('category', $cat);
        }
        if ($status = $request->get('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('serial_number', 'like', "%{$search}%");
            });
        }

        $assets = $query->paginate(20)->withQueryString();

        // Stats
        $totalValue = Equipment::active()->sum('current_value');
        $totalPurchase = Equipment::active()->sum('purchase_price');
        $totalDepreciation = Equipment::sum('accumulated_depreciation');
        $counts = Equipment::selectRaw('status, COUNT(*) as cnt')
            ->groupBy('status')
            ->pluck('cnt', 'status')
            ->toArray();

        $users = User::orderBy('name')->get(['id', 'name']);
        $projects = Project::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Crm/Operations/Assets', [
            'assets' => $assets,
            'stats' => [
                'totalValue'        => $totalValue,
                'totalPurchase'     => $totalPurchase,
                'totalDepreciation' => $totalDepreciation,
                'counts'            => $counts,
            ],
            'users'    => $users,
            'projects' => $projects,
            'filters' => [
                'search'   => $request->get('search', ''),
                'category' => $request->get('category', ''),
                'status'   => $request->get('status', ''),
            ],
        ]);
    }

    public function storeAsset(Request $request)
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:255',
            'category'            => 'required|in:computer,machinery,vehicle,furniture,other',
            'purchase_price'      => 'required|numeric|min:0',
            'purchase_date'       => 'required|date',
            'useful_life_months'  => 'required|integer|min:1|max:600',
            'depreciation_method' => 'nullable|in:straight_line,declining_balance',
            'residual_value'      => 'nullable|numeric|min:0',
            'serial_number'       => 'nullable|string|max:100',
            'brand'               => 'nullable|string|max:100',
            'location'            => 'nullable|string|max:255',
            'description'         => 'nullable|string',
            'notes'               => 'nullable|string',
        ]);

        $validated['current_value'] = $validated['purchase_price'];
        $validated['depreciation_method'] = $validated['depreciation_method'] ?? 'straight_line';
        $validated['residual_value'] = $validated['residual_value'] ?? 0;
        $validated['type'] = 'owned';

        Equipment::create($validated);

        return redirect()->back()->with('success', 'Đã thêm tài sản thành công.');
    }

    public function updateAsset(Request $request, $id)
    {
        $asset = Equipment::findOrFail($id);

        $validated = $request->validate([
            'name'                => 'required|string|max:255',
            'category'            => 'required|in:computer,machinery,vehicle,furniture,other',
            'purchase_price'      => 'required|numeric|min:0',
            'purchase_date'       => 'required|date',
            'useful_life_months'  => 'required|integer|min:1|max:600',
            'residual_value'      => 'nullable|numeric|min:0',
            'serial_number'       => 'nullable|string|max:100',
            'brand'               => 'nullable|string|max:100',
            'location'            => 'nullable|string|max:255',
            'description'         => 'nullable|string',
            'notes'               => 'nullable|string',
        ]);

        $asset->update($validated);
        return redirect()->back()->with('success', 'Đã cập nhật tài sản.');
    }

    public function destroyAsset($id)
    {
        Equipment::findOrFail($id)->delete();
        return redirect()->back()->with('success', 'Đã xóa tài sản.');
    }

    public function assignAsset(Request $request, $id)
    {
        $asset = Equipment::findOrFail($id);

        $validated = $request->validate([
            'action'     => 'required|in:assign,return,transfer,repair,dispose',
            'user_id'    => 'nullable|exists:users,id',
            'project_id' => 'nullable|exists:projects,id',
            'location'   => 'nullable|string|max:255',
            'notes'      => 'nullable|string',
        ]);

        // Log assignment
        $asset->assignments()->create($validated);

        // Update asset status & assignment
        $statusMap = [
            'assign'   => 'in_use',
            'return'   => 'available',
            'transfer' => 'in_use',
            'repair'   => 'maintenance',
            'dispose'  => 'retired',
        ];

        $updateData = ['status' => $statusMap[$validated['action']]];

        if ($validated['action'] === 'return') {
            $updateData['assigned_to'] = null;
            $updateData['project_id'] = null;
            $updateData['location'] = $validated['location'] ?? 'Kho';
        } else {
            if (isset($validated['user_id'])) $updateData['assigned_to'] = $validated['user_id'];
            if (isset($validated['project_id'])) $updateData['project_id'] = $validated['project_id'];
            if (isset($validated['location'])) $updateData['location'] = $validated['location'];
        }

        $asset->update($updateData);

        return redirect()->back()->with('success', 'Đã cập nhật trạng thái tài sản.');
    }

    public function runDepreciation()
    {
        $assets = Equipment::active()
            ->where('current_value', '>', DB::raw('residual_value'))
            ->get();

        $count = 0;
        foreach ($assets as $asset) {
            if ($asset->runMonthlyDepreciation()) {
                $count++;
            }
        }

        return redirect()->back()->with('success', "Đã chạy khấu hao cho {$count} tài sản.");
    }
}
