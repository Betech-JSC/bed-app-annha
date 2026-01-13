# RBAC UI Updates - Implementation Guide

## Overview

This document tracks the implementation of permission-based UI controls across the application. All UI elements (buttons, actions, forms) should be wrapped with `PermissionGuard` or checked with `usePermissions` hook.

## Implementation Status

### ✅ Completed
- `fe/app/projects/index.tsx` - Project list with create/edit/delete guards
- `fe/app/projects/[id]/index.tsx` - Project detail with edit/delete guards
- `fe/app/projects/[id]/costs.tsx` - Cost create/submit/approve guards
- `fe/app/projects/[id]/logs.tsx` - Log create/edit/delete guards

### 🔄 In Progress
- `fe/app/projects/[id]/defects.tsx` - Defect create/edit/delete/verify
- `fe/app/projects/[id]/acceptance.tsx` - Acceptance approval levels
- `fe/app/projects/[id]/payments.tsx` - Payment create/confirm
- `fe/app/projects/[id]/subcontractors.tsx` - Subcontractor CRUD
- `fe/app/projects/[id]/budget.tsx` - Budget CRUD

### 📋 Pending
- `fe/app/projects/[id]/contract.tsx`
- `fe/app/projects/[id]/personnel.tsx`
- `fe/app/projects/[id]/materials.tsx`
- `fe/app/projects/[id]/equipment.tsx`
- `fe/app/projects/[id]/invoices.tsx`
- `fe/app/projects/[id]/revenue.tsx`

## Permission Mapping

### Project Module
- `Permissions.PROJECT_VIEW` - View projects
- `Permissions.PROJECT_CREATE` - Create project button
- `Permissions.PROJECT_UPDATE` - Edit project button
- `Permissions.PROJECT_DELETE` - Delete project button

### Cost Module
- `Permissions.COST_VIEW` - View costs
- `Permissions.COST_CREATE` - Create cost button
- `Permissions.COST_UPDATE` - Edit cost button
- `Permissions.COST_DELETE` - Delete cost button
- `Permissions.COST_SUBMIT` - Submit for approval button
- `Permissions.COST_APPROVE_MANAGEMENT` - Management approval button
- `Permissions.COST_APPROVE_ACCOUNTANT` - Accountant approval button
- `Permissions.COST_REJECT` - Reject cost button

### Log Module
- `Permissions.LOG_VIEW` - View logs
- `Permissions.LOG_CREATE` - Create log button
- `Permissions.LOG_UPDATE` - Edit log button
- `Permissions.LOG_DELETE` - Delete log button

### Defect Module
- `Permissions.DEFECT_VIEW` - View defects
- `Permissions.DEFECT_CREATE` - Create defect button
- `Permissions.DEFECT_UPDATE` - Edit defect button
- `Permissions.DEFECT_DELETE` - Delete defect button
- `Permissions.DEFECT_VERIFY` - Verify defect fix button

### Acceptance Module
- `Permissions.ACCEPTANCE_VIEW` - View acceptance
- `Permissions.ACCEPTANCE_CREATE` - Create acceptance button
- `Permissions.ACCEPTANCE_UPDATE` - Edit acceptance button
- `Permissions.ACCEPTANCE_APPROVE_LEVEL_1` - Level 1 approval button
- `Permissions.ACCEPTANCE_APPROVE_LEVEL_2` - Level 2 approval button
- `Permissions.ACCEPTANCE_APPROVE_LEVEL_3` - Level 3 approval button

## Implementation Pattern

### Pattern 1: Using PermissionGuard Component

```typescript
import { PermissionGuard } from "@/components";
import { Permissions } from "@/constants/Permissions";

<PermissionGuard permission={Permissions.COST_CREATE} projectId={projectId}>
  <TouchableOpacity onPress={handleCreate}>
    <Text>Tạo chi phí</Text>
  </TouchableOpacity>
</PermissionGuard>
```

### Pattern 2: Using usePermissions Hook

```typescript
import { usePermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";

const { hasPermission } = usePermissions();

{hasPermission(Permissions.COST_UPDATE) && (
  <TouchableOpacity onPress={handleEdit}>
    <Text>Chỉnh sửa</Text>
  </TouchableOpacity>
)}
```

### Pattern 3: Project-Level Permissions

```typescript
import { useProjectPermissions } from "@/hooks/usePermissions";
import { Permissions } from "@/constants/Permissions";

const { hasPermission } = useProjectPermissions(projectId);

{hasPermission(Permissions.ACCEPTANCE_APPROVE_LEVEL_2) && (
  <TouchableOpacity onPress={handleApprove}>
    <Text>Duyệt (Cấp 2)</Text>
  </TouchableOpacity>
)}
```

## Action Blocking

For actions that should be blocked (not just hidden), add permission checks in handlers:

```typescript
const handleDelete = async () => {
  if (!hasPermission(Permissions.COST_DELETE)) {
    Alert.alert("Lỗi", "Bạn không có quyền xóa chi phí này");
    return;
  }
  // ... delete logic
};
```

## Checklist for Each Screen

- [ ] Import `Permissions` from `@/constants/Permissions`
- [ ] Import `PermissionGuard` from `@/components` or `usePermissions` hook
- [ ] Wrap create buttons with `PermissionGuard`
- [ ] Wrap edit buttons with `PermissionGuard`
- [ ] Wrap delete buttons with `PermissionGuard`
- [ ] Wrap approve/reject buttons with appropriate permission guards
- [ ] Add permission checks in action handlers (blocking)
- [ ] Test with different user roles
- [ ] Verify UI elements are hidden when user lacks permission

## Notes

- Always use constants, never hardcode permission strings
- Use project-level permissions (`useProjectPermissions`) for project-specific features
- Use global permissions (`usePermissions`) for system-wide features
- Remember to pass `projectId` to `PermissionGuard` when checking project-level permissions
