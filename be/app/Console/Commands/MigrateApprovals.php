<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Cost;
use App\Models\AdditionalCost;
use App\Models\AcceptanceStage;
use App\Models\AcceptanceItem;
use App\Models\MaterialBill;
use App\Models\ProjectPayment;
use App\Models\Attendance;
use App\Models\SubcontractorPayment;
use App\Models\SubcontractorAcceptance;
use App\Models\SupplierAcceptance;
use App\Models\Contract;
use App\Models\ChangeRequest;
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

        // 4. Acceptance Items
        $this->migrateCollection(
            AcceptanceItem::where('acceptance_status', 'pending')->get(),
            'Acceptance Items'
        );

        // 5. Material Bills
        $this->migrateCollection(
            MaterialBill::whereIn('status', ['pending', 'pending_management', 'pending_accountant'])->get(),
            'Material Bills'
        );

        // 6. Project Payments
        $this->migrateCollection(
            ProjectPayment::whereIn('status', ['customer_pending_approval', 'customer_paid'])->get(),
            'Project Payments'
        );

        // 7. Attendance
        $this->migrateCollection(
            Attendance::where('workflow_status', 'submitted')->get(),
            'Attendance Records'
        );

        // 8. Subcontractor Payments
        $this->migrateCollection(
            SubcontractorPayment::whereIn('status', ['pending_management_approval', 'pending_accountant_confirmation'])->get(),
            'Subcontractor Payments'
        );

        // 9. Subcontractor Acceptances
        $this->migrateCollection(
            SubcontractorAcceptance::where('status', 'pending')->get(),
            'Subcontractor Acceptances'
        );

        // 10. Supplier Acceptances
        $this->migrateCollection(
            SupplierAcceptance::where('status', 'pending')->get(),
            'Supplier Acceptances'
        );

        // 11. Contracts
        $this->migrateCollection(
            Contract::where('status', 'pending_customer_approval')->get(),
            'Contracts'
        );

        // 12. Change Requests
        $this->migrateCollection(
            ChangeRequest::whereIn('status', ['submitted', 'under_review'])->get(),
            'Change Requests'
        );

        // 13. Construction Logs
        $this->migrateCollection(
            ConstructionLog::where('approval_status', 'pending')->get(),
            'Construction Logs'
        );

        // 14. Asset Usages
        $this->migrateCollection(
            AssetUsage::whereIn('status', ['pending_management', 'pending_accountant', 'pending_return'])->get(),
            'Asset Usages'
        );

        // 15. Equipment Rentals
        $this->migrateCollection(
            EquipmentRental::whereIn('status', ['pending_management', 'pending_accountant', 'pending_return'])->get(),
            'Equipment Rentals'
        );

        // 16. Equipment Purchases
        $this->migrateCollection(
            EquipmentPurchase::whereIn('status', ['pending', 'pending_management', 'pending_accountance'])->get(),
            'Equipment Purchases'
        );

        // 17. Defects (fixed waiting for verification)
        $this->migrateCollection(
            Defect::where('status', 'fixed')->get(),
            'Defects'
        );

        // 18. Project Budgets
        $this->migrateCollection(
            ProjectBudget::whereIn('status', ['pending', 'pending_approval'])->get(),
            'Project Budgets'
        );

        // 19. Schedule Adjustments
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
