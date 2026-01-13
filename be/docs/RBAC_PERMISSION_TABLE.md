# RBAC Permission Reference Table

This document provides a quick reference table of all permissions organized by module.

## Permission Table

| Module | Permission | Description |
|--------|-----------|-------------|
| **Project** | `project.view` | View projects |
| | `project.create` | Create new projects |
| | `project.update` | Update projects |
| | `project.delete` | Delete projects |
| | `project.manage` | Full project management |
| **Progress** | `progress.view` | View progress |
| | `progress.update` | Update progress |
| **Acceptance** | `acceptance.view` | View acceptance records |
| | `acceptance.create` | Create acceptance stages |
| | `acceptance.update` | Update acceptance records |
| | `acceptance.delete` | Delete acceptance records |
| | `acceptance.attach_files` | Attach files to acceptance |
| | `acceptance.approve.level_1` | Level 1 approval (Supervisor) |
| | `acceptance.approve.level_2` | Level 2 approval (Project Manager) |
| | `acceptance.approve.level_3` | Level 3 approval (Client/Customer) |
| **Cost** | `cost.view` | View costs |
| | `cost.create` | Create costs |
| | `cost.update` | Update costs |
| | `cost.delete` | Delete costs |
| | `cost.submit` | Submit costs for approval |
| | `cost.approve.management` | Management approval |
| | `cost.approve.accountant` | Accountant confirmation |
| | `cost.reject` | Reject costs |
| **Additional Cost** | `additional_cost.view` | View additional costs |
| | `additional_cost.create` | Create additional costs |
| | `additional_cost.update` | Update additional costs |
| | `additional_cost.delete` | Delete additional costs |
| | `additional_cost.approve` | Approve additional costs |
| | `additional_cost.reject` | Reject additional costs |
| **Material** | `material.view` | View materials |
| | `material.create` | Create materials |
| | `material.update` | Update materials |
| | `material.delete` | Delete materials |
| | `material.approve` | Approve materials |
| **Equipment** | `equipment.view` | View equipment |
| | `equipment.create` | Create equipment |
| | `equipment.update` | Update equipment |
| | `equipment.delete` | Delete equipment |
| | `equipment.approve` | Approve equipment |
| **HR - Time Tracking** | `hr.time_tracking.view` | View time tracking |
| | `hr.time_tracking.create` | Create time tracking |
| | `hr.time_tracking.update` | Update time tracking |
| | `hr.time_tracking.delete` | Delete time tracking |
| | `hr.time_tracking.approve` | Approve time tracking |
| | `hr.time_tracking.reject` | Reject time tracking |
| | `hr.time_tracking.check_in` | Check in |
| | `hr.time_tracking.check_out` | Check out |
| **HR - Payroll** | `hr.payroll.view` | View payroll |
| | `hr.payroll.calculate` | Calculate payroll |
| | `hr.payroll.approve` | Approve payroll |
| | `hr.payroll.pay` | Mark payroll as paid |
| | `hr.payroll.export` | Export payroll |
| **HR - Bonus** | `hr.bonus.view` | View bonuses |
| | `hr.bonus.create` | Create bonuses |
| | `hr.bonus.update` | Update bonuses |
| | `hr.bonus.delete` | Delete bonuses |
| | `hr.bonus.approve` | Approve bonuses |
| | `hr.bonus.pay` | Mark bonus as paid |
| **HR - Employee** | `hr.employee.view` | View employees |
| | `hr.employee.create` | Create employees |
| | `hr.employee.update` | Update employees |
| | `hr.employee.delete` | Delete employees |
| **Report** | `report.view` | View reports |
| | `report.export` | Export reports |
| | `report.financial` | Financial reports |
| | `report.progress` | Progress reports |
| | `report.hr` | HR reports |
| **Invoice** | `invoice.view` | View invoices |
| | `invoice.create` | Create invoices |
| | `invoice.update` | Update invoices |
| | `invoice.delete` | Delete invoices |
| | `invoice.approve` | Approve invoices |
| | `invoice.send` | Send invoices |
| **Contract** | `contract.view` | View contracts |
| | `contract.create` | Create contracts |
| | `contract.update` | Update contracts |
| | `contract.delete` | Delete contracts |
| | `contract.approve` | Approve contracts |
| **Payment** | `payment.view` | View payments |
| | `payment.create` | Create payments |
| | `payment.update` | Update payments |
| | `payment.delete` | Delete payments |
| | `payment.confirm` | Confirm payments |
| **Subcontractor** | `subcontractor.view` | View subcontractors |
| | `subcontractor.create` | Create subcontractors |
| | `subcontractor.update` | Update subcontractors |
| | `subcontractor.delete` | Delete subcontractors |
| **Subcontractor Payment** | `subcontractor_payment.view` | View subcontractor payments |
| | `subcontractor_payment.create` | Create subcontractor payments |
| | `subcontractor_payment.update` | Update subcontractor payments |
| | `subcontractor_payment.delete` | Delete subcontractor payments |
| | `subcontractor_payment.approve` | Approve subcontractor payments |
| | `subcontractor_payment.mark_paid` | Mark as paid |
| **Document** | `document.view` | View documents |
| | `document.upload` | Upload documents |
| | `document.delete` | Delete documents |
| **Construction Log** | `log.view` | View construction logs |
| | `log.create` | Create construction logs |
| | `log.update` | Update construction logs |
| | `log.delete` | Delete construction logs |
| **Defect** | `defect.view` | View defects |
| | `defect.create` | Create defects |
| | `defect.update` | Update defects |
| | `defect.delete` | Delete defects |
| | `defect.verify` | Verify defect fixes |
| **Personnel** | `personnel.view` | View project personnel |
| | `personnel.assign` | Assign personnel to projects |
| | `personnel.remove` | Remove personnel from projects |
| **Revenue** | `revenue.view` | View revenue |
| | `revenue.dashboard` | Revenue dashboard |
| | `revenue.export` | Export revenue data |

## Role Summary

| Role | Permission Count | Key Capabilities |
|------|----------------|------------------|
| **super_admin** | All (~100+) | Full system access |
| **admin** | ~90+ | System management, all operational permissions |
| **project_owner** | ~30+ | View and approve, final approval authority |
| **project_manager** | ~70+ | Full project management, level 2 approvals |
| **site_supervisor** | ~25+ | Site operations, level 1 approvals |
| **accountant** | ~30+ | Financial operations, cost/payroll approvals |
| **client** | ~20+ | View project data, level 3 approvals |

## Quick Reference

### Approval Workflows

**Acceptance Approval:**
- Level 1: `acceptance.approve.level_1` (Site Supervisor)
- Level 2: `acceptance.approve.level_2` (Project Manager)
- Level 3: `acceptance.approve.level_3` (Client/Customer)

**Cost Approval:**
- Management: `cost.approve.management` (Management/Project Owner)
- Accountant: `cost.approve.accountant` (Accountant)

### Common Permission Patterns

- **View**: `{module}.view`
- **Create**: `{module}.create`
- **Update**: `{module}.update`
- **Delete**: `{module}.delete`
- **Approve**: `{module}.approve` or `{module}.approve.level_{n}`
- **Reject**: `{module}.reject`

### Using in Code

```php
use App\Constants\Permissions;

// Check permission
if ($user->hasPermission(Permissions::COST_CREATE)) {
    // Allow cost creation
}

// Check approval level
if ($user->hasPermission(Permissions::ACCEPTANCE_APPROVE_LEVEL_2)) {
    // Allow level 2 approval
}
```
