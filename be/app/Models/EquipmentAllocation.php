<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class EquipmentAllocation extends Model
{
    protected $fillable = [
        'uuid',
        'equipment_id',
        'project_id',
        'allocation_type',
        'quantity',
        'allocated_to',
        'manager_id',
        'handover_date',
        'return_date',
        'start_date',
        'end_date',
        'daily_rate',
        'rental_fee',
        'billing_start_date',
        'billing_end_date',
        'usage_hours',
        'status',
        'notes',
        'created_by',
        'cost_id',
    ];

    protected $casts = [
        'quantity' => 'integer',
        'start_date' => 'date',
        'end_date' => 'date',
        'handover_date' => 'date',
        'return_date' => 'date',
        'billing_start_date' => 'date',
        'billing_end_date' => 'date',
        'daily_rate' => 'decimal:2',
        'rental_fee' => 'decimal:2',
        'usage_hours' => 'integer',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function allocatedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'allocated_to');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function cost(): BelongsTo
    {
        return $this->belongsTo(Cost::class, 'cost_id');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($allocation) {
            if (empty($allocation->uuid)) {
                $allocation->uuid = Str::uuid();
            }
        });
    }
}

