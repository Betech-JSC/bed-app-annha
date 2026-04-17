<?php

namespace App\Services;

use App\Models\ProjectBudget;
use App\Models\BudgetItem;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Exception;

class ProjectBudgetService
{
    protected $syncService;

    public function __construct(BudgetSyncService $syncService)
    {
        $this->syncService = $syncService;
    }

    /**
     * Create or update a project budget
     */
    public function upsert(array $data, ?ProjectBudget $budget = null, $user = null): ProjectBudget
    {
        return DB::transaction(function () use ($data, $budget, $user) {
            $isNew = !$budget;
            $project = Project::findOrFail($data['project_id']);

            // Verify status if updating
            if (!$isNew && in_array($budget->status, ['pending_approval', 'approved', 'archived'])) {
                throw new Exception('Không thể cập nhật ngân sách đang chờ duyệt, đã được duyệt hoặc đã lưu trữ.');
            }

            // Prepare budget data
            $budgetData = [
                'project_id' => $project->id,
                'name'              => $data['name'],
                'version'           => $data['version'] ?? ($isNew ? '1.0' : $budget->version),
                'budget_date'       => $data['budget_date'],
                'notes'             => $data['notes'] ?? null,
                'status'            => $data['status'] ?? ($isNew ? 'draft' : $budget->status),
                'contract_value'    => $data['contract_value'] ?? null,
                'profit_percentage' => $data['profit_percentage'] ?? null,
                'profit_amount'     => $data['profit_amount'] ?? null,
            ];

            if ($isNew) {
                $budgetData['created_by'] = $user->id ?? null;
                $budget = ProjectBudget::create($budgetData);
            } else {
                $budget->update($budgetData);
            }

            // Handle items
            if (isset($data['items']) && is_array($data['items'])) {
                // Delete existing items if updating
                if (!$isNew) {
                    $budget->items()->delete();
                }

                $totalBudget = 0;
                foreach ($data['items'] as $index => $itemData) {
                    BudgetItem::create([
                        'budget_id'        => $budget->id,
                        'cost_group_id'    => $itemData['cost_group_id'] ?? null,
                        'percentage'       => $itemData['percentage'] ?? null,
                        'name'             => $itemData['name'],
                        'description'      => $itemData['description'] ?? null,
                        'estimated_amount' => $itemData['estimated_amount'],
                        'remaining_amount' => $itemData['estimated_amount'], // Reset remaining for new/updated items
                        'quantity'         => $itemData['quantity'] ?? 1,
                        'unit_price'       => $itemData['unit_price'] ?? $itemData['estimated_amount'],
                        'order'            => $itemData['order'] ?? $index,
                    ]);
                    $totalBudget += (float) $itemData['estimated_amount'];
                }

                // Update budget totals
                $budget->update([
                    'total_budget'     => $totalBudget,
                    'estimated_cost'   => $totalBudget,
                    'remaining_budget' => $totalBudget,
                ]);
            }

            // Always sync after upsert
            $this->syncService->syncBudget($budget);

            return $budget->load(['items.costGroup', 'creator', 'approver']);
        });
    }

    /**
     * Submit budget for approval
     */
    public function submit(ProjectBudget $budget): bool
    {
        if ($budget->status !== 'draft' && $budget->status !== 'rejected') {
            throw new Exception('Chỉ có thể gửi duyệt ngân sách ở trạng thái Nháp hoặc Bị từ chối.');
        }

        if ($budget->items()->count() === 0) {
            throw new Exception('Ngân sách phải có ít nhất 1 hạng mục trước khi gửi duyệt.');
        }

        return $budget->update(['status' => 'pending_approval']);
    }

    /**
     * Approve budget
     */
    public function approve(ProjectBudget $budget, $user): bool
    {
        if ($budget->status !== 'pending_approval') {
            throw new Exception('Chỉ có thể duyệt ngân sách ở trạng thái Chờ duyệt.');
        }

        return $budget->update([
            'status'      => 'approved',
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);
    }

    /**
     * Reject budget
     */
    public function reject(ProjectBudget $budget, string $reason, $user): bool
    {
        if ($budget->status !== 'pending_approval') {
            throw new Exception('Chỉ có thể từ chối ngân sách ở trạng thái Chờ duyệt.');
        }

        $notes = $budget->notes ?: '';
        $newNote = "[Từ chối] " . $reason . " - " . ($user->name ?? 'N/A') . " (" . now()->format('d/m/Y H:i') . ")";
        $notes = ($notes ? $notes . "\n" : '') . $newNote;

        return $budget->update([
            'status'      => 'rejected',
            'notes'       => $notes,
            'approved_by' => null,
            'approved_at' => null,
        ]);
    }

    /**
     * Revert budget to draft (Hoàn duyệt)
     */
    public function revertToDraft(ProjectBudget $budget): bool
    {
        if (!in_array($budget->status, ['pending_approval', 'approved', 'rejected'])) {
            throw new Exception('Chỉ có thể hoàn duyệt ngân sách đang chờ duyệt, đã duyệt hoặc bị từ chối.');
        }

        return $budget->update([
            'status'      => 'draft',
            'approved_by' => null,
            'approved_at' => null,
        ]);
    }

    /**
     * Activate budget
     */
    public function activate(ProjectBudget $budget): bool
    {
        if ($budget->status !== 'approved') {
            throw new Exception('Chỉ có thể áp dụng ngân sách đã được duyệt.');
        }

        return DB::transaction(function () use ($budget) {
            // Optional: Archive other active budgets for the same project?
            // ProjectBudget::where('project_id', $budget->project_id)
            //     ->where('status', 'active')
            //     ->update(['status' => 'archived']);

            $this->syncService->syncBudget($budget);
            return $budget->update(['status' => 'active']);
        });
    }

    /**
     * Archive budget
     */
    public function archive(ProjectBudget $budget): bool
    {
        if ($budget->status !== 'active') {
            throw new Exception('Chỉ có thể lưu trữ ngân sách đang áp dụng.');
        }

        return $budget->update(['status' => 'archived']);
    }

    /**
     * Delete budget
     */
    public function delete(ProjectBudget $budget): bool
    {
        if ($budget->status === 'approved' || $budget->status === 'active' || $budget->status === 'archived') {
            throw new Exception('Không thể xóa ngân sách đã được duyệt, đang áp dụng hoặc đã lưu trữ.');
        }

        return $budget->delete();
    }
}
