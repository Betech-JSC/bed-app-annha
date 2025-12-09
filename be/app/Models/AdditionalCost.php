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
        'amount',
        'description',
        'status',
        'proposed_by',
        'approved_by',
        'approved_at',
        'rejected_reason',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'approved_at' => 'datetime',
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

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
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
        return $this->status === 'pending_approval';
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

    public function reject(string $reason): bool
    {
        $this->status = 'rejected';
        $this->rejected_reason = $reason;
        return $this->save();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopePending($query)
    {
        return $query->where('status', 'pending_approval');
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

        static::creating(function ($cost) {
            if (empty($cost->uuid)) {
                $cost->uuid = Str::uuid();
            }
        });
    }
}
