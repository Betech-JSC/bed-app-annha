<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    protected $fillable = [
        'user_id', 'project_id', 'work_date',
        'check_in', 'check_out', 'hours_worked', 'overtime_hours',
        'status', 'check_in_method',
        'latitude', 'longitude', 'note',
        'approved_by', 'approved_at',
    ];

    protected $casts = [
        'work_date' => 'date',
        'hours_worked' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'approved_at' => 'datetime',
    ];

    // ───── Relationships ─────
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function project(): BelongsTo { return $this->belongsTo(Project::class); }
    public function approver(): BelongsTo { return $this->belongsTo(User::class, 'approved_by'); }

    // ───── Scopes ─────
    public function scopeForProject($q, $projectId) { return $q->where('project_id', $projectId); }
    public function scopeForUser($q, $userId) { return $q->where('user_id', $userId); }
    public function scopeForDate($q, $date) { return $q->where('work_date', $date); }
    public function scopeForMonth($q, $year, $month) {
        return $q->whereYear('work_date', $year)->whereMonth('work_date', $month);
    }

    // ───── Helpers ─────
    public function calculateHours(): float
    {
        if (!$this->check_in || !$this->check_out) return 0;
        $start = \Carbon\Carbon::parse($this->check_in);
        $end = \Carbon\Carbon::parse($this->check_out);
        return round($end->diffInMinutes($start) / 60, 2);
    }

    public function getIsLateAttribute(): bool
    {
        if (!$this->check_in) return false;
        // Mặc định: trễ nếu check-in sau 8:00
        return \Carbon\Carbon::parse($this->check_in)->gt(\Carbon\Carbon::parse('08:00'));
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'present' => 'Có mặt',
            'absent' => 'Vắng',
            'late' => 'Trễ',
            'half_day' => 'Nửa ngày',
            'leave' => 'Nghỉ phép',
            'holiday' => 'Nghỉ lễ',
            default => $this->status,
        };
    }
}
