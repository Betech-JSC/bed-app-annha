<?php

namespace App\Observers;

use App\Models\ProjectTask;
use App\Models\Notification;
use App\Services\NotificationService;
use Carbon\Carbon;

class ProjectTaskObserver
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Handle the ProjectTask "created" event.
     */
    public function created(ProjectTask $projectTask): void
    {
        // Notify khi task được assign cho user
        if ($projectTask->assigned_to) {
            $projectName = $projectTask->project ? $projectTask->project->name : 'N/A';
            $title = "Bạn đã được gán nhiệm vụ mới";
            $body = "Bạn đã được gán nhiệm vụ '{$projectTask->name}' trong dự án '{$projectName}'";

            $this->notificationService->sendToUser(
                $projectTask->assigned_to,
                Notification::TYPE_ASSIGNMENT,
                Notification::CATEGORY_USER_ASSIGNED,
                $title,
                $body,
                [
                    'task_id' => $projectTask->id,
                    'task_name' => $projectTask->name,
                    'project_id' => $projectTask->project_id,
                    'project_name' => $projectName,
                ],
                Notification::PRIORITY_MEDIUM,
                "/projects/{$projectTask->project_id}/tasks/{$projectTask->id}",
                ProjectTask::class,
                $projectTask->id,
                true
            );
        }
    }

    /**
     * Handle the ProjectTask "updated" event.
     */
    public function updated(ProjectTask $projectTask): void
    {
        // Notify khi task được reassign
        if ($projectTask->wasChanged('assigned_to')) {
            $oldAssignedTo = $projectTask->getOriginal('assigned_to');
            $newAssignedTo = $projectTask->assigned_to;

            // Notify user mới được assign
            if ($newAssignedTo) {
                $projectName = $projectTask->project ? $projectTask->project->name : 'N/A';
                $title = "Bạn đã được gán nhiệm vụ";
                $body = "Bạn đã được gán nhiệm vụ '{$projectTask->name}' trong dự án '{$projectName}'";

                $this->notificationService->sendToUser(
                    $newAssignedTo,
                    Notification::TYPE_ASSIGNMENT,
                    Notification::CATEGORY_USER_ASSIGNED,
                    $title,
                    $body,
                    [
                        'task_id' => $projectTask->id,
                        'task_name' => $projectTask->name,
                        'project_id' => $projectTask->project_id,
                    ],
                    Notification::PRIORITY_MEDIUM,
                    "/projects/{$projectTask->project_id}/tasks/{$projectTask->id}",
                    ProjectTask::class,
                    $projectTask->id,
                    true
                );
            }
        }

        // Notify khi status thay đổi
        if ($projectTask->wasChanged('status')) {
            $oldStatus = $projectTask->getOriginal('status');
            $newStatus = $projectTask->status;

            $title = "Trạng thái nhiệm vụ đã thay đổi";
            $body = "Nhiệm vụ '{$projectTask->name}' đã chuyển từ '{$oldStatus}' sang '{$newStatus}'";

            $userIds = [];
            if ($projectTask->assigned_to) {
                $userIds[] = $projectTask->assigned_to;
            }
            if ($projectTask->project->project_manager_id) {
                $userIds[] = $projectTask->project->project_manager_id;
            }

            if (!empty($userIds)) {
                $this->notificationService->sendToUsers(
                    array_unique($userIds),
                    Notification::TYPE_SYSTEM,
                    Notification::CATEGORY_STATUS_CHANGE,
                    $title,
                    $body,
                    [
                        'task_id' => $projectTask->id,
                        'task_name' => $projectTask->name,
                        'project_id' => $projectTask->project_id,
                        'old_status' => $oldStatus,
                        'new_status' => $newStatus,
                    ],
                    Notification::PRIORITY_LOW,
                    "/projects/{$projectTask->project_id}/tasks/{$projectTask->id}",
                    ProjectTask::class,
                    $projectTask->id,
                    true
                );
            }
        }

        // Kiểm tra overdue task - chỉ khi end_date hoặc status thay đổi
        if (($projectTask->wasChanged('end_date') || $projectTask->wasChanged('status'))
            && $projectTask->end_date
            && $projectTask->status !== 'completed'
        ) {
            $this->checkOverdueTask($projectTask);
        }
    }

    /**
     * Kiểm tra và notify nếu task quá hạn
     */
    protected function checkOverdueTask(ProjectTask $task): void
    {
        if (!$task->end_date || $task->status === 'completed') {
            return;
        }

        $overdueDays = now()->diffInDays($task->end_date, false);

        // Nếu quá hạn và chưa được notify trong 24h qua
        if ($overdueDays < 0) {
            $overdueDays = abs($overdueDays);

            // Kiểm tra xem đã có notification tương tự chưa
            $recentNotification = \App\Models\Notification::where('user_id', $task->assigned_to)
                ->where('type', \App\Models\Notification::TYPE_PROJECT_PERFORMANCE)
                ->where('category', \App\Models\Notification::CATEGORY_OVERDUE_TASK)
                ->whereJsonContains('data->task_id', $task->id)
                ->where('created_at', '>=', now()->subHours(24))
                ->exists();

            if (!$recentNotification) {
                $this->notificationService->notifyOverdueTask($task, $overdueDays);
            }
        }
    }
}
