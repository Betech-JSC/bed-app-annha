<?php

namespace Database\Seeders;

use App\Models\Department;
use App\Models\User;
use Illuminate\Database\Seeder;

class DepartmentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $users = User::whereIn('role', ['admin', 'manager'])->get();

        if ($users->isEmpty()) {
            $this->command->warn('Chưa có users để gán làm manager. Tạo departments không có manager.');
        }

        $departments = [
            [
                'name' => 'Phòng Kỹ Thuật',
                'code' => 'PKT',
                'description' => 'Phòng ban chịu trách nhiệm về kỹ thuật, thiết kế và giám sát thi công',
                'manager_id' => $users->first()?->id,
                'status' => 'active',
            ],
            [
                'name' => 'Phòng Kế Toán',
                'code' => 'PKE',
                'description' => 'Phòng ban quản lý tài chính, kế toán và ngân sách',
                'manager_id' => $users->skip(1)->first()?->id,
                'status' => 'active',
            ],
            [
                'name' => 'Phòng Nhân Sự',
                'code' => 'PNS',
                'description' => 'Phòng ban quản lý nhân sự, tuyển dụng và đào tạo',
                'manager_id' => $users->skip(2)->first()?->id,
                'status' => 'active',
            ],
            [
                'name' => 'Phòng Vật Tư',
                'code' => 'PVT',
                'description' => 'Phòng ban quản lý vật liệu, thiết bị và kho bãi',
                'manager_id' => $users->skip(3)->first()?->id,
                'status' => 'active',
            ],
            [
                'name' => 'Phòng Giám Sát',
                'code' => 'PGS',
                'description' => 'Phòng ban giám sát chất lượng và tiến độ thi công',
                'manager_id' => $users->skip(4)->first()?->id,
                'status' => 'active',
            ],
        ];

        foreach ($departments as $dept) {
            Department::create($dept);
        }

        $this->command->info('Đã tạo ' . count($departments) . ' phòng ban.');
    }
}
