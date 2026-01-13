<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\AcceptanceStage;
use App\Models\AcceptanceItem;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AcceptanceWorkflowSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Tạo acceptance stages và items cho mỗi project
     * - 2-4 acceptance stages mỗi project (link với parent tasks)
     * - 3-5 acceptance items mỗi stage
     * - Các workflow status khác nhau để test
     */
    public function run(): void
    {
        $projects = Project::all();
        
        if ($projects->isEmpty()) {
            $this->command->warn('Chưa có dự án nào. Vui lòng chạy ProjectSeeder trước.');
            return;
        }

        $superAdmin = User::where('email', 'superadmin@test.com')->first();
        $supervisors = User::whereIn('email', [
            'supervisor1@test.com', 'supervisor2@test.com', 'supervisor3@test.com'
        ])->get();
        $projectManagers = User::whereIn('email', [
            'pm1@test.com', 'pm2@test.com', 'pm3@test.com'
        ])->get();
        $customers = User::whereIn('email', [
            'customer1@test.com', 'customer2@test.com', 'customer3@test.com'
        ])->get();

        $this->command->info('Đang tạo acceptance stages và items cho các projects...');

        foreach ($projects as $project) {
            $this->command->info("Đang tạo acceptance cho dự án: {$project->name}");

            // Lấy parent tasks (tasks không có parent_id)
            $parentTasks = ProjectTask::where('project_id', $project->id)
                ->whereNull('parent_id')
                ->get();

            if ($parentTasks->isEmpty()) {
                $this->command->warn("Dự án {$project->name} chưa có parent tasks. Bỏ qua...");
                continue;
            }

            // Tạo 2-4 acceptance stages
            $stageCount = rand(2, min(4, $parentTasks->count()));
            $selectedParentTasks = $parentTasks->random(min($stageCount, $parentTasks->count()));

            $stageStatuses = ['pending', 'supervisor_approved', 'project_manager_approved', 'customer_approved', 'rejected'];
            $stageIndex = 0;

            foreach ($selectedParentTasks as $parentTask) {
                $statusIndex = min($stageIndex, count($stageStatuses) - 1);
                $status = $stageStatuses[$statusIndex];
                
                // Chọn approvers dựa trên status
                $supervisor = $supervisors->isNotEmpty() ? $supervisors->random() : null;
                $pm = $projectManagers->isNotEmpty() ? $projectManagers->random() : null;
                $customer = $customers->isNotEmpty() ? $customers->random() : null;

                $stage = AcceptanceStage::create([
                    'project_id' => $project->id,
                    'task_id' => $parentTask->id,
                    'name' => "Nghiệm thu {$parentTask->name}",
                    'description' => "Nghiệm thu hạng mục: {$parentTask->name}",
                    'order' => $stageIndex + 1,
                    'is_custom' => false,
                    'status' => $status,
                    'supervisor_approved_by' => in_array($status, ['supervisor_approved', 'project_manager_approved', 'customer_approved']) ? ($supervisor ? $supervisor->id : null) : null,
                    'supervisor_approved_at' => in_array($status, ['supervisor_approved', 'project_manager_approved', 'customer_approved']) ? now()->subDays(rand(5, 15)) : null,
                    'project_manager_approved_by' => in_array($status, ['project_manager_approved', 'customer_approved']) ? ($pm ? $pm->id : null) : null,
                    'project_manager_approved_at' => in_array($status, ['project_manager_approved', 'customer_approved']) ? now()->subDays(rand(3, 10)) : null,
                    'customer_approved_by' => $status === 'customer_approved' ? ($customer ? $customer->id : null) : null,
                    'customer_approved_at' => $status === 'customer_approved' ? now()->subDays(rand(1, 5)) : null,
                    'rejected_by' => $status === 'rejected' ? ($supervisor ? $supervisor->id : null) : null,
                    'rejected_at' => $status === 'rejected' ? now()->subDays(rand(1, 3)) : null,
                    'rejection_reason' => $status === 'rejected' ? 'Không đạt yêu cầu kỹ thuật' : null,
                ]);

                // Tạo 3-5 acceptance items cho mỗi stage
                $itemCount = rand(3, 5);
                $childTasks = ProjectTask::where('project_id', $project->id)
                    ->where('parent_id', $parentTask->id)
                    ->get();

                $itemWorkflowStatuses = ['draft', 'submitted', 'supervisor_approved', 'project_manager_approved', 'customer_approved', 'rejected'];

                for ($i = 0; $i < $itemCount; $i++) {
                    $itemStatusIndex = min($i, count($itemWorkflowStatuses) - 1);
                    $itemWorkflowStatus = $itemWorkflowStatuses[$itemStatusIndex];
                    
                    // Chọn một child task ngẫu nhiên hoặc null
                    $childTask = $childTasks->isNotEmpty() ? $childTasks->random() : null;

                    $item = AcceptanceItem::create([
                        'acceptance_stage_id' => $stage->id,
                        'task_id' => $childTask ? $childTask->id : null,
                        'name' => "Hạng mục nghiệm thu #" . ($i + 1),
                        'description' => "Chi tiết nghiệm thu hạng mục #" . ($i + 1) . " của {$stage->name}",
                        'start_date' => $childTask ? $childTask->start_date : ($parentTask->start_date ?? now()->subMonths(1)),
                        'end_date' => $childTask ? $childTask->end_date : ($parentTask->end_date ?? now()->addMonths(1)),
                        'acceptance_status' => $itemWorkflowStatus === 'customer_approved' ? 'approved' : 'pending',
                        'workflow_status' => $itemWorkflowStatus,
                        'order' => $i + 1,
                        'submitted_by' => in_array($itemWorkflowStatus, ['submitted', 'supervisor_approved', 'project_manager_approved', 'customer_approved']) ? ($superAdmin ? $superAdmin->id : null) : null,
                        'submitted_at' => in_array($itemWorkflowStatus, ['submitted', 'supervisor_approved', 'project_manager_approved', 'customer_approved']) ? now()->subDays(rand(10, 20)) : null,
                        'supervisor_approved_by' => in_array($itemWorkflowStatus, ['supervisor_approved', 'project_manager_approved', 'customer_approved']) ? ($supervisor ? $supervisor->id : null) : null,
                        'supervisor_approved_at' => in_array($itemWorkflowStatus, ['supervisor_approved', 'project_manager_approved', 'customer_approved']) ? now()->subDays(rand(5, 15)) : null,
                        'project_manager_approved_by' => in_array($itemWorkflowStatus, ['project_manager_approved', 'customer_approved']) ? ($pm ? $pm->id : null) : null,
                        'project_manager_approved_at' => in_array($itemWorkflowStatus, ['project_manager_approved', 'customer_approved']) ? now()->subDays(rand(3, 10)) : null,
                        'customer_approved_by' => $itemWorkflowStatus === 'customer_approved' ? ($customer ? $customer->id : null) : null,
                        'customer_approved_at' => $itemWorkflowStatus === 'customer_approved' ? now()->subDays(rand(1, 5)) : null,
                        'rejected_by' => $itemWorkflowStatus === 'rejected' ? ($supervisor ? $supervisor->id : null) : null,
                        'rejected_at' => $itemWorkflowStatus === 'rejected' ? now()->subDays(rand(1, 3)) : null,
                        'rejection_reason' => $itemWorkflowStatus === 'rejected' ? 'Cần chỉnh sửa lại' : null,
                        'created_by' => $superAdmin ? $superAdmin->id : 1,
                        'updated_by' => $superAdmin ? $superAdmin->id : 1,
                    ]);
                }

                $stageIndex++;
            }

            $this->command->info("✅ Đã tạo acceptance stages và items cho dự án: {$project->name}");
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã tạo acceptance workflow cho ' . $projects->count() . ' dự án!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
    }
}
