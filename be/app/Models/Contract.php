<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Contract extends Model
{
    use SoftDeletes, \App\Traits\NotifiesUsers, \App\Traits\Approvable;

    protected $fillable = [
        'uuid',
        'project_id',
        'contract_value',
        'signed_date',
        'status',
        'approved_by',
        'approved_at',
        'rejected_reason',
    ];

    protected $casts = [
        'contract_value' => 'decimal:2',
        'signed_date' => 'date',
        'approved_at' => 'datetime',
    ];

    protected $appends = [
        'is_approved',
        'is_pending',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function getApprovalSummary(): string
    {
        return "Duyệt hợp đồng dự án";
    }

    public function getApprovalMetadata(): array
    {
        return [
            'contract_value' => $this->contract_value,
            'contract_number' => $this->contract_number,
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ProjectPayment::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getIsApprovedAttribute(): bool
    {
        return $this->status === 'approved';
    }

    public function getIsPendingAttribute(): bool
    {
        return $this->status === 'pending_customer_approval';
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function approve($user = null): bool
    {
        $this->status = 'approved';
        if ($user) {
            $this->approved_by = $user->id;
        }
        $this->approved_at = now();
        return $this->save();
    }

    public function reject(string $reason, $user = null): bool
    {
        $this->status = 'rejected';
        $this->rejected_reason = $reason;
        return $this->save();
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($contract) {
            if (empty($contract->uuid)) {
                $contract->uuid = Str::uuid();
            }
        });
    }
    // ==================================================================
    // NotifiesUsers Implementation
    // ==================================================================

    public function getNotificationProject(): ?Project
    {
        return $this->project;
    }

    public function getNotificationLabel(): string
    {
        return $this->name ?? "Hợp đồng #{$this->id}";
    }

    protected function notificationMap(): array
    {
        return [
            'submitted' => [
                'title'    => 'Hợp đồng mới cần duyệt',
                'body'     => 'Hợp đồng "{name}" đã được tải lên và chờ duyệt.',
                'target'   => ['management', 'pm'],
                'tab'      => 'contracts',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
            'approved' => [
                'title'    => 'Hợp đồng đã được duyệt',
                'body'     => 'Hợp đồng "{name}" đã được phê duyệt.',
                'target'   => ['creator', 'pm'],
                'tab'      => 'contracts',
                'priority' => 'medium',
                'category' => 'status_change',
            ],
            'rejected' => [
                'title'    => 'Hợp đồng bị từ chối',
                'body'     => 'Hợp đồng "{name}" bị từ chối: {reason}',
                'target'   => ['creator', 'pm'],
                'tab'      => 'contracts',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
        ];
    }
}
