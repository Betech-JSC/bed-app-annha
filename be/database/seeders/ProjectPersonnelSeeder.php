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
            'pm1@test.com',
            'pm2@test.com',
            'pm3@test.com',
            'pm4@test.com',
            'pm5@test.com'
        ])->get();

        $supervisors = User::whereIn('email', [
            'supervisor1@test.com',
            'supervisor2@test.com',
            'supervisor3@test.com',
            'supervisor4@test.com',
            'supervisor5@test.com'
        ])->get();

        $supervisorGuests = User::whereIn('email', [
            'supervisorguest1@test.com',
            'supervisorguest2@test.com',
            'supervisorguest3@test.com'
        ])->get();

        $accountants = User::whereIn('email', [
            'accountant1@test.com',
            'accountant2@test.com',
            'accountant3@test.com'
        ])->get();

        $management = User::whereIn('email', [
            'management1@test.com',
            'management2@test.com'
        ])->get();

        $teamLeaders = User::whereIn('email', [
            'teamleader1@test.com',
            'teamleader2@test.com',
            'teamleader3@test.com',
            'teamleader4@test.com',
            'teamleader5@test.com'
        ])->get();

        $workers = User::whereIn('email', [
            'worker1@test.com',
            'worker2@test.com',
            'worker3@test.com',
            'worker4@test.com',
            'worker5@test.com',
            'worker6@test.com',
            'worker7@test.com',
            'worker8@test.com',
            'worker9@test.com',
            'worker10@test.com'
        ])->get();

        $designers = User::whereIn('email', [
            'designer1@test.com',
            'designer2@test.com',
            'designer3@test.com'
        ])->get();

        $superAdmin = User::where('email', 'superadmin@test.com')->first();

        $this->command->info('Đang gán personnel vào các dự án...');

        // Lấy danh sách personnel roles để map code -> id
        $roles = \App\Models\PersonnelRole::all()->pluck('id', 'code');

        foreach ($projects as $project) {
            // 1. Assign Project Manager (1 PM per project)
            $pm = $projectManagers->random();
            ProjectPersonnel::firstOrCreate([
                'project_id' => $project->id,
                'user_id' => $pm->id,
            ], [
                'role_id' => $roles['project_manager'] ?? null,
                'permissions' => ['*'], // PM has full access within project
                'assigned_by' => $superAdmin->id ?? $pm->id,
                'assigned_at' => now(),
            ]);

            // 2. Assign Site Supervisor (1-2 per project)
            $selectedSupervisors = $supervisors->random(min(2, $supervisors->count()));
            foreach ($selectedSupervisors as $supervisor) {
                ProjectPersonnel::firstOrCreate([
                    'project_id' => $project->id,
                    'user_id' => $supervisor->id,
                ], [
                    'role_id' => $roles['supervisor'] ?? null,
                    'permissions' => [
                        'project.view',
                        'progress.view',
                        'progress.update',
                        'acceptance.view',
                        'acceptance.create',
                        'acceptance.update',
                        'acceptance.approve.level_1',
                        'log.view',
                        'log.create',
                        'log.update',
                        'defect.view',
                        'defect.create',
                        'defect.update',
                    ],
                    'assigned_by' => $superAdmin->id ?? $pm->id,
                    'assigned_at' => now(),
                ]);
            }

            // 3. Assign Customer (link back to project customer_id if exists)
            if ($project->customer_id) {
                ProjectPersonnel::firstOrCreate([
                    'project_id' => $project->id,
                    'user_id' => $project->customer_id,
                ], [
                    'role_id' => $roles['guest'] ?? null,
                    'permissions' => [
                        'project.view',
                        'progress.view',
                        'acceptance.view',
                        'acceptance.approve.level_3', // Final approval for customer
                        'payment.view',
                        'payment.mark_paid_by_customer',
                        'defect.view',
                        'report.view',
                    ],
                    'assigned_by' => $superAdmin->id ?? $pm->id,
                    'assigned_at' => now(),
                ]);
            }

            // 4. Assign Accountant (1 per project)
            $accountant = $accountants->random();
            ProjectPersonnel::firstOrCreate([
                'project_id' => $project->id,
                'user_id' => $accountant->id,
            ], [
                'role_id' => $roles['accountant'] ?? null,
                'permissions' => [
                    'project.view',
                    'cost.view',
                    'cost.approve.accountant',
                    'payment.view',
                    'payment.confirm',
                    'subcontractor_payment.view',
                    'subcontractor_payment.mark_paid',
                    'report.financial',
                ],
                'assigned_by' => $superAdmin->id ?? $pm->id,
                'assigned_at' => now(),
            ]);

            // 5. Assign some workers & team leaders
            $selectedTeamLeaders = $teamLeaders->random(min(2, $teamLeaders->count()));
            foreach ($selectedTeamLeaders as $tl) {
                ProjectPersonnel::firstOrCreate([
                    'project_id' => $project->id,
                    'user_id' => $tl->id,
                ], [
                    'role_id' => $roles['team_leader'] ?? null,
                    'permissions' => ['project.view', 'progress.view', 'log.create'],
                    'assigned_by' => $superAdmin->id ?? $pm->id,
                    'assigned_at' => now(),
                ]);
            }
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã gán personnel cho ' . $projects->count() . ' dự án!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
    }
}
