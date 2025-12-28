# Tài liệu Logic Tính Toán Tài Chính

## Tổng quan

Hệ thống tính toán tài chính được thiết kế để đảm bảo tính chính xác và nhất quán trong việc tính toán doanh thu, chi phí, lợi nhuận và lương.

## Kiến trúc

### Services chính

1. **FinancialCalculationService** - Single source of truth cho tất cả tính toán tài chính
2. **TaxCalculationService** - Tính thuế TNCN theo bậc thuế VN
3. **SocialInsuranceService** - Tính các khoản bảo hiểm (BHXH, BHYT, BHTN)
4. **PayrollCalculationService** - Tính lương với đầy đủ thuế và bảo hiểm
5. **RevenueAllocationService** - Phân bổ doanh thu theo tiến độ thực tế
6. **CalculationValidationService** - Kiểm tra tính nhất quán và tránh double counting
7. **BudgetComparisonService** - So sánh ngân sách vs thực tế

## Tính toán Doanh thu

### Công thức

```
Doanh thu = Giá trị hợp đồng (nếu hợp đồng đã được duyệt)
Hoặc = Tổng thanh toán đã xác nhận (nếu tính theo thanh toán thực tế)
```

### Phân bổ doanh thu

Doanh thu được phân bổ theo:
- Payment schedule (ưu tiên)
- Milestone completion (khi có)
- % hoàn thành dự án (fallback)

## Tính toán Chi phí

### Các nguồn chi phí

1. **Chi phí phát sinh (AdditionalCosts)**
2. **Chi phí nhà thầu phụ (Subcontractors)**
3. **Chi phí nhân công (Payroll)**
4. **Chi phí từ TimeTracking**
5. **Thưởng (Bonuses)**
6. **Chi phí khác (Costs)**

### Tránh Double Counting

- Nếu Payroll đã tạo Cost record → Chỉ tính Cost, không tính Payroll
- Nếu TimeTracking đã tạo Cost record → Chỉ tính Cost, không tính TimeTracking

### Công thức

```
Tổng chi phí = AdditionalCosts + SubcontractorCosts + PayrollCosts + TimeTrackingCosts + BonusCosts + OtherCosts
```

## Tính toán Lợi nhuận

### Công thức

```
Lợi nhuận = Doanh thu - Tổng chi phí
Tỷ suất lợi nhuận = (Lợi nhuận / Doanh thu) * 100%
```

## Tính toán Lương

### Các thành phần

1. **Lương cơ bản (Base Salary)**
   - Theo loại: hourly, daily, monthly, project_based
   
2. **Làm thêm giờ (Overtime)**
   - Tính theo giờ làm việc ngoài giờ (trước 7:30, sau 17:30)
   
3. **Thưởng (Bonus)**
   - Tổng các khoản thưởng đã được duyệt

4. **Bảo hiểm (Social Insurance)**
   - BHXH: 8% (người lao động), 17.5% (người sử dụng lao động)
   - BHYT: 1.5% (người lao động), 3% (người sử dụng lao động)
   - BHTN: 1% (người lao động), 1% (người sử dụng lao động)
   - Tính trên mức lương đóng BH (tối đa 36 triệu/tháng)

5. **Thuế TNCN**
   - Tính theo bậc thuế VN 2024
   - Có giảm trừ gia cảnh: 11 triệu (bản thân) + 4.4 triệu/người phụ thuộc

### Công thức

```
Gross Salary = Base Salary + Overtime + Bonus
Insurance (Employee) = BHXH + BHYT + BHTN
Taxable Income = Gross Salary - Insurance (Employee)
Tax = Tính theo bậc thuế (Taxable Income - Giảm trừ gia cảnh)
Net Salary = Gross Salary - Insurance (Employee) - Tax - Deductions
```

### Bậc thuế TNCN (2024)

| Bậc | Thu nhập chịu thuế/tháng | Thuế suất |
|-----|-------------------------|-----------|
| 1   | Đến 5 triệu              | 5%        |
| 2   | Trên 5 đến 10 triệu     | 10%       |
| 3   | Trên 10 đến 18 triệu    | 15%       |
| 4   | Trên 18 đến 32 triệu    | 20%       |
| 5   | Trên 32 đến 52 triệu    | 25%       |
| 6   | Trên 52 đến 80 triệu    | 30%       |
| 7   | Trên 80 triệu            | 35%       |

## Validation và Kiểm tra

### Kiểm tra Double Counting

- Payroll: Kiểm tra xem Payroll đã tạo Cost chưa
- TimeTracking: Kiểm tra xem TimeTracking đã tạo Cost chưa

### Kiểm tra Tính Nhất quán

- Tổng chi phí từ các nguồn = Tổng Cost records
- Doanh thu từ contract = Tổng payment schedule
- Tổng thanh toán đã trả ≤ Tổng payment schedule

### Kiểm tra Tính toán Lương

- Net salary = Gross - Insurance - Tax - Deductions
- Taxable income = Gross - Insurance
- Gross salary ≥ 0
- Net salary ≥ 0 (cảnh báo nếu âm)

## So sánh Ngân sách vs Thực tế

### So sánh theo Cost Group

- Budget items được match với Costs theo `cost_group_id`
- Tính variance và variance percentage

### So sánh theo Category

- Group costs theo category
- So sánh với budget items trong cùng category

### Cảnh báo

- Vượt ngân sách (over budget)
- Gần hết ngân sách (>80%)
- Vượt ngân sách theo category (>10%)

## Audit Log

Tất cả các tính toán quan trọng được log vào `calculation_audit_logs`:
- Project ID
- Calculation type (revenue, costs, profit, payroll)
- Input data
- Output data
- Validation result
- Calculated by
- Calculated at

## Ví dụ

### Ví dụ 1: Tính lương

**Input:**
- Base salary: 15,000,000 VNĐ
- Overtime: 2,000,000 VNĐ
- Bonus: 1,000,000 VNĐ
- Dependents: 1 người

**Tính toán:**
1. Gross = 15,000,000 + 2,000,000 + 1,000,000 = 18,000,000
2. Insurance (Employee) = 18,000,000 * (8% + 1.5% + 1%) = 1,890,000
3. Taxable Income = 18,000,000 - 1,890,000 = 16,110,000
4. Giảm trừ = 11,000,000 + 4,400,000 = 15,400,000
5. Thu nhập chịu thuế = 16,110,000 - 15,400,000 = 710,000
6. Tax = 710,000 * 5% = 35,500
7. Net = 18,000,000 - 1,890,000 - 35,500 = 16,074,500

### Ví dụ 2: Tính lợi nhuận dự án

**Input:**
- Contract value: 1,000,000,000 VNĐ
- Additional costs: 50,000,000
- Subcontractor costs: 200,000,000
- Payroll costs: 150,000,000
- Other costs: 100,000,000

**Tính toán:**
1. Revenue = 1,000,000,000
2. Total Costs = 50,000,000 + 200,000,000 + 150,000,000 + 100,000,000 = 500,000,000
3. Profit = 1,000,000,000 - 500,000,000 = 500,000,000
4. Profit Margin = (500,000,000 / 1,000,000,000) * 100 = 50%

## Lưu ý

1. Tất cả tính toán sử dụng `FinancialCalculationService` làm single source of truth
2. Validation được thực hiện sau mỗi tính toán quan trọng
3. Audit log được tạo cho tất cả tính toán quan trọng
4. Các cảnh báo được log nhưng không chặn tính toán (trừ lỗi nghiêm trọng)

