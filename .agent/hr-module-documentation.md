# Module Nhân Sự (HR Module)

## Tổng quan
Module Nhân Sự cung cấp các chức năng quản lý thông tin nhân viên và KPI (Key Performance Indicators) của họ.

## Cấu trúc Module

### 1. Màn hình chính - Danh sách Nhân Sự
**File**: `/fe/app/(tabs)/hr.tsx`

**Chức năng**:
- Hiển thị danh sách tất cả nhân viên
- Tìm kiếm nhân viên theo tên, email, số điện thoại
- Truy cập nhanh vào danh sách KPI văn phòng
- Điều hướng đến trang chi tiết nhân viên

**Tính năng**:
- ✅ Danh sách nhân viên với avatar, tên, email, số điện thoại
- ✅ Hiển thị vai trò (role) của nhân viên
- ✅ Tìm kiếm real-time
- ✅ Pull-to-refresh
- ✅ Nút truy cập KPI (biểu tượng cúp)
- ✅ Nút thêm nhân viên mới (chỉ admin)

### 2. Màn hình Chi tiết Nhân Viên
**File**: `/fe/app/hr/[id].tsx`

**Chức năng**:
- Xem thông tin chi tiết của nhân viên
- Xem danh sách KPI của nhân viên đó
- Thống kê tổng quan KPI

**Tính năng**:
- ✅ **Tab "Thông tin"**:
  - Avatar và tên nhân viên
  - Vai trò (role badge)
  - Thông tin liên hệ (email, số điện thoại)
  - Tổng quan KPI (tổng số, đạt, đang thực hiện, không đạt)

- ✅ **Tab "KPI"**:
  - Danh sách tất cả KPI của nhân viên
  - Hiển thị tiến độ với progress bar
  - Trạng thái KPI (Đạt, Không đạt, Chờ duyệt, Đang thực hiện)
  - Ngày hạn chót
  - Click vào KPI để xem chi tiết

### 3. Màn hình Quản lý KPI Văn Phòng
**File**: `/fe/app/hr/kpis/index.tsx`

**Chức năng**:
- Quản lý tất cả KPI không gắn với dự án cụ thể
- Tạo KPI mới cho nhân viên
- Xem danh sách KPI theo trạng thái

**Tính năng**:
- ✅ Danh sách KPI với progress bar
- ✅ Lọc theo nhân viên, trạng thái
- ✅ Tạo KPI mới (chọn nhân viên, đặt mục tiêu, đơn vị, thời gian)
- ✅ Hiển thị người được giao KPI
- ✅ Màu sắc trạng thái trực quan

## API Backend

### Endpoints
Tất cả các endpoint KPI văn phòng nằm dưới prefix `/api/hr/kpis`

**Controller**: `OfficeKpiController.php`

| Method | Endpoint | Chức năng | Permission |
|--------|----------|-----------|------------|
| GET | `/hr/kpis` | Lấy danh sách KPI | `KPI_VIEW` hoặc `HR_EMPLOYEE_VIEW` |
| POST | `/hr/kpis` | Tạo KPI mới | `KPI_CREATE` |
| GET | `/hr/kpis/{id}` | Xem chi tiết KPI | - |
| PUT | `/hr/kpis/{id}` | Cập nhật KPI | `KPI_UPDATE` (manager) hoặc owner (chỉ current_value) |
| DELETE | `/hr/kpis/{id}` | Xóa KPI | `KPI_DELETE` |
| POST | `/hr/kpis/{id}/verify` | Xác nhận KPI | `KPI_VERIFY` |

### Model
**File**: `app/Models/Kpi.php`

KPI được lưu trong bảng `kpis` với `project_id = NULL` để phân biệt với KPI của dự án.

**Các trường quan trọng**:
- `user_id`: ID nhân viên được giao KPI
- `title`: Tên KPI
- `description`: Mô tả chi tiết
- `target_value`: Giá trị mục tiêu
- `current_value`: Giá trị hiện tại
- `unit`: Đơn vị đo (%, số lượng, v.v.)
- `status`: Trạng thái (pending, completed, verified_success, verified_fail)
- `start_date`, `end_date`: Thời gian thực hiện
- `created_by`: Người tạo KPI

## Quy trình làm việc với KPI

### 1. Tạo KPI
- Manager/Admin tạo KPI mới
- Chọn nhân viên được giao
- Đặt mục tiêu (target_value) và đơn vị
- Đặt thời gian bắt đầu và kết thúc

### 2. Cập nhật tiến độ
- Nhân viên được giao có thể cập nhật `current_value`
- Khi `current_value >= target_value`, status tự động chuyển sang `completed`

### 3. Xác nhận KPI
- Manager/Admin xác nhận KPI đã hoàn thành
- Đánh giá: `verified_success` hoặc `verified_fail`

## Trạng thái KPI

| Status | Màu sắc | Ý nghĩa |
|--------|---------|---------|
| `pending` | Vàng (#F59E0B) | Đang thực hiện |
| `completed` | Xanh dương (#3B82F6) | Hoàn thành, chờ duyệt |
| `verified_success` | Xanh lá (#10B981) | Đã duyệt - Đạt |
| `verified_fail` | Đỏ (#EF4444) | Đã duyệt - Không đạt |

## Permissions

Các quyền liên quan đến module HR:

- `HR_EMPLOYEE_VIEW`: Xem danh sách nhân viên và KPI của họ
- `KPI_VIEW`: Xem tất cả KPI
- `KPI_CREATE`: Tạo KPI mới
- `KPI_UPDATE`: Cập nhật KPI (manager)
- `KPI_DELETE`: Xóa KPI
- `KPI_VERIFY`: Xác nhận KPI
- `SETTINGS_MANAGE`: Quản lý cài đặt hệ thống (thêm nhân viên mới)

## Luồng điều hướng

```
(tabs)/hr.tsx (Danh sách nhân viên)
    ├─> hr/[id].tsx (Chi tiết nhân viên)
    │       └─> hr/kpis/[id].tsx (Chi tiết KPI)
    │
    └─> hr/kpis/index.tsx (Danh sách KPI văn phòng)
            └─> hr/kpis/[id].tsx (Chi tiết KPI)
```

## Tính năng đã triển khai

✅ Danh sách nhân viên với tìm kiếm
✅ Chi tiết nhân viên với 2 tab (Thông tin, KPI)
✅ Thống kê KPI của nhân viên
✅ Quản lý KPI văn phòng (CRUD)
✅ Cập nhật tiến độ KPI
✅ Xác nhận KPI (verify)
✅ Phân quyền đầy đủ
✅ UI/UX hiện đại với màu sắc trực quan

## Tính năng có thể mở rộng

🔲 Thêm/Sửa/Xóa nhân viên
🔲 Quản lý hợp đồng lao động
🔲 Quản lý lương, thưởng
🔲 Quản lý chấm công
🔲 Quản lý nghỉ phép
🔲 Đánh giá hiệu suất (Performance Review)
🔲 Lịch sử thay đổi KPI
🔲 Xuất báo cáo KPI
🔲 Thông báo khi KPI sắp hết hạn
🔲 Dashboard tổng quan HR

## Ghi chú kỹ thuật

- KPI văn phòng được phân biệt với KPI dự án bằng `project_id = NULL`
- Sử dụng API endpoint `/projects/all-users` để lấy danh sách nhân viên
- Frontend sử dụng React Native với Expo Router
- Backend sử dụng Laravel với Sanctum authentication
