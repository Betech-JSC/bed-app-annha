<template>
  <Head title="Kho thiết bị" />

  <PageHeader title="Kho thiết bị" subtitle="Quản lý mua sắm, tồn kho và theo dõi tình trạng sử dụng">
    <template #actions>
      <a-button type="primary" size="large" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Tạo tài sản
      </a-button>
    </template>
  </PageHeader>

  <div class="crm-stats-grid">
    <StatCard label="Tổng tài sản" :value="stats.total" icon="ToolOutlined" variant="primary" />
    <StatCard label="Nháp / Chờ duyệt" :value="stats.draft + stats.pending" icon="ClockCircleOutlined" variant="warning" />
    <StatCard label="Trong kho" :value="stats.available" icon="CheckCircleOutlined" variant="success" />
    <StatCard label="Đang sử dụng" :value="stats.in_use" icon="ThunderboltOutlined" variant="primary" />
  </div>

  <div class="crm-content-card">
    <!-- Tabs Header -->
    <a-tabs v-model:activeKey="filters.tab" @change="handleTabChange" class="px-4 pt-2 border-b border-gray-100" :tabBarGutter="32">
      <a-tab-pane key="approvals" tab="Phiếu duyệt mua" />
      <a-tab-pane key="assets" tab="Danh sách tài sản" />
    </a-tabs>

    <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-4 flex-wrap bg-gray-50/30">
      <a-input-search v-model:value="filters.search" placeholder="Tìm thiết bị..." class="max-w-xs" allow-clear @search="applyFilters" @change="debounceSearch" />
      <a-select v-model:value="filters.status" placeholder="Tất cả trạng thái" allow-clear style="width: 180px" @change="applyFilters">
        <template v-if="filters.tab === 'approvals'">
          <a-select-option value="draft">Nháp</a-select-option>
          <a-select-option value="pending_management">Chờ BĐH</a-select-option>
          <a-select-option value="pending_accountant">Chờ KT</a-select-option>
          <a-select-option value="rejected">Từ chối</a-select-option>
        </template>
        <template v-else>
          <a-select-option value="available">Trong kho</a-select-option>
          <a-select-option value="in_use">Đang sử dụng</a-select-option>
          <a-select-option value="maintenance">Bảo trì</a-select-option>
          <a-select-option value="retired">Thanh lý</a-select-option>
        </template>
      </a-select>
    </div>

    <a-table :columns="columns" :data-source="equipment.data" :pagination="{ current: equipment.current_page, total: equipment.total, pageSize: equipment.per_page, showTotal: (t) => `${t} tài sản` }" :loading="loading" row-key="id" size="small" class="crm-table" @change="handleTableChange">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div class="flex items-center gap-3 cursor-pointer" @click="openDetail(record)">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-sm" :style="{ background: categoryGradients[record.category] || '#9CA3AF' }">
              {{ categoryIcons[record.category] || '📦' }}
            </div>
            <div>
              <div class="font-bold text-gray-800 hover:text-blue-600 transition-colors">{{ record.name }}</div>
              <div class="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{{ record.code || 'NO-CODE' }} {{ record.serial_number ? `• SN: ${record.serial_number}` : '' }}</div>
            </div>
          </div>
        </template>
        <template v-else-if="column.key === 'category'">
          <a-tag color="blue" class="rounded-lg border-none bg-blue-50 text-blue-600 font-medium px-2 py-0.5 text-[11px]">{{ categoryLabels[record.category] || record.category || 'Chưa phân loại' }}</a-tag>
        </template>
        <template v-else-if="column.key === 'qty_price'">
          <div class="text-right">
            <div class="font-bold text-gray-700">{{ record.quantity || 1 }} <span class="text-[10px] text-gray-400 font-normal uppercase">{{ record.unit || 'cái' }}</span></div>
            <div class="text-[11px] text-gray-400">{{ formatCurrency(record.purchase_price) }}/đv</div>
          </div>
        </template>
        <template v-else-if="column.key === 'total'">
          <div class="text-right">
            <span class="font-extra-bold text-emerald-600 text-sm">{{ formatCurrency((record.quantity || 1) * (record.purchase_price || 0)) }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'status'">
          <div class="flex justify-center">
            <a-tag :color="statusColors[record.status]" class="rounded-full px-3 py-0.5 text-[11px] font-bold border-none">
              {{ statusLabels[record.status] || record.status }}
            </a-tag>
          </div>
        </template>
        <template v-else-if="column.key === 'creator'">
          <div class="flex flex-col items-center">
            <a-avatar :size="20" class="bg-indigo-50 text-indigo-500 mb-0.5" style="border: 1px solid #E0E7FF">
              {{ record.creator?.name?.charAt(0) || '?' }}
            </a-avatar>
            <span class="text-[10px] text-gray-500">{{ record.creator?.name || '—' }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="flex justify-center">
            <a-button type="text" size="small" class="hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg" @click="openDetail(record)">
              <EyeOutlined />
            </a-button>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- CREATE/EDIT MODAL -->
  <a-modal v-model:open="showModal" :title="editing ? 'Chỉnh sửa tài sản' : 'Tạo tài sản mới'" :width="680" @ok="handleSubmit" @cancel="resetForm" ok-text="Lưu" cancel-text="Hủy" class="crm-modal" centered destroy-on-close>
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="16"><a-form-item label="Tên tài sản" required><a-input v-model:value="form.name" size="large" placeholder="VD: Máy xúc Komatsu PC200" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Mã tài sản"><a-input v-model:value="form.code" size="large" placeholder="VD: TS-001" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Loại"><a-input v-model:value="form.category" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Hãng"><a-input v-model:value="form.brand" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Model"><a-input v-model:value="form.model" size="large" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Số lượng"><a-input-number v-model:value="form.quantity" :min="1" class="w-full" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Đơn giá"><a-input-number v-model:value="form.purchase_price" :min="0" class="w-full" size="large" :formatter="(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Thành tiền">
          <div class="h-10 flex items-center font-bold text-emerald-600 text-lg">{{ formatCurrency((form.quantity || 1) * (form.purchase_price || 0)) }}</div>
        </a-form-item></a-col>
      </a-row>
      <a-form-item label="Chứng từ (Hóa đơn, Hợp đồng...)">
        <a-upload
          :file-list="fileList" 
          :before-upload="beforeUpload"
          @remove="handleRemoveFile"
          multiple
        >
          <a-button><UploadOutlined /> Chọn tệp</a-button>
        </a-upload>
      </a-form-item>
      <a-form-item label="Ghi chú"><a-textarea v-model:value="form.notes" :rows="2" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- DETAIL DRAWER -->
  <a-drawer v-model:open="showDetailDrawer" title="Chi tiết Tài sản" :width="560" @close="selectedItem = null" destroy-on-close class="crm-drawer">
    <div v-if="selectedItem" class="space-y-6 pb-24">
      <!-- Header -->
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100">🏗️</div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Mã: {{ selectedItem.code || `#${selectedItem.id}` }}</div>
            <div class="text-lg font-bold text-gray-800">{{ selectedItem.name }}</div>
          </div>
        </div>
        <a-tag :color="statusColors[selectedItem.status]" class="rounded-full px-4 py-1 text-xs font-semibold">{{ statusLabels[selectedItem.status] || selectedItem.status }}</a-tag>
      </div>

      <!-- Rejection reason -->
      <div v-if="selectedItem.status === 'rejected' && selectedItem.rejection_reason" class="p-4 bg-red-50 rounded-2xl border border-red-100">
        <div class="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Lý do từ chối</div>
        <div class="text-sm text-red-700">{{ selectedItem.rejection_reason }}</div>
      </div>

      <!-- Info -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><InfoCircleOutlined /> Thông tin tài sản</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50"><span class="text-gray-400">Loại</span><span class="font-semibold">{{ selectedItem.category || '—' }}</span></div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50"><span class="text-gray-400">Hãng / Model</span><span class="font-semibold">{{ [selectedItem.brand, selectedItem.model].filter(Boolean).join(' / ') || '—' }}</span></div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50"><span class="text-gray-400">Số lượng</span><span class="font-semibold">{{ selectedItem.quantity || 1 }}</span></div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50"><span class="text-gray-400">Đơn giá</span><span class="font-semibold">{{ formatCurrency(selectedItem.purchase_price) }}</span></div>
          <div class="flex justify-between items-center py-2.5"><span class="text-gray-400">Thành tiền</span><span class="font-bold text-emerald-600 text-lg">{{ formatCurrency((selectedItem.quantity || 1) * (selectedItem.purchase_price || 0)) }}</span></div>
        </div>
      </div>

      <!-- Approval stepper -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-indigo-500"><SafetyCertificateOutlined /> Luồng duyệt</div>
        <a-steps :current="stepperCurrent(selectedItem)" size="small" class="mb-2" direction="vertical">
          <a-step title="Người lập tạo" :description="selectedItem.creator?.name || '—'" />
          <a-step title="BĐH duyệt" :description="selectedItem.approver ? `${selectedItem.approver.name} — ${fmtDate(selectedItem.approved_at)}` : 'Chờ duyệt'" />
          <a-step title="KT xác nhận chi & nhập kho" :description="selectedItem.confirmer ? `${selectedItem.confirmer.name} — ${fmtDate(selectedItem.confirmed_at)}` : 'Chờ xác nhận'" />
        </a-steps>
      </div>

      <!-- Attachments -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-gray-400"><FileOutlined /> Chứng từ đính kèm ({{ selectedItem.attachments?.length || 0 }})</div>
        <div v-if="selectedItem.attachments?.length" class="space-y-2">
          <!-- Image previews -->
          <div v-if="imageAttachments.length" class="grid grid-cols-3 gap-2 mb-3">
            <div v-for="file in imageAttachments" :key="file.id" class="relative group cursor-pointer rounded-xl overflow-hidden border border-gray-100 aspect-square" @click="previewImage(file)">
              <img :src="`/storage/${file.file_path}`" :alt="file.original_name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <EyeOutlined class="text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
          <!-- Non-image files -->
          <a v-for="file in nonImageAttachments" :key="file.id" :href="`/storage/${file.file_path}`" target="_blank" class="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 group hover:border-blue-200 transition-colors cursor-pointer">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center text-lg bg-blue-50 text-blue-500">
                <FileOutlined />
              </div>
              <div>
                <div class="text-xs font-medium text-gray-700 truncate max-w-[260px]">{{ file.original_name }}</div>
              </div>
            </div>
            <DownloadOutlined class="text-gray-300 group-hover:text-blue-500 transition-colors" />
          </a>
        </div>
        <a-empty v-else :image="null" description="Không có chứng từ" class="my-0" />
      </div>

      <!-- Image Preview Modal -->
      <a-modal v-model:open="imagePreviewVisible" :footer="null" :width="720" centered destroy-on-close>
        <img v-if="imagePreviewUrl" :src="imagePreviewUrl" style="width: 100%; border-radius: 12px;" />
      </a-modal>

      <!-- Fixed action bar -->
      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-between items-center z-20">
        <div>
          <a-popconfirm v-if="selectedItem.status === 'draft'" title="Xóa tài sản này?" @confirm="deleteItem(selectedItem); showDetailDrawer = false">
            <a-button danger size="small"><DeleteOutlined /> Xóa</a-button>
          </a-popconfirm>
        </div>
        <div class="flex gap-2">
          <a-button @click="showDetailDrawer = false">Đóng</a-button>
          <a-button v-if="selectedItem.status === 'draft'" @click="openEditModal(selectedItem)"><EditOutlined /> Sửa</a-button>
          <a-button v-if="selectedItem.status === 'draft'" type="primary" @click="submitItem(selectedItem)"><SendOutlined /> Gửi duyệt</a-button>
          <a-button v-if="selectedItem.status === 'pending_management' && can('equipment.approve')" type="primary" class="!bg-green-500 !border-green-500 hover:!bg-green-600" @click="approveItem(selectedItem)"><CheckCircleOutlined /> BĐH Duyệt</a-button>
          <a-button v-if="selectedItem.status === 'pending_accountant' && can('cost.approve.accountant')" type="primary" @click="confirmItem(selectedItem)"><CheckSquareOutlined /> KT Xác nhận & Nhập kho</a-button>
          <a-popconfirm v-if="['pending_management','pending_accountant'].includes(selectedItem.status)" title="Từ chối tài sản này?" @confirm="rejectItem(selectedItem)">
            <template #description>
              <a-input v-model:value="rejectReason" placeholder="Nhập lý do từ chối..." class="mt-2" />
            </template>
            <a-button danger>Từ chối</a-button>
          </a-popconfirm>
          <a-button v-if="['pending_management', 'pending_accountant', 'rejected'].includes(selectedItem.status) && can('equipment.revert')" danger ghost @click="revertItem(selectedItem)">Hoàn duyệt</a-button>
        </div>
      </div>
    </div>
  </a-drawer>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, useForm, router, usePage } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UploadOutlined, SendOutlined, CheckCircleOutlined, CheckSquareOutlined, InfoCircleOutlined, SafetyCertificateOutlined, FileOutlined, DownloadOutlined } from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })
const props = defineProps({ equipment: Object, stats: Object, filters: Object })

// Permission helper
const can = (perm) => {
  const user = usePage().props.auth?.user
  if (user?.super_admin) return true
  return user?.permissions?.includes(perm) || user?.permissions?.includes('*') || false
}

const loading = ref(false)
const showModal = ref(false)
const showDetailDrawer = ref(false)
const editing = ref(null)
const selectedItem = ref(null)
const rejectReason = ref('')
const fileList = ref([])
const imagePreviewVisible = ref(false)
const imagePreviewUrl = ref('')
const filters = ref({ 
  search: props.filters?.search || '', 
  status: props.filters?.status || undefined,
  tab: props.filters?.tab || 'approvals' 
})

const columns = [
  { title: 'Tài sản', key: 'name', width: 260 },
  { title: 'Loại', dataIndex: 'category', width: 100 },
  { title: 'SL × Đơn giá', key: 'qty_price', align: 'right', width: 140 },
  { title: 'Thành tiền', key: 'total', align: 'right', width: 150 },
  { title: 'Trạng thái', key: 'status', width: 140, align: 'center' },
  { title: 'Người lập', key: 'creator', width: 130 },
  { title: '', key: 'actions', width: 60, align: 'center' },
]

const statusLabels = {
  draft: 'Nháp', pending_management: 'Chờ BĐH', pending_accountant: 'Chờ KT',
  available: 'Trong kho', in_use: 'Đang dùng', maintenance: 'Bảo trì',
  retired: 'Thanh lý', rejected: 'Từ chối',
}
const statusColors = {
  draft: 'default', pending_management: 'orange', pending_accountant: 'blue',
  available: 'green', in_use: 'geekblue', maintenance: 'volcano',
  retired: 'default', rejected: 'red',
}
const categoryLabels = { computer: 'Máy tính / CNTT', machinery: 'Máy móc thi công', vehicle: 'Xe công ty', furniture: 'Nội thất VP', other: 'Khác' }
const categoryIcons = { computer: '💻', machinery: '🏗️', vehicle: '🚗', furniture: '🪑', other: '📦' }
const categoryGradients = { computer: 'linear-gradient(135deg, #2E86C1, #1B4F72)', machinery: 'linear-gradient(135deg, #E67E22, #D68910)', vehicle: 'linear-gradient(135deg, #1D8348, #27AE60)', furniture: 'linear-gradient(135deg, #8E44AD, #6C3483)', other: 'linear-gradient(135deg, #9CA3AF, #6B7280)' }

const stepperCurrent = (item) => {
  const map = { draft: 0, rejected: 0, pending_management: 1, pending_accountant: 2, available: 3, in_use: 3 }
  return map[item.status] ?? 0
}

let searchTimeout = null
const debounceSearch = () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => applyFilters(), 400) }
const applyFilters = () => { loading.value = true; router.get('/equipment', { search: filters.value.search || undefined, status: filters.value.status || undefined, tab: filters.value.tab }, { preserveState: true, replace: true, onFinish: () => loading.value = false }) }
const handleTableChange = (p) => { loading.value = true; router.get('/equipment', { page: p.current, ...filters.value }, { preserveState: true, replace: true, onFinish: () => loading.value = false }) }
const handleTabChange = () => {
  filters.value.status = undefined; // Reset status filter when switching tabs
  applyFilters();
}

// Form
const form = useForm({ name: '', code: '', category: '', brand: '', model: '', quantity: 1, purchase_price: null, notes: '' })

const openCreateModal = () => { editing.value = null; form.reset(); fileList.value = []; showModal.value = true }
const openEditModal = (e) => {
  editing.value = e;
  Object.assign(form, { name: e.name, code: e.code || '', category: e.category || '', brand: e.brand || '', model: e.model || '', quantity: e.quantity || 1, purchase_price: e.purchase_price, notes: e.notes || '' })
  fileList.value = []
  showDetailDrawer.value = false
  showModal.value = true
}

const beforeUpload = (file) => {
  fileList.value = [...fileList.value, file]
  return false // prevent auto upload
}
const handleRemoveFile = (file) => {
  fileList.value = fileList.value.filter(f => f.uid !== file.uid)
}

const handleSubmit = () => {
  const formData = new FormData()
  Object.entries(form.data()).forEach(([k, v]) => { if (v !== null && v !== '') formData.append(k, v) })
  fileList.value.forEach((f) => formData.append('attachments[]', f))

  if (editing.value) {
    formData.append('_method', 'PUT')
    router.post(`/equipment/${editing.value.id}`, formData, { forceFormData: true, onSuccess: () => { showModal.value = false; resetForm() } })
  } else {
    router.post('/equipment', formData, { forceFormData: true, onSuccess: () => { showModal.value = false; resetForm() } })
  }
}

const resetForm = () => { editing.value = null; form.reset(); fileList.value = [] }

// Detail
const openDetail = (item) => { selectedItem.value = item; showDetailDrawer.value = true }

// Workflow actions
const submitItem = (e) => router.post(`/equipment/${e.id}/submit`, {}, { preserveScroll: true })
const approveItem = (e) => router.post(`/equipment/${e.id}/approve-management`, {}, { preserveScroll: true })
const confirmItem = (e) => router.post(`/equipment/${e.id}/confirm-accountant`, {}, { preserveScroll: true })
const rejectItem = (e) => router.post(`/equipment/${e.id}/reject`, { reason: rejectReason.value }, { preserveScroll: true, onSuccess: () => { rejectReason.value = ''; showDetailDrawer.value = false } })
const revertItem = (e) => router.post(`/equipment/${e.id}/revert`, {}, { preserveScroll: true, onSuccess: () => { showDetailDrawer.value = false } })
const deleteItem = (e) => router.delete(`/equipment/${e.id}`)

const formatCurrency = (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : ''

// Attachment helpers
const imageAttachments = computed(() => {
  if (!selectedItem.value?.attachments) return []
  return selectedItem.value.attachments.filter(f => f.mime_type && f.mime_type.startsWith('image/'))
})
const nonImageAttachments = computed(() => {
  if (!selectedItem.value?.attachments) return []
  return selectedItem.value.attachments.filter(f => !f.mime_type || !f.mime_type.startsWith('image/'))
})
const previewImage = (file) => {
  imagePreviewUrl.value = `/storage/${file.file_path}`
  imagePreviewVisible.value = true
}
const formatFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<style scoped>
.crm-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
.crm-content-card { background: white; border-radius: 16px; border: 1px solid #E8ECF1; overflow: hidden; }
.crm-table :deep(.ant-table-thead > tr > th) { background: #FAFBFC; font-weight: 600; font-size: 13px; color: #5D6B82; }
.crm-modal :deep(.ant-modal-content) { border-radius: 16px; }
.crm-drawer :deep(.ant-drawer-body) { padding: 16px; }
@media (max-width: 768px) { .crm-stats-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
