<template>
  <Head title="Nguồn vốn — Cổ đông" />

  <PageHeader title="Quản Lý Nguồn Vốn" subtitle="Danh sách cổ đông, số tiền góp và tỷ lệ cổ phần">
    <template #actions>
      <a-button type="primary" size="large" class="rounded-xl" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Thêm cổ đông
      </a-button>
    </template>
  </PageHeader>

  <!-- ═══ Stats ═══ -->
  <div class="crm-stats-grid">
    <StatCard :value="fmtCurrency(totalCapital)" label="Tổng vốn góp" :icon="BankOutlined" variant="primary" format="text" />
    <StatCard :value="shareholders.filter(s => s.status === 'active').length" label="CĐ đang hoạt động" :icon="TeamOutlined" variant="success" />
    <StatCard :value="maxSharePct + '%'" label="Tỷ lệ cao nhất" :icon="RiseOutlined" variant="warning" format="text" />
    <StatCard :value="totalPct.toFixed(1) + '%'" label="Tổng tỷ lệ phân bổ" :icon="PieChartOutlined" variant="accent" format="text" />
  </div>

  <!-- ═══ Charts ═══ -->
  <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
    <ChartCard title="Cơ cấu vốn góp" :subtitle="`${shareholders.length} cổ đông`" :height="280">
      <Doughnut v-if="shareholders.length" :data="capitalDonut" :options="donutOpts" />
      <div v-else class="flex items-center justify-center h-full text-gray-400 text-sm">Chưa có cổ đông</div>
    </ChartCard>
    <ChartCard title="Tỷ lệ cổ phần" subtitle="So sánh các cổ đông" :height="280">
      <Bar v-if="shareholders.length" :data="barData" :options="barOpts" />
      <div v-else class="flex items-center justify-center h-full text-gray-400 text-sm">Chưa có dữ liệu</div>
    </ChartCard>
  </div>

  <!-- ═══ Table ═══ -->
  <div class="crm-content-card">
    <div class="crm-content-card__header">
      <h3 class="crm-content-card__title">Danh sách cổ đông</h3>
    </div>
    <a-table :columns="columns" :data-source="shareholders" :pagination="false" row-key="id" class="crm-table" :scroll="{ x: 900 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div>
            <div class="font-semibold text-gray-800">{{ record.name }}</div>
            <div class="text-xs text-gray-400 mt-0.5">
              <span v-if="record.phone">📞 {{ record.phone }}</span>
              <span v-if="record.email" class="ml-2">✉️ {{ record.email }}</span>
            </div>
          </div>
        </template>
        <template v-if="column.key === 'amount'">
          <span class="font-bold text-sm" style="color: var(--crm-primary);">{{ fmtCurrency(record.contributed_amount) }}</span>
        </template>
        <template v-if="column.key === 'share'">
          <div class="flex items-center gap-2">
            <a-progress :percent="parseFloat(record.share_percentage)" :stroke-color="{ '0%': '#1B4F72', '100%': '#2E86C1' }" :show-info="false" size="small" style="width: 80px;" />
            <span class="font-semibold text-sm text-gray-700">{{ parseFloat(record.share_percentage).toFixed(1) }}%</span>
          </div>
        </template>
        <template v-if="column.key === 'date'">
          <span class="text-sm text-gray-600">{{ fmtDate(record.contribution_date) }}</span>
        </template>
        <template v-if="column.key === 'status'">
          <a-tag :color="record.status === 'active' ? 'green' : 'default'" class="rounded-lg">{{ record.status === 'active' ? 'Hoạt động' : 'Ngừng' }}</a-tag>
        </template>
        <template v-if="column.key === 'actions'">
          <div class="flex gap-1">
            <a-tooltip title="Sửa"><a-button type="text" size="small" @click="openEditModal(record)"><EditOutlined /></a-button></a-tooltip>
            <a-popconfirm title="Xóa cổ đông này?" ok-text="Xóa" cancel-text="Hủy" @confirm="deleteShareholder(record.id)">
              <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- Empty -->
  <div v-if="!shareholders.length" class="text-center py-16">
    <BankOutlined style="font-size: 56px; color: #D1D5DB;" />
    <p class="mt-4 text-gray-400 text-base">Chưa có cổ đông nào</p>
    <a-button type="primary" class="mt-3 rounded-xl" @click="openCreateModal">Thêm cổ đông đầu tiên</a-button>
  </div>

  <!-- ═══ Create/Edit Modal ═══ -->
  <a-modal
    v-model:open="modalOpen" :title="editing ? 'Sửa cổ đông' : 'Thêm cổ đông'"
    :width="560" @ok="saveForm" ok-text="Lưu" cancel-text="Hủy"
    :confirm-loading="form.processing" centered destroy-on-close class="crm-modal"
  >
    <div class="space-y-4 mt-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tên cổ đông <span class="text-red-500">*</span></label>
        <a-input v-model:value="form.name" placeholder="Nguyễn Văn A" size="large" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Số tiền góp <span class="text-red-500">*</span></label>
          <a-input-number v-model:value="form.contributed_amount" :min="0" :step="100000000" style="width: 100%;" size="large"
            :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
            :parser="v => v.replace(/,/g, '')" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tỷ lệ % <span class="text-red-500">*</span></label>
          <a-input-number v-model:value="form.share_percentage" :min="0" :max="100" :step="0.5" style="width: 100%;" size="large" :precision="2" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
          <a-input v-model:value="form.phone" placeholder="0912 345 678" size="large" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <a-input v-model:value="form.email" placeholder="email@domain.com" size="large" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">CCCD/CMND</label>
          <a-input v-model:value="form.id_number" size="large" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ngày góp vốn</label>
          <a-date-picker v-model:value="formDate" style="width: 100%;" size="large" format="DD/MM/YYYY" />
        </div>
      </div>
      <div v-if="editing" class="grid grid-cols-1">
        <label class="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
        <a-select v-model:value="form.status" size="large">
          <a-select-option value="active">Hoạt động</a-select-option>
          <a-select-option value="inactive">Ngừng</a-select-option>
        </a-select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
        <a-textarea v-model:value="form.notes" :rows="2" placeholder="Ghi chú thêm..." />
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, router, useForm } from '@inertiajs/vue3'
import dayjs from 'dayjs'
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
  PlusOutlined, BankOutlined, TeamOutlined, RiseOutlined, PieChartOutlined,
  EditOutlined, DeleteOutlined,
} from '@ant-design/icons-vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)
defineOptions({ layout: CrmLayout })

const props = defineProps({ shareholders: Array, totalCapital: Number })
const { defaultOptions, doughnutOptions } = useChart()

const fmtCurrency = (v) => {
  if (!v && v !== 0) return '0₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)
}
const fmtDate = (d) => d ? dayjs(d).format('DD/MM/YYYY') : '—'

// Computed
const activeShareholders = computed(() => props.shareholders.filter(s => s.status === 'active'))
const maxSharePct = computed(() => Math.max(...activeShareholders.value.map(s => parseFloat(s.share_percentage)), 0).toFixed(1))
const totalPct = computed(() => activeShareholders.value.reduce((sum, s) => sum + parseFloat(s.share_percentage), 0))

// Charts
const donutOpts = computed(() => ({ ...doughnutOptions, cutout: '60%', plugins: { ...doughnutOptions.plugins, legend: { ...doughnutOptions.plugins.legend, position: 'bottom' }, tooltip: { ...doughnutOptions.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.label}: ${fmtCurrency(ctx.raw)}` } } } }))
const barOpts = computed(() => ({ ...defaultOptions, indexAxis: 'y', plugins: { ...defaultOptions.plugins, legend: { display: false }, tooltip: { ...defaultOptions.plugins.tooltip, callbacks: { label: (ctx) => ctx.raw + '%' } } }, scales: { x: { ...defaultOptions.scales.x, ticks: { ...defaultOptions.scales.x.ticks, callback: (v) => v + '%' } }, y: { ...defaultOptions.scales.y, grid: { display: false } } } }))

const capitalDonut = computed(() => ({
  labels: activeShareholders.value.map(s => s.name),
  datasets: [{ data: activeShareholders.value.map(s => parseFloat(s.contributed_amount)), backgroundColor: ['#1B4F72', '#F39C12', '#1D8348', '#8E44AD', '#E74C3C', '#2E86C1', '#D68910', '#27AE60'], hoverOffset: 6 }]
}))

const barData = computed(() => ({
  labels: activeShareholders.value.map(s => s.name),
  datasets: [{ label: 'Tỷ lệ %', data: activeShareholders.value.map(s => parseFloat(s.share_percentage)), backgroundColor: 'rgba(27, 79, 114, 0.7)', borderColor: '#1B4F72', borderWidth: 1, borderRadius: 8, barThickness: 24 }]
}))

// Table
const columns = [
  { title: 'Cổ đông', key: 'name', dataIndex: 'name', width: 240 },
  { title: 'Số tiền góp', key: 'amount', dataIndex: 'contributed_amount', width: 180, align: 'right' },
  { title: 'Tỷ lệ cổ phần', key: 'share', dataIndex: 'share_percentage', width: 180 },
  { title: 'Ngày góp', key: 'date', dataIndex: 'contribution_date', width: 120 },
  { title: 'TT', key: 'status', dataIndex: 'status', width: 90 },
  { title: '', key: 'actions', width: 100, fixed: 'right' },
]

// Form
const modalOpen = ref(false)
const editing = ref(null)
const formDate = ref(null)
const form = useForm({ name: '', contributed_amount: 0, share_percentage: 0, phone: '', email: '', id_number: '', contribution_date: '', status: 'active', notes: '' })

const openCreateModal = () => { editing.value = null; form.reset(); formDate.value = dayjs(); modalOpen.value = true }
const openEditModal = (r) => {
  editing.value = r
  Object.assign(form, { name: r.name, contributed_amount: parseFloat(r.contributed_amount), share_percentage: parseFloat(r.share_percentage), phone: r.phone || '', email: r.email || '', id_number: r.id_number || '', status: r.status, notes: r.notes || '' })
  formDate.value = r.contribution_date ? dayjs(r.contribution_date) : null
  modalOpen.value = true
}

const saveForm = () => {
  form.contribution_date = formDate.value ? formDate.value.format('YYYY-MM-DD') : ''
  if (editing.value) {
    form.put(`/operations/shareholders/${editing.value.id}`, { preserveScroll: true, onSuccess: () => { modalOpen.value = false } })
  } else {
    form.post('/operations/shareholders', { preserveScroll: true, onSuccess: () => { modalOpen.value = false } })
  }
}

const deleteShareholder = (id) => router.delete(`/operations/shareholders/${id}`, { preserveScroll: true })
</script>
