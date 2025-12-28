<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Supplier extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'code',
        'category',
        'contact_person',
        'phone',
        'email',
        'address',
        'tax_code',
        'bank_name',
        'bank_account',
        'bank_account_holder',
        'description',
        'status',
        'total_debt',
        'total_paid',
    ];

    protected $casts = [
        'total_debt' => 'decimal:2',
        'total_paid' => 'decimal:2',
    ];

    protected $appends = [
        'remaining_debt',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function contracts(): HasMany
    {
        return $this->hasMany(SupplierContract::class);
    }

    public function acceptances(): HasMany
    {
        return $this->hasMany(SupplierAcceptance::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getRemainingDebtAttribute(): float
    {
        return $this->total_debt - $this->total_paid;
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function recordPayment(float $amount): bool
    {
        $this->total_paid += $amount;
        return $this->save();
    }

    public function recordDebt(float $amount): bool
    {
        $this->total_debt += $amount;
        return $this->save();
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($supplier) {
            if (empty($supplier->uuid)) {
                $supplier->uuid = Str::uuid();
            }
        });
    }
}
