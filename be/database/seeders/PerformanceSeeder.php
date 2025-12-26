<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Project;
use App\Models\ProjectPersonnel;
use App\Models\PerformanceEvaluation;
use App\Models\PerformanceKPI;
use Illuminate\Database\Seeder;

class PerformanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::whereIn('role', ['employee', 'technician', 'supervisor'])->limit(10)->get();
        $projects = Project::limit(3)->get();
        $evaluators = User::whereIn('role', ['manager', 'admin'])->get();

        if ($users->isEmpty()) {
            $this->command->warn('Chưa có users. Vui lòng chạy UserSeeder trước.');
            return;
        }

        if ($evaluators->isEmpty()) {
            $this->command->warn('Chưa có evaluators. Vui lòng chạy UserSeeder trước.');
            return;
        }

        $evaluationTypes = ['monthly', 'quarterly', 'annual', 'project_based'];
        $periods = [
            'Q1-' . now()->year,
            'Q2-' . now()->year,
            'Q3-' . now()->year,
            'Q4-' . now()->year,
            'Tháng ' . now()->month . '/' . now()->year,
        ];

        foreach ($users->take(5) as $user) {
            $evaluationType = $evaluationTypes[array_rand($evaluationTypes)];
            $period = $periods[array_rand($periods)];
            $evaluator = $evaluators->random();
            $project = $projects->random();

            // Chỉ đánh giá project_based nếu user được gán vào project
            $projectId = null;
            if ($evaluationType === 'project_based') {
                $personnel = ProjectPersonnel::where('project_id', $project->id)
                    ->where('user_id', $user->id)
                    ->first();
                
                if (!$personnel) {
                    // Gán user vào project nếu chưa có
                    ProjectPersonnel::create([
                        'project_id' => $project->id,
                        'user_id' => $user->id,
                        'role' => 'employee',
                        'assigned_by' => $evaluator->id,
                        'assigned_at' => now(),
                    ]);
                }
                $projectId = $project->id;
            }

            $evaluation = PerformanceEvaluation::create([
                'user_id' => $user->id,
                'project_id' => $projectId,
                'evaluator_id' => $evaluator->id,
                'evaluation_period' => $period,
                'evaluation_type' => $evaluationType,
                'evaluation_date' => now()->subDays(rand(1, 30)),
                'overall_score' => rand(70, 95),
                'strengths' => 'Làm việc chăm chỉ, có trách nhiệm, hoàn thành tốt công việc được giao.',
                'weaknesses' => 'Cần cải thiện kỹ năng giao tiếp và làm việc nhóm.',
                'improvements' => 'Tham gia các khóa đào tạo về kỹ năng mềm và quản lý thời gian.',
                'goals' => 'Hoàn thành tốt các mục tiêu được giao, nâng cao năng suất làm việc.',
                'comments' => 'Nhân viên có tiềm năng phát triển tốt.',
                'status' => rand(0, 1) ? 'approved' : 'submitted',
                'created_by' => $evaluator->id,
            ]);

            // Tạo KPIs cho evaluation
            $kpis = [
                [
                    'evaluation_id' => $evaluation->id,
                    'kpi_name' => 'Hoàn thành công việc đúng hạn',
                    'description' => 'Tỷ lệ hoàn thành công việc đúng thời hạn',
                    'target_value' => 90,
                    'actual_value' => rand(85, 95),
                    'weight' => 30,
                    'score' => rand(80, 100),
                    'order' => 1,
                ],
                [
                    'evaluation_id' => $evaluation->id,
                    'kpi_name' => 'Chất lượng công việc',
                    'description' => 'Đánh giá chất lượng công việc thực hiện',
                    'target_value' => 85,
                    'actual_value' => rand(80, 90),
                    'weight' => 30,
                    'score' => rand(75, 95),
                    'order' => 2,
                ],
                [
                    'evaluation_id' => $evaluation->id,
                    'kpi_name' => 'Kỹ năng làm việc nhóm',
                    'description' => 'Khả năng hợp tác và làm việc nhóm',
                    'target_value' => 80,
                    'actual_value' => rand(75, 85),
                    'weight' => 20,
                    'score' => rand(70, 90),
                    'order' => 3,
                ],
                [
                    'evaluation_id' => $evaluation->id,
                    'kpi_name' => 'Sáng tạo và đổi mới',
                    'description' => 'Khả năng đề xuất ý tưởng mới và cải tiến',
                    'target_value' => 75,
                    'actual_value' => rand(70, 80),
                    'weight' => 20,
                    'score' => rand(65, 85),
                    'order' => 4,
                ],
            ];

            foreach ($kpis as $kpi) {
                PerformanceKPI::create($kpi);
            }
        }

        $this->command->info('Đã tạo ' . $users->take(5)->count() . ' đánh giá hiệu suất.');
    }
}

