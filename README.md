# BED App An Nhà — Hệ thống Quản lý Dự án Xây dựng

> **Project Name**: BED App An Nhà  
> **Organization**: Betech JSC  
> **Last Updated**: 2026-03-26  
> **Status**: Production

---

## 📋 Mục lục

1. [Tổng quan Hệ thống](#-tổng-quan-hệ-thống)
2. [Kiến trúc & Tech Stack](#-kiến-trúc--tech-stack)
3. [Cấu trúc Source Code](#-cấu-trúc-source-code)
4. [Database Schema & Models](#-database-schema--models)
5. [Hệ thống Phân quyền (RBAC)](#-hệ-thống-phân-quyền-rbac)
6. [Quy trình Duyệt (Approval Workflows)](#-quy-trình-duyệt-approval-workflows)
7. [Modules chức năng](#-modules-chức-năng)
8. [API Architecture](#-api-architecture)
9. [CRM Web Application](#-crm-web-application)
10. [Mobile Application](#-mobile-application)
11. [Business Services](#-business-services)
12. [Realtime & Notifications](#-realtime--notifications)
13. [Hướng dẫn Development](#-hướng-dẫn-development)
14. [Deployment](#-deployment)
15. [Patterns & Conventions](#-patterns--conventions)

---

## 🏗 Tổng quan Hệ thống

BED App An Nhà là hệ thống **ERP chuyên ngành xây dựng** bao gồm:

| Thành phần | Mô tả | Đường dẫn |
|------------|--------|-----------|
| **Backend API** | Laravel 11 REST API + Inertia.js CRM | `/be` |
| **Mobile App** | React Native (Expo 54) iOS/Android | `/fe` |
| **CRM Dashboard** | Vue 3 + Ant Design Vue (Inertia SSR) | `/be/resources/js/Pages/Crm` |

### Sơ đồ Kiến trúc tổng quan

```
┌────────────────────┐     ┌─────────────────────┐
│   Mobile App (FE)  │     │   CRM Dashboard     │
│   React Native     │     │   Vue 3 + AntD Vue  │
│   Expo Router      │     │   Inertia.js SSR    │
└────────┬───────────┘     └──────────┬──────────┘
         │ REST API                    │ Inertia
         │ (Sanctum Token)             │ (Session Auth)
         ▼                             ▼
┌──────────────────────────────────────────────────┐
│            Laravel 11 Backend (BE)               │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ Api/     │  │ Admin/    │  │ Services/    │  │
│  │Controllers│  │Controllers│  │ (Business)   │  │
│  └────┬─────┘  └─────┬─────┘  └──────┬───────┘  │
│       │               │               │          │
│  ┌────▼───────────────▼───────────────▼───────┐  │
│  │         65 Eloquent Models                 │  │
│  │    (Projects, Costs, Acceptance, etc.)     │  │
│  └────────────────┬───────────────────────────┘  │
│                   │                              │
│  ┌────────────────▼───────────────────────────┐  │
│  │         MySQL / PostgreSQL                 │  │
│  │         159+ Migrations                    │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐  │
│  │ Reverb   │  │ Firebase  │  │ File Storage │  │
│  │WebSocket │  │ Push FCM  │  │ (local/S3)   │  │
│  └──────────┘  └───────────┘  └──────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## 🛠 Kiến trúc & Tech Stack

### Backend (`/be`)

| Công nghệ | Version | Mục đích |
|------------|---------|----------|
| **PHP** | ^8.2 | Runtime |
| **Laravel** | ^11.1 | Framework |
| **Inertia.js** | ^1.0 | CRM SPA bridge |
| **Laravel Sanctum** | ^4.0 | API Authentication (Token) |
| **Laravel Reverb** | ^1.5 | WebSocket Server (Realtime) |
| **Firebase (kreait)** | ^6.1 | Push Notifications (FCM) |
| **Maatwebsite Excel** | ^3.1 | Export Excel/CSV |
| **Laravel Socialite** | ^5.23 | OAuth (Google, Facebook, Apple) |
| **Glide** | ^2.0 | Image processing / thumbnail |

### CRM Frontend (`/be/resources/js`)

| Công nghệ | Version | Mục đích |
|------------|---------|----------|
| **Vue 3** | ^3.2.27 | UI Framework |
| **Ant Design Vue** | 4.2.1 | Component Library |
| **Inertia.js Vue3** | ^1.0.15 | SPA Navigation |
| **TailwindCSS** | ^3.4.3 | Utility CSS |
| **Chart.js + vue-chartjs** | ^4.5.1 | Biểu đồ |
| **Pusher.js** | ^8.4.0 | WebSocket client |
| **Vite** | ^5.2.7 | Build tool |

### Mobile Frontend (`/fe`)

| Công nghệ | Version | Mục đích |
|------------|---------|----------|
| **React Native** | 0.81.5 | Mobile framework |
| **Expo** | ^54.0.0 | Development platform |
| **Expo Router** | ~6.0.14 | File-based routing |
| **NativeWind** | ^4.2.1 | TailwindCSS for RN |
| **Redux Toolkit** | ^2.9.2 | State management |
| **Axios** | ^1.12.2 | HTTP client |
| **date-fns** | ^4.1.0 | Date manipulation |
| **Moti** | ^0.30.0 | Animations |
| **react-native-gifted-charts** | ^1.4.70 | Charts |
| **Firebase** | ^12.5.0 | Push notifications |
| **Sentry** | ^7.5.0 | Error tracking |

---

## 📂 Cấu trúc Source Code

### Backend (`/be`)

```
be/
├── app/
│   ├── Console/              # Artisan commands, schedulers
│   ├── Constants/
│   │   ├── Permissions.php   # 🔐 TẤT CẢ permission constants (~100+ permissions)
│   │   └── Roles.php         # 7 vai trò hệ thống
│   ├── Events/               # Broadcasting events
│   ├── Helpers/
│   │   └── helpers.php       # Global helper functions
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Admin/        # 🖥 CRM Controllers (25 files)
│   │   │   │   ├── CrmProjectsController.php  # ⭐ 2046 dòng — Core CRM
│   │   │   │   ├── CrmApprovalController.php   # Trung tâm duyệt
│   │   │   │   ├── CrmDashboardController.php  # Dashboard
│   │   │   │   ├── CrmFinanceController.php    # Tài chính
│   │   │   │   ├── CrmHrController.php         # Nhân sự
│   │   │   │   ├── CrmReportController.php     # Báo cáo
│   │   │   │   ├── CrmSettingsController.php   # Cài đặt
│   │   │   │   └── ...
│   │   │   ├── Api/          # 📱 Mobile API Controllers (59 files)
│   │   │   │   ├── AcceptanceStageController.php
│   │   │   │   ├── CostController.php
│   │   │   │   ├── DefectController.php
│   │   │   │   ├── ProjectController.php
│   │   │   │   ├── ApprovalCenterController.php
│   │   │   │   └── ...
│   │   │   └── Auth/         # Authentication controllers
│   │   └── Middleware/
│   ├── Jobs/                 # Queue jobs
│   ├── Models/               # 📦 65 Eloquent Models
│   ├── Observers/            # Model observers
│   ├── Policies/             # Authorization policies
│   ├── Providers/            # Service providers
│   ├── Services/             # 💼 28 Business Services
│   └── Traits/               # Shared traits
├── database/
│   └── migrations/           # 159 migration files
├── routes/
│   ├── api.php               # 📱 Mobile API routes (~44KB)
│   ├── admin.php             # 🖥 CRM routes (~27KB)
│   ├── auth.php              # Auth routes
│   └── web.php               # Public web routes
└── resources/
    └── js/
        └── Pages/
            └── Crm/          # 🖥 CRM Vue Pages
                ├── Dashboard/
                ├── Projects/
                │   └── Show.vue  # ⭐ 3061 dòng — Project Detail (19 tabs)
                ├── Approvals/
                ├── Finance/
                ├── Hr/
                ├── Reports/
                ├── Settings/
                └── ...
```

### Mobile Frontend (`/fe`)

```
fe/
├── App.tsx                   # Entry point
├── app/                      # Expo Router pages
│   ├── (tabs)/               # Bottom tab navigation
│   │   ├── index.tsx         # Home
│   │   ├── projects.tsx      # Projects list
│   │   ├── reports.tsx       # Reports
│   │   ├── hr.tsx            # HR
│   │   └── settings.tsx      # Settings
│   ├── projects/
│   │   ├── index.tsx         # Project list (60KB)
│   │   ├── create.tsx        # Create project
│   │   └── [id]/             # 📱 30+ Project detail screens
│   │       ├── index.tsx     # Project overview
│   │       ├── acceptance.tsx
│   │       ├── costs.tsx
│   │       ├── payments.tsx
│   │       ├── defects.tsx
│   │       ├── materials.tsx
│   │       ├── equipment.tsx
│   │       ├── subcontractors.tsx
│   │       ├── logs.tsx
│   │       ├── budget.tsx
│   │       ├── invoices.tsx
│   │       ├── progress.tsx
│   │       └── ...
│   ├── approvals/            # Approval center
│   ├── accounting/           # Accounting module
│   ├── equipment/            # Equipment management
│   ├── materials/            # Materials management
│   ├── notifications/        # Notification center
│   └── monitoring/           # Project monitoring
├── src/
│   ├── api/                  # 📡 51 API service files
│   │   ├── api.ts            # Base Axios instance + interceptors
│   │   ├── projectApi.ts
│   │   ├── acceptanceApi.ts
│   │   ├── costApi.ts
│   │   └── ...
│   ├── components/           # 📦 32 reusable components
│   │   ├── AcceptanceChecklist.tsx  # ⭐ 93KB — Core acceptance flow
│   │   ├── GanttChart.tsx          # Gantt chart
│   │   ├── ProgressChart.tsx
│   │   ├── FileUploader.tsx
│   │   └── ...
│   ├── constants/            # App constants
│   ├── hooks/                # Custom React hooks
│   ├── reducers/             # Redux reducers
│   ├── services/             # Non-API services
│   ├── store.ts              # Redux store config
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions
```

---

## 📦 Database Schema & Models

### Tổng quan: 65 Models

#### 🏢 Core Project Management

| Model | Table | Mô tả | Quantifiable |
|-------|-------|--------|------|
| `Project` | `projects` | Dự án xây dựng | ~7.6KB model |
| `Contract` | `contracts` | Hợp đồng dự án | Giá trị, thanh toán |
| `ProjectPhase` | `project_phases` | Giai đoạn dự án (phần thô, hoàn thiện...) | Tiến độ % |
| `ProjectTask` | `project_tasks` | Công việc (tiến độ WBS) — cây phân cấp `parent_id` | A → A' → A'' |
| `ProjectTaskDependency` | `project_task_dependencies` | Phụ thuộc công việc (FS/SS/FF/SF) | Gantt |
| `ProjectProgress` | `project_progress` | Tiến độ thực tế | % hoàn thành |
| `ProjectPersonnel` | `project_personnel` | Nhân sự dự án + vai trò + quyền | RBAC |
| `ProjectComment` | `project_comments` | Bình luận dự án (nested replies) | Thread |
| `ProjectBudget` | `project_budgets` | Ngân sách dự án | VNĐ |
| `BudgetItem` | `budget_items` | Hạng mục ngân sách | Phân bổ |
| `ProjectRisk` | `project_risks` | Rủi ro dự án | Mức độ |
| `ChangeRequest` | `change_requests` | Yêu cầu thay đổi (phát sinh) | Duyệt |
| `ProjectEvmMetric` | `project_evm_metrics` | Earned Value Management | SPI/CPI |

#### 💰 Financial Management

| Model | Table | Mô tả |
|-------|-------|--------|
| `Cost` | `costs` | Chi phí dự án — workflow `draft → submitted → approved → confirmed` |
| `CostGroup` | `cost_groups` | Nhóm chi phí (vật liệu, nhân công, máy móc...) |
| `AdditionalCost` | `additional_costs` | Chi phí phát sinh — workflow duyệt 2 bước |
| `ProjectPayment` | `project_payments` | Thanh toán từ khách hàng — workflow 3 cấp |
| `Invoice` | `invoices` | Hóa đơn đầu ra (cho khách) |
| `InputInvoice` | `input_invoices` | Hóa đơn đầu vào (từ NCC) |
| `Receipt` | `receipts` | Phiếu thu chi |

#### ✅ Acceptance (Nghiệm thu)

| Model | Table | Mô tả |
|-------|-------|--------|
| `AcceptanceStage` | `acceptance_stages` | Giai đoạn nghiệm thu — workflow 6 cấp duyệt |
| `AcceptanceItem` | `acceptance_items` | Hạng mục nghiệm thu — workflow 4 bước |
| `AcceptanceTemplate` | `acceptance_templates` | Mẫu/bộ tài liệu nghiệm thu |
| `AcceptanceTemplateImage` | `acceptance_template_images` | Hình ảnh mẫu |
| `AcceptanceTemplateDocument` | `acceptance_template_documents` | Tài liệu mẫu |
| `AcceptanceCriterion` | `acceptance_criteria` | Tiêu chí nghiệm thu |
| `Defect` | `defects` | Lỗi thi công — severity (low/medium/high) + ảnh before/after |
| `DefectHistory` | `defect_histories` | Lịch sử xử lý lỗi |

#### 👷 Subcontractor & Supplier Management

| Model | Table | Mô tả |
|-------|-------|--------|
| `Subcontractor` | `subcontractors` | Nhà thầu phụ (project-level) |
| `GlobalSubcontractor` | `global_subcontractors` | NTP toàn cục |
| `SubcontractorContract` | `subcontractor_contracts` | HĐ nhà thầu phụ |
| `SubcontractorPayment` | `subcontractor_payments` | Thanh toán NTP — workflow duyệt |
| `SubcontractorAcceptance` | `subcontractor_acceptances` | Nghiệm thu NTP |
| `SubcontractorProgress` | `subcontractor_progress` | Tiến độ NTP |
| `SubcontractorItem` | `subcontractor_items` | Hạng mục NTP |
| `Supplier` | `suppliers` | Nhà cung cấp |
| `SupplierContract` | `supplier_contracts` | HĐ nhà cung cấp |
| `SupplierAcceptance` | `supplier_acceptances` | Nghiệm thu NCC |

#### 🏗 Resources (Vật liệu & Thiết bị)

| Model | Table | Mô tả |
|-------|-------|--------|
| `Material` | `materials` | Vật liệu xây dựng |
| `MaterialTransaction` | `material_transactions` | Giao dịch nhập/xuất kho |
| `MaterialBill` | `material_bills` | Phiếu yêu cầu vật liệu |
| `MaterialBillItem` | `material_bill_items` | Hạng mục phiếu |
| `MaterialSupplier` | `material_suppliers` | NCC vật liệu |
| `Equipment` | `equipment` | Thiết bị |
| `EquipmentAllocation` | `equipment_allocations` | Phân bổ thiết bị + thuê/mua |
| `EquipmentMaintenance` | `equipment_maintenance` | Bảo trì thiết bị |

#### 👥 User, Auth & RBAC

| Model | Table | Mô tả |
|-------|-------|--------|
| `User` | `users` | Người dùng APP (nhân viên, KH) |
| `Admin` | `admins` | Quản trị viên CRM |
| `Role` | `roles` | Vai trò |
| `Permission` | `permissions` | Quyền |
| `Department` | `departments` | Phòng ban |
| `PersonnelRole` | `personnel_roles` | Vai trò nhân sự dự án |

#### 📊 Reporting & Monitoring

| Model | Table | Mô tả |
|-------|-------|--------|
| `ConstructionLog` | `construction_logs` | Nhật ký thi công |
| `Notification` | `notifications` | Thông báo hệ thống |
| `Reminder` | `reminders` | Lời nhắc |
| `Kpi` | `kpis` | KPI nhân sự/dự án |
| `Setting` | `settings` | Cấu hình hệ thống |
| `Attachment` | `attachments` | File đính kèm polymorphic |
| `CalculationAuditLog` | `calculation_audit_logs` | Log tính toán tài chính |

---

## 🔐 Hệ thống Phân quyền (RBAC)

### Mô hình: Permission-based (NOT Role-based)

```
📁 app/Constants/Permissions.php  — 100+ permission constants
📁 app/Constants/Roles.php        — 7 role definitions
📁 app/Services/AuthorizationService.php — Authorization logic
```

### 7 Vai trò Hệ thống

| Role | Constant | Mô tả |
|------|----------|--------|
| Super Admin | `super_admin` | Toàn quyền hệ thống |
| Admin | `admin` | Quản trị vận hành |
| Chủ đầu tư | `project_owner` | Kiểm soát dự án |
| Quản lý dự án | `project_manager` | Điều phối nguồn lực |
| Giám sát | `site_supervisor` | Giám sát công trường |
| Kế toán | `accountant` | Tài chính, thanh toán |
| Khách hàng | `client` | Xem và duyệt |

### Cách thức Phân quyền

```php
// Format: MODULE.ACTION hoặc MODULE.SUBMODULE.ACTION
// Ví dụ:
Permissions::ACCEPTANCE_VIEW          // 'acceptance.view'
Permissions::COST_APPROVE_MANAGEMENT  // 'cost.approve.management'  
Permissions::ACCEPTANCE_APPROVE_LEVEL_1 // 'acceptance.approve.level_1'
```

### Kiểm tra Quyền

**Mobile API** (User model):
```php
// AuthorizationService::can()
$this->authService->can($user, Permissions::COST_CREATE, $project);
```

**CRM** (Admin model — luôn có full quyền):
```php
// Admin model gets full access
$this->crmRequire($admin, Permissions::ACCEPTANCE_UPDATE, $project);
```

**Frontend (Vue/React)**:
```javascript
// CRM (Vue): permissions array passed via Inertia props
const can = (perm) => permissions.includes('*') || permissions.includes(perm)

// APP (React): permissions from API response
const hasPermission = usePermission('acceptance.create')
```

### Quyền theo Module (Nhóm chính)

| Module | Permissions |
|--------|------------|
| Project | view, create, update, delete, manage |
| Acceptance | view, create, update, delete, attach_files, approve.level_1/2/3 |
| Cost | view, create, update, delete, submit, approve.management, approve.accountant, reject |
| Payment | view, create, update, delete, confirm, approve, mark_paid_by_customer |
| Material | view, create, update, delete, approve |
| Equipment | view, create, update, delete, approve |
| Defect | view, create, update, delete, verify |
| Subcontractor | view, create, update, delete |
| Invoice | view, create, update, delete, approve, send |

---

## 🔄 Quy trình Duyệt (Approval Workflows)

### 1. Nghiệm thu Giai đoạn (AcceptanceStage)

```
pending → supervisor_approved → project_manager_approved → customer_approved → owner_approved
     ↘ rejected (bất kỳ cấp nào)
```

- **Level 1**: Giám sát (`acceptance.approve.level_1`)
- **Level 2**: QLDA (`acceptance.approve.level_2`)  
- **Level 3**: Khách hàng (`acceptance.approve.level_3`)
- **Business Rule**: `acceptability_status` = "Đạt" nếu không có lỗi open/in_progress

### 2. Nghiệm thu Hạng mục (AcceptanceItem)

```
pending → submitted → supervisor_approved → project_manager_approved → customer_approved
     ↘ rejected (bất kỳ bước nào)
```

### 3. Chi phí (Cost)

```
draft → submitted → management_approved → accountant_confirmed
     ↘ rejected
```

### 4. Thanh toán từ Khách (ProjectPayment)

```
draft → confirmed → project_manager_approved → customer_paid
     ↘ rejected
```

### 5. Chi phí Phát sinh (AdditionalCost)

```
draft → pending → approved → confirmed → paid_by_customer
     ↘ rejected
```

### 6. Thanh toán Nhà thầu phụ (SubcontractorPayment)

```
pending → submitted → management_approved → accountant_confirmed → paid
     ↘ rejected
```

---

## 📋 Modules chức năng

### CRM Web Dashboard — 16 Modules

| # | Module | Route | Controller | Vue Page |
|---|--------|-------|------------|----------|
| 1 | Dashboard | `/dashboard` | `CrmDashboardController` | `Crm/Dashboard/` |
| 2 | Dự án (19 tabs) | `/projects/{id}` | `CrmProjectsController` | `Crm/Projects/Show.vue` |
| 3 | Trung tâm Duyệt | `/approvals` | `CrmApprovalController` | `Crm/Approvals/` |
| 4 | Vật liệu | `/materials` | `CrmMaterialsController` | `Crm/Materials/` |
| 5 | Thiết bị | `/equipment` | `CrmEquipmentController` | `Crm/Equipment/` |
| 6 | Nhóm chi phí | `/cost-groups` | `CrmCostGroupsController` | `Crm/CostGroups/` |
| 7 | Nhà thầu phụ | `/subcontractors` | `CrmSubcontractorController` | `Crm/Subcontractors/` |
| 8 | Tài chính | `/finance` | `CrmFinanceController` | `Crm/Finance/` |
| 9 | Nhân sự (HR) | `/hr` | `CrmHrController` | `Crm/Hr/` |
| 10 | Quản lý File | `/files` | `CrmFilesController` | `Crm/Files/` |
| 11 | Báo cáo | `/reports` | `CrmReportController` | `Crm/Reports/` |
| 12 | Vai trò & Quyền | `/roles` | `CrmRolesController` | `Crm/Roles/` |
| 13 | Thông báo | `/notifications` | `CrmNotificationController` | `Crm/Notifications/` |
| 14 | Cài đặt | `/settings` | `CrmSettingsController` | `Crm/Settings/` |
| 15 | Nhật ký Hệ thống | `/system-logs` | `CrmSystemLogController` | `Crm/SystemLogs/` |
| 16 | Hướng dẫn SD | `/user-guide` | — | `Crm/UserGuide/` |

### Project Detail — 19 Tabs

> File chính: `resources/js/Pages/Crm/Projects/Show.vue` (~3061 dòng)

| # | Tab Key | Tên Tiếng Việt | Mô tả |
|---|---------|----------------|--------|
| 1 | `overview` | Tổng quan | Thông tin chung, KPI, biểu đồ |
| 2 | `tasks` | Tiến độ / WBS | Cây công việc phân cấp A→A'→A'' |
| 3 | `gantt` | Gantt Chart | Biểu đồ Gantt |
| 4 | `phases` | Giai đoạn | Phần thô, hoàn thiện, M&E |
| 5 | `contract` | Hợp đồng | Thông tin hợp đồng + attachments |
| 6 | `costs` | Chi phí | Chi phí dự án + workflow duyệt |
| 7 | `additionalCosts` | Phát sinh | Chi phí phát sinh + duyệt |
| 8 | `payments` | Thanh toán KH | Đợt thanh toán từ khách hàng |
| 9 | `invoices` | Hóa đơn | Hóa đơn đầu ra/đầu vào |
| 10 | `acceptance` | Nghiệm thu | Giai đoạn nghiệm thu + bộ tài liệu |
| 11 | `defects` | Lỗi | Lỗi thi công + before/after images |
| 12 | `materials` | Vật liệu | Nhập/xuất kho vật liệu |
| 13 | `equipment` | Thiết bị | Phân bổ + trả thiết bị |
| 14 | `subcontractors` | Nhà thầu phụ | NTP + HĐ + thanh toán + tiến độ |
| 15 | `personnel` | Nhân sự | Phân công nhân sự + vai trò |
| 16 | `logs` | Nhật ký TC | Nhật ký thi công |
| 17 | `documents` | Tài liệu | Upload/quản lý tài liệu |
| 18 | `risks` | Rủi ro | Quản lý rủi ro dự án |
| 19 | `comments` | Bình luận | Thảo luận dự án (nested) |

### Mobile App — 30+ Screens

| Module | Screens | Key Files |
|--------|---------|-----------|
| Dự án | List, Detail, Create, Edit | `app/projects/` |
| Dự án Chi tiết | 30+ sub-screens (tương ứng CRM tabs) | `app/projects/[id]/` |
| Nghiệm thu | Stages, Items, Template selection | `AcceptanceChecklist.tsx` (93KB) |
| Duyệt | Approval Center | `app/approvals/` |
| Kế toán | Chi phí công ty, Hóa đơn đầu vào | `app/accounting/` |
| Vật liệu | Kho, nhập/xuất, phiếu đề xuất | `app/materials/` |
| Thiết bị | Danh sách, phân bổ, bảo trì | `app/equipment/` |
| Giám sát | Monitoring dashboard | `app/monitoring/` |
| Thông báo | Notification center | `app/notifications/` |
| HR | Nhân sự, phòng ban | `app/(tabs)/hr.tsx` |

---

## 🌐 API Architecture

### Authentication

| Platform | Method | Guard |
|----------|--------|-------|
| Mobile App | Bearer Token (Sanctum) | `auth:sanctum` |
| CRM Dashboard | Session Cookie | `auth:admin` |

### API Routes Structure

```
📁 routes/api.php (~44KB)
├── Auth (login, register, password reset)
├── /projects/{projectId}/
│   ├── acceptance/        # CRUD + approve workflows
│   ├── acceptance/{id}/items/  # Acceptance items CRUD
│   ├── costs/             # CRUD + submit + approve + reject
│   ├── payments/          # CRUD + confirm + approve + mark-paid
│   ├── defects/           # CRUD + verify
│   ├── tasks/             # CRUD + dependencies
│   ├── logs/              # Construction logs
│   ├── invoices/          # Output invoices
│   ├── budgets/           # Budget CRUD + approve
│   ├── subcontractors/    # Full CRUD
│   ├── materials/         # Transactions
│   ├── equipment/         # Allocations
│   ├── change-requests/   # CRUD + approve
│   ├── risks/             # CRUD
│   ├── documents/         # Upload/manage
│   ├── personnel/         # Assign/remove
│   └── comments/          # Nested comments
├── /approval-center/      # Unified approval queue
├── /departments/          # Department CRUD
├── /materials/            # Global materials
├── /equipment/            # Global equipment
├── /reports/              # Revenue, financial reports
├── /kpis/                 # KPI management
├── /reminders/            # Reminders
├── /notifications/        # Notification management
└── /options/              # Dropdown options API
```

### API Response Patterns

```json
// Success
{ "success": true, "data": {...}, "message": "Thành công" }

// Error
{ "success": false, "message": "Lỗi cụ thể", "errors": {...} }

// List with pagination
{ "success": true, "data": [...], "meta": { "current_page": 1, "last_page": 10, "total": 100 } }
```

---

## 🖥 CRM Web Application

### Routing

```
📁 routes/admin.php (~27KB)
├── Auth (login, logout)
├── Dashboard /dashboard
├── Project CRUD /projects
├── Project Detail /projects/{id} (Inertia → Show.vue)
│   ├── POST /{id}/costs
│   ├── POST /{id}/acceptance  
│   ├── PUT /{id}/acceptance/{stage}
│   ├── POST /{id}/defects
│   ├── POST /{id}/materials/batch
│   ├── POST /{id}/equipment/allocate
│   └── ... (90+ CRM routes)
├── Approvals /approvals
├── Finance /finance
├── HR /hr
├── Reports /reports
├── Settings /settings
└── System Logs /system-logs
```

### Data Flow (Inertia.js)

```
CRM Controller → Inertia::render('Crm/Projects/Show', $data)
     ↓
Vue Component receives $data as props
     ↓
User actions → router.post/put/delete (Inertia form submission)
     ↓
Controller processes → redirect back() with flash message
```

### Design System

- **UI Library**: Ant Design Vue 4.2.1
- **CSS**: TailwindCSS 3.4
- **Pattern**: Responsive nháy màn hình, modal/drawer cho forms
- **Charts**: Chart.js + vue-chartjs

---

## 📱 Mobile Application

### Navigation (Expo Router)

```
app/
├── (tabs)/          # Bottom Tab Navigator
│   ├── index.tsx    # Home
│   ├── projects.tsx # Projects
│   ├── reports.tsx  # Reports
│   ├── hr.tsx       # HR
│   └── settings.tsx # Settings
├── projects/[id]/   # Stack Navigator (30+ screens)
├── approvals/       # Approval center
├── accounting/      # Accounting
├── equipment/       # Equipment
├── materials/       # Materials
└── notifications/   # Notifications
```

### State Management

```
Redux Toolkit + Redux Persist
├── store.ts         # Store configuration
├── reducers/        # Slice reducers
└── AsyncStorage     # Persistence layer
```

### API Layer

```
src/api/api.ts       # Base Axios instance
├── interceptors     # Token management, error handling
├── BASE_URL         # from .env
└── 51 API modules   # One file per domain
```

### Key Components

| Component | Size | Mô tả |
|----------|------|--------|
| `AcceptanceChecklist.tsx` | 93KB | Quản lý toàn bộ nghiệm thu: stages, items, templates, defects |
| `GanttChart.tsx` | 31KB | Biểu đồ Gantt tương tác |
| `ProgressChart.tsx` | 14KB | Biểu đồ tiến độ |
| `FileUploader.tsx` | 14KB | Upload file đa nền tảng |
| `UniversalFileUploader.tsx` | 23KB | Upload multimedia |
| `MultiMediaUploader.tsx` | 19KB | Upload ảnh/video |
| `ImagePicker.tsx` | 16KB | Chọn ảnh từ camera/gallery |

---

## 💼 Business Services

> 📁 `app/Services/` — 28 service classes xử lý business logic phức tạp

| Service | Mô tả |
|---------|--------|
| `AuthorizationService` | Kiểm tra quyền user theo project context |
| `NotificationService` | Gửi notification (in-app + FCM push) |
| `ExpoPushService` | Push notification qua Expo |
| `AcceptanceWorkflowService` | Logic nghiệm thu multi-level |
| `FinancialCalculationService` | Tính toán tài chính dự án |
| `BudgetComparisonService` | So sánh ngân sách vs thực tế |
| `BudgetSyncService` | Đồng bộ ngân sách |
| `CostGroupAutoDetectService` | Tự động phân loại nhóm chi phí |
| `ProjectCostAllocationService` | Phân bổ chi phí theo dự án |
| `RevenueAllocationService` | Phân bổ doanh thu |
| `TaskProgressService` | Tính tiến độ từ cây công việc |
| `ProgressCalculationService` | Tính % hoàn thành tổng thể |
| `EvmCalculationService` | Earned Value Management (SPI, CPI, EAC) |
| `MaterialInventoryService` | Quản lý tồn kho vật liệu |
| `EquipmentAllocationService` | Logic phân bổ thiết bị |
| `PayrollCalculationService` | Tính lương |
| `TaxCalculationService` | Tính thuế |
| `SocialInsuranceService` | Tính BHXH |
| `BonusCalculationService` | Tính thưởng |
| `PredictiveAnalyticsService` | Dự báo chi phí/tiến độ |
| `ProjectMonitoringService` | Giám sát dự án realtime |
| `ProjectSummaryReportService` | Báo cáo tổng hợp dự án |
| `CompanyFinancialReportService` | Báo cáo tài chính công ty |
| `CalculationValidationService` | Validate tính toán tài chính |
| `ReminderService` | Quản lý nhắc nhở |
| `PaymentReminderService` | Nhắc thanh toán |
| `ProjectService` | Logic dự án chung |
| `ExportService` | Xuất Excel/CSV |

---

## 🔔 Realtime & Notifications

### WebSocket (Laravel Reverb)

```
# Khởi chạy server
php artisan reverb:start

# Client (Pusher.js)
import Echo from 'laravel-echo'
window.Echo.private(`project.${projectId}`)
  .listen('.notification.created', (e) => {...})
```

### Push Notifications (FCM via Firebase)

```php
// NotificationService.php
$this->sendPushNotification($user, $title, $body, $data);

// ExpoPushService.php — cho Expo React Native
$this->sendExpoPush($expoPushToken, $message);
```

### Notification Types

| Type | Trigger |
|------|---------|
| `cost.submitted` | Chi phí được nộp |
| `cost.approved` | Chi phí được duyệt |
| `payment.confirmed` | Thanh toán được xác nhận |
| `acceptance.approved` | Nghiệm thu được duyệt |
| `defect.created` | Phát hiện lỗi mới |
| `task.assigned` | Phân công công việc |
| `reminder.due` | Hết hạn nhắc nhở |

---

## 🚀 Hướng dẫn Development

### Prerequisites

- PHP 8.2+
- Node.js 18+
- MySQL/PostgreSQL
- Composer 2.x
- Yarn 1.x hoặc npm

### Setup Backend

```bash
cd be

# Install dependencies
composer install
npm install  # hoặc yarn

# Environment
cp .env.example .env
php artisan key:generate

# Database
php artisan migrate:fresh --seed

# Run
php artisan serve              # API server (:8000)
npm run dev                    # Vite dev server (:5173)
php artisan reverb:start       # WebSocket server (:8080)
```

### Setup Mobile App

```bash
cd fe

# Install dependencies
npm install  # hoặc yarn

# Environment
cp .env.example .env
# Edit .env: API_URL=http://localhost:8000/api

# Run
npx expo start                # Metro bundler
# Press 'i' for iOS simulator
# Press 'a' for Android emulator
```

### Build Commands

```bash
# Backend
cd be
npm run build                  # Production build (Vite + SSR)
php artisan migrate            # Run migrations
php artisan route:list         # Verify routes

# Mobile
cd fe
npx expo run:ios               # iOS build
npx expo run:android           # Android build
eas build --platform ios       # Production iOS build
```

### Key Development Files

| File | Mô tả | Size |
|------|--------|------|
| `be/app/Constants/Permissions.php` | Tất cả permissions | 793 lines |
| `be/app/Constants/Roles.php` | Roles definitions | 75 lines |
| `be/routes/api.php` | API routes | 44KB |
| `be/routes/admin.php` | CRM routes | 27KB |
| `be/app/Http/Controllers/Admin/CrmProjectsController.php` | Core CRM | 2046 lines |
| `be/resources/js/Pages/Crm/Projects/Show.vue` | Project Detail UI | 3061 lines |
| `fe/src/components/AcceptanceChecklist.tsx` | Acceptance flow | 93KB |

---

## 📦 Deployment

### Backend

```bash
# Production build
npm run build
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Procfile (Heroku/Railway)
web: php artisan serve --host=0.0.0.0 --port=$PORT
```

### Mobile

```bash
# EAS Build
eas build --platform ios --profile production
eas submit --platform ios --latest

# OTA Update
npx expo publish
```

---

## 📐 Patterns & Conventions

### Code Organization Rules

1. **Controller naming**: `Crm*Controller` (CRM), `*Controller` (API)
2. **Route naming**: `crm.projects.{action}` (CRM), REST (API)
3. **Permission format**: `module.action` hoặc `module.submodule.action`
4. **Model naming**: PascalCase, singular (e.g., `AcceptanceStage`)
5. **Migration naming**: `YYYY_MM_DD_HHMMSS_description.php`

### Inertia Props Convention

```php
// Controller
return Inertia::render('Crm/Projects/Show', [
    'project' => $project,           // Main entity
    'users' => $users,               // Dropdown data
    'permissions' => $permissions,    // Array of permission strings
    'costGroups' => $costGroups,      // Lookup data
    'acceptanceTemplates' => $templates,
]);
```

### Vue Component Convention

```vue
<script setup>
const props = defineProps({
    project: Object,
    permissions: Array,
})
const can = (perm) => props.permissions.includes('*') || props.permissions.includes(perm)

// CRUD pattern: ref state + Inertia router
const showModal = ref(false)
const form = ref({ name: '', ... })
const save = () => router.post(`/projects/${props.project.id}/resource`, form.value, {
    onSuccess: () => showModal.value = false
})
</script>
```

### API Service Convention (Mobile)

```typescript
// src/api/resourceApi.ts
import api from './api';

export const getResources = (projectId: string) =>
  api.get(`/projects/${projectId}/resources`);

export const createResource = (projectId: string, data: any) =>
  api.post(`/projects/${projectId}/resources`, data);
```

### Business Rule Documentation

```php
// BUSINESS RULE: comment pattern used throughout codebase
// Example:
'task_id', // BUSINESS RULE: Must be parent task (A) from Progress
'acceptance_template_id', // Link to acceptance template from Settings
```

---

## ⚠️ Lưu ý Quan trọng cho Đội ngũ Kế thừa

> [!CAUTION]
> ### 1. Hai hệ thống Auth song song
> - **CRM** dùng `Admin` model + session (`auth:admin`)
> - **APP** dùng `User` model + Sanctum token (`auth:sanctum`)
> - Admin model **luôn có full quyền** — không cần check permission
> - User model cần check permission qua `AuthorizationService`

> [!WARNING]
> ### 2. FK Constraints cẩn thận  
> - `AcceptanceStage.supervisor_approved_by` → FK tới `users` table
> - CRM Controllers **không nên pass Admin ID** vào FK columns của users
> - Đã có xử lý: `$stage->approveSupervisor()` — gọi without user param

> [!IMPORTANT]
> ### 3. CRM-APP Feature Parity
> - Mọi tính năng trên APP **nên** có tương ứng trên CRM
> - Project Detail có **19 tab** — thêm tab mới cần cập nhật cả Show.vue
> - `CrmProjectsController.php` rất lớn (2046 dòng) — **nên** tách service nếu tiếp tục mở rộng

> [!TIP]
> ### 4. Approval Workflow Models
> - Đọc methods trong model files (ví dụ: `AcceptanceStage.php`) để hiểu workflow
> - Mỗi model có methods: `approve*()`, `reject()`, `canApprove()`
> - Status transitions được define trong model, không phải controller

---

## 📊 Thống kê Codebase

| Metric | Value |
|--------|-------|
| Backend Models | 65 |
| API Controllers | 59 |
| CRM Controllers | 25 |
| Business Services | 28 |
| Database Migrations | 159 |
| Permission Constants | 100+ |
| Mobile Screens | 30+ |
| CRM Pages | 16 modules |
| API Files (Mobile) | 51 |
| Line count (CrmProjectsController) | 2,046 |
| Line count (Show.vue) | 3,061 |
| Line count (AcceptanceChecklist.tsx) | ~2,557 |

---

*Document generated on 2026-03-26. For questions, contact the BED CRM development team.*
