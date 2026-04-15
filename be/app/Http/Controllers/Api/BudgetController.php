<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectBudget;
use App\Models\BudgetItem;
use App\Constants\Permissions;
use App\Services\AuthorizationService;
use App\Services\ProjectService;
use App\Services\FinancialCalculationService;
use App\Services\BudgetComparisonService;
use App\Services\BudgetSyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class BudgetController extends Controller
{
    protected $authService;
    protected $budgetService;
    protected $analysisService;

    public function __construct(
        ProjectService $projectService,
        FinancialCalculationService $financialCalculationService,
        BudgetSyncService $budgetSyncService,
        AuthorizationService $authService,
        \App\Services\ProjectBudgetService $budgetService,
        \App\Services\ProjectAnalysisService $analysisService
    ) {
        $this->projectService = $projectService;
        $this->financialCalculationService = $financialCalculationService;
        $this->budgetSyncService = $budgetSyncService;
        $this->authService = $authService;
        $this->budgetService = $budgetService;
        $this->analysisService = $analysisService;
    }

    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::BUDGET_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem ngân sách của dự án này.'
            ], 403);
        }
        $budgets = $project->budgets()
            ->with(['items.costGroup', 'creator', 'approver', 'project'])
            ->orderBy('budget_date', 'desc')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $budgets
        ]);
    }

    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::BUDGET_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo ngân sách cho dự án này.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'version' => 'nullable|string|max:50',
            'budget_date' => 'required|date',
            'items' => 'required|array|min:1',
            'items.*.name' => 'required|string|max:255',
            'items.*.cost_group_id' => 'nullable|exists:cost_groups,id',
            'items.*.estimated_amount' => 'required|numeric|min:0',
            'items.*.quantity' => 'nullable|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $budget = $this->budgetService->upsert([
                'project_id' => $project->id,
                ...$request->all(),
            ], null, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo ngân sách thành công.',
                'data' => $budget
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    public function show(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::BUDGET_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem ngân sách của dự án này.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)
            ->with([
                'items.costGroup',
                'project',
                'project.contract',
                'creator',
                'approver'
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $budget
        ]);
    }

    public function compareWithActual(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::BUDGET_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem so sánh ngân sách dự án này.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)
            ->with([
                'items.costGroup',
                'project',
                'project.contract',
                'project.costs' => function ($query) {
                    $query->where('status', 'approved')
                        ->whereNotNull('cost_group_id')
                        ->select('cost_group_id', \Illuminate\Support\Facades\DB::raw('SUM(amount) as total'))
                        ->groupBy('cost_group_id');
                }
            ])
            ->findOrFail($id);

        // Sử dụng ProjectAnalysisService để so sánh
        $comparison = $this->analysisService->compareBudget($budget);
        $categoryComparison = $this->analysisService->compareByCategory($budget);
        $groupComparison = $this->analysisService->compareByCostGroup($budget);

        return response()->json([
            'success' => true,
            'data' => [
                'budget' => $budget,
                'items' => $comparison['items'],
                'summary' => $comparison['summary'],
                'category_comparison' => $categoryComparison,
                'group_comparison' => $groupComparison,
            ]
        ]);
    }

    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::BUDGET_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật ngân sách cho dự án này.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);

        if (in_array($budget->status, ['pending_approval', 'approved', 'archived'])) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật ngân sách đang chờ duyệt, đã được duyệt hoặc đã lưu trữ.'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'version' => 'nullable|string|max:50',
            'budget_date' => 'sometimes|required|date',
            'notes' => 'nullable|string',
            'status' => 'nullable|in:draft,pending_approval,approved,active,archived',
            'items' => 'nullable|array',
            'items.*.name' => 'required_with:items|string|max:255',
            'items.*.cost_group_id' => 'nullable|exists:cost_groups,id',
            'items.*.estimated_amount' => 'required_with:items|numeric|min:0',
            'items.*.quantity' => 'nullable|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $budget = $this->budgetService->upsert([
                'project_id' => $project->id,
                ...$request->all(),
            ], $budget, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật ngân sách thành công.',
                'data' => $budget
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::BUDGET_DELETE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa ngân sách của dự án này.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->budgetService->delete($budget);

            return response()->json([
                'success' => true,
                'message' => 'Đã xóa ngân sách thành công.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Gửi duyệt ngân sách (draft -> pending_approval)
     */
    public function submitForApproval(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::BUDGET_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền gửi duyệt ngân sách dự án này.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->budgetService->submit($budget);

            return response()->json([
                'success' => true,
                'message' => 'Đã gửi duyệt ngân sách thành công.',
                'data' => $budget->fresh(['items.costGroup', 'creator', 'approver'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Duyệt ngân sách (pending_approval -> approved)
     */
    public function approve(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::BUDGET_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền duyệt ngân sách dự án này.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->budgetService->approve($budget, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã duyệt ngân sách thành công.',
                'data' => $budget->fresh(['items.costGroup', 'creator', 'approver'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Từ chối ngân sách (pending_approval -> draft)
     */
    public function reject(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::BUDGET_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền từ chối ngân sách dự án này.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->budgetService->reject($budget, $request->input('reason', ''), $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã từ chối ngân sách.',
                'data' => $budget->fresh(['items.costGroup', 'creator', 'approver'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Áp dụng ngân sách (approved -> active)
     */
    public function activate(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::BUDGET_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền áp dụng ngân sách dự án này.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->budgetService->activate($budget);

            return response()->json([
                'success' => true,
                'message' => 'Đã áp dụng ngân sách thành công.',
                'data' => $budget->fresh(['items.costGroup', 'creator', 'approver'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Lưu trữ ngân sách (active -> archived)
     */
    public function archive(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::BUDGET_APPROVE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền lưu trữ ngân sách dự án này.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);

        try {
            $this->budgetService->archive($budget);

            return response()->json([
                'success' => true,
                'message' => 'Đã lưu trữ ngân sách.',
                'data' => $budget->fresh(['items.costGroup', 'creator', 'approver'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Đồng bộ lại dữ liệu budget với actual costs
     */
    public function sync(string $projectId, ?string $id = null)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();
        
        if (!$this->authService->can($user, Permissions::BUDGET_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền đồng bộ ngân sách dự án này.'
            ], 403);
        }

        if ($id) {
            $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);
            $this->budgetSyncService->syncBudget($budget);
            
            return response()->json([
                'success' => true,
                'message' => 'Đã đồng bộ ngân sách.',
                'data' => $budget->fresh(['items.costGroup']),
            ]);
        } else {
            $result = $this->budgetSyncService->syncProjectBudgets($projectId);
            
            return response()->json($result);
        }
    }
}
