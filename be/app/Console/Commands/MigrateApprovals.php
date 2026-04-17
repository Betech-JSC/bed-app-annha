<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Cost;
use App\Models\AdditionalCost;
use App\Models\AcceptanceStage;
use App\Models\MaterialBill;
use App\Models\ProjectPayment;
use App\Models\Attendance;
use App\Models\SubcontractorPayment;
use App\Models\ConstructionLog;
use App\Models\AssetUsage;
use App\Models\EquipmentRental;
use App\Models\EquipmentPurchase;
use App\Models\Defect;
use App\Models\ProjectBudget;
use App\Models\ScheduleAdjustment;

class MigrateApprovals extends Command
{
    protected $signature = 'app:migrate-approvals';
    protected $description = 'Migrate existing pending items to the centralized approvals table';

    public function handle()
    {
        $this->info('Starting migration of pending approvals...');

        // 1. Costs
        $this->migrateCollection(
            Cost::whereIn('status', ['pending', 'pending_management_approval', 'pending_accountant_approval'])
                ->whereNull('material_bill_id')
                ->whereNull('subcontractor_payment_id')
                ->get(),
            'Costs'
        );

        // 2. Additional Costs
        $this->migrateCollection(
            AdditionalCost::whereIn('status', ['pending', 'pending_approval'])->get(),
            'Additional Costs'
        );

        // 3. Acceptance Stages
        $this->migrateCollection(
            AcceptanceStage::whereIn('status', ['pending', 'supervisor_approved', 'project_manager_approved'])->get(),
            'Acceptance Stages'
        );

        // 4. Material Bills
        $this->migrateCollection(
            MaterialBill::whereIn('status', ['pending', 'pending_management', 'pending_accountant'])->get(),
            'Material Bills'
        );

        // 5. Project Payments
        $this->migrateCollection(
            ProjectPayment::whereIn('status', ['customer_pending_approval', 'customer_paid'])->get(),
            'Project Payments'
        );

        // 6. Attendance
        $this->migrateCollection(
            Attendance::where('workflow_status', 'submitted')->get(),
            'Attendance Records'
        );

        // 7. Subcontractor Payments
        $this->migrateCollection(
            SubcontractorPayment::whereIn('status', ['pending_management_approval', 'pending_accountant_confirmation'])->get(),
            'Subcontractor Payments'
        );

        // 8. Construction Logs
        $this->migrateCollection(
            ConstructionLog::where('approval_status', 'pending')->get(),
            'Construction Logs'
        );

        // 9. Asset Usages
        $this->migrateCollection(
            AssetUsage::where('status', 'pending')->get(),
            'Asset Usages'
        );

        // 10. Equipment Rentals
        $this->migrateCollection(
            EquipmentRental::where('status', 'pending')->get(),
            'Equipment Rentals'
        );

        // 11. Equipment Purchases
        $this->migrateCollection(
            EquipmentPurchase::whereIn('status', ['pending', 'pending_management', 'pending_accountance'])->get(),
            'Equipment Purchases'
        );

        // 12. Defects (fixed waiting for verification)
        $this->migrateCollection(
            Defect::where('status', 'fixed')->get(),
            'Defects'
        );

        // 13. Project Budgets
        $this->migrateCollection(
            ProjectBudget::where('status', 'pending')->get(),
            'Project Budgets'
        );

        // 14. Schedule Adjustments
        $this->migrateCollection(
            ScheduleAdjustment::where('status', 'pending')->get(),
            'Schedule Adjustments'
        );

        $this->info('Migration completed successfully.');
    }


    private function migrateCollection($collection, $label)
    {
        $count = $collection->count();
        $this->info("Migrating {$count} items for {$label}...");
        
        foreach ($collection as $item) {
            $item->syncApproval();
        }
    }
}
