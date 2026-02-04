# Construction Management App - Permission System Analysis

**Date:** 2025-01-31  
**Context:** Multi-project construction management application (NOT SaaS)  
**Scope:** Permission system architecture review and refactoring recommendations

---

## Executive Summary

The application currently uses a **hybrid permission model** with significant architectural inconsistencies:
- ✅ **Good:** Permission constants system exists (`App\Constants\Permissions`)
- ✅ **Good:** Project-specific permissions via `project_personnel.permissions` JSON field
- ⚠️ **Problem:** Role-based checks (`$user->role`, `$user->owner`) mixed with permission checks
- ⚠️ **Problem:** Business logic (customer_id, project_manager_id) used as authorization
- ⚠️ **Problem:** Inconsistent permission checking patterns across controllers

---

## 1. Current Permission Weaknesses

### 1.1 **Hardcoded Role Checks in Authorization Logic**

**Location:** Throughout backend controllers and policies

**Examples:**
```php
// be/app/Http/Controllers/Api/PermissionController.php:75
if ($user->role === 'admin' && $user->owner === true) {
    return true; // Super admin bypass
}

// be/app/Policies/ProjectPolicy.php:26
if ($user->role === 'admin' && $user->owner === true) {
    return true;
}
```

**Problem:**
- Super admin check is duplicated in 10+ locations
- Hard to change super admin logic (requires code changes everywhere)
- No single source of truth for "who has all permissions"

**Impact:** High - Maintenance burden, error-prone

---

### 1.2 **Business Logic Used as Authorization**

**Location:** `ProjectPolicy.php`, various controllers

**Examples:**
```php
// be/app/Policies/ProjectPolicy.php:31-37
// Customer (owner) can always view
if ($project->customer_id === $user->id) {
    return true;
}

// Project manager can always view
if ($project->project_manager_id === $user->id) {
    return true;
}
```

**Problem:**
- `customer_id` and `project_manager_id` are **business relationships**, not permissions
- These checks bypass the permission system entirely
- If business rules change (e.g., customer can't view until contract signed), requires code changes
- Cannot be configured without code changes

**Impact:** Critical - Violates separation of concerns, makes system inflexible

---

### 1.3 **Dual Permission System (Role-based + Permission-based)**

**Location:** `ProjectPersonnel` model

**Examples:**
```php
// be/app/Models/ProjectPersonnel.php:57-72
public function canView(): bool
{
    return in_array($this->role, [
        'project_manager', 'supervisor', 'accountant', 'viewer', ...
    ]);
}

public function canEdit(): bool
{
    return in_array($this->role, [...]);
}
```

**Problem:**
- `ProjectPersonnel` has both:
  - `role` field (enum: 'project_manager', 'supervisor', etc.)
  - `permissions` field (JSON array: ['contract.view', 'contract.create', ...])
- Methods like `canView()`, `canEdit()` check **role names**, not permissions
- This creates confusion: which system is authoritative?

**Impact:** High - Developers don't know which to use

---

### 1.4 **Inconsistent Permission Checking Patterns**

**Pattern 1:** Direct permission check (Good)
```php
if (!$user->hasPermission(Permissions::CONTRACT_VIEW)) {
    return response()->json([...], 403);
}
```

**Pattern 2:** Role + permission check (Bad)
```php
if (!$user->owner && $user->role !== 'admin' && !$user->hasPermission(...)) {
    // This was removed in recent refactoring, but pattern exists elsewhere
}
```

**Pattern 3:** Business logic check (Bad)
```php
if ($project->customer_id === $user->id) {
    return true; // Bypasses permission system
}
```

**Problem:**
- No consistent pattern across codebase
- New developers don't know which pattern to follow
- Some controllers use policies, others use direct checks

**Impact:** Medium - Code quality and maintainability

---

### 1.5 **Frontend Permission Inconsistencies**

**Location:** React Native components

**Issues:**
- Some screens use `hasPermission()` hook
- Others use `PermissionGuard` component
- Some check `user.role` or `user.owner` directly
- Inconsistent error handling (some show alerts, others show RBAC UI)

**Impact:** Medium - User experience inconsistencies

---

## 2. Areas Where Role-Based Logic is Mixed with Business Logic

### 2.1 **ProjectPolicy.php** - Critical Issues

```php
public function view(User $user, Project $project): bool
{
    // ❌ Role check
    if ($user->role === 'admin' && $user->owner === true) {
        return true;
    }

    // ❌ Business relationship used as authorization
    if ($project->customer_id === $user->id) {
        return true;
    }

    // ❌ Business relationship used as authorization
    if ($project->project_manager_id === $user->id) {
        return true;
    }

    // ✅ Permission-based check (but only as fallback)
    $personnel = ProjectPersonnel::where(...)->first();
    return $personnel && $personnel->canView(); // ⚠️ Still uses role-based canView()
}
```

**Problems:**
1. Customer and Project Manager get automatic access regardless of permissions
2. `canView()` checks role names, not permissions
3. No way to revoke customer access if needed (business requirement)

---

### 2.2 **ProjectPersonnel Model** - Dual System

```php
// Has both systems:
protected $fillable = [
    'role',        // ❌ Role-based: 'project_manager', 'supervisor', etc.
    'permissions', // ✅ Permission-based: ['contract.view', 'contract.create']
];

// Role-based methods (should be removed):
public function canView(): bool { /* checks role */ }
public function canEdit(): bool { /* checks role */ }
public function canApprove(): bool { /* checks role */ }

// Permission-based method (should be used):
public function hasPermission(string $permission): bool { /* checks permissions */ }
```

**Problem:**
- Two systems coexist, causing confusion
- `role` field is used for display but also for authorization (wrong)
- `permissions` field is the correct system but underutilized

---

### 2.3 **Super Admin Bypass Scattered Everywhere**

**Found in:**
- `PermissionController.php` (2 places)
- `CheckPermission.php` middleware
- `ProjectPolicy.php`
- `User.php::hasPermission()`
- Various controllers

**Problem:**
- Super admin logic is duplicated
- If we want to change super admin definition, need to update 10+ files
- No single source of truth

---

## 3. Risks if Scaling Users/Projects

### 3.1 **Performance Risks**

**Current Issues:**
1. **N+1 Query Problem:**
   ```php
   // In PermissionController::projectPermissions()
   $personnel = ProjectPersonnel::where(...)->first(); // Query 1
   $rolePermissions = $user->roles()->with('permissions')->get(); // Query 2
   $directPermissions = $user->directPermissions()->pluck('name'); // Query 3
   ```
   - Each permission check can trigger 3+ queries
   - With 1000 users × 10 projects = 30,000+ queries for permission checks

2. **No Caching:**
   - Permissions are fetched fresh on every request
   - Frontend has no caching (recently removed)
   - Backend has no caching layer

**Scaling Impact:**
- **100 projects, 50 users each:** 5,000 permission checks/day = 15,000+ queries
- **1000 projects, 100 users each:** 100,000 permission checks/day = 300,000+ queries
- **Risk Level:** High - Will cause database bottleneck

---

### 3.2 **Data Integrity Risks**

**Issue:** `project_personnel.permissions` is JSON field

**Problems:**
1. No referential integrity - typos in permission strings not caught
2. No validation that permission exists in `permissions` table
3. Hard to query: "Which users have `contract.view` permission?"
4. Hard to migrate: "Change all `contract.view` to `contracts.view`"

**Scaling Impact:**
- **Risk Level:** Medium - Data quality issues will compound

---

### 3.3 **Authorization Logic Risks**

**Issue:** Business relationships bypass permission system

**Scenario:**
- Customer is removed from project (business decision)
- But `project.customer_id` still points to them
- They still have access via `ProjectPolicy::view()`

**Scaling Impact:**
- **Risk Level:** Critical - Security vulnerability
- With 1000 projects, manual auditing becomes impossible

---

### 3.4 **Maintenance Burden**

**Current State:**
- Permission checks in 50+ controller methods
- Role checks in 20+ locations
- Business logic checks in 10+ locations
- No centralized authorization service

**Scaling Impact:**
- **Risk Level:** High - Adding new features requires touching multiple files
- Bug fixes require changes in multiple places
- Onboarding new developers is difficult

---

## 4. Recommended Refactor Scope (Minimal but Correct)

### 4.1 **Phase 1: Centralize Super Admin Logic** (1-2 days)

**Goal:** Single source of truth for super admin

**Changes:**
1. Create `User::isSuperAdmin(): bool` method
2. Replace all `$user->role === 'admin' && $user->owner === true` with `$user->isSuperAdmin()`
3. Consider using permission `*` (wildcard) instead of role check

**Files to modify:**
- `be/app/Models/User.php` - Add method
- `be/app/Http/Controllers/Api/PermissionController.php` (2 places)
- `be/app/Http/Middleware/CheckPermission.php`
- `be/app/Policies/ProjectPolicy.php`
- All controllers with super admin checks

**Impact:** Low risk, high value

---

### 2. **Phase 2: Replace Business Logic Checks with Permissions** (3-5 days)

**Goal:** Customer and Project Manager access via permissions, not relationships

**Strategy:**
1. **Keep relationships for business logic** (who owns project, who manages it)
2. **Use permissions for authorization** (who can view/edit project)

**Changes:**

**A. Update ProjectPolicy:**
```php
public function view(User $user, Project $project): bool
{
    // Super admin
    if ($user->isSuperAdmin()) {
        return true;
    }

    // Check project-specific permissions
    $personnel = ProjectPersonnel::where('project_id', $project->id)
        ->where('user_id', $user->id)
        ->first();

    if ($personnel && $personnel->hasPermission(Permissions::PROJECT_VIEW)) {
        return true;
    }

    // Check global permissions
    return $user->hasPermission(Permissions::PROJECT_VIEW);
}
```

**B. Migration Strategy:**
- When assigning customer to project, automatically grant `PROJECT_VIEW` permission
- When assigning project manager, automatically grant `PROJECT_VIEW`, `PROJECT_UPDATE` permissions
- Add database migration to backfill permissions for existing relationships

**C. Update Controllers:**
- Remove `customer_id === $user->id` checks
- Remove `project_manager_id === $user->id` checks
- Use permission checks instead

**Files to modify:**
- `be/app/Policies/ProjectPolicy.php`
- Controllers that check `customer_id` or `project_manager_id`
- Add migration to backfill permissions

**Impact:** Medium risk, critical value

---

### 3. **Phase 3: Remove Role-Based Authorization from ProjectPersonnel** (2-3 days)

**Goal:** Use only permission-based system

**Changes:**

**A. Deprecate role-based methods:**
```php
// Mark as deprecated
/**
 * @deprecated Use hasPermission(Permissions::PROJECT_VIEW) instead
 */
public function canView(): bool { ... }

/**
 * @deprecated Use hasPermission(Permissions::PROJECT_UPDATE) instead
 */
public function canEdit(): bool { ... }
```

**B. Keep `role` field for:**
- Display purposes (UI shows "Project Manager", "Supervisor")
- Business logic (who reports to whom)
- **NOT for authorization**

**C. Update all usages:**
- Replace `$personnel->canView()` with `$personnel->hasPermission(Permissions::PROJECT_VIEW)`
- Replace `$personnel->canEdit()` with `$personnel->hasPermission(Permissions::PROJECT_UPDATE)`
- Replace `$personnel->canApprove()` with `$personnel->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_1)`

**Files to modify:**
- `be/app/Models/ProjectPersonnel.php` - Deprecate methods
- `be/app/Policies/ProjectPolicy.php` - Use permissions
- Any controllers using `canView()`, `canEdit()`, etc.

**Impact:** Low risk, high value

---

### 4. **Phase 4: Add Permission Caching** (2-3 days)

**Goal:** Reduce database queries

**Changes:**

**A. Backend Caching:**
```php
// be/app/Services/PermissionService.php (new file)
class PermissionService
{
    public function getUserProjectPermissions(int $userId, int $projectId): array
    {
        $cacheKey = "user:{$userId}:project:{$projectId}:permissions";
        
        return Cache::remember($cacheKey, 300, function () use ($userId, $projectId) {
            // Fetch from database
            return $this->fetchPermissions($userId, $projectId);
        });
    }
    
    public function invalidateUserCache(int $userId, ?int $projectId = null): void
    {
        if ($projectId) {
            Cache::forget("user:{$userId}:project:{$projectId}:permissions");
        } else {
            // Invalidate all projects for user
            Cache::tags(["user:{$userId}"])->flush();
        }
    }
}
```

**B. Frontend Caching:**
- Re-add caching to `useProjectPermissions` hook (with proper invalidation)
- Cache duration: 5 minutes
- Invalidate on permission changes

**Impact:** Low risk, high performance gain

---

### 5. **Phase 5: Standardize Permission Checking** (2-3 days)

**Goal:** Consistent pattern across codebase

**Changes:**

**A. Create Authorization Service:**
```php
// be/app/Services/AuthorizationService.php (new file)
class AuthorizationService
{
    public function can(User $user, string $permission, ?Project $project = null): bool
    {
        // Super admin
        if ($user->isSuperAdmin()) {
            return true;
        }

        // Project-specific check
        if ($project) {
            $personnel = ProjectPersonnel::where('project_id', $project->id)
                ->where('user_id', $user->id)
                ->first();
            
            if ($personnel && $personnel->hasPermission($permission)) {
                return true;
            }
        }

        // Global permission check
        return $user->hasPermission($permission);
    }
    
    public function require(User $user, string $permission, ?Project $project = null): void
    {
        if (!$this->can($user, $permission, $project)) {
            throw new AuthorizationException("Permission denied: {$permission}");
        }
    }
}
```

**B. Update Controllers:**
```php
// Before:
if (!$user->hasPermission(Permissions::CONTRACT_VIEW)) {
    return response()->json([...], 403);
}

// After:
$auth = app(AuthorizationService::class);
$auth->require($user, Permissions::CONTRACT_VIEW, $project);
```

**Impact:** Low risk, improves maintainability

---

## 5. Implementation Priority

### **Must Do (Critical):**
1. ✅ Phase 1: Centralize Super Admin Logic
2. ✅ Phase 2: Replace Business Logic Checks with Permissions
3. ✅ Phase 3: Remove Role-Based Authorization

### **Should Do (High Value):**
4. Phase 4: Add Permission Caching
5. Phase 5: Standardize Permission Checking

### **Nice to Have (Future):**
6. Move `project_personnel.permissions` from JSON to pivot table
7. Add permission inheritance (role templates)
8. Add permission groups

---

## 6. Migration Strategy

### **Step 1: Backfill Permissions** (Database Migration)

```php
// Migration: backfill_project_personnel_permissions.php
public function up()
{
    // For each project:
    // 1. If user is customer_id, grant PROJECT_VIEW
    // 2. If user is project_manager_id, grant PROJECT_VIEW, PROJECT_UPDATE, PROJECT_MANAGE
    // 3. For existing ProjectPersonnel, map role to permissions
    
    DB::transaction(function () {
        // Backfill customer permissions
        $projects = Project::all();
        foreach ($projects as $project) {
            if ($project->customer_id) {
                $this->ensurePermission($project->id, $project->customer_id, [
                    Permissions::PROJECT_VIEW,
                ]);
            }
            
            if ($project->project_manager_id) {
                $this->ensurePermission($project->id, $project->project_manager_id, [
                    Permissions::PROJECT_VIEW,
                    Permissions::PROJECT_UPDATE,
                    Permissions::PROJECT_MANAGE,
                ]);
            }
        }
        
        // Backfill role-based permissions
        $personnel = ProjectPersonnel::all();
        foreach ($personnel as $p) {
            $permissions = $this->getPermissionsForRole($p->role);
            $this->ensurePermission($p->project_id, $p->user_id, $permissions);
        }
    });
}

private function ensurePermission(int $projectId, int $userId, array $permissions): void
{
    $personnel = ProjectPersonnel::where('project_id', $projectId)
        ->where('user_id', $userId)
        ->first();
    
    if (!$personnel) {
        ProjectPersonnel::create([
            'project_id' => $projectId,
            'user_id' => $userId,
            'permissions' => $permissions,
            'assigned_by' => 1, // System
            'assigned_at' => now(),
        ]);
    } else {
        $existing = $personnel->permissions ?? [];
        $merged = array_unique(array_merge($existing, $permissions));
        $personnel->update(['permissions' => $merged]);
    }
}
```

### **Step 2: Update Code Gradually**

1. Update `ProjectPolicy` first (most critical)
2. Update controllers one module at a time
3. Test each module before moving to next
4. Keep old code commented for rollback

### **Step 3: Remove Deprecated Code**

After all modules migrated:
1. Remove deprecated `canView()`, `canEdit()`, etc. methods
2. Remove business logic checks
3. Clean up unused code

---

## 7. Testing Strategy

### **Unit Tests:**
- Test `AuthorizationService::can()` with various scenarios
- Test permission inheritance (project → global)
- Test super admin bypass

### **Integration Tests:**
- Test project access with different permission combinations
- Test customer/project manager access via permissions
- Test permission caching

### **Manual Testing:**
- Test each module after refactoring
- Verify no regression in existing functionality
- Test edge cases (user removed from project, permissions changed)

---

## 8. Risk Mitigation

### **Rollback Plan:**
1. Keep old code commented for 1 release cycle
2. Feature flag for new authorization service
3. Database migration is reversible (can restore old permissions)

### **Gradual Rollout:**
1. Deploy authorization service alongside old code
2. Migrate one module at a time
3. Monitor error logs for permission denials
4. Rollback individual modules if issues found

---

## 9. Success Metrics

### **Code Quality:**
- ✅ Zero hardcoded role checks in authorization
- ✅ Zero business logic checks in authorization
- ✅ Single source of truth for super admin
- ✅ Consistent permission checking pattern

### **Performance:**
- ✅ Permission checks cached (5 min TTL)
- ✅ < 50ms response time for permission checks
- ✅ < 10 database queries per permission check

### **Maintainability:**
- ✅ New features require permission changes only
- ✅ No code changes needed for permission updates
- ✅ Clear separation: business logic vs authorization

---

## 10. Estimated Effort

| Phase | Effort | Risk | Priority |
|-------|--------|------|----------|
| Phase 1: Centralize Super Admin | 1-2 days | Low | Critical |
| Phase 2: Replace Business Logic | 3-5 days | Medium | Critical |
| Phase 3: Remove Role-Based Auth | 2-3 days | Low | Critical |
| Phase 4: Add Caching | 2-3 days | Low | High |
| Phase 5: Standardize Checks | 2-3 days | Low | High |
| **Total** | **10-16 days** | | |

---

## Conclusion

The current permission system has **good foundations** (permission constants, project-specific permissions) but suffers from **architectural inconsistencies** (role checks, business logic in authorization).

**Recommended approach:**
1. ✅ **Minimal refactor** (10-16 days) focusing on critical issues
2. ✅ **Gradual migration** to avoid breaking changes
3. ✅ **Backward compatible** during transition
4. ✅ **Performance improvements** via caching

**Key Principle:** 
> **Business relationships** (customer_id, project_manager_id) define **WHO** is involved.  
> **Permissions** define **WHAT** they can do.  
> These should be **separate concerns**.

This refactor will make the system:
- ✅ More maintainable
- ✅ More flexible (permissions can change without code changes)
- ✅ More secure (single authorization path)
- ✅ More performant (caching)
- ✅ Easier to scale (consistent patterns)
