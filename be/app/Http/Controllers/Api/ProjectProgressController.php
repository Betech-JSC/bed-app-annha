<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectProgress;
use App\Models\ProjectTask;
use App\Services\TaskProgressService;
use App\Constants\Permissions;
use Illuminate\Http\Request;

class ProjectProgressController extends Controller
{
    use ApiAuthorization;
    /**
     * Xem tiến độ dự án
     */
    public function show(string $projectId)
    {
        $this->apiRequire(auth()->user(), Permissions::PROGRESS_VIEW, $projectId);

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
                $query->select(['id', 'acceptance_stage_id', 'task_id', 'name', 'acceptance_status', 'workflow_status', 'order'])
                    ->orderBy('order');
            }])
            ->orderBy('order')
            ->get();

        // Optimized acceptance statistics using database queries instead of PHP collections
        $acceptanceStats = [
            'total_stages' => $project->acceptanceStages()->count(),
            'fully_approved_stages' => $project->acceptanceStages()->where('status', 'owner_approved')->count(),
            'total_items' => \App\Models\AcceptanceItem::whereIn('acceptance_stage_id', 
                $project->acceptanceStages()->pluck('id')
            )->count(),
            'approved_items' => \App\Models\AcceptanceItem::whereIn('acceptance_stage_id', 
                $project->acceptanceStages()->pluck('id')
            )->where('acceptance_status', 'approved')->count(),
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
        $this->apiRequire(auth()->user(), Permissions::PROGRESS_VIEW, $projectId);

        $project = Project::findOrFail($projectId);

        // Get only necessary columns for the tree structure to reduce memory and payload size
        $tasks = ProjectTask::where('project_id', $projectId)
            ->select([
                'id', 'uuid', 'project_id', 'parent_id', 'name', 
                'start_date', 'end_date', 'duration', 
                'progress_percentage', 'status', 'priority', 'assigned_to', 'order'
            ])
            ->with([
                'assignedUser:id,name',
            ])
            ->orderBy('order')
            ->get();

        // Build hierarchical structure
        // Group tasks by parent_id for O(1) lookups in the recursive tree building
        $tasksGrouped = $tasks->groupBy('parent_id');
        
        $buildTree = function ($parentId = null) use ($tasksGrouped, &$buildTree) {
            $currentTasks = $tasksGrouped->get($parentId, collect());
            
            return $currentTasks->map(function ($task) use ($buildTree, $tasksGrouped) {
                return [
                    'id' => $task->id,
                    'uuid' => $task->uuid,
                    'name' => $task->name,
                    'start_date' => $task->start_date?->toDateString(),
                    'end_date' => $task->end_date?->toDateString(),
                    'duration' => $task->duration,
                    'progress_percentage' => (float) ($task->progress_percentage ?? 0),
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'assigned_user' => $task->assignedUser ? [
                        'id' => $task->assignedUser->id,
                        'name' => $task->assignedUser->name,
                    ] : null,
                    'parent_id' => $task->parent_id,
                    'has_children' => $tasksGrouped->has($task->id),
                    'children' => $buildTree($task->id),
                ];
            })->values();
        };

        $taskTree = $buildTree();

        // Calculate overall progress from root tasks (using the already fetched collection)
        $rootTasks = $tasksGrouped->get(null, collect());
        $overallProgress = 0;
        if ($rootTasks->isNotEmpty()) {
            $overallProgress = round($rootTasks->avg('progress_percentage') ?? 0, 2);
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
