<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class PerformanceEvaluation extends Model
{
    protected $fillable = [
        'uuid',
        'user_id',
        'project_id',
        'evaluator_id',
        'evaluation_period',
        'evaluation_type',
        'evaluation_date',
        'overall_score',
        'strengths',
        'weaknesses',
        'improvements',
        'goals',
        'comments',
        'status',
        'created_by',
    ];

    protected $casts = [
        'evaluation_date' => 'date',
        'overall_score' => 'decimal:2',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function evaluator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    public function kpis(): HasMany
    {
        return $this->hasMany(PerformanceKPI::class, 'evaluation_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($evaluation) {
            if (empty($evaluation->uuid)) {
                $evaluation->uuid = Str::uuid();
            }
        });
    }
}

