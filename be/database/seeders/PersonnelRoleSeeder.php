<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class PersonnelRoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * 
     * Tạo các vai trò mặc định cho hệ thống quản lý nhân sự
     */
    public function run(): void
    {
        $roles = [
            [
                'name' => 'Ban điều hành',
                'description' => 'Ban điều hành có quyền duyệt các chi phí và quyết định quan trọng trong dự án',
            ],
            [
                'name' => 'Kế toán',
                'description' => 'Kế toán có quyền xem và xác nhận các giao dịch tài chính, thanh toán',
            ],
            [
                'name' => 'Tổ trưởng',
                'description' => 'Tổ trưởng quản lý nhóm thợ và giám sát công việc hàng ngày',
            ],
            [
                'name' => 'Thợ',
                'description' => 'Thợ thực hiện công việc thi công tại công trường',
            ],
            [
                'name' => 'Khách',
                'description' => 'Khách hàng có quyền xem tiến độ và thông tin dự án',
            ],
            [
                'name' => 'Giám sát khách',
                'description' => 'Giám sát đại diện khách hàng, có quyền giám sát và phê duyệt một số công việc',
            ],
            [
                'name' => 'Bên Thiết Kế',
                'description' => 'Bên thiết kế có quyền xem và chỉnh sửa các tài liệu thiết kế',
            ],
            [
                'name' => 'Giám sát',
                'description' => 'Giám sát công trường có quyền quản lý và giám sát tiến độ thi công',
            ],
            [
                'name' => 'Quản lý dự án',
                'description' => 'Quản lý dự án có toàn quyền quản lý dự án',
            ],
        ];

        $this->command->info('Đang tạo các vai trò mặc định...');

        foreach ($roles as $roleData) {
            $role = Role::firstOrCreate(
                ['name' => $roleData['name']],
                $roleData
            );

            if ($role->wasRecentlyCreated) {
                $this->command->info("✅ Đã tạo role: {$role->name}");
            } else {
                $this->command->info("ℹ️  Role đã tồn tại: {$role->name}");
            }
        }

        $this->command->newLine();
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->info('✅ Đã tạo ' . count($roles) . ' vai trò mặc định!');
        $this->command->info('═══════════════════════════════════════════════════');
        $this->command->newLine();
    }
}
