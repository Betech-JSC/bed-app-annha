<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Attendance extends Model
{
    use \App\Traits\Approvable, \App\Traits\NotifiesUsers;

    protected $fillable = [
        'user_id', 'project_id', 'work_date',
        'check_in', 'check_out', 'hours_worked', 'overtime_hours',
        'status', 'check_in_method',
        'latitude', 'longitude', 'note',
        'workflow_status', 'rejected_reason',
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
    public function laborCost(): HasOne { return $this->hasOne(Cost::class, 'attendance_id')->select('id', 'attendance_id', 'amount', 'status'); }

    // ───── Scopes ─────
    public function scopeForProject($q, $projectId) { return $q->where('project_id', $projectId); }
    public function scopeForUser($q, $userId) { return $q->where('user_id', $userId); }
    public function scopeForDate($q, $date) { return $q->where('work_date', $date); }
    public function scopeForMonth($q, $year, $month) {
        return $q->whereYear('work_date', $year)->whereMonth('work_date', $month);
    }
    public function scopeDraft($q)     { return $q->where('workflow_status', 'draft'); }
    public function scopeSubmitted($q) { return $q->where('workflow_status', 'submitted'); }
    public function scopeApproved($q)  { return $q->where('workflow_status', 'approved'); }
    public function scopeRejected($q)  { return $q->where('workflow_status', 'rejected'); }
    public function scopePendingApproval($q) { return $q->where('workflow_status', 'submitted'); }

    // ───── Workflow Helpers ─────
    public function isPendingApproval(): bool { return $this->workflow_status === 'submitted'; }
    public function isApproved(): bool        { return $this->workflow_status === 'approved'; }
    public function isRejected(): bool        { return $this->workflow_status === 'rejected'; }

    public function getWorkflowLabelAttribute(): string
    {
        return match($this->workflow_status) {
            'draft'     => 'Nháp',
            'submitted' => 'Chờ duyệt',
            'approved'  => 'Đã duyệt',
            'rejected'  => 'Từ chối',
            default     => $this->workflow_status ?? 'Nháp',
        };
    }

    // ───── Helpers ─────
    public function calculateHours(): float
    {
        if (!$this->check_in || !$this->check_out) return 0;
        $start = \Carbon\Carbon::parse($this->check_in);
        $end = \Carbon\Carbon::parse($this->check_out);
        return round(abs($end->diffInMinutes($start)) / 60, 2);
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

    // ───── Notification Helpers (NotifiesUsers) ─────
    public function getNotificationProject(): ?\App\Models\Project { return $this->project; }
    public function getNotificationLabel(): string { return "chấm công ngày " . optional($this->work_date)->format('d/m/Y'); }
    
    public function notificationMap(): array
    {
        return [
            'type' => 'attendance',
            'submitted_status' => 'submitted',
            'approved_status' => 'approved',
            'rejected_status' => 'rejected',
            'approver_permission' => \App\Constants\Permissions::ATTENDANCE_APPROVE,
            'fallback_role' => 'Ban điều hành'
        ];
    }
    
    protected function getModelStatusValue(): string
    {
        return $this->workflow_status ?? ''; // Use workflow_status for Approvable trait 
    }
}
