<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TimeTracking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $user = auth()->user();

        $validated = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'check_in_location' => 'nullable|string|max:255',
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

            $timeTracking = TimeTracking::create([
                'user_id' => $user->id,
                'project_id' => $validated['project_id'] ?? null,
                'check_in_at' => now(),
                'check_in_location' => $validated['check_in_location'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'status' => 'pending',
            ]);

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
        $user = auth()->user();

        $validated = $request->validate([
            'check_out_location' => 'nullable|string|max:255',
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
            if ($validated['notes'] ?? null) {
                $timeTracking->notes = ($timeTracking->notes ? $timeTracking->notes . "\n" : '') . $validated['notes'];
            }
            $timeTracking->calculateHours();
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
        $user = auth()->user();
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
        $user = auth()->user();
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
        $user = auth()->user();

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
}
