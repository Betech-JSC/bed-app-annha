<template>
  <Head :title="`Phân nhóm chi phí | ${$page.props.appName || 'BED CRM'}`" />

  <PageHeader title="Phân Nhóm Chi Phí" subtitle="Quản lý danh mục nhóm chi phí dự án & chi phí vận hành công ty">
    <template #actions>
      <a-button type="primary" size="large" @click="openCreateModal" class="premium-button shadow-blue">
        <template #icon><PlusOutlined /></template>
        {{ currentType === 'company' ? 'Thêm nhóm chi phí công ty' : 'Thêm nhóm chi phí dự án' }}
      </a-button>
    </template>
  </PageHeader>

  <!-- Sub-Tabs Switcher -->
  <div class="flex items-center gap-3 mb-6 border-b border-gray-200 pb-3">
    <button 
      type="button"
      class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-sm"
      :class="currentType === 'project' ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'"
      @click="switchType('project')"
    >
      <BuildOutlined class="text-base" /> Nhóm chi phí dự án
      <span class="ml-1 text-xs px-2.5 py-0.5 rounded-full" :class="currentType === 'project' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700 font-bold'">
        {{ stats.total_project || 0 }}
      </span>
    </button>

    <button 
      type="button"
      class="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer shadow-sm"
      :class="currentType === 'company' ? 'bg-indigo-600 text-white shadow-indigo-500/20' : 'bg-white text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200'"
      @click="switchType('company')"
    >
      <BankOutlined class="text-base" /> Nhóm chi phí công ty
      <span class="ml-1 text-xs px-2.5 py-0.5 rounded-full" :class="currentType === 'company' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700 font-bold'">
        {{ stats.total_company || 0 }}
      </span>
    </button>
  </div>

  <!-- Stats -->
  <div class="crm-stats-grid">
    <StatCard label="Nhóm chi phí dự án" :value="stats.total_project" icon="BuildOutlined" variant="primary" />
    <StatCard label="Nhóm chi phí công ty" :value="stats.total_company" icon="BankOutlined" variant="accent" />
    <StatCard label="Đang hoạt động" :value="stats.active" icon="CheckCircleOutlined" variant="success" />
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
      <a-tag :color="currentType === 'company' ? 'purple' : 'blue'" class="text-sm">
        <component :is="currentType === 'company' ? BankOutlined : BuildOutlined" class="mr-1" />
        {{ currentType === 'company' ? 'Chi phí công ty' : 'Chi phí dự án' }}: {{ costGroups.total || 0 }} nhóm
      </a-tag>
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

        <!-- Type -->
        <template v-else-if="column.key === 'type'">
          <span v-if="record.type === 'company'" class="px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[11px] font-bold border border-purple-100 flex items-center gap-1 w-max">
            <BankOutlined /> Công ty
          </span>
          <span v-else class="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-100 flex items-center gap-1 w-max">
            <BuildOutlined /> Dự án
          </span>
        </template>

        <!-- Description -->
        <template v-else-if="column.key === 'description'">
          <span v-if="record.description" class="text-gray-500 text-sm line-clamp-2">{{ record.description }}</span>
          <span v-else class="text-gray-300 italic text-sm">—</span>
        </template>

        <!-- Expense Category (CAPEX / OPEX) -->
        <template v-else-if="column.key === 'expense_category'">
          <span v-if="record.expense_category === 'capex'" class="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-medium border border-emerald-100">
            CAPEX — Chi phí đầu tư
          </span>
          <span v-else-if="record.expense_category === 'opex'" class="px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[11px] font-medium border border-orange-100">
            OPEX — Vận hành
          </span>
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
          <div class="text-gray-400">Chưa có nhóm chi phí {{ currentType === 'company' ? 'công ty' : 'dự án' }} nào</div>
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
    :width="580"
    @ok="handleSubmit"
    @cancel="resetForm"
    ok-text="Lưu"
    cancel-text="Hủy"
    class="crm-modal"
    centered
    destroy-on-close
  >
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Loại nhóm chi phí" required>
        <a-radio-group v-model:value="form.type" button-style="solid" size="large" class="w-full flex">
          <a-radio-button value="project" class="w-1/2 text-center">
            <BuildOutlined class="mr-1" /> Chi phí dự án
          </a-radio-button>
          <a-radio-button value="company" class="w-1/2 text-center">
            <BankOutlined class="mr-1" /> Chi phí công ty
          </a-radio-button>
        </a-radio-group>
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="16">
          <a-form-item label="Tên nhóm chi phí" required>
            <a-input v-model:value="form.name" size="large" placeholder="VD: Chi phí mặt bằng, Vật liệu..." />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Mã nhóm">
            <a-input v-model:value="form.code" size="large" placeholder="VD: MB, VL..." />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="Mô tả">
        <a-textarea v-model:value="form.description" :rows="3" placeholder="Mô tả chi tiết nhóm chi phí..." :maxlength="1000" show-count />
      </a-form-item>

      <a-form-item label="Phân loại OPEX / CAPEX">
        <a-select v-model:value="form.expense_category" placeholder="Chọn phân loại (CAPEX hoặc OPEX)..." size="large" allow-clear>
          <a-select-option value="capex">CAPEX — Chi phí đầu tư / Mua sắm tài sản</a-select-option>
          <a-select-option value="opex">OPEX — Chi phí vận hành (điện, nước, mặt bằng, sửa chữa...)</a-select-option>
        </a-select>
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
import { ref, computed } from 'vue'
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
  BankOutlined,
  BuildOutlined,
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })
const props = defineProps({
  costGroups: Object,
  stats: Object,
  filters: Object,
})

const currentType = ref(props.filters?.type || 'project')

const loading = ref(false)
const showModal = ref(false)
const editing = ref(null)
const filters = ref({
  search: props.filters?.search || '',
  status: props.filters?.status || undefined,
})

const columns = computed(() => [
  { title: 'Nhóm chi phí', key: 'name', width: 240 },
  { title: 'Loại nhóm', key: 'type', width: 130, align: 'center' },
  { title: 'Mô tả', key: 'description', ellipsis: true },
  { title: 'Phân loại (CAPEX/OPEX)', key: 'expense_category', width: 180, align: 'center' },
  { title: 'Số chi phí', key: 'costs_count', align: 'center', width: 110 },
  { title: 'Thứ tự', key: 'sort_order', align: 'center', width: 80 },
  { title: 'Trạng thái', key: 'is_active', align: 'center', width: 100 },
  { title: 'Người tạo', key: 'creator', width: 130 },
  { title: '', key: 'actions', width: 100, align: 'center' },
])

const switchType = (type) => {
  currentType.value = type
  applyFilters()
}

// ============ FILTERS ============
let searchTimeout = null
const debounceSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => applyFilters(), 400)
}

const applyFilters = () => {
  loading.value = true
  router.get('/cost-groups', {
    type: currentType.value,
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
    type: currentType.value,
    search: filters.value.search || undefined,
    status: filters.value.status || undefined,
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
  type: currentType.value || 'project',
  description: '',
  expense_category: null,
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
    type: record.type || 'project',
    description: record.description || '',
    expense_category: record.expense_category || null,
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
