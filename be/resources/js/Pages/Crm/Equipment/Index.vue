<template>
  <Head title="Quản lý thiết bị" />

  <PageHeader title="Quản lý thiết bị" subtitle="Thiết bị, máy móc và phương tiện thi công">
    <template #actions>
      <a-button type="primary" size="large" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Thêm thiết bị
      </a-button>
    </template>
  </PageHeader>

  <div class="crm-stats-grid">
    <StatCard label="Tổng thiết bị" :value="stats.total" icon="ToolOutlined" variant="primary" />
    <StatCard label="Sẵn sàng" :value="stats.available" icon="CheckCircleOutlined" variant="success" />
    <StatCard label="Đang sử dụng" :value="stats.in_use" icon="ThunderboltOutlined" variant="warning" />
    <StatCard label="Bảo trì" :value="stats.maintenance" icon="SettingOutlined" variant="primary" />
  </div>

  <div class="crm-content-card">
    <div class="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
      <a-input-search v-model:value="filters.search" placeholder="Tìm thiết bị..." class="max-w-xs" allow-clear @search="applyFilters" @change="debounceSearch" />
      <a-select v-model:value="filters.status" placeholder="Trạng thái" allow-clear style="width: 160px" @change="applyFilters">
        <a-select-option value="available">Sẵn sàng</a-select-option>
        <a-select-option value="in_use">Đang sử dụng</a-select-option>
        <a-select-option value="maintenance">Bảo trì</a-select-option>
        <a-select-option value="retired">Thanh lý</a-select-option>
      </a-select>
    </div>

    <a-table :columns="columns" :data-source="equipment.data" :pagination="{ current: equipment.current_page, total: equipment.total, pageSize: equipment.per_page, showTotal: (t) => `${t} thiết bị` }" :loading="loading" row-key="id" size="small" class="crm-table" @change="handleTableChange">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div><div class="font-semibold">{{ record.name }}</div><div class="text-xs text-gray-400">{{ record.code }} {{ record.serial_number ? `| SN: ${record.serial_number}` : '' }}</div></div>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="eqStatusColors[record.status]" class="rounded-full">{{ eqStatusLabels[record.status] || record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'price'">{{ formatCurrency(record.purchase_price) }}</template>
        <template v-else-if="column.key === 'actions'">
          <div class="flex items-center gap-1">
            <a-button type="text" size="small" @click="openEditModal(record)"><template #icon><EditOutlined /></template></a-button>
            <a-popconfirm title="Xóa thiết bị?" @confirm="deleteEq(record)">
              <a-button type="text" size="small" danger><template #icon><DeleteOutlined /></template></a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- Modal -->
  <a-modal v-model:open="showModal" :title="editing ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới'" :width="680" @ok="handleSubmit" @cancel="resetForm" ok-text="Lưu" cancel-text="Hủy" class="crm-modal" centered destroy-on-close>
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="16"><a-form-item label="Tên thiết bị" required><a-input v-model:value="form.name" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Mã"><a-input v-model:value="form.code" size="large" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Loại"><a-input v-model:value="form.category" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Hãng"><a-input v-model:value="form.brand" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Model"><a-input v-model:value="form.model" size="large" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Số lượng"><a-input-number v-model:value="form.quantity" :min="1" class="w-full" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Giá mua"><a-input-number v-model:value="form.purchase_price" :min="0" class="w-full" size="large" :formatter="(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Trạng thái">
          <a-select v-model:value="form.status" size="large">
            <a-select-option value="available">Sẵn sàng</a-select-option>
            <a-select-option value="in_use">Đang sử dụng</a-select-option>
            <a-select-option value="maintenance">Bảo trì</a-select-option>
            <a-select-option value="retired">Thanh lý</a-select-option>
          </a-select>
        </a-form-item></a-col>
      </a-row>
      <a-form-item label="Ghi chú"><a-textarea v-model:value="form.notes" :rows="2" /></a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref } from 'vue'
import { Head, useForm, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })
const props = defineProps({ equipment: Object, stats: Object, filters: Object })

const loading = ref(false)
const showModal = ref(false)
const editing = ref(null)
const filters = ref({ search: props.filters?.search || '', status: props.filters?.status || undefined })

const columns = [
  { title: 'Thiết bị', key: 'name', width: 260 },
  { title: 'Loại', dataIndex: 'category', width: 120 },
  { title: 'Hãng', dataIndex: 'brand', width: 120 },
  { title: 'SL', dataIndex: 'quantity', width: 70, align: 'center' },
  { title: 'Trạng thái', key: 'status', width: 130, align: 'center' },
  { title: 'Giá mua', key: 'price', align: 'right', width: 150 },
  { title: '', key: 'actions', width: 100, align: 'center' },
]

const eqStatusLabels = { available: 'Sẵn sàng', in_use: 'Đang dùng', maintenance: 'Bảo trì', retired: 'Thanh lý' }
const eqStatusColors = { available: 'green', in_use: 'blue', maintenance: 'orange', retired: 'default' }

let searchTimeout = null
const debounceSearch = () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => applyFilters(), 400) }
const applyFilters = () => { loading.value = true; router.get('/equipment', { search: filters.value.search || undefined, status: filters.value.status || undefined }, { preserveState: true, replace: true, onFinish: () => loading.value = false }) }
const handleTableChange = (p) => { loading.value = true; router.get('/equipment', { page: p.current, ...filters.value }, { preserveState: true, replace: true, onFinish: () => loading.value = false }) }

const form = useForm({ name: '', code: '', category: '', brand: '', model: '', quantity: 1, purchase_price: null, status: 'available', notes: '' })
const openCreateModal = () => { editing.value = null; form.reset(); showModal.value = true }
const openEditModal = (e) => { editing.value = e; Object.assign(form, { name: e.name, code: e.code || '', category: e.category || '', brand: e.brand || '', model: e.model || '', quantity: e.quantity || 1, purchase_price: e.purchase_price, status: e.status || 'available', notes: e.notes || '' }); showModal.value = true }
const handleSubmit = () => {
  if (editing.value) router.put(`/equipment/${editing.value.id}`, form.data(), { onSuccess: () => { showModal.value = false; resetForm() } })
  else router.post('/equipment', form.data(), { onSuccess: () => { showModal.value = false; resetForm() } })
}
const resetForm = () => { editing.value = null; form.reset() }
const deleteEq = (e) => router.delete(`/equipment/${e.id}`)
const formatCurrency = (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) : '—'
</script>

<style scoped>
.crm-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
.crm-content-card { background: white; border-radius: 16px; border: 1px solid #E8ECF1; overflow: hidden; }
.crm-table :deep(.ant-table-thead > tr > th) { background: #FAFBFC; font-weight: 600; font-size: 13px; color: #5D6B82; }
.crm-modal :deep(.ant-modal-content) { border-radius: 16px; }
@media (max-width: 768px) { .crm-stats-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
