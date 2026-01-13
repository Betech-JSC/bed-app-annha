<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\ProjectProgress;
use App\Models\ProjectPersonnel;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Tạo dữ liệu mẫu cho module quản lý dự án
     */
    public function run(): void
    {
        // Lấy super admin làm customer và project manager
        $superAdmin = User::where('email', 'superadmin@skysend.com')->first();
        $hrAdmin = User::where('email', 'hradmin@skysend.com')->first();

        if (!$superAdmin) {
            $this->command->warn('Super Admin chưa được tạo. Vui lòng chạy SuperAdminSeeder trước.');
            return;
        }

        // Lấy thêm users để phân bổ làm customers và project managers
        $pm1 = User::where('email', 'pm1@test.com')->first();
        $pm2 = User::where('email', 'pm2@test.com')->first();
        $pm3 = User::where('email', 'pm3@test.com')->first();
        $customer1 = User::where('email', 'customer1@test.com')->first();
        $customer2 = User::where('email', 'customer2@test.com')->first();
        $customer3 = User::where('email', 'customer3@test.com')->first();
        $customer4 = User::where('email', 'customer4@test.com')->first();
        $customer5 = User::where('email', 'customer5@test.com')->first();

        $projects = [
            [
                'name' => 'Dự án Xây dựng Chung cư A1',
                'code' => 'PRJ-CC-A1',
                'description' => 'Dự án xây dựng chung cư cao cấp tại quận 1, TP.HCM với 20 tầng và 200 căn hộ.',
                'customer_id' => $customer1 ? $customer1->id : $superAdmin->id,
                'project_manager_id' => $pm1 ? $pm1->id : $superAdmin->id,
                'start_date' => now()->subMonths(3),
                'end_date' => now()->addMonths(9),
                'status' => 'in_progress',
                'created_by' => $superAdmin->id,
            ],
            [
                'name' => 'Dự án Cải tạo Trường học B',
                'code' => 'PRJ-TH-B',
                'description' => 'Cải tạo và nâng cấp trường học cấp 2 với diện tích 5000m2, bao gồm 15 phòng học và các phòng chức năng.',
                'customer_id' => $customer2 ? $customer2->id : $superAdmin->id,
                'project_manager_id' => $pm2 ? $pm2->id : ($hrAdmin ? $hrAdmin->id : $superAdmin->id),
                'start_date' => now()->subMonths(1),
                'end_date' => now()->addMonths(5),
                'status' => 'in_progress',
                'created_by' => $superAdmin->id,
            ],
            [
                'name' => 'Dự án Xây dựng Cầu đường C',
                'code' => 'PRJ-CD-C',
                'description' => 'Xây dựng cầu vượt và mở rộng đường quốc lộ với chiều dài 2km, 4 làn xe.',
                'customer_id' => $customer3 ? $customer3->id : $superAdmin->id,
                'project_manager_id' => $pm3 ? $pm3->id : $superAdmin->id,
                'start_date' => now()->subMonths(6),
                'end_date' => now()->addMonths(6),
                'status' => 'in_progress',
                'created_by' => $superAdmin->id,
            ],
            [
                'name' => 'Dự án Nhà máy Sản xuất D',
                'code' => 'PRJ-NM-D',
                'description' => 'Xây dựng nhà máy sản xuất với diện tích 10,000m2, bao gồm khu sản xuất, kho bãi và văn phòng.',
                'customer_id' => $customer4 ? $customer4->id : $superAdmin->id,
                'project_manager_id' => $pm1 ? $pm1->id : $superAdmin->id,
                'start_date' => now()->subMonths(12),
                'end_date' => now()->subMonths(1),
                'status' => 'completed',
                'created_by' => $superAdmin->id,
            ],
            [
                'name' => 'Dự án Trung tâm Thương mại E',
                'code' => 'PRJ-TTM-E',
                'description' => 'Xây dựng trung tâm thương mại 5 tầng với diện tích 15,000m2, bao gồm khu mua sắm, giải trí và nhà hàng.',
                'customer_id' => $customer5 ? $customer5->id : $superAdmin->id,
                'project_manager_id' => $pm2 ? $pm2->id : $superAdmin->id,
                'start_date' => now()->addMonths(1),
                'end_date' => now()->addMonths(12),
                'status' => 'planning',
                'created_by' => $superAdmin->id,
            ],
            [
                'name' => 'Dự án Bệnh viện Đa khoa F',
                'code' => 'PRJ-BV-F',
                'description' => 'Xây dựng bệnh viện đa khoa với 300 giường bệnh, bao gồm các khoa nội, ngoại, sản, nhi và phòng mổ hiện đại.',
                'customer_id' => $customer1 ? $customer1->id : $superAdmin->id,
                'project_manager_id' => $pm3 ? $pm3->id : $superAdmin->id,
                'start_date' => now()->subMonths(2),
                'end_date' => now()->addMonths(10),
                'status' => 'in_progress',
                'created_by' => $superAdmin->id,
            ],
            [
                'name' => 'Dự án Khu đô thị mới G',
                'code' => 'PRJ-KDT-G',
                'description' => 'Phát triển khu đô thị mới với 500 căn nhà phố và biệt thự, hạ tầng hoàn chỉnh.',
                'customer_id' => $customer2 ? $customer2->id : $superAdmin->id,
                'project_manager_id' => $pm1 ? $pm1->id : $superAdmin->id,
                'start_date' => now()->subMonths(4),
                'end_date' => now()->addMonths(8),
                'status' => 'in_progress',
                'created_by' => $superAdmin->id,
            ],
            [
                'name' => 'Dự án Cải tạo Sân bay H',
                'code' => 'PRJ-SB-H',
                'description' => 'Cải tạo và mở rộng nhà ga sân bay, nâng cấp đường băng và hệ thống chiếu sáng.',
                'customer_id' => $customer3 ? $customer3->id : $superAdmin->id,
                'project_manager_id' => $pm2 ? $pm2->id : $superAdmin->id,
                'start_date' => now()->subMonths(8),
                'end_date' => now()->addMonths(4),
                'status' => 'in_progress',
                'created_by' => $superAdmin->id,
            ],
            [
                'name' => 'Dự án Trường Đại học I',
                'code' => 'PRJ-DH-I',
                'description' => 'Xây dựng khu giảng đường và phòng thí nghiệm cho trường đại học với diện tích 20,000m2.',
                'customer_id' => $customer4 ? $customer4->id : $superAdmin->id,
                'project_manager_id' => $pm3 ? $pm3->id : $superAdmin->id,
                'start_date' => now()->addMonths(2),
                'end_date' => now()->addMonths(14),
                'status' => 'planning',
                'created_by' => $superAdmin->id,
            ],
            [
                'name' => 'Dự án Khách sạn 5 sao J',
                'code' => 'PRJ-KS-J',
                'description' => 'Xây dựng khách sạn 5 sao với 200 phòng, nhà hàng, spa và hồ bơi trên tầng thượng.',
                'customer_id' => $customer5 ? $customer5->id : $superAdmin->id,
                'project_manager_id' => $pm1 ? $pm1->id : $superAdmin->id,
                'start_date' => now()->subMonths(9),
                'end_date' => now()->subMonths(2),
                'status' => 'completed',
                'created_by' => $superAdmin->id,
            ],
            [
                'name' => 'Dự án Cầu vượt K',
                'code' => 'PRJ-CV-K',
                'description' => 'Xây dựng cầu vượt tại ngã tư đông dân cư, giảm ùn tắc giao thông.',
                'customer_id' => $customer1 ? $customer1->id : $superAdmin->id,
                'project_manager_id' => $pm2 ? $pm2->id : $superAdmin->id,
                'start_date' => now()->subMonths(1),
                'end_date' => now()->addMonths(5),
                'status' => 'in_progress',
                'created_by' => $superAdmin->id,
            ],
        ];

        $createdProjects = [];

        foreach ($projects as $projectData) {
            // Kiểm tra xem project đã tồn tại chưa (theo code)
            $existingProject = Project::where('code', $projectData['code'])->first();

            if ($existingProject) {
                $this->command->info("Project {$projectData['code']} đã tồn tại, bỏ qua...");
                $createdProjects[] = $existingProject;
                continue;
            }

            // Tạo project
            $project = Project::create($projectData);

            // Tạo progress record cho project
            $progress = ProjectProgress::firstOrCreate(
                ['project_id' => $project->id],
                [
                    'overall_percentage' => $this->getProgressPercentage($project->status),
                    'calculated_from' => 'manual',
                    'last_calculated_at' => now(),
                ]
            );

            // Gán personnel cho project (nếu có hrAdmin)
            if ($hrAdmin && $project->status === 'in_progress') {
                ProjectPersonnel::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'user_id' => $hrAdmin->id,
                    ],
                    [
                        'project_id' => $project->id,
                        'user_id' => $hrAdmin->id,
                        'role' => 'supervisor',
                        'permissions' => ['view', 'edit', 'approve'],
                        'assigned_by' => $superAdmin->id,
                        'assigned_at' => now(),
                    ]
                );
            }

            $createdProjects[] = $project;
            $this->command->info("✅ Đã tạo project: {$project->name} ({$project->code})");
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã tạo ' . count($createdProjects) . ' dự án mẫu!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();

        // Load progress relationship
        foreach ($createdProjects as $project) {
            $project->load('progress');
            $progressPercentage = $project->progress ? $project->progress->overall_percentage : 0;
            $this->command->info("📋 {$project->code} - {$project->name}");
            $this->command->info("   Trạng thái: {$project->status}");
            $this->command->info("   Tiến độ: {$progressPercentage}%");
        }

        $this->command->newLine();
    }

    /**
     * Tính phần trăm tiến độ dựa trên status
     */
    private function getProgressPercentage(string $status): int
    {
        return match ($status) {
            'planning' => 0,
            'in_progress' => rand(20, 80),
            'completed' => 100,
            'cancelled' => 0,
            default => 0,
        };
    }
}
