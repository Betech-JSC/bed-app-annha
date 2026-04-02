<template>
  <Head title="Quản lý tài sản" />

  <PageHeader title="Quản Lý Tài Sản" subtitle="Theo dõi tài sản cố định, QR Code và khấu hao tự động">
    <template #actions>
      <a-popconfirm title="Chạy khấu hao tháng này cho tất cả tài sản?" ok-text="Chạy" cancel-text="Hủy" @confirm="runDepreciation">
        <a-button size="large" class="rounded-xl">
          <template #icon><CalculatorOutlined /></template>
          Chạy khấu hao
        </a-button>
      </a-popconfirm>
      <a-button type="primary" size="large" class="rounded-xl" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Thêm tài sản
      </a-button>
    </template>
  </PageHeader>

  <!-- ═══ Stats ═══ -->
  <div class="crm-stats-grid">
    <StatCard :value="fmtCurrencyShort(stats.totalPurchase)" label="Tổng nguyên giá" :icon="DollarOutlined" variant="primary" format="text" />
    <StatCard :value="fmtCurrencyShort(stats.totalValue)" label="Giá trị hiện tại" :icon="FundOutlined" variant="success" format="text" />
    <StatCard :value="fmtCurrencyShort(stats.totalDepreciation)" label="Khấu hao lũy kế" :icon="FallOutlined" variant="danger" format="text" />
    <StatCard :value="Object.values(stats.counts || {}).reduce((s,v) => s+v, 0)" label="Tổng tài sản" :icon="ToolOutlined" variant="accent" />
  </div>

  <!-- ═══ Filters ═══ -->
  <div class="crm-content-card mb-6">
    <div class="crm-content-card__header" style="border-bottom: none; padding-bottom: 0;">
      <div class="flex flex-wrap items-center gap-3 w-full">
        <a-input-search v-model:value="localFilters.search" placeholder="Tìm tên, mã, SN..." style="width: 220px;" size="large" class="rounded-xl" allow-clear @search="applyFilters" @pressEnter="applyFilters" />
        <a-select v-model:value="localFilters.category" style="width: 170px;" size="large" @change="applyFilters" placeholder="Loại tài sản" allow-clear>
          <a-select-option value="">Tất cả loại</a-select-option>
          <a-select-option v-for="(label, key) in categoryLabels" :key="key" :value="key">{{ label }}</a-select-option>
        </a-select>
        <a-select v-model:value="localFilters.status" style="width: 150px;" size="large" @change="applyFilters" placeholder="Trạng thái" allow-clear>
          <a-select-option value="">Tất cả TT</a-select-option>
          <a-select-option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</a-select-option>
        </a-select>
        <!-- Status badges -->
        <div class="flex gap-2 ml-auto">
          <a-tag v-for="(cnt, st) in (stats.counts || {})" :key="st" :color="statusColors[st]" class="rounded-lg px-3 py-1">
            {{ statusLabels[st] }}: {{ cnt }}
          </a-tag>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ Table ═══ -->
  <div class="crm-content-card">
    <a-table :columns="columns" :data-source="assets.data" :pagination="false" row-key="id" class="crm-table" :scroll="{ x: 1200 }">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'asset'">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold" :style="{ background: categoryGradients[record.category] || '#9CA3AF' }">
              {{ categoryIcons[record.category] || '📦' }}
            </div>
            <div>
              <div class="font-semibold text-gray-800 text-sm">{{ record.name }}</div>
              <div class="text-xs text-gray-400 font-mono">{{ record.asset_code }}</div>
            </div>
          </div>
        </template>
        <template v-if="column.key === 'category'">
          <a-tag color="blue" class="rounded-lg text-xs">{{ categoryLabels[record.category] || record.category }}</a-tag>
        </template>
        <template v-if="column.key === 'value'">
          <div>
            <div class="font-bold text-sm" style="color: var(--crm-primary);">{{ fmtCurrency(record.current_value) }}</div>
            <div class="text-[10px] text-gray-400">Nguyên giá: {{ fmtCurrency(record.purchase_price) }}</div>
          </div>
        </template>
        <template v-if="column.key === 'depreciation'">
          <div>
            <a-progress :percent="depreciationPct(record)" :stroke-color="depreciationPct(record) > 80 ? '#E74C3C' : depreciationPct(record) > 50 ? '#F39C12' : '#1D8348'" size="small" :show-info="false" style="width: 80px;" />
            <div class="text-[10px] text-gray-500 mt-0.5">{{ depreciationPct(record) }}% đã hao mòn</div>
          </div>
        </template>
        <template v-if="column.key === 'status'">
          <a-tag :color="statusColors[record.status]" class="rounded-lg">{{ statusLabels[record.status] }}</a-tag>
          <div v-if="record.assigned_user" class="text-[10px] text-gray-500 mt-0.5">👤 {{ record.assigned_user.name }}</div>
          <div v-if="record.location" class="text-[10px] text-gray-400">📍 {{ record.location }}</div>
        </template>
        <template v-if="column.key === 'actions'">
          <div class="flex gap-1">
            <a-tooltip title="Gán / Chuyển"><a-button type="text" size="small" @click="openAssignModal(record)"><SwapOutlined style="color: #1B4F72;" /></a-button></a-tooltip>
            <a-tooltip title="Sửa"><a-button type="text" size="small" @click="openEditModal(record)"><EditOutlined /></a-button></a-tooltip>
            <a-popconfirm title="Xóa tài sản này?" ok-text="Xóa" cancel-text="Hủy" @confirm="deleteAsset(record.id)">
              <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>

    <div v-if="assets.last_page > 1" class="flex justify-center py-4 border-t border-gray-100">
      <a-pagination :current="assets.current_page" :total="assets.total" :page-size="assets.per_page" show-size-changer @change="(page) => router.visit(`/operations/assets?page=${page}&${buildQuery()}`)" />
    </div>
  </div>

  <!-- Empty -->
  <div v-if="!assets.data?.length" class="text-center py-16">
    <ToolOutlined style="font-size: 56px; color: #D1D5DB;" />
    <p class="mt-4 text-gray-400 text-base">Chưa có tài sản nào</p>
    <a-button type="primary" class="mt-3 rounded-xl" @click="openCreateModal">Thêm tài sản đầu tiên</a-button>
  </div>

  <!-- ═══ Create/Edit Modal ═══ -->
  <a-modal
    v-model:open="modalOpen" :title="editing ? 'Sửa tài sản' : 'Thêm tài sản'"
    :width="640" @ok="saveForm" ok-text="Lưu" cancel-text="Hủy"
    :confirm-loading="form.processing" centered destroy-on-close class="crm-modal"
  >
    <div class="space-y-4 mt-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tên tài sản <span class="text-red-500">*</span></label>
        <a-input v-model:value="form.name" placeholder="VD: MacBook Pro 16 inch" size="large" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Loại tài sản <span class="text-red-500">*</span></label>
          <a-select v-model:value="form.category" style="width: 100%;" size="large" placeholder="Chọn loại">
            <a-select-option v-for="(label, key) in categoryLabels" :key="key" :value="key">{{ label }}</a-select-option>
          </a-select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Thương hiệu</label>
          <a-input v-model:value="form.brand" placeholder="Apple, Dell..." size="large" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Giá mua <span class="text-red-500">*</span></label>
          <a-input-number v-model:value="form.purchase_price" :min="0" :step="1000000" style="width: 100%;" size="large"
            :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ngày mua <span class="text-red-500">*</span></label>
          <a-date-picker v-model:value="formDate" style="width: 100%;" size="large" format="DD/MM/YYYY" />
        </div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Thời hạn SD (tháng) <span class="text-red-500">*</span></label>
          <a-input-number v-model:value="form.useful_life_months" :min="1" :max="600" style="width: 100%;" size="large" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Giá trị còn lại min</label>
          <a-input-number v-model:value="form.residual_value" :min="0" style="width: 100%;" size="large"
            :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Số serial</label>
          <a-input v-model:value="form.serial_number" size="large" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Vị trí / Ghi chú</label>
        <a-input v-model:value="form.location" placeholder="VD: Văn phòng tầng 3" size="large" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
        <a-textarea v-model:value="form.description" :rows="2" placeholder="Mô tả chi tiết..." />
      </div>
      <!-- Preview depreciation -->
      <div v-if="form.purchase_price > 0 && form.useful_life_months > 0" class="p-4 rounded-xl bg-blue-50 border border-blue-100">
        <div class="text-sm font-semibold text-blue-700 mb-2">📊 Dự tính khấu hao (đường thẳng)</div>
        <div class="grid grid-cols-3 gap-3 text-center">
          <div>
            <div class="text-lg font-bold text-blue-800">{{ fmtCurrencyShort(monthlyDep) }}</div>
            <div class="text-xs text-blue-500">Hàng tháng</div>
          </div>
          <div>
            <div class="text-lg font-bold text-blue-800">{{ fmtCurrencyShort(monthlyDep * 12) }}</div>
            <div class="text-xs text-blue-500">Hàng năm</div>
          </div>
          <div>
            <div class="text-lg font-bold text-blue-800">{{ (form.useful_life_months / 12).toFixed(1) }} năm</div>
            <div class="text-xs text-blue-500">Thời hạn SD</div>
          </div>
        </div>
      </div>
    </div>
  </a-modal>

  <!-- ═══ Assign Modal ═══ -->
  <a-modal
    v-model:open="assignOpen" title="Gán / Chuyển tài sản" :width="480"
    @ok="saveAssign" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal"
  >
    <div v-if="assigningAsset" class="space-y-4 mt-4">
      <div class="p-3 rounded-xl bg-gray-50 text-sm">
        <span class="font-semibold">{{ assigningAsset.name }}</span>
        <span class="text-gray-400 ml-2">{{ assigningAsset.asset_code }}</span>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Hành động <span class="text-red-500">*</span></label>
        <a-select v-model:value="assignForm.action" style="width: 100%;" size="large">
          <a-select-option value="assign">📤 Gán cho nhân viên</a-select-option>
          <a-select-option value="return">📥 Thu hồi về kho</a-select-option>
          <a-select-option value="transfer">🔄 Chuyển vị trí</a-select-option>
          <a-select-option value="repair">🔧 Gửi sửa chữa</a-select-option>
          <a-select-option value="dispose">🗑️ Thanh lý</a-select-option>
        </a-select>
      </div>
      <div v-if="['assign', 'transfer'].includes(assignForm.action)">
        <label class="block text-sm font-medium text-gray-700 mb-1">Người sử dụng</label>
        <a-select v-model:value="assignForm.user_id" style="width: 100%;" size="large" placeholder="Chọn nhân viên" allow-clear show-search :filter-option="filterOption">
          <a-select-option v-for="u in users" :key="u.id" :value="u.id" :label="u.name">{{ u.name }}</a-select-option>
        </a-select>
      </div>
      <div v-if="['assign', 'transfer'].includes(assignForm.action)">
        <label class="block text-sm font-medium text-gray-700 mb-1">Dự án</label>
        <a-select v-model:value="assignForm.project_id" style="width: 100%;" size="large" placeholder="Chọn dự án" allow-clear show-search :filter-option="filterOption">
          <a-select-option v-for="p in projects" :key="p.id" :value="p.id" :label="p.name">{{ p.name }}</a-select-option>
        </a-select>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Vị trí</label>
        <a-input v-model:value="assignForm.location" placeholder="VD: Công trình ABC, tầng 2" size="large" />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
        <a-textarea v-model:value="assignForm.notes" :rows="2" placeholder="Lý do gán/chuyển..." />
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Head, router, useForm } from '@inertiajs/vue3'
import dayjs from 'dayjs'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import {
  PlusOutlined, DollarOutlined, FundOutlined, FallOutlined, ToolOutlined,
  EditOutlined, DeleteOutlined, SwapOutlined, CalculatorOutlined,
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({ assets: Object, stats: Object, users: Array, projects: Array, filters: Object })

// Constants
const categoryLabels = { computer: 'Máy tính / CNTT', machinery: 'Máy móc thi công', vehicle: 'Xe công ty', furniture: 'Nội thất VP', other: 'Khác' }
const categoryIcons = { computer: '💻', machinery: '🏗️', vehicle: '🚗', furniture: '🪑', other: '📦' }
const categoryGradients = { computer: 'linear-gradient(135deg, #2E86C1, #1B4F72)', machinery: 'linear-gradient(135deg, #E67E22, #D68910)', vehicle: 'linear-gradient(135deg, #1D8348, #27AE60)', furniture: 'linear-gradient(135deg, #8E44AD, #6C3483)', other: 'linear-gradient(135deg, #9CA3AF, #6B7280)' }
const statusLabels = { in_stock: 'Trong kho', in_use: 'Đang sử dụng', under_repair: 'Đang sửa chữa', disposed: 'Đã thanh lý' }
const statusColors = { in_stock: 'blue', in_use: 'green', under_repair: 'orange', disposed: 'default' }

// Format
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

const depreciationPct = (record) => {
  if (!record.purchase_price || record.purchase_price <= 0) return 0
  return Math.min(100, Math.round((parseFloat(record.accumulated_depreciation || 0) / parseFloat(record.purchase_price)) * 100))
}

const filterOption = (input, option) => option.label?.toLowerCase().includes(input.toLowerCase())

// Filters
const localFilters = reactive({ ...props.filters })
const buildQuery = () => {
  const params = new URLSearchParams()
  if (localFilters.search) params.set('search', localFilters.search)
  if (localFilters.category) params.set('category', localFilters.category)
  if (localFilters.status) params.set('status', localFilters.status)
  return params.toString()
}
const applyFilters = () => router.visit(`/operations/assets?${buildQuery()}`, { preserveState: true })

// Table
const columns = [
  { title: 'Tài sản', key: 'asset', dataIndex: 'name', width: 280 },
  { title: 'Loại', key: 'category', dataIndex: 'category', width: 140 },
  { title: 'Giá trị', key: 'value', dataIndex: 'current_value', width: 180, align: 'right' },
  { title: 'Khấu hao', key: 'depreciation', width: 150 },
  { title: 'Trạng thái', key: 'status', dataIndex: 'status', width: 140 },
  { title: '', key: 'actions', width: 120, fixed: 'right' },
]

// Create/Edit Form
const modalOpen = ref(false)
const editing = ref(null)
const formDate = ref(null)
const form = useForm({
  name: '', category: 'computer', purchase_price: 0, purchase_date: '',
  useful_life_months: 36, residual_value: 0, serial_number: '',
  brand: '', location: '', description: '',
})

const monthlyDep = computed(() => {
  if (!form.purchase_price || !form.useful_life_months) return 0
  return Math.round((form.purchase_price - (form.residual_value || 0)) / form.useful_life_months)
})

const openCreateModal = () => {
  editing.value = null; form.reset()
  form.category = 'computer'; form.useful_life_months = 36
  formDate.value = dayjs(); modalOpen.value = true
}

const openEditModal = (r) => {
  editing.value = r
  Object.assign(form, {
    name: r.name, category: r.category, purchase_price: parseFloat(r.purchase_price),
    useful_life_months: r.useful_life_months, residual_value: parseFloat(r.residual_value || 0),
    serial_number: r.serial_number || '', brand: r.brand || '',
    location: r.location || '', description: r.description || '',
  })
  formDate.value = r.purchase_date ? dayjs(r.purchase_date) : null
  modalOpen.value = true
}

const saveForm = () => {
  form.purchase_date = formDate.value ? formDate.value.format('YYYY-MM-DD') : ''
  if (editing.value) {
    form.put(`/operations/assets/${editing.value.id}`, { preserveScroll: true, onSuccess: () => { modalOpen.value = false } })
  } else {
    form.post('/operations/assets', { preserveScroll: true, onSuccess: () => { modalOpen.value = false } })
  }
}

const deleteAsset = (id) => router.delete(`/operations/assets/${id}`, { preserveScroll: true })

// Assign Modal
const assignOpen = ref(false)
const assigningAsset = ref(null)
const assignForm = reactive({ action: 'assign', user_id: null, project_id: null, location: '', notes: '' })

const openAssignModal = (asset) => {
  assigningAsset.value = asset
  Object.assign(assignForm, { action: 'assign', user_id: null, project_id: null, location: '', notes: '' })
  assignOpen.value = true
}

const saveAssign = () => {
  router.post(`/operations/assets/${assigningAsset.value.id}/assign`, { ...assignForm }, {
    preserveScroll: true,
    onSuccess: () => { assignOpen.value = false },
  })
}

const runDepreciation = () => router.post('/operations/assets/run-depreciation', {}, { preserveScroll: true })
</script>
