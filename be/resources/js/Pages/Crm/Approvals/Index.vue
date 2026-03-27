<template>
  <Head title="Trung Tâm Duyệt" />

  <PageHeader
    title="Trung Tâm Duyệt Yêu Cầu"
    subtitle="Quản lý phê duyệt theo từng cấp — BĐH → Kế Toán · Khách hàng · Thay đổi · CP Phát sinh · NTP"
  >
    <template #actions>
      <div class="flex items-center gap-3">
        <a-segmented v-model:value="viewMode" :options="[
          { label: 'Kanban', value: 'kanban' },
          { label: 'Danh sách', value: 'list' },
        ]" size="large" class="rounded-xl" />
        <a-button size="large" class="rounded-xl" @click="refreshPage">
          <template #icon><ReloadOutlined /></template>
          Làm mới
        </a-button>
      </div>
    </template>
  </PageHeader>

  <!-- ─── Stats Overview (compact) ─── -->
  <div class="kb-stats">
    <div class="kb-stats__item" v-for="s in statsList" :key="s.label">
      <div class="kb-stats__dot" :style="{ background: s.color }"></div>
      <span class="kb-stats__value">{{ s.value }}</span>
      <span class="kb-stats__label">{{ s.label }}</span>
    </div>
    <div class="kb-stats__divider"></div>
    <div class="kb-stats__item kb-stats__item--total">
      <DollarOutlined style="font-size: 16px; color: #10B981;" />
      <span class="kb-stats__value" style="color: #10B981;">{{ formatCurrency(stats.total_pending_amount) }}</span>
      <span class="kb-stats__label">Tổng chờ duyệt</span>
    </div>
  </div>

  <!-- ─── KANBAN VIEW ─── -->
  <div v-if="viewMode === 'kanban'" class="kb-board">
    <div
      v-for="col in kanbanColumns"
      :key="col.key"
      class="kb-column"
      :class="{ 'kb-column--empty': col.items.length === 0 }"
    >
      <!-- Column Header -->
      <div class="kb-column__header">
        <div class="kb-column__header-left">
          <div class="kb-column__indicator" :style="{ background: col.color }"></div>
          <div>
            <div class="kb-column__title">{{ col.title }}</div>
            <div class="kb-column__subtitle">{{ col.subtitle }}</div>
          </div>
        </div>
        <a-badge :count="col.items.length" :number-style="{ background: col.color, fontSize: '11px', boxShadow: 'none' }" />
      </div>

      <!-- Column Body — Scrollable -->
      <div class="kb-column__body">
        <div v-if="col.items.length === 0" class="kb-column__empty">
          <CheckCircleOutlined style="font-size: 28px; color: #D1D5DB;" />
          <span>{{ col.emptyText || 'Trống' }}</span>
        </div>
        <div
          v-for="item in col.items"
          :key="item.id"
          class="kb-card"
          :style="{ '--card-color': col.color }"
          @click="openDetailDrawer(item)"
        >
          <!-- Card header -->
          <div class="kb-card__top">
            <a-tag :color="tagColors[item.type] || 'default'" class="rounded-lg" style="font-size: 10px; line-height: 18px; padding: 0 6px;">
              {{ item.type_label }}
            </a-tag>
            <div v-if="item.amount" class="kb-card__amount">
              {{ formatCompact(item.amount) }}
            </div>
          </div>
          <!-- Card body -->
          <div class="kb-card__title">{{ item.title }}</div>
          <div class="kb-card__subtitle">{{ item.subtitle }}</div>
          <!-- BĐH approval info (for accountant zone) -->
          <div v-if="col.level === 'accountant' && item.management_approved_by" class="kb-card__approval-badge">
            <CheckCircleOutlined style="color: #10B981; font-size: 11px;" />
            <span>BĐH: {{ item.management_approved_by }}</span>
          </div>
          <!-- Card footer -->
          <div class="kb-card__footer">
            <div class="kb-card__meta">
              <a-avatar :size="20" style="background: #1B4F72; font-size: 9px;">
                {{ item.created_by?.charAt(0)?.toUpperCase() }}
              </a-avatar>
              <span>{{ item.created_at }}</span>
            </div>
            <div class="kb-card__actions" @click.stop>
              <a-tooltip title="Duyệt">
                <a-button
                  type="primary"
                  size="small"
                  class="kb-card__btn-approve"
                  :style="{ background: col.approve_color || '#10B981', borderColor: col.approve_color || '#10B981' }"
                  @click.stop="col.onApprove(item)"
                >
                  <template #icon><CheckOutlined /></template>
                </a-button>
              </a-tooltip>
              <a-tooltip title="Từ chối">
                <a-button danger size="small" class="kb-card__btn-reject" @click.stop="col.onReject(item)">
                  <template #icon><CloseOutlined /></template>
                </a-button>
              </a-tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─── LIST VIEW (legacy zones) ─── -->
  <div v-else class="kb-list-view">
    <ApprovalZone
      v-for="col in kanbanColumns"
      :key="col.key"
      :title="col.title"
      :subtitle="col.subtitle"
      :items="col.items"
      :color="col.color"
      :level="col.level"
      :emptyText="col.emptyText"
      @approve="col.onApprove"
      @reject="col.onReject"
      @view="openDetailDrawer"
    />
  </div>

  <!-- ─── Lịch sử xử lý ─── -->
  <div class="crm-content-card" style="margin-top: 24px;">
    <div class="crm-content-card__header" @click="showHistory = !showHistory" style="cursor: pointer;">
      <h3 class="crm-content-card__title">
        <HistoryOutlined class="mr-2" />
        Lịch sử xử lý gần đây
        <a-tag color="default" class="ml-2">{{ recentItems.length }}</a-tag>
      </h3>
      <a-button type="text" size="small">
        <template #icon>
          <UpOutlined v-if="showHistory" />
          <DownOutlined v-else />
        </template>
      </a-button>
    </div>

    <div v-if="showHistory">
      <a-table
        :columns="historyColumns"
        :data-source="recentItems"
        :pagination="{ pageSize: 10, showTotal: (total) => `${total} mục` }"
        row-key="id"
        size="small"
        class="crm-table"
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
        <a-tag :color="typeColors[detailItem.type] || 'default'" class="rounded-lg">
          {{ detailItem.type_label }}
        </a-tag>
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
      <!-- Priority for CR -->
      <div class="detail-section" v-if="detailItem.priority">
        <div class="detail-label">Mức ưu tiên</div>
        <a-tag :color="{ low: 'default', medium: 'processing', high: 'warning', urgent: 'error' }[detailItem.priority]" class="rounded-lg">
          {{ { low: 'Thấp', medium: 'Trung bình', high: 'Cao', urgent: 'Khẩn cấp' }[detailItem.priority] || detailItem.priority }}
        </a-tag>
      </div>
      <a-divider />
      <div class="detail-section" v-if="detailItem.type === 'project_cost' || detailItem.type === 'company_cost'">
        <div class="detail-label">Trạng thái duyệt</div>
        <a-steps :current="getApprovalStep(detailItem)" size="small" direction="vertical" class="mt-2">
          <a-step title="Tạo yêu cầu" :description="detailItem.created_at" />
          <a-step
            :title="detailItem.management_approved_by ? `BĐH đã duyệt — ${detailItem.management_approved_by}` : 'Chờ BĐH duyệt'"
            :description="detailItem.management_approved_at || ''"
            :status="detailItem.management_approved_by ? 'finish' : (detailItem.approval_level === 'management' ? 'process' : 'wait')"
          />
          <a-step
            title="Kế Toán xác nhận"
            :status="detailItem.status === 'approved' ? 'finish' : (detailItem.approval_level === 'accountant' ? 'process' : 'wait')"
          />
        </a-steps>
      </div>
      <div class="detail-section" v-if="detailItem.rejected_reason">
        <div class="detail-label">Lý do từ chối</div>
        <a-alert type="error" :message="detailItem.rejected_reason" show-icon class="rounded-xl" />
      </div>

      <!-- Quick Actions in Drawer -->
      <a-divider />
      <div class="flex gap-3">
        <a-button
          type="primary"
          block
          size="large"
          class="rounded-xl"
          style="background: #10B981; border-color: #10B981;"
          @click="handleDrawerApprove"
        >
          <template #icon><CheckOutlined /></template>
          Duyệt
        </a-button>
        <a-button
          danger
          block
          size="large"
          class="rounded-xl"
          @click="handleDrawerReject"
        >
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
        help="Bắt buộc nhập lý do để người tạo chỉnh sửa lại"
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
import ApprovalZone from './ApprovalZone.vue'
import {
  ReloadOutlined,
  ClockCircleOutlined,
  AuditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  DollarOutlined,
  HistoryOutlined,
  UpOutlined,
  DownOutlined,
  UserOutlined,
  SwapOutlined,
  FileProtectOutlined,
  InboxOutlined,
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  managementItems: { type: Array, default: () => [] },
  accountantItems: { type: Array, default: () => [] },
  customerAcceptanceItems: { type: Array, default: () => [] },
  changeRequestItems: { type: Array, default: () => [] },
  additionalCostItems: { type: Array, default: () => [] },
  subPaymentManagementItems: { type: Array, default: () => [] },
  subPaymentAccountantItems: { type: Array, default: () => [] },
  contractItems: { type: Array, default: () => [] },
  paymentItems: { type: Array, default: () => [] },
  materialBillItems: { type: Array, default: () => [] },
  subAcceptanceItems: { type: Array, default: () => [] },
  recentItems: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
})

const viewMode = ref('kanban')
const rejectModalVisible = ref(false)
const rejectTarget = ref(null)
const rejectReason = ref('')
const rejectLoading = ref(false)
const rejectType = ref('cost')
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
}

const tagColors = {
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
}

// ─── Vietnamese status labels for fallback ───
const statusViMap = {
  draft: 'Nháp',
  pending: 'Chờ duyệt',
  pending_approval: 'Chờ duyệt',
  submitted: 'Đã gửi',
  under_review: 'Đang xem xét',
  pending_management_approval: 'Chờ BĐH duyệt',
  pending_accountant_approval: 'Chờ KT xác nhận',
  pending_accountant_confirmation: 'Chờ KT xác nhận',
  pending_customer_approval: 'Chờ KH duyệt',
  customer_pending_approval: 'Chờ KH duyệt',
  pending_management: 'Chờ BĐH duyệt',
  pending_accountant: 'Chờ KT xác nhận',
  approved_management: 'BĐH đã duyệt',
  approved_accountant: 'KT đã duyệt',
  approved: 'Đã duyệt',
  customer_approved: 'KH đã duyệt',
  rejected: 'Từ chối',
  paid: 'Đã thanh toán',
  customer_paid: 'KH đã thanh toán',
  confirmed: 'Đã xác nhận',
  implemented: 'Đã triển khai',
  cancelled: 'Đã hủy',
  active: 'Đang hiệu lực',
  expired: 'Hết hạn',
  terminated: 'Đã thanh lý',
  project_manager_approved: 'QLDA đã duyệt',
  supervisor_approved: 'GS đã duyệt',
  owner_approved: 'CĐT đã duyệt',
}

const historyStatusColor = (status) => {
  if (['approved', 'customer_approved', 'approved_management', 'approved_accountant', 'paid', 'customer_paid', 'confirmed', 'implemented'].includes(status)) return 'green'
  if (['rejected', 'cancelled'].includes(status)) return 'red'
  if (['draft'].includes(status)) return 'default'
  if (['submitted', 'under_review'].includes(status)) return 'processing'
  return 'orange'
}

const statsList = computed(() => [
  { label: 'BĐH', value: props.stats.pending_management || 0, color: '#F59E0B' },
  { label: 'Kế toán', value: props.stats.pending_accountant || 0, color: '#06B6D4' },
  { label: 'Khách hàng', value: props.stats.pending_customer || 0, color: '#8B5CF6' },
  { label: 'CR/PS', value: (props.stats.pending_change_request || 0) + (props.stats.pending_additional_cost || 0), color: '#EC4899' },
  { label: 'HĐ/TT', value: (props.stats.pending_contract || 0) + (props.stats.pending_payment || 0), color: '#6366F1' },
  { label: 'VT/NTP', value: (props.stats.pending_material_bill || 0) + (props.stats.pending_sub_acceptance || 0), color: '#A855F7' },
  { label: 'Đã duyệt', value: props.stats.approved_today || 0, color: '#10B981' },
  { label: 'Từ chối', value: props.stats.rejected_today || 0, color: '#EF4444' },
])

const totalPending = computed(() => {
  return (props.stats.pending_management || 0)
    + (props.stats.pending_accountant || 0)
    + (props.stats.pending_customer || 0)
    + (props.stats.pending_change_request || 0)
    + (props.stats.pending_additional_cost || 0)
    + (props.stats.pending_sub_payment || 0)
    + (props.stats.pending_contract || 0)
    + (props.stats.pending_payment || 0)
    + (props.stats.pending_material_bill || 0)
    + (props.stats.pending_sub_acceptance || 0)
})

// ─── Kanban columns definition ───
const kanbanColumns = computed(() => {
  // Only show columns that have items
  const all = [
    { key: 'management', title: 'BĐH Duyệt', subtitle: 'Chi phí chờ BĐH', items: props.managementItems, color: '#F59E0B', approve_color: '#10B981', level: 'management', emptyText: 'Không có yêu cầu', onApprove: handleApprove, onReject: openRejectModal },
    { key: 'accountant', title: 'Kế Toán', subtitle: 'BĐH đã duyệt → KT xác nhận', items: props.accountantItems, color: '#06B6D4', approve_color: '#06B6D4', level: 'accountant', emptyText: 'Trống', onApprove: handleApprove, onReject: openRejectModal },
    { key: 'customer', title: 'KH Nghiệm Thu', subtitle: 'KH duyệt nghiệm thu công trình', items: props.customerAcceptanceItems, color: '#8B5CF6', approve_color: '#8B5CF6', level: 'customer', emptyText: 'Chưa có hạng mục chờ KH nghiệm thu', onApprove: handleApproveAcceptance, onReject: openRejectAcceptanceModal },
    { key: 'cr', title: 'Thay Đổi (CR)', subtitle: 'Yêu cầu thay đổi chờ duyệt', items: props.changeRequestItems, color: '#EC4899', approve_color: '#EC4899', level: 'change_request', emptyText: 'Trống', onApprove: handleApproveCR, onReject: openRejectCRModal },
    { key: 'ac', title: 'CP Phát Sinh', subtitle: 'Chi phí phát sinh chờ duyệt', items: props.additionalCostItems, color: '#F97316', approve_color: '#F97316', level: 'additional_cost', emptyText: 'Trống', onApprove: handleApproveAC, onReject: openRejectACModal },
    { key: 'sub_pay_mgmt', title: 'TT NTP (BĐH)', subtitle: 'Thanh toán NTP chờ BĐH', items: props.subPaymentManagementItems, color: '#0EA5E9', approve_color: '#0EA5E9', level: 'sub_payment_management', emptyText: 'Trống', onApprove: handleApproveSubPayment, onReject: openRejectSubPaymentModal },
    { key: 'sub_pay_kt', title: 'TT NTP (KT)', subtitle: 'Thanh toán NTP chờ KT', items: props.subPaymentAccountantItems, color: '#14B8A6', approve_color: '#14B8A6', level: 'sub_payment_accountant', emptyText: 'Trống', onApprove: handleConfirmSubPayment, onReject: openRejectSubPaymentModal },
    { key: 'contract', title: 'HĐ chờ KH duyệt', subtitle: 'KH xác nhận hợp đồng thi công', items: props.contractItems, color: '#6366F1', approve_color: '#6366F1', level: 'contract', emptyText: 'Chưa có hợp đồng chờ KH duyệt', onApprove: handleApproveContract, onReject: openRejectContractModal },
    { key: 'payment', title: 'TT chờ KH duyệt', subtitle: 'KH xác nhận đợt thanh toán', items: props.paymentItems, color: '#D946EF', approve_color: '#D946EF', level: 'project_payment', emptyText: 'Chưa có đợt thanh toán chờ KH', onApprove: handleApprovePayment, onReject: openRejectPaymentModal },
    { key: 'material', title: 'Phiếu Vật Tư', subtitle: 'Phiếu xuất VT chờ duyệt', items: props.materialBillItems, color: '#A855F7', approve_color: '#A855F7', level: 'material_bill', emptyText: 'Trống', onApprove: handleApproveMaterialBill, onReject: openRejectMaterialBillModal },
    { key: 'sub_acceptance', title: 'NT NTP', subtitle: 'Nghiệm thu NTP chờ duyệt', items: props.subAcceptanceItems, color: '#0D9488', approve_color: '#0D9488', level: 'sub_acceptance', emptyText: 'Trống', onApprove: handleApproveSubAcceptance, onReject: openRejectSubAcceptanceModal },
  ]
  return all.filter(c => c.items.length > 0 || ['management', 'accountant', 'customer', 'contract', 'payment'].includes(c.key))
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0)
}

const formatCompact = (amount) => {
  if (!amount) return '0'
  if (amount >= 1e9) return (amount / 1e9).toFixed(1) + ' tỷ'
  if (amount >= 1e6) return (amount / 1e6).toFixed(1) + ' tr'
  if (amount >= 1e3) return (amount / 1e3).toFixed(0) + 'k'
  return new Intl.NumberFormat('vi-VN').format(amount)
}

const refreshPage = () => router.reload()

const openDetailDrawer = (record) => {
  detailItem.value = record
}

const getApprovalStep = (item) => {
  if (item.status === 'approved') return 3
  if (item.approval_level === 'accountant') return 2
  return 1
}

// ─── Drawer quick approve/reject ───
const handleDrawerApprove = () => {
  if (!detailItem.value) return
  const item = detailItem.value
  // Find existing handler by type/level
  const col = kanbanColumns.value.find(c =>
    c.items.some(i => i.id === item.id)
  )
  if (col) {
    detailItem.value = null
    col.onApprove(item)
  }
}
const handleDrawerReject = () => {
  if (!detailItem.value) return
  const item = detailItem.value
  const col = kanbanColumns.value.find(c =>
    c.items.some(i => i.id === item.id)
  )
  if (col) {
    detailItem.value = null
    col.onReject(item)
  }
}

// ─── Cost Approve (BĐH / KT) ───
const handleApprove = (record) => {
  const level = record.approval_level === 'management' ? 'Ban Điều Hành' : 'Kế Toán'

  Modal.confirm({
    title: `Xác nhận duyệt (${level})`,
    content: `Duyệt "${record.title}"?\n\nSố tiền: ${formatCurrency(record.amount)}`,
    okText: 'Duyệt',
    cancelText: 'Hủy',
    okButtonProps: { style: { background: '#10B981', borderColor: '#10B981' } },
    onOk() {
      const url = record.approval_level === 'management'
        ? `/approvals/${record.id}/approve-management`
        : `/approvals/${record.id}/approve-accountant`

      router.post(url, {}, {
        preserveScroll: true,
        onSuccess: () => message.success(`Đã duyệt "${record.title}"`),
        onError: () => message.error('Không thể duyệt yêu cầu này'),
      })
    },
  })
}

// ─── Customer Acceptance Approve ───
const handleApproveAcceptance = (record) => {
  Modal.confirm({
    title: 'Khách hàng duyệt nghiệm thu',
    content: `Xác nhận khách hàng duyệt nghiệm thu "${record.title}"?`,
    okText: 'Xác nhận duyệt',
    cancelText: 'Hủy',
    okButtonProps: { style: { background: '#8B5CF6', borderColor: '#8B5CF6' } },
    onOk() {
      router.post(`/approvals/acceptance/${record.id}/approve`, {}, {
        preserveScroll: true,
        onSuccess: () => message.success(`Đã duyệt nghiệm thu "${record.title}"`),
        onError: () => message.error('Không thể duyệt nghiệm thu này'),
      })
    },
  })
}

const openRejectAcceptanceModal = (record) => {
  rejectTarget.value = record
  rejectReason.value = ''
  rejectType.value = 'acceptance'
  rejectModalVisible.value = true
}

// ─── Change Request Approve ───
const handleApproveCR = (record) => {
  Modal.confirm({
    title: 'Phê duyệt yêu cầu thay đổi',
    content: `Duyệt "${record.title}"?\n\nẢnh hưởng chi phí: ${formatCurrency(record.amount)}`,
    okText: 'Phê duyệt',
    cancelText: 'Hủy',
    okButtonProps: { style: { background: '#EC4899', borderColor: '#EC4899' } },
    onOk() {
      router.post(`/approvals/change-request/${record.id}/approve`, {}, {
        preserveScroll: true,
        onSuccess: () => message.success(`Đã duyệt "${record.title}"`),
        onError: () => message.error('Không thể duyệt yêu cầu thay đổi này'),
      })
    },
  })
}

const openRejectCRModal = (record) => {
  rejectTarget.value = record
  rejectReason.value = ''
  rejectType.value = 'change_request'
  rejectModalVisible.value = true
}

// ─── Additional Cost Approve ───
const handleApproveAC = (record) => {
  Modal.confirm({
    title: 'Duyệt chi phí phát sinh',
    content: `Duyệt "${record.title}"?\n\nSố tiền: ${formatCurrency(record.amount)}`,
    okText: 'Duyệt',
    cancelText: 'Hủy',
    okButtonProps: { style: { background: '#F97316', borderColor: '#F97316' } },
    onOk() {
      router.post(`/approvals/additional-cost/${record.id}/approve`, {}, {
        preserveScroll: true,
        onSuccess: () => message.success(`Đã duyệt "${record.title}"`),
        onError: () => message.error('Không thể duyệt yêu cầu này'),
      })
    },
  })
}

const openRejectACModal = (record) => {
  rejectTarget.value = record
  rejectReason.value = ''
  rejectType.value = 'additional_cost'
  rejectModalVisible.value = true
}

// ─── Subcontractor Payment Approve/Confirm ───
const handleApproveSubPayment = (record) => {
  Modal.confirm({
    title: 'BĐH duyệt thanh toán NTP',
    content: `Duyệt thanh toán "${record.title}"?\n\nSố tiền: ${formatCurrency(record.amount)}`,
    okText: 'Duyệt',
    cancelText: 'Hủy',
    okButtonProps: { style: { background: '#0EA5E9', borderColor: '#0EA5E9' } },
    onOk() {
      router.post(`/approvals/sub-payment/${record.id}/approve`, {}, {
        preserveScroll: true,
        onSuccess: () => message.success(`Đã duyệt thanh toán NTP (BĐH)`),
        onError: () => message.error('Không thể duyệt thanh toán NTP'),
      })
    },
  })
}

const handleConfirmSubPayment = (record) => {
  Modal.confirm({
    title: 'KT xác nhận thanh toán NTP',
    content: `Xác nhận đã thanh toán "${record.title}"?\n\nSố tiền: ${formatCurrency(record.amount)}\n\n⚠️ Sau khi xác nhận, phiếu sẽ chuyển sang trạng thái ĐÃ THANH TOÁN và tự động tạo bản ghi chi phí.`,
    okText: 'Xác nhận thanh toán',
    cancelText: 'Hủy',
    okButtonProps: { style: { background: '#14B8A6', borderColor: '#14B8A6' } },
    onOk() {
      router.post(`/approvals/sub-payment/${record.id}/confirm`, {}, {
        preserveScroll: true,
        onSuccess: () => message.success(`Đã xác nhận thanh toán NTP (Kế toán)`),
        onError: () => message.error('Không thể xác nhận thanh toán NTP'),
      })
    },
  })
}

const openRejectSubPaymentModal = (record) => {
  rejectTarget.value = record
  rejectReason.value = ''
  rejectType.value = 'sub_payment'
  rejectModalVisible.value = true
}

// ─── Contract Approve (KH duyệt HĐ) ───
const handleApproveContract = (record) => {
  Modal.confirm({
    title: 'Khách hàng duyệt hợp đồng',
    content: `Duyệt hợp đồng "${record.title}"?\n\nGiá trị: ${formatCurrency(record.amount)}`,
    okText: 'Duyệt',
    cancelText: 'Hủy',
    okButtonProps: { style: { background: '#6366F1', borderColor: '#6366F1' } },
    onOk() {
      router.post(`/approvals/contract/${record.id}/approve`, {}, {
        preserveScroll: true,
        onSuccess: () => message.success(`Đã duyệt hợp đồng "${record.title}"`),
        onError: () => message.error('Không thể duyệt hợp đồng'),
      })
    },
  })
}
const openRejectContractModal = (record) => {
  rejectTarget.value = record; rejectReason.value = ''; rejectType.value = 'contract'; rejectModalVisible.value = true
}

// ─── Payment Approve (KH duyệt thanh toán) ───
const handleApprovePayment = (record) => {
  Modal.confirm({
    title: 'Khách hàng duyệt thanh toán',
    content: `Duyệt đợt thanh toán "${record.title}"?\n\nSố tiền: ${formatCurrency(record.amount)}`,
    okText: 'Duyệt',
    cancelText: 'Hủy',
    okButtonProps: { style: { background: '#D946EF', borderColor: '#D946EF' } },
    onOk() {
      router.post(`/approvals/payment/${record.id}/approve`, {}, {
        preserveScroll: true,
        onSuccess: () => message.success(`Đã duyệt đợt thanh toán`),
        onError: () => message.error('Không thể duyệt thanh toán'),
      })
    },
  })
}
const openRejectPaymentModal = (record) => {
  rejectTarget.value = record; rejectReason.value = ''; rejectType.value = 'project_payment'; rejectModalVisible.value = true
}

// ─── Material Bill Approve ───
const handleApproveMaterialBill = (record) => {
  const level = record.approval_level === 'management' ? 'BĐH' : 'Kế Toán'
  Modal.confirm({
    title: `${level} duyệt phiếu vật tư`,
    content: `Duyệt phiếu "${record.title}"?\n\nSố tiền: ${formatCurrency(record.amount)}`,
    okText: 'Duyệt',
    cancelText: 'Hủy',
    okButtonProps: { style: { background: '#A855F7', borderColor: '#A855F7' } },
    onOk() {
      router.post(`/approvals/material-bill/${record.id}/approve`, {}, {
        preserveScroll: true,
        onSuccess: () => message.success(`Đã duyệt phiếu vật tư`),
        onError: () => message.error('Không thể duyệt phiếu vật tư'),
      })
    },
  })
}
const openRejectMaterialBillModal = (record) => {
  rejectTarget.value = record; rejectReason.value = ''; rejectType.value = 'material_bill'; rejectModalVisible.value = true
}

// ─── Sub Acceptance Approve ───
const handleApproveSubAcceptance = (record) => {
  Modal.confirm({
    title: 'Duyệt nghiệm thu NTP',
    content: `Duyệt nghiệm thu "${record.title}"?\n\nNhà thầu: ${record.subcontractor_name || 'N/A'}`,
    okText: 'Duyệt',
    cancelText: 'Hủy',
    okButtonProps: { style: { background: '#0D9488', borderColor: '#0D9488' } },
    onOk() {
      router.post(`/approvals/sub-acceptance/${record.id}/approve`, {}, {
        preserveScroll: true,
        onSuccess: () => message.success(`Đã duyệt nghiệm thu NTP`),
        onError: () => message.error('Không thể duyệt nghiệm thu NTP'),
      })
    },
  })
}
const openRejectSubAcceptanceModal = (record) => {
  rejectTarget.value = record; rejectReason.value = ''; rejectType.value = 'sub_acceptance'; rejectModalVisible.value = true
}

// ─── Common Reject (Cost) ───
const openRejectModal = (record) => {
  rejectTarget.value = record
  rejectReason.value = ''
  rejectType.value = 'cost'
  rejectModalVisible.value = true
}

const handleReject = () => {
  if (!rejectReason.value.trim() || !rejectTarget.value) return

  rejectLoading.value = true

  const urlMap = {
    cost: `/approvals/${rejectTarget.value.id}/reject`,
    acceptance: `/approvals/acceptance/${rejectTarget.value.id}/reject`,
    change_request: `/approvals/change-request/${rejectTarget.value.id}/reject`,
    additional_cost: `/approvals/additional-cost/${rejectTarget.value.id}/reject`,
    sub_payment: `/approvals/sub-payment/${rejectTarget.value.id}/reject`,
    contract: `/approvals/contract/${rejectTarget.value.id}/reject`,
    project_payment: `/approvals/payment/${rejectTarget.value.id}/reject`,
    material_bill: `/approvals/material-bill/${rejectTarget.value.id}/reject`,
    sub_acceptance: `/approvals/sub-acceptance/${rejectTarget.value.id}/reject`,
  }

  router.post(urlMap[rejectType.value], {
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

const historyColumns = [
  { title: 'Yêu cầu', key: 'title', width: 250 },
  { title: 'Loại', key: 'type', width: 100 },
  { title: 'Số tiền', key: 'amount', width: 140, align: 'right' },
  { title: 'Kết quả', key: 'status', width: 120 },
  { title: 'Ngày tạo', key: 'created_at', width: 140 },
]
</script>

<style scoped>
/* ─── Stats Bar ─── */
.kb-stats {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 14px 24px;
  background: white;
  border-radius: 16px;
  border: 1px solid #E8ECF1;
  margin-bottom: 20px;
  overflow-x: auto;
  flex-wrap: nowrap;
}
.kb-stats__item {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  flex-shrink: 0;
}
.kb-stats__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.kb-stats__value {
  font-size: 18px;
  font-weight: 800;
  color: #1F2937;
  line-height: 1;
}
.kb-stats__label {
  font-size: 11px;
  color: #9CA3AF;
}
.kb-stats__divider {
  width: 1px;
  height: 28px;
  background: #E5E7EB;
  flex-shrink: 0;
}
.kb-stats__item--total {
  gap: 6px;
}

/* ─── Kanban Board ─── */
.kb-board {
  display: flex;
  gap: 16px;
  overflow-x: auto;
  padding-bottom: 16px;
  min-height: 500px;
  scrollbar-width: thin;
}
.kb-board::-webkit-scrollbar {
  height: 6px;
}
.kb-board::-webkit-scrollbar-track {
  background: transparent;
}
.kb-board::-webkit-scrollbar-thumb {
  background: #D1D5DB;
  border-radius: 3px;
}

/* ─── Column ─── */
.kb-column {
  min-width: 300px;
  max-width: 320px;
  flex-shrink: 0;
  background: #F8FAFC;
  border-radius: 16px;
  border: 1px solid #E8ECF1;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 240px);
  transition: all 0.2s ease;
}
.kb-column--empty {
  min-width: 200px;
  max-width: 220px;
}
.kb-column:hover {
  border-color: #CBD5E1;
}

.kb-column__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid #E8ECF1;
  gap: 8px;
  flex-shrink: 0;
}
.kb-column__header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.kb-column__indicator {
  width: 4px;
  height: 32px;
  border-radius: 4px;
  flex-shrink: 0;
}
.kb-column__title {
  font-size: 13px;
  font-weight: 800;
  color: #1F2937;
  line-height: 1.2;
}
.kb-column__subtitle {
  font-size: 10px;
  color: #9CA3AF;
  line-height: 1.3;
}

/* ─── Column Body — Scrollable ─── */
.kb-column__body {
  padding: 12px;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scrollbar-width: thin;
}
.kb-column__body::-webkit-scrollbar {
  width: 4px;
}
.kb-column__body::-webkit-scrollbar-track {
  background: transparent;
}
.kb-column__body::-webkit-scrollbar-thumb {
  background: #E5E7EB;
  border-radius: 2px;
}

.kb-column__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 16px;
  color: #D1D5DB;
  font-size: 12px;
}

/* ─── Card ─── */
.kb-card {
  background: white;
  border: 1px solid #E8ECF1;
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  border-left: 3px solid var(--card-color, #E8ECF1);
}
.kb-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  transform: translateY(-1px);
  border-color: var(--card-color, #E8ECF1);
}

.kb-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.kb-card__amount {
  font-size: 14px;
  font-weight: 800;
  color: #059669;
  white-space: nowrap;
}

.kb-card__title {
  font-size: 13px;
  font-weight: 700;
  color: #1F2937;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kb-card__subtitle {
  font-size: 11px;
  color: #6B7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8px;
}

.kb-card__approval-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #F0FDF4;
  border-radius: 6px;
  border: 1px solid #BBF7D0;
  font-size: 10px;
  color: #6B7280;
  margin-bottom: 8px;
}

.kb-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid #F3F4F6;
}
.kb-card__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: #9CA3AF;
  min-width: 0;
  overflow: hidden;
}
.kb-card__actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.kb-card:hover .kb-card__actions {
  opacity: 1;
}
.kb-card__btn-approve,
.kb-card__btn-reject {
  border-radius: 8px !important;
  width: 28px !important;
  height: 28px !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
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

/* ─── List View Fallback ─── */
.kb-list-view {
  /* reuse existing zone styles */
}

/* ─── Responsive ─── */
@media (max-width: 1200px) {
  .kb-stats {
    flex-wrap: wrap;
    gap: 12px;
  }
}
@media (max-width: 768px) {
  .kb-board {
    min-height: 400px;
  }
  .kb-column {
    min-width: 260px;
    max-width: 280px;
  }
}
</style>
