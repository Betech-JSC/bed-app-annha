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

        // Build role templates with permission IDs resolved from names
        $permissionNameToId = $permissions->pluck('id', 'name')->toArray();
        $roleTemplates = collect($this->getRoleTemplates())->map(function ($tpl) use ($permissionNameToId) {
            return [
                'name'        => $tpl['name'],
                'description' => $tpl['description'],
                'icon'        => $tpl['icon'],
                'color'       => $tpl['color'],
                'permissions' => collect($tpl['permission_names'])
                    ->map(fn($name) => $permissionNameToId[$name] ?? null)
                    ->filter()
                    ->values()
                    ->toArray(),
            ];
        })->values();

        return Inertia::render('Crm/Roles/Index', [
            'roles' => $roles,
            'groupedPermissions' => $groupedPermissions,
            'allPermissions' => $permissions->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'label' => $p->description ?: $p->name,
            ]),
            'users' => $users,
            'roleTemplates' => $roleTemplates,
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
            // Dashboard
            'crm.dashboard' => 'Màn hình Tổng quan',

            // Core — Dự án
            'project' => 'Quản lý dự án',
            'progress' => 'Tiến độ thi công',
            'project.comment' => 'Bình luận dự án',
            'project.task' => 'Công việc / Hạng mục',
            'project.phase' => 'Giai đoạn dự án',
            'project.document' => 'Tài liệu dự án',
            'project.risk' => 'Rủi ro dự án',
            'project.monitoring' => 'Giám sát dự án',

            // Finance — Tài chính
            'cost' => 'Chi phí nội bộ',
            'additional_cost' => 'Chi phí phát sinh',
            'company_cost' => 'Chi phí công ty',
            'payment' => 'Đợt thanh toán (KH)',
            'invoice' => 'Hóa đơn đầu ra',
            'input_invoice' => 'Hóa đơn đầu vào',
            'contract' => 'Hợp đồng dự án',
            'revenue' => 'Doanh thu',
            'budgets' => 'Ngân sách dự án',
            'receipts' => 'Phiếu thu / Phiếu chi',
            'report' => 'Báo cáo',
            'finance' => 'Tổng hợp tài chính',

            // Resources — Nguồn lực
            'material' => 'Kho vật tư / Vật liệu',
            'material_bill' => 'Phiếu xuất vật tư',
            'equipment' => 'Thiết bị',
            'personnel' => 'Nhân sự dự án',

            // Quality — Chất lượng
            'acceptance' => 'Nghiệm thu công trình',
            'acceptance.template' => 'Mẫu nghiệm thu',
            'defect' => 'Lỗi / Khuyết tật',
            'change_request' => 'Yêu cầu thay đổi',
            'issue' => 'Sự cố / Vấn đề',

            // Subcontractors & Suppliers
            'subcontractor' => 'Nhà thầu phụ',
            'subcontractor_payment' => 'Thanh toán nhà thầu phụ',
            'subcontractor.contract' => 'Hợp đồng thầu phụ',
            'subcontractor.acceptance' => 'Nghiệm thu thầu phụ',
            'subcontractor.progress' => 'Tiến độ thầu phụ',
            'suppliers' => 'Nhà cung cấp',
            'supplier.contract' => 'Hợp đồng NCC',
            'supplier.acceptance' => 'Nghiệm thu NCC',

            // Documents & Logs
            'document' => 'Tài liệu chung',
            'log' => 'Nhật ký công trình',
            'reminder' => 'Nhắc nhở',

            // HR & KPI
            'kpi' => 'KPI nhân sự',
            'departments' => 'Phòng ban',
            'attendance' => 'Chấm công',
            'labor_productivity' => 'Năng suất lao động',

            // Gantt & WBS
            'gantt' => 'Biểu đồ Gantt / WBS',
            'wbs' => 'Cấu trúc WBS',

            // Analysis
            'evm' => 'Phân tích giá trị thu được (EVM)',
            'evm_predictive' => 'EVM & Dự báo',
            'predictive' => 'Dự báo chi phí & tiến độ',

            // Operations — Vận hành
            'operations' => 'Vận hành công ty',
            'shareholder' => 'Cổ đông',
            'company_asset' => 'Tài sản công ty',
            'company_financial' => 'Tài chính toàn công ty',

            // Reports
            'project_monitoring' => 'Giám sát dự án',
            'project_summary_report' => 'Báo cáo tổng hợp dự án',

            // Warranty
            'warranty' => 'Bảo hành & Bảo trì',

            // System
            'settings' => 'Cài đặt hệ thống',

            'general' => 'Chung',
            'company_cost' => 'Chi phí vận hành công ty',
        ][$key] ?? ucfirst(str_replace('_', ' ', $key));
    }

    /**
     * Predefined role templates with suggested permissions
     */
    private function getRoleTemplates(): array
    {
        return [
            [
                'name' => 'Giám đốc / Ban lãnh đạo',
                'description' => 'Toàn quyền quản lý hệ thống, xem tất cả báo cáo và phê duyệt',
                'icon' => 'crown',
                'color' => '#D4AF37',
                'permission_names' => [
                    'crm.dashboard.view',
                    // Chi phí công ty
                    'company_cost.view', 'company_cost.create', 'company_cost.update', 'company_cost.delete', 'company_cost.submit', 'company_cost.approve.management', 'company_cost.approve.accountant', 'company_cost.reject',
                    // Dự án
                    'project.view', 'project.create', 'project.update', 'project.delete', 'project.manage',
                    'project.comment.view', 'project.comment.create',
                    'progress.view',
                    'project.task.view',
                    'project.phase.view',
                    'project.document.view', 'project.document.upload', 'project.document.delete',
                    'project.risk.view', 'project.risk.create', 'project.risk.update', 'project.risk.delete',
                    'project.monitoring.view',
                    // Tài chính
                    'cost.view', 'cost.approve.management',
                    'additional_cost.view', 'additional_cost.approve',
                    'budgets.view', 'budgets.create', 'budgets.update', 'budgets.approve',
                    'payment.view', 'payment.approve',
                    'invoice.view', 'invoice.approve',
                    'input_invoice.view',
                    'contract.view', 'contract.create', 'contract.update', 'contract.approve.level_2',
                    'revenue.view', 'revenue.dashboard', 'revenue.export',
                    'receipts.view',
                    'finance.view', 'finance.manage',
                    // Nghiệm thu
                    'acceptance.view', 'acceptance.approve.level_2',
                    // Nhà thầu phụ & NCC
                    'subcontractor.view',
                    'subcontractor_payment.view', 'subcontractor_payment.approve',
                    'suppliers.view',
                    'supplier.contract.view', 'supplier.contract.approve',
                    // Thiết bị & Vật tư
                    'material.view', 'material.approve',
                    'equipment.view', 'equipment.approve',
                    // Nhân sự & KPI
                    'personnel.view',
                    'kpi.view', 'kpi.verify',
                    // Báo cáo
                    'report.view', 'report.export', 'report.financial', 'report.progress',
                    'report.project_summary.view',
                    'evm.view', 'predictive.view',
                    'company_financial.view',
                    // Vận hành
                    'shareholder.view', 'shareholder.create', 'shareholder.update', 'shareholder.delete',
                    'company_asset.view', 'company_asset.create', 'company_asset.update',
                    'operations.dashboard.view',
                    // Bảo hành
                    'warranty.view', 'warranty.approve',
                    // Cài đặt
                    'settings.view', 'settings.manage',
                ],
            ],
            [
                'name' => 'Quản lý dự án (PM)',
                'description' => 'Quản lý toàn bộ hoạt động trong dự án, duyệt nghiệm thu, theo dõi chi phí & tiến độ',
                'icon' => 'project',
                'color' => '#1B4F72',
                'permission_names' => [
                    // Dự án
                    'project.view', 'project.create', 'project.update', 'project.manage',
                    'project.comment.view', 'project.comment.create', 'project.comment.update', 'project.comment.delete',
                    'progress.view', 'progress.update',
                    'project.task.view', 'project.task.create', 'project.task.update', 'project.task.delete',
                    'project.phase.view', 'project.phase.create', 'project.phase.update', 'project.phase.delete',
                    'project.document.view', 'project.document.upload', 'project.document.delete',
                    'project.risk.view', 'project.risk.create', 'project.risk.update', 'project.risk.delete',
                    'project.monitoring.view',
                    // Tài chính
                    'cost.view', 'cost.create', 'cost.update', 'cost.submit',
                    'additional_cost.view', 'additional_cost.create', 'additional_cost.update',
                    'budgets.view', 'budgets.create', 'budgets.update',
                    'payment.view', 'payment.create',
                    'invoice.view', 'invoice.create',
                    'contract.view', 'contract.create', 'contract.update', 'contract.approve.level_1',
                    'revenue.view',
                    'finance.view',
                    // Nghiệm thu
                    'acceptance.view', 'acceptance.create', 'acceptance.update', 'acceptance.attach_files',
                    'acceptance.approve.level_2',
                    'acceptance.template.view',
                    // Nhà thầu phụ
                    'subcontractor.view', 'subcontractor.create', 'subcontractor.update',
                    'subcontractor_payment.view', 'subcontractor_payment.create',
                    // NCC
                    'suppliers.view',
                    'supplier.contract.view', 'supplier.contract.create',
                    'supplier.acceptance.view', 'supplier.acceptance.create',
                    // Thiết bị & Vật tư
                    'material.view', 'material.create', 'material.update',
                    'equipment.view', 'equipment.create', 'equipment.update',
                    // Nhật ký
                    'log.view', 'log.approve',
                    'document.view', 'document.upload',
                    'defect.view', 'defect.create', 'defect.update',
                    // Nhân sự
                    'personnel.view', 'personnel.assign', 'personnel.remove',
                    'kpi.view', 'kpi.create', 'kpi.update',
                    'attendance.view', 'attendance.manage',
                    'labor_productivity.view',
                    // Yêu cầu thay đổi & Sự cố
                    'change_request.view', 'change_request.create', 'change_request.update', 'change_request.approve',
                    'issue.view', 'issue.create', 'issue.update', 'issue.resolve',
                    // Gantt
                    'gantt.view', 'gantt.update',
                    'wbs.template.view', 'wbs.template.create',
                    // Báo cáo
                    'report.view', 'report.export', 'report.progress',
                    'evm.view', 'predictive.view',
                    // Bảo hành
                    'warranty.view', 'warranty.create', 'warranty.update',
                ],
            ],
            [
                'name' => 'Kế toán / Tài chính',
                'description' => 'Quản lý thu chi, hóa đơn, xác nhận thanh toán, phiếu thu/chi',
                'icon' => 'dollar',
                'color' => '#27AE60',
                'permission_names' => [
                    'crm.dashboard.view',
                    // Chi phí công ty
                    'company_cost.view', 'company_cost.create', 'company_cost.update', 'company_cost.delete', 'company_cost.submit', 'company_cost.approve.accountant', 'company_cost.reject',
                    'project.view',
                    // Chi phí
                    'cost.view', 'cost.create', 'cost.update', 'cost.approve.accountant',
                    'additional_cost.view', 'additional_cost.confirm',
                    // Thanh toán
                    'payment.view', 'payment.create', 'payment.update', 'payment.confirm',
                    // Hóa đơn
                    'invoice.view', 'invoice.create', 'invoice.update', 'invoice.send',
                    'input_invoice.view', 'input_invoice.create', 'input_invoice.update',
                    // Hợp đồng
                    'contract.view',
                    // Ngân sách
                    'budgets.view',
                    // Doanh thu
                    'revenue.view', 'revenue.dashboard', 'revenue.export',
                    // Phiếu thu/chi
                    'receipts.view', 'receipts.create', 'receipts.update', 'receipts.verify',
                    // Tài chính
                    'finance.view', 'finance.manage',
                    // NTP thanh toán
                    'subcontractor_payment.view', 'subcontractor_payment.mark_paid',
                    // Báo cáo
                    'report.view', 'report.export', 'report.financial',
                    'company_financial.view',
                    // Tài sản
                    'company_asset.view', 'company_asset.depreciate',
                ],
            ],
            [
                'name' => 'Giám sát công trình',
                'description' => 'Giám sát tiến độ, duyệt nghiệm thu cấp 1, theo dõi nhật ký & lỗi',
                'icon' => 'eye',
                'color' => '#E67E22',
                'permission_names' => [
                    'project.view',
                    'project.comment.view', 'project.comment.create',
                    'progress.view', 'progress.update',
                    'project.task.view', 'project.task.update',
                    'project.phase.view',
                    'project.document.view',
                    'project.monitoring.view',
                    // Nghiệm thu
                    'acceptance.view', 'acceptance.create', 'acceptance.update', 'acceptance.attach_files',
                    'acceptance.approve.level_1',
                    'acceptance.template.view',
                    // Nhật ký & Lỗi
                    'log.view', 'log.create', 'log.update', 'log.approve',
                    'defect.view', 'defect.create', 'defect.update', 'defect.verify',
                    // Vật tư  & Thiết bị
                    'material.view', 'material.create',
                    'equipment.view',
                    // Sự cố
                    'issue.view', 'issue.create', 'issue.update',
                    'change_request.view',
                    // Chấm công
                    'attendance.view', 'attendance.approve',
                    'labor_productivity.view', 'labor_productivity.create', 'labor_productivity.update',
                    // Gantt
                    'gantt.view',
                    // Bảo hành
                    'warranty.view', 'warranty.create',
                    // Tài liệu
                    'document.view', 'document.upload',
                ],
            ],
            [
                'name' => 'Nhân viên kỹ thuật / Thi công',
                'description' => 'Nhập liệu công việc, báo cáo tiến độ, chấm công, nhật ký hằng ngày',
                'icon' => 'tool',
                'color' => '#2E86C1',
                'permission_names' => [
                    'project.view',
                    'project.comment.view', 'project.comment.create',
                    'progress.view',
                    'project.task.view', 'project.task.update',
                    'project.document.view',
                    // Nhật ký
                    'log.view', 'log.create', 'log.update',
                    // Lỗi
                    'defect.view', 'defect.create',
                    // Vật tư & Thiết bị
                    'material.view', 'material.create',
                    'equipment.view',
                    // Chấm công
                    'attendance.view', 'attendance.check_in',
                    'labor_productivity.view',
                    // Sự cố
                    'issue.view', 'issue.create',
                    // Tài liệu
                    'document.view',
                    // Gantt (chỉ xem)
                    'gantt.view',
                ],
            ],
            [
                'name' => 'Khách hàng / Chủ đầu tư',
                'description' => 'Xem tiến độ, nghiệm thu, xác nhận thanh toán, phê duyệt yêu cầu thay đổi',
                'icon' => 'user',
                'color' => '#8E44AD',
                'permission_names' => [
                    'project.view',
                    'progress.view',
                    'project.document.view',
                    'project.monitoring.view',
                    // Nghiệm thu
                    'acceptance.view', 'acceptance.approve.level_3',
                    // Thanh toán
                    'payment.view', 'payment.mark_paid_by_customer',
                    'additional_cost.view', 'additional_cost.mark_paid_by_customer',
                    // Hợp đồng
                    'contract.view', 'contract.approve.level_2',
                    // Yêu cầu thay đổi
                    'change_request.view', 'change_request.approve',
                    // Báo cáo
                    'report.view', 'report.progress',
                    // Bảo hành
                    'warranty.view',
                ],
            ],
        ];
    }
}

