<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use App\Models\Project;
use App\Models\ProjectPersonnel;
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
        $userIds = array_values(array_unique(array_filter($userIds)));

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
                false // Không gửi push lẻ ở đây
            );
        }

        // Gửi push theo lô
        if ($sendPush && !empty($userIds)) {
            $this->sendBatchPushNotifications($userIds, $title, $body, array_merge($data, [
                'type' => $type,
                'category' => $category,
                'action_url' => $actionUrl,
            ]));
        }

        return $notifications;
    }

    /**
     * Gửi push notification theo lô cho nhiều users
     */
    public function sendBatchPushNotifications(array $userIds, string $title, string $body, array $data = []): void
    {
        try {
            $tokens = [];
            $contentHash = md5($title . $body);
            
            foreach ($userIds as $userId) {
                $cacheKey = "push_throttle_{$userId}_{$contentHash}";
                
                // Tránh gửi dồn dập cho cùng 1 user (trong vòng 5s)
                if (\Illuminate\Support\Facades\Cache::has($cacheKey)) {
                    continue;
                }
                \Illuminate\Support\Facades\Cache::put($cacheKey, true, 5);

                $user = User::find($userId);
                if ($user && $user->fcm_token) {
                    $tokens[] = $user->fcm_token;
                }
            }

            if (empty($tokens)) {
                return;
            }

            ExpoPushService::sendNotification(array_unique($tokens), $title, $body, $data);
        } catch (\Exception $e) {
            Log::error('Failed to send batch push notifications: ' . $e->getMessage(), [
                'user_ids' => $userIds,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Gửi notification cho những users có quyền cụ thể (global hoặc trong project)
     */
    public function sendToPermissionUsers(
        string $permission,
        ?int $projectId,
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
        // 1. Tìm users có quyền global (Admin, accountant, etc.) thông qua roles
        $globalUserIds = User::whereHas('roles.permissions', function ($q) use ($permission) {
            $q->where('name', $permission);
        })->orWhereHas('directPermissions', function ($q) use ($permission) {
            $q->where('name', $permission);
        })->pluck('id')->toArray();

        $userIds = $globalUserIds;

        // 2. Tìm users có quyền cụ thể trong project (ProjectPersonnel)
        if ($projectId) {
            $projectUserIds = ProjectPersonnel::where('project_id', $projectId)
                ->where(function ($q) use ($permission) {
                    $q->whereJsonContains('permissions', $permission)
                        ->orWhereJsonContains('permissions', '*');
                })
                ->pluck('user_id')
                ->toArray();
            
            $userIds = array_merge($userIds, $projectUserIds);

            // Luôn thêm Project Manager của dự án đó
            $project = Project::find($projectId);
            if ($project && $project->project_manager_id) {
                $userIds[] = $project->project_manager_id;
            }
        }

        // Loại bỏ duplicate và excluded users
        $userIds = array_filter(array_unique($userIds));
        if ($excludeUserIds) {
            $userIds = array_diff($userIds, $excludeUserIds);
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
            $projectId ? Project::class : null,
            $projectId,
            $sendPush
        );
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
            // Anti-spam: Tránh gửi thông báo giống hệt nhau liên tục cho 1 user (trong vòng 5s)
            $cacheKey = "push_throttle_{$userId}_" . md5($title . $body);
            if (\Illuminate\Support\Facades\Cache::has($cacheKey)) {
                return false;
            }
            \Illuminate\Support\Facades\Cache::put($cacheKey, true, 5);

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

        $priority = match ($severity) {
            'critical' => Notification::PRIORITY_URGENT,
            'high' => Notification::PRIORITY_HIGH,
            default => Notification::PRIORITY_MEDIUM,
        };

        $this->sendToPermissionUsers(
            \App\Constants\Permissions::PROJECT_MANAGE,
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

        $this->sendToPermissionUsers(
            \App\Constants\Permissions::COST_APPROVE_MANAGEMENT,
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

        $this->sendToPermissionUsers(
            \App\Constants\Permissions::PROJECT_MANAGE,
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
    public function notifyUserAssigned(int $userId, Project $project): void
    {
        $title = "Bạn đã được gán vào dự án";
        $body = "Bạn đã được gán vào dự án '{$project->name}' với vai trò";

        $this->sendToUser(
            $userId,
            Notification::TYPE_ASSIGNMENT,
            Notification::CATEGORY_USER_ASSIGNED,
            $title,
            $body,
            [
                'project_id' => $project->id,
                'project_name' => $project->name,
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

    /**
     * Thông báo xác nhận thanh toán
     */
    public function notifyPaymentConfirmed(\App\Models\ProjectPayment $payment): void
    {
        $project = $payment->project;
        if (!$project->customer_id) return;

        $this->sendToUser(
            $project->customer_id,
            Notification::TYPE_SYSTEM,
            Notification::CATEGORY_STATUS_CHANGE,
            "Thanh toán được xác nhận",
            "Đợt thanh toán #{$payment->payment_number} của dự án '{$project->name}' đã được kế toán xác nhận.",
            [
                'project_id' => $project->id,
                'payment_id' => $payment->id,
            ],
            Notification::PRIORITY_MEDIUM,
            "/projects/{$project->id}/payments"
        );
    }

    /**
     * Thông báo từ chối thanh toán
     */
    public function notifyPaymentRejected(\App\Models\ProjectPayment $payment, string $reason): void
    {
        $project = $payment->project;
        if (!$project->customer_id) return;

        $this->sendToUser(
            $project->customer_id,
            Notification::TYPE_SYSTEM,
            Notification::CATEGORY_STATUS_CHANGE,
            "Thanh toán bị từ chối",
            "Kế toán đã từ chối xác nhận thanh toán đợt #{$payment->payment_number} của dự án '{$project->name}'. Lý do: {$reason}",
            [
                'project_id' => $project->id,
                'payment_id' => $payment->id,
                'reason' => $reason,
            ],
            Notification::PRIORITY_HIGH,
            "/projects/{$project->id}/payments"
        );
    }

    /**
     * Thông báo xác nhận chi phí phát sinh
     */
    public function notifyCostConfirmed(\App\Models\AdditionalCost $cost): void
    {
        $project = $cost->project;
        $userIds = [$cost->proposed_by];
        if ($project->customer_id) {
            $userIds[] = $project->customer_id;
        }
        $userIds = array_filter(array_unique($userIds));

        $this->sendToUsers(
            $userIds,
            Notification::TYPE_SYSTEM,
            Notification::CATEGORY_STATUS_CHANGE,
            "Chi phí phát sinh được xác nhận",
            "Chi phí phát sinh cho dự án '{$project->name}' đã được kế toán xác nhận thanh toán.",
            [
                'project_id' => $project->id,
                'cost_id' => $cost->id,
            ],
            Notification::PRIORITY_MEDIUM,
            "/projects/{$project->id}/costs"
        );
    }

    /**
     * Thông báo từ chối chi phí phát sinh
     */
    public function notifyCostRejected(\App\Models\AdditionalCost $cost, string $reason): void
    {
        $project = $cost->project;
        $userIds = [$cost->proposed_by];
        if ($project->customer_id) {
            $userIds[] = $project->customer_id;
        }
        $userIds = array_filter(array_unique($userIds));

        $this->sendToUsers(
            $userIds,
            Notification::TYPE_SYSTEM,
            Notification::CATEGORY_STATUS_CHANGE,
            "Chi phí phát sinh bị từ chối",
            "Chi phí phát sinh cho dự án '{$project->name}' đã bị từ chối. Lý do: {$reason}",
            [
                'project_id' => $project->id,
                'cost_id' => $cost->id,
                'reason' => $reason,
            ],
            Notification::PRIORITY_HIGH,
            "/projects/{$project->id}/costs"
        );
    }

    /**
     * Thông báo giai đoạn nghiệm thu được duyệt
     */
    public function notifyAcceptanceStageApproved(\App\Models\AcceptanceStage $stage, string $levelName): void
    {
        $project = $stage->project;
        
        // Notify PM and Team
        $this->sendToProjectTeam(
            $project->id,
            Notification::TYPE_SYSTEM,
            Notification::CATEGORY_STATUS_CHANGE,
            "Giai đoạn nghiệm thu được duyệt",
            "Giai đoạn '{$stage->name}' của dự án '{$project->name}' đã được duyệt bởi {$levelName}.",
            [
                'project_id' => $project->id,
                'stage_id' => $stage->id,
            ],
            Notification::PRIORITY_MEDIUM,
            "/projects/{$project->id}/acceptance"
        );
    }
}
