<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Contract;
use App\Models\ProjectPayment;
use App\Models\Cost;
use App\Models\AdditionalCost;
use App\Models\ProjectPersonnel;
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
        // Lấy users
        $superAdmin = User::where('email', 'superadmin@skysend.com')->first();
        $hrAdmin = User::where('email', 'hradmin@skysend.com')->first();
        $pm1 = User::where('email', 'pm1@skysend.com')->first();
        $pm2 = User::where('email', 'pm2@skysend.com')->first();
        $accountant = User::where('email', 'accountant@skysend.com')->first();
        $management = User::where('email', 'management@skysend.com')->first();
        $customer1 = User::where('email', 'customer1@skysend.com')->first();
        $customer2 = User::where('email', 'customer2@skysend.com')->first();
        $employee1 = User::where('email', 'employee1@skysend.com')->first();
        $employee2 = User::where('email', 'employee2@skysend.com')->first();

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
                    $statuses = ['draft', 'pending_management_approval', 'pending_accountant_approval', 'approved'];
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
                            'management_approved_by' => $status === 'pending_accountant_approval' || $status === 'approved' ? ($management ? $management->id : null) : null,
                            'management_approved_at' => $status === 'pending_accountant_approval' || $status === 'approved' ? now()->subDays(rand(1, 30)) : null,
                            'accountant_approved_by' => $status === 'approved' ? ($accountant ? $accountant->id : null) : null,
                            'accountant_approved_at' => $status === 'approved' ? now()->subDays(rand(1, 15)) : null,
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

            // 5. Tạo Project Personnel
            if ($employee1 && $employee2) {
                ProjectPersonnel::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'user_id' => $employee1->id,
                    ],
                    [
                        'project_id' => $project->id,
                        'user_id' => $employee1->id,
                        'role' => 'editor',
                        'permissions' => ['view', 'edit'],
                        'assigned_by' => $pm1 ? $pm1->id : $superAdmin->id,
                        'assigned_at' => $project->start_date ?? now()->subMonths(1),
                    ]
                );

                ProjectPersonnel::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'user_id' => $employee2->id,
                    ],
                    [
                        'project_id' => $project->id,
                        'user_id' => $employee2->id,
                        'role' => 'supervisor',
                        'permissions' => ['view', 'edit', 'approve'],
                        'assigned_by' => $pm1 ? $pm1->id : $superAdmin->id,
                        'assigned_at' => $project->start_date ?? now()->subMonths(1),
                    ]
                );
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
        $this->command->info('   - Personnel: ' . ProjectPersonnel::count());
        $this->command->newLine();
    }
}
