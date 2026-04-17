<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use App\Traits\HasAutoCode;

class ProjectBudget extends Model
{
    use HasAutoCode, \App\Traits\NotifiesUsers, \App\Traits\Approvable;

    protected $fillable = [
        'uuid',
        'project_id',
        'code',
        'name',
        'version',
        'total_budget',
        'estimated_cost',
        'actual_cost',
        'remaining_budget',
        'contract_value',
        'profit_percentage',
        'profit_amount',
        'budget_date',
        'notes',
        'status',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'total_budget' => 'decimal:2',
        'estimated_cost' => 'decimal:2',
        'actual_cost' => 'decimal:2',
        'remaining_budget' => 'decimal:2',
        'contract_value' => 'decimal:2',
        'profit_percentage' => 'decimal:2',
        'profit_amount' => 'decimal:2',
        'budget_date' => 'date',
        'approved_at' => 'datetime',
    ];

    protected $appends = [
        'next_action',
        'approval_status_info',
    ];

    // ==================================================================
    // ACCESSORS
    // ==================================================================

    public function getNextActionAttribute(): array
    {
        return match ($this->status) {
            'draft'            => ['role' => 'QLDA / Ban nội bộ', 'label' => 'Chờ gửi duyệt'],
            'pending_approval' => ['role' => 'Ban Điều Hành', 'label' => 'Chờ phê duyệt'],
            'rejected'         => ['role' => 'QLDA / Ban nội bộ', 'label' => 'Chỉnh sửa lại'],
            'approved'         => ['role' => 'Kế toán', 'label' => 'Đã áp dụng'],
            default            => ['role' => 'N/A', 'label' => 'N/A']
        };
    }

    public function getApprovalStatusInfoAttribute(): array
    {
        $history = [];

        // 1. Initial creation
        $history[] = [
            'status' => 'submitted',
            'label' => 'Đã gửi duyệt',
            'user' => $this->creator->name ?? 'N/A',
            'time' => $this->created_at ? $this->created_at->format('H:i d/m/Y') : 'N/A',
        ];

        // 2. Approval or Rejection
        if ($this->status === 'approved' && $this->approved_at) {
            $history[] = [
                'status' => 'approved',
                'label' => 'Ban Điều Hành đã duyệt',
                'user' => $this->approver->name ?? 'Lãnh đạo',
                'time' => $this->approved_at->format('H:i d/m/Y'),
            ];
        } elseif ($this->status === 'rejected' && $this->approved_at) {
            $history[] = [
                'status' => 'rejected',
                'label' => 'Bị từ chối',
                'user' => $this->approver->name ?? 'Lãnh đạo',
                'time' => $this->approved_at->format('H:i d/m/Y'),
                'note' => $this->notes
            ];
        }

        return [
            'current' => $this->status,
            'history' => $history,
            'next' => $this->next_action
        ];
    }

    // ==================================================================
    // Approvable Implementation
    // ==================================================================
    public function getApprovalSummary(): string
    {
        return "Duyệt ngân sách dự án: " . ($this->name ?: 'N/A');
    }

    public function getApprovalMetadata(): array
    {
        return [
            'total_amount' => $this->total_amount,
            'version' => $this->version,
        ];
    }

    public function isPendingApproval(): bool
    {
        return $this->status === 'pending_approval';
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
        return $this->name ?? "Ngân sách #{$this->id}";
    }

    protected function notificationMap(): array
    {
        return [
            'submitted' => [
                'title'    => 'Ngân sách dự án cần duyệt',
                'body'     => 'Phiên bản ngân sách "{name}" cần được phê duyệt.',
                'target'   => ['management', 'pm'],
                'tab'      => 'budgets',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
            'approved' => [
                'title'    => 'Ngân sách đã được duyệt',
                'body'     => 'Ngân sách "{name}" đã được phê duyệt.',
                'target'   => ['creator', 'pm'],
                'tab'      => 'budgets',
                'priority' => 'medium',
                'category' => 'status_change',
            ],
            'rejected' => [
                'title'    => 'Ngân sách bị từ chối',
                'body'     => 'Ngân sách "{name}" bị từ chối: {reason}',
                'target'   => ['creator', 'pm'],
                'tab'      => 'budgets',
                'priority' => 'high',
                'category' => 'workflow_approval',
            ],
        ];
    }

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(BudgetItem::class, 'budget_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
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

    public function approve(?User $user = null): bool
    {
        $this->status = 'approved';
        if ($user) {
            $this->approved_by = $user->id;
            $this->approved_at = now();
        }
        return $this->save();
    }

    public function reject(?User $user = null, ?string $reason = null): bool
    {
        $this->status = 'rejected';
        if ($user) {
            $this->approved_by = $user->id;
            $this->approved_at = now();
        }
        $this->notes = ($this->notes ? $this->notes . "\n" : '') . "Lý do từ chối: " . $reason;
        return $this->save();
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($budget) {
            if (empty($budget->uuid)) {
                $budget->uuid = Str::uuid();
            }
        });
    }
}
