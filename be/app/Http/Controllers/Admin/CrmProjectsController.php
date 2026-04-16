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
use App\Models\ProjectWarranty;
use App\Models\ProjectMaintenance;
use App\Constants\Permissions;
use App\Services\AuthorizationService;
use App\Services\MaterialBillService;
use App\Services\AcceptanceService;
use App\Services\FinancialService;
use App\Services\EquipmentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CrmProjectsController extends Controller
{
    use CrmAuthorization;

    protected $authService;
    protected $materialBillService;
    protected $acceptanceService;
    protected $financialService;
    protected $equipmentService;
    protected $logService;
    protected $budgetService;
    protected $attendanceService;
    protected $productivityService;
    protected $attachmentService;
    protected $warrantyService;
    protected $defectService;
    protected $changeRequestService;
    protected $riskService;
    protected $personnelService;
    protected $taskService;
    protected $reportingService;
    protected $contractService;
    protected $subcontractorService;

    public function __construct(
        AuthorizationService $authService,
        MaterialBillService $materialBillService,
        AcceptanceService $acceptanceService,
        FinancialService $financialService,
        EquipmentService $equipmentService,
        \App\Services\ConstructionLogService $logService,
        \App\Services\ProjectBudgetService $budgetService,
        \App\Services\AttendanceService $attendanceService,
        \App\Services\LaborProductivityService $productivityService,
        \App\Services\AttachmentService $attachmentService,
        \App\Services\ProjectWarrantyService $warrantyService,
        \App\Services\DefectService $defectService,
        \App\Services\ChangeRequestService $changeRequestService,
        \App\Services\ProjectRiskService $riskService,
        \App\Services\ProjectPersonnelService $personnelService,
        \App\Services\ProjectTaskService $taskService,
        \App\Services\ProjectReportingService $reportingService,
        \App\Services\ContractService $contractService,
        \App\Services\SubcontractorService $subcontractorService
    ) {
        $this->authService = $authService;
        $this->materialBillService = $materialBillService;
        $this->acceptanceService = $acceptanceService;
        $this->financialService = $financialService;
        $this->equipmentService = $equipmentService;
        $this->logService = $logService;
        $this->budgetService = $budgetService;
        $this->attendanceService = $attendanceService;
        $this->productivityService = $productivityService;
        $this->attachmentService = $attachmentService;
        $this->warrantyService = $warrantyService;
        $this->defectService = $defectService;
        $this->changeRequestService = $changeRequestService;
        $this->riskService = $riskService;
        $this->personnelService = $personnelService;
        $this->taskService = $taskService;
        $this->reportingService = $reportingService;
        $this->contractService = $contractService;
        $this->subcontractorService = $subcontractorService;
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

        $stats = $this->reportingService->getGlobalProjectStats();

        return Inertia::render('Crm/Projects/Index', [
            'projects' => $projects,
            'stats' => $stats,
            'filters' => $request->only(['search', 'status']),
            'users' => User::employees()->select('id', 'name', 'email', 'phone')->orderBy('name')->get(),
        ]);
    }

    /**
     * Chi tiết dự án — Optimized for performance
     */
    /**
     * Chi tiết dự án — Optimized SOA Architecture
     */
    public function show(string $id)
    {
        // 1. Fetch project with ONLY essential relationships for initial render
        $project = Project::with([
            'customer:id,name,email,image as avatar,phone',
            'projectManager:id,name,image as avatar',
            'supervisor:id,name,image as avatar',
            'progress',
            'phases:id,project_id,name,order',
            'contract.attachments'
        ])->findOrFail($id);

        // 2. Fast Counts for Tab Badges (Very efficient)
        $counts = [
            'tasks' => \App\Models\ProjectTask::where('project_id', $id)->whereNull('deleted_at')->count(),
            'costs' => \App\Models\Cost::where('project_id', $id)
                // ->whereNull('material_bill_id')
                // ->whereNull('subcontractor_payment_id')
                // ->whereNull('equipment_rental_id')
                // ->whereNull('equipment_allocation_id')
                ->count(),
            'payments' => \App\Models\ProjectPayment::where('project_id', $id)->count(),
            'personnel' => \App\Models\ProjectPersonnel::where('project_id', $id)->count(),
            'subcontractors' => \App\Models\Subcontractor::where('project_id', $id)->count(),
            'construction_logs' => \App\Models\ConstructionLog::where('project_id', $id)->count(),
            'acceptance_stages' => \App\Models\AcceptanceStage::where('project_id', $id)->count(),
            'defects' => \App\Models\Defect::where('project_id', $id)->count(),
            'change_requests' => \App\Models\ChangeRequest::where('project_id', $id)->count(),
            'additional_costs' => \App\Models\AdditionalCost::where('project_id', $id)->count(),
            'budgets' => \App\Models\ProjectBudget::where('project_id', $id)->count(),
            'warranties' => \App\Models\ProjectWarranty::where('project_id', $id)->count(),
            'maintenances' => \App\Models\ProjectMaintenance::where('project_id', $id)->count(),
            'invoices' => \App\Models\Invoice::where('project_id', $id)->count(),
            'risks' => \App\Models\ProjectRisk::where('project_id', $id)->count(),
            'material_bills' => \App\Models\MaterialBill::where('project_id', $id)->count(),
            'attachments' => \App\Models\Attachment::where('attachable_id', $id)->where('attachable_type', Project::class)->count(),
            'equipment' => \App\Models\EquipmentRental::where('project_id', $id)->count() + \App\Models\AssetUsage::where('project_id', $id)->count(),
            'comments' => \App\Models\ProjectComment::where('project_id', $id)->count(),
        ];

        // 3. User & Permissions (Required immediately)
        $admin = auth('admin')->user();
        $permissions = ($admin && method_exists($admin, 'isSuperAdmin') && $admin->isSuperAdmin())
            ? array_values(Permissions::all())
            : $this->authService->getProjectPermissions($admin, $project);

        // 4. Shared Global Lists (Optimized without cache)
        $users = User::employees()->select('id', 'name', 'email', 'image as avatar')->orderBy('name')->get();
        $costGroups = class_exists(\App\Models\CostGroup::class) ? \App\Models\CostGroup::where('is_active', true)->orderBy('name')->get(['id', 'name', 'code']) : [];
        $personnelRoles = class_exists(\App\Models\PersonnelRole::class) ? \App\Models\PersonnelRole::orderBy('name')->get(['id', 'name']) : [];
        $materials = class_exists(\App\Models\Material::class) ? \App\Models\Material::select('id', 'name', 'code', 'unit', 'unit_price')->orderBy('name')->get() : [];
        $suppliers = \App\Models\Supplier::select('id', 'name', 'phone', 'email')->orderBy('name')->get();
        $acceptanceTemplates = \App\Models\AcceptanceTemplate::select('id', 'name')->orderBy('name')->get();
        $globalSubcontractors = class_exists(\App\Models\GlobalSubcontractor::class) ? \App\Models\GlobalSubcontractor::select('id', 'name', 'category')->orderBy('name')->get() : [];
        
        return Inertia::render('Crm/Projects/Show', [
            'project'     => $project,
            'contract'    => $project->contract,
            'permissions' => $permissions,
            'users'       => $users,
            'counts'      => $counts,
            'costGroups'  => $costGroups,
            'personnelRoles' => $personnelRoles,
            'materials'   => $materials,
            'suppliers'   => $suppliers,
            'acceptanceTemplates' => $acceptanceTemplates,
            'globalSubcontractors' => $globalSubcontractors,

            // 5. DATA CLOSURES — Loaded on initial load AND available for partial reloads
            'financeData' => [
                'payments' => $project->payments()
                    ->select('id', 'project_id', 'payment_number', 'amount', 'status', 'due_date', 'contract_id', 'notes', 'created_at')
                    ->with('attachments:id,attachable_id,attachable_type,file_name,original_name,file_size,file_url,mime_type')
                    ->orderByDesc('payment_number')->get(),
                'costs' => $project->costs()
                    // ->whereNull('material_bill_id')
                    // ->whereNull('subcontractor_payment_id')
                    // ->whereNull('equipment_rental_id')
                    // ->whereNull('equipment_allocation_id')
                    ->select('id', 'project_id', 'name', 'amount', 'status', 'category', 'attendance_id', 'cost_date', 'created_by', 'management_approved_by', 'accountant_approved_by', 'cost_group_id', 'subcontractor_id', 'supplier_id', 'budget_item_id', 'created_at', 'material_bill_id', 'subcontractor_payment_id', 'equipment_rental_id', 'equipment_allocation_id')
                    ->with(['creator:id,name', 'costGroup:id,name,code', 'subcontractor:id,name', 'attachments:id,attachable_id,attachable_type,file_name,original_name,file_size,file_url,mime_type', 'managementApprover:id,name', 'accountantApprover:id,name'])
                    ->orderByDesc('cost_date')->orderByDesc('created_at')->get(),
                'invoices' => $project->invoices()->select('id', 'project_id', 'invoice_number', 'subtotal', 'total_amount', 'invoice_date', 'description')->get(),
                'budgets' => $project->budgets()->select('id', 'project_id', 'name', 'status', 'total_budget', 'actual_cost', 'budget_date', 'version', 'created_by', 'approved_at', 'created_at')->with(['items', 'creator:id,name'])->get(),
            ],

            'scheduleData' => [
                'allTasks' => \App\Models\ProjectTask::where('project_id', $id)->whereNull('deleted_at')->orderBy('order')
                    ->with([
                        'assignedUser:id,name', 
                        'acceptanceStages:id,task_id,status', 
                        'acceptanceItem:id,task_id,workflow_status',
                        'children.assignedUser:id,name',
                        'children.acceptanceStages:id,task_id,status',
                        'children.acceptanceItem:id,task_id,workflow_status'
                    ])->get(),
                'materialBills' => \App\Models\MaterialBill::where('project_id', $id)->with(['items.material', 'supplier', 'creator', 'attachments'])->get(),
            ],

            'monitorData' => [
                'logs' => $project->constructionLogs()->with(['creator', 'task', 'attachments'])->orderByDesc('log_date')->get(),
                'acceptanceStages' => $project->acceptanceStages()->with(['items.task', 'task', 'acceptanceTemplate', 'defects.attachments', 'attachments'])->get(),
                'defects' => $project->defects()->with('attachments')->get(),
                'additional_costs' => $project->additionalCosts()->with(['proposer', 'attachments'])->latest()->get(),
                'change_requests' => $project->changeRequests()->with(['requester', 'attachments'])->latest()->get(),
            ],

            'teamData' => [
                'personnel' => $project->personnel()->with(['user:id,name,email,image as avatar,phone', 'personnelRole:id,name'])->get(),
                'subcontractors' => $project->subcontractors()->with(['attachments', 'payments.attachments'])->get(),
            ],

            'equipmentData' => fn() => [
                'rentals' => class_exists(\App\Models\EquipmentRental::class) ? \App\Models\EquipmentRental::where('project_id', $project->id)->with(['equipment', 'supplier', 'creator', 'attachments'])->latest()->get() : [],
                'purchases' => class_exists(\App\Models\EquipmentPurchase::class) ? \App\Models\EquipmentPurchase::where('project_id', $project->id)->with(['items', 'creator', 'attachments'])->latest()->get() : [],
                'usages' => class_exists(\App\Models\AssetUsage::class) ? \App\Models\AssetUsage::where('project_id', $project->id)->with(['asset', 'receiver', 'creator', 'attachments'])->latest()->get() : [],
                'allEquipment' => class_exists(\App\Models\Equipment::class) ? \App\Models\Equipment::select('id', 'name', 'code', 'type', 'status')->orderBy('name')->get() : [],
                'companyAssets' => class_exists(\App\Models\CompanyAsset::class) ? \App\Models\CompanyAsset::where('quantity', '>', 0)->select('id', 'name', 'code', 'category', 'unit')->orderBy('name')->get() : [],
            ],
            
            'otherData' => Inertia::lazy(fn() => [
                'comments' => $project->comments()->whereNull('parent_id')->with(['user', 'replies.user'])->latest()->get(),
                'risks' => $project->risks()->with('owner')->get(),
                'warranties' => $project->warranties()->with(['attachments', 'creator'])->get(),
                'maintenances' => $project->maintenances()->with(['attachments', 'creator'])->get(),
                'attachments' => $project->attachments()->latest()->get(),
            ]),
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
        if (!($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) && $cost->status !== 'draft') {
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

            // Handle file deletions via SOA
            $this->attachmentService->handleDeletedRequest($request, $cost);

            // Handle file uploads during update
            $this->attachmentService->handleCrmUpload($request, $cost, "costs/{$project->id}/{$cost->id}", false);

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

        // Draft-only guard (matching APP — allow SuperAdmin override)
        if (!($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) && $cost->status !== 'draft') {
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

        try {
            // Handle file uploads first if any (Web specific)
            if ($request->hasFile('files')) {
                $this->attachFilesToEntity($request, $cost, "costs/{$project->id}/{$cost->id}");
            }

            $this->financialService->submitCost($cost, $user);
            return back()->with('success', 'Đã gửi phiếu chi để duyệt.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function approveCostManagement(string $projectId, string $costId)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $this->crmRequire($admin, Permissions::COST_APPROVE_MANAGEMENT, $project);

        $cost = Cost::where('project_id', $project->id)->findOrFail($costId);
        try {
            $this->financialService->approveCostByManagement($cost, $admin);
            return back()->with('success', 'Đã duyệt phiếu chi (Ban điều hành).');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function approveCostAccountant(Request $request, string $projectId, string $costId)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $this->crmRequire($admin, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $cost = Cost::where('project_id', $project->id)->findOrFail($costId);
        try {
            $this->financialService->approveCostByAccountant($cost, [], $admin);
            return back()->with('success', 'Đã xác nhận phiếu chi (Kế toán).');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function rejectCost(Request $request, string $projectId, string $costId)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $this->crmRequire($admin, Permissions::COST_REJECT, $project);

        $cost = Cost::where('project_id', $project->id)->findOrFail($costId);
        $validated = $request->validate(['rejected_reason' => 'required|string|max:500']);

        try {
            $this->financialService->rejectCost($cost, $validated['rejected_reason'], $admin);
            return back()->with('success', 'Đã từ chối phiếu chi.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
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
            'payment_number' => 'nullable|max:50',
            'contract_id' => 'nullable|exists:contracts,id',
            'notes' => 'nullable|string|max:2000',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'required|date',
            'status' => 'nullable|string',
        ]);

        // Auto-generate payment_number if not provided
        if (empty($validated['payment_number'])) {
            $count = ProjectPayment::where('project_id', $project->id)->count();
            $validated['payment_number'] = $count + 1;
        }

        try {
            // CRM: Default to customer_paid status when manually created by Admin
            $paymentData = array_merge($validated, [
                'project_id' => $project->id,
                'status' => $validated['status'] ?? 'customer_paid',
                'paid_date' => now()->toDateString(),
            ]);

            $payment = $this->financialService->upsertProjectPayment($paymentData, null, $user);

            // Handle file uploads
            $this->attachFilesToEntity($request, $payment, "project-payments/{$project->id}/{$payment->id}", true);

            return back()->with('success', 'Đã thêm đợt thanh toán và gửi cho Kế toán xác nhận.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function destroyPayment(string $projectId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PAYMENT_DELETE, $project);

        $payment = ProjectPayment::where('project_id', $project->id)->findOrFail($paymentId);
        
        try {
            $this->financialService->deleteProjectPayment($payment);
            return back()->with('success', 'Đã xóa thanh toán.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
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

        // Status guard: only edit when pending/overdue (before KH marks as paid)
        if (!($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) && !in_array($payment->status, ['pending', 'overdue'])) {
            return back()->with('error', 'Chỉ có thể chỉnh sửa thanh toán ở trạng thái chờ thanh toán.');
        }

        $validated = $request->validate([
            'amount' => 'sometimes|numeric|min:0',
            'notes' => 'nullable|string|max:2000',
            'due_date' => 'sometimes|date',
        ]);

        try {
            $this->financialService->upsertProjectPayment($validated, $payment, $user);

            // Handle file deletions
            $this->attachmentService->handleDeletedRequest($request, $payment);

            // Handle file uploads during update
            $this->attachFilesToEntity($request, $payment, "project-payments/{$project->id}/{$payment->id}", false);

            return back()->with('success', 'Đã cập nhật thanh toán.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
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
        $validated = $request->validate([
            'paid_date' => 'nullable|date',
        ]);

        try {
            $this->financialService->confirmProjectPayment($payment, $user);
            if (!empty($validated['paid_date'])) {
                $payment->update(['paid_date' => $validated['paid_date']]);
            }
            return back()->with('success', 'Đã xác nhận thanh toán (Kế toán).');
        } catch (\Exception $e) {
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
        
        try {
            $this->financialService->approveProjectPaymentByCustomer($payment, null);
            $payment->notifyEvent('customer_approved', $user);
            return back()->with('success', 'Đã duyệt thanh toán (Khách hàng).');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
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

        try {
            $this->logService->approve($log, ['status' => 'approved'], $user);
            
            $this->notifyFromCrm($project, 'log_approved', "Nhật ký thi công ngày {$log->log_date} đã được duyệt.");
            
            return back()->with('success', 'Đã duyệt nhật ký thi công.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    // ===================================================================
    // FILE ATTACHMENTS — Generic helper + specific endpoints
    // ===================================================================

    /**
     * Helper: Attach uploaded files to any attachable model
     */
    private function attachFilesToEntity(Request $request, $entity, string $storagePath, bool $validate = true): int
    {
        return $this->attachmentService->handleCrmUpload($request, $entity, $storagePath, $validate);
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
            'user_id'            => 'required|exists:users,id',
            'personnel_role_id'  => 'nullable|exists:personnel_roles,id',
            'role_id'            => 'nullable|exists:personnel_roles,id',
            'permissions'        => 'nullable|array',
        ]);

        // Accept either field name from the frontend
        $roleId = $validated['personnel_role_id'] ?? $validated['role_id'] ?? null;

        try {
            $this->personnelService->assign(
                $project,
                $validated['user_id'],
                $roleId,
                $validated['permissions'] ?? null,
                $user
            );
            return back()->with('success', 'Đã phân công nhân sự.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function destroyPersonnel(string $projectId, string $personnelId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PERSONNEL_REMOVE, $project);

        $this->personnelService->removeById((int)$personnelId);
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

        try {
            DB::beginTransaction();
            $log = $this->logService->upsert(array_merge($validated, ['project_id' => $project->id]), null, $user);

            // Handle multi-file upload for CRM
            $this->attachmentService->handleCrmUpload($request, $log, "projects/{$project->id}/logs", false);

            DB::commit();
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

        try {
            DB::beginTransaction();
            $this->logService->upsert(array_merge($validated, ['project_id' => $project->id]), $log, $user);

            // Handle file deletions
            $this->attachmentService->handleDeletedRequest($request, $log);

            // Handle multi-file upload for CRM
            $this->attachmentService->handleCrmUpload($request, $log, "projects/{$project->id}/logs", false);

            DB::commit();
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

        try {
            $this->logService->delete($log);
            return back()->with('success', 'Đã xóa nhật ký.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
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

        try {
            DB::beginTransaction();
            $data = array_merge($validated, ['project_id' => $project->id]);
            $defect = $this->defectService->upsertDefect($data, null, $user);

            // Handle multi-file upload for CRM — tag as 'before' (ảnh lỗi trước khi sửa)
            $request->merge(['description' => 'before']);
            $this->attachmentService->handleCrmUpload($request, $defect, "defects/{$project->id}", false);

            DB::commit();
            return back()->with('success', 'Đã ghi nhận lỗi công trình.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function updateDefect(Request $request, string $projectId, string $defectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_UPDATE, $project);

        $defect = Defect::where('project_id', $project->id)->findOrFail($defectId);

        // Status guard: only edit description/severity when open or rejected
        if (!($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin()) && !in_array($defect->status, ['open', 'rejected']) && !$request->has('status')) {
            return back()->with('error', 'Chỉ có thể chỉnh sửa lỗi ở trạng thái mới tạo hoặc từ chối.');
        }

        $validated = $request->validate([
            'description' => 'sometimes|string',
            'severity' => 'sometimes|in:low,medium,high,critical',
            'status' => 'sometimes|string|in:open,in_progress,fixed,verified',
            'rejection_reason' => 'nullable|string|max:1000',
        ]);

        try {
            DB::beginTransaction();
            if (isset($validated['status'])) {
                $this->defectService->transitionStatus($defect, $validated['status'], $user, $validated);
            }
            $this->defectService->upsertDefect(array_merge($validated, ['project_id' => $project->id]), $defect, $user);
            $this->attachmentService->handleDeletedRequest($request, $defect);
            // Tag new uploads as 'before' (ảnh lỗi — chỉ update khi status=open/rejected)
            $request->merge(['description' => 'before']);
            $this->attachmentService->handleCrmUpload($request, $defect, "defects/{$project->id}", false);

            DB::commit();
            return back()->with('success', 'Đã cập nhật lỗi.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
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

    public function markDefectInProgress(Request $request, string $projectId, string $defectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_UPDATE, $project);

        $defect = Defect::where('project_id', $project->id)->findOrFail($defectId);
        $this->defectService->transitionStatus($defect, 'in_progress', $user, $request->all());

        return back()->with('success', 'Đã nhận xử lý lỗi.');
    }

    public function markDefectFixed(Request $request, string $projectId, string $defectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_UPDATE, $project);

        $defect = Defect::where('project_id', $project->id)->findOrFail($defectId);

        DB::beginTransaction();
        try {
            // Handle file uploads (After images)
            // We use description='after' to distinguish from initial 'before' images
            $request->merge(['description' => 'after']); 
            $this->attachmentService->handleCrmUpload($request, $defect, "defects/{$project->id}/{$defect->id}/after", false);

            $this->defectService->transitionStatus($defect, 'fixed', $user, $request->only(['rectification_details', 'rectification_plan']));

            DB::commit();
            return back()->with('success', 'Đã đánh dấu lỗi đã sửa — kèm hình ảnh minh chứng.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function verifyDefect(Request $request, string $projectId, string $defectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_UPDATE, $project);

        $defect = Defect::where('project_id', $project->id)->findOrFail($defectId);
        $this->defectService->transitionStatus($defect, 'verified', $user);

        return back()->with('success', 'Đã xác nhận lỗi đã sửa xong.');
    }

    public function rejectDefectFix(Request $request, string $projectId, string $defectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::DEFECT_UPDATE, $project);

        $defect = Defect::where('project_id', $project->id)->findOrFail($defectId);
        $this->defectService->transitionStatus($defect, 'in_progress', $user, ['rejection_reason' => $request->input('rejection_reason') ?: $request->input('reason')]);

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

        $this->changeRequestService->upsert(array_merge($validated, ['project_id' => $project->id]), null, $user);

        return back()->with('success', 'Đã tạo yêu cầu thay đổi.');
    }

    public function updateChangeRequest(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::CHANGE_REQUEST_UPDATE, $project);

        $cr = ChangeRequest::where('project_id', $project->id)->findOrFail($id);

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

        $this->changeRequestService->upsert($validated, $cr, $user);

        return back()->with('success', 'Đã cập nhật yêu cầu thay đổi.');
    }

    public function submitChangeRequest(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $cr = ChangeRequest::where('project_id', $project->id)->findOrFail($id);

        try {
            $this->changeRequestService->submit($cr, $user);
            return back()->with('success', 'Đã gửi yêu cầu thay đổi để duyệt.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function approveChangeRequest(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::CHANGE_REQUEST_APPROVE, $project);

        $cr = ChangeRequest::where('project_id', $project->id)->findOrFail($id);
        
        try {
            $this->changeRequestService->approve($cr, $user, $request->input('notes'));
            return back()->with('success', 'Đã duyệt yêu cầu thay đổi.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function rejectChangeRequest(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $cr = ChangeRequest::where('project_id', $project->id)->findOrFail($id);
        
        try {
            $this->changeRequestService->reject($cr, $user, $request->input('reason', 'Không đồng ý'));
            return back()->with('success', 'Đã từ chối yêu cầu thay đổi.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function implementChangeRequest(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $cr = ChangeRequest::where('project_id', $project->id)->findOrFail($id);
        
        try {
            $this->changeRequestService->markAsImplemented($cr);
            return back()->with('success', 'Đã đánh dấu đã triển khai.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
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

        $this->riskService->upsert(array_merge($validated, ['project_id' => $project->id]), null, $user);

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

        $this->riskService->upsert($validated, $risk, $user);

        return back()->with('success', 'Đã cập nhật rủi ro.');
    }

    public function resolveRisk(string $projectId, string $riskId)
    {
        $project = Project::findOrFail($projectId);
        $risk = ProjectRisk::where('project_id', $project->id)->findOrFail($riskId);
        
        $this->riskService->resolve($risk);

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
            'priority' => 'nullable|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        try {
            $this->taskService->upsert(
                array_merge($validated, ['project_id' => $project->id]),
                null,
                $user
            );
            return back()->with('success', 'Đã thêm công việc.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi khi thêm công việc: ' . $e->getMessage());
        }
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
            'priority' => 'nullable|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|exists:users,id',
        ]);

        try {
            $this->taskService->upsert($validated, $task, $user);
            return back()->with('success', 'Đã cập nhật công việc.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi khi cập nhật công việc: ' . $e->getMessage());
        }
    }

    public function destroyTask(string $projectId, string $taskId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::PROJECT_TASK_DELETE, $project);

        $task = ProjectTask::where('project_id', $project->id)->findOrFail($taskId);

        try {
            $this->taskService->delete($task);
            return back()->with('success', 'Đã xóa công việc.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi khi xóa công việc: ' . $e->getMessage());
        }
    }

    // ===================================================================
    // SUB-ITEM CRUD — Contract
    // ===================================================================

    public function storeContract(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::CONTRACT_CREATE, $project);

        $validated = $request->validate([
            'contract_value' => 'required|numeric|min:0',
            'signed_date' => 'nullable|date',
            'status' => 'nullable|string',
        ]);

        try {
            $contract = $this->contractService->upsert(
                array_merge($validated, ['project_id' => $project->id]),
                null,
                $user
            );

            // Handle file uploads
            $this->attachFilesToEntity($request, $contract, "contracts/{$project->id}", true);

            return back()->with('success', 'Đã tạo hợp đồng.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
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

        try {
            $this->contractService->upsert($validated, $contract, $user);

            // Handle file deletions
            $this->attachmentService->handleDeletedRequest($request, $contract);

            // Handle file uploads during update
            $this->attachFilesToEntity($request, $contract, "contracts/{$project->id}", false);

            return back()->with('success', 'Đã cập nhật hợp đồng.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
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
        ]);

        // Pull from global subcontractor if selected
        if (!empty($validated['global_subcontractor_id'])) {
            $gs = GlobalSubcontractor::findOrFail($validated['global_subcontractor_id']);
            $validated['name'] = $gs->name;
            $validated['bank_name'] = $validated['bank_name'] ?? $gs->bank_name;
            $validated['bank_account_number'] = $validated['bank_account_number'] ?? $gs->bank_account_number;
            $validated['bank_account_name'] = $validated['bank_account_name'] ?? $gs->bank_account_name;
        }

        try {
            $subcontractor = $this->subcontractorService->upsert(
                array_merge($validated, ['project_id' => $project->id]),
                null,
                $user
            );

            // Handle file uploads
            $this->attachFilesToEntity($request, $subcontractor, "subcontractors/{$project->id}/{$subcontractor->id}", false);

            return back()->with('success', 'Đã thêm nhà thầu phụ.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
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

        try {
            $this->subcontractorService->upsert($validated, $sub, $user);

            // Handle file deletions
            $this->attachmentService->handleDeletedRequest($request, $sub);

            // Handle file uploads on update
            $this->attachFilesToEntity($request, $sub, "subcontractors/{$project->id}/{$sub->id}", false);

            return back()->with('success', 'Đã cập nhật nhà thầu phụ.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function approveSubcontractor(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $this->crmRequire($admin, Permissions::SUBCONTRACTOR_APPROVE, $project);

        $sub = Subcontractor::where('project_id', $project->id)->findOrFail($id);
        
        try {
            $this->subcontractorService->approve($sub, null); // Pass null as User to match current admin logic
            return back()->with('success', 'Đã duyệt nhà thầu phụ.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function destroySubcontractor(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::SUBCONTRACTOR_DELETE, $project);

        $sub = Subcontractor::where('project_id', $project->id)->findOrFail($id);

        try {
            $this->subcontractorService->delete($sub);
            return back()->with('success', 'Đã xóa nhà thầu phụ.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
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

        try {
            $payment = $this->financialService->upsertSubPayment(
                array_merge($validated, [
                    'project_id' => $project->id,
                    'subcontractor_id' => $sub->id,
                ]),
                null,
                $user
            );

            // Web specific: handle file uploads from request if any
            if ($request->hasFile('files')) {
                $this->attachFilesToEntity($request, $payment, "sub-payments/{$project->id}/{$payment->id}");
            }

            return back()->with('success', 'Đã tạo phiếu thanh toán NTP.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function submitSubPayment(string $projectId, string $subId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $payment = SubcontractorPayment::where('project_id', $project->id)->findOrFail($paymentId);

        try {
            $this->financialService->submitSubPayment($payment, auth('admin')->user());
            return back()->with('success', 'Đã gửi phiếu chi để duyệt.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function approveSubPayment(string $projectId, string $subId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $this->crmRequire($admin, Permissions::COST_APPROVE_MANAGEMENT, $project);
        $payment = SubcontractorPayment::where('project_id', $project->id)->findOrFail($paymentId);

        try {
            $this->financialService->approveSubPayment($payment, $admin);
            return back()->with('success', 'Đã duyệt phiếu thanh toán NTP.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function rejectSubPayment(Request $request, string $projectId, string $subId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $payment = SubcontractorPayment::where('project_id', $project->id)->findOrFail($paymentId);

        try {
            $this->financialService->rejectSubPayment($payment, $request->input('rejection_reason'), $admin);
            return back()->with('success', 'Đã từ chối phiếu thanh toán.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function confirmSubPayment(Request $request, string $projectId, string $subId, string $paymentId)
    {
        $project = Project::findOrFail($projectId);
        $admin = auth('admin')->user();
        $this->crmRequire($admin, Permissions::COST_APPROVE_ACCOUNTANT, $project);
        $payment = SubcontractorPayment::where('project_id', $project->id)->findOrFail($paymentId);

        try {
            $this->financialService->processSubPayment($payment, $request->all(), $admin);
            return back()->with('success', 'Đã xác nhận thanh toán thầu phụ.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
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
            'notes' => 'nullable|string',
            'contract_value' => 'nullable|numeric|min:0',
            'profit_percentage' => 'nullable|numeric|min:0',
            'profit_amount' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.name' => 'required|string|max:255',
            'items.*.estimated_amount' => 'required|numeric|min:0',
            'items.*.cost_group_id' => 'nullable|exists:cost_groups,id',
            'items.*.percentage' => 'nullable|numeric|min:0',
        ]);

        try {
            $this->budgetService->upsert([
                'project_id' => $project->id,
                ...$validated,
            ], null, $user);

            return back()->with('success', 'Đã tạo ngân sách.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function updateBudget(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::BUDGET_UPDATE, $project);

        $budget = ProjectBudget::where('project_id', $project->id)->findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'budget_date' => 'required|date',
            'version' => 'nullable|string|max:20',
            'notes' => 'nullable|string',
            'contract_value' => 'nullable|numeric|min:0',
            'profit_percentage' => 'nullable|numeric|min:0',
            'profit_amount' => 'nullable|numeric|min:0',
            'items' => 'required|array|min:1',
            'items.*.name' => 'required|string|max:255',
            'items.*.estimated_amount' => 'required|numeric|min:0',
            'items.*.cost_group_id' => 'nullable|exists:cost_groups,id',
            'items.*.percentage' => 'nullable|numeric|min:0',
        ]);

        try {
            $this->budgetService->upsert([
                'project_id' => $project->id,
                ...$validated,
            ], $budget, $user);

            return back()->with('success', 'Đã cập nhật ngân sách.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function submitBudget(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::BUDGET_UPDATE, $project);

        $budget = ProjectBudget::where('project_id', $project->id)->findOrFail($id);
        
        if (!in_array($budget->status, ['draft', 'rejected'])) {
            return back()->with('error', 'Chỉ có thể gửi duyệt ngân sách ở trạng thái Nháp hoặc Bị từ chối.');
        }

        $budget->update(['status' => 'pending_approval']);

        return back()->with('success', "Đã gửi duyệt ngân sách \"{$budget->name}\"");
    }

    public function approveBudgetManual(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::BUDGET_APPROVE, $project);

        $budget = ProjectBudget::where('project_id', $project->id)->findOrFail($id);

        try {
            $this->budgetService->approve($budget, $user);
            return back()->with('success', 'Đã duyệt ngân sách.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function rejectBudget(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::BUDGET_APPROVE, $project);

        $budget = ProjectBudget::where('project_id', $project->id)->findOrFail($id);
        
        $request->validate(['rejected_reason' => 'required|string|max:500']);
        
        $budget->update([
            'status' => 'rejected',
            'rejected_reason' => $request->rejected_reason
        ]);

        return back()->with('success', "Đã từ chối ngân sách \"{$budget->name}\"");
    }

    public function activateBudget(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = Auth::guard('admin')->user();
        $this->crmRequire($user, Permissions::BUDGET_APPROVE, $project);

        $budget = ProjectBudget::where('project_id', $project->id)->findOrFail($id);
        
        if ($budget->status !== 'approved') {
            return back()->with('error', 'Chỉ có thể áp dụng ngân sách đã được duyệt.');
        }

        // Lưu trữ các ngân sách đang active khác nếu cần? 
        // Thường chỉ 1 ngân sách active tại 1 thời điểm.
        ProjectBudget::where('project_id', $project->id)
            ->where('status', 'active')
            ->update(['status' => 'archived']);

        $budget->update(['status' => 'active']);

        return back()->with('success', "Đã áp dụng ngân sách \"{$budget->name}\" thành công.");
    }


    public function destroyBudget(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::BUDGET_DELETE, $project);

        $budget = ProjectBudget::where('project_id', $project->id)->findOrFail($id);
        if (in_array($budget->status, ['active', 'archived'])) {
            return back()->with('error', 'Không thể xóa ngân sách đã kích hoạt.');
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

            // Handle file deletions
            $this->attachmentService->handleDeletedRequest($request, $invoice);

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

        DB::beginTransaction();
        try {
            // Auto order logic handled in service or manually
            if (!isset($validated['order'])) {
                $maxOrder = $project->acceptanceStages()->max('order') ?? 0;
                $validated['order'] = $maxOrder + 1;
            }

            $stage = $this->acceptanceService->upsertStage(array_merge($validated, [
                'project_id' => $project->id,
            ]), null, $user);

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
            $this->acceptanceService->upsertStage($validated, $stage, $user);

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

        try {
            // Permission check handled within approveStage using this->hasPermission
            // but we can also crmRequire here for explicit Web-side security
            $permConstant = "ACCEPTANCE_APPROVE_LEVEL_" . $validated['level'];
            $this->crmRequire($admin, constant(Permissions::class . "::" . $permConstant), $project);

            $this->acceptanceService->approveStage($stage, $admin, (int)$validated['level']);
            return back()->with('success', 'Đã duyệt nghiệm thu cấp ' . $validated['level'] . '.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function destroyAcceptance(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_DELETE, $project);

        try {
            $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($id);
            $this->acceptanceService->deleteStage($stage);
            return back()->with('success', 'Đã xóa giai đoạn nghiệm thu.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
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

        try {
            $validated['project_id'] = $project->id;
            $this->equipmentService->upsertAllocation($validated, null, $user);
            return back()->with('success', "Đã phân bổ thiết bị thành công.");
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
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
            $this->equipmentService->upsertRental($validated, $rental, $user);
            
            // Handle file uploads (append)
            $this->attachFilesToEntity($request, $rental, "equipment-rentals/{$project->id}/{$rental->id}", true);

            return back()->with('success', 'Đã cập nhật phiếu thuê thiết bị.');
        } catch (\Exception $e) {
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
            $validated['project_id'] = $project->id;
            $rental = $this->equipmentService->upsertRental($validated, null, $user);

            // Handle file uploads
            $this->attachFilesToEntity($request, $rental, "equipment-rentals/{$project->id}/{$rental->id}", true);

            return back()->with('success', 'Đã tạo phiếu thuê thiết bị.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function submitEquipmentRental(string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_CREATE, $project);

        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);
        
        try {
            $this->equipmentService->submitRental($rental);
            return back()->with('success', 'Đã gửi phiếu thuê để BĐH duyệt.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function approveRentalManagement(string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_MANAGEMENT, $project);

        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);
        
        if ($this->equipmentService->approveRentalByManagement($rental, $user)) {
            return back()->with('success', 'BĐH đã duyệt. Chuyển sang Kế toán.');
        }
        return back()->with('error', 'Thao tác không thành công.');
    }

    public function confirmRentalAccountant(string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);
        
        if ($this->equipmentService->confirmRentalByAccountant($rental, $user)) {
            return back()->with('success', 'Kế toán đã xác nhận. Thiết bị chuyển sang Đang sử dụng.');
        }
        return back()->with('error', 'Thao tác không thành công.');
    }

    public function rejectEquipmentRental(Request $request, string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_REJECT, $project);

        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);
        $validated = $request->validate(['reason' => 'required|string|max:500']);

        if ($this->equipmentService->rejectRental($rental, $validated['reason'], $user)) {
            return back()->with('success', 'Đã từ chối phiếu thuê.');
        }
        return back()->with('error', 'Thao tác không thành công.');
    }

    // ─── Rental: Người lập đánh dấu đã trả (in_use → pending_return) ───
    public function requestReturnRental(string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);

        try {
            $this->equipmentService->requestReturnRental($rental);
             return back()->with('success', 'Đã gửi yêu cầu trả thiết bị thuê.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    // ─── Rental: KT xác nhận trả (pending_return → returned) ───
    public function confirmReturnRental(string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);

        if ($this->equipmentService->confirmReturnRental($rental, $user)) {
            return back()->with('success', 'Đã xác nhận trả thiết bị thuê.');
        }
        return back()->with('error', 'Thao tác không thành công.');
    }

    public function destroyEquipmentRental(string $projectId, string $rentalId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_DELETE, $project);

        $rental = \App\Models\EquipmentRental::where('project_id', $project->id)->findOrFail($rentalId);
        if ($rental->status !== 'draft' && !($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin())) {
            return back()->with('error', 'Chỉ có thể xóa thuê thiết bị ở trạng thái nháp.');
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
        
        $validated = $request->validate([
            'notes'              => 'nullable|string',
            'items'              => 'required|array|min:1',
            'items.*.name'       => 'required|string|max:255',
            'items.*.code'       => 'nullable|string|max:100',
            'items.*.quantity'   => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
        ]);

        try {
            $this->equipmentService->upsertPurchase($validated, $purchase, $user);
            
            // Handle file uploads (append)
            $this->attachFilesToEntity($request, $purchase, "equipment-purchases/{$project->id}/{$purchase->id}", true);

            return back()->with('success', 'Đã cập nhật phiếu mua thiết bị.');
        } catch (\Exception $e) {
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
            $validated['project_id'] = $project->id;
            $purchase = $this->equipmentService->upsertPurchase($validated, null, $user);

            // Handle file uploads
            $this->attachFilesToEntity($request, $purchase, "equipment-purchases/{$project->id}/{$purchase->id}", true);

            return back()->with('success', 'Đã tạo phiếu mua thiết bị.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function submitEquipmentPurchase(string $projectId, string $purchaseId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_CREATE, $project);

        $purchase = \App\Models\EquipmentPurchase::where('project_id', $project->id)->findOrFail($purchaseId);
        
        try {
            $this->equipmentService->submitPurchase($purchase);
            return back()->with('success', 'Đã gửi phiếu mua để BĐH duyệt.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function approvePurchaseManagement(string $projectId, string $purchaseId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_MANAGEMENT, $project);

        $purchase = \App\Models\EquipmentPurchase::where('project_id', $project->id)->findOrFail($purchaseId);
        
        if ($this->equipmentService->approvePurchaseByManagement($purchase, $user)) {
            return back()->with('success', 'BĐH đã duyệt. Chuyển sang Kế toán.');
        }
        return back()->with('error', 'Thao tác không thành công.');
    }

    public function confirmPurchaseAccountant(string $projectId, string $purchaseId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $purchase = \App\Models\EquipmentPurchase::where('project_id', $project->id)
            ->with('items')
            ->findOrFail($purchaseId);
        
        try {
            $this->equipmentService->confirmPurchaseByAccountant($purchase, $user);

            // Create global project cost for reporting
            $costGroup = \App\Models\CostGroup::where('code', 'equipment')
                ->orWhere('name', 'like', '%thiết bị%')
                ->where('is_active', true)
                ->first();

            Cost::create([
                'project_id'             => $project->id,
                'cost_group_id'          => $costGroup ? $costGroup->id : null,
                'category'               => 'equipment',
                'name'                   => "Mua thiết bị cho DA: {$project->name}",
                'amount'                 => $purchase->total_amount,
                'description'            => "Từ phiếu mua thiết bị #{$purchase->id}. " . ($purchase->notes ?? ""),
                'cost_date'              => now(),
                'status'                 => 'approved',
                'created_by'             => $purchase->created_by,
                'management_approved_by' => $purchase->approved_by,
                'management_approved_at' => $purchase->approved_at,
                'accountant_approved_by' => $user->id,
                'accountant_approved_at' => now(),
            ]);

            return back()->with('success', 'Kế toán xác nhận. Thiết bị đã nhập kho.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function rejectEquipmentPurchase(Request $request, string $projectId, string $purchaseId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_REJECT, $project);

        $purchase = \App\Models\EquipmentPurchase::where('project_id', $project->id)->findOrFail($purchaseId);
        $validated = $request->validate(['reason' => 'required|string|max:500']);

        if ($this->equipmentService->rejectPurchase($purchase, $validated['reason'], $user)) {
            return back()->with('success', 'Đã từ chối phiếu mua.');
        }
        return back()->with('error', 'Thao tác không thành công.');
    }

    public function destroyEquipmentPurchase(string $projectId, string $purchaseId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_DELETE, $project);

        $purchase = \App\Models\EquipmentPurchase::where('project_id', $project->id)->findOrFail($purchaseId);
        if ($purchase->status !== 'draft' && !($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin())) {
            return back()->with('error', 'Chỉ có thể xóa phiếu mua vật tư ở trạng thái nháp.');
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
        
        $validated = $request->validate([
            'equipment_id' => 'required|exists:equipment,id',
            'quantity'     => 'required|integer|min:1',
            'receiver_id'  => 'required|exists:users,id',
            'received_date' => 'required|date',
            'notes'        => 'nullable|string',
        ]);

        try {
            $this->equipmentService->upsertUsage($validated, $usage, $user);
            
            // Handle file uploads (append)
            $this->attachFilesToEntity($request, $usage, "asset-usages/{$project->id}/{$usage->id}", true);

            return back()->with('success', 'Đã cập nhật phiếu mượn thiết bị.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
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

        try {
            $validated['project_id'] = $project->id;
            $usage = $this->equipmentService->upsertUsage($validated, null, $user);

            // Handle file uploads
            $this->attachFilesToEntity($request, $usage, "asset-usages/{$project->id}/{$usage->id}", true);

            return back()->with('success', 'Đã tạo phiếu sử dụng thiết bị.');
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    // ─── Asset Usage: Gửi duyệt (draft/rejected → pending_management) ───
    public function submitAssetUsage(string $projectId, string $usageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::EQUIPMENT_UPDATE, $project);

        $usage = \App\Models\AssetUsage::where('project_id', $project->id)->findOrFail($usageId);

        try {
            $this->equipmentService->submitUsage($usage);
            return back()->with('success', 'Đã gửi phiếu để BĐH duyệt.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    // ─── Asset Usage: BĐH duyệt (pending_management → pending_accountant) ───
    public function approveAssetUsageManagement(string $projectId, string $usageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_MANAGEMENT, $project);

        $usage = \App\Models\AssetUsage::where('project_id', $project->id)->findOrFail($usageId);

        if ($this->equipmentService->approveUsageByManagement($usage, $user)) {
            return back()->with('success', 'BĐH đã duyệt. Chuyển sang Kế toán xác nhận.');
        }
        return back()->with('error', 'Thao tác không thành công.');
    }

    // ─── Asset Usage: KT xác nhận (pending_accountant → in_use) ───
    public function confirmAssetUsageAccountant(string $projectId, string $usageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $usage = \App\Models\AssetUsage::where('project_id', $project->id)->findOrFail($usageId);

        if ($this->equipmentService->confirmUsageByAccountant($usage, $user)) {
            return back()->with('success', 'KT đã xác nhận. Thiết bị chuyển sang Đang sử dụng.');
        }
        return back()->with('error', 'Thao tác không thành công.');
    }

    // ─── Asset Usage: Từ chối ───
    public function rejectAssetUsage(Request $request, string $projectId, string $usageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();

        $usage = \App\Models\AssetUsage::where('project_id', $project->id)->findOrFail($usageId);
        $validated = $request->validate(['rejection_reason' => 'required|string']);

        if ($this->equipmentService->rejectUsage($usage, $validated['rejection_reason'], $user)) {
            return back()->with('success', 'Đã từ chối phiếu sử dụng thiết bị.');
        }
        return back()->with('error', 'Thao tác không thành công.');
    }

    // ─── Asset Usage: Yêu cầu trả (in_use → pending_return) ───
    public function requestReturnAsset(string $projectId, string $usageId)
    {
        $project = Project::findOrFail($projectId);
        $usage = \App\Models\AssetUsage::where('project_id', $project->id)->findOrFail($usageId);

        try {
            $this->equipmentService->requestReturnUsage($usage);
            return back()->with('success', 'Đã gửi yêu cầu trả thiết bị.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
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

        try {
            $this->acceptanceService->upsertItem(array_merge($validated, [
                'acceptance_stage_id' => $stage->id,
            ]), null, $user);

            return back()->with('success', 'Đã thêm hạng mục nghiệm thu.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
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

        try {
            $this->acceptanceService->upsertItem($validated, $item, $user);
            return back()->with('success', 'Đã cập nhật hạng mục nghiệm thu.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function destroyAcceptanceItem(string $projectId, string $stageId, string $itemId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::ACCEPTANCE_DELETE, $project);

        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        $item = AcceptanceItem::where('acceptance_stage_id', $stage->id)->findOrFail($itemId);

        try {
            $this->acceptanceService->deleteItem($item);
            return back()->with('success', 'Đã xóa hạng mục nghiệm thu.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
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

        try {
            $this->acceptanceService->submitItem($item, $user);
            return back()->with('success', 'Đã gửi hạng mục để duyệt.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
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

        try {
            $this->acceptanceService->approveItem($item, $user, 1);
            return back()->with('success', 'Đã duyệt (Giám sát).');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
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

        try {
            $this->acceptanceService->approveItem($item, $user, 2);
            return back()->with('success', 'Đã duyệt (PM).');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
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

        try {
            $this->acceptanceService->approveItem($item, $user, 3);
            return back()->with('success', 'Đã nghiệm thu (Khách hàng).');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
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

        $validated = $request->validate([
            'rejection_reason' => 'required|string|max:1000',
        ]);

        try {
            $this->acceptanceService->rejectItem($item, $user, $validated['rejection_reason']);
            return back()->with('success', 'Đã từ chối hạng mục nghiệm thu. Lỗi ghi nhận đã được tự động tạo.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
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

    /**
     * Batch approve all items in a stage
     */
    public function approveAllAcceptanceItems(string $projectId, string $stageId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        
        $stage = AcceptanceStage::where('project_id', $project->id)->findOrFail($stageId);
        
        try {
            $count = $this->acceptanceService->approveAllInStage($stage, $user);
            if ($count > 0) {
                return back()->with('success', "Đã duyệt nhanh {$count} hạng mục.");
            }
            return back()->with('info', 'Không có hạng mục nào được duyệt.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
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

        try {
            $data = $request->all();
            $data['project_id'] = $projectId;

            $this->materialBillService->upsert($data, null, $user);

            return back()->with('success', "Đã tạo phiếu vật tư.");
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function updateMaterialBill(Request $request, string $projectId, string $billId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_UPDATE, $project);

        $bill = MaterialBill::where('project_id', $project->id)->findOrFail($billId);

        try {
            $this->materialBillService->upsert($request->all(), $bill, $user);

            // Handle file uploads during update (Web only)
            $this->attachFilesToEntity($request, $bill, "material-bills/{$project->id}/{$bill->id}", false);

            return back()->with('success', 'Đã cập nhật phiếu vật tư.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return back()->withErrors($e->errors())->withInput();
        } catch (\Exception $e) {
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function destroyMaterialBill(string $projectId, string $billId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_DELETE, $project);

        $bill = MaterialBill::where('project_id', $project->id)->findOrFail($billId);

        try {
            $this->materialBillService->delete($bill);
            return back()->with('success', 'Đã xóa phiếu vật tư.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function submitMaterialBill(string $projectId, string $billId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::MATERIAL_UPDATE, $project);

        $bill = MaterialBill::where('project_id', $project->id)->findOrFail($billId);

        try {
            $this->materialBillService->submit($bill, $user);
            return back()->with('success', 'Đã gửi phiếu vật tư để duyệt.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function approveMaterialBillManagement(string $projectId, string $billId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_MANAGEMENT, $project);

        $bill = MaterialBill::where('project_id', $project->id)->findOrFail($billId);

        try {
            $this->materialBillService->approve($bill, $user);
            return back()->with('success', 'Đã duyệt phiếu vật tư (BĐH).');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    public function approveMaterialBillAccountant(Request $request, string $projectId, string $billId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_APPROVE_ACCOUNTANT, $project);

        $bill = MaterialBill::where('project_id', $project->id)->findOrFail($billId);

        try {
            $this->materialBillService->approve($bill, $user, $request->only('budget_item_id'));
            return back()->with('success', 'Đã xác nhận phiếu vật tư. Dữ liệu đã đẩy qua Chi phí dự án.');
        } catch (\Exception $e) {
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
        $this->crmRequire($user, Permissions::COST_REJECT, $project);

        $bill = MaterialBill::where('project_id', $project->id)->findOrFail($billId);

        $request->validate([
            'reason' => 'nullable|string|max:500',
            'rejected_reason' => 'nullable|string|max:500'
        ]);

        $reason = $request->reason ?? $request->rejected_reason;

        try {
            $this->materialBillService->reject($bill, $user, $reason);
            return back()->with('success', 'Đã từ chối phiếu vật tư.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
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
        $admin = auth('admin')->user();
        $project = Project::findOrFail($projectId);
        $this->crmRequire($admin, Permissions::ATTENDANCE_VIEW, $project);

        $query = \App\Models\Attendance::with(['user:id,name,email', 'project:id,name', 'approver:id,name', 'laborCost'])
            ->forProject($projectId);

        if ($request->user_id) $query->forUser($request->user_id);
        if ($request->month && $request->year) {
            $query->forMonth($request->year, $request->month);
        } elseif ($request->date) {
            $query->forDate($request->date);
        }
        if ($request->status) $query->where('status', $request->status);

        $records = $query->orderByDesc('work_date')->orderByDesc('id')->paginate($request->per_page ?? 30);

        // Anti-Gravity: Self-healing logic for legacy negative hours
        foreach ($records->items() as $item) {
            $changed = false;
            if ($item->hours_worked < 0) {
                $item->hours_worked = abs($item->hours_worked);
                $changed = true;
            }
            if ($item->overtime_hours < 0) {
                $item->overtime_hours = abs($item->overtime_hours);
                $changed = true;
            }
            if ($changed) {
                $item->save();
            }
        }

        return response()->json($records);
    }

    public function storeAttendance(Request $request, string $projectId)
    {
        $admin = auth('admin')->user();
        $project = Project::findOrFail($projectId);
        $this->crmRequire($admin, Permissions::ATTENDANCE_MANAGE, $project);

        try {
            $data = array_merge($request->all(), ['project_id' => $projectId]);
            $attendance = $this->attendanceService->upsert($data, $admin);

            return response()->json([
                'message' => 'Lưu chấm công thành công',
                'data' => $attendance->load(['user:id,name', 'project:id,name']),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }

    public function approveAttendance(Request $request, string $projectId, string $id)
    {
        $admin = auth('admin')->user();
        $project = Project::findOrFail($projectId);
        $this->crmRequire($admin, Permissions::ATTENDANCE_APPROVE, $project);

        $attendance = \App\Models\Attendance::findOrFail($id);
        $this->attendanceService->approve($attendance, $admin);

        return response()->json(['message' => 'Đã duyệt chấm công', 'data' => $attendance->fresh()]);
    }

    public function rejectAttendance(Request $request, string $projectId, string $id)
    {
        $admin = auth('admin')->user();
        $project = Project::findOrFail($projectId);
        $this->crmRequire($admin, Permissions::ATTENDANCE_APPROVE, $project);

        $request->validate(['reason' => 'required|string|max:500']);

        $attendance = \App\Models\Attendance::findOrFail($id);
        $this->attendanceService->reject($attendance, $admin, $request->reason);

        return response()->json(['message' => 'Đã từ chối chấm công', 'data' => $attendance->fresh()]);
    }

    public function attendanceStatistics(Request $request, string $projectId)
    {
        $data = $this->attendanceService->getMonthlyStatistics(
            (int) $request->year,
            (int) $request->month,
            (int) $projectId,
            $request->user_id ? (int) $request->user_id : null
        );
        return response()->json($data);
    }

    public function getShifts(Request $request, string $projectId)
    {
        $query = \App\Models\WorkShift::where('project_id', $projectId);
        if ($request->active_only) $query->where('is_active', true);
        return response()->json($query->orderBy('start_time')->get());
    }

    public function storeShift(Request $request, string $projectId)
    {
        $data = array_merge($request->all(), ['project_id' => $projectId]);
        $shift = $this->attendanceService->createShift($data);
        return response()->json(['message' => 'Tạo ca thành công', 'data' => $shift], 201);
    }

    public function getLaborProductivity(Request $request, string $projectId)
    {
        $query = \App\Models\LaborProductivity::with(['user:id,name', 'task:id,name', 'creator:id,name'])
            ->forProject($projectId);

        if ($request->user_id) $query->forUser($request->user_id);
        if ($request->task_id) $query->where('task_id', $request->task_id);
        if ($request->from) $query->where('record_date', '>=', $request->from);
        if ($request->to) $query->where('record_date', '<=', $request->to);

        return response()->json($query->orderByDesc('record_date')->paginate($request->per_page ?? 20));
    }

    public function storeLaborProductivity(Request $request, string $projectId)
    {
        $admin = auth('admin')->user();
        $record = $this->productivityService->upsert(
            array_merge($request->all(), ['project_id' => $projectId]),
            null,
            $admin
        );

        return response()->json([
            'message' => 'Ghi nhận năng suất thành công',
            'data' => $record,
        ], 201);
    }

    public function destroyLaborProductivity(string $projectId, string $id)
    {
        \App\Models\LaborProductivity::where('project_id', $projectId)->findOrFail($id)->delete();
        return response()->json(['message' => 'Đã xóa']);
    }

    public function laborProductivityDashboard(Request $request, string $projectId)
    {
        $data = $this->productivityService->getDashboardData((int)$projectId, $request->all());
        return response()->json($data);
    }

    /**
     * Tổng hợp chi phí nhân công từ chấm công theo tháng
     */
    public function generateLaborCosts(Request $request, string $projectId)
    {
        $admin = auth('admin')->user();
        $project = Project::findOrFail($projectId);

        $validated = $request->validate([
            'year'  => 'required|integer|min:2020|max:2030',
            'month' => 'required|integer|min:1|max:12',
        ]);

        try {
            $result = $this->attendanceService->generateBatchLaborCosts(
                (int) $project->id,
                (int) $validated['year'],
                (int) $validated['month'],
                $admin
            );

            return response()->json([
                'message' => "Đã tạo {$result['created']} chi phí nhân công, tổng " . number_format($result['total_amount'], 0, ',', '.') . 'đ',
                'data'    => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
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

        try {
            DB::beginTransaction();
            $data = array_merge($validated, ['project_id' => $project->id]);
            $warranty = $this->warrantyService->upsertWarranty($data, null, $user);
            $this->attachmentService->handleCrmUpload($request, $warranty, "projects/{$project->id}/warranties", false);

            DB::commit();
            return back()->with('success', 'Đã lưu thông tin bảo hành.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
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

        try {
            DB::beginTransaction();
            $data = array_merge($validated, ['project_id' => $project->id]);
            $this->warrantyService->upsertWarranty($data, $warranty, $user);
            $this->attachmentService->handleCrmUpload($request, $warranty, "projects/{$project->id}/warranties", false);

            DB::commit();
            return back()->with('success', 'Đã cập nhật phiếu bảo hành.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    /**
     * Approve project warranty (Khách hàng duyệt)
     */
    public function approveProjectWarranty(Request $request, string $projectId, string $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_APPROVE, $project);

        $warranty = \App\Models\ProjectWarranty::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        $this->warrantyService->updateStatus($warranty, \App\Models\ProjectWarranty::STATUS_APPROVED, $user);

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

        try {
            DB::beginTransaction();
            $data = array_merge($validated, ['project_id' => $project->id]);
            $maintenance = $this->warrantyService->upsertMaintenance($data, null, $user);
            $this->attachmentService->handleCrmUpload($request, $maintenance, "projects/{$project->id}/maintenance", false);

            DB::commit();
            return back()->with('success', 'Đã tạo phiếu bảo trì.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    public function updateProjectMaintenance(Request $request, string $projectId, string $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_UPDATE, $project);

        $maintenance = \App\Models\ProjectMaintenance::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();

        if (!in_array($maintenance->status, ['draft', 'rejected'])) {
            return back()->with('error', 'Chỉ sửa được phiếu ở trạng thái nháp hoặc từ chối.');
        }

        $validated = $request->validate([
            'maintenance_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();
            $data = array_merge($validated, ['project_id' => $project->id]);
            $this->warrantyService->upsertMaintenance($data, $maintenance, $user);
            $this->attachmentService->handleCrmUpload($request, $maintenance, "projects/{$project->id}/maintenance", false);

            DB::commit();
            return back()->with('success', 'Đã cập nhật phiếu bảo trì.');
        } catch (\Exception $e) {
            DB::rollBack();
            return back()->with('error', 'Lỗi: ' . $e->getMessage());
        }
    }

    /**
     * Submit project maintenance for customer approval (draft → pending_customer)
     */
    public function submitProjectMaintenance(string $projectId, string $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_UPDATE, $project);

        $maintenance = \App\Models\ProjectMaintenance::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();

        if ($maintenance->status !== \App\Models\ProjectMaintenance::STATUS_DRAFT) {
            return back()->with('error', 'Chỉ gửi duyệt được phiếu ở trạng thái nháp.');
        }

        $maintenance->update([
            'status' => \App\Models\ProjectMaintenance::STATUS_PENDING_CUSTOMER,
        ]);

        return back()->with('success', 'Đã gửi phiếu bảo trì cho khách hàng duyệt.');
    }

    /**
     * Approve project maintenance (pending_customer → approved)
     */
    public function approveProjectMaintenance(Request $request, string $projectId, string $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_APPROVE, $project);

        $maintenance = \App\Models\ProjectMaintenance::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();
        $this->warrantyService->updateStatus($maintenance, \App\Models\ProjectMaintenance::STATUS_APPROVED, $user);

        return back()->with('success', 'Đã duyệt phiếu bảo trì.');
    }

    /**
     * Reject project maintenance (pending_customer → rejected)
     */
    public function rejectProjectMaintenance(Request $request, string $projectId, string $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_APPROVE, $project);

        $maintenance = \App\Models\ProjectMaintenance::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();

        if ($maintenance->status !== \App\Models\ProjectMaintenance::STATUS_PENDING_CUSTOMER) {
            return back()->with('error', 'Phiếu không ở trạng thái chờ duyệt.');
        }

        $maintenance->update([
            'status' => \App\Models\ProjectMaintenance::STATUS_REJECTED,
        ]);

        return back()->with('success', 'Đã từ chối phiếu bảo trì.');
    }

    /**
     * Delete project maintenance
     */
    public function destroyProjectMaintenance(string $projectId, string $uuid)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::WARRANTY_DELETE, $project);

        $maintenance = \App\Models\ProjectMaintenance::where('project_id', $project->id)->where('uuid', $uuid)->firstOrFail();

        if (!in_array($maintenance->status, ['draft', 'rejected'])) {
            return back()->with('error', 'Chỉ xóa được phiếu ở trạng thái nháp hoặc từ chối.');
        }

        $maintenance->delete();

        return back()->with('success', 'Đã xóa phiếu bảo trì.');
    }
}
