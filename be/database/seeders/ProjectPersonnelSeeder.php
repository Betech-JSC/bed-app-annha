<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\ProjectPersonnel;
use App\Models\User;
use Illuminate\Database\Seeder;

class ProjectPersonnelSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Gán users vào projects với các role khác nhau
     * Đảm bảo mỗi project có đầy đủ personnel để test workflow
     */
    public function run(): void
    {
        $projects = Project::all();
        
        if ($projects->isEmpty()) {
            $this->command->warn('Chưa có dự án nào. Vui lòng chạy ProjectSeeder trước.');
            return;
        }

        // Lấy users theo role
        $projectManagers = User::whereIn('email', [
            'pm1@test.com', 'pm2@test.com', 'pm3@test.com', 'pm4@test.com', 'pm5@test.com'
        ])->get();
        
        $supervisors = User::whereIn('email', [
            'supervisor1@test.com', 'supervisor2@test.com', 'supervisor3@test.com',
            'supervisor4@test.com', 'supervisor5@test.com'
        ])->get();
        
        $supervisorGuests = User::whereIn('email', [
            'supervisorguest1@test.com', 'supervisorguest2@test.com', 'supervisorguest3@test.com'
        ])->get();
        
        $accountants = User::whereIn('email', [
            'accountant1@test.com', 'accountant2@test.com', 'accountant3@test.com'
        ])->get();
        
        $management = User::whereIn('email', [
            'management1@test.com', 'management2@test.com'
        ])->get();
        
        $teamLeaders = User::whereIn('email', [
            'teamleader1@test.com', 'teamleader2@test.com', 'teamleader3@test.com',
            'teamleader4@test.com', 'teamleader5@test.com'
        ])->get();
        
        $workers = User::whereIn('email', [
            'worker1@test.com', 'worker2@test.com', 'worker3@test.com', 'worker4@test.com',
            'worker5@test.com', 'worker6@test.com', 'worker7@test.com', 'worker8@test.com',
            'worker9@test.com', 'worker10@test.com'
        ])->get();
        
        $designers = User::whereIn('email', [
            'designer1@test.com', 'designer2@test.com', 'designer3@test.com'
        ])->get();

        $superAdmin = User::where('email', 'superadmin@test.com')->first();

        $this->command->info('Đang gán personnel cho các projects...');

        foreach ($projects as $index => $project) {
            $this->command->info("Đang gán personnel cho dự án: {$project->name}");

            // Project Manager (1 user) - chỉ gán nếu user chưa là project_manager của project
            if ($project->project_manager_id) {
                $pmUser = User::find($project->project_manager_id);
                if ($pmUser) {
                    ProjectPersonnel::firstOrCreate(
                        [
                            'project_id' => $project->id,
                            'user_id' => $pmUser->id,
                        ],
                        [
                            'project_id' => $project->id,
                            'user_id' => $pmUser->id,
                            'role' => 'project_manager',
                            'permissions' => ['view', 'edit', 'approve', 'manage'],
                            'assigned_by' => $superAdmin ? $superAdmin->id : 1,
                            'assigned_at' => $project->start_date ?? now()->subMonths(1),
                        ]
                    );
                }
            }

            // Supervisors (2-3 users)
            $supervisorCount = rand(2, 3);
            $selectedSupervisors = $supervisors->random(min($supervisorCount, $supervisors->count()));
            foreach ($selectedSupervisors as $supervisor) {
                ProjectPersonnel::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'user_id' => $supervisor->id,
                    ],
                    [
                        'project_id' => $project->id,
                        'user_id' => $supervisor->id,
                        'role' => 'supervisor',
                        'permissions' => ['view', 'edit', 'approve'],
                        'assigned_by' => $superAdmin ? $superAdmin->id : 1,
                        'assigned_at' => $project->start_date ?? now()->subMonths(1),
                    ]
                );
            }

            // Supervisor Guests (1-2 users)
            $supervisorGuestCount = rand(1, 2);
            $selectedSupervisorGuests = $supervisorGuests->random(min($supervisorGuestCount, $supervisorGuests->count()));
            foreach ($selectedSupervisorGuests as $supervisorGuest) {
                ProjectPersonnel::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'user_id' => $supervisorGuest->id,
                    ],
                    [
                        'project_id' => $project->id,
                        'user_id' => $supervisorGuest->id,
                        'role' => 'supervisor_guest',
                        'permissions' => ['view', 'approve'],
                        'assigned_by' => $superAdmin ? $superAdmin->id : 1,
                        'assigned_at' => $project->start_date ?? now()->subMonths(1),
                    ]
                );
            }

            // Accountant (1 user)
            if ($accountants->isNotEmpty()) {
                $accountant = $accountants->random();
                ProjectPersonnel::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'user_id' => $accountant->id,
                    ],
                    [
                        'project_id' => $project->id,
                        'user_id' => $accountant->id,
                        'role' => 'accountant',
                        'permissions' => ['view', 'approve'],
                        'assigned_by' => $superAdmin ? $superAdmin->id : 1,
                        'assigned_at' => $project->start_date ?? now()->subMonths(1),
                    ]
                );
            }

            // Management (1 user)
            if ($management->isNotEmpty()) {
                $managementUser = $management->random();
                ProjectPersonnel::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'user_id' => $managementUser->id,
                    ],
                    [
                        'project_id' => $project->id,
                        'user_id' => $managementUser->id,
                        'role' => 'management',
                        'permissions' => ['view', 'edit', 'approve', 'manage'],
                        'assigned_by' => $superAdmin ? $superAdmin->id : 1,
                        'assigned_at' => $project->start_date ?? now()->subMonths(1),
                    ]
                );
            }

            // Team Leaders (2-3 users)
            $teamLeaderCount = rand(2, 3);
            $selectedTeamLeaders = $teamLeaders->random(min($teamLeaderCount, $teamLeaders->count()));
            foreach ($selectedTeamLeaders as $teamLeader) {
                ProjectPersonnel::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'user_id' => $teamLeader->id,
                    ],
                    [
                        'project_id' => $project->id,
                        'user_id' => $teamLeader->id,
                        'role' => 'team_leader',
                        'permissions' => ['view', 'edit'],
                        'assigned_by' => $superAdmin ? $superAdmin->id : 1,
                        'assigned_at' => $project->start_date ?? now()->subMonths(1),
                    ]
                );
            }

            // Workers (5-10 users)
            $workerCount = rand(5, 10);
            $selectedWorkers = $workers->random(min($workerCount, $workers->count()));
            foreach ($selectedWorkers as $worker) {
                ProjectPersonnel::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'user_id' => $worker->id,
                    ],
                    [
                        'project_id' => $project->id,
                        'user_id' => $worker->id,
                        'role' => 'worker',
                        'permissions' => ['view'],
                        'assigned_by' => $superAdmin ? $superAdmin->id : 1,
                        'assigned_at' => $project->start_date ?? now()->subMonths(1),
                    ]
                );
            }

            // Designers (1-2 users)
            $designerCount = rand(1, 2);
            $selectedDesigners = $designers->random(min($designerCount, $designers->count()));
            foreach ($selectedDesigners as $designer) {
                ProjectPersonnel::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'user_id' => $designer->id,
                    ],
                    [
                        'project_id' => $project->id,
                        'user_id' => $designer->id,
                        'role' => 'designer',
                        'permissions' => ['view', 'edit'],
                        'assigned_by' => $superAdmin ? $superAdmin->id : 1,
                        'assigned_at' => $project->start_date ?? now()->subMonths(1),
                    ]
                );
            }

            $this->command->info("✅ Đã gán personnel cho dự án: {$project->name}");
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã gán personnel cho ' . $projects->count() . ' dự án!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
    }
}
