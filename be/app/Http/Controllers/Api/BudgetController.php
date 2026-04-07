<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectBudget;
use App\Models\BudgetItem;
use App\Services\ProjectService;
use App\Services\FinancialCalculationService;
use App\Services\BudgetComparisonService;
use App\Services\BudgetSyncService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class BudgetController extends Controller
{
    protected $projectService;
    protected $financialCalculationService;
    protected $budgetComparisonService;
    protected $budgetSyncService;

    public function __construct(
        ProjectService $projectService,
        FinancialCalculationService $financialCalculationService,
        BudgetComparisonService $budgetComparisonService,
        BudgetSyncService $budgetSyncService
    ) {
        $this->projectService = $projectService;
        $this->financialCalculationService = $financialCalculationService;
        $this->budgetComparisonService = $budgetComparisonService;
        $this->budgetSyncService = $budgetSyncService;
    }

    public function index(string $projectId)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('budgets.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem ngân sách.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
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
        $user = auth()->user();
        
        if (!$user->hasPermission('budgets.create')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền tạo ngân sách.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);

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
            DB::beginTransaction();

            $totalBudget = collect($request->items)->sum('estimated_amount');

            $budget = ProjectBudget::create([
                'project_id' => $project->id,
                'name' => $request->name,
                'version' => $request->version ?? '1.0',
                'total_budget' => $totalBudget,
                'estimated_cost' => $totalBudget,
                'remaining_budget' => $totalBudget,
                'budget_date' => $request->budget_date,
                'notes' => $request->notes,
                'status' => 'draft',
                'created_by' => $user->id,
            ]);

            // Tạo budget items
            foreach ($request->items as $index => $item) {
                BudgetItem::create([
                    'budget_id' => $budget->id,
                    'cost_group_id' => $item['cost_group_id'] ?? null,
                    'name' => $item['name'],
                    'description' => $item['description'] ?? null,
                    'estimated_amount' => $item['estimated_amount'],
                    'remaining_amount' => $item['estimated_amount'],
                    'quantity' => $item['quantity'] ?? 1,
                    'unit_price' => $item['unit_price'] ?? $item['estimated_amount'],
                    'order' => $index,
                ]);
            }

            DB::commit();

            $budget->load(['items.costGroup', 'creator']);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo ngân sách thành công.',
                'data' => $budget
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show(string $projectId, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('budgets.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem ngân sách.'
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
        $user = auth()->user();
        
        if (!$user->hasPermission('budgets.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem so sánh ngân sách.'
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

        // Sử dụng BudgetComparisonService để so sánh
        $comparison = $this->budgetComparisonService->compareBudget($budget);
        $categoryComparison = $this->budgetComparisonService->compareByCategory($budget);

        $groupComparison = $this->budgetComparisonService->compareByCostGroup($budget);

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
        $user = auth()->user();
        
        if (!$user->hasPermission('budgets.update')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật ngân sách.'
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
            DB::beginTransaction();

            $updateData = $request->only(['name', 'version', 'budget_date', 'notes', 'status']);

            if ($request->status === 'approved' && !$budget->approved_by) {
                $updateData['approved_by'] = $user->id;
                $updateData['approved_at'] = now();
            }

            // Nếu cập nhật items
            if ($request->has('items')) {
                // Xóa các hạng mục cũ
                $budget->items()->delete();
                
                $totalBudget = 0;
                foreach ($request->items as $index => $item) {
                    BudgetItem::create([
                        'budget_id' => $budget->id,
                        'cost_group_id' => $item['cost_group_id'] ?? null,
                        'name' => $item['name'],
                        'description' => $item['description'] ?? null,
                        'estimated_amount' => $item['estimated_amount'],
                        'remaining_amount' => $item['estimated_amount'], // Reset remaining if re-drafting
                        'quantity' => $item['quantity'] ?? 1,
                        'unit_price' => $item['unit_price'] ?? $item['estimated_amount'],
                        'order' => $index,
                    ]);
                    $totalBudget += $item['estimated_amount'];
                }
                
                $updateData['total_budget'] = $totalBudget;
                $updateData['estimated_cost'] = $totalBudget;
                $updateData['remaining_budget'] = $totalBudget;
            }

            $budget->update($updateData);

            // Đồng bộ lại số liệu
            $this->budgetSyncService->syncBudget($budget);

            DB::commit();

            $budget->load(['items.costGroup', 'creator', 'approver']);

            return response()->json([
                'success' => true,
                'message' => 'Đã cập nhật ngân sách thành công.',
                'data' => $budget
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy(string $projectId, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('budgets.delete')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xóa ngân sách.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);

        if ($budget->status === 'approved' || $budget->status === 'archived') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể xóa ngân sách đã được duyệt hoặc đã lưu trữ.'
            ], 422);
        }

        $budget->delete();

        return response()->json([
            'success' => true,
            'message' => 'Đã xóa ngân sách thành công.'
        ]);
    }

    /**
     * Gửi duyệt ngân sách (draft -> pending_approval)
     */
    public function submitForApproval(string $projectId, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('budgets.update')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền gửi duyệt ngân sách.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);

        if ($budget->status !== 'draft') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể gửi duyệt ngân sách ở trạng thái Nháp.'
            ], 422);
        }

        if (!$budget->items || $budget->items->count() === 0) {
            return response()->json([
                'success' => false,
                'message' => 'Ngân sách phải có ít nhất 1 hạng mục trước khi gửi duyệt.'
            ], 422);
        }

        $budget->update(['status' => 'pending_approval']);

        return response()->json([
            'success' => true,
            'message' => 'Đã gửi duyệt ngân sách thành công.',
            'data' => $budget->fresh(['items.costGroup', 'creator', 'approver'])
        ]);
    }

    /**
     * Duyệt ngân sách (pending_approval -> approved)
     */
    public function approve(string $projectId, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('budgets.approve')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền duyệt ngân sách.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);

        if ($budget->status !== 'pending_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể duyệt ngân sách ở trạng thái Chờ duyệt.'
            ], 422);
        }

        $budget->update([
            'status' => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã duyệt ngân sách thành công.',
            'data' => $budget->fresh(['items.costGroup', 'creator', 'approver'])
        ]);
    }

    /**
     * Từ chối ngân sách (pending_approval -> draft)
     */
    public function reject(Request $request, string $projectId, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('budgets.approve')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền từ chối ngân sách.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);

        if ($budget->status !== 'pending_approval') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể từ chối ngân sách ở trạng thái Chờ duyệt.'
            ], 422);
        }

        $reason = $request->input('reason', '');
        $notes = $budget->notes ?: '';
        if ($reason) {
            $notes = ($notes ? $notes . "\n" : '') . "[Từ chối] " . $reason . " - " . $user->name . " (" . now()->format('d/m/Y H:i') . ")";
        }

        $budget->update([
            'status' => 'draft',
            'notes' => $notes,
            'approved_by' => null,
            'approved_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối ngân sách.',
            'data' => $budget->fresh(['items.costGroup', 'creator', 'approver'])
        ]);
    }

    /**
     * Áp dụng ngân sách (approved -> active)
     */
    public function activate(string $projectId, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('budgets.approve')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền áp dụng ngân sách.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);

        if ($budget->status !== 'approved') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể áp dụng ngân sách đã được duyệt.'
            ], 422);
        }

        // Đồng bộ lại số liệu trước khi activate
        $this->budgetSyncService->syncBudget($budget);

        $budget->update(['status' => 'active']);

        return response()->json([
            'success' => true,
            'message' => 'Đã áp dụng ngân sách thành công.',
            'data' => $budget->fresh(['items.costGroup', 'creator', 'approver'])
        ]);
    }

    /**
     * Lưu trữ ngân sách (active -> archived)
     */
    public function archive(string $projectId, string $id)
    {
        $user = auth()->user();

        if (!$user->hasPermission('budgets.approve')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền lưu trữ ngân sách.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);

        if ($budget->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Chỉ có thể lưu trữ ngân sách đang áp dụng.'
            ], 422);
        }

        $budget->update(['status' => 'archived']);

        return response()->json([
            'success' => true,
            'message' => 'Đã lưu trữ ngân sách.',
            'data' => $budget->fresh(['items.costGroup', 'creator', 'approver'])
        ]);
    }

    /**
     * Đồng bộ lại dữ liệu budget với actual costs
     */
    public function sync(string $projectId, ?string $id = null)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('budgets.view')) {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền đồng bộ ngân sách.'
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
