<?php

namespace App\Observers;

use App\Models\ChangeRequest;
use App\Models\Notification;
use App\Services\NotificationService;

class ChangeRequestObserver
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Handle the ChangeRequest "created" event.
     */
    public function created(ChangeRequest $changeRequest): void
    {
        // Notify khi change request mới được tạo
        $projectName = $changeRequest->project ? $changeRequest->project->name : 'N/A';
        $title = "Yêu cầu thay đổi mới";
        $body = "Có yêu cầu thay đổi mới '{$changeRequest->title}' trong dự án '{$projectName}'";

        $this->notificationService->sendToProjectTeam(
            $changeRequest->project_id,
            Notification::TYPE_WORKFLOW,
            Notification::CATEGORY_PENDING_APPROVALS,
            $title,
            $body,
            [
                'change_request_id' => $changeRequest->id,
                'change_request_title' => $changeRequest->title,
                'project_id' => $changeRequest->project_id,
                'change_type' => $changeRequest->change_type,
                'priority' => $changeRequest->priority,
            ],
            $changeRequest->priority === 'high' ? Notification::PRIORITY_HIGH : Notification::PRIORITY_MEDIUM,
            "/projects/{$changeRequest->project_id}",
            true,
            [$changeRequest->requested_by] // Exclude requester
        );
    }

    /**
     * Handle the ChangeRequest "updated" event.
     */
    public function updated(ChangeRequest $changeRequest): void
    {
        // Notify khi status thay đổi
        if ($changeRequest->wasChanged('status')) {
            $oldStatus = $changeRequest->getOriginal('status');
            $newStatus = $changeRequest->status;

            $title = "Trạng thái yêu cầu thay đổi đã cập nhật";
            $body = "Yêu cầu thay đổi '{$changeRequest->title}' đã chuyển từ '{$oldStatus}' sang '{$newStatus}'";

            $userIds = [];
            if ($changeRequest->requested_by) {
                $userIds[] = $changeRequest->requested_by;
            }
            if ($changeRequest->reviewed_by) {
                $userIds[] = $changeRequest->reviewed_by;
            }
            if ($changeRequest->approved_by) {
                $userIds[] = $changeRequest->approved_by;
            }
            if ($changeRequest->project && $changeRequest->project->project_manager_id) {
                $userIds[] = $changeRequest->project->project_manager_id;
            }

            if (!empty($userIds)) {
                $this->notificationService->sendToUsers(
                    array_unique($userIds),
                    Notification::TYPE_SYSTEM,
                    Notification::CATEGORY_STATUS_CHANGE,
                    $title,
                    $body,
                    [
                        'change_request_id' => $changeRequest->id,
                        'change_request_title' => $changeRequest->title,
                        'project_id' => $changeRequest->project_id,
                        'old_status' => $oldStatus,
                        'new_status' => $newStatus,
                    ],
                    Notification::PRIORITY_MEDIUM,
                    "/projects/{$changeRequest->project_id}",
                    ChangeRequest::class,
                    $changeRequest->id,
                    true
                );
            }
        }
    }
}
