<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectEvmMetric extends Model
{
    protected $fillable = [
        'project_id',
        'calculation_date',
        'planned_value',
        'earned_value',
        'actual_cost',
        'cost_performance_index',
        'schedule_performance_index',
        'cost_variance',
        'schedule_variance',
        'estimate_at_completion',
        'estimate_to_complete',
        'variance_at_completion',
        'budget_at_completion',
        'progress_percentage',
        'notes',
        'calculated_by',
    ];

    protected $casts = [
        'calculation_date' => 'date',
        'planned_value' => 'decimal:2',
        'earned_value' => 'decimal:2',
        'actual_cost' => 'decimal:2',
        'cost_performance_index' => 'decimal:4',
        'schedule_performance_index' => 'decimal:4',
        'cost_variance' => 'decimal:2',
        'schedule_variance' => 'decimal:2',
        'estimate_at_completion' => 'decimal:2',
        'estimate_to_complete' => 'decimal:2',
        'variance_at_completion' => 'decimal:2',
        'budget_at_completion' => 'decimal:2',
        'progress_percentage' => 'decimal:2',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function calculator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'calculated_by');
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeLatest($query)
    {
        return $query->orderBy('calculation_date', 'desc');
    }

    public function scopeForDate($query, $date)
    {
        return $query->where('calculation_date', $date);
    }
}
