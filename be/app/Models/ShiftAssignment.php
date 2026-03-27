<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ShiftAssignment extends Model
{
    protected $fillable = [
        'work_shift_id', 'user_id', 'project_id',
        'assigned_date', 'status', 'note', 'assigned_by',
    ];

    protected $casts = [
        'assigned_date' => 'date',
    ];

    public function workShift(): BelongsTo { return $this->belongsTo(WorkShift::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function assigner(): BelongsTo { return $this->belongsTo(User::class, 'assigned_by'); }

    public function scopeForProject($q, $projectId) { return $q->where('project_id', $projectId); }
    public function scopeForDate($q, $date) { return $q->where('assigned_date', $date); }
    public function scopeForWeek($q, $date) {
        $start = \Carbon\Carbon::parse($date)->startOfWeek();
        $end = \Carbon\Carbon::parse($date)->endOfWeek();
        return $q->whereBetween('assigned_date', [$start, $end]);
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'scheduled' => 'Đã xếp lịch',
            'checked_in' => 'Đã vào ca',
            'completed' => 'Hoàn thành',
            'absent' => 'Vắng mặt',
            'swapped' => 'Đổi ca',
            default => $this->status,
        };
    }
}
