<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class ProjectRisk extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'project_id',
        'title',
        'description',
        'category',
        'probability',
        'impact',
        'status',
        'risk_type',
        'mitigation_plan',
        'contingency_plan',
        'owner_id',
        'identified_date',
        'target_resolution_date',
        'resolved_date',
        'identified_by',
        'updated_by',
    ];

    protected $casts = [
        'identified_date' => 'date',
        'target_resolution_date' => 'date',
        'resolved_date' => 'date',
    ];

    protected $appends = [
        'risk_score',
        'risk_level',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function identifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'identified_by');
    }

    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // ==================================================================
    // ACCESSORS
    // ==================================================================

    public function getRiskScoreAttribute(): int
    {
        $probabilityScores = [
            'very_low' => 1,
            'low' => 2,
            'medium' => 3,
            'high' => 4,
            'very_high' => 5,
        ];

        $impactScores = [
            'very_low' => 1,
            'low' => 2,
            'medium' => 3,
            'high' => 4,
            'very_high' => 5,
        ];

        $probScore = $probabilityScores[$this->probability] ?? 3;
        $impactScore = $impactScores[$this->impact] ?? 3;

        return $probScore * $impactScore;
    }

    public function getRiskLevelAttribute(): string
    {
        $score = $this->risk_score;

        if ($score >= 20) return 'critical';
        if ($score >= 12) return 'high';
        if ($score >= 6) return 'medium';
        return 'low';
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function markAsResolved(): bool
    {
        $this->status = 'closed';
        $this->resolved_date = now();
        return $this->save();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeByStatus($query, $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    public function scopeHighRisk($query)
    {
        return $query->whereIn('probability', ['high', 'very_high'])
            ->whereIn('impact', ['high', 'very_high']);
    }

    public function scopeActive($query)
    {
        return $query->whereIn('status', ['identified', 'analyzed', 'mitigated', 'monitored']);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($risk) {
            if (empty($risk->uuid)) {
                $risk->uuid = Str::uuid();
            }
        });
    }
}
