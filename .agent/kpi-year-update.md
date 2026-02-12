# Cập nhật: KPI theo Năm

## Tổng quan
Đã cập nhật hệ thống KPI để hỗ trợ giao KPI theo năm thay vì theo khoảng thời gian cụ thể (start_date/end_date).

## Thay đổi Backend

### 1. Database Migration
**File**: `2026_02_12_103557_add_year_to_kpis_table.php`

Đã thêm cột `year` vào bảng `kpis`:
```php
$table->integer('year')->nullable()->after('unit');
```

### 2. Controller Updates
**File**: `app/Http/Controllers/Api/OfficeKpiController.php`

**Thay đổi**:
- ✅ Thêm validation cho trường `year` (2020-2100)
- ✅ Hỗ trợ filter KPI theo năm trong `index()`
- ✅ Lưu `year` khi tạo KPI mới
- ✅ Cho phép cập nhật `year` trong `update()`

**Validation**:
```php
'year' => 'nullable|integer|min:2020|max:2100'
```

## Thay đổi Frontend

### 1. API & Interfaces
**File**: `fe/src/api/officeKpiApi.ts`

**Cập nhật interfaces**:
```typescript
export interface OfficeKpi {
    // ... existing fields
    year?: number;  // NEW
    start_date?: string;
    end_date?: string;
}

export interface CreateOfficeKpiData {
    // ... existing fields
    year?: number;  // NEW
    start_date?: string;
    end_date?: string;
}

export interface UpdateOfficeKpiData {
    // ... existing fields
    year?: number;  // NEW
}
```

**Cập nhật API methods**:
```typescript
getKpis: async (params?: { 
    user_id?: number; 
    status?: string; 
    year?: number  // NEW
}) => { ... }
```

### 2. Form Tạo KPI
**File**: `fe/app/hr/kpis/index.tsx`

**Thay đổi UI**:
- ❌ Xóa: Date pickers (Ngày bắt đầu, Ngày kết thúc)
- ✅ Thêm: Year selector với scrollable chips

**Year Selector UI**:
```tsx
<View style={styles.formGroup}>
    <Text style={styles.label}>Năm <Text style={styles.required}>*</Text></Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {Array.from({ length: 10 }, (_, i) => currentYear - 2 + i).map(year => (
            <TouchableOpacity
                style={[
                    styles.yearChip,
                    selectedYear === year && styles.yearChipSelected
                ]}
                onPress={() => setSelectedYear(year)}
            >
                <Text>{year}</Text>
            </TouchableOpacity>
        ))}
    </ScrollView>
</View>
```

**Hiển thị năm**: 
- Từ năm hiện tại - 2 đến năm hiện tại + 7 (tổng 10 năm)
- Mặc định chọn năm hiện tại

### 3. Hiển thị KPI
**Files**: 
- `fe/app/hr/kpis/index.tsx` (Danh sách KPI)
- `fe/app/hr/kpis/[id].tsx` (Chi tiết KPI)
- `fe/app/hr/[id].tsx` (Chi tiết nhân viên)

**Logic hiển thị**:
```tsx
{item.year ? (
    <Text>📅 Năm: {item.year}</Text>
) : item.end_date && (
    <Text>📅 Hạn chót: {new Date(item.end_date).toLocaleDateString("vi-VN")}</Text>
)}
```

**Trong chi tiết KPI**:
- Nếu có `year`: Hiển thị năm với font size lớn (24px), màu xanh (#3B82F6)
- Nếu không có `year`: Hiển thị ngày bắt đầu và hạn chót như cũ

## Tính năng

### ✅ Đã triển khai
1. **Tạo KPI theo năm**
   - Chọn năm từ year picker
   - Validation năm (2020-2100)
   - Lưu vào database

2. **Hiển thị năm**
   - Danh sách KPI: "📅 Năm: 2026"
   - Chi tiết KPI: Năm được highlight với font lớn
   - Chi tiết nhân viên: Hiển thị năm trong KPI card

3. **Filter theo năm**
   - API hỗ trợ filter: `GET /hr/kpis?year=2026`
   - Frontend có thể filter KPI theo năm

4. **Backward compatible**
   - KPI cũ không có năm vẫn hiển thị ngày bắt đầu/kết thúc
   - Hệ thống hỗ trợ cả 2 cách: theo năm hoặc theo khoảng thời gian

## UI/UX

### Year Selector Design
- **Style**: Horizontal scrollable chips
- **Colors**: 
  - Unselected: Light gray (#F3F4F6) background, gray border (#E5E7EB)
  - Selected: Blue (#3B82F6) background, white text
- **Interaction**: Tap to select year
- **Range**: 10 years (current - 2 to current + 7)

### Display
- **List view**: Small text with calendar emoji
- **Detail view**: Large, bold, blue text for year
- **Fallback**: Shows date range if year not available

## Migration Notes

### Dữ liệu cũ
- KPI cũ không có `year` (NULL)
- Vẫn hiển thị bình thường với `start_date` và `end_date`
- Không cần migrate dữ liệu cũ

### Tạo KPI mới
- Khuyến khích dùng `year` cho KPI văn phòng
- Vẫn có thể dùng `start_date`/`end_date` nếu cần

## Testing Checklist

- [x] Migration chạy thành công
- [x] Tạo KPI mới với year
- [x] Hiển thị year trong danh sách
- [x] Hiển thị year trong chi tiết
- [x] Filter theo year
- [x] KPI cũ vẫn hiển thị đúng
- [x] Update year trong KPI
- [x] Validation year (2020-2100)

## API Examples

### Tạo KPI theo năm
```json
POST /api/hr/kpis
{
    "user_id": 1,
    "title": "Hoàn thành 100 dự án",
    "target_value": 100,
    "unit": "dự án",
    "year": 2026
}
```

### Filter KPI theo năm
```
GET /api/hr/kpis?year=2026
GET /api/hr/kpis?user_id=1&year=2026
```

### Response
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "user_id": 1,
            "title": "Hoàn thành 100 dự án",
            "target_value": 100,
            "current_value": 45,
            "unit": "dự án",
            "year": 2026,
            "status": "pending",
            "user": { "id": 1, "name": "Nguyễn Văn A" }
        }
    ]
}
```

## Lợi ích

1. **Đơn giản hóa**: Không cần chọn ngày bắt đầu/kết thúc
2. **Phù hợp**: KPI văn phòng thường theo năm
3. **Linh hoạt**: Vẫn hỗ trợ khoảng thời gian cụ thể nếu cần
4. **UX tốt hơn**: Year picker dễ dùng hơn date picker
5. **Báo cáo**: Dễ dàng thống kê KPI theo năm
