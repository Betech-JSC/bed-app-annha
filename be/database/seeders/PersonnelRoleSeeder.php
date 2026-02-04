<?php

namespace Database\Seeders;

use App\Models\PersonnelRole;
use Illuminate\Database\Seeder;

class PersonnelRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Tạo các vai trò mặc định cho nhân sự dự án
     */
    public function run(): void
    {
        $roles = [
            [
                'code' => 'project_manager',
                'name' => 'Quản lý dự án',
                'description' => 'Quản lý dự án có toàn quyền quản lý dự án',
                'sort_order' => 1,
            ],
            [
                'code' => 'supervisor',
                'name' => 'Giám sát',
                'description' => 'Giám sát công trường có quyền quản lý và giám sát tiến độ thi công',
                'sort_order' => 2,
            ],
            [
                'code' => 'accountant',
                'name' => 'Kế toán',
                'description' => 'Kế toán có quyền xem và xác nhận các giao dịch tài chính, thanh toán',
                'sort_order' => 3,
            ],
            [
                'code' => 'management',
                'name' => 'Ban điều hành',
                'description' => 'Ban điều hành có quyền duyệt các chi phí và quyết định quan trọng trong dự án',
                'sort_order' => 4,
            ],
            [
                'code' => 'team_leader',
                'name' => 'Tổ trưởng',
                'description' => 'Tổ trưởng quản lý nhóm thợ và giám sát công việc hàng ngày',
                'sort_order' => 5,
            ],
            [
                'code' => 'worker',
                'name' => 'Thợ',
                'description' => 'Thợ thực hiện công việc thi công tại công trường',
                'sort_order' => 6,
            ],
            [
                'code' => 'designer',
                'name' => 'Bên Thiết Kế',
                'description' => 'Bên thiết kế có quyền xem và chỉnh sửa các tài liệu thiết kế',
                'sort_order' => 7,
            ],
            [
                'code' => 'supervisor_guest',
                'name' => 'Giám sát khách',
                'description' => 'Giám sát đại diện khách hàng, có quyền giám sát và phê duyệt một số công việc',
                'sort_order' => 8,
            ],
            [
                'code' => 'editor',
                'name' => 'Chỉnh sửa',
                'description' => 'Có quyền chỉnh sửa nội dung dự án',
                'sort_order' => 9,
            ],
            [
                'code' => 'viewer',
                'name' => 'Xem',
                'description' => 'Chỉ có quyền xem thông tin dự án',
                'sort_order' => 10,
            ],
            [
                'code' => 'guest',
                'name' => 'Khách',
                'description' => 'Khách hàng có quyền xem tiến độ và thông tin dự án',
                'sort_order' => 11,
            ],
        ];

        $this->command->info('Đang tạo các vai trò nhân sự dự án...');

        foreach ($roles as $roleData) {
            $role = PersonnelRole::firstOrCreate(
                ['code' => $roleData['code']],
                $roleData
            );

            if ($role->wasRecentlyCreated) {
                $this->command->info("✅ Đã tạo role: {$role->name} ({$role->code})");
            } else {
                // Update nếu có thay đổi
                $role->update($roleData);
                $this->command->info("ℹ️  Role đã tồn tại: {$role->name} ({$role->code})");
            }
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã tạo ' . count($roles) . ' vai trò nhân sự dự án!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
    }
}
