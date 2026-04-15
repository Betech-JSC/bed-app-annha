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
    protected $attendanceService;

    public function __construct(
        AuthorizationService $authService,
        \App\Services\AttendanceService $attendanceService
    ) {
        $this->authService = $authService;
        $this->attendanceService = $attendanceService;
    }
    // ===== CHẤM CÔNG =====

    /** Danh sách chấm công (theo project hoặc tổng) */
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();
        $projectId = $request->project_id;
        
        // Phân quyền: Luôn cho phép xem nếu là xem của chính mình
        $isSelf = $request->user_id && $request->user_id == $user->id;

        if ($projectId) {
            $project = Project::findOrFail($projectId);
            if (!$isSelf && !$this->authService->can($user, Permissions::ATTENDANCE_VIEW, $project)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền xem chấm công dự án này.'], 403);
            }
        } elseif (!$isSelf && !$user->owner && !$user->isAdmin() && !$user->hasPermission(Permissions::ATTENDANCE_VIEW)) {
             return response()->json(['success' => false, 'message' => 'Không có quyền xem chấm công hệ thống.'], 403);
        }

        $query = Attendance::with(['user:id,name,email', 'project:id,name', 'approver:id,name', 'laborCost']);

        if ($projectId) {
            $query->forProject($projectId);
        }
        
        if ($request->user_id) $query->forUser($request->user_id);
        
        if ($request->month && $request->year) {
            $query->forMonth($request->year, $request->month);
        } elseif ($request->date) {
            $query->forDate($request->date);
        }
        if ($request->status) $query->where('status', $request->status);

        $paginate = $query->orderByDesc('work_date')->orderByDesc('id')->paginate($request->per_page ?? 30);
        
        // Self-healing: Fix negative hours on the fly for visibility
        foreach ($paginate->items() as $att) {
            if ($att->hours_worked < 0 || $att->overtime_hours < 0) {
                $att->hours_worked = abs($att->hours_worked);
                $att->overtime_hours = abs($att->overtime_hours);
                $att->save();
            }
        }

        return response()->json($paginate);
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

        if (!$user->hasSalaryConfig()) {
            return response()->json(['success' => false, 'message' => 'Tài khoản của bạn chưa có cấu hình lương, không thể thực hiện chấm công.'], 403);
        }

        if ($request->project_id) {
            $project = Project::findOrFail($request->project_id);
            if (!$this->authService->can($user, Permissions::ATTENDANCE_CHECK_IN, $project)) {
                return response()->json(['success' => false, 'message' => 'Bạn không thuộc dự án này để check-in.'], 403);
            }
        }

        try {
            $attendance = $this->attendanceService->checkIn($user, $request->all());

            return response()->json([
                'message' => 'Check-in thành công',
                'data' => $attendance->load('user:id,name'),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /** Check-out */
    public function checkOut(Request $request): JsonResponse
    {
        $user = $request->user();
        try {
            $attendance = $this->attendanceService->checkOut($user);

            return response()->json([
                'message' => 'Check-out thành công',
                'data' => $attendance->fresh()->load('user:id,name'),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
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
            } elseif (!$user->owner && !$user->isAdmin() && !$user->hasPermission(Permissions::ATTENDANCE_MANAGE)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền quản lý chấm công hệ thống.'], 403);
            }

        try {
            $attendance = $this->attendanceService->upsert($request->all(), $user);

            return response()->json([
                'message' => 'Lưu chấm công thành công',
                'data' => $attendance->load(['user:id,name', 'project:id,name']),
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
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

    /** NV gửi chấm công để duyệt */
    public function submit(Request $request, $id): JsonResponse
    {
        $attendance = Attendance::findOrFail($id);
        $user = $request->user();

        try {
            $attendance = $this->attendanceService->submit($attendance, $user);
            return response()->json(['message' => 'Đã gửi chấm công chờ duyệt', 'data' => $attendance]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /** Manager từ chối chấm công */
    public function reject(Request $request, $id): JsonResponse
    {
        $attendance = Attendance::findOrFail($id);
        $user = $request->user();

        if ($attendance->project_id) {
            $project = Project::findOrFail($attendance->project_id);
            if (!$this->authService->can($user, Permissions::ATTENDANCE_APPROVE, $project)) {
                return response()->json(['success' => false, 'message' => 'Không có quyền từ chối chấm công dự án này.'], 403);
            }
        } elseif (!$user->owner && !$user->isAdmin() && !$user->hasPermission(Permissions::ATTENDANCE_APPROVE)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền từ chối chấm công hệ thống.'], 403);
        }

        $request->validate(['reason' => 'required|string|max:500']);

        try {
            $attendance = $this->attendanceService->reject($attendance, $user, $request->reason);
            return response()->json(['message' => 'Đã từ chối chấm công', 'data' => $attendance]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
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
        } elseif (!$user->owner && !$user->isAdmin() && !$user->hasPermission(Permissions::ATTENDANCE_APPROVE)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền duyệt chấm công hệ thống.'], 403);
        }

        try {
            $this->attendanceService->approve($attendance, $user);
            return response()->json(['message' => 'Đã duyệt chấm công', 'data' => $attendance->fresh()]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    /** Tổng hợp chi phí nhân công từ chấm công (batch) */
    public function generateLaborCosts(Request $request): JsonResponse
    {
        $request->validate([
            'project_id' => 'required|exists:projects,id',
            'year'       => 'required|integer|min:2020|max:2030',
            'month'      => 'required|integer|min:1|max:12',
        ]);

        $user = $request->user();
        $project = Project::findOrFail($request->project_id);

        // Check permission — require ATTENDANCE_MANAGE or owner
        if (!$this->authService->can($user, Permissions::ATTENDANCE_MANAGE, $project)
            && !$user->owner && !$user->isAdmin()) {
            return response()->json(['success' => false, 'message' => 'Không có quyền tổng hợp lương.'], 403);
        }

        try {
            $result = $this->attendanceService->generateBatchLaborCosts(
                (int) $request->project_id,
                (int) $request->year,
                (int) $request->month,
                $user
            );

            return response()->json([
                'success' => true,
                'message' => "Đã tạo {$result['created']} chi phí nhân công, tổng " . number_format($result['total_amount'], 0, ',', '.') . 'đ',
                'data'    => $result,
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
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
        } elseif (!$user->owner && !$user->isAdmin() && !$user->hasPermission(Permissions::ATTENDANCE_VIEW)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền xem thống kê chấm công hệ thống.'], 403);
        }

        $data = $this->attendanceService->getMonthlyStatistics(
            (int) $request->year,
            (int) $request->month,
            $request->project_id ? (int) $request->project_id : null,
            $request->user_id ? (int) $request->user_id : null
        );

        return response()->json($data);
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

        $shifts = $this->attendanceService->getShifts($request->only(['project_id', 'active_only']));
        return response()->json($shifts);
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
        } elseif (!$user->owner && !$user->isAdmin() && !$user->hasPermission(Permissions::ATTENDANCE_MANAGE)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền quản lý ca hệ thống.'], 403);
        }

        $shift = $this->attendanceService->createShift($request->all());
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
        } elseif (!$user->owner && !$user->isAdmin() && !$user->hasPermission(Permissions::ATTENDANCE_MANAGE)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền cập nhật ca hệ thống.'], 403);
        }

        $this->attendanceService->updateShift($shift, $request->all());
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
        } elseif (!$user->owner && !$user->isAdmin() && !$user->hasPermission(Permissions::ATTENDANCE_MANAGE)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền xóa ca hệ thống.'], 403);
        }

        $this->attendanceService->deleteShift($shift);
        return response()->json(['message' => 'Đã xóa ca']);
    }

    // ===== PHÂN CA NHÂN SỰ =====

    /** Danh sách phân ca */
    public function shiftAssignments(Request $request): JsonResponse
    {
        $assignments = $this->attendanceService->getShiftAssignments($request->only(['project_id', 'date', 'week_of', 'user_id']));

        return response()->json($assignments);
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
        } elseif (!$user->owner && !$user->isAdmin() && !$user->hasPermission(Permissions::ATTENDANCE_MANAGE)) {
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

        $created = $this->attendanceService->assignShifts($request->all(), $user);

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
        } elseif (!$user->owner && !$user->isAdmin() && !$user->hasPermission(Permissions::ATTENDANCE_MANAGE)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền xóa phân ca hệ thống.'], 403);
        }

        $this->attendanceService->removeAssignment($assignment);
        return response()->json(['message' => 'Đã xóa phân ca']);
    }
}
