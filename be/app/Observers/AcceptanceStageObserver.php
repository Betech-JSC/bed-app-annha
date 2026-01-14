<?php

namespace App\Observers;

use App\Models\AcceptanceStage;
use App\Models\Notification;
use App\Services\NotificationService;

class AcceptanceStageObserver
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Handle the AcceptanceStage "created" event.
     */
    public function created(AcceptanceStage $acceptanceStage): void
    {
        // Notify khi acceptance stage mới được tạo và cần approval
        if ($acceptanceStage->status === 'pending') {
            $projectName = $acceptanceStage->project ? $acceptanceStage->project->name : 'N/A';
            $title = "Yêu cầu duyệt nghiệm thu";
            $body = "Có giai đoạn nghiệm thu mới '{$acceptanceStage->name}' cần duyệt trong dự án '{$projectName}'";

            // Notify supervisors
            $this->notificationService->sendToProjectTeam(
                $acceptanceStage->project_id,
                Notification::TYPE_WORKFLOW,
                Notification::CATEGORY_WORKFLOW_APPROVAL,
                $title,
                $body,
                [
                    'stage_id' => $acceptanceStage->id,
                    'stage_name' => $acceptanceStage->name,
                    'project_id' => $acceptanceStage->project_id,
                ],
                Notification::PRIORITY_HIGH,
                "/projects/{$acceptanceStage->project_id}/acceptance",
                true
            );
        }
    }

    /**
     * Handle the AcceptanceStage "updated" event.
     */
    public function updated(AcceptanceStage $acceptanceStage): void
    {
        // Notify khi status thay đổi trong workflow
        if ($acceptanceStage->wasChanged('status')) {
            $oldStatus = $acceptanceStage->getOriginal('status');
            $newStatus = $acceptanceStage->status;

            // Khi supervisor approve, notify project manager
            if ($oldStatus === 'pending' && $newStatus === 'supervisor_approved') {
                $title = "Yêu cầu duyệt nghiệm thu";
                $body = "Giai đoạn nghiệm thu '{$acceptanceStage->name}' đã được giám sát duyệt, cần quản lý dự án duyệt";

                if ($acceptanceStage->project && $acceptanceStage->project->project_manager_id) {
                    $this->notificationService->notifyWorkflowApproval(
                        $acceptanceStage->project->project_manager_id,
                        'Nghiệm thu',
                        $acceptanceStage->name,
                        $acceptanceStage->project_id
                    );
                }
            }

            // Khi project manager approve, notify customer
            if ($oldStatus === 'supervisor_approved' && $newStatus === 'project_manager_approved') {
                $title = "Yêu cầu duyệt nghiệm thu";
                $body = "Giai đoạn nghiệm thu '{$acceptanceStage->name}' đã được quản lý dự án duyệt, cần khách hàng duyệt";

                if ($acceptanceStage->project->customer_id) {
                    $this->notificationService->notifyWorkflowApproval(
                        $acceptanceStage->project->customer_id,
                        'Nghiệm thu',
                        $acceptanceStage->name,
                        $acceptanceStage->project_id
                    );
                }
            }

            // Notify team khi được customer approve
            if ($oldStatus !== 'customer_approved' && $newStatus === 'customer_approved') {
                $title = "Nghiệm thu đã được duyệt";
                $body = "Giai đoạn nghiệm thu '{$acceptanceStage->name}' đã được khách hàng duyệt";

                $this->notificationService->sendToProjectTeam(
                    $acceptanceStage->project_id,
                    Notification::TYPE_SYSTEM,
                    Notification::CATEGORY_STATUS_CHANGE,
                    $title,
                    $body,
                    [
                        'stage_id' => $acceptanceStage->id,
                        'stage_name' => $acceptanceStage->name,
                        'project_id' => $acceptanceStage->project_id,
                    ],
                    Notification::PRIORITY_MEDIUM,
                    "/projects/{$acceptanceStage->project_id}/acceptance",
                    true
                );
            }
        }
    }
}
