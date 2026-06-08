<template>
  <Head :title="filters.type === 'customer' ? 'Quản lý Khách hàng' : 'Quản lý nhân sự'" />

  <PageHeader 
    :title="filters.type === 'customer' ? 'Quản lý Khách hàng' : 'Quản lý nhân sự'" 
    :subtitle="filters.type === 'customer' ? 'Danh sách tài khoản khách hàng và chủ đầu tư' : 'Danh sách và quản lý nhân viên trong hệ thống'"
  >
    <template #actions>
      <a-button type="primary" size="large" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Thêm {{ filters.type === 'customer' ? 'khách hàng' : 'nhân viên' }}
      </a-button>
    </template>
  </PageHeader>

  <!-- Stats -->
  <div class="crm-stats-grid">
    <StatCard :label="filters.type === 'customer' ? 'Tổng khách hàng' : 'Tổng nhân viên'" :value="stats.total" icon="TeamOutlined" variant="primary" />
    <StatCard label="Đang hoạt động" :value="stats.active" icon="UserOutlined" variant="success" />
    <StatCard label="Đã khóa" :value="stats.banned" icon="StopOutlined" variant="warning" />
  </div>

  <!-- Filters + Table -->
  <div class="crm-content-card">
    <div class="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
      <a-input-search
        v-model:value="filters.search"
        :placeholder="filters.type === 'customer' ? 'Tìm khách hàng...' : 'Tìm nhân viên...'"
        class="max-w-xs"
        allow-clear
        @search="applyFilters"
        @change="debounceSearch"
      />
      <a-select
        v-if="filters.type === 'employee'"
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
      :columns="dynamicColumns"
      :data-source="employees.data"
      :pagination="{
        current: employees.current_page,
        pageSize: employees.per_page,
        total: employees.total,
        showSizeChanger: false,
        showTotal: (t) => `Tổng ${t} ${filters.type === 'customer' ? 'khách hàng' : 'nhân viên'}`,
      }"
      :loading="loading"
      row-key="id"
      class="crm-table"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div class="flex items-center gap-3 cursor-pointer group" @click="openDetailModal(record)">
            <a-avatar :size="36" :class="[filters.type === 'customer' ? 'bg-blue-500' : 'bg-crm-primary', 'text-white font-semibold flex-shrink-0']">
              {{ record.name?.charAt(0)?.toUpperCase() || '?' }}
            </a-avatar>
            <div>
              <div class="font-semibold group-hover:text-blue-600 transition-colors">{{ record.name }}</div>
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
            <a-tooltip title="Xem chi tiết">
              <a-button type="text" size="small" @click="openDetailModal(record)">
                <template #icon><EyeOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="Sửa">
              <a-button type="text" size="small" @click="openEditModal(record)">
                <template #icon><EditOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-popconfirm :title="`Xóa ${filters.type === 'customer' ? 'khách hàng' : 'nhân viên'} này?`" ok-text="Xóa" cancel-text="Hủy" @confirm="deleteEmployee(record)">
              <a-tooltip title="Xóa">
                <a-button type="text" size="small" danger>
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-tooltip>
            </a-popconfirm>
            <a-tooltip v-if="filters.type === 'employee'" title="Cấu hình lương & Đơn giá">
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
    :title="editingEmployee ? (filters.type === 'customer' ? 'Sửa khách hàng' : 'Sửa nhân viên') : (filters.type === 'customer' ? 'Thêm khách hàng' : 'Thêm nhân viên')"
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
        <a-col :span="12" v-if="filters.type === 'employee'">
          <a-form-item label="Phòng ban">
            <a-select v-model:value="form.department_id" placeholder="Chọn phòng ban" allow-clear size="large">
              <a-select-option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="filters.type === 'employee' ? 12 : 24">
          <a-form-item :label="editingEmployee ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'" :validate-status="form.errors.password ? 'error' : ''" :help="form.errors.password" :required="!editingEmployee">
            <a-input-password v-model:value="form.password" placeholder="Mật khẩu..." size="large" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="Vai trò">
        <a-select v-model:value="form.role_ids" mode="multiple" placeholder="Chọn vai trò" size="large">
          <a-select-option v-for="r in filteredRoles" :key="r.id" :value="r.id">{{ r.name }}</a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- ═══ Employee Detail Modal (3 tabs) ═══ -->
  <a-modal
    v-model:open="detailModalVisible"
    :title="detailEmployee?.name || 'Chi tiết nhân viên'"
    :width="780"
    :footer="null"
    class="crm-modal"
    centered
    destroy-on-close
  >
    <div v-if="detailLoading" class="flex items-center justify-center py-16">
      <a-spin size="large" />
    </div>

    <div v-else-if="detailData" class="mt-2">
      <a-tabs v-model:activeKey="detailTab" class="detail-tabs">
        <!-- ─── Tab 1: Thông tin cá nhân ─── -->
        <a-tab-pane key="info" tab="Thông tin cá nhân">
          <div class="detail-section">
            <div class="flex items-center gap-4 mb-6">
              <a-avatar :size="64" class="bg-crm-primary text-white text-2xl font-bold flex-shrink-0">
                {{ detailData.employee.name?.charAt(0)?.toUpperCase() || '?' }}
              </a-avatar>
              <div>
                <div class="text-xl font-bold text-gray-900">{{ detailData.employee.name }}</div>
                <div class="text-sm text-gray-500">{{ detailData.employee.email }}</div>
                <div class="flex gap-2 mt-1">
                  <a-tag v-for="role in (detailData.employee.roles || [])" :key="role.id" color="blue" class="rounded-full text-xs">
                    {{ roleLabels[role.name] || role.name }}
                  </a-tag>
                </div>
              </div>
            </div>

            <a-descriptions :column="2" bordered size="small" class="detail-descriptions">
              <a-descriptions-item label="Họ và tên">{{ detailData.employee.name }}</a-descriptions-item>
              <a-descriptions-item label="Email">{{ detailData.employee.email }}</a-descriptions-item>
              <a-descriptions-item label="Số điện thoại">{{ detailData.employee.phone || '—' }}</a-descriptions-item>
              <a-descriptions-item label="Phòng ban">{{ detailData.employee.department?.name || '—' }}</a-descriptions-item>
              <a-descriptions-item label="Trạng thái">
                <a-tag :color="detailData.employee.deleted_at ? 'red' : 'green'" class="rounded-full">
                  {{ detailData.employee.deleted_at ? 'Đã khóa' : 'Hoạt động' }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="Ngày tạo">{{ formatDate(detailData.employee.created_at) }}</a-descriptions-item>
            </a-descriptions>
          </div>
        </a-tab-pane>

        <!-- ─── Tab 2: KPI ─── -->
        <a-tab-pane key="kpi" tab="Kết quả KPI">
          <div v-if="detailData.kpis?.length" class="space-y-3">
            <div
              v-for="kpi in detailData.kpis"
              :key="kpi.id"
              class="kpi-card"
            >
              <div class="flex items-center justify-between mb-2">
                <div>
                  <div class="font-semibold text-gray-800 text-sm">{{ kpi.title }}</div>
                  <div class="text-xs text-gray-400 mt-0.5">
                    <span v-if="kpi.project">{{ kpi.project.code }} — </span>
                    <span v-if="kpi.start_date">{{ formatDate(kpi.start_date) }} → {{ formatDate(kpi.end_date) }}</span>
                  </div>
                </div>
                <span class="crm-tag text-xs" :class="kpiStatusTag(kpi.status)">
                  {{ kpiStatusLabel(kpi.status) }}
                </span>
              </div>

              <!-- Parent progress -->
              <div class="flex items-center gap-2 mb-2">
                <a-progress
                  :percent="kpiProgressPct(kpi)"
                  :size="5"
                  :show-info="false"
                  :stroke-color="kpiProgressColor(kpi)"
                  style="flex: 1;"
                />
                <span class="text-xs font-bold w-9 text-right" :style="{ color: kpiProgressColor(kpi) }">
                  {{ kpiProgressPct(kpi) }}%
                </span>
              </div>

              <!-- Children list -->
              <div v-if="kpi.children?.length" class="pl-4 border-l-2 border-blue-100 space-y-1.5 mt-2">
                <div
                  v-for="child in kpi.children"
                  :key="child.id"
                  class="flex items-center gap-3 text-xs"
                >
                  <div class="w-1.5 h-1.5 rounded-full flex-shrink-0" :class="statusDot(child.status)" />
                  <span class="flex-1 text-gray-700 truncate">{{ child.title }}</span>
                  <span class="text-gray-400">{{ child.current_value }}/{{ child.target_value }} {{ child.unit }}</span>
                  <span class="crm-tag text-[10px]" :class="kpiStatusTag(child.status)">
                    {{ kpiStatusLabel(child.status) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-12">
            <AimOutlined style="font-size: 40px; color: #D1D5DB;" />
            <p class="mt-3 text-gray-400 text-sm">Chưa có KPI nào được giao</p>
          </div>
        </a-tab-pane>

        <!-- ─── Tab 3: Bảng lương ─── -->
        <a-tab-pane key="salary" tab="Bảng lương">
          <!-- Current config -->
          <div v-if="detailData.currentSalary" class="salary-current-card mb-4">
            <div class="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-2">Đang áp dụng</div>
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white">
                <DollarOutlined style="font-size: 20px;" />
              </div>
              <div>
                <div class="text-2xl font-bold text-gray-900">{{ formatCurrency(getMainRate(detailData.currentSalary)) }}</div>
                <div class="text-xs text-gray-500">{{ translateType(detailData.currentSalary.salary_type) }} · Hiệu lực từ {{ formatDate(detailData.currentSalary.effective_from) }}</div>
              </div>
            </div>
            <div v-if="detailData.currentSalary.overtime_rate" class="mt-2 text-xs text-gray-500">
              Tăng ca: {{ formatCurrency(detailData.currentSalary.overtime_rate) }}/giờ
            </div>
          </div>

          <!-- Salary history -->
          <div v-if="detailData.salaryConfigs?.length" class="salary-history">
            <div class="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-3">Lịch sử điều chỉnh</div>
            <a-table
              :data-source="detailData.salaryConfigs"
              :columns="salaryColumns"
              :pagination="{ pageSize: 5 }"
              size="small"
              row-key="id"
            >
              <template #bodyCell="{ column, record: rec }">
                <template v-if="column.key === 'type'">
                  <a-tag color="blue" class="rounded-full">{{ translateType(rec.salary_type) }}</a-tag>
                </template>
                <template v-if="column.key === 'rate'">
                  <span class="font-semibold">{{ formatCurrency(getMainRate(rec)) }}</span>
                </template>
                <template v-if="column.key === 'date'">
                  {{ formatDate(rec.effective_from) }}
                </template>
                <template v-if="column.key === 'status'">
                  <a-tag v-if="detailData.currentSalary?.id === rec.id" color="green" class="rounded-full">Đang dùng</a-tag>
                  <a-tag v-else color="default" class="rounded-full">Hết hạn</a-tag>
                </template>
              </template>
            </a-table>
          </div>

          <div v-if="!detailData.currentSalary && !detailData.salaryConfigs?.length" class="text-center py-12">
            <DollarOutlined style="font-size: 40px; color: #D1D5DB;" />
            <p class="mt-3 text-gray-400 text-sm">Chưa cấu hình lương</p>
            <a-button type="primary" class="mt-3 rounded-xl" @click="goToSalaryConfig">Cấu hình ngay</a-button>
          </div>
        </a-tab-pane>
      </a-tabs>

      <!-- Footer Actions -->
      <div class="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
        <a-button @click="openEditFromDetail" type="primary" ghost>
          <template #icon><EditOutlined /></template>
          Sửa thông tin
        </a-button>
        <a-button v-if="filters.type === 'employee'" @click="goToSalaryConfig">
          <template #icon><DollarOutlined /></template>
          Cấu hình lương
        </a-button>
        <a-button v-if="filters.type === 'employee'" @click="goToKpi">
          <template #icon><AimOutlined /></template>
          Giao KPI
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, useForm, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import { useStatusFormat } from '@/Composables/useStatusFormat'
import dayjs from 'dayjs'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined,
  TeamOutlined, UserOutlined, EyeOutlined, AimOutlined,
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  employees: Object,
  stats: Object,
  departments: Array,
  roles: Array,
  filters: Object,
})

const { kpiStatusLabel, kpiStatusTag } = useStatusFormat()

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

const filters = ref({
  search: props.filters?.search || '',
  department_id: props.filters?.department_id ? Number(props.filters.department_id) : undefined,
  type: props.filters?.type || 'employee',
})

const dynamicColumns = computed(() => {
  const base = [
    { title: filters.value.type === 'customer' ? 'Khách hàng' : 'Nhân viên', key: 'name', width: 280 },
    { title: 'SĐT', key: 'phone', width: 140 },
  ]
  
  if (filters.value.type === 'employee') {
    base.push({ title: 'Phòng ban', key: 'department', width: 160 })
  }
  
  base.push({ title: 'Vai trò', key: 'roles', width: 200 })
  
  const mode = new URLSearchParams(window.location.search).get('mode')
  if (mode === 'salary' && filters.value.type === 'employee') {
    base.push({ title: 'Lương/Đơn giá', key: 'salary', width: 160 })
  }
  
  base.push({ title: 'Trạng thái', key: 'status', width: 120, align: 'center' })
  base.push({ title: '', key: 'actions', width: 140, align: 'center', fixed: 'right' })
  
  return base
})

const filteredRoles = computed(() => {
  const customerRoles = ['Khách Hàng', 'Giám sát (KH)', 'client', 'project_owner']
  if (filters.value.type === 'customer') {
    return props.roles.filter(r => customerRoles.includes(r.name))
  }
  return props.roles.filter(r => !customerRoles.includes(r.name))
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
    type: filters.value.type,
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
    type: filters.value.type,
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
  user_type: 'employee',
})

const openCreateModal = () => {
  editingEmployee.value = null
  form.reset()
  form.user_type = filters.value.type
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
  form.user_type = emp.user_type || filters.value.type
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

const formatDate = (d) => d ? dayjs(d).format('DD/MM/YYYY') : '—'

// ============================================================
// DETAIL MODAL
// ============================================================
const detailModalVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref(null)
const detailEmployee = ref(null)
const detailTab = ref('info')

const openDetailModal = async (emp) => {
  detailEmployee.value = emp
  detailTab.value = 'info'
  detailLoading.value = true
  detailModalVisible.value = true
  detailData.value = null

  try {
    const response = await fetch(`/hr/employees/${emp.id}/detail`, {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    })
    if (response.ok) {
      detailData.value = await response.json()
    }
  } catch (e) {
    console.error('Failed to load employee detail', e)
  } finally {
    detailLoading.value = false
  }
}

const openEditFromDetail = () => {
  detailModalVisible.value = false
  if (detailData.value?.employee) {
    openEditModal(detailData.value.employee)
  }
}

const goToSalaryConfig = () => {
  detailModalVisible.value = false
  router.visit(`/hr/employees/${detailEmployee.value?.id}/salary`)
}

const goToKpi = () => {
  detailModalVisible.value = false
  router.visit('/hr/kpi')
}

// KPI helpers for detail modal
const kpiProgressPct = (kpi) => {
  if (kpi?.children?.length) {
    const totalPct = kpi.children.reduce((sum, child) => {
      if (!child.target_value || child.target_value <= 0) return sum
      return sum + Math.min((child.current_value / child.target_value) * 100, 100)
    }, 0)
    return Math.round(totalPct / kpi.children.length)
  }
  if (!kpi?.target_value || kpi.target_value <= 0) return 0
  return Math.min(Math.round((kpi.current_value / kpi.target_value) * 100), 100)
}

const kpiProgressColor = (kpi) => {
  const pct = kpiProgressPct(kpi)
  if (kpi?.status === 'verified_success') return '#10B981'
  if (kpi?.status === 'verified_fail') return '#EF4444'
  if (pct >= 100) return '#10B981'
  if (pct >= 70) return '#3B82F6'
  if (pct >= 40) return '#F59E0B'
  return '#EF4444'
}

const statusDot = (status) => ({
  'bg-blue-500': status === 'pending',
  'bg-amber-500': status === 'completed',
  'bg-emerald-500': status === 'verified_success',
  'bg-red-500': status === 'verified_fail',
})

// Salary columns for detail modal
const salaryColumns = [
  { title: 'Ngày hiệu lực', key: 'date', width: 120 },
  { title: 'Hình thức', key: 'type', width: 120 },
  { title: 'Đơn giá', key: 'rate' },
  { title: 'Trạng thái', key: 'status', width: 100 },
]
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

/* Detail Modal */
.detail-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 16px;
}
.detail-tabs :deep(.ant-tabs-tab) {
  font-weight: 500;
  padding: 10px 4px;
}
.detail-descriptions :deep(.ant-descriptions-item-label) {
  font-weight: 600;
  color: #5D6B82;
  background: #FAFBFC;
}

/* KPI cards in detail */
.kpi-card {
  padding: 16px;
  background: #FAFBFC;
  border: 1px solid #E8ECF1;
  border-radius: 12px;
  transition: all 0.2s ease;
}
.kpi-card:hover {
  border-color: #AED6F1;
  box-shadow: 0 2px 8px rgba(27, 79, 114, 0.06);
}

/* Salary current card */
.salary-current-card {
  padding: 20px;
  background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
  border: 1px solid #bbf7d0;
  border-radius: 16px;
}

/* Salary history table */
.salary-history :deep(.ant-table-thead > tr > th) {
  background: #FAFBFC;
  font-weight: 600;
  font-size: 12px;
  color: #5D6B82;
}
</style>
