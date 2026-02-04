# Authorization Service Documentation

## Overview

`AuthorizationService` là service tập trung để kiểm tra quyền của user với logic **project-specific strict**.

## Logic Mới

### Nguyên tắc cơ bản

1. **Nếu user đã được assign vào project (có trong `ProjectPersonnel`)**:
   - CHỈ dùng **project-specific permissions** (từ `ProjectPersonnel.permissions`)
   - KHÔNG dùng global permissions (tránh override)

2. **Nếu user chưa được assign vào project**:
   - Dùng **global permissions** (từ roles + direct permissions)
   - Cho phép admin/accountant xem tất cả projects

3. **Super admin**:
   - Luôn có toàn quyền (`*`)

### Ví dụ

#### Scenario 1: Project Manager
```
User: Nguyễn Văn A
Role: "Project Manager" (global)
  → Global permissions: ["project.view", "personnel.assign", "cost.view", ...]

Project 1: Assigned as "Project Manager"
  → Project-specific: ["project.view", "personnel.assign", "cost.view", "contract.create"]
  → Result: Có tất cả quyền ở Project 1

Project 2: Assigned as "Viewer" (chỉ xem)
  → Project-specific: ["project.view"]
  → Result: CHỈ có quyền xem ở Project 2 (không thể assign nhân sự)
```

#### Scenario 2: Accountant
```
User: Trần Thị B
Role: "Accountant" (global)
  → Global permissions: ["cost.view", "payment.view", "invoice.view", ...]

Project 1: NOT assigned (chưa tham gia)
  → Result: Vẫn có thể xem cost/payment/invoice (dùng global)
  → Lý do: Accountant cần xem tất cả để làm báo cáo

Project 2: Assigned as "Viewer"
  → Project-specific: ["project.view", "cost.view"]
  → Result: Có quyền xem (từ project-specific)
```

## API Methods

### `can(User $user, string $permission, $project = null): bool`

Kiểm tra user có permission không.

```php
$authService = app(AuthorizationService::class);

// Check global permission
$canView = $authService->can($user, Permissions::PROJECT_VIEW);

// Check project-specific permission
$canView = $authService->can($user, Permissions::CONTRACT_VIEW, $project);
```

### `getProjectPermissions(User $user, $project): array`

Lấy tất cả permissions của user trong một project.

```php
$permissions = $authService->getProjectPermissions($user, $project);
// Returns: ["contract.view", "contract.create", ...]
```

### `require(User $user, string $permission, $project = null): void`

Yêu cầu permission - throw exception nếu không có quyền.

```php
$authService->require($user, Permissions::CONTRACT_CREATE, $project);
// Throws 403 if not authorized
```

### `isSuperAdmin(User $user): bool`

Kiểm tra user có phải super admin không.

```php
if ($authService->isSuperAdmin($user)) {
    // Super admin logic
}
```

### `isAssignedToProject(User $user, $project): bool`

Kiểm tra user có được assign vào project không.

```php
if ($authService->isAssignedToProject($user, $project)) {
    // User is assigned to project
}
```

## Usage in Controllers

### Before (Old Logic)

```php
public function index(string $projectId)
{
    $project = Project::findOrFail($projectId);
    $user = auth()->user();

    // Check global permission only
    if (!$user->hasPermission(Permissions::PERSONNEL_VIEW)) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }
    
    // ...
}
```

### After (New Logic)

```php
use App\Services\AuthorizationService;

class ProjectPersonnelController extends Controller
{
    protected $authService;

    public function __construct(AuthorizationService $authService)
    {
        $this->authService = $authService;
    }

    public function index(string $projectId)
    {
        $project = Project::findOrFail($projectId);
        $user = auth()->user();

        // Check permission với project context
        if (!$this->authService->can($user, Permissions::PERSONNEL_VIEW, $project)) {
            return response()->json([
                'message' => 'Bạn không có quyền xem danh sách nhân sự của dự án này.'
            ], 403);
        }
        
        // ...
    }
}
```

## Updated Controllers

Các controllers đã được update để dùng `AuthorizationService`:

1. ✅ `PermissionController` - API endpoints cho permissions
2. ✅ `ProjectPersonnelController` - Quản lý nhân sự dự án
3. ✅ `ContractController` - Quản lý hợp đồng
4. ✅ `ProjectCommentController` - Bình luận dự án
5. ✅ `ProjectPaymentController` - Thanh toán dự án

## Benefits

1. **Bảo mật tốt hơn**: Không thể override project restrictions bằng global permissions
2. **Logic rõ ràng**: Nếu đã assign → chỉ dùng project-specific
3. **Linh hoạt**: Admin/Accountant chưa assign vẫn dùng global để xem tất cả
4. **Centralized**: Tất cả logic authorization ở một nơi

## Migration Notes

- Controllers cần inject `AuthorizationService` vào constructor
- Thay `$user->hasPermission()` bằng `$this->authService->can($user, $permission, $project)`
- Update error messages để rõ ràng hơn (thêm "của dự án này")

## Testing

Test cases cần cover:

1. User assigned với project-specific permissions
2. User NOT assigned nhưng có global permissions
3. Super admin có toàn quyền
4. User assigned nhưng không có permission → denied
5. User NOT assigned và không có global permission → denied
