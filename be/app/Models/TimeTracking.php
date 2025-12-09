<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeTracking extends Model
{
    protected $table = 'time_tracking';

    protected $fillable = [
        'user_id',
        'project_id',
        'check_in_at',
        'check_out_at',
        'check_in_location',
        'check_out_location',
        'total_hours',
        'notes',
        'status',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'check_in_at' => 'datetime',
        'check_out_at' => 'datetime',
        'approved_at' => 'datetime',
        'total_hours' => 'decimal:2',
    ];

    protected $appends = [
        'is_approved',
        'is_pending',
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

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // ==================================================================
    // ACCESSOR
    // ==================================================================

    public function getIsApprovedAttribute(): bool
    {
        return $this->status === 'approved';
    }

    public function getIsPendingAttribute(): bool
    {
        return $this->status === 'pending';
    }

    // ==================================================================
    // METHODS
    // ==================================================================

    public function calculateHours(): ?float
    {
        if (!$this->check_in_at || !$this->check_out_at) {
            return null;
        }

        $diff = $this->check_in_at->diffInHours($this->check_out_at);
        $minutes = $this->check_in_at->diffInMinutes($this->check_out_at) % 60;

        $this->total_hours = round($diff + ($minutes / 60), 2);
        $this->save();

        return $this->total_hours;
    }

    public function approve(?User $user = null): bool
    {
        $this->status = 'approved';
        if ($user) {
            $this->approved_by = $user->id;
        }
        $this->approved_at = now();

        // Auto calculate hours if not set
        if (!$this->total_hours && $this->check_out_at) {
            $this->calculateHours();
        }

        return $this->save();
    }

    public function reject(?User $user = null): bool
    {
        $this->status = 'rejected';
        if ($user) {
            $this->approved_by = $user->id;
        }
        $this->approved_at = now();
        return $this->save();
    }

    // ==================================================================
    // SCOPE
    // ==================================================================

    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForProject($query, $projectId)
    {
        return $query->where('project_id', $projectId);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeByDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('check_in_at', [$startDate, $endDate]);
    }
}
