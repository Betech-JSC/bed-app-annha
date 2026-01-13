# RBAC System Documentation

## Overview

This document describes the Role-Based Access Control (RBAC) system for the construction management platform. The system is designed with:

- **No duplicated permissions**: Each permission is unique and defined once
- **Clear separation of concerns**: Permissions are module-based
- **Scalable for workflows**: Approval workflows use granular permission levels
- **Permission-based authorization**: Business logic checks permissions, not roles

## Core Principles

1. **Permissions, not roles**: All authorization checks use permission keys, never role names
2. **No implicit inheritance**: Roles only have permissions explicitly assigned
3. **Idempotent seeders**: All seeders can be run multiple times safely
4. **Constants for safety**: Permission and role names are defined as constants

## Permission Structure

### Format

Permissions follow the pattern: `{module}.{action}` or `{module}.{submodule}.{action}`

Examples:
- `project.view`
- `cost.approve.management`
- `hr.time_tracking.approve`
- `acceptance.approve.level_1`

### Permission List

#### Project Module
- `project.view` - View projects
- `project.create` - Create new projects
- `project.update` - Update projects
- `project.delete` - Delete projects
- `project.manage` - Full project management

#### Progress Module
- `progress.view` - View progress
- `progress.update` - Update progress

#### Acceptance Module
- `acceptance.view` - View acceptance records
- `acceptance.create` - Create acceptance stages
- `acceptance.update` - Update acceptance records
- `acceptance.delete` - Delete acceptance records
- `acceptance.attach_files` - Attach files to acceptance
- `acceptance.approve.level_1` - Level 1 approval (Supervisor)
- `acceptance.approve.level_2` - Level 2 approval (Project Manager)
- `acceptance.approve.level_3` - Level 3 approval (Client/Customer)

#### Cost Module
- `cost.view` - View costs
- `cost.create` - Create costs
- `cost.update` - Update costs
- `cost.delete` - Delete costs
- `cost.submit` - Submit costs for approval
- `cost.approve.management` - Management approval
- `cost.approve.accountant` - Accountant confirmation
- `cost.reject` - Reject costs

#### Additional Cost Module
- `additional_cost.view` - View additional costs
- `additional_cost.create` - Create additional costs
- `additional_cost.update` - Update additional costs
- `additional_cost.delete` - Delete additional costs
- `additional_cost.approve` - Approve additional costs
- `additional_cost.reject` - Reject additional costs

#### Material Module
- `material.view` - View materials
- `material.create` - Create materials
- `material.update` - Update materials
- `material.delete` - Delete materials
- `material.approve` - Approve materials

#### Equipment Module
- `equipment.view` - View equipment
- `equipment.create` - Create equipment
- `equipment.update` - Update equipment
- `equipment.delete` - Delete equipment
- `equipment.approve` - Approve equipment

#### HR Module - Time Tracking
- `hr.time_tracking.view` - View time tracking
- `hr.time_tracking.create` - Create time tracking
- `hr.time_tracking.update` - Update time tracking
- `hr.time_tracking.delete` - Delete time tracking
- `hr.time_tracking.approve` - Approve time tracking
- `hr.time_tracking.reject` - Reject time tracking
- `hr.time_tracking.check_in` - Check in
- `hr.time_tracking.check_out` - Check out

#### HR Module - Payroll
- `hr.payroll.view` - View payroll
- `hr.payroll.calculate` - Calculate payroll
- `hr.payroll.approve` - Approve payroll
- `hr.payroll.pay` - Mark payroll as paid
- `hr.payroll.export` - Export payroll

#### HR Module - Bonus
- `hr.bonus.view` - View bonuses
- `hr.bonus.create` - Create bonuses
- `hr.bonus.update` - Update bonuses
- `hr.bonus.delete` - Delete bonuses
- `hr.bonus.approve` - Approve bonuses
- `hr.bonus.pay` - Mark bonus as paid

#### HR Module - Employee
- `hr.employee.view` - View employees
- `hr.employee.create` - Create employees
- `hr.employee.update` - Update employees
- `hr.employee.delete` - Delete employees

#### Report Module
- `report.view` - View reports
- `report.export` - Export reports
- `report.financial` - Financial reports
- `report.progress` - Progress reports
- `report.hr` - HR reports

#### Invoice Module
- `invoice.view` - View invoices
- `invoice.create` - Create invoices
- `invoice.update` - Update invoices
- `invoice.delete` - Delete invoices
- `invoice.approve` - Approve invoices
- `invoice.send` - Send invoices

#### Contract Module
- `contract.view` - View contracts
- `contract.create` - Create contracts
- `contract.update` - Update contracts
- `contract.delete` - Delete contracts
- `contract.approve` - Approve contracts

#### Payment Module
- `payment.view` - View payments
- `payment.create` - Create payments
- `payment.update` - Update payments
- `payment.delete` - Delete payments
- `payment.confirm` - Confirm payments

#### Subcontractor Module
- `subcontractor.view` - View subcontractors
- `subcontractor.create` - Create subcontractors
- `subcontractor.update` - Update subcontractors
- `subcontractor.delete` - Delete subcontractors

#### Subcontractor Payment Module
- `subcontractor_payment.view` - View subcontractor payments
- `subcontractor_payment.create` - Create subcontractor payments
- `subcontractor_payment.update` - Update subcontractor payments
- `subcontractor_payment.delete` - Delete subcontractor payments
- `subcontractor_payment.approve` - Approve subcontractor payments
- `subcontractor_payment.mark_paid` - Mark as paid

#### Document Module
- `document.view` - View documents
- `document.upload` - Upload documents
- `document.delete` - Delete documents

#### Construction Log Module
- `log.view` - View construction logs
- `log.create` - Create construction logs
- `log.update` - Update construction logs
- `log.delete` - Delete construction logs

#### Defect Module
- `defect.view` - View defects
- `defect.create` - Create defects
- `defect.update` - Update defects
- `defect.delete` - Delete defects
- `defect.verify` - Verify defect fixes

#### Personnel Module
- `personnel.view` - View project personnel
- `personnel.assign` - Assign personnel to projects
- `personnel.remove` - Remove personnel from projects

#### Revenue Module
- `revenue.view` - View revenue
- `revenue.dashboard` - Revenue dashboard
- `revenue.export` - Export revenue data

## Core Roles

### super_admin
- **Description**: Super administrator with full system access
- **Permissions**: All permissions
- **Use Case**: System administrators who need complete control

### admin
- **Description**: System administrator with management capabilities
- **Permissions**: Most permissions except super admin functions
- **Use Case**: General administrators managing the system

### project_owner
- **Description**: Project owner with full project control
- **Permissions**: View and approve project-related items, final approval authority
- **Use Case**: Clients or stakeholders who own projects

### project_manager
- **Description**: Manages projects and coordinates resources
- **Permissions**: Full project management, create/update/delete project items, level 2 approvals
- **Use Case**: Project managers responsible for project execution

### site_supervisor
- **Description**: Supervises construction site operations
- **Permissions**: Site operations, create/update logs and defects, level 1 approvals
- **Use Case**: On-site supervisors managing daily operations

### accountant
- **Description**: Handles financial and accounting operations
- **Permissions**: Financial operations, cost approvals, payroll, invoices, payments
- **Use Case**: Accounting staff managing finances

### client
- **Description**: Client with view and approval permissions
- **Permissions**: View project data, final approvals (level 3)
- **Use Case**: External clients viewing project status

## Role-Permission Mapping

### Super Admin
- All permissions

### Admin
- All project permissions
- All HR permissions
- All financial permissions
- All reporting permissions
- All operational permissions

### Project Owner
- Project view and management
- Progress view and update
- Acceptance view and level 3 approval
- Cost view and management approval
- Contract and payment approvals
- Report viewing

### Project Manager
- Full project management
- Progress management
- Acceptance create/update and level 2 approval
- Cost full access
- Material and equipment management
- Contract and payment management
- Personnel management
- Reporting

### Site Supervisor
- Project view and update
- Progress view and update
- Acceptance create/update and level 1 approval
- Cost create and submit
- Material and equipment view/create/update
- Time tracking approval
- Log and defect management
- Personnel view and assign

### Accountant
- Project view
- Cost view and accountant approval
- Additional cost view and approval
- Payment full access
- Invoice full access
- Subcontractor payment approval
- Payroll and bonus management
- Financial reporting

### Client
- Project view
- Progress view
- Acceptance view and level 3 approval
- Cost view
- Contract view and approval
- Payment view
- Invoice view
- Document view
- Log view
- Defect view
- Report viewing

## Usage in Code

### Checking Permissions

```php
use App\Constants\Permissions;

// In controllers or middleware
if (!$user->hasPermission(Permissions::COST_CREATE)) {
    return response()->json(['error' => 'Unauthorized'], 403);
}

// Check approval level
if ($user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) {
    // Allow level 2 approval
}
```

### Using Constants

```php
use App\Constants\Permissions;
use App\Constants\Roles;

// Always use constants, never hardcode strings
$permission = Permissions::PROJECT_VIEW;
$role = Roles::PROJECT_MANAGER;
```

## Seeder Execution Order

1. **RoleSeeder** - Creates core roles
2. **PermissionSeeder** - Creates all permissions
3. **RolePermissionSeeder** - Maps permissions to roles

Run seeders:
```bash
php artisan db:seed --class=RoleSeeder
php artisan db:seed --class=PermissionSeeder
php artisan db:seed --class=RolePermissionSeeder
```

Or run all:
```bash
php artisan db:seed
```

## Extending the System

### Adding a New Module

1. **Add permissions to Constants/Permissions.php**:
```php
// New module permissions
public const NEW_MODULE_VIEW = 'new_module.view';
public const NEW_MODULE_CREATE = 'new_module.create';
public const NEW_MODULE_UPDATE = 'new_module.update';
public const NEW_MODULE_DELETE = 'new_module.delete';
```

2. **Update PermissionSeeder** - Permissions are auto-generated from constants

3. **Update RolePermissionSeeder** - Assign new permissions to appropriate roles

4. **Use in code**:
```php
if ($user->hasPermission(Permissions::NEW_MODULE_CREATE)) {
    // Allow creation
}
```

### Adding a New Approval Level

1. **Add permission constant**:
```php
public const MODULE_APPROVE_LEVEL_4 = 'module.approve.level_4';
```

2. **Update workflow logic** to check the new level:
```php
if ($user->hasPermission(Permissions::MODULE_APPROVE_LEVEL_4)) {
    // Level 4 approval logic
}
```

3. **Assign to appropriate role** in RolePermissionSeeder

### Adding a New Role

1. **Add to Constants/Roles.php**:
```php
public const NEW_ROLE = 'new_role';
```

2. **Update RoleSeeder** to create the role

3. **Update RolePermissionSeeder** to assign permissions

## Best Practices

1. **Never check roles directly**:
   ```php
   // ❌ Bad
   if ($user->role === 'admin') { ... }
   
   // ✅ Good
   if ($user->hasPermission(Permissions::PROJECT_DELETE)) { ... }
   ```

2. **Use constants, not strings**:
   ```php
   // ❌ Bad
   $user->hasPermission('project.view');
   
   // ✅ Good
   $user->hasPermission(Permissions::PROJECT_VIEW);
   ```

3. **Check permissions, not roles in business logic**:
   ```php
   // ❌ Bad
   if (in_array($user->role, ['admin', 'project_manager'])) { ... }
   
   // ✅ Good
   if ($user->hasPermission(Permissions::COST_APPROVE_MANAGEMENT)) { ... }
   ```

4. **Use granular permissions for workflows**:
   ```php
   // ✅ Good - granular approval levels
   if ($user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) { ... }
   ```

5. **Follow least-privilege principle**: Only assign permissions that are necessary

## Migration Notes

When migrating from the old system:

1. Run the new seeders to create roles and permissions
2. Map existing users to new roles
3. Update all permission checks in code to use constants
4. Remove hardcoded role checks
5. Test all workflows with new permission system

## Summary

- **Total Permissions**: ~100+ permissions across all modules
- **Core Roles**: 7 roles (super_admin, admin, project_owner, project_manager, site_supervisor, accountant, client)
- **Permission Format**: `{module}.{action}` or `{module}.{submodule}.{action}`
- **Approval Levels**: Multi-level approval workflows supported (level_1, level_2, level_3)
- **Extension**: Easy to add new modules, roles, or approval levels
