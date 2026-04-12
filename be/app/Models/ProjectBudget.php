<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use App\Traits\HasAutoCode;

class ProjectBudget extends Model
{
    use HasAutoCode;

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
            'time' => $this->created_at->format('H:i d/m/Y'),
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

