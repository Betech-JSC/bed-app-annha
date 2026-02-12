# KPI Charts & Statistics

## Tổng quan
Đã thêm biểu đồ và thống kê trực quan cho Module KPI sử dụng `react-native-gifted-charts`, giúp quản trị viên dễ dàng theo dõi và phân tích hiệu suất KPI.

## Chart Library
**Library**: `react-native-gifted-charts` (v1.4.70)
- Modern, performant chart library cho React Native
- Hỗ trợ nhiều loại biểu đồ: Pie, Bar, Line, Area, etc.
- Customizable và responsive
- Native performance

## Component: KpiStatsChart

### Location
`/fe/src/components/charts/KpiStatsChart.tsx`

### Props
```typescript
interface KpiStatsChartProps {
    total: number;              // Tổng số KPI
    pending: number;            // Số KPI đang thực hiện
    completed: number;          // Số KPI chờ duyệt
    verifiedSuccess: number;    // Số KPI đạt
    verifiedFail: number;       // Số KPI không đạt
}
```

### Features

#### 1. **Summary Statistics**
- **Layout**: 4 cột ngang
- **Metrics**:
  - **Tổng KPI**: Tổng số KPI (màu xanh #3B82F6)
  - **Đạt**: Số KPI đạt (màu xanh lá #10B981)
  - **Đang thực hiện**: Pending + Completed (màu vàng #F59E0B)
  - **Không đạt**: Số KPI không đạt (màu đỏ #EF4444)
- **Dividers**: Vertical lines giữa các metrics

#### 2. **Pie Chart (Donut Chart)**
- **Title**: "Phân bổ trạng thái"
- **Type**: Donut chart (pie chart with center hole)
- **Center Label**: 
  - Số lượng total KPI
  - Text "KPI"
- **Segments**:
  - Đạt (Green #10B981)
  - Đang thực hiện (Yellow #F59E0B) - combines pending + completed
  - Không đạt (Red #EF4444)
- **Features**:
  - Show value on each segment
  - Color-coded
  - Legend below chart
- **Dimensions**:
  - Radius: 70px
  - Inner radius: 45px

#### 3. **Bar Chart**
- **Title**: "Chi tiết theo trạng thái"
- **Type**: Vertical bar chart
- **Bars**: 4 bars for each status
  - Đang thực hiện (Yellow #F59E0B)
  - Chờ duyệt (Blue #3B82F6)
  - Đạt (Green #10B981)
  - Không đạt (Red #EF4444)
- **Features**:
  - Rounded top and bottom
  - Gradient effect
  - Y-axis with 4 sections
  - X-axis labels
  - Auto-scale based on max value
- **Dimensions**:
  - Width: Screen width - 80px
  - Height: 180px
  - Bar width: 40px
  - Spacing: 20px

### Empty State
- Hiển thị khi `total === 0`
- Message: "Chưa có dữ liệu thống kê"
- Gray text, centered

## Integration

### In KPI List Screen
**File**: `/fe/app/hr/kpis/index.tsx`

```typescript
// Calculate stats
const getKpiStats = () => {
    const total = kpis.length;
    const pending = kpis.filter(k => k.status === "pending").length;
    const completed = kpis.filter(k => k.status === "completed").length;
    const verifiedSuccess = kpis.filter(k => k.status === "verified_success").length;
    const verifiedFail = kpis.filter(k => k.status === "verified_fail").length;

    return { total, pending, completed, verifiedSuccess, verifiedFail };
};

// Render in FlatList header
<FlatList
    data={kpis}
    ListHeaderComponent={
        <KpiStatsChart {...getKpiStats()} />
    }
    // ...
/>
```

## Visual Design

### Color Palette
- **Primary Blue**: #3B82F6 (Total KPI)
- **Success Green**: #10B981 (Verified Success)
- **Warning Yellow**: #F59E0B (Pending/In Progress)
- **Error Red**: #EF4444 (Verified Fail)
- **Gray**: #6B7280 (Labels, secondary text)

### Typography
- **Summary Number**: 24px, bold
- **Summary Label**: 12px, gray
- **Chart Title**: 16px, semi-bold
- **Center Label Number**: 20px, bold
- **Center Label Text**: 12px, gray
- **Legend Text**: 13px
- **Bar Labels**: 10px

### Spacing & Layout
- **Container**: 
  - Background: White
  - Border radius: 12px
  - Padding: 16px
  - Shadow: subtle elevation
  - Margin bottom: 16px

- **Summary Row**:
  - Margin bottom: 24px
  - Flex direction: row
  - Items centered

- **Charts Container**:
  - Gap: 24px between charts
  - Center aligned

## Responsive Design
- Chart width adapts to screen width
- Bar chart: `Dimensions.get("window").width - 80`
- Works on all screen sizes
- Maintains aspect ratio

## Performance
- Efficient rendering with react-native-gifted-charts
- No re-renders unless data changes
- Lightweight calculations
- Native performance

## Data Flow

```
KPIs Array
    ↓
getKpiStats() - Calculate statistics
    ↓
{
    total: number,
    pending: number,
    completed: number,
    verifiedSuccess: number,
    verifiedFail: number
}
    ↓
KpiStatsChart Component
    ↓
Render:
- Summary Stats (4 columns)
- Pie Chart (3 segments)
- Bar Chart (4 bars)
```

## Use Cases

### 1. **Quick Overview**
- Managers can see KPI distribution at a glance
- Summary numbers provide instant insights
- Color coding makes it easy to identify issues

### 2. **Status Monitoring**
- Pie chart shows proportion of each status
- Bar chart shows exact counts
- Easy to compare different statuses

### 3. **Performance Tracking**
- Track success rate (verified_success / total)
- Monitor pending workload
- Identify bottlenecks

### 4. **Filtered Views**
- Charts update when filters are applied
- See statistics for specific year, employee, or status
- Real-time visual feedback

## Future Enhancements

### 1. **Trend Charts**
- Line chart showing KPI completion over time
- Month-by-month comparison
- Year-over-year trends

### 2. **Employee Performance**
- Bar chart comparing employees
- Top performers highlight
- Individual contribution breakdown

### 3. **Progress Tracking**
- Average completion percentage
- Time to completion metrics
- Deadline adherence rate

### 4. **Interactive Charts**
- Tap on chart segments to filter
- Drill-down into specific categories
- Export chart as image

### 5. **Additional Metrics**
- Average KPI value
- Completion rate percentage
- Time-based analytics

### 6. **Custom Date Ranges**
- Filter charts by date range
- Compare different periods
- Seasonal analysis

## Example Data

### Sample Stats
```typescript
{
    total: 25,
    pending: 8,
    completed: 5,
    verifiedSuccess: 10,
    verifiedFail: 2
}
```

### Pie Chart Display
- Đạt: 10 (40%) - Green
- Đang thực hiện: 13 (52%) - Yellow (8 pending + 5 completed)
- Không đạt: 2 (8%) - Red

### Bar Chart Display
- Đang thực hiện: 8
- Chờ duyệt: 5
- Đạt: 10
- Không đạt: 2

## Benefits

1. ✅ **Visual Clarity**: Easy to understand at a glance
2. ✅ **Data-Driven**: Make informed decisions
3. ✅ **Real-time**: Updates with filter changes
4. ✅ **Professional**: Modern, polished UI
5. ✅ **Actionable**: Identify trends and issues quickly
6. ✅ **Responsive**: Works on all devices
7. ✅ **Performance**: Fast rendering, smooth animations

## Testing Checklist

- [x] Chart renders with valid data
- [x] Empty state shows when no data
- [x] Summary stats calculate correctly
- [x] Pie chart segments are correct
- [x] Bar chart heights are proportional
- [x] Colors match design system
- [x] Legend displays correctly
- [x] Charts update when filters change
- [x] Responsive on different screen sizes
- [x] No performance issues with large datasets
