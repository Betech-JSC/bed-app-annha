# Hướng dẫn sử dụng Ant Design cho CMS Admin

## Cài đặt

Chạy lệnh sau để cài đặt Ant Design Vue:

```bash
cd /Users/toannguyen/Projects/skysend/be
npm install ant-design-vue@4.x @ant-design/icons-vue
```

Hoặc nếu dùng yarn:

```bash
yarn add ant-design-vue@4.x @ant-design/icons-vue
```

## Cấu hình

### 1. app.js

Ant Design đã được cấu hình trong `resources/js/app.js`:

```javascript
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'

createApp({ render: () => h(App, props) })
  .use(plugin)
  .use(Antd)  // Đã thêm
  .mount(el)
```

### 2. Layout

Layout mới sử dụng Ant Design: `resources/js/Shared/AdminLayoutAntd.vue`

- Sử dụng `a-layout`, `a-layout-sider`, `a-layout-header`, `a-layout-content`
- Menu sidebar với icons từ `@ant-design/icons-vue`
- Responsive với collapse sidebar
- Flash messages với `a-alert`

## Các Pages đã được cập nhật

### 1. Login (`Admin/Auth/Login.vue`)
- Sử dụng `a-card`, `a-form`, `a-input`, `a-button`
- Validation với Ant Design Form rules
- UI đẹp với gradient background

### 2. Dashboard (`Admin/Dashboard/Index.vue`)
- Sử dụng `a-row`, `a-col`, `a-card`, `a-statistic`
- Statistics cards với màu sắc phân biệt
- Table với `a-table` để hiển thị đơn hàng gần đây

### 3. Users Management
- **Index**: `a-table` với search, filter, pagination
- **Show**: `a-form`, `a-descriptions` để hiển thị và cập nhật thông tin

### 4. Flights Management
- **Index**: Table với filter theo verified status và status
- **Show**: Form để verify/reject/cancel flight với modals

### 5. Orders Management
- **Index**: Table với filter theo status và escrow status
- **Show**: Form để cập nhật order status

## Components Ant Design được sử dụng

### Layout
- `a-layout`, `a-layout-sider`, `a-layout-header`, `a-layout-content`
- `a-menu` với icons

### Data Display
- `a-table` - Bảng dữ liệu với pagination, sorting, filtering
- `a-card` - Card container
- `a-statistic` - Hiển thị số liệu thống kê
- `a-descriptions` - Mô tả thông tin
- `a-tag` - Tags cho status
- `a-typography-title` - Tiêu đề

### Form
- `a-form`, `a-form-item` - Form container
- `a-input`, `a-input-search`, `a-input-password` - Input fields
- `a-textarea` - Textarea
- `a-select`, `a-select-option` - Dropdown select
- `a-checkbox` - Checkbox
- `a-button` - Buttons với nhiều variants

### Feedback
- `a-alert` - Thông báo flash messages
- `a-modal` - Modal dialogs
- `message` - Toast notifications
- `Modal.confirm` - Confirmation dialogs

### Navigation
- `a-dropdown` - Dropdown menu
- `a-space` - Spacing component

### Icons
- `DashboardOutlined`, `UserOutlined`, `PlaneOutlined`, `ShoppingOutlined`
- `MenuFoldOutlined`, `MenuUnfoldOutlined`, `DownOutlined`

## Tính năng

### 1. Responsive Design
- Tất cả pages đều responsive với `a-col` breakpoints (`xs`, `sm`, `md`, `lg`)
- Sidebar có thể collapse trên mobile

### 2. Search & Filter
- Search input với `a-input-search`
- Filter dropdowns với `a-select`
- Real-time filtering với Inertia.js

### 3. Tables
- Pagination tự động
- Sorting và filtering
- Custom cell rendering với slots
- Row actions

### 4. Forms
- Validation với Ant Design rules
- Loading states
- Error handling
- Success/error messages

### 5. Modals
- Confirm dialogs cho các actions quan trọng
- Form modals cho reject/cancel

## Cách sử dụng

1. **Cài đặt dependencies:**
   ```bash
   npm install
   ```

2. **Build assets:**
   ```bash
   npm run dev
   # hoặc
   npm run build
   ```

3. **Truy cập admin panel:**
   - URL: `http://localhost:8000/admin/login`
   - Đăng nhập với admin credentials

## Lưu ý

1. **CSS**: Ant Design CSS đã được import trong `app.js`
2. **Icons**: Tất cả icons từ `@ant-design/icons-vue`
3. **Inertia Integration**: Tất cả navigation sử dụng Inertia router
4. **Flash Messages**: Sử dụng `$page.props.flash` từ Inertia
5. **Form Handling**: Sử dụng `useForm` từ Inertia để xử lý forms

## Migration từ Tailwind

Các pages admin đã được migrate hoàn toàn từ Tailwind sang Ant Design:
- ✅ Login page
- ✅ Dashboard
- ✅ Users Index & Show
- ✅ Flights Index & Show
- ✅ Orders Index & Show
- ✅ Admin Layout

Tất cả đều sử dụng Ant Design components và styling.

