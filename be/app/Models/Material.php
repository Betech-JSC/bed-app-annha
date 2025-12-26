<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Material extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'code',
        'unit',
        'description',
        'category',
        'unit_price',
        'min_stock',
        'max_stock',
        'status',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
        'min_stock' => 'decimal:2',
        'max_stock' => 'decimal:2',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function transactions(): HasMany
    {
        return $this->hasMany(MaterialTransaction::class);
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getCurrentStockAttribute(): float
    {
        $in = $this->transactions()->where('type', 'in')->sum('quantity');
        $out = $this->transactions()->where('type', 'out')->sum('quantity');
        return $in - $out;
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($material) {
            if (empty($material->uuid)) {
                $material->uuid = Str::uuid();
            }
        });
    }
}

