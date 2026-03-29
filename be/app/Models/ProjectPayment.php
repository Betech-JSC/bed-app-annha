<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class ProjectPayment extends Model
{
    protected $fillable = [
        'uuid',
        'project_id',
        'contract_id',
        'payment_number',
        'amount',
        'notes',
        'due_date',
        'paid_date',
        'status',
        'confirmed_by',
        'confirmed_at',
        'customer_approved_by',
        'customer_approved_at',
        'payment_proof_uploaded_at',
        'reminder_sent_at',
        'reminder_count',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'date',
        'paid_date' => 'date',
        'confirmed_at' => 'datetime',
        'customer_approved_at' => 'datetime',
        'payment_proof_uploaded_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
        'reminder_count' => 'integer',
    ];

    protected $appends = [
        'is_overdue',
        'is_paid',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class);
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function customerApprover(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_approved_by');
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getIsOverdueAttribute(): bool
    {
        return $this->status === 'overdue' || ($this->status === 'pending' && $this->due_date < now()->toDateString());
    }

    public function getIsPaidAttribute(): bool
    {
        return in_array($this->status, ['customer_paid', 'confirmed', 'paid']); // customer_paid = đã thanh toán, chờ kế toán xác nhận
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    /**
     * Khách hàng duyệt thanh toán (sau khi upload hình xác nhận)
     */
    public function approveByCustomer(?User $user = null): bool
    {
        if ($this->status !== 'customer_pending_approval') {
            return false;
        }

        $this->status = 'customer_approved';
        if ($user) {
            $this->customer_approved_by = $user->id;
            $this->customer_approved_at = now();
        }
        return $this->save();
    }

    /**
     * Kế toán xác nhận thanh toán (sau khi khách hàng đã thanh toán)
     */
    public function markAsPaid(?User $user = null): bool
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
     * Khách hàng đánh dấu đã thanh toán (upload chứng từ + nhập thông tin)
     */
    public function markAsPaidByCustomer(?User $user = null, ?string $paidDate = null, ?float $actualAmount = null): bool
    {
        // FIX BUG 4: Also accept 'overdue' payments (controller already checks both)
        if (!in_array($this->status, ['pending', 'overdue'])) {
            return false;
        }

        $this->status = 'customer_paid';
        if ($paidDate) {
            $this->paid_date = $paidDate;
        } else {
            $this->paid_date = now()->toDateString();
        }
        
        // Nếu có số tiền thực tế khác với số tiền ban đầu, lưu vào notes hoặc tạo field mới
        if ($actualAmount !== null && $actualAmount != $this->amount) {
            $this->notes = ($this->notes ? $this->notes . "\n" : '') . 
                "Số tiền thực tế: " . number_format($actualAmount, 0, ',', '.') . " VND";
        }

        if ($user) {
            $this->customer_approved_by = $user->id;
            $this->customer_approved_at = now();
        }
        $this->payment_proof_uploaded_at = now();
        
        return $this->save();
    }

    /**
     * Đánh dấu đã upload hình xác nhận chuyển khoản
     */
    public function markPaymentProofUploaded(): bool
    {
        if ($this->status === 'pending') {
            $this->status = 'customer_pending_approval';
            $this->payment_proof_uploaded_at = now();
            return $this->save();
        }
        return false;
    }

    public function markAsOverdue(): bool
    {
        if ($this->status === 'pending' && $this->due_date < now()->toDateString()) {
            $this->status = 'overdue';
            return $this->save();
        }
        return false;
    }

    public function incrementReminder(): bool
    {
        $this->reminder_count++;
        $this->reminder_sent_at = now();
        return $this->save();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'overdue')
            ->orWhere(function ($q) {
                $q->where('status', 'pending')
                    ->where('due_date', '<', now()->toDateString());
            });
    }

    public function scopeDueSoon($query, $days = 7)
    {
        return $query->where('status', 'pending')
            ->whereBetween('due_date', [now()->toDateString(), now()->addDays($days)->toDateString()]);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($payment) {
            if (empty($payment->uuid)) {
                $payment->uuid = Str::uuid();
            }
        });
    }
}
