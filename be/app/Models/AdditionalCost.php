<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class AdditionalCost extends Model
{
    protected $fillable = [
        'uuid',
        'project_id',
        'defect_id',
        'task_id',
        'amount',
        'description',
        'status',
        'proposed_by',
        'approved_by',
        'approved_at',
        'rejected_reason',
        'paid_date',
        'actual_amount',
        'confirmed_by',
        'confirmed_at',
        'customer_paid_by',
        'customer_paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'actual_amount' => 'decimal:2',
        'approved_at' => 'datetime',
        'paid_date' => 'date',
        'confirmed_at' => 'datetime',
        'customer_paid_at' => 'datetime',
    ];

    protected $appends = [
        'is_approved',
        'is_pending',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function proposer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'proposed_by');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function customerPaidBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_paid_by');
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function defect(): BelongsTo
    {
        return $this->belongsTo(Defect::class, 'defect_id');
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getIsApprovedAttribute(): bool
    {
        return in_array($this->status, ['approved', 'confirmed']); // Backward compatible
    }

    public function getIsPendingAttribute(): bool
    {
        return $this->status === 'pending' || $this->status === 'pending_approval'; // Backward compatible
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    /**
     * Khách hàng đánh dấu đã thanh toán (upload chứng từ + nhập thông tin)
     */
    public function markAsPaidByCustomer(?User $user = null, ?string $paidDate = null, ?float $actualAmount = null): bool
    {
        if ($this->status !== 'pending') {
            return false;
        }

        $this->status = 'customer_paid';
        if ($paidDate) {
            $this->paid_date = $paidDate;
        } else {
            $this->paid_date = now()->toDateString();
        }
        
        // Nếu có số tiền thực tế khác với số tiền ban đầu
        if ($actualAmount !== null && $actualAmount != $this->amount) {
            $this->actual_amount = $actualAmount;
        }

        if ($user) {
            $this->customer_paid_by = $user->id;
            $this->customer_paid_at = now();
        }
        
        return $this->save();
    }

    /**
     * Kế toán xác nhận đã nhận tiền (sau khi khách hàng đã thanh toán)
     */
    public function confirm(?User $user = null): bool
    {
        // Chỉ cho phép nếu khách hàng đã thanh toán
        if ($this->status !== 'customer_paid') {
            return false;
        }

        $this->status = 'confirmed';
        if ($user) {
            $this->confirmed_by = $user->id;
            $this->confirmed_at = now();
        }
        return $this->save();
    }

    /**
     * Duyệt chi phí phát sinh (backward compatible - giữ lại cho workflow cũ)
     */
    public function approve(?User $user = null): bool
    {
        // Nếu đang ở customer_paid, chuyển thành confirmed
        if ($this->status === 'customer_paid') {
            return $this->confirm($user);
        }

        // Workflow cũ: pending_approval → approved
        if ($this->status === 'pending_approval') {
            $this->status = 'approved';
            if ($user) {
                $this->approved_by = $user->id;
            }
            $this->approved_at = now();
            return $this->save();
        }

        return false;
    }

    public function reject(string $reason, ?User $user = null): bool
    {
        $this->status = 'rejected';
        $this->rejected_reason = $reason;
        if ($user) {
            $this->rejected_by = $user->id;
            $this->rejected_at = now();
        }
        return $this->save();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopePending($query)
    {
        return $query->whereIn('status', ['pending', 'pending_approval']); // Backward compatible
    }

    public function scopeApproved($query)
    {
        return $query->whereIn('status', ['approved', 'confirmed']); // Backward compatible
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
