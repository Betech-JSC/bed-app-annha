<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Role;
use App\Models\Permission;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CrmRolesController extends Controller
{
    /**
     * Main page — list all roles with their permissions
     */
    public function index()
    {
        $roles = Role::with('permissions')
            ->withCount('users')
            ->orderBy('name')
            ->get()
            ->map(fn($role) => [
                'id' => $role->id,
                'name' => $role->name,
                'description' => $role->description,
                'users_count' => $role->users_count ?? 0,
                'permissions' => $role->permissions->pluck('id')->toArray(),
                'permission_names' => $role->permissions->map(fn($p) => $p->description ?: $p->name)->toArray(),
                'created_at' => $role->created_at?->format('d/m/Y'),
            ]);

        // Group permissions by prefix (e.g. "project.view" => group "project")
        $permissions = Permission::orderBy('name')->get();
        $groupedPermissions = $permissions->groupBy(function ($p) {
            // Handle compound prefixes like additional_cost, change_request, etc.
            $parts = explode('.', $p->name);
            // If the prefix contains underscore-based compound names, group them properly
            if (count($parts) >= 2) {
                // Check for known compound prefixes
                $first = $parts[0];
                $second = $parts[1] ?? '';
                $compoundPrefixes = [
                    'additional_cost', 'change_request', 'input_invoice',
                    'material_bill', 'subcontractor_payment', 'company_cost',
                ];
                if (in_array($first . '_' . $second, $compoundPrefixes)) {
                    return $first . '_' . $second;
                }
                // Check for "supplier.contract", "supplier.acceptance", "subcontractor.progress" etc.
                $dotPrefixes = ['supplier.contract', 'supplier.acceptance', 'subcontractor.contract', 'subcontractor.acceptance', 'subcontractor.progress', 'project.comment', 'project.task', 'project.phase', 'project.document', 'project.risk', 'project.monitoring', 'acceptance.template'];
                $twoLevel = $first . '.' . $second;
                if (in_array($twoLevel, $dotPrefixes)) {
                    return $twoLevel;
                }
            }
            return $parts[0] ?? 'general';
        })->map(function ($group, $key) {
            return [
                'group' => $this->translateGroup($key),
                'key' => $key,
                'items' => $group->map(fn($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'description' => $p->description,
                    'label' => $p->description ?: $p->name,
                ])->values(),
            ];
        })->values();

        $users = User::orderBy('name')
            ->select('id', 'name', 'email')
            ->get();

        return Inertia::render('Crm/Roles/Index', [
            'roles' => $roles,
            'groupedPermissions' => $groupedPermissions,
            'allPermissions' => $permissions->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'label' => $p->description ?: $p->name,
            ]),
            'users' => $users,
        ]);
    }

    /**
     * Create a new role
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'description' => 'nullable|string|max:500',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        if (!empty($validated['permissions'])) {
            $role->permissions()->sync($validated['permissions']);
        }

        return redirect()->back()->with('success', 'Tạo vai trò thành công');
    }

    /**
     * Update role + sync permissions
     */
    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'name' => "required|string|max:255|unique:roles,name,{$id}",
            'description' => 'nullable|string|max:500',
            'permissions' => 'array',
            'permissions.*' => 'exists:permissions,id',
        ]);

        $role->update([
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
        ]);

        $role->permissions()->sync($validated['permissions'] ?? []);

        return redirect()->back()->with('success', 'Cập nhật vai trò thành công');
    }

    /**
     * Delete a role
     */
    public function destroy($id)
    {
        $role = Role::findOrFail($id);
        $role->permissions()->detach();
        $role->users()->detach();
        $role->delete();

        return redirect()->back()->with('success', 'Xóa vai trò thành công');
    }

    /**
     * Assign role to user
     */
    public function assignUser(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $role->users()->syncWithoutDetaching([$validated['user_id']]);

        return redirect()->back()->with('success', 'Gán vai trò thành công');
    }

    /**
     * Remove role from user
     */
    public function removeUser(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
        ]);

        $role->users()->detach($validated['user_id']);

        return redirect()->back()->with('success', 'Gỡ vai trò thành công');
    }

    // ============================================================
    // HELPERS
    // ============================================================

    private function translateGroup(string $key): string
    {
        return [
            // Core
            'project' => 'Dự án',
            'progress' => 'Tiến độ',
            'project.comment' => 'Bình luận dự án',
            'project.task' => 'Công việc dự án',
            'project.phase' => 'Giai đoạn dự án',
            'project.document' => 'Tài liệu dự án',
            'project.risk' => 'Rủi ro dự án',
            'project.monitoring' => 'Giám sát dự án',

            // Finance
            'cost' => 'Chi phí nội bộ',
            'additional_cost' => 'Chi phí phát sinh',
            'company_cost' => 'Chi phí công ty',
            'payment' => 'Thanh toán',
            'invoice' => 'Hóa đơn đầu ra',
            'input_invoice' => 'Hóa đơn đầu vào',
            'contract' => 'Hợp đồng',
            'revenue' => 'Doanh thu',
            'budgets' => 'Ngân sách',
            'receipts' => 'Phiếu thu/chi',
            'report' => 'Báo cáo',

            // Resources
            'material' => 'Vật tư/Vật liệu',
            'material_bill' => 'Phiếu xuất vật tư',
            'equipment' => 'Thiết bị',
            'personnel' => 'Nhân sự dự án',

            // Quality
            'acceptance' => 'Nghiệm thu',
            'acceptance.template' => 'Mẫu nghiệm thu',
            'defect' => 'Lỗi phát sinh',
            'change_request' => 'Yêu cầu thay đổi',
            'issue' => 'Sự cố/Vấn đề',
            'evm' => 'Phân tích EVM',

            // Subcontractors & Suppliers
            'subcontractor' => 'Nhà thầu phụ',
            'subcontractor_payment' => 'Thanh toán NTP',
            'subcontractor.contract' => 'Hợp đồng thầu phụ',
            'subcontractor.acceptance' => 'Nghiệm thu thầu phụ',
            'subcontractor.progress' => 'Tiến độ thầu phụ',
            'suppliers' => 'Nhà cung cấp',
            'supplier.contract' => 'Hợp đồng NCC',
            'supplier.acceptance' => 'Nghiệm thu NCC',

            // Operations
            'document' => 'Tài liệu',
            'log' => 'Nhật ký công trình',
            'reminder' => 'Nhắc nhở',

            // HR & System
            'kpi' => 'KPI Nhân sự',
            'departments' => 'Phòng ban',
            'settings' => 'Cài đặt hệ thống',

            'general' => 'Chung',
        ][$key] ?? ucfirst(str_replace('_', ' ', $key));
    }
}
