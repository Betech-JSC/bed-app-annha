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
        \App\Models\CostGroup::firstOrCreate(['id' => 5], [
            'name' => 'Nhà thầu phụ',
            'code' => 'subcontractor',
        ]);
        \App\Models\CostGroup::firstOrCreate(['id' => 6], [
            'name' => 'Thuê thiết bị',
            'code' => 'equipment_rental',
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
        $this->assertEquals('capex', $cost->expense_category);

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

    public function test_equipment_rental_sync_sets_opex()
    {
        $rental = \App\Models\EquipmentRental::create([
            'project_id' => $this->project->id,
            'equipment_name' => 'Máy xúc Komatsu',
            'quantity' => 1,
            'unit_price' => 5000000,
            'total_cost' => 5000000,
            'rental_start_date' => now()->toDateString(),
            'rental_end_date' => now()->addDays(5)->toDateString(),
            'status' => 'in_use',
            'created_by' => $this->user->id,
        ]);

        $rental->syncToCostTable();

        $cost = Cost::where('equipment_rental_id', $rental->id)->first();
        $this->assertNotNull($cost);
        $this->assertEquals('opex', $cost->expense_category);
    }

    public function test_subcontractor_payment_sync_sets_opex()
    {
        $subcontractor = \App\Models\Subcontractor::create([
            'project_id' => $this->project->id,
            'name' => 'NTP Xây dựng Toàn Cầu',
            'total_quote' => 10000000,
        ]);

        $payment = \App\Models\SubcontractorPayment::create([
            'project_id' => $this->project->id,
            'subcontractor_id' => $subcontractor->id,
            'payment_stage' => 'Đợt 1',
            'amount' => 5000000,
            'payment_date' => now()->toDateString(),
            'status' => 'paid',
            'created_by' => $this->user->id,
        ]);

        $payment->syncToCostTable();

        $cost = Cost::where('subcontractor_payment_id', $payment->id)->first();
        $this->assertNotNull($cost);
        $this->assertEquals('opex', $cost->expense_category);
    }

    public function test_additional_cost_sync_sets_opex()
    {
        $additional = \App\Models\AdditionalCost::create([
            'project_id' => $this->project->id,
            'description' => 'Gia cố móng thêm thép',
            'amount' => 3000000,
            'status' => 'approved',
            'proposed_by' => $this->user->id,
        ]);

        $additional->syncToCostTable();

        $cost = Cost::where('additional_cost_id', $additional->id)->first();
        $this->assertNotNull($cost);
        $this->assertEquals('opex', $cost->expense_category);
    }

    public function test_creating_equipment_purchase_with_expense_category_syncs_to_cost()
    {
        $this->actingAs($this->user, 'admin');

        $payload = [
            'project_id' => $this->project->id,
            'supplier_id' => \App\Models\Supplier::create(['name' => 'Supplier Test'])->id,
            'purchase_date' => now()->toDateString(),
            'expense_category' => 'opex',
            'notes' => 'Test purchasing with opex',
            'items' => [
                [
                    'name' => 'Bóng đèn Philips',
                    'code' => 'BD-01',
                    'quantity' => 10,
                    'unit_price' => 50000,
                ]
            ]
        ];

        $response = $this->post('/equipment?tab=approvals', $payload);
        $response->assertStatus(302);

        $purchase = EquipmentPurchase::latest('id')->first();
        $this->assertNotNull($purchase);
        $this->assertEquals('opex', $purchase->expense_category);

        $cost = Cost::where('equipment_purchase_id', $purchase->id)->first();
        $this->assertNotNull($cost);
        $this->assertEquals('opex', $cost->expense_category);
    }

    public function test_updating_equipment_purchase_with_expense_category_syncs_to_cost()
    {
        $this->actingAs($this->user, 'admin');

        $purchase = EquipmentPurchase::create([
            'project_id'    => $this->project->id,
            'supplier_id'   => \App\Models\Supplier::create(['name' => 'Supplier Test'])->id,
            'purchase_date' => now()->toDateString(),
            'total_amount'  => 500000,
            'expense_category' => 'capex',
            'status'        => 'draft',
            'created_by'    => $this->user->id,
        ]);

        $item = EquipmentPurchaseItem::create([
            'purchase_id' => $purchase->id,
            'name' => 'Bóng đèn Philips',
            'quantity' => 10,
            'unit_price' => 50000,
            'total_price' => 500000,
        ]);

        $payload = [
            'project_id' => $this->project->id,
            'supplier_id' => $purchase->supplier_id,
            'purchase_date' => now()->toDateString(),
            'expense_category' => 'opex',
            'notes' => 'Updated notes',
            'items' => [
                [
                    'id' => $item->id,
                    'name' => 'Bóng đèn Philips',
                    'code' => 'BD-01',
                    'quantity' => 10,
                    'unit_price' => 50000,
                ]
            ]
        ];

        $response = $this->put("/equipment/{$purchase->id}?tab=approvals", $payload);
        $response->assertStatus(302);

        $purchase->refresh();
        $this->assertEquals('opex', $purchase->expense_category);

        $cost = Cost::where('equipment_purchase_id', $purchase->id)->first();
        $this->assertNotNull($cost);
        $this->assertEquals('opex', $cost->expense_category);
    }

    public function test_reverting_completed_purchase_reverts_cost_and_deletes_imported_equipment()
    {
        $this->actingAs($this->user, 'admin');

        // Create completed purchase
        $purchase = EquipmentPurchase::create([
            'project_id'    => $this->project->id,
            'supplier_id'   => \App\Models\Supplier::create(['name' => 'Supplier Test'])->id,
            'purchase_date' => now()->toDateString(),
            'total_amount'  => 500000,
            'expense_category' => 'capex',
            'status'        => 'completed',
            'created_by'    => $this->user->id,
        ]);

        $item = EquipmentPurchaseItem::create([
            'purchase_id' => $purchase->id,
            'name' => 'Bóng đèn Philips',
            'quantity' => 10,
            'unit_price' => 50000,
            'total_price' => 500000,
        ]);

        $purchase->syncToCostTable();

        // Create imported inventory Equipment record
        $equipment = Equipment::create([
            'name'            => $item->name,
            'code'            => 'EP-TEST-REVERT',
            'category'        => 'purchased',
            'quantity'        => $item->quantity,
            'purchase_price'  => $item->unit_price,
            'current_value'   => $item->unit_price * $item->quantity,
            'status'          => 'available',
            'notes'           => "Nhập từ phiếu mua #{$purchase->id} - DA: " . $this->project->name,
            'project_id'      => $this->project->id,
            'supplier_id'     => $purchase->supplier_id,
            'purchase_date'   => $purchase->purchase_date,
        ]);

        // Verify cost and equipment exist
        $this->assertNotNull(Cost::where('equipment_purchase_id', $purchase->id)->first());
        $this->assertNotNull(Equipment::find($equipment->id));

        // Revert it
        $response = $this->post("/equipment/{$purchase->id}/revert");
        $response->assertStatus(302);

        $purchase->refresh();
        $this->assertEquals('draft', $purchase->status);
        
        // Synced cost must be draft
        $cost = Cost::where('equipment_purchase_id', $purchase->id)->first();
        $this->assertNotNull($cost);
        $this->assertEquals('draft', $cost->status);

        // Imported equipment must be deleted
        $this->assertNull(Equipment::find($equipment->id));
    }
}
