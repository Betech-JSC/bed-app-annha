<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Notification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'message',
        'status',
    ];

    // Mặc định status là 'unread' khi tạo mới
    protected $attributes = [
        'status' => 'unread',
    ];

    /**
     * Quan hệ ngược: notification thuộc về user nào
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Đánh dấu thông báo đã đọc
     */
    public function markAsRead()
    {
        $this->status = 'read';
        $this->save();
    }

    /**
     * Scope để lấy notifications chưa đọc
     */
    public function scopeUnread($query)
    {
        return $query->where('status', 'unread');
    }

    /**
     * Scope để lấy notifications đã đọc
     */
    public function scopeRead($query)
    {
        return $query->where('status', 'read');
    }
}
