<?php

namespace App\Console\Commands;

use App\Models\Project;
use App\Services\BonusCalculationService;
use Illuminate\Console\Command;

class CalculateProjectBonusesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hr:calculate-project-bonuses {--project-id= : ID dự án cụ thể, nếu không có thì tính cho tất cả dự án}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Tự động tính thưởng từ % hoàn thành dự án';

    /**
     * Execute the console command.
     */
    public function handle(BonusCalculationService $service): int
    {
        $projectId = $this->option('project-id');

        if ($projectId) {
            $projects = Project::where('id', $projectId)->get();
            if ($projects->isEmpty()) {
                $this->error("Không tìm thấy dự án với ID: {$projectId}");
                return Command::FAILURE;
            }
        } else {
            $projects = Project::where('status', 'in_progress')
                ->orWhere('status', 'completed')
                ->get();
        }

        $this->info("Đang tính thưởng cho " . $projects->count() . " dự án...");

        $totalBonuses = 0;
        $errors = 0;

        foreach ($projects as $project) {
            try {
                $bonuses = $service->calculateBonusesForProject($project);
                $totalBonuses += count($bonuses);
                if (count($bonuses) > 0) {
                    $this->line("  ✓ Dự án {$project->name}: " . count($bonuses) . " thưởng");
                }
            } catch (\Exception $e) {
                $errors++;
                $this->error("  ✗ Dự án {$project->name}: {$e->getMessage()}");
            }
        }

        $this->info("Hoàn thành! Đã tạo {$totalBonuses} thưởng.");
        if ($errors > 0) {
            $this->warn("Có {$errors} lỗi xảy ra.");
        }

        return Command::SUCCESS;
    }
}
