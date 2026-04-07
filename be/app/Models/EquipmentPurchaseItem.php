<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EquipmentPurchaseItem extends Model
{
    protected $fillable = [
        'purchase_id', 'name', 'code', 'quantity', 'unit_price', 'total_price',
    ];

    protected $casts = [
        'quantity'    => 'integer',
        'unit_price'  => 'decimal:2',
        'total_price' => 'decimal:2',
    ];

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(EquipmentPurchase::class, 'purchase_id');
    }

    protected static function boot()
    {
        parent::boot();

        // Auto-calculate total_price
        static::saving(function ($item) {
            $item->total_price = $item->quantity * $item->unit_price;
        });
    }
}
