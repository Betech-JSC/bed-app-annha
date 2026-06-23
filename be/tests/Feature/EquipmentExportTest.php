<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Project;
use App\Models\Equipment;
use App\Models\Cost;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class EquipmentExportTest extends TestCase
{
    use DatabaseTransactions;

    public function test_can_export_company_asset_to_project()
    {
        // 1. Create acting user
        $user = User::factory()->create();
        $superAdminRole = \App\Models\Role::firstOrCreate(['name' => 'super_admin']);
        $user->roles()->sync([$superAdminRole->id]);

        // 2. Create customer and project
        $customer = User::create([
            'first_name' => 'Test',
            'last_name' => 'Customer',
            'name' => 'Test Customer',
            'email' => 'customer_' . \Illuminate\Support\Str::random(5) . '@test.com',
            'password' => bcrypt('password'),
        ]);

        $project = Project::create([
            'name' => 'Project Test Export',
            'code' => 'P-TEST-EXP',
            'status' => 'in_progress',
            'customer_id' => $customer->id,
            'created_by' => $user->id,
        ]);

        // 3. Create company asset (project_id is null)
        $equipment = Equipment::create([
            'name' => 'Máy khoan Bosch',
            'code' => 'KB-001',
            'category' => 'machinery',
            'quantity' => 10,
            'purchase_price' => 500000, // 500k
            'current_value' => 5000000,
            'status' => 'available',
            'project_id' => null,
        ]);

        // 4. Act as user with admin guard and POST to export endpoint
        $response = $this->actingAs($user, 'admin')
            ->post(route('crm.equipment.export', $equipment->id), [
                'project_id' => $project->id,
                'quantity' => 4, // export 4 items
                'notes' => 'Test export notes',
            ]);

        // 5. Assert redirect back
        $response->assertStatus(302);

        // 6. Assert asset split occurred:
        // - Source asset has quantity decremented: 10 - 4 = 6
        $this->assertEquals(6, $equipment->fresh()->quantity);
        $this->assertEquals(3000000, (int)$equipment->fresh()->current_value);

        // - New asset created for the project:
        $newEquipment = Equipment::where('project_id', $project->id)->first();
        $this->assertNotNull($newEquipment);
        $this->assertEquals('Máy khoan Bosch', $newEquipment->name);
        $this->assertEquals(4, $newEquipment->quantity);
        $this->assertEquals('available', $newEquipment->status);

        // 7. Assert 2 cost records were created:
        // - Negative cost for Company
        $companyCost = Cost::whereNull('project_id')
            ->where('amount', -2000000)
            ->first();
        $this->assertNotNull($companyCost);
        $this->assertStringContainsString('Xuất tài sản cty', $companyCost->name);

        // - Positive cost for Project
        $projectCost = Cost::where('project_id', $project->id)
            ->where('amount', 2000000)
            ->first();
        $this->assertNotNull($projectCost);
        $this->assertStringContainsString('Nhận tài sản từ cty', $projectCost->name);
    }

    public function test_usage_workflow_bypasses_management_approval()
    {
        // 1. Create acting user with super_admin role
        $user = User::factory()->create();
        $superAdminRole = \App\Models\Role::firstOrCreate(['name' => 'super_admin']);
        $user->roles()->sync([$superAdminRole->id]);

        // 2. Create customer and project
        $customer = User::create([
            'first_name' => 'Test',
            'last_name' => 'Customer',
            'name' => 'Test Customer',
            'email' => 'customer_' . \Illuminate\Support\Str::random(5) . '@test.com',
            'password' => bcrypt('password'),
        ]);

        $project = Project::create([
            'name' => 'Project Test Usage',
            'code' => 'P-TEST-USG',
            'status' => 'in_progress',
            'customer_id' => $customer->id,
            'created_by' => $user->id,
        ]);

        // 3. Create equipment
        $equipment = Equipment::create([
            'name' => 'Máy khoan Bosch',
            'code' => 'KB-002',
            'category' => 'machinery',
            'quantity' => 10,
            'purchase_price' => 500000,
            'current_value' => 5000000,
            'status' => 'available',
        ]);

        // 4. Create AssetUsage (draft)
        $usage = \App\Models\AssetUsage::create([
            'project_id' => $project->id,
            'equipment_id' => $equipment->id,
            'quantity' => 2,
            'status' => 'draft',
            'receiver_id' => $user->id,
            'received_date' => now()->toDateString(),
            'created_by' => $user->id,
        ]);

        // 5. POST to submit route
        $response = $this->actingAs($user, 'admin')
            ->post(route('crm.projects.asset-usages.submit', [$project->id, $usage->id]));

        // 6. Assert redirect and correct direct status change to pending_accountant
        $response->assertStatus(302);
        $this->assertEquals('pending_accountant', $usage->fresh()->status);
    }
}

