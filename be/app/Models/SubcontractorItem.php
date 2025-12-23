<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class SubcontractorItem extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'subcontractor_id',
        'name',
        'description',
        'unit_price',
        'quantity',
        'unit',
        'total_amount',
        'order',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'quantity' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'order' => 'integer',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function subcontractor(): BelongsTo
    {
        return $this->belongsTo(Subcontractor::class);
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function calculateTotal(): void
    {
        $this->total_amount = $this->unit_price * $this->quantity;
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($item) {
            if (empty($item->uuid)) {
                $item->uuid = Str::uuid();
            }
            // Auto calculate total
            if (empty($item->total_amount)) {
                $item->calculateTotal();
            }
        });

        static::updating(function ($item) {
            // Auto calculate total when price or quantity changes
            if ($item->isDirty(['unit_price', 'quantity'])) {
                $item->calculateTotal();
            }
        });

        static::saved(function ($item) {
            // Update subcontractor total_quote when items change
            $subcontractor = $item->subcontractor;
            if ($subcontractor) {
                $totalQuote = $subcontractor->items()->sum('total_amount');
                $subcontractor->update(['total_quote' => $totalQuote]);
            }
        });

        static::deleted(function ($item) {
            // Update subcontractor total_quote when item deleted
            $subcontractor = $item->subcontractor;
            if ($subcontractor) {
                $totalQuote = $subcontractor->items()->sum('total_amount');
                $subcontractor->update(['total_quote' => $totalQuote]);
            }
        });
    }
}

