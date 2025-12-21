<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class WorkScheduleController extends Controller
{
    /**
     * Danh sách lịch làm việc
     */
    public function index(Request $request)
    {
        $query = WorkSchedule::with(['user', 'project']);

        // Filter by user
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by project
        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->byDateRange(
                Carbon::parse($request->start_date),
                Carbon::parse($request->end_date)
            );
        }

        // Filter by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        $schedules = $query->orderBy('date')->orderBy('start_time')->paginate(50);

        return response()->json([
            'success' => true,
            'data' => $schedules
        ]);
    }

    /**
     * Tạo lịch làm việc
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'project_id' => 'nullable|exists:projects,id',
            'date' => 'required|date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'type' => 'required|in:work,leave,holiday,overtime',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $schedule = WorkSchedule::create($validated);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Lịch làm việc đã được tạo.',
                'data' => $schedule->load(['user', 'project'])
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
     * Cập nhật lịch
     */
    public function update(Request $request, $id)
    {
        $schedule = WorkSchedule::findOrFail($id);

        $validated = $request->validate([
            'date' => 'sometimes|date',
            'start_time' => 'sometimes|date_format:H:i',
            'end_time' => 'sometimes|date_format:H:i|after:start_time',
            'type' => 'sometimes|in:work,leave,holiday,overtime',
            'notes' => 'nullable|string',
        ]);

        try {
            $schedule->update($validated);

            return response()->json([
                'success' => true,
                'message' => 'Lịch làm việc đã được cập nhật.',
                'data' => $schedule->load(['user', 'project'])
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
     * Xóa lịch
     */
    public function destroy($id)
    {
        $schedule = WorkSchedule::findOrFail($id);

        try {
            $schedule->delete();

            return response()->json([
                'success' => true,
                'message' => 'Lịch làm việc đã được xóa.'
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
     * API cho calendar view (theo tháng/tuần)
     */
    public function calendar(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'project_id' => 'nullable|exists:projects,id',
            'month' => 'nullable|integer|min:1|max:12',
            'year' => 'nullable|integer|min:2000',
            'week_start' => 'nullable|date',
        ]);

        $query = WorkSchedule::with(['user', 'project']);

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by month/year
        if ($request->has('month') && $request->has('year')) {
            $startDate = Carbon::create($validated['year'], $validated['month'], 1);
            $endDate = $startDate->copy()->endOfMonth();
            $query->byDateRange($startDate, $endDate);
        }

        // Filter by week
        if ($request->has('week_start')) {
            $weekStart = Carbon::parse($validated['week_start']);
            $weekEnd = $weekStart->copy()->addDays(6);
            $query->byDateRange($weekStart, $weekEnd);
        }

        $schedules = $query->orderBy('date')->orderBy('start_time')->get();

        // Group by date for calendar view
        $grouped = $schedules->groupBy(function ($schedule) {
            return $schedule->date->format('Y-m-d');
        });

        return response()->json([
            'success' => true,
            'data' => $grouped
        ]);
    }

    /**
     * Thống kê lịch làm việc
     */
    public function statistics(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'nullable|exists:users,id',
            'project_id' => 'nullable|exists:projects,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
        ]);

        $query = WorkSchedule::query();

        // Filter by user
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        // Filter by project
        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by date range
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->byDateRange(
                Carbon::parse($request->start_date),
                Carbon::parse($request->end_date)
            );
        }

        $schedules = $query->get();

        // Calculate statistics
        $workDays = $schedules->where('type', 'work')->unique('date')->count();
        $leaveDays = $schedules->where('type', 'leave')->unique('date')->count();
        $holidayDays = $schedules->where('type', 'holiday')->unique('date')->count();

        // Calculate total hours for work type
        $totalHours = $schedules->where('type', 'work')->sum(function ($schedule) {
            $startTime = Carbon::createFromTimeString($schedule->start_time);
            $endTime = Carbon::createFromTimeString($schedule->end_time);
            // Handle case where end_time is next day
            if ($endTime->lt($startTime)) {
                $endTime->addDay();
            }
            return $startTime->diffInHours($endTime, true);
        });

        // Calculate overtime hours
        $overtimeHours = $schedules->where('type', 'overtime')->sum(function ($schedule) {
            $startTime = Carbon::createFromTimeString($schedule->start_time);
            $endTime = Carbon::createFromTimeString($schedule->end_time);
            // Handle case where end_time is next day
            if ($endTime->lt($startTime)) {
                $endTime->addDay();
            }
            return $startTime->diffInHours($endTime, true);
        });

        return response()->json([
            'success' => true,
            'data' => [
                'work_days' => $workDays,
                'total_hours' => round($totalHours, 2),
                'leave_days' => $leaveDays,
                'holiday_days' => $holidayDays,
                'overtime_hours' => round($overtimeHours, 2),
            ]
        ]);
    }

    /**
     * Tạo lịch làm việc hàng loạt
     */
    public function bulkCreate(Request $request)
    {
        $validated = $request->validate([
            'user_ids' => 'required|array',
            'user_ids.*' => 'required|exists:users,id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i|after:start_time',
            'type' => 'required|in:work,leave,holiday,overtime',
            'project_id' => 'nullable|exists:projects,id',
            'notes' => 'nullable|string',
            'skip_weekends' => 'nullable|boolean',
        ]);

        try {
            DB::beginTransaction();

            $startDate = Carbon::parse($validated['start_date']);
            $endDate = Carbon::parse($validated['end_date']);
            $skipWeekends = $validated['skip_weekends'] ?? false;

            $createdCount = 0;
            $dates = [];

            // Generate date range
            $currentDate = $startDate->copy();
            while ($currentDate->lte($endDate)) {
                // Skip weekends if requested
                if ($skipWeekends && ($currentDate->isSaturday() || $currentDate->isSunday())) {
                    $currentDate->addDay();
                    continue;
                }

                $dates[] = $currentDate->copy();
                $currentDate->addDay();
            }

            // Create schedules for each user and date
            foreach ($validated['user_ids'] as $userId) {
                foreach ($dates as $date) {
                    // Check if schedule already exists
                    $exists = WorkSchedule::where('user_id', $userId)
                        ->where('date', $date->format('Y-m-d'))
                        ->where('start_time', $validated['start_time'])
                        ->where('end_time', $validated['end_time'])
                        ->exists();

                    if (!$exists) {
                        WorkSchedule::create([
                            'user_id' => $userId,
                            'project_id' => $validated['project_id'] ?? null,
                            'date' => $date->format('Y-m-d'),
                            'start_time' => $validated['start_time'],
                            'end_time' => $validated['end_time'],
                            'type' => $validated['type'],
                            'notes' => $validated['notes'] ?? null,
                        ]);
                        $createdCount++;
                    }
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Đã tạo {$createdCount} lịch làm việc.",
                'data' => [
                    'created_count' => $createdCount,
                    'users_count' => count($validated['user_ids']),
                    'dates_count' => count($dates),
                ]
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
}
