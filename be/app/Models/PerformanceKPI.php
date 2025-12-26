<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PerformanceKPI extends Model
{
    protected $fillable = [
        'uuid',
        'evaluation_id',
        'kpi_name',
        'description',
        'target_value',
        'actual_value',
        'weight',
        'score',
        'notes',
        'order',
    ];

    protected $casts = [
        'target_value' => 'decimal:2',
        'actual_value' => 'decimal:2',
        'weight' => 'decimal:2',
        'score' => 'decimal:2',
        'order' => 'integer',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function evaluation(): BelongsTo
    {
        return $this->belongsTo(PerformanceEvaluation::class, 'evaluation_id');
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($kpi) {
            if (empty($kpi->uuid)) {
                $kpi->uuid = Str::uuid();
            }
        });
    }
}

