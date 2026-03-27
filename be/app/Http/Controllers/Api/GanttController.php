<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ScheduleAdjustment;
use App\Services\GanttService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class GanttController extends Controller
{
    protected GanttService $ganttService;

    public function __construct(GanttService $ganttService)
    {
        $this->ganttService = $ganttService;
    }

    /**
     * Lấy dữ liệu Gantt chart cho project
     */
    public function ganttData(string $projectId)
    {
        $data = $this->ganttService->getGanttData((int) $projectId);

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }

    /**
     * Tính CPM cho project
     */
    public function cpm(string $projectId)
    {
        $data = $this->ganttService->calculateCPM((int) $projectId);

        return response()->json([
            'success' => true,
            'data'    => $data,
        ]);
    }

    /**
     * Auto-adjust dates khi thay đổi duration/start
     */
    public function autoAdjust(Request $request, string $projectId)
    {
        $validator = Validator::make($request->all(), [
            'task_id'      => 'required|exists:project_tasks,id',
            'new_duration' => 'nullable|integer|min:1',
            'new_start'    => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $result = $this->ganttService->autoAdjustDates(
            (int) $projectId,
            $request->task_id,
            $request->new_duration,
            $request->new_start
        );

        return response()->json([
            'success' => true,
            'message' => "Đã điều chỉnh {$result['total_affected']} công việc",
            'data'    => $result,
        ]);
    }

    /**
     * Kiểm tra chậm tiến độ
     */
    public function delayWarnings(string $projectId)
    {
        $warnings = $this->ganttService->checkScheduleDelays((int) $projectId);

        return response()->json([
            'success' => true,
            'data'    => [
                'warnings'     => $warnings,
                'total_delays' => count($warnings),
                'critical'     => collect($warnings)->where('priority', 'high')->count(),
            ],
        ]);
    }

    /**
     * So sánh tiến độ kế hoạch vs thực tế
     */
    public function progressComparison(string $projectId)
    {
        $ganttData = $this->ganttService->getGanttData((int) $projectId);
        $comparison = [];

        foreach ($ganttData['tasks'] as $task) {
            $comparison[] = [
                'id'                => $task['id'],
                'name'              => $task['name'],
                'planned_progress'  => $task['expected_progress'],
                'actual_progress'   => $task['progress'],
                'gap'               => round($task['expected_progress'] - $task['progress'], 2),
                'delay_days'        => $task['delay_days'],
                'delay_status'      => $task['delay_status'],
                'start_date'        => $task['start_date'],
                'end_date'          => $task['end_date'],
            ];
        }

        return response()->json([
            'success' => true,
            'data'    => [
                'comparison' => $comparison,
                'stats'      => $ganttData['project_stats'],
            ],
        ]);
    }

    // ==================================================================
    // SCHEDULE ADJUSTMENTS
    // ==================================================================

    /**
     * Danh sách đề xuất hiệu chỉnh
     */
    public function adjustments(string $projectId)
    {
        $adjustments = ScheduleAdjustment::where('project_id', $projectId)
            ->with(['task', 'creator', 'approver'])
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json([
            'success' => true,
            'data'    => $adjustments,
        ]);
    }

    /**
     * Tạo đề xuất hiệu chỉnh tiến độ
     */
    public function createAdjustment(Request $request, string $projectId)
    {
        $validator = Validator::make($request->all(), [
            'task_id'        => 'required|exists:project_tasks,id',
            'proposed_start' => 'nullable|date',
            'proposed_end'   => 'nullable|date',
            'reason'         => 'required|string|max:1000',
            'impact_analysis' => 'nullable|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $task = \App\Models\ProjectTask::findOrFail($request->task_id);

        $adjustment = ScheduleAdjustment::create([
            'project_id'      => $projectId,
            'task_id'         => $request->task_id,
            'type'            => 'adjustment_proposal',
            'original_start'  => $task->start_date,
            'original_end'    => $task->end_date,
            'proposed_start'  => $request->proposed_start,
            'proposed_end'    => $request->proposed_end,
            'delay_days'      => $request->proposed_end && $task->end_date
                ? \Carbon\Carbon::parse($request->proposed_end)->diffInDays($task->end_date, false)
                : 0,
            'reason'          => $request->reason,
            'impact_analysis' => $request->impact_analysis,
            'priority'        => $task->children()->exists() ? 'high' : 'medium',
            'created_by'      => Auth::id(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo đề xuất hiệu chỉnh',
            'data'    => $adjustment->load(['task', 'creator']),
        ], 201);
    }

    /**
     * Duyệt đề xuất hiệu chỉnh
     */
    public function approveAdjustment(string $projectId, string $adjustmentId)
    {
        $adjustment = ScheduleAdjustment::where('project_id', $projectId)
            ->findOrFail($adjustmentId);

        if ($adjustment->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Đề xuất này đã được xử lý',
            ], 400);
        }

        $user = Auth::user();
        $adjustment->approve($user, request('notes'));

        // Auto-adjust dependents after approval
        if ($adjustment->proposed_end) {
            $this->ganttService->autoAdjustDates(
                (int) $projectId,
                $adjustment->task_id,
                null,
                $adjustment->proposed_start?->format('Y-m-d')
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Đã duyệt hiệu chỉnh tiến độ',
            'data'    => $adjustment->fresh(['task', 'creator', 'approver']),
        ]);
    }

    /**
     * Từ chối đề xuất hiệu chỉnh
     */
    public function rejectAdjustment(Request $request, string $projectId, string $adjustmentId)
    {
        $adjustment = ScheduleAdjustment::where('project_id', $projectId)
            ->findOrFail($adjustmentId);

        if ($adjustment->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Đề xuất này đã được xử lý',
            ], 400);
        }

        $adjustment->reject(Auth::user(), $request->notes);

        return response()->json([
            'success' => true,
            'message' => 'Đã từ chối hiệu chỉnh',
            'data'    => $adjustment->fresh(['task', 'creator', 'approver']),
        ]);
    }
}
