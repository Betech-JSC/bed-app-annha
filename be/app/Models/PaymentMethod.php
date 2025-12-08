<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentMethod extends Model
{
    protected $fillable = [
        'code',
        'name',
        'provider',
        'type',
        'is_active',
        'min_amount',
        'max_amount',
        'fee_percent',
        'fee_flat',
        'instructions',
        'metadata',
    ];

    protected $casts = [
        'is_active'   => 'boolean',
        'metadata'    => 'array',
        'min_amount'  => 'decimal:2',
        'max_amount'  => 'decimal:2',
        'fee_percent' => 'decimal:2',
        'fee_flat'    => 'decimal:2',
    ];
}

