<template>
  <Head title="Quản lý dự án" />

  <PageHeader title="Quản lý dự án" subtitle="Danh sách và quản lý tất cả dự án xây dựng">
    <template #actions>
      <a-button type="primary" size="large" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Thêm dự án
      </a-button>
    </template>
  </PageHeader>

  <!-- Stats -->
  <div class="crm-stats-grid">
    <StatCard label="Tổng dự án" :value="stats.total" icon="FolderOutlined" variant="primary" />
    <StatCard label="Đang lên kế hoạch" :value="stats.planning" icon="ClockCircleOutlined" variant="warning" />
    <StatCard label="Đang thi công" :value="stats.in_progress" icon="ThunderboltOutlined" variant="success" />
    <StatCard label="Hoàn thành" :value="stats.completed" icon="CheckCircleOutlined" variant="primary" />
  </div>

  <!-- Filters + Table -->
  <div class="crm-content-card">
    <div class="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
      <a-input-search
        v-model:value="filters.search"
        placeholder="Tìm kiếm dự án..."
        class="max-w-xs"
        allow-clear
        @search="applyFilters"
        @change="debounceSearch"
      />
      <a-select
        v-model:value="filters.status"
        placeholder="Trạng thái"
        allow-clear
        style="width: 180px"
        @change="applyFilters"
      >
        <a-select-option value="planning">Lên kế hoạch</a-select-option>
        <a-select-option value="in_progress">Đang thi công</a-select-option>
        <a-select-option value="completed">Hoàn thành</a-select-option>
        <a-select-option value="cancelled">Đã hủy</a-select-option>
      </a-select>
    </div>

    <a-table
      :columns="columns"
      :data-source="projects.data"
      :pagination="{
        current: projects.current_page,
        pageSize: projects.per_page,
        total: projects.total,
        showSizeChanger: false,
        showTotal: (t) => `Tổng ${t} dự án`,
      }"
      :loading="loading"
      row-key="id"
      class="crm-table"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <!-- Name + Code -->
        <template v-if="column.key === 'name'">
          <div>
            <a class="font-semibold text-crm-primary hover:underline cursor-pointer" @click="goToDetail(record)">
              {{ record.name }}
            </a>
            <div class="text-xs text-gray-400 mt-0.5">{{ record.code }}</div>
          </div>
        </template>

        <!-- Status -->
        <template v-else-if="column.key === 'status'">
          <a-tag :color="statusColors[record.status]" class="rounded-full px-3">
            {{ statusLabels[record.status] }}
          </a-tag>
        </template>

        <!-- Customer -->
        <template v-else-if="column.key === 'customer'">
          <span>{{ record.customer?.name || '—' }}</span>
        </template>

        <!-- Manager -->
        <template v-else-if="column.key === 'manager'">
          <span>{{ record.project_manager?.name || '—' }}</span>
        </template>

        <!-- Contract Value -->
        <template v-else-if="column.key === 'contract_value'">
          <span class="font-semibold">
            {{ record.contract?.contract_value ? formatCurrency(record.contract.contract_value) : '—' }}
          </span>
        </template>

        <!-- Date -->
        <template v-else-if="column.key === 'date'">
          <div class="text-sm">
            <div>{{ formatDate(record.start_date) }}</div>
            <div class="text-gray-400">→ {{ formatDate(record.end_date) }}</div>
          </div>
        </template>

        <!-- Progress -->
        <template v-else-if="column.key === 'progress'">
          <a-progress
            :percent="record.progress?.overall_percentage || 0"
            :stroke-color="record.progress?.overall_percentage >= 80 ? '#1D8348' : '#1B4F72'"
            size="small"
            :format="(p) => `${p}%`"
          />
        </template>

        <!-- Actions -->
        <template v-else-if="column.key === 'actions'">
          <div class="flex items-center gap-1">
            <a-tooltip title="Xem chi tiết">
              <a-button type="text" size="small" @click="goToDetail(record)">
                <template #icon><EyeOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="Chỉnh sửa">
              <a-button type="text" size="small" @click="openEditModal(record)">
                <template #icon><EditOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-popconfirm title="Xóa dự án này?" ok-text="Xóa" cancel-text="Hủy" @confirm="deleteProject(record)">
              <a-tooltip title="Xóa">
                <a-button type="text" size="small" danger>
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-tooltip>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- Create/Edit Modal -->
  <a-modal
    v-model:open="showModal"
    :title="editingProject ? 'Chỉnh sửa dự án' : 'Thêm dự án mới'"
    :width="720"
    :confirm-loading="form.processing"
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
        <a-col :span="24">
          <a-form-item label="Tên dự án" required v-bind="fieldStatus('name')">
            <a-input v-model:value="form.name" placeholder="Nhập tên dự án..." size="large" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Khách hàng" required v-bind="fieldStatus('customer_id')">
            <a-select
              v-model:value="form.customer_id"
              placeholder="Chọn khách hàng"
              show-search
              :filter-option="filterUser"
              size="large"
            >
              <a-select-option v-for="u in users" :key="u.id" :value="u.id">
                {{ u.name }} ({{ u.email }})
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Quản lý dự án" v-bind="fieldStatus('project_manager_id')">
            <a-select
              v-model:value="form.project_manager_id"
              placeholder="Chọn quản lý"
              show-search
              :filter-option="filterUser"
              allow-clear
              size="large"
            >
              <a-select-option v-for="u in users" :key="u.id" :value="u.id">
                {{ u.name }}
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="Ngày bắt đầu">
            <a-date-picker v-model:value="form.start_date" format="DD/MM/YYYY" class="w-full" size="large" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Ngày kết thúc">
            <a-date-picker v-model:value="form.end_date" format="DD/MM/YYYY" class="w-full" size="large" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Trạng thái">
            <a-select v-model:value="form.status" size="large">
              <a-select-option value="planning">Lên kế hoạch</a-select-option>
              <a-select-option value="in_progress">Đang thi công</a-select-option>
              <a-select-option value="completed">Hoàn thành</a-select-option>
              <a-select-option value="cancelled">Đã hủy</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="Mô tả">
        <a-textarea v-model:value="form.description" :rows="3" placeholder="Mô tả dự án..." />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Head, useForm, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import {
  PlusOutlined, EyeOutlined, EditOutlined, DeleteOutlined,
} from '@ant-design/icons-vue'
import { message, notification } from 'ant-design-vue'
import dayjs from 'dayjs'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  projects: Object,
  stats: Object,
  filters: Object,
  users: Array,
})

const loading = ref(false)
const showModal = ref(false)
const editingProject = ref(null)

// Table columns
const columns = [
  { title: 'Dự án', key: 'name', width: 250 },
  { title: 'Trạng thái', key: 'status', width: 140, align: 'center' },
  { title: 'Khách hàng', key: 'customer', width: 160 },
  { title: 'Quản lý', key: 'manager', width: 140 },
  { title: 'Giá trị HĐ', key: 'contract_value', width: 150, align: 'right' },
  { title: 'Thời gian', key: 'date', width: 140 },
  { title: 'Tiến độ', key: 'progress', width: 140 },
  { title: '', key: 'actions', width: 120, align: 'center', fixed: 'right' },
]

const statusLabels = {
  planning: 'Lên kế hoạch',
  in_progress: 'Đang thi công',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
}

const statusColors = {
  planning: 'orange',
  in_progress: 'blue',
  completed: 'green',
  cancelled: 'red',
}

// Filters
const filters = ref({
  search: props.filters?.search || '',
  status: props.filters?.status || undefined,
})

let searchTimeout = null
const debounceSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => applyFilters(), 400)
}

const applyFilters = () => {
  loading.value = true
  router.get('/projects', {
    search: filters.value.search || undefined,
    status: filters.value.status || undefined,
  }, {
    preserveState: true,
    replace: true,
    onFinish: () => loading.value = false,
  })
}

const handleTableChange = (pagination) => {
  loading.value = true
  router.get('/projects', {
    page: pagination.current,
    search: filters.value.search || undefined,
    status: filters.value.status || undefined,
  }, {
    preserveState: true,
    replace: true,
    onFinish: () => loading.value = false,
  })
}

// Form
const form = useForm({
  name: '',
  description: '',
  customer_id: undefined,
  project_manager_id: undefined,
  start_date: null,
  end_date: null,
  status: 'planning',
})

/**
 * Returns Ant Design form-item props for field validation display.
 * Backend now returns Vietnamese messages, so we show them directly.
 */
const fieldStatus = (field) => {
  const err = form.errors[field]
  if (!err) return {}
  return { validateStatus: 'error', help: Array.isArray(err) ? err[0] : err }
}

/**
 * Shows a single consolidated error notification for validation failures.
 */
const showValidationErrors = (errors) => {
  const entries = Object.entries(errors)
  const errorList = entries.map(([, msg]) => {
    const text = Array.isArray(msg) ? msg[0] : msg
    return text
  })

  if (errorList.length === 1) {
    message.warning(errorList[0], 4)
  } else {
    notification.warning({
      message: `Vui lòng kiểm tra ${errorList.length} trường`,
      description: errorList.map(e => `• ${e}`).join('\n'),
      duration: 6,
      placement: 'topRight',
      style: { whiteSpace: 'pre-line' },
    })
  }
}

const openCreateModal = () => {
  editingProject.value = null
  form.reset()
  form.clearErrors()
  showModal.value = true
}

const openEditModal = (project) => {
  editingProject.value = project
  form.name = project.name
  form.description = project.description
  form.customer_id = project.customer_id
  form.project_manager_id = project.project_manager_id
  form.start_date = project.start_date ? dayjs(project.start_date) : null
  form.end_date = project.end_date ? dayjs(project.end_date) : null
  form.status = project.status
  form.clearErrors()
  showModal.value = true
}

const handleSubmit = () => {
  const data = {
    ...form.data(),
    start_date: form.start_date ? dayjs(form.start_date).format('YYYY-MM-DD') : null,
    end_date: form.end_date ? dayjs(form.end_date).format('YYYY-MM-DD') : null,
  }

  if (editingProject.value) {
    form.put(`/projects/${editingProject.value.id}`, {
      onSuccess: () => { showModal.value = false; resetForm() },
      onError: (errors) => { showValidationErrors(errors) },
    })
  } else {
    form.post('/projects', {
      onSuccess: () => { showModal.value = false; resetForm() },
      onError: (errors) => { showValidationErrors(errors) },
    })
  }
}

const resetForm = () => {
  editingProject.value = null
  form.reset()
  form.clearErrors()
}

const deleteProject = (project) => {
  router.delete(`/projects/${project.id}`)
}

const goToDetail = (project) => {
  router.visit(`/projects/${project.id}`)
}

// Helpers
const formatCurrency = (value) => {
  if (!value) return '—'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
}

const formatDate = (date) => {
  if (!date) return '—'
  return dayjs(date).format('DD/MM/YYYY')
}

const filterUser = (input, option) => {
  const label = option.children?.[0]?.children || ''
  return label.toString().toLowerCase().includes(input.toLowerCase())
}
</script>

<style scoped>
.crm-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
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

.crm-table :deep(.ant-table-tbody > tr:hover > td) {
  background: #F8FAFC;
}

.crm-modal :deep(.ant-modal-content) {
  border-radius: 16px;
}

@media (max-width: 768px) {
  .crm-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
