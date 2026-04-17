<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ChangeRequest extends Model
{
    use SoftDeletes, \App\Traits\NotifiesUsers, \App\Traits\Approvable;

    protected $fillable = [
        'uuid',
        'project_id',
        'title',
        'description',
        'change_type',
        'priority',
        'status',
        'reason',
        'impact_analysis',
        'estimated_cost_impact',
        'estimated_schedule_impact_days',
        'implementation_plan',
        'requested_by',
        'reviewed_by',
        'approved_by',
        'submitted_at',
        'reviewed_at',
        'approved_at',
        'implemented_at',
        'rejection_reason',
        'notes',
    ];

    protected $casts = [
        'estimated_cost_impact' => 'decimal:2',
        'estimated_schedule_impact_days' => 'integer',
        'submitted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'approved_at' => 'datetime',
        'implemented_at' => 'datetime',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function getApprovalSummary(): string
    {
        return "Yêu cầu thay đổi: " . ($this->title ?: 'N/A');
    }

    public function getApprovalMetadata(): array
    {
        return [
            'impact' => $this->estimated_cost_impact,
            'requester' => $this->requester->name ?? 'N/A',
        ];
    }

    public function isPendingApproval(): bool
    {
        return in_array($this->status, ['submitted', 'under_review']);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function attachments(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function submit(): bool
    {
        if ($this->status !== 'draft') {
            return false;
        }

        $this->status = 'submitted';
        $this->submitted_at = now();
        return $this->save();
    }

    public function approve(?User $user = null, ?string $notes = null): bool
    {
        if (!in_array($this->status, ['submitted', 'under_review'])) {
            return false;
        }

        $this->status = 'approved';
        if ($user) {
            $this->approved_by = $user->id;
        }
        $this->approved_at = now();
        if ($notes) {
            $this->notes = $notes;
        }
        return $this->save();
    }

    public function reject(?User $user = null, string $reason): bool
    {
        if (!in_array($this->status, ['submitted', 'under_review'])) {
            return false;
        }

        $this->status = 'rejected';
        if ($user) {
            $this->reviewed_by = $user->id;
        }
        $this->reviewed_at = now();
        $this->rejection_reason = $reason;
        return $this->save();
    }

    public function markAsImplemented(): bool
    {
        if ($this->status !== 'approved') {
            return false;
        }

        $this->status = 'implemented';
        $this->implemented_at = now();
        return $this->save();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByType($query, $type)
    {
        return $query->where('change_type', $type);
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', ['submitted', 'under_review']);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($changeRequest) {
            if (empty($changeRequest->uuid)) {
                $changeRequest->uuid = Str::uuid();
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
        return $this->title ?? "Yêu cầu thay đổi #{$this->id}";
    }

    protected function notificationMap(): array
    {
        return [
            'submitted' => [
                'title'    => 'Yêu cầu thay đổi cần duyệt',
                'body'     => 'Yêu cầu thay đổi "{name}" cần được xem xét.',
                'target'   => ['management', 'pm'],
                'tab'      => 'change_requests',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
            'approved' => [
                'title'    => 'Yêu cầu thay đổi đã được duyệt',
                'body'     => 'Yêu cầu thay đổi "{name}" đã được phê duyệt.',
                'target'   => ['creator', 'pm'],
                'tab'      => 'change_requests',
                'priority' => 'medium',
                'category' => 'status_change',
            ],
            'rejected' => [
                'title'    => 'Yêu cầu thay đổi bị từ chối',
                'body'     => 'Yêu cầu thay đổi "{name}" bị từ chối: {reason}',
                'target'   => ['creator', 'pm'],
                'tab'      => 'change_requests',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
        ];
    }
}
