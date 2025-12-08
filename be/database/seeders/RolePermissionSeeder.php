<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Database\Seeder;

class RolePermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Tạo các permissions cơ bản
        $permissions = [
            // Users
            ['name' => 'users.view', 'description' => 'Xem danh sách người dùng'],
            ['name' => 'users.create', 'description' => 'Tạo người dùng mới'],
            ['name' => 'users.edit', 'description' => 'Chỉnh sửa người dùng'],
            ['name' => 'users.delete', 'description' => 'Xóa người dùng'],
            ['name' => 'users.ban', 'description' => 'Khóa/Mở khóa người dùng'],

            // Flights
            ['name' => 'flights.view', 'description' => 'Xem danh sách chuyến bay'],
            ['name' => 'flights.verify', 'description' => 'Xác thực chuyến bay'],
            ['name' => 'flights.reject', 'description' => 'Từ chối chuyến bay'],
            ['name' => 'flights.cancel', 'description' => 'Hủy chuyến bay'],

            // Orders
            ['name' => 'orders.view', 'description' => 'Xem danh sách đơn hàng'],
            ['name' => 'orders.edit', 'description' => 'Chỉnh sửa đơn hàng'],
            ['name' => 'orders.cancel', 'description' => 'Hủy đơn hàng'],
            ['name' => 'orders.update_status', 'description' => 'Cập nhật trạng thái đơn hàng'],

            // Requests
            ['name' => 'requests.view', 'description' => 'Xem danh sách yêu cầu'],
            ['name' => 'requests.delete', 'description' => 'Xóa yêu cầu'],

            // Reviews
            ['name' => 'reviews.view', 'description' => 'Xem đánh giá'],
            ['name' => 'reviews.delete', 'description' => 'Xóa đánh giá'],

            // Reports
            ['name' => 'reports.view', 'description' => 'Xem báo cáo và thống kê'],

            // Settings
            ['name' => 'settings.view', 'description' => 'Xem cấu hình'],
            ['name' => 'settings.edit', 'description' => 'Chỉnh sửa cấu hình'],

            // Roles & Permissions
            ['name' => 'roles.view', 'description' => 'Xem vai trò'],
            ['name' => 'roles.create', 'description' => 'Tạo vai trò'],
            ['name' => 'roles.edit', 'description' => 'Chỉnh sửa vai trò'],
            ['name' => 'roles.delete', 'description' => 'Xóa vai trò'],
            ['name' => 'permissions.view', 'description' => 'Xem quyền'],
            ['name' => 'permissions.create', 'description' => 'Tạo quyền'],
            ['name' => 'permissions.edit', 'description' => 'Chỉnh sửa quyền'],
            ['name' => 'permissions.delete', 'description' => 'Xóa quyền'],
            ['name' => 'permissions.assign', 'description' => 'Phân quyền cho admin'],

            // Files
            ['name' => 'files.view', 'description' => 'Xem danh sách file'],
            ['name' => 'files.delete', 'description' => 'Xóa file'],

            // Notifications
            ['name' => 'notifications.view', 'description' => 'Xem thông báo'],
            ['name' => 'notifications.send', 'description' => 'Gửi thông báo hệ thống'],
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(
                ['name' => $perm['name']],
                $perm
            );
        }

        $this->command->info('Created ' . count($permissions) . ' permissions');

        // Tạo các roles mặc định
        $roles = [
            [
                'name' => 'Super Admin',
                'description' => 'Quản trị viên cấp cao, có tất cả quyền',
                'permissions' => Permission::all()->pluck('name')->toArray(),
            ],
            [
                'name' => 'Manager',
                'description' => 'Quản lý, có quyền xem và chỉnh sửa',
                'permissions' => [
                    'users.view',
                    'users.edit',
                    'flights.view',
                    'flights.verify',
                    'orders.view',
                    'orders.edit',
                    'orders.update_status',
                    'requests.view',
                    'reviews.view',
                    'reports.view',
                    'files.view',
                    'notifications.view',
                ],
            ],
            [
                'name' => 'Support',
                'description' => 'Nhân viên hỗ trợ, chỉ xem và cập nhật trạng thái',
                'permissions' => [
                    'users.view',
                    'flights.view',
                    'orders.view',
                    'orders.update_status',
                    'requests.view',
                    'reviews.view',
                    'notifications.view',
                ],
            ],
        ];

        foreach ($roles as $roleData) {
            $permissionNames = $roleData['permissions'];
            unset($roleData['permissions']);

            $role = Role::firstOrCreate(
                ['name' => $roleData['name']],
                $roleData
            );

            // Gán permissions cho role
            $permissionIds = Permission::whereIn('name', $permissionNames)->pluck('id')->toArray();
            $role->permissions()->sync($permissionIds);
        }

        $this->command->info('Created ' . count($roles) . ' roles');
    }
}
