# Tình trạng triển khai các Module mới

## ✅ Đã hoàn thành

### 1. Database Migrations
- ✅ `departments` - Quản lý phòng ban
- ✅ `materials`, `material_transactions`, `material_suppliers` - Quản lý vật liệu
- ✅ `equipment`, `equipment_allocations`, `equipment_maintenance` - Quản lý thiết bị
- ✅ `project_budgets`, `budget_items` - Ngân sách & Dự toán
- ✅ `invoices`, `receipts` - Hóa đơn & Chứng từ
- ✅ `leave_requests`, `leave_balances` - Quản lý nghỉ phép
- ✅ `employment_contracts` - Hợp đồng lao động
- ✅ `employee_insurance`, `employee_benefits` - Bảo hiểm & Phúc lợi
- ✅ `performance_evaluations`, `performance_kpis` - Đánh giá hiệu suất
- ✅ `reminders` - Nhắc nhở tự động
- ✅ `add_department_id_to_users_table` - Migration để thêm department_id vào users

### 2. Models
- ✅ `Department`
- ✅ `Material`, `MaterialTransaction`, `MaterialSupplier`
- ✅ `Equipment`, `EquipmentAllocation`, `EquipmentMaintenance`
- ✅ `ProjectBudget`, `BudgetItem`
- ✅ `Invoice`, `Receipt`
- ✅ `LeaveRequest`, `LeaveBalance`
- ✅ `EmploymentContract`
- ✅ `EmployeeInsurance`, `EmployeeBenefit`
- ✅ `PerformanceEvaluation`, `PerformanceKPI`
- ✅ `Reminder`
- ✅ Đã cập nhật `User` model với relationships mới
- ✅ Đã cập nhật `Project` model với relationships mới

### 3. Controllers (Đã tạo structure)
- ✅ `DepartmentController`
- ✅ `MaterialController`
- ✅ `EquipmentController`
- ✅ `BudgetController`
- ✅ `InvoiceController`
- ✅ `LeaveController`
- ✅ `EmploymentContractController`
- ✅ `InsuranceController`
- ✅ `PerformanceController`
- ✅ `ReminderController`

## ⏳ Cần hoàn thành

### 1. Controllers - Implement logic
Cần implement các methods trong controllers:
- `index()` - Danh sách với pagination, search, filter
- `store()` - Tạo mới với validation
- `show()` - Chi tiết
- `update()` - Cập nhật
- `destroy()` - Xóa
- Các methods đặc biệt:
  - `MaterialController`: `getStock()`, `getTransactions()`
  - `EquipmentController`: `getAllocations()`, `getMaintenanceSchedule()`
  - `BudgetController`: `compareWithActual()`, `getBudgetItems()`
  - `LeaveController`: `approve()`, `reject()`, `getBalance()`
  - `ReminderController`: `sendReminders()`, `markAsSent()`

### 2. API Routes
Thêm vào `routes/api.php`:
```php
// Departments
Route::prefix('departments')->group(function () {
    Route::get('/', [DepartmentController::class, 'index']);
    Route::post('/', [DepartmentController::class, 'store']);
    Route::get('/{id}', [DepartmentController::class, 'show']);
    Route::put('/{id}', [DepartmentController::class, 'update']);
    Route::delete('/{id}', [DepartmentController::class, 'destroy']);
});

// Materials
Route::prefix('materials')->group(function () {
    Route::get('/', [MaterialController::class, 'index']);
    Route::post('/', [MaterialController::class, 'store']);
    Route::get('/{id}', [MaterialController::class, 'show']);
    Route::put('/{id}', [MaterialController::class, 'update']);
    Route::delete('/{id}', [MaterialController::class, 'destroy']);
    Route::get('/{id}/stock', [MaterialController::class, 'getStock']);
    Route::get('/{id}/transactions', [MaterialController::class, 'getTransactions']);
});

// Material Transactions
Route::prefix('material-transactions')->group(function () {
    Route::get('/', [MaterialTransactionController::class, 'index']);
    Route::post('/', [MaterialTransactionController::class, 'store']);
    Route::post('/{id}/approve', [MaterialTransactionController::class, 'approve']);
    Route::post('/{id}/reject', [MaterialTransactionController::class, 'reject']);
});

// Equipment
Route::prefix('equipment')->group(function () {
    Route::get('/', [EquipmentController::class, 'index']);
    Route::post('/', [EquipmentController::class, 'store']);
    Route::get('/{id}', [EquipmentController::class, 'show']);
    Route::put('/{id}', [EquipmentController::class, 'update']);
    Route::delete('/{id}', [EquipmentController::class, 'destroy']);
    Route::get('/{id}/allocations', [EquipmentController::class, 'getAllocations']);
    Route::get('/{id}/maintenance', [EquipmentController::class, 'getMaintenance']);
});

// Budgets
Route::prefix('projects/{projectId}/budgets')->group(function () {
    Route::get('/', [BudgetController::class, 'index']);
    Route::post('/', [BudgetController::class, 'store']);
    Route::get('/{id}', [BudgetController::class, 'show']);
    Route::put('/{id}', [BudgetController::class, 'update']);
    Route::get('/{id}/compare', [BudgetController::class, 'compareWithActual']);
});

// Invoices
Route::prefix('projects/{projectId}/invoices')->group(function () {
    Route::get('/', [InvoiceController::class, 'index']);
    Route::post('/', [InvoiceController::class, 'store']);
    Route::get('/{id}', [InvoiceController::class, 'show']);
    Route::put('/{id}', [InvoiceController::class, 'update']);
    Route::post('/{id}/send', [InvoiceController::class, 'send']);
    Route::post('/{id}/mark-paid', [InvoiceController::class, 'markPaid']);
});

// Receipts
Route::prefix('receipts')->group(function () {
    Route::get('/', [ReceiptController::class, 'index']);
    Route::post('/', [ReceiptController::class, 'store']);
    Route::post('/{id}/verify', [ReceiptController::class, 'verify']);
});

// Leave Management
Route::prefix('leave')->group(function () {
    Route::get('/requests', [LeaveController::class, 'getRequests']);
    Route::post('/requests', [LeaveController::class, 'createRequest']);
    Route::post('/requests/{id}/approve', [LeaveController::class, 'approve']);
    Route::post('/requests/{id}/reject', [LeaveController::class, 'reject']);
    Route::get('/balance', [LeaveController::class, 'getBalance']);
});

// Employment Contracts
Route::prefix('employment-contracts')->group(function () {
    Route::get('/', [EmploymentContractController::class, 'index']);
    Route::post('/', [EmploymentContractController::class, 'store']);
    Route::get('/{id}', [EmploymentContractController::class, 'show']);
    Route::put('/{id}', [EmploymentContractController::class, 'update']);
    Route::post('/{id}/renew', [EmploymentContractController::class, 'renew']);
    Route::post('/{id}/terminate', [EmploymentContractController::class, 'terminate']);
});

// Insurance & Benefits
Route::prefix('insurance')->group(function () {
    Route::get('/', [InsuranceController::class, 'getInsurance']);
    Route::post('/', [InsuranceController::class, 'updateInsurance']);
});

Route::prefix('benefits')->group(function () {
    Route::get('/', [InsuranceController::class, 'getBenefits']);
    Route::post('/', [InsuranceController::class, 'createBenefit']);
    Route::put('/{id}', [InsuranceController::class, 'updateBenefit']);
    Route::delete('/{id}', [InsuranceController::class, 'deleteBenefit']);
});

// Performance Evaluation
Route::prefix('performance')->group(function () {
    Route::get('/evaluations', [PerformanceController::class, 'getEvaluations']);
    Route::post('/evaluations', [PerformanceController::class, 'createEvaluation']);
    Route::get('/evaluations/{id}', [PerformanceController::class, 'showEvaluation']);
    Route::put('/evaluations/{id}', [PerformanceController::class, 'updateEvaluation']);
});

// Reminders
Route::prefix('reminders')->group(function () {
    Route::get('/', [ReminderController::class, 'index']);
    Route::post('/', [ReminderController::class, 'store']);
    Route::put('/{id}', [ReminderController::class, 'update']);
    Route::delete('/{id}', [ReminderController::class, 'destroy']);
    Route::post('/send-pending', [ReminderController::class, 'sendPendingReminders']);
});
```

### 3. Frontend - API Clients
Tạo các file trong `fe/src/api/`:
- `departmentApi.ts`
- `materialApi.ts`
- `equipmentApi.ts`
- `budgetApi.ts`
- `invoiceApi.ts`
- `receiptApi.ts`
- `leaveApi.ts`
- `employmentContractApi.ts`
- `insuranceApi.ts`
- `performanceApi.ts`
- `reminderApi.ts`

### 4. Frontend - Screens
Tạo các screens trong `fe/app/`:
- `settings/departments.tsx`
- `materials/index.tsx`, `materials/[id].tsx`
- `equipment/index.tsx`, `equipment/[id].tsx`
- `projects/[id]/budget.tsx`
- `projects/[id]/invoices.tsx`
- `receipts/index.tsx`
- `hr/leave-requests.tsx`
- `hr/employment-contracts.tsx`
- `hr/insurance.tsx`
- `hr/performance.tsx`
- `reminders/index.tsx`

### 5. Reminder Service Integration
Tạo `ReminderService` để:
- Chạy scheduled job để gửi reminders
- Tích hợp với `ExpoPushService`
- Xử lý recurring reminders

### 6. Permissions
Thêm permissions mới vào seeder:
- `departments.view`, `departments.create`, `departments.update`, `departments.delete`
- `materials.view`, `materials.create`, `materials.update`, `materials.delete`
- `equipment.view`, `equipment.create`, `equipment.update`, `equipment.delete`
- `budgets.view`, `budgets.create`, `budgets.update`
- `invoices.view`, `invoices.create`, `invoices.update`
- `leave.view`, `leave.create`, `leave.approve`
- `contracts.view`, `contracts.create`, `contracts.update`
- `insurance.view`, `insurance.update`
- `performance.view`, `performance.create`, `performance.update`
- `reminders.view`, `reminders.create`, `reminders.update`

## 📝 Ghi chú

1. **Dung lượng đĩa**: Hệ thống đang gần hết dung lượng (100% capacity). Cần dọn dẹp trước khi tiếp tục.

2. **Migration**: Chạy migrations sau khi giải quyết vấn đề dung lượng:
   ```bash
   php artisan migrate
   ```

3. **Testing**: Sau khi implement, cần test từng module:
   - CRUD operations
   - Permissions
   - Relationships
   - Business logic

4. **Documentation**: Cần tạo API documentation cho các endpoints mới.

