<?php

namespace App\Observers;

use App\Models\Cost;
use App\Models\Notification;
use App\Services\NotificationService;

class CostObserver
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Handle the Cost "updated" event.
     */
    public function updated(Cost $cost): void
    {
        // Notify khi cost được submit để duyệt
        if ($cost->wasChanged('status')) {
            $oldStatus = $cost->getOriginal('status');
            $newStatus = $cost->status;

            // Khi submit để duyệt
            if ($oldStatus === 'draft' && $newStatus === 'pending_management_approval') {
                if ($cost->project_id) {
                    $projectName = $cost->project ? $cost->project->name : 'N/A';
                    $title = "Yêu cầu duyệt chi phí";
                    $body = "Có chi phí mới cần duyệt trong dự án '{$projectName}'";

                    // Notify management team
                    $this->notificationService->sendToPermissionUsers(
                        \App\Constants\Permissions::COST_APPROVE_MANAGEMENT,
                        $cost->project_id,
                        Notification::TYPE_WORKFLOW,
                        Notification::CATEGORY_WORKFLOW_APPROVAL,
                        $title,
                        $body,
                        [
                            'cost_id' => $cost->id,
                            'project_id' => $cost->project_id,
                            'amount' => $cost->amount,
                            'category' => $cost->category_label,
                        ],
                        Notification::PRIORITY_HIGH,
                        "/projects/{$cost->project_id}/costs/{$cost->id}",
                        true,
                        [$cost->created_by] // Exclude creator
                    );
                }
            }

            // Khi management đã duyệt, notify accountant
            if ($oldStatus === 'pending_management_approval' && $newStatus === 'pending_accountant_approval') {
                if ($cost->project_id) {
                    $projectName = $cost->project ? $cost->project->name : 'N/A';
                    $title = "Yêu cầu xác nhận chi phí";
                    $body = "Chi phí trong dự án '{$projectName}' đã được ban điều hành duyệt, cần xác nhận";

                    // Notify accountants
                    $this->notificationService->sendToPermissionUsers(
                        \App\Constants\Permissions::COST_APPROVE_ACCOUNTANT,
                        $cost->project_id,
                        Notification::TYPE_WORKFLOW,
                        Notification::CATEGORY_WORKFLOW_APPROVAL,
                        $title,
                        $body,
                        [
                            'workflow_type' => 'Chi phí',
                            'item_name' => "Chi phí #{$cost->id}",
                            'cost_id' => $cost->id,
                            'project_id' => $cost->project_id,
                        ],
                        Notification::PRIORITY_HIGH,
                        "/projects/{$cost->project_id}/costs/{$cost->id}",
                        true
                    );
                }
            }

            // Khi cost được approve, có thể kiểm tra budget overrun
            // Chỉ check một lần khi chuyển sang approved
            if ($oldStatus !== 'approved' && $newStatus === 'approved') {
                $this->checkBudgetOverrun($cost);

                // Notify Team (Informational) — only for project costs
                if ($cost->project_id) {
                    $projectName = $cost->project ? $cost->project->name : 'N/A';
                    $title = "Chi phí đã được duyệt";
                    $body = "Chi phí '{$cost->description}' (Amount: " . number_format($cost->amount) . ") trong dự án '{$projectName}' đã được duyệt.";
                    
                    $this->notificationService->sendToProjectTeam(
                        $cost->project_id,
                        Notification::TYPE_SYSTEM,
                        Notification::CATEGORY_STATUS_CHANGE,
                        $title,
                        $body,
                        ['cost_id' => $cost->id, 'project_id' => $cost->project_id],
                        Notification::PRIORITY_MEDIUM,
                        "/projects/{$cost->project_id}/costs/{$cost->id}",
                        true
                    );
                }
            }

            if ($oldStatus !== 'rejected' && $newStatus === 'rejected') {
                // Notify Team when rejected — only for project costs
                if ($cost->project_id) {
                    $projectName = $cost->project ? $cost->project->name : 'N/A';
                    $title = "Chi phí bị từ chối";
                    $body = "Chi phí '{$cost->description}' trong dự án '{$projectName}' đã bị từ chối.";
                    
                    $this->notificationService->sendToProjectTeam(
                        $cost->project_id,
                        Notification::TYPE_SYSTEM,
                        Notification::CATEGORY_STATUS_CHANGE,
                        $title,
                        $body,
                        ['cost_id' => $cost->id, 'project_id' => $cost->project_id],
                        Notification::PRIORITY_MEDIUM,
                        "/projects/{$cost->project_id}/costs/{$cost->id}",
                        true
                    );
                }
            }
        }
    }

    /**
     * Kiểm tra budget overrun khi cost được approve
     */
    protected function checkBudgetOverrun(Cost $cost): void
    {
        if (!$cost->project) {
            return;
        }

        $project = $cost->project;
        $budgets = $project->budgets;

        foreach ($budgets as $budget) {
            $totalApprovedCosts = $project->costs()
                ->where('status', 'approved')
                ->where('cost_date', '>=', $budget->budget_date)
                ->sum('amount');

            $overrunAmount = $totalApprovedCosts - $budget->total_amount;
            $overrunPercentage = $budget->total_amount > 0
                ? ($overrunAmount / $budget->total_amount) * 100
                : 0;

            // Nếu vượt quá 5% ngân sách và chưa có notification tương tự trong 24h qua
            if ($overrunPercentage > 5) {
                $recentNotification = \App\Models\Notification::where('user_id', $project->project_manager_id ?? $project->customer_id)
                    ->where('type', \App\Models\Notification::TYPE_PROJECT_PERFORMANCE)
                    ->where('category', \App\Models\Notification::CATEGORY_BUDGET_OVERRUN)
                    ->whereJsonContains('data->project_id', $project->id)
                    ->where('created_at', '>=', now()->subHours(24))
                    ->exists();

                if (!$recentNotification) {
                    $this->notificationService->notifyBudgetOverrun($project, $overrunAmount, $overrunPercentage);
                }
            }
        }
    }
}
