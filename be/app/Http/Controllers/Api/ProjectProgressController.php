<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectProgress;
use App\Models\ProjectTask;
use App\Services\TaskProgressService;

class ProjectProgressController extends Controller
{
    /**
     * Xem tiến độ dự án
     */
    public function show(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $progress = $project->progress;

        if (!$progress) {
            // Create default progress if not exists
            $progress = $project->progress()->create([
                'overall_percentage' => 0,
                'calculated_from' => 'manual',
            ]);
        }

        // Tự động tính lại tiến độ từ nghiệm thu (ưu tiên)
        // Hoặc từ các nguồn khác nếu không có nghiệm thu
        $progress->calculateOverall();

        // Get additional data for charts
        $logs = $project->constructionLogs()
            ->select('log_date', 'completion_percentage')
            ->orderBy('log_date')
            ->get();

        $subcontractors = $project->subcontractors()
            ->select('name', 'progress_status', 'total_quote')
            ->get();

        // Thông tin nghiệm thu
        $acceptanceStages = $project->acceptanceStages()
            ->with(['items' => function ($query) {
                $query->orderBy('order');
            }])
            ->orderBy('order')
            ->get();

        $acceptanceStats = [
            'total_stages' => $acceptanceStages->count(),
            'fully_approved_stages' => $acceptanceStages->where('status', 'owner_approved')->count(),
            'total_items' => $acceptanceStages->sum(function ($stage) {
                return $stage->items->count();
            }),
            'approved_items' => $acceptanceStages->sum(function ($stage) {
                return $stage->items->where('acceptance_status', 'approved')->count();
            }),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'progress' => $progress->fresh(), // Refresh để lấy giá trị mới nhất
                'logs' => $logs,
                'subcontractors' => $subcontractors,
                'acceptance_stages' => $acceptanceStages,
                'acceptance_stats' => $acceptanceStats,
            ]
        ]);
    }

    /**
     * Progress Overview - Hierarchical task structure for dashboard
     * 
     * Returns all tasks with hierarchy, status, progress, and priority
     * READ-ONLY view - no editing allowed
     */
    public function overview(string $projectId)
    {
        $project = Project::findOrFail($projectId);

        // Get all tasks with relationships
        $tasks = ProjectTask::where('project_id', $projectId)
            ->whereNull('deleted_at')
            ->with([
                'parent:id,name,parent_id',
                'children:id,name,parent_id,progress_percentage,status,priority,start_date,end_date',
                'phase:id,name',
                'assignedUser:id,name',
            ])
            ->orderBy('order')
            ->get();

        // Build hierarchical structure
        $rootTasks = $tasks->whereNull('parent_id');
        
        $buildTree = function ($parentId = null) use ($tasks, &$buildTree) {
            return $tasks->where('parent_id', $parentId)->map(function ($task) use ($buildTree) {
                return [
                    'id' => $task->id,
                    'uuid' => $task->uuid,
                    'name' => $task->name,
                    'description' => $task->description,
                    'start_date' => $task->start_date?->toDateString(),
                    'end_date' => $task->end_date?->toDateString(),
                    'duration' => $task->duration,
                    'progress_percentage' => (float) ($task->progress_percentage ?? 0),
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'parent_task' => $task->parent ? [
                        'id' => $task->parent->id,
                        'name' => $task->parent->name,
                    ] : null, // Parent task acts as "phase"
                    'assigned_user' => $task->assignedUser ? [
                        'id' => $task->assignedUser->id,
                        'name' => $task->assignedUser->name,
                    ] : null,
                    'parent_id' => $task->parent_id,
                    'has_children' => $tasks->where('parent_id', $task->id)->count() > 0,
                    'children' => $buildTree($task->id),
                ];
            })->values();
        };

        $taskTree = $buildTree();

        // Calculate overall progress from root tasks
        $overallProgress = 0;
        if ($rootTasks->isNotEmpty()) {
            $totalProgress = 0;
            $count = 0;
            foreach ($rootTasks as $task) {
                $totalProgress += (float) ($task->progress_percentage ?? 0);
                $count++;
            }
            $overallProgress = $count > 0 ? round($totalProgress / $count, 2) : 0;
        }

        // Statistics
        $stats = [
            'total_tasks' => $tasks->count(),
            'tasks_by_status' => [
                'not_started' => $tasks->where('status', 'not_started')->count(),
                'in_progress' => $tasks->where('status', 'in_progress')->count(),
                'delayed' => $tasks->where('status', 'delayed')->count(),
                'completed' => $tasks->where('status', 'completed')->count(),
            ],
            'tasks_by_priority' => [
                'low' => $tasks->where('priority', 'low')->count(),
                'medium' => $tasks->where('priority', 'medium')->count(),
                'high' => $tasks->where('priority', 'high')->count(),
                'urgent' => $tasks->where('priority', 'urgent')->count(),
            ],
            'high_priority_count' => $tasks->whereIn('priority', ['high', 'urgent'])->count(),
            'delayed_count' => $tasks->where('status', 'delayed')->count(),
        ];

        return response()->json([
            'success' => true,
            'data' => [
                'project' => [
                    'id' => $project->id,
                    'name' => $project->name,
                    'code' => $project->code,
                ],
                'overall_progress' => $overallProgress,
                'tasks' => $taskTree,
                'statistics' => $stats,
            ]
        ]);
    }
}
