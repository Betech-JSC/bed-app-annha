<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\BudgetSyncService;
use App\Models\Project;

class SyncBudgets extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'budgets:sync {--project= : Sync budgets for a specific project ID}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync budget actual costs with approved costs';

    /**
     * Execute the console command.
     */
    public function handle(BudgetSyncService $syncService)
    {
        $projectId = $this->option('project');

        if ($projectId) {
            $project = Project::find($projectId);
            if (!$project) {
                $this->error("Project {$projectId} not found");
                return 1;
            }

            $this->info("Syncing budgets for project: {$project->name} (ID: {$project->id})");
            $result = $syncService->syncProjectBudgets($project);

            if ($result['success']) {
                $this->info("✓ Successfully synced {$result['updated_budgets']} budgets");
                $this->info("  Updated {$result['updated_items']} budget items");
            } else {
                $this->error("✗ Error: {$result['message']}");
                return 1;
            }
        } else {
            $this->info("Syncing budgets for all projects...");
            $result = $syncService->syncAllBudgets();

            if ($result['success']) {
                $this->info("✓ Successfully synced {$result['total_updated']} budgets across all projects");
                
                if (!empty($result['errors'])) {
                    $this->warn("Errors encountered:");
                    foreach ($result['errors'] as $error) {
                        $this->warn("  - {$error}");
                    }
                }
            } else {
                $this->error("✗ Error syncing budgets");
                return 1;
            }
        }

        return 0;
    }
}
