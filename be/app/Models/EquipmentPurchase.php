<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class EquipmentPurchase extends Model
{
    use \App\Traits\Approvable, \App\Traits\NotifiesUsers;

    protected $fillable = [
        'uuid', 'project_id', 'total_amount', 'status', 'rejection_reason',
        'notes', 'created_by', 'approved_by', 'approved_at',
        'confirmed_by', 'confirmed_at',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'approved_at'  => 'datetime',
        'confirmed_at' => 'datetime',
    ];

    // ─── Relationships ───
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function items(): HasMany { return $this->hasMany(EquipmentPurchaseItem::class, 'purchase_id'); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function approver(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }
    public function confirmer(): BelongsTo { return $this->belongsTo(User::class, 'confirmed_by'); }
    public function attachments(): MorphMany { return $this->morphMany(Attachment::class, 'attachable'); }

    const STATUS_LABELS = [
        'draft'              => 'Nháp',
        'pending_management' => 'Chờ BĐH duyệt',
        'pending_accountant' => 'Chờ Kế toán',
        'completed'          => 'Hoàn tất',
        'rejected'           => 'Từ chối',
    ];

    /**
     * Tính lại tổng tiền từ items
     */
    public function recalculateTotal(): void
    {
        $this->update([
            'total_amount' => $this->items()->sum('total_price'),
        ]);
    }

    public function isPendingApproval(): bool
    {
        return in_array($this->status, ['pending_management', 'pending_accountant']);
    }

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($model) {
            $model->uuid = $model->uuid ?: Str::uuid();
        });
    }

    protected function getApprovalSummary(): string
    {
        return "Yêu cầu mua thiết bị mới" . ($this->project ? " [Dự án: " . $this->project->name . "]" : "") . " - Tổng: " . number_format($this->total_amount, 0, ',', '.') . "đ";
    }

    protected function getApprovalMetadata(): array
    {
        return [
            'project_name' => $this->project?->name,
            'total_amount' => $this->total_amount,
            'items_count' => $this->items()->count(),
            'notes' => $this->notes,
            'type_label' => 'Mua thiết bị',
        ];
    }

    // ───── Notification Helpers (NotifiesUsers) ─────
    public function getNotificationProject(): ?\App\Models\Project { return $this->project; }
    public function getNotificationLabel(): string { return "mua thiết bị mới #" . $this->id; }

    protected function notificationMap(): array
    {
        return [
            'submitted' => [
                'title'    => 'Yêu cầu mua thiết bị mới cần duyệt',
                'body'     => 'Yêu cầu mua thiết bị cho dự án "{project}" đang chờ duyệt.',
                'target'   => ['management', 'pm'],
                'tab'      => 'equipment',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
            'approved_management' => [
                'title'    => 'BĐH đã duyệt mua thiết bị',
                'body'     => 'Yêu cầu mua thiết bị cho dự án "{project}" đã được BĐH duyệt, chờ Kế toán xác nhận.',
                'target'   => ['creator', 'accountant', 'pm'],
                'tab'      => 'equipment',
                'priority' => 'medium',
                'category' => 'workflow_approval',
            ],
            'completed' => [
                'title'    => 'KT đã xác nhận mua thiết bị',
                'body'     => 'Yêu cầu mua thiết bị cho dự án "{project}" đã được xác nhận hoàn tất.',
                'target'   => ['creator', 'pm'],
                'tab'      => 'equipment',
                'priority' => 'medium',
                'category' => 'status_change',
            ],
            'rejected' => [
                'title'    => 'Yêu cầu mua thiết bị bị từ chối',
                'body'     => 'Yêu cầu mua thiết bị cho dự án "{project}" bị từ chối: {reason}',
                'target'   => ['creator', 'pm'],
                'tab'      => 'equipment',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
        ];
    }
}
