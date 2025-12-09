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
        'due_date',
        'paid_date',
        'status',
        'confirmed_by',
        'confirmed_at',
        'reminder_sent_at',
        'reminder_count',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'due_date' => 'date',
        'paid_date' => 'date',
        'confirmed_at' => 'datetime',
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
        return $this->status === 'paid';
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function markAsPaid(?User $user = null): bool
    {
        $this->status = 'paid';
        $this->paid_date = now()->toDateString();
        if ($user) {
            $this->confirmed_by = $user->id;
            $this->confirmed_at = now();
        }
        return $this->save();
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
