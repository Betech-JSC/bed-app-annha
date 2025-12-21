<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Services\ProjectCostAllocationService;

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
        'check_in_method',
        'shift',
        'work_date',
        'check_in_latitude',
        'check_in_longitude',
        'check_out_latitude',
        'check_out_longitude',
        'qr_code',
        'face_id_photo',
        'total_hours',
        'is_overtime',
        'overtime_type',
        'overtime_hours',
        'overtime_multiplier',
        'overtime_category_id',
        'team_check_in_id',
        'is_offline',
        'synced_at',
        'notes',
        'status',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'check_in_at' => 'datetime',
        'check_out_at' => 'datetime',
        'approved_at' => 'datetime',
        'work_date' => 'date',
        'synced_at' => 'datetime',
        'total_hours' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'overtime_multiplier' => 'decimal:2',
        'check_in_latitude' => 'decimal:8',
        'check_in_longitude' => 'decimal:8',
        'check_out_latitude' => 'decimal:8',
        'check_out_longitude' => 'decimal:8',
        'is_overtime' => 'boolean',
        'is_offline' => 'boolean',
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

    public function overtimeCategory(): BelongsTo
    {
        return $this->belongsTo(OvertimeCategory::class);
    }

    public function teamCheckIn(): BelongsTo
    {
        return $this->belongsTo(TeamCheckIn::class);
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

    /**
     * Calculate overtime hours based on time windows
     * - Hours before 7:30 AM = overtime
     * - Hours after 5:30 PM (17:30) = overtime
     * 
     * @return array{regular_hours: float, overtime_hours: float}
     */
    public function calculateOvertimeHours(): array
    {
        if (!$this->check_in_at || !$this->check_out_at) {
            return ['regular_hours' => 0, 'overtime_hours' => 0];
        }

        $checkIn = $this->check_in_at->copy();
        $checkOut = $this->check_out_at->copy();
        
        // Set standard work hours: 7:30 AM to 5:30 PM (same date as check-in)
        $workStart = $checkIn->copy()->setTime(7, 30, 0);
        $workEnd = $checkIn->copy()->setTime(17, 30, 0);
        
        $overtimeHours = 0;
        $regularHours = 0;
        
        // Calculate hours before 7:30 AM
        if ($checkIn->lt($workStart)) {
            // Overtime from check-in time to 7:30 AM (or check-out if earlier)
            $overtimeEnd = $checkOut->lt($workStart) ? $checkOut : $workStart;
            $overtimeHours += $checkIn->diffInMinutes($overtimeEnd) / 60;
        }
        
        // Calculate hours after 5:30 PM
        if ($checkOut->gt($workEnd)) {
            // Overtime from 5:30 PM (or check-in if later) to check-out time
            $overtimeStart = $checkIn->gt($workEnd) ? $checkIn : $workEnd;
            $overtimeHours += $overtimeStart->diffInMinutes($checkOut) / 60;
        }
        
        // Calculate regular hours (within 7:30-17:30 window)
        $regularStart = $checkIn->gt($workStart) ? $checkIn : $workStart;
        $regularEnd = $checkOut->lt($workEnd) ? $checkOut : $workEnd;
        
        if ($regularStart->lt($regularEnd)) {
            $regularHours = $regularStart->diffInMinutes($regularEnd) / 60;
        }
        
        // Round to 2 decimal places
        $overtimeHours = round($overtimeHours, 2);
        $regularHours = round($regularHours, 2);
        
        return [
            'regular_hours' => $regularHours,
            'overtime_hours' => $overtimeHours,
        ];
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

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        // Trigger cost allocation when time tracking is approved
        static::updated(function ($timeTracking) {
            // Check if status was changed to 'approved'
            if ($timeTracking->isDirty('status') && $timeTracking->status === 'approved') {
                // Only allocate if project_id is set
                if ($timeTracking->project_id) {
                    try {
                        $service = new ProjectCostAllocationService();
                        $service->allocatePersonnelCost($timeTracking);
                    } catch (\Exception $e) {
                        // Log error but don't fail the approval
                        \Log::error('Failed to allocate personnel cost: ' . $e->getMessage(), [
                            'time_tracking_id' => $timeTracking->id,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            }
        });
    }
}
