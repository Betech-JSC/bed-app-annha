# Danh Sách Tài Khoản Test

Tài liệu này liệt kê tất cả các tài khoản test được tạo bởi seeders để tester có thể test toàn bộ chức năng hệ thống.

## Quy Tắc Password

Tất cả passwords đều theo format: `{role}123456`

Ví dụ:
- Project Manager: `projectmanager123456`
- Supervisor: `supervisor123456`
- Customer: `customer123456`

## Danh Sách Tài Khoản Theo Role

### 1. Super Admin
- **Email**: `superadmin@test.com`
- **Password**: `admin123456`
- **Role**: Admin (owner=true)
- **Permissions**: Toàn quyền hệ thống
- **Mô tả**: Tài khoản quản trị viên cao cấp, có toàn quyền truy cập và quản lý

### 2. HR Admin
- **Email**: `hradmin@test.com`
- **Password**: `hradmin123456`
- **Role**: Admin
- **Permissions**: Toàn quyền HR module
- **Mô tả**: Quản trị viên module nhân sự

### 3. Project Managers (5 users)
- **Email**: 
  - `pm1@test.com`
  - `pm2@test.com`
  - `pm3@test.com`
  - `pm4@test.com`
  - `pm5@test.com`
- **Password**: `projectmanager123456`
- **Role**: Quản lý dự án
- **Permissions**: 
  - Quản lý toàn bộ dự án (create, update, delete)
  - Duyệt nghiệm thu (project_manager_approved)
  - Quản lý nhân sự dự án
  - Xem và quản lý chi phí
  - Quản lý hợp đồng và thanh toán
- **Mô tả**: Quản lý dự án, có quyền quản lý toàn bộ các module trong dự án

### 4. Supervisors (5 users)
- **Email**:
  - `supervisor1@test.com`
  - `supervisor2@test.com`
  - `supervisor3@test.com`
  - `supervisor4@test.com`
  - `supervisor5@test.com`
- **Password**: `supervisor123456`
- **Role**: Giám sát
- **Permissions**:
  - Xem và cập nhật dự án
  - Duyệt nghiệm thu (supervisor_approved)
  - Quản lý nhân sự dự án
  - Duyệt chấm công
  - Tạo và quản lý chi phí
  - Xem và tạo nhật ký công trình
  - Quản lý lỗi (defects)
- **Mô tả**: Giám sát công trường, có quyền duyệt ở bước đầu tiên của workflow nghiệm thu

### 5. Customers (5 users)
- **Email**:
  - `customer1@test.com`
  - `customer2@test.com`
  - `customer3@test.com`
  - `customer4@test.com`
  - `customer5@test.com`
- **Password**: `customer123456`
- **Role**: Khách hàng
- **Permissions**:
  - Xem dự án
  - Xem hợp đồng và thanh toán
  - Xem doanh thu
  - Xem nghiệm thu
  - Duyệt nghiệm thu (customer_approved) - bước cuối cùng
- **Mô tả**: Khách hàng, có quyền xem thông tin dự án và duyệt nghiệm thu ở bước cuối

### 6. Accountants (3 users)
- **Email**:
  - `accountant1@test.com`
  - `accountant2@test.com`
  - `accountant3@test.com`
- **Password**: `accountant123456`
- **Role**: Kế toán
- **Permissions**:
  - Xem dự án và hợp đồng
  - Xác nhận thanh toán
  - Xem và duyệt chi phí (approve_accountant)
  - Xem và quản lý bảng lương
  - Xem doanh thu và xuất báo cáo
  - Duyệt thanh toán thầu phụ
- **Mô tả**: Kế toán, có quyền quản lý tài chính và duyệt chi phí ở bước cuối

### 7. Management (Ban điều hành) (2 users)
- **Email**:
  - `management1@test.com`
  - `management2@test.com`
- **Password**: `management123456`
- **Role**: Ban điều hành
- **Permissions**: Toàn quyền hệ thống
- **Mô tả**: Ban điều hành, có toàn quyền như Admin, đặc biệt duyệt chi phí ở bước đầu

### 8. Designers (3 users)
- **Email**:
  - `designer1@test.com`
  - `designer2@test.com`
  - `designer3@test.com`
- **Password**: `designer123456`
- **Role**: Bên Thiết Kế
- **Permissions**:
  - Xem dự án
  - Xem, upload và xóa tài liệu
  - Xem và tạo lỗi (defects)
- **Mô tả**: Bên thiết kế, có quyền quản lý tài liệu thiết kế

### 9. Team Leaders (5 users)
- **Email**:
  - `teamleader1@test.com`
  - `teamleader2@test.com`
  - `teamleader3@test.com`
  - `teamleader4@test.com`
  - `teamleader5@test.com`
- **Password**: `teamleader123456`
- **Role**: Tổ trưởng
- **Permissions**:
  - Xem dự án
  - Quản lý nhân sự (assign personnel)
  - Xem và tạo chấm công
  - Xem và tạo nhật ký công trình
  - Quản lý lỗi (defects)
  - Quản lý khối lượng hoàn thành
  - Quản lý đội/tổ
- **Mô tả**: Tổ trưởng, quản lý nhóm thợ và giám sát công việc hàng ngày

### 10. Workers (10 users)
- **Email**:
  - `worker1@test.com`
  - `worker2@test.com`
  - `worker3@test.com`
  - `worker4@test.com`
  - `worker5@test.com`
  - `worker6@test.com`
  - `worker7@test.com`
  - `worker8@test.com`
  - `worker9@test.com`
  - `worker10@test.com`
- **Password**: `worker123456`
- **Role**: Thợ
- **Permissions**:
  - Xem dự án
  - Xem và tạo chấm công
  - Xem và tạo nhật ký công trình
- **Mô tả**: Thợ, có quyền xem thông tin và tạo nhật ký công trình

### 11. Supervisor Guests (3 users)
- **Email**:
  - `supervisorguest1@test.com`
  - `supervisorguest2@test.com`
  - `supervisorguest3@test.com`
- **Password**: `supervisorguest123456`
- **Role**: Giám sát khách
- **Permissions**:
  - Xem dự án và hợp đồng
  - Duyệt hợp đồng
  - Xem thanh toán
  - Duyệt chi phí phát sinh
  - Xem doanh thu
  - Xem và duyệt nghiệm thu (limited)
  - Xem và tạo lỗi
  - Xác nhận nghiệm thu khối lượng
- **Mô tả**: Giám sát đại diện khách hàng, có quyền giám sát và phê duyệt một số công việc

## Workflow Duyệt Nghiệm Thu

### Thứ tự duyệt:
1. **Supervisor** → `supervisor_approved`
2. **Project Manager** → `project_manager_approved`
3. **Customer** → `customer_approved`

### Test Scenarios:

#### Scenario 1: Workflow bình thường
1. Login với `supervisor1@test.com` / `supervisor123456`
2. Duyệt acceptance stage (status: `pending` → `supervisor_approved`)
3. Login với `pm1@test.com` / `projectmanager123456`
4. Duyệt acceptance stage (status: `supervisor_approved` → `project_manager_approved`)
5. Login với `customer1@test.com` / `customer123456`
6. Duyệt acceptance stage (status: `project_manager_approved` → `customer_approved`)

#### Scenario 2: Reject workflow
1. Login với `supervisor1@test.com`
2. Reject acceptance stage → tự động tạo defect
3. Fix defect → verify defect
4. Resubmit acceptance stage

#### Scenario 3: Test với defects
1. Tạo defect cho acceptance stage
2. Thử duyệt customer → sẽ bị chặn nếu còn defects chưa verified
3. Fix và verify defect
4. Duyệt customer → thành công

## Workflow Duyệt Chi Phí

### Thứ tự duyệt:
1. **Submit** → `pending_management_approval`
2. **Management** → `pending_accountant_approval`
3. **Accountant** → `approved`

### Test Scenarios:

#### Scenario 1: Workflow bình thường
1. Login với `pm1@test.com`
2. Tạo cost và submit
3. Login với `management1@test.com` / `management123456`
4. Duyệt cost (status: `pending_management_approval` → `pending_accountant_approval`)
5. Login với `accountant1@test.com` / `accountant123456`
6. Duyệt cost (status: `pending_accountant_approval` → `approved`)

#### Scenario 2: Reject workflow
1. Management reject cost → status: `rejected`
2. PM có thể chỉnh sửa và submit lại

## Workflow Change Request

### Thứ tự workflow:
1. **Create** → `draft`
2. **Submit** → `submitted`
3. **Review** → `under_review`
4. **Approve/Reject** → `approved` / `rejected`
5. **Implement** → `implemented`

### Test Scenarios:
1. Login với `pm1@test.com`
2. Tạo change request (status: `draft`)
3. Submit change request (status: `submitted`)
4. Login với `pm2@test.com` (reviewer)
5. Review và approve/reject
6. Nếu approved, implement change request

## Projects Được Gán

Các users được gán vào projects với các role khác nhau qua `ProjectPersonnel`:

- Mỗi project có:
  - 1 Project Manager
  - 2-3 Supervisors
  - 1-2 Supervisor Guests
  - 1 Accountant
  - 1 Management
  - 2-3 Team Leaders
  - 5-10 Workers
  - 1-2 Designers

## Lưu Ý

1. Tất cả passwords đều dạng `{role}123456` để dễ nhớ
2. Email format: `{role}{number}@test.com`
3. Một số users có thể được gán vào nhiều projects với role khác nhau
4. Để test đầy đủ workflow, cần login với các account khác nhau theo thứ tự workflow
5. Data được tạo ở nhiều trạng thái khác nhau để test các scenario khác nhau

## Quick Reference

| Role | Email Pattern | Password | Key Permission |
|------|---------------|----------|----------------|
| Super Admin | `superadmin@test.com` | `admin123456` | Toàn quyền |
| Project Manager | `pm{1-5}@test.com` | `projectmanager123456` | Quản lý dự án, duyệt PM |
| Supervisor | `supervisor{1-5}@test.com` | `supervisor123456` | Duyệt Supervisor |
| Customer | `customer{1-5}@test.com` | `customer123456` | Duyệt Customer |
| Accountant | `accountant{1-3}@test.com` | `accountant123456` | Duyệt Accountant |
| Management | `management{1-2}@test.com` | `management123456` | Duyệt Management |
| Designer | `designer{1-3}@test.com` | `designer123456` | Quản lý tài liệu |
| Team Leader | `teamleader{1-5}@test.com` | `teamleader123456` | Quản lý nhóm |
| Worker | `worker{1-10}@test.com` | `worker123456` | Tạo logs |
| Supervisor Guest | `supervisorguest{1-3}@test.com` | `supervisorguest123456` | Duyệt limited |
