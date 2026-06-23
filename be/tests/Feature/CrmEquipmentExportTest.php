<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Project;
use App\Models\Equipment;
use App\Models\Cost;
use App\Models\CostGroup;
use App\Models\ProjectBudget;
use App\Models\BudgetItem;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class CrmEquipmentExportTest extends TestCase
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
            'email' => 'customer_export_' . \Illuminate\Support\Str::random(5) . '@test.com',
            'password' => bcrypt('password'),
        ]);

        $this->project = Project::create([
            'name' => 'Project Target Export',
            'code' => 'P-TARGET-EXPORT',
            'status' => 'in_progress',
            'customer_id' => $customer->id,
            'created_by' => $this->user->id,
        ]);

        // Seed cost groups
        CostGroup::firstOrCreate(['id' => 1], [
            'name' => 'Thiết bị & máy móc',
            'code' => 'TBMM',
        ]);
        CostGroup::firstOrCreate(['id' => 4], [
            'name' => 'Thiết bị',
            'code' => 'equipment',
        ]);
    }

    public function test_export_company_asset_to_project_creates_ledger_costs_and_syncs_budget()
    {
        // 1. Create a Company Asset (project_id = null, status = available)
        $equipment = Equipment::create([
            'name'           => 'Máy trộn bê tông công nghiệp',
            'code'           => 'EQ-COMP-01',
            'category'       => 'machinery',
            'quantity'       => 5,
            'purchase_price' => 10000000,
            'current_value'  => 50000000,
            'status'         => 'available',
            'project_id'     => null, // Company asset
        ]);

        // Create an approved project budget & item to verify budget sync
        $budget = ProjectBudget::create([
            'project_id' => $this->project->id,
            'name' => 'Budget 2026',
            'status' => 'approved',
            'total_budget' => 100000000,
            'budget_date' => now()->toDateString(),
        ]);

        $budgetItem = BudgetItem::create([
            'budget_id' => $budget->id,
            'name' => 'Thiết bị thi công',
            'cost_group_id' => 1, // Match resolved cost group (ID 1)
            'estimated_amount' => 50000000,
            'actual_amount' => 0,
        ]);

        // 2. Perform export of 2 units (out of 5)
        $exportQty = 2;
        $exportValue = $equipment->purchase_price * $exportQty; // 20,000,000

        $response = $this->actingAs($this->user, 'admin')
            ->post("/equipment/{$equipment->id}/export", [
                'project_id'  => $this->project->id,
                'quantity'    => $exportQty,
                'export_date' => now()->toDateString(),
                'notes'       => 'Xuất bàn giao 2 máy sang dự án.',
            ]);

        $response->assertRedirect();
        
        // 3. Verify original equipment quantity decremented
        $equipment->refresh();
        $this->assertEquals(3, $equipment->quantity);
        $this->assertEquals(30000000, $equipment->current_value);

        // 4. Verify new project equipment created
        $projectEquipment = Equipment::where('project_id', $this->project->id)->first();
        $this->assertNotNull($projectEquipment);
        $this->assertEquals(2, $projectEquipment->quantity);
        $this->assertEquals('available', $projectEquipment->status);

        // 5. Verify Company Negative Cost Created
        $negativeCost = Cost::whereNull('project_id')
            ->where('amount', -$exportValue)
            ->first();
        $this->assertNotNull($negativeCost);
        $this->assertEquals('approved', $negativeCost->status);
        $this->assertEquals('capex', $negativeCost->expense_category);

        // 6. Verify Project Positive Cost Created
        $positiveCost = Cost::where('project_id', $this->project->id)
            ->where('amount', $exportValue)
            ->first();
        $this->assertNotNull($positiveCost);
        $this->assertEquals('approved', $positiveCost->status);
        $this->assertEquals('capex', $positiveCost->expense_category);

        // 7. Verify budget sync updated actual amount
        $budgetItem->refresh();
        $this->assertEquals($exportValue, (float) $budgetItem->actual_amount);
    }
}
