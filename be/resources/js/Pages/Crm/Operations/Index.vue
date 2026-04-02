<template>
  <Head title="Vận hành — Tổng quan" />

  <PageHeader title="Vận Hành" subtitle="Dashboard dòng tiền, nguồn vốn và tài sản công ty">
    <template #actions>
      <a-button type="primary" size="large" class="rounded-xl" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);" @click="router.visit('/operations/shareholders')">
        <template #icon><TeamOutlined /></template>
        Cổ đông
      </a-button>
      <a-button size="large" class="rounded-xl" @click="router.visit('/operations/assets')">
        <template #icon><ToolOutlined /></template>
        Tài sản
      </a-button>
    </template>
  </PageHeader>

  <!-- ═══ Stats Row ═══ -->
  <div class="crm-stats-grid" style="grid-template-columns: repeat(5, 1fr);">
    <StatCard :value="fmtCurrency(stats.totalCapital)" label="Tổng vốn góp" :icon="BankOutlined" variant="primary" format="text" />
    <StatCard :value="fmtCurrency(stats.completedProjectsValue)" label="Doanh thu DA hoàn thành" :icon="CheckCircleOutlined" variant="success" format="text" />
    <StatCard :value="fmtCurrency(stats.totalProjectCosts)" label="Chi phí dự án" :icon="ProjectOutlined" variant="warning" format="text" />
    <StatCard :value="fmtCurrency(stats.totalOperatingCosts)" label="Chi phí vận hành" :icon="ShopOutlined" variant="danger" format="text" />
    <StatCard :value="fmtCurrency(stats.totalAssetValue)" label="Tài sản hiện có" :icon="ToolOutlined" variant="accent" format="text" />
  </div>

  <!-- ═══ Charts Row ═══ -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <!-- Monthly trend -->
    <div class="xl:col-span-2">
      <ChartCard title="Dòng tiền theo tháng" subtitle="Chi phí dự án vs Vận hành — 6 tháng" :height="280">
        <Bar :data="monthlyChartData" :options="barOpts" />
      </ChartCard>
    </div>
    <!-- Capital pie -->
    <ChartCard title="Cơ cấu vốn góp" :subtitle="`${stats.shareholderCount} cổ đông`" :height="280">
      <Doughnut v-if="shareholders.length" :data="capitalChartData" :options="donutOpts" />
      <div v-else class="flex items-center justify-center h-full text-gray-400">Chưa có dữ liệu</div>
    </ChartCard>
  </div>

  <!-- ═══ Operating Cost Breakdown ═══ -->
  <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
    <!-- By expense category -->
    <ChartCard title="Chi phí vận hành theo loại" subtitle="CAPEX / OPEX / Lương" :height="220">
      <Doughnut :data="expenseCategoryData" :options="donutOpts" />
    </ChartCard>

    <!-- Asset summary -->
    <div class="crm-content-card">
      <div class="crm-content-card__header">
        <div>
          <h3 class="crm-content-card__title">Tài sản công ty</h3>
          <p class="crm-content-card__subtitle">{{ stats.assetCount }} tài sản</p>
        </div>
        <a-button type="link" @click="router.visit('/operations/assets')">Xem tất cả →</a-button>
      </div>
      <div class="p-6 space-y-4">
        <div class="grid grid-cols-3 gap-4 text-center">
          <div class="p-4 rounded-xl bg-blue-50">
            <div class="text-2xl font-bold text-blue-700">{{ fmtCurrencyShort(stats.totalAssetValue) }}</div>
            <div class="text-xs text-blue-500 mt-1">Giá trị hiện tại</div>
          </div>
          <div class="p-4 rounded-xl bg-orange-50">
            <div class="text-2xl font-bold text-orange-600">{{ fmtCurrencyShort(stats.totalDepreciation) }}</div>
            <div class="text-xs text-orange-500 mt-1">Khấu hao lũy kế</div>
          </div>
          <div class="p-4 rounded-xl bg-green-50">
            <div class="text-2xl font-bold text-green-700">{{ stats.assetCount }}</div>
            <div class="text-xs text-green-500 mt-1">Tổng tài sản</div>
          </div>
        </div>
        <!-- Asset by status -->
        <div class="flex flex-wrap gap-2">
          <a-tag v-for="(cnt, st) in assetsByStatus" :key="st" :color="assetStatusColor[st]" class="rounded-lg px-3 py-1 text-sm">
            {{ assetStatusLabel[st] }}: {{ cnt }}
          </a-tag>
        </div>
        <!-- Asset by category -->
        <div v-if="assetsByCategory.length" class="space-y-2">
          <div v-for="cat in assetsByCategory" :key="cat.category" class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
            <div class="flex items-center gap-2">
              <a-tag class="rounded-lg" color="blue">{{ categoryLabels[cat.category] || cat.category }}</a-tag>
              <span class="text-sm text-gray-600">{{ cat.cnt }} tài sản</span>
            </div>
            <span class="font-semibold text-sm" style="color: var(--crm-primary);">{{ fmtCurrency(cat.total_value) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ Shareholders Quick Table ═══ -->
  <div class="crm-content-card mb-8">
    <div class="crm-content-card__header">
      <div>
        <h3 class="crm-content-card__title">Danh sách cổ đông</h3>
        <p class="crm-content-card__subtitle">Tổng vốn: {{ fmtCurrency(stats.totalCapital) }}</p>
      </div>
      <a-button type="link" @click="router.visit('/operations/shareholders')">Quản lý →</a-button>
    </div>
    <a-table :columns="shareholderCols" :data-source="shareholders" :pagination="false" row-key="id" class="crm-table" size="small">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div class="font-semibold text-gray-800">{{ record.name }}</div>
          <div class="text-xs text-gray-400">{{ record.phone || record.email || '' }}</div>
        </template>
        <template v-if="column.key === 'amount'">
          <span class="font-bold" style="color: var(--crm-primary);">{{ fmtCurrency(record.contributed_amount) }}</span>
        </template>
        <template v-if="column.key === 'share'">
          <a-progress :percent="parseFloat(record.share_percentage)" :stroke-color="{ '0%': '#1B4F72', '100%': '#2E86C1' }" :show-info="true" size="small" />
        </template>
        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === 'active' ? 'green' : 'default'" class="rounded-lg">{{ record.status === 'active' ? 'Hoạt động' : 'Ngừng' }}</a-tag>
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import ChartCard from '@/Components/Crm/ChartCard.vue'
import { useChart } from '@/Composables/useChart'
import {
  BankOutlined, CheckCircleOutlined, ProjectOutlined, ShopOutlined,
  ToolOutlined, TeamOutlined,
} from '@ant-design/icons-vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)
defineOptions({ layout: CrmLayout })

const props = defineProps({
  stats: Object,
  monthlyTrend: Array,
  shareholders: Array,
  assetsByCategory: Array,
  assetsByStatus: Object,
})

const { defaultOptions, doughnutOptions } = useChart()

// --- Formatters ---
const fmtCurrency = (v) => {
  if (!v && v !== 0) return '0₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)
}
const fmtCurrencyShort = (v) => {
  if (!v) return '0₫'
  if (v >= 1e9) return (v / 1e9).toFixed(1) + ' tỷ'
  if (v >= 1e6) return (v / 1e6).toFixed(0) + ' tr'
  return fmtCurrency(v)
}

// --- Constants ---
const categoryLabels = { computer: 'Máy tính / CNTT', machinery: 'Máy móc thi công', vehicle: 'Xe công ty', furniture: 'Nội thất VP', other: 'Khác' }
const assetStatusLabel = { in_stock: 'Trong kho', in_use: 'Đang dùng', under_repair: 'Sửa chữa', disposed: 'Thanh lý' }
const assetStatusColor = { in_stock: 'blue', in_use: 'green', under_repair: 'orange', disposed: 'default' }

// --- Charts ---
const barOpts = computed(() => ({
  ...defaultOptions,
  plugins: { ...defaultOptions.plugins, legend: { ...defaultOptions.plugins.legend, position: 'bottom' }, tooltip: { ...defaultOptions.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtCurrency(ctx.raw)}` } } },
  scales: {
    ...defaultOptions.scales,
    y: { ...defaultOptions.scales.y, ticks: { ...defaultOptions.scales.y.ticks, callback: (v) => { if (v >= 1e9) return (v/1e9).toFixed(1)+'T'; if (v >= 1e6) return (v/1e6).toFixed(0)+'Tr'; return v; } } }
  }
}))

const monthlyChartData = computed(() => ({
  labels: (props.monthlyTrend || []).map(t => t.label),
  datasets: [
    {
      label: 'Chi phí dự án',
      data: (props.monthlyTrend || []).map(t => t.project_costs),
      backgroundColor: 'rgba(27, 79, 114, 0.7)',
      borderColor: '#1B4F72',
      borderWidth: 1, borderRadius: 10, barThickness: 28,
    },
    {
      label: 'Chi phí vận hành',
      data: (props.monthlyTrend || []).map(t => t.operating_costs),
      backgroundColor: 'rgba(231, 76, 60, 0.6)',
      borderColor: '#E74C3C',
      borderWidth: 1, borderRadius: 10, barThickness: 28,
    },
  ]
}))

const donutOpts = computed(() => ({
  ...doughnutOptions,
  cutout: '60%',
  plugins: { ...doughnutOptions.plugins, legend: { ...doughnutOptions.plugins.legend, position: 'bottom' } }
}))

const capitalChartData = computed(() => ({
  labels: (props.shareholders || []).filter(s => s.status === 'active').map(s => s.name),
  datasets: [{
    data: (props.shareholders || []).filter(s => s.status === 'active').map(s => parseFloat(s.contributed_amount)),
    backgroundColor: ['#1B4F72', '#F39C12', '#1D8348', '#8E44AD', '#E74C3C', '#2E86C1', '#D68910', '#27AE60'],
    hoverOffset: 6,
  }]
}))

const expenseCategoryLabels = { capex: 'CAPEX (Tài sản)', opex: 'OPEX (Vận hành)', payroll: 'Lương & Bảo hiểm', uncategorized: 'Chưa phân loại' }
const expenseCategoryColors = { capex: '#1B4F72', opex: '#E67E22', payroll: '#8E44AD', uncategorized: '#9CA3AF' }

const expenseCategoryData = computed(() => {
  const cats = props.stats?.costsByCategory || {}
  const labels = Object.keys(cats).map(k => expenseCategoryLabels[k] || k)
  const data = Object.values(cats).map(v => parseFloat(v))
  const colors = Object.keys(cats).map(k => expenseCategoryColors[k] || '#9CA3AF')
  return { labels, datasets: [{ data, backgroundColor: colors, hoverOffset: 6 }] }
})

// --- Table ---
const shareholderCols = [
  { title: 'Cổ đông', key: 'name', dataIndex: 'name', width: 220 },
  { title: 'Số tiền góp', key: 'amount', dataIndex: 'contributed_amount', width: 180, align: 'right' },
  { title: 'Tỷ lệ %', key: 'share', dataIndex: 'share_percentage', width: 200 },
  { title: 'Trạng thái', key: 'status', dataIndex: 'status', width: 100 },
]
</script>
