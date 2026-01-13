<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\ProjectPhase;
use App\Models\ProjectTask;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProjectPhaseTaskSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Tạo phases và tasks cho mỗi project
     * - 3-5 phases mỗi project
     * - 10-20 tasks mỗi project (hierarchical với parent_id)
     * - Tasks có các status và progress_percentage khác nhau
     */
    public function run(): void
    {
        $projects = Project::all();
        
        if ($projects->isEmpty()) {
            $this->command->warn('Chưa có dự án nào. Vui lòng chạy ProjectSeeder trước.');
            return;
        }

        $superAdmin = User::where('email', 'superadmin@test.com')->first();
        $workers = User::whereIn('email', [
            'worker1@test.com', 'worker2@test.com', 'worker3@test.com', 'worker4@test.com',
            'worker5@test.com', 'worker6@test.com', 'worker7@test.com', 'worker8@test.com',
            'worker9@test.com', 'worker10@test.com'
        ])->get();

        $this->command->info('Đang tạo phases và tasks cho các projects...');

        $phaseNames = [
            ['name' => 'Giai đoạn 1: Chuẩn bị', 'description' => 'Chuẩn bị mặt bằng, vật liệu và nhân lực'],
            ['name' => 'Giai đoạn 2: Thi công phần thô', 'description' => 'Thi công móng, khung, tường và mái'],
            ['name' => 'Giai đoạn 3: Hoàn thiện', 'description' => 'Hoàn thiện nội thất, điện nước, sơn'],
            ['name' => 'Giai đoạn 4: Nghiệm thu', 'description' => 'Nghiệm thu và bàn giao công trình'],
            ['name' => 'Giai đoạn 5: Bảo hành', 'description' => 'Bảo hành và bảo trì công trình'],
        ];

        $taskTemplates = [
            // Parent tasks (Category A - for acceptance stages)
            [
                'name' => 'Hạng mục A: Thi công móng',
                'description' => 'Thi công móng bê tông cốt thép',
                'is_parent' => true,
            ],
            [
                'name' => 'Hạng mục B: Thi công khung',
                'description' => 'Thi công khung bê tông cốt thép',
                'is_parent' => true,
            ],
            [
                'name' => 'Hạng mục C: Hoàn thiện',
                'description' => 'Hoàn thiện nội thất và ngoại thất',
                'is_parent' => true,
            ],
            // Child tasks
            [
                'name' => 'Đào đất móng',
                'description' => 'Đào đất theo thiết kế',
                'is_parent' => false,
            ],
            [
                'name' => 'Đổ bê tông móng',
                'description' => 'Đổ bê tông móng theo thiết kế',
                'is_parent' => false,
            ],
            [
                'name' => 'Lắp đặt cốt thép',
                'description' => 'Lắp đặt cốt thép khung',
                'is_parent' => false,
            ],
            [
                'name' => 'Đổ bê tông cột',
                'description' => 'Đổ bê tông cột',
                'is_parent' => false,
            ],
            [
                'name' => 'Xây tường',
                'description' => 'Xây tường gạch',
                'is_parent' => false,
            ],
            [
                'name' => 'Lắp đặt điện',
                'description' => 'Lắp đặt hệ thống điện',
                'is_parent' => false,
            ],
            [
                'name' => 'Lắp đặt nước',
                'description' => 'Lắp đặt hệ thống nước',
                'is_parent' => false,
            ],
            [
                'name' => 'Sơn tường',
                'description' => 'Sơn tường nội thất và ngoại thất',
                'is_parent' => false,
            ],
            [
                'name' => 'Lắp đặt cửa',
                'description' => 'Lắp đặt cửa chính và cửa sổ',
                'is_parent' => false,
            ],
            [
                'name' => 'Lát nền',
                'description' => 'Lát nền gạch',
                'is_parent' => false,
            ],
            [
                'name' => 'Lắp đặt thiết bị vệ sinh',
                'description' => 'Lắp đặt bồn cầu, lavabo',
                'is_parent' => false,
            ],
            [
                'name' => 'Vệ sinh công trình',
                'description' => 'Vệ sinh toàn bộ công trình',
                'is_parent' => false,
            ],
        ];

        foreach ($projects as $project) {
            $this->command->info("Đang tạo phases và tasks cho dự án: {$project->name}");

            // Tạo phases (3-5 phases)
            $phaseCount = rand(3, 5);
            $selectedPhases = array_slice($phaseNames, 0, $phaseCount);
            $createdPhases = [];

            foreach ($selectedPhases as $index => $phaseData) {
                $phaseStartDate = $project->start_date 
                    ? $project->start_date->copy()->addDays($index * 30)
                    : now()->subMonths(3)->addDays($index * 30);
                $phaseEndDate = $phaseStartDate->copy()->addDays(60);

                $phase = ProjectPhase::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'name' => $phaseData['name'],
                    ],
                    [
                        'project_id' => $project->id,
                        'name' => $phaseData['name'],
                        'description' => $phaseData['description'],
                        'start_date' => $phaseStartDate,
                        'end_date' => $phaseEndDate,
                        'order' => $index + 1,
                        'status' => $this->getPhaseStatus($project->status, $index, $phaseCount),
                        'progress_percentage' => $this->getPhaseProgress($project->status, $index, $phaseCount),
                        'created_by' => $superAdmin ? $superAdmin->id : 1,
                        'updated_by' => $superAdmin ? $superAdmin->id : 1,
                    ]
                );
                $createdPhases[] = $phase;
            }

            // Tạo tasks (10-20 tasks)
            $taskCount = rand(10, 20);
            $parentTasks = [];
            $childTasks = [];

            // Tạo parent tasks trước (3-5 parent tasks)
            $parentTaskCount = rand(3, 5);
            $parentTaskTemplates = array_filter($taskTemplates, fn($t) => $t['is_parent']);
            $selectedParentTasks = array_slice($parentTaskTemplates, 0, min($parentTaskCount, count($parentTaskTemplates)));

            foreach ($selectedParentTasks as $index => $taskTemplate) {
                $taskStartDate = $project->start_date 
                    ? $project->start_date->copy()->addDays($index * 20)
                    : now()->subMonths(3)->addDays($index * 20);
                $taskEndDate = $taskStartDate->copy()->addDays(40);

                // Gán vào phase đầu tiên hoặc phase tương ứng
                $phase = $createdPhases[$index % count($createdPhases)] ?? ($createdPhases[0] ?? null);

                $task = ProjectTask::create([
                    'project_id' => $project->id,
                    'phase_id' => $phase ? $phase->id : null,
                    'parent_id' => null,
                    'name' => $taskTemplate['name'],
                    'description' => $taskTemplate['description'],
                    'start_date' => $taskStartDate,
                    'end_date' => $taskEndDate,
                    'duration' => $taskStartDate->diffInDays($taskEndDate) + 1,
                    'priority' => $this->getRandomPriority(),
                    'assigned_to' => $workers->isNotEmpty() ? $workers->random()->id : null,
                    'order' => $index + 1,
                    'created_by' => $superAdmin ? $superAdmin->id : 1,
                    'updated_by' => $superAdmin ? $superAdmin->id : 1,
                ]);

                // Set progress and status manually (bypassing fillable restriction)
                $progress = $this->getTaskProgress($project->status);
                $status = $this->getTaskStatus($project->status, $progress);
                $task->progress_percentage = $progress;
                $task->status = $status;
                $task->saveQuietly(); // Save without triggering events

                $parentTasks[] = $task;
            }

            // Tạo child tasks
            $remainingTaskCount = $taskCount - count($parentTasks);
            $childTaskTemplates = array_filter($taskTemplates, fn($t) => !$t['is_parent']);
            $selectedChildTasks = array_slice($childTaskTemplates, 0, min($remainingTaskCount, count($childTaskTemplates)));

            foreach ($selectedChildTasks as $index => $taskTemplate) {
                // Gán child task vào một parent task ngẫu nhiên
                $parentTask = $parentTasks[array_rand($parentTasks)];
                
                // Gán vào phase tương ứng với parent task
                $phase = $createdPhases[array_rand($createdPhases)] ?? null;
                
                $taskStartDate = $parentTask->start_date 
                    ? $parentTask->start_date->copy()->addDays($index % 10)
                    : now()->subMonths(2)->addDays($index % 10);
                $taskEndDate = $taskStartDate->copy()->addDays(rand(5, 15));

                $task = ProjectTask::create([
                    'project_id' => $project->id,
                    'phase_id' => $phase ? $phase->id : null,
                    'parent_id' => $parentTask->id,
                    'name' => $taskTemplate['name'],
                    'description' => $taskTemplate['description'],
                    'start_date' => $taskStartDate,
                    'end_date' => $taskEndDate,
                    'duration' => $taskStartDate->diffInDays($taskEndDate) + 1,
                    'priority' => $this->getRandomPriority(),
                    'assigned_to' => $workers->isNotEmpty() ? $workers->random()->id : null,
                    'order' => $index + 1,
                    'created_by' => $superAdmin ? $superAdmin->id : 1,
                    'updated_by' => $superAdmin ? $superAdmin->id : 1,
                ]);

                // Set progress and status manually
                $progress = $this->getTaskProgress($project->status);
                $status = $this->getTaskStatus($project->status, $progress);
                $task->progress_percentage = $progress;
                $task->status = $status;
                $task->saveQuietly();

                $childTasks[] = $task;
            }

            $totalTasks = count($parentTasks) + count($childTasks);
            $this->command->info("✅ Đã tạo " . count($createdPhases) . " phases và " . $totalTasks . " tasks cho dự án: {$project->name}");
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã tạo phases và tasks cho ' . $projects->count() . ' dự án!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
    }

    private function getPhaseStatus(string $projectStatus, int $phaseIndex, int $totalPhases): string
    {
        if ($projectStatus === 'completed') {
            return 'completed';
        }
        if ($projectStatus === 'planning') {
            return 'planning';
        }
        if ($projectStatus === 'cancelled') {
            return 'cancelled';
        }
        
        // in_progress
        if ($phaseIndex === 0) {
            return 'in_progress';
        }
        if ($phaseIndex < $totalPhases / 2) {
            return rand(0, 1) ? 'in_progress' : 'completed';
        }
        return 'planning';
    }

    private function getPhaseProgress(string $projectStatus, int $phaseIndex, int $totalPhases): float
    {
        if ($projectStatus === 'completed') {
            return 100.0;
        }
        if ($projectStatus === 'planning') {
            return 0.0;
        }
        if ($projectStatus === 'cancelled') {
            return 0.0;
        }
        
        // in_progress
        $baseProgress = ($phaseIndex / $totalPhases) * 100;
        return min(100, max(0, $baseProgress + rand(-20, 30)));
    }

    private function getTaskProgress(string $projectStatus): float
    {
        if ($projectStatus === 'completed') {
            return 100.0;
        }
        if ($projectStatus === 'planning') {
            return 0.0;
        }
        if ($projectStatus === 'cancelled') {
            return 0.0;
        }
        
        // in_progress - random progress
        $progresses = [0, 25, 50, 75, 100];
        return $progresses[array_rand($progresses)];
    }

    private function getTaskStatus(string $projectStatus, float $progress): string
    {
        if ($projectStatus === 'completed' || $progress >= 100) {
            return 'completed';
        }
        if ($projectStatus === 'planning' || $progress === 0) {
            return 'not_started';
        }
        if ($projectStatus === 'cancelled') {
            return 'cancelled';
        }
        
        // in_progress
        if ($progress >= 100) {
            return 'completed';
        }
        if ($progress > 0) {
            return 'in_progress';
        }
        return 'not_started';
    }

    private function getRandomPriority(): string
    {
        $priorities = ['low', 'medium', 'high', 'urgent'];
        return $priorities[array_rand($priorities)];
    }
}
