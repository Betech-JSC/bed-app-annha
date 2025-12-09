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
}
