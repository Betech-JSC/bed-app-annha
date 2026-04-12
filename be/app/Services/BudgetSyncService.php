<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectBudget;
use App\Models\BudgetItem;
use App\Models\Cost;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BudgetSyncService
{
    /**
     * Đồng bộ lại toàn bộ dữ liệu budget cho một project
     * 
     * @param Project|int $project
     * @return array
     */
    public function syncProjectBudgets($project): array
    {
        if (is_int($project)) {
            $project = Project::find($project);
        }

        if (!$project) {
            return [
                'success' => false,
                'message' => 'Project not found',
            ];
        }

        $budgets = $project->budgets()->whereIn('status', ['approved', 'active', 'draft'])->get();
        
        if ($budgets->isEmpty()) {
            return [
                'success' => true,
                'message' => 'No approved budgets found',
                'updated' => 0,
            ];
        }

        $updatedBudgets = 0;
        $updatedItems = 0;

        try {
            DB::beginTransaction();

            foreach ($budgets as $budget) {
                $this->syncBudget($budget);
                $updatedBudgets++;
                $updatedItems += $budget->items()->count();
            }

            DB::commit();

            return [
                'success' => true,
                'message' => "Synced {$updatedBudgets} budgets and {$updatedItems} items",
                'updated_budgets' => $updatedBudgets,
                'updated_items' => $updatedItems,
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Error syncing budgets for project {$project->id}: " . $e->getMessage());
            
            return [
                'success' => false,
                'message' => 'Error syncing budgets: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Đồng bộ một budget cụ thể
     * 
     * @param ProjectBudget $budget
     * @return void
     */
    public function syncBudget(ProjectBudget $budget): void
    {
        $project = $budget->project;
        if (!$project) {
            return;
        }

        // Tính tổng actual cost từ tất cả costs đã approved
        $totalActualCost = Cost::where('project_id', $project->id)
            ->where('status', 'approved')
            ->sum('amount');

        // Cập nhật actual_cost và remaining_budget cho budget
        // Sử dụng number_format để chuyển sang string, tránh cảnh báo conversion sang decimal
        $actualCostStr = number_format((float) $totalActualCost, 2, '.', '');
        $budget->actual_cost = $actualCostStr;
        
        $totalBudget = (float) ($budget->total_budget ?? 0);
        $remainingBudgetStr = number_format($totalBudget - (float) $totalActualCost, 2, '.', '');
        $budget->remaining_budget = $remainingBudgetStr;
        $budget->save();

        // Cập nhật actual_amount cho từng budget item
        foreach ($budget->items as $item) {
            $this->syncBudgetItem($item, $project);
        }
    }

    /**
     * Đồng bộ một budget item cụ thể
     * 
     * @param BudgetItem $item
     * @param Project $project
     * @return void
     */
    public function syncBudgetItem(BudgetItem $item, Project $project): void
    {
        // 1. Precise match by budget_item_id
        $actualAmountExplicit = Cost::where('project_id', $project->id)
            ->where('budget_item_id', $item->id)
            ->where('status', 'approved')
            ->sum('amount');

        // 2. Fallback match by cost_group_id (if cost doesn't have an explicit budget_item_id)
        // Note: This matches the previous logic but tries to avoid double counting if an explicit ID exists
        $actualAmountFallback = 0;
        if ($item->cost_group_id) {
            // Find all costs for this project and cost group that are NOT explicitly assigned to ANY budget item
            // or are explicitly assigned to THIS item (already covered above)
             $actualAmountFallback = Cost::where('project_id', $project->id)
                ->where('cost_group_id', $item->cost_group_id)
                ->whereNull('budget_item_id')
                ->where('status', 'approved')
                ->sum('amount');
        }
        
        $actualAmount = (float)$actualAmountExplicit + (float)$actualAmountFallback;
        
        $item->actual_amount = number_format($actualAmount, 2, '.', '');
        $estimatedAmount = (float) ($item->estimated_amount ?? 0);
        $item->remaining_amount = number_format($estimatedAmount - $actualAmount, 2, '.', '');
        $item->save();
    }

    /**
     * Đồng bộ lại tất cả budgets cho tất cả projects
     * 
     * @return array
     */
    public function syncAllBudgets(): array
    {
        $projects = Project::all();
        $totalUpdated = 0;
        $errors = [];

        foreach ($projects as $project) {
            $result = $this->syncProjectBudgets($project);
            if ($result['success']) {
                $totalUpdated += $result['updated_budgets'] ?? 0;
            } else {
                $errors[] = "Project {$project->id}: {$result['message']}";
            }
        }

        return [
            'success' => true,
            'total_updated' => $totalUpdated,
            'errors' => $errors,
        ];
    }
}
