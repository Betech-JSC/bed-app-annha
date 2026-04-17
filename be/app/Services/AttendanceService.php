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
    // ==================================================================
    // WORKFLOW: SUBMIT / APPROVE / REJECT
    // ==================================================================

    /**
     * NV gửi chấm công để manager duyệt
     * Chỉ submit được nếu đang ở trạng thái draft
     */
    public function submit(Attendance $attendance, User $user): Attendance
    {
        if ($attendance->user_id !== $user->id) {
            throw new Exception('Bạn không thể gửi duyệt chấm công của người khác.');
        }
        if ($attendance->workflow_status === 'approved') {
            throw new Exception('Chấm công này đã được duyệt rồi.');
        }

        $attendance->update([
            'workflow_status' => 'submitted',
            'rejected_reason' => null,
        ]);

        return $attendance->fresh();
    }

    /**
     * Manager từ chối chấm công
     */
    public function reject(Attendance $attendance, User $user, string $reason): Attendance
    {
        $attendance->update([
            'workflow_status' => 'rejected',
            'rejected_reason' => $reason,
            'approved_by'     => null,
            'approved_at'     => null,
        ]);

        // Xoá Cost đã tạo (nếu có) khi reject
        Cost::where('attendance_id', $attendance->id)->delete();

        return $attendance->fresh();
    }

    /**
     * Handle user self check-in
     */
    public function checkIn(User $user, array $data): Attendance
    {
        $projectId = $data['project_id'] ?? null;
        $today = Carbon::today()->toDateString();

        // Check if user has an active session (checked in but not checked out) - ANY date, ANY project
        $active = Attendance::where('user_id', $user->id)
            ->whereNull('check_out')
            ->first();

        if ($active) {
            $projectName = $active->project ? $active->project->name : 'dự án khác';
            throw new Exception("Bạn đang có một ca làm việc chưa kết thúc tại {$projectName}. Vui lòng check-out trước khi bắt đầu ca mới.");
        }

        $now = Carbon::now();
        $status = $now->hour >= 8 && $now->minute > 15 ? 'late' : 'present';

        // Create a NEW record for each check-in to support multiple shifts
        return Attendance::create([
            'user_id'         => $user->id,
            'work_date'       => $today,
            'project_id'      => $projectId,
            'check_in'        => $now->format('H:i:s'),
            'status'          => $status,
            'check_in_method' => $data['method'] ?? 'gps',
            'latitude'        => $data['latitude'] ?? null,
            'longitude'       => $data['longitude'] ?? null,
            'note'            => $data['note'] ?? null,
            'workflow_status' => 'submitted', // Auto-submit for mobile check-in
        ]);
    }

    /**
     * Handle user self check-out
     */
    public function checkOut(User $user): Attendance
    {
        $today = Carbon::today()->toDateString();
        // Find the latest active session - ANY date
        $attendance = Attendance::where('user_id', $user->id)
            ->whereNull('check_out')
            ->latest()
            ->first();

        if (!$attendance) {
            throw new Exception('Không tìm thấy ca làm việc nào đang mở để check-out.');
        }

        $now = Carbon::now();
        $attendance->check_out = $now->format('H:i:s');
        
        // Calculate hours
        $hoursWorked = $attendance->calculateHours();
        $overtimeHours = max(0, $hoursWorked - 8);

        $attendance->hours_worked = $hoursWorked;
        $attendance->overtime_hours = $overtimeHours;
        $attendance->save();
        
        $this->syncLaborCost($attendance, $user);

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
                    $data['hours_worked'] = round(abs($end->diffInMinutes($start)) / 60, 2);

                    // If overtime_hours not explicitly provided, calculate it
                    if (!isset($data['overtime_hours']) || $data['overtime_hours'] == 0) {
                        $data['overtime_hours'] = max(0, $data['hours_worked'] - 8);
                    }
                } catch (Exception $e) {
                    // Log warning but continue
                }
            }

            // Mặc định duyệt luôn nếu là nhập thủ công (Admin/Manager)
            if (!isset($data['workflow_status'])) {
                $data['workflow_status'] = 'approved';
            }
            if (!isset($data['approved_by']) && $actor) {
                $data['approved_by'] = $actor->id;
                $data['approved_at'] = now();
            }

            $attendance = Attendance::updateOrCreate(
                ['user_id' => $data['user_id'], 'work_date' => $data['work_date']],
                $data
            );

            $this->syncLaborCost($attendance, $actor);

            return $attendance;
        });
    }

    /**
     * Approve Attendance — also auto-generate labor cost
     */
    public function approve(Attendance $attendance, User $user): bool
    {
        $result = $attendance->update([
            'workflow_status' => 'approved',
            'approved_by'     => $user->id,
            'approved_at'     => now(),
            'rejected_reason' => null,
        ]);

        if ($result) {
            $this->syncLaborCost($attendance, $user);
        }

        return $result;
    }

    /**
     * Revert Attendance to Submitted status (Hoàn duyệt)
     */
    public function revertToSubmitted(Attendance $attendance, User $user): bool
    {
        if (!in_array($attendance->workflow_status, ['approved', 'rejected'])) {
            throw new Exception('Chỉ có thể hoàn duyệt chấm công đã được duyệt hoặc từ chối.');
        }

        return DB::transaction(function () use ($attendance, $user) {
            $attendance->update([
                'workflow_status' => 'submitted',
                'approved_by'     => null,
                'approved_at'     => null,
                'rejected_reason' => null,
            ]);

            // Delete generated labor cost if it's draft (safe to delete)
            // If it's already approved/paid, generateLaborCost should handle it but here we're safer deleting if not yet paid
            $cost = Cost::where('attendance_id', $attendance->id)->first();
            if ($cost && $cost->status !== 'paid') {
                $cost->delete();
            }

            return true;
        });
    }

    /**
     * Hàm dùng chung để kích hoạt tạo chi phí nhân công một cách an toàn
     * @throws Exception
     */
    private function syncLaborCost(Attendance $attendance, ?User $actor = null): void
    {
        // Chỉ tạo chi phí nếu có project
        if (!$attendance->project_id) return;
        
        $this->generateLaborCost($attendance, $actor ?? $attendance->user);
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

        // 2. Lookup existing cost for this attendance record
        $existing = Cost::where('attendance_id', $attendance->id)->first();
        
        // Anti-Gravity: If cost exists AND is already paid, we might want to skip or handle specially.
        // For now, we allow updates but will reset status to draft if it's not paid.
        if ($existing && $existing->status === 'paid') {
            Log::info("Attendance #{$attendance->id}: Cost #{$existing->id} is already PAID. Skipping update.");
            return $existing;
        }

        // 3. Skip nếu status không hợp lệ (absent, leave, holiday)
        if (in_array($attendance->status, ['absent', 'leave', 'holiday'])) {
            return null;
        }

        // 4. Lookup cấu hình lương
        $configQuery = EmployeeSalaryConfig::forUser($attendance->user_id);
        $config = (clone $configQuery)
            ->where('effective_from', '<=', $attendance->work_date)
            ->where(function ($q) use ($attendance) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $attendance->work_date);
            })
            ->orderByDesc('effective_from')
            ->first();

        // Fallback: Nếu không tìm thấy cấu hình cho ngày này, lấy cấu hình đầu tiên hiện có của nhân sự
        if (!$config) {
            $config = $configQuery->orderBy('effective_from', 'asc')->first();
            if ($config) {
                Log::info("Attendance #{$attendance->id}: Using fallback config for user #{$attendance->user_id}");
            }
        }

        if (!$config) {
            throw new Exception("Không tìm thấy cấu hình lương cho nhân sự #{$attendance->user_id}. Vui lòng thiết lập lương trước khi duyệt.");
        }

        // 5. Tính chi phí
        $hourlyRate = $config->getHourlyEquivalent();
        $overtimeRate = $config->getOvertimeRate();

        $regularHours = abs((float) ($attendance->hours_worked ?? 0));
        $overtimeHours = abs((float) ($attendance->overtime_hours ?? 0));

        // Giờ thường = tổng giờ - OT (nhưng tối đa 8h thường)
        $regularHoursForCalc = max(0, $regularHours - $overtimeHours);

        $regularCost = $regularHoursForCalc * $hourlyRate;
        $overtimeCost = $overtimeHours * $overtimeRate;
        $totalCost = round($regularCost + $overtimeCost, 0);

        Log::info("Attendance #{$attendance->id} Audit: Rate={$hourlyRate}, OT_Rate={$overtimeRate}, RegHours={$regularHoursForCalc}, OTHours={$overtimeHours}, Total={$totalCost}");

        if ($totalCost <= 0) {
            // Log instead of throwing, as 0 cost might be expected but we should return null
            Log::info("Attendance #{$attendance->id}: Total cost is 0, skipping.");
            return null;
        }

        // 6. Tìm CostGroup "Nhân công" một cách linh hoạt
        // Ưu tiên 1: Mã NC
        $costGroup = CostGroup::where('code', 'NC')->active()->first();
        
        // Ưu tiên 2: Tên chứa "nhân công" hoặc "lương"
        if (!$costGroup) {
            $costGroup = CostGroup::where(function($q) {
                $q->where('name', 'LIKE', '%nhân công%')
                  ->orWhere('name', 'LIKE', '%lương%');
            })->active()->first();
        }

        // Ưu tiên 3: Lấy nhóm chi phí đầu tiên hiện có làm mặc định (tránh lỗi null)
        if (!$costGroup) {
            $costGroup = CostGroup::active()->orderBy('sort_order')->first();
            if ($costGroup) {
                Log::info("Attendance #{$attendance->id}: No labor cost group found, defaulting to: {$costGroup->name}");
            }
        }
        
        if (!$costGroup) {
            Log::warning("Attendance #{$attendance->id}: No active CostGroup found in system. Cost record might fail if table requires it.");
        }

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

        try {
            $costRecord = Cost::updateOrCreate(
                ['attendance_id' => $attendance->id],
                [
                    'project_id'    => $attendance->project_id,
                    'category'      => 'labor',
                    'cost_group_id' => $costGroup?->id,
                    'name'          => "Nhân công - {$userName} - {$dateFormatted}",
                    'amount'        => $totalCost,
                    'description'   => implode("\n", $descParts),
                    'cost_date'     => $attendance->work_date,
                    'status'        => 'draft', // Reset to draft on any hour update to ensure re-approval
                    'created_by'    => $actor->id,
                ]
            );
            Log::info("Attendance #{$attendance->id}: Synchronized Cost #{$costRecord->id} (Amount: {$totalCost})");
            return $costRecord;
        } catch (\Exception $e) {
            Log::error("Attendance #{$attendance->id}: Database error creating Cost: " . $e->getMessage());
            throw $e;
        }
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
    public function getMonthlyStatistics(int $year, int $month, ?int $projectId = null, ?int $userId = null): array
    {
        $query = Attendance::forMonth($year, $month);
        if ($projectId) {
            $query->forProject($projectId);
        }
        if ($userId) {
            $query->forUser($userId);
        }

        $records = $query->with('user:id,name,email')->get();

        $userStats = $records->groupBy('user_id')->map(function ($userRecords) {
            $approvedRecords = $userRecords->where('workflow_status', 'approved');
            return [
                'user'           => $userRecords->first()->user,
                'total_days'     => $userRecords->count(),
                'present'        => $userRecords->where('status', 'present')->count(),
                'late'           => $userRecords->where('status', 'late')->count(),
                'absent'         => $userRecords->where('status', 'absent')->count(),
                'leave'          => $userRecords->where('status', 'leave')->count(),
                'half_day'       => $userRecords->where('status', 'half_day')->count(),
                'total_hours'    => round($approvedRecords->sum(fn($r) => abs($r->hours_worked)), 2),
                'total_overtime' => round($approvedRecords->sum(fn($r) => abs($r->overtime_hours)), 2),
                'pending_hours'  => round($userRecords->where('workflow_status', 'submitted')->sum(fn($r) => abs($r->hours_worked)), 2),
            ];
        })->values();

        $approvedOnly = $records->where('workflow_status', 'approved');

        return [
            'summary' => [
                'total_records'  => $records->count(),
                'total_present'  => $records->where('status', 'present')->count(),
                'total_late'     => $records->where('status', 'late')->count(),
                'total_absent'   => $records->where('status', 'absent')->count(),
                'total_hours'    => round($approvedOnly->sum(fn($r) => abs($r->hours_worked)), 2),
                'total_overtime' => round($approvedOnly->sum(fn($r) => abs($r->overtime_hours)), 2),
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
