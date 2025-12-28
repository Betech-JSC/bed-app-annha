<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class EquipmentMaintenance extends Model
{
    protected $table = 'equipment_maintenance';

    protected $fillable = [
        'uuid',
        'equipment_id',
        'type',
        'maintenance_date',
        'description',
        'cost',
        'service_provider',
        'status',
        'next_maintenance_date',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'maintenance_date' => 'date',
        'next_maintenance_date' => 'date',
        'cost' => 'decimal:2',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($maintenance) {
            if (empty($maintenance->uuid)) {
                $maintenance->uuid = Str::uuid();
            }
        });
    }
}

