<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\ProjectBudget;
use App\Models\BudgetItem;
use App\Models\CostGroup;
use Illuminate\Database\Seeder;

class BudgetSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $projects = Project::limit(3)->get();
        $costGroups = CostGroup::all();

        if ($projects->isEmpty()) {
            $this->command->warn('Chưa có dự án. Vui lòng chạy ProjectSeeder trước.');
            return;
        }

        if ($costGroups->isEmpty()) {
            $this->command->warn('Chưa có nhóm chi phí. Vui lòng chạy CostGroupSeeder trước.');
            return;
        }

        // Map cost groups theo code để liên kết chính xác
        $costGroupMap = [];
        foreach ($costGroups as $cg) {
            $costGroupMap[$cg->code] = $cg;
        }

        foreach ($projects as $project) {
            $budget = ProjectBudget::create([
                'project_id' => $project->id,
                'name' => 'Ngân sách ban đầu',
                'version' => '1.0',
                'total_budget' => 10000000000, // 10 tỷ
                'estimated_cost' => 9500000000,
                'actual_cost' => 0,
                'remaining_budget' => 10000000000,
                'budget_date' => $project->start_date,
                'status' => 'approved',
                'created_by' => $project->created_by,
                'approved_by' => $project->created_by,
                'approved_at' => now(),
            ]);

            // Tạo các hạng mục ngân sách - liên kết với cost groups theo code
            $budgetItems = [
                [
                    'budget_id' => $budget->id,
                    'cost_group_id' => $costGroupMap['VLXD']->id ?? $costGroups->first()->id,
                    'name' => 'Vật liệu xây dựng',
                    'description' => 'Xi măng, thép, gạch, cát, đá',
                    'estimated_amount' => 4000000000,
                    'actual_amount' => 0,
                    'remaining_amount' => 4000000000,
                    'quantity' => 1,
                    'unit_price' => 4000000000,
                    'order' => 1,
                ],
                [
                    'budget_id' => $budget->id,
                    'cost_group_id' => $costGroupMap['NC']->id ?? $costGroups->skip(1)->first()?->id,
                    'name' => 'Nhân công',
                    'description' => 'Chi phí nhân công thi công',
                    'estimated_amount' => 3000000000,
                    'actual_amount' => 0,
                    'remaining_amount' => 3000000000,
                    'quantity' => 1,
                    'unit_price' => 3000000000,
                    'order' => 2,
                ],
                [
                    'budget_id' => $budget->id,
                    'cost_group_id' => $costGroupMap['TBMM']->id ?? $costGroups->skip(2)->first()?->id,
                    'name' => 'Thiết bị máy móc',
                    'description' => 'Thuê máy xúc, cần cẩu, máy trộn',
                    'estimated_amount' => 1500000000,
                    'actual_amount' => 0,
                    'remaining_amount' => 1500000000,
                    'quantity' => 1,
                    'unit_price' => 1500000000,
                    'order' => 3,
                ],
                [
                    'budget_id' => $budget->id,
                    'cost_group_id' => $costGroupMap['CPK']->id ?? $costGroups->skip(6)->first()?->id,
                    'name' => 'Chi phí khác',
                    'description' => 'Chi phí quản lý, vận chuyển, phát sinh',
                    'estimated_amount' => 1500000000,
                    'actual_amount' => 0,
                    'remaining_amount' => 1500000000,
                    'quantity' => 1,
                    'unit_price' => 1500000000,
                    'order' => 4,
                ],
            ];

            foreach ($budgetItems as $item) {
                BudgetItem::create($item);
            }
        }

        $this->command->info('Đã tạo ngân sách cho ' . $projects->count() . ' dự án.');
    }
}

