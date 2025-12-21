<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class LaborStandard extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'team_id',
        'project_id',
        'work_item',
        'unit',
        'labor_hours_per_unit',
        'labor_cost_per_unit',
        'worker_count',
        'description',
        'is_active',
    ];

    protected $casts = [
        'labor_hours_per_unit' => 'decimal:2',
        'labor_cost_per_unit' => 'decimal:2',
        'worker_count' => 'integer',
        'is_active' => 'boolean',
    ];

    // ==================================================================
    // RELATIONSHIPS
    // ==================================================================

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function workVolumes(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(WorkVolume::class);
    }

    // ==================================================================
    // SCOPES
    // ==================================================================

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByTeam($query, int $teamId)
    {
        return $query->where('team_id', $teamId);
    }

    public function scopeByProject($query, int $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($standard) {
            if (empty($standard->uuid)) {
                $standard->uuid = Str::uuid();
            }
        });
    }
}
