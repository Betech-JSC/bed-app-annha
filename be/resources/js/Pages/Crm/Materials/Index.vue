<template>
  <Head title="Quản lý chi phí" />

  <PageHeader title="Quản lý chi phí" subtitle="Danh mục chi phí — vật tư, nhân công, thiết bị & chi phí quản lý">
    <template #actions>
      <a-button type="primary" size="large" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Thêm chi phí mới
      </a-button>
    </template>
  </PageHeader>

  <div class="crm-stats-grid" style="grid-template-columns: 1fr;">
    <StatCard label="Tổng danh mục chi phí" :value="stats.total" icon="ToolOutlined" variant="primary" />
  </div>

  <div class="crm-content-card">
    <div class="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
      <a-input-search v-model:value="filters.search" placeholder="Tìm chi phí..." class="max-w-xs" allow-clear @search="applyFilters" @change="debounceSearch" />
      <a-select v-model:value="filters.cost_group_id" placeholder="Nhóm chi phí" allow-clear style="width: 180px" @change="applyFilters">
        <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id">{{ g.name }}</a-select-option>
      </a-select>
    </div>

    <a-table :columns="columns" :data-source="materials.data" :pagination="{ current: materials.current_page, total: materials.total, pageSize: materials.per_page, showTotal: (t) => `${t} danh mục` }" :loading="loading" row-key="id" size="small" class="crm-table" @change="handleTableChange">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div><div class="font-semibold">{{ record.name }}</div><div class="text-xs text-gray-400">{{ record.code }}</div></div>
        </template>
        <template v-else-if="column.key === 'cost_group'">
          <span v-if="record.cost_group" class="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-medium border border-blue-100">
            {{ record.cost_group.name }}
          </span>
          <span v-else class="text-gray-400 text-xs italic">—</span>
        </template>
        <template v-else-if="column.key === 'price'">{{ formatCurrency(record.unit_price) }}</template>
        <template v-else-if="column.key === 'actions'">
          <div class="flex items-center gap-1">
            <a-button type="text" size="small" @click="openEditModal(record)"><template #icon><EditOutlined /></template></a-button>
            <a-popconfirm title="Xóa danh mục chi phí?" @confirm="deleteMaterial(record)">
              <a-button type="text" size="small" danger><template #icon><DeleteOutlined /></template></a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- Modal -->
  <a-modal v-model:open="showModal" :title="editing ? 'Chỉnh sửa danh mục chi phí' : 'Thêm danh mục chi phí mới'" :width="600" @ok="handleSubmit" @cancel="resetForm" ok-text="Lưu" cancel-text="Hủy" class="crm-modal" centered destroy-on-close>
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="16"><a-form-item label="Tên chi phí" required><a-input v-model:value="form.name" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Mã"><a-input v-model:value="form.code" size="large" disabled placeholder="Tự động" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Đơn vị" required><a-input v-model:value="form.unit" placeholder="thùng, kg..." size="large" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Đơn giá"><a-input-number v-model:value="form.unit_price" :min="0" class="w-full" size="large" :formatter="(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Danh mục (Ví dụ: Sắt xây dựng, Cát đá...)">
            <a-input v-model:value="form.category" placeholder="Nhập danh mục..." size="large" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Nhóm chi phí (Liên kết)">
            <a-select v-model:value="form.cost_group_id" placeholder="Chọn nhóm chi phí..." size="large" show-search option-filter-prop="label">
              <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id" :label="g.name">{{ g.name }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
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
const props = defineProps({ materials: Object, stats: Object, costGroups: Array, filters: Object })

const loading = ref(false)
const showModal = ref(false)
const editing = ref(null)
const filters = ref({ search: props.filters?.search || '', cost_group_id: props.filters?.cost_group_id ? Number(props.filters.cost_group_id) : undefined })

const columns = [
  { title: 'Chi phí', key: 'name', width: 250 },
  { title: 'Đơn vị', dataIndex: 'unit', width: 100 },
  { title: 'Danh mục', dataIndex: 'category', width: 140 },
  { title: 'Nhóm chi phí', key: 'cost_group', width: 180 },
  { title: 'Đơn giá', key: 'price', align: 'right', width: 150 },
  { title: '', key: 'actions', width: 100, align: 'center' },
]

let searchTimeout = null
const debounceSearch = () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => applyFilters(), 400) }
const applyFilters = () => { loading.value = true; router.get('/materials', { search: filters.value.search || undefined, cost_group_id: filters.value.cost_group_id || undefined }, { preserveState: true, replace: true, onFinish: () => loading.value = false }) }
const handleTableChange = (p) => { loading.value = true; router.get('/materials', { page: p.current, ...filters.value }, { preserveState: true, replace: true, onFinish: () => loading.value = false }) }

const form = useForm({ name: '', code: '', unit: '', category: '', cost_group_id: null, unit_price: null, description: '' })
const openCreateModal = () => { editing.value = null; form.reset(); showModal.value = true }
const openEditModal = (m) => { editing.value = m; Object.assign(form, { name: m.name, code: m.code || '', unit: m.unit, category: m.category || '', cost_group_id: m.cost_group_id, unit_price: m.unit_price, description: m.description || '' }); showModal.value = true }
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
