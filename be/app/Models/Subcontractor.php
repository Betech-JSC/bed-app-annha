<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Support\Str;

class Subcontractor extends Model
{
    protected $fillable = [
        'uuid',
        'project_id',
        'name',
        'category',
        'total_quote',
        'advance_payment',
        'total_paid',
        'progress_start_date',
        'progress_end_date',
        'progress_status',
        'payment_status',
        'approved_by',
        'approved_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'total_quote' => 'decimal:2',
        'advance_payment' => 'decimal:2',
        'total_paid' => 'decimal:2',
        'progress_start_date' => 'date',
        'progress_end_date' => 'date',
        'approved_at' => 'datetime',
    ];

    protected $appends = [
        'remaining_amount',
        'payment_percentage',
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

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SubcontractorItem::class)->orderBy('order');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SubcontractorPayment::class)->orderByDesc('created_at');
    }

    public function costs(): HasMany
    {
        return $this->hasMany(Cost::class);
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(SubcontractorContract::class);
    }

    public function acceptances(): HasMany
    {
        return $this->hasMany(SubcontractorAcceptance::class);
    }

    public function progress(): HasMany
    {
        return $this->hasMany(SubcontractorProgress::class);
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getRemainingAmountAttribute(): float
    {
        return $this->total_quote - $this->total_paid;
    }

    public function getPaymentPercentageAttribute(): float
    {
        if ($this->total_quote == 0) {
            return 0;
        }
        return ($this->total_paid / $this->total_quote) * 100;
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function recordPayment(float $amount): bool
    {
        $this->total_paid += $amount;
        if ($this->total_paid >= $this->total_quote) {
            $this->payment_status = 'completed';
        } elseif ($this->total_paid > 0) {
            $this->payment_status = 'partial';
        }
        return $this->save();
    }

    public function approve(?User $user = null): bool
    {
        if ($user) {
            $this->approved_by = $user->id;
        }
        $this->approved_at = now();
        return $this->save();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    public function scopeByProgressStatus($query, $status)
    {
        return $query->where('progress_status', $status);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($subcontractor) {
            if (empty($subcontractor->uuid)) {
                $subcontractor->uuid = Str::uuid();
            }
        });
    }
}
