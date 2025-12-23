<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class AcceptanceStage extends Model
{
    protected $fillable = [
        'uuid',
        'project_id',
        'name',
        'description',
        'order',
        'is_custom',
        'status',
        'internal_approved_by',
        'internal_approved_at',
        'customer_approved_by',
        'customer_approved_at',
        'design_approved_by',
        'design_approved_at',
        'owner_approved_by',
        'owner_approved_at',
        'rejected_by',
        'rejected_at',
        'rejection_reason',
    ];

    protected $casts = [
        'is_custom' => 'boolean',
        'order' => 'integer',
        'internal_approved_at' => 'datetime',
        'customer_approved_at' => 'datetime',
        'design_approved_at' => 'datetime',
        'owner_approved_at' => 'datetime',
        'rejected_at' => 'datetime',
    ];

    protected $appends = [
        'is_fully_approved',
        'has_open_defects',
        'is_completed',
        'completion_percentage',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function internalApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'internal_approved_by');
    }

    public function customerApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_approved_by');
    }

    public function designApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'design_approved_by');
    }

    public function ownerApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_approved_by');
    }

    public function rejector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    public function defects(): HasMany
    {
        return $this->hasMany(Defect::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function items(): HasMany
    {
        return $this->hasMany(AcceptanceItem::class)->orderBy('order');
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getIsFullyApprovedAttribute(): bool
    {
        return $this->status === 'owner_approved';
    }

    public function getHasOpenDefectsAttribute(): bool
    {
        return $this->defects()->whereIn('status', ['open', 'in_progress'])->exists();
    }

    public function getIsCompletedAttribute(): bool
    {
        $items = $this->items;
        if ($items->isEmpty()) {
            return false;
        }
        // Tiến độ hoàn thành khi tất cả hạng mục đạt nghiệm thu
        return $items->every(function ($item) {
            return $item->acceptance_status === 'approved';
        });
    }

    public function getCompletionPercentageAttribute(): float
    {
        $items = $this->items;
        if ($items->isEmpty()) {
            return 0;
        }
        $approvedCount = $items->where('acceptance_status', 'approved')->count();
        return ($approvedCount / $items->count()) * 100;
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function approveInternal(?User $user = null): bool
    {
        $this->status = 'internal_approved';
        if ($user) {
            $this->internal_approved_by = $user->id;
        }
        $this->internal_approved_at = now();
        return $this->save();
    }

    public function approveCustomer(?User $user = null): bool
    {
        if ($this->status !== 'internal_approved') {
            return false;
        }
        $this->status = 'customer_approved';
        if ($user) {
            $this->customer_approved_by = $user->id;
        }
        $this->customer_approved_at = now();
        return $this->save();
    }

    public function approveDesign(?User $user = null): bool
    {
        if ($this->status !== 'customer_approved') {
            return false;
        }
        $this->status = 'design_approved';
        if ($user) {
            $this->design_approved_by = $user->id;
        }
        $this->design_approved_at = now();
        return $this->save();
    }

    public function approveOwner(?User $user = null): bool
    {
        if ($this->status !== 'design_approved') {
            return false;
        }
        // Check for open defects
        if ($this->has_open_defects) {
            return false;
        }
        $this->status = 'owner_approved';
        if ($user) {
            $this->owner_approved_by = $user->id;
        }
        $this->owner_approved_at = now();
        return $this->save();
    }

    public function reject(string $reason, ?User $user = null): bool
    {
        $this->status = 'rejected';
        $this->rejection_reason = $reason;
        if ($user) {
            $this->rejected_by = $user->id;
        }
        $this->rejected_at = now();
        return $this->save();
    }

    /**
     * Kiểm tra và cập nhật trạng thái hoàn thành của tiến độ
     */
    public function checkCompletion(): void
    {
        if ($this->is_completed && $this->status !== 'owner_approved') {
            // Auto update stage status if all items are approved
            // Có thể tự động chuyển sang internal_approved nếu tất cả items đã approved
            if ($this->status === 'pending') {
                $this->status = 'internal_approved';
                $this->save();
            }
        }
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'owner_approved');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($stage) {
            if (empty($stage->uuid)) {
                $stage->uuid = Str::uuid();
            }
        });
    }
}
