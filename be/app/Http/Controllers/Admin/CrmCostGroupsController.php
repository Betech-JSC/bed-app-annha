<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Constants\Permissions;
use App\Models\CostGroup;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CrmCostGroupsController extends Controller
{
    use CrmAuthorization;

    public function index(Request $request)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::COMPANY_COST_VIEW);

        $query = CostGroup::with('creator')->withCount('costs');

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->query('status') === 'active') {
            $query->active();
        } elseif ($request->query('status') === 'inactive') {
            $query->where('is_active', false);
        }

        $costGroups = $query->ordered()->paginate(20)->withQueryString();

        $stats = [
            'total' => CostGroup::count(),
            'active' => CostGroup::where('is_active', true)->count(),
            'inactive' => CostGroup::where('is_active', false)->count(),
            'total_costs' => \App\Models\Cost::whereNotNull('cost_group_id')->count(),
        ];

        return Inertia::render('Crm/CostGroups/Index', [
            'costGroups' => $costGroups,
            'stats' => $stats,
            'filters' => $request->only(['search', 'status']),
        ]);
    }

    public function store(Request $request)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::COMPANY_COST_CREATE);
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:50|unique:cost_groups,code',
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        CostGroup::create([
            ...$validated,
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => $validated['sort_order'] ?? 0,
            'created_by' => auth('admin')->id(),
        ]);

        return back()->with('success', 'Đã tạo nhóm chi phí thành công.');
    }

    public function update(Request $request, $id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::COMPANY_COST_UPDATE);
        $costGroup = CostGroup::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => ['nullable', 'string', 'max:50', Rule::unique('cost_groups', 'code')->ignore($costGroup->id)],
            'description' => 'nullable|string|max:1000',
            'is_active' => 'boolean',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        $costGroup->update($validated);

        return back()->with('success', 'Đã cập nhật nhóm chi phí.');
    }

    public function destroy($id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::COMPANY_COST_DELETE);
        $costGroup = CostGroup::findOrFail($id);

        // Prevent deletion if costs are using this group
        if ($costGroup->costs()->count() > 0) {
            return back()->with('error', 'Không thể xóa nhóm chi phí đang được sử dụng bởi ' . $costGroup->costs()->count() . ' chi phí.');
        }

        $costGroup->delete();
        return back()->with('success', 'Đã xóa nhóm chi phí.');
    }

    public function toggleActive($id)
    {
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::COMPANY_COST_UPDATE);
        $costGroup = CostGroup::findOrFail($id);
        $costGroup->update(['is_active' => !$costGroup->is_active]);

        $status = $costGroup->is_active ? 'kích hoạt' : 'vô hiệu hóa';
        return back()->with('success', "Đã {$status} nhóm chi phí \"{$costGroup->name}\".");
    }
}
