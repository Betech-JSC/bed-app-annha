<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectRisk;
use App\Models\Defect;
use App\Models\ChangeRequest;
use App\Models\ProjectTask;
use Carbon\Carbon;

class ProjectMonitoringService
{
    /**
     * Lấy dashboard data cho tất cả projects
     */
    public function getDashboardData(?int $userId = null): array
    {
        $query = Project::with([
            'progress',
            'tasks' => function ($q) {
                $q->whereNull('deleted_at')
                    ->with(['parent', 'children'])
                    ->orderBy('order');
            },
            'risks' => function ($q) {
                $q->active()->latest();
            },
            'defects' => function ($q) {
                $q->whereIn('status', ['open', 'in_progress']);
            },
            'changeRequests' => function ($q) {
                $q->pending();
            },
        ]);

        // Nếu có userId, lọc theo projects mà user có quyền
        if ($userId) {
            // Có thể thêm logic filter theo user role/permissions
        }

        $projects = $query->get();

        $alerts = [];
        $atRiskProjects = [];
        $overdueTasks = [];
        $budgetAlerts = [];

        foreach ($projects as $project) {
            // Kiểm tra rủi ro delay
            $delayRisk = $this->checkDelayRisk($project);
            if ($delayRisk['has_risk']) {
                $alerts[] = [
                    'type' => 'delay',
                    'severity' => $delayRisk['severity'],
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'message' => $delayRisk['message'],
                ];
                if ($delayRisk['severity'] === 'high' || $delayRisk['severity'] === 'critical') {
                    $atRiskProjects[] = $project->id;
                }
            }

            // Kiểm tra budget
            $budgetAlert = $this->checkBudgetRisk($project);
            if ($budgetAlert['has_risk']) {
                $budgetAlerts[] = [
                    'type' => 'budget',
                    'severity' => $budgetAlert['severity'],
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'message' => $budgetAlert['message'],
                ];
            }

            // Kiểm tra defects
            $openDefects = $project->defects->count();
            if ($openDefects > 10) {
                $alerts[] = [
                    'type' => 'defects',
                    'severity' => 'high',
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'message' => "Có {$openDefects} lỗi chưa được xử lý",
                ];
            }

            // Kiểm tra high-risk risks
            $highRisks = $project->risks->filter(function ($risk) {
                return $risk->risk_level === 'high' || $risk->risk_level === 'critical';
            });
            if ($highRisks->count() > 0) {
                $alerts[] = [
                    'type' => 'risk',
                    'severity' => 'high',
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'message' => "Có {$highRisks->count()} rủi ro cao",
                ];
            }

            // Kiểm tra pending change requests
            $pendingChanges = $project->changeRequests->count();
            if ($pendingChanges > 5) {
                $alerts[] = [
                    'type' => 'change_request',
                    'severity' => 'medium',
                    'project_id' => $project->id,
                    'project_name' => $project->name,
                    'message' => "Có {$pendingChanges} yêu cầu thay đổi đang chờ duyệt",
                ];
            }
        }

        // Lấy overdue tasks
        $overdueTasks = ProjectTask::where('status', 'in_progress')
            ->whereNotNull('end_date')
            ->where('end_date', '<', now())
            ->with('project:id,name')
            ->get()
            ->map(function ($task) {
                return [
                    'id' => $task->id,
                    'name' => $task->name,
                    'project_id' => $task->project_id,
                    'project_name' => $task->project->name ?? 'N/A',
                    'end_date' => $task->end_date->toDateString(),
                    'overdue_days' => now()->diffInDays($task->end_date),
                ];
            });

        // Progress overview for dashboard
        $progressOverview = [];
        foreach ($projects as $project) {
            $tasks = $project->tasks;
            $rootTasks = $tasks->whereNull('parent_id');
            
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

            // Count tasks by status
            $tasksByStatus = [
                'not_started' => $tasks->where('status', 'not_started')->count(),
                'in_progress' => $tasks->where('status', 'in_progress')->count(),
                'delayed' => $tasks->where('status', 'delayed')->count(),
                'completed' => $tasks->where('status', 'completed')->count(),
            ];

            // High priority tasks
            $highPriorityTasks = $tasks->whereIn('priority', ['high', 'urgent'])->count();

            $progressOverview[] = [
                'project_id' => $project->id,
                'project_name' => $project->name,
                'project_code' => $project->code,
                'overall_progress' => $overallProgress,
                'total_tasks' => $tasks->count(),
                'tasks_by_status' => $tasksByStatus,
                'high_priority_tasks' => $highPriorityTasks,
                'delayed_tasks' => $tasksByStatus['delayed'],
            ];
        }

        return [
            'total_projects' => $projects->count(),
            'active_projects' => $projects->where('status', 'in_progress')->count(),
            'at_risk_projects' => count($atRiskProjects),
            'total_alerts' => count($alerts),
            'alerts' => $alerts,
            'overdue_tasks' => $overdueTasks,
            'budget_alerts' => $budgetAlerts,
            'progress_overview' => $progressOverview,
            'summary' => [
                'critical_alerts' => count(array_filter($alerts, fn($a) => $a['severity'] === 'critical')),
                'high_alerts' => count(array_filter($alerts, fn($a) => $a['severity'] === 'high')),
                'medium_alerts' => count(array_filter($alerts, fn($a) => $a['severity'] === 'medium')),
            ],
        ];
    }

    /**
     * Lấy monitoring data cho một project cụ thể
     */
    public function getProjectMonitoringData(Project $project): array
    {
        $progress = $project->progress ? (float) $project->progress->overall_percentage : 0.0;
        
        // Tính toán các metrics
        $metrics = [
            'progress' => (float) $progress,
            'open_defects' => (int) $project->defects()->whereIn('status', ['open', 'in_progress'])->count(),
            'high_risks' => (int) $project->risks()->whereIn('probability', ['high', 'very_high'])
                ->whereIn('impact', ['high', 'very_high'])->count(),
            'pending_changes' => (int) $project->changeRequests()->pending()->count(),
            'overdue_tasks' => (int) $project->tasks()
                ->where('status', 'in_progress')
                ->whereNotNull('end_date')
                ->where('end_date', '<', now())
                ->count(),
        ];

        // Alerts cho project này
        $alerts = [];
        
        $delayRisk = $this->checkDelayRisk($project);
        if ($delayRisk['has_risk']) {
            $alerts[] = $delayRisk;
        }

        $budgetRisk = $this->checkBudgetRisk($project);
        if ($budgetRisk['has_risk']) {
            $alerts[] = $budgetRisk;
        }

        // Deadline sắp đến
        if ($project->end_date) {
            $daysUntilDeadline = now()->diffInDays($project->end_date, false);
            if ($daysUntilDeadline >= 0 && $daysUntilDeadline <= 7) {
                $alerts[] = [
                    'type' => 'deadline',
                    'severity' => $daysUntilDeadline <= 3 ? 'high' : 'medium',
                    'has_risk' => true,
                    'message' => "Deadline còn {$daysUntilDeadline} ngày",
                    'days_remaining' => $daysUntilDeadline,
                ];
            }
        }

        return [
            'project' => [
                'id' => $project->id,
                'name' => $project->name,
                'status' => $project->status,
                'start_date' => $project->start_date?->toDateString(),
                'end_date' => $project->end_date?->toDateString(),
            ],
            'metrics' => $metrics,
            'alerts' => $alerts,
        ];
    }

    /**
     * Kiểm tra rủi ro delay
     */
    protected function checkDelayRisk(Project $project): array
    {
        if (!$project->end_date || !$project->start_date) {
            return ['has_risk' => false];
        }

        $progress = $project->progress ? $project->progress->overall_percentage : 0;
        $startDate = Carbon::parse($project->start_date);
        $endDate = Carbon::parse($project->end_date);
        $today = Carbon::today();

        // Tính % thời gian đã trôi qua
        $totalDays = $startDate->diffInDays($endDate);
        $elapsedDays = $startDate->diffInDays($today);
        $timePercentage = $totalDays > 0 ? ($elapsedDays / $totalDays) * 100 : 0;

        // So sánh tiến độ với thời gian
        $progressGap = $timePercentage - $progress;

        $hasRisk = false;
        $severity = 'low';
        $message = '';

        if ($progressGap > 20) {
            $hasRisk = true;
            $severity = 'critical';
            $message = "Tiến độ chậm {$progressGap}% so với kế hoạch";
        } elseif ($progressGap > 10) {
            $hasRisk = true;
            $severity = 'high';
            $message = "Tiến độ chậm {$progressGap}% so với kế hoạch";
        } elseif ($progressGap > 5) {
            $hasRisk = true;
            $severity = 'medium';
            $message = "Tiến độ chậm {$progressGap}% so với kế hoạch";
        }

        // Kiểm tra deadline
        if ($today > $endDate && $progress < 100) {
            $hasRisk = true;
            $severity = 'critical';
            $delayDays = $today->diffInDays($endDate);
            $message = "Đã quá deadline {$delayDays} ngày";
        }

        return [
            'type' => 'delay',
            'has_risk' => $hasRisk,
            'severity' => $severity,
            'message' => $message,
            'progress_gap' => round($progressGap, 2),
        ];
    }

    /**
     * Kiểm tra rủi ro budget
     */
    protected function checkBudgetRisk(Project $project): array
    {
        $budget = $project->budgets()
            ->where('status', 'approved')
            ->orderBy('budget_date', 'desc')
            ->first();

        if (!$budget) {
            return ['has_risk' => false];
        }

        $totalBudget = $budget->total_budget;
        $costsData = app(FinancialCalculationService::class)->calculateTotalCosts($project);
        $actualCost = $costsData['total_costs'] ?? 0;
        
        $budgetUsed = $totalBudget > 0 ? (($actualCost / $totalBudget) * 100) : 0;
        $overrun = $actualCost - $totalBudget;

        $hasRisk = false;
        $severity = 'low';
        $message = '';

        if ($budgetUsed > 100) {
            $hasRisk = true;
            $severity = 'critical';
            $message = "Đã vượt ngân sách " . number_format($overrun, 0) . " VNĐ";
        } elseif ($budgetUsed > 90) {
            $hasRisk = true;
            $severity = 'high';
            $message = "Đã sử dụng {$budgetUsed}% ngân sách";
        } elseif ($budgetUsed > 80) {
            $hasRisk = true;
            $severity = 'medium';
            $message = "Đã sử dụng {$budgetUsed}% ngân sách";
        }

        return [
            'type' => 'budget',
            'has_risk' => $hasRisk,
            'severity' => $severity,
            'message' => $message,
            'budget_used_percentage' => round($budgetUsed, 2),
            'overrun_amount' => $overrun,
        ];
    }
}

