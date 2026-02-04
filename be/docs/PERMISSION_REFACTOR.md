# Permission System Refactor - Remove Role/Owner Checks

## Tóm tắt

Đã refactor toàn bộ hệ thống để **bỏ tất cả check `role === 'admin' && owner === true`**, thay bằng **permission-based checks**.

## Nguyên tắc mới

1. **Không cần wildcard permission `*`**: Super admin = user có **TẤT CẢ permissions** được gán qua role
2. **Đơn giản hóa `hasPermission()`**: Chỉ check trong permissions array
3. **Permission-based**: Tất cả authorization dựa trên permissions, không hardcode role

## Thay đổi chính

### 1. User Model

#### Trước:
```php
public function hasPermission(string $permission): bool
{
    // Super admin có toàn quyền
    if ($this->role === 'admin' && $this->owner === true) {
        return true;
    }
    
    // Check permissions từ roles...
}
```

#### Sau:
```php
public function getPermissionsArray(): array
{
    return $this->permissions()->pluck('name')->toArray();
}

public function hasPermission(string $permission): bool
{
    $permissions = $this->getPermissionsArray();
    return in_array($permission, $permissions);
}
```

### 2. AuthorizationService

- **Bỏ** `isSuperAdmin()` check trong `can()` và `getProjectPermissions()`
- Super admin sẽ có tất cả permissions → `hasPermission()` sẽ return true cho mọi permission

### 3. Controllers

Tất cả controllers đã được update:
- `CostController.php` - Bỏ super admin check
- `AcceptanceStageController.php` - Bỏ super admin check
- `ContractController.php` - Attachment check dùng permission
- `ProjectPaymentController.php` - Attachment check dùng permission
- `AdditionalCostController.php` - Attachment check dùng permission
- `InputInvoiceController.php` - Attachment check dùng permission
- `AttachmentController.php` - Delete check dùng permission
- `UserController.php` - Delete check dùng permission
- `ProjectController.php` - Bỏ isAdmin() check

### 4. Middleware

- `CheckPermission.php` - Bỏ super admin bypass
- `EnsureAdminIsAuthenticated.php` - Check `settings.manage` permission
- `CheckHRAccess.php` - Check `settings.manage` permission

### 5. Policies

- `ProjectPolicy.php` - Bỏ super admin check, dùng `settings.manage` permission
- `TimeTrackingPolicy.php` - Dùng `settings.manage` permission
- `PayrollPolicy.php` - Dùng `settings.manage` permission
- `BonusPolicy.php` - Dùng `settings.manage` permission

### 6. Seeders

- `SuperAdminSeeder.php` - Update để gán role `super_admin` (có tất cả permissions)
- `AssignSuperAdminRoleSeeder.php` - Seeder mới để gán role `super_admin` cho existing super admin users

## Migration Steps

### 1. Chạy seeders để gán permissions

```bash
# Chạy tất cả seeders (sẽ gán role super_admin cho super admin users)
php artisan db:seed

# Hoặc chỉ chạy seeder gán role
php artisan db:seed --class=AssignSuperAdminRoleSeeder
```

### 2. Verify

- Super admin users (role='admin' && owner=true) sẽ có role `super_admin`
- Role `super_admin` có tất cả permissions (từ `RolePermissionSeeder`)
- `hasPermission()` sẽ return true cho mọi permission

## Files đã được update

### Core
- ✅ `be/app/Models/User.php`
- ✅ `be/app/Services/AuthorizationService.php`

### Controllers
- ✅ `be/app/Http/Controllers/Api/CostController.php`
- ✅ `be/app/Http/Controllers/Api/AcceptanceStageController.php`
- ✅ `be/app/Http/Controllers/Api/ContractController.php`
- ✅ `be/app/Http/Controllers/Api/ProjectPaymentController.php`
- ✅ `be/app/Http/Controllers/Api/AdditionalCostController.php`
- ✅ `be/app/Http/Controllers/Api/InputInvoiceController.php`
- ✅ `be/app/Http/Controllers/Api/AttachmentController.php`
- ✅ `be/app/Http/Controllers/Api/UserController.php`
- ✅ `be/app/Http/Controllers/Api/ProjectController.php`

### Middleware
- ✅ `be/app/Http/Middleware/CheckPermission.php`
- ✅ `be/app/Http/Middleware/EnsureAdminIsAuthenticated.php`
- ✅ `be/app/Http/Middleware/CheckHRAccess.php`

### Policies
- ✅ `be/app/Policies/ProjectPolicy.php`
- ✅ `be/app/Policies/TimeTrackingPolicy.php`
- ✅ `be/app/Policies/PayrollPolicy.php`
- ✅ `be/app/Policies/BonusPolicy.php`

### Seeders
- ✅ `be/database/seeders/SuperAdminSeeder.php`
- ✅ `be/database/seeders/AssignSuperAdminRoleSeeder.php` (mới)
- ✅ `be/database/seeders/DatabaseSeeder.php`

## Lưu ý

1. **AdminUserController**: Check `role === 'admin'` là filter query, không phải permission check → giữ nguyên
2. **Super admin users**: Cần chạy `AssignSuperAdminRoleSeeder` để gán role `super_admin` (có tất cả permissions)
3. **Backward compatible**: `isSuperAdmin()` method vẫn tồn tại nhưng logic đã thay đổi (check permissions thay vì role/owner)

## Testing

Sau khi refactor, cần test:
1. Super admin có thể thực hiện tất cả actions
2. Users với permissions cụ thể chỉ có thể thực hiện actions tương ứng
3. Project-specific permissions hoạt động đúng
4. Global permissions hoạt động đúng cho users chưa assign vào project
