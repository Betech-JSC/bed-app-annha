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
                            'item_type' => 'project_cost',
                            'item_id' => $cost->id,
                        ],
                        Notification::PRIORITY_HIGH,
                        '/approvals',
                        true,
                        [$cost->created_by]
                    );
                } else {
                    // Company cost — notify global management
                    $this->notificationService->sendToPermissionUsers(
                        \App\Constants\Permissions::COST_APPROVE_MANAGEMENT,
                        null,
                        Notification::TYPE_WORKFLOW,
                        Notification::CATEGORY_WORKFLOW_APPROVAL,
                        "Yêu cầu duyệt chi phí công ty",
                        "Chi phí công ty '{$cost->name}' (" . number_format($cost->amount) . " VND) cần BĐH duyệt.",
                        [
                            'cost_id' => $cost->id,
                            'amount' => $cost->amount,
                            'cost_name' => $cost->name,
                            'item_type' => 'company_cost',
                            'item_id' => $cost->id,
                        ],
                        Notification::PRIORITY_HIGH,
                        '/approvals',
                        true,
                        [$cost->created_by]
                    );
                }
            }

            // Khi management đã duyệt, notify accountant
            if ($oldStatus === 'pending_management_approval' && $newStatus === 'pending_accountant_approval') {
                if ($cost->project_id) {
                    $projectName = $cost->project ? $cost->project->name : 'N/A';

                    $this->notificationService->sendToPermissionUsers(
                        \App\Constants\Permissions::COST_APPROVE_ACCOUNTANT,
                        $cost->project_id,
                        Notification::TYPE_WORKFLOW,
                        Notification::CATEGORY_WORKFLOW_APPROVAL,
                        "Yêu cầu xác nhận chi phí",
                        "Chi phí trong dự án '{$projectName}' đã được BĐH duyệt, cần KT xác nhận.",
                        [
                            'cost_id' => $cost->id,
                            'project_id' => $cost->project_id,
                            'item_type' => 'project_cost',
                            'item_id' => $cost->id,
                        ],
                        Notification::PRIORITY_HIGH,
                        '/approvals',
                        true
                    );
                } else {
                    // Company cost → notify accountants globally
                    $this->notificationService->sendToPermissionUsers(
                        \App\Constants\Permissions::COST_APPROVE_ACCOUNTANT,
                        null,
                        Notification::TYPE_WORKFLOW,
                        Notification::CATEGORY_WORKFLOW_APPROVAL,
                        "Yêu cầu xác nhận chi phí công ty",
                        "Chi phí công ty '{$cost->name}' (" . number_format($cost->amount) . " VND) đã được BĐH duyệt, cần KT xác nhận.",
                        [
                            'cost_id' => $cost->id,
                            'amount' => $cost->amount,
                            'item_type' => 'company_cost',
                            'item_id' => $cost->id,
                        ],
                        Notification::PRIORITY_HIGH,
                        '/approvals',
                        true
                    );
                }
            }

            // Khi cost được approve
            if ($oldStatus !== 'approved' && $newStatus === 'approved') {
                $this->checkBudgetOverrun($cost);

                if ($cost->project_id) {
                    $projectName = $cost->project ? $cost->project->name : 'N/A';
                    $this->notificationService->sendToProjectTeam(
                        $cost->project_id,
                        Notification::TYPE_SYSTEM,
                        Notification::CATEGORY_STATUS_CHANGE,
                        "Chi phí đã được duyệt",
                        "Chi phí '{$cost->name}' (" . number_format($cost->amount) . " VND) trong dự án '{$projectName}' đã được duyệt.",
                        ['cost_id' => $cost->id, 'project_id' => $cost->project_id],
                        Notification::PRIORITY_MEDIUM,
                        "/projects/{$cost->project_id}/costs/{$cost->id}",
                        true
                    );
                } else {
                    // Notify creator of company cost
                    if ($cost->created_by) {
                        $this->notificationService->sendToUser(
                            $cost->created_by,
                            Notification::TYPE_SYSTEM,
                            Notification::CATEGORY_STATUS_CHANGE,
                            "Chi phí công ty đã được duyệt",
                            "Chi phí '{$cost->name}' (" . number_format($cost->amount) . " VND) đã được KT xác nhận.",
                            ['cost_id' => $cost->id],
                            Notification::PRIORITY_MEDIUM,
                            "/company-costs/{$cost->id}"
                        );
                    }
                }
            }

            if ($oldStatus !== 'rejected' && $newStatus === 'rejected') {
                if ($cost->project_id) {
                    $projectName = $cost->project ? $cost->project->name : 'N/A';
                    $this->notificationService->sendToProjectTeam(
                        $cost->project_id,
                        Notification::TYPE_SYSTEM,
                        Notification::CATEGORY_STATUS_CHANGE,
                        "Chi phí bị từ chối",
                        "Chi phí '{$cost->name}' trong dự án '{$projectName}' đã bị từ chối.",
                        ['cost_id' => $cost->id, 'project_id' => $cost->project_id],
                        Notification::PRIORITY_MEDIUM,
                        "/projects/{$cost->project_id}/costs/{$cost->id}",
                        true
                    );
                } else {
                    // Notify creator of rejected company cost
                    if ($cost->created_by) {
                        $this->notificationService->sendToUser(
                            $cost->created_by,
                            Notification::TYPE_SYSTEM,
                            Notification::CATEGORY_STATUS_CHANGE,
                            "Chi phí công ty bị từ chối",
                            "Chi phí '{$cost->name}' (" . number_format($cost->amount) . " VND) đã bị từ chối." . ($cost->rejected_reason ? " Lý do: {$cost->rejected_reason}" : ''),
                            ['cost_id' => $cost->id],
                            Notification::PRIORITY_HIGH,
                            "/company-costs/{$cost->id}"
                        );
                    }
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
