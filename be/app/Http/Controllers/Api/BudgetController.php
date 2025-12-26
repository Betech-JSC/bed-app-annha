<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectBudget;
use App\Models\BudgetItem;
use App\Services\ProjectService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class BudgetController extends Controller
{
    protected $projectService;

    public function __construct(ProjectService $projectService)
    {
        $this->projectService = $projectService;
    }

    public function index(string $projectId)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('budgets.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem ngân sách.'
            ], 403);
        }

        $project = Project::findOrFail($projectId);
        $budgets = $project->budgets()
            ->with(['items.costGroup', 'creator', 'approver'])
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
        
        if (!$user->hasPermission('budgets.create') && !$user->owner && $user->role !== 'admin') {
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
        
        if (!$user->hasPermission('budgets.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem ngân sách.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)
            ->with(['items.costGroup', 'project', 'creator', 'approver'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $budget
        ]);
    }

    public function compareWithActual(string $projectId, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('budgets.view') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền xem so sánh ngân sách.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)
            ->with(['items.costGroup', 'project'])
            ->findOrFail($id);

        $budget->load('project');
        $project = $budget->project;
        $costs = $this->projectService->calculateTotalCosts($project);

        // Tính actual cost cho từng budget item
        $items = $budget->items->map(function ($item) use ($project) {
            // Logic tính actual cost dựa trên cost_group_id
            $actualAmount = 0;
            if ($item->cost_group_id) {
                // Lấy costs từ cùng cost_group
                $actualAmount = $project->costs()
                    ->where('cost_group_id', $item->cost_group_id)
                    ->where('status', 'approved')
                    ->sum('amount');
            }

            $item->actual_amount = $actualAmount;
            $item->remaining_amount = $item->estimated_amount - $actualAmount;
            $item->variance = $actualAmount - $item->estimated_amount;
            $item->variance_percentage = $item->estimated_amount > 0 
                ? (($item->variance / $item->estimated_amount) * 100) 
                : 0;

            return $item;
        });

        $totalActual = $items->sum('actual_amount');
        $totalVariance = $totalActual - $budget->total_budget;
        $variancePercentage = $budget->total_budget > 0 
            ? (($totalVariance / $budget->total_budget) * 100) 
            : 0;

        return response()->json([
            'success' => true,
            'data' => [
                'budget' => $budget,
                'items' => $items,
                'summary' => [
                    'total_budget' => $budget->total_budget,
                    'total_actual' => $totalActual,
                    'total_variance' => $totalVariance,
                    'variance_percentage' => round($variancePercentage, 2),
                    'is_over_budget' => $totalActual > $budget->total_budget,
                ]
            ]
        ]);
    }

    public function update(Request $request, string $projectId, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('budgets.update') && !$user->owner && $user->role !== 'admin') {
            return response()->json([
                'success' => false,
                'message' => 'Không có quyền cập nhật ngân sách.'
            ], 403);
        }

        $budget = ProjectBudget::where('project_id', $projectId)->findOrFail($id);

        if ($budget->status === 'approved' || $budget->status === 'archived') {
            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật ngân sách đã được duyệt hoặc đã lưu trữ.'
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'notes' => 'nullable|string',
            'status' => 'in:draft,approved,active,archived',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Dữ liệu không hợp lệ.',
                'errors' => $validator->errors()
            ], 422);
        }

        $updateData = $request->only(['name', 'notes', 'status']);

        if ($request->status === 'approved' && !$budget->approved_by) {
            $updateData['approved_by'] = $user->id;
            $updateData['approved_at'] = now();
        }

        $budget->update($updateData);
        $budget->load(['items.costGroup', 'creator', 'approver']);

        return response()->json([
            'success' => true,
            'message' => 'Đã cập nhật ngân sách thành công.',
            'data' => $budget
        ]);
    }

    public function destroy(string $projectId, string $id)
    {
        $user = auth()->user();
        
        if (!$user->hasPermission('budgets.delete') && !$user->owner && $user->role !== 'admin') {
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
}
