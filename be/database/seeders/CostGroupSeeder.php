<?php

namespace Database\Seeders;

use App\Models\CostGroup;
use Illuminate\Database\Seeder;

class CostGroupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $costGroups = [
            [
                'code' => 'construction_materials',
                'name' => 'Vật liệu xây dựng',
                'description' => 'Các loại vật liệu xây dựng như xi măng, gạch, cát, đá, sắt thép...',
                'sort_order' => 1,
                'is_active' => true,
            ],
            [
                'code' => 'concrete',
                'name' => 'Bê tông',
                'description' => 'Bê tông tươi, bê tông đúc sẵn, bê tông cốt thép...',
                'sort_order' => 2,
                'is_active' => true,
            ],
            [
                'code' => 'labor',
                'name' => 'Nhân công',
                'description' => 'Chi phí nhân công thi công, lắp đặt...',
                'sort_order' => 3,
                'is_active' => true,
            ],
            [
                'code' => 'equipment',
                'name' => 'Thiết bị',
                'description' => 'Thiết bị thi công, máy móc, dụng cụ...',
                'sort_order' => 4,
                'is_active' => true,
            ],
            [
                'code' => 'transportation',
                'name' => 'Vận chuyển',
                'description' => 'Chi phí vận chuyển vật liệu, thiết bị...',
                'sort_order' => 5,
                'is_active' => true,
            ],
            [
                'code' => 'subcontractor',
                'name' => 'Nhà thầu phụ',
                'description' => 'Chi phí thuê nhà thầu phụ',
                'sort_order' => 6,
                'is_active' => true,
            ],
            [
                'code' => 'other',
                'name' => 'Chi phí khác',
                'description' => 'Các chi phí khác không thuộc các nhóm trên',
                'sort_order' => 99,
                'is_active' => true,
            ],
        ];

        $this->command->info('Đang tạo các nhóm chi phí...');

        foreach ($costGroups as $groupData) {
            $group = CostGroup::firstOrCreate(
                ['code' => $groupData['code']],
                $groupData
            );

            if ($group->wasRecentlyCreated) {
                $this->command->info("✅ Đã tạo nhóm chi phí: {$group->name}");
            } else {
                $this->command->info("⏭️  Nhóm chi phí đã tồn tại: {$group->name}");
            }
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã tạo ' . count($costGroups) . ' nhóm chi phí!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
    }
}

