<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WorkShift extends Model
{
    protected $fillable = [
        'project_id', 'name', 'start_time', 'end_time',
        'break_hours', 'is_overtime_shift', 'overtime_multiplier', 'is_active',
    ];

    protected $casts = [
        'break_hours' => 'decimal:2',
        'is_overtime_shift' => 'boolean',
        'overtime_multiplier' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function assignments(): HasMany { return $this->hasMany(ShiftAssignment::class); }

    public function getWorkingHoursAttribute(): float
    {
        $start = \Carbon\Carbon::parse($this->start_time);
        $end = \Carbon\Carbon::parse($this->end_time);
        $total = $end->diffInMinutes($start) / 60;
        return round($total - $this->break_hours, 2);
    }

    public function getDisplayNameAttribute(): string
    {
        return "{$this->name} ({$this->start_time} - {$this->end_time})";
    }
}
