# RBAC Frontend Integration Guide

## Overview

This document describes how the frontend integrates with the new RBAC (Role-Based Access Control) system. The frontend now uses **permission-based authorization** instead of role-based checks.

## Key Changes

### 1. Permission Constants

All permissions are now defined as constants in `fe/src/constants/Permissions.ts`, matching the backend constants.

**Usage:**
```typescript
import { Permissions } from "@/constants/Permissions";

// Check permission
if (hasPermission(Permissions.COST_CREATE)) {
  // Allow cost creation
}
```

### 2. Permission Checks Instead of Role Checks

**Before (❌ Bad):**
```typescript
if (user?.role === "admin") {
  // Show admin features
}
```

**After (✅ Good):**
```typescript
import { usePermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";

const { hasPermission } = usePermissions();

if (hasPermission(Permissions.PROJECT_DELETE)) {
  // Show delete button
}
```

### 3. PermissionGuard Component

Use `PermissionGuard` to conditionally render components based on permissions:

```typescript
import { PermissionGuard } from "@/components";
import { Permissions } from "@/constants/Permissions";

<PermissionGuard permission={Permissions.COST_CREATE}>
  <TouchableOpacity onPress={handleCreateCost}>
    <Text>Tạo chi phí</Text>
  </TouchableOpacity>
</PermissionGuard>
```

### 4. Project-Level Permissions

For project-specific permissions, use `useProjectPermissions`:

```typescript
import { useProjectPermissions } from "@/hooks/usePermissions";

const { hasPermission } = useProjectPermissions(projectId);

if (hasPermission(Permissions.ACCEPTANCE_APPROVE_LEVEL_2)) {
  // Allow level 2 approval
}
```

## Updated Files

### Core Files
- ✅ `fe/src/constants/Permissions.ts` - Permission constants
- ✅ `fe/src/utils/permissions.ts` - Permission utility functions
- ✅ `fe/app/index.tsx` - Updated to use permission-based routing
- ✅ `fe/app/login.tsx` - Updated to use permission-based routing

### Component Updates
- ✅ `fe/app/projects/[id]/acceptance.tsx` - Uses permission checks for approval levels
- ✅ `fe/app/(tabs)/settings.tsx` - Uses permission checks
- ✅ `fe/app/receipts/index.tsx` - Uses permission checks

## Permission Utility Functions

Located in `fe/src/utils/permissions.ts`:

```typescript
import { isSuperAdmin, hasProjectPermissions, canApproveAtLevel } from "@/utils/permissions";

// Check if user is super admin
if (isSuperAdmin(permissions)) {
  // Full access
}

// Check if user has project permissions
if (hasProjectPermissions(permissions)) {
  // Show project features
}

// Check approval level
if (canApproveAtLevel(permissions, 2)) {
  // Can approve at level 2 or higher
}
```

## Common Permission Patterns

### View Permissions
```typescript
Permissions.PROJECT_VIEW
Permissions.COST_VIEW
Permissions.ACCEPTANCE_VIEW
```

### Create Permissions
```typescript
Permissions.PROJECT_CREATE
Permissions.COST_CREATE
Permissions.ACCEPTANCE_CREATE
```

### Approval Permissions
```typescript
// Multi-level approvals
Permissions.ACCEPTANCE_APPROVE_LEVEL_1  // Supervisor
Permissions.ACCEPTANCE_APPROVE_LEVEL_2  // Project Manager
Permissions.ACCEPTANCE_APPROVE_LEVEL_3  // Client/Customer

// Cost approvals
Permissions.COST_APPROVE_MANAGEMENT     // Management
Permissions.COST_APPROVE_ACCOUNTANT     // Accountant
```

## Migration Checklist

When updating a component:

1. ✅ Replace role checks with permission checks
2. ✅ Import `Permissions` from `@/constants/Permissions`
3. ✅ Use `usePermissions` hook instead of checking `user.role`
4. ✅ Use `PermissionGuard` for conditional rendering
5. ✅ Use project-level permissions for project-specific features

## Examples

### Example 1: Conditional Button Rendering

```typescript
import { PermissionGuard } from "@/components";
import { Permissions } from "@/constants/Permissions";

<PermissionGuard permission={Permissions.COST_CREATE}>
  <TouchableOpacity onPress={handleCreate}>
    <Text>Tạo chi phí</Text>
  </TouchableOpacity>
</PermissionGuard>
```

### Example 2: Approval Button with Level Check

```typescript
import { usePermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";

const { hasPermission } = usePermissions();

{hasPermission(Permissions.ACCEPTANCE_APPROVE_LEVEL_2) && (
  <TouchableOpacity onPress={handleApprove}>
    <Text>Duyệt (Cấp 2)</Text>
  </TouchableOpacity>
)}
```

### Example 3: Multiple Permission Check

```typescript
import { PermissionGuard } from "@/components";
import { Permissions } from "@/constants/Permissions";

<PermissionGuard 
  permissions={[
    Permissions.COST_UPDATE,
    Permissions.COST_DELETE
  ]}
  requireAll={false}  // Show if has ANY permission
>
  <View>
    {/* Edit/Delete buttons */}
  </View>
</PermissionGuard>
```

## Best Practices

1. **Always use constants**: Never hardcode permission strings
   ```typescript
   // ❌ Bad
   hasPermission("cost.create")
   
   // ✅ Good
   hasPermission(Permissions.COST_CREATE)
   ```

2. **Use PermissionGuard for UI**: Use component for conditional rendering
   ```typescript
   // ✅ Good
   <PermissionGuard permission={Permissions.COST_CREATE}>
     <Button />
   </PermissionGuard>
   ```

3. **Check permissions, not roles**: Always check permissions in business logic
   ```typescript
   // ❌ Bad
   if (user.role === "admin") { ... }
   
   // ✅ Good
   if (hasPermission(Permissions.PROJECT_DELETE)) { ... }
   ```

4. **Use project permissions for project features**: Use `useProjectPermissions` for project-specific checks
   ```typescript
   const { hasPermission } = useProjectPermissions(projectId);
   ```

## Testing

When testing permissions:

1. Test with different user roles
2. Verify UI elements are hidden/shown correctly
3. Test approval workflows with different permission levels
4. Verify project-level permissions work correctly

## Troubleshooting

### Permission not working?
- Check if permission name matches backend constant
- Verify user has the permission assigned to their role
- Check if using project permissions when needed

### UI not updating?
- Ensure `usePermissions` hook is being used
- Check if permissions are being fetched correctly
- Verify Redux state is updated

## Next Steps

1. Continue updating remaining components to use permission checks
2. Add permission checks to all CRUD operations
3. Update approval workflows to use permission levels
4. Add permission-based navigation guards
