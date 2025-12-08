# Admin API Documentation

## Authentication

Tất cả các API endpoints dưới đây yêu cầu:
- Header: `Authorization: Bearer {admin_token}`
- Middleware: `auth:sanctum` và `admin`

**Lưu ý**: Admin cần đăng nhập và lấy token từ Sanctum trước khi sử dụng các API này.

---

## 1. QUẢN LÝ NGƯỜI DÙNG (User Management)

### 1.1 Danh sách người dùng
```
GET /api/admin/users
```

**Query Parameters:**
- `role` (optional): `sender` | `customer`
- `status` (optional): `active` | `banned`
- `search` (optional): Tìm kiếm theo name, email, phone
- `sort_by` (optional): Field để sort (default: `created_at`)
- `sort_order` (optional): `asc` | `desc` (default: `desc`)
- `per_page` (optional): Số items mỗi trang (default: 15)

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "current_page": 1,
    "last_page": 10,
    "per_page": 15,
    "total": 150
  }
}
```

### 1.2 Chi tiết người dùng
```
GET /api/admin/users/{id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "0123456789",
    "role": "sender",
    "wallet": {...},
    "statistics": {
      "orders_as_sender": 10,
      "orders_as_customer": 5,
      "flights_count": 3
    }
  }
}
```

### 1.3 Cập nhật thông tin người dùng
```
PUT /api/admin/users/{id}
```

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "0123456789",
  "role": "sender",
  "password": "newpassword" // optional
}
```

### 1.4 Khóa tài khoản
```
POST /api/admin/users/{id}/ban
```

### 1.5 Mở khóa tài khoản
```
POST /api/admin/users/{id}/unban
```

### 1.6 Xóa vĩnh viễn tài khoản
```
DELETE /api/admin/users/{id}
```

**Lưu ý**: Chỉ xóa được nếu không có đơn hàng đang xử lý.

---

## 2. QUẢN LÝ CHUYẾN BAY (Flight Management)

### 2.1 Danh sách chuyến bay
```
GET /api/admin/flights
```

**Query Parameters:**
- `verified` (optional): `true` | `false`
- `status` (optional): `pending` | `verified` | `cancelled` | `rejected`
- `from_airport` (optional): Mã sân bay đi
- `to_airport` (optional): Mã sân bay đến
- `flight_date_from` (optional): Ngày bắt đầu (Y-m-d)
- `flight_date_to` (optional): Ngày kết thúc (Y-m-d)
- `search` (optional): Tìm kiếm theo flight_number, airline, customer name/email
- `sort_by` (optional): Field để sort
- `sort_order` (optional): `asc` | `desc`
- `per_page` (optional): Số items mỗi trang

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "customer": {...},
      "from_airport": "SGN",
      "to_airport": "HAN",
      "flight_date": "2024-01-15",
      "verified": true,
      "requests_count": 5,
      "orders_count": 2
    }
  ],
  "pagination": {...}
}
```

### 2.2 Chi tiết chuyến bay
```
GET /api/admin/flights/{id}
```

**Response:** Bao gồm customer, requests, orders, attachments

### 2.3 Xác thực chuyến bay
```
POST /api/admin/flights/{id}/verify
```

**Response:**
```json
{
  "success": true,
  "message": "Đã xác thực chuyến bay thành công",
  "data": {...}
}
```

### 2.4 Từ chối chuyến bay
```
POST /api/admin/flights/{id}/reject
```

**Body:**
```json
{
  "reason": "Lý do từ chối"
}
```

### 2.5 Hủy chuyến bay
```
POST /api/admin/flights/{id}/cancel
```

**Body:**
```json
{
  "reason": "Lý do hủy"
}
```

**Lưu ý**: Chỉ hủy được nếu không có đơn hàng đang xử lý.

### 2.6 Thống kê chuyến bay
```
GET /api/admin/flights/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 100,
    "verified": 80,
    "pending": 15,
    "cancelled": 5,
    "with_orders": 60,
    "verification_rate": 80.0
  }
}
```

---

## 3. QUẢN LÝ ĐƠN HÀNG (Order Management)

### 3.1 Danh sách đơn hàng
```
GET /api/admin/orders
```

**Query Parameters:**
- `status` (optional): `confirmed` | `picked_up` | `in_transit` | `arrived` | `delivered` | `completed` | `cancelled`
- `sender_id` (optional): ID của sender
- `customer_id` (optional): ID của customer
- `flight_id` (optional): ID của flight
- `escrow_status` (optional): `held` | `released` | `refunded`
- `created_from` (optional): Ngày bắt đầu (Y-m-d)
- `created_to` (optional): Ngày kết thúc (Y-m-d)
- `search` (optional): Tìm kiếm theo tracking_code, uuid, sender name, customer name
- `sort_by` (optional): Field để sort
- `sort_order` (optional): `asc` | `desc`
- `per_page` (optional): Số items mỗi trang

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "uuid": "...",
      "tracking_code": "ABC123XY",
      "sender": {...},
      "customer": {...},
      "flight": {...},
      "status": "confirmed",
      "reward": 1000000
    }
  ],
  "pagination": {...}
}
```

### 3.2 Chi tiết đơn hàng
```
GET /api/admin/orders/{id}
```

**Response:** Bao gồm sender, customer, flight, request, attachments

### 3.3 Cập nhật trạng thái đơn hàng
```
PUT /api/admin/orders/{id}/status
```

**Body:**
```json
{
  "status": "completed",
  "cancel_reason": "Lý do hủy" // required nếu status = cancelled
  "note": "Ghi chú từ admin" // optional
}
```

**Các trạng thái hợp lệ:**
- `confirmed`
- `picked_up`
- `in_transit`
- `arrived`
- `delivered`
- `completed`
- `cancelled`

**Lưu ý**: Admin có thể cập nhật bất kỳ trạng thái nào, không bị giới hạn bởi luồng trạng thái.

### 3.4 Hủy đơn hàng
```
POST /api/admin/orders/{id}/cancel
```

**Body:**
```json
{
  "cancel_reason": "Lý do hủy"
}
```

**Lưu ý**: Tự động hoàn tiền escrow nếu có.

### 3.5 Thống kê đơn hàng
```
GET /api/admin/orders/statistics
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 500,
    "by_status": {
      "confirmed": 50,
      "picked_up": 30,
      "completed": 400
    },
    "total_revenue": 500000000,
    "total_escrow": 100000000,
    "completion_rate": 80.0
  }
}
```

---

## Error Responses

Tất cả các API có thể trả về các lỗi sau:

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized. Please login first."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "message": "Unauthorized. Admin access required."
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Resource not found."
}
```

### 400 Bad Request
```json
{
  "success": false,
  "message": "Error message here"
}
```

### 422 Validation Error
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "field": ["Error message"]
  }
}
```

---

## Notes

1. Tất cả các API đều sử dụng pagination với default `per_page = 15`
2. Tất cả các timestamps đều ở format ISO 8601
3. Tất cả các số tiền đều tính bằng VNĐ
4. Admin có quyền cao nhất, có thể override các business rules thông thường
5. Khi hủy đơn hàng hoặc chuyến bay, hệ thống tự động xử lý hoàn tiền escrow nếu cần

