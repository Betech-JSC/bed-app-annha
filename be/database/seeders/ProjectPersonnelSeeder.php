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

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã gán personnel cho ' . $projects->count() . ' dự án!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
    }
}
