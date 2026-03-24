<template>
  <Head title="Quản lý vật tư" />

  <PageHeader title="Quản lý vật tư" subtitle="Danh mục và tồn kho vật tư xây dựng">
    <template #actions>
      <a-button type="primary" size="large" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Thêm vật tư
      </a-button>
    </template>
  </PageHeader>

  <div class="crm-stats-grid">
    <StatCard label="Tổng vật tư" :value="stats.total" icon="ToolOutlined" variant="primary" />
    <StatCard label="Dưới mức tối thiểu" :value="stats.low_stock" icon="WarningOutlined" variant="warning" />
  </div>

  <div class="crm-content-card">
    <div class="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
      <a-input-search v-model:value="filters.search" placeholder="Tìm vật tư..." class="max-w-xs" allow-clear @search="applyFilters" @change="debounceSearch" />
      <a-select v-model:value="filters.category" placeholder="Danh mục" allow-clear style="width: 180px" @change="applyFilters">
        <a-select-option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</a-select-option>
      </a-select>
    </div>

    <a-table :columns="columns" :data-source="materials.data" :pagination="{ current: materials.current_page, total: materials.total, pageSize: materials.per_page, showTotal: (t) => `${t} vật tư` }" :loading="loading" row-key="id" size="small" class="crm-table" @change="handleTableChange">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div><div class="font-semibold">{{ record.name }}</div><div class="text-xs text-gray-400">{{ record.code }}</div></div>
        </template>
        <template v-else-if="column.key === 'price'">{{ formatCurrency(record.unit_price) }}</template>
        <template v-else-if="column.key === 'actions'">
          <div class="flex items-center gap-1">
            <a-button type="text" size="small" @click="openEditModal(record)"><template #icon><EditOutlined /></template></a-button>
            <a-popconfirm title="Xóa vật tư?" @confirm="deleteMaterial(record)">
              <a-button type="text" size="small" danger><template #icon><DeleteOutlined /></template></a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- Modal -->
  <a-modal v-model:open="showModal" :title="editing ? 'Chỉnh sửa vật tư' : 'Thêm vật tư mới'" :width="600" @ok="handleSubmit" @cancel="resetForm" ok-text="Lưu" cancel-text="Hủy" class="crm-modal" centered destroy-on-close>
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="16"><a-form-item label="Tên vật tư" required><a-input v-model:value="form.name" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Mã"><a-input v-model:value="form.code" size="large" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Đơn vị" required><a-input v-model:value="form.unit" placeholder="thùng, kg..." size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Đơn giá"><a-input-number v-model:value="form.unit_price" :min="0" class="w-full" size="large" :formatter="(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Tồn kho tối thiểu"><a-input-number v-model:value="form.min_stock" :min="0" class="w-full" size="large" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="Danh mục"><a-input v-model:value="form.category" placeholder="Xi măng, sắt thép..." size="large" /></a-form-item>
      <a-form-item label="Mô tả"><a-textarea v-model:value="form.description" :rows="2" /></a-form-item>
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
const props = defineProps({ materials: Object, stats: Object, categories: Array, filters: Object })

const loading = ref(false)
const showModal = ref(false)
const editing = ref(null)
const filters = ref({ search: props.filters?.search || '', category: props.filters?.category || undefined })

const columns = [
  { title: 'Vật tư', key: 'name', width: 250 },
  { title: 'Đơn vị', dataIndex: 'unit', width: 100 },
  { title: 'Danh mục', dataIndex: 'category', width: 140 },
  { title: 'Đơn giá', key: 'price', align: 'right', width: 150 },
  { title: 'Tồn tối thiểu', dataIndex: 'min_stock', align: 'center', width: 120 },
  { title: '', key: 'actions', width: 100, align: 'center' },
]

let searchTimeout = null
const debounceSearch = () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => applyFilters(), 400) }
const applyFilters = () => { loading.value = true; router.get('/materials', { search: filters.value.search || undefined, category: filters.value.category || undefined }, { preserveState: true, replace: true, onFinish: () => loading.value = false }) }
const handleTableChange = (p) => { loading.value = true; router.get('/materials', { page: p.current, ...filters.value }, { preserveState: true, replace: true, onFinish: () => loading.value = false }) }

const form = useForm({ name: '', code: '', unit: '', category: '', unit_price: null, min_stock: null, description: '' })
const openCreateModal = () => { editing.value = null; form.reset(); showModal.value = true }
const openEditModal = (m) => { editing.value = m; Object.assign(form, { name: m.name, code: m.code || '', unit: m.unit, category: m.category || '', unit_price: m.unit_price, min_stock: m.min_stock, description: m.description || '' }); showModal.value = true }
const handleSubmit = () => {
  if (editing.value) router.put(`/materials/${editing.value.id}`, form.data(), { onSuccess: () => { showModal.value = false; resetForm() } })
  else router.post('/materials', form.data(), { onSuccess: () => { showModal.value = false; resetForm() } })
}
const resetForm = () => { editing.value = null; form.reset() }
const deleteMaterial = (m) => router.delete(`/materials/${m.id}`)
const formatCurrency = (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) : '—'
</script>

<style scoped>
.crm-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
.crm-content-card { background: white; border-radius: 16px; border: 1px solid #E8ECF1; overflow: hidden; }
.crm-table :deep(.ant-table-thead > tr > th) { background: #FAFBFC; font-weight: 600; font-size: 13px; color: #5D6B82; }
.crm-modal :deep(.ant-modal-content) { border-radius: 16px; }
</style>
