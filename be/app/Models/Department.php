<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Department extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'uuid',
        'name',
        'code',
        'description',
        'parent_id',
        'manager_id',
        'employee_count',
        'status',
    ];

    protected $casts = [
        'employee_count' => 'integer',
    ];

    // ==================================================================
    // QUAN HỆ
    // ==================================================================

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Department::class, 'parent_id');
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function employees(): HasMany
    {
        return $this->hasMany(User::class, 'department_id');
    }

    /**
     * Lấy danh sách Payroll của nhân viên trong phòng ban
     */
    public function getPayrolls()
    {
        $employeeIds = $this->employees()->pluck('id');
        return Payroll::whereIn('user_id', $employeeIds);
    }

    /**
     * Lấy danh sách Leave Requests của nhân viên trong phòng ban
     */
    public function getLeaveRequests()
    {
        $employeeIds = $this->employees()->pluck('id');
        return LeaveRequest::whereIn('user_id', $employeeIds);
    }

    /**
     * Lấy danh sách Employment Contracts của nhân viên trong phòng ban
     */
    public function getEmploymentContracts()
    {
        $employeeIds = $this->employees()->pluck('id');
        return EmploymentContract::whereIn('user_id', $employeeIds);
    }

    /**
     * Lấy danh sách Performance Evaluations của nhân viên trong phòng ban
     */
    public function getPerformanceEvaluations()
    {
        $employeeIds = $this->employees()->pluck('id');
        return PerformanceEvaluation::whereIn('employee_id', $employeeIds);
    }

    /**
     * Lấy danh sách Work Schedules của nhân viên trong phòng ban
     */
    public function getWorkSchedules()
    {
        $employeeIds = $this->employees()->pluck('id');
        return WorkSchedule::whereIn('user_id', $employeeIds);
    }

    /**
     * Lấy danh sách Time Trackings của nhân viên trong phòng ban
     */
    public function getTimeTrackings()
    {
        $employeeIds = $this->employees()->pluck('id');
        return TimeTracking::whereIn('user_id', $employeeIds);
    }

    /**
     * Lấy danh sách Costs liên quan đến phòng ban (qua user)
     */
    public function getCosts()
    {
        $employeeIds = $this->employees()->pluck('id');
        return Cost::whereIn('created_by', $employeeIds);
    }

    /**
     * Lấy danh sách Projects được quản lý bởi phòng ban (qua project manager)
     */
    public function getProjects()
    {
        $employeeIds = $this->employees()->pluck('id');
        return Project::whereIn('project_manager_id', $employeeIds);
    }

    // ==================================================================
    // BOOT
    // ==================================================================

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($department) {
            if (empty($department->uuid)) {
                $department->uuid = Str::uuid();
            }
        });
    }
}

