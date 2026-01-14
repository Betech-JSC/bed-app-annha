<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Models\ProjectTask;
use App\Services\ProjectMonitoringService;
use App\Services\NotificationService;
use Illuminate\Console\Command;

class CheckProjectPerformance extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'projects:check-performance';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Kiểm tra hiệu suất dự án và tạo notifications cho các vấn đề phát hiện được';

    protected ProjectMonitoringService $monitoringService;
    protected NotificationService $notificationService;

    public function __construct(
        ProjectMonitoringService $monitoringService,
        NotificationService $notificationService
    ) {
        parent::__construct();
        $this->monitoringService = $monitoringService;
        $this->notificationService = $notificationService;
    }

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Bắt đầu kiểm tra hiệu suất dự án...');

        $projects = Project::whereIn('status', ['planning', 'in_progress'])
            ->with(['progress', 'budgets', 'defects', 'risks', 'tasks'])
            ->get();

        $notificationsCreated = 0;

        foreach ($projects as $project) {
            // 1. Kiểm tra delay risk
            $delayRisk = $this->monitoringService->checkDelayRisk($project);
            if ($delayRisk['has_risk']) {
                // Chỉ tạo notification nếu chưa có notification tương tự trong 24h qua
                $recentNotification = \App\Models\Notification::where('user_id', $project->project_manager_id ?? $project->customer_id)
                    ->where('type', \App\Models\Notification::TYPE_PROJECT_PERFORMANCE)
                    ->where('category', \App\Models\Notification::CATEGORY_DELAY_RISK)
                    ->whereJsonContains('data->project_id', $project->id)
                    ->where('created_at', '>=', now()->subHours(24))
                    ->exists();

                if (!$recentNotification) {
                    $progressGap = $delayRisk['progress_gap'] ?? ($delayRisk['message'] ? 0 : 0);
                    $this->notificationService->notifyDelayRisk(
                        $project,
                        abs($progressGap),
                        $delayRisk['severity'] ?? 'medium'
                    );
                    $notificationsCreated++;
                }
            }

            // 2. Kiểm tra budget overrun
            $budgetAlert = $this->monitoringService->checkBudgetRisk($project);
            if ($budgetAlert['has_risk']) {
                $recentNotification = \App\Models\Notification::where('user_id', $project->project_manager_id ?? $project->customer_id)
                    ->where('type', \App\Models\Notification::TYPE_PROJECT_PERFORMANCE)
                    ->where('category', \App\Models\Notification::CATEGORY_BUDGET_OVERRUN)
                    ->whereJsonContains('data->project_id', $project->id)
                    ->where('created_at', '>=', now()->subHours(24))
                    ->exists();

                if (!$recentNotification) {
                    $this->notificationService->notifyBudgetOverrun(
                        $project,
                        $budgetAlert['overrun_amount'] ?? 0,
                        $budgetAlert['overrun_percentage'] ?? 0
                    );
                    $notificationsCreated++;
                }
            }

            // 3. Kiểm tra deadline sắp đến (7, 3, 1 ngày)
            if ($project->end_date) {
                $daysRemaining = now()->diffInDays($project->end_date, false);
                if ($daysRemaining >= 0 && in_array($daysRemaining, [7, 3, 1])) {
                    $recentNotification = \App\Models\Notification::where('user_id', $project->project_manager_id ?? $project->customer_id)
                        ->where('type', \App\Models\Notification::TYPE_PROJECT_PERFORMANCE)
                        ->where('category', \App\Models\Notification::CATEGORY_DEADLINE)
                        ->whereJsonContains('data->project_id', $project->id)
                        ->whereJsonContains('data->days_remaining', $daysRemaining)
                        ->where('created_at', '>=', now()->subHours(12))
                        ->exists();

                    if (!$recentNotification) {
                        $this->notificationService->notifyDeadlineApproaching($project, $daysRemaining);
                        $notificationsCreated++;
                    }
                }
            }

            // 4. Kiểm tra overdue tasks
            $overdueTasks = ProjectTask::where('project_id', $project->id)
                ->where('status', '!=', 'completed')
                ->whereNotNull('end_date')
                ->where('end_date', '<', now())
                ->whereNotNull('assigned_to')
                ->get();

            foreach ($overdueTasks as $task) {
                $overdueDays = now()->diffInDays($task->end_date, false);
                $overdueDays = abs($overdueDays);

                // Chỉ notify nếu chưa có notification trong 24h qua
                $recentNotification = \App\Models\Notification::where('user_id', $task->assigned_to)
                    ->where('type', \App\Models\Notification::TYPE_PROJECT_PERFORMANCE)
                    ->where('category', \App\Models\Notification::CATEGORY_OVERDUE_TASK)
                    ->whereJsonContains('data->task_id', $task->id)
                    ->where('created_at', '>=', now()->subHours(24))
                    ->exists();

                if (!$recentNotification) {
                    $this->notificationService->notifyOverdueTask($task, $overdueDays);
                    $notificationsCreated++;
                }
            }

            // 5. Kiểm tra số lượng defects cao (> 10)
            $openDefectsCount = $project->defects()
                ->whereIn('status', ['open', 'in_progress'])
                ->count();

            if ($openDefectsCount > 10) {
                $recentNotification = \App\Models\Notification::where('user_id', $project->project_manager_id ?? $project->customer_id)
                    ->where('type', \App\Models\Notification::TYPE_PROJECT_PERFORMANCE)
                    ->where('category', \App\Models\Notification::CATEGORY_HIGH_DEFECTS)
                    ->whereJsonContains('data->project_id', $project->id)
                    ->where('created_at', '>=', now()->subHours(24))
                    ->exists();

                if (!$recentNotification) {
                    $this->notificationService->sendToProjectTeam(
                        $project->id,
                        \App\Models\Notification::TYPE_PROJECT_PERFORMANCE,
                        \App\Models\Notification::CATEGORY_HIGH_DEFECTS,
                        "Cảnh báo số lượng lỗi cao",
                        "Dự án '{$project->name}' có {$openDefectsCount} lỗi chưa được xử lý",
                        [
                            'project_id' => $project->id,
                            'project_name' => $project->name,
                            'defects_count' => $openDefectsCount,
                        ],
                        \App\Models\Notification::PRIORITY_HIGH,
                        "/projects/{$project->id}/defects",
                        true
                    );
                    $notificationsCreated++;
                }
            }

            // 6. Kiểm tra rủi ro cao
            $highRisksCount = $project->risks()
                ->where(function ($q) {
                    $q->whereIn('risk_level', ['high', 'critical'])
                        ->orWhere(function ($q2) {
                            $q2->whereIn('probability', ['high', 'very_high'])
                                ->whereIn('impact', ['high', 'very_high']);
                        });
                })
                ->count();

            if ($highRisksCount > 0) {
                $recentNotification = \App\Models\Notification::where('user_id', $project->project_manager_id ?? $project->customer_id)
                    ->where('type', \App\Models\Notification::TYPE_PROJECT_PERFORMANCE)
                    ->where('category', \App\Models\Notification::CATEGORY_HIGH_RISKS)
                    ->whereJsonContains('data->project_id', $project->id)
                    ->where('created_at', '>=', now()->subHours(24))
                    ->exists();

                if (!$recentNotification) {
                    $this->notificationService->sendToProjectTeam(
                        $project->id,
                        \App\Models\Notification::TYPE_PROJECT_PERFORMANCE,
                        \App\Models\Notification::CATEGORY_HIGH_RISKS,
                        "Cảnh báo rủi ro cao",
                        "Dự án '{$project->name}' có {$highRisksCount} rủi ro cao",
                        [
                            'project_id' => $project->id,
                            'project_name' => $project->name,
                            'risks_count' => $highRisksCount,
                        ],
                        \App\Models\Notification::PRIORITY_HIGH,
                        "/projects/{$project->id}",
                        true
                    );
                    $notificationsCreated++;
                }
            }
        }

        $this->info("Đã tạo {$notificationsCreated} notifications.");
        return Command::SUCCESS;
    }
}
