<?php
 
namespace Tests\Feature;

use App\Models\User;
use App\Models\Project;
use App\Models\Equipment;
use App\Models\EquipmentPurchase;
use App\Models\EquipmentPurchaseItem;
use App\Models\Cost;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class CostEquipmentSyncTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;
    protected Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $superAdminRole = \App\Models\Role::firstOrCreate(['name' => 'super_admin']);
        $this->user->roles()->sync([$superAdminRole->id]);

        $customer = User::create([
            'first_name' => 'Test',
            'last_name' => 'Customer',
            'name' => 'Test Customer',
            'email' => 'customer_sync_' . \Illuminate\Support\Str::random(5) . '@test.com',
            'password' => bcrypt('password'),
        ]);

        $this->project = Project::create([
            'name' => 'Project Test Sync',
            'code' => 'P-TEST-SYNC',
            'status' => 'in_progress',
            'customer_id' => $customer->id,
            'created_by' => $this->user->id,
        ]);

        // Seed cost groups to satisfy foreign keys
        \App\Models\CostGroup::firstOrCreate(['id' => 1], [
            'name' => 'Thiết bị & máy móc',
            'code' => 'TBMM',
        ]);
        \App\Models\CostGroup::firstOrCreate(['id' => 4], [
            'name' => 'Thiết bị',
            'code' => 'equipment',
        ]);
    }

    public function test_deleting_cost_deletes_linked_equipment_purchase()
    {
        // 1. Create Equipment Purchase
        $purchase = EquipmentPurchase::create([
            'project_id'    => $this->project->id,
            'purchase_date' => now()->toDateString(),
            'total_amount'  => 1000000,
            'status'        => 'pending_accountant',
            'created_by'    => $this->user->id,
        ]);

        // 2. Add an item
        EquipmentPurchaseItem::create([
            'purchase_id' => $purchase->id,
            'name'        => 'Thước đo laser',
            'quantity'    => 2,
            'unit_price'  => 500000,
            'total_price' => 1000000,
        ]);

        // Trigger cost sync (simulate standard model events)
        $purchase->syncToCostTable();

        // Verify Cost was created and linked
        $cost = Cost::where('equipment_purchase_id', $purchase->id)->first();
        $this->assertNotNull($cost);

        // 3. Delete the Cost
        $cost->delete();

        // Verify EquipmentPurchase was deleted
        $this->assertNull(EquipmentPurchase::find($purchase->id));
    }

    public function test_deleting_purchase_deletes_cost_and_imported_equipment()
    {
        // 1. Create Equipment Purchase
        $purchase = EquipmentPurchase::create([
            'project_id'    => $this->project->id,
            'purchase_date' => now()->toDateString(),
            'total_amount'  => 1500000,
            'status'        => 'pending_accountant',
            'created_by'    => $this->user->id,
        ]);

        // 2. Add an item
        $item = EquipmentPurchaseItem::create([
            'purchase_id' => $purchase->id,
            'name'        => 'Máy cắt sắt Bosch',
            'quantity'    => 1,
            'unit_price'  => 1500000,
            'total_price' => 1500000,
        ]);

        $purchase->syncToCostTable();

        // Verify Cost exists
        $cost = Cost::where('equipment_purchase_id', $purchase->id)->first();
        $this->assertNotNull($cost);

        // 3. Create/Import Equipment (Simulate confirmed purchase)
        $equipment = Equipment::create([
            'name'           => $item->name,
            'code'           => 'EQ-SYNC-01',
            'category'       => 'machinery',
            'quantity'       => $item->quantity,
            'purchase_price' => $item->unit_price,
            'current_value'  => $item->unit_price * $item->quantity,
            'status'         => 'available',
            'notes'          => "Nhập từ phiếu mua #{$purchase->id} - DA: " . $this->project->name,
            'project_id'     => $this->project->id,
        ]);

        $this->assertNotNull(Equipment::find($equipment->id));

        // 4. Delete the Purchase Voucher
        $purchase->delete();

        // Verify Cost and Equipment are both deleted
        $this->assertNull(Cost::where('equipment_purchase_id', $purchase->id)->first());
        $this->assertNull(Equipment::find($equipment->id));
    }

    public function test_deleting_equipment_deletes_linked_cost()
    {
        // 1. Create Equipment directly
        $equipment = Equipment::create([
            'name'           => 'Máy hàn Hồng Ký',
            'code'           => 'EQ-SYNC-02',
            'category'       => 'machinery',
            'quantity'       => 1,
            'purchase_price' => 2000000,
            'current_value'  => 2000000,
            'status'         => 'available',
            'project_id'     => $this->project->id,
        ]);

        // Simulate cost auto-creation in EquipmentService
        $cost = Cost::create([
            'equipment_id'  => $equipment->id,
            'project_id'    => $this->project->id,
            'name'          => "Mua thiết bị: " . $equipment->name,
            'amount'        => 2000000,
            'cost_group_id' => 1,
            'cost_date'     => now(),
            'status'        => 'approved',
        ]);

        // Verify cost exists
        $this->assertNotNull(Cost::where('equipment_id', $equipment->id)->first());

        // 2. Delete the Equipment
        $equipment->delete();

        // Verify Cost is deleted
        $this->assertNull(Cost::where('equipment_id', $equipment->id)->first());
    }
}
