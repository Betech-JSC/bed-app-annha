---
description: BED CRM Design System - Premium layout, page structure, Chart.js patterns, and UX/UI guidelines for Vue 3 + Ant Design Vue + TailwindCSS CRM pages
---

# BED CRM Design System

## 🎨 Design Philosophy

This CRM is NOT a generic admin panel. It's a **premium construction management platform** with personality.
- Bold, confident typography — not tiny gray text
- Vibrant accent colors with purposeful contrast
- Cards with depth (subtle shadows, borders) — not flat rectangles
- Data-dense but breathable — generous whitespace between logical groups
- Micro-interactions on every interactive element (hover, focus, active states)
- Charts that tell stories, not just display numbers

---

## 🏗️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Vue 3 (Composition API + `<script setup>`) | 3.2+ |
| Router | Inertia.js | 1.0+ |
| UI Library | Ant Design Vue | 4.2 |
| Styling | TailwindCSS | 3.4 |
| Charts | Chart.js + vue-chartjs | 4.x |
| Build | Vite + laravel-vite-plugin | 5.x |
| Backend | Laravel 11 + Inertia Server | - |

---

## 🎯 Color System

### Brand Colors (CSS Custom Properties)
```css
:root {
  /* Primary — Deep Ocean Blue */
  --crm-primary: #1B4F72;
  --crm-primary-light: #2E86C1;
  --crm-primary-lighter: #AED6F1;
  --crm-primary-dark: #154360;

  /* Accent — Warm Amber */
  --crm-accent: #F39C12;
  --crm-accent-light: #F7DC6F;
  --crm-accent-dark: #D68910;

  /* Success — Forest Green */
  --crm-success: #1D8348;
  --crm-success-light: #82E0AA;

  /* Danger — Crimson */
  --crm-danger: #C0392B;
  --crm-danger-light: #F1948A;

  /* Warning — Tangerine */
  --crm-warning: #E67E22;
  --crm-warning-light: #F0B27A;

  /* Neutrals */
  --crm-bg: #F0F2F5;
  --crm-bg-card: #FFFFFF;
  --crm-bg-sidebar: #0C1B2A;
  --crm-text-primary: #1A1A2E;
  --crm-text-secondary: #5D6B82;
  --crm-text-muted: #9CA3AF;
  --crm-border: #E8ECF1;
  --crm-border-light: #F3F5F7;
}
```

### Chart Color Palette (avoid generic colors)
```javascript
// DO NOT use: ['red', 'blue', 'green', 'yellow']
// USE these curated palettes:

export const CHART_COLORS = {
  // Primary palette for bar/line charts
  primary: [
    '#1B4F72',  // Deep Ocean
    '#F39C12',  // Warm Amber
    '#1D8348',  // Forest Green
    '#8E44AD',  // Royal Purple
    '#E74C3C',  // Crimson Red
    '#2E86C1',  // Sky Blue
  ],
  // Soft palette for area/donut charts
  soft: [
    'rgba(27, 79, 114, 0.7)',
    'rgba(243, 156, 18, 0.7)',
    'rgba(29, 131, 72, 0.7)',
    'rgba(142, 68, 173, 0.7)',
    'rgba(231, 76, 60, 0.7)',
    'rgba(46, 134, 193, 0.7)',
  ],
  // Gradient pairs for area charts
  gradients: {
    revenue: ['#1B4F72', '#AED6F1'],
    profit: ['#1D8348', '#82E0AA'],
    cost: ['#E74C3C', '#F1948A'],
  }
}
```

---

## 📐 Layout Structure

### Sidebar Layout Pattern
```
┌──────────────────────────────────────────────┐
│ SIDEBAR (240px)  │  HEADER (64px)            │
│ ┌──────────────┐ │  Breadcrumb + Actions      │
│ │ Logo         │ ├───────────────────────────│
│ │ ─────────    │ │                           │
│ │ Menu Group 1 │ │  PAGE CONTENT             │
│ │  • Item      │ │                           │
│ │  • Item      │ │  ┌────┐ ┌────┐ ┌────┐    │
│ │              │ │  │STAT│ │STAT│ │STAT│    │
│ │ Menu Group 2 │ │  └────┘ └────┘ └────┘    │
│ │  • Item      │ │                           │
│ │  • Item      │ │  ┌──────────────────────┐ │
│ │              │ │  │     CHART / TABLE     │ │
│ │              │ │  └──────────────────────┘ │
│ └──────────────┘ │                           │
└──────────────────────────────────────────────┘
```

### Vue Component Structure
```
resources/js/
├── Layouts/
│   └── CrmLayout.vue         # Main sidebar layout
├── Pages/
│   └── Crm/
│       ├── Dashboard/
│       │   └── Index.vue      # Overview dashboard
│       ├── Projects/
│       │   ├── Index.vue      # List with filters
│       │   └── Show.vue       # Detail view
│       ├── HR/
│       ├── Finance/
│       └── Settings/
├── Components/
│   └── Crm/
│       ├── StatCard.vue       # KPI metric card
│       ├── ChartCard.vue      # Chart wrapper
│       ├── DataTable.vue      # Enhanced table
│       ├── PageHeader.vue     # Page title + actions
│       ├── FilterBar.vue      # Search + filter bar
│       └── EmptyState.vue     # Empty state illustrations
└── Composables/
    ├── useChart.js            # Chart.js config factory
    └── useCrmFilters.js       # Filter state management
```

---

## 🧱 Component Patterns

### 1. Page Template (MANDATORY for every page)
```vue
<template>
  <Head :title="pageTitle" />

  <!-- Page Header -->
  <div class="crm-page-header">
    <div>
      <h1 class="crm-page-title">{{ pageTitle }}</h1>
      <p class="crm-page-subtitle">{{ pageSubtitle }}</p>
    </div>
    <div class="crm-page-actions">
      <a-button type="primary" size="large">
        <template #icon><PlusOutlined /></template>
        Thêm mới
      </a-button>
    </div>
  </div>

  <!-- Stats Row (if applicable) -->
  <div class="crm-stats-grid">
    <StatCard
      v-for="stat in stats"
      :key="stat.label"
      v-bind="stat"
    />
  </div>

  <!-- Main Content -->
  <div class="crm-content-card">
    <slot />
  </div>
</template>
```

### 2. StatCard Component
```vue
<template>
  <div class="crm-stat-card" :class="[`crm-stat-card--${variant}`]">
    <div class="crm-stat-card__icon">
      <component :is="icon" />
    </div>
    <div class="crm-stat-card__content">
      <span class="crm-stat-card__value">{{ formattedValue }}</span>
      <span class="crm-stat-card__label">{{ label }}</span>
    </div>
    <div v-if="trend" class="crm-stat-card__trend" :class="trendClass">
      <ArrowUpOutlined v-if="trend > 0" />
      <ArrowDownOutlined v-else />
      {{ Math.abs(trend) }}%
    </div>
  </div>
</template>
```

CSS for StatCard:
```css
.crm-stat-card {
  @apply bg-white rounded-2xl p-6 flex items-center gap-4
         border border-gray-100
         transition-all duration-300 ease-out
         hover:shadow-lg hover:-translate-y-0.5;
}
.crm-stat-card__icon {
  @apply w-14 h-14 rounded-xl flex items-center justify-center text-xl;
}
.crm-stat-card--primary .crm-stat-card__icon {
  background: linear-gradient(135deg, #1B4F72, #2E86C1);
  @apply text-white;
}
.crm-stat-card--success .crm-stat-card__icon {
  background: linear-gradient(135deg, #1D8348, #27AE60);
  @apply text-white;
}
.crm-stat-card--warning .crm-stat-card__icon {
  background: linear-gradient(135deg, #E67E22, #F39C12);
  @apply text-white;
}
.crm-stat-card--danger .crm-stat-card__icon {
  background: linear-gradient(135deg, #C0392B, #E74C3C);
  @apply text-white;
}
.crm-stat-card__value {
  @apply text-2xl font-bold text-gray-900 block;
}
.crm-stat-card__label {
  @apply text-sm text-gray-500;
}
.crm-stat-card__trend {
  @apply text-sm font-semibold ml-auto px-3 py-1 rounded-full;
}
.crm-stat-card__trend.positive {
  @apply bg-green-50 text-green-600;
}
.crm-stat-card__trend.negative {
  @apply bg-red-50 text-red-600;
}
```

### 3. Chart.js Configuration Pattern
```javascript
// composables/useChart.js
import { CHART_COLORS } from '@/constants/colors'

export function useChart() {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 13, family: "'Inter', sans-serif" },
          color: '#5D6B82',
        }
      },
      tooltip: {
        backgroundColor: '#1A1A2E',
        titleFont: { size: 14, weight: '600' },
        bodyFont: { size: 13 },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 6,
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9CA3AF', font: { size: 12 } },
        border: { display: false },
      },
      y: {
        grid: { color: '#F3F5F7', drawBorder: false },
        ticks: { color: '#9CA3AF', font: { size: 12 } },
        border: { display: false },
      }
    },
    elements: {
      line: {
        tension: 0.4,  // Smooth curves — not jagged
        borderWidth: 3,
      },
      point: {
        radius: 0,       // Hidden by default
        hoverRadius: 6,  // Show on hover
        hoverBorderWidth: 3,
      },
      bar: {
        borderRadius: 8,
        borderSkipped: false,
      }
    }
  }

  const createGradient = (ctx, color1, color2) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 300)
    gradient.addColorStop(0, color1)
    gradient.addColorStop(1, color2 + '10')  // Fade to transparent
    return gradient
  }

  return { defaultOptions, createGradient, CHART_COLORS }
}
```

### 4. ChartCard Wrapper
```vue
<template>
  <div class="crm-chart-card">
    <div class="crm-chart-card__header">
      <div>
        <h3 class="crm-chart-card__title">{{ title }}</h3>
        <p v-if="subtitle" class="crm-chart-card__subtitle">{{ subtitle }}</p>
      </div>
      <div class="crm-chart-card__actions">
        <a-segmented
          v-if="periods"
          v-model:value="activePeriod"
          :options="periods"
          size="small"
        />
        <slot name="actions" />
      </div>
    </div>
    <div class="crm-chart-card__body" :style="{ height: height + 'px' }">
      <slot />
    </div>
  </div>
</template>
```

### 5. DataTable Pattern
```vue
<template>
  <div class="crm-data-table">
    <!-- Filter Bar -->
    <div class="crm-filter-bar">
      <a-input-search
        v-model:value="search"
        placeholder="Tìm kiếm..."
        class="crm-search-input"
        allow-clear
      />
      <a-select v-model:value="statusFilter" placeholder="Trạng thái" allow-clear>
        <a-select-option v-for="s in statuses" :key="s.value" :value="s.value">
          {{ s.label }}
        </a-select-option>
      </a-select>
    </div>

    <!-- Table -->
    <a-table
      :columns="columns"
      :data-source="filteredData"
      :pagination="pagination"
      :loading="loading"
      row-key="id"
      class="crm-table"
    >
      <!-- Custom column slots -->
      <template #bodyCell="{ column, record }">
        <slot :name="column.dataIndex" :record="record" :column="column" />
      </template>
    </a-table>
  </div>
</template>
```

---

## 🪟 Modal-First CRUD Pattern (MANDATORY)

> **RULE: Tạo mới và Chỉnh sửa LUÔN dùng Modal (Popup), KHÔNG tạo page riêng.**
> Chỉ có List pages (Index.vue) và Detail pages (Show.vue). Create/Edit dùng `<a-modal>`.

### Create/Edit Modal Template
```vue
<template>
  <!-- Trigger button (in page header or table) -->
  <a-button type="primary" @click="showModal = true">
    <template #icon><PlusOutlined /></template>
    Thêm mới
  </a-button>

  <!-- Modal Form -->
  <a-modal
    v-model:open="showModal"
    :title="editingRecord ? 'Chỉnh sửa' : 'Thêm mới'"
    :width="640"
    :confirm-loading="form.processing"
    @ok="handleSubmit"
    @cancel="resetForm"
    ok-text="Lưu"
    cancel-text="Hủy"
    class="crm-modal"
    centered
    destroy-on-close
  >
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Tên" :validate-status="form.errors.name ? 'error' : ''" :help="form.errors.name">
            <a-input v-model:value="form.name" placeholder="Nhập tên..." />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Trạng thái">
            <a-select v-model:value="form.status" placeholder="Chọn...">
              <a-select-option value="active">Hoạt động</a-select-option>
              <a-select-option value="inactive">Tạm dừng</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref } from 'vue'
import { useForm } from '@inertiajs/vue3'

const showModal = ref(false)
const editingRecord = ref(null)

const form = useForm({
  name: '',
  status: 'active',
})

// Open for editing
const openEdit = (record) => {
  editingRecord.value = record
  form.name = record.name
  form.status = record.status
  showModal.value = true
}

// Submit
const handleSubmit = () => {
  if (editingRecord.value) {
    form.put(`/crm/resource/${editingRecord.value.id}`, {
      onSuccess: () => { showModal.value = false; resetForm() }
    })
  } else {
    form.post('/crm/resource', {
      onSuccess: () => { showModal.value = false; resetForm() }
    })
  }
}

// Reset
const resetForm = () => {
  editingRecord.value = null
  form.reset()
  form.clearErrors()
}
</script>
```

### Modal CSS Overrides
```css
.crm-modal .ant-modal-content {
  border-radius: 16px !important;
  overflow: hidden;
}
.crm-modal .ant-modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #F3F5F7;
}
.crm-modal .ant-modal-title {
  font-weight: 700 !important;
  font-size: 18px !important;
}
.crm-modal .ant-modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #F3F5F7;
}
```

### Detail View: Use Drawer (for complex detail)
```vue
<!-- For detailed info that needs more space than a modal -->
<a-drawer
  v-model:open="showDetail"
  :title="'Chi tiết: ' + record.name"
  :width="720"
  placement="right"
  class="crm-drawer"
>
  <!-- Detail content tabs, timeline, etc. -->
  <a-tabs>
    <a-tab-pane key="info" tab="Thông tin">...</a-tab-pane>
    <a-tab-pane key="history" tab="Lịch sử">...</a-tab-pane>
  </a-tabs>
</a-drawer>
```

### When to Use What
| Action | Component | Example |
|--------|-----------|---------|
| **Tạo mới** | `<a-modal>` | Thêm dự án, nhân viên, vật tư |
| **Chỉnh sửa** | `<a-modal>` | Sửa thông tin dự án |
| **Xem chi tiết** | `<a-drawer>` hoặc Show.vue | Xem chi tiết dự án + tabs |
| **Xóa** | `<a-popconfirm>` | Xóa với xác nhận inline |
| **Bulk actions** | `<a-modal>` | Duyệt nhiều phiếu chi |

---

## 🚫 Anti-Patterns (DO NOT DO)

| ❌ Don't | ✅ Do Instead |
|----------|--------------|
| Plain white bg + gray text everywhere | Use card elevation, subtle borders, gradient icons |
| Generic pie chart with red/blue/green | Use curated CHART_COLORS palette |
| Tiny 12px text for everything | Bold 24px values, 14px supporting text |
| Flat rectangles for stats | Rounded cards with gradient icon backgrounds |
| Default browser form inputs | Ant Design Vue components with custom styling |
| Full-width content without breathing room | Max 1400px content width, generous padding |
| No hover/transition effects | Every interactive element has 300ms ease transition |
| Table with 20+ columns | Max 7-8 visible columns, use expandable rows |
| Alert-style danger colors for stats | Use soft color backgrounds (`bg-red-50`), not full red |
| **Tạo page riêng cho Create/Edit** | **Dùng `<a-modal>` popup trên cùng trang list** |
| **Navigate away to edit** | **Mở modal, sửa, submit, đóng modal — stay on page** |

---

## 📋 CRM Modules (matching Mobile App)

### Module → Page Mapping

| App Module | CRM Page | Priority |
|-----------|----------|---------|
| Dashboard | `/crm/dashboard` | P0 |
| Projects | `/crm/projects` | P0 |
| Project Costs | `/crm/projects/:id/costs` | P0 |
| HR / Employees | `/crm/hr/employees` | P0 |
| Finance Reports | `/crm/finance` | P1 |
| Materials | `/crm/materials` | P1 |
| Equipment | `/crm/equipment` | P1 |
| Notifications | `/crm/notifications` | P1 |
| Settings / RBAC | `/crm/settings` | P1 |
| Subcontractors | `/crm/subcontractors` | P2 |
| Acceptance | `/crm/acceptance` | P2 |

---

## 🔁 Page Creation Checklist

When creating ANY new CRM page, follow this checklist exactly:

1. [ ] Create Vue page at `resources/js/Pages/Crm/{Module}/Index.vue` (List only)
2. [ ] Use `<script setup>` composition API
3. [ ] Set `layout: CrmLayout` in defineOptions
4. [ ] Include `<Head :title="..." />` for page title
5. [ ] Add PageHeader with title, subtitle, and action buttons
6. [ ] Add StatCards row if page has KPI data
7. [ ] Use ChartCard + Chart.js for any charts (with `useChart` composable)
8. [ ] Use DataTable component for list pages
9. [ ] All colors from design system — no hardcoded hex values
10. [ ] Add hover transitions on all interactive elements
11. [ ] Responsive: stats 4→2 columns, tables scrollable on mobile
