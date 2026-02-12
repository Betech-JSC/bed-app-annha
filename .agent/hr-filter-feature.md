# Filter Module - HR KPI

## Tổng quan
Đã thêm chức năng lọc (filter) toàn diện cho Module Nhân sự, cho phép lọc KPI theo nhiều tiêu chí khác nhau.

## Tính năng Filter

### 1. **Filter theo Năm**
- Lọc KPI theo năm cụ thể
- Hiển thị 10 năm (từ năm hiện tại - 2 đến + 7)
- Option "Tất cả" để xem tất cả các năm

### 2. **Filter theo Trạng thái**
- **Tất cả**: Hiển thị tất cả KPI
- **Đang thực hiện** (pending): KPI đang được thực hiện
- **Chờ duyệt** (completed): KPI đã hoàn thành, chờ duyệt
- **Đạt** (verified_success): KPI đã được duyệt và đạt
- **Không đạt** (verified_fail): KPI đã được duyệt nhưng không đạt

### 3. **Filter theo Nhân viên**
- Lọc KPI theo người được giao
- Hiển thị danh sách tất cả nhân viên
- Option "Tất cả" để xem KPI của tất cả nhân viên

## UI/UX

### Filter Button
- **Vị trí**: Header, bên cạnh nút "Thêm KPI"
- **Icon**: Filter icon (Ionicons "filter")
- **States**:
  - **Inactive**: Gray background (#F3F4F6), blue icon
  - **Active**: Blue background (#3B82F6), white icon
  - **Badge**: Red badge hiển thị số lượng filter đang active

### Active Filters Display
- **Vị trí**: Dưới header, trên danh sách KPI
- **Hiển thị**: Chỉ hiện khi có filter active
- **Chips**: 
  - Background: Light indigo (#EEF2FF)
  - Text: Indigo (#4F46E5)
  - Close icon: Tap để xóa filter cụ thể
- **Clear All Button**: 
  - Background: Light red (#FEE2E2)
  - Text: Red (#EF4444)
  - Action: Xóa tất cả filters

### Filter Modal
- **Presentation**: Bottom sheet (pageSheet)
- **Animation**: Slide from bottom
- **Sections**:
  1. **Năm**: Horizontal scrollable chips
  2. **Trạng thái**: Grid layout với color-coded chips
  3. **Nhân viên**: Horizontal scrollable chips

- **Footer Actions**:
  - **Xóa bộ lọc**: Clear all filters
  - **Áp dụng**: Close modal and apply filters

## Implementation Details

### State Management
```typescript
// Filter State
const [showFilterModal, setShowFilterModal] = useState(false);
const [filterYear, setFilterYear] = useState<number | null>(null);
const [filterStatus, setFilterStatus] = useState<string | null>(null);
const [filterUserId, setFilterUserId] = useState<number | null>(null);
```

### Auto-reload on Filter Change
```typescript
useEffect(() => {
    loadKpis();
}, [filterYear, filterStatus, filterUserId]);
```

### API Integration
```typescript
const loadKpis = async (showLoading = true) => {
    const params: any = {};
    if (filterYear) params.year = filterYear;
    if (filterStatus) params.status = filterStatus;
    if (filterUserId) params.user_id = filterUserId;
    
    const response = await officeKpiApi.getKpis(params);
    // ...
};
```

### Helper Functions
```typescript
// Clear all filters
const clearFilters = () => {
    setFilterYear(null);
    setFilterStatus(null);
    setFilterUserId(null);
};

// Check if any filter is active
const hasActiveFilters = () => {
    return filterYear !== null || filterStatus !== null || filterUserId !== null;
};
```

## Visual Design

### Color Coding
- **Pending** (Đang thực hiện): Yellow (#F59E0B)
- **Completed** (Chờ duyệt): Blue (#3B82F6)
- **Verified Success** (Đạt): Green (#10B981)
- **Verified Fail** (Không đạt): Red (#EF4444)

### Filter Button Badge
- Background: Red (#EF4444)
- Position: Top-right corner
- Size: 20x20px, min-width 20px
- Font: 11px, bold, white

### Active Filter Chips
- Background: Light indigo (#EEF2FF)
- Text: Indigo (#4F46E5), 13px, medium weight
- Border radius: 16px
- Padding: 6px vertical, 12px horizontal
- Gap: 6px between icon and text

### Status Filter Chips (in Modal)
- **Unselected**:
  - Background: Light gray (#F9FAFB)
  - Border: 2px, gray (#E5E7EB)
  - Text: Gray (#6B7280), medium weight
  
- **Selected**:
  - Background: White (#FFF)
  - Border: 2px, status color
  - Text: Status color, bold

## Empty States

### No Results with Filters
```
"Không tìm thấy KPI phù hợp"
```

### No KPIs at All
```
"Chưa có KPI nào được tạo"
```

## User Flow

1. **Open Filter Modal**
   - Tap filter button in header
   - Modal slides up from bottom

2. **Select Filters**
   - Tap year chip to filter by year
   - Tap status chip to filter by status
   - Tap employee chip to filter by employee
   - Can combine multiple filters

3. **Apply Filters**
   - Tap "Áp dụng" button
   - Modal closes
   - KPI list reloads with filters
   - Active filters shown as chips below header
   - Filter button shows badge with count

4. **Remove Filters**
   - **Option 1**: Tap X on individual filter chip
   - **Option 2**: Tap "Xóa tất cả" in active filters bar
   - **Option 3**: Open modal and tap "Xóa bộ lọc"
   - **Option 4**: Open modal and select "Tất cả" for each filter

## API Examples

### Filter by Year
```
GET /api/hr/kpis?year=2026
```

### Filter by Status
```
GET /api/hr/kpis?status=pending
```

### Filter by Employee
```
GET /api/hr/kpis?user_id=5
```

### Combined Filters
```
GET /api/hr/kpis?year=2026&status=verified_success&user_id=5
```

## Styles Added

### Filter Button & Badge
- `filterButton`: Main filter button style
- `filterButtonActive`: Active state (blue background)
- `filterBadge`: Red badge for filter count
- `filterBadgeText`: Badge text style

### Active Filters Display
- `activeFiltersContainer`: Container for active filter chips
- `activeFiltersScroll`: Horizontal scroll view
- `activeFilterChip`: Individual filter chip
- `activeFilterText`: Filter chip text
- `clearAllFiltersButton`: Clear all button
- `clearAllFiltersText`: Clear all button text

### Status Filter (in Modal)
- `statusFilterGrid`: Grid layout for status chips
- `statusFilterChip`: Individual status chip
- `statusFilterChipSelected`: Selected state
- `statusFilterText`: Status chip text
- `statusFilterTextSelected`: Selected text style

## Benefits

1. **Tìm kiếm nhanh**: Dễ dàng tìm KPI theo tiêu chí cụ thể
2. **Trực quan**: Color-coded status, clear visual feedback
3. **Linh hoạt**: Kết hợp nhiều filters
4. **Dễ sử dụng**: Tap to select, tap to remove
5. **Responsive**: Auto-reload khi filter thay đổi
6. **Clear feedback**: Badge count, active chips display

## Future Enhancements

1. **Save Filter Presets**: Lưu bộ lọc thường dùng
2. **Filter by Date Range**: Lọc theo khoảng thời gian
3. **Sort Options**: Sắp xếp theo tiến độ, deadline, etc.
4. **Search**: Tìm kiếm KPI theo tên
5. **Export Filtered Results**: Xuất danh sách KPI đã lọc

## Testing Checklist

- [x] Filter button hiển thị đúng
- [x] Badge count chính xác
- [x] Filter modal mở/đóng mượt mà
- [x] Filter theo năm hoạt động
- [x] Filter theo status hoạt động
- [x] Filter theo employee hoạt động
- [x] Kết hợp nhiều filters
- [x] Active filter chips hiển thị đúng
- [x] Xóa individual filter
- [x] Xóa tất cả filters
- [x] Empty state hiển thị đúng
- [x] Auto-reload khi filter thay đổi
- [x] Color coding status đúng
