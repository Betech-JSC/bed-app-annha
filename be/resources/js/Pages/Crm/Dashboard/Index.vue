<template>
  <Head title="Tổng quan CEO" />

  <!-- PAGE HEADER + FILTER BAR -->
  <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Tổng quan điều hành</h1>
      <p class="text-sm text-gray-500 mt-1">Bảng điều khiển CEO — Cập nhật realtime</p>
    </div>
    <div class="flex items-center gap-3 flex-wrap">
      <a-segmented v-model:value="activePeriod" :options="periodOptions" @change="onPeriodChange" />
      <a-range-picker v-if="activePeriod === 'Tùy chỉnh'" v-model:value="customRange" format="DD/MM/YYYY" @change="onCustomRange" size="middle" class="rounded-xl" />
      <a-switch v-model:checked="compareMode" @change="onCompareToggle" size="small" />
      <span class="text-xs text-gray-500">So sánh kỳ trước</span>
      <a-button size="middle" class="rounded-xl" @click="router.visit('/finance')">
        <template #icon><BarChartOutlined /></template>
        Báo cáo
      </a-button>
    </div>
  </div>

  <!-- KPI EXECUTIVE BANNER -->
  <div class="kpi-banner mb-6">
    <div class="kpi-banner__bg"></div>
    <div class="kpi-banner__content">
      <div class="kpi-item">
        <div class="kpi-label">Tổng doanh thu</div>
        <div class="kpi-value">{{ fmt(stats.totalRevenue) }}</div>
        <div class="kpi-sub kpi-sub--blue">Kỳ này: {{ fmt(periodStats?.revenue) }}</div>
        <div v-if="compareMode && prevPeriodStats" class="kpi-delta" :class="deltaClass(periodStats?.revenue, prevPeriodStats?.revenue)">
          {{ deltaText(periodStats?.revenue, prevPeriodStats?.revenue) }}
        </div>
      </div>
      <div class="kpi-sep"></div>
      <div class="kpi-item">
        <div class="kpi-label">Tổng chi phí</div>
        <div class="kpi-value kpi-value--amber">{{ fmt(stats.totalCosts) }}</div>
        <div class="kpi-sub kpi-sub--amber">Kỳ này: {{ fmt(periodStats?.costs) }}</div>
        <div v-if="compareMode && prevPeriodStats" class="kpi-delta" :class="deltaClass(prevPeriodStats?.costs, periodStats?.costs)">
          {{ deltaText(periodStats?.costs, prevPeriodStats?.costs) }}
        </div>
      </div>
      <div class="kpi-sep"></div>
      <div class="kpi-item">
        <div class="kpi-label">Lợi nhuận</div>
        <div class="kpi-value kpi-value--green">{{ fmt(stats.profit) }}</div>
        <div class="kpi-sub" :class="stats.profitMargin >= 0 ? 'kpi-sub--green' : 'kpi-sub--red'">Biên LN: {{ stats.profitMargin }}%</div>
      </div>
      <div class="kpi-sep"></div>
      <div class="kpi-item">
        <div class="kpi-label">Thu thực tế</div>
        <div class="kpi-value kpi-value--cyan">{{ fmt(stats.paidPayments) }}</div>
        <div class="kpi-sub kpi-sub--blue">Kỳ này: {{ fmt(periodStats?.paidPayments) }}</div>
      </div>
    </div>
  </div>

  <!-- STAT CARDS: ROW 1 -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <StatCard :value="stats.totalProjects" label="Tổng dự án" :icon="ProjectOutlined" variant="primary" />
    <StatCard :value="stats.activeProjects" label="Đang thi công" :icon="ThunderboltOutlined" variant="warning" />
    <StatCard :value="stats.completedProjects" label="Hoàn thành" :icon="CheckCircleOutlined" variant="success" />
    <StatCard :value="stats.planningProjects" label="Lập kế hoạch" :icon="ClockCircleOutlined" variant="accent" />
  </div>

  <!-- STAT CARDS: ROW 2 -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
    <StatCard :value="stats.totalEmployees" label="Nhân viên" :icon="TeamOutlined" variant="primary" />
    <StatCard :value="stats.pendingCosts" label="Chi phí chờ duyệt" :icon="ExclamationCircleOutlined" variant="danger" :suffix="` (${fmtCompact(stats.pendingCostsAmount)})`" />
    <StatCard :value="fmtCompact(stats.totalSubcontractorDebt)" label="Công nợ NTP" icon="DollarOutlined" variant="warning" format="text" />
    <StatCard :value="stats.totalEquipment" label="Thiết bị" :icon="ToolOutlined" variant="success" :suffix="` (${stats.activeEquipment} hoạt động)`" />
  </div>

  <!-- CHARTS ROW 1: Revenue Line (2/3) + Project Status Donut (1/3) -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <div class="xl:col-span-2">
      <ChartCard title="Doanh thu — Chi phí — Lợi nhuận" subtitle="12 tháng gần nhất" :height="340">
        <Line :data="revenueChartData" :options="lineOpts" />
      </ChartCard>
    </div>
    <div>
      <ChartCard title="Trạng thái dự án" :subtitle="`${stats.totalProjects} dự án`" :height="340">
        <Doughnut :data="statusChartData" :options="doughnutOpts" />
      </ChartCard>
    </div>
  </div>

  <!-- CHARTS ROW 2: Cost by Group (1/2) + Monthly Revenue vs Cost (1/2) -->
  <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
    <ChartCard title="Chi phí theo nhóm" :subtitle="'Tổng: ' + fmt(stats.totalCosts)" :height="300">
      <Bar :data="costGroupData" :options="hBarOpts" />
    </ChartCard>
    <ChartCard title="Thu — Chi theo tháng" subtitle="6 tháng gần nhất (thực thu)" :height="300">
      <Bar :data="monthlyCompData" :options="vBarOpts" />
    </ChartCard>
  </div>

  <!-- CHARTS ROW 3: Top 5 Cost + Cost Status + Project Progress -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <ChartCard title="Top 5 DA chi phí cao" subtitle="Xếp hạng tổng chi" :height="260">
      <Bar :data="topCostData" :options="hBarOpts" />
    </ChartCard>
    <ChartCard title="Trạng thái chi phí" subtitle="Phân bổ duyệt chi" :height="260">
      <Doughnut :data="costStatusData" :options="costStatusOpts" />
    </ChartCard>
    <div class="crm-content-card">
      <div class="crm-content-card__header">
        <h3 class="crm-content-card__title"><span class="icon-badge icon-badge--primary"><RocketOutlined /></span> Tiến độ dự án</h3>
      </div>
      <div class="p-4 space-y-3 overflow-y-auto" style="max-height: 310px;">
        <div v-for="p in projectProgress" :key="p.id" class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-2 transition-colors" @click="router.visit(`/projects/${p.id}`)">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-gray-800 truncate">{{ p.name }}</div>
            <div class="text-xs text-gray-400">{{ p.manager }} · {{ p.end_date || '—' }}</div>
          </div>
          <div class="w-24 flex-shrink-0">
            <a-progress :percent="p.progress" :size="6" :stroke-color="p.is_overdue ? '#EF4444' : p.progress >= 80 ? '#10B981' : '#1B4F72'" :show-info="false" />
          </div>
          <span class="text-xs font-bold w-10 text-right" :class="p.is_overdue ? 'text-red-500' : 'text-gray-600'">{{ p.progress }}%</span>
        </div>
        <div v-if="!projectProgress?.length" class="text-center text-gray-400 py-8 text-sm">Không có dự án đang thi công</div>
      </div>
    </div>
  </div>

  <!-- DATA TABLES ROW: Pending Costs + Subcontractor Debt -->
  <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
    <!-- Pending Costs -->
    <div class="crm-content-card">
      <div class="crm-content-card__header">
        <h3 class="crm-content-card__title"><span class="icon-badge icon-badge--danger"><ExclamationCircleOutlined /></span> Chi phí chờ duyệt</h3>
        <a-button type="link" @click="router.visit('/approvals')">Xem tất cả →</a-button>
      </div>
      <a-table :columns="pendingCostCols" :data-source="pendingCostsList" :pagination="false" row-key="id" class="crm-table" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="font-medium text-sm text-gray-800">{{ record.name }}</div>
            <div class="text-xs text-gray-400">{{ record.project }}</div>
          </template>
          <template v-if="column.key === 'amount'">
            <span class="font-semibold text-sm">{{ fmt(record.amount) }}</span>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status?.includes('management') ? 'orange' : 'blue'" class="rounded-lg text-xs">
              {{ record.status?.includes('management') ? 'Chờ BĐH' : 'Chờ KT' }}
            </a-tag>
          </template>
        </template>
      </a-table>
    </div>

    <!-- Subcontractor Debt -->
    <div class="crm-content-card">
      <div class="crm-content-card__header">
        <h3 class="crm-content-card__title"><span class="icon-badge icon-badge--warning"><DollarOutlined /></span> Công nợ nhà thầu phụ</h3>
        <a-tag color="red" class="rounded-lg font-bold">Tổng: {{ fmt(stats.totalSubcontractorDebt) }}</a-tag>
      </div>
      <a-table :columns="debtCols" :data-source="subcontractorDebt" :pagination="false" row-key="id" class="crm-table" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span class="font-medium text-sm text-gray-800">{{ record.name }}</span>
          </template>
          <template v-if="column.key === 'debt'">
            <span class="font-bold text-sm text-red-600">{{ fmt(record.debt) }}</span>
          </template>
          <template v-if="column.key === 'paid_pct'">
            <a-progress :percent="record.total_quote > 0 ? Math.round(record.paid / record.total_quote * 100) : 0" :size="5" :stroke-color="'#10B981'" :show-info="true" style="width: 90px" />
          </template>
        </template>
      </a-table>
    </div>
  </div>

  <!-- RECENT PROJECTS TABLE -->
  <div class="crm-content-card">
    <div class="crm-content-card__header">
      <h3 class="crm-content-card__title"><span class="icon-badge icon-badge--primary"><ProjectOutlined /></span> Dự án gần đây</h3>
      <a-button type="link" @click="router.visit('/projects')">Xem tất cả →</a-button>
    </div>
    <a-table :columns="projectCols" :data-source="recentProjects" :pagination="false" row-key="id" class="crm-table" :scroll="{ x: 800 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div class="flex items-center gap-3 cursor-pointer" @click="router.visit(`/projects/${record.id}`)">
            <a-avatar :size="34" shape="square" class="project-avatar">{{ record.name?.charAt(0) }}</a-avatar>
            <div><div class="font-semibold text-gray-800 text-sm">{{ record.name }}</div><div class="text-xs text-gray-400">{{ record.code }}</div></div>
          </div>
        </template>
        <template v-if="column.key === 'status'">
          <span class="crm-tag" :class="statusClass(record.status)">{{ statusLabel(record.status) }}</span>
        </template>
        <template v-if="column.key === 'contract_value'">
          <span class="font-semibold text-sm">{{ fmt(record.contract_value) }}</span>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Line, Doughnut, Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import ChartCard from '@/Components/Crm/ChartCard.vue'
import { useChart, CHART_COLORS } from '@/Composables/useChart'
import {
  ProjectOutlined, ThunderboltOutlined, CheckCircleOutlined, ClockCircleOutlined,
  TeamOutlined, ExclamationCircleOutlined, DollarOutlined, ToolOutlined,
  BarChartOutlined, RocketOutlined,
} from '@ant-design/icons-vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)
defineOptions({ layout: CrmLayout })

const props = defineProps({
  stats: Object,
  charts: Object,
  recentProjects: Array,
  periodStats: Object,
  prevPeriodStats: Object,
  projectProgress: Array,
  pendingCostsList: Array,
  subcontractorDebt: Array,
  filters: Object,
})

const { defaultOptions, doughnutOptions, barOptions, formatCompact } = useChart()

// ── Filters ──
const periodOptions = ['Tháng', 'Quý', 'Năm', 'Tùy chỉnh']
const periodMap = { 'Tháng': 'month', 'Quý': 'quarter', 'Năm': 'year', 'Tùy chỉnh': 'custom' }
const periodMapReverse = { month: 'Tháng', quarter: 'Quý', year: 'Năm', custom: 'Tùy chỉnh' }
const activePeriod = ref(periodMapReverse[props.filters?.period] || 'Tháng')
const compareMode = ref(props.filters?.compare || false)
const customRange = ref(null)

const navigateDashboard = (params) => {
  router.get('/dashboard', params, { preserveState: true, preserveScroll: true })
}
const onPeriodChange = (val) => navigateDashboard({ period: periodMap[val] || 'month', compare: compareMode.value })
const onCompareToggle = (val) => navigateDashboard({ period: periodMap[activePeriod.value] || 'month', compare: val })
const onCustomRange = (dates) => {
  if (dates?.[0] && dates?.[1]) {
    navigateDashboard({ period: 'custom', compare: compareMode.value, from: dates[0].format('YYYY-MM-DD'), to: dates[1].format('YYYY-MM-DD') })
  }
}

// ── Formatters ──
const fmt = (v) => {
  if (!v && v !== 0) return '0đ'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)
}
const fmtCompact = (v) => {
  if (!v && v !== 0) return '0đ'
  return formatCompact(v) + 'đ'
}

// ── Delta helpers ──
const deltaText = (current, prev) => {
  if (!prev || prev === 0) return '+∞'
  const pct = ((current - prev) / Math.abs(prev) * 100).toFixed(1)
  return (pct >= 0 ? '+' : '') + pct + '%'
}
const deltaClass = (current, prev) => {
  if (!prev) return 'kpi-delta--up'
  return current >= prev ? 'kpi-delta--up' : 'kpi-delta--down'
}

// ── CHART: Revenue/Cost/Profit Line ──
const lineOpts = computed(() => ({
  ...defaultOptions,
  plugins: { ...defaultOptions.plugins, tooltip: { ...defaultOptions.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } } },
  scales: { ...defaultOptions.scales, y: { ...defaultOptions.scales.y, ticks: { ...defaultOptions.scales.y.ticks, callback: (v) => formatCompact(v) } } }
}))
const revenueChartData = computed(() => ({
  labels: props.charts?.revenueChart?.labels || [],
  datasets: [
    { label: 'Doanh thu', data: props.charts?.revenueChart?.revenue || [], borderColor: '#1B4F72', backgroundColor: 'rgba(27,79,114,0.1)', fill: true, borderWidth: 3 },
    { label: 'Chi phí', data: props.charts?.revenueChart?.cost || [], borderColor: '#E74C3C', backgroundColor: 'rgba(231,76,60,0.08)', fill: true, borderWidth: 2, borderDash: [5, 5] },
    { label: 'Lợi nhuận', data: props.charts?.revenueChart?.profit || [], borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, borderWidth: 2 },
  ]
}))

// ── CHART: Project Status Donut ──
const doughnutOpts = computed(() => ({ ...doughnutOptions }))
const statusChartData = computed(() => ({
  labels: props.charts?.projectStatus?.labels || [],
  datasets: [{ data: props.charts?.projectStatus?.data || [], backgroundColor: CHART_COLORS.primary.slice(0, (props.charts?.projectStatus?.data || []).length), hoverOffset: 8 }]
}))

// ── CHART: Cost by Group ──
const hBarOpts = computed(() => ({
  ...barOptions,
  plugins: { ...barOptions.plugins, tooltip: { ...barOptions.plugins?.tooltip, callbacks: { label: (ctx) => fmt(ctx.raw) } } }
}))
const costGroupData = computed(() => ({
  labels: props.charts?.costByType?.labels || [],
  datasets: [{ label: 'Chi phí', data: props.charts?.costByType?.data || [], backgroundColor: CHART_COLORS.soft, borderColor: CHART_COLORS.primary, borderWidth: 1, borderRadius: 8 }]
}))

// ── CHART: Monthly Comparison ──
const vBarOpts = computed(() => ({
  ...defaultOptions,
  plugins: { ...defaultOptions.plugins, tooltip: { ...defaultOptions.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.raw)}` } } },
  scales: { ...defaultOptions.scales, y: { ...defaultOptions.scales.y, ticks: { ...defaultOptions.scales.y.ticks, callback: (v) => formatCompact(v) } } }
}))
const monthlyCompData = computed(() => ({
  labels: props.charts?.monthlyComparison?.labels || [],
  datasets: [
    { label: 'Thu thực tế', data: props.charts?.monthlyComparison?.revenue || [], backgroundColor: 'rgba(27,79,114,0.75)', borderRadius: 8, barThickness: 24 },
    { label: 'Chi phí', data: props.charts?.monthlyComparison?.cost || [], backgroundColor: 'rgba(231,76,60,0.65)', borderRadius: 8, barThickness: 24 },
  ]
}))

// ── CHART: Top 5 Cost ──
const topCostData = computed(() => ({
  labels: props.charts?.topProjectsCost?.labels || [],
  datasets: [{ label: 'Chi phí', data: props.charts?.topProjectsCost?.data || [], backgroundColor: ['rgba(231,76,60,0.8)', 'rgba(243,156,18,0.8)', 'rgba(46,134,193,0.8)', 'rgba(142,68,173,0.8)', 'rgba(29,131,72,0.8)'], borderRadius: 8 }]
}))

// ── CHART: Cost Status Donut ──
const costStatusOpts = computed(() => ({ ...doughnutOptions, cutout: '65%', plugins: { ...doughnutOptions.plugins, legend: { ...doughnutOptions.plugins.legend, position: 'bottom' } } }))
const costStatusData = computed(() => ({
  labels: props.charts?.costStatus?.labels || [],
  datasets: [{ data: props.charts?.costStatus?.data || [], backgroundColor: props.charts?.costStatus?.colors || [], hoverOffset: 6 }]
}))

// ── TABLE COLUMNS ──
const pendingCostCols = [
  { title: 'Chi phí', key: 'name', width: 200 },
  { title: 'Số tiền', key: 'amount', align: 'right', width: 140 },
  { title: 'Trạng thái', key: 'status', width: 100 },
  { title: 'Ngày tạo', dataIndex: 'created_at', width: 100 },
]
const debtCols = [
  { title: 'Nhà thầu', key: 'name', width: 180 },
  { title: 'Còn nợ', key: 'debt', align: 'right', width: 140 },
  { title: 'Thanh toán', key: 'paid_pct', width: 130 },
]
const projectCols = [
  { title: 'Tên dự án', key: 'name', width: 260 },
  { title: 'Quản lý', dataIndex: 'manager', width: 150 },
  { title: 'Trạng thái', key: 'status', width: 140 },
  { title: 'Giá trị HĐ', key: 'contract_value', align: 'right', width: 160 },
  { title: 'Bắt đầu', dataIndex: 'start_date', width: 110 },
  { title: 'Kết thúc', dataIndex: 'end_date', width: 110 },
]

const statusLabel = (s) => ({ planning: 'Lập kế hoạch', in_progress: 'Đang thi công', completed: 'Hoàn thành', suspended: 'Tạm dừng', cancelled: 'Hủy bỏ' })[s] || s
const statusClass = (s) => ({ planning: 'crm-tag--pending', in_progress: 'crm-tag--active', completed: 'crm-tag--completed', suspended: 'crm-tag--pending', cancelled: 'crm-tag--cancelled' })[s] || ''
</script>

<style scoped>
/* ─── KPI Banner ─── */
.kpi-banner { position: relative; border-radius: 20px; overflow: hidden; }
.kpi-banner__bg { position: absolute; inset: 0; background: linear-gradient(135deg, #0C1B2A 0%, #1B4F72 50%, #2E86C1 100%); }
.kpi-banner__bg::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 15% 50%, rgba(46,134,193,0.3) 0%, transparent 55%), radial-gradient(circle at 85% 30%, rgba(243,156,18,0.12) 0%, transparent 50%); }
.kpi-banner__content { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-around; padding: 28px 40px; gap: 16px; }
.kpi-item { text-align: center; flex: 1; }
.kpi-label { font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 6px; }
.kpi-value { font-size: 26px; font-weight: 800; color: #fff; letter-spacing: -0.02em; }
.kpi-value--amber { color: #FBBF24; }
.kpi-value--green { color: #6EE7B7; }
.kpi-value--cyan { color: #67E8F9; }
.kpi-value--red { color: #FCA5A5; }
.kpi-sub { font-size: 11px; font-weight: 500; margin-top: 4px; }
.kpi-sub--blue { color: rgba(174,214,241,0.7); }
.kpi-sub--amber { color: rgba(251,191,36,0.6); }
.kpi-sub--green { color: rgba(110,231,183,0.7); }
.kpi-sub--red { color: rgba(252,165,165,0.7); }
.kpi-sep { width: 1px; height: 56px; background: rgba(255,255,255,0.1); flex-shrink: 0; }
.kpi-delta { font-size: 11px; font-weight: 700; margin-top: 4px; padding: 2px 8px; border-radius: 8px; display: inline-block; }
.kpi-delta--up { background: rgba(16,185,129,0.2); color: #6EE7B7; }
.kpi-delta--down { background: rgba(239,68,68,0.2); color: #FCA5A5; }

/* ─── Misc ─── */
.icon-badge { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 10px; margin-right: 10px; font-size: 15px; flex-shrink: 0; }
.icon-badge--primary { background: rgba(27,79,114,0.1); color: #1B4F72; }
.icon-badge--danger { background: rgba(239,68,68,0.1); color: #EF4444; }
.icon-badge--warning { background: rgba(243,156,18,0.1); color: #F39C12; }
.project-avatar { background: linear-gradient(135deg, #1B4F72, #2E86C1) !important; color: #fff !important; font-weight: 700 !important; font-size: 13px !important; border-radius: 10px !important; }

@media (max-width: 768px) {
  .kpi-banner__content { flex-direction: column; gap: 12px; padding: 20px; }
  .kpi-sep { width: 80px; height: 1px; }
  .kpi-value { font-size: 20px; }
}
</style>
