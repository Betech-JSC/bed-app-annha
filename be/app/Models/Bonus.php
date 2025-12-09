<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Bonus extends Model
{
    protected $fillable = [
        'uuid',
        'user_id',
        'project_id',
        'bonus_type',
        'amount',
        'calculation_method',
        'project_completion_percentage',
        'performance_metrics',
        'period_start',
        'period_end',
        'description',
        'status',
        'approved_by',
        'approved_at',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'project_completion_percentage' => 'decimal:2',
        'performance_metrics' => 'array',
        'period_start' => 'date',
        'period_end' => 'date',
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

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
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

    public function scopeForProject($query, $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    public function scopeAutoCalculated($query)
    {
        return $query->where('calculation_method', 'auto');
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($bonus) {
            if (empty($bonus->uuid)) {
                $bonus->uuid = Str::uuid();
            }
        });
    }
}
