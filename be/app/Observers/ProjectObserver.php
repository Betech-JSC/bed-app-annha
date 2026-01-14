<?php

namespace App\Observers;

use App\Models\Project;
use App\Models\Notification;
use App\Services\NotificationService;
use Carbon\Carbon;

class ProjectObserver
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Handle the Project "updated" event.
     */
    public function updated(Project $project): void
    {
        // Notify khi status thay đổi
        if ($project->wasChanged('status')) {
            $oldStatus = $project->getOriginal('status');
            $newStatus = $project->status;

            $title = "Trạng thái dự án đã thay đổi";
            $body = "Dự án '{$project->name}' đã chuyển từ '{$oldStatus}' sang '{$newStatus}'";

            $this->notificationService->sendToProjectTeam(
                $project->id,
                Notification::TYPE_SYSTEM,
                Notification::CATEGORY_STATUS_CHANGE,
                $title,
                $body,
                [
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                ],
                Notification::PRIORITY_MEDIUM,
                "/projects/{$project->id}",
                true
            );
        }

        // Notify khi deadline sắp đến (7 ngày, 3 ngày, 1 ngày) - chỉ khi end_date thay đổi
        if ($project->wasChanged('end_date')) {
            $this->checkDeadlineApproaching($project);
        }
    }

    /**
     * Kiểm tra và notify nếu deadline sắp đến
     */
    protected function checkDeadlineApproaching(Project $project): void
    {
        if (!$project->end_date) {
            return;
        }

        $daysRemaining = now()->diffInDays($project->end_date, false);

        // Chỉ notify khi còn 7, 3, hoặc 1 ngày và chưa có notification tương tự trong 12h qua
        if ($daysRemaining >= 0 && in_array($daysRemaining, [7, 3, 1])) {
            $recentNotification = \App\Models\Notification::where('user_id', $project->project_manager_id ?? $project->customer_id)
                ->where('type', \App\Models\Notification::TYPE_PROJECT_PERFORMANCE)
                ->where('category', \App\Models\Notification::CATEGORY_DEADLINE)
                ->whereJsonContains('data->project_id', $project->id)
                ->whereJsonContains('data->days_remaining', $daysRemaining)
                ->where('created_at', '>=', now()->subHours(12))
                ->exists();

            if (!$recentNotification) {
                $this->notificationService->notifyDeadlineApproaching($project, $daysRemaining);
            }
        }
    }
}
