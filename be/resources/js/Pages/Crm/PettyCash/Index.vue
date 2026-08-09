<template>
  <Head title="Quản lý Tiền mặt" />

  <PageHeader title="Quản Lý Tiền Mặt" subtitle="Sổ quỹ tiền mặt, phiếu thu - chi và theo dõi tồn quỹ thực tế">
    <template #actions>
      <a-button type="default" size="large" class="rounded-xl border-emerald-300 text-emerald-600 hover:text-emerald-700 hover:border-emerald-400" @click="exportExcel">
        <template #icon><DownloadOutlined /></template>
        Xuất sổ quỹ Excel
      </a-button>
      <a-button type="primary" size="large" class="rounded-xl bg-emerald-600 hover:bg-emerald-700 border-none shadow-sm" @click="openCreateModal('inflow')">
        <template #icon><ArrowDownOutlined /></template>
        + Lập Phiếu Thu
      </a-button>
      <a-button type="primary" size="large" class="rounded-xl bg-blue-600 hover:bg-blue-700 border-none shadow-sm" @click="openCreateModal('outflow')">
        <template #icon><ArrowUpOutlined /></template>
        + Lập Phiếu Chi
      </a-button>
    </template>
  </PageHeader>

  <!-- ═══ Stats Cards ═══ -->
  <div class="crm-stats-grid">
    <StatCard :value="fmtMoney(stats.current_balance || 0)" label="Tồn quỹ tiền mặt hiện tại" :icon="WalletOutlined" variant="success" format="text" />
    <StatCard :value="fmtMoney(stats.total_inflow || 0)" label="Tổng Thu tiền mặt" :icon="ArrowDownOutlined" variant="primary" format="text" />
    <StatCard :value="fmtMoney(stats.total_outflow || 0)" label="Tổng Chi tiền mặt" :icon="ArrowUpOutlined" variant="danger" format="text" />
    <StatCard :value="stats.pending_count || 0" label="Phiếu chờ phê duyệt" :icon="ClockCircleOutlined" variant="warning" />
  </div>

  <!-- ═══ Main Table Section ═══ -->
  <div class="crm-content-card">
    <!-- Filter Bar -->
    <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-3 flex-wrap bg-gray-50/40">
      <a-input-search v-model:value="localFilters.search" placeholder="Tìm mã phiếu, đối tượng, nội dung..." class="max-w-xs" allow-clear @search="applyFilters" />
      
      <a-select v-model:value="localFilters.type" placeholder="Loại giao dịch" allow-clear style="width: 150px" @change="applyFilters">
        <a-select-option value="">Tất cả loại</a-select-option>
        <a-select-option value="inflow">Thu tiền mặt</a-select-option>
        <a-select-option value="outflow">Chi tiền mặt</a-select-option>
      </a-select>

      <a-select v-model:value="localFilters.status" placeholder="Trạng thái" allow-clear style="width: 150px" @change="applyFilters">
        <a-select-option value="">Tất cả TT</a-select-option>
        <a-select-option value="pending_approval">Chờ duyệt</a-select-option>
        <a-select-option value="completed">Đã hoàn tất</a-select-option>
        <a-select-option value="rejected">Từ chối</a-select-option>
        <a-select-option value="draft">Nháp</a-select-option>
      </a-select>

      <a-select v-model:value="localFilters.category" placeholder="Phân loại" allow-clear style="width: 170px" @change="applyFilters">
        <a-select-option value="">Tất cả phân loại</a-select-option>
        <a-select-option value="tam_ung">Tạm ứng</a-select-option>
        <a-select-option value="chi_phi_vp">Chi phí văn phòng</a-select-option>
        <a-select-option value="chi_phi_ct">Chi phí công trình</a-select-option>
        <a-select-option value="nop_quy">Nộp quỹ tiền mặt</a-select-option>
        <a-select-option value="hoan_ung">Hoàn ứng</a-select-option>
        <a-select-option value="thanh_toan_kh">Thu tiền khách hàng</a-select-option>
        <a-select-option value="khac">Khác</a-select-option>
      </a-select>

      <a-select v-model:value="localFilters.project_id" placeholder="Lọc theo Dự án" allow-clear style="width: 180px" @change="applyFilters">
        <a-select-option value="">Tất cả dự án</a-select-option>
        <a-select-option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
      </a-select>
    </div>

    <!-- Table -->
    <a-table :columns="columns" :data-source="transactions.data" :pagination="{ current: transactions.current_page, total: transactions.total, pageSize: transactions.per_page, showTotal: (t) => `${t} phiếu thu/chi` }" :loading="loading" row-key="id" size="small" class="crm-table hover-row" @change="handleTableChange">
      <template #bodyCell="{ column, record }">
        <!-- Mã phiếu -->
        <template v-if="column.key === 'code'">
          <div class="flex flex-col cursor-pointer" @click="openDetail(record)">
            <span class="font-bold text-blue-600 hover:underline flex items-center gap-1">
              <span v-if="record.type === 'inflow'" class="text-emerald-500">🟢</span>
              <span v-else class="text-blue-500">🔵</span>
              {{ record.code }}
            </span>
            <span class="text-[10px] text-gray-400 font-mono">{{ fmtDate(record.transaction_date) }}</span>
          </div>
        </template>

        <!-- Loại phiếu -->
        <template v-else-if="column.key === 'type'">
          <a-tag v-if="record.type === 'inflow'" color="green" class="rounded-full px-2.5 py-0.5 text-[11px] font-bold border-none">
            THU TIỀN MẶT
          </a-tag>
          <a-tag v-else color="blue" class="rounded-full px-2.5 py-0.5 text-[11px] font-bold border-none">
            CHI TIỀN MẶT
          </a-tag>
        </template>

        <!-- Phân loại -->
        <template v-else-if="column.key === 'category'">
          <span class="text-xs font-semibold text-gray-700">{{ categoryLabels[record.category] || record.category }}</span>
        </template>

        <!-- Số tiền -->
        <template v-else-if="column.key === 'amount'">
          <div class="text-right">
            <span :class="['font-bold text-sm', record.type === 'inflow' ? 'text-emerald-600' : 'text-blue-600']">
              {{ record.type === 'inflow' ? '+' : '-' }}{{ fmtMoney(record.amount) }}
            </span>
          </div>
        </template>

        <!-- Đối tượng -->
        <template v-else-if="column.key === 'payer_receiver'">
          <div class="text-xs font-medium text-gray-700 max-w-[180px] truncate" :title="record.user?.name || record.payer_receiver_name || '—'">
            {{ record.user?.name || record.payer_receiver_name || '—' }}
          </div>
        </template>

        <!-- Dự án -->
        <template v-else-if="column.key === 'project'">
          <span class="text-xs text-gray-600 truncate max-w-[150px] inline-block" :title="record.project?.name">
            {{ record.project?.name || '—' }}
          </span>
        </template>

        <!-- Trạng thái -->
        <template v-else-if="column.key === 'status'">
          <div class="flex justify-center">
            <a-tag :color="statusColors[record.status]" class="rounded-full px-3 py-0.5 text-[11px] font-bold border-none">
              {{ statusLabels[record.status] || record.status }}
            </a-tag>
          </div>
        </template>

        <!-- Người lập -->
        <template v-else-if="column.key === 'creator'">
          <span class="text-xs text-gray-600">{{ record.creator?.name || '—' }}</span>
        </template>

        <!-- Thao tác -->
        <template v-else-if="column.key === 'actions'">
          <div class="flex justify-center gap-1">
            <a-tooltip title="Xem chi tiết">
              <a-button type="text" size="small" class="hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg" @click="openDetail(record)">
                <EyeOutlined />
              </a-button>
            </a-tooltip>
            
            <a-tooltip v-if="record.status === 'pending_approval'" title="Phê duyệt phiếu">
              <a-popconfirm title="Xác nhận duyệt & ghi nhận thu/chi quỹ tiền mặt?" ok-text="Duyệt" cancel-text="Hủy" @confirm="handleApprove(record)">
                <a-button type="text" size="small" class="hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700 rounded-lg">
                  <CheckOutlined />
                </a-button>
              </a-popconfirm>
            </a-tooltip>

            <a-tooltip v-if="record.status === 'pending_approval'" title="Từ chối phiếu">
              <a-button type="text" size="small" class="hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg" @click="openRejectModal(record)">
                <CloseOutlined />
              </a-button>
            </a-tooltip>

            <a-popconfirm title="Xóa phiếu thu/chi này?" ok-text="Xóa" cancel-text="Hủy" :ok-button-props="{ danger: true }" @confirm="handleDelete(record)">
              <a-button type="text" danger size="small" class="hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg">
                <DeleteOutlined />
              </a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- ═══ Modal Tạo / Sửa Phiếu Thu Chi ═══ -->
  <a-modal v-model:open="showModal" :title="form.type === 'inflow' ? 'Lập Phiếu Thu Tiền Mặt' : 'Lập Phiếu Chi Tiền Mặt'" :footer="null" :width="560">
    <a-form layout="vertical" class="space-y-3 py-2" @finish="handleSubmit">
      <div class="grid grid-cols-2 gap-3">
        <a-form-item label="Loại chứng từ" required>
          <a-select v-model:value="form.type">
            <a-select-option value="inflow">THU TIỀN MẶT (+)</a-select-option>
            <a-select-option value="outflow">CHI TIỀN MẶT (-)</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Phân loại thu/chi" required>
          <a-select v-model:value="form.category">
            <a-select-option value="tam_ung">Tạm ứng</a-select-option>
            <a-select-option value="chi_phi_vp">Chi phí văn phòng</a-select-option>
            <a-select-option value="chi_phi_ct">Chi phí công trình</a-select-option>
            <a-select-option value="nop_quy">Nộp quỹ tiền mặt</a-select-option>
            <a-select-option value="hoan_ung">Hoàn ứng</a-select-option>
            <a-select-option value="thanh_toan_kh">Thu tiền khách hàng</a-select-option>
            <a-select-option value="khac">Khác</a-select-option>
          </a-select>
        </a-form-item>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <a-form-item label="Số tiền (VNĐ)" required>
          <a-input-number v-model:value="form.amount" class="w-full" :min="1" :step="100000" :formatter="val => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')" :parser="val => val.replace(/\./g, '')" placeholder="Nhập số tiền..." />
        </a-form-item>

        <a-form-item label="Ngày chứng từ" required>
          <a-date-picker v-model:value="form.transaction_date" value-format="YYYY-MM-DD" class="w-full" placeholder="Chọn ngày..." />
        </a-form-item>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <a-form-item label="Nhân viên liên quan">
          <a-select v-model:value="form.user_id" placeholder="Chọn nhân viên..." allow-clear show-search option-filter-prop="label">
            <a-select-option v-for="u in users" :key="u.id" :value="u.id" :label="u.name">{{ u.name }}</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Tên người nộp / nhận tự do">
          <a-input v-model:value="form.payer_receiver_name" placeholder="Nếu không phải nhân viên..." />
        </a-form-item>
      </div>

      <a-form-item label="Dự án liên quan (nếu có)">
        <a-select v-model:value="form.project_id" placeholder="Chọn dự án..." allow-clear show-search option-filter-prop="label">
          <a-select-option v-for="p in projects" :key="p.id" :value="p.id" :label="p.name">{{ p.name }}</a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="Nội dung / Lý do thu chi" required>
        <a-textarea v-model:value="form.description" :rows="3" placeholder="Nhập chi tiết nội dung thu chi tiền mặt..." />
      </a-form-item>

      <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <a-button @click="showModal = false">Hủy</a-button>
        <a-button type="primary" html-type="submit" :loading="form.processing" :class="form.type === 'inflow' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'">
          Lưu & Gửi Duyệt
        </a-button>
      </div>
    </a-form>
  </a-modal>

  <!-- ═══ Drawer Chi Tiết Phiếu Thu Chi ═══ -->
  <a-drawer v-model:open="showDetailDrawer" title="Chi tiết chứng từ tiền mặt" width="480" destroy-on-close>
    <div v-if="selectedRecord" class="space-y-4 text-sm">
      <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
        <div>
          <div class="text-xs text-gray-400 font-bold uppercase tracking-wider">Mã chứng từ</div>
          <div class="text-lg font-black text-gray-800">{{ selectedRecord.code }}</div>
        </div>
        <a-tag :color="selectedRecord.type === 'inflow' ? 'green' : 'blue'" class="rounded-full px-3 py-1 text-xs font-bold border-none">
          {{ selectedRecord.type === 'inflow' ? 'THU TIỀN MẶT' : 'CHI TIỀN MẶT' }}
        </a-tag>
      </div>

      <div class="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-gray-100">
        <div>
          <div class="text-xs text-gray-400">Số tiền:</div>
          <div :class="['text-lg font-extrabold', selectedRecord.type === 'inflow' ? 'text-emerald-600' : 'text-blue-600']">
            {{ selectedRecord.type === 'inflow' ? '+' : '-' }}{{ fmtMoney(selectedRecord.amount) }}
          </div>
        </div>
        <div>
          <div class="text-xs text-gray-400">Ngày chứng từ:</div>
          <div class="font-bold text-gray-800">{{ fmtDate(selectedRecord.transaction_date) }}</div>
        </div>
      </div>

      <div class="space-y-2">
        <div class="flex justify-between border-b border-gray-100 pb-2">
          <span class="text-gray-400">Phân loại:</span>
          <span class="font-semibold text-gray-800">{{ categoryLabels[selectedRecord.category] || selectedRecord.category }}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-2">
          <span class="text-gray-400">Đối tượng nộp / nhận:</span>
          <span class="font-semibold text-gray-800">{{ selectedRecord.user?.name || selectedRecord.payer_receiver_name || '—' }}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-2">
          <span class="text-gray-400">Dự án:</span>
          <span class="font-semibold text-gray-800">{{ selectedRecord.project?.name || '—' }}</span>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-2">
          <span class="text-gray-400">Trạng thái:</span>
          <a-tag :color="statusColors[selectedRecord.status]" class="rounded-full font-bold border-none">
            {{ statusLabels[selectedRecord.status] || selectedRecord.status }}
          </a-tag>
        </div>
        <div class="flex justify-between border-b border-gray-100 pb-2">
          <span class="text-gray-400">Người lập:</span>
          <span class="font-medium text-gray-700">{{ selectedRecord.creator?.name || '—' }}</span>
        </div>
        <div v-if="selectedRecord.approver" class="flex justify-between border-b border-gray-100 pb-2">
          <span class="text-gray-400">Người duyệt:</span>
          <span class="font-medium text-gray-700">{{ selectedRecord.approver.name }}</span>
        </div>
      </div>

      <div>
        <div class="text-xs text-gray-400 mb-1">Nội dung / Lý do thu chi:</div>
        <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-800 leading-relaxed font-medium">
          {{ selectedRecord.description }}
        </div>
      </div>

      <div v-if="selectedRecord.status === 'pending_approval'" class="flex gap-2 pt-3 border-t border-gray-100">
        <a-button type="primary" class="flex-1 bg-emerald-600 hover:bg-emerald-700" @click="handleApprove(selectedRecord)">
          Duyệt & Xác Nhận Thu/Chi Quỹ
        </a-button>
        <a-button danger @click="openRejectModal(selectedRecord)">
          Từ Chối
        </a-button>
      </div>
    </div>
  </a-drawer>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { Head, useForm, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import { WalletOutlined, ArrowDownOutlined, ArrowUpOutlined, ClockCircleOutlined, DownloadOutlined, EyeOutlined, CheckOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  transactions: Object,
  stats: Object,
  projects: Array,
  users: Array,
  filters: Object,
})

const loading = ref(false)
const showModal = ref(false)
const showDetailDrawer = ref(false)
const selectedRecord = ref(null)

const localFilters = reactive({
  search: props.filters?.search || '',
  type: props.filters?.type || '',
  status: props.filters?.status || '',
  category: props.filters?.category || '',
  project_id: props.filters?.project_id || '',
  date_from: props.filters?.date_from || '',
  date_to: props.filters?.date_to || '',
})

const form = useForm({
  id: null,
  type: 'outflow',
  category: 'chi_phi_vp',
  amount: null,
  transaction_date: new Date().toISOString().substring(0, 10),
  project_id: null,
  user_id: null,
  payer_receiver_name: '',
  description: '',
})

const columns = [
  { title: 'Mã chứng từ', key: 'code', width: 140 },
  { title: 'Loại', key: 'type', width: 130, align: 'center' },
  { title: 'Phân loại', key: 'category', width: 150 },
  { title: 'Số tiền', key: 'amount', width: 150, align: 'right' },
  { title: 'Đối tượng nộp / nhận', key: 'payer_receiver', width: 170 },
  { title: 'Dự án', key: 'project', width: 150 },
  { title: 'Trạng thái', key: 'status', width: 130, align: 'center' },
  { title: 'Người lập', key: 'creator', width: 130 },
  { title: 'Thao tác', key: 'actions', width: 100, align: 'center' },
]

const statusLabels = {
  draft: 'Nháp',
  pending_approval: 'Chờ duyệt',
  completed: 'Đã hoàn tất',
  rejected: 'Từ chối',
}

const statusColors = {
  draft: 'default',
  pending_approval: 'orange',
  completed: 'green',
  rejected: 'red',
}

const categoryLabels = {
  tam_ung: 'Tạm ứng',
  chi_phi_vp: 'Chi phí văn phòng',
  chi_phi_ct: 'Chi phí công trình',
  nop_quy: 'Nộp quỹ tiền mặt',
  hoan_ung: 'Hoàn ứng',
  thanh_toan_kh: 'Thu tiền khách hàng',
  khac: 'Khác',
}

const applyFilters = () => {
  router.get('/petty-cash', localFilters, { preserveState: true, replace: true })
}

const handleTableChange = (pag) => {
  router.get('/petty-cash', { ...localFilters, page: pag.current }, { preserveState: true, replace: true })
}

const openCreateModal = (type = 'outflow') => {
  form.reset()
  form.type = type
  form.category = type === 'inflow' ? 'nop_quy' : 'chi_phi_vp'
  form.transaction_date = new Date().toISOString().substring(0, 10)
  showModal.value = true
}

const openDetail = (record) => {
  selectedRecord.value = record
  showDetailDrawer.value = true
}

const handleSubmit = () => {
  form.post('/petty-cash', {
    onSuccess: () => {
      showModal.value = false
      message.success('Đã lập phiếu tiền mặt thành công')
    },
  })
}

const handleApprove = (record) => {
  router.post(`/petty-cash/${record.id}/approve`, {}, {
    onSuccess: () => {
      showDetailDrawer.value = false
      message.success('Đã duyệt & cập nhật quỹ tiền mặt')
    },
  })
}

const openRejectModal = (record) => {
  let reason = ''
  Modal.confirm({
    title: 'Từ chối phê duyệt phiếu tiền mặt',
    content: 'Nhập lý do từ chối:',
    onOk() {
      router.post(`/petty-cash/${record.id}/reject`, { rejection_reason: reason }, {
        onSuccess: () => {
          showDetailDrawer.value = false
          message.success('Đã từ chối phiếu')
        },
      })
    },
  })
}

const handleDelete = (record) => {
  router.delete(`/petty-cash/${record.id}`, {
    onSuccess: () => message.success('Đã xóa phiếu'),
  })
}

const exportExcel = () => {
  window.open(`/petty-cash/export?${new URLSearchParams(localFilters).toString()}`, '_blank')
}

const fmtMoney = (val) => {
  return new Intl.NumberFormat('vi-VN').format(val || 0) + ' đ'
}

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN')
}
</script>
