---
description: Quy trình duyệt chi phí công ty (Company Cost Approval Workflow)
---

# Quy Trình Duyệt Chi Phí Công Ty

Tài liệu này mô tả chi tiết quy trình xử lý và phê duyệt chi phí nội bộ của công ty (không thuộc dự án cụ thể), đảm bảo sự chặt chẽ và minh bạch tài chính.

## 1. Các Vai Trò (Actors)

| Vai Trò | Mã Quyền (Permission) | Trách Nhiệm |
| :--- | :--- | :--- |
| **Người Yêu Cầu** (Staff) | `cost.create`, `cost.update` | Tạo phiếu chi, đính kèm chứng từ, gửi duyệt. |
| **Ban Điều Hành** (Management) | `cost.approve_management` | Xem xét tính hợp lý, duyệt chủ trương chi. |
| **Kế Toán** (Accountant) | `cost.approve_accountant` | Kiểm tra hóa đơn/chứng từ hợp lệ, xác nhận chi tiền/hạch toán. |
| **Người Xem** (Viewer) | `cost.view` | Chỉ xem báo cáo, không thao tác. |

## 2. Sơ Đồ Trạng Thái (Status Flow)

Chi phí sẽ trải qua các trạng thái sau:

`draft` ➤ `pending_management_approval` ➤ `pending_accountant_approval` ➤ `approved`
                                      ⬇                    ⬇
                                 `rejected`             `rejected`

### Chi tiết trạng thái:
1.  **`draft` (Nháp):**
    *   Khoản chi mới được tạo, chưa gửi đi.
    *   Có thể Chỉnh sửa (`update`) hoặc Xóa (`delete`).
2.  **`pending_management_approval` (Chờ Ban Điều Hành duyệt):**
    *   Người tạo đã gửi yêu cầu (`submit`).
    *   Khoản chi bị khóa, không thể sửa/xóa bởi người tạo.
    *   Chờ Ban Điều Hành thao tác.
3.  **`pending_accountant_approval` (Chờ Kế Toán duyệt):**
    *   Ban Điều Hành đã duyệt chủ trương.
    *   Chuyển sang Kế Toán kiểm tra chứng từ.
4.  **`approved` (Đã duyệt):**
    *   Kế Toán đã xác nhận hợp lệ & hạch toán.
    *   Quy trình hoàn tất.
5.  **`rejected` (Từ chối):**
    *   Bị từ chối bởi Ban Điều Hành hoặc Kế Toán (kèm lý do).
    *   Quay về trạng thái có thể sửa/xóa hoặc gửi lại.

## 3. Quy Trình Chi Tiết & API Mapping

### Bước 1: Tạo & Gửi Yêu Cầu
*   **Actor:** Người Yêu Cầu
*   **Hành động:**
    1.  Nhập thông tin chi phí (Tên, Số tiền, Nhóm chi phí, NCC, Hóa đơn...).
    2.  Upload ảnh/file chứng từ.
    3.  Lưu Nháp hoặc Gửi Duyệt ngay.
*   **API:**
    *   `POST /api/company-costs` (Tạo mới -> `draft`)
    *   `PUT /api/company-costs/{id}` (Sửa -> `draft`)
    *   `POST /api/company-costs/{id}/submit` (Gửi -> chuyển sang `pending_management_approval`)

### Bước 2: Ban Điều Hành Duyệt
*   **Actor:** Ban Điều Hành (Manager)
*   **Điều kiện:** Trạng thái phải là `pending_management_approval`.
*   **Hành động:**
    *   **Duyệt:** Xác nhận chi phí hợp lý -> Chuyển sang Kế toán.
    *   **Từ chối:** Ghi lý do không duyệt -> Quay về `rejected`.
*   **API:**
    *   `POST /api/company-costs/{id}/approve-management` (Duyệt -> `pending_accountant_approval`)
    *   `POST /api/company-costs/{id}/reject` (Từ chối -> `rejected`)

### Bước 3: Kế Toán Kiểm Tra & Xác Nhận
*   **Actor:** Kế Toán (Accountant)
*   **Điều kiện:** Trạng thái phải là `pending_accountant_approval`.
*   **Hành động:**
    *   **Xác nhận:** Chứng từ đầy đủ, hợp lệ -> Hoàn tất.
    *   **Từ chối:** Sai hóa đơn, thiếu chứng từ -> Quay về `rejected`.
*   **API:**
    *   `POST /api/company-costs/{id}/approve-accountant` (Duyệt -> `approved`)
    *   `POST /api/company-costs/{id}/reject` (Từ chối -> `rejected`)

## 4. Kiểm Tra Logic An Toàn (Backend Safety Checks)

Hệ thống Backend (Controller & Model) **BẮT BUỘC** phải kiểm tra:
1.  **State check:** Không thể duyệt một khoản chi đang ở trạng thái `draft` (phải submit trước).
2.  **Wait check:** Kế toán không thể duyệt trước Ban Điều Hành (trừ khi có cơ chế bypass cấu hình đặc biệt - hiện tại là tuần tự).
3.  **Permission check:**
    *   User thường không gọi được API `approve`.
    *   Admin/Manager mới gọi được API `approve-management`.
    *   Accountant mới gọi được API `approve-accountant`.
4.  **Modification lock:** Không cho phép sửa (`update`) số tiền/nội dung khi đang trong quy trình duyệt (`pending...` hoặc `approved`). Chỉ sửa được khi `draft` hoặc `rejected`.

## 5. UI/UX Requirements
*   **Màu sắc trạng thái:**
    *   Draft: Xám (Nháp)
    *   Pending Management: Cam (Chờ BĐH)
    *   Pending Accountant: Xanh dương (Chờ KT)
    *   Approved: Xanh lá (Hoàn thành)
    *   Rejected: Đỏ (Từ chối)
*   **Hiển thị nút bấm:**
    *   Ẩn nút "Duyệt" với user không có quyền.
    *   Ẩn nút "Sửa/Xóa" khi đang chờ duyệt hoặc đã duyệt.
    *   Hiển thị rõ lý do từ chối nếu có.
