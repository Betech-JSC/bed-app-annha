<?php

namespace App\Observers;

use App\Models\ProjectPersonnel;
use App\Models\Notification;
use App\Services\NotificationService;

class ProjectPersonnelObserver
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Handle the ProjectPersonnel "created" event.
     */
    public function created(ProjectPersonnel $projectPersonnel): void
    {
        // Notify user khi được assign vào project
        if ($projectPersonnel->user_id && $projectPersonnel->project) {
            $this->notificationService->notifyUserAssigned(
                $projectPersonnel->user_id,
                $projectPersonnel->project,
                $projectPersonnel->role
            );
        }
    }

    /**
     * Handle the ProjectPersonnel "updated" event.
     */
    public function updated(ProjectPersonnel $projectPersonnel): void
    {
        // Notify khi role thay đổi
        if ($projectPersonnel->wasChanged('role') && $projectPersonnel->user_id && $projectPersonnel->project) {
            $oldRole = $projectPersonnel->getOriginal('role');
            $newRole = $projectPersonnel->role;

            $title = "Vai trò trong dự án đã thay đổi";
            $body = "Vai trò của bạn trong dự án '{$projectPersonnel->project->name}' đã chuyển từ '{$oldRole}' sang '{$newRole}'";

            $this->notificationService->sendToUser(
                $projectPersonnel->user_id,
                Notification::TYPE_SYSTEM,
                Notification::CATEGORY_STATUS_CHANGE,
                $title,
                $body,
                [
                    'project_id' => $projectPersonnel->project_id,
                    'project_name' => $projectPersonnel->project->name,
                    'old_role' => $oldRole,
                    'new_role' => $newRole,
                ],
                Notification::PRIORITY_LOW,
                "/projects/{$projectPersonnel->project_id}",
                \App\Models\Project::class,
                $projectPersonnel->project_id,
                true
            );
        }
    }
}
