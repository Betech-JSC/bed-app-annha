<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CostGroup extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'name',
        'code',
        'type', // 'project' or 'company'
        'description',
        'expense_category',
        'is_active',
        'sort_order',
        'created_by',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function costs(): HasMany
    {
        return $this->hasMany(Cost::class, 'cost_group_id');
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeProject($query)
    {
        return $query->where('type', 'project');
    }

    public function scopeCompany($query)
    {
        return $query->where('type', 'company');
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderBy('name');
    }
}
