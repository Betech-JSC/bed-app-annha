<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TimeTracking;
use App\Models\OvertimeRule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class TimeTrackingController extends Controller
{
    /**
     * Danh sách chấm công (HR only)
     */
    public function index(Request $request)
    {
        $query = TimeTracking::with(['user', 'project', 'approver']);

        // Filter by user
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by project
        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->byDateRange(
                Carbon::parse($request->start_date),
                Carbon::parse($request->end_date)
            );
        }

        $timeTrackings = $query->orderByDesc('check_in_at')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $timeTrackings
        ]);
    }

    /**
     * Check-in (tạo record mới)
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'check_in_location' => 'nullable|string|max:255',
            'check_in_method' => 'nullable|in:card,qr,gps,faceid,manual',
            'shift' => 'nullable|string|max:50',
            'work_date' => 'nullable|date',
            'check_in_latitude' => 'nullable|numeric|between:-90,90',
            'check_in_longitude' => 'nullable|numeric|between:-180,180',
            'qr_code' => 'nullable|string|max:255',
            'face_id_photo' => 'nullable|string|max:255',
            'is_overtime' => 'nullable|boolean',
            'overtime_type' => 'nullable|in:weekday,weekend,holiday',
            'overtime_category_id' => 'nullable|exists:overtime_categories,id',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            // Check if user has an open check-in
            $openTracking = TimeTracking::where('user_id', $user->id)
                ->whereNull('check_out_at')
                ->where('status', '!=', 'rejected')
                ->first();

            if ($openTracking) {
                return response()->json([
                    'success' => false,
                    'message' => 'Bạn đã check-in. Vui lòng check-out trước khi check-in mới.'
                ], 400);
            }

            $workDate = $validated['work_date'] ?? now()->toDateString();

            $timeTracking = TimeTracking::create([
                'user_id' => $user->id,
                'project_id' => $validated['project_id'] ?? null,
                'check_in_at' => now(),
                'check_in_location' => $validated['check_in_location'] ?? null,
                'check_in_method' => $validated['check_in_method'] ?? 'manual',
                'shift' => $validated['shift'] ?? null,
                'work_date' => $workDate,
                'check_in_latitude' => $validated['check_in_latitude'] ?? null,
                'check_in_longitude' => $validated['check_in_longitude'] ?? null,
                'qr_code' => $validated['qr_code'] ?? null,
                'face_id_photo' => $validated['face_id_photo'] ?? null,
                'is_overtime' => $validated['is_overtime'] ?? false,
                'overtime_type' => $validated['overtime_type'] ?? null,
                'overtime_category_id' => $validated['overtime_category_id'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'status' => 'pending',
            ]);

            // Auto calculate overtime if applicable
            if ($timeTracking->is_overtime) {
                $this->calculateOvertime($timeTracking);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Check-in thành công.',
                'data' => $timeTracking->load(['user', 'project'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check-out (cập nhật record)
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();

        $validated = $request->validate([
            'check_out_location' => 'nullable|string|max:255',
            'check_out_latitude' => 'nullable|numeric|between:-90,90',
            'check_out_longitude' => 'nullable|numeric|between:-180,180',
            'notes' => 'nullable|string',
        ]);

        $timeTracking = TimeTracking::findOrFail($id);

        // User can only update their own tracking
        if ($timeTracking->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật chấm công này.'
            ], 403);
        }

        if ($timeTracking->check_out_at) {
            return response()->json([
                'success' => false,
                'message' => 'Đã check-out rồi.'
            ], 400);
        }

        try {
            DB::beginTransaction();

            $timeTracking->check_out_at = now();
            $timeTracking->check_out_location = $validated['check_out_location'] ?? null;
            $timeTracking->check_out_latitude = $validated['check_out_latitude'] ?? null;
            $timeTracking->check_out_longitude = $validated['check_out_longitude'] ?? null;
            if ($validated['notes'] ?? null) {
                $timeTracking->notes = ($timeTracking->notes ? $timeTracking->notes . "\n" : '') . $validated['notes'];
            }
            $timeTracking->calculateHours();

            // Recalculate overtime on check-out
            if ($timeTracking->is_overtime || $this->shouldBeOvertime($timeTracking)) {
                $this->calculateOvertime($timeTracking);
            }

            $timeTracking->save();

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Check-out thành công.',
                'data' => $timeTracking->load(['user', 'project'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Duyệt chấm công (HR/admin only)
     */
    public function approve(Request $request, $id)
    {
        $user = $request->user();
        $timeTracking = TimeTracking::findOrFail($id);

        try {
            $timeTracking->approve($user);

            return response()->json([
                'success' => true,
                'message' => 'Chấm công đã được duyệt.',
                'data' => $timeTracking->load(['user', 'project', 'approver'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Từ chối chấm công (HR/admin only)
     */
    public function reject(Request $request, $id)
    {
        $user = $request->user();
        $timeTracking = TimeTracking::findOrFail($id);

        try {
            $timeTracking->reject($user);

            return response()->json([
                'success' => true,
                'message' => 'Chấm công đã bị từ chối.',
                'data' => $timeTracking->load(['user', 'project', 'approver'])
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Chấm công của user hiện tại
     */
    public function myTimeTracking(Request $request)
    {
        $user = $request->user();

        $query = TimeTracking::forUser($user->id)
            ->with(['project']);

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->byDateRange(
                Carbon::parse($request->start_date),
                Carbon::parse($request->end_date)
            );
        }

        $timeTrackings = $query->orderByDesc('check_in_at')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $timeTrackings
        ]);
    }

    /**
     * Check-in (alias for store)
     */
    public function checkIn(Request $request)
    {
        return $this->store($request);
    }

    /**
     * Check-out (alias for update)
     */
    public function checkOut(Request $request, $id)
    {
        return $this->update($request, $id);
    }

    /**
     * Check-in bằng QR code
     */
    public function checkInByQR(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'qr_code' => 'required|string|max:255',
            'project_id' => 'nullable|exists:projects,id',
        ]);

        // Verify QR code (có thể check với project hoặc location)
        // TODO: Implement QR code verification logic

        $request->merge([
            'check_in_method' => 'qr',
            'qr_code' => $validated['qr_code'],
        ]);

        return $this->store($request);
    }

    /**
     * Check-in bằng GPS
     */
    public function checkInByGPS(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'latitude' => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
            'project_id' => 'nullable|exists:projects,id',
        ]);

        // Verify GPS location (có thể check với project location)
        // TODO: Implement GPS verification logic

        $request->merge([
            'check_in_method' => 'gps',
            'check_in_latitude' => $validated['latitude'],
            'check_in_longitude' => $validated['longitude'],
        ]);

        return $this->store($request);
    }

    /**
     * Check-in bằng FaceID
     */
    public function checkInByFaceID(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'face_id_photo' => 'required|string|max:255', // URL or base64
            'project_id' => 'nullable|exists:projects,id',
        ]);

        // Verify FaceID (có thể check với user face data)
        // TODO: Implement FaceID verification logic

        $request->merge([
            'check_in_method' => 'faceid',
            'face_id_photo' => $validated['face_id_photo'],
        ]);

        return $this->store($request);
    }

    /**
     * Kiểm tra xem có phải OT không
     */
    protected function shouldBeOvertime(TimeTracking $tracking): bool
    {
        if (!$tracking->check_in_at || !$tracking->check_out_at) {
            return false;
        }

        $checkIn = $tracking->check_in_at;
        $checkOut = $tracking->check_out_at;

        // Check if before 7:30 AM or after 5:30 PM
        $workStart = $checkIn->copy()->setTime(7, 30, 0);
        $workEnd = $checkIn->copy()->setTime(17, 30, 0);

        return $checkIn->lt($workStart) || $checkOut->gt($workEnd);
    }

    /**
     * Tính toán OT cho time tracking
     */
    protected function calculateOvertime(TimeTracking $tracking): void
    {
        if (!$tracking->check_in_at || !$tracking->check_out_at) {
            return;
        }

        $hoursData = $tracking->calculateOvertimeHours();

        if ($hoursData['overtime_hours'] > 0) {
            $tracking->is_overtime = true;
            $tracking->overtime_hours = $hoursData['overtime_hours'];

            // Determine OT type
            $checkIn = $tracking->check_in_at;
            $dayOfWeek = $checkIn->dayOfWeek;

            // TODO: Check if holiday
            if ($dayOfWeek === Carbon::SATURDAY || $dayOfWeek === Carbon::SUNDAY) {
                $tracking->overtime_type = 'weekend';
            } else {
                $tracking->overtime_type = 'weekday';
            }

            // Get OT rule and multiplier
            $rule = OvertimeRule::getRuleForDateTime($checkIn, $tracking->overtime_type);
            if ($rule) {
                $tracking->overtime_multiplier = $rule->multiplier;
            } else {
                $tracking->overtime_multiplier = 1.5; // Default
            }
        }
    }
}
