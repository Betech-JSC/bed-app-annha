<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class WarrantyRetention extends Model
{
    protected $fillable = [
        'uuid', 'project_id', 'subcontractor_id',
        'retention_amount', 'retention_percentage',
        'warranty_start_date', 'warranty_end_date',
        'release_status', 'released_amount', 'released_date', 'released_by',
        'notes', 'created_by',
    ];

    protected $casts = [
        'retention_amount'     => 'decimal:2',
        'retention_percentage' => 'decimal:2',
        'released_amount'      => 'decimal:2',
        'warranty_start_date'  => 'date',
        'warranty_end_date'    => 'date',
        'released_date'        => 'date',
    ];

    protected $appends = ['status_label', 'is_expired', 'remaining_amount'];

    // --- Relationships ---
    public function project(): BelongsTo       { return $this->belongsTo(Project::class); }
    public function subcontractor(): BelongsTo { return $this->belongsTo(Subcontractor::class); }
    public function releasedByUser(): BelongsTo { return $this->belongsTo(User::class, 'released_by'); }
    public function creator(): BelongsTo       { return $this->belongsTo(User::class, 'created_by'); }

    // --- Scopes ---
    public function scopeHolding($q)  { return $q->where('release_status', 'holding'); }
    public function scopeExpired($q)  { return $q->where('warranty_end_date', '<', now()); }

    // --- Accessors ---
    public function getStatusLabelAttribute(): string
    {
        return match ($this->release_status) {
            'holding'         => 'Đang giữ',
            'partial_release' => 'Giải phóng một phần',
            'released'        => 'Đã giải phóng',
            default           => 'Không xác định',
        };
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->warranty_end_date && $this->warranty_end_date->isPast();
    }

    public function getRemainingAmountAttribute(): float
    {
        return max(0, (float) $this->retention_amount - (float) $this->released_amount);
    }

    // --- Methods ---
    public function partialRelease(float $amount, ?User $user = null): bool
    {
        $maxRelease = $this->remaining_amount;
        $releaseAmount = min($amount, $maxRelease);
        if ($releaseAmount <= 0) return false;

        $this->released_amount = (float) $this->released_amount + $releaseAmount;
        $this->release_status  = $this->released_amount >= $this->retention_amount ? 'released' : 'partial_release';
        $this->released_date   = now();
        if ($user) $this->released_by = $user->id;

        return $this->save();
    }

    public function fullRelease(?User $user = null): bool
    {
        return $this->partialRelease($this->remaining_amount, $user);
    }

    // --- Boot ---
    protected static function boot()
    {
        parent::boot();
        static::creating(fn($m) => $m->uuid = $m->uuid ?: Str::uuid());
    }
}
