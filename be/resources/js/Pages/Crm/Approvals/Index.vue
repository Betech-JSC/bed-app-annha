<template>
  <Head title="Trung Tâm Duyệt" />

  <PageHeader
    title="Trung Tâm Duyệt"
    subtitle="Duyệt nhanh theo vai trò của bạn"
  >
    <template #actions>
      <a-button size="large" class="rounded-xl" @click="refreshPage">
        <template #icon><ReloadOutlined /></template>
        Làm mới
      </a-button>
    </template>
  </PageHeader>

  <!-- ─── Stats Overview ─── -->
  <div class="ac-stats-grid">
    <div class="ac-stat-card">
      <div class="ac-stat-card__icon" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%)">
        <ClockCircleOutlined />
      </div>
      <div class="ac-stat-card__content">
        <div class="ac-stat-card__value">{{ totalPending }}</div>
        <div class="ac-stat-card__label">Chờ duyệt</div>
      </div>
    </div>
    <div class="ac-stat-card">
      <div class="ac-stat-card__icon" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%)">
        <CheckCircleOutlined />
      </div>
      <div class="ac-stat-card__content">
        <div class="ac-stat-card__value">{{ stats.approved_today || 0 }}</div>
        <div class="ac-stat-card__label">Đã duyệt hôm nay</div>
      </div>
    </div>
    <div class="ac-stat-card">
      <div class="ac-stat-card__icon" style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%)">
        <CloseCircleOutlined />
      </div>
      <div class="ac-stat-card__content">
        <div class="ac-stat-card__value">{{ stats.rejected_today || 0 }}</div>
        <div class="ac-stat-card__label">Từ chối</div>
      </div>
    </div>
    <div class="ac-stat-card">
      <div class="ac-stat-card__icon" style="background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)">
        <DollarOutlined />
      </div>
      <div class="ac-stat-card__content">
        <div class="ac-stat-card__value ac-stat-card__value--amount">{{ formatCompact(stats.total_pending_amount) }}</div>
        <div class="ac-stat-card__label">Tổng giá trị chờ duyệt</div>
      </div>
    </div>
  </div>

  <!-- ─── Role Tabs ─── -->
  <div class="ac-role-tabs">
    <button
      v-for="tab in roleTabs"
      :key="tab.key"
      class="ac-role-tab"
      :class="{ 'ac-role-tab--active': activeRole === tab.key }"
      @click="activeRole = tab.key"
    >
      <component :is="tab.icon" class="ac-role-tab__icon" />
      <span>{{ tab.label }}</span>
      <a-badge
        v-if="tab.count > 0"
        :count="tab.count"
        :number-style="{ background: activeRole === tab.key ? 'white' : '#F59E0B', color: activeRole === tab.key ? '#1F2937' : 'white', fontSize: '10px', boxShadow: 'none', minWidth: '20px', height: '20px', lineHeight: '20px' }"
      />
    </button>
  </div>

  <!-- ─── Items Table ─── -->
  <div class="ac-table-card">
    <a-table
      :columns="tableColumns"
      :data-source="activeItems"
      :pagination="{ pageSize: 15, showTotal: (t) => `${t} yêu cầu`, showSizeChanger: true, pageSizeOptions: ['10', '15', '30', '50'] }"
      row-key="id"
      size="middle"
      class="ac-table"
      :locale="{ emptyText: 'Không có yêu cầu nào cần duyệt 🎉' }"
    >
      <template #bodyCell="{ column, record }">
        <!-- Loại -->
        <template v-if="column.key === 'type'">
          <a-tag :color="typeColors[record.type] || 'default'" class="rounded-lg" style="font-size: 11px;">
            {{ record.type_label }}
          </a-tag>
        </template>
        <!-- Nội dung -->
        <template v-if="column.key === 'title'">
          <div class="ac-item-title" @click="openDetailDrawer(record)">
            <div class="ac-item-title__main">{{ record.title }}</div>
            <div class="ac-item-title__sub">{{ record.subtitle }}</div>
          </div>
        </template>
        <!-- Số tiền -->
        <template v-if="column.key === 'amount'">
          <span v-if="record.amount" class="font-bold text-emerald-600 text-sm">{{ formatCompact(record.amount) }}</span>
          <span v-else class="text-gray-300">—</span>
        </template>
        <!-- Người tạo -->
        <template v-if="column.key === 'created_by'">
          <div class="flex items-center gap-2">
            <a-avatar :size="24" style="background: #1B4F72; font-size: 10px; flex-shrink: 0;">{{ record.created_by?.charAt(0)?.toUpperCase() }}</a-avatar>
            <span class="text-xs text-gray-600 truncate" style="max-width: 100px;">{{ record.created_by }}</span>
          </div>
        </template>
        <!-- Ngày tạo -->
        <template v-if="column.key === 'created_at'">
          <span class="text-xs text-gray-500">{{ record.created_at }}</span>
        </template>
        <!-- Thao tác -->
        <template v-if="column.key === 'actions'">
          <a-space :size="6">
            <a-button
              type="primary"
              size="small"
              class="ac-btn-approve"
              @click="handleApproveByType(record)"
            >
              <template #icon><CheckOutlined /></template>
              Duyệt
            </a-button>
            <a-button
              danger
              size="small"
              class="ac-btn-reject"
              @click="openRejectModal(record)"
            >
              <template #icon><CloseOutlined /></template>
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>

  <!-- ─── Lịch sử xử lý ─── -->
  <div class="ac-table-card" style="margin-top: 20px;">
    <div class="ac-table-card__header" @click="showHistory = !showHistory" style="cursor: pointer;">
      <div class="flex items-center gap-2">
        <HistoryOutlined />
        <span class="font-semibold text-gray-700 text-sm">Lịch sử xử lý gần đây</span>
        <a-tag color="default" class="rounded-lg">{{ recentItems.length }}</a-tag>
      </div>
      <UpOutlined v-if="showHistory" class="text-gray-400" style="font-size: 12px;" />
      <DownOutlined v-else class="text-gray-400" style="font-size: 12px;" />
    </div>
    <div v-if="showHistory">
      <a-table
        :columns="historyColumns"
        :data-source="recentItems"
        :pagination="{ pageSize: 10, showTotal: (total) => `${total} mục` }"
        row-key="id"
        size="small"
        class="ac-table"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'title'">
            <div>
              <div class="font-semibold text-gray-800 text-sm">{{ record.title }}</div>
              <div class="text-xs text-gray-400">{{ record.subtitle }}</div>
            </div>
          </template>
          <template v-if="column.key === 'type'">
            <a-tag :color="typeColors[record.type] || 'default'" class="rounded-lg text-xs">
              {{ record.type_label }}
            </a-tag>
          </template>
          <template v-if="column.key === 'amount'">
            <span class="font-semibold text-gray-700 text-sm">{{ formatCurrency(record.amount) }}</span>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="historyStatusColor(record.status)" class="rounded-lg">
              {{ record.status_label || statusViMap[record.status] || record.status }}
            </a-tag>
          </template>
          <template v-if="column.key === 'created_at'">
            <span class="text-xs text-gray-500">{{ record.created_at }}</span>
          </template>
        </template>
      </a-table>
    </div>
  </div>

  <!-- ─── Detail Drawer ─── -->
  <a-drawer
    :open="!!detailItem"
    :title="detailItem?.title"
    placement="right"
    :width="440"
    @close="detailItem = null"
  >
    <template v-if="detailItem">
      <div class="detail-section">
        <div class="detail-label">Loại</div>
        <a-tag :color="typeColors[detailItem.type] || 'default'" class="rounded-lg">{{ detailItem.type_label }}</a-tag>
      </div>
      <div class="detail-section">
        <div class="detail-label">Dự án / Phân nhóm</div>
        <div class="text-sm text-gray-700">{{ detailItem.subtitle }}</div>
      </div>
      <div class="detail-section" v-if="detailItem.amount">
        <div class="detail-label">Số tiền</div>
        <div class="text-xl font-bold text-emerald-600">{{ formatCurrency(detailItem.amount) }}</div>
      </div>
      <div class="detail-section">
        <div class="detail-label">Người tạo</div>
        <div class="flex items-center gap-3">
          <a-avatar :size="32" style="background: #1B4F72;">{{ detailItem.created_by?.charAt(0)?.toUpperCase() }}</a-avatar>
          <div>
            <div class="text-sm font-medium">{{ detailItem.created_by }}</div>
            <div class="text-xs text-gray-400">{{ detailItem.created_by_email }}</div>
          </div>
        </div>
      </div>
      <div class="detail-section">
        <div class="detail-label">Ngày tạo</div>
        <div class="text-sm text-gray-600">{{ detailItem.created_at }}</div>
      </div>
      <div class="detail-section" v-if="detailItem.description">
        <div class="detail-label">Mô tả</div>
        <div class="text-sm text-gray-600 whitespace-pre-wrap">{{ detailItem.description }}</div>
      </div>
      <div class="detail-section" v-if="detailItem.priority">
        <div class="detail-label">Mức ưu tiên</div>
        <a-tag :color="{ low: 'default', medium: 'processing', high: 'warning', urgent: 'error' }[detailItem.priority]" class="rounded-lg">
          {{ { low: 'Thấp', medium: 'Trung bình', high: 'Cao', urgent: 'Khẩn cấp' }[detailItem.priority] || detailItem.priority }}
        </a-tag>
      </div>
      <div class="detail-section" v-if="detailItem.rejected_reason">
        <div class="detail-label">Lý do từ chối</div>
        <a-alert type="error" :message="detailItem.rejected_reason" show-icon class="rounded-xl" />
      </div>
      <a-divider />
      <div class="flex gap-3">
        <a-button type="primary" block size="large" class="rounded-xl ac-btn-approve" @click="handleApproveByType(detailItem); detailItem = null;">
          <template #icon><CheckOutlined /></template>
          Duyệt
        </a-button>
        <a-button danger block size="large" class="rounded-xl" @click="openRejectModal(detailItem); detailItem = null;">
          <template #icon><CloseOutlined /></template>
          Từ chối
        </a-button>
      </div>
    </template>
  </a-drawer>

  <!-- ─── Reject Modal ─── -->
  <a-modal
    v-model:open="rejectModalVisible"
    title="Từ chối yêu cầu"
    @ok="handleReject"
    :confirm-loading="rejectLoading"
    ok-text="Xác nhận từ chối"
    cancel-text="Hủy"
    :ok-button-props="{ danger: true, disabled: !rejectReason.trim() }"
    centered
    class="crm-modal"
  >
    <div class="py-4">
      <div v-if="rejectTarget" class="mb-4 p-3 bg-gray-50 rounded-xl">
        <div class="font-semibold text-gray-700">{{ rejectTarget.title }}</div>
        <div class="text-sm text-gray-500">{{ rejectTarget.type_label }}</div>
        <div v-if="rejectTarget.amount" class="text-sm text-emerald-600 font-semibold">{{ formatCurrency(rejectTarget.amount) }}</div>
      </div>
      <a-form-item
        label="Lý do từ chối"
        :validate-status="!rejectReason.trim() ? 'error' : ''"
        help="Bắt buộc nhập lý do"
      >
        <a-textarea
          v-model:value="rejectReason"
          placeholder="Nhập lý do từ chối..."
          :rows="4"
          :maxlength="500"
          show-count
        />
      </a-form-item>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import {
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  HistoryOutlined,
  UpOutlined,
  DownOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  managementItems: { type: Array, default: () => [] },
  accountantItems: { type: Array, default: () => [] },
  acceptanceSupervisorItems: { type: Array, default: () => [] },
  acceptancePMItems: { type: Array, default: () => [] },
  customerAcceptanceItems: { type: Array, default: () => [] },
  changeRequestItems: { type: Array, default: () => [] },
  additionalCostItems: { type: Array, default: () => [] },
  subPaymentManagementItems: { type: Array, default: () => [] },
  subPaymentAccountantItems: { type: Array, default: () => [] },
  contractItems: { type: Array, default: () => [] },
  paymentItems: { type: Array, default: () => [] },
  materialBillManagementItems: { type: Array, default: () => [] },
  materialBillAccountantItems: { type: Array, default: () => [] },
  subAcceptanceItems: { type: Array, default: () => [] },
  supplierAcceptanceItems: { type: Array, default: () => [] },
  constructionLogItems: { type: Array, default: () => [] },
  scheduleAdjustmentItems: { type: Array, default: () => [] },
  recentItems: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
})

const activeRole = ref('management')
const rejectModalVisible = ref(false)
const rejectTarget = ref(null)
const rejectReason = ref('')
const rejectLoading = ref(false)
const showHistory = ref(false)
const detailItem = ref(null)

const typeColors = {
  project_cost: 'blue',
  company_cost: 'gold',
  acceptance: 'purple',
  change_request: 'magenta',
  additional_cost: 'orange',
  sub_payment: 'cyan',
  contract: 'geekblue',
  project_payment: 'volcano',
  material_bill: 'purple',
  sub_acceptance: 'lime',
  supplier_acceptance: 'green',
  construction_log: 'geekblue',
  schedule_adjustment: 'red',
}

const statusViMap = {
  draft: 'Nháp', pending: 'Chờ duyệt', pending_approval: 'Chờ duyệt',
  submitted: 'Đã gửi', under_review: 'Đang xem xét',
  pending_management_approval: 'Chờ BĐH duyệt', pending_accountant_approval: 'Chờ KT xác nhận',
  pending_accountant_confirmation: 'Chờ KT xác nhận', pending_customer_approval: 'Chờ KH duyệt',
  customer_pending_approval: 'Chờ KH duyệt', pending_management: 'Chờ BĐH duyệt',
  pending_accountant: 'Chờ KT xác nhận', approved_management: 'BĐH đã duyệt',
  approved_accountant: 'KT đã duyệt', approved: 'Đã duyệt',
  customer_approved: 'KH đã duyệt', rejected: 'Từ chối',
  paid: 'Đã thanh toán', customer_paid: 'KH đã thanh toán',
  confirmed: 'Đã xác nhận', implemented: 'Đã triển khai', cancelled: 'Đã hủy',
  active: 'Đang hiệu lực', expired: 'Hết hạn', terminated: 'Đã thanh lý',
  project_manager_approved: 'QLDA đã duyệt', supervisor_approved: 'GS đã duyệt', owner_approved: 'CĐT đã duyệt',
}

const historyStatusColor = (status) => {
  if (['approved', 'customer_approved', 'approved_management', 'approved_accountant', 'paid', 'customer_paid', 'confirmed', 'implemented'].includes(status)) return 'green'
  if (['rejected', 'cancelled'].includes(status)) return 'red'
  if (['draft'].includes(status)) return 'default'
  if (['submitted', 'under_review'].includes(status)) return 'processing'
  return 'orange'
}

// ─── Role-based items mapping ───
const roleItemsMap = computed(() => ({
  management: [
    ...props.managementItems.map(i => ({ ...i, _approveType: 'management' })),
    ...props.subPaymentManagementItems.map(i => ({ ...i, _approveType: 'sub_payment' })),
    ...props.additionalCostItems.map(i => ({ ...i, _approveType: 'additional_cost' })),
    ...props.materialBillManagementItems.map(i => ({ ...i, _approveType: 'material_bill' })),
  ],
  accountant: [
    ...props.accountantItems.map(i => ({ ...i, _approveType: 'accountant' })),
    ...props.subPaymentAccountantItems.map(i => ({ ...i, _approveType: 'sub_payment_confirm' })),
    ...props.materialBillAccountantItems.map(i => ({ ...i, _approveType: 'material_bill' })),
  ],
  customer: [
    ...props.customerAcceptanceItems.map(i => ({ ...i, _approveType: 'acceptance' })),
    ...props.contractItems.map(i => ({ ...i, _approveType: 'contract' })),
    ...props.paymentItems.map(i => ({ ...i, _approveType: 'project_payment' })),
  ],
  operations: [
    ...props.acceptanceSupervisorItems.map(i => ({ ...i, _approveType: 'acceptance_supervisor' })),
    ...props.acceptancePMItems.map(i => ({ ...i, _approveType: 'acceptance_pm' })),
    ...props.changeRequestItems.map(i => ({ ...i, _approveType: 'change_request' })),
    ...props.subAcceptanceItems.map(i => ({ ...i, _approveType: 'sub_acceptance' })),
    ...props.supplierAcceptanceItems.map(i => ({ ...i, _approveType: 'supplier_acceptance' })),
    ...props.constructionLogItems.map(i => ({ ...i, _approveType: 'construction_log' })),
    ...props.scheduleAdjustmentItems.map(i => ({ ...i, _approveType: 'schedule_adjustment' })),
  ],
}))

// Sort by date descending so newest items always appear first
const activeItems = computed(() => {
  const items = roleItemsMap.value[activeRole.value] || []
  return [...items].sort((a, b) => {
    const dateA = a.created_at || ''
    const dateB = b.created_at || ''
    // Format is dd/mm/yyyy HH:mm — reverse compare to sort newest first
    const pa = dateA.split(/[\/ :]/).reverse().join('')
    const pb = dateB.split(/[\/ :]/).reverse().join('')
    return pb.localeCompare(pa)
  })
})

const totalPending = computed(() =>
  Object.values(roleItemsMap.value).reduce((sum, arr) => sum + arr.length, 0)
)

// ─── Role tabs ───
const roleTabs = computed(() => [
  { key: 'management', label: 'Ban Điều Hành', icon: BankOutlined, count: roleItemsMap.value.management.length },
  { key: 'accountant', label: 'Kế Toán', icon: DollarOutlined, count: roleItemsMap.value.accountant.length },
  { key: 'customer', label: 'Khách Hàng', icon: TeamOutlined, count: roleItemsMap.value.customer.length },
  { key: 'operations', label: 'Vận Hành', icon: ToolOutlined, count: roleItemsMap.value.operations.length },
])

// ─── Table columns ───
const tableColumns = [
  { title: 'Loại', key: 'type', width: 130 },
  { title: 'Nội dung', key: 'title', ellipsis: true },
  { title: 'Số tiền', key: 'amount', width: 120, align: 'right' },
  { title: 'Người tạo', key: 'created_by', width: 160 },
  { title: 'Ngày tạo', key: 'created_at', width: 120 },
  { title: 'Thao tác', key: 'actions', width: 160, align: 'center', fixed: 'right' },
]

const historyColumns = [
  { title: 'Yêu cầu', key: 'title', width: 250 },
  { title: 'Loại', key: 'type', width: 100 },
  { title: 'Số tiền', key: 'amount', width: 140, align: 'right' },
  { title: 'Kết quả', key: 'status', width: 120 },
  { title: 'Ngày tạo', key: 'created_at', width: 140 },
]

const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0)

const formatCompact = (amount) => {
  if (!amount) return '0'
  if (amount >= 1e9) return (amount / 1e9).toFixed(1) + ' tỷ'
  if (amount >= 1e6) return (amount / 1e6).toFixed(1) + ' tr'
  if (amount >= 1e3) return (amount / 1e3).toFixed(0) + 'k'
  return new Intl.NumberFormat('vi-VN').format(amount)
}

const refreshPage = () => router.reload()

const openDetailDrawer = (record) => { detailItem.value = record }

// ─── Unified approve by type ───
const approveUrlMap = {
  management: (r) => `/approvals/${r.id}/approve-management`,
  accountant: (r) => `/approvals/${r.id}/approve-accountant`,
  acceptance: (r) => `/approvals/acceptance/${r.id}/approve`,
  acceptance_supervisor: (r) => `/approvals/acceptance-supervisor/${r.id}/approve`,
  acceptance_pm: (r) => `/approvals/acceptance-pm/${r.id}/approve`,
  change_request: (r) => `/approvals/change-request/${r.id}/approve`,
  additional_cost: (r) => `/approvals/additional-cost/${r.id}/approve`,
  sub_payment: (r) => `/approvals/sub-payment/${r.id}/approve`,
  sub_payment_confirm: (r) => `/approvals/sub-payment/${r.id}/confirm`,
  contract: (r) => `/approvals/contract/${r.id}/approve`,
  project_payment: (r) => `/approvals/payment/${r.id}/approve`,
  material_bill: (r) => `/approvals/material-bill/${r.id}/approve`,
  sub_acceptance: (r) => `/approvals/sub-acceptance/${r.id}/approve`,
  supplier_acceptance: (r) => `/approvals/supplier-acceptance/${r.id}/approve`,
  construction_log: (r) => `/approvals/construction-log/${r.id}/approve`,
  schedule_adjustment: (r) => `/approvals/schedule-adjustment/${r.id}/approve`,
}

const approveLabels = {
  management: 'BĐH duyệt',
  accountant: 'Kế Toán xác nhận',
  acceptance: 'Duyệt nghiệm thu (KH)',
  acceptance_supervisor: 'GS duyệt nghiệm thu',
  acceptance_pm: 'QLDA duyệt nghiệm thu',
  change_request: 'Duyệt yêu cầu thay đổi',
  additional_cost: 'Duyệt chi phí phát sinh',
  sub_payment: 'BĐH duyệt thanh toán NTP',
  sub_payment_confirm: 'KT xác nhận thanh toán NTP',
  contract: 'Duyệt hợp đồng',
  project_payment: 'Duyệt thanh toán',
  material_bill: 'Duyệt phiếu vật tư',
  sub_acceptance: 'Duyệt nghiệm thu NTP',
  supplier_acceptance: 'Duyệt nghiệm thu NCC',
  construction_log: 'Duyệt nhật ký công trường',
  schedule_adjustment: 'Duyệt điều chỉnh tiến độ',
}

const handleApproveByType = (record) => {
  const type = record._approveType || record.approval_level || 'management'
  const label = approveLabels[type] || 'Duyệt'
  const urlFn = approveUrlMap[type]
  if (!urlFn) return

  Modal.confirm({
    title: label,
    content: `Duyệt "${record.title}"?${record.amount ? `\n\nSố tiền: ${formatCurrency(record.amount)}` : ''}`,
    okText: 'Duyệt',
    cancelText: 'Hủy',
    okButtonProps: { style: { background: '#10B981', borderColor: '#10B981' } },
    onOk() {
      router.post(urlFn(record), {}, {
        preserveScroll: true,
        onSuccess: () => message.success(`Đã duyệt "${record.title}"`),
        onError: () => message.error('Không thể duyệt yêu cầu này'),
      })
    },
  })
}

// ─── Unified reject ───
const rejectUrlMap = {
  management: (r) => `/approvals/${r.id}/reject`,
  accountant: (r) => `/approvals/${r.id}/reject`,
  acceptance: (r) => `/approvals/acceptance/${r.id}/reject`,
  acceptance_supervisor: (r) => `/approvals/acceptance-supervisor/${r.id}/reject`,
  acceptance_pm: (r) => `/approvals/acceptance-pm/${r.id}/reject`,
  change_request: (r) => `/approvals/change-request/${r.id}/reject`,
  additional_cost: (r) => `/approvals/additional-cost/${r.id}/reject`,
  sub_payment: (r) => `/approvals/sub-payment/${r.id}/reject`,
  sub_payment_confirm: (r) => `/approvals/sub-payment/${r.id}/reject`,
  contract: (r) => `/approvals/contract/${r.id}/reject`,
  project_payment: (r) => `/approvals/payment/${r.id}/reject`,
  material_bill: (r) => `/approvals/material-bill/${r.id}/reject`,
  sub_acceptance: (r) => `/approvals/sub-acceptance/${r.id}/reject`,
  supplier_acceptance: (r) => `/approvals/supplier-acceptance/${r.id}/reject`,
  construction_log: (r) => `/approvals/construction-log/${r.id}/reject`,
  schedule_adjustment: (r) => `/approvals/schedule-adjustment/${r.id}/reject`,
}

const openRejectModal = (record) => {
  rejectTarget.value = record
  rejectReason.value = ''
  rejectModalVisible.value = true
}

const handleReject = () => {
  if (!rejectReason.value.trim() || !rejectTarget.value) return
  rejectLoading.value = true

  const type = rejectTarget.value._approveType || 'management'
  const urlFn = rejectUrlMap[type]
  if (!urlFn) { rejectLoading.value = false; return }

  router.post(urlFn(rejectTarget.value), {
    reason: rejectReason.value.trim(),
  }, {
    preserveScroll: true,
    onSuccess: () => {
      message.success(`Đã từ chối "${rejectTarget.value.title}"`)
      rejectModalVisible.value = false
      rejectTarget.value = null
      rejectLoading.value = false
    },
    onError: () => {
      message.error('Không thể từ chối yêu cầu này')
      rejectLoading.value = false
    },
  })
}
</script>

<style scoped>
/* ─── Stats Grid ─── */
.ac-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.ac-stat-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #E8ECF1;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all 0.2s ease;
}
.ac-stat-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.06);
  transform: translateY(-1px);
}
.ac-stat-card__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
  color: white;
}
.ac-stat-card__value {
  font-size: 24px;
  font-weight: 800;
  color: #1F2937;
  line-height: 1.2;
}
.ac-stat-card__value--amount {
  color: #6366F1;
  font-size: 18px;
}
.ac-stat-card__label {
  font-size: 12px;
  color: #9CA3AF;
  white-space: nowrap;
}

/* ─── Role Tabs ─── */
.ac-role-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 20px;
  padding: 5px;
  background: white;
  border-radius: 14px;
  border: 1px solid #E8ECF1;
}
.ac-role-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: #6B7280;
  transition: all 0.2s ease;
  flex: 1;
  justify-content: center;
}
.ac-role-tab:hover {
  background: #F3F4F6;
  color: #374151;
}
.ac-role-tab--active {
  background: #1F2937;
  color: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.ac-role-tab--active:hover {
  background: #111827;
  color: white;
}
.ac-role-tab__icon {
  font-size: 16px;
}

/* ─── Table Card ─── */
.ac-table-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #E8ECF1;
  overflow: hidden;
}
.ac-table-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #F3F4F6;
}
.ac-table :deep(.ant-table) {
  border-radius: 0;
}
.ac-table :deep(.ant-table-thead > tr > th) {
  background: #F8FAFC;
  font-size: 12px;
  font-weight: 700;
  color: #6B7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-bottom: 1px solid #E8ECF1;
  padding: 12px 16px;
}
.ac-table :deep(.ant-table-tbody > tr > td) {
  padding: 12px 16px;
  border-bottom: 1px solid #F3F4F6;
}
.ac-table :deep(.ant-table-tbody > tr:hover > td) {
  background: #FAFBFC;
}
.ac-table :deep(.ant-table-pagination) {
  padding: 12px 16px;
}

/* ─── Item title clickable ─── */
.ac-item-title {
  cursor: pointer;
  transition: color 0.15s ease;
}
.ac-item-title:hover .ac-item-title__main {
  color: #3B82F6;
}
.ac-item-title__main {
  font-size: 13px;
  font-weight: 700;
  color: #1F2937;
  line-height: 1.4;
  transition: color 0.15s ease;
}
.ac-item-title__sub {
  font-size: 11px;
  color: #9CA3AF;
  line-height: 1.3;
  margin-top: 1px;
}

/* ─── Action Buttons ─── */
.ac-btn-approve {
  background: #10B981 !important;
  border-color: #10B981 !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  font-size: 12px !important;
}
.ac-btn-approve:hover {
  background: #059669 !important;
  border-color: #059669 !important;
}
.ac-btn-reject {
  border-radius: 8px !important;
  font-size: 12px !important;
}

/* ─── Detail Drawer ─── */
.detail-section {
  margin-bottom: 18px;
}
.detail-label {
  font-size: 11px;
  font-weight: 700;
  color: #9CA3AF;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

/* ─── Responsive ─── */
@media (max-width: 1200px) {
  .ac-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .ac-stats-grid {
    grid-template-columns: 1fr;
  }
  .ac-role-tabs {
    overflow-x: auto;
    flex-wrap: nowrap;
  }
  .ac-role-tab {
    padding: 8px 14px;
    font-size: 12px;
    white-space: nowrap;
    flex: unset;
  }
}
</style>
