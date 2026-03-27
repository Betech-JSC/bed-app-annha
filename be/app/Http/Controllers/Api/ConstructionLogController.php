<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ConstructionLog;
use App\Models\DailyReportApproval;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\ScheduleAdjustment;
use App\Models\Attachment;
use App\Services\TaskProgressService;
use App\Services\GanttService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

use App\Constants\Permissions;
use App\Services\AuthorizationService;

class ConstructionLogController extends Controller
{
    protected $authService;

    public function __construct(AuthorizationService $authService)
    {
        $this->authService = $authService;
    }
    /**
     * Danh sách nhật ký công trình
     */
    public function index(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, Permissions::LOG_VIEW, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xem nhật ký dự án này.'
            ], 403);
        }

        $query = $project->constructionLogs()
            ->with(['creator', 'attachments', 'task'])
            ->orderByDesc('log_date');

        // Filter by date range
        if ($request->has('start_date')) {
            $query->where('log_date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('log_date', '<=', $request->end_date);
        }

        $logs = $query->paginate(30);

        return response()->json([
            'success' => true,
            'data' => $logs
        ]);
    }

    /**
     * Tạo nhật ký công trình
     */
    public function store(Request $request, string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, Permissions::LOG_CREATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền tạo nhật ký cho dự án này.'
            ], 403);
        }

        $validated = $request->validate([
            'log_date' => 'required|date',
            'task_id' => 'nullable|exists:project_tasks,id',
            'weather' => 'nullable|string|max:100',
            'personnel_count' => 'nullable|integer|min:0',
            'completion_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:2000',
            'shift' => 'nullable|in:morning,afternoon,night',
            'work_items' => 'nullable|array',
            'work_items.*.name' => 'required|string',
            'work_items.*.quantity' => 'nullable|numeric',
            'work_items.*.unit' => 'nullable|string',
            'work_items.*.progress' => 'nullable|numeric|min:0|max:100',
            'issues' => 'nullable|string|max:2000',
            'safety_notes' => 'nullable|string|max:2000',
            'delay_reason' => 'nullable|string|max:1000',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
        ]);

        // BUSINESS RULE: Only child tasks (leaf tasks without children) can receive progress input
        // Parent tasks (A) progress is auto-calculated from children
        if (isset($validated['task_id'])) {
            $task = \App\Models\ProjectTask::where('project_id', $project->id)
                ->find($validated['task_id']);
            if (!$task) {
                return response()->json([
                    'success' => false,
                    'message' => 'Công việc không thuộc dự án này.',
                ], 422);
            }

            // Check if task has children (is a parent task)
            $hasChildren = \App\Models\ProjectTask::where('parent_id', $task->id)
                ->whereNull('deleted_at')
                ->exists();

            if ($hasChildren) {
                return response()->json([
                    'success' => false,
                    'message' => 'Chỉ có thể ghi nhật ký cho công việc con (công việc không có công việc con). Tiến độ công việc cha được tự động tính từ các công việc con.',
                ], 422);
            }
        }

        // BUSINESS RULE: completion_percentage can only increase
        // Get last recorded percentage for this task
        if (isset($validated['task_id']) && isset($validated['completion_percentage'])) {
            $lastLog = ConstructionLog::where('task_id', $validated['task_id'])
                ->whereNotNull('completion_percentage')
                ->orderBy('log_date', 'desc')
                ->orderBy('created_at', 'desc')
                ->first();

            if ($lastLog && $validated['completion_percentage'] < $lastLog->completion_percentage) {
                return response()->json([
                    'success' => false,
                    'message' => "Phần trăm hoàn thành chỉ có thể tăng. Giá trị tối thiểu: {$lastLog->completion_percentage}%",
                ], 422);
            }
        }

        try {
            DB::beginTransaction();

            // Removed unique log_date check per project to allow multiple logs per day

            $log = ConstructionLog::create([
                'project_id' => $project->id,
                'task_id' => $validated['task_id'] ?? null,
                'created_by' => $user->id,
                'log_date' => $validated['log_date'],
                'weather' => $validated['weather'] ?? null,
                'personnel_count' => $validated['personnel_count'] ?? null,
                'completion_percentage' => $validated['completion_percentage'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'shift' => $validated['shift'] ?? null,
                'work_items' => $validated['work_items'] ?? null,
                'issues' => $validated['issues'] ?? null,
                'safety_notes' => $validated['safety_notes'] ?? null,
                'delay_reason' => $validated['delay_reason'] ?? null,
            ]);

            // Attach files if provided
            if (isset($validated['attachment_ids']) && is_array($validated['attachment_ids'])) {
                foreach ($validated['attachment_ids'] as $attachmentId) {
                    $attachment = Attachment::find($attachmentId);
                    if ($attachment) {
                        $attachment->update([
                            'attachable_id' => $log->id,
                            'attachable_type' => ConstructionLog::class,
                        ]);
                    }
                }
            }

            // BUSINESS RULE: Progress percentage is ONLY calculated from Daily Logs
            // Use TaskProgressService to recalculate task progress and status automatically
            if (isset($validated['task_id']) && isset($validated['completion_percentage'])) {
                $task = \App\Models\ProjectTask::find($validated['task_id']);
                if ($task) {
                    $service = app(TaskProgressService::class);
                    $service->updateTaskFromLogs($task, true); // Update parent if exists
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Nhật ký công trình đã được tạo.',
                'data' => $log->load(['creator', 'attachments', 'task'])
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
     * Cập nhật nhật ký công trình
     */
    public function update(Request $request, string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $log = ConstructionLog::where('project_id', $project->id)->findOrFail($id);
        $user = auth()->user();

        // Chỉ cho phép người tạo hoặc project manager cập nhật (hoặc người có quyền LOG_UPDATE cho project này)
        if ($log->created_by !== $user->id && !$this->authService->can($user, Permissions::LOG_UPDATE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền cập nhật nhật ký này.'
            ], 403);
        }

        $validated = $request->validate([
            // BUSINESS RULE: log_date is NOT editable (always today for new logs)
            // 'log_date' => REMOVED - not editable
            'task_id' => 'nullable|exists:project_tasks,id',
            'weather' => 'nullable|string|max:100',
            'personnel_count' => 'nullable|integer|min:0',
            'completion_percentage' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:2000',
            'attachment_ids' => 'nullable|array',
            'attachment_ids.*' => 'exists:attachments,id',
        ]);

        try {
            DB::beginTransaction();

            // BUSINESS RULE: Only child tasks (leaf tasks without children) can receive progress input
            if (isset($validated['task_id'])) {
                $task = \App\Models\ProjectTask::where('project_id', $project->id)
                    ->find($validated['task_id']);
                if (!$task) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Công việc không thuộc dự án này.'
                    ], 422);
                }

                // Check if task has children (is a parent task)
                $hasChildren = \App\Models\ProjectTask::where('parent_id', $task->id)
                    ->whereNull('deleted_at')
                    ->exists();

                if ($hasChildren) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Chỉ có thể ghi nhật ký cho công việc con (công việc không có công việc con). Tiến độ công việc cha được tự động tính từ các công việc con.',
                    ], 422);
                }
            }

            // BUSINESS RULE: completion_percentage can only increase
            // Get last recorded percentage for this task (excluding current log)
            if (isset($validated['completion_percentage'])) {
                $taskId = $validated['task_id'] ?? $log->task_id;
                if ($taskId) {
                    $lastLog = ConstructionLog::where('task_id', $taskId)
                        ->where('id', '!=', $log->id)
                        ->whereNotNull('completion_percentage')
                        ->orderBy('log_date', 'desc')
                        ->orderBy('created_at', 'desc')
                        ->first();

                    // Use current log's percentage as minimum if no other logs exist
                    $minPercentage = $lastLog
                        ? $lastLog->completion_percentage
                        : ($log->completion_percentage ?? 0);

                    if ($validated['completion_percentage'] < $minPercentage) {
                        return response()->json([
                            'success' => false,
                            'message' => "Phần trăm hoàn thành chỉ có thể tăng. Giá trị tối thiểu: {$minPercentage}%",
                        ], 422);
                    }
                }
            }

            $log->update($validated);

            // Update attachments if provided
            if (isset($validated['attachment_ids'])) {
                // Detach existing attachments
                $log->attachments()->update([
                    'attachable_id' => null,
                    'attachable_type' => null,
                ]);

                // Attach new files
                foreach ($validated['attachment_ids'] as $attachmentId) {
                    $attachment = Attachment::find($attachmentId);
                    if ($attachment) {
                        $attachment->update([
                            'attachable_id' => $log->id,
                            'attachable_type' => ConstructionLog::class,
                        ]);
                    }
                }
            }

            // BUSINESS RULE: Progress percentage is ONLY calculated from Daily Logs
            // Recalculate task progress when log is updated
            $taskId = $validated['task_id'] ?? $log->task_id;
            if ($taskId) {
                $task = \App\Models\ProjectTask::find($taskId);
                if ($task) {
                    $service = app(TaskProgressService::class);
                    $service->updateTaskFromLogs($task, true); // Update parent if exists
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Nhật ký công trình đã được cập nhật.',
                'data' => $log->load(['creator', 'attachments', 'task'])
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
     * Xóa nhật ký công trình
     */
    public function destroy(string $projectId, string $id)
    {
        $project = Project::findOrFail($projectId);
        $log = ConstructionLog::where('project_id', $project->id)->findOrFail($id);
        $user = auth()->user();

        // Chỉ cho phép người tạo hoặc project manager xóa (hoặc người có quyền LOG_DELETE cho project này)
        if ($log->created_by !== $user->id && !$this->authService->can($user, Permissions::LOG_DELETE, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Bạn không có quyền xóa nhật ký này.'
            ], 403);
        }

        try {
            DB::beginTransaction();

            // Delete attachments
            foreach ($log->attachments as $attachment) {
                // Delete file from storage
                if ($attachment->file_path && Storage::disk('public')->exists($attachment->file_path)) {
                    Storage::disk('public')->delete($attachment->file_path);
                }
                $attachment->delete();
            }

            // Store task_id before deletion for recalculation
            $taskId = $log->task_id;

            // Delete log
            $log->delete();

            // Recalculate task progress after log deletion
            if ($taskId) {
                $task = \App\Models\ProjectTask::find($taskId);
                if ($task) {
                    $service = app(TaskProgressService::class);
                    $service->updateTaskFromLogs($task, true); // Update parent if exists
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Nhật ký công trình đã được xóa.'
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi xóa nhật ký.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // ==================================================================
    // ENHANCED METHODS (Sprint 1 — Module 2)
    // ==================================================================

    /**
     * Báo cáo ngày tổng hợp
     * Aggregates all logs for a specific date with task progress comparison
     */
    public function dailyReport(string $projectId, Request $request)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::LOG_VIEW, $project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền'], 403);
        }

        $date = $request->get('date', now()->format('Y-m-d'));

        $logs = ConstructionLog::where('project_id', $projectId)
            ->where('log_date', $date)
            ->with(['creator', 'task', 'attachments'])
            ->orderBy('shift')
            ->get();

        // Aggregate stats
        $totalPersonnel = $logs->sum('personnel_count');
        $tasksWorked = $logs->pluck('task_id')->filter()->unique()->count();
        $avgCompletion = $logs->whereNotNull('completion_percentage')->avg('completion_percentage');
        $issues = $logs->pluck('issues')->filter()->values();
        $delayReasons = $logs->pluck('delay_reason')->filter()->values();

        // Weather summary
        $weatherSummary = $logs->pluck('weather')->filter()->unique()->implode(', ');

        return response()->json([
            'success' => true,
            'data' => [
                'date'             => $date,
                'logs'             => $logs,
                'summary'          => [
                    'total_logs'       => $logs->count(),
                    'total_personnel'  => $totalPersonnel,
                    'tasks_worked'     => $tasksWorked,
                    'avg_completion'   => round($avgCompletion, 2),
                    'weather'          => $weatherSummary,
                    'has_issues'       => $issues->isNotEmpty(),
                    'issue_count'      => $issues->count(),
                    'has_delays'       => $delayReasons->isNotEmpty(),
                ],
                'issues'       => $issues,
                'delay_reasons' => $delayReasons,
            ],
        ]);
    }

    /**
     * Phê duyệt nhật ký công trường
     */
    public function approveLog(Request $request, string $projectId, string $logId)
    {
        $project = Project::findOrFail($projectId);
        $log = ConstructionLog::where('project_id', $projectId)->findOrFail($logId);
        $user = auth()->user();

        // Check permission
        if (!$this->authService->can($user, Permissions::LOG_UPDATE, $project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền duyệt'], 403);
        }

        $validated = $request->validate([
            'status' => 'required|in:approved,rejected',
            'notes'  => 'nullable|string|max:500',
        ]);

        // Create or update approval
        $approval = DailyReportApproval::updateOrCreate(
            [
                'construction_log_id' => $log->id,
                'approver_id'         => $user->id,
            ],
            [
                'status'      => $validated['status'],
                'notes'       => $validated['notes'] ?? null,
                'approved_at' => $validated['status'] === 'approved' ? now() : null,
            ]
        );

        // Update log approval status
        $log->update([
            'approval_status' => $validated['status'],
            'approved_by'     => $user->id,
            'approved_at'     => $validated['status'] === 'approved' ? now() : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => $validated['status'] === 'approved'
                ? 'Đã duyệt nhật ký công trường'
                : 'Đã từ chối nhật ký công trường',
            'data' => $log->fresh(['creator', 'task', 'attachments']),
        ]);
    }

    /**
     * So sánh tiến độ kế hoạch vs thực tế (linked to Gantt)
     */
    public function progressComparison(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::LOG_VIEW, $project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền'], 403);
        }

        $ganttService = app(GanttService::class);
        $ganttData = $ganttService->getGanttData((int) $projectId);

        // Build comparison with latest log data per task
        $comparison = [];
        foreach ($ganttData['tasks'] as $task) {
            $latestLog = ConstructionLog::where('task_id', $task['id'])
                ->orderByDesc('log_date')
                ->first();

            $comparison[] = [
                'task_id'           => $task['id'],
                'task_name'         => $task['name'],
                'planned_start'     => $task['start_date'],
                'planned_end'       => $task['end_date'],
                'planned_progress'  => round($task['expected_progress'], 1),
                'actual_progress'   => round($task['progress'], 1),
                'gap'               => round($task['expected_progress'] - $task['progress'], 1),
                'delay_days'        => $task['delay_days'],
                'delay_status'      => $task['delay_status'],
                'is_critical'       => $task['is_critical'],
                'last_log_date'     => $latestLog?->log_date?->format('Y-m-d'),
                'last_log_notes'    => $latestLog?->notes,
                'has_delay_reason'  => !empty($latestLog?->delay_reason),
            ];
        }

        return response()->json([
            'success' => true,
            'data' => [
                'comparison' => $comparison,
                'stats'      => $ganttData['project_stats'],
            ],
        ]);
    }

    /**
     * Đề xuất hiệu chỉnh tiến độ từ nhật ký
     */
    public function requestAdjustment(Request $request, string $projectId, string $logId)
    {
        $project = Project::findOrFail($projectId);
        $log = ConstructionLog::where('project_id', $projectId)->findOrFail($logId);
        $user = auth()->user();

        if (!$this->authService->can($user, Permissions::LOG_CREATE, $project)) {
            return response()->json(['success' => false, 'message' => 'Không có quyền'], 403);
        }

        if (!$log->task_id) {
            return response()->json([
                'success' => false,
                'message' => 'Nhật ký này chưa liên kết với công việc nào',
            ], 422);
        }

        $validated = $request->validate([
            'proposed_end'    => 'required|date|after:today',
            'reason'          => 'required|string|max:1000',
            'impact_analysis' => 'nullable|string|max:2000',
        ]);

        $task = ProjectTask::findOrFail($log->task_id);

        $adjustment = ScheduleAdjustment::create([
            'project_id'      => $projectId,
            'task_id'         => $task->id,
            'type'            => 'adjustment_proposal',
            'original_start'  => $task->start_date,
            'original_end'    => $task->end_date,
            'proposed_start'  => $task->start_date,
            'proposed_end'    => $validated['proposed_end'],
            'delay_days'      => $task->end_date
                ? \Carbon\Carbon::parse($validated['proposed_end'])->diffInDays($task->end_date, false)
                : 0,
            'reason'          => $validated['reason'],
            'impact_analysis' => $validated['impact_analysis'] ?? null,
            'priority'        => $task->children()->exists() ? 'high' : 'medium',
            'created_by'      => $user->id,
        ]);

        // Link adjustment to log
        $log->update(['adjustment_id' => $adjustment->id]);

        return response()->json([
            'success' => true,
            'message' => 'Đã tạo đề xuất hiệu chỉnh tiến độ',
            'data'    => $adjustment->load(['task', 'creator']),
        ], 201);
    }
}
