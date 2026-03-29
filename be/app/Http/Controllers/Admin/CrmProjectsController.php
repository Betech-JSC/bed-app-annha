<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\User;
use App\Models\Cost;
use App\Models\Contract;
use App\Models\ProjectPayment;
use App\Models\ProjectPersonnel;
use App\Models\Subcontractor;
use App\Models\SubcontractorPayment;
use App\Models\GlobalSubcontractor;
use App\Models\ConstructionLog;
use App\Models\ProjectComment;
use App\Models\Defect;
use App\Models\ChangeRequest;
use App\Models\ProjectBudget;
use App\Models\BudgetItem;
use App\Models\Invoice;
use App\Models\ProjectRisk;
use App\Models\AdditionalCost;
use App\Models\AcceptanceStage;
use App\Models\AcceptanceItem;
use App\Models\AcceptanceTemplate;
use App\Models\Attachment;
use App\Models\SubcontractorItem;
use App\Models\MaterialBill;
use App\Models\MaterialBillItem;
use App\Models\MaterialQuota;
use App\Constants\Permissions;
use App\Services\AuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CrmProjectsController extends Controller
{
    protected $authService;

    public function __construct(AuthorizationService $authService)
    {
        $this->authService = $authService;
    }

    /**
     * CRM admin users are Admin model, not User model.
     * AuthorizationService expects User. Skip check for Admin (full access).
     */
    protected function crmRequire($user, string $permission, $project = null): void
    {
        if ($user instanceof \App\Models\Admin) return; // Admin has full access
        $this->authService->require($user, $permission, $project);
    }

    /**
     * Danh sách dự án
     */
    public function index(Request $request)
    {
        $query = Project::with([
            'customer:id,name,email,phone',
            'projectManager:id,name,email',
            'contract:id,project_id,contract_value,status',
            'progress',
        ]);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $projects = $query->orderByDesc('created_at')->paginate(20)->withQueryString();

        $stats = [
            'total' => Project::count(),
            'planning' => Project::where('status', 'planning')->count(),
            'in_progress' => Project::where('status', 'in_progress')->count(),
            'completed' => Project::where('status', 'completed')->count(),
        ];

        return Inertia::render('Crm/Projects/Index', [
            'projects' => $projects,
            'stats' => $stats,
            'filters' => $request->only(['search', 'status']),
            'users' => User::select('id', 'name', 'email', 'phone')->orderBy('name')->get(),
        ]);
    }

    /**
     * Chi tiết dự án — with RBAC permissions
     */
    public function show(string $id)
    {
        $project = Project::with([
            'customer',
            'projectManager',
            'creator',
            'contract.attachments',
            'payments.attachments',
            'additionalCosts.proposer',
            'additionalCosts.approver',
            'additionalCosts.attachments',
            'costs' => function ($q) {
                $q->orderByDesc('created_at');
            },
            'costs.creator',
            'costs.costGroup',
            'costs.subcontractor',
            'costs.attachments',
            'personnel.user',
            'personnel.personnelRole',
            'subcontractors.payments',
            'subcontractors.items',
            'subcontractors.attachments',
            'subcontractors.approver',
            'constructionLogs' => function ($q) {
                $q->with(['creator:id,name', 'task:id,name'])->latest('log_date');
            },
            'acceptanceStages' => function ($q) {
                $q->with([
                    'items',
                    'task:id,name,parent_id',
                    'acceptanceTemplate',
                    'defects' => function ($dq) {
                        $dq->whereIn('status', ['open', 'in_progress', 'resolved', 'verified']);
                    },
                    'attachments',
                ])->orderBy('order');
            },
            'defects.attachments',
            'phases',
            'progress',
            'changeRequests.requester',
            'changeRequests.approver',
            'invoices.attachments',
            'budgets.items',
            'budgets.creator',
            'comments' => function ($q) {
                $q->whereNull('parent_id')->with(['user', 'replies.user'])->orderByDesc('created_at');
            },
            'risks.owner',
            'risks.identifier',
            'attachments' => function ($q) {
                $q->latest();
            },
        ])->findOrFail($id);

        // Get users for assignment dropdowns
        $users = User::select('id', 'name', 'email', 'phone')->orderBy('name')->get();

        // RBAC — Get current user's permissions for this project
        $user = auth('admin')->user();
        // Admin model gets full access; User model uses AuthorizationService
        $permissions = ($user instanceof \App\Models\Admin)
            ? ['*']
            : $this->authService->getProjectPermissions($user, $project);

        // Get cost groups for cost form
        $costGroups = [];
        if (class_exists(\App\Models\CostGroup::class)) {
            $costGroups = \App\Models\CostGroup::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']);
        }

        // Get personnel roles
        $personnelRoles = [];
        if (class_exists(\App\Models\PersonnelRole::class)) {
            $personnelRoles = \App\Models\PersonnelRole::orderBy('name')->get(['id', 'name']);
        }

        // Get materials for cost assignment
        $materials = [];
        if (class_exists(\App\Models\Material::class)) {
            $materials = \App\Models\Material::select('id', 'name', 'code', 'unit', 'unit_price')->orderBy('name')->get();
        }

        // Get global subcontractors for selection
        $globalSubcontractors = [];
        if (class_exists(\App\Models\GlobalSubcontractor::class)) {
            $globalSubcontractors = \App\Models\GlobalSubcontractor::orderBy('name')->get(['id', 'name', 'category', 'bank_name', 'bank_account_number', 'bank_account_name']);
        }

        // Get leaf tasks (no children) for construction log form
        $projectTasks = \App\Models\ProjectTask::where('project_id', $project->id)
            ->whereNull('deleted_at')
            ->whereDoesntHave('children', fn($q) => $q->whereNull('deleted_at'))
            ->select('id', 'name', 'parent_id')
            ->orderBy('name')
            ->get();

        // Get ALL tasks with hierarchy for progress tab (like mobile overview)
        $allTasks = \App\Models\ProjectTask::where('project_id', $project->id)
            ->whereNull('deleted_at')
            ->with(['assignedUser:id,name', 'children' => function ($q) {
                $q->whereNull('deleted_at')->orderBy('order');
            }])
            ->orderBy('order')
            ->get();

        // Get acceptance templates for acceptance stage form
        $acceptanceTemplates = AcceptanceTemplate::select('id', 'name')->orderBy('name')->get();

        // Get parent tasks (A-level, i.e. tasks that have children) for acceptance stage binding
        $parentTasks = \App\Models\ProjectTask::where('project_id', $project->id)
            ->whereNull('deleted_at')
            ->whereHas('children', fn($q) => $q->whereNull('deleted_at'))
            ->select('id', 'name')
            ->orderBy('order')
            ->get();

        // Get project materials (with usage stats) — matching mobile APP
        $projectMaterials = [];
        if (class_exists(\App\Models\MaterialTransaction::class)) {
            $projectMaterials = \App\Models\Material::whereHas('transactions', function ($q) use ($project) {
                $q->where('project_id', $project->id);
            })->withCount(['transactions as project_transactions_count' => function ($q) use ($project) {
                $q->where('project_id', $project->id);
            }])->withSum(['transactions as project_total_amount' => function ($q) use ($project) {
                $q->where('project_id', $project->id);
            }], 'total_amount')
            ->withSum(['transactions as project_usage' => function ($q) use ($project) {
                $q->where('project_id', $project->id)->where('type', 'out');
            }], 'quantity')
            ->get();
        }

        // Get project equipment (with allocations) — matching mobile APP
        $projectEquipment = [];
        if (class_exists(\App\Models\EquipmentAllocation::class)) {
            $projectEquipment = \App\Models\Equipment::whereHas('allocations', function ($q) use ($project) {
                $q->where('project_id', $project->id);
            })->with(['allocations' => function ($q) use ($project) {
                $q->where('project_id', $project->id)->latest();
            }, 'allocations.allocatedTo:id,name', 'allocations.manager:id,name'])
            ->get();
        }

        // Get all equipment (available ones) for allocation form
        $allEquipment = [];
        if (class_exists(\App\Models\Equipment::class)) {
            $allEquipment = \App\Models\Equipment::whereIn('status', ['available', 'in_use'])
                ->select('id', 'name', 'code', 'type', 'status', 'category')
                ->orderBy('name')->get();
        }

        return Inertia::render('Crm/Projects/Show', [
            'project' => $project,
            'users' => $users,
            'permissions' => $permissions,
            'costGroups' => $costGroups,
            'personnelRoles' => $personnelRoles,
            'materials' => $materials,
            'globalSubcontractors' => $globalSubcontractors,
            'projectTasks' => $projectTasks,
            'allTasks' => $allTasks,
            'acceptanceTemplates' => $acceptanceTemplates,
            'parentTasks' => $parentTasks,
            'projectMaterials' => $projectMaterials,
            'projectEquipment' => $projectEquipment,
            'allEquipment' => $allEquipment,
        ]);
    }

    /**
     * Tạo dự án mới
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'customer_id' => 'required|integer|exists:users,id',
            'project_manager_id' => 'nullable|integer|exists:users,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => ['nullable', Rule::in(['planning', 'in_progress', 'completed', 'cancelled'])],
        ]);

        try {
            DB::beginTransaction();

            $project = Project::create([
                ...$validated,
                'created_by' => auth('admin')->id(),
                'status' => $validated['status'] ?? 'planning',
            ]);

            $project->progress()->create([
                'overall_percentage' => 0,
                'calculated_from' => 'manual',
            ]);

            DB::commit();

            return redirect()->route('crm.projects.index')
                ->with('success', 'Dự án đã được tạo thành công.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->withErrors(['error' => 'Có lỗi xảy ra: ' . $e->getMessage()]);
        }
    }

    /**
     * Cập nhật dự án
     */
    public function update(Request $request, string $id)
    {
        $project = Project::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'customer_id' => 'sometimes|integer|exists:users,id',
            'project_manager_id' => 'nullable|integer|exists:users,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'status' => ['sometimes', Rule::in(['planning', 'in_progress', 'completed', 'cancelled'])],
        ]);

        $project->update([
            ...$validated,
            'updated_by' => auth('admin')->id(),
        ]);

        return back()->with('success', 'Dự án đã được cập nhật.');
    }

    /**
     * Xóa dự án
     */
    public function destroy(string $id)
    {
        $project = Project::findOrFail($id);
        $project->delete();

        return redirect()->route('crm.projects.index')
            ->with('success', 'Dự án đã được xóa.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Costs
    // ===================================================================

    public function storeCost(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_CREATE, $project);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'cost_date' => 'required|date',
            'cost_group_id' => 'nullable|exists:cost_groups,id',
            'subcontractor_id' => 'nullable|exists:subcontractors,id',
            'material_id' => 'nullable|exists:materials,id',
            'quantity' => 'nullable|numeric|min:0.01',
            'unit' => 'nullable|string|max:20',
        ]);

        // Auto-detect cost group & category (matching APP logic)
        $costData = [
            'project_id' => $project->id,
            'created_by' => $user->id,
            'status' => 'draft',
            ...$validated,
        ];

        if (class_exists(\App\Services\CostGroupAutoDetectService::class)) {
            $autoDetectService = app(\App\Services\CostGroupAutoDetectService::class);
            if (empty($costData['cost_group_id'])) {
                $costData['cost_group_id'] = $autoDetectService->detectCostGroup($costData);
            }
            $costData['category'] = $autoDetectService->detectCategory($costData);
        }

        Cost::create($costData);

        return back()->with('success', 'Đã tạo phiếu chi.');
    }

    public function updateCost(Request $request, string $projectId, string $costId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_UPDATE, $project);

        $cost = Cost::where('project_id', $project->id)->findOrFail($costId);

        // Draft-only guard (matching APP — allow Admin override)
        if (!($user instanceof \App\Models\Admin) && $cost->status !== 'draft') {
            return back()->with('error', 'Chỉ có thể cập nhật phiếu chi ở trạng thái nháp.');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'amount' => 'sometimes|numeric|min:0',
            'description' => 'nullable|string',
            'cost_date' => 'sometimes|date',
            'cost_group_id' => 'nullable|exists:cost_groups,id',
            'subcontractor_id' => 'nullable|exists:subcontractors,id',
            'material_id' => 'nullable|exists:materials,id',
            'quantity' => 'nullable|numeric|min:0.01',
            'unit' => 'nullable|string|max:20',
        ]);

        $cost->update($validated);
        return back()->with('success', 'Đã cập nhật phiếu chi.');
    }

    public function destroyCost(string $projectId, string $costId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_DELETE, $project);

        $cost = Cost::where('project_id', $project->id)->findOrFail($costId);

        // Draft-only guard (matching APP — allow Admin override)
        if (!($user instanceof \App\Models\Admin) && $cost->status !== 'draft') {
            return back()->with('error', 'Chỉ có thể xóa phiếu chi ở trạng thái nháp.');
        }

        $cost->delete();
        return back()->with('success', 'Đã xóa phiếu chi.');
    }

    public function submitCost(string $projectId, string $costId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_SUBMIT, $project);

        $cost = Cost::where('project_id', $project->id)->findOrFail($costId);
        if ($cost->status !== 'draft') {
            return back()->with('error', 'Chỉ có thể gửi duyệt phiếu chi ở trạng thái nháp.');
        }
        $cost->submitForManagementApproval();
        return back()->with('success', 'Đã gửi phiếu chi để duyệt.');
    }

    public function approveCostManagement(string $projectId, string $costId)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $this->crmRequire($admin, Permissions::COST_APPROVE_MANAGEMENT, $project);

        $cost = Cost::where('project_id', $project->id)->findOrFail($costId);
        if ($cost->status !== 'pending_management_approval') {
            return back()->with('error', 'Phiếu chi không ở trạng thái chờ BĐH duyệt.');
        }
        // Use model method with null user (Admin model FK constraint)
        // Model method handles status transition properly
        $cost->approveByManagement(null);
        // Set approved_at even though we can't set the FK user
        $cost->update(['management_approved_at' => now()]);

        $this->notifyFromCrm($project, 'cost_management_approved', "Phiếu chi \"{$cost->name}\" đã được BĐH duyệt, chờ KT xác nhận.");

        return back()->with('success', 'Đã duyệt phiếu chi (Ban điều hành).');
    }

    public function approveCostAccountant(string $projectId, string $costId)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $this->crmRequire($admin, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $cost = Cost::where('project_id', $project->id)->findOrFail($costId);
        if ($cost->status !== 'pending_accountant_approval') {
            return back()->with('error', 'Phiếu chi không ở trạng thái chờ KT xác nhận.');
        }
        // Call model method (null user = Admin FK constraint workaround)
        // CRITICAL: This method triggers side effects:
        //   - updateSubcontractorStatus() → sync total_paid, payment_status
        //   - MaterialInventoryService → create material transactions
        //   - BudgetSyncService → update budget actual amounts
        $cost->approveByAccountant(null);
        // Record approved timestamp
        $cost->update(['accountant_approved_at' => now()]);

        $this->notifyFromCrm($project, 'cost_accountant_approved', "Phiếu chi \"{$cost->name}\" đã được KT xác nhận.");

        return back()->with('success', 'Đã xác nhận phiếu chi (Kế toán).');
    }

    public function rejectCost(Request $request, string $projectId, string $costId)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $this->crmRequire($admin, Permissions::COST_REJECT, $project);

        $cost = Cost::where('project_id', $project->id)->findOrFail($costId);
        if (!in_array($cost->status, ['pending_management_approval', 'pending_accountant_approval'])) {
            return back()->with('error', 'Phiếu chi không ở trạng thái chờ duyệt.');
        }
        $validated = $request->validate(['rejected_reason' => 'required|string|max:500']);
        // Use model method (null user = Admin FK constraint)
        // CRITICAL: This method triggers side effects:
        //   - Reverts subcontractor total_paid if cost was previously approved
        //   - Deletes MaterialTransaction if cost was approved
        //   - Re-syncs budget items
        $cost->reject($validated['rejected_reason'], null);

        $this->notifyFromCrm($project, 'cost_rejected', "Phiếu chi \"{$cost->name}\" bị từ chối: {$validated['rejected_reason']}");

        return back()->with('success', 'Đã từ chối phiếu chi.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Payments
    // ===================================================================

    public function storePayment(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PAYMENT_CREATE, $project);

        $validated = $request->validate([
            'payment_number' => 'nullable|string|max:50',
            'contract_id' => 'nullable|exists:contracts,id',
            'notes' => 'nullable|string|max:2000',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'nullable|date',
            'status' => 'nullable|string',
        ]);

        // Auto-generate payment_number if not provided
        if (empty($validated['payment_number'])) {
            $count = ProjectPayment::where('project_id', $project->id)->count();
            $validated['payment_number'] = 'TT-' . str_pad($count + 1, 3, '0', STR_PAD_LEFT);
        }

        ProjectPayment::create([
            'project_id' => $project->id,
            ...$validated,
        ]);

        return back()->with('success', 'Đã thêm thanh toán.');
    }

    public function destroyPayment(string $projectId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PAYMENT_DELETE, $project);

        $payment = ProjectPayment::where('project_id', $project->id)->findOrFail($paymentId);
        if (in_array($payment->status, ['confirmed', 'paid'])) {
            return back()->with('error', 'Không thể xóa thanh toán đã xác nhận.');
        }
        $payment->delete();
        return back()->with('success', 'Đã xóa thanh toán.');
    }

    /**
     * CRM: Cập nhật thanh toán
     */
    public function updatePayment(Request $request, string $projectId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PAYMENT_UPDATE, $project);

        $payment = ProjectPayment::where('project_id', $project->id)->findOrFail($paymentId);
        if (in_array($payment->status, ['confirmed', 'paid'])) {
            return back()->with('error', 'Không thể sửa thanh toán đã xác nhận.');
        }

        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
            'due_date' => 'sometimes|date',
        ]);

        $payment->update($validated);
        return back()->with('success', 'Đã cập nhật thanh toán.');
    }

    /**
     * CRM: KH đánh dấu đã thanh toán (pending → customer_paid)
     */
    public function markPaymentPaidByCustomer(Request $request, string $projectId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $payment = ProjectPayment::where('project_id', $project->id)->findOrFail($paymentId);
        if ($payment->status !== 'pending' && $payment->status !== 'overdue') {
            return back()->with('error', 'Thanh toán không ở trạng thái chờ thanh toán.');
        }

        $validated = $request->validate([
            'paid_date' => 'nullable|date',
            'actual_amount' => 'nullable|numeric|min:0',
        ]);

        try {
            DB::beginTransaction();
            $payment->markAsPaidByCustomer(
                $user,
                $validated['paid_date'] ?? null,
                $validated['actual_amount'] ?? null
            );
            DB::commit();
            return back()->with('success', 'Đã đánh dấu khách hàng đã thanh toán. Chờ KT xác nhận.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    /**
     * CRM: Kế toán xác nhận thanh toán (customer_paid → confirmed)
     */
    public function confirmPayment(Request $request, string $projectId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PAYMENT_CONFIRM, $project);

        $payment = ProjectPayment::where('project_id', $project->id)->findOrFail($paymentId);
        if ($payment->status !== 'customer_paid') {
            return back()->with('error', 'Chỉ xác nhận được khi KH đã đánh dấu thanh toán.');
        }

        $validated = $request->validate([
            'paid_date' => 'nullable|date',
        ]);

        try {
            DB::beginTransaction();
            $payment->markAsPaid($user);
            if (!empty($validated['paid_date'])) {
                $payment->update(['paid_date' => $validated['paid_date']]);
            }
            DB::commit();
            return back()->with('success', 'Đã xác nhận thanh toán (Kế toán).');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    /**
     * CRM: Kế toán từ chối thanh toán (customer_paid → pending)
     */
    public function rejectPayment(Request $request, string $projectId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PAYMENT_CONFIRM, $project);

        $payment = ProjectPayment::where('project_id', $project->id)->findOrFail($paymentId);
        if ($payment->status !== 'customer_paid') {
            return back()->with('error', 'Chỉ từ chối được khi KH đã đánh dấu thanh toán.');
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        try {
            DB::beginTransaction();
            $payment->update([
                'status' => 'pending',
                'notes' => ($payment->notes ? $payment->notes . "\n\n" : '') . "KT từ chối — " . $validated['reason'],
            ]);
            DB::commit();
            return back()->with('success', 'Đã từ chối thanh toán.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    /**
     * CRM: Upload hình ảnh xác nhận chuyển khoản (matching APP uploadPaymentProof)
     * Flow: pending → customer_pending_approval (đợi KH duyệt hình)
     */
    public function uploadPaymentProof(Request $request, string $projectId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $payment = ProjectPayment::where('project_id', $project->id)->findOrFail($paymentId);

        $request->validate([
            'files' => 'required|array|min:1',
            'files.*' => 'required|file|max:20480',
        ]);

        try {
            DB::beginTransaction();

            $count = 0;
            foreach ($request->file('files') as $file) {
                $path = $file->store("payment-proofs/{$project->id}/{$paymentId}", 'public');
                Attachment::create([
                    'original_name' => $file->getClientOriginalName(),
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'file_url' => '/storage/' . $path,
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getClientMimeType(),
                    'type' => $file->getClientOriginalExtension(),
                    'attachable_type' => ProjectPayment::class,
                    'attachable_id' => $payment->id,
                    'uploaded_by' => $user->id ?? null,
                ]);
                $count++;
            }

            // Mark payment proof as uploaded (pending → customer_pending_approval)
            if ($count > 0) {
                $payment->markPaymentProofUploaded();
            }

            DB::commit();

            $this->notifyFromCrm($project, 'payment_proof_uploaded', "Hình xác nhận thanh toán đợt #{$payment->payment_number} đã được upload, chờ KH duyệt.");

            return back()->with('success', "Đã upload {$count} hình xác nhận. Đang chờ khách hàng duyệt.");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi upload: ' . $e->getMessage());
        }
    }

    /**
     * CRM: Khách hàng duyệt thanh toán (matching APP approveByCustomer)
     * Flow: customer_pending_approval → customer_approved
     */
    public function approvePaymentByCustomer(Request $request, string $projectId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $payment = ProjectPayment::where('project_id', $project->id)->findOrFail($paymentId);
        if ($payment->status !== 'customer_pending_approval') {
            return back()->with('error', 'Thanh toán không ở trạng thái chờ KH duyệt.');
        }

        // Use model method (null for Admin FK constraint)
        $payment->approveByCustomer(null);

        $this->notifyFromCrm($project, 'payment_customer_approved', "Thanh toán đợt #{$payment->payment_number} đã được KH duyệt.");

        return back()->with('success', 'Đã duyệt thanh toán (Khách hàng).');
    }

    /**
     * CRM: Khách hàng từ chối thanh toán (matching APP rejectByCustomer)
     * Flow: customer_pending_approval → pending (reset, yêu cầu upload lại)
     */
    public function rejectPaymentByCustomer(Request $request, string $projectId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $payment = ProjectPayment::where('project_id', $project->id)->findOrFail($paymentId);
        if ($payment->status !== 'customer_pending_approval') {
            return back()->with('error', 'Thanh toán không ở trạng thái chờ KH duyệt.');
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $payment->update([
            'status' => 'pending',
            'notes' => ($payment->notes ? $payment->notes . "\n\n" : '') . "KH từ chối — " . $validated['rejection_reason'],
        ]);

        $this->notifyFromCrm($project, 'payment_customer_rejected', "Thanh toán đợt #{$payment->payment_number} bị KH từ chối: {$validated['rejection_reason']}");

        return back()->with('success', 'Đã từ chối thanh toán (Khách hàng).');
    }

    // ===================================================================
    // SUB-ITEM — Construction Log Approval (matching APP)
    // ===================================================================

    /**
     * CRM: Duyệt nhật ký thi công (matching APP logs/{id}/approve)
     */
    public function approveLog(string $projectId, string $logId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::LOG_APPROVE, $project);

        $log = ConstructionLog::where('project_id', $project->id)->findOrFail($logId);

        if ($log->status === 'approved') {
            return back()->with('error', 'Nhật ký đã được duyệt.');
        }

        $log->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        // Update task progress if log has task_id and completion_percentage
        if ($log->task_id && $log->completion_percentage) {
            $task = \App\Models\ProjectTask::find($log->task_id);
            if ($task && $log->completion_percentage > ($task->progress_percentage ?? 0)) {
                $task->update(['progress_percentage' => $log->completion_percentage]);

                // Trigger hierarchical progress recalculation
                if (class_exists(\App\Services\TaskProgressService::class)) {
                    app(\App\Services\TaskProgressService::class)->recalculateProjectProgress($project->id);
                }
            }
        }

        $this->notifyFromCrm($project, 'log_approved', "Nhật ký thi công ngày {$log->log_date} đã được duyệt.");

        return back()->with('success', 'Đã duyệt nhật ký thi công.');
    }

    // ===================================================================
    // FILE ATTACHMENTS — Generic helper + specific endpoints
    // ===================================================================

    /**
     * Helper: Attach uploaded files to any attachable model
     */
    private function attachFilesToEntity(Request $request, $entity, string $storagePath): int
    {
        $request->validate([
            'files' => 'required|array|min:1',
            'files.*' => 'required|file|max:20480', // max 20MB each
        ]);

        $user = auth('admin')->user();
        $count = 0;

        foreach ($request->file('files') as $file) {
            $path = $file->store($storagePath, 'public');
            Attachment::create([
                'original_name' => $file->getClientOriginalName(),
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'file_url' => '/storage/' . $path,
                'file_size' => $file->getSize(),
                'mime_type' => $file->getClientMimeType(),
                'type' => $file->getClientOriginalExtension(),
                'attachable_type' => get_class($entity),
                'attachable_id' => $entity->id,
                'uploaded_by' => $user->id ?? null,
            ]);
            $count++;
        }
        return $count;
    }

    /**
     * CRM: Đính kèm file vào Chi phí
     */
    public function attachFilesToCost(Request $request, string $projectId, string $costId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_CREATE, $project);

        $cost = Cost::where('project_id', $project->id)->findOrFail($costId);
        $count = $this->attachFilesToEntity($request, $cost, "costs/{$project->id}/{$costId}");
        return back()->with('success', "Đã đính kèm {$count} file vào phiếu chi.");
    }

    /**
     * CRM: Đính kèm file vào Thanh toán (chứng từ thanh toán)
     */
    public function attachFilesToPayment(Request $request, string $projectId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $payment = ProjectPayment::where('project_id', $project->id)->findOrFail($paymentId);
        $count = $this->attachFilesToEntity($request, $payment, "payments/{$project->id}/{$paymentId}");
        return back()->with('success', "Đã đính kèm {$count} chứng từ thanh toán.");
    }

    /**
     * CRM: Đính kèm file vào Chi phí phát sinh
     */
    public function attachFilesToAdditionalCost(Request $request, string $projectId, string $acId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::ADDITIONAL_COST_CREATE, $project);

        $ac = AdditionalCost::where('project_id', $project->id)->findOrFail($acId);
        $count = $this->attachFilesToEntity($request, $ac, "additional-costs/{$project->id}/{$acId}");
        return back()->with('success', "Đã đính kèm {$count} file vào CP phát sinh.");
    }

    /**
     * CRM: Đính kèm file vào Lỗi (hình ảnh, tài liệu)
     */
    public function attachFilesToDefect(Request $request, string $projectId, string $defectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_CREATE, $project);

        $defect = Defect::where('project_id', $project->id)->findOrFail($defectId);
        $count = $this->attachFilesToEntity($request, $defect, "defects/{$project->id}/{$defectId}");
        return back()->with('success', "Đã đính kèm {$count} file vào lỗi.");
    }

    /**
     * CRM: Đính kèm file vào Nghiệm thu (matching APP)
     */
    public function attachFilesToAcceptance(Request $request, string $projectId, string $stageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $count = $this->attachFilesToEntity($request, $stage, "acceptance/{$project->id}/{$stageId}");
        return back()->with('success', "Đã đính kèm {$count} file vào nghiệm thu.");
    }

    /**
     * CRM: Đính kèm file vào Nhật ký thi công (matching APP)
     */
    public function attachFilesToLog(Request $request, string $projectId, string $logId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::LOG_CREATE, $project);

        $log = ConstructionLog::where('project_id', $project->id)->findOrFail($logId);
        $count = $this->attachFilesToEntity($request, $log, "logs/{$project->id}/{$logId}");
        return back()->with('success', "Đã đính kèm {$count} file vào nhật ký.");
    }

    // ===================================================================
    // SUB-ITEM CRUD — Personnel
    // ===================================================================

    public function storePersonnel(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PERSONNEL_ASSIGN, $project);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'personnel_role_id' => 'nullable|exists:personnel_roles,id',
            'permissions' => 'nullable|array',
        ]);

        // Check if already assigned
        if (ProjectPersonnel::where('project_id', $project->id)->where('user_id', $validated['user_id'])->exists()) {
            return back()->with('error', 'Nhân sự đã được phân công.');
        }

        ProjectPersonnel::create([
            'project_id' => $project->id,
            'user_id' => $validated['user_id'],
            'role_id' => $validated['personnel_role_id'] ?? null,
            'assigned_by' => $user->id,
        ]);

        return back()->with('success', 'Đã phân công nhân sự.');
    }

    public function destroyPersonnel(string $projectId, string $personnelId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PERSONNEL_REMOVE, $project);

        ProjectPersonnel::where('project_id', $project->id)->findOrFail($personnelId)->delete();
        return back()->with('success', 'Đã gỡ nhân sự.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Construction Logs (matching Mobile API)
    // ===================================================================

    public function storeLog(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::LOG_CREATE, $project);

        $validated = $request->validate([
            'log_date' => 'required|date',
            'task_id' => 'nullable|exists:project_tasks,id',
            'weather' => 'nullable|string|max:100',
            'personnel_count' => 'nullable|integer|min:0',
            'completion_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:2000',
        ]);

        // Business rule: Only leaf tasks (no children) can receive log entries
        if (!empty($validated['task_id'])) {
            $task = \App\Models\ProjectTask::where('project_id', $project->id)
                ->find($validated['task_id']);
            if (!$task) {
                return back()->with('error', 'Công việc không thuộc dự án này.');
            }
            $hasChildren = \App\Models\ProjectTask::where('parent_id', $task->id)
                ->whereNull('deleted_at')->exists();
            if ($hasChildren) {
                return back()->with('error', 'Chỉ có thể ghi nhật ký cho công việc con (không có công việc con).');
            }
        }

        // Business rule: completion_percentage can only increase
        if (!empty($validated['task_id']) && isset($validated['completion_percentage'])) {
            $lastLog = ConstructionLog::where('task_id', $validated['task_id'])
                ->whereNotNull('completion_percentage')
                ->orderBy('log_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->first();

            if ($lastLog && $validated['completion_percentage'] < $lastLog->completion_percentage) {
                return back()->with('error', "Phần trăm hoàn thành chỉ có thể tăng. Tối thiểu: {$lastLog->completion_percentage}%");
            }
        }

        $log = ConstructionLog::create([
            'project_id' => $project->id,
            'created_by' => $user->id,
            ...$validated,
        ]);

        // BUSINESS RULE: Recalculate task progress from logs (same as mobile APP)
        // This auto-updates status to 'completed' when 100% and creates acceptance stage
        if ($log->task_id) {
            $task = \App\Models\ProjectTask::find($log->task_id);
            if ($task) {
                app(\App\Services\TaskProgressService::class)->updateTaskFromLogs($task, true);
            }
        }

        return back()->with('success', 'Đã thêm nhật ký thi công.');
    }

    public function updateLog(Request $request, string $projectId, string $logId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $log = ConstructionLog::where('project_id', $project->id)->findOrFail($logId);

        // Allow creator or anyone with LOG_UPDATE permission
        if ($log->created_by !== $user->id) {
            $this->crmRequire($user, Permissions::LOG_UPDATE, $project);
        }

        $validated = $request->validate([
            'task_id' => 'nullable|exists:project_tasks,id',
            'weather' => 'nullable|string|max:100',
            'personnel_count' => 'nullable|integer|min:0',
            'completion_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:2000',
        ]);

        // Business rule: Only leaf tasks
        if (!empty($validated['task_id'])) {
            $task = \App\Models\ProjectTask::where('project_id', $project->id)
                ->find($validated['task_id']);
            if (!$task) {
                return back()->with('error', 'Công việc không thuộc dự án này.');
            }
            $hasChildren = \App\Models\ProjectTask::where('parent_id', $task->id)
                ->whereNull('deleted_at')->exists();
            if ($hasChildren) {
                return back()->with('error', 'Chỉ có thể ghi nhật ký cho công việc con.');
            }
        }

        // Business rule: completion_percentage can only increase
        if (isset($validated['completion_percentage'])) {
            $taskId = $validated['task_id'] ?? $log->task_id;
            if ($taskId) {
                $lastLog = ConstructionLog::where('task_id', $taskId)
                    ->where('id', '!=', $log->id)
                    ->whereNotNull('completion_percentage')
                    ->orderBy('log_date', 'desc')
                    ->orderBy('created_at', 'desc')
                    ->first();

                $minPct = $lastLog ? $lastLog->completion_percentage : 0;
                if ($validated['completion_percentage'] < $minPct) {
                    return back()->with('error', "Phần trăm hoàn thành chỉ có thể tăng. Tối thiểu: {$minPct}%");
                }
            }
        }

        $oldTaskId = $log->task_id;
        $log->update($validated);

        // BUSINESS RULE: Recalculate task progress from logs (same as mobile APP)
        $service = app(\App\Services\TaskProgressService::class);
        $newTaskId = $log->task_id;

        // Recalculate new task
        if ($newTaskId) {
            $task = \App\Models\ProjectTask::find($newTaskId);
            if ($task) {
                $service->updateTaskFromLogs($task, true);
            }
        }
        // If task changed, also recalculate old task
        if ($oldTaskId && $oldTaskId !== $newTaskId) {
            $oldTask = \App\Models\ProjectTask::find($oldTaskId);
            if ($oldTask) {
                $service->updateTaskFromLogs($oldTask, true);
            }
        }

        return back()->with('success', 'Đã cập nhật nhật ký.');
    }

    public function destroyLog(string $projectId, string $logId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::LOG_DELETE, $project);

        $log = ConstructionLog::where('project_id', $project->id)->findOrFail($logId);

        // Delete attachments
        foreach ($log->attachments as $att) {
            if ($att->file_path && \Illuminate\Support\Facades\Storage::disk('public')->exists($att->file_path)) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($att->file_path);
            }
            $att->delete();
        }

        $taskId = $log->task_id;
        $log->delete();

        // BUSINESS RULE: Recalculate task progress after log deletion
        if ($taskId) {
            $task = \App\Models\ProjectTask::find($taskId);
            if ($task) {
                app(\App\Services\TaskProgressService::class)->updateTaskFromLogs($task, true);
            }
        }

        return back()->with('success', 'Đã xóa nhật ký.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Comments
    // ===================================================================

    public function storeComment(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PROJECT_COMMENT_CREATE, $project);

        $validated = $request->validate([
            'content' => 'required|string|max:2000',
            'parent_id' => 'nullable|exists:project_comments,id',
        ]);

        ProjectComment::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
            'parent_id' => $validated['parent_id'] ?? null,
            ...$validated,
        ]);

        return back()->with('success', 'Đã thêm bình luận.');
    }

    public function destroyComment(string $projectId, string $commentId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PROJECT_COMMENT_DELETE, $project);

        ProjectComment::where('project_id', $project->id)->findOrFail($commentId)->delete();
        return back()->with('success', 'Đã xóa bình luận.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Defects
    // ===================================================================

    public function storeDefect(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_CREATE, $project);

        $validated = $request->validate([
            'description' => 'required|string',
            'severity' => 'required|in:low,medium,high,critical',
            'status' => 'nullable|string|in:open,in_progress,fixed,verified',
            'task_id' => 'nullable|exists:project_tasks,id',
            'acceptance_stage_id' => 'nullable|exists:acceptance_stages,id',
            'defect_type' => 'nullable|in:standard_violation,other',
        ]);

        Defect::create([
            'project_id' => $project->id,
            'reported_by' => $user->id,
            'description' => $validated['description'],
            'severity' => $validated['severity'],
            'status' => $validated['status'] ?? 'open',
            'task_id' => $validated['task_id'] ?? null,
            'acceptance_stage_id' => $validated['acceptance_stage_id'] ?? null,
            'defect_type' => $validated['defect_type'] ?? null,
        ]);

        return back()->with('success', 'Đã báo cáo lỗi.');
    }

    public function updateDefect(Request $request, string $projectId, string $defectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_UPDATE, $project);

        $defect = Defect::where('project_id', $project->id)->findOrFail($defectId);
        $validated = $request->validate([
            'description' => 'sometimes|string',
            'severity' => 'sometimes|in:low,medium,high,critical',
            'status' => 'sometimes|string|in:open,in_progress,fixed,verified',
        ]);
        $defect->update($validated);
        return back()->with('success', 'Đã cập nhật lỗi.');
    }

    public function destroyDefect(string $projectId, string $defectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_DELETE, $project);

        Defect::where('project_id', $project->id)->findOrFail($defectId)->delete();
        return back()->with('success', 'Đã xóa lỗi.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Change Requests
    // ===================================================================

    public function storeChangeRequest(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::CHANGE_REQUEST_CREATE, $project);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string|max:5000',
            'change_type' => 'required|in:scope,schedule,cost,quality,resource,other',
            'priority' => 'required|in:low,medium,high,urgent',
            'reason' => 'nullable|string|max:2000',
            'impact_analysis' => 'nullable|string|max:5000',
            'estimated_cost_impact' => 'nullable|numeric|min:0',
            'estimated_schedule_impact_days' => 'nullable|integer|min:0',
            'implementation_plan' => 'nullable|string|max:5000',
        ]);

        ChangeRequest::create([
            'project_id' => $project->id,
            'requested_by' => $user->id,
            'status' => 'draft',
            ...$validated,
        ]);

        return back()->with('success', 'Đã tạo yêu cầu thay đổi.');
    }

    public function updateChangeRequest(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::CHANGE_REQUEST_UPDATE, $project);

        $cr = ChangeRequest::where('project_id', $project->id)->findOrFail($id);

        if (!in_array($cr->status, ['draft', 'pending'])) {
            return back()->with('error', 'Chỉ có thể sửa yêu cầu thay đổi ở trạng thái nháp hoặc chờ duyệt.');
        }

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string|max:5000',
            'change_type' => 'required|in:scope,schedule,cost,quality,resource,other',
            'priority' => 'required|in:low,medium,high,urgent',
            'reason' => 'nullable|string|max:2000',
            'impact_analysis' => 'nullable|string|max:5000',
            'estimated_cost_impact' => 'nullable|numeric|min:0',
            'estimated_schedule_impact_days' => 'nullable|integer|min:0',
            'implementation_plan' => 'nullable|string|max:5000',
        ]);

        $cr->update($validated);
        return back()->with('success', 'Đã cập nhật yêu cầu thay đổi.');
    }

    public function submitChangeRequest(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $cr = ChangeRequest::where('project_id', $project->id)->findOrFail($id);

        if ($cr->status !== 'draft') {
            return back()->with('error', 'Chỉ có thể gửi yêu cầu ở trạng thái nháp.');
        }

        $cr->submit();
        return back()->with('success', 'Đã gửi yêu cầu thay đổi để duyệt.');
    }

    public function approveChangeRequest(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::CHANGE_REQUEST_APPROVE, $project);

        $cr = ChangeRequest::where('project_id', $project->id)->findOrFail($id);
        $cr->approve($user, $request->input('notes'));
        return back()->with('success', 'Đã duyệt yêu cầu thay đổi.');
    }

    public function rejectChangeRequest(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $cr = ChangeRequest::where('project_id', $project->id)->findOrFail($id);
        $cr->reject($user, $request->input('reason', 'Không đồng ý'));
        return back()->with('success', 'Đã từ chối yêu cầu thay đổi.');
    }

    public function implementChangeRequest(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cr = ChangeRequest::where('project_id', $project->id)->findOrFail($id);
        $cr->markAsImplemented();
        return back()->with('success', 'Đã đánh dấu đã triển khai.');
    }

    public function destroyChangeRequest(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::CHANGE_REQUEST_DELETE, $project);

        $cr = ChangeRequest::where('project_id', $project->id)->findOrFail($id);
        if (!in_array($cr->status, ['draft', 'cancelled'])) {
            return back()->with('error', 'Chỉ có thể xóa yêu cầu ở trạng thái nháp hoặc đã hủy.');
        }
        $cr->delete();
        return back()->with('success', 'Đã xóa yêu cầu thay đổi.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Risks
    // ===================================================================

    public function storeRisk(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PROJECT_RISK_CREATE, $project);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'category' => 'required|in:schedule,cost,quality,scope,resource,technical,external,other',
            'probability' => 'required|in:very_low,low,medium,high,very_high',
            'impact' => 'required|in:very_low,low,medium,high,very_high',
            'risk_type' => 'nullable|in:threat,opportunity',
            'mitigation_plan' => 'nullable|string|max:5000',
            'contingency_plan' => 'nullable|string|max:5000',
            'owner_id' => 'nullable|exists:users,id',
            'target_resolution_date' => 'nullable|date',
        ]);

        ProjectRisk::create([
            'project_id' => $project->id,
            'identified_by' => $user->id,
            'identified_date' => now(),
            'status' => 'identified',
            'risk_type' => $validated['risk_type'] ?? 'threat',
            ...$validated,
        ]);

        return back()->with('success', 'Đã thêm rủi ro.');
    }

    public function updateRisk(Request $request, string $projectId, string $riskId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PROJECT_RISK_UPDATE, $project);

        $risk = ProjectRisk::where('project_id', $project->id)->findOrFail($riskId);

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'category' => 'required|in:schedule,cost,quality,scope,resource,technical,external,other',
            'probability' => 'required|in:very_low,low,medium,high,very_high',
            'impact' => 'required|in:very_low,low,medium,high,very_high',
            'status' => 'nullable|in:identified,analyzed,mitigated,monitored,closed',
            'risk_type' => 'nullable|in:threat,opportunity',
            'mitigation_plan' => 'nullable|string|max:5000',
            'contingency_plan' => 'nullable|string|max:5000',
            'owner_id' => 'nullable|exists:users,id',
            'target_resolution_date' => 'nullable|date',
        ]);

        $risk->update(array_merge($validated, ['updated_by' => $user->id]));

        if (isset($validated['status']) && $validated['status'] === 'closed' && !$risk->resolved_date) {
            $risk->markAsResolved();
        }

        return back()->with('success', 'Đã cập nhật rủi ro.');
    }

    public function resolveRisk(string $projectId, string $riskId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $risk = ProjectRisk::where('project_id', $project->id)->findOrFail($riskId);
        $risk->markAsResolved();

        return back()->with('success', 'Đã đánh dấu rủi ro đã xử lý.');
    }

    public function destroyRisk(string $projectId, string $riskId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PROJECT_RISK_DELETE, $project);

        ProjectRisk::where('project_id', $project->id)->findOrFail($riskId)->delete();
        return back()->with('success', 'Đã xóa rủi ro.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Tasks (Tiến độ dự án)
    // ===================================================================

    public function storeTask(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PROJECT_TASK_CREATE, $project);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:project_tasks,id',
            'phase_id' => 'nullable|exists:project_phases,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration' => 'nullable|numeric|min:0',
            'progress_percentage' => 'nullable|numeric|min:0|max:100',
            'status' => 'nullable|in:pending,not_started,in_progress,completed,on_hold,cancelled',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        // Validate parent belongs to project
        if (!empty($validated['parent_id'])) {
            $parent = $project->tasks()->find($validated['parent_id']);
            if (!$parent) {
                return back()->with('error', 'Công việc cha không thuộc dự án này.');
            }
        }

        // Auto-calculate order
        $maxOrder = $project->tasks()
            ->where('parent_id', $validated['parent_id'] ?? null)
            ->max('order') ?? -1;

        // Use provided duration or auto-calculate
        $duration = $validated['duration'] ?? null;
        if (!$duration && !empty($validated['start_date']) && !empty($validated['end_date'])) {
            $duration = \Carbon\Carbon::parse($validated['start_date'])
                ->diffInDays(\Carbon\Carbon::parse($validated['end_date'])) + 1;
        }

        $progressInput = (float) ($validated['progress_percentage'] ?? 0);

        // Auto-calculate status from progress (matching APP logic)
        $service = app(\App\Services\TaskProgressService::class);

        $task = \App\Models\ProjectTask::create([
            'project_id' => $project->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'parent_id' => $validated['parent_id'] ?? null,
            'phase_id' => $validated['phase_id'] ?? null,
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'duration' => $duration,
            'priority' => $validated['priority'] ?? 'medium',
            'assigned_to' => $validated['assigned_to'] ?? null,
            'order' => $maxOrder + 1,
            'status' => 'not_started', // Will be recalculated below
            'progress_percentage' => $progressInput,
            'created_by' => $user->id,
        ]);

        // BUSINESS RULE: Auto-calculate status based on progress and dates
        $autoStatus = $service->calculateStatus($task, $progressInput);
        if ($autoStatus !== $task->status) {
            $task->forceFill(['status' => $autoStatus])->saveQuietly();
        }

        // Auto-create acceptance stage when root task reaches 100%
        if ($progressInput >= 100 && !$task->parent_id) {
            $maxOrd = \App\Models\AcceptanceStage::where('project_id', $project->id)->max('order') ?? 0;
            \App\Models\AcceptanceStage::create([
                'project_id' => $project->id,
                'task_id' => $task->id,
                'name' => $task->name . ' - Nghiệm thu',
                'description' => '[Giai đoạn nghiệm thu được tự động tạo khi công việc đạt 100%]',
                'order' => $maxOrd + 1,
                'is_custom' => false,
                'status' => 'pending',
            ]);
        }

        // Update parent progress if this task has a parent
        if ($task->parent_id) {
            $parent = \App\Models\ProjectTask::find($task->parent_id);
            if ($parent) {
                $service->updateTaskFromLogs($parent, true);
            }
        }

        return back()->with('success', 'Đã thêm công việc.');
    }

    public function updateTask(Request $request, string $projectId, string $taskId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PROJECT_TASK_UPDATE, $project);

        $task = \App\Models\ProjectTask::where('project_id', $project->id)->findOrFail($taskId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:project_tasks,id',
            'phase_id' => 'nullable|exists:project_phases,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'duration' => 'nullable|numeric|min:0',
            'progress_percentage' => 'nullable|numeric|min:0|max:100',
            'status' => 'nullable|in:pending,not_started,in_progress,completed,on_hold,cancelled',
            'priority' => 'nullable|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        // Prevent circular reference
        if (!empty($validated['parent_id'])) {
            if ($validated['parent_id'] == $task->id) {
                return back()->with('error', 'Công việc không thể là cha của chính nó.');
            }
        }

        // Use provided duration or auto-calculate
        $duration = $validated['duration'] ?? $task->duration;
        if (!isset($validated['duration']) && !empty($validated['start_date']) && !empty($validated['end_date'])) {
            $duration = \Carbon\Carbon::parse($validated['start_date'])
                ->diffInDays(\Carbon\Carbon::parse($validated['end_date'])) + 1;
        }

        // Extract progress/status from validated — will be handled by service
        $progressInput = $validated['progress_percentage'] ?? null;
        $statusInput = $validated['status'] ?? null;
        unset($validated['progress_percentage'], $validated['status']);

        $task->update([
            ...$validated,
            'duration' => $duration,
            'updated_by' => $user->id,
        ]);

        // BUSINESS RULE: Auto-calculate status and create acceptance stage
        // This matches the mobile APP behavior
        $service = app(\App\Services\TaskProgressService::class);

        if ($progressInput !== null) {
            // CRM admin manually set progress → apply it and auto-calculate status
            $autoStatus = $service->calculateStatus($task, (float) $progressInput);

            // If has children, check if parent can be completed
            $hasChildren = \App\Models\ProjectTask::where('parent_id', $task->id)
                ->whereNull('deleted_at')->exists();
            if ($autoStatus === 'completed' && $hasChildren && !$service->canParentBeCompleted($task)) {
                $autoStatus = 'in_progress';
            }

            $task->forceFill([
                'progress_percentage' => $progressInput,
                'status' => $statusInput ?: $autoStatus,
            ])->saveQuietly();

            // Auto-create acceptance stage when parent task reaches 100%
            if ($progressInput >= 100 && !$task->parent_id) {
                $existingStage = \App\Models\AcceptanceStage::where('task_id', $task->id)
                    ->where('project_id', $task->project_id)->first();
                if (!$existingStage) {
                    $maxOrder = \App\Models\AcceptanceStage::where('project_id', $task->project_id)->max('order') ?? 0;
                    \App\Models\AcceptanceStage::create([
                        'project_id' => $task->project_id,
                        'task_id' => $task->id,
                        'name' => $task->name . ' - Nghiệm thu',
                        'description' => '[Giai đoạn nghiệm thu được tự động tạo khi công việc đạt 100%]',
                        'order' => $maxOrder + 1,
                        'is_custom' => false,
                        'status' => 'pending',
                    ]);
                }
            }

            // Update parent task if exists
            if ($task->parent_id) {
                $parent = \App\Models\ProjectTask::find($task->parent_id);
                if ($parent) {
                    $service->updateTaskFromLogs($parent, true);
                }
            }
        } elseif ($statusInput !== null) {
            // Status-only update (no progress change)
            $task->forceFill(['status' => $statusInput])->saveQuietly();
        } else {
            // No progress/status input — recalculate from logs (dates may have changed)
            $service->updateTaskFromLogs($task, true);
        }

        return back()->with('success', 'Đã cập nhật công việc.');
    }

    public function destroyTask(string $projectId, string $taskId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PROJECT_TASK_DELETE, $project);

        $task = \App\Models\ProjectTask::where('project_id', $project->id)->findOrFail($taskId);

        // Check if task has children
        $hasChildren = \App\Models\ProjectTask::where('parent_id', $task->id)
            ->whereNull('deleted_at')
            ->exists();
        if ($hasChildren) {
            return back()->with('error', 'Không thể xóa công việc có công việc con. Hãy xóa các công việc con trước.');
        }

        $task->delete();
        return back()->with('success', 'Đã xóa công việc.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Contract
    // ===================================================================

    public function storeContract(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::CONTRACT_CREATE, $project);

        if ($project->contract) {
            return back()->with('error', 'Dự án đã có hợp đồng.');
        }

        $validated = $request->validate([
            'contract_value' => 'required|numeric|min:0',
            'signed_date' => 'nullable|date',
            'status' => 'nullable|string',
        ]);

        Contract::create([
            'project_id' => $project->id,
            ...$validated,
        ]);

        return back()->with('success', 'Đã tạo hợp đồng.');
    }

    public function updateContract(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::CONTRACT_UPDATE, $project);

        $contract = Contract::where('project_id', $project->id)->firstOrFail();
        $validated = $request->validate([
            'contract_value' => 'sometimes|numeric|min:0',
            'signed_date' => 'nullable|date',
            'status' => 'nullable|string',
        ]);
        $contract->update($validated);
        return back()->with('success', 'Đã cập nhật hợp đồng.');
    }

    /**
     * CRM: Đính kèm file vào Hợp đồng
     */
    public function attachFilesToContract(Request $request, string $projectId, string $contractId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::CONTRACT_UPDATE, $project);

        $contract = Contract::where('project_id', $project->id)->findOrFail($contractId);
        $count = $this->attachFilesToEntity($request, $contract, "contracts/{$project->id}/{$contractId}");
        return back()->with('success', "Đã đính kèm {$count} file vào hợp đồng.");
    }

    // ===================================================================
    // SUB-ITEM CRUD — Subcontractors (Gap 1)
    // ===================================================================

    public function storeSubcontractor(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_CREATE, $project);

        $validated = $request->validate([
            'global_subcontractor_id' => 'nullable|exists:global_subcontractors,id',
            'name' => 'required_without:global_subcontractor_id|string|max:255',
            'category' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_account_name' => 'nullable|string|max:255',
            'total_quote' => 'required|numeric|min:0',
            'progress_start_date' => 'nullable|date',
            'progress_end_date' => 'nullable|date|after_or_equal:progress_start_date',
            'progress_status' => ['nullable', 'in:not_started,in_progress,completed,delayed'],
            'create_cost' => 'nullable|boolean',
            'cost_group_id' => 'nullable|exists:cost_groups,id',
        ]);

        // Pull from global subcontractor if selected
        if (!empty($validated['global_subcontractor_id'])) {
            $gs = GlobalSubcontractor::findOrFail($validated['global_subcontractor_id']);
            $validated['name'] = $gs->name;
            $validated['bank_name'] = $validated['bank_name'] ?? $gs->bank_name;
            $validated['bank_account_number'] = $validated['bank_account_number'] ?? $gs->bank_account_number;
            $validated['bank_account_name'] = $validated['bank_account_name'] ?? $gs->bank_account_name;
        }

        DB::beginTransaction();
        try {
            $subcontractor = Subcontractor::create([
                'project_id' => $project->id,
                'global_subcontractor_id' => $validated['global_subcontractor_id'] ?? null,
                'created_by' => $user->id,
                'payment_status' => 'pending',
                'progress_status' => $validated['progress_status'] ?? 'not_started',
                'advance_payment' => 0,
                'name' => $validated['name'],
                'category' => $validated['category'] ?? null,
                'bank_name' => $validated['bank_name'] ?? null,
                'bank_account_number' => $validated['bank_account_number'] ?? null,
                'bank_account_name' => $validated['bank_account_name'] ?? null,
                'total_quote' => $validated['total_quote'],
                'progress_start_date' => $validated['progress_start_date'] ?? null,
                'progress_end_date' => $validated['progress_end_date'] ?? null,
            ]);

            // Auto-create Cost record (matching APP logic)
            if (!empty($validated['create_cost'])) {
                $costGroupId = $validated['cost_group_id'] ?? null;
                if (!$costGroupId) {
                    $defaultCostGroup = \App\Models\CostGroup::where('code', 'subcontractor')
                        ->orWhere('name', 'LIKE', '%Nhà thầu phụ%')
                        ->orWhere('name', 'LIKE', '%Thầu phụ%')
                        ->first();
                    $costGroupId = $defaultCostGroup?->id;
                }

                Cost::create([
                    'project_id' => $project->id,
                    'subcontractor_id' => $subcontractor->id,
                    'cost_group_id' => $costGroupId,
                    'name' => "Chi phí nhà thầu phụ: {$subcontractor->name}",
                    'amount' => $subcontractor->total_quote,
                    'description' => "Chi phí từ nhà thầu phụ. Hạng mục: " . ($subcontractor->category ?? 'N/A'),
                    'cost_date' => $validated['progress_start_date'] ?? now()->toDateString(),
                    'status' => 'draft',
                    'created_by' => $user->id,
                ]);
            }

            // Handle file uploads
            if ($request->hasFile('files')) {
                foreach ($request->file('files') as $file) {
                    $path = $file->store("subcontractors/{$project->id}/{$subcontractor->id}", 'public');
                    Attachment::create([
                        'attachable_type' => Subcontractor::class,
                        'attachable_id' => $subcontractor->id,
                        'original_name' => $file->getClientOriginalName(),
                        'file_name' => $file->getClientOriginalName(),
                        'file_path' => $path,
                        'file_url' => '/storage/' . $path,
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getClientMimeType(),
                        'uploaded_by' => $user->id,
                    ]);
                }
            }

            DB::commit();
            return back()->with('success', 'Đã thêm nhà thầu phụ.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi thêm NTP: ' . $e->getMessage());
        }
    }

    public function updateSubcontractor(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_UPDATE, $project);

        $sub = Subcontractor::where('project_id', $project->id)->findOrFail($id);
        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'nullable|string|max:255',
            'bank_name' => 'nullable|string|max:255',
            'bank_account_number' => 'nullable|string|max:255',
            'bank_account_name' => 'nullable|string|max:255',
            'total_quote' => 'sometimes|numeric|min:0',
            'progress_start_date' => 'nullable|date',
            'progress_end_date' => 'nullable|date',
            'progress_status' => ['sometimes', 'in:not_started,in_progress,completed,delayed'],
        ]);

        $sub->update([...$validated, 'updated_by' => $user->id]);

        // Handle file uploads on update
        if ($request->hasFile('files')) {
            foreach ($request->file('files') as $file) {
                $path = $file->store("subcontractors/{$project->id}/{$sub->id}", 'public');
                Attachment::create([
                    'attachable_type' => Subcontractor::class,
                    'attachable_id' => $sub->id,
                    'original_name' => $file->getClientOriginalName(),
                    'file_name' => $file->getClientOriginalName(),
                    'file_path' => $path,
                    'file_url' => '/storage/' . $path,
                    'file_size' => $file->getSize(),
                    'mime_type' => $file->getClientMimeType(),
                    'uploaded_by' => $user->id,
                ]);
            }
        }

        return back()->with('success', 'Đã cập nhật nhà thầu phụ.');
    }

    public function approveSubcontractor(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();

        $sub = Subcontractor::where('project_id', $project->id)->findOrFail($id);
        if (method_exists($sub, 'approve')) {
            $sub->approve(null); // null to avoid FK violation with admin table
        } else {
            $sub->update(['approved_at' => now()]);
        }

        return back()->with('success', 'Đã duyệt nhà thầu phụ.');
    }

    public function destroySubcontractor(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_DELETE, $project);

        Cost::where('subcontractor_id', $id)->update(['subcontractor_id' => null]);
        Subcontractor::where('project_id', $project->id)->findOrFail($id)->delete();
        return back()->with('success', 'Đã xóa nhà thầu phụ.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Subcontractor Payments (Synced from APP)
    // ===================================================================

    public function storeSubPayment(Request $request, string $projectId, string $subId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_PAYMENT_CREATE, $project);

        $sub = Subcontractor::where('project_id', $project->id)->findOrFail($subId);

        $validated = $request->validate([
            'payment_stage' => 'nullable|string|max:255',
            'amount' => 'required|numeric|min:0',
            'payment_date' => 'nullable|date',
            'payment_method' => 'required|in:cash,bank_transfer,check,other',
            'reference_number' => 'nullable|string|max:255',
            'description' => 'nullable|string',
        ]);

        // Check if amount exceeds remaining
        $remaining = $sub->total_quote - $sub->total_paid;
        if ($validated['amount'] > $remaining) {
            return back()->with('error', 'Số tiền thanh toán vượt quá số tiền còn lại (' . number_format($remaining) . ').');
        }

        DB::beginTransaction();
        try {
            $payment = SubcontractorPayment::create([
                'subcontractor_id' => $sub->id,
                'project_id' => $project->id,
                ...$validated,
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

            // Handle file uploads
            if ($request->hasFile('files')) {
                foreach ($request->file('files') as $file) {
                    $path = $file->store("sub-payments/{$project->id}/{$payment->id}", 'public');
                    Attachment::create([
                        'attachable_type' => SubcontractorPayment::class,
                        'attachable_id' => $payment->id,
                        'original_name' => $file->getClientOriginalName(),
                        'file_name' => $file->getClientOriginalName(),
                        'file_path' => $path,
                        'file_url' => '/storage/' . $path,
                        'file_size' => $file->getSize(),
                        'mime_type' => $file->getClientMimeType(),
                        'uploaded_by' => $user->id,
                    ]);
                }
            }

            DB::commit();
            return back()->with('success', 'Đã tạo phiếu thanh toán NTP.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi tạo phiếu TT: ' . $e->getMessage());
        }
    }

    public function submitSubPayment(string $projectId, string $subId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $payment = SubcontractorPayment::where('project_id', $project->id)->findOrFail($paymentId);

        if ($payment->status !== 'draft') {
            return back()->with('error', 'Chỉ gửi duyệt phiếu ở trạng thái nháp.');
        }

        $payment->submitForApproval();
        return back()->with('success', 'Đã gửi phiếu chi để duyệt.');
    }

    public function approveSubPayment(string $projectId, string $subId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $payment = SubcontractorPayment::where('project_id', $project->id)->findOrFail($paymentId);

        if ($payment->status !== 'pending_management_approval') {
            return back()->with('error', 'Phiếu TT không ở trạng thái chờ duyệt.');
        }

        DB::beginTransaction();
        try {
            $payment->approve(null); // null to avoid FK violation
            DB::commit();
            return back()->with('success', 'Đã duyệt phiếu thanh toán NTP.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi duyệt phiếu: ' . $e->getMessage());
        }
    }

    public function rejectSubPayment(Request $request, string $projectId, string $subId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $payment = SubcontractorPayment::where('project_id', $project->id)->findOrFail($paymentId);

        if (!in_array($payment->status, ['pending_management_approval', 'pending_accountant_confirmation'])) {
            return back()->with('error', 'Không thể từ chối phiếu ở trạng thái này.');
        }

        DB::beginTransaction();
        try {
            $payment->reject(null, $request->input('rejection_reason'));
            DB::commit();
            return back()->with('success', 'Đã từ chối phiếu thanh toán.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi từ chối phiếu: ' . $e->getMessage());
        }
    }

    public function confirmSubPayment(string $projectId, string $subId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $payment = SubcontractorPayment::where('project_id', $project->id)->findOrFail($paymentId);

        if ($payment->status !== 'pending_accountant_confirmation') {
            return back()->with('error', 'Phiếu TT chưa được duyệt bởi BĐH.');
        }

        DB::beginTransaction();
        try {
            $payment->markAsPaid(null); // null to avoid FK violation
            DB::commit();
            return back()->with('success', 'Đã xác nhận thanh toán.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi xác nhận: ' . $e->getMessage());
        }
    }

    public function destroySubPayment(string $projectId, string $subId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $payment = SubcontractorPayment::where('project_id', $project->id)->findOrFail($paymentId);
        if ($payment->status === 'paid') {
            return back()->with('error', 'Không thể xóa phiếu đã thanh toán.');
        }

        $payment->delete();
        return back()->with('success', 'Đã xóa phiếu thanh toán.');
    }

    public function attachFilesToSubcontractor(Request $request, string $projectId, string $subId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_UPDATE, $project);

        $sub = Subcontractor::where('project_id', $project->id)->findOrFail($subId);
        $count = $this->attachFilesToEntity($request, $sub, "subcontractors/{$project->id}/{$subId}");
        return back()->with('success', "Đã đính kèm {$count} file vào NTP.");
    }

    // ===================================================================
    // SUB-ITEM CRUD — Additional Costs (Gap 2)
    // ===================================================================

    public function storeAdditionalCost(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::ADDITIONAL_COST_CREATE, $project);

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0',
            'description' => 'required|string|max:1000',
        ]);

        AdditionalCost::create([
            'project_id' => $project->id,
            'proposed_by' => $user->id,
            'status' => 'pending_approval',
            ...$validated,
        ]);

        return back()->with('success', 'Đã tạo chi phí phát sinh.');
    }

    public function approveAdditionalCost(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $this->crmRequire($admin, Permissions::ADDITIONAL_COST_APPROVE, $project);

        $cost = AdditionalCost::where('project_id', $project->id)->findOrFail($id);
        if (!in_array($cost->status, ['pending_approval', 'pending'])) {
            return back()->with('error', 'CP phát sinh không ở trạng thái chờ duyệt.');
        }

        DB::beginTransaction();
        try {
            $cost->status = 'approved';
            // Don't set approved_by — FK constraint to users table, Admin ID would violate it
            $cost->approved_at = now();
            $cost->save();

            // Add to contract value
            $contract = $project->contract;
            if ($contract) {
                $contract->contract_value += $cost->amount;
                $contract->save();
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi duyệt CP phát sinh: ' . $e->getMessage());
        }

        return back()->with('success', 'Đã duyệt chi phí phát sinh.');
    }

    public function rejectAdditionalCost(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $this->crmRequire($admin, Permissions::ADDITIONAL_COST_REJECT, $project);

        $cost = AdditionalCost::where('project_id', $project->id)->findOrFail($id);
        if (!in_array($cost->status, ['pending_approval', 'pending'])) {
            return back()->with('error', 'CP phát sinh không ở trạng thái chờ duyệt.');
        }
        $validated = $request->validate(['rejected_reason' => 'required|string|max:500']);
        $cost->reject($validated['rejected_reason'], $admin);
        return back()->with('success', 'Đã từ chối chi phí phát sinh.');
    }

    public function destroyAdditionalCost(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::ADDITIONAL_COST_DELETE, $project);

        $cost = AdditionalCost::where('project_id', $project->id)->findOrFail($id);
        if (!in_array($cost->status, ['pending_approval', 'rejected'])) {
            return back()->with('error', 'Chỉ xóa được CP phát sinh ở trạng thái chờ duyệt hoặc bị từ chối.');
        }
        $cost->delete();
        return back()->with('success', 'Đã xóa chi phí phát sinh.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Budgets (Gap 3)
    // ===================================================================

    public function storeBudget(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::BUDGET_CREATE, $project);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'budget_date' => 'required|date',
            'version' => 'nullable|string|max:20',
            'status' => 'nullable|in:draft,approved,revised',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.name' => 'required|string|max:255',
            'items.*.estimated_amount' => 'required|numeric|min:0',
            'items.*.cost_group_id' => 'nullable|exists:cost_groups,id',
        ]);

        DB::beginTransaction();
        $totalBudget = collect($validated['items'])->sum('estimated_amount');

        $budget = ProjectBudget::create([
            'project_id' => $project->id,
            'name' => $validated['name'],
            'version' => $validated['version'] ?? '1.0',
            'total_budget' => $totalBudget,
            'estimated_cost' => $totalBudget,
            'remaining_budget' => $totalBudget,
            'budget_date' => $validated['budget_date'],
            'notes' => $validated['notes'] ?? null,
            'status' => $validated['status'] ?? 'draft',
            'created_by' => $user->id,
        ]);

        foreach ($validated['items'] as $i => $item) {
            BudgetItem::create([
                'budget_id' => $budget->id,
                'cost_group_id' => $item['cost_group_id'] ?? null,
                'name' => $item['name'],
                'estimated_amount' => $item['estimated_amount'],
                'remaining_amount' => $item['estimated_amount'],
                'quantity' => 1,
                'unit_price' => $item['estimated_amount'],
                'order' => $i,
            ]);
        }
        DB::commit();

        return back()->with('success', 'Đã tạo ngân sách.');
    }

    public function updateBudget(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::BUDGET_UPDATE, $project);

        $budget = ProjectBudget::where('project_id', $project->id)->findOrFail($id);
        if (in_array($budget->status, ['approved', 'archived'])) {
            return back()->with('error', 'Không thể cập nhật ngân sách đã duyệt/lưu trữ.');
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'notes' => 'nullable|string',
            'status' => 'sometimes|in:draft,approved,active,archived',
        ]);

        if (($validated['status'] ?? null) === 'approved' && !$budget->approved_by) {
            $validated['approved_by'] = $user->id;
            $validated['approved_at'] = now();
        }

        $budget->update($validated);
        return back()->with('success', 'Đã cập nhật ngân sách.');
    }

    public function destroyBudget(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::BUDGET_DELETE, $project);

        $budget = ProjectBudget::where('project_id', $project->id)->findOrFail($id);
        if (in_array($budget->status, ['approved', 'archived'])) {
            return back()->with('error', 'Không thể xóa ngân sách đã duyệt.');
        }
        $budget->delete();
        return back()->with('success', 'Đã xóa ngân sách.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Invoices (Gap 4)
    // ===================================================================

    public function storeInvoice(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::INVOICE_CREATE, $project);

        $validated = $request->validate([
            'invoice_date' => 'required|date',
            'cost_group_id' => 'nullable|exists:cost_groups,id',
            'subtotal' => 'required|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:2000',
        ]);

        $totalAmount = $validated['subtotal'] + ($validated['tax_amount'] ?? 0) - ($validated['discount_amount'] ?? 0);

        Invoice::create([
            'project_id' => $project->id,
            'customer_id' => $project->customer_id,
            'total_amount' => $totalAmount,
            'created_by' => $user->id,
            ...$validated,
        ]);

        return back()->with('success', 'Đã tạo hóa đơn.');
    }

    public function updateInvoice(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::INVOICE_UPDATE, $project);

        $invoice = Invoice::where('project_id', $project->id)->findOrFail($id);
        $validated = $request->validate([
            'invoice_date' => 'sometimes|date',
            'cost_group_id' => 'nullable|exists:cost_groups,id',
            'subtotal' => 'sometimes|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'discount_amount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string|max:2000',
            'notes' => 'nullable|string|max:2000',
        ]);

        if (array_key_exists('subtotal', $validated) || array_key_exists('tax_amount', $validated) || array_key_exists('discount_amount', $validated)) {
            $subtotal = $validated['subtotal'] ?? $invoice->subtotal;
            $tax = $validated['tax_amount'] ?? $invoice->tax_amount;
            $discount = $validated['discount_amount'] ?? $invoice->discount_amount;
            $validated['total_amount'] = $subtotal + $tax - $discount;
        }

        $invoice->update($validated);
        return back()->with('success', 'Đã cập nhật hóa đơn.');
    }

    public function destroyInvoice(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::INVOICE_DELETE, $project);

        Invoice::where('project_id', $project->id)->findOrFail($id)->delete();
        return back()->with('success', 'Đã xóa hóa đơn.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Acceptance Stages (Gap 5)
    // ===================================================================

    public function storeAcceptance(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_CREATE, $project);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'task_id' => 'nullable|exists:project_tasks,id',
            'acceptance_template_id' => 'nullable|exists:acceptance_templates,id',
            'order' => 'nullable|integer|min:0',
        ]);

        $maxOrder = $project->acceptanceStages()->max('order') ?? 0;

        AcceptanceStage::create([
            'project_id' => $project->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'task_id' => $validated['task_id'] ?? null,
            'acceptance_template_id' => $validated['acceptance_template_id'] ?? null,
            'order' => $validated['order'] ?? ($maxOrder + 1),
            'is_custom' => true,
            'status' => 'pending',
        ]);

        return back()->with('success', 'Đã tạo giai đoạn nghiệm thu.');
    }


    public function updateAcceptance(Request $request, string $projectId, string $stageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_UPDATE, $project);

        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'task_id' => 'nullable|exists:project_tasks,id',
            'acceptance_template_id' => 'nullable|exists:acceptance_templates,id',
            'order' => 'nullable|integer|min:0',
        ]);

        $stage->update($validated);

        return back()->with('success', 'Đã cập nhật giai đoạn nghiệm thu.');
    }

    public function approveAcceptance(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();

        $validated = $request->validate([
            'level' => 'required|in:1,2,3',
        ]);

        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($id);

        // Don't pass Admin to model methods — FK columns reference users table
        // Call without user param to avoid FK violation
        $result = false;
        switch ($validated['level']) {
            case '1':
                $this->crmRequire($admin, Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $project);
                $result = $stage->approveSupervisor(); // null user — avoids FK violation
                break;
            case '2':
                $this->crmRequire($admin, Permissions::ACCEPTANCE_APPROVE_LEVEL_2, $project);
                $result = $stage->approveProjectManager();
                break;
            case '3':
                $this->crmRequire($admin, Permissions::ACCEPTANCE_APPROVE_LEVEL_3, $project);
                $result = $stage->approveCustomer();
                break;
        }

        if (!$result) {
            return back()->with('error', 'Không thể duyệt nghiệm thu ở trạng thái hiện tại.');
        }

        return back()->with('success', 'Đã duyệt nghiệm thu cấp ' . $validated['level'] . '.');
    }

    public function destroyAcceptance(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_DELETE, $project);

        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($id);
        if ($stage->status === 'owner_approved') {
            return back()->with('error', 'Không thể xóa giai đoạn đã duyệt hoàn toàn.');
        }
        $stage->delete();
        return back()->with('success', 'Đã xóa giai đoạn nghiệm thu.');
    }

    // ============ DOCUMENT CRUD ============

    public function storeDocument(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PROJECT_DOCUMENT_UPLOAD, $project);

        $request->validate([
            'file' => 'required|file|max:20480', // max 20MB
            'description' => 'nullable|string|max:1000',
        ]);

        $file = $request->file('file');
        $path = $file->store('project-documents/' . $project->id, 'public');

        Attachment::create([
            'original_name' => $file->getClientOriginalName(),
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_url' => '/storage/' . $path,
            'file_size' => $file->getSize(),
            'mime_type' => $file->getClientMimeType(),
            'type' => $file->getClientOriginalExtension(),
            'attachable_type' => Project::class,
            'attachable_id' => $project->id,
            'uploaded_by' => $user->id ?? null,
            'description' => $request->input('description'),
        ]);

        return back()->with('success', 'Đã upload tài liệu.');
    }

    public function updateDocument(Request $request, string $projectId, string $docId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PROJECT_DOCUMENT_UPLOAD, $project);

        $attachment = Attachment::where('attachable_type', Project::class)
            ->where('attachable_id', $project->id)
            ->findOrFail($docId);

        $validated = $request->validate([
            'description' => 'nullable|string|max:1000',
        ]);

        $attachment->update(['description' => $validated['description'] ?? null]);
        return back()->with('success', 'Đã cập nhật mô tả tài liệu.');
    }

    public function destroyDocument(Request $request, string $projectId, string $docId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PROJECT_DOCUMENT_DELETE, $project);

        $attachment = Attachment::where('attachable_type', Project::class)
            ->where('attachable_id', $project->id)
            ->findOrFail($docId);

        // Delete file from storage
        if ($attachment->file_path) {
            \Storage::disk('public')->delete($attachment->file_path);
        }

        $attachment->delete();
        return back()->with('success', 'Đã xóa tài liệu.');
    }

    // ============================================
    // PROJECT MATERIALS — Batch Transaction (Giống APP)
    // ============================================

    public function storeMaterialBatch(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_CREATE, $project);

        $validated = $request->validate([
            'transaction_date' => 'required|date',
            'cost_group_id' => 'required|exists:cost_groups,id',
            'items' => 'required|array|min:1',
            'items.*.material_id' => 'required|exists:materials,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.amount' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string|max:500',
        ]);

        $totalAmount = collect($validated['items'])->sum('amount');
        $itemNames = [];

        \DB::transaction(function () use ($project, $validated, $totalAmount, $user, &$itemNames) {
            // 1. Create a project cost entry
            $cost = \App\Models\Cost::create([
                'project_id' => $project->id,
                'name' => 'Chi phí vật liệu - ' . now()->format('d/m/Y'),
                'amount' => $totalAmount,
                'cost_date' => $validated['transaction_date'],
                'cost_group_id' => $validated['cost_group_id'],
                'category' => 'construction_materials',
                'status' => 'draft',
                'created_by' => $user->id ?? null,
            ]);

            // 2. Create material transactions
            foreach ($validated['items'] as $item) {
                $material = \App\Models\Material::find($item['material_id']);
                $itemNames[] = $material->name;

                \App\Models\MaterialTransaction::create([
                    'uuid' => \Illuminate\Support\Str::uuid()->toString(),
                    'material_id' => $item['material_id'],
                    'project_id' => $project->id,
                    'cost_id' => $cost->id,
                    'type' => 'out',
                    'quantity' => -abs($item['quantity']),
                    'unit_price' => $material->unit_price ?? ($item['amount'] / max($item['quantity'], 1)),
                    'total_amount' => $item['amount'],
                    'transaction_date' => $validated['transaction_date'],
                    'notes' => $item['notes'] ?? null,
                    'created_by' => $user->id ?? null,
                    'status' => 'approved',
                    'approved_by' => $user->id ?? null,
                    'approved_at' => now(),
                ]);

                // Update stock
                $material->decrement('current_stock', abs($item['quantity']));
            }
        });

        return back()->with('success', 'Đã ghi nhận ' . count($validated['items']) . ' vật liệu sử dụng: ' . implode(', ', $itemNames));
    }

    // ============================================
    // PROJECT EQUIPMENT — Allocate (Giống APP)
    // ============================================

    public function storeEquipmentAllocation(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_CREATE, $project);

        $validated = $request->validate([
            'equipment_id' => 'required|exists:equipment,id',
            'allocation_type' => 'required|in:rent,buy',
            'quantity' => 'required|integer|min:1',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'notes' => 'nullable|string|max:1000',
            // For buy (owned)
            'manager_id' => 'nullable|exists:users,id',
            'handover_date' => 'nullable|date',
            'return_date' => 'nullable|date',
            // For rent
            'rental_fee' => 'nullable|numeric|min:0',
        ]);

        $equipment = \App\Models\Equipment::findOrFail($validated['equipment_id']);

        $allocation = \DB::transaction(function () use ($project, $validated, $equipment, $user) {
            $allocation = \App\Models\EquipmentAllocation::create([
                'uuid' => \Illuminate\Support\Str::uuid()->toString(),
                'equipment_id' => $equipment->id,
                'project_id' => $project->id,
                'allocation_type' => $validated['allocation_type'],
                'quantity' => $validated['quantity'],
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'manager_id' => $validated['manager_id'] ?? null,
                'handover_date' => $validated['handover_date'] ?? $validated['start_date'],
                'return_date' => $validated['return_date'] ?? null,
                'rental_fee' => $validated['rental_fee'] ?? null,
                'status' => 'active',
                'created_by' => $user->id ?? null,
            ]);

            // Update equipment status
            $equipment->update(['status' => 'in_use']);

            // If rental, auto-create a cost entry
            if ($validated['allocation_type'] === 'rent' && ($validated['rental_fee'] ?? 0) > 0) {
                $cost = \App\Models\Cost::create([
                    'project_id' => $project->id,
                    'name' => 'Thuê thiết bị: ' . $equipment->name,
                    'amount' => $validated['rental_fee'],
                    'cost_date' => $validated['start_date'],
                    'category' => 'equipment',
                    'status' => 'draft',
                    'created_by' => $user->id ?? null,
                ]);
                $allocation->update(['cost_id' => $cost->id]);
            }

            return $allocation;
        });

        $typeLabel = $validated['allocation_type'] === 'rent' ? 'Thuê' : 'Có sẵn';
        return back()->with('success', "Đã phân bổ thiết bị ({$typeLabel}): {$equipment->name}");
    }

    public function returnEquipment(Request $request, string $projectId, string $allocationId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_UPDATE, $project);

        $allocation = \App\Models\EquipmentAllocation::where('project_id', $project->id)->findOrFail($allocationId);

        $allocation->update([
            'status' => 'returned',
            'return_date' => now()->toDateString(),
        ]);

        // Check if equipment has other active allocations
        $otherActive = \App\Models\EquipmentAllocation::where('equipment_id', $allocation->equipment_id)
            ->where('id', '!=', $allocation->id)
            ->where('status', 'active')
            ->exists();

        if (!$otherActive) {
            $allocation->equipment->update(['status' => 'available']);
        }

        return back()->with('success', 'Đã hoàn trả thiết bị.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Acceptance Items (matching APP AcceptanceItemController)
    // ===================================================================

    public function storeAcceptanceItem(Request $request, string $projectId, string $stageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_CREATE, $project);

        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'task_id' => 'nullable|exists:project_tasks,id',
            'acceptance_template_id' => 'nullable|exists:acceptance_templates,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'order' => 'nullable|integer|min:0',
        ]);

        AcceptanceItem::create([
            'acceptance_stage_id' => $stage->id,
            'acceptance_status' => 'not_started',
            'workflow_status' => 'draft',
            'created_by' => $user->id,
            ...$validated,
        ]);

        return back()->with('success', 'Đã thêm hạng mục nghiệm thu.');
    }

    public function updateAcceptanceItem(Request $request, string $projectId, string $stageId, string $itemId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_UPDATE, $project);

        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($itemId);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'task_id' => 'nullable|exists:project_tasks,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date',
            'order' => 'nullable|integer|min:0',
            'notes' => 'nullable|string',
        ]);

        $item->update(array_merge($validated, ['updated_by' => $user->id]));
        return back()->with('success', 'Đã cập nhật hạng mục nghiệm thu.');
    }

    public function destroyAcceptanceItem(string $projectId, string $stageId, string $itemId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_DELETE, $project);

        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($itemId);

        if (!in_array($item->workflow_status, ['draft', 'rejected'])) {
            return back()->with('error', 'Chỉ xóa được hạng mục ở trạng thái nháp hoặc bị từ chối.');
        }

        $item->delete();
        return back()->with('success', 'Đã xóa hạng mục nghiệm thu.');
    }

    /**
     * Submit acceptance item for supervisor approval
     * Flow: draft → submitted → supervisor_approved → pm_approved → customer_approved
     */
    public function submitAcceptanceItem(string $projectId, string $stageId, string $itemId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($itemId);

        if (!in_array($item->workflow_status, ['draft', 'rejected'])) {
            return back()->with('error', 'Chỉ gửi được hạng mục ở trạng thái nháp hoặc bị từ chối.');
        }

        $item->update([
            'workflow_status' => 'submitted',
            'submitted_by' => $user->id,
            'submitted_at' => now(),
        ]);

        // Send notification to supervisor
        $this->notifyFromCrm($project, 'acceptance_submit', "Hạng mục \"{$item->name}\" cần giám sát duyệt.");

        return back()->with('success', 'Đã gửi hạng mục để duyệt.');
    }

    /**
     * Supervisor approves acceptance item (Level 1)
     */
    public function approveAcceptanceItemSupervisor(string $projectId, string $stageId, string $itemId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $project);

        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($itemId);

        if ($item->workflow_status !== 'submitted') {
            return back()->with('error', 'Hạng mục không ở trạng thái chờ giám sát duyệt.');
        }

        $item->update([
            'workflow_status' => 'supervisor_approved',
            'supervisor_approved_at' => now(),
        ]);

        $this->notifyFromCrm($project, 'acceptance_supervisor_approved', "Hạng mục \"{$item->name}\" đã được giám sát duyệt, chờ PM duyệt.");

        return back()->with('success', 'Đã duyệt (Giám sát).');
    }

    /**
     * PM approves acceptance item (Level 2)
     */
    public function approveAcceptanceItemPM(string $projectId, string $stageId, string $itemId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_2, $project);

        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($itemId);

        if ($item->workflow_status !== 'supervisor_approved') {
            return back()->with('error', 'Hạng mục cần được giám sát duyệt trước.');
        }

        $item->update([
            'workflow_status' => 'pm_approved',
            'project_manager_approved_at' => now(),
        ]);

        $this->notifyFromCrm($project, 'acceptance_pm_approved', "Hạng mục \"{$item->name}\" đã được PM duyệt, chờ KH duyệt.");

        return back()->with('success', 'Đã duyệt (PM).');
    }

    /**
     * Customer approves acceptance item (Level 3 — final)
     */
    public function approveAcceptanceItemCustomer(string $projectId, string $stageId, string $itemId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_APPROVE_LEVEL_3, $project);

        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($itemId);

        if ($item->workflow_status !== 'pm_approved') {
            return back()->with('error', 'Hạng mục cần được PM duyệt trước.');
        }

        $item->update([
            'workflow_status' => 'customer_approved',
            'customer_approved_at' => now(),
        ]);

        // Also mark acceptance_status as approved (final acceptance)
        $item->approve(null, 'Khách hàng đã nghiệm thu');

        $this->notifyFromCrm($project, 'acceptance_customer_approved', "Hạng mục \"{$item->name}\" đã được KH nghiệm thu.");

        return back()->with('success', 'Đã nghiệm thu (Khách hàng).');
    }

    /**
     * Reject acceptance item (from any approval level)
     */
    public function rejectAcceptanceItem(Request $request, string $projectId, string $stageId, string $itemId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($itemId);

        if (!in_array($item->workflow_status, ['submitted', 'supervisor_approved', 'pm_approved'])) {
            return back()->with('error', 'Hạng mục không ở trạng thái chờ duyệt.');
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $item->update([
            'workflow_status' => 'rejected',
            'rejected_by' => $user->id,
            'rejected_at' => now(),
            'rejection_reason' => $validated['rejection_reason'],
        ]);

        // Model boot auto creates defect on workflow_status => rejected

        $this->notifyFromCrm($project, 'acceptance_rejected', "Hạng mục \"{$item->name}\" bị từ chối: {$validated['rejection_reason']}");

        return back()->with('success', 'Đã từ chối hạng mục nghiệm thu.');
    }

    /**
     * Attach files to acceptance item
     */
    public function attachFilesToAcceptanceItem(Request $request, string $projectId, string $stageId, string $itemId)
    {
        $project = Project::findOrFail($projectId);
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($itemId);

        $count = $this->attachFilesToEntity($request, $item, "acceptance-items/{$project->id}/{$stageId}/{$itemId}");
        return back()->with('success', "Đã đính kèm {$count} file vào hạng mục nghiệm thu.");
    }

    // ===================================================================
    // SUB-ITEM CRUD — Subcontractor Items (matching APP SubcontractorItemController)
    // ===================================================================

    public function storeSubcontractorItem(Request $request, string $projectId, string $subId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_CREATE, $project);

        $sub = Subcontractor::where('project_id', $project->id)->findOrFail($subId);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'unit_price' => 'required|numeric|min:0',
            'quantity' => 'required|numeric|min:0.01',
            'unit' => 'required|string|max:20',
            'order' => 'nullable|integer|min:0',
        ]);

        SubcontractorItem::create([
            'subcontractor_id' => $sub->id,
            ...$validated,
        ]);
        // Model boot auto-calculates total_amount and updates subcontractor.total_quote

        return back()->with('success', 'Đã thêm hạng mục nhà thầu phụ.');
    }

    public function updateSubcontractorItem(Request $request, string $projectId, string $subId, string $itemId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_UPDATE, $project);

        $sub = Subcontractor::where('project_id', $project->id)->findOrFail($subId);
        $item = SubcontractorItem::where('subcontractor_id', $sub->id)->findOrFail($itemId);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'unit_price' => 'sometimes|numeric|min:0',
            'quantity' => 'sometimes|numeric|min:0.01',
            'unit' => 'sometimes|string|max:20',
            'order' => 'nullable|integer|min:0',
        ]);

        $item->update($validated);
        // Model boot auto-recalculates total_amount and updates subcontractor.total_quote

        return back()->with('success', 'Đã cập nhật hạng mục nhà thầu phụ.');
    }

    public function destroySubcontractorItem(string $projectId, string $subId, string $itemId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_DELETE, $project);

        $sub = Subcontractor::where('project_id', $project->id)->findOrFail($subId);
        $item = SubcontractorItem::where('subcontractor_id', $sub->id)->findOrFail($itemId);
        $item->delete();
        // Model boot auto-recalculates subcontractor.total_quote on delete

        return back()->with('success', 'Đã xóa hạng mục nhà thầu phụ.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Material Bills (matching APP MaterialBillController)
    // ===================================================================

    public function storeMaterialBill(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_CREATE, $project);

        $validated = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'bill_date' => 'required|date',
            'cost_group_id' => 'nullable|exists:cost_groups,id',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.material_id' => 'required|exists:materials,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            // Auto-generate bill number
            $lastBill = MaterialBill::where('project_id', $project->id)->count();
            $billNumber = 'PVT-' . str_pad($lastBill + 1, 3, '0', STR_PAD_LEFT);

            $totalAmount = 0;
            foreach ($validated['items'] as $itemData) {
                $totalAmount += $itemData['quantity'] * $itemData['unit_price'];
            }

            $bill = MaterialBill::create([
                'project_id' => $project->id,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'bill_number' => $billNumber,
                'bill_date' => $validated['bill_date'],
                'cost_group_id' => $validated['cost_group_id'] ?? null,
                'total_amount' => $totalAmount,
                'notes' => $validated['notes'] ?? null,
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

            foreach ($validated['items'] as $itemData) {
                MaterialBillItem::create([
                    'material_bill_id' => $bill->id,
                    'material_id' => $itemData['material_id'],
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                    'total_price' => $itemData['quantity'] * $itemData['unit_price'],
                    'notes' => $itemData['notes'] ?? null,
                ]);
            }

            DB::commit();
            return back()->with('success', "Đã tạo phiếu vật tư {$billNumber}.");
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function updateMaterialBill(Request $request, string $projectId, string $billId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_UPDATE, $project);

        $bill = MaterialBill::where('project_id', $project->id)->findOrFail($billId);

        if ($bill->status !== 'draft') {
            return back()->with('error', 'Chỉ sửa được phiếu ở trạng thái nháp.');
        }

        $validated = $request->validate([
            'supplier_id' => 'nullable|exists:suppliers,id',
            'bill_date' => 'sometimes|date',
            'cost_group_id' => 'nullable|exists:cost_groups,id',
            'notes' => 'nullable|string',
            'items' => 'sometimes|array|min:1',
            'items.*.material_id' => 'required|exists:materials,id',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $bill->update([
                'supplier_id' => $validated['supplier_id'] ?? $bill->supplier_id,
                'bill_date' => $validated['bill_date'] ?? $bill->bill_date,
                'cost_group_id' => $validated['cost_group_id'] ?? $bill->cost_group_id,
                'notes' => $validated['notes'] ?? $bill->notes,
            ]);

            if (isset($validated['items'])) {
                $bill->items()->delete();

                $totalAmount = 0;
                foreach ($validated['items'] as $itemData) {
                    $total = $itemData['quantity'] * $itemData['unit_price'];
                    $totalAmount += $total;
                    MaterialBillItem::create([
                        'material_bill_id' => $bill->id,
                        'material_id' => $itemData['material_id'],
                        'quantity' => $itemData['quantity'],
                        'unit_price' => $itemData['unit_price'],
                        'total_price' => $total,
                        'notes' => $itemData['notes'] ?? null,
                    ]);
                }
                $bill->update(['total_amount' => $totalAmount]);
            }

            DB::commit();
            return back()->with('success', 'Đã cập nhật phiếu vật tư.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function destroyMaterialBill(string $projectId, string $billId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_DELETE, $project);

        $bill = MaterialBill::where('project_id', $project->id)->findOrFail($billId);

        if ($bill->status !== 'draft') {
            return back()->with('error', 'Chỉ xóa được phiếu ở trạng thái nháp.');
        }

        $bill->items()->delete();
        $bill->delete();

        return back()->with('success', 'Đã xóa phiếu vật tư.');
    }

    public function submitMaterialBill(string $projectId, string $billId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $bill = MaterialBill::where('project_id', $project->id)->findOrFail($billId);

        if ($bill->status !== 'draft') {
            return back()->with('error', 'Chỉ gửi được phiếu ở trạng thái nháp.');
        }

        $bill->submitForManagementApproval();

        $this->notifyFromCrm($project, 'material_bill_submit', "Phiếu vật tư {$bill->bill_number} cần BĐH duyệt.");

        return back()->with('success', 'Đã gửi phiếu vật tư để duyệt.');
    }

    public function approveMaterialBillManagement(string $projectId, string $billId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_MANAGEMENT, $project);

        $bill = MaterialBill::where('project_id', $project->id)->findOrFail($billId);

        if ($bill->status !== 'pending_management') {
            return back()->with('error', 'Phiếu không ở trạng thái chờ BĐH duyệt.');
        }

        // Use model method (null for Admin FK constraint)
        $bill->approveByManagement((object) ['id' => null]);
        $bill->update(['management_approved_at' => now()]);

        $this->notifyFromCrm($project, 'material_bill_management_approved', "Phiếu vật tư {$bill->bill_number} đã được BĐH duyệt, chờ KT xác nhận.");

        return back()->with('success', 'Đã duyệt phiếu vật tư (BĐH).');
    }

    public function approveMaterialBillAccountant(string $projectId, string $billId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $bill = MaterialBill::where('project_id', $project->id)->findOrFail($billId);

        if ($bill->status !== 'pending_accountant') {
            return back()->with('error', 'Phiếu không ở trạng thái chờ KT xác nhận.');
        }

        $bill->approveByAccountant((object) ['id' => null]);
        $bill->update(['accountant_approved_at' => now()]);

        $this->notifyFromCrm($project, 'material_bill_approved', "Phiếu vật tư {$bill->bill_number} đã được xác nhận.");

        return back()->with('success', 'Đã xác nhận phiếu vật tư (KT).');
    }

    public function rejectMaterialBill(Request $request, string $projectId, string $billId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $bill = MaterialBill::where('project_id', $project->id)->findOrFail($billId);

        if (!in_array($bill->status, ['pending_management', 'pending_accountant'])) {
            return back()->with('error', 'Phiếu không ở trạng thái chờ duyệt.');
        }

        $validated = $request->validate(['rejected_reason' => 'required|string|max:500']);
        $bill->reject($validated['rejected_reason'], null);

        $this->notifyFromCrm($project, 'material_bill_rejected', "Phiếu vật tư {$bill->bill_number} bị từ chối: {$validated['rejected_reason']}");

        return back()->with('success', 'Đã từ chối phiếu vật tư.');
    }

    // ===================================================================
    // SUB-ITEM CRUD — Material Quotas (matching APP MaterialQuotaController)
    // ===================================================================

    public function storeMaterialQuota(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_CREATE, $project);

        $validated = $request->validate([
            'material_id' => 'required|exists:materials,id',
            'task_id' => 'nullable|exists:project_tasks,id',
            'planned_quantity' => 'required|numeric|min:0.001',
            'unit' => 'required|string|max:20',
            'notes' => 'nullable|string',
        ]);

        $quota = MaterialQuota::create([
            'project_id' => $project->id,
            'created_by' => $user->id,
            ...$validated,
        ]);

        // Sync actual from existing transactions
        $quota->syncActualQuantity();

        return back()->with('success', 'Đã tạo định mức vật tư.');
    }

    public function updateMaterialQuota(Request $request, string $projectId, string $quotaId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_UPDATE, $project);

        $quota = MaterialQuota::where('project_id', $project->id)->findOrFail($quotaId);

        $validated = $request->validate([
            'planned_quantity' => 'sometimes|numeric|min:0.001',
            'unit' => 'sometimes|string|max:20',
            'notes' => 'nullable|string',
            'task_id' => 'nullable|exists:project_tasks,id',
        ]);

        $quota->update($validated);
        $quota->syncActualQuantity();

        return back()->with('success', 'Đã cập nhật định mức vật tư.');
    }

    public function destroyMaterialQuota(string $projectId, string $quotaId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_DELETE, $project);

        MaterialQuota::where('project_id', $project->id)->findOrFail($quotaId)->delete();

        return back()->with('success', 'Đã xóa định mức vật tư.');
    }

    // ===================================================================
    // HELPER — CRM Notification dispatch (matching APP NotificationService)
    // ===================================================================

    /**
     * Send notification from CRM to project team
     * Wraps NotificationService for CRM context (Admin user, not User)
     */
    private function notifyFromCrm(Project $project, string $type, string $message): void
    {
        try {
            $notificationService = app(\App\Services\NotificationService::class);
            $notificationService->sendToProjectTeam(
                $project->id,
                $type,
                \App\Models\Notification::CATEGORY_STATUS_CHANGE,
                $message,
                $message,
                ['project_id' => $project->id, 'source' => 'crm'],
                \App\Models\Notification::PRIORITY_MEDIUM,
                "/projects/{$project->id}",
                true,
                null // don't exclude anyone
            );
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('CRM notification failed: ' . $e->getMessage());
            // Don't throw — notifications are non-critical
        }
    }
}
