<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class AcceptanceCriterion extends Model
{
    protected $fillable = [
        'acceptance_template_id',
        'name',
        'description',
        'is_critical',
        'order',
    ];

    protected $casts = [
        'is_critical' => 'boolean',
        'order' => 'integer',
    ];

    // ==================================================================
    // RELATIONS
    // ==================================================================

    public function template(): BelongsTo
    {
        return $this->belongsTo(AcceptanceTemplate::class, 'acceptance_template_id');
    }

    public function defects(): BelongsToMany
    {
        return $this->belongsToMany(Defect::class, 'defect_acceptance_criteria')
            ->withPivot('status', 'verified_at', 'verified_by')
            ->withTimestamps();
    }

    // ==================================================================
    // SCOPES
    // ==================================================================

    public function scopeOrdered($query)
    {
        return $query->orderBy('order');
    }

    public function scopeCritical($query)
    {
        return $query->where('is_critical', true);
    }
}
