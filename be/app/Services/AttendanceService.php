<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Cost;
use App\Models\CostGroup;
use App\Models\EmployeeSalaryConfig;
use App\Models\WorkShift;
use App\Models\ShiftAssignment;
use App\Models\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

class AttendanceService
{
    /**
     * Handle user self check-in
     */
    public function checkIn(User $user, array $data): Attendance
    {
        $projectId = $data['project_id'] ?? null;
        $today = Carbon::today()->toDateString();

        $existing = Attendance::where('user_id', $user->id)->where('work_date', $today)->first();
        if ($existing && $existing->check_in) {
            throw new Exception('Bạn đã check-in hôm nay rồi');
        }

        $now = Carbon::now();
        $status = $now->hour >= 8 && $now->minute > 15 ? 'late' : 'present';

        return Attendance::updateOrCreate(
            ['user_id' => $user->id, 'work_date' => $today],
            [
                'project_id'      => $projectId,
                'check_in'        => $now->format('H:i:s'),
                'status'          => $status,
                'check_in_method' => $data['method'] ?? 'app',
                'latitude'        => $data['latitude'] ?? null,
                'longitude'       => $data['longitude'] ?? null,
                'note'            => $data['note'] ?? null,
            ]
        );
    }

    /**
     * Handle user self check-out
     */
    public function checkOut(User $user): Attendance
    {
        $today = Carbon::today()->toDateString();
        $attendance = Attendance::where('user_id', $user->id)->where('work_date', $today)->first();

        if (!$attendance || !$attendance->check_in) {
            throw new Exception('Bạn chưa check-in hôm nay');
        }
        if ($attendance->check_out) {
            throw new Exception('Bạn đã check-out rồi');
        }

        $now = Carbon::now();
        $attendance->check_out = $now->format('H:i:s');
        
        // Calculate hours
        $hoursWorked = $attendance->calculateHours();
        $overtimeHours = max(0, $hoursWorked - 8);

        $attendance->hours_worked = $hoursWorked;
        $attendance->overtime_hours = $overtimeHours;
        $attendance->save();

        return $attendance;
    }

    /**
     * Manual Attendance Upsert (Admin/Manager)
     */
    public function upsert(array $data, ?User $actor = null): Attendance
    {
        return DB::transaction(function () use ($data, $actor) {
            // Time parsing logic
            if (isset($data['check_in']) && isset($data['check_out'])) {
                try {
                    $start = Carbon::parse($data['check_in']);
                    $end = Carbon::parse($data['check_out']);
                    $data['hours_worked'] = round($end->diffInMinutes($start) / 60, 2);

                    // If overtime_hours not explicitly provided, calculate it
                    if (!isset($data['overtime_hours']) || $data['overtime_hours'] == 0) {
                        $data['overtime_hours'] = max(0, $data['hours_worked'] - 8);
                    }
                } catch (Exception $e) {
                    // Log warning but continue
                }
            }

            $attendance = Attendance::updateOrCreate(
                ['user_id' => $data['user_id'], 'work_date' => $data['work_date']],
                $data
            );

            return $attendance;
        });
    }

    /**
     * Approve Attendance — also auto-generate labor cost
     */
    public function approve(Attendance $attendance, User $user): bool
    {
        $result = $attendance->update([
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        // Auto-generate labor cost when attendance is approved
        if ($result) {
            try {
                $this->generateLaborCost($attendance, $user);
            } catch (Exception $e) {
                Log::warning("Auto labor cost failed for attendance #{$attendance->id}: " . $e->getMessage());
            }
        }

        return $result;
    }

    // ==================================================================
    // LABOR COST GENERATION
    // ==================================================================

    /**
     * Tạo chi phí nhân công từ 1 bản ghi chấm công
     * 
     * @return Cost|null — null nếu đã tồn tại hoặc không có cấu hình lương
     */
    public function generateLaborCost(Attendance $attendance, User $actor): ?Cost
    {
        // 1. Skip nếu không có project
        if (!$attendance->project_id) {
            return null;
        }

        // 2. Skip nếu đã tạo Cost cho attendance này
        $existing = Cost::where('attendance_id', $attendance->id)->first();
        if ($existing) {
            return null;
        }

        // 3. Skip nếu status không hợp lệ (absent, leave, holiday)
        if (in_array($attendance->status, ['absent', 'leave', 'holiday'])) {
            return null;
        }

        // 4. Lookup cấu hình lương
        $config = EmployeeSalaryConfig::forUser($attendance->user_id)
            ->where('effective_from', '<=', $attendance->work_date)
            ->where(function ($q) use ($attendance) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $attendance->work_date);
            })
            ->orderByDesc('effective_from')
            ->first();

        if (!$config) {
            Log::info("No salary config for user #{$attendance->user_id} on {$attendance->work_date}");
            return null;
        }

        // 5. Tính chi phí
        $hourlyRate = $config->getHourlyEquivalent();
        $overtimeRate = $config->getOvertimeRate();

        $regularHours = (float) ($attendance->hours_worked ?? 0);
        $overtimeHours = (float) ($attendance->overtime_hours ?? 0);

        // Giờ thường = tổng giờ - OT (nhưng tối đa 8h thường)
        $regularHoursForCalc = max(0, $regularHours - $overtimeHours);

        $regularCost = $regularHoursForCalc * $hourlyRate;
        $overtimeCost = $overtimeHours * $overtimeRate;
        $totalCost = round($regularCost + $overtimeCost, 0);

        if ($totalCost <= 0) {
            return null;
        }

        // 6. Tìm CostGroup "Nhân công" (code = NC)
        $costGroup = CostGroup::where('code', 'NC')->first();

        // 7. Load user name
        $attendance->loadMissing('user:id,name');
        $userName = $attendance->user?->name ?? "User #{$attendance->user_id}";
        $dateFormatted = Carbon::parse($attendance->work_date)->format('d/m/Y');

        // 8. Tạo Cost
        $descParts = [];
        if ($regularHoursForCalc > 0) {
            $descParts[] = "Giờ làm: {$regularHoursForCalc}h × " . number_format($hourlyRate, 0, ',', '.') . "đ";
        }
        if ($overtimeHours > 0) {
            $descParts[] = "Tăng ca: {$overtimeHours}h × " . number_format($overtimeRate, 0, ',', '.') . "đ";
        }

        return Cost::create([
            'project_id'    => $attendance->project_id,
            'attendance_id' => $attendance->id,
            'category'      => 'labor',
            'cost_group_id' => $costGroup?->id,
            'name'          => "Nhân công - {$userName} - {$dateFormatted}",
            'amount'        => $totalCost,
            'description'   => implode('. ', $descParts),
            'cost_date'     => $attendance->work_date,
            'status'        => 'pending_management_approval',
            'created_by'    => $actor->id,
        ]);
    }

    /**
     * Tổng hợp chi phí nhân công theo tháng cho dự án
     */
    public function generateBatchLaborCosts(int $projectId, int $year, int $month, User $actor): array
    {
        $result = [
            'created'      => 0,
            'skipped'      => 0,
            'no_config'    => 0,
            'errors'       => [],
            'total_amount' => 0,
            'details'      => [],
        ];

        // Lấy tất cả attendance đã approved trong tháng cho project
        $attendances = Attendance::where('project_id', $projectId)
            ->whereYear('work_date', $year)
            ->whereMonth('work_date', $month)
            ->whereNotIn('status', ['absent', 'leave', 'holiday'])
            ->whereNotNull('approved_by')
            ->get();

        foreach ($attendances as $attendance) {
            try {
                $cost = $this->generateLaborCost($attendance, $actor);

                if ($cost) {
                    $result['created']++;
                    $result['total_amount'] += (float) $cost->amount;
                    $result['details'][] = [
                        'user'   => $attendance->user?->name ?? "#{$attendance->user_id}",
                        'date'   => $attendance->work_date->format('d/m/Y'),
                        'amount' => (float) $cost->amount,
                    ];
                } else {
                    // Kiểm tra lý do skip
                    $existing = Cost::where('attendance_id', $attendance->id)->exists();
                    if ($existing) {
                        $result['skipped']++;
                    } else {
                        $result['no_config']++;
                    }
                }
            } catch (Exception $e) {
                $result['errors'][] = "Attendance #{$attendance->id}: " . $e->getMessage();
            }
        }

        return $result;
    }

    // ==================================================================
    // STATISTICS
    // ==================================================================

    /**
     * Get Monthly Statistics
     */
    public function getMonthlyStatistics(int $year, int $month, ?int $projectId = null): array
    {
        $query = Attendance::forMonth($year, $month);
        if ($projectId) {
            $query->forProject($projectId);
        }

        $records = $query->with('user:id,name,email')->get();

        $userStats = $records->groupBy('user_id')->map(function ($userRecords) {
            return [
                'user'           => $userRecords->first()->user,
                'total_days'     => $userRecords->count(),
                'present'        => $userRecords->where('status', 'present')->count(),
                'late'           => $userRecords->where('status', 'late')->count(),
                'absent'         => $userRecords->where('status', 'absent')->count(),
                'leave'          => $userRecords->where('status', 'leave')->count(),
                'half_day'       => $userRecords->where('status', 'half_day')->count(),
                'total_hours'    => $userRecords->sum('hours_worked'),
                'total_overtime' => $userRecords->sum('overtime_hours'),
            ];
        })->values();

        return [
            'summary' => [
                'total_records'  => $records->count(),
                'total_present'  => $records->where('status', 'present')->count(),
                'total_late'     => $records->where('status', 'late')->count(),
                'total_absent'   => $records->where('status', 'absent')->count(),
                'total_hours'    => $records->sum('hours_worked'),
                'total_overtime' => $records->sum('overtime_hours'),
            ],
            'by_user' => $userStats,
        ];
    }

    // ==================================================================
    // SHIFT MANAGEMENT
    // ==================================================================

    /**
     * Manage Shifts
     */
    public function createShift(array $data): WorkShift
    {
        return WorkShift::create($data);
    }

    public function assignShifts(array $data, User $actor): array
    {
        $created = [];
        foreach ($data['user_ids'] as $userId) {
            foreach ($data['dates'] as $date) {
                $created[] = ShiftAssignment::updateOrCreate(
                    [
                        'user_id' => $userId, 
                        'assigned_date' => $date, 
                        'work_shift_id' => $data['work_shift_id']
                    ],
                    [
                        'project_id'  => $data['project_id'] ?? null,
                        'assigned_by' => $actor->id,
                    ]
                );
            }
        }
        return $created;
    }

    /**
     * Get shifts list with filters
     */
    public function getShifts(array $filters = []): \Illuminate\Support\Collection
    {
        $query = WorkShift::query();
        if (isset($filters['project_id'])) $query->where('project_id', $filters['project_id']);
        if (isset($filters['active_only']) && $filters['active_only']) $query->where('is_active', true);
        
        return $query->orderBy('start_time')->get();
    }

    /**
     * Update an existing shift
     */
    public function updateShift(WorkShift $shift, array $data): bool
    {
        return $shift->update($data);
    }

    /**
     * Delete a shift
     */
    public function deleteShift(WorkShift $shift): ?bool
    {
        return $shift->delete();
    }

    /**
     * Get shift assignments with filters
     */
    public function getShiftAssignments(array $filters = []): \Illuminate\Support\Collection
    {
        $query = ShiftAssignment::with(['workShift', 'user:id,name', 'project:id,name', 'assigner:id,name']);

        if (isset($filters['project_id'])) $query->forProject($filters['project_id']);
        if (isset($filters['date'])) $query->forDate($filters['date']);
        if (isset($filters['week_of'])) $query->forWeek($filters['week_of']);
        if (isset($filters['user_id'])) $query->where('user_id', $filters['user_id']);

        return $query->orderBy('assigned_date')->get();
    }

    /**
     * Remove a shift assignment
     */
    public function removeAssignment(ShiftAssignment $assignment): ?bool
    {
        return $assignment->delete();
    }
}
