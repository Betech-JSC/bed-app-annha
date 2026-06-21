<template>
  <Head title="Tổng quan điều hành" />

  <!-- PAGE HEADER + FILTER BAR -->
  <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
    <div>
      <h1 class="text-2xl font-bold text-gray-900">Tổng quan điều hành</h1>
      <p class="text-sm text-gray-500 mt-1">Bảng điều khiển CEO — Cập nhật realtime</p>
    </div>
    <div class="flex items-center gap-3 flex-wrap">
      <!-- Project Selector Dropdown -->
      <a-select
        v-model:value="selectedProjectId"
        placeholder="Chọn dự án"
        style="width: 240px"
        class="rounded-xl font-medium"
        show-search
        option-filter-prop="label"
        @change="onProjectChange"
      >
        <a-select-option value="all">📁 Tất cả dự án</a-select-option>
        <a-select-option v-for="p in projectsList" :key="p.id" :value="p.id" :label="`${p.code} - ${p.name}`">
          {{ p.code }} - {{ p.name }}
        </a-select-option>
      </a-select>

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

  <!-- QUICK ACTIONS ROW -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <div class="quick-action-card hover-lift cursor-pointer" @click="router.visit('/projects')">
      <div class="quick-action-card__icon icon-badge--primary">
        <PlusCircleOutlined />
      </div>
      <div class="quick-action-card__info">
        <h4 class="quick-action-card__title">Khởi tạo dự án</h4>
        <p class="quick-action-card__desc">Tạo dự án thi công mới & khai báo thông tin ban đầu</p>
      </div>
    </div>

    <div class="quick-action-card hover-lift cursor-pointer" @click="router.visit('/finance/company-costs')">
      <div class="quick-action-card__icon icon-badge--warning">
        <DollarOutlined />
      </div>
      <div class="quick-action-card__info">
        <h4 class="quick-action-card__title">Khai báo chi phí</h4>
        <p class="quick-action-card__desc">Ghi nhận chi phí công ty hoặc chi phí dự án mới</p>
      </div>
    </div>

    <div class="quick-action-card hover-lift cursor-pointer" @click="router.visit('/files')">
      <div class="quick-action-card__icon icon-badge--success">
        <FileTextOutlined />
      </div>
      <div class="quick-action-card__info">
        <h4 class="quick-action-card__title">Tài liệu & Hóa đơn</h4>
        <p class="quick-action-card__desc">Quản lý hóa đơn chứng từ đầu vào đầu ra của hệ thống</p>
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
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <!-- Pending Costs (takes 2/3) -->
    <div class="xl:col-span-2 crm-content-card">
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
          <template v-if="column.key === 'action'">
            <div class="flex items-center gap-1.5 justify-center">
              <a-button
                v-slot:icon
                v-if="canApprove(record)"
                type="primary"
                size="small"
                class="rounded-lg bg-emerald-600 hover:bg-emerald-500 border-none flex items-center justify-center text-xs px-2.5 h-7"
                :loading="isSubmitting"
                @click="handleQuickApprove(record)"
              >
                Duyệt
              </a-button>
              <a-button
                v-slot:icon
                v-if="canApprove(record)"
                type="primary"
                danger
                ghost
                size="small"
                class="rounded-lg flex items-center justify-center text-xs px-2.5 h-7"
                :loading="isSubmitting"
                @click="handleQuickReject(record)"
              >
                Từ chối
              </a-button>
              <span v-else class="text-xs text-gray-400">Không có quyền</span>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <!-- Subcontractor Debt (takes 1/3) -->
    <div class="crm-content-card">
      <div class="crm-content-card__header">
        <h3 class="crm-content-card__title"><span class="icon-badge icon-badge--warning"><DollarOutlined /></span> Công nợ NTP</h3>
      </div>
      <a-table :columns="debtCols" :data-source="subcontractorDebt" :pagination="false" row-key="id" class="crm-table" size="small">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <span class="font-medium text-xs text-gray-800 truncate block max-w-[140px]" :title="record.name">{{ record.name }}</span>
          </template>
          <template v-if="column.key === 'debt'">
            <span class="font-bold text-xs text-red-600">{{ fmtCompact(record.debt) }}</span>
          </template>
          <template v-if="column.key === 'paid_pct'">
            <a-progress :percent="record.total_quote > 0 ? Math.round(record.paid / record.total_quote * 100) : 0" :size="4" :stroke-color="'#10B981'" :show-info="true" style="width: 75px" />
          </template>
        </template>
      </a-table>
    </div>
  </div>

  <!-- RECENT PROJECTS TABLE + REALTIME ACTIVITY FEED -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <!-- Recent Projects (takes 2/3) -->
    <div class="xl:col-span-2 crm-content-card">
      <div class="crm-content-card__header">
        <h3 class="crm-content-card__title"><span class="icon-badge icon-badge--primary"><ProjectOutlined /></span> Dự án gần đây</h3>
        <a-button type="link" @click="router.visit('/projects')">Xem tất cả →</a-button>
      </div>
      <a-table :columns="projectCols" :data-source="recentProjects" :pagination="false" row-key="id" class="crm-table" :scroll="{ x: 500 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="flex items-center gap-3 cursor-pointer" @click="router.visit(`/projects/${record.id}`)">
              <a-avatar :size="32" shape="square" class="project-avatar">{{ record.name?.charAt(0) }}</a-avatar>
              <div>
                <div class="font-semibold text-gray-800 text-xs truncate max-w-[180px]" :title="record.name">{{ record.name }}</div>
                <div class="text-[10px] text-gray-400 font-mono">{{ record.code }}</div>
              </div>
            </div>
          </template>
          <template v-if="column.key === 'status'">
            <span class="crm-tag" :class="statusClass(record.status)">{{ statusLabel(record.status) }}</span>
          </template>
          <template v-if="column.key === 'contract_value'">
            <span class="font-semibold text-xs">{{ fmtCompact(record.contract_value) }}</span>
          </template>
        </template>
      </a-table>
    </div>

    <!-- Realtime Activity Feed (takes 1/3) -->
    <div class="crm-content-card">
      <div class="crm-content-card__header">
        <h3 class="crm-content-card__title"><span class="icon-badge icon-badge--primary"><HistoryOutlined /></span> Hoạt động gần đây</h3>
      </div>
      <div class="p-4 space-y-3 overflow-y-auto" style="max-height: 295px;">
        <div v-for="(act, idx) in recentActivities" :key="idx" class="flex gap-2.5 items-start border-b border-gray-50 pb-2.5 last:border-0 last:pb-0">
          <a-avatar :size="28" :style="{ backgroundColor: act.color, verticalAlign: 'middle' }" class="flex-shrink-0 font-bold text-xs">
            {{ act.avatar }}
          </a-avatar>
          <div class="flex-1 min-w-0">
            <div class="text-[11px] font-semibold text-gray-800 leading-snug break-words">{{ act.title }}</div>
            <div class="text-[10px] text-gray-400 mt-0.5">{{ act.subtitle }}</div>
            <div class="flex items-center justify-between mt-1">
              <span class="text-[9px] text-gray-400 font-medium">{{ act.user }}</span>
              <span class="text-[9px] text-blue-500 bg-blue-50 px-1 py-0.5 rounded font-mono">{{ act.time_label }}</span>
            </div>
          </div>
        </div>
        <div v-if="!recentActivities || !recentActivities.length" class="text-center text-gray-400 py-12 text-xs">
          Không có hoạt động gần đây
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, h } from 'vue'
import { Head, router, usePage } from '@inertiajs/vue3'
import { Line, Doughnut, Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import ChartCard from '@/Components/Crm/ChartCard.vue'
import { useChart, CHART_COLORS } from '@/Composables/useChart'
import { message, Modal } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  ProjectOutlined, ThunderboltOutlined, CheckCircleOutlined, ClockCircleOutlined,
  TeamOutlined, ExclamationCircleOutlined, DollarOutlined, ToolOutlined,
  BarChartOutlined, RocketOutlined, HistoryOutlined, PlusCircleOutlined,
  FileTextOutlined, CloseOutlined, CheckOutlined
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
  projectsList: Array,
  recentActivities: Array,
})

const { defaultOptions, doughnutOptions, barOptions, formatCompact } = useChart()

// ── Filters ──
const periodOptions = ['Tháng', 'Quý', 'Năm', 'Tùy chỉnh']
const periodMap = { 'Tháng': 'month', 'Quý': 'quarter', 'Năm': 'year', 'Tùy chỉnh': 'custom' }
const periodMapReverse = { month: 'Tháng', quarter: 'Quý', year: 'Năm', custom: 'Tùy chỉnh' }
const activePeriod = ref(periodMapReverse[props.filters?.period] || 'Tháng')
const compareMode = ref(props.filters?.compare || false)
const selectedProjectId = ref(props.filters?.project_id || 'all')
const customRange = ref(null)

if (props.filters?.period === 'custom' && props.filters?.from && props.filters?.to) {
  customRange.value = [dayjs(props.filters.from), dayjs(props.filters.to)]
}

const navigateDashboard = (extraParams = {}) => {
  const params = {
    period: periodMap[activePeriod.value] || 'month',
    compare: compareMode.value,
    project_id: selectedProjectId.value,
    ...extraParams
  }
  if (params.period === 'custom' && customRange.value?.[0] && customRange.value?.[1]) {
    params.from = customRange.value[0].format('YYYY-MM-DD')
    params.to = customRange.value[1].format('YYYY-MM-DD')
  }
  router.get('/dashboard', params, { preserveState: true, preserveScroll: true })
}

const onPeriodChange = (val) => {
  navigateDashboard({ period: periodMap[val] || 'month' })
}
const onCompareToggle = (val) => {
  compareMode.value = val
  navigateDashboard()
}
const onCustomRange = (dates) => {
  if (dates?.[0] && dates?.[1]) {
    navigateDashboard({ period: 'custom' })
  }
}
const onProjectChange = (val) => {
  selectedProjectId.value = val
  navigateDashboard()
}

// ── Permissions Helpers ──
const page = usePage()
const can = (perm) => {
  const user = page.props.auth?.user
  if (!user) return false
  if (user.super_admin) return true
  return user.permissions?.includes(perm) || false
}

const canApprove = (record) => {
  if (record.status === 'pending_management_approval') {
    return record.project_id ? can('cost.approve.management') : can('company_cost.approve.management')
  } else if (record.status === 'pending_accountant_approval') {
    return record.project_id ? can('cost.approve.accountant') : can('company_cost.approve.accountant')
  }
  return false
}

// ── Quick Approvals Handlers ──
const isSubmitting = ref(false)

const handleQuickApprove = (record) => {
  Modal.confirm({
    title: 'Xác nhận duyệt chi phí',
    content: `Bạn có chắc chắn muốn duyệt khoản chi "${record.name}" với số tiền ${fmt(record.amount)}?`,
    okText: 'Duyệt',
    cancelText: 'Hủy',
    centered: true,
    async onOk() {
      isSubmitting.value = true
      const url = record.status === 'pending_management_approval'
        ? `/approvals/${record.id}/approve-management`
        : `/approvals/${record.id}/approve-accountant`
        
      router.post(url, {}, {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          message.success('Đã duyệt chi phí thành công')
        },
        onError: (err) => {
          message.error(err.message || 'Không thể duyệt chi phí')
        },
        onFinish: () => {
          isSubmitting.value = false
        }
      })
    }
  })
}

const handleQuickReject = (record) => {
  let rejectReason = ''
  Modal.confirm({
    title: 'Từ chối duyệt chi phí',
    content: () => h('div', { class: 'space-y-3' }, [
      h('div', `Nhập lý do từ chối khoản chi "${record.name}":`),
      h('textarea', {
        class: 'w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500',
        rows: 3,
        placeholder: 'Lý do từ chối (bắt buộc)...',
        onInput: (e) => { rejectReason = e.target.value }
      })
    ]),
    okText: 'Từ chối',
    okType: 'danger',
    cancelText: 'Hủy',
    centered: true,
    async onOk() {
      if (!rejectReason.trim()) {
        message.warning('Vui lòng nhập lý do từ chối')
        return Promise.reject()
      }
      isSubmitting.value = true
      router.post(`/approvals/${record.id}/reject`, {
        reason: rejectReason,
        type: record.status === 'pending_management_approval' ? 'management' : 'accountant'
      }, {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => {
          message.success('Đã từ chối duyệt chi phí')
        },
        onError: (err) => {
          message.error(err.message || 'Có lỗi xảy ra')
        },
        onFinish: () => {
          isSubmitting.value = false
        }
      })
    }
  })
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
  { title: 'Thao tác', key: 'action', width: 160, align: 'center' }
]
const debtCols = [
  { title: 'Nhà thầu', key: 'name', width: 130 },
  { title: 'Còn nợ', key: 'debt', align: 'right', width: 90 },
  { title: 'Thanh toán', key: 'paid_pct', width: 100 },
]
const projectCols = [
  { title: 'Tên dự án', key: 'name', width: 260 },
  { title: 'Quản lý', dataIndex: 'manager', width: 130 },
  { title: 'Trạng thái', key: 'status', width: 110 },
  { title: 'Giá trị HĐ', key: 'contract_value', align: 'right', width: 110 },
]

const statusLabel = (s) => ({ planning: 'Lập kế hoạch', in_progress: 'Đang thi công', completed: 'Hoàn thành', suspended: 'Tạm dừng', cancelled: 'Hủy bỏ' })[s] || s
const statusClass = (s) => ({ planning: 'crm-tag--pending', in_progress: 'crm-tag--active', completed: 'crm-tag--completed', suspended: 'crm-tag--pending', cancelled: 'crm-tag--cancelled' })[s] || ''
</script>

<style scoped>
/* ─── KPI Banner ─── */
.kpi-banner {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 40px rgba(12, 27, 42, 0.25);
}
.kpi-banner__bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #08121e 0%, #0f2d4a 60%, #174b76 100%);
}
.kpi-banner__bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(circle at 10% 20%, rgba(46, 134, 193, 0.25) 0%, transparent 50%),
    radial-gradient(circle at 90% 80%, rgba(245, 158, 11, 0.15) 0%, transparent 45%),
    radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.08) 0%, transparent 60%);
  filter: blur(40px);
}
.kpi-banner__content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 32px 40px;
  gap: 20px;
  backdrop-filter: blur(12px);
  background: rgba(8, 18, 30, 0.4);
}
.kpi-item {
  text-align: center;
  flex: 1;
  transition: transform 0.3s ease, filter 0.3s ease;
}
.kpi-item:hover {
  transform: translateY(-2px);
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.1));
}
.kpi-label {
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-bottom: 8px;
}
.kpi-value {
  font-size: 28px;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.03em;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}
.kpi-value--amber {
  color: #fbbf24;
  text-shadow: 0 2px 12px rgba(245, 158, 11, 0.35);
}
.kpi-value--green {
  color: #34d399;
  text-shadow: 0 2px 12px rgba(52, 211, 153, 0.35);
}
.kpi-value--cyan {
  color: #22d3ee;
  text-shadow: 0 2px 12px rgba(34, 211, 238, 0.35);
}
.kpi-sub {
  font-size: 11px;
  font-weight: 600;
  margin-top: 6px;
  display: inline-block;
}
.kpi-sub--blue {
  color: rgba(147, 197, 253, 0.85);
}
.kpi-sub--amber {
  color: rgba(253, 230, 138, 0.85);
}
.kpi-sub--green {
  color: rgba(167, 243, 208, 0.85);
}
.kpi-sub--red {
  color: rgba(252, 165, 165, 0.85);
}
.kpi-sep {
  width: 1px;
  height: 64px;
  background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15), transparent);
  flex-shrink: 0;
}
.kpi-delta {
  font-size: 11px;
  font-weight: 700;
  margin-top: 4px;
  padding: 2px 8px;
  border-radius: 8px;
  display: inline-block;
}
.kpi-delta--up {
  background: rgba(16, 185, 129, 0.2);
  color: #6EE7B7;
}
.kpi-delta--down {
  background: rgba(239, 68, 68, 0.2);
  color: #FCA5A5;
}

/* ─── Quick Actions & Hovers ─── */
.quick-action-card {
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 16px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.quick-action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  border-color: #e2e8f0;
}
.quick-action-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  transition: transform 0.3s ease;
}
.quick-action-card:hover .quick-action-card__icon {
  transform: scale(1.1) rotate(3deg);
}
.quick-action-card__info {
  flex: 1;
  min-w: 0;
}
.quick-action-card__title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 2px;
}
.quick-action-card__desc {
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
  margin: 0;
}

/* ─── Misc ─── */
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
.icon-badge--primary {
  background: rgba(27, 79, 114, 0.08);
  color: #1B4F72;
}
.icon-badge--danger {
  background: rgba(239, 68, 68, 0.08);
  color: #EF4444;
}
.icon-badge--warning {
  background: rgba(243, 156, 18, 0.08);
  color: #F39C12;
}
.icon-badge--success {
  background: rgba(16, 185, 129, 0.08);
  color: #10B981;
}
.project-avatar {
  background: linear-gradient(135deg, #1B4F72, #2E86C1) !important;
  color: #fff !important;
  font-weight: 700 !important;
  font-size: 12px !important;
  border-radius: 8px !important;
}

@media (max-width: 768px) {
  .kpi-banner__content {
    flex-direction: column;
    gap: 12px;
    padding: 20px;
  }
  .kpi-sep {
    width: 80px;
    height: 1px;
  }
  .kpi-value {
    font-size: 22px;
  }
}
</style>
