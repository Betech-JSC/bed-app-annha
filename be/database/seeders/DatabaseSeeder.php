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
            // 1. Cấu hình hệ thống
            RolePermissionSeeder::class, // Chạy trước để tạo roles và permissions
            PermissionSeeder::class, // Tạo các permissions và gán cho roles
            PersonnelRoleSeeder::class, // Tạo các vai trò mặc định cho nhân sự

            // 2. Users và Admin
            AdminSeeder::class, // Sau đó mới tạo admins và gán roles
            SuperAdminSeeder::class, // Tạo Super Admin user với toàn quyền truy cập app
            UserRoleSeeder::class, // Tạo các users với các roles khác nhau
            CustomerSeeder::class, // Tạo các users có role khách hàng để chọn khi tạo dự án

            // 3. Cấu hình dự án
            DepartmentSeeder::class, // Tạo phòng ban
            CostGroupSeeder::class, // Tạo nhóm chi phí (cần trước BudgetSeeder)
            MaterialSupplierSeeder::class, // Tạo nhà cung cấp vật liệu
            MaterialSeeder::class, // Tạo vật liệu
            EquipmentSeeder::class, // Tạo thiết bị

            // 4. Dự án và dữ liệu liên quan
            ProjectSeeder::class, // Tạo dữ liệu mẫu cho module quản lý dự án
            SampleDataSeeder::class, // Tạo dữ liệu mẫu cho tất cả các module (contracts, payments, costs, etc.)
            BudgetSeeder::class, // Tạo ngân sách dự án
            InvoiceSeeder::class, // Tạo hóa đơn
            ReceiptSeeder::class, // Tạo chứng từ

            // 5. Nhân sự
            PayrollSeeder::class, // Tạo dữ liệu mẫu cho module bảng lương
            WorkScheduleSeeder::class, // Tạo dữ liệu mẫu cho module lịch làm việc
            LeaveSeeder::class, // Tạo đơn nghỉ phép và leave balance
            EmploymentContractSeeder::class, // Tạo hợp đồng lao động
            InsuranceSeeder::class, // Tạo bảo hiểm và phúc lợi
            PerformanceSeeder::class, // Tạo đánh giá hiệu suất

            // 6. Nhắc nhở
            ReminderSeeder::class, // Tạo nhắc nhở
        ]);
    }
}
