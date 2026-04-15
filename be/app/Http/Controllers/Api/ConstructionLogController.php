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
    protected $logService;

    public function __construct(AuthorizationService $authService, \App\Services\ConstructionLogService $logService)
    {
        $this->authService = $authService;
        $this->logService = $logService;
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

        $logs = $this->logService->getLogs($project, $request->only(['start_date', 'end_date']));

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

        try {
            $log = $this->logService->upsert([
                'project_id' => $project->id,
                ...$validated,
            ], null, $user);

            return response()->json([
                'success' => true,
                'message' => 'Nhật ký công trình đã được tạo.',
                'data' => $log
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể tạo nhật ký: ' . $e->getMessage(),
            ], 422);
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
            $log = $this->logService->upsert([
                'project_id' => $project->id,
                ...$validated,
            ], $log, $user);

            return response()->json([
                'success' => true,
                'message' => 'Nhật ký công trình đã được cập nhật.',
                'data' => $log
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Không thể cập nhật nhật ký: ' . $e->getMessage(),
            ], 422);
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
            $this->logService->delete($log);

            return response()->json([
                'success' => true,
                'message' => 'Nhật ký công trình đã được xóa.'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra khi xóa nhật ký: ' . $e->getMessage(),
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

        $reportData = $this->logService->getDailyReport($project, $date);

        return response()->json([
            'success' => true,
            'data' => $reportData,
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

        try {
            $this->logService->approve($log, $validated, $user);

            return response()->json([
                'success' => true,
                'message' => $validated['status'] === 'approved'
                    ? 'Đã duyệt nhật ký công trường'
                    : 'Đã từ chối nhật ký công trường',
                'data' => $log->fresh(['creator', 'task', 'attachments']),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
            ], 422);
        }
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

        $comparisonData = $this->logService->getProgressComparison($project);

        return response()->json([
            'success' => true,
            'data' => $comparisonData,
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

        try {
            $adjustment = $this->logService->requestAdjustment($log, $validated, $user);

            return response()->json([
                'success' => true,
                'message' => 'Đã tạo đề xuất hiệu chỉnh tiến độ',
                'data'    => $adjustment->load(['task', 'creator']),
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Có lỗi xảy ra: ' . $e->getMessage(),
            ], 422);
        }
    }
}
