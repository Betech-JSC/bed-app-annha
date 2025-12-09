<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Services\ProgressCalculationService;
use Illuminate\Console\Command;

class CalculateProjectProgressCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'projects:calculate-progress {--project-id= : ID dự án cụ thể} {--method=auto : Phương pháp tính (auto, logs, subcontractors, average)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Tính lại tiến độ thi công cho các dự án';

    /**
     * Execute the console command.
     */
    public function handle(ProgressCalculationService $service): int
    {
        $projectId = $this->option('project-id');
        $method = $this->option('method');

        if ($projectId) {
            $project = Project::find($projectId);
            if (!$project) {
                $this->error("Không tìm thấy dự án #{$projectId}");
                return Command::FAILURE;
            }

            $this->calculateForProject($project, $service, $method);
        } else {
            // Calculate for all active projects
            $projects = Project::where('status', 'in_progress')->get();

            if ($projects->isEmpty()) {
                $this->info('Không có dự án nào đang thi công.');
                return Command::SUCCESS;
            }

            $this->info("Đang tính tiến độ cho {$projects->count()} dự án...");

            $bar = $this->output->createProgressBar($projects->count());
            $bar->start();

            foreach ($projects as $project) {
                $this->calculateForProject($project, $service, $method, false);
                $bar->advance();
            }

            $bar->finish();
            $this->newLine();
        }

        $this->info('Hoàn tất tính toán tiến độ.');

        return Command::SUCCESS;
    }

    protected function calculateForProject(Project $project, ProgressCalculationService $service, string $method, bool $verbose = true): void
    {
        $oldProgress = $project->progress?->overall_percentage ?? 0;

        $newProgress = match ($method) {
            'logs' => $service->calculateFromLogs($project),
            'subcontractors' => $service->calculateFromSubcontractors($project),
            'average' => $service->calculateAverage($project),
            default => $service->calculateAuto($project),
        };

        if ($verbose) {
            $this->info("Dự án #{$project->id} ({$project->name}): {$oldProgress}% -> {$newProgress}%");
        }
    }
}
