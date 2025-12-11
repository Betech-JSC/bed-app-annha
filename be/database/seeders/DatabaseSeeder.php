<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Chạy các seeders theo thứ tự
        $this->call([
            RolePermissionSeeder::class, // Chạy trước để tạo roles và permissions
            AdminSeeder::class, // Sau đó mới tạo admins và gán roles
            SuperAdminSeeder::class, // Tạo Super Admin user với toàn quyền truy cập app
            UserRoleSeeder::class, // Tạo các users với các roles khác nhau
            PersonnelRoleSeeder::class, // Tạo các vai trò mặc định cho nhân sự
            PermissionSeeder::class, // Tạo các permissions và gán cho roles
            ProjectSeeder::class, // Tạo dữ liệu mẫu cho module quản lý dự án
            SampleDataSeeder::class, // Tạo dữ liệu mẫu cho tất cả các module (contracts, payments, costs, etc.)
        ]);
    }
}
