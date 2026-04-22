<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Traits\HasAutoCode;

class Material extends Model
{
    use SoftDeletes, HasAutoCode;

    protected $fillable = [
        'uuid',
        'name',
        'code',
        'unit',
        'description',
        'category',
        'cost_group_id',
        'unit_price',
        'status',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function transactions(): HasMany
    {
        return $this->hasMany(MaterialTransaction::class);
    }

    public function billItems(): HasMany
    {
        return $this->hasMany(MaterialBillItem::class);
    }

    public function costGroup(): BelongsTo
    {
        return $this->belongsTo(CostGroup::class);
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

