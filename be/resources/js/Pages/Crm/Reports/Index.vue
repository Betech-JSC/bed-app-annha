<template>
  <Head title="Báo cáo dự án" />

  <PageHeader
    title="Báo Cáo Dự Án"
    subtitle="Phân tích hiệu quả kinh doanh, chi phí, và tiến độ dự án"
  >
    <template #actions>
      <a-select
        v-model:value="selectedYear"
        style="width: 140px;"
        size="large"
        @change="onYearChange"
      >
        <a-select-option v-for="y in filters.availableYears" :key="y" :value="y">
          Năm {{ y }}
        </a-select-option>
      </a-select>
    </template>
  </PageHeader>

  <!-- ═══════════════════════════════════════════════
       ROW 1: KPI Banner
       ═══════════════════════════════════════════════ -->
  <div class="kpi-banner">
    <div class="kpi-banner__bg"></div>
    <div class="kpi-banner__content">
      <div class="kpi-banner__item">
        <div class="kpi-banner__label">Tổng giá trị HĐ</div>
        <div class="kpi-banner__value">{{ fmtCurrency(stats.totalContractValue) }}</div>
      </div>
      <div class="kpi-banner__separator"></div>
      <div class="kpi-banner__item">
        <div class="kpi-banner__label">Tổng chi phí</div>
        <div class="kpi-banner__value kpi-banner__value--warning">{{ fmtCurrency(stats.totalCosts) }}</div>
      </div>
      <div class="kpi-banner__separator"></div>
      <div class="kpi-banner__item">
        <div class="kpi-banner__label">Lợi nhuận ròng</div>
        <div class="kpi-banner__value kpi-banner__value--success">{{ fmtCurrency(stats.profit) }}</div>
      </div>
      <div class="kpi-banner__separator"></div>
      <div class="kpi-banner__item">
        <div class="kpi-banner__label">Biên lợi nhuận</div>
        <div class="kpi-banner__value">
          <span :class="stats.profitMargin >= 0 ? 'text-emerald-300' : 'text-red-300'">
            {{ stats.profitMargin }}%
          </span>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════
       ROW 2: Overview Stats
       ═══════════════════════════════════════════════ -->
  <div class="crm-stats-grid">
    <StatCard :value="stats.totalProjects" label="Tổng dự án" :icon="ProjectOutlined" variant="primary" />
    <StatCard :value="stats.activeProjects" label="Đang thi công" :icon="ThunderboltOutlined" variant="warning" />
    <StatCard :value="stats.completedProjects" label="Hoàn thành" :icon="CheckCircleOutlined" variant="success" />
    <StatCard :value="stats.pendingCostsCount" label="Chi phí chờ duyệt" :icon="ClockCircleOutlined" variant="accent" />
  </div>

  <!-- ═══════════════════════════════════════════════
       ROW 3: Revenue vs Cost Chart + Project Status Donut
       ═══════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <div class="xl:col-span-2">
      <ChartCard title="Doanh thu — Chi phí — Lợi nhuận" :subtitle="`Năm ${selectedYear}`" :height="340">
        <Bar :data="revenueVsCostData" :options="barChartOptions" />
      </ChartCard>
    </div>
    <div>
      <ChartCard title="Trạng thái dự án" :subtitle="`${stats.totalProjects} dự án`" :height="340">
        <Doughnut :data="projectStatusData" :options="doughnutOpts" />
      </ChartCard>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════
       ROW 4: Cost by Group + Cost Trend
       ═══════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
    <ChartCard title="Chi phí theo nhóm" subtitle="Top 8 nhóm chi phí" :height="300">
      <Bar :data="costByGroupData" :options="horizontalBarOptions" />
    </ChartCard>
    <ChartCard title="Xu hướng chi phí" :subtitle="`Năm ${selectedYear}`" :height="300">
      <Line :data="costTrendData" :options="lineOptions" />
    </ChartCard>
  </div>

  <!-- ═══════════════════════════════════════════════
       ROW 5: Payment Progress
       ═══════════════════════════════════════════════ -->
  <div class="crm-content-card mb-8 report-card">
    <div class="crm-content-card__header">
      <h3 class="crm-content-card__title">
        <span class="icon-badge icon-badge--blue"><DollarOutlined /></span>
        Tiến độ thanh toán
      </h3>
    </div>
    <div class="px-6 py-4">
      <div v-for="(pp, idx) in paymentProgress" :key="pp.id" class="payment-row" :style="{ animationDelay: `${idx * 60}ms` }">
        <div class="payment-info">
          <div class="payment-name">{{ pp.name }}</div>
          <div class="payment-code">{{ pp.code }}</div>
        </div>
        <div class="payment-bar-area">
          <div class="payment-bar-track">
            <div
              class="payment-bar-fill"
              :style="{ width: `${Math.min(pp.paid_pct, 100)}%` }"
              :class="barClass(pp.paid_pct)"
            ></div>
          </div>
          <span class="payment-pct" :class="barClass(pp.paid_pct)">{{ pp.paid_pct }}%</span>
        </div>
        <div class="payment-amounts">
          <span class="font-semibold text-emerald-600">{{ fmtCurrency(pp.total_paid) }}</span>
          <span class="text-gray-300 mx-1">/</span>
          <span class="text-gray-500">{{ fmtCurrency(pp.contract_value) }}</span>
        </div>
      </div>
      <a-empty v-if="!paymentProgress.length" description="Chưa có dữ liệu thanh toán" />
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════
       ROW 6: Top Projects Table + Pending Approvals
       ═══════════════════════════════════════════════ -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <!-- Top Projects -->
    <div class="xl:col-span-2 crm-content-card report-card">
      <div class="crm-content-card__header">
        <h3 class="crm-content-card__title">
          <span class="icon-badge icon-badge--primary"><BarChartOutlined /></span>
          Top dự án theo chi phí
        </h3>
      </div>
      <a-table
        :columns="projectColumns"
        :data-source="topProjects"
        :pagination="false"
        row-key="id"
        size="small"
        class="crm-table"
        :scroll="{ x: 800 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="project-cell">
              <a-avatar :size="32" shape="square" class="project-avatar">
                {{ record.name?.charAt(0) }}
              </a-avatar>
              <div>
                <div class="font-semibold text-gray-800 text-sm">{{ record.name }}</div>
                <div class="text-xs text-gray-400">{{ record.code }}</div>
              </div>
            </div>
          </template>
          <template v-if="column.key === 'status'">
            <span class="crm-tag" :class="statusClass(record.status)">
              {{ statusLabel(record.status) }}
            </span>
          </template>
          <template v-if="column.key === 'contract_value'">
            <span class="font-semibold text-sm">{{ fmtCurrency(record.contract_value) }}</span>
          </template>
          <template v-if="column.key === 'total_costs'">
            <span class="font-semibold text-red-500 text-sm">{{ fmtCurrency(record.total_costs) }}</span>
          </template>
          <template v-if="column.key === 'profit'">
            <div>
              <span :class="record.profit >= 0 ? 'text-emerald-600' : 'text-red-500'" class="font-bold text-sm">
                {{ fmtCurrency(record.profit) }}
              </span>
              <div class="text-xs mt-0.5">
                <a-tag :color="record.profit_margin >= 20 ? 'green' : record.profit_margin >= 0 ? 'gold' : 'red'" class="text-xs">
                  {{ record.profit_margin }}%
                </a-tag>
              </div>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <!-- Pending Approvals -->
    <div class="crm-content-card report-card">
      <div class="crm-content-card__header">
        <h3 class="crm-content-card__title">
          <span class="icon-badge icon-badge--amber"><ExclamationCircleOutlined /></span>
          Chờ phê duyệt
          <a-badge :count="pendingApprovals.total" :overflow-count="99" class="ml-2" />
        </h3>
        <a-button type="link" size="small" @click="router.visit('/approvals')">
          Xem tất cả →
        </a-button>
      </div>

      <!-- Management Pending -->
      <div v-if="pendingApprovals.management?.length" class="px-5 pt-4 pb-2">
        <div class="section-label section-label--orange">Chờ BĐH duyệt</div>
        <div v-for="item in pendingApprovals.management" :key="`m-${item.id}`" class="pending-item">
          <div class="pending-dot pending-dot--orange"></div>
          <div class="flex-1 min-w-0">
            <div class="pending-item-name truncate">{{ item.name }}</div>
            <div class="pending-item-meta">{{ item.creator }} · {{ item.created_at }}</div>
          </div>
          <div class="pending-item-amount">{{ fmtCurrency(item.amount) }}</div>
        </div>
      </div>

      <!-- Accountant Pending -->
      <div v-if="pendingApprovals.accountant?.length" class="px-5 pt-3 pb-2">
        <div class="section-label section-label--cyan">Chờ KT xác nhận</div>
        <div v-for="item in pendingApprovals.accountant" :key="`a-${item.id}`" class="pending-item">
          <div class="pending-dot pending-dot--cyan"></div>
          <div class="flex-1 min-w-0">
            <div class="pending-item-name truncate">{{ item.name }}</div>
            <div class="pending-item-meta">{{ item.creator }} · {{ item.created_at }}</div>
          </div>
          <div class="pending-item-amount">{{ fmtCurrency(item.amount) }}</div>
        </div>
      </div>

      <div v-if="!pendingApprovals.total" class="p-8 text-center">
        <CheckCircleOutlined style="font-size: 40px; color: #10B981;" />
        <p class="mt-3 text-gray-400 text-sm">Không có chi phí chờ duyệt</p>
      </div>

      <!-- Quick action footer -->
      <div v-if="pendingApprovals.total" class="px-5 pb-4 pt-2">
        <a-button type="primary" block class="rounded-xl h-10" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);" @click="router.visit('/approvals')">
          <template #icon><SafetyCertificateOutlined /></template>
          Mở Trung tâm duyệt
        </a-button>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════
       ROW 7: Project Timelines
       ═══════════════════════════════════════════════ -->
  <div class="crm-content-card report-card">
    <div class="crm-content-card__header">
      <h3 class="crm-content-card__title">
        <span class="icon-badge icon-badge--purple"><FieldTimeOutlined /></span>
        Tiến độ thời gian dự án
      </h3>
      <a-tag color="blue">{{ projectTimelines.length }} dự án</a-tag>
    </div>
    <div class="px-6 py-4">
      <div v-for="(pt, idx) in projectTimelines" :key="pt.id" class="timeline-row" :style="{ animationDelay: `${idx * 50}ms` }">
        <div class="timeline-info-cell">
          <a-avatar :size="36" shape="square" class="timeline-avatar" :class="`timeline-avatar--${pt.status}`">
            {{ pt.name?.charAt(0) }}
          </a-avatar>
          <div>
            <div class="timeline-name">{{ pt.name }}</div>
            <div class="timeline-meta">{{ pt.manager }}</div>
          </div>
        </div>
        <div class="timeline-progress-cell">
          <div class="timeline-dates-row">
            <span>{{ formatDate(pt.start_date) }}</span>
            <span>{{ formatDate(pt.end_date) }}</span>
          </div>
          <div class="timeline-track">
            <div
              class="timeline-fill"
              :style="{ width: `${Math.min(pt.progress_pct, 100)}%` }"
              :class="timelineClass(pt)"
            ></div>
          </div>
        </div>
        <div class="timeline-pct-cell" :class="pt.progress_pct > 100 ? 'text-red-500' : 'text-blue-600'">
          {{ Math.min(pt.progress_pct, 100) }}%
        </div>
        <div class="timeline-days-cell">
          <a-tag :color="pt.progress_pct > 100 ? 'red' : 'blue'" class="text-xs">
            {{ pt.days_total }}d
          </a-tag>
        </div>
      </div>
      <a-empty v-if="!projectTimelines.length" description="Chưa có dự án đang triển khai" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
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
  ProjectOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined,
  FieldTimeOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons-vue'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
)

defineOptions({ layout: CrmLayout })

const props = defineProps({
  stats: Object,
  charts: Object,
  topProjects: Array,
  projectTimelines: Array,
  paymentProgress: Array,
  pendingApprovals: Object,
  filters: Object,
})

const { defaultOptions, doughnutOptions, barOptions, formatCurrency, formatCompact } = useChart()

const selectedYear = ref(props.filters?.year || new Date().getFullYear())

const onYearChange = (year) => {
  router.visit(`/reports?year=${year}`, { preserveState: false })
}

const fmtCurrency = (v) => {
  if (!v && v !== 0) return '0đ'
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(v)
}

// ============================================================
// CHARTS
// ============================================================
const barChartOptions = computed(() => ({
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
    y: { ...defaultOptions.scales.y, ticks: { ...defaultOptions.scales.y.ticks, callback: (v) => formatCompact(v) } },
  },
}))

const revenueVsCostData = computed(() => ({
  labels: props.charts?.revenueVsCost?.labels || [],
  datasets: [
    { label: 'Doanh thu', data: props.charts?.revenueVsCost?.revenue || [], backgroundColor: 'rgba(27, 79, 114, 0.85)', borderColor: '#1B4F72', borderWidth: 1, borderRadius: 6 },
    { label: 'Chi phí', data: props.charts?.revenueVsCost?.costs || [], backgroundColor: 'rgba(231, 76, 60, 0.75)', borderColor: '#E74C3C', borderWidth: 1, borderRadius: 6 },
    { label: 'Lợi nhuận', data: props.charts?.revenueVsCost?.profit || [], backgroundColor: 'rgba(29, 131, 72, 0.75)', borderColor: '#1D8348', borderWidth: 1, borderRadius: 6 },
  ],
}))

const doughnutOpts = computed(() => ({ ...doughnutOptions }))

const projectStatusData = computed(() => ({
  labels: props.charts?.projectStatus?.labels || [],
  datasets: [{ data: props.charts?.projectStatus?.data || [], backgroundColor: CHART_COLORS.primary.slice(0, (props.charts?.projectStatus?.data || []).length), hoverOffset: 8 }],
}))

const horizontalBarOptions = computed(() => ({
  ...barOptions,
  plugins: { ...barOptions.plugins, tooltip: { ...barOptions.plugins?.tooltip, callbacks: { label: (ctx) => fmtCurrency(ctx.raw) } } }
}))

const costByGroupData = computed(() => ({
  labels: props.charts?.costByGroup?.labels || [],
  datasets: [{
    label: 'Chi phí',
    data: props.charts?.costByGroup?.data || [],
    backgroundColor: CHART_COLORS.soft.slice(0, (props.charts?.costByGroup?.data || []).length),
    borderColor: CHART_COLORS.primary.slice(0, (props.charts?.costByGroup?.data || []).length),
    borderWidth: 1, borderRadius: 8,
  }],
}))

const lineOptions = computed(() => ({
  ...defaultOptions,
  plugins: {
    ...defaultOptions.plugins,
    tooltip: { ...defaultOptions.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtCurrency(ctx.raw)}` } }
  },
  scales: {
    ...defaultOptions.scales,
    y: { ...defaultOptions.scales.y, stacked: true, ticks: { ...defaultOptions.scales.y.ticks, callback: (v) => formatCompact(v) } },
  },
}))

const costTrendData = computed(() => ({
  labels: props.charts?.costTrend?.labels || [],
  datasets: [
    { label: 'Đã duyệt', data: props.charts?.costTrend?.approved || [], borderColor: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.15)', fill: true },
    { label: 'Chờ duyệt', data: props.charts?.costTrend?.pending || [], borderColor: '#F59E0B', backgroundColor: 'rgba(245, 158, 11, 0.15)', fill: true },
    { label: 'Từ chối', data: props.charts?.costTrend?.rejected || [], borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.10)', fill: true },
  ],
}))

// ============================================================
// TABLE & HELPERS
// ============================================================
const projectColumns = [
  { title: 'Dự án', key: 'name', width: 240 },
  { title: 'Trạng thái', key: 'status', width: 130 },
  { title: 'Giá trị HĐ', key: 'contract_value', align: 'right', width: 160 },
  { title: 'Chi phí', key: 'total_costs', align: 'right', width: 160 },
  { title: 'Lợi nhuận', key: 'profit', align: 'right', width: 160 },
]

const statusLabel = (s) => ({ planning: 'Lập kế hoạch', in_progress: 'Đang thi công', completed: 'Hoàn thành', suspended: 'Tạm dừng', cancelled: 'Hủy bỏ' })[s] || s
const statusClass = (s) => ({ planning: 'crm-tag--pending', in_progress: 'crm-tag--active', completed: 'crm-tag--completed', suspended: 'crm-tag--pending', cancelled: 'crm-tag--cancelled' })[s] || ''

const barClass = (pct) => pct < 30 ? 'bar--low' : pct < 70 ? 'bar--mid' : 'bar--high'

const timelineClass = (pt) => {
  if (pt.progress_pct > 100) return 'fill--overdue'
  if (pt.status === 'planning') return 'fill--planning'
  if (pt.progress_pct >= 100) return 'fill--complete'
  return 'fill--progress'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}`
}
</script>

<style scoped>
/* ─── KPI Banner ─── */
.kpi-banner {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  margin-bottom: 1.75rem;
  min-height: 100px;
}

.kpi-banner__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #0C1B2A 0%, #1B4F72 50%, #2E86C1 100%);
  z-index: 0;
}

.kpi-banner__bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 50%, rgba(46, 134, 193, 0.25) 0%, transparent 60%),
    radial-gradient(circle at 80% 30%, rgba(243, 156, 18, 0.12) 0%, transparent 50%);
  z-index: 1;
}

.kpi-banner__content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 28px 36px;
  gap: 16px;
}

.kpi-banner__item {
  text-align: center;
  flex: 1;
}

.kpi-banner__label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 6px;
}

.kpi-banner__value {
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
}

.kpi-banner__value--warning { color: #FBBF24; }
.kpi-banner__value--success { color: #6EE7B7; }

.kpi-banner__separator {
  width: 1px;
  height: 48px;
  background: rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

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

.icon-badge--blue { background: rgba(27, 79, 114, 0.1); color: #1B4F72; }
.icon-badge--primary { background: rgba(27, 79, 114, 0.1); color: #1B4F72; }
.icon-badge--amber { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
.icon-badge--purple { background: rgba(142, 68, 173, 0.1); color: #8E44AD; }

/* ─── Report Cards ─── */
.report-card {
  animation: slideUp 0.4s ease-out both;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ─── Payment Progress ─── */
.payment-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 14px 0;
  border-bottom: 1px solid #F3F5F7;
  animation: slideUp 0.35s ease-out both;
}
.payment-row:last-child { border-bottom: none; }

.payment-info { min-width: 160px; flex-shrink: 0; }
.payment-name { font-weight: 700; font-size: 13px; color: #1F2937; }
.payment-code { font-size: 11px; color: #9CA3AF; margin-top: 2px; }

.payment-bar-area { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 200px; }
.payment-bar-track { flex: 1; height: 10px; background: #F0F2F5; border-radius: 5px; overflow: hidden; }
.payment-bar-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
}
.bar--low .payment-bar-fill,
.payment-bar-fill.bar--low { background: linear-gradient(90deg, #EF4444, #FB7185); }
.bar--mid .payment-bar-fill,
.payment-bar-fill.bar--mid { background: linear-gradient(90deg, #F59E0B, #FCD34D); }
.bar--high .payment-bar-fill,
.payment-bar-fill.bar--high { background: linear-gradient(90deg, #10B981, #6EE7B7); }

.payment-pct {
  font-size: 13px;
  font-weight: 800;
  min-width: 40px;
  text-align: right;
}
.payment-pct.bar--low { color: #EF4444; }
.payment-pct.bar--mid { color: #F59E0B; }
.payment-pct.bar--high { color: #10B981; }

.payment-amounts { font-size: 13px; min-width: 220px; text-align: right; white-space: nowrap; }

/* ─── Project Cell ─── */
.project-cell { display: flex; align-items: center; gap: 10px; }
.project-avatar {
  background: linear-gradient(135deg, #1B4F72, #2E86C1) !important;
  color: #fff !important;
  font-weight: 700 !important;
  font-size: 13px !important;
  border-radius: 10px !important;
}

/* ─── Timeline ─── */
.timeline-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 14px 0;
  border-bottom: 1px solid #F3F5F7;
  animation: slideUp 0.35s ease-out both;
}
.timeline-row:last-child { border-bottom: none; }

.timeline-info-cell { display: flex; align-items: center; gap: 12px; min-width: 200px; flex-shrink: 0; }
.timeline-avatar {
  font-weight: 700 !important;
  font-size: 14px !important;
  border-radius: 10px !important;
  color: #fff !important;
}
.timeline-avatar--in_progress { background: linear-gradient(135deg, #3B82F6, #60A5FA) !important; }
.timeline-avatar--planning { background: linear-gradient(135deg, #F59E0B, #FBBF24) !important; }
.timeline-avatar--completed { background: linear-gradient(135deg, #10B981, #34D399) !important; }

.timeline-name { font-weight: 700; font-size: 13px; color: #1F2937; }
.timeline-meta { font-size: 11px; color: #9CA3AF; margin-top: 1px; }

.timeline-progress-cell { flex: 1; min-width: 200px; }
.timeline-dates-row { display: flex; justify-content: space-between; font-size: 10px; color: #B0B8C4; margin-bottom: 5px; font-weight: 500; }
.timeline-track { height: 10px; background: #F0F2F5; border-radius: 5px; overflow: hidden; }
.timeline-fill { height: 100%; border-radius: 5px; transition: width 1s cubic-bezier(0.16, 1, 0.3, 1); }

.fill--progress { background: linear-gradient(90deg, #3B82F6, #93C5FD); }
.fill--planning { background: linear-gradient(90deg, #F59E0B, #FDE68A); }
.fill--complete { background: linear-gradient(90deg, #10B981, #6EE7B7); }
.fill--overdue { background: linear-gradient(90deg, #EF4444, #FCA5A5); }

.timeline-pct-cell { font-size: 14px; font-weight: 800; min-width: 44px; text-align: right; }
.timeline-days-cell { min-width: 50px; text-align: right; }

/* ─── Pending Items ─── */
.section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 2px solid;
}
.section-label--orange { color: #F59E0B; border-color: rgba(245, 158, 11, 0.2); }
.section-label--cyan { color: #06B6D4; border-color: rgba(6, 182, 212, 0.2); }

.pending-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  transition: background 0.15s ease;
  border-radius: 8px;
}

.pending-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.pending-dot--orange { background: #F59E0B; box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15); }
.pending-dot--cyan { background: #06B6D4; box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.15); }

.pending-item-name { font-size: 13px; font-weight: 600; color: #1F2937; }
.pending-item-meta { font-size: 11px; color: #9CA3AF; }
.pending-item-amount { font-size: 13px; font-weight: 700; color: #F59E0B; white-space: nowrap; flex-shrink: 0; }

/* ─── Responsive ─── */
@media (max-width: 768px) {
  .kpi-banner__content { flex-direction: column; gap: 12px; padding: 20px; }
  .kpi-banner__separator { width: 80px; height: 1px; }
  .kpi-banner__value { font-size: 22px; }
  .payment-row { flex-wrap: wrap; }
  .payment-amounts { min-width: auto; }
  .timeline-row { flex-wrap: wrap; }
  .timeline-info-cell { min-width: 100%; }
}
</style>
