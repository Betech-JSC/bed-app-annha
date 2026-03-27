<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class WbsTemplate extends Model
{
    protected $fillable = [
        'uuid', 'name', 'project_type', 'description',
        'is_active', 'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function items(): HasMany
    {
        return $this->hasMany(WbsTemplateItem::class, 'template_id')->orderBy('order');
    }

    public function rootItems(): HasMany
    {
        return $this->hasMany(WbsTemplateItem::class, 'template_id')
            ->whereNull('parent_id')
            ->orderBy('order');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    /**
     * Tạo cây WBS từ template items (nested)
     */
    public function getTree(): array
    {
        $items = $this->items()->get()->keyBy('id');
        $tree = [];

        foreach ($items as $item) {
            if ($item->parent_id === null) {
                $tree[] = $this->buildNode($item, $items);
            }
        }

        return $tree;
    }

    private function buildNode(WbsTemplateItem $item, $allItems): array
    {
        $node = $item->toArray();
        $node['children'] = [];

        foreach ($allItems as $child) {
            if ($child->parent_id === $item->id) {
                $node['children'][] = $this->buildNode($child, $allItems);
            }
        }

        return $node;
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('project_type', $type);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = Str::uuid();
            }
        });
    }
}
