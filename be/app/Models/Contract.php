<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Contract extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'project_id',
        'contract_value',
        'signed_date',
        'status',
        'approved_by',
        'approved_at',
        'rejected_reason',
    ];

    protected $casts = [
        'contract_value' => 'decimal:2',
        'signed_date' => 'date',
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

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(ProjectPayment::class);
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
        return $this->status === 'pending_customer_approval';
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
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($contract) {
            if (empty($contract->uuid)) {
                $contract->uuid = Str::uuid();
            }
        });
    }
}
