<?php

namespace App\Observers;

use App\Models\AdditionalCost;
use App\Models\Notification;
use App\Services\NotificationService;
use App\Constants\Permissions;

class AdditionalCostObserver
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Handle the AdditionalCost "created" event.
     */
    public function created(AdditionalCost $additionalCost): void
    {
        // Notify khi additional cost mới được tạo
        if ($additionalCost->project_id) {
            $projectName = $additionalCost->project ? $additionalCost->project->name : 'N/A';
            $title = "Đề xuất chi phí phát sinh mới"; // New Additional Cost Proposal
            $body = "Có đề xuất chi phí phát sinh mới '{$additionalCost->description}' trong dự án '{$projectName}'";

            // 1. Notify Approvers (Actionable) - Assuming PM handles this or specific permission
            // Using ADDITIONAL_COST_APPROVE permission
            $this->notificationService->sendToPermissionUsers(
                Permissions::ADDITIONAL_COST_APPROVE,
                $additionalCost->project_id,
                Notification::TYPE_WORKFLOW,
                Notification::CATEGORY_WORKFLOW_APPROVAL,
                $title,
                $body,
                [
                    'cost_id' => $additionalCost->id,
                    'project_id' => $additionalCost->project_id,
                    'amount' => $additionalCost->amount,
                ],
                Notification::PRIORITY_HIGH,
                "/projects/{$additionalCost->project_id}/additional-costs/{$additionalCost->id}",
                true,
                [$additionalCost->proposed_by] // Exclude proposer
            );

            // 2. Notify Project Team (Informational) - New requirement: "All related accounts receive notification"
            // This informs everyone that a new cost has been proposed.
            $this->notificationService->sendToProjectTeam(
                $additionalCost->project_id,
                Notification::TYPE_SYSTEM,
                Notification::CATEGORY_NEW_ITEM,
                $title,
                $body,
                [
                    'cost_id' => $additionalCost->id,
                    'project_id' => $additionalCost->project_id,
                    'amount' => $additionalCost->amount,
                ],
                Notification::PRIORITY_MEDIUM, // Lower priority for team
                "/projects/{$additionalCost->project_id}/additional-costs/{$additionalCost->id}",
                true,
                [$additionalCost->proposed_by] // Exclude proposer
            );
        }
    }

    /**
     * Handle the AdditionalCost "updated" event.
     */
    public function updated(AdditionalCost $additionalCost): void
    {
        if ($additionalCost->wasChanged('status')) {
            $oldStatus = $additionalCost->getOriginal('status');
            $newStatus = $additionalCost->status;
            $projectName = $additionalCost->project ? $additionalCost->project->name : 'N/A';

            // Status handling
            // 1. Approved (pending_approval -> approved)
            if ($newStatus === 'approved') {
                $title = "Chi phí phát sinh đã được duyệt";
                $body = "Chi phí phát sinh '{$additionalCost->description}' trong dự án '{$projectName}' đã được duyệt.";
                
                // Notify Team
                $this->notificationService->sendToProjectTeam(
                    $additionalCost->project_id,
                    Notification::TYPE_SYSTEM,
                    Notification::CATEGORY_STATUS_CHANGE,
                    $title,
                    $body,
                    ['cost_id' => $additionalCost->id, 'project_id' => $additionalCost->project_id],
                    Notification::PRIORITY_MEDIUM,
                    "/projects/{$additionalCost->project_id}/additional-costs/{$additionalCost->id}",
                    true
                );
            }

            // 2. Rejected
            if ($newStatus === 'rejected') {
                $title = "Chi phí phát sinh bị từ chối";
                $body = "Chi phí phát sinh '{$additionalCost->description}' trong dự án '{$projectName}' đã bị từ chối.";

                // Notify Team
                $this->notificationService->sendToProjectTeam(
                    $additionalCost->project_id,
                    Notification::TYPE_SYSTEM,
                    Notification::CATEGORY_STATUS_CHANGE,
                    $title,
                    $body,
                    ['cost_id' => $additionalCost->id, 'project_id' => $additionalCost->project_id],
                    Notification::PRIORITY_MEDIUM,
                    "/projects/{$additionalCost->project_id}/additional-costs/{$additionalCost->id}",
                    true
                );
            }

            // 3. Customer Paid (pending -> customer_paid)
            if ($newStatus === 'customer_paid') {
                $title = "Khách hàng đã thanh toán chi phí phát sinh";
                $body = "Khách hàng đã thanh toán cho chi phí phát sinh '{$additionalCost->description}' trong dự án '{$projectName}'. Cần xác nhận.";

                // Notify Accountant (Actionable)
                $this->notificationService->sendToPermissionUsers(
                    Permissions::ADDITIONAL_COST_CONFIRM,
                    $additionalCost->project_id,
                    Notification::TYPE_WORKFLOW,
                    Notification::CATEGORY_WORKFLOW_APPROVAL,
                    $title,
                    $body,
                    ['cost_id' => $additionalCost->id, 'project_id' => $additionalCost->project_id],
                    Notification::PRIORITY_HIGH,
                    "/projects/{$additionalCost->project_id}/additional-costs/{$additionalCost->id}",
                    true
                );

                // Notify Team (Informational)
                $this->notificationService->sendToProjectTeam(
                    $additionalCost->project_id,
                    Notification::TYPE_SYSTEM,
                    Notification::CATEGORY_STATUS_CHANGE,
                    $title,
                    $body,
                    ['cost_id' => $additionalCost->id, 'project_id' => $additionalCost->project_id],
                    Notification::PRIORITY_MEDIUM,
                    "/projects/{$additionalCost->project_id}/additional-costs/{$additionalCost->id}",
                    true
                );
            }

            // 4. Confirmed (customer_paid -> confirmed)
            if ($newStatus === 'confirmed') {
                $title = "Đã xác nhận thanh toán chi phí phát sinh";
                $body = "Chi phí phát sinh '{$additionalCost->description}' trong dự án '{$projectName}' đã được kế toán xác nhận.";

                // Notify Team
                $this->notificationService->sendToProjectTeam(
                    $additionalCost->project_id,
                    Notification::TYPE_SYSTEM,
                    Notification::CATEGORY_STATUS_CHANGE,
                    $title,
                    $body,
                    ['cost_id' => $additionalCost->id, 'project_id' => $additionalCost->project_id],
                    Notification::PRIORITY_MEDIUM,
                    "/projects/{$additionalCost->project_id}/additional-costs/{$additionalCost->id}",
                    true
                );
            }
        }
    }
}
