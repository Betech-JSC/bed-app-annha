<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TeamCheckIn;
use App\Models\TimeTracking;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TeamCheckInController extends Controller
{
    /**
     * Danh sách chấm công tập thể
     */
    public function index(Request $request)
    {
        $query = TeamCheckIn::with(['teamLeader', 'project', 'timeTrackings.user']);

        // Filter by team leader
        if ($request->has('team_leader_id')) {
            $query->where('team_leader_id', $request->team_leader_id);
        }

        // Filter by project
        if ($request->has('project_id')) {
            $query->where('project_id', $request->project_id);
        }

        // Filter by date
        if ($request->has('work_date')) {
            $query->where('work_date', $request->work_date);
        }

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $teamCheckIns = $query->orderByDesc('work_date')->paginate(20);

        return response()->json([
            'success' => true,
            'data' => $teamCheckIns
        ]);
    }

    /**
     * Tạo chấm công tập thể
     */
    public function store(Request $request)
    {
        $user = auth()->user();

        $validated = $request->validate([
            'project_id' => 'nullable|exists:projects,id',
            'work_date' => 'required|date',
            'shift' => 'nullable|string|max:50',
            'team_name' => 'nullable|string|max:255',
            'user_ids' => 'required|array|min:1',
            'user_ids.*' => 'exists:users,id',
            'check_in_times' => 'nullable|array',
            'check_in_times.*' => 'date',
            'notes' => 'nullable|string',
            'is_offline' => 'nullable|boolean',
        ]);

        try {
            DB::beginTransaction();

            $teamCheckIn = TeamCheckIn::create([
                'team_leader_id' => $user->id,
                'project_id' => $validated['project_id'] ?? null,
                'work_date' => $validated['work_date'],
                'shift' => $validated['shift'] ?? null,
                'team_name' => $validated['team_name'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'is_offline' => $validated['is_offline'] ?? false,
                'status' => 'pending',
            ]);

            // Tạo time tracking cho từng nhân viên
            foreach ($validated['user_ids'] as $index => $userId) {
                $checkInTime = $validated['check_in_times'][$userId] ?? now();
                
                TimeTracking::create([
                    'user_id' => $userId,
                    'project_id' => $teamCheckIn->project_id,
                    'team_check_in_id' => $teamCheckIn->id,
                    'check_in_at' => Carbon::parse($checkInTime),
                    'work_date' => $teamCheckIn->work_date,
                    'shift' => $teamCheckIn->shift,
                    'check_in_method' => 'manual',
                    'is_offline' => $teamCheckIn->is_offline,
                    'status' => 'pending',
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo chấm công tập thể thành công',
                'data' => $teamCheckIn->load(['teamLeader', 'project', 'timeTrackings.user'])
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Chi tiết chấm công tập thể
     */
    public function show($id)
    {
        $teamCheckIn = TeamCheckIn::with(['teamLeader', 'project', 'timeTrackings.user', 'approver'])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => $teamCheckIn
        ]);
    }

    /**
     * Duyệt chấm công tập thể
     */
    public function approve(Request $request, $id)
    {
        $user = auth()->user();
        $teamCheckIn = TeamCheckIn::findOrFail($id);

        try {
            DB::beginTransaction();

            $teamCheckIn->approve($user);
            
            // Auto approve all time trackings
            foreach ($teamCheckIn->timeTrackings as $tracking) {
                $tracking->approve($user);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Đã duyệt chấm công tập thể',
                'data' => $teamCheckIn->load(['teamLeader', 'project', 'timeTrackings.user'])
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Đồng bộ chấm công offline
     */
    public function sync(Request $request, $id)
    {
        $teamCheckIn = TeamCheckIn::findOrFail($id);

        if (!$teamCheckIn->is_offline) {
            return response()->json([
                'success' => false,
                'message' => 'Chấm công này không phải offline'
            ], 400);
        }

        $teamCheckIn->sync();

        return response()->json([
            'success' => true,
            'message' => 'Đã đồng bộ chấm công',
            'data' => $teamCheckIn
        ]);
    }
}
