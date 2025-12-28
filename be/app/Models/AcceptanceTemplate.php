<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AcceptanceTemplate extends Model
{
    protected $fillable = [
        'name',
        'description',
        'standard',
        'is_active',
        'order',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'order' => 'integer',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function templateImages(): HasMany
    {
        return $this->hasMany(AcceptanceTemplateImage::class);
    }

    public function attachments(): BelongsToMany
    {
        return $this->belongsToMany(Attachment::class, 'acceptance_template_images')
            ->withPivot('order')
            ->withTimestamps()
            ->orderBy('acceptance_template_images.order');
    }

    public function items(): HasMany
    {
        return $this->hasMany(AcceptanceItem::class);
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('order')->orderBy('name');
    }
}
