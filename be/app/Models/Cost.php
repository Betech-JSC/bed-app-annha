<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class Cost extends Model
{
    protected $fillable = [
        'uuid',
        'project_id',
        'category',
        'cost_group_id',
        'time_tracking_id',
        'payroll_id',
        'subcontractor_id',
        'name',
        'amount',
        'description',
        'cost_date',
        'status',
        'created_by',
        'management_approved_by',
        'management_approved_at',
        'accountant_approved_by',
        'accountant_approved_at',
        'rejected_reason',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'cost_date' => 'date',
        'management_approved_at' => 'datetime',
        'accountant_approved_at' => 'datetime',
    ];

    protected $appends = [
        'is_approved',
        'is_pending',
        'category_label',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function managementApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'management_approved_by');
    }

    public function accountantApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'accountant_approved_by');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function costGroup(): BelongsTo
    {
        return $this->belongsTo(CostGroup::class, 'cost_group_id');
    }

    public function timeTracking(): BelongsTo
    {
        return $this->belongsTo(TimeTracking::class, 'time_tracking_id');
    }

    public function payroll(): BelongsTo
    {
        return $this->belongsTo(Payroll::class, 'payroll_id');
    }

    public function subcontractor(): BelongsTo
    {
        return $this->belongsTo(Subcontractor::class, 'subcontractor_id');
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
        return in_array($this->status, [
            'pending_management_approval',
            'pending_accountant_approval'
        ]);
    }

    public function getCategoryLabelAttribute(): string
    {
        // Ưu tiên lấy từ CostGroup nếu có
        if ($this->costGroup) {
            return $this->costGroup->name;
        }
        
        // Fallback về category enum cũ (backward compatible)
        return match ($this->category) {
            'construction_materials' => 'Vật liệu xây dựng',
            'concrete' => 'Bê tông',
            'labor' => 'Nhân công',
            'equipment' => 'Thiết bị',
            'transportation' => 'Vận chuyển',
            'other' => 'Chi phí khác',
            default => 'Khác',
        };
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    /**
     * Submit để Ban điều hành duyệt (từ draft)
     */
    public function submitForManagementApproval(): bool
    {
        if ($this->status !== 'draft') {
            return false;
        }

        $this->status = 'pending_management_approval';
        return $this->save();
    }

    /**
     * Ban điều hành duyệt
     */
    public function approveByManagement(?User $user = null): bool
    {
        if ($this->status !== 'pending_management_approval') {
            return false;
        }

        $this->status = 'pending_accountant_approval';
        if ($user) {
            $this->management_approved_by = $user->id;
            $this->management_approved_at = now();
        }
        return $this->save();
    }

    /**
     * Kế toán xác nhận (final approval)
     */
    public function approveByAccountant(?User $user = null): bool
    {
        if ($this->status !== 'pending_accountant_approval') {
            return false;
        }

        $this->status = 'approved';
        if ($user) {
            $this->accountant_approved_by = $user->id;
            $this->accountant_approved_at = now();
        }
        return $this->save();
    }

    /**
     * Từ chối (có thể từ bất kỳ bước nào)
     */
    public function reject(string $reason, ?User $user = null): bool
    {
        $this->status = 'rejected';
        $this->rejected_reason = $reason;

        // Xác định ai từ chối dựa trên status hiện tại
        if ($this->getOriginal('status') === 'pending_management_approval') {
            if ($user) {
                $this->management_approved_by = $user->id;
                $this->management_approved_at = now();
            }
        } elseif ($this->getOriginal('status') === 'pending_accountant_approval') {
            if ($user) {
                $this->accountant_approved_by = $user->id;
                $this->accountant_approved_at = now();
            }
        }

        return $this->save();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', [
            'pending_management_approval',
            'pending_accountant_approval'
        ]);
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($cost) {
            if (empty($cost->uuid)) {
                $cost->uuid = Str::uuid();
            }
        });
    }
}
