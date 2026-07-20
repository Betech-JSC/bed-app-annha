<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\Acceptance;
use App\Models\User;
use Illuminate\Support\Str;

class WbsAcceptanceTest extends TestCase
{
    use DatabaseTransactions;

    protected $admin;
    protected $project;
    protected $supervisor;
    protected $customer;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create Admin User (owner = true gives super-user access bypasses permissions)
        $this->admin = User::create([
            'first_name' => 'WBS',
            'last_name' => 'Tester',
            'name' => 'WBS Tester',
            'email' => 'wbstester_' . uniqid() . '@test.com',
            'password' => bcrypt('password'),
            'owner' => true,
        ]);

        // 2. Create User accounts for approvals (Supervisor & Customer)
        $this->supervisor = User::create([
            'name' => 'Supervisor User',
            'email' => 'supervisor_' . uniqid() . '@test.com',
            'password' => bcrypt('password'),
        ]);

        $this->customer = User::create([
            'name' => 'Customer User',
            'email' => 'customer_' . uniqid() . '@test.com',
            'password' => bcrypt('password'),
        ]);

        // 3. Create Project
        $this->project = Project::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'WBS Test Project',
            'code' => 'PRJ-WBS',
            'status' => 'in_progress',
            'customer_id' => $this->customer->id,
            'created_by' => $this->admin->id,
        ]);

        // 4. Create ProjectProgress
        \App\Models\ProjectProgress::create([
            'project_id' => $this->project->id,
            'overall_percentage' => 0.0,
            'calculated_from' => 'tasks',
        ]);
    }

    /** @test */
    public function wbs_acceptance_workflow_executes_correctly()
    {
        // 1. Create WBS Tasks: Parent -> Child 1 & Child 2
        $parentTask = ProjectTask::create([
            'project_id' => $this->project->id,
            'name' => 'Work Stage A',
            'progress_percentage' => 0.0,
            'status' => 'not_started',
            'created_by' => $this->admin->id,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(10)->toDateString(),
        ]);

        $child1 = ProjectTask::create([
            'project_id' => $this->project->id,
            'parent_id' => $parentTask->id,
            'name' => 'Excavation',
            'progress_percentage' => 0.0,
            'status' => 'not_started',
            'created_by' => $this->admin->id,
            'start_date' => now()->toDateString(),
            'end_date' => now()->addDays(5)->toDateString(),
        ]);

        $child2 = ProjectTask::create([
            'project_id' => $this->project->id,
            'parent_id' => $parentTask->id,
            'name' => 'Concrete Pouring',
            'progress_percentage' => 0.0,
            'status' => 'not_started',
            'created_by' => $this->admin->id,
            'start_date' => now()->addDays(6)->toDateString(),
            'end_date' => now()->addDays(10)->toDateString(),
        ]);

        $progressService = app(\App\Services\TaskProgressService::class);
        $acceptanceService = app(\App\Services\AcceptanceService::class);

        // 2. Set progress of Child 1 to 100% and call updateTaskFromLogs
        // (This simulates manual update / construction log approval)
        $child1->forceFill([
            'progress_percentage' => 100.0,
        ])->save();

        $progressService->updateTaskFromLogs($child1, true);

        // Verify Child 1 acceptance is automatically created and submitted
        $child1Acceptance = Acceptance::where('task_id', $child1->id)->first();
        $this->assertNotNull($child1Acceptance);
        $this->assertEquals('submitted', $child1Acceptance->workflow_status);
        $this->assertEquals('pending_acceptance', $child1->fresh()->status);

        // Verify parent progress is 50% (average of Child 1 = 100%, Child 2 = 0%)
        // and parent is NOT pushed to acceptance yet
        $parentTask = $parentTask->fresh();
        $this->assertEquals(50.0, $parentTask->progress_percentage);
        $this->assertEquals('in_progress', $parentTask->status);
        $this->assertNull(Acceptance::where('task_id', $parentTask->id)->first());

        // 3. Supervisor approves Child 1 (Level 1)
        // Child task acceptance should directly transition to 'customer_approved'
        $acceptanceService->approve($child1Acceptance, $this->supervisor, 1);
        
        $child1Acceptance = $child1Acceptance->fresh();
        $this->assertEquals('customer_approved', $child1Acceptance->workflow_status);
        $this->assertEquals($this->supervisor->id, $child1Acceptance->supervisor_approved_by);
        $this->assertEquals($this->supervisor->id, $child1Acceptance->customer_approved_by);

        // Child 1 task status should be 'completed'
        $this->assertEquals('completed', $child1->fresh()->status);

        // 4. Set progress of Child 2 to 100% and updateTaskFromLogs
        $child2->forceFill([
            'progress_percentage' => 100.0,
        ])->save();

        $progressService->updateTaskFromLogs($child2, true);

        $child2Acceptance = Acceptance::where('task_id', $child2->id)->first();
        $this->assertNotNull($child2Acceptance);
        $this->assertEquals('submitted', $child2Acceptance->workflow_status);

        // Supervisor approves Child 2 (Level 1)
        $acceptanceService->approve($child2Acceptance, $this->supervisor, 1);

        $child2Acceptance = $child2Acceptance->fresh();
        $this->assertEquals('customer_approved', $child2Acceptance->workflow_status);
        $this->assertEquals('completed', $child2->fresh()->status);

        // 5. Verify Parent Task progress is now 100%
        // And since all child tasks are completed, the parent task itself is pushed to Acceptance
        $parentTask = $parentTask->fresh();
        $this->assertEquals(100.0, $parentTask->progress_percentage);
        $this->assertEquals('pending_acceptance', $parentTask->status);

        $parentAcceptance = Acceptance::where('task_id', $parentTask->id)->first();
        $this->assertNotNull($parentAcceptance);
        $this->assertEquals('submitted', $parentAcceptance->workflow_status);

        // 6. Supervisor approves Parent Task (Level 1)
        // Parent task acceptance should move to 'supervisor_approved' (still waiting for KH)
        $acceptanceService->approve($parentAcceptance, $this->supervisor, 1);

        $parentAcceptance = $parentAcceptance->fresh();
        $this->assertEquals('supervisor_approved', $parentAcceptance->workflow_status);
        $this->assertEquals('pending_acceptance', $parentTask->fresh()->status);

        // 7. Customer approves Parent Task (Level 3)
        // Parent task acceptance should move to 'customer_approved' and parent task becomes 'completed'
        $acceptanceService->approve($parentAcceptance, $this->customer, 3);

        $parentAcceptance = $parentAcceptance->fresh();
        $this->assertEquals('customer_approved', $parentAcceptance->workflow_status);
        $this->assertEquals($this->customer->id, $parentAcceptance->customer_approved_by);
        $this->assertEquals('completed', $parentTask->fresh()->status);
    }
}
