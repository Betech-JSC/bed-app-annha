# Hướng dẫn sử dụng Admin Panel - SkySend

## Tổng quan

Hệ thống quản trị được xây dựng bằng **Inertia.js** với Vue 3, không cần tách API riêng. Tất cả logic được xử lý trực tiếp trong controllers và render qua Inertia.

## Cách truy cập

### 1. Đăng nhập Admin

**URL:** `http://your-domain.com/admin/login`

**Thông tin đăng nhập:**
- Email: `admin@skysend.com` (hoặc email admin đã tạo)
- Password: `password123` (hoặc password đã set)

### 2. Tạo Admin đầu tiên

Nếu chưa có admin, chạy lệnh sau trong tinker hoặc tạo seeder:

```php
php artisan tinker

use App\Models\Admin;
use Illuminate\Support\Facades\Hash;

Admin::create([
    'first_name' => 'Super',
    'last_name' => 'Admin',
    'email' => 'admin@skysend.com',
    'password' => Hash::make('password123'),
    'super_admin' => true,
]);
```

## Cấu trúc Admin Panel

### Routes

Tất cả routes admin được định nghĩa trong `routes/admin.php`:

- `/admin/login` - Đăng nhập
- `/admin` hoặc `/admin/dashboard` - Dashboard
- `/admin/users` - Quản lý người dùng
- `/admin/flights` - Quản lý chuyến bay
- `/admin/orders` - Quản lý đơn hàng

### Controllers

Tất cả controllers nằm trong `app/Http/Controllers/Admin/`:

1. **AuthController** - Xử lý đăng nhập/đăng xuất
2. **DashboardController** - Dashboard tổng quan
3. **UserController** - Quản lý người dùng
4. **FlightController** - Quản lý chuyến bay
5. **OrderController** - Quản lý đơn hàng

### Vue Pages

Tất cả pages nằm trong `resources/js/Pages/Admin/`:

- `Admin/Auth/Login.vue` - Trang đăng nhập
- `Admin/Dashboard/Index.vue` - Dashboard
- `Admin/Users/Index.vue` - Danh sách users
- `Admin/Users/Show.vue` - Chi tiết user
- `Admin/Flights/Index.vue` - Danh sách flights
- `Admin/Flights/Show.vue` - Chi tiết flight
- `Admin/Orders/Index.vue` - Danh sách orders
- `Admin/Orders/Show.vue` - Chi tiết order

### Layout

- `Shared/AdminLayout.vue` - Layout chính cho admin
- `Shared/AdminMainMenu.vue` - Menu sidebar

## Chức năng chi tiết

### 1. Quản lý Người dùng

**URL:** `/admin/users`

**Chức năng:**
- Xem danh sách users với filter (role, status, search)
- Xem chi tiết user (thông tin, thống kê, ví)
- Cập nhật thông tin user
- Khóa/Mở khóa tài khoản
- Xóa vĩnh viễn (kiểm tra đơn hàng đang xử lý)

**Filter:**
- Role: Sender, Customer
- Status: Active, Banned
- Search: Tên, email, số điện thoại

### 2. Quản lý Chuyến bay

**URL:** `/admin/flights`

**Chức năng:**
- Xem danh sách flights với filter (verified, status, route, date)
- Xem chi tiết flight (customer, requests, orders)
- Xác thực chuyến bay
- Từ chối chuyến bay (với lý do)
- Hủy chuyến bay (kiểm tra đơn hàng đang xử lý)

**Filter:**
- Verified: Đã xác thực, Chưa xác thực
- Status: Pending, Verified, Cancelled, Rejected
- Route: From airport, To airport
- Date: Flight date from/to
- Search: Flight number, airline, customer name/email

### 3. Quản lý Đơn hàng

**URL:** `/admin/orders`

**Chức năng:**
- Xem danh sách orders với filter (status, sender, customer, flight, escrow)
- Xem chi tiết order (sender, customer, flight, request, attachments)
- Cập nhật trạng thái đơn hàng (admin có thể override business rules)
- Hủy đơn hàng (tự động hoàn tiền escrow)
- Thêm ghi chú admin

**Filter:**
- Status: Confirmed, Picked up, In transit, Arrived, Delivered, Completed, Cancelled
- Escrow Status: Held, Released, Refunded
- Sender ID, Customer ID, Flight ID
- Date: Created from/to
- Search: Tracking code, UUID, sender/customer name/email

## Middleware

Tất cả routes admin (trừ login) được bảo vệ bởi:
- `auth:admin` - Kiểm tra admin đã đăng nhập
- Session-based authentication

## Shared Data

Trong `HandleInertiaRequests`, admin data được share tự động:

```php
'admin' => [
    'user' => [
        'id' => $admin->id,
        'name' => $admin->name,
        'email' => $admin->email,
        'super_admin' => $admin->super_admin,
    ]
]
```

## Cách sử dụng

1. **Đăng nhập:**
   - Truy cập `/admin/login`
   - Nhập email và password
   - Sau khi đăng nhập thành công, tự động redirect đến `/admin/dashboard`

2. **Quản lý Users:**
   - Vào `/admin/users` để xem danh sách
   - Click vào user để xem chi tiết
   - Có thể filter, search, sort
   - Cập nhật, khóa/mở khóa, xóa user

3. **Quản lý Flights:**
   - Vào `/admin/flights` để xem danh sách
   - Click vào flight để xem chi tiết
   - Xác thực, từ chối, hoặc hủy flight

4. **Quản lý Orders:**
   - Vào `/admin/orders` để xem danh sách
   - Click vào order để xem chi tiết
   - Cập nhật trạng thái, hủy đơn hàng

## Lưu ý

1. **Admin có quyền cao nhất:** Có thể override các business rules thông thường
2. **Safety checks:** Hệ thống kiểm tra đơn hàng đang xử lý trước khi xóa/hủy
3. **Auto refund:** Tự động hoàn tiền escrow khi hủy đơn hàng
4. **Pagination:** Tất cả danh sách đều có pagination (default 15 items/page)
5. **Real-time filter:** Filter và search hoạt động real-time với throttle 150ms

## Development

### Build assets

```bash
npm run dev
# hoặc
npm run build
```

### Chạy server

```bash
php artisan serve
```

### Truy cập

- Admin Panel: `http://localhost:8000/admin`
- Login: `http://localhost:8000/admin/login`

