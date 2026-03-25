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
use App\Models\Attachment;
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
            'contract',
            'payments',
            'additionalCosts.proposer',
            'additionalCosts.approver',
            'costs' => function ($q) {
                $q->orderByDesc('created_at');
            },
            'costs.creator',
            'costs.costGroup',
            'costs.subcontractor',
            'personnel.user',
            'personnel.personnelRole',
            'subcontractors.payments',
            'constructionLogs' => function ($q) {
                $q->with(['creator:id,name', 'task:id,name'])->latest('log_date');
            },
            'acceptanceStages.items',
            'defects',
            'progress',
            'changeRequests',
            'invoices',
            'budgets.items',
            'budgets.creator',
            'comments.user',
            'risks',
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

        return Inertia::render('Crm/Projects/Show', [
            'project' => $project,
            'users' => $users,
            'permissions' => $permissions,
            'costGroups' => $costGroups,
            'personnelRoles' => $personnelRoles,
            'materials' => $materials,
            'globalSubcontractors' => $globalSubcontractors,
            'projectTasks' => $projectTasks,
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

        Cost::create([
            'project_id' => $project->id,
            'created_by' => $user->id,
            'status' => 'draft',
            ...$validated,
        ]);

        return back()->with('success', 'Đã tạo phiếu chi.');
    }

    public function updateCost(Request $request, string $projectId, string $costId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_UPDATE, $project);

        $cost = Cost::where('project_id', $project->id)->findOrFail($costId);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'amount' => 'sometimes|numeric|min:0',
            'description' => 'nullable|string',
            'cost_date' => 'sometimes|date',
            'cost_group_id' => 'nullable|exists:cost_groups,id',
        ]);

        $cost->update($validated);
        return back()->with('success', 'Đã cập nhật phiếu chi.');
    }

    public function destroyCost(string $projectId, string $costId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::COST_DELETE, $project);

        Cost::where('project_id', $project->id)->findOrFail($costId)->delete();
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
        // Admin model: cannot pass to model method (FK constraint to users table)
        // Update fields directly to avoid FK violation
        $cost->status = 'pending_accountant_approval';
        $cost->management_approved_at = now();
        $cost->save();
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
        // Call model method without user (null) to skip FK assignment to users table
        $cost->approveByAccountant(); // handles status transition + subcontractor + material + budget side effects

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
        $cost->status = 'rejected';
        $cost->rejected_reason = $validated['rejected_reason'];
        $cost->save();
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
            'description' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'nullable|date',
            'status' => 'nullable|string',
        ]);

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

        ProjectPayment::where('project_id', $project->id)->findOrFail($paymentId)->delete();
        return back()->with('success', 'Đã xóa thanh toán.');
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

        ConstructionLog::create([
            'project_id' => $project->id,
            'created_by' => $user->id,
            ...$validated,
        ]);

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

        $log->update($validated);

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

        $log->delete();
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
        ]);

        ProjectComment::create([
            'project_id' => $project->id,
            'user_id' => $user->id,
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
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'severity' => 'required|in:low,medium,major,critical',
            'status' => 'nullable|string',
        ]);

        Defect::create([
            'project_id' => $project->id,
            'reported_by' => $user->id,
            'status' => $validated['status'] ?? 'open',
            ...$validated,
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
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'severity' => 'sometimes|in:low,medium,major,critical',
            'status' => 'sometimes|string',
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
            'description' => 'nullable|string',
            'cost_impact' => 'nullable|numeric',
            'status' => 'nullable|string',
        ]);

        ChangeRequest::create([
            'project_id' => $project->id,
            'requested_by' => $user->id,
            'status' => $validated['status'] ?? 'pending',
            ...$validated,
        ]);

        return back()->with('success', 'Đã tạo yêu cầu thay đổi.');
    }

    public function destroyChangeRequest(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth('admin')->user();
        $this->crmRequire($user, Permissions::CHANGE_REQUEST_DELETE, $project);

        ChangeRequest::where('project_id', $project->id)->findOrFail($id)->delete();
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
            'description' => 'nullable|string',
            'severity' => 'required|in:low,medium,high',
            'status' => 'nullable|string',
        ]);

        ProjectRisk::create([
            'project_id' => $project->id,
            'status' => $validated['status'] ?? 'identified',
            ...$validated,
        ]);

        return back()->with('success', 'Đã thêm rủi ro.');
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

        Subcontractor::create([
            'project_id' => $project->id,
            'created_by' => $user->id,
            'payment_status' => 'pending',
            'progress_status' => $validated['progress_status'] ?? 'not_started',
            'advance_payment' => 0,
            ...$validated,
        ]);

        return back()->with('success', 'Đã thêm nhà thầu phụ.');
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
        return back()->with('success', 'Đã cập nhật nhà thầu phụ.');
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
        $cost->reject($validated['rejected_reason']);
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
            'version' => '1.0',
            'total_budget' => $totalBudget,
            'estimated_cost' => $totalBudget,
            'remaining_budget' => $totalBudget,
            'budget_date' => $validated['budget_date'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'draft',
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
        ]);

        $maxOrder = $project->acceptanceStages()->max('order') ?? 0;

        AcceptanceStage::create([
            'project_id' => $project->id,
            'name' => $validated['name'],
            'description' => $validated['description'] ?? null,
            'order' => $maxOrder + 1,
            'is_custom' => true,
            'status' => 'pending',
        ]);

        return back()->with('success', 'Đã tạo giai đoạn nghiệm thu.');
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
}
