<template>
  <Head title="Nhà thầu phụ" />

  <PageHeader title="Quản Lý Nhà Thầu Phụ" subtitle="Theo dõi tiến độ, thanh toán và đánh giá nhà thầu phụ toàn hệ thống">
    <template #actions>
      <a-button type="primary" size="large" class="rounded-xl" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);" @click="showCreateModal">
        <template #icon><PlusOutlined /></template>
        Thêm nhà thầu phụ
      </a-button>
    </template>
  </PageHeader>

  <!-- ═══ Stats ═══ -->
  <div class="crm-stats-grid">
    <StatCard :value="stats.totalSubs" label="Tổng NTP" :icon="TeamOutlined" variant="primary" />
    <StatCard :value="formatMoney(stats.totalQuote)" label="Tổng giá trị HĐ" :icon="DollarOutlined" variant="success" format="text" />
    <StatCard :value="formatMoney(stats.totalPaid)" label="Đã thanh toán" :icon="CheckCircleOutlined" variant="accent" format="text" />
    <StatCard :value="stats.delayed" label="Chậm tiến độ" :icon="WarningOutlined" variant="warning" />
  </div>

  <!-- ═══ Charts ═══ -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <ChartCard title="Tiến độ thi công" :subtitle="`${stats.totalSubs} nhà thầu`" :height="260">
      <Doughnut :data="progressChartData" :options="donutOpts" />
    </ChartCard>
    <ChartCard title="Trạng thái thanh toán" subtitle="Phân bổ theo NTP" :height="260">
      <Doughnut :data="paymentChartData" :options="donutOpts" />
    </ChartCard>
    <ChartCard title="Top nhà thầu" subtitle="Giá trị hợp đồng (VNĐ)" :height="260">
      <Bar :data="topByValueData" :options="stackedBarOpts" />
    </ChartCard>
  </div>

  <!-- ═══ Filters ═══ -->
  <div class="crm-content-card mb-6">
    <div class="crm-content-card__header" style="border-bottom: none; padding-bottom: 0;">
      <div class="flex flex-wrap items-center gap-3 w-full">
        <a-input-search
          v-model:value="localFilters.search" placeholder="Tìm nhà thầu..." style="width: 220px;"
          size="large" allow-clear @search="applyFilters" @pressEnter="applyFilters"
        />
        <a-select v-model:value="localFilters.progress_status" style="width: 160px;" size="large" @change="applyFilters" placeholder="Tiến độ">
          <a-select-option value="">Tất cả</a-select-option>
          <a-select-option value="not_started">Chưa bắt đầu</a-select-option>
          <a-select-option value="in_progress">Đang thi công</a-select-option>
          <a-select-option value="completed">Hoàn thành</a-select-option>
          <a-select-option value="delayed">Chậm tiến độ</a-select-option>
        </a-select>
        <a-select v-model:value="localFilters.payment_status" style="width: 160px;" size="large" @change="applyFilters" placeholder="Thanh toán">
          <a-select-option value="">Tất cả</a-select-option>
          <a-select-option value="pending">Chưa TT</a-select-option>
          <a-select-option value="partial">TT 1 phần</a-select-option>
          <a-select-option value="completed">Đã TT đủ</a-select-option>
        </a-select>
        <a-select
          v-model:value="localFilters.project_id" style="width: 220px;" size="large"
          @change="applyFilters" placeholder="Dự án" allow-clear show-search
          :filter-option="filterOption" option-label-prop="label"
        >
          <a-select-option value="">Tất cả dự án</a-select-option>
          <a-select-option v-for="p in projects" :key="p.id" :value="String(p.id)" :label="`${p.code} - ${p.name}`">
            {{ p.code }} - {{ p.name }}
          </a-select-option>
        </a-select>
      </div>
    </div>
  </div>

  <!-- ═══ Table ═══ -->
  <div class="crm-content-card">
    <a-table
      :columns="columns" :data-source="subcontractors.data" :pagination="false"
      row-key="id" class="crm-table" :scroll="{ x: 1300 }"
    >
      <template #bodyCell="{ column, record }">
        <!-- Name -->
        <template v-if="column.dataIndex === 'name'">
          <div>
            <div class="font-semibold text-gray-800 text-sm">{{ record.name }}</div>
            <div v-if="record.category" class="text-xs text-gray-400 mt-0.5">{{ record.category }}</div>
          </div>
        </template>

        <!-- Project -->
        <template v-if="column.dataIndex === 'project'">
          <a-tag v-if="record.project" color="blue" class="rounded-lg text-xs">{{ record.project.code }}</a-tag>
          <span v-else class="text-gray-400 text-xs">—</span>
        </template>

        <!-- Contract Value -->
        <template v-if="column.dataIndex === 'total_quote'">
          <div class="text-right">
            <div class="font-semibold text-gray-800 text-sm">{{ formatMoney(record.total_quote) }}</div>
          </div>
        </template>

        <!-- Payment -->
        <template v-if="column.dataIndex === 'payment'">
          <div style="min-width: 150px;">
            <div class="flex items-center gap-2 mb-1">
              <a-progress
                :percent="paymentPct(record)" :size="5" :show-info="false"
                :stroke-color="paymentColor(record)"
                style="flex: 1;"
              />
              <span class="text-xs font-bold" :style="{ color: paymentColor(record) }">{{ paymentPct(record) }}%</span>
            </div>
            <div class="text-xs text-gray-400">
              {{ formatMoney(record.total_paid) }} / {{ formatMoney(record.total_quote) }}
            </div>
          </div>
        </template>

        <!-- Payment Status -->
        <template v-if="column.dataIndex === 'payment_status'">
          <span class="crm-tag" :class="paymentStatusTag(record.payment_status)">
            {{ paymentStatusLabel(record.payment_status) }}
          </span>
        </template>

        <!-- Progress Status -->
        <template v-if="column.dataIndex === 'progress_status'">
          <span class="crm-tag" :class="progressStatusTag(record.progress_status)">
            {{ progressStatusLabel(record.progress_status) }}
          </span>
        </template>

        <!-- Period -->
        <template v-if="column.dataIndex === 'period'">
          <div class="text-xs text-gray-500">
            <div v-if="record.progress_start_date">{{ formatDate(record.progress_start_date) }}</div>
            <div v-if="record.progress_end_date" class="text-gray-400">→ {{ formatDate(record.progress_end_date) }}</div>
            <span v-if="!record.progress_start_date && !record.progress_end_date" class="text-gray-400">—</span>
          </div>
        </template>

        <!-- Actions -->
        <template v-if="column.dataIndex === 'actions'">
          <div class="flex gap-1">
            <a-tooltip title="Sửa">
              <a-button type="text" size="small" @click="showEditModal(record)"><EditOutlined /></a-button>
            </a-tooltip>
            <a-popconfirm title="Xóa nhà thầu phụ này?" ok-text="Xóa" cancel-text="Hủy" @confirm="deleteSub(record.id)">
              <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>

    <div v-if="subcontractors.last_page > 1" class="flex justify-center py-4 border-t border-gray-100">
      <a-pagination
        :current="subcontractors.current_page" :total="subcontractors.total" :page-size="subcontractors.per_page"
        @change="(page) => router.visit(`/subcontractors?page=${page}&${buildQuery()}`)"
      />
    </div>
  </div>

  <!-- Empty -->
  <div v-if="!subcontractors.data?.length" class="text-center py-16">
    <TeamOutlined style="font-size: 56px; color: #D1D5DB;" />
    <p class="mt-4 text-gray-400 text-base">Chưa có nhà thầu phụ nào</p>
    <a-button type="primary" class="mt-3 rounded-xl" @click="showCreateModal">Thêm nhà thầu phụ đầu tiên</a-button>
  </div>

  <!-- ═══ Create/Edit Modal ═══ -->
  <a-modal
    v-model:open="formModalVisible"
    :title="editingSub ? 'Sửa nhà thầu phụ' : 'Thêm nhà thầu phụ'"
    :width="640"
    @ok="saveForm"
    ok-text="Lưu"
    cancel-text="Hủy"
    :confirm-loading="form.processing"
    centered
  >
    <div class="space-y-4 mt-4">
      <div class="grid grid-cols-2 gap-4">
        <div class="col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Tên nhà thầu phụ <span class="text-red-500">*</span></label>
          <a-input v-model:value="form.name" placeholder="VD: Cty TNHH Xây Dựng ABC" size="large" />
          <div v-if="form.errors.name" class="text-red-500 text-xs mt-1">{{ form.errors.name }}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Dự án <span class="text-red-500">*</span></label>
          <a-select v-model:value="form.project_id" style="width: 100%;" size="large" placeholder="Chọn dự án" show-search :filter-option="filterOption" option-label-prop="label">
            <a-select-option v-for="p in projects" :key="p.id" :value="p.id" :label="`${p.code} - ${p.name}`">{{ p.code }} - {{ p.name }}</a-select-option>
          </a-select>
          <div v-if="form.errors.project_id" class="text-red-500 text-xs mt-1">{{ form.errors.project_id }}</div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Hạng mục</label>
          <a-input v-model:value="form.category" placeholder="VD: Điện, Nước, PCCC..." size="large" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Giá trị hợp đồng (VNĐ) <span class="text-red-500">*</span></label>
          <a-input-number v-model:value="form.total_quote" style="width: 100%;" size="large" :min="0" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" />
          <div v-if="form.errors.total_quote" class="text-red-500 text-xs mt-1">{{ form.errors.total_quote }}</div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Trạng thái tiến độ</label>
          <a-select v-model:value="form.progress_status" style="width: 100%;" size="large" placeholder="Chọn trạng thái">
            <a-select-option value="not_started">Chưa bắt đầu</a-select-option>
            <a-select-option value="in_progress">Đang thi công</a-select-option>
            <a-select-option value="completed">Hoàn thành</a-select-option>
            <a-select-option value="delayed">Chậm tiến độ</a-select-option>
          </a-select>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
          <a-date-picker v-model:value="formStartDate" style="width: 100%;" size="large" format="DD/MM/YYYY" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
          <a-date-picker v-model:value="formEndDate" style="width: 100%;" size="large" format="DD/MM/YYYY" />
        </div>
      </div>

      <!-- Bank Info Collapsible -->
      <a-collapse ghost>
        <a-collapse-panel key="bank" header="Thông tin ngân hàng">
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
              <a-input v-model:value="form.bank_name" placeholder="VD: Vietcombank" size="large" />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
                <a-input v-model:value="form.bank_account_number" placeholder="Nhập STK" size="large" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Chủ tài khoản</label>
                <a-input v-model:value="form.bank_account_name" placeholder="Tên chủ TK" size="large" />
              </div>
            </div>
          </div>
        </a-collapse-panel>
      </a-collapse>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Head, router, useForm } from '@inertiajs/vue3'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js'
import dayjs from 'dayjs'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import ChartCard from '@/Components/Crm/ChartCard.vue'
import { useChart, CHART_COLORS } from '@/Composables/useChart'
import { useStatusFormat } from '@/Composables/useStatusFormat'
import {
  PlusOutlined, TeamOutlined, DollarOutlined, CheckCircleOutlined, WarningOutlined,
  EditOutlined, DeleteOutlined,
} from '@ant-design/icons-vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

defineOptions({ layout: CrmLayout })

const props = defineProps({
  subcontractors: Object,
  stats: Object,
  charts: Object,
  projects: Array,
  filters: Object,
})

const { defaultOptions, doughnutOptions } = useChart()
const { paymentStatusLabel, paymentStatusTag } = useStatusFormat()

const filterOption = (input, option) => option.label?.toLowerCase().includes(input.toLowerCase())
const formatDate = (d) => d ? dayjs(d).format('DD/MM/YYYY') : '—'

// ============================================================
// STATUS HELPERS
// ============================================================
const PROGRESS_STATUS = {
  not_started: { label: 'Chưa bắt đầu', tag: 'crm-tag--cancelled' },
  in_progress: { label: 'Đang thi công', tag: 'crm-tag--active' },
  completed: { label: 'Hoàn thành', tag: 'crm-tag--completed' },
  delayed: { label: 'Chậm tiến độ', tag: 'crm-tag--overdue' },
}

const progressStatusLabel = (s) => PROGRESS_STATUS[s]?.label || s || '—'
const progressStatusTag = (s) => PROGRESS_STATUS[s]?.tag || ''

const formatMoney = (v) => {
  if (!v && v !== 0) return '0đ'
  const num = parseFloat(v)
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)} tỷ`
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)} tr`
  return new Intl.NumberFormat('vi-VN').format(num) + 'đ'
}

const paymentPct = (sub) => {
  if (!sub?.total_quote || sub.total_quote <= 0) return 0
  return Math.min(Math.round((sub.total_paid / sub.total_quote) * 100), 100)
}

const paymentColor = (sub) => {
  const pct = paymentPct(sub)
  if (pct >= 100) return '#10B981'
  if (pct >= 50) return '#3B82F6'
  if (pct > 0) return '#F59E0B'
  return '#9CA3AF'
}

// ============================================================
// FILTERS
// ============================================================
const localFilters = reactive({ ...props.filters })

const buildQuery = () => {
  const params = new URLSearchParams()
  if (localFilters.search) params.set('search', localFilters.search)
  if (localFilters.progress_status) params.set('progress_status', localFilters.progress_status)
  if (localFilters.payment_status) params.set('payment_status', localFilters.payment_status)
  if (localFilters.project_id) params.set('project_id', localFilters.project_id)
  return params.toString()
}

const applyFilters = () => {
  router.visit(`/subcontractors?${buildQuery()}`, { preserveState: true })
}

// ============================================================
// CHARTS
// ============================================================
const donutOpts = computed(() => ({
  ...doughnutOptions,
  cutout: '60%',
  plugins: { ...doughnutOptions.plugins, legend: { ...doughnutOptions.plugins.legend, position: 'bottom' } }
}))

const progressChartData = computed(() => ({
  labels: props.charts?.byProgress?.labels || [],
  datasets: [{
    data: props.charts?.byProgress?.data || [],
    backgroundColor: props.charts?.byProgress?.colors || [],
    hoverOffset: 6,
  }]
}))

const paymentChartData = computed(() => ({
  labels: props.charts?.byPayment?.labels || [],
  datasets: [{
    data: props.charts?.byPayment?.data || [],
    backgroundColor: props.charts?.byPayment?.colors || [],
    hoverOffset: 6,
  }]
}))

const stackedBarOpts = computed(() => ({
  ...defaultOptions,
  indexAxis: 'y',
  plugins: {
    ...defaultOptions.plugins,
    legend: { display: true, position: 'top', labels: { boxWidth: 12, padding: 8, font: { size: 11 } } },
    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatMoney(ctx.raw)}` } }
  },
  scales: {
    x: { stacked: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { callback: (v) => formatMoney(v), font: { size: 10 } } },
    y: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
  }
}))

const topByValueData = computed(() => ({
  labels: props.charts?.topByValue?.labels || [],
  datasets: [
    { label: 'Đã thanh toán', data: props.charts?.topByValue?.paid || [], backgroundColor: 'rgba(16, 185, 129, 0.65)', borderRadius: 4, barThickness: 16 },
    { label: 'Còn lại', data: (props.charts?.topByValue?.quotes || []).map((q, i) => Math.max(0, q - (props.charts?.topByValue?.paid?.[i] || 0))), backgroundColor: 'rgba(59, 130, 246, 0.35)', borderRadius: 4, barThickness: 16 },
  ]
}))

// ============================================================
// TABLE
// ============================================================
const columns = [
  { title: 'Nhà thầu phụ', dataIndex: 'name', key: 'name', width: 220 },
  { title: 'Dự án', dataIndex: 'project', key: 'project', width: 100 },
  { title: 'Giá trị HĐ', dataIndex: 'total_quote', key: 'total_quote', width: 140, align: 'right' },
  { title: 'Thanh toán', dataIndex: 'payment', key: 'payment', width: 200 },
  { title: 'TT thanh toán', dataIndex: 'payment_status', key: 'payment_status', width: 120 },
  { title: 'Tiến độ', dataIndex: 'progress_status', key: 'progress_status', width: 130 },
  { title: 'Thời gian', dataIndex: 'period', key: 'period', width: 110 },
  { title: '', dataIndex: 'actions', key: 'actions', width: 80, fixed: 'right' },
]

// ============================================================
// FORM
// ============================================================
const formModalVisible = ref(false)
const editingSub = ref(null)
const formStartDate = ref(null)
const formEndDate = ref(null)

const form = useForm({
  project_id: null,
  name: '',
  category: '',
  total_quote: 0,
  bank_name: '',
  bank_account_number: '',
  bank_account_name: '',
  progress_start_date: '',
  progress_end_date: '',
  progress_status: 'not_started',
})

const showCreateModal = () => {
  editingSub.value = null
  form.reset()
  form.progress_status = 'not_started'
  formStartDate.value = null
  formEndDate.value = null
  formModalVisible.value = true
}

const showEditModal = (record) => {
  editingSub.value = record
  form.project_id = record.project_id
  form.name = record.name
  form.category = record.category || ''
  form.total_quote = parseFloat(record.total_quote || 0)
  form.bank_name = record.bank_name || ''
  form.bank_account_number = record.bank_account_number || ''
  form.bank_account_name = record.bank_account_name || ''
  form.progress_status = record.progress_status || 'not_started'
  formStartDate.value = record.progress_start_date ? dayjs(record.progress_start_date) : null
  formEndDate.value = record.progress_end_date ? dayjs(record.progress_end_date) : null
  formModalVisible.value = true
}

const saveForm = () => {
  form.progress_start_date = formStartDate.value ? formStartDate.value.format('YYYY-MM-DD') : ''
  form.progress_end_date = formEndDate.value ? formEndDate.value.format('YYYY-MM-DD') : ''

  if (editingSub.value) {
    form.put(`/subcontractors/${editingSub.value.id}`, {
      preserveScroll: true,
      onSuccess: () => { formModalVisible.value = false },
    })
  } else {
    form.post('/subcontractors', {
      preserveScroll: true,
      onSuccess: () => { formModalVisible.value = false },
    })
  }
}

const deleteSub = (id) => {
  router.delete(`/subcontractors/${id}`, { preserveScroll: true })
}
</script>
