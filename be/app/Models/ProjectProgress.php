<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectProgress extends Model
{
    protected $fillable = [
        'project_id',
        'overall_percentage',
        'calculated_from',
        'last_calculated_at',
    ];

    protected $casts = [
        'overall_percentage' => 'decimal:2',
        'last_calculated_at' => 'datetime',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function calculateFromLogs(): float
    {
        $latestLog = $this->project->constructionLogs()
            ->orderBy('log_date', 'desc')
            ->first();

        if ($latestLog) {
            $this->overall_percentage = $latestLog->completion_percentage;
            $this->calculated_from = 'logs';
            $this->last_calculated_at = now();
            $this->save();
            return $this->overall_percentage;
        }

        return 0;
    }

    public function calculateFromSubcontractors(): float
    {
        $subcontractors = $this->project->subcontractors;
        if ($subcontractors->isEmpty()) {
            return 0;
        }

        $totalWeight = 0;
        $weightedProgress = 0;

        foreach ($subcontractors as $sub) {
            $weight = $sub->total_quote;
            $progress = match ($sub->progress_status) {
                'completed' => 100,
                'in_progress' => 50,
                'not_started' => 0,
                'delayed' => 25,
                default => 0,
            };

            $totalWeight += $weight;
            $weightedProgress += $weight * $progress;
        }

        if ($totalWeight > 0) {
            $this->overall_percentage = $weightedProgress / $totalWeight;
        } else {
            $this->overall_percentage = 0;
        }

        $this->calculated_from = 'subcontractors';
        $this->last_calculated_at = now();
        $this->save();

        return $this->overall_percentage;
    }

    public function updateManual(float $percentage): bool
    {
        $this->overall_percentage = max(0, min(100, $percentage));
        $this->calculated_from = 'manual';
        $this->last_calculated_at = now();
        return $this->save();
    }
}
