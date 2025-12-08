<?php

// app/Jobs/SendChatNotificationJob.php

namespace App\Jobs;

use App\Models\User;
use App\Services\ExpoPushService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendChatNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected int $fromUserId;
    protected int $toUserId;
    protected string $message;
    protected string $chatId;

    public function __construct(int $fromUserId, int $toUserId, string $message, string $chatId)
    {
        $this->fromUserId = $fromUserId;
        $this->toUserId = $toUserId;
        $this->message = $message;
        $this->chatId = $chatId;
    }

    public function handle()
    {
        $toUser = User::find($this->toUserId);
        $fromUser = User::find($this->fromUserId);

        if (!$toUser || !$toUser->fcm_token) return;

        ExpoPushService::sendNotification(
            $toUser->fcm_token,
            $fromUser ? $fromUser->name : 'Người dùng',
            $this->message,
            ['chat_id' => $this->chatId]
        );
    }
}
