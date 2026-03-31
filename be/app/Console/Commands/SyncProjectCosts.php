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
        
        $this->info('Starting Project Cost Synchronization...');

        // 1. Sync Material Bills
        $this->syncMaterialBills($projectId);

        // 2. Sync Equipment Allocations (Rentals)
        $this->syncEquipmentAllocations($projectId);

        $this->info('Synchronization completed successfully.');
        
        return 0;
    }

    private function syncMaterialBills($projectId = null)
    {
        $this->info('Finding Material Bills to sync...');
        
        $query = MaterialBill::query();
        if ($projectId) {
            $query->where('project_id', $projectId);
        }
        
        $bills = $query->get();
        $this->info("Processing {$bills->count()} Material Bills...");

        $synced = 0;
        $created = 0;

        foreach ($bills as $bill) {
            // Find existing cost
            $cost = Cost::where('material_bill_id', $bill->id)->first();
            
            if (!$cost) {
                // If not found by ID, try finding by Reference/Name (legacy bills)
                $costNamePrefix = "Phiếu vật liệu #" . ($bill->bill_number ?? $bill->id);
                $cost = Cost::where('project_id', $bill->project_id)
                    ->where('name', 'like', $costNamePrefix . '%')
                    ->first();
                
                if ($cost) {
                    $this->line("Linking legacy cost for bill {$bill->id}");
                    $cost->material_bill_id = $bill->id;
                }
            }

            if ($cost) {
                // Determine correct status
                $newStatus = match ($bill->status) {
                    'approved'           => 'approved',
                    'pending_management' => 'pending_management_approval',
                    'pending_accountant' => 'pending_accountant_approval',
                    'rejected'           => 'rejected',
                    'draft'              => 'draft',
                    default              => 'draft',
                };

                $updates = [
                    'amount' => $bill->total_amount,
                    'status' => $newStatus,
                    'cost_date' => $bill->bill_date,
                    'cost_group_id' => $bill->cost_group_id,
                    'supplier_id' => $bill->supplier_id,
                ];

                if ($newStatus === 'approved') {
                    $updates['management_approved_by'] = $bill->management_approved_by;
                    $updates['management_approved_at'] = $bill->management_approved_at;
                    $updates['accountant_approved_by'] = $bill->accountant_approved_by;
                    $updates['accountant_approved_at'] = $bill->accountant_approved_at;
                }

                $cost->update($updates);
                $synced++;
            } else {
                // Create if totally missing
                $this->line("Creating missing cost for bill {$bill->id}");
                
                $supplierName = $bill->supplier ? $bill->supplier->name : '';
                $costName = "Phiếu vật liệu #" . ($bill->bill_number ?? $bill->id) . ($supplierName ? " - {$supplierName}" : '');
                
                $newStatus = match ($bill->status) {
                    'approved'           => 'approved',
                    'pending_management' => 'pending_management_approval',
                    'pending_accountant' => 'pending_accountant_approval',
                    'rejected'           => 'rejected',
                    'draft'              => 'draft',
                    default              => 'draft',
                };

                Cost::create([
                    'project_id'       => $bill->project_id,
                    'cost_group_id'    => $bill->cost_group_id,
                    'supplier_id'      => $bill->supplier_id,
                    'category'         => 'construction_materials',
                    'material_bill_id' => $bill->id,
                    'name'             => $costName,
                    'amount'           => $bill->total_amount,
                    'description'      => $bill->notes ?? "Từ phiếu vật tư " . ($bill->bill_number ?? $bill->id),
                    'cost_date'        => $bill->bill_date,
                    'status'           => $newStatus,
                    'created_by'       => $bill->created_by,
                    'management_approved_by' => $bill->management_approved_by,
                    'management_approved_at' => $bill->management_approved_at,
                    'accountant_approved_by' => $bill->accountant_approved_by,
                    'accountant_approved_at' => $bill->accountant_approved_at,
                ]);
                $created++;
            }
        }
        
        $this->info("Finished Material Bills: {$synced} synced, {$created} created.");
    }

    private function syncEquipmentAllocations($projectId = null)
    {
        $this->info('Finding Equipment Allocations (Rentals) to sync...');
        
        $query = EquipmentAllocation::where('allocation_type', 'rent');
        if ($projectId) {
            $query->where('project_id', $projectId);
        }
        
        $allocations = $query->get();
        $this->info("Processing {$allocations->count()} Equipment Rentals...");

        $synced = 0;
        $created = 0;

        foreach ($allocations as $allocation) {
            // Rentals should have an equipment_allocation_id in Costs
            $cost = Cost::where('equipment_allocation_id', $allocation->id)->first();
            
            if ($cost) {
                $cost->update([
                    'amount' => $allocation->rental_fee,
                    'status' => $allocation->status === 'active' ? 'approved' : 'draft', // Simplistic status mapping
                ]);
                $synced++;
            } else {
                $this->line("Creating missing cost for equipment rental {$allocation->id}");
                Cost::create([
                    'project_id'              => $allocation->project_id,
                    'category'                => 'equipment',
                    'equipment_allocation_id' => $allocation->id,
                    'name'                    => "Thuê thiết bị: " . ($allocation->equipment->name ?? "#{$allocation->id}"),
                    'amount'                  => $allocation->rental_fee,
                    'cost_date'               => $allocation->start_date,
                    'status'                  => $allocation->status === 'active' ? 'approved' : 'draft',
                    'created_by'              => $allocation->created_by,
                ]);
                $created++;
            }
        }
        
        $this->info("Finished Equipment Rentals: {$synced} synced, {$created} created.");
    }
}
