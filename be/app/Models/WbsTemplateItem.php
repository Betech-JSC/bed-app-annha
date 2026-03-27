<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class WbsTemplateItem extends Model
{
    protected $fillable = [
        'uuid', 'template_id', 'parent_id', 'name', 'description',
        'order', 'default_duration', 'unit', 'cost_group_id',
        'level', 'default_resources',
    ];

    protected $casts = [
        'order' => 'integer',
        'default_duration' => 'integer',
        'default_resources' => 'array',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function template(): BelongsTo
    {
        return $this->belongsTo(WbsTemplate::class, 'template_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(WbsTemplateItem::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(WbsTemplateItem::class, 'parent_id')->orderBy('order');
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

        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = Str::uuid();
            }
        });
    }
}
