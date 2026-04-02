<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CompanyAsset extends Model
{
    protected $fillable = [
        'uuid', 'asset_code', 'name', 'category',
        'purchase_price', 'purchase_date',
        'useful_life_months', 'depreciation_method', 'residual_value',
        'current_value', 'accumulated_depreciation',
        'status', 'location', 'assigned_to', 'project_id',
        'serial_number', 'brand', 'description', 'notes', 'created_by',
    ];

    protected $casts = [
        'purchase_price'           => 'decimal:2',
        'residual_value'           => 'decimal:2',
        'current_value'            => 'decimal:2',
        'accumulated_depreciation' => 'decimal:2',
        'purchase_date'            => 'date',
    ];

    // --- Constants ---
    const CATEGORY_LABELS = [
        'computer'   => 'Máy tính / CNTT',
        'machinery'  => 'Máy móc thi công',
        'vehicle'    => 'Xe công ty',
        'furniture'  => 'Nội thất văn phòng',
        'other'      => 'Khác',
    ];

    const STATUS_LABELS = [
        'in_stock'     => 'Trong kho',
        'in_use'       => 'Đang sử dụng',
        'under_repair' => 'Đang sửa chữa',
        'disposed'     => 'Đã thanh lý',
    ];

    // --- Relationships ---
    public function assignedUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function depreciations(): HasMany
    {
        return $this->hasMany(AssetDepreciation::class);
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(AssetAssignment::class);
    }

    // --- Business Logic ---

    /**
     * Tính khấu hao hàng tháng (đường thẳng)
     */
    public function getMonthlyDepreciationAttribute(): float
    {
        if ($this->useful_life_months <= 0) return 0;
        return round(($this->purchase_price - $this->residual_value) / $this->useful_life_months, 2);
    }

    /**
     * Tính % giá trị còn lại
     */
    public function getRemainingPercentAttribute(): float
    {
        if ($this->purchase_price <= 0) return 0;
        return round(($this->current_value / $this->purchase_price) * 100, 1);
    }

    /**
     * Chạy khấu hao cho 1 tháng
     */
    public function runMonthlyDepreciation(): ?AssetDepreciation
    {
        if ($this->status === 'disposed') return null;
        if ($this->current_value <= $this->residual_value) return null;

        $amount = min($this->monthly_depreciation, $this->current_value - $this->residual_value);
        $remaining = $this->current_value - $amount;

        $dep = $this->depreciations()->create([
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

    // --- Scopes ---
    public function scopeActive($q)    { return $q->whereNot('status', 'disposed'); }
    public function scopeInUse($q)     { return $q->where('status', 'in_use'); }
    public function scopeInStock($q)   { return $q->where('status', 'in_stock'); }
    public function scopeByCategory($q, $cat) { return $q->where('category', $cat); }

    // --- Boot ---
    protected static function boot()
    {
        parent::boot();
        static::creating(function ($asset) {
            $asset->uuid = $asset->uuid ?: Str::uuid();
            if (empty($asset->asset_code)) {
                $asset->asset_code = 'AST-' . date('Ymd') . '-' . strtoupper(Str::random(4));
            }
            if ($asset->current_value <= 0) {
                $asset->current_value = $asset->purchase_price;
            }
        });
    }
}
