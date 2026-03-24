<template>
  <Head title="Tổng quan" />

  <PageHeader
    title="Tổng quan"
    subtitle="Chào mừng trở lại! Đây là tình hình hoạt động hôm nay."
  >
    <template #actions>
      <a-button size="large" class="rounded-xl mr-2" @click="router.visit('/reports')">
        <template #icon><BarChartOutlined /></template>
        Báo cáo
      </a-button>
      <a-button type="primary" size="large" class="rounded-xl" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);" @click="router.visit('/projects')">
        <template #icon><PlusOutlined /></template>
        Dự án mới
      </a-button>
    </template>
  </PageHeader>

  <!-- ═══════════════════════════════════════════════
       KPI Banner
       ═══════════════════════════════════════════════ -->
  <div class="kpi-banner">
    <div class="kpi-banner__bg"></div>
    <div class="kpi-banner__content">
      <div class="kpi-item">
        <div class="kpi-label">Tổng doanh thu</div>
        <div class="kpi-value">{{ fmtCurrency(stats.totalRevenue) }}</div>
        <div class="kpi-sub kpi-sub--blue">Tháng này: {{ fmtCurrency(stats.monthRevenue) }}</div>
      </div>
      <div class="kpi-sep"></div>
      <div class="kpi-item">
        <div class="kpi-label">Tổng chi phí</div>
        <div class="kpi-value kpi-value--amber">{{ fmtCurrency(stats.totalCosts) }}</div>
        <div class="kpi-sub kpi-sub--amber">Tháng này: {{ fmtCurrency(stats.monthCosts) }}</div>
      </div>
      <div class="kpi-sep"></div>
      <div class="kpi-item">
        <div class="kpi-label">Lợi nhuận</div>
        <div class="kpi-value kpi-value--green">{{ fmtCurrency(stats.profit) }}</div>
        <div class="kpi-sub" :class="stats.profitMargin >= 0 ? 'kpi-sub--green' : 'kpi-sub--red'">
          Biên LN: {{ stats.profitMargin }}%
        </div>
      </div>
      <div class="kpi-sep"></div>
      <div class="kpi-item">
        <div class="kpi-label">Chờ duyệt</div>
        <div class="kpi-value kpi-value--red">{{ stats.pendingCostsCount }}</div>
        <div class="kpi-sub kpi-sub--red">{{ fmtCurrency(stats.pendingCosts) }}</div>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════
       Stats Row
       ═══════════════════════════════════════════════ -->
  <div class="crm-stats-grid">
    <StatCard :value="stats.totalProjects" label="Tổng dự án" :icon="ProjectOutlined" variant="primary" />
    <StatCard :value="stats.activeProjects" label="Đang thi công" :icon="ThunderboltOutlined" variant="warning" />
    <StatCard :value="stats.completedProjects" label="Hoàn thành" :icon="CheckCircleOutlined" variant="success" />
    <StatCard :value="stats.totalEmployees" label="Nhân viên" :icon="TeamOutlined" variant="accent" />
  </div>

  <!-- ═══════════════════════════════════════════════
       ROW 1: Revenue/Cost/Profit Trend + Project Status
       ═══════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <div class="xl:col-span-2">
      <ChartCard title="Doanh thu — Chi phí — Lợi nhuận" subtitle="12 tháng gần nhất" :height="340">
        <Line :data="revenueChartData" :options="lineOptions" />
      </ChartCard>
    </div>
    <div>
      <ChartCard title="Trạng thái dự án" :subtitle="`${stats.totalProjects} dự án`" :height="340">
        <Doughnut :data="statusChartData" :options="doughnutOpts" />
      </ChartCard>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════
       ROW 2: Cost by Group + Cost Approval Status
       ═══════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <div class="xl:col-span-2">
      <ChartCard title="Chi phí theo nhóm" :subtitle="'Tổng: ' + fmtCurrency(stats.totalCosts)" :height="300">
        <Bar :data="costGroupChartData" :options="horizontalBarOpts" />
      </ChartCard>
    </div>
    <div>
      <ChartCard title="Trạng thái chi phí" subtitle="Phân bổ theo trạng thái" :height="300">
        <Doughnut :data="costStatusChartData" :options="costStatusOpts" />
      </ChartCard>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════
       ROW 3: New Projects Monthly + Top 5 Projects by Cost
       ═══════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
    <ChartCard title="Dự án mới theo tháng" subtitle="6 tháng gần nhất" :height="280">
      <Bar :data="newProjectsChartData" :options="verticalBarOpts" />
    </ChartCard>
    <ChartCard title="Top 5 dự án chi phí cao nhất" subtitle="Xếp hạng theo tổng chi phí" :height="280">
      <Bar :data="topProjectsCostData" :options="horizontalBarOpts" />
    </ChartCard>
  </div>

  <!-- ═══════════════════════════════════════════════
       ROW 4: Budget Utilization + Quick Actions
       ═══════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <div class="xl:col-span-2">
      <ChartCard title="Sử dụng ngân sách" subtitle="Chi phí so với giá trị hợp đồng" :height="300">
        <Bar :data="budgetChartData" :options="budgetBarOpts" />
      </ChartCard>
    </div>

    <!-- Quick Actions -->
    <div class="crm-content-card qa-card">
      <div class="crm-content-card__header">
        <h3 class="crm-content-card__title">
          <span class="icon-badge icon-badge--primary"><AppstoreOutlined /></span>
          Thao tác nhanh
        </h3>
      </div>
      <div class="p-5">
        <div class="grid grid-cols-2 gap-3">
          <div class="crm-quick-action" @click="router.visit('/projects')">
            <div class="crm-quick-action__icon" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);">
              <ProjectOutlined style="color: white;" />
            </div>
            <span class="text-sm font-medium text-gray-700">Tạo dự án</span>
          </div>
          <div class="crm-quick-action" @click="router.visit('/hr/employees')">
            <div class="crm-quick-action__icon" style="background: linear-gradient(135deg, #8E44AD, #BB6BD9);">
              <UserAddOutlined style="color: white;" />
            </div>
            <span class="text-sm font-medium text-gray-700">Thêm nhân viên</span>
          </div>
          <div class="crm-quick-action" @click="router.visit('/finance')">
            <div class="crm-quick-action__icon" style="background: linear-gradient(135deg, #1D8348, #27AE60);">
              <FileTextOutlined style="color: white;" />
            </div>
            <span class="text-sm font-medium text-gray-700">Phiếu chi</span>
          </div>
          <div class="crm-quick-action" @click="router.visit('/reports')">
            <div class="crm-quick-action__icon" style="background: linear-gradient(135deg, #E67E22, #F39C12);">
              <BarChartOutlined style="color: white;" />
            </div>
            <span class="text-sm font-medium text-gray-700">Báo cáo</span>
          </div>
          <div class="crm-quick-action" @click="router.visit('/approvals')">
            <div class="crm-quick-action__icon" style="background: linear-gradient(135deg, #C0392B, #E74C3C);">
              <AuditOutlined style="color: white;" />
            </div>
            <span class="text-sm font-medium text-gray-700">Duyệt chi phí</span>
          </div>
          <div class="crm-quick-action" @click="router.visit('/notifications')">
            <div class="crm-quick-action__icon" style="background: linear-gradient(135deg, #2C3E50, #34495E);">
              <BellOutlined style="color: white;" />
            </div>
            <span class="text-sm font-medium text-gray-700">Thông báo</span>
          </div>
        </div>

        <!-- Pending costs alert -->
        <div v-if="stats.pendingCosts > 0" class="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <div class="flex items-center gap-2">
            <ExclamationCircleOutlined class="text-amber-500" />
            <span class="text-sm text-amber-700 font-medium">
              {{ stats.pendingCostsCount }} chi phí ({{ fmtCurrency(stats.pendingCosts) }}) chờ duyệt
            </span>
          </div>
        </div>

        <!-- Notifications alert -->
        <div v-if="stats.unreadNotifications > 0" class="mt-2 p-3 rounded-xl bg-blue-50 border border-blue-200 cursor-pointer" @click="router.visit('/notifications')">
          <div class="flex items-center gap-2">
            <BellOutlined class="text-blue-500" />
            <span class="text-sm text-blue-700 font-medium">
              {{ stats.unreadNotifications }} thông báo chưa đọc
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════
       ROW 5: Recent Projects Table
       ═══════════════════════════════════════════════ -->
  <div class="crm-content-card">
    <div class="crm-content-card__header">
      <h3 class="crm-content-card__title">
        <span class="icon-badge icon-badge--primary"><ProjectOutlined /></span>
        Dự án gần đây
      </h3>
      <a-button type="link" @click="router.visit('/projects')">
        Xem tất cả →
      </a-button>
    </div>
    <a-table
      :columns="projectColumns"
      :data-source="recentProjects"
      :pagination="false"
      row-key="id"
      class="crm-table"
      :scroll="{ x: 800 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'name'">
          <div class="flex items-center gap-3 cursor-pointer" @click="router.visit(`/projects/${record.id}`)">
            <a-avatar :size="34" shape="square" class="project-avatar">
              {{ record.name?.charAt(0) }}
            </a-avatar>
            <div>
              <div class="font-semibold text-gray-800 text-sm">{{ record.name }}</div>
              <div class="text-xs text-gray-400">{{ record.code }}</div>
            </div>
          </div>
        </template>
        <template v-if="column.dataIndex === 'status'">
          <span class="crm-tag" :class="statusClass(record.status)">
            {{ statusLabel(record.status) }}
          </span>
        </template>
        <template v-if="column.dataIndex === 'contract_value'">
          <span class="font-semibold text-sm">{{ fmtCurrency(record.contract_value) }}</span>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Line, Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import ChartCard from '@/Components/Crm/ChartCard.vue'
import { useChart, CHART_COLORS } from '@/Composables/useChart'
import {
  PlusOutlined,
  ProjectOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  TeamOutlined,
  UserAddOutlined,
  FileTextOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined,
  BellOutlined,
  AuditOutlined,
  AppstoreOutlined,
} from '@ant-design/icons-vue'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
)

defineOptions({ layout: CrmLayout })

const props = defineProps({
  stats: Object,
  charts: Object,
  recentProjects: Array,
})

const { defaultOptions, doughnutOptions, barOptions, formatCurrency: fmtCompact, formatCompact } = useChart()

const fmtCurrency = (v) => {
  if (!v && v !== 0) return '0đ'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency', currency: 'VND', maximumFractionDigits: 0,
  }).format(v)
}

// ============================================================
// CHART 1: Revenue/Cost/Profit Line
// ============================================================
const lineOptions = computed(() => ({
  ...defaultOptions,
  plugins: {
    ...defaultOptions.plugins,
    tooltip: {
      ...defaultOptions.plugins.tooltip,
      callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtCurrency(ctx.raw)}` }
    }
  },
  scales: {
    ...defaultOptions.scales,
    y: {
      ...defaultOptions.scales.y,
      ticks: { ...defaultOptions.scales.y.ticks, callback: (v) => formatCompact(v) }
    }
  }
}))

const revenueChartData = computed(() => ({
  labels: props.charts?.revenueChart?.labels || [],
  datasets: [
    {
      label: 'Doanh thu',
      data: props.charts?.revenueChart?.revenue || [],
      borderColor: '#1B4F72',
      backgroundColor: 'rgba(27, 79, 114, 0.1)',
      fill: true,
      borderWidth: 3,
    },
    {
      label: 'Chi phí',
      data: props.charts?.revenueChart?.cost || [],
      borderColor: '#E74C3C',
      backgroundColor: 'rgba(231, 76, 60, 0.08)',
      fill: true,
      borderWidth: 2,
      borderDash: [5, 5],
    },
    {
      label: 'Lợi nhuận',
      data: props.charts?.revenueChart?.profit || [],
      borderColor: '#10B981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      fill: true,
      borderWidth: 2,
    },
  ]
}))

// ============================================================
// CHART 2: Project Status Donut
// ============================================================
const doughnutOpts = computed(() => ({ ...doughnutOptions }))
const statusChartData = computed(() => ({
  labels: props.charts?.projectStatus?.labels || [],
  datasets: [{
    data: props.charts?.projectStatus?.data || [],
    backgroundColor: CHART_COLORS.primary.slice(0, (props.charts?.projectStatus?.data || []).length),
    hoverOffset: 8,
  }]
}))

// ============================================================
// CHART 3: Cost by Group (Horizontal Bar)
// ============================================================
const horizontalBarOpts = computed(() => ({
  ...barOptions,
  plugins: {
    ...barOptions.plugins,
    tooltip: { ...barOptions.plugins?.tooltip, callbacks: { label: (ctx) => fmtCurrency(ctx.raw) } }
  }
}))

const costGroupChartData = computed(() => ({
  labels: props.charts?.costByType?.labels || [],
  datasets: [{
    label: 'Chi phí',
    data: props.charts?.costByType?.data || [],
    backgroundColor: CHART_COLORS.soft.slice(0, (props.charts?.costByType?.data || []).length),
    borderColor: CHART_COLORS.primary.slice(0, (props.charts?.costByType?.data || []).length),
    borderWidth: 1, borderRadius: 8,
  }]
}))

// ============================================================
// CHART 4: Cost Approval Status Donut
// ============================================================
const costStatusOpts = computed(() => ({
  ...doughnutOptions,
  cutout: '65%',
  plugins: {
    ...doughnutOptions.plugins,
    legend: { ...doughnutOptions.plugins.legend, position: 'bottom' }
  }
}))

const costStatusChartData = computed(() => ({
  labels: props.charts?.costStatus?.labels || [],
  datasets: [{
    data: props.charts?.costStatus?.data || [],
    backgroundColor: props.charts?.costStatus?.colors || [],
    hoverOffset: 6,
  }]
}))

// ============================================================
// CHART 5: New Projects Monthly (Vertical Bar)
// ============================================================
const verticalBarOpts = computed(() => ({
  ...defaultOptions,
  plugins: {
    ...defaultOptions.plugins,
    legend: { display: false },
  },
  scales: {
    ...defaultOptions.scales,
    y: {
      ...defaultOptions.scales.y,
      beginAtZero: true,
      ticks: { ...defaultOptions.scales.y.ticks, callback: (v) => Number.isInteger(v) ? v : '', stepSize: 1 }
    }
  }
}))

const newProjectsChartData = computed(() => ({
  labels: props.charts?.newProjects?.labels || [],
  datasets: [{
    label: 'Dự án mới',
    data: props.charts?.newProjects?.data || [],
    backgroundColor: 'rgba(27, 79, 114, 0.75)',
    borderColor: '#1B4F72',
    borderWidth: 1,
    borderRadius: 10,
    barThickness: 36,
  }]
}))

// ============================================================
// CHART 6: Top Projects by Cost (Horizontal Bar)
// ============================================================
const topProjectsCostData = computed(() => ({
  labels: props.charts?.topProjectsCost?.labels || [],
  datasets: [{
    label: 'Chi phí',
    data: props.charts?.topProjectsCost?.data || [],
    backgroundColor: [
      'rgba(231, 76, 60, 0.8)',
      'rgba(243, 156, 18, 0.8)',
      'rgba(46, 134, 193, 0.8)',
      'rgba(142, 68, 173, 0.8)',
      'rgba(29, 131, 72, 0.8)',
    ],
    borderRadius: 8,
    borderWidth: 0,
  }]
}))

// ============================================================
// CHART 7: Budget Utilization (Grouped Vertical Bar)
// ============================================================
const budgetBarOpts = computed(() => ({
  ...defaultOptions,
  plugins: {
    ...defaultOptions.plugins,
    tooltip: {
      ...defaultOptions.plugins.tooltip,
      callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtCurrency(ctx.raw)}` }
    }
  },
  scales: {
    ...defaultOptions.scales,
    y: {
      ...defaultOptions.scales.y,
      ticks: { ...defaultOptions.scales.y.ticks, callback: (v) => formatCompact(v) }
    }
  }
}))

const budgetChartData = computed(() => ({
  labels: props.charts?.budgetUtilization?.labels || [],
  datasets: [
    {
      label: 'Ngân sách (HĐ)',
      data: props.charts?.budgetUtilization?.budget || [],
      backgroundColor: 'rgba(27, 79, 114, 0.3)',
      borderColor: '#1B4F72',
      borderWidth: 1,
      borderRadius: 6,
    },
    {
      label: 'Đã chi',
      data: props.charts?.budgetUtilization?.spent || [],
      backgroundColor: 'rgba(231, 76, 60, 0.7)',
      borderColor: '#E74C3C',
      borderWidth: 1,
      borderRadius: 6,
    },
  ]
}))

// ============================================================
// TABLE
// ============================================================
const projectColumns = [
  { title: 'Tên dự án', dataIndex: 'name', key: 'name', width: 260 },
  { title: 'Quản lý', dataIndex: 'manager', key: 'manager', width: 150 },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 140 },
  { title: 'Giá trị HĐ', dataIndex: 'contract_value', key: 'contract_value', align: 'right', width: 160 },
  { title: 'Bắt đầu', dataIndex: 'start_date', key: 'start_date', width: 120 },
  { title: 'Kết thúc', dataIndex: 'end_date', key: 'end_date', width: 120 },
]

const statusLabel = (s) => ({ planning: 'Lập kế hoạch', in_progress: 'Đang thi công', completed: 'Hoàn thành', suspended: 'Tạm dừng', cancelled: 'Hủy bỏ' })[s] || s
const statusClass = (s) => ({ planning: 'crm-tag--pending', in_progress: 'crm-tag--active', completed: 'crm-tag--completed', suspended: 'crm-tag--pending', cancelled: 'crm-tag--cancelled' })[s] || ''
</script>

<style scoped>
/* ─── KPI Banner ─── */
.kpi-banner {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 1.75rem;
}

.kpi-banner__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0C1B2A 0%, #1B4F72 50%, #2E86C1 100%);
}
.kpi-banner__bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 15% 50%, rgba(46, 134, 193, 0.3) 0%, transparent 55%),
    radial-gradient(circle at 85% 30%, rgba(243, 156, 18, 0.12) 0%, transparent 50%);
}

.kpi-banner__content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 28px 40px;
  gap: 16px;
}

.kpi-item { text-align: center; flex: 1; }
.kpi-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; }
.kpi-value { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.02em; }
.kpi-value--amber { color: #FBBF24; }
.kpi-value--green { color: #6EE7B7; }
.kpi-value--red { color: #FCA5A5; }
.kpi-sub { font-size: 12px; font-weight: 500; margin-top: 4px; }
.kpi-sub--blue { color: rgba(174,214,241, 0.7); }
.kpi-sub--amber { color: rgba(251,191,36, 0.6); }
.kpi-sub--green { color: rgba(110,231,183, 0.7); }
.kpi-sub--red { color: rgba(252,165,165, 0.7); }
.kpi-sep { width: 1px; height: 56px; background: rgba(255,255,255,0.1); flex-shrink: 0; }

/* ─── Icon Badges ─── */
.icon-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  margin-right: 10px;
  font-size: 15px;
  flex-shrink: 0;
}
.icon-badge--primary { background: rgba(27, 79, 114, 0.1); color: #1B4F72; }

/* ─── Project Avatar ─── */
.project-avatar {
  background: linear-gradient(135deg, #1B4F72, #2E86C1) !important;
  color: #fff !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  border-radius: 10px !important;
}

/* ─── Quick Actions Card ─── */
.qa-card {
  display: flex;
  flex-direction: column;
}

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .kpi-banner__content { flex-direction: column; gap: 12px; padding: 20px; }
  .kpi-sep { width: 80px; height: 1px; }
  .kpi-value { font-size: 22px; }
}
</style>
