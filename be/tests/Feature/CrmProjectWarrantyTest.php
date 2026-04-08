<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\Admin;
use App\Models\Project;
use App\Models\ProjectWarranty;
use App\Models\ProjectMaintenance;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CrmProjectWarrantyTest extends TestCase
{
    use \Illuminate\Foundation\Testing\DatabaseTransactions;

    protected $admin;
    protected $project;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Manual creation since no factories
        $this->admin = Admin::create([
            'first_name' => 'Test',
            'last_name' => 'Admin',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
            'super_admin' => true,
        ]);

        $this->project = Project::create([
            'uuid' => (string) Str::uuid(),
            'name' => 'Test Project',
            'code' => 'PRJ-TEST',
            'status' => 'in_progress',
        ]);
    }

    /** @test */
    public function it_can_create_a_project_warranty()
    {
        Storage::fake('public');

        $data = [
            'handover_date' => now()->format('Y-m-d'),
            'warranty_start_date' => now()->format('Y-m-d'),
            'warranty_end_date' => now()->addYear()->format('Y-m-d'),
            'warranty_content' => 'Full package warranty',
            'files' => [
                UploadedFile::fake()->create('warranty_cert.pdf', 100),
            ],
        ];

        $response = $this->actingAs($this->admin, 'admin')
            ->post(route('crm.projects.warranties.store', $this->project->id), $data);

        $response->assertStatus(302);
        $this->assertDatabaseHas('project_warranties', [
            'project_id' => $this->project->id,
            'warranty_content' => 'Full package warranty',
            'status' => 'draft',
        ]);
    }

    /** @test */
    public function it_can_approve_a_warranty()
    {
        $warranty = ProjectWarranty::create([
            'uuid' => (string) Str::uuid(),
            'project_id' => $this->project->id,
            'handover_date' => now()->format('Y-m-d'),
            'warranty_start_date' => now()->format('Y-m-d'),
            'warranty_end_date' => now()->addYear()->format('Y-m-d'),
            'warranty_content' => 'Test content',
            'status' => 'draft',
        ]);

        $response = $this->actingAs($this->admin, 'admin')
            ->post(route('crm.projects.warranties.approve', [$this->project->id, $warranty->uuid]));

        $response->assertStatus(302);
        $this->assertEquals('approved', $warranty->fresh()->status);
    }

    /** @test */
    public function it_can_create_maintenance_log()
    {
        Storage::fake('public');

        $data = [
            'maintenance_date' => now()->format('Y-m-d'),
            'notes' => 'Routine checkup',
            'files' => [
                UploadedFile::fake()->image('maintenance_photo.jpg'),
            ],
        ];

        $response = $this->actingAs($this->admin, 'admin')
            ->post(route('crm.projects.maintenances.store', $this->project->id), $data);

        $response->assertStatus(302);
        
        // Maintenance date + 6 months
        $expectedNextDate = now()->addMonths(6)->format('Y-m-d');
        
        $this->assertDatabaseHas('project_maintenances', [
            'project_id' => $this->project->id,
            'notes' => 'Routine checkup',
            'next_maintenance_date' => $expectedNextDate,
        ]);
    }
}
