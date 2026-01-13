<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Contract;
use App\Models\ProjectPayment;
use App\Models\Cost;
use App\Models\AdditionalCost;
use App\Models\ProjectPersonnel;
use App\Models\ConstructionLog;
use App\Models\Defect;
use App\Models\ChangeRequest;
use App\Models\ProjectTask;
use App\Models\AcceptanceStage;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class SampleDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Tạo dữ liệu mẫu cho tất cả các module để app hoạt động không lỗi
     */
    public function run(): void
    {
        // Lấy users (sử dụng @test.com)
        $superAdmin = User::where('email', 'superadmin@test.com')->first();
        $hrAdmin = User::where('email', 'hradmin@test.com')->first();
        $pm1 = User::where('email', 'pm1@test.com')->first();
        $pm2 = User::where('email', 'pm2@test.com')->first();
        $pm3 = User::where('email', 'pm3@test.com')->first();
        $accountant = User::where('email', 'accountant1@test.com')->first();
        $management = User::where('email', 'management1@test.com')->first();
        $customer1 = User::where('email', 'customer1@test.com')->first();
        $customer2 = User::where('email', 'customer2@test.com')->first();
        $supervisor1 = User::where('email', 'supervisor1@test.com')->first();
        $supervisor2 = User::where('email', 'supervisor2@test.com')->first();
        $workers = User::whereIn('email', [
            'worker1@test.com', 'worker2@test.com', 'worker3@test.com', 'worker4@test.com',
            'worker5@test.com', 'worker6@test.com', 'worker7@test.com', 'worker8@test.com',
            'worker9@test.com', 'worker10@test.com'
        ])->get();

        if (!$superAdmin) {
            $this->command->warn('Super Admin chưa được tạo. Vui lòng chạy UserRoleSeeder trước.');
            return;
        }

        $this->command->info('Đang tạo dữ liệu mẫu cho các module...');

        // Lấy projects đã có
        $projects = Project::all();

        if ($projects->isEmpty()) {
            $this->command->warn('Chưa có dự án nào. Vui lòng chạy ProjectSeeder trước.');
            return;
        }

        foreach ($projects as $project) {
            $this->command->info("Đang tạo dữ liệu mẫu cho dự án: {$project->name}");

            // 1. Tạo Contract
            $contract = Contract::firstOrCreate(
                ['project_id' => $project->id],
                [
                    'project_id' => $project->id,
                    'contract_value' => rand(5000000000, 20000000000), // 5 tỷ - 20 tỷ
                    'signed_date' => $project->start_date ?? now()->subMonths(2),
                    'status' => 'approved',
                    'approved_by' => $superAdmin->id,
                    'approved_at' => now()->subMonths(2),
                ]
            );

            // 2. Tạo Project Payments
            $paymentCount = rand(3, 6);
            for ($i = 1; $i <= $paymentCount; $i++) {
                ProjectPayment::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'payment_number' => $i,
                    ],
                    [
                        'project_id' => $project->id,
                        'contract_id' => $contract->id,
                        'payment_number' => $i,
                        'amount' => $contract->contract_value / $paymentCount,
                        'due_date' => now()->addMonths($i * 2),
                        'status' => $i <= 2 ? 'paid' : ($i === 3 ? 'pending' : 'pending'),
                        'paid_date' => $i <= 2 ? now()->subMonths($paymentCount - $i) : null,
                        'confirmed_by' => $i <= 2 ? $accountant->id : null,
                        'confirmed_at' => $i <= 2 ? now()->subMonths($paymentCount - $i) : null,
                    ]
                );
            }

            // 3. Tạo Costs với approval workflow
            $costCategories = [
                'construction_materials',
                'concrete',
                'labor',
                'equipment',
                'transportation',
                'other',
            ];

            foreach ($costCategories as $category) {
                $costCount = rand(2, 5);
                for ($i = 0; $i < $costCount; $i++) {
                    $statuses = ['draft', 'pending_management_approval', 'pending_accountant_approval', 'approved', 'rejected'];
                    $status = $statuses[array_rand($statuses)];

                    $costName = "Chi phí {$category} #" . ($i + 1);
                    $cost = Cost::firstOrCreate(
                        [
                            'project_id' => $project->id,
                            'category' => $category,
                            'name' => $costName,
                        ],
                        [
                            'project_id' => $project->id,
                            'category' => $category,
                            'name' => $costName,
                            'amount' => rand(50000000, 500000000), // 50 triệu - 500 triệu
                            'description' => "Mô tả chi phí {$category} cho dự án {$project->name}",
                            'cost_date' => now()->subDays(rand(1, 90)),
                            'status' => $status,
                            'created_by' => $pm1 ? $pm1->id : $superAdmin->id,
                            'management_approved_by' => in_array($status, ['pending_accountant_approval', 'approved']) ? ($management ? $management->id : null) : null,
                            'management_approved_at' => in_array($status, ['pending_accountant_approval', 'approved']) ? now()->subDays(rand(1, 30)) : null,
                            'accountant_approved_by' => $status === 'approved' ? ($accountant ? $accountant->id : null) : null,
                            'accountant_approved_at' => $status === 'approved' ? now()->subDays(rand(1, 15)) : null,
                            'rejected_reason' => $status === 'rejected' ? 'Không phù hợp với ngân sách dự án' : null,
                        ]
                    );
                }
            }

            // 4. Tạo Additional Costs
            $additionalCostCount = rand(2, 4);
            for ($i = 0; $i < $additionalCostCount; $i++) {
                $statuses = ['pending_approval', 'approved', 'rejected'];
                $status = $statuses[array_rand($statuses)];
                $costNumber = $i + 1;
                $costDescription = "Chi phí phát sinh #" . $costNumber;
                $fullDescription = $costDescription . " cho dự án " . $project->name;

                AdditionalCost::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'description' => $costDescription,
                    ],
                    [
                        'project_id' => $project->id,
                        'amount' => rand(10000000, 200000000), // 10 triệu - 200 triệu
                        'description' => $fullDescription,
                        'status' => $status,
                        'proposed_by' => $pm1 ? $pm1->id : $superAdmin->id,
                        'approved_by' => $status === 'approved' ? ($customer1 ? $customer1->id : null) : null,
                        'approved_at' => $status === 'approved' ? now()->subDays(rand(1, 20)) : null,
                        'rejected_reason' => $status === 'rejected' ? 'Không phù hợp với ngân sách' : null,
                    ]
                );
            }

            // 5. Tạo Construction Logs (10-20 logs mỗi project)
            $logCount = rand(10, 20);
            $tasks = ProjectTask::where('project_id', $project->id)->get();
            
            for ($i = 0; $i < $logCount; $i++) {
                $logDate = $project->start_date 
                    ? $project->start_date->copy()->addDays($i * 2)
                    : now()->subDays(rand(1, 60));
                
                // Chọn một task ngẫu nhiên hoặc null
                $task = $tasks->isNotEmpty() ? $tasks->random() : null;
                
                $weatherOptions = ['nắng', 'mưa', 'nắng nhẹ', 'mưa nhẹ', 'âm u'];
                
                ConstructionLog::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'log_date' => $logDate->toDateString(),
                    ],
                    [
                        'project_id' => $project->id,
                        'task_id' => $task ? $task->id : null,
                        'log_date' => $logDate,
                        'weather' => $weatherOptions[array_rand($weatherOptions)],
                        'personnel_count' => rand(10, 50),
                        'completion_percentage' => rand(0, 100),
                        'notes' => "Nhật ký công trình ngày " . $logDate->format('d/m/Y'),
                        'created_by' => $workers->isNotEmpty() ? $workers->random()->id : ($superAdmin ? $superAdmin->id : 1),
                    ]
                );
            }

            // 6. Tạo Defects (5-10 defects mỗi project)
            $defectCount = rand(5, 10);
            $severities = ['low', 'medium', 'high', 'critical'];
            $defectStatuses = ['open', 'in_progress', 'fixed', 'verified'];
            $acceptanceStages = AcceptanceStage::where('project_id', $project->id)->get();
            
            for ($i = 0; $i < $defectCount; $i++) {
                $task = $tasks->isNotEmpty() ? $tasks->random() : null;
                $acceptanceStage = $acceptanceStages->isNotEmpty() ? $acceptanceStages->random() : null;
                $status = $defectStatuses[array_rand($defectStatuses)];
                $severity = $severities[array_rand($severities)];
                
                $defect = Defect::create([
                    'project_id' => $project->id,
                    'task_id' => $task ? $task->id : null,
                    'acceptance_stage_id' => $acceptanceStage ? $acceptanceStage->id : null,
                    'description' => "Lỗi #" . ($i + 1) . ": " . $this->getDefectDescription($severity),
                    'severity' => $severity,
                    'status' => $status,
                    'expected_completion_date' => now()->addDays(rand(1, 30)),
                    'reported_by' => $supervisor1 ? $supervisor1->id : ($superAdmin ? $superAdmin->id : 1),
                    'reported_at' => now()->subDays(rand(1, 30)),
                    'fixed_by' => in_array($status, ['fixed', 'verified']) ? ($workers->isNotEmpty() ? $workers->random()->id : null) : null,
                    'fixed_at' => in_array($status, ['fixed', 'verified']) ? now()->subDays(rand(1, 15)) : null,
                    'verified_by' => $status === 'verified' ? ($supervisor2 ? $supervisor2->id : null) : null,
                    'verified_at' => $status === 'verified' ? now()->subDays(rand(1, 5)) : null,
                ]);
            }

            // 7. Tạo Change Requests (2-5 requests mỗi project)
            $changeRequestCount = rand(2, 5);
            $changeTypes = ['scope', 'schedule', 'cost', 'quality', 'resource'];
            $priorities = ['low', 'medium', 'high', 'urgent'];
            $crStatuses = ['draft', 'submitted', 'under_review', 'approved', 'rejected', 'implemented'];
            
            for ($i = 0; $i < $changeRequestCount; $i++) {
                $status = $crStatuses[array_rand($crStatuses)];
                $changeType = $changeTypes[array_rand($changeTypes)];
                $priority = $priorities[array_rand($priorities)];
                
                $cr = ChangeRequest::create([
                    'project_id' => $project->id,
                    'title' => "Yêu cầu thay đổi #" . ($i + 1) . " - " . $changeType,
                    'description' => "Mô tả yêu cầu thay đổi về " . $changeType . " cho dự án {$project->name}",
                    'change_type' => $changeType,
                    'priority' => $priority,
                    'status' => $status,
                    'reason' => "Lý do yêu cầu thay đổi: " . $this->getChangeRequestReason($changeType),
                    'impact_analysis' => "Phân tích tác động của thay đổi này",
                    'estimated_cost_impact' => rand(10000000, 500000000),
                    'estimated_schedule_impact_days' => rand(1, 30),
                    'implementation_plan' => "Kế hoạch triển khai thay đổi",
                    'requested_by' => $pm1 ? $pm1->id : ($superAdmin ? $superAdmin->id : 1),
                    'reviewed_by' => in_array($status, ['under_review', 'approved', 'rejected']) ? ($pm2 ? $pm2->id : null) : null,
                    'approved_by' => in_array($status, ['approved', 'implemented']) ? ($pm3 ? $pm3->id : null) : null,
                    'submitted_at' => in_array($status, ['submitted', 'under_review', 'approved', 'rejected', 'implemented']) ? now()->subDays(rand(5, 20)) : null,
                    'reviewed_at' => in_array($status, ['under_review', 'approved', 'rejected']) ? now()->subDays(rand(3, 15)) : null,
                    'approved_at' => in_array($status, ['approved', 'implemented']) ? now()->subDays(rand(1, 10)) : null,
                    'implemented_at' => $status === 'implemented' ? now()->subDays(rand(1, 5)) : null,
                    'rejection_reason' => $status === 'rejected' ? 'Không phù hợp với yêu cầu dự án' : null,
                    'notes' => $status === 'approved' ? 'Đã được phê duyệt' : null,
                ]);
            }

            $this->command->info("✅ Đã tạo dữ liệu mẫu cho dự án: {$project->name}");
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã tạo dữ liệu mẫu cho tất cả các module!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
        $this->command->info('📊 Tổng hợp dữ liệu đã tạo:');
        $this->command->info('   - Contracts: ' . Contract::count());
        $this->command->info('   - Payments: ' . ProjectPayment::count());
        $this->command->info('   - Costs: ' . Cost::count());
        $this->command->info('   - Additional Costs: ' . AdditionalCost::count());
        $this->command->info('   - Construction Logs: ' . ConstructionLog::count());
        $this->command->info('   - Defects: ' . Defect::count());
        $this->command->info('   - Change Requests: ' . ChangeRequest::count());
        $this->command->newLine();
    }

    private function getDefectDescription(string $severity): string
    {
        $descriptions = [
            'low' => 'Vết nứt nhỏ trên tường',
            'medium' => 'Lỗi lắp đặt thiết bị',
            'high' => 'Lỗi kỹ thuật nghiêm trọng',
            'critical' => 'Lỗi an toàn cần xử lý ngay',
        ];
        return $descriptions[$severity] ?? 'Lỗi cần xử lý';
    }

    private function getChangeRequestReason(string $changeType): string
    {
        $reasons = [
            'scope' => 'Thay đổi phạm vi công việc theo yêu cầu khách hàng',
            'schedule' => 'Điều chỉnh tiến độ do thời tiết',
            'cost' => 'Thay đổi ngân sách dự án',
            'quality' => 'Nâng cao chất lượng công trình',
            'resource' => 'Thay đổi nhân lực và vật liệu',
        ];
        return $reasons[$changeType] ?? 'Yêu cầu thay đổi';
    }
}
