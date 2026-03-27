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

    /**
     * Sync current_stock from all MaterialTransactions
     */
    public function syncStock(): void
    {
        $imported = MaterialTransaction::where('project_id', $this->project_id)
            ->where('material_id', $this->material_id)
            ->where('type', 'import')
            ->where('status', '!=', 'cancelled')
            ->sum('quantity');

        $exported = MaterialTransaction::where('project_id', $this->project_id)
            ->where('material_id', $this->material_id)
            ->where('type', 'export')
            ->where('status', '!=', 'cancelled')
            ->sum('quantity');

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
