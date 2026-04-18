<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\MaterialBill;
use App\Models\Cost;
use App\Models\EquipmentAllocation;
use Illuminate\Support\Facades\DB;

class SyncProjectCosts extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync:project-costs {--project= : Project ID to sync}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync all MaterialBills and EquipmentAllocations to the project Cost records to ensure financial data integrity.';

    /**
     * Execute the console command.
     *
     * @return int
     */
    public function handle()
    {
        $projectId = $this->option('project');
        
        $this->info('--- Global Project Cost Synchronization ---');

        $modelsToSync = [
            \App\Models\MaterialBill::class          => 'syncToCost',
            \App\Models\SubcontractorPayment::class  => 'syncToCostTable',
            \App\Models\EquipmentRental::class       => 'syncToCostTable',
            \App\Models\EquipmentPurchase::class     => 'syncToCostTable',
            \App\Models\AdditionalCost::class        => 'syncToCostTable',
            \App\Models\Attendance::class            => 'syncToCostTable', // Note: Needs to exist or handled
        ];

        foreach ($modelsToSync as $modelClass => $method) {
            $this->info("Syncing " . class_basename($modelClass) . "...");
            
            $query = $modelClass::query();
            if ($projectId) {
                $query->where('project_id', $projectId);
            }

            $count = $query->count();
            $bar = $this->output->createProgressBar($count);
            $bar->start();

            $query->each(function($model) use ($method, $bar) {
                try {
                    if (method_exists($model, $method)) {
                        $model->$method();
                    } elseif ($model instanceof \App\Models\Attendance) {
                        // Special handling for Attendance as it uses a Service
                        app(\App\Services\AttendanceService::class)->syncLaborCost($model);
                    }
                } catch (\Exception $e) {
                    $this->error("\nError syncing " . class_basename($model) . " #{$model->id}: " . $e->getMessage());
                }
                $bar->advance();
            });

            $bar->finish();
            $this->info("\nDone.");
        }

        $this->info('--- Synchronization completed successfully ---');
        
        return 0;
    }
}
