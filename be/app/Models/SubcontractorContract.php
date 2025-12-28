<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SubcontractorContract extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'subcontractor_id',
        'project_id',
        'global_subcontractor_id',
        'contract_number',
        'contract_name',
        'description',
        'contract_date',
        'start_date',
        'end_date',
        'contract_value',
        'advance_payment',
        'retention',
        'retention_percentage',
        'payment_method',
        'payment_schedule',
        'status',
        'terms_and_conditions',
        'signed_by',
        'signed_at',
        'created_by',
    ];

    protected $casts = [
        'contract_date' => 'date',
        'start_date' => 'date',
        'end_date' => 'date',
        'contract_value' => 'decimal:2',
        'advance_payment' => 'decimal:2',
        'retention' => 'decimal:2',
        'retention_percentage' => 'decimal:2',
        'payment_schedule' => 'array',
        'signed_at' => 'datetime',
    ];

    protected $appends = [
        'remaining_value',
        'paid_percentage',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function subcontractor(): BelongsTo
    {
        return $this->belongsTo(Subcontractor::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function globalSubcontractor(): BelongsTo
    {
        return $this->belongsTo(GlobalSubcontractor::class);
    }

    public function signer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'signed_by');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function acceptances(): HasMany
    {
        return $this->hasMany(SubcontractorAcceptance::class);
    }

    public function progress(): HasMany
    {
        return $this->hasMany(SubcontractorProgress::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SubcontractorPayment::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getRemainingValueAttribute(): float
    {
        $totalPaid = $this->payments()->where('status', 'paid')->sum('amount');
        return $this->contract_value - $totalPaid;
    }

    public function getPaidPercentageAttribute(): float
    {
        if ($this->contract_value == 0) {
            return 0;
        }
        $totalPaid = $this->payments()->where('status', 'paid')->sum('amount');
        return ($totalPaid / $this->contract_value) * 100;
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function sign(?User $user = null): bool
    {
        if ($user) {
            $this->signed_by = $user->id;
        }
        $this->signed_at = now();
        $this->status = 'active';
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
