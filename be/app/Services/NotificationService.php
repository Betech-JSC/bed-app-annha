<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use App\Models\Project;
use App\Services\ExpoPushService;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class NotificationService
{
    /**
     * Tạo và gửi notification cho một user
     *
     * @param int $userId
     * @param string $type
     * @param string $category
     * @param string $title
     * @param string $body
     * @param array $data
     * @param string $priority
     * @param string|null $actionUrl
     * @param string|null $notifiableType
     * @param int|null $notifiableId
     * @param Carbon|null $expiresAt
     * @param bool $sendPush
     * @return Notification
     */
    public function createNotification(
        int $userId,
        string $type,
        string $category,
        string $title,
        string $body,
        array $data = [],
        string $priority = Notification::PRIORITY_MEDIUM,
        ?string $actionUrl = null,
        ?string $notifiableType = null,
        ?int $notifiableId = null,
        ?Carbon $expiresAt = null,
        bool $sendPush = true
    ): Notification {
        $notification = Notification::create([
            'user_id' => $userId,
            'type' => $type,
            'category' => $category,
            'title' => $title,
            'body' => $body,
            'message' => $body, // Backward compatibility
            'data' => $data,
            'priority' => $priority,
            'action_url' => $actionUrl,
            'status' => 'unread',
            'notifiable_type' => $notifiableType,
            'notifiable_id' => $notifiableId,
            'expires_at' => $expiresAt,
        ]);

        // Gửi push notification nếu được yêu cầu
        if ($sendPush) {
            $this->sendPushNotification($userId, $title, $body, array_merge($data, [
                'notification_id' => $notification->id,
                'type' => $type,
                'category' => $category,
                'action_url' => $actionUrl,
            ]));
        }

        return $notification;
    }

    /**
     * Gửi notification cho một user
     */
    public function sendToUser(
        int $userId,
        string $type,
        string $category,
        string $title,
        string $body,
        array $data = [],
        string $priority = Notification::PRIORITY_MEDIUM,
        ?string $actionUrl = null,
        ?string $notifiableType = null,
        ?int $notifiableId = null,
        bool $sendPush = true
    ): Notification {
        return $this->createNotification(
            $userId,
            $type,
            $category,
            $title,
            $body,
            $data,
            $priority,
            $actionUrl,
            $notifiableType,
            $notifiableId,
            null,
            $sendPush
        );
    }

    /**
     * Gửi notification cho nhiều users
     */
    public function sendToUsers(
        array $userIds,
        string $type,
        string $category,
        string $title,
        string $body,
        array $data = [],
        string $priority = Notification::PRIORITY_MEDIUM,
        ?string $actionUrl = null,
        ?string $notifiableType = null,
        ?int $notifiableId = null,
        bool $sendPush = true
    ): array {
        $notifications = [];

        foreach ($userIds as $userId) {
            $notifications[] = $this->createNotification(
                $userId,
                $type,
                $category,
                $title,
                $body,
                $data,
                $priority,
                $actionUrl,
                $notifiableType,
                $notifiableId,
                null,
                $sendPush
            );
        }

        return $notifications;
    }

    /**
     * Gửi notification cho team của project
     */
    public function sendToProjectTeam(
        int $projectId,
        string $type,
        string $category,
        string $title,
        string $body,
        array $data = [],
        string $priority = Notification::PRIORITY_MEDIUM,
        ?string $actionUrl = null,
        bool $sendPush = true,
        ?array $excludeUserIds = null
    ): array {
        $project = Project::with('personnel.user')->findOrFail($projectId);

        // Lấy tất cả user IDs trong project team
        $userIds = $project->personnel()
            ->whereNotNull('user_id')
            ->pluck('user_id')
            ->unique()
            ->toArray();

        // Thêm project manager và customer nếu có
        if ($project->project_manager_id) {
            $userIds[] = $project->project_manager_id;
        }
        if ($project->customer_id) {
            $userIds[] = $project->customer_id;
        }

        // Loại bỏ duplicate và excluded users
        $userIds = array_unique($userIds);
        if ($excludeUserIds) {
            $userIds = array_diff($userIds, $excludeUserIds);
        }

        // Thêm project_id vào data
        $data['project_id'] = $projectId;

        // Tạo action_url nếu chưa có
        if (!$actionUrl) {
            $actionUrl = "/projects/{$projectId}";
        }

        return $this->sendToUsers(
            $userIds,
            $type,
            $category,
            $title,
            $body,
            $data,
            $priority,
            $actionUrl,
            Project::class,
            $projectId,
            $sendPush
        );
    }

    /**
     * Gửi push notification
     */
    public function sendPushNotification(int $userId, string $title, string $body, array $data = []): bool
    {
        try {
            $user = User::find($userId);
            if (!$user || !$user->fcm_token) {
                return false;
            }

            ExpoPushService::sendNotification(
                $user->fcm_token,
                $title,
                $body,
                $data
            );

            return true;
        } catch (\Exception $e) {
            Log::error('Failed to send push notification: ' . $e->getMessage(), [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Đánh dấu notification đã đọc
     */
    public function markAsRead(int $notificationId, int $userId): bool
    {
        $notification = Notification::where('id', $notificationId)
            ->where('user_id', $userId)
            ->first();

        if (!$notification) {
            return false;
        }

        return $notification->markAsRead();
    }

    /**
     * Đếm số notifications chưa đọc của user
     */
    public function getUnreadCount(int $userId): int
    {
        return Notification::forUser($userId)
            ->unread()
            ->notExpired()
            ->count();
    }

    /**
     * Tạo notification cho delay risk
     */
    public function notifyDelayRisk(Project $project, float $progressGap, string $severity): void
    {
        $title = "Cảnh báo tiến độ dự án";
        $body = "Dự án '{$project->name}' chậm tiến độ {$progressGap}% so với kế hoạch";
        
        $priority = match($severity) {
            'critical' => Notification::PRIORITY_URGENT,
            'high' => Notification::PRIORITY_HIGH,
            default => Notification::PRIORITY_MEDIUM,
        };

        $this->sendToProjectTeam(
            $project->id,
            Notification::TYPE_PROJECT_PERFORMANCE,
            Notification::CATEGORY_DELAY_RISK,
            $title,
            $body,
            [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'progress_gap' => $progressGap,
                'severity' => $severity,
            ],
            $priority,
            "/projects/{$project->id}",
            true
        );
    }

    /**
     * Tạo notification cho budget overrun
     */
    public function notifyBudgetOverrun(Project $project, float $overrunAmount, float $overrunPercentage): void
    {
        $title = "Cảnh báo vượt ngân sách";
        $body = "Dự án '{$project->name}' đã vượt ngân sách " . number_format($overrunPercentage, 1) . "%";
        
        $this->sendToProjectTeam(
            $project->id,
            Notification::TYPE_PROJECT_PERFORMANCE,
            Notification::CATEGORY_BUDGET_OVERRUN,
            $title,
            $body,
            [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'overrun_amount' => $overrunAmount,
                'overrun_percentage' => $overrunPercentage,
            ],
            Notification::PRIORITY_HIGH,
            "/projects/{$project->id}/budget",
            true
        );
    }

    /**
     * Tạo notification cho deadline sắp đến
     */
    public function notifyDeadlineApproaching(Project $project, int $daysRemaining): void
    {
        $title = "Deadline sắp đến";
        $body = "Dự án '{$project->name}' còn {$daysRemaining} ngày nữa đến deadline";
        
        $priority = $daysRemaining <= 3 ? Notification::PRIORITY_URGENT : Notification::PRIORITY_HIGH;
        
        $this->sendToProjectTeam(
            $project->id,
            Notification::TYPE_PROJECT_PERFORMANCE,
            Notification::CATEGORY_DEADLINE,
            $title,
            $body,
            [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'days_remaining' => $daysRemaining,
                'deadline' => $project->end_date?->toDateString(),
            ],
            $priority,
            "/projects/{$project->id}",
            true
        );
    }

    /**
     * Tạo notification cho overdue task
     */
    public function notifyOverdueTask($task, int $overdueDays): void
    {
        $title = "Nhiệm vụ quá hạn";
        $body = "Nhiệm vụ '{$task->name}' đã quá hạn {$overdueDays} ngày";
        
        $this->sendToUser(
            $task->assigned_to ?? $task->project->project_manager_id,
            Notification::TYPE_PROJECT_PERFORMANCE,
            Notification::CATEGORY_OVERDUE_TASK,
            $title,
            $body,
            [
                'task_id' => $task->id,
                'task_name' => $task->name,
                'project_id' => $task->project_id,
                'project_name' => $task->project->name ?? 'N/A',
                'overdue_days' => $overdueDays,
            ],
            Notification::PRIORITY_HIGH,
            "/projects/{$task->project_id}/tasks/{$task->id}",
            \App\Models\ProjectTask::class,
            $task->id,
            true
        );
    }

    /**
     * Tạo notification cho user được assign vào project
     */
    public function notifyUserAssigned(int $userId, Project $project, string $role): void
    {
        $title = "Bạn đã được gán vào dự án";
        $body = "Bạn đã được gán vào dự án '{$project->name}' với vai trò {$role}";
        
        $this->sendToUser(
            $userId,
            Notification::TYPE_ASSIGNMENT,
            Notification::CATEGORY_USER_ASSIGNED,
            $title,
            $body,
            [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'role' => $role,
            ],
            Notification::PRIORITY_MEDIUM,
            "/projects/{$project->id}",
            Project::class,
            $project->id,
            true
        );
    }

    /**
     * Tạo notification cho workflow approval
     */
    public function notifyWorkflowApproval(int $userId, string $workflowType, string $itemName, ?int $projectId = null): void
    {
        $title = "Yêu cầu duyệt";
        $body = "Bạn có yêu cầu duyệt {$workflowType}: {$itemName}";
        
        $actionUrl = $projectId ? "/projects/{$projectId}" : null;
        
        $this->sendToUser(
            $userId,
            Notification::TYPE_WORKFLOW,
            Notification::CATEGORY_WORKFLOW_APPROVAL,
            $title,
            $body,
            [
                'workflow_type' => $workflowType,
                'item_name' => $itemName,
                'project_id' => $projectId,
            ],
            Notification::PRIORITY_HIGH,
            $actionUrl,
            null,
            null,
            true
        );
    }
}
