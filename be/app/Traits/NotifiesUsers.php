<?php

namespace App\Traits;

use App\Models\Notification;
use App\Models\Project;
use App\Models\User;
use App\Models\ProjectPersonnel;
use App\Services\ExpoPushService;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Model;

/**
 * Trait NotifiesUsers
 *
 * Thêm vào các Model cần gửi thông báo tự động.
 * Mỗi Model định nghĩa notificationMap() để cấu hình:
 *   - Ai nhận thông báo (target)
 *   - Deep link đến đâu (tab)
 *   - Mức độ ưu tiên (priority)
 *
 * Sử dụng:
 *   $cost->notifyEvent('approved_management', $actor);
 *   $defect->notifyEvent('fixed', $actor);
 */
trait NotifiesUsers
{
    // ====================================================================
    // ABSTRACT — Model phải định nghĩa
    // ====================================================================

    /**
     * Trả về Project liên quan đến entity này.
     * Hầu hết các Model CRM đều có quan hệ project().
     */
    abstract public function getNotificationProject(): ?Project;

    /**
     * Trả về cấu hình thông báo cho từng event.
     *
     * Format:
     * [
     *   'approved_management' => [
     *       'title'    => 'Phiếu chi đã được BĐH duyệt',
     *       'body'     => 'Phiếu chi "{name}" đã được BĐH duyệt, chờ KT xác nhận.',
     *       'target'   => ['creator', 'pm', 'accountant'],   // ai nhận
     *       'tab'      => 'costs',                            // tab trên CRM
     *       'priority' => 'high',                             // low|medium|high|urgent
     *       'category' => 'workflow_approval',                // notification category
     *   ],
     * ]
     *
     * Biến hỗ trợ cho body: {name}, {code}, {actor}, {reason}, {project}
     */
    abstract protected function notificationMap(): array;

    /**
     * Trả về tên hiển thị ngắn gọn của entity (dùng cho body thông báo).
     * Ví dụ: "Chi phí A", "PVT-001", "Lỗi #12"
     */
    abstract public function getNotificationLabel(): string;

    // ====================================================================
    // MAIN METHOD
    // ====================================================================

    /**
     * Gửi thông báo cho một event cụ thể.
     *
     * @param string            $event   Key trong notificationMap()
     * @param Model|User|null   $actor   Người thực hiện hành động (User hoặc Admin model)
     * @param array             $extra   Dữ liệu bổ sung: ['reason' => '...']
     */
    public function notifyEvent(string $event, $actor = null, array $extra = []): void
    {
        try {
            $map = $this->notificationMap();

            if (!isset($map[$event])) {
                Log::warning("NotifiesUsers: Event '{$event}' not found in " . static::class);
                return;
            }

            $config   = $map[$event];
            $project  = $this->getNotificationProject();

            if (!$project) {
                Log::warning("NotifiesUsers: No project for " . static::class . "#{$this->id}");
                return;
            }

            // --- Resolve body template ---
            $body = $this->resolveNotificationBody($config['body'] ?? '', $actor, $extra);
            $title = $config['title'] ?? 'Thông báo hệ thống';

            // --- Resolve action_url with tab ---
            $tab = $config['tab'] ?? null;
            $actionUrl = "/projects/{$project->id}" . ($tab ? "?tab={$tab}" : '');

            // --- Resolve target user IDs ---
            $targets = $config['target'] ?? ['pm'];
            $userIds = $this->resolveTargetUsers($targets, $project, $actor, $extra);

            // Loại bỏ chính actor (không cần tự thông báo cho mình)
            if ($actor) {
                $userIds = array_diff($userIds, [$actor->id]);
            }

            $userIds = array_filter(array_unique($userIds));

            if (empty($userIds)) {
                return; // Không có ai để gửi
            }

            // --- Build notification type ---
            $modelPrefix = $this->getNotificationTypePrefix();
            $type = "{$modelPrefix}_{$event}";

            $category = $config['category'] ?? Notification::CATEGORY_STATUS_CHANGE;
            $priority = $config['priority'] ?? Notification::PRIORITY_MEDIUM;

            // --- Create notifications & push ---
            $data = array_merge([
                'project_id'  => $project->id,
                'entity_type' => static::class,
                'entity_id'   => $this->id,
                'event'       => $event,
                'source'      => 'crm',
            ], $extra);

            foreach ($userIds as $userId) {
                try {
                    Notification::create([
                        'user_id'         => $userId,
                        'type'            => $type,
                        'category'        => $category,
                        'title'           => $title,
                        'body'            => $body,
                        'message'         => $body,
                        'data'            => $data,
                        'priority'        => $priority,
                        'action_url'      => $actionUrl,
                        'status'          => 'unread',
                        'notifiable_type' => Project::class,
                        'notifiable_id'   => $project->id,
                    ]);

                    // Push notification qua Expo
                    $this->sendPushToUser($userId, $title, $body, array_merge($data, [
                        'action_url' => $actionUrl,
                        'type'       => $type,
                        'category'   => $category,
                    ]));
                } catch (\Exception $e) {
                    Log::warning("NotifiesUsers: Failed for user {$userId}: " . $e->getMessage());
                    // Continue — thông báo không nên block logic chính
                }
            }

            Log::info("NotifiesUsers: Sent '{$event}' to " . count($userIds) . " users", [
                'model'   => static::class,
                'id'      => $this->id,
                'project' => $project->id,
            ]);
        } catch (\Exception $e) {
            Log::error("NotifiesUsers: " . $e->getMessage(), [
                'model' => static::class,
                'id'    => $this->id ?? null,
                'event' => $event,
            ]);
            // Không throw — thông báo là non-critical
        }
    }

    // ====================================================================
    // HELPERS
    // ====================================================================

    /**
     * Resolve biến trong body template.
     * Hỗ trợ: {name}, {actor}, {reason}, {project}, {code}
     */
    protected function resolveNotificationBody(string $template, $actor, array $extra): string
    {
        $project = $this->getNotificationProject();

        $replacements = [
            '{name}'    => $this->getNotificationLabel(),
            '{actor}'   => $actor->name ?? 'Hệ thống',
            '{project}' => $project->name ?? 'Dự án',
            '{code}'    => $project->code ?? '',
            '{reason}'  => $extra['reason'] ?? '',
        ];

        return str_replace(array_keys($replacements), array_values($replacements), $template);
    }

    /**
     * Resolve danh sách user IDs từ target roles.
     *
     * Targets hỗ trợ:
     *   'creator'    → $this->created_by
     *   'pm'         → project_manager_id
     *   'customer'   → customer_id
     *   'accountant' → users có quyền cost.approve.accountant
     *   'management' → users có quyền cost.approve.management
     *   'supervisor' → users có quyền acceptance.approve.level_1
     *   'reporter'   → $this->reported_by (Defect)
     *   'fixer'      → $this->fixed_by (Defect)
     *   'proposer'   → $this->proposed_by (AdditionalCost)
     *   'team'       → toàn bộ project personnel
     */
    protected function resolveTargetUsers(array $targets, Project $project, $actor, array $extra): array
    {
        $userIds = [];

        foreach ($targets as $target) {
            match ($target) {
                'creator'    => $userIds[] = $this->created_by ?? null,
                'pm'         => $userIds[] = $project->project_manager_id ?? null,
                'customer'   => $userIds[] = $project->customer_id ?? null,
                'reporter'   => $userIds[] = $this->reported_by ?? null,
                'fixer'      => $userIds[] = $this->fixed_by ?? null,
                'proposer'   => $userIds[] = $this->proposed_by ?? null,
                'accountant' => $userIds = array_merge($userIds, $this->getUsersByPermission('cost.approve.accountant')),
                'management' => $userIds = array_merge($userIds, $this->getUsersByPermission('cost.approve.management')),
                'supervisor' => $userIds = array_merge($userIds, $this->getProjectRole($project, 'acceptance.approve.level_1')),
                'team'       => $userIds = array_merge($userIds, $this->getProjectTeamIds($project)),
                default      => null,
            };
        }

        return array_filter($userIds);
    }

    /**
     * Lấy users có quyền global (qua roles hoặc direct permissions).
     */
    protected function getUsersByPermission(string $permission): array
    {
        return User::where(function ($q) use ($permission) {
            $q->whereHas('roles.permissions', fn($rq) => $rq->where('name', $permission))
              ->orWhereHas('directPermissions', fn($dq) => $dq->where('name', $permission));
        })->pluck('id')->toArray();
    }

    /**
     * Lấy users có quyền trong project (ProjectPersonnel).
     */
    protected function getProjectRole(Project $project, string $permission): array
    {
        $ids = ProjectPersonnel::where('project_id', $project->id)
            ->where(function ($q) use ($permission) {
                $q->whereJsonContains('permissions', $permission)
                  ->orWhereJsonContains('permissions', '*');
            })
            ->pluck('user_id')
            ->toArray();

        // Luôn thêm PM
        if ($project->project_manager_id) {
            $ids[] = $project->project_manager_id;
        }

        return $ids;
    }

    /**
     * Lấy tất cả user IDs trong project team.
     */
    protected function getProjectTeamIds(Project $project): array
    {
        $ids = ProjectPersonnel::where('project_id', $project->id)
            ->whereNotNull('user_id')
            ->pluck('user_id')
            ->toArray();

        if ($project->project_manager_id) {
            $ids[] = $project->project_manager_id;
        }
        if ($project->customer_id) {
            $ids[] = $project->customer_id;
        }

        return $ids;
    }

    /**
     * Gửi push notification cho từng user qua Expo.
     */
    protected function sendPushToUser(int $userId, string $title, string $body, array $data): void
    {
        try {
            $user = User::find($userId);
            if ($user && $user->fcm_token) {
                ExpoPushService::sendNotification($user->fcm_token, $title, $body, $data);
            }
        } catch (\Exception $e) {
            // Silent fail — push is best-effort
        }
    }

    /**
     * Prefix cho notification type.
     * Cost → 'cost', Defect → 'defect', MaterialBill → 'material_bill'
     */
    protected function getNotificationTypePrefix(): string
    {
        $className = class_basename(static::class);
        return strtolower(preg_replace('/([a-z])([A-Z])/', '$1_$2', $className));
    }
}
