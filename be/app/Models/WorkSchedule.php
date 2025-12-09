<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class WorkSchedule extends Model
{
    protected $table = 'work_schedule';

    protected $fillable = [
        'user_id',
        'project_id',
        'date',
        'start_time',
        'end_time',
        'type',
        'notes',
    ];

    protected $casts = [
        'date' => 'date',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
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

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }

    public function scopeUpcoming($query, $days = 30)
    {
        return $query->where('date', '>=', now()->toDateString())
            ->where('date', '<=', now()->addDays($days)->toDateString());
    }
}
