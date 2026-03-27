<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\ProjectTaskDependency;
use App\Models\ScheduleAdjustment;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class GanttService
{
    /**
     * Lấy dữ liệu Gantt chart cho project
     * Format: [{id, name, start, end, progress, parent_id, dependencies, is_critical, status, delay_days}]
     */
    public function getGanttData(int $projectId): array
    {
        $tasks = ProjectTask::where('project_id', $projectId)
            ->with(['dependencies', 'children', 'constructionLogs'])
            ->orderBy('order')
            ->get();

        $dependencies = ProjectTaskDependency::whereIn('task_id', $tasks->pluck('id'))
            ->get();

        $criticalPath = $this->calculateCPM($projectId);
        $criticalTaskIds = collect($criticalPath['critical_tasks'] ?? [])->pluck('id')->toArray();

        $ganttItems = [];
        foreach ($tasks as $task) {
            $expectedProgress = $this->calculateExpectedProgress($task);
            $delayDays = $this->calculateDelayDays($task, $expectedProgress);

            $ganttItems[] = [
                'id'              => $task->id,
                'uuid'            => $task->uuid,
                'name'            => $task->name,
                'start_date'      => $task->start_date?->format('Y-m-d'),
                'end_date'        => $task->end_date?->format('Y-m-d'),
                'duration'        => $task->duration,
                'progress'        => (float) ($task->progress_percentage ?? 0),
                'expected_progress' => $expectedProgress,
                'parent_id'       => $task->parent_id,
                'phase_id'        => $task->phase_id,
                'priority'        => $task->priority,
                'status'          => $task->status,
                'assigned_to'     => $task->assigned_to,
                'is_critical'     => in_array($task->id, $criticalTaskIds),
                'delay_days'      => $delayDays,
                'delay_status'    => $this->getDelayStatus($delayDays),
                'dependencies'    => $dependencies->where('task_id', $task->id)
                    ->map(fn($d) => [
                        'depends_on' => $d->depends_on_task_id,
                        'type'       => $d->dependency_type ?? 'FS',
                        'lag'        => $d->lag_days ?? 0,
                    ])->values()->toArray(),
                'children_count'  => $task->children->count(),
            ];
        }

        return [
            'tasks'          => $ganttItems,
            'critical_path'  => $criticalPath,
            'project_stats'  => $this->getProjectStats($tasks),
        ];
    }

    /**
     * Tính CPM (Critical Path Method)
     * Forward pass → Backward pass → Float → Critical path
     */
    public function calculateCPM(int $projectId): array
    {
        $tasks = ProjectTask::where('project_id', $projectId)
            ->whereNull('parent_id') // Chỉ tính leaf tasks hoặc top-level
            ->orWhere(function ($q) use ($projectId) {
                $q->where('project_id', $projectId)
                    ->whereDoesntHave('children');
            })
            ->with('dependencies')
            ->orderBy('order')
            ->get();

        if ($tasks->isEmpty()) {
            return ['critical_tasks' => [], 'total_duration' => 0, 'paths' => []];
        }

        $taskMap = $tasks->keyBy('id');
        $nodes = [];

        // Khởi tạo nodes
        foreach ($tasks as $task) {
            $duration = $task->duration ?? ($task->start_date && $task->end_date
                ? $task->start_date->diffInDays($task->end_date) + 1
                : 1);

            $nodes[$task->id] = [
                'id'       => $task->id,
                'name'     => $task->name,
                'duration' => $duration,
                'ES'       => 0, // Earliest Start
                'EF'       => 0, // Earliest Finish
                'LS'       => 0, // Latest Start
                'LF'       => 0, // Latest Finish
                'TF'       => 0, // Total Float
                'predecessors' => [],
                'successors'   => [],
            ];
        }

        // Xây dựng dependency graph
        $allDeps = ProjectTaskDependency::whereIn('task_id', $tasks->pluck('id'))->get();
        foreach ($allDeps as $dep) {
            if (isset($nodes[$dep->task_id]) && isset($nodes[$dep->depends_on_task_id])) {
                $nodes[$dep->task_id]['predecessors'][] = $dep->depends_on_task_id;
                $nodes[$dep->depends_on_task_id]['successors'][] = $dep->task_id;
            }
        }

        // Forward Pass (tính ES, EF)
        $sorted = $this->topologicalSort($nodes);
        foreach ($sorted as $nodeId) {
            $node = &$nodes[$nodeId];
            if (empty($node['predecessors'])) {
                $node['ES'] = 0;
            } else {
                $maxEF = 0;
                foreach ($node['predecessors'] as $predId) {
                    $maxEF = max($maxEF, $nodes[$predId]['EF']);
                }
                $node['ES'] = $maxEF;
            }
            $node['EF'] = $node['ES'] + $node['duration'];
        }

        // Tìm tổng duration của project
        $projectDuration = max(array_column($nodes, 'EF'));

        // Backward Pass (tính LS, LF)
        foreach (array_reverse($sorted) as $nodeId) {
            $node = &$nodes[$nodeId];
            if (empty($node['successors'])) {
                $node['LF'] = $projectDuration;
            } else {
                $minLS = PHP_INT_MAX;
                foreach ($node['successors'] as $succId) {
                    $minLS = min($minLS, $nodes[$succId]['LS']);
                }
                $node['LF'] = $minLS;
            }
            $node['LS'] = $node['LF'] - $node['duration'];
            $node['TF'] = $node['LS'] - $node['ES']; // Total Float
        }

        // Xác định critical path (TF = 0)
        $criticalTasks = [];
        foreach ($nodes as &$node) {
            if ($node['TF'] === 0 || $node['TF'] === 0.0) {
                $node['is_critical'] = true;
                $criticalTasks[] = [
                    'id'       => $node['id'],
                    'name'     => $node['name'],
                    'duration' => $node['duration'],
                    'ES'       => $node['ES'],
                    'EF'       => $node['EF'],
                    'LS'       => $node['LS'],
                    'LF'       => $node['LF'],
                ];
            } else {
                $node['is_critical'] = false;
            }
        }

        return [
            'critical_tasks'  => $criticalTasks,
            'total_duration'  => $projectDuration,
            'all_nodes'       => array_values($nodes),
        ];
    }

    /**
     * Điều chỉnh ngày tự động khi thay đổi duration
     * Cascade update tất cả dependent tasks
     */
    public function autoAdjustDates(int $projectId, int $taskId, ?int $newDuration = null, ?string $newStart = null): array
    {
        $task = ProjectTask::where('project_id', $projectId)->findOrFail($taskId);
        $changes = [];

        // Cập nhật task gốc
        if ($newDuration !== null) {
            $oldEnd = $task->end_date;
            $task->duration = $newDuration;
            if ($task->start_date) {
                $task->end_date = $task->start_date->copy()->addDays($newDuration - 1);
            }
            $changes[] = [
                'task_id'     => $task->id,
                'task_name'   => $task->name,
                'field'       => 'duration',
                'old_value'   => $task->getOriginal('duration'),
                'new_value'   => $newDuration,
                'old_end'     => $oldEnd?->format('Y-m-d'),
                'new_end'     => $task->end_date?->format('Y-m-d'),
            ];
            $task->saveQuietly();
        }

        if ($newStart !== null) {
            $startDate = Carbon::parse($newStart);
            $oldStart = $task->start_date;
            $shift = $oldStart ? $startDate->diffInDays($oldStart, false) : 0;
            $task->start_date = $startDate;
            if ($task->duration) {
                $task->end_date = $startDate->copy()->addDays($task->duration - 1);
            }
            $changes[] = [
                'task_id'     => $task->id,
                'task_name'   => $task->name,
                'field'       => 'start_date',
                'old_value'   => $oldStart?->format('Y-m-d'),
                'new_value'   => $newStart,
            ];
            $task->saveQuietly();
        }

        // Cascade update: tìm tất cả tasks phụ thuộc và cập nhật
        $cascadeChanges = $this->cascadeUpdateDependents($task);
        $changes = array_merge($changes, $cascadeChanges);

        return [
            'success' => true,
            'changes' => $changes,
            'total_affected' => count($changes),
        ];
    }

    /**
     * Kiểm tra chậm tiến độ cho toàn dự án
     */
    public function checkScheduleDelays(int $projectId): array
    {
        $tasks = ProjectTask::where('project_id', $projectId)
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->get();

        $warnings = [];
        foreach ($tasks as $task) {
            $expectedProgress = $this->calculateExpectedProgress($task);
            $actualProgress = (float) ($task->progress_percentage ?? 0);
            $delayDays = $this->calculateDelayDays($task, $expectedProgress);

            if ($delayDays >= 1) {
                $isParentTask = $task->children()->exists();
                $warnings[] = [
                    'task_id'           => $task->id,
                    'task_name'         => $task->name,
                    'expected_progress' => round($expectedProgress, 2),
                    'actual_progress'   => round($actualProgress, 2),
                    'gap'               => round($expectedProgress - $actualProgress, 2),
                    'delay_days'        => $delayDays,
                    'priority'          => $isParentTask ? 'high' : ($delayDays >= 3 ? 'medium' : 'low'),
                    'is_parent_task'    => $isParentTask,
                    'end_date'          => $task->end_date?->format('Y-m-d'),
                ];
            }
        }

        // Sắp xếp: hạng mục lớn trước, delay nhiều trước
        usort($warnings, function ($a, $b) {
            if ($a['is_parent_task'] !== $b['is_parent_task']) {
                return $b['is_parent_task'] <=> $a['is_parent_task'];
            }
            return $b['delay_days'] <=> $a['delay_days'];
        });

        return $warnings;
    }

    // ==================================================================
    // PRIVATE HELPERS
    // ==================================================================

    private function calculateExpectedProgress(ProjectTask $task): float
    {
        if (!$task->start_date || !$task->end_date) return 0;

        $totalDays = $task->start_date->diffInDays($task->end_date) + 1;
        if ($totalDays <= 0) return 100;

        $elapsedDays = $task->start_date->diffInDays(now()) + 1;
        if ($elapsedDays <= 0) return 0;
        if ($elapsedDays >= $totalDays) return 100;

        return ($elapsedDays / $totalDays) * 100;
    }

    private function calculateDelayDays(ProjectTask $task, float $expectedProgress): int
    {
        $actualProgress = (float) ($task->progress_percentage ?? 0);
        if ($actualProgress >= $expectedProgress) return 0;
        if (!$task->start_date || !$task->end_date) return 0;

        $totalDays = $task->start_date->diffInDays($task->end_date) + 1;
        $gap = $expectedProgress - $actualProgress;

        return (int) ceil(($gap / 100) * $totalDays);
    }

    private function getDelayStatus(int $delayDays): string
    {
        if ($delayDays <= 0) return 'on_track';
        if ($delayDays <= 2) return 'slight_delay';
        if ($delayDays <= 5) return 'moderate_delay';
        return 'severe_delay';
    }

    private function cascadeUpdateDependents(ProjectTask $task): array
    {
        $changes = [];
        $dependents = ProjectTaskDependency::where('depends_on_task_id', $task->id)
            ->with('task')
            ->get();

        foreach ($dependents as $dep) {
            $depTask = $dep->task;
            if (!$depTask) continue;

            // FS (Finish-to-Start): dependent starts after predecessor finishes
            $newStart = $task->end_date?->copy()->addDay();
            if ($newStart && $depTask->start_date && $newStart->gt($depTask->start_date)) {
                $oldStart = $depTask->start_date;
                $depTask->start_date = $newStart;
                if ($depTask->duration) {
                    $depTask->end_date = $newStart->copy()->addDays($depTask->duration - 1);
                }
                $depTask->saveQuietly();

                $changes[] = [
                    'task_id'   => $depTask->id,
                    'task_name' => $depTask->name,
                    'field'     => 'cascade_adjust',
                    'old_value' => $oldStart->format('Y-m-d'),
                    'new_value' => $newStart->format('Y-m-d'),
                    'reason'    => "Phụ thuộc vào [{$task->name}]",
                ];

                // Tiếp tục cascade
                $moreChanges = $this->cascadeUpdateDependents($depTask);
                $changes = array_merge($changes, $moreChanges);
            }
        }

        return $changes;
    }

    private function topologicalSort(array $nodes): array
    {
        $sorted = [];
        $visited = [];
        $visiting = [];

        $visit = function ($nodeId) use (&$visit, &$sorted, &$visited, &$visiting, $nodes) {
            if (isset($visited[$nodeId])) return;
            if (isset($visiting[$nodeId])) return; // Cycle detection

            $visiting[$nodeId] = true;
            foreach ($nodes[$nodeId]['predecessors'] as $predId) {
                if (isset($nodes[$predId])) {
                    $visit($predId);
                }
            }
            unset($visiting[$nodeId]);
            $visited[$nodeId] = true;
            $sorted[] = $nodeId;
        };

        foreach (array_keys($nodes) as $nodeId) {
            $visit($nodeId);
        }

        return $sorted;
    }

    private function getProjectStats(Collection $tasks): array
    {
        $total = $tasks->count();
        $completed = $tasks->where('status', 'completed')->count();
        $inProgress = $tasks->where('status', 'in_progress')->count();
        $delayed = 0;

        foreach ($tasks as $task) {
            if ($this->calculateDelayDays($task, $this->calculateExpectedProgress($task)) >= 1) {
                $delayed++;
            }
        }

        $avgProgress = $total > 0 ? $tasks->avg('progress_percentage') : 0;

        return [
            'total_tasks'     => $total,
            'completed'       => $completed,
            'in_progress'     => $inProgress,
            'not_started'     => $total - $completed - $inProgress,
            'delayed'         => $delayed,
            'avg_progress'    => round($avgProgress, 2),
        ];
    }
}
