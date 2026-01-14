# Hướng Dẫn Seeder Dữ Liệu Mẫu

## Tổng Quan

Seeder này tạo dữ liệu mẫu đầy đủ cho Module Quản Lý Dự Án và RBAC để test tổng quan chức năng hệ thống.

## Cách Chạy

### Chạy tất cả seeders (Khuyến nghị)

```bash
php artisan db:seed
```

Hoặc nếu muốn refresh database:

```bash
php artisan migrate:fresh --seed
```

### Chạy từng seeder riêng lẻ

```bash
# 1. RBAC System
php artisan db:seed --class=RoleSeeder
php artisan db:seed --class=PermissionSeeder
php artisan db:seed --class=RolePermissionSeeder

# 2. Users
php artisan db:seed --class=SuperAdminSeeder
php artisan db:seed --class=UserRoleSeeder

# 3. Settings
php artisan db:seed --class=CostGroupSeeder
php artisan db:seed --class=SettingSeeder

# 4. Projects
php artisan db:seed --class=ProjectSeeder
php artisan db:seed --class=ProjectPersonnelSeeder
php artisan db:seed --class=ProjectPhaseTaskSeeder
php artisan db:seed --class=AcceptanceWorkflowSeeder

# 5. Financial Data
php artisan db:seed --class=BudgetSeeder
php artisan db:seed --class=SampleDataSeeder

# 6. Reminders
php artisan db:seed --class=ReminderSeeder
```

## Dữ Liệu Được Tạo

### 1. RBAC System

- **7 Core Roles:**
  - `super_admin` - Super Administrator với toàn quyền
  - `admin` - System Administrator
  - `project_owner` - Chủ dự án (Customer)
  - `project_manager` - Quản lý dự án
  - `site_supervisor` - Giám sát công trường
  - `accountant` - Kế toán
  - `client` - Khách hàng (Guest)

- **100+ Permissions:** Tất cả permissions được định nghĩa trong `App\Constants\Permissions`

- **Role-Permission Mappings:** Mỗi role được gán các permissions phù hợp

### 2. Users (30-40 users)

#### Super Admin Accounts:
- `superadmin@skysend.com` / `superadmin123` (Super Admin)
- `hradmin@skysend.com` / `hradmin123` (HR Admin)

#### Test Accounts (Password: `{role}123456`):
- **Project Managers (5 users):** `pm1@test.com` - `pm5@test.com`
- **Site Supervisors (5 users):** `supervisor1@test.com` - `supervisor5@test.com`
- **Project Owners/Customers (5 users):** `customer1@test.com` - `customer5@test.com`
- **Accountants (3 users):** `accountant1@test.com` - `accountant3@test.com`
- **Management (2 users):** `management1@test.com` - `management2@test.com`
- **Designers (3 users):** `designer1@test.com` - `designer3@test.com`
- **Team Leaders (5 users):** `teamleader1@test.com` - `teamleader5@test.com`
- **Workers (10 users):** `worker1@test.com` - `worker10@test.com`
- **Supervisor Guests (3 users):** `supervisorguest1@test.com` - `supervisorguest3@test.com`

### 3. Projects (10-11 projects)

Các dự án với các trạng thái khác nhau:
- **Planning:** Dự án đang lên kế hoạch
- **In Progress:** Dự án đang thi công (với tiến độ 20-80%)
- **Completed:** Dự án đã hoàn thành (100%)

Mỗi dự án có:
- Customer (Project Owner)
- Project Manager
- Project Progress record
- Personnel assignments

### 4. Project Data

#### Phases & Tasks:
- 3-5 phases mỗi project
- 10-20 tasks mỗi project (hierarchical với parent_id)
- Tasks có các status: `not_started`, `in_progress`, `completed`, `delayed`, `on_hold`

#### Acceptance Workflows:
- 2-4 acceptance stages mỗi project
- 3-5 acceptance items mỗi stage
- Các workflow status: `pending`, `supervisor_approved`, `project_manager_approved`, `customer_approved`, `rejected`

#### Financial Data:
- **Budgets:** Ngân sách cho các projects với budget items
- **Contracts:** Hợp đồng cho mỗi project
- **Payments:** 3-6 payment schedules mỗi project
- **Costs:** Chi phí với các status: `draft`, `pending_management_approval`, `pending_accountant_approval`, `approved`, `rejected`
- **Additional Costs:** Chi phí phát sinh

#### Construction Data:
- **Construction Logs:** 10-20 logs mỗi project
- **Defects:** 5-10 defects mỗi project với các status: `open`, `in_progress`, `fixed`, `verified`, `closed`
- **Change Requests:** 2-5 change requests mỗi project

### 5. Settings

- **Cost Groups:** 7 nhóm chi phí (Vật liệu, Nhân công, Thiết bị, Vận chuyển, Nhà thầu phụ, Quản lý, Khác)
- **System Settings:** Các cài đặt hệ thống

## Lưu Ý

1. **Thứ tự quan trọng:** Seeders phải chạy theo thứ tự trong `DatabaseSeeder` để đảm bảo dependencies được tạo đúng.

2. **Idempotent:** Tất cả seeders sử dụng `firstOrCreate` hoặc `syncWithoutDetaching`, nên có thể chạy lại nhiều lần mà không tạo duplicate.

3. **Test Accounts:** Tất cả test accounts có password dạng `{role}123456` để dễ nhớ.

4. **RBAC:** Hệ thống sử dụng permission-based authorization, không phải role-based. Mỗi role được gán các permissions cụ thể.

## Troubleshooting

### Lỗi: "Super Admin chưa được tạo"
- Chạy `SuperAdminSeeder` hoặc `UserRoleSeeder` trước

### Lỗi: "Chưa có dự án nào"
- Chạy `ProjectSeeder` trước các seeders liên quan đến projects

### Lỗi: "Chưa có nhóm chi phí"
- Chạy `CostGroupSeeder` trước `BudgetSeeder`

### Lỗi: "Role not found"
- Đảm bảo đã chạy `RoleSeeder` và `RolePermissionSeeder` trước `UserRoleSeeder`

## Xem Chi Tiết

- **RBAC System:** Xem `be/docs/RBAC_SYSTEM.md`
- **Test Accounts:** Xem `be/database/seeders/TEST_ACCOUNTS.md`
- **Permissions:** Xem `be/docs/RBAC_PERMISSION_TABLE.md`
