<template>
  <Head title="Nguồn vốn — Cổ đông" />

  <PageHeader title="Quản Lý Nguồn Vốn" subtitle="Danh sách cổ đông, số tiền góp và tỷ lệ cổ phần">
    <template #actions>
      <a-space size="middle">
        <a-button type="primary" size="large" class="rounded-xl" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);" @click="openCreateModal">
          <template #icon><PlusOutlined /></template>
          Thêm cổ đông
        </a-button>
        <a-button type="default" size="large" class="rounded-xl" @click="openIssueModal">
          <template #icon><PlusOutlined /></template>
          Phát hành cổ phiếu
        </a-button>
      </a-space>
    </template>
  </PageHeader>

  <a-tabs v-model:activeKey="activeTab" class="crm-tabs mt-4">
    <!-- TAB 1: CỔ ĐÔNG & CỔ PHẦN -->
    <a-tab-pane key="shareholders" tab="Cổ đông & Cổ phần">
      <!-- ═══ Stats ═══ -->
      <div class="crm-stats-grid mb-6">
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
            <template v-if="column.key === 'shares_count'">
              <span class="font-semibold text-sm text-gray-700">{{ fmtNumber(record.shares_count) }}</span>
            </template>
            <template v-if="column.key === 'amount'">
              <span class="font-bold text-sm" style="color: var(--crm-primary);">{{ fmtCurrency(record.contributed_amount) }}</span>
            </template>
            <template v-if="column.key === 'share'">
              <div class="flex items-center gap-2">
                <a-progress :percent="parseFloat(record.share_percentage)" :stroke-color="{ '0%': '#1B4F72', '100%': '#2E86C1' }" :show-info="false" size="small" style="width: 80px;" />
                <span class="font-semibold text-sm text-gray-700">{{ parseFloat(record.share_percentage).toFixed(2) }}%</span>
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
    </a-tab-pane>

    <!-- TAB 2: CƠ CẤU & PHÁT HÀNH CỔ PHIẾU -->
    <a-tab-pane key="issuances" tab="Cơ cấu & Phát hành cổ phiếu">
      <!-- ═══ Stats ═══ -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <StatCard :value="fmtNumber(totalShares)" label="Tổng cổ phiếu phát hành" :icon="PieChartOutlined" variant="primary" format="text" />
        <StatCard :value="fmtCurrency(sharePrice)" label="Mệnh giá cổ phiếu" :icon="RiseOutlined" variant="success" format="text" />
        <StatCard :value="fmtCurrency(totalShares * sharePrice)" label="Vốn cổ phần phát hành" :icon="BankOutlined" variant="warning" format="text" />
      </div>

      <!-- ═══ Table ═══ -->
      <div class="crm-content-card">
        <div class="crm-content-card__header flex justify-between items-center">
          <h3 class="crm-content-card__title">Lịch sử phát hành cổ phiếu</h3>
          <a-button type="primary" class="rounded-lg" @click="openIssueModal">
            <template #icon><PlusOutlined /></template>
            Phát hành thêm
          </a-button>
        </div>
        <a-table :columns="issuanceColumns" :data-source="shareIssuances" :pagination="false" row-key="id" class="crm-table">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'id'">
              <span class="font-mono text-gray-500">#{{ record.id }}</span>
            </template>
            <template v-if="column.key === 'issue_date'">
              <span>{{ fmtDate(record.issue_date) }}</span>
            </template>
            <template v-if="column.key === 'shares_count'">
              <span class="font-semibold">{{ fmtNumber(record.shares_count) }}</span>
            </template>
            <template v-if="column.key === 'share_price'">
              <span>{{ fmtCurrency(record.share_price) }}</span>
            </template>
            <template v-if="column.key === 'total_value'">
              <span class="font-bold text-sm" style="color: var(--crm-primary);">{{ fmtCurrency(record.shares_count * record.share_price) }}</span>
            </template>
            <template v-if="column.key === 'creator'">
              <span>{{ record.creator?.name ?? 'N/A' }}</span>
            </template>
            <template v-if="column.key === 'description'">
              <span class="text-gray-600 text-sm">{{ record.description || '—' }}</span>
            </template>
          </template>
        </a-table>
      </div>
    </a-tab-pane>
  </a-tabs>

  <!-- ═══ Create/Edit Modal ═══ -->
  <a-modal
    v-model:open="modalOpen" :title="editing ? 'Sửa cổ đông' : 'Thêm cổ đông'"
    :width="560" @ok="saveForm" ok-text="Lưu" cancel-text="Hủy"
    :confirm-loading="form.processing" centered destroy-on-close class="crm-modal"
  >
    <div class="space-y-4 mt-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Chọn nhân viên <span class="text-red-500">*</span></label>
        <a-select
          v-model:value="form.user_id"
          placeholder="Chọn nhân viên công ty..."
          size="large"
          show-search
          option-filter-prop="label"
          style="width: 100%;"
          @change="handleEmployeeChange"
        >
          <a-select-option v-for="emp in props.employees" :key="emp.id" :value="emp.id" :label="emp.name">
            {{ emp.name }}
          </a-select-option>
        </a-select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tên cổ đông <span class="text-red-500">*</span></label>
        <a-input v-model:value="form.name" placeholder="Nguyễn Văn A" size="large" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Số cổ phiếu <span class="text-red-500">*</span></label>
          <a-input-number v-model:value="form.shares_count" :min="0" style="width: 100%;" size="large" @change="handleSharesChange" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tỷ lệ % <span class="text-red-500">*</span></label>
          <a-input-number v-model:value="form.share_percentage" :min="0" :max="100" style="width: 100%;" size="large" :precision="4" disabled />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Số tiền góp <span class="text-red-500">*</span></label>
          <a-input-number v-model:value="form.contributed_amount" :min="0" style="width: 100%;" size="large"
            :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
            :parser="v => v.replace(/,/g, '')" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ngày góp vốn</label>
          <a-date-picker v-model:value="formDate" style="width: 100%;" size="large" format="DD/MM/YYYY" />
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
        <div v-if="editing">
          <label class="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
          <a-select v-model:value="form.status" size="large" style="width: 100%;">
            <a-select-option value="active">Hoạt động</a-select-option>
            <a-select-option value="inactive">Ngừng</a-select-option>
          </a-select>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
        <a-textarea v-model:value="form.notes" :rows="2" placeholder="Ghi chú thêm..." />
      </div>
    </div>
  </a-modal>

  <!-- ═══ Issue Stock Modal ═══ -->
  <a-modal
    v-model:open="issueModalOpen" title="Phát hành thêm cổ phiếu"
    :width="480" @ok="saveIssueForm" ok-text="Phát hành" cancel-text="Hủy"
    :confirm-loading="issueForm.processing" centered destroy-on-close class="crm-modal"
  >
    <div class="space-y-4 mt-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Ngày phát hành <span class="text-red-500">*</span></label>
        <a-date-picker v-model:value="issueFormDate" style="width: 100%;" size="large" format="DD/MM/YYYY" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Số lượng cổ phiếu phát hành <span class="text-red-500">*</span></label>
        <a-input-number v-model:value="issueForm.shares_count" :min="1" style="width: 100%;" size="large" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Mệnh giá phát hành (đ/CP) <span class="text-red-500">*</span></label>
        <a-input-number v-model:value="issueForm.share_price" :min="1" style="width: 100%;" size="large"
          :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
          :parser="v => v.replace(/,/g, '')" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả / Mục đích phát hành</label>
        <a-textarea v-model:value="issueForm.description" :rows="2" placeholder="Ví dụ: Phát hành cổ phiếu đợt 2 tăng vốn điều lệ..." />
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, router, useForm } from '@inertiajs/vue3'
import dayjs from 'dayjs'
import { Bar, Doughnut } from 'vue-chartjs'
import { message } from 'ant-design-vue'
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

const props = defineProps({
  shareholders: Array,
  totalCapital: Number,
  employees: Array,
  shareIssuances: Array,
  totalShares: Number,
  sharePrice: Number
})

const { defaultOptions, doughnutOptions } = useChart()

const activeTab = ref('shareholders')

const fmtCurrency = (v) => {
  if (!v && v !== 0) return '0₫'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)
}
const fmtDate = (d) => d ? dayjs(d).format('DD/MM/YYYY') : '—'
const fmtNumber = (v) => {
  if (!v && v !== 0) return '0'
  return new Intl.NumberFormat('vi-VN').format(v)
}

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

// Table Columns
const columns = [
  { title: 'Cổ đông', key: 'name', dataIndex: 'name', width: 200 },
  { title: 'Số cổ phiếu', key: 'shares_count', dataIndex: 'shares_count', width: 130, align: 'right' },
  { title: 'Số tiền góp', key: 'amount', dataIndex: 'contributed_amount', width: 150, align: 'right' },
  { title: 'Tỷ lệ cổ phần', key: 'share', dataIndex: 'share_percentage', width: 160 },
  { title: 'Ngày góp', key: 'date', dataIndex: 'contribution_date', width: 110 },
  { title: 'TT', key: 'status', dataIndex: 'status', width: 90 },
  { title: '', key: 'actions', width: 80, fixed: 'right' },
]

const issuanceColumns = [
  { title: 'Mã đợt', key: 'id', dataIndex: 'id', width: 80 },
  { title: 'Ngày phát hành', key: 'issue_date', dataIndex: 'issue_date', width: 140 },
  { title: 'Số lượng cổ phiếu', key: 'shares_count', dataIndex: 'shares_count', width: 160, align: 'right' },
  { title: 'Mệnh giá (đ/CP)', key: 'share_price', dataIndex: 'share_price', width: 150, align: 'right' },
  { title: 'Tổng giá trị phát hành', key: 'total_value', width: 180, align: 'right' },
  { title: 'Người thực hiện', key: 'creator', width: 150 },
  { title: 'Mô tả / Ghi chú', key: 'description', dataIndex: 'description' },
]

// Form & Modal Controls
const modalOpen = ref(false)
const editing = ref(null)
const formDate = ref(null)
const form = useForm({
  user_id: null,
  name: '',
  shares_count: 0,
  share_percentage: 0,
  contributed_amount: 0,
  phone: '',
  email: '',
  id_number: '',
  contribution_date: '',
  status: 'active',
  notes: ''
})

const openCreateModal = () => {
  editing.value = null
  form.reset()
  formDate.value = dayjs()
  modalOpen.value = true
}

const openEditModal = (r) => {
  editing.value = r
  Object.assign(form, {
    user_id: r.user_id || null,
    name: r.name,
    shares_count: parseInt(r.shares_count) || 0,
    share_percentage: parseFloat(r.share_percentage) || 0,
    contributed_amount: parseFloat(r.contributed_amount) || 0,
    phone: r.phone || '',
    email: r.email || '',
    id_number: r.id_number || '',
    status: r.status,
    notes: r.notes || ''
  })
  formDate.value = r.contribution_date ? dayjs(r.contribution_date) : null
  modalOpen.value = true
}

const handleEmployeeChange = (val) => {
  const emp = props.employees.find(e => e.id === val)
  if (emp) {
    form.name = emp.name
    form.phone = emp.phone || ''
    form.email = emp.email || ''
  }
}

const handleSharesChange = (val) => {
  const shares = parseInt(val) || 0
  if (props.totalShares > 0) {
    form.share_percentage = parseFloat(((shares / props.totalShares) * 100).toFixed(4))
  } else {
    form.share_percentage = 0
  }
  form.contributed_amount = shares * props.sharePrice
}

const saveForm = () => {
  form.contribution_date = formDate.value ? formDate.value.format('YYYY-MM-DD') : ''
  if (editing.value) {
    form.put(`/operations/shareholders/${editing.value.id}`, {
      preserveScroll: true,
      onSuccess: () => {
        modalOpen.value = false
        message.success('Đã cập nhật cổ đông thành công.')
      }
    })
  } else {
    form.post('/operations/shareholders', {
      preserveScroll: true,
      onSuccess: () => {
        modalOpen.value = false
        message.success('Đã thêm cổ đông thành công.')
      }
    })
  }
}

const deleteShareholder = (id) => {
  router.delete(`/operations/shareholders/${id}`, {
    preserveScroll: true,
    onSuccess: () => {
      message.success('Đã xóa cổ đông thành công.')
    }
  })
}

// Share Issuance Form
const issueModalOpen = ref(false)
const issueFormDate = ref(dayjs())
const issueForm = useForm({
  issue_date: '',
  shares_count: 100000,
  share_price: 10000,
  description: ''
})

const openIssueModal = () => {
  issueForm.reset()
  issueForm.share_price = props.sharePrice || 10000
  issueFormDate.value = dayjs()
  issueModalOpen.value = true
}

const saveIssueForm = () => {
  issueForm.issue_date = issueFormDate.value ? issueFormDate.value.format('YYYY-MM-DD') : ''
  issueForm.post('/operations/shareholders/issue', {
    preserveScroll: true,
    onSuccess: () => {
      issueModalOpen.value = false
      message.success('Đã phát hành thêm cổ phiếu thành công.')
    }
  })
}
</script>
