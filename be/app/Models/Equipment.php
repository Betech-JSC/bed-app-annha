<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Equipment extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'code',
        'quantity',
        'category',
        'type',
        'brand',
        'model',
        'serial_number',
        'purchase_date',
        'purchase_price',
        'rental_rate_per_day',
        'maintenance_interval_days',
        'last_maintenance_date',
        'next_maintenance_date',
        'status',
        'notes',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'purchase_date' => 'date',
        'purchase_price' => 'decimal:2',
        'rental_rate_per_day' => 'decimal:2',
        'last_maintenance_date' => 'date',
        'next_maintenance_date' => 'date',
        'maintenance_interval_days' => 'integer',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function allocations(): HasMany
    {
        return $this->hasMany(EquipmentAllocation::class);
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(EquipmentMaintenance::class);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($equipment) {
            if (empty($equipment->uuid)) {
                $equipment->uuid = Str::uuid();
            }
        });
    }
}

