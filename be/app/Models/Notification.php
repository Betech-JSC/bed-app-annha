<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Notification extends Model
{
    use HasFactory;

    // ==================================================================
    // CONSTANTS - Types
    // ==================================================================
    const TYPE_PROJECT_PERFORMANCE = 'project_performance';
    const TYPE_SYSTEM = 'system';
    const TYPE_WORKFLOW = 'workflow';
    const TYPE_ASSIGNMENT = 'assignment';
    const TYPE_MENTION = 'mention';
    const TYPE_FILE_UPLOAD = 'file_upload';

    // ==================================================================
    // CONSTANTS - Categories
    // ==================================================================
    // Project Performance
    const CATEGORY_DELAY_RISK = 'delay_risk';
    const CATEGORY_BUDGET_OVERRUN = 'budget_overrun';
    const CATEGORY_DEADLINE = 'deadline';
    const CATEGORY_OVERDUE_TASK = 'overdue_task';
    const CATEGORY_HIGH_DEFECTS = 'high_defects';
    const CATEGORY_HIGH_RISKS = 'high_risks';
    const CATEGORY_PENDING_APPROVALS = 'pending_approvals';
    const CATEGORY_COST_ANOMALY = 'cost_anomaly';

    // System
    const CATEGORY_USER_ASSIGNED = 'user_assigned';
    const CATEGORY_WORKFLOW_APPROVAL = 'workflow_approval';
    const CATEGORY_STATUS_CHANGE = 'status_change';
    const CATEGORY_COMMENT_MENTION = 'comment_mention';
    const CATEGORY_FILE_UPLOAD = 'file_upload';
    const CATEGORY_SYSTEM_UPDATE = 'system_update';

    // ==================================================================
    // CONSTANTS - Priority
    // ==================================================================
    const PRIORITY_LOW = 'low';
    const PRIORITY_MEDIUM = 'medium';
    const PRIORITY_HIGH = 'high';
    const PRIORITY_URGENT = 'urgent';

    // ==================================================================
    // FILLABLE
    // ==================================================================
    protected $fillable = [
        'user_id',
        'message', // Keep for backward compatibility
        'type',
        'category',
        'title',
        'body',
        'data',
        'priority',
        'action_url',
        'status',
        'read_at',
        'expires_at',
        'notifiable_type',
        'notifiable_id',
    ];

    // ==================================================================
    // CASTS
    // ==================================================================
    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
        'expires_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // ==================================================================
    // ATTRIBUTES
    // ==================================================================
    protected $attributes = [
        'status' => 'unread',
        'priority' => self::PRIORITY_MEDIUM,
    ];

    // ==================================================================
    // RELATIONSHIPS
    // ==================================================================

    /**
     * Notification thuộc về user nào
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Polymorphic relationship - notification có thể link với Project, Task, etc.
     */
    public function notifiable(): MorphTo
    {
        return $this->morphTo();
    }

    // ==================================================================
    // SCOPES
    // ==================================================================

    /**
     * Lấy notifications chưa đọc
     */
    public function scopeUnread($query)
    {
        return $query->where('status', 'unread')
            ->whereNull('read_at');
    }

    /**
     * Lấy notifications đã đọc
     */
    public function scopeRead($query)
    {
        return $query->where('status', 'read')
            ->orWhereNotNull('read_at');
    }

    /**
     * Lọc theo type
     */
    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Lọc theo category
     */
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Lọc theo priority
     */
    public function scopeByPriority($query, string $priority)
    {
        return $query->where('priority', $priority);
    }

    /**
     * Lọc notifications đã hết hạn
     */
    public function scopeExpired($query)
    {
        return $query->whereNotNull('expires_at')
            ->where('expires_at', '<', now());
    }

    /**
     * Lọc notifications chưa hết hạn
     */
    public function scopeNotExpired($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('expires_at')
                ->orWhere('expires_at', '>=', now());
        });
    }

    /**
     * Lọc theo user
     */
    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    /**
     * Đánh dấu thông báo đã đọc
     */
    public function markAsRead(): bool
    {
        $this->status = 'read';
        $this->read_at = now();
        return $this->save();
    }

    /**
     * Kiểm tra notification đã đọc chưa
     */
    public function isRead(): bool
    {
        return $this->status === 'read' || $this->read_at !== null;
    }

    /**
     * Kiểm tra notification đã hết hạn chưa
     */
    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * Lấy title hoặc fallback về message
     */
    public function getDisplayTitleAttribute(): string
    {
        return $this->title ?? $this->message ?? 'Thông báo';
    }

    /**
     * Lấy body hoặc fallback về message
     */
    public function getDisplayBodyAttribute(): string
    {
        return $this->body ?? $this->message ?? '';
    }
}
