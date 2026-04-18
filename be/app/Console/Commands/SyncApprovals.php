<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use App\Models\Approval;
use App\Models\MaterialBill;
use App\Models\SubcontractorPayment;
use App\Models\EquipmentRental;
use App\Models\EquipmentPurchase;
use App\Models\AdditionalCost;
use App\Models\AssetUsage;
use App\Models\Attendance;
use App\Models\Defect;
use App\Models\AcceptanceStage;
use App\Models\AcceptanceItem;
use App\Models\ProjectBudget;
use App\Models\ConstructionLog;
use App\Models\SupplierAcceptance;
use App\Models\SubcontractorAcceptance;
use App\Models\ProjectPayment;
use App\Models\ChangeRequest;
use App\Models\ScheduleAdjustment;
use App\Models\Contract;
use App\Models\Cost;
use App\Models\Equipment;

class SyncApprovals extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sync:approvals {--fresh : Truncate the approvals table before syncing}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Synchronize pending approval records from all approvable models';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('--- Starting Approval Synchronization ---');

        if ($this->option('fresh')) {
            $this->warn('Cleaning up current approvals table...');
            DB::statement('SET FOREIGN_KEY_CHECKS=0;');
            Approval::truncate();
            DB::statement('SET FOREIGN_KEY_CHECKS=1;');
            $this->info('Approvals table truncated.');
        }

        $models = [
            MaterialBill::class,
            SubcontractorPayment::class,
            EquipmentRental::class,
            EquipmentPurchase::class,
            AdditionalCost::class,
            AssetUsage::class,
            Attendance::class,
            Defect::class,
            AcceptanceStage::class,
            AcceptanceItem::class,
            ProjectBudget::class,
            ConstructionLog::class,
            SupplierAcceptance::class,
            SubcontractorAcceptance::class,
            ProjectPayment::class,
            ChangeRequest::class,
            ScheduleAdjustment::class,
            Contract::class,
            Cost::class,
            Equipment::class,
        ];

        $totalRestored = 0;

        foreach ($models as $modelClass) {
            if (!class_exists($modelClass)) {
                $this->line("  [SKIP] Class {$modelClass} not found.");
                continue;
            }
            
            $count = 0;
            $basename = class_basename($modelClass);
            
            try {
                // We use withTrashed() if the model supports it to avoid missing records
                $query = method_exists($modelClass, 'withTrashed') 
                    ? $modelClass::withTrashed() 
                    : $modelClass::query();

                $query->chunk(100, function ($records) use (&$count, &$totalRestored, $basename) {
                    foreach ($records as $record) {
                        if (method_exists($record, 'isPendingApproval') && $record->isPendingApproval()) {
                            $record->syncApproval();
                            $count++;
                            $totalRestored++;
                        }
                    }
                });
                
                if ($count > 0) {
                    $this->info("  [OK] {$basename}: {$count} pending approvals synced.");
                } else {
                    $this->line("  [..] {$basename}: No pending items found.");
                }
            } catch (\Exception $e) {
                $this->error("  [ERR] {$basename}: " . $e->getMessage());
            }
        }

        $this->info("--- Synchronization Complete: {$totalRestored} total records synced ---");
        
        // Final cleanup: Deduplicate again in case of race conditions
        $this->info('Checking for duplicate approval entries in the database...');
        $duplicates = Approval::select('approvable_type', 'approvable_id', DB::raw('COUNT(*) as count'))
            ->groupBy('approvable_type', 'approvable_id')
            ->having('count', '>', 1)
            ->get();

        if ($duplicates->isNotEmpty()) {
            $deletedCount = 0;
            foreach ($duplicates as $duplicate) {
                // Keep the most recent one, delete the rest
                $idsToDelete = Approval::where('approvable_type', $duplicate->approvable_type)
                    ->where('approvable_id', $duplicate->approvable_id)
                    ->orderBy('updated_at', 'desc')
                    ->skip(1)
                    ->pluck('id');
                
                $deletedCount += Approval::whereIn('id', $idsToDelete)->delete();
            }
            $this->warn("Cleaned up {$deletedCount} duplicate approval records.");
        } else {
            $this->info('No duplicate records found.');
        }
        
        return Command::SUCCESS;
    }
}
