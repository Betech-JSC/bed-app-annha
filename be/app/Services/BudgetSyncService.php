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

        $budgets = $project->budgets()->where('status', 'approved')->get();
        
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
        $budget->actual_cost = (float) $totalActualCost;
        $budget->remaining_budget = max(0, $budget->total_budget - $budget->actual_cost);
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
        if ($item->cost_group_id) {
            // Tính tổng actual amount từ các costs đã approved có cùng cost_group_id
            $actualAmount = Cost::where('project_id', $project->id)
                ->where('cost_group_id', $item->cost_group_id)
                ->where('status', 'approved')
                ->sum('amount');
            
            $item->actual_amount = (float) $actualAmount;
            $item->remaining_amount = max(0, $item->estimated_amount - $item->actual_amount);
            $item->save();
        } else {
            // Nếu không có cost_group_id, có thể là chi phí khác
            // Tạm thời set actual_amount = 0 hoặc có thể cải thiện logic sau
            $item->actual_amount = 0;
            $item->remaining_amount = $item->estimated_amount;
            $item->save();
        }
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
