<template>
  <Head title="Nhóm chi phí | Annha CRM" />

  <PageHeader title="Nhóm chi phí" subtitle="Quản lý danh mục & phân nhóm chi phí cho dự án">
    <template #actions>
      <a-button type="primary" size="large" @click="openCreateModal" class="premium-button shadow-blue">
        <template #icon><PlusOutlined /></template>
        Thêm nhóm
      </a-button>
    </template>
  </PageHeader>

  <!-- Stats -->
  <div class="crm-stats-grid">
    <StatCard label="Tổng nhóm" :value="stats.total" icon="AppstoreOutlined" variant="primary" />
    <StatCard label="Đang hoạt động" :value="stats.active" icon="CheckCircleOutlined" variant="success" />
    <StatCard label="Ngừng hoạt động" :value="stats.inactive" icon="CloseCircleOutlined" variant="warning" />
    <StatCard label="Chi phí đã gán" :value="stats.total_costs" icon="DollarOutlined" variant="info" />
  </div>

  <!-- Content -->
  <div class="crm-content-card">
    <!-- Filters -->
    <div class="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
      <a-input-search
        v-model:value="filters.search"
        placeholder="Tìm nhóm chi phí..."
        class="max-w-xs"
        allow-clear
        @search="applyFilters"
        @change="debounceSearch"
      />
      <a-select
        v-model:value="filters.status"
        placeholder="Trạng thái"
        allow-clear
        style="width: 160px"
        @change="applyFilters"
      >
        <a-select-option value="active">Hoạt động</a-select-option>
        <a-select-option value="inactive">Ngừng hoạt động</a-select-option>
      </a-select>
      <div class="flex-1"></div>
      <a-tag color="blue" class="text-sm">{{ costGroups.total || 0 }} nhóm</a-tag>
    </div>

    <a-table
      :columns="columns"
      :data-source="costGroups.data"
      :pagination="{
        current: costGroups.current_page,
        total: costGroups.total,
        pageSize: costGroups.per_page,
        showTotal: (t) => `${t} nhóm chi phí`,
        showSizeChanger: false,
      }"
      :loading="loading"
      row-key="id"
      size="small"
      class="crm-table"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <!-- Name + Code -->
        <template v-if="column.key === 'name'">
          <div>
            <div class="font-semibold text-gray-800">{{ record.name }}</div>
            <div v-if="record.code" class="text-xs text-gray-400 mt-0.5">
              <CodeOutlined class="mr-1" />{{ record.code }}
            </div>
          </div>
        </template>

        <!-- Description -->
        <template v-else-if="column.key === 'description'">
          <span v-if="record.description" class="text-gray-500 text-sm line-clamp-2">{{ record.description }}</span>
          <span v-else class="text-gray-300 italic text-sm">—</span>
        </template>

        <!-- Costs Count -->
        <template v-else-if="column.key === 'costs_count'">
          <a-tag v-if="record.costs_count > 0" color="blue">{{ record.costs_count }} chi phí</a-tag>
          <span v-else class="text-gray-300">0</span>
        </template>

        <!-- Sort Order -->
        <template v-else-if="column.key === 'sort_order'">
          <span class="text-gray-500">{{ record.sort_order }}</span>
        </template>

        <!-- Active Toggle -->
        <template v-else-if="column.key === 'is_active'">
          <a-switch
            :checked="record.is_active"
            checked-children="Bật"
            un-checked-children="Tắt"
            @change="toggleActive(record)"
            size="small"
          />
        </template>

        <!-- Creator -->
        <template v-else-if="column.key === 'creator'">
          <div v-if="record.creator" class="text-xs text-gray-400">
            {{ record.creator.name }}
          </div>
          <span v-else class="text-gray-300">—</span>
        </template>

        <!-- Actions -->
        <template v-else-if="column.key === 'actions'">
          <div class="flex items-center gap-1">
            <a-tooltip title="Chỉnh sửa">
              <a-button type="text" size="small" @click="openEditModal(record)">
                <template #icon><EditOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-popconfirm
              :title="record.costs_count > 0 ? `Nhóm đang có ${record.costs_count} chi phí, không thể xóa!` : 'Xóa nhóm chi phí này?'"
              @confirm="deleteCostGroup(record)"
              :ok-button-props="{ disabled: record.costs_count > 0 }"
              :ok-text="record.costs_count > 0 ? 'Đóng' : 'Xóa'"
              cancel-text="Hủy"
            >
              <a-tooltip title="Xóa">
                <a-button type="text" size="small" danger :disabled="record.costs_count > 0">
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-tooltip>
            </a-popconfirm>
          </div>
        </template>
      </template>

      <!-- Empty State -->
      <template #emptyText>
        <div class="py-12 text-center">
          <AppstoreOutlined class="text-4xl text-gray-300 mb-3" />
          <div class="text-gray-400">Chưa có nhóm chi phí nào</div>
          <a-button type="primary" size="small" class="mt-3" @click="openCreateModal">
            <PlusOutlined /> Tạo nhóm đầu tiên
          </a-button>
        </div>
      </template>
    </a-table>
  </div>

  <!-- Create/Edit Modal -->
  <a-modal
    v-model:open="showModal"
    :title="editing ? 'Chỉnh sửa nhóm chi phí' : 'Thêm nhóm chi phí mới'"
    :width="560"
    @ok="handleSubmit"
    @cancel="resetForm"
    ok-text="Lưu"
    cancel-text="Hủy"
    class="crm-modal"
    centered
    destroy-on-close
  >
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="16">
          <a-form-item label="Tên nhóm chi phí" required>
            <a-input v-model:value="form.name" size="large" placeholder="VD: Chi phí vật liệu, Nhân công..." />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Mã nhóm">
            <a-input v-model:value="form.code" size="large" placeholder="VD: VL, NC..." />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Mô tả">
        <a-textarea v-model:value="form.description" :rows="3" placeholder="Mô tả chi tiết nhóm chi phí..." :maxlength="1000" show-count />
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Thứ tự sắp xếp">
            <a-input-number v-model:value="form.sort_order" :min="0" size="large" class="w-full" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Kích hoạt">
            <a-switch v-model:checked="form.is_active" checked-children="Hoạt động" un-checked-children="Ngừng" />
          </a-form-item>
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CodeOutlined,
  AppstoreOutlined,
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })
const props = defineProps({
  costGroups: Object,
  stats: Object,
  filters: Object,
})

const loading = ref(false)
const showModal = ref(false)
const editing = ref(null)
const filters = ref({
  search: props.filters?.search || '',
  status: props.filters?.status || undefined,
})

const columns = [
  { title: 'Nhóm chi phí', key: 'name', width: 240 },
  { title: 'Mô tả', key: 'description', ellipsis: true },
  { title: 'Số chi phí', key: 'costs_count', align: 'center', width: 120 },
  { title: 'Thứ tự', key: 'sort_order', align: 'center', width: 80 },
  { title: 'Trạng thái', key: 'is_active', align: 'center', width: 100 },
  { title: 'Người tạo', key: 'creator', width: 130 },
  { title: '', key: 'actions', width: 100, align: 'center' },
]

// ============ FILTERS ============
let searchTimeout = null
const debounceSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => applyFilters(), 400)
}

const applyFilters = () => {
  loading.value = true
  router.get('/cost-groups', {
    search: filters.value.search || undefined,
    status: filters.value.status || undefined,
  }, {
    preserveState: true,
    replace: true,
    onFinish: () => (loading.value = false),
  })
}

const handleTableChange = (p) => {
  loading.value = true
  router.get('/cost-groups', {
    page: p.current,
    ...{
      search: filters.value.search || undefined,
      status: filters.value.status || undefined,
    },
  }, {
    preserveState: true,
    replace: true,
    onFinish: () => (loading.value = false),
  })
}

// ============ FORM ============
const defaultForm = () => ({
  name: '',
  code: '',
  description: '',
  is_active: true,
  sort_order: 0,
})

const form = ref(defaultForm())

const openCreateModal = () => {
  editing.value = null
  form.value = defaultForm()
  showModal.value = true
}

const openEditModal = (record) => {
  editing.value = record
  form.value = {
    name: record.name || '',
    code: record.code || '',
    description: record.description || '',
    is_active: record.is_active ?? true,
    sort_order: record.sort_order ?? 0,
  }
  showModal.value = true
}

const handleSubmit = () => {
  if (editing.value) {
    router.put(`/cost-groups/${editing.value.id}`, form.value, {
      onSuccess: () => { showModal.value = false; resetForm() },
    })
  } else {
    router.post('/cost-groups', form.value, {
      onSuccess: () => { showModal.value = false; resetForm() },
    })
  }
}

const resetForm = () => {
  editing.value = null
  form.value = defaultForm()
}

const deleteCostGroup = (record) => {
  if (record.costs_count > 0) return
  router.delete(`/cost-groups/${record.id}`)
}

const toggleActive = (record) => {
  router.put(`/cost-groups/${record.id}/toggle-active`, {}, { preserveScroll: true })
}
</script>

<style scoped>
.crm-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

@media (max-width: 1024px) {
  .crm-stats-grid { grid-template-columns: repeat(2, 1fr); }
}

.crm-content-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #E8ECF1;
  overflow: hidden;
}

.crm-table :deep(.ant-table-thead > tr > th) {
  background: #FAFBFC;
  font-weight: 600;
  font-size: 13px;
  color: #5D6B82;
}

.crm-modal :deep(.ant-modal-content) {
  border-radius: 16px;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
