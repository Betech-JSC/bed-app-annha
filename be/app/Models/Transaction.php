<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'user_id',
        'wallet_id',
        'type',
        'method',
        'amount',
        'fee',
        'status',
        'reference_type',
        'reference_id',
        'description',
        'gateway_data',
        'metadata',
        'completed_at',
        'expires_at',
        'cancelled_at',
    ];

    protected $casts = [
        'amount'        => 'decimal:2',
        'fee'           => 'decimal:2',
        'gateway_data'  => 'array',
        'metadata'      => 'array',
        'completed_at'  => 'datetime',
        'expires_at'    => 'datetime',
        'cancelled_at'  => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function wallet(): BelongsTo
    {
        return $this->belongsTo(Wallet::class);
    }
}
