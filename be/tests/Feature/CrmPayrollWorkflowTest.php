<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use App\Models\User;
use App\Models\Role;
use App\Models\Project;
use App\Models\Payroll;
use App\Models\Cost;
use App\Models\CostGroup;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CrmPayrollWorkflowTest extends TestCase
{
    use DatabaseTransactions;

    protected User $adminUser;
    protected User $employee;
    protected Project $project;
    protected CostGroup $costGroup;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create a Super Admin role and user
        $superAdminRole = Role::firstOrCreate(['name' => 'super_admin']);
        
        $this->adminUser = User::create([
            'first_name' => 'Super',
            'last_name' => 'Admin',
            'name' => 'Super Admin',
            'email' => 'super_admin_payroll_' . Str::random(5) . '@test.com',
            'password' => bcrypt('password'),
        ]);
        
        $this->adminUser->roles()->sync([$superAdminRole->id]);

        // 2. Create an Employee (User)
        $this->employee = User::create([
            'first_name' => 'Nguyen',
            'last_name' => 'Employee',
            'name' => 'Nguyen Van Employee',
            'email' => 'employee_' . Str::random(5) . '@test.com',
            'password' => bcrypt('password'),
        ]);

        // Create a Customer (User)
        $customer = User::create([
            'first_name' => 'Test',
            'last_name' => 'Customer',
            'name' => 'Test Customer',
            'email' => 'customer_' . Str::random(5) . '@test.com',
            'password' => bcrypt('password'),
        ]);

        // 3. Create a Project
        $this->project = Project::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Công trình test lương',
            'code' => 'PRJ-' . strtoupper(Str::random(5)),
            'status' => 'in_progress',
            'customer_id' => $customer->id,
            'created_by' => $this->adminUser->id,
        ]);

        // 4. Create Cost Group for labor (NC - Nhân công)
        $this->costGroup = CostGroup::firstOrCreate(
            ['code' => 'NC'],
            [
                'name' => 'Nhân công',
                'description' => 'Chi phí nhân công',
                'is_active' => true,
            ]
        );
    }

    /** @test */
    public function it_can_go_through_full_payroll_lifecycle()
    {
        Storage::fake('public');

        // Step 1: Create a Draft Payroll
        $payrollData = [
            'user_id' => $this->employee->id,
            'project_id' => $this->project->id,
            'period_type' => 'monthly',
            'period_start' => '2026-06-01',
            'period_end' => '2026-06-30',
            'base_salary' => 15000000,
            'bonus_amount' => 2000000,
            'allowance_amount' => 1000000,
            'deductions' => 500000,
            'notes' => 'Tính lương tháng 6/2026',
        ];

        $response = $this->actingAs($this->adminUser, 'admin')
            ->post('/hr/payrolls', $payrollData);



        $response->assertStatus(302);
        
        $payroll = Payroll::where('user_id', $this->employee->id)->firstOrFail();
        $this->assertEquals('draft', $payroll->status);
        $this->assertEquals(15000000 + 2000000 + 1000000 - 500000, $payroll->net_salary);

        // Assert cost is synchronized in draft
        $this->assertDatabaseHas('costs', [
            'payroll_id' => $payroll->id,
            'status' => 'draft',
            'amount' => $payroll->net_salary,
            'category' => 'labor',
            'expense_category' => 'payroll',
        ]);

        // Step 2: Submit for BHD Approval
        $response = $this->actingAs($this->adminUser, 'admin')
            ->post("/hr/payrolls/{$payroll->id}/submit");

        $response->assertStatus(302);
        $this->assertEquals('pending_management', $payroll->fresh()->status);

        // Assert cost status updated
        $this->assertDatabaseHas('costs', [
            'payroll_id' => $payroll->id,
            'status' => 'pending_management_approval',
        ]);

        // Step 3: Approve by Management (BHD)
        $response = $this->actingAs($this->adminUser, 'admin')
            ->post("/approvals/payroll/{$payroll->id}/approve");

        $response->assertStatus(302);
        $this->assertEquals('pending_accountant', $payroll->fresh()->status);

        // Assert cost status updated
        $this->assertDatabaseHas('costs', [
            'payroll_id' => $payroll->id,
            'status' => 'pending_accountant_approval',
        ]);

        // Step 4: Confirm by Accountant (with payment proof upload)
        $proofFile = UploadedFile::fake()->create('proof.pdf', 150);
        $response = $this->actingAs($this->adminUser, 'admin')
            ->post("/approvals/payroll/{$payroll->id}/approve", [
                'files' => [$proofFile],
            ]);

        $response->assertStatus(302);
        
        $payroll = $payroll->fresh();
        $this->assertEquals('approved', $payroll->status);
        $this->assertNotNull($payroll->accountant_approved_by);
        $this->assertCount(1, $payroll->attachments);

        // Assert cost status synced to approved
        $this->assertDatabaseHas('costs', [
            'payroll_id' => $payroll->id,
            'status' => 'approved',
            'amount' => $payroll->net_salary,
        ]);
    }

    /** @test */
    public function it_can_reject_payroll_and_resubmit()
    {
        // Setup a payroll waiting for BHD approval
        $payroll = Payroll::create([
            'uuid' => (string) Str::uuid(),
            'user_id' => $this->employee->id,
            'project_id' => $this->project->id,
            'period_type' => 'monthly',
            'period_start' => '2026-06-01',
            'period_end' => '2026-06-30',
            'base_salary' => 10000000,
            'net_salary' => 10000000,
            'status' => 'pending_management',
        ]);

        // Reject by BHD
        $response = $this->actingAs($this->adminUser, 'admin')
            ->post("/approvals/payroll/{$payroll->id}/reject", [
                'reason' => 'Sai số liệu cơ bản',
            ]);

        $response->assertStatus(302);
        $payroll = $payroll->fresh();
        $this->assertEquals('rejected', $payroll->status);
        $this->assertEquals('Sai số liệu cơ bản', $payroll->rejected_reason);

        // Update / Fix the payroll
        $updateData = [
            'user_id' => $this->employee->id,
            'project_id' => $this->project->id,
            'period_type' => 'monthly',
            'period_start' => '2026-06-01',
            'period_end' => '2026-06-30',
            'base_salary' => 12000000,
            'notes' => 'Đã sửa số liệu',
        ];

        $response = $this->actingAs($this->adminUser, 'admin')
            ->put("/hr/payrolls/{$payroll->id}", $updateData);

        $response->assertStatus(302);
        $payroll = $payroll->fresh();
        $this->assertEquals('draft', $payroll->status);
        $this->assertEquals(12000000, $payroll->net_salary);
    }
}
