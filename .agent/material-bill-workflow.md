# Cập nhật Module Vật liệu Dự án (Hóa đơn Vật liệu)

## 1. Mục tiêu
Ghi nhận nhanh chi phí từ các hóa đơn thực tế, hỗ trợ nhập liệu nhiều mặt hàng trong một hóa đơn (Bill) và đẩy qua luồng duyệt chi phí dự án.

## 2. Luồng nghiệp vụ
1. **Khởi tạo**: Chọn vật liệu từ danh mục chung.
2. **Nhập liệu**: Nhập Số lượng, Đơn giá/Thành tiền cho từng dòng trong Bill.
3. **Phân loại**: Chọn "Nhóm chi phí" và "Nhà cung cấp" cho toàn bộ Bill.
4. **Luồng duyệt**: Quản lý dự án (Nháp) -> Ban Điều hành (Duyệt) -> Kế toán (Xác nhận thanh toán).
5. **Kết quả**:
   - Khi Kế toán xác nhận, tạo bản ghi Chi phí (`costs`) để quản lý công nợ NCC.
   - Ghi nhận số lượng vật liệu đã nhập vào dự án để báo cáo.

## 3. Database Schema

### Table: `material_bills`
- `id`: primary key
- `uuid`: uuid
- `project_id`: foreign key (`projects`)
- `supplier_id`: foreign key (`suppliers`)
- `bill_number`: string (Số hóa đơn/Phiếu giao hàng)
- `bill_date`: date
- `cost_group_id`: foreign key (`cost_groups`)
- `total_amount`: decimal(15, 2)
- `notes`: text
- `status`: enum (`draft`, `pending_management`, `pending_accountant`, `approved`, `rejected`)
- `created_by`: foreign key (`users`)
- `management_approved_by`: foreign key (`users`)
- `management_approved_at`: timestamp
- `accountant_approved_by`: foreign key (`users`)
- `accountant_approved_at`: timestamp
- `rejected_reason`: text
- `timestamps`, `softDeletes`

### Table: `material_bill_items`
- `id`: primary key
- `material_bill_id`: foreign key (`material_bills`)
- `material_id`: foreign key (`materials`)
- `quantity`: decimal(12, 2)
- `unit_price`: decimal(15, 2)
- `total_price`: decimal(15, 2)
- `notes`: string

## 4. Kế hoạch thực hiện

### Bước 1: Backend
1. Tạo migration cho `material_bills` và `material_bill_items`.
2. Tạo model `MaterialBill` và `MaterialBillItem`.
3. Tạo `MaterialBillController` với các phương thức:
   - `index`: Lấy danh sách hóa đơn theo project.
   - `store`: Tạo hóa đơn mới (với nhiều items).
   - `show`: Chi tiết hóa đơn.
   - `update`: Cập nhật (khi còn là draft).
   - `submit`: Gửi BĐH duyệt.
   - `approveByManagement`: BĐH duyệt.
   - `approveByAccountant`: Kế toán xác nhận thanh toán.
4. Logic xử lý khi Kế toán duyệt:
   - Tự động tạo bản ghi `Cost` cho dự án.
   - Tự động ghi nhận `MaterialTransaction` (type 'in') để theo dõi số lượng.

### Bước 2: Frontend API
1. Tạo `materialBillApi.ts`.

### Bước 3: Frontend UI
1. Tạo màn hình danh sách hóa đơn vật liệu (`fe/app/projects/[id]/material-bills/index.tsx`).
2. Tạo màn hình thêm/sửa hóa đơn (`fe/app/projects/[id]/material-bills/create.tsx`).
3. Tích hợp components:
   - `MaterialPicker`: Chọn từ danh mục chung.
   - `BillItemRow`: Component nhập liệu từng dòng.
   - `SupplierPicker`: Chọn NCC.

### Bước 4: Báo cáo
1. Cập nhật báo cáo vật liệu dự án để lấy dữ liệu từ hóa đơn.
