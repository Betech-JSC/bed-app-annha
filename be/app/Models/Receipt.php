<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Receipt extends Model
{
    protected $fillable = [
        'uuid',
        'project_id',
        'receipt_number',
        'receipt_date',
        'type',
        'supplier_id',
        'cost_id',
        'amount',
        'payment_method',
        'description',
        'notes',
        'status',
        'created_by',
        'verified_by',
        'verified_at',
    ];

    protected $casts = [
        'receipt_date' => 'date',
        'amount' => 'decimal:2',
        'verified_at' => 'datetime',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(MaterialSupplier::class, 'supplier_id');
    }

    public function cost(): BelongsTo
    {
        return $this->belongsTo(Cost::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($receipt) {
            if (empty($receipt->uuid)) {
                $receipt->uuid = Str::uuid();
            }
            if (empty($receipt->receipt_number)) {
                $receipt->receipt_number = 'RCP-' . date('Ymd') . '-' . strtoupper(Str::random(6));
            }
        });
    }
}

