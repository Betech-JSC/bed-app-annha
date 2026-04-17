<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Cost;
use App\Models\AdditionalCost;
use App\Models\AcceptanceStage;
use App\Models\MaterialBill;
use App\Models\ProjectPayment;

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
