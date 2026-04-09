<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\WorkShift;
use App\Models\ShiftAssignment;
use App\Models\Project;
use App\Constants\Permissions;
use App\Services\AuthorizationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;

class AttendanceController extends Controller
{
    protected $authService;

    public function __construct(AuthorizationService $authService)
    {
        $this->authService = $authService;
    }
    // ===== CHẤM CÔNG =====

    /** Danh sách chấm công (theo project hoặc tổng) */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $projectId = $request->project_id;
        
        if ($projectId) {
            $project = Project::findOrFail($projectId);
            if (!$this->authService->can($user, Permissions::ATTENDANCE_VIEW, $project)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền xem chấm công dự án này.'], 403);
            }
        } elseif (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(Permissions::ATTENDANCE_VIEW)) {
             return response()->json(['success' => false, 'message' => 'Không có quyền xem chấm công hệ thống.'], 403);
        }

        $query = Attendance::with(['user:id,name,email', 'project:id,name', 'approver:id,name']);

        if ($request->project_id) $query->forProject($request->project_id);
        if ($request->user_id) $query->forUser($request->user_id);
        if ($request->month && $request->year) {
            $query->forMonth($request->year, $request->month);
        } elseif ($request->date) {
            $query->forDate($request->date);
        }
        if ($request->status) $query->where('status', $request->status);

        $data = $query->orderByDesc('work_date')->paginate($request->per_page ?? 30);
        return response()->json($data);
    }

    /** Check-in */
    public function checkIn(Request $request): JsonResponse
    {
        $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'note' => 'nullable|string|max:500',
        ]);

        $user = $request->user();

        if ($request->project_id) {
            $project = Project::findOrFail($request->project_id);
            if (!$this->authService->can($user, Permissions::ATTENDANCE_CHECK_IN, $project)) {
                return response()->json(['success' => false, 'message' => 'Bạn không thuộc dự án này để check-in.'], 403);
            }
        }

        $today = Carbon::today()->toDateString();

        $existing = Attendance::where('user_id', $user->id)->where('work_date', $today)->first();
        if ($existing && $existing->check_in) {
            return response()->json(['message' => 'Bạn đã check-in hôm nay rồi'], 422);
        }

        $attendance = Attendance::updateOrCreate(
            ['user_id' => $user->id, 'work_date' => $today],
            [
                'project_id' => $request->project_id,
                'check_in' => Carbon::now()->format('H:i:s'),
                'status' => Carbon::now()->hour >= 8 && Carbon::now()->minute > 15 ? 'late' : 'present',
                'check_in_method' => $request->input('method') ?? 'manual',
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'note' => $request->note,
            ]
        );

        return response()->json([
            'message' => 'Check-in thành công',
            'data' => $attendance->load('user:id,name'),
        ]);
    }

    /** Check-out */
    public function checkOut(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = Carbon::today()->toDateString();

        $attendance = Attendance::where('user_id', $user->id)->where('work_date', $today)->first();
        if (!$attendance || !$attendance->check_in) {
            return response()->json(['message' => 'Bạn chưa check-in hôm nay'], 422);
        }
        if ($attendance->check_out) {
            return response()->json(['message' => 'Bạn đã check-out rồi'], 422);
        }

        $checkOut = Carbon::now()->format('H:i:s');
        $attendance->update(['check_out' => $checkOut]);

        // Recalculate after update
        $hoursWorked = $attendance->calculateHours();
        $overtimeHours = max(0, $hoursWorked - 8);

        $attendance->update([
            'hours_worked' => $hoursWorked,
            'overtime_hours' => $overtimeHours,
        ]);

        return response()->json([
            'message' => 'Check-out thành công',
            'data' => $attendance->fresh()->load('user:id,name'),
        ]);
    }

    /** Tạo/Chỉnh sửa chấm công thủ công (admin) */
    public function store(Request $request): JsonResponse
    {
        try {
            \Log::info('Manual Attendance Store:', $request->all());

            $request->validate([
                'user_id' => 'required|exists:users,id',
                'project_id' => 'nullable|exists:projects,id',
                'work_date' => 'required|date',
                'check_in' => 'nullable|date_format:H:i',
                'check_out' => 'nullable|date_format:H:i',
                'status' => 'required|in:present,absent,late,half_day,leave,holiday',
                'note' => 'nullable|string|max:500',
            ]);

            $user = auth()->user();
            if ($request->project_id) {
                $project = Project::findOrFail($request->project_id);
                if (!$this->authService->can($user, Permissions::ATTENDANCE_MANAGE, $project)) {
                    return response()->json(['success' => false, 'message' => 'Không có quyền quản lý chấm công dự án này.'], 403);
                }
            } elseif (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(Permissions::ATTENDANCE_MANAGE)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền quản lý chấm công hệ thống.'], 403);
            }

            $data = $request->only(['user_id', 'project_id', 'work_date', 'check_in', 'check_out', 'status', 'note', 'check_in_method', 'overtime_hours']);

            if ($request->filled(['check_in', 'check_out'])) {
                try {
                    $start = Carbon::parse($request->check_in);
                    $end = Carbon::parse($request->check_out);
                    $data['hours_worked'] = round($end->diffInMinutes($start) / 60, 2);

                    // If overtime_hours was sent from frontend (manual), use it; otherwise calculate
                    if (!$request->has('overtime_hours') || $request->overtime_hours == 0) {
                        $data['overtime_hours'] = max(0, $data['hours_worked'] - 8);
                    }
                } catch (\Exception $e) {
                    \Log::error('Time parsing failed: ' . $e->getMessage());
                }
            }

            $attendance = Attendance::updateOrCreate(
                ['user_id' => $data['user_id'], 'work_date' => $data['work_date']],
                $data
            );

            return response()->json([
                'message' => 'Lưu chấm công thành công',
                'data' => $attendance->load(['user:id,name', 'project:id,name']),
            ]);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Attendance Validation Error:', $e->errors());
            return response()->json([
                'message' => 'Dữ liệu không hợp lệ',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Attendance Store Error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Lỗi: ' . $e->getMessage(),
            ], 500);
        }
    }

    /** Duyệt chấm công */
    public function approve(Request $request, $id): JsonResponse
    {
        $attendance = Attendance::findOrFail($id);
        $user = $request->user();

        if ($attendance->project_id) {
            $project = Project::findOrFail($attendance->project_id);
            if (!$this->authService->can($user, Permissions::ATTENDANCE_APPROVE, $project)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền duyệt chấm công dự án này.'], 403);
            }
        } elseif (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(Permissions::ATTENDANCE_APPROVE)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền duyệt chấm công hệ thống.'], 403);
        }

        $attendance->update([
            'approved_by' => $user->id,
            'approved_at' => now(),
        ]);

        return response()->json(['message' => 'Đã duyệt chấm công', 'data' => $attendance]);
    }

    /** Thống kê chấm công theo tháng */
    public function statistics(Request $request): JsonResponse
    {
        $request->validate([
            'year' => 'required|integer',
            'month' => 'required|integer|between:1,12',
            'project_id' => 'nullable|exists:projects,id',
        ]);

        $user = auth()->user();
        if ($request->project_id) {
            $project = Project::findOrFail($request->project_id);
            if (!$this->authService->can($user, Permissions::ATTENDANCE_VIEW, $project)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền xem thống kê dự án này.'], 403);
            }
        } elseif (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(Permissions::ATTENDANCE_VIEW)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền xem thống kê chấm công hệ thống.'], 403);
        }

        $query = Attendance::forMonth($request->year, $request->month);
        if ($request->project_id) $query->forProject($request->project_id);

        $records = $query->get();
        $userStats = $records->groupBy('user_id')->map(function ($userRecords) {
            return [
                'user' => $userRecords->first()->user,
                'total_days' => $userRecords->count(),
                'present' => $userRecords->where('status', 'present')->count(),
                'late' => $userRecords->where('status', 'late')->count(),
                'absent' => $userRecords->where('status', 'absent')->count(),
                'leave' => $userRecords->where('status', 'leave')->count(),
                'half_day' => $userRecords->where('status', 'half_day')->count(),
                'total_hours' => $userRecords->sum('hours_worked'),
                'total_overtime' => $userRecords->sum('overtime_hours'),
            ];
        })->values();

        return response()->json([
            'summary' => [
                'total_records' => $records->count(),
                'total_present' => $records->where('status', 'present')->count(),
                'total_late' => $records->where('status', 'late')->count(),
                'total_absent' => $records->where('status', 'absent')->count(),
                'total_hours' => $records->sum('hours_worked'),
                'total_overtime' => $records->sum('overtime_hours'),
            ],
            'by_user' => $userStats,
        ]);
    }

    // ===== PHÂN CA =====

    /** Danh sách ca */
    public function shifts(Request $request): JsonResponse
    {
        $user = auth()->user();
        if ($request->project_id) {
            $project = Project::findOrFail($request->project_id);
            if (!$this->authService->can($user, Permissions::ATTENDANCE_VIEW, $project)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền xem danh sách ca dự án này.'], 403);
            }
        }

        $query = WorkShift::query();
        if ($request->project_id) $query->where('project_id', $request->project_id);
        if ($request->active_only) $query->where('is_active', true);
        return response()->json($query->orderBy('start_time')->get());
    }

    /** Tạo ca */
    public function createShift(Request $request): JsonResponse
    {
        $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'name' => 'required|string|max:100',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
            'break_hours' => 'nullable|numeric|min:0|max:4',
            'is_overtime_shift' => 'nullable|boolean',
            'overtime_multiplier' => 'nullable|numeric|min:1|max:5',
        ]);

        $user = auth()->user();
        if ($request->project_id) {
            $project = Project::findOrFail($request->project_id);
            if (!$this->authService->can($user, Permissions::ATTENDANCE_MANAGE, $project)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền quản lý ca dự án này.'], 403);
            }
        } elseif (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(Permissions::ATTENDANCE_MANAGE)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền quản lý ca hệ thống.'], 403);
        }

        $shift = WorkShift::create($request->all());
        return response()->json(['message' => 'Tạo ca thành công', 'data' => $shift], 201);
    }

    /** Sửa ca */
    public function updateShift(Request $request, $id): JsonResponse
    {
        $shift = WorkShift::findOrFail($id);
        $user = auth()->user();

        if ($shift->project_id) {
            $project = Project::findOrFail($shift->project_id);
            if (!$this->authService->can($user, Permissions::ATTENDANCE_MANAGE, $project)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền cập nhật ca của dự án này.'], 403);
            }
        } elseif (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(Permissions::ATTENDANCE_MANAGE)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền cập nhật ca hệ thống.'], 403);
        }

        $shift->update($request->all());
        return response()->json(['message' => 'Cập nhật ca thành công', 'data' => $shift]);
    }

    /** Xóa ca */
    public function deleteShift($id): JsonResponse
    {
        $shift = WorkShift::findOrFail($id);
        $user = auth()->user();

        if ($shift->project_id) {
            $project = Project::findOrFail($shift->project_id);
            if (!$this->authService->can($user, Permissions::ATTENDANCE_MANAGE, $project)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền xóa ca của dự án này.'], 403);
            }
        } elseif (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(Permissions::ATTENDANCE_MANAGE)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền xóa ca hệ thống.'], 403);
        }

        $shift->delete();
        return response()->json(['message' => 'Đã xóa ca']);
    }

    // ===== PHÂN CA NHÂN SỰ =====

    /** Danh sách phân ca */
    public function shiftAssignments(Request $request): JsonResponse
    {
        $query = ShiftAssignment::with(['workShift', 'user:id,name', 'project:id,name', 'assigner:id,name']);

        if ($request->project_id) $query->forProject($request->project_id);
        if ($request->date) $query->forDate($request->date);
        if ($request->week_of) $query->forWeek($request->week_of);
        if ($request->user_id) $query->where('user_id', $request->user_id);

        return response()->json($query->orderBy('assigned_date')->get());
    }

    /** Phân ca hàng loạt */
    public function assignShifts(Request $request): JsonResponse
    {
        $user = auth()->user();
        if ($request->project_id) {
            $project = Project::findOrFail($request->project_id);
            if (!$this->authService->can($user, Permissions::ATTENDANCE_MANAGE, $project)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền phân ca dự án này.'], 403);
            }
        } elseif (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(Permissions::ATTENDANCE_MANAGE)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền phân ca hệ thống.'], 403);
        }

        $request->validate([
            'work_shift_id' => 'required|exists:work_shifts,id',
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
            'dates' => 'required|array|min:1',
            'dates.*' => 'date',
            'project_id' => 'nullable|exists:projects,id',
        ]);

        $created = [];
        foreach ($request->user_ids as $userId) {
            foreach ($request->dates as $date) {
                $created[] = ShiftAssignment::updateOrCreate(
                    ['user_id' => $userId, 'assigned_date' => $date, 'work_shift_id' => $request->work_shift_id],
                    [
                        'project_id' => $request->project_id,
                        'assigned_by' => $request->user()->id,
                    ]
                );
            }
        }

        return response()->json([
            'message' => 'Phân ca thành công cho ' . count($created) . ' lượt',
            'data' => $created,
        ]);
    }

    /** Xóa phân ca */
    public function removeAssignment($id): JsonResponse
    {
        $assignment = ShiftAssignment::findOrFail($id);
        $user = auth()->user();

        if ($assignment->project_id) {
            $project = Project::findOrFail($assignment->project_id);
            if (!$this->authService->can($user, Permissions::ATTENDANCE_MANAGE, $project)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền xóa phân ca dự án này.'], 403);
            }
        } elseif (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(Permissions::ATTENDANCE_MANAGE)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền xóa phân ca hệ thống.'], 403);
        }

        $assignment->delete();
        return response()->json(['message' => 'Đã xóa phân ca']);
    }
}
