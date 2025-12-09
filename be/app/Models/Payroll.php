<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Payroll extends Model
{
    protected $fillable = [
        'uuid',
        'user_id',
        'period_type',
        'period_start',
        'period_end',
        'base_salary',
        'total_hours',
        'overtime_hours',
        'overtime_rate',
        'bonus_amount',
        'deductions',
        'gross_salary',
        'tax',
        'net_salary',
        'status',
        'calculated_at',
        'approved_by',
        'approved_at',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'base_salary' => 'decimal:2',
        'total_hours' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'overtime_rate' => 'decimal:2',
        'bonus_amount' => 'decimal:2',
        'deductions' => 'decimal:2',
        'gross_salary' => 'decimal:2',
        'tax' => 'decimal:2',
        'net_salary' => 'decimal:2',
        'calculated_at' => 'datetime',
        'approved_at' => 'datetime',
        'paid_at' => 'datetime',
    ];

    protected $appends = [
        'is_approved',
        'is_paid',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getIsApprovedAttribute(): bool
    {
        return $this->status === 'approved';
    }

    public function getIsPaidAttribute(): bool
    {
        return $this->status === 'paid';
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function calculate(): bool
    {
        // This method will be called by PayrollCalculationService
        $this->status = 'calculated';
        $this->calculated_at = now();
        return $this->save();
    }

    public function approve(?User $user = null): bool
    {
        $this->status = 'approved';
        if ($user) {
            $this->approved_by = $user->id;
        }
        $this->approved_at = now();
        return $this->save();
    }

    public function markAsPaid(): bool
    {
        $this->status = 'paid';
        $this->paid_at = now();
        return $this->save();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByPeriod($query, $startDate, $endDate)
    {
        return $query->whereBetween('period_start', [$startDate, $endDate])
            ->orWhereBetween('period_end', [$startDate, $endDate]);
    }

    public function scopePending($query)
    {
        return $query->whereIn('status', ['draft', 'calculated']);
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

        static::creating(function ($payroll) {
            if (empty($payroll->uuid)) {
                $payroll->uuid = Str::uuid();
            }
        });
    }
}
