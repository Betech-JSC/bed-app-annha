<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LaborProductivity extends Model
{
    protected $table = 'labor_productivity';

    protected $fillable = [
        'project_id', 'user_id', 'task_id', 'record_date',
        'work_item', 'unit', 'planned_quantity', 'actual_quantity',
        'workers_count', 'hours_spent',
        'productivity_rate', 'efficiency_percent',
        'note', 'created_by',
    ];

    protected $casts = [
        'record_date' => 'date',
        'planned_quantity' => 'decimal:2',
        'actual_quantity' => 'decimal:2',
        'hours_spent' => 'decimal:2',
        'productivity_rate' => 'decimal:2',
        'efficiency_percent' => 'decimal:2',
    ];

    // ───── Relationships ─────
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function task(): BelongsTo { return $this->belongsTo(ProjectTask::class, 'task_id'); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }

    // ───── Scopes ─────
    public function scopeForProject($q, $projectId) { return $q->where('project_id', $projectId); }
    public function scopeForUser($q, $userId) { return $q->where('user_id', $userId); }

    // ───── Auto-calculate ─────
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            // Auto-calculate productivity rate
            $totalManHours = $model->workers_count * $model->hours_spent;
            $model->productivity_rate = $totalManHours > 0
                ? round($model->actual_quantity / $totalManHours, 2)
                : 0;

            // Auto-calculate efficiency
            $model->efficiency_percent = $model->planned_quantity > 0
                ? round(($model->actual_quantity / $model->planned_quantity) * 100, 2)
                : 0;
        });
    }

    public function getIsEfficientAttribute(): bool
    {
        return $this->efficiency_percent >= 90;
    }

    public function getEfficiencyLabelAttribute(): string
    {
        if ($this->efficiency_percent >= 100) return 'Vượt mức';
        if ($this->efficiency_percent >= 90) return 'Đạt';
        if ($this->efficiency_percent >= 70) return 'Trung bình';
        return 'Thấp';
    }
}
