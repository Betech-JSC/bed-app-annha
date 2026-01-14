<?php

namespace App\Observers;

use App\Models\Defect;
use App\Models\Notification;
use App\Services\NotificationService;

class DefectObserver
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Handle the Defect "created" event.
     */
    public function created(Defect $defect): void
    {
        // Notify project team khi có defect mới
        $projectName = $defect->project ? $defect->project->name : 'N/A';
        $title = "Lỗi mới được ghi nhận";
        $body = "Có lỗi mới được ghi nhận trong dự án '{$projectName}'";

        $this->notificationService->sendToProjectTeam(
            $defect->project_id,
            Notification::TYPE_PROJECT_PERFORMANCE,
            Notification::CATEGORY_HIGH_DEFECTS,
            $title,
            $body,
            [
                'defect_id' => $defect->id,
                'project_id' => $defect->project_id,
                'severity' => $defect->severity,
                'description' => $defect->description,
            ],
            $defect->severity === 'critical' ? Notification::PRIORITY_URGENT : Notification::PRIORITY_HIGH,
            "/projects/{$defect->project_id}/defects/{$defect->id}",
            true,
            [$defect->reported_by] // Exclude reporter
        );
    }

    /**
     * Handle the Defect "updated" event.
     */
    public function updated(Defect $defect): void
    {
        // Notify khi status thay đổi
        if ($defect->wasChanged('status')) {
            $oldStatus = $defect->getOriginal('status');
            $newStatus = $defect->status;
            $projectName = $defect->project ? $defect->project->name : 'N/A';

            $title = "Trạng thái lỗi đã thay đổi";
            $body = "Lỗi trong dự án '{$projectName}' đã chuyển từ '{$oldStatus}' sang '{$newStatus}'";

            $userIds = [];
            if ($defect->reported_by) {
                $userIds[] = $defect->reported_by;
            }
            if ($defect->fixed_by) {
                $userIds[] = $defect->fixed_by;
            }
            if ($defect->project && $defect->project->project_manager_id) {
                $userIds[] = $defect->project->project_manager_id;
            }

            if (!empty($userIds)) {
                $this->notificationService->sendToUsers(
                    array_unique($userIds),
                    Notification::TYPE_SYSTEM,
                    Notification::CATEGORY_STATUS_CHANGE,
                    $title,
                    $body,
                    [
                        'defect_id' => $defect->id,
                        'project_id' => $defect->project_id,
                        'old_status' => $oldStatus,
                        'new_status' => $newStatus,
                    ],
                    Notification::PRIORITY_MEDIUM,
                    "/projects/{$defect->project_id}/defects/{$defect->id}",
                    Defect::class,
                    $defect->id,
                    true
                );
            }
        }
    }
}
