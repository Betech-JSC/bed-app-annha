<?php

namespace App\Services;

use App\Models\ConstructionLog;
use App\Models\DailyReportApproval;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\ScheduleAdjustment;
use App\Models\Attachment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ConstructionLogService
{
    protected $taskProgressService;

    public function __construct(TaskProgressService $taskProgressService)
    {
        $this->taskProgressService = $taskProgressService;
    }

    /**
     * Create or update a construction log
     */
    public function upsert(array $data, ?ConstructionLog $log = null, $user = null): ConstructionLog
    {
        return DB::transaction(function () use ($data, $log, $user) {
            $isNew = !$log;
            $project = Project::findOrFail($data['project_id']);

            // 1. Validation: Leaf task check
            if (!empty($data['task_id'])) {
                $task = ProjectTask::where('project_id', $project->id)->find($data['task_id']);
                if (!$task) {
                    throw new \Exception('Công việc không thuộc dự án này.');
                }
                if ($task->children()->whereNull('deleted_at')->exists()) {
                    throw new \Exception('Chỉ có thể ghi nhật ký cho công việc con (leaf task). Tiến độ công việc cha được tự động tính.');
                }
            }

            // Prevent duplicate logs for the same date and task
            if ($isNew && !empty($data['log_date'])) {
                $duplicateQuery = ConstructionLog::where('project_id', $project->id)
                    ->where('log_date', $data['log_date']);
                
                if (!empty($data['task_id'])) {
                    $duplicateQuery->where('task_id', $data['task_id']);
                } else {
                    $duplicateQuery->whereNull('task_id');
                }

                if ($duplicateQuery->exists()) {
                    throw new \Exception('Đã tồn tại nhật ký thi công cho ngày này ' . (!empty($data['task_id']) ? 'đối với công việc này.' : 'đối với dự án.'));
                }
            }

            // 2. Validation: Completion percentage must only increase
            if (!empty($data['task_id']) && isset($data['completion_percentage'])) {
                $lastLogQuery = ConstructionLog::where('task_id', $data['task_id'])
                    ->whereNotNull('completion_percentage')
                    ->orderBy('log_date', 'desc')
                    ->orderBy('created_at', 'desc');

                if (!$isNew) {
                    $lastLogQuery->where('id', '!=', $log->id);
                }

                $lastLog = $lastLogQuery->first();
                $minPct = $lastLog ? $lastLog->completion_percentage : 0;

                // Allow SuperAdmin override in CRM (matching legacy logic)
                $isSuperAdmin = ($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin());
                
                if (!$isSuperAdmin && $data['completion_percentage'] < $minPct) {
                    throw new \Exception("Phần trăm hoàn thành chỉ có thể tăng. Giá trị hiện tại là {$minPct}%.");
                }
            }

            // 3. Prepare data
            if ($isNew) {
                $log = new ConstructionLog();
                $log->created_by = $user ? $user->id : null;
                // BUSINESS RULE: Nhật ký không cần phê duyệt — auto-approved khi tạo
                $log->approval_status = 'approved';
                $log->approved_at = now();
                $log->approved_by = $user ? $user->id : null;
            }

            $log->fill($data);
            $log->save();

            // 4. Handle Attachments (Mobile: attachment_ids)
            if (isset($data['attachment_ids']) && is_array($data['attachment_ids'])) {
                Attachment::whereIn('id', $data['attachment_ids'])->update([
                    'attachable_id' => $log->id,
                    'attachable_type' => ConstructionLog::class,
                ]);
            }

            // 5. Handle Attachments (Web: files array)
            if (isset($data['files']) && is_array($data['files'])) {
                foreach ($data['files'] as $file) {
                    $path = $file->store("projects/{$project->id}/logs", 'public');
                    Attachment::create([
                        'original_name' => $file->getClientOriginalName(),
                        'file_name' => basename($path),
                        'file_path' => $path,
                        'file_url' => Storage::disk('public')->url($path),
                        'mime_type' => $file->getClientMimeType(),
                        'file_size' => $file->getSize(),
                        'type' => 'construction_log',
                        'attachable_type' => ConstructionLog::class,
                        'attachable_id' => $log->id,
                        'uploaded_by' => $user->id ?? null,
                    ]);
                }
            }

            // Note: Side effects (Task progress recalculation) are handled by the Model's boot/observers, 
            // but we can explicitly trigger it here if immediate sync feedback is needed.
            if ($log->task_id) {
                $this->taskProgressService->updateTaskFromLogs($log->task, true);
            }

            return $log->fresh(['creator', 'attachments', 'task']);
        });
    }

    /**
     * Approve or reject a construction log
     */
    public function approve(ConstructionLog $log, array $data, $user): bool
    {
        return DB::transaction(function () use ($log, $data, $user) {
            $status = $data['status']; // approved, rejected
            $notes = $data['notes'] ?? null;

            // Update log main record
            $log->update([
                'approval_status' => $status,
                'approved_by'     => $user->id,
                'approved_at'     => $status === 'approved' ? now() : null,
            ]);

            // Create/Update approval detail record
            DailyReportApproval::updateOrCreate(
                [
                    'construction_log_id' => $log->id,
                    'approver_id'         => $user->id,
                ],
                [
                    'status'      => $status,
                    'notes'       => $notes,
                    'approved_at' => $status === 'approved' ? now() : null,
                ]
            );

            // Side effect: If approved, ensure task progress is updated (matching CRM legacy logic)
            if ($status === 'approved' && $log->task_id && $log->completion_percentage) {
                $task = $log->task;
                if ($task && (float)$log->completion_percentage > (float)($task->progress_percentage ?? 0)) {
                    $autoStatus = $this->taskProgressService->calculateStatus($task, (float)$log->completion_percentage);

                    $task->forceFill([
                        'progress_percentage' => $log->completion_percentage,
                        'status' => $autoStatus,
                    ])->saveQuietly();

                    // Hierarchical update
                    if ($task->parent_id) {
                        $this->taskProgressService->updateTaskFromLogs($task->parent, true);
                    }
                }
            }

            return true;
        });
    }

    /**
     * Revert log to draft (pending)
     */
    public function revertToDraft(ConstructionLog $log, $user = null): bool
    {
        if ($log->approval_status === 'approved') {
            // Special rule: only admins can revert approved logs because it affects progress
            $isSuperAdmin = ($user && method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin());
            if (!$isSuperAdmin) {
                throw new \Exception('Chỉ có quản trị viên mới có thể hoàn duyệt nhật ký đã được phê duyệt.');
            }
        }

        return DB::transaction(function () use ($log) {
            $log->update([
                'approval_status' => 'pending',
                'approved_at'     => null,
                'approved_by'     => null,
            ]);

            // Clear approval details
            DailyReportApproval::where('construction_log_id', $log->id)->delete();

            return true;
        });
    }

    /**
     * Delete a construction log
     */
    public function delete(ConstructionLog $log): bool
    {
        return DB::transaction(function () use ($log) {
            // Delete attachments from storage
            foreach ($log->attachments as $att) {
                if ($att->file_path && Storage::disk('public')->exists($att->file_path)) {
                    Storage::disk('public')->delete($att->file_path);
                }
                $att->delete();
            }

            $taskId = $log->task_id;
            $deleted = $log->delete();

            // Recalculate task progress
            if ($taskId) {
                $task = ProjectTask::find($taskId);
                if ($task) {
                    $this->taskProgressService->updateTaskFromLogs($task, true);
                }
            }

            return $deleted;
        });
    }

    /**
     * Request a schedule adjustment from a log
     */
    /**
     * Request a schedule adjustment from a log
     */
    public function requestAdjustment(ConstructionLog $log, array $data, $user): \App\Models\ScheduleAdjustment
    {
        if (!$log->task_id) {
            throw new \Exception('Nhật ký này chưa liên kết với công việc nào.');
        }

        return DB::transaction(function () use ($log, $data, $user) {
            $task = $log->task;

            $adjustment = \App\Models\ScheduleAdjustment::create([
                'project_id'      => $log->project_id,
                'task_id'         => $task->id,
                'type'            => 'adjustment_proposal',
                'original_start'  => $task->start_date,
                'original_end'    => $task->end_date,
                'proposed_start'  => $task->start_date,
                'proposed_end'    => $data['proposed_end'],
                'delay_days'      => $task->end_date
                    ? \Carbon\Carbon::parse($data['proposed_end'])->diffInDays($task->end_date, false)
                    : 0,
                'reason'          => $data['reason'],
                'impact_analysis' => $data['impact_analysis'] ?? null,
                'priority'        => $task->children()->exists() ? 'high' : 'medium',
                'created_by'      => $user->id,
            ]);

            // Link adjustment to log
            $log->update(['adjustment_id' => $adjustment->id]);

            return $adjustment;
        });
    }

    /**
     * Get logs for project with pagination and filters
     */
    public function getLogs(Project $project, array $filters = []): \Illuminate\Contracts\Pagination\LengthAwarePaginator
    {
        $query = $project->constructionLogs()
            ->with(['creator', 'attachments', 'task'])
            ->orderByDesc('log_date')
            ->orderByDesc('created_at');

        if (!empty($filters['start_date'])) {
            $query->where('log_date', '>=', $filters['start_date']);
        }
        if (!empty($filters['end_date'])) {
            $query->where('log_date', '<=', $filters['end_date']);
        }

        $perPage = isset($filters['per_page']) ? min((int) $filters['per_page'], 200) : 30;

        return $query->paginate($perPage);
    }

    /**
     * Get aggregated daily report for a specific date
     */
    public function getDailyReport(Project $project, string $date): array
    {
        $logs = ConstructionLog::where('project_id', $project->id)
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

        return [
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
        ];
    }

    /**
     * Compare planned vs actual progress using Gantt data
     */
    public function getProgressComparison(Project $project): array
    {
        $ganttService = app(\App\Services\GanttService::class);
        $ganttData = $ganttService->getGanttData($project->id);

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
                'planned_progress'  => round($task['expected_progress'] ?? 0, 1),
                'actual_progress'   => round($task['progress'] ?? 0, 1),
                'gap'               => round(($task['expected_progress'] ?? 0) - ($task['progress'] ?? 0), 1),
                'delay_days'        => $task['delay_days'] ?? 0,
                'delay_status'      => $task['delay_status'] ?? 'on_track',
                'is_critical'       => $task['is_critical'] ?? false,
                'last_log_date'     => $latestLog?->log_date?->format('Y-m-d'),
                'last_log_notes'    => $latestLog?->notes,
                'has_delay_reason'  => !empty($latestLog?->delay_reason),
            ];
        }

        return [
            'comparison' => $comparison,
            'stats'      => $ganttData['project_stats'],
        ];
    }
}
