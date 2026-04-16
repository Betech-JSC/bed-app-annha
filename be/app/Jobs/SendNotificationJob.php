<?php

namespace App\Jobs;

use App\Models\Notification;
use App\Models\User;
use App\Services\ExpoPushService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Job gửi notification bất đồng bộ (async) cho danh sách users.
 * Giảm thời gian response của HTTP request bằng cách đẩy việc tạo DB record
 * và gửi Expo push ra khỏi request cycle.
 */
class SendNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 10;

    public function __construct(
        protected array $userIds,
        protected string $type,
        protected string $category,
        protected string $title,
        protected string $body,
        protected array $data = [],
        protected string $priority = Notification::PRIORITY_MEDIUM,
        protected ?string $actionUrl = null,
        protected ?string $notifiableType = null,
        protected ?int $notifiableId = null
    ) {}

    public function handle(): void
    {
        $userIds = array_values(array_unique(array_filter($this->userIds)));

        foreach ($userIds as $userId) {
            try {
                Notification::create([
                    'user_id' => $userId,
                    'type' => $this->type,
                    'category' => $this->category,
                    'title' => $this->title,
                    'body' => $this->body,
                    'message' => $this->body,
                    'data' => $this->data,
                    'priority' => $this->priority,
                    'action_url' => $this->actionUrl,
                    'status' => 'unread',
                    'notifiable_type' => $this->notifiableType,
                    'notifiable_id' => $this->notifiableId,
                ]);
            } catch (\Throwable $e) {
                Log::error("SendNotificationJob: Failed to create notification for user {$userId}: " . $e->getMessage());
            }
        }

        // Gửi Expo push notification theo lô
        $this->sendBatchPush($userIds);
    }

    protected function sendBatchPush(array $userIds): void
    {
        try {
            $tokens = [];
            $contentHash = md5($this->title . $this->body);

            foreach ($userIds as $userId) {
                $cacheKey = "push_throttle_{$userId}_{$contentHash}";
                if (Cache::has($cacheKey)) {
                    continue;
                }
                Cache::put($cacheKey, true, 5);

                $user = User::find($userId);
                if ($user && $user->fcm_token) {
                    $tokens[] = $user->fcm_token;
                }
            }

            if (empty($tokens)) {
                return;
            }

            ExpoPushService::sendNotification(
                array_unique($tokens),
                $this->title,
                $this->body,
                array_merge($this->data, [
                    'type' => $this->type,
                    'category' => $this->category,
                    'action_url' => $this->actionUrl,
                ])
            );
        } catch (\Throwable $e) {
            Log::error('SendNotificationJob: Batch push failed: ' . $e->getMessage());
        }
    }
}
