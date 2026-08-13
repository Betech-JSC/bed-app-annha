<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MaterialInventory extends Model
{
    protected $table = 'material_inventory';

    protected $fillable = [
        'project_id', 'material_id',
        'current_stock', 'min_stock_level',
        'last_updated_at',
    ];

    protected $casts = [
        'current_stock'   => 'decimal:3',
        'min_stock_level' => 'decimal:3',
        'last_updated_at' => 'datetime',
    ];

    protected $appends = ['is_low_stock', 'stock_status'];

    // --- Relationships ---
    public function project(): BelongsTo  { return $this->belongsTo(Project::class); }
    public function material(): BelongsTo { return $this->belongsTo(Material::class); }

    // --- Scopes ---
    public function scopeLowStock($q)
    {
        return $q->whereColumn('current_stock', '<=', 'min_stock_level')
            ->where('min_stock_level', '>', 0);
    }

    public function scopeOutOfStock($q)
    {
        return $q->where('current_stock', '<=', 0);
    }

    // --- Accessors ---
    public function getIsLowStockAttribute(): bool
    {
        return (float) $this->min_stock_level > 0
            && (float) $this->current_stock <= (float) $this->min_stock_level;
    }

    public function getStockStatusAttribute(): string
    {
        if ((float) $this->current_stock <= 0) return 'out_of_stock';
        if ($this->is_low_stock) return 'low_stock';
        return 'adequate';
    }

    // --- Methods ---

    public function syncStock(): void
    {
        $queryIn = MaterialTransaction::where('material_id', $this->material_id)
            ->whereIn('type', ['in', 'import'])
            ->where('status', 'approved');

        $queryOut = MaterialTransaction::where('material_id', $this->material_id)
            ->whereIn('type', ['out', 'export'])
            ->where('status', 'approved');

        if ($this->project_id) {
            $queryIn->where('project_id', $this->project_id);
            $queryOut->where('project_id', $this->project_id);
        } else {
            $queryIn->whereNull('project_id');
            $queryOut->whereNull('project_id');
        }

        $imported = $queryIn->sum('quantity');
        $exported = $queryOut->sum('quantity');

        $this->current_stock = max(0, $imported - $exported);
        $this->last_updated_at = now();
        $this->saveQuietly();
    }

    /**
     * Nhập kho
     */
    public function addStock(float $qty): void
    {
        $this->current_stock = (float) $this->current_stock + $qty;
        $this->last_updated_at = now();
        $this->saveQuietly();
    }

    /**
     * Xuất kho
     */
    public function removeStock(float $qty): bool
    {
        if ((float) $this->current_stock < $qty) return false;
        $this->current_stock = (float) $this->current_stock - $qty;
        $this->last_updated_at = now();
        $this->saveQuietly();
        return true;
    }
}
