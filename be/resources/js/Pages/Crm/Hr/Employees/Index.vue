<template>
  <Head title="Quản lý nhân sự" />

  <PageHeader title="Quản lý nhân sự" subtitle="Danh sách và quản lý nhân viên trong hệ thống">
    <template #actions>
      <a-button type="primary" size="large" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Thêm nhân viên
      </a-button>
    </template>
  </PageHeader>

  <!-- Stats -->
  <div class="crm-stats-grid">
    <StatCard label="Tổng nhân viên" :value="stats.total" icon="TeamOutlined" variant="primary" />
    <StatCard label="Đang hoạt động" :value="stats.active" icon="UserOutlined" variant="success" />
    <StatCard label="Đã khóa" :value="stats.banned" icon="StopOutlined" variant="warning" />
  </div>

  <!-- Filters + Table -->
  <div class="crm-content-card">
    <div class="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
      <a-input-search
        v-model:value="filters.search"
        placeholder="Tìm nhân viên..."
        class="max-w-xs"
        allow-clear
        @search="applyFilters"
        @change="debounceSearch"
      />
      <a-select
        v-model:value="filters.department_id"
        placeholder="Phòng ban"
        allow-clear
        style="width: 200px"
        @change="applyFilters"
      >
        <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
      </a-select>
    </div>

    <a-table
      :columns="columns"
      :data-source="employees.data"
      :pagination="{
        current: employees.current_page,
        pageSize: employees.per_page,
        total: employees.total,
        showSizeChanger: false,
        showTotal: (t) => `Tổng ${t} nhân viên`,
      }"
      :loading="loading"
      row-key="id"
      class="crm-table"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div class="flex items-center gap-3">
            <a-avatar :size="36" class="bg-crm-primary text-white font-semibold flex-shrink-0">
              {{ record.name?.charAt(0)?.toUpperCase() || '?' }}
            </a-avatar>
            <div>
              <div class="font-semibold">{{ record.name }}</div>
              <div class="text-xs text-gray-400">{{ record.email }}</div>
            </div>
          </div>
        </template>

        <template v-else-if="column.key === 'phone'">
          {{ record.phone || '—' }}
        </template>

        <template v-else-if="column.key === 'department'">
          {{ record.department?.name || '—' }}
        </template>

        <template v-else-if="column.key === 'roles'">
          <div class="flex flex-wrap gap-1">
            <a-tag v-for="role in (record.roles || [])" :key="role.id" color="blue" class="rounded-full text-xs">
              {{ roleLabels[role.name] || role.name }}
            </a-tag>
            <span v-if="!record.roles?.length" class="text-gray-400 text-xs">—</span>
          </div>
        </template>

        <template v-else-if="column.key === 'status'">
          <a-tag :color="record.deleted_at ? 'red' : 'green'" class="rounded-full">
            {{ record.deleted_at ? 'Đã khóa' : 'Hoạt động' }}
          </a-tag>
        </template>
        
        <template v-else-if="column.key === 'salary'">
          <div v-if="record.salary_configs?.length">
             <div class="font-semibold text-blue-600">
               {{ formatCurrency(getMainRate(record.salary_configs[0])) }}
             </div>
             <div class="text-[10px] text-gray-400">
               {{ translateType(record.salary_configs[0].salary_type) }}
             </div>
          </div>
          <span v-else class="text-gray-400 text-xs text-italic">Chưa cấu hình</span>
        </template>

        <template v-else-if="column.key === 'actions'">
          <div class="flex items-center gap-1">
            <a-tooltip title="Sửa">
              <a-button type="text" size="small" @click="openEditModal(record)">
                <template #icon><EditOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-popconfirm title="Xóa nhân viên này?" ok-text="Xóa" cancel-text="Hủy" @confirm="deleteEmployee(record)">
              <a-tooltip title="Xóa">
                <a-button type="text" size="small" danger>
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-tooltip>
            </a-popconfirm>
            <a-tooltip title="Cấu hình lương & Đơn giá">
              <a-button type="link" size="small" @click="$inertia.visit(`/hr/employees/${record.id}/salary`)" class="flex items-center">
                <template #icon><DollarOutlined /></template>
                Lương
              </a-button>
            </a-tooltip>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- Create/Edit Modal -->
  <a-modal
    v-model:open="showModal"
    :title="editingEmployee ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'"
    :width="640"
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
        <a-col :span="12">
          <a-form-item label="Họ" :validate-status="form.errors.first_name ? 'error' : ''" :help="form.errors.first_name" required>
            <a-input v-model:value="form.first_name" placeholder="Nhập họ..." size="large" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Tên">
            <a-input v-model:value="form.last_name" placeholder="Nhập tên..." size="large" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Email" :validate-status="form.errors.email ? 'error' : ''" :help="form.errors.email" required>
            <a-input v-model:value="form.email" placeholder="email@company.com" size="large" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Số điện thoại">
            <a-input v-model:value="form.phone" placeholder="0xxx xxx xxx" size="large" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Phòng ban">
            <a-select v-model:value="form.department_id" placeholder="Chọn phòng ban" allow-clear size="large">
              <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item :label="editingEmployee ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'" :validate-status="form.errors.password ? 'error' : ''" :help="form.errors.password" :required="!editingEmployee">
            <a-input-password v-model:value="form.password" placeholder="Mật khẩu..." size="large" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="Vai trò">
        <a-select v-model:value="form.role_ids" mode="multiple" placeholder="Chọn vai trò" size="large">
          <a-select-option v-for="r in roles" :key="r.id" :value="r.id">{{ r.name }}</a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, useForm, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  employees: Object,
  stats: Object,
  departments: Array,
  roles: Array,
  filters: Object,
})

const loading = ref(false)
const showModal = ref(false)
const editingEmployee = ref(null)

const roleLabels = {
  super_admin: 'Super Admin',
  'Ban Dieu Hanh': 'Ban Điều Hành',
  'Ban Điều Hành': 'Ban Điều Hành',
  project_manager: 'Quản lý dự án',
  site_supervisor: 'Giám sát công trường',
  accountant: 'Kế toán',
  project_owner: 'Chủ đầu tư',
  client: 'Khách hàng',
  staff: 'Nhân viên',
  admin: 'Quản trị viên',
  hr: 'Nhân sự',
  warehouse: 'Thủ kho',
}

const columns = [
  { title: 'Nhân viên', key: 'name', width: 280 },
  { title: 'SĐT', key: 'phone', width: 140 },
  { title: 'Phòng ban', key: 'department', width: 160 },
  { title: 'Vai trò', key: 'roles', width: 200 },
  { title: 'Trạng thái', key: 'status', width: 120, align: 'center' },
  { title: '', key: 'actions', width: 100, align: 'center', fixed: 'right' },
]

const mode = computed(() => new URLSearchParams(window.location.search).get('mode'))

if (mode.value === 'salary') {
  // Insert salary column before roles
  const rolesIndex = columns.findIndex(c => c.key === 'roles')
  columns.splice(rolesIndex, 0, { title: 'Lương/Đơn giá', key: 'salary', width: 160 })
}

const filters = ref({
  search: props.filters?.search || '',
  department_id: props.filters?.department_id ? Number(props.filters.department_id) : undefined,
})

let searchTimeout = null
const debounceSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => applyFilters(), 400)
}

const applyFilters = () => {
  loading.value = true
  router.get('/hr/employees', {
    search: filters.value.search || undefined,
    department_id: filters.value.department_id || undefined,
  }, {
    preserveState: true,
    replace: true,
    onFinish: () => loading.value = false,
  })
}

const handleTableChange = (pagination) => {
  loading.value = true
  router.get('/hr/employees', {
    page: pagination.current,
    search: filters.value.search || undefined,
    department_id: filters.value.department_id || undefined,
  }, {
    preserveState: true,
    replace: true,
    onFinish: () => loading.value = false,
  })
}

const form = useForm({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  password: '',
  department_id: undefined,
  role_ids: [],
})

const openCreateModal = () => {
  editingEmployee.value = null
  form.reset()
  form.clearErrors()
  showModal.value = true
}

const openEditModal = (emp) => {
  editingEmployee.value = emp
  form.first_name = emp.first_name || ''
  form.last_name = emp.last_name || ''
  form.email = emp.email
  form.phone = emp.phone || ''
  form.password = ''
  form.department_id = emp.department_id || undefined
  form.role_ids = (emp.roles || []).map(r => r.id)
  form.clearErrors()
  showModal.value = true
}

const handleSubmit = () => {
  if (editingEmployee.value) {
    router.put(`/hr/employees/${editingEmployee.value.id}`, form.data(), {
      onSuccess: () => { showModal.value = false; resetForm() },
      onError: (errors) => { Object.assign(form.errors, errors) },
    })
  } else {
    router.post('/hr/employees', form.data(), {
      onSuccess: () => { showModal.value = false; resetForm() },
      onError: (errors) => { Object.assign(form.errors, errors) },
    })
  }
}

const resetForm = () => {
  editingEmployee.value = null
  form.reset()
  form.clearErrors()
}

const deleteEmployee = (emp) => {
  router.delete(`/hr/employees/${emp.id}`)
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0)
}

const translateType = (type) => {
  const map = { hourly: 'Theo giờ', daily: 'Theo ngày', monthly: 'Lương tháng' }
  return map[type] || type
}

const getMainRate = (record) => {
  if (record.salary_type === 'hourly') return record.hourly_rate
  if (record.salary_type === 'daily') return record.daily_rate
  if (record.salary_type === 'monthly') return record.monthly_salary
  return 0
}
</script>

<style scoped>
.crm-stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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
.crm-modal :deep(.ant-modal-content) {
  border-radius: 16px;
}
.bg-crm-primary {
  background: linear-gradient(135deg, #1B4F72, #2E86C1);
}
@media (max-width: 768px) {
  .crm-stats-grid { grid-template-columns: 1fr; }
}
</style>
