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
            'payments.attachments',
            'payments.confirmer',
            'payments.customerApprover',
            'additionalCosts.proposer',
            'additionalCosts.approver',
            'additionalCosts.attachments',
            'costs' => function ($q) {
                $q->with([
                    'creator',
                    'costGroup',
                    'subcontractor',
                    'attachments',
                    'budgetItem',
                    'managementApprover',
                    'accountantApprover'
                ])->orderByDesc('created_at');
            },
            'personnel.user',
            'personnel.personnelRole',
            'subcontractors.payments' => function ($q) {
                $q->with(['attachments', 'creator', 'approver', 'payer', 'rejector']);
            },
            'subcontractors.items',
            'subcontractors.attachments',
            'subcontractors.approver',
            'constructionLogs' => function ($q) {
                $q->with(['creator', 'task', 'attachments'])->latest('log_date');
            },
            'acceptanceStages' => function ($q) {
                $q->with([
                    'items' => function ($iq) {
                        $iq->with(['attachments', 'task:id,name,progress_percentage,parent_id'])->orderBy('order');
                    },
                    'task:id,name,parent_id',
                    'acceptanceTemplate',
                    'defects' => function ($dq) {
                        $dq->whereIn('status', ['open', 'in_progress', 'resolved', 'verified'])->with('attachments');
                    },
                    'attachments',
                ])->orderBy('order');
            },
            'defects.attachments',
            'phases',
            'progress',
            'changeRequests.requester',
            'changeRequests.approver',
            'changeRequests.attachments',
            'invoices.attachments',
            'budgets.items',
            'budgets.creator',
            'comments' => function ($q) {
                $q->whereNull('parent_id')->with(['user', 'replies.user'])->orderByDesc('created_at');
            },
            'risks.owner',
            'contract.attachments',
            'warranties.attachments',
            'maintenances.attachments',
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

        // Get project material bills (bill-based tracking) — matching mobile APP
        $materialBills = MaterialBill::where('project_id', $project->id)
            ->with(['items.material', 'supplier', 'creator:id,name', 'managementApprover:id,name', 'accountantApprover:id,name'])
            ->orderByDesc('bill_date')
            ->orderByDesc('created_at')
            ->get();

        // Get suppliers for bill creation form
        $suppliers = \App\Models\Supplier::select('id', 'name', 'phone', 'email')
            ->orderBy('name')->get();

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

        // Get all equipment for allocation form (no status filter — allow any for tracking)
        $allEquipment = [];
        if (class_exists(\App\Models\Equipment::class)) {
            $allEquipment = \App\Models\Equipment::select('id', 'name', 'code', 'type', 'status', 'category')
                ->orderBy('name')->get();
        }

        // Get equipment rentals (Thuê thiết bị — matching APP)
        $equipmentRentals = [];
        if (class_exists(\App\Models\EquipmentRental::class)) {
            $equipmentRentals = \App\Models\EquipmentRental::where('project_id', $project->id)
                ->with(['equipment:id,name,code', 'supplier:id,name', 'creator:id,name', 'approver:id,name', 'confirmer:id,name', 'attachments'])
                ->orderByDesc('created_at')
                ->get();
        }

        // Get equipment purchases (Mua thiết bị — matching APP)
        $equipmentPurchases = [];
        if (class_exists(\App\Models\EquipmentPurchase::class)) {
            $equipmentPurchases = \App\Models\EquipmentPurchase::where('project_id', $project->id)
                ->with(['items', 'creator:id,name', 'approver:id,name', 'confirmer:id,name', 'attachments'])
                ->orderByDesc('created_at')
                ->get();
        }

        // Get asset usages (Sử dụng tài sản từ kho — matching APP)
        $assetUsages = [];
        if (class_exists(\App\Models\AssetUsage::class)) {
            $assetUsages = \App\Models\AssetUsage::where('project_id', $project->id)
                ->with(['asset:id,name,code,category,status', 'receiver:id,name', 'creator:id,name', 'approver:id,name', 'confirmer:id,name', 'attachments'])
                ->orderByDesc('created_at')
                ->get();
        }

        // Get company assets for usage form
        $companyAssets = [];
        if (class_exists(\App\Models\CompanyAsset::class)) {
            $companyAssets = \App\Models\CompanyAsset::where('quantity', '>', 0)
                ->select('id', 'name', 'code', 'category', 'quantity', 'unit')
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
            'materialBills' => $materialBills,
            'suppliers' => $suppliers,
            'projectEquipment' => $projectEquipment,
            'allEquipment' => $allEquipment,
            'equipmentRentals' => $equipmentRentals,
            'equipmentPurchases' => $equipmentPurchases,
            'assetUsages' => $assetUsages,
            'companyAssets' => $companyAssets,
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
            'budget_item_id' => 'nullable|exists:budget_items,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'subcontractor_id' => 'nullable|exists:subcontractors,id',
            'material_id' => 'nullable|exists:materials,id',
            'quantity' => 'nullable|numeric|min:0.01',
            'unit' => 'nullable|string|max:20',
        ]);

        // Auto-detect cost group & category (matching APP logic)
        $costData = [
            'project_id' => $project->id,
            'created_by' => $user->id,
            'status' => 'pending_management_approval',
            ...$validated,
        ];

        if (class_exists(\App\Services\CostGroupAutoDetectService::class)) {
            $autoDetectService = app(\App\Services\CostGroupAutoDetectService::class);
            if (empty($costData['cost_group_id'])) {
                $costData['cost_group_id'] = $autoDetectService->detectCostGroup($costData);
            }
            $costData['category'] = $autoDetectService->detectCategory($costData);
        }

        DB::beginTransaction();
        try {
            $cost = Cost::create($costData);

            // Handle file uploads directly in the same request - MANDATORY for costs
            $this->attachFilesToEntity($request, $cost, "costs/{$project->id}/{$cost->id}", true);

            DB::commit();
            return back()->with('success', 'Đã tạo phiếu chi.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi tạo phiếu chi: ' . $e->getMessage());
        }
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
            'budget_item_id' => 'nullable|exists:budget_items,id',
            'supplier_id' => 'nullable|exists:suppliers,id',
            'subcontractor_id' => 'nullable|exists:subcontractors,id',
            'material_id' => 'nullable|exists:materials,id',
            'quantity' => 'nullable|numeric|min:0.01',
            'unit' => 'nullable|string|max:20',
        ]);

        DB::beginTransaction();
        try {
            $cost->update($validated);

            // Handle file uploads during update
            $this->attachFilesToEntity($request, $cost, "costs/{$project->id}/{$cost->id}", false);

            DB::commit();
            return back()->with('success', 'Đã cập nhật phiếu chi.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi cập nhật phiếu chi: ' . $e->getMessage());
        }
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

    public function submitCost(Request $request, string $projectId, string $costId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_SUBMIT, $project);

        $cost = Cost::where('project_id', $project->id)->findOrFail($costId);
        if ($cost->status !== 'draft') {
            return back()->with('error', 'Chỉ có thể gửi duyệt phiếu chi ở trạng thái nháp.');
        }

        DB::beginTransaction();
        try {
            // Nếu có file upload kèm theo, lưu file trước
            if ($request->hasFile('files')) {
                $request->validate([
                    'files.*' => 'required|file|max:20480',
                ]);
                $this->attachFilesToEntity($request, $cost, "costs/{$project->id}/{$cost->id}");
            }

            // BẮT BUỘC: Phải có ít nhất 1 file chứng từ mới được gửi duyệt
            $cost->load('attachments');
            if ($cost->attachments->isEmpty()) {
                DB::rollBack();
                return back()->with('error', 'Bắt buộc phải upload chứng từ trước khi gửi duyệt phiếu chi.');
            }

            $cost->submitForManagementApproval();
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi gửi duyệt: ' . $e->getMessage());
        }

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

        // FIX BUG 1+2: Admin model can't be FK to users table.
        // Use forceFill to set status + timestamps directly, avoiding FK violation.
        $cost->forceFill([
            'status' => 'pending_accountant_approval',
            'management_approved_at' => now(),
        ])->save();

        $cost->notifyEvent('approved_management', $admin);

        return back()->with('success', 'Đã duyệt phiếu chi (Ban điều hành).');
    }

    public function approveCostAccountant(Request $request, string $projectId, string $costId)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $this->crmRequire($admin, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $cost = Cost::where('project_id', $project->id)->findOrFail($costId);
        if ($cost->status !== 'pending_accountant_approval') {
            return back()->with('error', 'Phiếu chi không ở trạng thái chờ KT xác nhận.');
        }

        // KT chỉ cần xác nhận — file chứng từ đã được upload từ lúc gửi duyệt
        // Verify chứng từ tồn tại
        $cost->load('attachments');
        if ($cost->attachments->isEmpty()) {
            return back()->with('error', 'Phiếu chi chưa có chứng từ đính kèm. Không thể xác nhận.');
        }

        try {
            DB::beginTransaction();

            // FIX BUG 1+2: Set status + timestamp via forceFill (Admin FK constraint)
            $cost->forceFill([
                'status' => 'approved',
                'accountant_approved_at' => now(),
            ])->save();

            // CRITICAL: Trigger side effects that model method normally does
            // 1. Update subcontractor total_paid + payment_status
            if ($cost->subcontractor_id) {
                $this->syncSubcontractorPaymentFromCost($cost);
            }
            // NOTE: Material inventory transaction removed — cost tracking is done via Cost model directly
            // 3. Sync budget items
            if ($cost->project_id && class_exists(\App\Services\BudgetSyncService::class)) {
                app(\App\Services\BudgetSyncService::class)->syncProjectBudgets($project);
            }

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi xác nhận: ' . $e->getMessage());
        }

        $cost->notifyEvent('approved_accountant', $admin);

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

        // FIX BUG 1+2: Use model method which handles side effects (rollback subcontractor, material, budget)
        // Pass null for user (Admin FK constraint) — model handles gracefully
        $cost->reject($validated['rejected_reason'], null);

        $cost->notifyEvent('rejected', $admin, ['reason' => $validated['rejected_reason']]);

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
            'payment_number' => 'nullable|max:50', // Allow string or integer
            'contract_id' => 'nullable|exists:contracts,id',
            'notes' => 'nullable|string|max:2000',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'required|date',
            'status' => 'nullable|string',
        ]);

        // Auto-generate payment_number if not provided (must be integer for DB)
        if (empty($validated['payment_number'])) {
            $count = ProjectPayment::where('project_id', $project->id)->count();
            $validated['payment_number'] = $count + 1;
        }

        DB::beginTransaction();
        try {
            $payment = ProjectPayment::create([
                'project_id' => $project->id,
                ...$validated,
                // CRM: Tạo xong đẩy thẳng sang KT xác nhận (skip bước KH đánh dấu)
                'status' => 'customer_paid',
                'paid_date' => now()->toDateString(),
                'customer_approved_by' => $user->id,
                'customer_approved_at' => now(),
                'payment_proof_uploaded_at' => now(),
            ]);

            // Handle file uploads - MANDATORY
            $this->attachFilesToEntity($request, $payment, "project-payments/{$project->id}/{$payment->id}", true);

            DB::commit();
            return back()->with('success', 'Đã thêm đợt thanh toán và gửi cho Kế toán xác nhận.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi thêm thanh toán: ' . $e->getMessage());
        }
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

        DB::beginTransaction();
        try {
            $payment->update($validated);

            // Handle file uploads during update
            $this->attachFilesToEntity($request, $payment, "project-payments/{$project->id}/{$payment->id}", false);

            DB::commit();
            return back()->with('success', 'Đã cập nhật thanh toán.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi cập nhật thanh toán: ' . $e->getMessage());
        }
    }

    /**
     * CRM: KH đánh dấu đã thanh toán (pending → customer_paid)
     * Yêu cầu phải upload chứng từ thanh toán (giống luồng APP)
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
            'files' => 'required|array|min:1',
            'files.*' => 'required|file|max:10240|mimes:jpg,jpeg,png,pdf,doc,docx,xls,xlsx',
        ], [
            'files.required' => 'Vui lòng tải lên chứng từ thanh toán.',
            'files.min' => 'Cần ít nhất 1 file chứng từ thanh toán.',
        ]);

        try {
            DB::beginTransaction();

            // Upload & attach files (chứng từ thanh toán)
            if ($request->hasFile('files')) {
                /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
                $disk = \Illuminate\Support\Facades\Storage::disk('public');
                foreach ($request->file('files') as $file) {
                    $path = $file->store("projects/{$project->id}/payments", 'public');
                    \App\Models\Attachment::create([
                        'original_name' => $file->getClientOriginalName(),
                        'file_name' => basename($path),
                        'file_path' => $path,
                        'file_url' => $disk->url($path),
                        'mime_type' => $file->getClientMimeType(),
                        'file_size' => $file->getSize(),
                        'type' => 'payment_proof',
                        'attachable_type' => ProjectPayment::class,
                        'attachable_id' => $payment->id,
                        'uploaded_by' => $user->id,
                    ]);
                }
            }

            // Mark as paid by customer
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

            $payment->notifyEvent('proof_uploaded', $user);

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

        $payment->notifyEvent('customer_approved', $user);

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

        $payment->notifyEvent('customer_rejected', $user, ['reason' => $validated['rejection_reason']]);

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
                // BUSINESS RULE: Auto-calculate status based on progress
                $service = app(\App\Services\TaskProgressService::class);
                $autoStatus = $service->calculateStatus($task, (float) $log->completion_percentage);

                $task->forceFill([
                    'progress_percentage' => $log->completion_percentage,
                    'status' => $autoStatus,
                ])->saveQuietly();

                // Trigger hierarchical progress recalculation
                if ($task->parent_id) {
                    $parent = \App\Models\ProjectTask::find($task->parent_id);
                    if ($parent) {
                        $service->updateTaskFromLogs($parent, true);
                    }
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
    private function attachFilesToEntity(Request $request, $entity, string $storagePath, bool $validate = true): int
    {
        if ($validate || $request->hasFile('files')) {
            $request->validate([
                'files' => ($validate ? 'required|' : 'nullable|') . 'array' . ($validate ? '|min:1' : ''),
                'files.*' => 'required|file|max:20480', // max 20MB each
            ]);
        }

        if (!$request->hasFile('files')) {
            return 0;
        }

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

        DB::beginTransaction();
        try {
            $log = ConstructionLog::create([
                'project_id' => $project->id,
                'created_by' => $user->id,
                ...$validated,
            ]);

            // Handle file uploads during log creation
            $this->attachFilesToEntity($request, $log, "logs/{$project->id}", false);

            DB::commit();

            // Recalculate progress logic
            if (class_exists(\App\Services\TaskProgressService::class) && $log->task_id) {
                $task = \App\Models\ProjectTask::find($log->task_id);
                if ($task) {
                    app(\App\Services\TaskProgressService::class)->updateTaskFromLogs($task, true);
                }
            }

            return back()->with('success', 'Đã thêm nhật ký thi công.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi thêm nhật ký: ' . $e->getMessage());
        }
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

        DB::beginTransaction();
        try {
            $log->update($validated);

            // Handle file uploads during update
            $this->attachFilesToEntity($request, $log, "logs/{$project->id}", false);

            DB::commit();
            
            // Recalculate progress logic (manually triggered if needed, though model usually handles)
            if (class_exists(\App\Services\TaskProgressService::class)) {
                $service = app(\App\Services\TaskProgressService::class);
                if ($log->task_id) {
                    $logTask = \App\Models\ProjectTask::find($log->task_id);
                    if ($logTask) $service->updateTaskFromLogs($logTask);
                }
                if ($oldTaskId && $oldTaskId != $log->task_id) {
                    $oldTask = \App\Models\ProjectTask::find($oldTaskId);
                    if ($oldTask) $service->updateTaskFromLogs($oldTask);
                }
            }

            return back()->with('success', 'Đã cập nhật nhật ký thi công.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi cập nhật nhật ký: ' . $e->getMessage());
        }
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
            'defect_type' => 'nullable|in:standard_violation,acceptance,other',
        ]);

        DB::beginTransaction();
        try {
            $defect = Defect::create([
                'project_id' => $project->id,
                'reported_by' => $user->id,
                'description' => $validated['description'],
                'severity' => $validated['severity'],
                'status' => $validated['status'] ?? 'open',
                'task_id' => $validated['task_id'] ?? null,
                'acceptance_stage_id' => $validated['acceptance_stage_id'] ?? null,
                'defect_type' => $validated['defect_type'] ?? null,
            ]);

            // Handle file uploads during creation
            $this->attachFilesToEntity($request, $defect, "defects/{$project->id}", false);

            DB::commit();
            return back()->with('success', 'Đã ghi nhận lỗi/sai sót.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi ghi nhận lỗi: ' . $e->getMessage());
        }
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
            'rejection_reason' => 'nullable|string|max:1000',
        ]);

        $oldStatus = $defect->status;

        DB::beginTransaction();
        try {
            // BUSINESS RULE: Use model methods for status transitions (matching APP)
            if (isset($validated['status']) && $validated['status'] !== $oldStatus) {
                switch ($validated['status']) {
                    case 'in_progress':
                        if ($request->has('rejection_reason') && $validated['rejection_reason']) {
                            $defect->markAsRejected(null, $validated['rejection_reason']);
                        } else {
                            $defect->markAsInProgress(null);
                        }
                        break;
                    case 'fixed':
                        $defect->markAsFixed(null);
                        break;
                    case 'verified':
                        if ($defect->status !== 'fixed') {
                            return back()->with('error', 'Chỉ có thể xác nhận lỗi đã được sửa (trạng thái fixed).');
                        }
                        $defect->markAsVerified(null);
                        // markAsVerified triggers checkAndUpdateTaskProgress + autoResubmitAcceptanceStage
                        break;
                    default:
                        $defect->update(['status' => $validated['status']]);
                }

                // BUSINESS RULE: Create history record (matching APP)
                \App\Models\DefectHistory::create([
                    'defect_id' => $defect->id,
                    'action' => 'status_changed',
                    'old_status' => $oldStatus,
                    'new_status' => $validated['status'],
                    'user_id' => $user->id,
                ]);

                unset($validated['status']);
            }

            // Update other fields (description, severity)
            unset($validated['rejection_reason']);
            $remaining = array_filter($validated, fn($v) => $v !== null);
            if (!empty($remaining)) {
                $defect->update($remaining);
            }

            // Handle file uploads during update
            $this->attachFilesToEntity($request, $defect, "defects/{$project->id}", false);

            DB::commit();
            return back()->with('success', 'Đã cập nhật thông tin lỗi.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi cập nhật lỗi: ' . $e->getMessage());
        }
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
    // DEFECT WORKFLOW ACTIONS (matching APP flow)
    // Flow: open → in_progress → fixed → verified
    //       ↑ rejectFix ←─────────────┘
    // ===================================================================

    /**
     * Nhận xử lý lỗi (open → in_progress)
     */
    public function markDefectInProgress(Request $request, string $projectId, string $defectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_UPDATE, $project);

        $defect = Defect::where('project_id', $project->id)->findOrFail($defectId);
        if (!in_array($defect->status, ['open'])) {
            return back()->with('error', 'Lỗi không ở trạng thái có thể nhận xử lý.');
        }

        $validated = $request->validate([
            'expected_completion_date' => 'nullable|date',
        ]);

        $oldStatus = $defect->status;
        $defect->markAsInProgress(null);

        if (!empty($validated['expected_completion_date'])) {
            $defect->update(['expected_completion_date' => $validated['expected_completion_date']]);
        }

        \App\Models\DefectHistory::create([
            'defect_id' => $defect->id,
            'action' => 'status_changed',
            'old_status' => $oldStatus,
            'new_status' => 'in_progress',
            'user_id' => $user->id,
        ]);

        $defect->notifyEvent('in_progress', $user);

        return back()->with('success', 'Đã nhận xử lý lỗi.');
    }

    /**
     * Đánh dấu đã sửa lỗi (in_progress → fixed)
     * BUSINESS RULE: Matching APP — requires after images
     */
    public function markDefectFixed(Request $request, string $projectId, string $defectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_UPDATE, $project);

        $defect = Defect::where('project_id', $project->id)->findOrFail($defectId);
        if ($defect->status !== 'in_progress') {
            return back()->with('error', 'Lỗi phải đang ở trạng thái "Đang xử lý" mới có thể đánh dấu đã sửa.');
        }

        $oldStatus = $defect->status;
        $defect->markAsFixed(null); // null user (Admin FK constraint)

        \App\Models\DefectHistory::create([
            'defect_id' => $defect->id,
            'action' => 'status_changed',
            'old_status' => $oldStatus,
            'new_status' => 'fixed',
            'user_id' => $user->id,
        ]);

        $defect->notifyEvent('fixed', $user);

        return back()->with('success', 'Đã đánh dấu lỗi đã sửa — chờ xác nhận.');
    }

    /**
     * Xác nhận lỗi đã xử lý xong (fixed → verified)
     * BUSINESS RULE: Triggers checkAndUpdateTaskProgress + autoResubmitAcceptanceStage
     */
    public function verifyDefect(Request $request, string $projectId, string $defectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_UPDATE, $project);

        $defect = Defect::where('project_id', $project->id)->findOrFail($defectId);
        if ($defect->status !== 'fixed') {
            return back()->with('error', 'Chỉ có thể xác nhận lỗi đã được sửa (trạng thái "Đã sửa").');
        }

        $oldStatus = $defect->status;
        // markAsVerified triggers:
        // 1. checkAndUpdateTaskProgress (complete task if all defects verified)
        // 2. autoResubmitAcceptanceStage (reset rejected items to draft)
        $result = $defect->markAsVerified(null);

        if (!$result) {
            return back()->with('error', 'Không thể xác nhận lỗi.');
        }

        \App\Models\DefectHistory::create([
            'defect_id' => $defect->id,
            'action' => 'status_changed',
            'old_status' => $oldStatus,
            'new_status' => 'verified',
            'user_id' => $user->id,
        ]);

        $defect->notifyEvent('verified', $user);

        return back()->with('success', 'Đã xác nhận lỗi đã sửa xong.');
    }

    /**
     * Từ chối sửa lỗi (fixed → in_progress, yêu cầu sửa lại)
     */
    public function rejectDefectFix(Request $request, string $projectId, string $defectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_UPDATE, $project);

        $defect = Defect::where('project_id', $project->id)->findOrFail($defectId);
        if ($defect->status !== 'fixed') {
            return back()->with('error', 'Chỉ có thể từ chối lỗi đang ở trạng thái "Đã sửa".');
        }

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        $oldStatus = $defect->status;
        $defect->markAsRejected(null, $validated['rejection_reason']);

        \App\Models\DefectHistory::create([
            'defect_id' => $defect->id,
            'action' => 'status_changed',
            'old_status' => $oldStatus,
            'new_status' => 'in_progress',
            'user_id' => $user->id,
            'comment' => 'Từ chối: ' . $validated['rejection_reason'],
        ]);

        $defect->notifyEvent('rejected', $user, ['reason' => $validated['rejection_reason']]);

        return back()->with('success', 'Đã từ chối sửa lỗi — yêu cầu sửa lại.');
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

            // BUSINESS RULE: When progress >= 100%, always use auto-calculated status
            // to ensure task is marked 'completed'. Otherwise, respect user's status choice.
            $finalStatus = ((float) $progressInput >= 100)
                ? $autoStatus
                : ($statusInput ?: $autoStatus);

            $task->forceFill([
                'progress_percentage' => $progressInput,
                'status' => $finalStatus,
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

        DB::beginTransaction();
        try {
            $contract = Contract::create([
                'project_id' => $project->id,
                ...$validated,
            ]);

            // Handle file uploads
            $this->attachFilesToEntity($request, $contract, "contracts/{$project->id}", true);

            DB::commit();
            return back()->with('success', 'Đã tạo hợp đồng.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi tạo hợp đồng: ' . $e->getMessage());
        }
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
        DB::beginTransaction();
        try {
            $contract->update($validated);

            // Handle file uploads during update
            $this->attachFilesToEntity($request, $contract, "contracts/{$project->id}", false);

            DB::commit();
            return back()->with('success', 'Đã cập nhật hợp đồng.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi cập nhật hợp đồng: ' . $e->getMessage());
        }
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
        } else {
            // Auto-create GlobalSubcontractor for future reuse
            $gs = GlobalSubcontractor::firstOrCreate(
                ['name' => $validated['name']],
                [
                    'category' => $validated['category'] ?? null,
                    'bank_name' => $validated['bank_name'] ?? null,
                    'bank_account_number' => $validated['bank_account_number'] ?? null,
                    'bank_account_name' => $validated['bank_account_name'] ?? null,
                ]
            );
            $validated['global_subcontractor_id'] = $gs->id;
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

            // Tự động tạo Cost record đã bị gỡ bỏ để tránh tính trùng chi phí (Double Counting)
            // Hợp đồng thầu phụ chỉ được theo dõi qua bảng subcontractors
            // Chi phí thực tế chỉ tính từ các đợt thanh toán (SubcontractorPayment)

            // Handle file uploads
            $this->attachFilesToEntity($request, $subcontractor, "subcontractors/{$project->id}/{$subcontractor->id}", false);

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
        $this->attachFilesToEntity($request, $sub, "subcontractors/{$project->id}/{$sub->id}", false);

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

        // Check if amount exceeds remaining (account for pending/approved-but-not-paid payments)
        $pendingPaymentsTotal = $sub->payments()
            ->whereNotIn('status', ['rejected', 'cancelled', 'paid'])
            ->sum('amount');
        $remaining = $sub->total_quote - $sub->total_paid - $pendingPaymentsTotal;
        if ($validated['amount'] > $remaining) {
            return back()->with('error', 'Số tiền thanh toán vượt quá số tiền còn lại (' . number_format(max(0, $remaining)) . '). Đã có ' . number_format($pendingPaymentsTotal) . ' đang chờ duyệt.');
        }

        DB::beginTransaction();
        try {
            $payment = SubcontractorPayment::create([
                'subcontractor_id' => $sub->id,
                'project_id' => $project->id,
                ...$validated,
                'status' => 'pending_management_approval',
                'created_by' => $user->id,
            ]);

            // Handle file uploads - MANDATORY
            $this->attachFilesToEntity($request, $payment, "sub-payments/{$project->id}/{$payment->id}", true);

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
        $this->crmRequire($admin, Permissions::COST_APPROVE_MANAGEMENT, $project);
        $payment = SubcontractorPayment::where('project_id', $project->id)->findOrFail($paymentId);

        if ($payment->status !== 'pending_management_approval') {
            return back()->with('error', 'Phiếu TT không ở trạng thái chờ duyệt.');
        }

        DB::beginTransaction();
        try {
            // Record approver info directly (Admin model != User model, so we set fields manually)
            $payment->approved_by = $admin->id;
            $payment->approved_at = now();
            $payment->status = 'pending_accountant_confirmation';
            $payment->save();

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
            $payment->rejected_by = $admin->id;
            $payment->rejected_at = now();
            $payment->rejection_reason = $request->input('rejection_reason');
            $payment->status = 'rejected';
            $payment->save();

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
        $this->crmRequire($admin, Permissions::COST_APPROVE_ACCOUNTANT, $project);
        $payment = SubcontractorPayment::where('project_id', $project->id)->findOrFail($paymentId);

        if ($payment->status !== 'pending_accountant_confirmation') {
            return back()->with('error', 'Phiếu TT chưa được duyệt bởi BĐH.');
        }

        DB::beginTransaction();
        try {
            // Set payer info directly (Admin model != User model)
            $payment->paid_by = $admin->id;
            $payment->paid_at = now();
            $payment->status = 'paid';
            $payment->save();

            // Recalculate subcontractor financials from payments table (single source of truth)
            $payment->subcontractor->recalculateFinancials();

            // Ghi chú: Việc đồng bộ sang bảng Cost hiện đã được xử lý tự động qua model hook 'saved'
            // Điều này đảm bảo dữ liệu luôn nhất quán giữa trạng thái Thanh toán và Chi phí dự án
            
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

        DB::beginTransaction();
        try {
            $cost = AdditionalCost::create([
                'project_id' => $project->id,
                'proposed_by' => $user->id,
                'status' => 'pending_approval',
                ...$validated,
            ]);

            // Handle file uploads if any
            $this->attachFilesToEntity($request, $cost, "additional-costs/{$project->id}/{$cost->id}", true);

            DB::commit();
            return back()->with('success', 'Đã tạo chi phí phát sinh.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi tạo chi phí phát sinh: ' . $e->getMessage());
        }
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
            'budget_date' => 'sometimes|date',
            'version' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'status' => 'sometimes|in:draft,approved,active,revised,archived',
            'items' => 'sometimes|array',
            'items.*.name' => 'required_with:items|string|max:255',
            'items.*.estimated_amount' => 'required_with:items|numeric|min:0',
            'items.*.description' => 'nullable|string|max:500',
        ]);

        if (($validated['status'] ?? null) === 'approved' && !$budget->approved_by) {
            $validated['approved_by'] = $user->id;
            $validated['approved_at'] = now();
        }

        DB::beginTransaction();
        try {
            // Update budget fields (exclude items from direct update)
            $budgetFields = collect($validated)->except('items')->toArray();

            // Recalculate total if items provided
            if (isset($validated['items'])) {
                $budgetFields['total_budget'] = collect($validated['items'])->sum('estimated_amount');
            }

            $budget->update($budgetFields);

            // Sync items if provided
            if (isset($validated['items'])) {
                // Remove old items
                $budget->items()->delete();
                // Create new items
                foreach ($validated['items'] as $itemData) {
                    $budget->items()->create([
                        'name' => $itemData['name'],
                        'estimated_amount' => $itemData['estimated_amount'],
                        'description' => $itemData['description'] ?? null,
                    ]);
                }
            }

            DB::commit();
            return back()->with('success', 'Đã cập nhật ngân sách.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi cập nhật: ' . $e->getMessage());
        }
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

        DB::beginTransaction();
        try {
            $invoice = Invoice::create([
                'project_id' => $project->id,
                'customer_id' => $project->customer_id,
                'total_amount' => $totalAmount,
                'created_by' => $user->id,
                ...$validated,
            ]);

            // Handle file uploads - MANDATORY
            $this->attachFilesToEntity($request, $invoice, "invoices/{$project->id}/{$invoice->id}", true);

            DB::commit();
            return back()->with('success', 'Đã tạo hóa đơn/chi phí.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi tạo hóa đơn: ' . $e->getMessage());
        }
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

        DB::beginTransaction();
        try {
            $invoice->update($validated);

            // Handle file uploads during update
            $this->attachFilesToEntity($request, $invoice, "invoices/{$project->id}", false);

            DB::commit();
            return back()->with('success', 'Đã cập nhật hóa đơn.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi cập nhật hóa đơn: ' . $e->getMessage());
        }
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

        DB::beginTransaction();
        try {
            $stage = AcceptanceStage::create([
                'project_id' => $project->id,
                'name' => $validated['name'],
                'description' => $validated['description'] ?? null,
                'task_id' => $validated['task_id'] ?? null,
                'acceptance_template_id' => $validated['acceptance_template_id'] ?? null,
                'order' => $validated['order'] ?? ($maxOrder + 1),
                'is_custom' => true,
                'status' => 'pending',
            ]);

            // Handle file uploads
            $this->attachFilesToEntity($request, $stage, "acceptance/{$project->id}/{$stage->id}", false);

            DB::commit();
            return back()->with('success', 'Đã tạo giai đoạn nghiệm thu.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi tạo giai đoạn nghiệm thu: ' . $e->getMessage());
        }
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

        DB::beginTransaction();
        try {
            $stage->update($validated);

            // Handle file uploads during update
            $this->attachFilesToEntity($request, $stage, "acceptance/{$project->id}/{$stage->id}", false);

            DB::commit();
            return back()->with('success', 'Đã cập nhật giai đoạn nghiệm thu.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi cập nhật giai đoạn nghiệm thu: ' . $e->getMessage());
        }
    }

    public function approveAcceptance(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();

        $validated = $request->validate([
            'level' => 'required|in:1,2,3',
        ]);

        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($id);

        // FIX BUG 6: Check if all items in the stage are completed before allowing stage approval
        $items = \App\Models\AcceptanceItem::where('acceptance_stage_id', $stage->id)->get();
        if ($items->isNotEmpty()) {
            $incompleteItems = $items->filter(fn($item) => !in_array($item->workflow_status, ['customer_approved']));
            if ($incompleteItems->isNotEmpty() && $validated['level'] === '3') {
                $names = $incompleteItems->pluck('name')->join(', ');
                return back()->with('error', "Không thể duyệt KH. Còn hạng mục chưa hoàn thành: {$names}");
            }
        }

        // Don't pass Admin to model methods — FK columns reference users table
        $result = false;
        switch ($validated['level']) {
            case '1':
                $this->crmRequire($admin, Permissions::ACCEPTANCE_APPROVE_LEVEL_1, $project);
                $result = $stage->approveSupervisor();
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

                // NOTE: Inventory stock tracking removed — materials module is cost-only
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

    // ============================================
    // PROJECT EQUIPMENT RENTAL — Thuê thiết bị (Giống APP)
    // ============================================

    public function updateEquipmentRental(Request $request, string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_UPDATE, $project);

        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);
        if (!in_array($rental->status, ['draft', 'rejected'])) {
            return back()->with('error', 'Chỉ có thể sửa phiếu ở trạng thái Nháp hoặc Từ chối.');
        }

        $validated = $request->validate([
            'equipment_name'    => 'required|string|max:255',
            'equipment_id'      => 'nullable|exists:equipment,id',
            'supplier_id'       => 'nullable|exists:suppliers,id',
            'rental_start_date' => 'required|date',
            'rental_end_date'   => 'required|date|after:rental_start_date',
            'total_cost'        => 'required|numeric|min:0',
            'notes'             => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $rental->update([
                'equipment_name'    => $validated['equipment_name'],
                'equipment_id'      => $validated['equipment_id'] ?? null,
                'supplier_id'       => $validated['supplier_id'] ?? null,
                'rental_start_date' => $validated['rental_start_date'],
                'rental_end_date'   => $validated['rental_end_date'],
                'total_cost'        => $validated['total_cost'],
                'notes'             => $validated['notes'] ?? null,
            ]);

            // Update linked cost entry if exists
            if ($rental->cost_id) {
                $costGroup = \App\Models\CostGroup::where('code', 'equipment')
                    ->orWhere('name', 'like', '%thiết bị%')
                    ->where('is_active', true)
                    ->first();

                $supplierName = '';
                if ($rental->supplier_id) {
                    $supplier = \App\Models\Supplier::find($rental->supplier_id);
                    $supplierName = $supplier->name ?? '';
                }

                Cost::where('id', $rental->cost_id)->update([
                    'cost_group_id' => $costGroup ? $costGroup->id : null,
                    'supplier_id'   => $rental->supplier_id,
                    'name'          => "Thuê thiết bị: " . $rental->equipment_name . ($supplierName ? " - {$supplierName}" : ""),
                    'amount'        => $rental->total_cost,
                    'description'   => "Từ phiếu thuê thiết bị #{$rental->id}. " . ($rental->notes ?? ""),
                    'cost_date'     => $rental->rental_start_date,
                ]);
            }

            // Handle file uploads (append)
            $this->attachFilesToEntity($request, $rental, "equipment-rentals/{$project->id}/{$rental->id}", true);

            DB::commit();
            return back()->with('success', 'Đã cập nhật phiếu thuê thiết bị.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function storeEquipmentRental(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_CREATE, $project);

        $validated = $request->validate([
            'equipment_name'    => 'required|string|max:255',
            'equipment_id'      => 'nullable|exists:equipment,id',
            'supplier_id'       => 'nullable|exists:suppliers,id',
            'rental_start_date' => 'required|date',
            'rental_end_date'   => 'required|date|after:rental_start_date',
            'total_cost'        => 'required|numeric|min:0',
            'notes'             => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $rental = \App\Models\EquipmentRental::create([
                'project_id'        => $project->id,
                'equipment_name'    => $validated['equipment_name'],
                'equipment_id'      => $validated['equipment_id'] ?? null,
                'supplier_id'       => $validated['supplier_id'] ?? null,
                'rental_start_date' => $validated['rental_start_date'],
                'rental_end_date'   => $validated['rental_end_date'],
                'total_cost'        => $validated['total_cost'],
                'notes'             => $validated['notes'] ?? null,
                'status'            => 'draft',
                'created_by'        => $user->id,
            ]);

            // Auto-create cost entry (draft)
            $costGroup = \App\Models\CostGroup::where('code', 'equipment')
                ->orWhere('name', 'like', '%thiết bị%')
                ->where('is_active', true)
                ->first();

            $supplierName = '';
            if ($rental->supplier_id) {
                $supplier = \App\Models\Supplier::find($rental->supplier_id);
                $supplierName = $supplier->name ?? '';
            }

            $cost = Cost::create([
                'project_id'    => $project->id,
                'cost_group_id' => $costGroup ? $costGroup->id : null,
                'category'      => 'equipment',
                'supplier_id'   => $rental->supplier_id,
                'name'          => "Thuê thiết bị: " . $rental->equipment_name . ($supplierName ? " - {$supplierName}" : ""),
                'amount'        => $rental->total_cost,
                'description'   => "Từ phiếu thuê thiết bị #{$rental->id}. " . ($rental->notes ?? ""),
                'cost_date'     => $rental->rental_start_date,
                'status'        => 'draft',
                'created_by'    => $user->id,
            ]);

            $rental->update(['cost_id' => $cost->id]);

            // Handle file uploads
            $this->attachFilesToEntity($request, $rental, "equipment-rentals/{$project->id}/{$rental->id}", true);

            DB::commit();
            return back()->with('success', 'Đã tạo phiếu thuê thiết bị.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function submitEquipmentRental(string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_CREATE, $project);

        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);
        if (!in_array($rental->status, ['draft', 'rejected'])) {
            return back()->with('error', 'Chỉ gửi duyệt phiếu ở trạng thái Nháp hoặc Từ chối.');
        }

        $rental->update(['status' => 'pending_management', 'rejection_reason' => null]);
        return back()->with('success', 'Đã gửi phiếu thuê để BĐH duyệt.');
    }

    public function approveRentalManagement(string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_MANAGEMENT, $project);

        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);
        if ($rental->status !== 'pending_management') {
            return back()->with('error', 'Phiếu không ở trạng thái chờ BĐH duyệt.');
        }

        $rental->update([
            'status'      => 'pending_accountant',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);
        return back()->with('success', 'BĐH đã duyệt. Chuyển sang Kế toán.');
    }

    public function confirmRentalAccountant(string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);
        if ($rental->status !== 'pending_accountant') {
            return back()->with('error', 'Phiếu không ở trạng thái chờ Kế toán.');
        }

        $rental->update([
            'status'       => 'in_use',
            'confirmed_by' => $user->id,
            'confirmed_at' => now(),
        ]);
        return back()->with('success', 'Kế toán đã xác nhận. Thiết bị chuyển sang Đang sử dụng.');
    }

    public function rejectEquipmentRental(Request $request, string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_REJECT, $project);

        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);
        if (!in_array($rental->status, ['pending_management', 'pending_accountant'])) {
            return back()->with('error', 'Phiếu không ở trạng thái chờ duyệt.');
        }

        $validated = $request->validate(['reason' => 'required|string|max:500']);

        $rental->update([
            'status'           => 'rejected',
            'rejection_reason' => $validated['reason'],
            'approved_by'      => $user->id,
            'approved_at'      => now(),
        ]);
        return back()->with('success', 'Đã từ chối phiếu thuê.');
    }

    // ─── Rental: Người lập đánh dấu đã trả (in_use → pending_return) ───
    public function requestReturnRental(string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);

        if ($rental->status !== 'in_use') {
            return back()->with('error', 'Phiếu thuê không ở trạng thái đang sử dụng.');
        }

        $rental->update(['status' => 'pending_return']);
        return back()->with('success', 'Đã gửi yêu cầu trả thiết bị thuê.');
    }

    // ─── Rental: KT xác nhận trả (pending_return → returned) ───
    public function confirmReturnRental(string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);

        if ($rental->status !== 'pending_return') {
            return back()->with('error', 'Phiếu thuê không ở trạng thái chờ xác nhận trả.');
        }

        $rental->update([
            'status' => 'returned',
        ]);
        return back()->with('success', 'Đã xác nhận trả thiết bị thuê.');
    }

    public function destroyEquipmentRental(string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_DELETE, $project);

        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);
        if ($rental->status !== 'draft' && !($user instanceof \App\Models\Admin)) {
            return back()->with('error', 'Chỉ có thể xóa phiếu ở trạng thái Nháp.');
        }

        // Delete linked cost if exists
        if ($rental->cost_id) {
            Cost::where('id', $rental->cost_id)->delete();
        }

        $rental->delete();
        return back()->with('success', 'Đã xóa phiếu thuê.');
    }

    // ============================================
    // PROJECT EQUIPMENT PURCHASE — Mua thiết bị (Giống APP)
    // ============================================

    public function updateEquipmentPurchase(Request $request, string $projectId, string $purchaseId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_UPDATE, $project);

        $purchase = \App\Models\EquipmentPurchase::where('project_id', $project->id)->findOrFail($purchaseId);
        if (!in_array($purchase->status, ['draft', 'rejected'])) {
            return back()->with('error', 'Chỉ có thể sửa phiếu ở trạng thái Nháp hoặc Từ chối.');
        }

        $validated = $request->validate([
            'notes'              => 'nullable|string',
            'items'              => 'required|array|min:1',
            'items.*.name'       => 'required|string|max:255',
            'items.*.code'       => 'nullable|string|max:100',
            'items.*.quantity'   => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        try {
            DB::beginTransaction();

            $purchase->update([
                'notes' => $validated['notes'] ?? null,
            ]);

            // Re-create items
            $purchase->items()->delete();
            foreach ($validated['items'] as $itemData) {
                $purchase->items()->create([
                    'name'       => $itemData['name'],
                    'code'       => $itemData['code'] ?? null,
                    'quantity'   => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                ]);
            }

            $purchase->recalculateTotal();

            // Update linked cost entry if exists by name/category or use a systematic way
            $itemNames = collect($validated['items'])->pluck('name')->implode(', ');
            if (strlen($itemNames) > 100) $itemNames = substr($itemNames, 0, 97) . '...';
            
            Cost::where('project_id', $project->id)
                ->where('category', 'equipment')
                ->where('description', 'like', "Từ phiếu mua thiết bị #{$purchase->id}%")
                ->update([
                    'name'   => "Mua thiết bị: {$itemNames}",
                    'amount' => $purchase->total_amount,
                    'description' => "Từ phiếu mua thiết bị #{$purchase->id}. " . ($purchase->notes ?? ""),
                ]);

            // Handle file uploads (append)
            $this->attachFilesToEntity($request, $purchase, "equipment-purchases/{$project->id}/{$purchase->id}", true);

            DB::commit();
            return back()->with('success', 'Đã cập nhật phiếu mua thiết bị.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function storeEquipmentPurchase(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_CREATE, $project);

        $validated = $request->validate([
            'notes'              => 'nullable|string',
            'items'              => 'required|array|min:1',
            'items.*.name'       => 'required|string|max:255',
            'items.*.code'       => 'nullable|string|max:100',
            'items.*.quantity'   => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        try {
            DB::beginTransaction();

            $purchase = \App\Models\EquipmentPurchase::create([
                'project_id'   => $project->id,
                'notes'        => $validated['notes'] ?? null,
                'status'       => 'draft',
                'total_amount' => 0,
                'created_by'   => $user->id,
            ]);

            foreach ($validated['items'] as $itemData) {
                $purchase->items()->create([
                    'name'       => $itemData['name'],
                    'code'       => $itemData['code'] ?? null,
                    'quantity'   => $itemData['quantity'],
                    'unit_price' => $itemData['unit_price'],
                ]);
            }

            $purchase->recalculateTotal();

            // Auto-create cost entry
            $costGroup = \App\Models\CostGroup::where('code', 'equipment')
                ->orWhere('name', 'like', '%thiết bị%')
                ->where('is_active', true)
                ->first();

            $itemNames = collect($validated['items'])->pluck('name')->implode(', ');
            if (strlen($itemNames) > 100) $itemNames = substr($itemNames, 0, 97) . '...';

            Cost::create([
                'project_id'    => $project->id,
                'cost_group_id' => $costGroup ? $costGroup->id : null,
                'category'      => 'equipment',
                'name'          => "Mua thiết bị: {$itemNames}",
                'amount'        => $purchase->total_amount,
                'description'   => "Từ phiếu mua thiết bị #{$purchase->id}. " . ($purchase->notes ?? ""),
                'cost_date'     => now()->toDateString(),
                'status'        => 'draft',
                'created_by'    => $user->id,
            ]);

            // Handle file uploads
            $this->attachFilesToEntity($request, $purchase, "equipment-purchases/{$project->id}/{$purchase->id}", true);

            DB::commit();
            return back()->with('success', 'Đã tạo phiếu mua thiết bị.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function submitEquipmentPurchase(string $projectId, string $purchaseId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_CREATE, $project);

        $purchase = \App\Models\EquipmentPurchase::where('project_id', $project->id)->findOrFail($purchaseId);
        if (!in_array($purchase->status, ['draft', 'rejected'])) {
            return back()->with('error', 'Chỉ gửi duyệt phiếu ở trạng thái Nháp hoặc Từ chối.');
        }

        $purchase->update(['status' => 'pending_management', 'rejection_reason' => null]);
        return back()->with('success', 'Đã gửi phiếu mua để BĐH duyệt.');
    }

    public function approvePurchaseManagement(string $projectId, string $purchaseId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_MANAGEMENT, $project);

        $purchase = \App\Models\EquipmentPurchase::where('project_id', $project->id)->findOrFail($purchaseId);
        if ($purchase->status !== 'pending_management') {
            return back()->with('error', 'Phiếu không ở trạng thái chờ BĐH duyệt.');
        }

        $purchase->update([
            'status'      => 'pending_accountant',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);
        return back()->with('success', 'BĐH đã duyệt. Chuyển sang Kế toán.');
    }

    public function confirmPurchaseAccountant(string $projectId, string $purchaseId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $purchase = \App\Models\EquipmentPurchase::where('project_id', $project->id)
            ->with('items')
            ->findOrFail($purchaseId);
        if ($purchase->status !== 'pending_accountant') {
            return back()->with('error', 'Phiếu không ở trạng thái chờ Kế toán.');
        }

        try {
            DB::beginTransaction();

            $purchase->update([
                'status'       => 'completed',
                'confirmed_by' => $user->id,
                'confirmed_at' => now(),
            ]);

            // Auto-create equipment records in inventory
            foreach ($purchase->items as $item) {
                \App\Models\Equipment::create([
                    'name'            => $item->name,
                    'code'            => $item->code ?? ('EP-' . strtoupper(\Illuminate\Support\Str::random(6))),
                    'category'        => 'purchased',
                    'quantity'        => $item->quantity,
                    'purchase_price'  => $item->unit_price * $item->quantity,
                    'current_value'   => $item->unit_price * $item->quantity,
                    'status'          => 'available',
                    'notes'           => "Nhập từ phiếu mua #{$purchase->id} - DA: {$project->name}",
                    'project_id'      => $project->id,
                    'purchase_date'   => now()->toDateString(),
                ]);
            }

            DB::commit();
            return back()->with('success', 'Kế toán xác nhận. Thiết bị đã nhập kho.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function rejectEquipmentPurchase(Request $request, string $projectId, string $purchaseId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_REJECT, $project);

        $purchase = \App\Models\EquipmentPurchase::where('project_id', $project->id)->findOrFail($purchaseId);
        if (!in_array($purchase->status, ['pending_management', 'pending_accountant'])) {
            return back()->with('error', 'Phiếu không ở trạng thái chờ duyệt.');
        }

        $validated = $request->validate(['reason' => 'required|string|max:500']);

        $purchase->update([
            'status'           => 'rejected',
            'rejection_reason' => $validated['reason'],
            'approved_by'      => $user->id,
            'approved_at'      => now(),
        ]);
        return back()->with('success', 'Đã từ chối phiếu mua.');
    }

    public function destroyEquipmentPurchase(string $projectId, string $purchaseId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_DELETE, $project);

        $purchase = \App\Models\EquipmentPurchase::where('project_id', $project->id)->findOrFail($purchaseId);
        if ($purchase->status !== 'draft' && !($user instanceof \App\Models\Admin)) {
            return back()->with('error', 'Chỉ có thể xóa phiếu ở trạng thái Nháp.');
        }

        $purchase->items()->delete();
        $purchase->delete();
        return back()->with('success', 'Đã xóa phiếu mua.');
    }

    // ============================================
    // PROJECT ASSET USAGE — Sử dụng thiết bị kho (Giống APP)
    // ============================================

    public function updateAssetUsage(Request $request, string $projectId, string $usageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_UPDATE, $project);

        $usage = \App\Models\AssetUsage::where('project_id', $project->id)->findOrFail($usageId);
        if ($usage->status !== 'pending_receive') {
            return back()->with('error', 'Chỉ có thể sửa phiếu mượn khi người nhận chưa xác nhận.');
        }

        $validated = $request->validate([
            'equipment_id' => 'required|exists:equipment,id',
            'quantity'     => 'required|integer|min:1',
            'receiver_id'  => 'required|exists:users,id',
            'received_date' => 'required|date',
            'notes'        => 'nullable|string',
        ]);

        $asset = \App\Models\Equipment::findOrFail($validated['equipment_id']);
        if ($asset->status === 'retired') {
            return back()->with('error', 'Thiết bị không còn trong kho.');
        }

        $usage->update([
            'equipment_id'  => $validated['equipment_id'],
            'quantity'      => $validated['quantity'],
            'receiver_id'   => $validated['receiver_id'],
            'received_date' => $validated['received_date'],
            'notes'         => $validated['notes'] ?? null,
        ]);

        // Handle file uploads (append)
        $this->attachFilesToEntity($request, $usage, "asset-usages/{$project->id}/{$usage->id}", true);

        return back()->with('success', 'Đã cập nhật phiếu mượn thiết bị.');
    }

    public function storeAssetUsage(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_CREATE, $project);

        $validated = $request->validate([
            'equipment_id' => 'required|exists:equipment,id',
            'quantity'     => 'required|integer|min:1',
            'receiver_id'  => 'required|exists:users,id',
            'received_date' => 'required|date',
            'notes'        => 'nullable|string',
        ]);

        $asset = \App\Models\Equipment::findOrFail($validated['equipment_id']);
        if ($asset->status === 'retired') {
            return back()->with('error', 'Thiết bị không còn trong kho.');
        }

        $usage = \App\Models\AssetUsage::create([
            'project_id'    => $project->id,
            'equipment_id'  => $validated['equipment_id'],
            'quantity'      => $validated['quantity'],
            'receiver_id'   => $validated['receiver_id'],
            'received_date' => $validated['received_date'],
            'notes'         => $validated['notes'] ?? null,
            'status'        => 'draft',
            'created_by'    => $user->id,
        ]);

        // Handle file uploads
        $this->attachFilesToEntity($request, $usage, "asset-usages/{$project->id}/{$usage->id}", true);

        return back()->with('success', 'Đã tạo phiếu sử dụng thiết bị.');
    }

    // ─── Asset Usage: Gửi duyệt (draft/rejected → pending_management) ───
    public function submitAssetUsage(string $projectId, string $usageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_UPDATE, $project);

        $usage = \App\Models\AssetUsage::where('project_id', $project->id)->findOrFail($usageId);

        if (!in_array($usage->status, ['draft', 'rejected'])) {
            return back()->with('error', 'Chỉ gửi duyệt được phiếu ở trạng thái Nháp hoặc Từ chối.');
        }

        $usage->update([
            'status'           => 'pending_management',
            'rejection_reason' => null,
        ]);

        return back()->with('success', 'Đã gửi phiếu để BĐH duyệt.');
    }

    // ─── Asset Usage: BĐH duyệt (pending_management → pending_accountant) ───
    public function approveAssetUsageManagement(string $projectId, string $usageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_MANAGEMENT, $project);

        $usage = \App\Models\AssetUsage::where('project_id', $project->id)->findOrFail($usageId);

        if ($usage->status !== 'pending_management') {
            return back()->with('error', 'Phiếu không ở trạng thái chờ BĐH duyệt.');
        }

        $usage->update([
            'status'      => 'pending_accountant',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        return back()->with('success', 'BĐH đã duyệt. Chuyển sang Kế toán xác nhận.');
    }

    // ─── Asset Usage: KT xác nhận (pending_accountant → in_use) ───
    public function confirmAssetUsageAccountant(string $projectId, string $usageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $usage = \App\Models\AssetUsage::where('project_id', $project->id)->findOrFail($usageId);

        if ($usage->status !== 'pending_accountant') {
            return back()->with('error', 'Phiếu không ở trạng thái chờ Kế toán.');
        }

        try {
            DB::beginTransaction();

            $usage->update([
                'status'        => 'in_use',
                'confirmed_by'  => $user->id,
                'confirmed_at'  => now(),
                'received_date' => now()->toDateString(),
            ]);

            // Cập nhật trạng thái thiết bị
            $asset = $usage->asset;
            if ($asset) {
                $asset->update([
                    'status' => 'in_use',
                ]);
            }

            DB::commit();
            return back()->with('success', 'KT đã xác nhận. Thiết bị chuyển sang Đang sử dụng.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    // ─── Asset Usage: Từ chối ───
    public function rejectAssetUsage(Request $request, string $projectId, string $usageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $usage = \App\Models\AssetUsage::where('project_id', $project->id)->findOrFail($usageId);

        if (!in_array($usage->status, ['pending_management', 'pending_accountant'])) {
            return back()->with('error', 'Phiếu không ở trạng thái chờ duyệt.');
        }

        $request->validate(['rejection_reason' => 'required|string']);

        $usage->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->rejection_reason,
        ]);

        return back()->with('success', 'Đã từ chối phiếu sử dụng thiết bị.');
    }

    // ─── Asset Usage: Yêu cầu trả (in_use → pending_return) ───
    public function requestReturnAsset(string $projectId, string $usageId)
    {
        $project = Project::findOrFail($projectId);
        $usage = \App\Models\AssetUsage::where('project_id', $project->id)->findOrFail($usageId);

        if ($usage->status !== 'in_use') {
            return back()->with('error', 'Phiếu không ở trạng thái đang sử dụng.');
        }

        $usage->update(['status' => 'pending_return']);
        return back()->with('success', 'Đã gửi yêu cầu trả thiết bị.');
    }

    // ─── Asset Usage: Xác nhận trả (pending_return → returned) — KT only ───
    public function confirmReturnAsset(string $projectId, string $usageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $usage = \App\Models\AssetUsage::where('project_id', $project->id)->findOrFail($usageId);
        if ($usage->status !== 'pending_return') {
            return back()->with('error', 'Phiếu không ở trạng thái chờ xác nhận trả.');
        }

        try {
            DB::beginTransaction();

            $usage->update([
                'status'        => 'returned',
                'returned_date' => now()->toDateString(),
            ]);

            $asset = $usage->asset;
            if ($asset) {
                $asset->update(['status' => 'available']);
            }

            DB::commit();
            return back()->with('success', 'Đã xác nhận trả thiết bị. Thiết bị đã về kho.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    // ─── Asset Usage: Xóa (draft/rejected) ───
    public function destroyAssetUsage(string $projectId, string $usageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_DELETE, $project);

        $usage = \App\Models\AssetUsage::where('project_id', $project->id)->findOrFail($usageId);
        if (!in_array($usage->status, ['draft', 'rejected'])) {
            return back()->with('error', 'Chỉ có thể xóa phiếu ở trạng thái Nháp hoặc Từ chối.');
        }

        $usage->delete();
        return back()->with('success', 'Đã xóa phiếu sử dụng thiết bị.');
    }
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

        $oldStatus = $item->workflow_status;
        $updateData = [
            'workflow_status' => 'submitted',
            'submitted_by' => $user->id,
            'submitted_at' => now(),
        ];
        // BUSINESS RULE: Clear rejection on resubmit (matching APP)
        if ($oldStatus === 'rejected') {
            $updateData['rejection_reason'] = null;
            $updateData['rejected_by'] = null;
            $updateData['rejected_at'] = null;
        }
        $item->update($updateData);

        // Send notification to supervisor
        $stage->notifyEvent('submitted', auth('admin')->user());

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

        // BUSINESS RULE: Block if open defects exist (matching APP)
        // Check by BOTH task_id (task-linked defects) AND acceptance_stage_id (auto-created from rejection)
        $openDefectsQuery = Defect::where('project_id', $project->id)
            ->whereIn('status', ['open', 'in_progress'])
            ->where(function ($q) use ($item, $stage) {
                if ($item->task_id) {
                    $q->where('task_id', $item->task_id);
                }
                $q->orWhere('acceptance_stage_id', $stage->id);
            });
        $openDefects = $openDefectsQuery->count();
        if ($openDefects > 0) {
            return back()->with('error', "Không thể duyệt vì còn {$openDefects} lỗi chưa được xử lý xong.");
        }

        $item->update([
            'workflow_status' => 'supervisor_approved',
            'supervisor_approved_by' => $user->id,
            'supervisor_approved_at' => now(),
        ]);

        $stage->notifyEvent('supervisor_approved', $user);

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

        // BUSINESS RULE: Block if open defects exist (matching APP)
        // Check by BOTH task_id AND acceptance_stage_id
        $openDefectsQuery = Defect::where('project_id', $project->id)
            ->whereIn('status', ['open', 'in_progress'])
            ->where(function ($q) use ($item, $stage) {
                if ($item->task_id) {
                    $q->where('task_id', $item->task_id);
                }
                $q->orWhere('acceptance_stage_id', $stage->id);
            });
        $openDefects = $openDefectsQuery->count();
        if ($openDefects > 0) {
            return back()->with('error', "Không thể duyệt vì còn {$openDefects} lỗi chưa được xử lý xong.");
        }

        // BUSINESS RULE: Check task progress 100% (matching APP)
        $stageItems = AcceptanceItem::where('acceptance_stage_id', $stage->id)
            ->whereNotNull('task_id')->with('task')->get();
        $incompleteTasks = [];
        foreach ($stageItems as $si) {
            if ($si->task && $si->task->progress_percentage < 100) {
                $incompleteTasks[] = $si->task->name ?? "Hạng mục #{$si->id}";
            }
        }
        if (count($incompleteTasks) > 0) {
            return back()->with('error', 'Không thể duyệt. Chưa hoàn thành 100%: ' . implode(', ', $incompleteTasks));
        }

        $item->update([
            'workflow_status' => 'project_manager_approved', // FIXED: was 'pm_approved', must match APP
            'project_manager_approved_by' => $user->id,
            'project_manager_approved_at' => now(),
        ]);

        $stage->notifyEvent('pm_approved', $user);

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

        if (!in_array($item->workflow_status, ['pm_approved', 'project_manager_approved'])) {
            return back()->with('error', 'Hạng mục cần được PM duyệt trước.');
        }

        // BUSINESS RULE: Block if open defects exist (matching APP)
        // Check by BOTH task_id AND acceptance_stage_id
        $openDefectsQuery = Defect::where('project_id', $project->id)
            ->whereIn('status', ['open', 'in_progress'])
            ->where(function ($q) use ($item, $stage) {
                if ($item->task_id) {
                    $q->where('task_id', $item->task_id);
                }
                $q->orWhere('acceptance_stage_id', $stage->id);
            });
        $openDefects = $openDefectsQuery->count();
        if ($openDefects > 0) {
            return back()->with('error', "Không thể duyệt vì còn {$openDefects} lỗi chưa được xử lý xong.");
        }

        // BUSINESS RULE: Check task progress 100% (matching APP)
        $stageItems = AcceptanceItem::where('acceptance_stage_id', $stage->id)
            ->whereNotNull('task_id')->with('task')->get();
        $incompleteTasks = [];
        foreach ($stageItems as $si) {
            if ($si->task && $si->task->progress_percentage < 100) {
                $incompleteTasks[] = $si->task->name ?? "Hạng mục #{$si->id}";
            }
        }
        if (count($incompleteTasks) > 0) {
            return back()->with('error', 'Không thể duyệt. Chưa hoàn thành 100%: ' . implode(', ', $incompleteTasks));
        }

        $item->update([
            'workflow_status' => 'customer_approved',
            'customer_approved_by' => $user->id,
            'customer_approved_at' => now(),
            'acceptance_status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        // BUSINESS RULE: Update project progress (matching APP)
        $item->updateProjectProgress();

        // BUSINESS RULE: Check stage completion (matching APP)
        $stage->checkCompletion();

        $stage->notifyEvent('customer_approved', $user);

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

        if (!in_array($item->workflow_status, ['submitted', 'supervisor_approved', 'pm_approved', 'project_manager_approved'])) {
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

        // BUSINESS RULE: Auto-create defect on reject (matching APP)
        $item->autoCreateDefectOnReject(null, $validated['rejection_reason']);

        $stage->notifyEvent('rejected', $user, ['reason' => $validated['rejection_reason']]);

        return back()->with('success', 'Đã từ chối hạng mục nghiệm thu. Lỗi ghi nhận đã được tự động tạo.');
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

            // Handle file uploads - OPTIONAL for material bills
            $this->attachFilesToEntity($request, $bill, "material-bills/{$project->id}/{$bill->id}", false);

            // Create linked Cost record immediately (draft) so it shows in Chi phí tab
            $supplierName = '';
            if ($validated['supplier_id'] ?? null) {
                $supplierName = \App\Models\Supplier::find($validated['supplier_id'])->name ?? '';
            }
            \App\Models\Cost::create([
                'project_id' => $project->id,
                'cost_group_id' => $validated['cost_group_id'] ?? null,
                'supplier_id' => $validated['supplier_id'] ?? null,
                'category' => 'construction_materials',
                'material_bill_id' => $bill->id,
                'name' => "Phiếu vật liệu #{$billNumber}" . ($supplierName ? " - {$supplierName}" : ''),
                'amount' => $totalAmount,
                'description' => $validated['notes'] ?? "Từ phiếu vật tư {$billNumber}",
                'cost_date' => $validated['bill_date'],
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

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

        if (!in_array($bill->status, ['draft', 'rejected'])) {
            return back()->with('error', 'Chỉ sửa được phiếu ở trạng thái nháp hoặc từ chối.');
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
                'status' => 'draft', // Reset to draft on update
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

        if (!in_array($bill->status, ['draft', 'rejected'])) {
            return back()->with('error', 'Chỉ xóa được phiếu ở trạng thái nháp hoặc từ chối.');
        }

        $bill->items()->delete();
        $bill->delete();

        return back()->with('success', 'Đã xóa phiếu vật tư.');
    }

    public function submitMaterialBill(string $projectId, string $billId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_UPDATE, $project);

        $bill = MaterialBill::where('project_id', $project->id)->findOrFail($billId);

        if (!in_array($bill->status, ['draft', 'rejected'])) {
            return back()->with('error', 'Chỉ gửi được phiếu ở trạng thái nháp hoặc từ chối.');
        }

        $bill->submitForManagementApproval();

        $bill->notifyEvent('submitted', auth('admin')->user());

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

        // Use model method
        $bill->approveByManagement((object) ['id' => $user->id ?? null]);
        $bill->update(['management_approved_at' => now()]);

        $bill->notifyEvent('approved_management', $user);

        return back()->with('success', 'Đã duyệt phiếu vật tư (BĐH).');
    }

    public function approveMaterialBillAccountant(string $projectId, string $billId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $bill = MaterialBill::with(['items.material', 'supplier'])
            ->where('project_id', $project->id)->findOrFail($billId);

        if ($bill->status !== 'pending_accountant') {
            return back()->with('error', 'Phiếu không ở trạng thái chờ KT xác nhận.');
        }

        try {
            DB::beginTransaction();

            // 1. Update bill status
            $bill->approveByAccountant((object) ['id' => $user->id ?? null]);

            // 2. Tự động đồng bộ sang Cost và kích hoạt side effects (Kho, Công nợ) 
            // đã được xử lý thông qua Model hook saved trong Cost và sync logic
            $bill->triggerApprovalSideEffects();

            DB::commit();

            $bill->notifyEvent('approved_accountant', $user);

            return back()->with('success', 'Đã xác nhận phiếu vật tư. Dữ liệu đã đẩy qua Chi phí dự án.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    /**
     * Retroactively sync Cost records for approved MaterialBills that were approved
     * before the Cost-creation logic was implemented.
     */
    public function syncMaterialBillCosts(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        // Get ALL bills for this project (not just approved)
        $bills = MaterialBill::with(['items.material', 'supplier'])
            ->where('project_id', $project->id)
            ->get();

        $synced = 0;

        // Map bill status to cost status
        $statusMap = [
            'draft' => 'draft',
            'pending_management' => 'pending_management_approval',
            'pending_accountant' => 'pending_accountant_approval',
            'approved' => 'approved',
            'rejected' => 'rejected',
        ];

        foreach ($bills as $bill) {
            // Check if a Cost record already exists for this bill
            $existingCost = \App\Models\Cost::where('project_id', $project->id)
                ->where('category', 'construction_materials')
                ->where('name', 'LIKE', "%#{$bill->bill_number}%")
                ->first();

            if ($existingCost) {
                // Update status if out of sync
                $expectedStatus = $statusMap[$bill->status] ?? 'draft';
                if ($existingCost->status !== $expectedStatus) {
                    $existingCost->update(['status' => $expectedStatus]);
                    $synced++;
                }
                continue;
            }

            try {
                DB::beginTransaction();

                $costStatus = $statusMap[$bill->status] ?? 'draft';

                $cost = \App\Models\Cost::create([
                    'project_id' => $project->id,
                    'cost_group_id' => $bill->cost_group_id,
                    'supplier_id' => $bill->supplier_id,
                    'category' => 'construction_materials',
                    'name' => "Phiếu vật liệu #" . ($bill->bill_number ?? $bill->id) . " - " . ($bill->supplier->name ?? ""),
                    'amount' => $bill->total_amount,
                    'description' => $bill->notes ?? "Đồng bộ từ phiếu vật tư",
                    'cost_date' => $bill->bill_date,
                    'status' => $costStatus,
                    'created_by' => $bill->created_by,
                    'management_approved_by' => $bill->management_approved_by,
                    'management_approved_at' => $bill->management_approved_at,
                    'accountant_approved_by' => $bill->accountant_approved_by,
                    'accountant_approved_at' => $bill->accountant_approved_at,
                ]);

                // Only create transactions for approved bills
                if ($bill->status === 'approved') {
                    foreach ($bill->items as $item) {
                        \App\Models\MaterialTransaction::create([
                            'material_id' => $item->material_id,
                            'project_id' => $project->id,
                            'cost_id' => $cost->id,
                            'type' => 'in',
                            'quantity' => $item->quantity,
                            'unit_price' => $item->unit_price,
                            'total_amount' => $item->total_price,
                            'supplier_id' => $bill->supplier_id,
                            'reference_number' => $bill->bill_number,
                            'transaction_date' => $bill->bill_date,
                            'notes' => "Đồng bộ từ phiếu vật tư #" . ($bill->bill_number ?? $bill->id),
                            'status' => 'approved',
                            'created_by' => $bill->created_by,
                        ]);
                    }
                }

                DB::commit();
                $synced++;
            } catch (\Exception $e) {
                DB::rollBack();
                \Log::error("Sync material bill cost failed for bill #{$bill->id}: " . $e->getMessage());
            }
        }

        if ($synced > 0) {
            return back()->with('success', "Đã đồng bộ {$synced} phiếu vật tư sang chi phí dự án.");
        }

        return back()->with('info', 'Tất cả phiếu vật tư đã được đồng bộ.');
    }

    /**
     * Helper: Find and update linked Cost record for a MaterialBill
     */
    private function updateLinkedMaterialCost(int $projectId, string $billNumber, string $newStatus, array $extra = []): ?\App\Models\Cost
    {
        $cost = \App\Models\Cost::where('project_id', $projectId)
            ->where('category', 'construction_materials')
            ->where('name', 'LIKE', "%#{$billNumber}%")
            ->first();

        if ($cost) {
            $cost->update(array_merge(['status' => $newStatus], $extra));
        }

        return $cost;
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

        $bill->notifyEvent('rejected', $user, ['reason' => $validated['rejected_reason']]);

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
     * Sync subcontractor total_paid + payment_status after cost approval
     * Replicates Cost model's updateSubcontractorStatus() for Admin context
     */
    private function syncSubcontractorPaymentFromCost(Cost $cost): void
    {
        if (!$cost->subcontractor_id) return;

        $sub = \App\Models\Subcontractor::find($cost->subcontractor_id);
        if (!$sub) return;

        $totalPaid = Cost::where('subcontractor_id', $sub->id)
            ->where('status', 'approved')
            ->sum('amount');

        $sub->total_paid = $totalPaid;
        $sub->payment_status = $totalPaid >= $sub->total_quote
            ? 'completed'
            : ($totalPaid > 0 ? 'partial' : 'pending');

        if (in_array($sub->progress_status, ['not_started', null])) {
            $sub->progress_status = 'in_progress';
        }

        $sub->save();
    }

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

    // ===================================================================
    // CRM PROXY — Attendance, Shifts, Labor Productivity
    // These routes exist in api.php under auth:sanctum for mobile APP.
    // CRM admin users need the same endpoints under auth:admin.
    // ===================================================================

    public function getAttendance(Request $request, string $projectId)
    {
        $request->merge(['project_id' => $projectId]);
        return app(\App\Http\Controllers\Api\AttendanceController::class)->index($request);
    }

    public function storeAttendance(Request $request, string $projectId)
    {
        $request->merge(['project_id' => $projectId]);
        return app(\App\Http\Controllers\Api\AttendanceController::class)->store($request);
    }

    public function approveAttendance(Request $request, string $projectId, string $id)
    {
        // Fake $request->user() for the API controller by merging admin user
        $admin = auth('admin')->user();
        $request->merge(['_admin_approver_id' => $admin->id]);

        $attendance = \App\Models\Attendance::findOrFail($id);
        $attendance->update([
            'approved_by' => $admin->id,
            'approved_at' => now(),
        ]);
        return response()->json(['message' => 'Đã duyệt chấm công', 'data' => $attendance]);
    }

    public function attendanceStatistics(Request $request, string $projectId)
    {
        $request->merge(['project_id' => $projectId]);
        return app(\App\Http\Controllers\Api\AttendanceController::class)->statistics($request);
    }

    public function getShifts(Request $request, string $projectId)
    {
        $request->merge(['project_id' => $projectId]);
        return app(\App\Http\Controllers\Api\AttendanceController::class)->shifts($request);
    }

    public function storeShift(Request $request, string $projectId)
    {
        $request->merge(['project_id' => $projectId]);
        return app(\App\Http\Controllers\Api\AttendanceController::class)->createShift($request);
    }

    public function getLaborProductivity(Request $request, string $projectId)
    {
        return app(\App\Http\Controllers\Api\LaborProductivityController::class)->index($request, $projectId);
    }

    public function storeLaborProductivity(Request $request, string $projectId)
    {
        // LaborProductivityController::store uses $request->user()->id for created_by
        // Under auth:admin, $request->user() is null. We need to handle this.
        $admin = auth('admin')->user();

        $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'task_id' => 'nullable|exists:project_tasks,id',
            'record_date' => 'required|date',
            'work_item' => 'required|string|max:255',
            'unit' => 'required|string|max:20',
            'planned_quantity' => 'required|numeric|min:0',
            'actual_quantity' => 'required|numeric|min:0',
            'workers_count' => 'required|integer|min:1',
            'hours_spent' => 'required|numeric|min:0.5|max:24',
            'note' => 'nullable|string|max:500',
        ]);

        $record = \App\Models\LaborProductivity::create(array_merge(
            $request->all(),
            [
                'project_id' => $projectId,
                'created_by' => $admin->id,
            ]
        ));

        return response()->json([
            'message' => 'Ghi nhận năng suất thành công',
            'data' => $record->load(['user:id,name', 'task:id,name']),
        ], 201);
    }

    public function destroyLaborProductivity(string $projectId, string $id)
    {
        \App\Models\LaborProductivity::where('project_id', $projectId)->findOrFail($id)->delete();
        return response()->json(['message' => 'Đã xóa']);
    }

    public function laborProductivityDashboard(Request $request, string $projectId)
    {
        return app(\App\Http\Controllers\Api\LaborProductivityController::class)->dashboard($request, $projectId);
    }

    // ===================================================================
    // WARRANTY & MAINTENANCE MODULE
    // ===================================================================

    /**
     * Store a new project warranty
     */
    public function storeProjectWarranty(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_CREATE, $project);

        $validated = $request->validate([
            'handover_date' => 'required|date',
            'warranty_content' => 'required|string',
            'warranty_start_date' => 'required|date',
            'warranty_end_date' => 'required|date|after_or_equal:warranty_start_date',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $warranty = \App\Models\ProjectWarranty::create(array_merge($validated, [
                'project_id' => $project->id,
                'status' => \App\Models\ProjectWarranty::STATUS_DRAFT,
                'created_by' => $user->id,
            ]));

            $this->attachFilesToEntity($request, $warranty, "warranties/{$project->id}");

            DB::commit();
            return back()->with('success', 'Đã tạo phiếu bảo hành.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi tạo phiếu bảo hành: ' . $e->getMessage());
        }
    }

    /**
     * Update project warranty
     */
    public function updateProjectWarranty(Request $request, string $projectId, string $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_UPDATE, $project);

        $warranty = \App\Models\ProjectWarranty::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        
        $validated = $request->validate([
            'handover_date' => 'required|date',
            'warranty_content' => 'required|string',
            'warranty_start_date' => 'required|date',
            'warranty_end_date' => 'required|date|after_or_equal:warranty_start_date',
            'notes' => 'nullable|string',
            'status' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $warranty->update($validated);
            $this->attachFilesToEntity($request, $warranty, "warranties/{$project->id}");

            DB::commit();
            return back()->with('success', 'Đã cập nhật phiếu bảo hành.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi cập nhật phiếu bảo hành: ' . $e->getMessage());
        }
    }

    /**
     * Approve project warranty (Khách hàng duyệt)
     */
    public function approveProjectWarranty(Request $request, string $projectId, string $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        // Permission check: normally this would be a customer, but in CRM admin can act on behalf if they have permission
        $this->crmRequire($user, Permissions::WARRANTY_APPROVE, $project);

        $warranty = \App\Models\ProjectWarranty::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        
        $warranty->update([
            'status' => \App\Models\ProjectWarranty::STATUS_APPROVED,
            'approved_by' => $user->id,
        ]);

        return back()->with('success', 'Đã duyệt phiếu bảo hành.');
    }

    /**
     * Reject project warranty
     */
    public function rejectProjectWarranty(Request $request, string $projectId, string $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_APPROVE, $project);

        $warranty = \App\Models\ProjectWarranty::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        
        $warranty->update(['status' => \App\Models\ProjectWarranty::STATUS_REJECTED]);

        return back()->with('success', 'Đã từ chối phiếu bảo hành.');
    }

    /**
     * Delete project warranty
     */
    public function destroyProjectWarranty(string $projectId, string $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_DELETE, $project);

        \App\Models\ProjectWarranty::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail()->delete();

        return back()->with('success', 'Đã xóa phiếu bảo hành.');
    }

    /**
     * Store project maintenance
     */
    public function storeProjectMaintenance(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_CREATE, $project);

        $validated = $request->validate([
            'maintenance_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            // Calculate next maintenance date (6 months later)
            $nextDate = \Carbon\Carbon::parse($validated['maintenance_date'])->addMonths(6);

            $maintenance = \App\Models\ProjectMaintenance::create([
                'project_id' => $project->id,
                'maintenance_date' => $validated['maintenance_date'],
                'next_maintenance_date' => $nextDate,
                'status' => \App\Models\ProjectMaintenance::STATUS_APPROVED,
                'notes' => $validated['notes'] ?? null,
                'created_by' => $user->id,
            ]);

            $this->attachFilesToEntity($request, $maintenance, "maintenances/{$project->id}");

            DB::commit();
            return back()->with('success', 'Đã tạo phiếu bảo trì. Lần bảo trì tiếp theo dự kiến: ' . $nextDate->format('d/m/Y'));
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi khi tạo phiếu bảo trì: ' . $e->getMessage());
        }
    }

    /**
     * Delete project maintenance
     */
    public function destroyProjectMaintenance(string $projectId, string $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_DELETE, $project);

        \App\Models\ProjectMaintenance::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail()->delete();

        return back()->with('success', 'Đã xóa phiếu bảo trì.');
    }
}
