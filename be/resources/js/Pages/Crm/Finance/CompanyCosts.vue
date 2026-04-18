<template>
  <Head title="Chi phí công ty" />

  <PageHeader title="Chi Phí Công Ty" subtitle="Quản lý toàn bộ chi phí hoạt động công ty (không thuộc dự án)">
    <template #actions>
      <a-button type="primary" size="large" class="rounded-xl" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);" @click="showCreateModal">
        <template #icon><PlusOutlined /></template>
        Tạo chi phí
      </a-button>
    </template>
  </PageHeader>

  <!-- ═══ Stats ═══ -->
  <div class="crm-stats-grid">
    <StatCard :value="fmtCurrency(stats.totalAmount)" label="Tổng chi phí" :icon="DollarOutlined" variant="primary" format="text" />
    <StatCard :value="fmtCurrency(stats.approvedAmount)" label="Đã duyệt" :icon="CheckCircleOutlined" variant="success" format="text" />
    <StatCard :value="stats.pendingCount" label="Chờ duyệt" :icon="ClockCircleOutlined" variant="warning" />
    <StatCard :value="stats.draftCount" label="Nháp" :icon="FileTextOutlined" variant="accent" />
  </div>

  <!-- ═══ Charts ═══ -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <div class="xl:col-span-2">
      <ChartCard title="Chi phí theo tháng" subtitle="6 tháng gần nhất" :height="260">
        <Bar :data="monthlyChartData" :options="barOpts" />
      </ChartCard>
    </div>
    <ChartCard title="Theo trạng thái" :subtitle="`${stats.totalCount} khoản chi`" :height="260">
      <Doughnut :data="statusChartData" :options="donutOpts" />
    </ChartCard>
  </div>

  <!-- ═══ Filters ═══ -->
  <div class="crm-content-card mb-6">
    <div class="crm-content-card__header" style="border-bottom: none; padding-bottom: 0;">
      <div class="flex flex-wrap items-center gap-3 w-full">
        <a-input-search
          v-model:value="localFilters.search" placeholder="Tìm chi phí..." style="width: 220px;"
          size="large" class="rounded-xl" allow-clear @search="applyFilters" @pressEnter="applyFilters"
        />
        <a-select v-model:value="localFilters.status" style="width: 140px;" size="large" @change="applyFilters" placeholder="Trạng thái">
          <a-select-option value="">Tất cả</a-select-option>
          <a-select-option value="draft">Nháp</a-select-option>
          <a-select-option value="pending_management_approval">Chờ BĐH</a-select-option>
          <a-select-option value="pending_accountant_approval">Chờ KT</a-select-option>
          <a-select-option value="approved">Đã duyệt</a-select-option>
          <a-select-option value="rejected">Từ chối</a-select-option>
        </a-select>
        <a-select v-model:value="localFilters.cost_group_id" style="width: 170px;" size="large" @change="applyFilters" placeholder="Nhóm CP" allow-clear>
          <a-select-option value="">Tất cả nhóm</a-select-option>
          <a-select-option v-for="g in costGroups" :key="g.id" :value="String(g.id)">{{ g.name }}</a-select-option>
        </a-select>
        <a-date-picker v-model:value="filterStartDate" placeholder="Từ ngày" size="large" format="DD/MM/YYYY" @change="applyFilters" />
        <a-date-picker v-model:value="filterEndDate" placeholder="Đến ngày" size="large" format="DD/MM/YYYY" @change="applyFilters" />
      </div>
    </div>
  </div>

  <!-- ═══ Table ═══ -->
  <div class="crm-content-card">
    <a-table
      :columns="columns"
      :data-source="costs.data"
      :pagination="false"
      row-key="id"
      class="crm-table"
      :scroll="{ x: 1100 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'name'">
          <div>
            <div class="font-semibold text-gray-800 text-sm">{{ record.name }}</div>
            <div class="text-xs text-gray-400 mt-0.5 truncate" style="max-width: 220px;">{{ record.description || '—' }}</div>
          </div>
        </template>
        <template v-if="column.dataIndex === 'cost_group'">
          <a-tag v-if="record.cost_group" color="blue" class="rounded-lg text-xs">{{ record.cost_group.name }}</a-tag>
          <span v-else class="text-gray-400 text-xs">—</span>
        </template>
        <template v-if="column.dataIndex === 'amount'">
          <span class="font-bold text-sm" style="color: var(--crm-primary);">{{ fmtCurrency(record.amount) }}</span>
        </template>
        <template v-if="column.dataIndex === 'cost_date'">
          <span class="text-sm text-gray-600">{{ formatDate(record.cost_date) }}</span>
        </template>
        <template v-if="column.dataIndex === 'status'">
          <span class="crm-tag" :class="statusClass(record.status)">
            {{ statusLabel(record.status) }}
          </span>
        </template>
        <template v-if="column.dataIndex === 'creator'">
          <span class="text-sm text-gray-600">{{ record.creator?.name || '—' }}</span>
        </template>
        <template v-if="column.dataIndex === 'actions'">
          <div class="flex gap-1">
            <!-- Submit for approval -->
            <a-tooltip v-if="record.status === 'draft'" title="Gửi duyệt">
              <a-popconfirm title="Gửi chi phí này để Ban điều hành duyệt?" ok-text="Gửi" cancel-text="Hủy" @confirm="submitCost(record.id)">
                <a-button type="text" size="small"><SendOutlined style="color: #1B4F72;" /></a-button>
              </a-popconfirm>
            </a-tooltip>
            <!-- Revert -->
            <a-tooltip v-if="['pending_management_approval', 'pending_accountant_approval', 'rejected'].includes(record.status)" title="Hoàn duyệt">
              <a-popconfirm title="Đưa chi phí này về trạng thái Nháp để chỉnh sửa?" ok-text="Đồng ý" cancel-text="Hủy" @confirm="revertCost(record.id)">
                <a-button type="text" size="small"><UndoOutlined /></a-button>
              </a-popconfirm>
            </a-tooltip>
            <!-- Delete -->
            <a-popconfirm v-if="['draft', 'rejected'].includes(record.status)" title="Xóa chi phí này?" ok-text="Xóa" cancel-text="Hủy" @confirm="deleteCost(record.id)">
              <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>

    <!-- Pagination -->
    <div v-if="costs.last_page > 1" class="flex justify-center py-4 border-t border-gray-100">
      <a-pagination
        :current="costs.current_page"
        :total="costs.total"
        :page-size="costs.per_page"
        show-size-changer
        @change="(page) => router.visit(`/finance/company-costs?page=${page}&${buildQuery()}`)"
      />
    </div>
  </div>

  <!-- Empty State -->
  <div v-if="!costs.data?.length" class="text-center py-16">
    <DollarOutlined style="font-size: 56px; color: #D1D5DB;" />
    <p class="mt-4 text-gray-400 text-base">Chưa có chi phí công ty nào</p>
    <a-button type="primary" class="mt-3 rounded-xl" @click="showCreateModal">Tạo chi phí đầu tiên</a-button>
  </div>

  <!-- ═══ Create/Edit Modal ═══ -->
  <a-modal
    v-model:open="modalVisible"
    :title="editingCost ? 'Sửa chi phí công ty' : 'Tạo chi phí công ty'"
    :width="560"
    @ok="saveForm"
    ok-text="Lưu"
    cancel-text="Hủy"
    :confirm-loading="form.processing"
  >
    <div class="space-y-4 mt-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tên chi phí <span class="text-red-500">*</span></label>
        <a-input v-model:value="form.name" placeholder="VD: Tiền điện văn phòng T3" size="large" />
        <div v-if="form.errors?.name" class="text-red-500 text-xs mt-1">{{ form.errors.name }}</div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Số tiền <span class="text-red-500">*</span></label>
          <a-input-number v-model:value="form.amount" :min="0" :step="100000" style="width: 100%;" size="large"
            :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
            :parser="v => v.replace(/,/g, '')" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nhóm chi phí <span class="text-red-500">*</span></label>
          <a-select v-model:value="form.cost_group_id" style="width: 100%;" size="large" placeholder="Chọn nhóm">
            <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id">{{ g.name }}</a-select-option>
          </a-select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Loại chi phí</label>
          <a-select v-model:value="form.expense_category" style="width: 100%;" size="large" placeholder="Phân loại" allow-clear>
            <a-select-option value="capex">CAPEX — Mua sắm tài sản</a-select-option>
            <a-select-option value="opex">OPEX — Vận hành (điện, nước, mặt bằng)</a-select-option>
            <a-select-option value="payroll">Lương, thưởng, bảo hiểm</a-select-option>
          </a-select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ngày chi phí <span class="text-red-500">*</span></label>
          <a-date-picker v-model:value="formDate" style="width: 100%;" size="large" format="DD/MM/YYYY" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nhà cung cấp</label>
          <a-select v-model:value="form.supplier_id" style="width: 100%;" size="large" placeholder="Chọn NCC" allow-clear show-search :filter-option="filterOption">
            <a-select-option v-for="s in suppliers" :key="s.id" :value="s.id" :label="s.name">{{ s.name }}</a-select-option>
          </a-select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
          <a-input-number v-model:value="form.quantity" :min="0" style="width: 100%;" size="large" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
          <a-input v-model:value="form.unit" placeholder="VD: tháng, lần, cái" size="large" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
        <a-textarea v-model:value="form.description" :rows="3" placeholder="Ghi chú thêm..." />
      </div>
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
import {
  PlusOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  FileTextOutlined, EditOutlined, DeleteOutlined, SendOutlined, UndoOutlined,
} from '@ant-design/icons-vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

defineOptions({ layout: CrmLayout })

const props = defineProps({
  costs: Object,
  stats: Object,
  charts: Object,
  costGroups: Array,
  suppliers: Array,
  filters: Object,
})

const { defaultOptions, doughnutOptions } = useChart()

const fmtCurrency = (v) => {
  if (!v && v !== 0) return '0đ'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)
}

const formatDate = (d) => {
  if (!d) return '—'
  return dayjs(d).format('DD/MM/YYYY')
}

// ============================================================
// FILTERS
// ============================================================
const localFilters = reactive({ ...props.filters })
const filterStartDate = ref(props.filters?.start_date ? dayjs(props.filters.start_date) : null)
const filterEndDate = ref(props.filters?.end_date ? dayjs(props.filters.end_date) : null)

const buildQuery = () => {
  const params = new URLSearchParams()
  if (localFilters.search) params.set('search', localFilters.search)
  if (localFilters.status) params.set('status', localFilters.status)
  if (localFilters.cost_group_id) params.set('cost_group_id', localFilters.cost_group_id)
  if (filterStartDate.value) params.set('start_date', filterStartDate.value.format('YYYY-MM-DD'))
  if (filterEndDate.value) params.set('end_date', filterEndDate.value.format('YYYY-MM-DD'))
  return params.toString()
}

const applyFilters = () => {
  router.visit(`/finance/company-costs?${buildQuery()}`, { preserveState: true })
}

const filterOption = (input, option) => option.label?.toLowerCase().includes(input.toLowerCase())

// ============================================================
// CHARTS
// ============================================================
const barOpts = computed(() => ({
  ...defaultOptions,
  plugins: { ...defaultOptions.plugins, legend: { display: false }, tooltip: { ...defaultOptions.plugins.tooltip, callbacks: { label: (ctx) => fmtCurrency(ctx.raw) } } },
  scales: {
    ...defaultOptions.scales,
    y: { ...defaultOptions.scales.y, ticks: { ...defaultOptions.scales.y.ticks, callback: (v) => { if (v >= 1e9) return (v/1e9).toFixed(1)+'T'; if (v >= 1e6) return (v/1e6).toFixed(1)+'Tr'; if (v >= 1e3) return (v/1e3).toFixed(0)+'K'; return v; } } }
  }
}))

const monthlyChartData = computed(() => ({
  labels: props.charts?.monthly?.labels || [],
  datasets: [{
    label: 'Chi phí',
    data: props.charts?.monthly?.data || [],
    backgroundColor: 'rgba(27, 79, 114, 0.7)',
    borderColor: '#1B4F72',
    borderWidth: 1, borderRadius: 10, barThickness: 36,
  }]
}))

const donutOpts = computed(() => ({
  ...doughnutOptions,
  cutout: '60%',
  plugins: { ...doughnutOptions.plugins, legend: { ...doughnutOptions.plugins.legend, position: 'bottom' } }
}))

const statusChartData = computed(() => ({
  labels: props.charts?.byStatus?.labels || [],
  datasets: [{
    data: props.charts?.byStatus?.data || [],
    backgroundColor: props.charts?.byStatus?.colors || [],
    hoverOffset: 6,
  }]
}))

// ============================================================
// TABLE
// ============================================================
const columns = [
  { title: 'Tên chi phí', dataIndex: 'name', key: 'name', width: 260 },
  { title: 'Nhóm', dataIndex: 'cost_group', key: 'cost_group', width: 140 },
  { title: 'Số tiền', dataIndex: 'amount', key: 'amount', width: 140, align: 'right' },
  { title: 'Ngày', dataIndex: 'cost_date', key: 'cost_date', width: 110 },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120 },
  { title: 'Người tạo', dataIndex: 'creator', key: 'creator', width: 130 },
  { title: '', dataIndex: 'actions', key: 'actions', width: 120, fixed: 'right' },
]

const statusLabel = (s) => ({
  draft: 'Nháp',
  pending_management_approval: 'Chờ BĐH',
  pending_accountant_approval: 'Chờ KT',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
})[s] || s

const statusClass = (s) => ({
  draft: 'crm-tag--cancelled',
  pending_management_approval: 'crm-tag--pending',
  pending_accountant_approval: 'crm-tag--active',
  approved: 'crm-tag--completed',
  rejected: 'crm-tag--overdue',
})[s] || ''

// ============================================================
// MODAL / FORM
// ============================================================
const modalVisible = ref(false)
const editingCost = ref(null)
const formDate = ref(null)

const form = useForm({
  name: '',
  amount: 0,
  cost_group_id: null,
  cost_date: '',
  description: '',
  quantity: null,
  unit: '',
  supplier_id: null,
  expense_category: null,
})

const showCreateModal = () => {
  editingCost.value = null
  form.reset()
  formDate.value = dayjs()
  modalVisible.value = true
}

const showEditModal = (record) => {
  editingCost.value = record
  form.name = record.name
  form.amount = parseFloat(record.amount)
  form.cost_group_id = record.cost_group_id
  form.description = record.description || ''
  form.quantity = record.quantity ? parseFloat(record.quantity) : null
  form.unit = record.unit || ''
  form.supplier_id = record.supplier_id
  form.expense_category = record.expense_category || null
  formDate.value = record.cost_date ? dayjs(record.cost_date) : null
  modalVisible.value = true
}

const saveForm = () => {
  form.cost_date = formDate.value ? formDate.value.format('YYYY-MM-DD') : ''

  if (editingCost.value) {
    form.put(`/finance/company-costs/${editingCost.value.id}`, {
      preserveScroll: true,
      onSuccess: () => { modalVisible.value = false },
    })
  } else {
    form.post('/finance/company-costs', {
      preserveScroll: true,
      onSuccess: () => { modalVisible.value = false },
    })
  }
}

// ============================================================
// ACTIONS
// ============================================================
const submitCost = (id) => {
  router.post(`/finance/company-costs/${id}/submit`, {}, { preserveScroll: true })
}

const deleteCost = (id) => {
  router.delete(`/finance/company-costs/${id}`, { preserveScroll: true })
}

const revertCost = (id) => {
  router.post(`/finance/company-costs/${id}/revert`, {}, { preserveScroll: true })
}
</script>
