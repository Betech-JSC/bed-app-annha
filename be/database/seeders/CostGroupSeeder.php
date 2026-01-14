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
        $admin = \App\Models\User::whereIn('role', ['admin', 'owner'])->first();
        
        $costGroups = [
            [
                'name' => 'Vật liệu xây dựng',
                'code' => 'VLXD',
                'description' => 'Chi phí vật liệu xây dựng: xi măng, thép, gạch, cát, đá...',
                'sort_order' => 1,
                'is_active' => true,
                'created_by' => $admin?->id,
            ],
            [
                'name' => 'Nhân công',
                'code' => 'NC',
                'description' => 'Chi phí nhân công thi công, lương công nhân',
                'sort_order' => 2,
                'is_active' => true,
                'created_by' => $admin?->id,
            ],
            [
                'name' => 'Thiết bị máy móc',
                'code' => 'TBMM',
                'description' => 'Chi phí thuê máy xúc, cần cẩu, máy trộn, thiết bị thi công',
                'sort_order' => 3,
                'is_active' => true,
                'created_by' => $admin?->id,
            ],
            [
                'name' => 'Vận chuyển',
                'code' => 'VC',
                'description' => 'Chi phí vận chuyển vật liệu, thiết bị',
                'sort_order' => 4,
                'is_active' => true,
                'created_by' => $admin?->id,
            ],
            [
                'name' => 'Nhà thầu phụ',
                'code' => 'NTP',
                'description' => 'Chi phí thuê nhà thầu phụ',
                'sort_order' => 5,
                'is_active' => true,
                'created_by' => $admin?->id,
            ],
            [
                'name' => 'Chi phí quản lý',
                'code' => 'CPQL',
                'description' => 'Chi phí quản lý dự án, văn phòng, điện nước',
                'sort_order' => 6,
                'is_active' => true,
                'created_by' => $admin?->id,
            ],
            [
                'name' => 'Chi phí khác',
                'code' => 'CPK',
                'description' => 'Các chi phí phát sinh khác',
                'sort_order' => 7,
                'is_active' => true,
                'created_by' => $admin?->id,
            ],
        ];

        foreach ($costGroups as $group) {
            CostGroup::firstOrCreate(
                ['code' => $group['code']],
                $group
            );
        }

        $this->command->info('Đã tạo ' . count($costGroups) . ' nhóm chi phí.');
    }
}

