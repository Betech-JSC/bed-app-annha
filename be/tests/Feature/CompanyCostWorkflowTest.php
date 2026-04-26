<?php

namespace Tests\Feature;

use App\Models\Cost;
use App\Models\CostGroup;
use App\Models\User;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class CompanyCostWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected $staff;
    protected $manager;
    protected $accountant;
    protected $costGroup;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Setup Cost Group
        $this->costGroup = CostGroup::create([
            'name' => 'Chi phí chung',
            'code' => 'GEN',
            'description' => 'Test Group'
        ]);

        // 2. Setup Permissions
        $pCreate = Permission::firstOrCreate(['name' => 'cost.create']);
        $pUpdate = Permission::firstOrCreate(['name' => 'cost.update']);
        $pSubmit = Permission::firstOrCreate(['name' => 'cost.submit']);
        $pApproveManager = Permission::firstOrCreate(['name' => 'company_cost.approve.management']);
        $pApproveAccountant = Permission::firstOrCreate(['name' => 'company_cost.approve.accountant']);
        $pReject = Permission::firstOrCreate(['name' => 'cost.reject']);
        
        // Also need view permission
        $pView = Permission::firstOrCreate(['name' => 'cost.view']);

        // 3. Create Users with Permissions
        // STAFF (Tạo & Gửi)
        $this->staff = User::factory()->create();
        $staffRole = Role::firstOrCreate(['name' => 'Staff']);
        $staffRole->permissions()->sync([$pCreate->id, $pUpdate->id, $pSubmit->id, $pView->id]);
        
        // Use roles relation directly
        $this->staff->roles()->sync([$staffRole->id]);

        // MANAGER (Duyệt BĐH)
        $this->manager = User::factory()->create();
        $managerRole = Role::firstOrCreate(['name' => 'Manager']);
        $managerRole->permissions()->sync([$pApproveManager->id, $pReject->id, $pView->id]);
        
        $this->manager->roles()->sync([$managerRole->id]);

        // ACCOUNTANT (Duyệt KT)
        $this->accountant = User::factory()->create();
        $accRole = Role::firstOrCreate(['name' => 'Accountant']);
        $accRole->permissions()->sync([$pApproveAccountant->id, $pReject->id, $pView->id]);
        
        $this->accountant->roles()->sync([$accRole->id]);
    }

    /** @test */
    public function flow_create_submit_approve_workflow()
    {
        // 1. Staff Create Cost
        $response = $this->actingAs($this->staff)->postJson('/api/company-costs', [
            'name' => 'Mua văn phòng phẩm',
            'amount' => 1000000,
            'cost_group_id' => $this->costGroup->id,
            'cost_date' => now()->toDateString(),
        ]);

        $response->assertStatus(201);
        $costId = $response->json('data.id');
        
        $this->assertDatabaseHas('costs', [
            'id' => $costId,
            'status' => 'draft'
        ]);

        // 2. Staff Submit Cost
        $response = $this->actingAs($this->staff)->postJson("/api/company-costs/{$costId}/submit");
        $response->assertStatus(200);
        
        $this->assertDatabaseHas('costs', [
            'id' => $costId,
            'status' => 'pending_management_approval'
        ]);

        // 3. Staff Cannot Update Submitted Cost
        $response = $this->actingAs($this->staff)->putJson("/api/company-costs/{$costId}", [
            'amount' => 2000000 // Try to change amount
        ]);
        $response->assertStatus(403); // Forbidden

        // 4. Manager Approve Cost
        $response = $this->actingAs($this->manager)->postJson("/api/company-costs/{$costId}/approve-management");
        $response->assertStatus(200);

        $this->assertDatabaseHas('costs', [
            'id' => $costId,
            'status' => 'pending_accountant_approval',
            'management_approved_by' => $this->manager->id
        ]);

        // 5. Accountant Approve Cost (Final)
        $response = $this->actingAs($this->accountant)->postJson("/api/company-costs/{$costId}/approve-accountant");
        $response->assertStatus(200);

        $this->assertDatabaseHas('costs', [
            'id' => $costId,
            'status' => 'approved',
            'accountant_approved_by' => $this->accountant->id
        ]);
    }

    /** @test */
    public function flow_rejection_workflow()
    {
        // Setup a pending cost
        $cost = Cost::create([
            'uuid' => (string) \Illuminate\Support\Str::uuid(),
            'name' => 'Chi phí sai',
            'amount' => 500000,
            'cost_group_id' => $this->costGroup->id,
            'cost_date' => now(),
            'status' => 'pending_management_approval',
            'created_by' => $this->staff->id
        ]);

        // Manager Rejects
        $response = $this->actingAs($this->manager)->postJson("/api/company-costs/{$cost->id}/reject", [
            'reason' => 'Sai quy định'
        ]);

        $response->assertStatus(200);

        $this->assertDatabaseHas('costs', [
            'id' => $cost->id,
            'status' => 'rejected',
            'rejected_reason' => 'Sai quy định'
        ]);

        // After rejection, Staff can update again
        $response = $this->actingAs($this->staff)->putJson("/api/company-costs/{$cost->id}", [
            'name' => 'Chi phí đã sửa', // Fix name
            'amount' => 500000,
            'cost_group_id' => $this->costGroup->id,
            'cost_date' => now()->toDateString(),
        ]);
        
        $response->assertStatus(200); // Should be allowed now
    }
}
