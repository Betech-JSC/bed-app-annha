<?php

namespace App\Services;

use App\Models\Order;
use App\Models\ChatRoom;
use Illuminate\Support\Facades\DB;

class OrderMatcherService
{
    /**
     * Cố gắng tìm đơn phù hợp để match với đơn mới.
     *
     * @param  \App\Models\Order  $newOrder
     * @return bool
     */
    public function attemptMatch(Order $newOrder): bool
    {
        if ($newOrder->status !== 'pending') {
            return false;
        }

        // Tìm đơn hàng khác chưa match và có điều kiện phù hợp
        $matchCandidate = Order::where('status', 'pending')
            ->where('id', '!=', $newOrder->id)
            ->whereNull('receiver_id')
            ->where('sender_id', '!=', $newOrder->sender_id)
            ->where('pickup_location', $newOrder->pickup_location)
            ->where('delivery_location', $newOrder->delivery_location)
            ->first();

        if (!$matchCandidate) {
            return false; // Không tìm được đơn phù hợp
        }

        // Sử dụng transaction để đảm bảo tính toàn vẹn
        DB::transaction(function () use ($newOrder, $matchCandidate) {
            $newOrder->update([
                'receiver_id' => $matchCandidate->sender_id,
                'status' => 'matched',
            ]);

            $matchCandidate->update([
                'receiver_id' => $newOrder->sender_id,
                'status' => 'matched',
            ]);

            $this->createChatRoom($newOrder->sender_id, $matchCandidate->sender_id, $newOrder->id);
        });

        return true;
    }

    /**
     * Tạo phòng chat cho 2 user đã được match (tuỳ chọn)
     *
     * @param  int  $user1Id
     * @param  int  $user2Id
     * @param  int|null  $orderId
     * @return void
     */
    protected function createChatRoom(int $user1Id, int $user2Id, ?int $orderId = null): void
    {
        // Kiểm tra nếu phòng chat đã tồn tại giữa 2 user này (tuỳ bạn có muốn nhiều phòng hay 1 phòng)
        $exists = ChatRoom::where(function ($query) use ($user1Id, $user2Id) {
            $query->where('user1_id', $user1Id)->where('user2_id', $user2Id);
        })->orWhere(function ($query) use ($user1Id, $user2Id) {
            $query->where('user1_id', $user2Id)->where('user2_id', $user1Id);
        })->exists();

        if (!$exists) {
            ChatRoom::create([
                'user1_id' => $user1Id,
                'user2_id' => $user2Id,
                'order_id' => $orderId,
            ]);
        }
    }
}
