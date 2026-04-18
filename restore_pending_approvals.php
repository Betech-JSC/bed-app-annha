<?php

require __DIR__ . '/be/vendor/autoload.php';
$app = require_once __DIR__ . '/be/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

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

echo "--- Starting PENDING Approval Restoration Process ---\n";

// 1. Clear existing approvals to start fresh as requested
echo "Cleaning up current approvals table...\n";
DB::statement('SET FOREIGN_KEY_CHECKS=0;');
Approval::truncate();
DB::statement('SET FOREIGN_KEY_CHECKS=1;');

$modelsToRestore = [
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

foreach ($modelsToRestore as $modelClass) {
    if (!class_exists($modelClass)) {
        continue;
    }
    
    echo "Processing " . class_basename($modelClass) . "... ";
    $count = 0;
    
    $modelClass::all()->each(function($m) use (&$count, &$totalRestored) {
        try {
            if ($m->isPendingApproval()) {
                $m->syncApproval();
                $count++;
                $totalRestored++;
            }
        } catch (\Exception $e) {
            echo "\n  [ERR] #{$m->id}: {$e->getMessage()}\n";
        }
    });
    
    echo "({$count} pending found)\n";
}

echo "\n--- Restoration Complete: {$totalRestored} pending approvals recreated ---\n";
