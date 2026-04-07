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
        'type', // owned, rented
        'quantity',
        'category',
        'brand',
        'model',
        'serial_number',
        'unit',
        'purchase_date',
        'purchase_price',
        'useful_life_months',
        'depreciation_method',
        'residual_value',
        'current_value',
        'accumulated_depreciation',
        'rental_rate_per_day',
        'maintenance_interval_days',
        'last_maintenance_date',
        'next_maintenance_date',
        'status', // available, in_use, maintenance, retired
        'assigned_to',
        'project_id',
        'location',
        'notes',
        'created_by',
    ];

    protected $appends = ['asset_code', 'monthly_depreciation', 'remaining_percent'];

    protected $casts = [
        'quantity'                 => 'integer',
        'purchase_price'           => 'decimal:2',
        'residual_value'           => 'decimal:2',
        'current_value'            => 'decimal:2',
        'accumulated_depreciation' => 'decimal:2',
        'purchase_date'            => 'date',
        'last_maintenance_date'    => 'date',
        'next_maintenance_date'    => 'date',
    ];

    // --- Relationships ---
    
    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // --- Scopes ---

    public function scopeActive($query)
    {
        return $query->where('status', '!=', 'retired');
    }

    // --- Accessors for Frontend Compatibility ---

    public function getAssetCodeAttribute(): ?string
    {
        return $this->code;
    }

    // --- Legacy Asset Logic ---

    public function getMonthlyDepreciationAttribute(): float
    {
        if ($this->useful_life_months <= 0) return 0;
        return round(($this->purchase_price - $this->residual_value) / $this->useful_life_months, 2);
    }

    public function getRemainingPercentAttribute(): float
    {
        if ($this->purchase_price <= 0) return 0;
        return round(($this->current_value / $this->purchase_price) * 100, 1);
    }


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

    public function assignments(): HasMany
    {
        return $this->hasMany(AssetAssignment::class, 'equipment_id');
    }

    public function depreciations(): HasMany
    {
        return $this->hasMany(AssetDepreciation::class, 'equipment_id');
    }

    /**
     * Chạy khấu hao cho 1 tháng
     */
    public function runMonthlyDepreciation(): ?AssetDepreciation
    {
        if ($this->status === 'retired') return null;
        if ($this->current_value <= $this->residual_value) return null;

        $amount = min($this->monthly_depreciation, $this->current_value - $this->residual_value);
        $remaining = $this->current_value - $amount;

        $dep = $this->depreciations()->create([
            'equipment_id' => $this->id, // explicit just in case
            'depreciation_date' => now()->startOfMonth()->format('Y-m-d'),
            'amount'            => $amount,
            'remaining_value'   => $remaining,
        ]);

        $this->update([
            'current_value'            => $remaining,
            'accumulated_depreciation' => $this->accumulated_depreciation + $amount,
        ]);

        return $dep;
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

