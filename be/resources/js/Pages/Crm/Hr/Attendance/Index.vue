<template>
  <Head title="Chấm công" />

  <PageHeader title="Quản lý chấm công" subtitle="Theo dõi, duyệt và tổng hợp chi phí nhân công theo dự án">
    <template #actions>
      <a-button v-if="can('attendance.manage')" type="primary" size="large" @click="showCreateModal = true" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);">
        <template #icon><PlusOutlined /></template>
        Nhập chấm công
      </a-button>
    </template>
  </PageHeader>

  <!-- Stats -->
  <div class="crm-stats-grid">
    <StatCard label="Tổng bản ghi" :value="stats.total_records" icon="FileTextOutlined" variant="primary" />
    <StatCard label="Có mặt / Trễ" :value="stats.total_present" icon="CheckCircleOutlined" variant="success" />
    <StatCard label="Chờ duyệt" :value="stats.pending_approval" icon="ClockCircleOutlined" variant="warning" />
    <StatCard label="Tổng giờ làm" :value="stats.total_hours + 'h'" icon="FieldTimeOutlined" variant="accent" format="text" />
  </div>

  <!-- Filters -->
  <div class="crm-content-card mb-5">
    <div class="p-4 flex flex-wrap items-center gap-3" style="border-bottom: none;">
      <a-date-picker
        picker="month"
        v-model:value="filterMonth"
        format="MM/YYYY"
        size="large"
        @change="applyFilters"
        :allow-clear="false"
        style="width: 140px;"
      />
      <a-select
        v-model:value="localFilters.project_id"
        placeholder="Tất cả dự án"
        style="width: 220px;"
        size="large"
        allow-clear
        show-search
        :filter-option="filterOption"
        @change="applyFilters"
      >
        <a-select-option v-for="p in projects" :key="p.id" :value="String(p.id)" :label="p.name">
          {{ p.code ? `[${p.code}] ` : '' }}{{ p.name }}
        </a-select-option>
      </a-select>
      <a-select
        v-model:value="localFilters.user_id"
        placeholder="Tất cả nhân viên"
        style="width: 200px;"
        size="large"
        allow-clear
        show-search
        :filter-option="filterOption"
        @change="applyFilters"
      >
        <a-select-option v-for="u in employees" :key="u.id" :value="String(u.id)" :label="u.name">
          {{ u.name }}
        </a-select-option>
      </a-select>
      <a-select
        v-model:value="localFilters.status"
        placeholder="Trạng thái CC"
        style="width: 140px;"
        size="large"
        allow-clear
        @change="applyFilters"
      >
        <a-select-option value="present">Có mặt</a-select-option>
        <a-select-option value="late">Trễ</a-select-option>
        <a-select-option value="absent">Vắng</a-select-option>
        <a-select-option value="half_day">Nửa ngày</a-select-option>
        <a-select-option value="leave">Nghỉ phép</a-select-option>
        <a-select-option value="holiday">Nghỉ lễ</a-select-option>
      </a-select>
      <a-select
        v-model:value="localFilters.workflow_status"
        placeholder="Luồng duyệt"
        style="width: 140px;"
        size="large"
        allow-clear
        @change="applyFilters"
      >
        <a-select-option value="draft">Nháp</a-select-option>
        <a-select-option value="submitted">Chờ duyệt</a-select-option>
        <a-select-option value="approved">Đã duyệt</a-select-option>
        <a-select-option value="rejected">Từ chối</a-select-option>
      </a-select>

      <a-popconfirm
        v-if="localFilters.project_id && can('attendance.manage')"
        :title="`Tổng hợp chi phí nhân công tháng ${currentMonth}/${currentYear} cho dự án này?`"
        ok-text="Tổng hợp"
        cancel-text="Hủy"
        @confirm="handleGenerateCosts"
      >
        <a-button size="large" class="rounded-xl" style="background:#F0FFF4;border-color:#86EFAC;color:#16A34A;font-weight:600;">
          <template #icon><DollarOutlined /></template>
          Tổng hợp CP nhân công
        </a-button>
      </a-popconfirm>
    </div>
  </div>

  <!-- Table -->
  <div class="crm-content-card">
    <a-table
      :columns="columns"
      :data-source="records.data"
      :pagination="{
        current: records.current_page,
        pageSize: records.per_page,
        total: records.total,
        showTotal: (t) => `${t} bản ghi`,
      }"
      row-key="id"
      class="crm-table"
      :scroll="{ x: 1100 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'employee'">
          <div class="flex items-center gap-2">
            <a-avatar size="small" class="bg-blue-500 text-white text-xs font-bold flex-shrink-0">
              {{ record.user?.name?.charAt(0)?.toUpperCase() }}
            </a-avatar>
            <div>
              <div class="font-semibold text-gray-800 text-sm">{{ record.user?.name || '—' }}</div>
              <div class="text-xs text-gray-400">{{ record.project?.name || 'Không có dự án' }}</div>
            </div>
          </div>
        </template>

        <template v-else-if="column.key === 'work_date'">
          <span class="text-sm text-gray-700 font-medium">{{ formatDate(record.work_date) }}</span>
        </template>

        <template v-else-if="column.key === 'check_in_out'">
          <div class="flex items-center gap-2 text-sm">
            <span class="text-green-600 font-medium">{{ fmtTime(record.check_in) }}</span>
            <span class="text-gray-300">→</span>
            <span class="text-red-500 font-medium">{{ fmtTime(record.check_out) }}</span>
          </div>
          <div class="text-xs text-gray-400 mt-0.5">
            {{ record.hours_worked ? record.hours_worked + 'h làm' : '' }}
            <span v-if="record.overtime_hours > 0" class="text-orange-500 ml-1">+{{ record.overtime_hours }}h OT</span>
          </div>
        </template>

        <template v-else-if="column.key === 'status'">
          <span class="crm-tag" :class="statusClass(record.status)">{{ statusLabel(record.status) }}</span>
        </template>

        <template v-else-if="column.key === 'workflow'">
          <div>
            <a-tag :color="workflowColor(record.workflow_status)" class="rounded-full text-xs font-medium">
              {{ workflowLabel(record.workflow_status) }}
            </a-tag>
            <div v-if="record.workflow_status === 'approved' && record.approver" class="text-xs text-gray-400 mt-0.5">
              {{ record.approver?.name }}
            </div>
            <a-tooltip v-if="record.workflow_status === 'rejected' && record.rejected_reason" :title="record.rejected_reason">
              <div class="text-xs text-red-400 mt-0.5 cursor-help truncate max-w-[140px]">
                <ExclamationCircleOutlined class="mr-0.5" />{{ record.rejected_reason }}
              </div>
            </a-tooltip>
          </div>
        </template>

        <template v-else-if="column.key === 'actions'">
          <div class="flex gap-1">
            <template v-if="record.workflow_status !== 'approved'">
              <a-tooltip v-if="can('attendance.approve')" title="Duyệt & tạo CP nhân công">
                <a-popconfirm title="Duyệt chấm công và tự động tạo chi phí nhân công?" ok-text="Duyệt" cancel-text="Hủy" @confirm="approveRecord(record.id)">
                  <a-button type="text" size="small"><CheckOutlined style="color:#16A34A;" /></a-button>
                </a-popconfirm>
              </a-tooltip>
              <a-tooltip v-if="can('attendance.approve')" title="Từ chối chấm công">
                <a-button type="text" size="small" @click="openRejectModal(record)">
                  <CloseOutlined style="color:#DC2626;" />
                </a-button>
              </a-tooltip>
              <a-tooltip title="Xem chi tiết">
                <a-button type="text" size="small" @click="selectedRecord = record; showDrawer = true">
                  <EyeOutlined style="color:#6B7280;" />
                </a-button>
              </a-tooltip>
            </template>
            <template v-else>
              <span class="text-xs text-green-600 font-medium">✓</span>
              <a-tooltip title="Xem chi tiết">
                <a-button type="text" size="small" @click="selectedRecord = record; showDrawer = true">
                  <EyeOutlined style="color:#6B7280;" />
                </a-button>
              </a-tooltip>
            </template>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- Create Modal -->
  <a-modal
    v-model:open="showCreateModal"
    title="Nhập chấm công thủ công"
    ok-text="Lưu"
    cancel-text="Hủy"
    :confirm-loading="submitting"
    @ok="handleCreate"
    :width="520"
  >
    <div class="space-y-4 mt-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nhân viên <span class="text-red-500">*</span></label>
        <a-select v-model:value="form.user_id" style="width:100%;" size="large" show-search :filter-option="filterOption" placeholder="Chọn nhân viên">
          <a-select-option v-for="u in employees" :key="u.id" :value="u.id" :label="u.name">{{ u.name }}</a-select-option>
        </a-select>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ngày làm việc <span class="text-red-500">*</span></label>
          <a-date-picker v-model:value="formDate" style="width:100%;" size="large" format="DD/MM/YYYY" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Trạng thái <span class="text-red-500">*</span></label>
          <a-select v-model:value="form.status" style="width:100%;" size="large">
            <a-select-option value="present">Có mặt</a-select-option>
            <a-select-option value="late">Trễ</a-select-option>
            <a-select-option value="absent">Vắng</a-select-option>
            <a-select-option value="half_day">Nửa ngày</a-select-option>
            <a-select-option value="leave">Nghỉ phép</a-select-option>
            <a-select-option value="holiday">Nghỉ lễ</a-select-option>
          </a-select>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Dự án</label>
        <a-select v-model:value="form.project_id" style="width:100%;" size="large" allow-clear placeholder="Không thuộc dự án nào" show-search :filter-option="filterOption">
          <a-select-option v-for="p in projects" :key="p.id" :value="p.id" :label="p.name">{{ p.name }}</a-select-option>
        </a-select>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Giờ vào ca</label>
          <a-time-picker v-model:value="formCheckIn" style="width:100%;" size="large" format="HH:mm" :minute-step="15" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Giờ ra ca</label>
          <a-time-picker v-model:value="formCheckOut" style="width:100%;" size="large" format="HH:mm" :minute-step="15" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
        <a-textarea v-model:value="form.note" :rows="2" placeholder="Ghi chú thêm..." />
      </div>
    </div>
  </a-modal>

  <!-- Reject Modal -->
  <a-modal
    v-model:open="showRejectModal"
    title="Từ chối chấm công"
    ok-text="Từ chối"
    cancel-text="Hủy"
    ok-type="danger"
    :confirm-loading="rejecting"
    @ok="handleReject"
    :width="440"
  >
    <div class="mt-4">
      <p class="text-sm text-gray-600 mb-3">
        Từ chối chấm công của <strong>{{ rejectTarget?.user?.name }}</strong> ngày <strong>{{ formatDate(rejectTarget?.work_date) }}</strong>.
      </p>
      <label class="block text-sm font-medium text-gray-700 mb-1">Lý do từ chối <span class="text-red-500">*</span></label>
      <a-textarea v-model:value="rejectReason" :rows="3" placeholder="Nhập lý do từ chối..." />
    </div>
  </a-modal>

  <!-- Detail Drawer -->
  <a-drawer
    v-model:open="showDrawer"
    title="Chi tiết chấm công"
    placement="right"
    :width="420"
    :destroy-on-close="false"
  >
    <template v-if="selectedRecord">
      <div class="space-y-4">
        <!-- Employee info -->
        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <a-avatar size="large" class="bg-blue-500 text-white font-bold text-lg">
            {{ selectedRecord.user?.name?.charAt(0)?.toUpperCase() }}
          </a-avatar>
          <div>
            <div class="font-semibold text-gray-800 text-base">{{ selectedRecord.user?.name || '—' }}</div>
            <div class="text-xs text-gray-400">{{ selectedRecord.user?.email || '' }}</div>
          </div>
        </div>

        <a-descriptions :column="1" bordered size="small" class="rounded-xl overflow-hidden">
          <a-descriptions-item label="Dự án">
            {{ selectedRecord.project?.name || '—' }}
          </a-descriptions-item>
          <a-descriptions-item label="Ngày làm việc">
            <span class="font-medium">{{ formatDate(selectedRecord.work_date) }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="Vào ca">
            <span class="text-green-600 font-semibold text-base">{{ fmtTime(selectedRecord.check_in) }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="Ra ca">
            <span class="text-red-500 font-semibold text-base">{{ fmtTime(selectedRecord.check_out) }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="Giờ làm">
            <span class="font-semibold">{{ selectedRecord.hours_worked || 0 }}h</span>
            <span v-if="selectedRecord.overtime_hours > 0" class="text-orange-500 ml-2 text-xs">+{{ selectedRecord.overtime_hours }}h OT</span>
          </a-descriptions-item>
          <a-descriptions-item label="Trạng thái CC">
            <span class="crm-tag" :class="statusClass(selectedRecord.status)">{{ statusLabel(selectedRecord.status) }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="Luồng duyệt">
            <a-tag :color="workflowColor(selectedRecord.workflow_status)" class="rounded-full">
              {{ workflowLabel(selectedRecord.workflow_status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item v-if="selectedRecord.workflow_status === 'rejected' && selectedRecord.rejected_reason" label="Lý do từ chối">
            <span class="text-red-500 text-xs">{{ selectedRecord.rejected_reason }}</span>
          </a-descriptions-item>
          <a-descriptions-item v-if="selectedRecord.approved_by" label="Người duyệt">
            {{ selectedRecord.approver?.name || '—' }}
          </a-descriptions-item>
          <a-descriptions-item v-if="selectedRecord.note" label="Ghi chú">
            {{ selectedRecord.note }}
          </a-descriptions-item>
        </a-descriptions>

        <!-- Actions inside drawer -->
        <div v-if="selectedRecord.workflow_status !== 'approved' && can('attendance.approve')" class="flex gap-2 pt-2">
          <a-popconfirm
            title="Duyệt chấm công này?"
            ok-text="Duyệt"
            cancel-text="Hủy"
            @confirm="approveRecord(selectedRecord.id); showDrawer = false"
          >
            <a-button type="primary" style="flex:1;">
              <template #icon><CheckOutlined /></template>
              Duyệt chấm công
            </a-button>
          </a-popconfirm>
          <a-button danger style="flex:1;" @click="openRejectModal(selectedRecord); showDrawer = false">
            <template #icon><CloseOutlined /></template>
            Từ chối
          </a-button>
        </div>
        <div v-else class="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
          <CheckCircleOutlined class="text-green-600" />
          <div>
            <div class="text-sm font-semibold text-green-700">Đã duyệt</div>
            <div class="text-xs text-green-500">Người duyệt: {{ selectedRecord.approver?.name || '—' }}</div>
          </div>
        </div>
      </div>
    </template>
  </a-drawer>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Head, router, usePage } from '@inertiajs/vue3'
import dayjs from 'dayjs'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import {
  PlusOutlined, CheckCircleOutlined, ClockCircleOutlined,
  FieldTimeOutlined, DollarOutlined, CheckOutlined, CloseOutlined,
  ExclamationCircleOutlined, EyeOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

defineOptions({ layout: CrmLayout })

// ── RBAC ─────────────────────────────────────────────────────
const page = usePage()
const authPerms = computed(() => page.props.auth?.user?.permissions || [])
const isSuperAdmin = computed(() => page.props.auth?.user?.super_admin === true)
const can = (perm) => isSuperAdmin.value || authPerms.value.includes(perm)

const props = defineProps({
  records: Object,
  stats: Object,
  projects: Array,
  employees: Array,
  filters: Object,
  currentYear: Number,
  currentMonth: Number,
})

// ── Filters ──────────────────────────────────────────────────
const localFilters = reactive({
  project_id:      props.filters?.project_id      || null,
  user_id:         props.filters?.user_id         || null,
  status:          props.filters?.status          || null,
  workflow_status: props.filters?.workflow_status || null,
})

const filterMonth = ref(
  props.filters?.year && props.filters?.month
    ? dayjs(`${props.filters.year}-${String(props.filters.month).padStart(2,'0')}-01`)
    : dayjs()
)

const buildQuery = () => {
  const p = new URLSearchParams()
  p.set('year',  filterMonth.value.year())
  p.set('month', filterMonth.value.month() + 1)
  if (localFilters.project_id)      p.set('project_id',      localFilters.project_id)
  if (localFilters.user_id)         p.set('user_id',         localFilters.user_id)
  if (localFilters.status)          p.set('status',          localFilters.status)
  if (localFilters.workflow_status) p.set('workflow_status', localFilters.workflow_status)
  return p.toString()
}

const applyFilters = () => router.visit(`/hr/attendance?${buildQuery()}`, { preserveState: true })

const filterOption = (input, option) => option.label?.toLowerCase().includes(input.toLowerCase())

// ── Helpers ───────────────────────────────────────────────────
const formatDate = (d) => d ? dayjs(d).format('DD/MM/YYYY (ddd)') : '—'
const fmtTime    = (t) => t ? t.substring(0, 5) : '—'

const statusLabel = (s) => ({
  present: 'Có mặt', late: 'Trễ', absent: 'Vắng',
  half_day: 'Nửa ngày', leave: 'Nghỉ phép', holiday: 'Nghỉ lễ',
})[s] || s

const statusClass = (s) => ({
  present:  'crm-tag--completed',
  late:     'crm-tag--pending',
  absent:   'crm-tag--overdue',
  half_day: 'crm-tag--active',
  leave:    'crm-tag--cancelled',
  holiday:  'crm-tag--cancelled',
})[s] || ''

const workflowLabel = (s) => ({
  draft:     'Nháp',
  submitted: 'Chờ duyệt',
  approved:  'Đã duyệt',
  rejected:  'Từ chối',
})[s] || s || 'Nháp'

const workflowColor = (s) => ({
  draft:     'default',
  submitted: 'orange',
  approved:  'green',
  rejected:  'red',
})[s] || 'default'

// ── Table columns ─────────────────────────────────────────────
const columns = [
  { title: 'Nhân viên / Dự án', key: 'employee',   width: 220 },
  { title: 'Ngày làm',          key: 'work_date',   width: 140 },
  { title: 'Vào – Ra / Giờ',   key: 'check_in_out', width: 150 },
  { title: 'Trạng thái',        key: 'status',       width: 100 },
  { title: 'Luồng duyệt',       key: 'workflow',     width: 160 },
  { title: '',                  key: 'actions',      width: 80, fixed: 'right' },
]

// ── Approve ───────────────────────────────────────────────────
const approveRecord = (id) => {
  router.post(`/hr/attendance/${id}/approve`, {}, {
    preserveScroll: true,
    onSuccess: () => message.success('Đã duyệt chấm công'),
  })
}

// ── Detail Drawer ─────────────────────────────────────────────
const showDrawer     = ref(false)
const selectedRecord = ref(null)

// ── Reject ────────────────────────────────────────────────────
const showRejectModal = ref(false)
const rejecting       = ref(false)
const rejectTarget    = ref(null)
const rejectReason    = ref('')

const openRejectModal = (record) => {
  rejectTarget.value = record
  rejectReason.value = ''
  showRejectModal.value = true
}

const handleReject = () => {
  if (!rejectReason.value.trim()) {
    message.warning('Vui lòng nhập lý do từ chối')
    return
  }
  rejecting.value = true
  router.post(`/hr/attendance/${rejectTarget.value.id}/reject`, {
    reason: rejectReason.value,
  }, {
    preserveScroll: true,
    onSuccess: () => {
      showRejectModal.value = false
      message.success('Đã từ chối chấm công')
    },
    onFinish: () => { rejecting.value = false },
  })
}

// ── Generate labor costs ──────────────────────────────────────
const handleGenerateCosts = () => {
  router.post('/hr/attendance/generate-labor-costs', {
    project_id: localFilters.project_id,
    year:  filterMonth.value.year(),
    month: filterMonth.value.month() + 1,
  }, { preserveScroll: true })
}

// ── Create modal ──────────────────────────────────────────────
const showCreateModal = ref(false)
const submitting      = ref(false)
const formDate        = ref(dayjs())
const formCheckIn     = ref(null)
const formCheckOut    = ref(null)
const form = reactive({
  user_id:    null,
  project_id: null,
  status:     'present',
  note:       '',
})

const handleCreate = () => {
  if (!form.user_id)      { message.warning('Vui lòng chọn nhân viên'); return }
  if (!formDate.value)    { message.warning('Vui lòng chọn ngày'); return }

  submitting.value = true
  router.post('/hr/attendance', {
    user_id:    form.user_id,
    project_id: form.project_id,
    work_date:  formDate.value.format('YYYY-MM-DD'),
    check_in:   formCheckIn.value  ? formCheckIn.value.format('HH:mm')  : null,
    check_out:  formCheckOut.value ? formCheckOut.value.format('HH:mm') : null,
    status:     form.status,
    note:       form.note,
  }, {
    preserveScroll: true,
    onSuccess: () => {
      showCreateModal.value = false
      message.success('Đã lưu chấm công')
      form.user_id = null; form.project_id = null; form.status = 'present'; form.note = ''
      formDate.value = dayjs(); formCheckIn.value = null; formCheckOut.value = null
    },
    onFinish: () => { submitting.value = false },
  })
}
</script>
