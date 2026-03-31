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

  <!-- ─── Unified Control Bar (UX Optimized) ─── -->
  <div class="ac-controls shadow-sm">
    <div class="ac-controls__main">
      <!-- Role Selector -->
      <a-radio-group v-model:value="activeRole" button-style="solid" size="large" class="role-selector">
        <a-radio-button v-for="tab in roleTabs" :key="tab.key" :value="tab.key">
          <div class="flex items-center gap-2">
            <component :is="tab.icon" />
            <span>{{ tab.label }}</span>
            <span v-if="tab.count > 0" class="tab-badge">{{ tab.count }}</span>
          </div>
        </a-radio-button>
      </a-radio-group>
      
      <div class="flex-grow"></div>

      <!-- Sync Button -->
      <a-button shape="circle" @click="refreshPage" class="flex items-center justify-center">
        <template #icon><ReloadOutlined /></template>
      </a-button>
    </div>

    <div class="ac-controls__filters">
      <!-- Category Filter -->
      <div class="filter-group">
        <span class="filter-label"><AppstoreOutlined /> Nhóm phiếu:</span>
        <a-segmented 
          v-model:value="activeCategory" 
          :options="[
            { label: 'Tất cả', value: 'all' },
            { label: 'Tài chính', value: 'finance' },
            { label: 'Nghiệm thu', value: 'acceptance' },
            { label: 'Vận hành', value: 'technical' }
          ]"
        />
      </div>

      <!-- Status Filter -->
      <div class="filter-group">
        <span class="filter-label"><FilterOutlined /> Trạng thái:</span>
        <a-segmented 
          v-model:value="activeStatus" 
          :options="[
            { label: 'Đang chờ', value: 'pending' },
            { label: 'Nháp', value: 'draft' },
            { label: 'Từ chối', value: 'rejected' },
            { label: 'Đã duyệt', value: 'approved' },
            { label: 'Tất cả', value: 'all' }
          ]"
        />
      </div>
    </div>
  </div>

  <!-- ─── Items Table (Enhanced) ─── -->
  <div class="ac-table-card mt-6">
    <div class="p-4 border-b flex justify-between items-center bg-gray-50/50">
      <div class="text-xs font-bold text-gray-400 uppercase tracking-widest">
        DANH SÁCH YÊU CẦU ({{ activeItems.length }})
      </div>
      <div class="flex gap-2">
        <a-tag v-if="activeStatus === 'pending'" color="orange" class="rounded-lg">Đang chờ xử lý</a-tag>
        <a-tag v-else-if="activeStatus === 'rejected'" color="error" class="rounded-lg">Đã từ chối</a-tag>
      </div>
    </div>
    <a-table
      :columns="tableColumns"
      :data-source="activeItems"
      :pagination="{ pageSize: 15, showTotal: (t) => `${t} yêu cầu`, showSizeChanger: true }"
      row-key="id"
      size="middle"
      class="ac-table"
      :scroll="{ x: 1000 }"
    >
      <template #bodyCell="{ column, record }">
        <!-- Status Tag (New in Table) -->
        <template v-if="column.key === 'status'">
          <a-tag :color="historyStatusColor(record.status)" class="rounded-md text-[10px] uppercase font-bold">
            {{ statusViMap[record.status] || record.status }}
          </a-tag>
        </template>
        <!-- Loại -->
        <template v-if="column.key === 'type'">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-6 rounded-full" :style="{ backgroundColor: typeColors[record.type] || '#ccc' }"></div>
            <span class="text-xs font-medium text-gray-600">{{ record.type_label }}</span>
          </div>
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

  <!-- ─── Recent Activity Feed (UX Uplifted) ─── -->
  <div class="ac-history-card mt-6">
    <div class="ac-history-card__header" @click="showHistory = !showHistory">
      <div class="flex items-center gap-3">
        <div class="history-pulse" v-if="recentItems.length > 0"></div>
        <HistoryOutlined class="text-blue-500" />
        <span class="font-bold text-gray-800 text-sm uppercase tracking-wide">Hoạt động xử lý gần đây</span>
        <span class="history-count">{{ recentItems.length }}</span>
      </div>
      <div class="flex items-center gap-2 text-xs text-gray-400 font-medium">
        {{ showHistory ? 'Thu gọn' : 'Xem chi tiết' }}
        <UpOutlined v-if="showHistory" style="font-size: 10px;" />
        <DownOutlined v-else style="font-size: 10px;" />
      </div>
    </div>

    <transition name="slide-fade">
      <div v-if="showHistory" class="ac-history-body">
        <div v-if="recentItems.length === 0" class="p-12 text-center text-gray-400">
          <HistoryOutlined style="font-size: 32px; opacity: 0.2; margin-bottom: 12px;" />
          <p>Chưa có hoạt động xử lý nào gần đây</p>
        </div>
        
        <div v-else class="ac-timeline">
          <div v-for="item in recentItems" :key="item.id" class="ac-timeline-item">
            <!-- Timeline Line/Dot -->
            <div class="ac-timeline-left">
              <div class="ac-timeline-dot" :class="item.status">
                <CheckOutlined v-if="['approved', 'confirmed', 'paid', 'verified'].includes(item.status)" />
                <CloseOutlined v-else-if="['rejected', 'cancelled'].includes(item.status)" />
                <InfoCircleOutlined v-else />
              </div>
              <div class="ac-timeline-line"></div>
            </div>

            <!-- Timeline Content -->
            <div class="ac-timeline-content group" @click="openDetailDrawer(item)">
              <div class="flex justify-between items-start mb-1">
                <div class="flex flex-col">
                  <div class="flex items-center gap-2">
                    <span class="action-badge" :class="item.status">
                      {{ statusViMap[item.status] || item.status }}
                    </span>
                    <span class="item-title-link">{{ item.title }}</span>
                  </div>
                  <span class="item-subtitle">{{ item.subtitle }} • {{ item.type_label }}</span>
                </div>
                <div class="text-right">
                  <div v-if="item.amount" class="text-sm font-bold text-gray-700">{{ formatCurrency(item.amount) }}</div>
                  <div class="text-[10px] text-gray-400">{{ item.created_at }}</div>
                </div>
              </div>

              <!-- Rejection Reason Highlight (Direct Visibility) -->
              <div v-if="item.rejected_reason" class="item-reason-alert">
                <div class="reason-indicator"></div>
                <span class="font-bold mr-1">Lý do:</span> {{ item.rejected_reason }}
              </div>
            </div>
          </div>
        </div>
        
        <div class="p-4 bg-gray-50/50 border-t text-center">
          <a-button type="link" size="small" class="text-gray-400 font-medium hover:text-blue-500">
            Xem toàn bộ nhật ký hệ thống <ArrowRightOutlined />
          </a-button>
        </div>
      </div>
    </transition>
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

      <!-- Attachments Section -->
      <a-divider />
      <div class="detail-section">
        <div class="flex items-center justify-between mb-2">
          <div class="detail-label !mb-0">Tệp chứng từ đính kèm</div>
          <a-tag v-if="detailItem.attachments_count" color="blue" class="rounded-full">{{ detailItem.attachments_count }}</a-tag>
        </div>
        
        <div v-if="detailItem.attachments && detailItem.attachments.length > 0" class="flex flex-col gap-2">
          <a 
            v-for="file in detailItem.attachments" 
            :key="file.id" 
            :href="file.url" 
            target="_blank"
            class="flex items-center gap-3 p-3 bg-gray-50 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-xl transition-all group"
          >
            <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white rounded-lg shadow-sm border border-gray-100 group-hover:border-emerald-100">
              <FilePdfOutlined v-if="file.name.toLowerCase().endsWith('.pdf')" class="text-red-500 text-lg" />
              <FileExcelOutlined v-else-if="file.name.toLowerCase().match(/\.(xlsx|xls|csv)$/)" class="text-emerald-600 text-lg" />
              <FileImageOutlined v-else-if="file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/)" class="text-blue-500 text-lg" />
              <PaperClipOutlined v-else class="text-gray-400 text-lg" />
            </div>
            <div class="flex-grow min-w-0">
              <div class="text-sm font-medium text-gray-700 truncate group-hover:text-emerald-700">{{ file.name }}</div>
              <div class="text-xs text-gray-400 uppercase tracking-wider">{{ file.size || 'N/A' }}</div>
            </div>
            <DownloadOutlined class="text-gray-300 group-hover:text-emerald-500 transition-colors" />
          </a>
        </div>
        
        <div v-else class="p-4 border-2 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-center">
          <div class="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-2">
            <PaperClipOutlined class="text-gray-300 text-xl" />
          </div>
          <div class="text-sm text-gray-400">Không có tệp đính kèm</div>
          <div v-if="['project_cost', 'sub_payment'].includes(detailItem.type)" class="mt-2">
            <a-alert type="warning" message="Yêu cầu tài chính bắt buộc có chứng từ" banner class="text-[10px] py-1 px-2 rounded-lg" />
          </div>
        </div>
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
  FilePdfOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  PaperClipOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  ArrowRightOutlined,
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
  pendingPaymentItems: { type: Array, default: () => [] },
  paidPaymentItems: { type: Array, default: () => [] },
  materialBillManagementItems: { type: Array, default: () => [] },
  materialBillAccountantItems: { type: Array, default: () => [] },
  subAcceptanceItems: { type: Array, default: () => [] },
  supplierAcceptanceItems: { type: Array, default: () => [] },
  constructionLogItems: { type: Array, default: () => [] },
  scheduleAdjustmentItems: { type: Array, default: () => [] },
  defectItems: { type: Array, default: () => [] },
  budgetItems: { type: Array, default: () => [] },
  recentItems: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
})

const activeRole = ref('management')
const activeCategory = ref('all')
const activeStatus = ref('all')
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
  defect: 'volcano',
  budget: 'blue',
}

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
  project_manager_approved: 'QLDA đã duyệt', 
  supervisor_approved: 'GS đã duyệt', 
  owner_approved: 'CĐT đã duyệt',
  fixed: 'Đã sửa — Chờ xác nhận', 
  verified: 'Đã xác nhận',
}

const historyStatusColor = (status) => {
  if (['approved', 'customer_approved', 'approved_management', 'approved_accountant', 'paid', 'customer_paid', 'confirmed', 'implemented', 'verified'].includes(status)) return 'green'
  if (['rejected', 'cancelled'].includes(status)) return 'red'
  if (['draft'].includes(status)) return 'default'
  if (['submitted', 'under_review', 'fixed'].includes(status)) return 'processing'
  return 'orange'
}

// ─── Role-based items mapping ───
const roleItemsMap = computed(() => ({
  management: [
    ...props.managementItems.map(i => ({ ...i, _approveType: 'management' })),
    ...props.subPaymentManagementItems.map(i => ({ ...i, _approveType: 'sub_payment' })),
    ...props.additionalCostItems.map(i => ({ ...i, _approveType: 'additional_cost' })),
    ...props.materialBillManagementItems.map(i => ({ ...i, _approveType: 'material_bill' })),
    ...props.budgetItems.map(i => ({ ...i, _approveType: 'budget' })),
  ],
  accountant: [
    ...props.accountantItems.map(i => ({ ...i, _approveType: 'accountant' })),
    ...props.subPaymentAccountantItems.map(i => ({ ...i, _approveType: 'sub_payment_confirm' })),
    ...props.paidPaymentItems.map(i => ({ ...i, _approveType: 'project_payment_confirm' })),
    ...props.materialBillAccountantItems.map(i => ({ ...i, _approveType: 'material_bill' })),
  ],
  customer: [
    ...props.customerAcceptanceItems.map(i => ({ ...i, _approveType: 'acceptance' })),
    ...props.contractItems.map(i => ({ ...i, _approveType: 'contract' })),
    ...props.pendingPaymentItems.map(i => ({ ...i, _approveType: 'project_payment' })),
  ],
  operations: [
    ...props.acceptanceSupervisorItems.map(i => ({ ...i, _approveType: 'acceptance_supervisor' })),
    ...props.acceptancePMItems.map(i => ({ ...i, _approveType: 'acceptance_pm' })),
    ...props.changeRequestItems.map(i => ({ ...i, _approveType: 'change_request' })),
    ...props.subAcceptanceItems.map(i => ({ ...i, _approveType: 'sub_acceptance' })),
    ...props.supplierAcceptanceItems.map(i => ({ ...i, _approveType: 'supplier_acceptance' })),
    ...props.constructionLogItems.map(i => ({ ...i, _approveType: 'construction_log' })),
    ...props.scheduleAdjustmentItems.map(i => ({ ...i, _approveType: 'schedule_adjustment' })),
    ...props.defectItems.map(i => ({ ...i, _approveType: 'defect_verify' })),
  ],
}))

// Sort by date descending so newest items always appear first
// Sort and Filter active items
const activeItems = computed(() => {
  let items = roleItemsMap.value[activeRole.value] || []
  
  // Filter by category
  if (activeCategory.value !== 'all') {
    items = items.filter(i => {
      if (activeCategory.value === 'finance') return ['project_cost', 'sub_payment', 'project_payment', 'material_bill', 'budget'].includes(i.type)
      if (activeCategory.value === 'acceptance') return ['acceptance', 'sub_acceptance', 'supplier_acceptance'].includes(i.type)
      if (activeCategory.value === 'technical') return ['change_request', 'additional_cost', 'construction_log', 'schedule_adjustment', 'defect'].includes(i.type)
      return true
    })
  }

  // Filter by status (Only apply if not 'all')
  if (activeStatus.value !== 'all') {
    items = items.filter(i => {
      if (activeStatus.value === 'pending') return ['pending', 'pending_management_approval', 'pending_accountant_approval', 'pending_management', 'pending_accountant', 'submitted', 'under_review', 'project_manager_approved', 'supervisor_approved', 'fixed'].includes(i.status)
      if (activeStatus.value === 'draft') return i.status === 'draft'
      if (activeStatus.value === 'rejected') return i.status === 'rejected'
      if (activeStatus.value === 'approved') return ['approved', 'confirmed', 'paid', 'customer_approved'].includes(i.status)
      return true
    })
  }

  return [...items].sort((a, b) => {
    const dateA = a.created_at || ''
    const dateB = b.created_at || ''
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
  { title: 'Trạng thái', key: 'status', width: 110 },
  { title: 'Loại', key: 'type', width: 140 },
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
  project_payment_confirm: (r) => `/approvals/payment/${r.id}/confirm`,
  material_bill: (r) => `/approvals/material-bill/${r.id}/approve`,
  sub_acceptance: (r) => `/approvals/sub-acceptance/${r.id}/approve`,
  supplier_acceptance: (r) => `/approvals/supplier-acceptance/${r.id}/approve`,
  construction_log: (r) => `/approvals/construction-log/${r.id}/approve`,
  schedule_adjustment: (r) => `/approvals/schedule-adjustment/${r.id}/approve`,
  defect_verify: (r) => `/approvals/defect/${r.id}/verify`,
  budget: (r) => `/approvals/budget/${r.id}/approve`,
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
  project_payment_confirm: 'KT xác nhận thanh toán DA',
  material_bill: 'Duyệt phiếu vật tư',
  sub_acceptance: 'Duyệt nghiệm thu NTP',
  supplier_acceptance: 'Duyệt nghiệm thu NCC',
  construction_log: 'Duyệt nhật ký công trường',
  schedule_adjustment: 'Duyệt điều chỉnh tiến độ',
  defect_verify: 'Xác nhận lỗi đã sửa',
  budget: 'Duyệt ngân sách dự án',
}

const handleApproveByType = (record) => {
  const type = record._approveType || record.approval_level || 'management'
  const label = approveLabels[type] || 'Duyệt'
  const urlFn = approveUrlMap[type]
  if (!urlFn) return

  // Enforce mandatory attachments for Accountant level on financial items
  if (activeRole.value === 'accountant' && (record.attachments_count === 0 || !record.attachments_count)) {
    Modal.warning({
      title: 'Thiếu chứng từ đính kèm',
      content: 'Cảnh báo: Yêu cầu tài chính này chưa có tệp chứng từ đính kèm. Kế toán bắt buộc phải kiểm tra chứng từ trước khi xác nhận để đảm bảo tính chính xác của dòng tiền.',
      okText: 'Tôi đã hiểu',
      centered: true
    })
    return
  }

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
  project_payment_confirm: (r) => `/approvals/payment/${r.id}/reject`,
  material_bill: (r) => `/approvals/material-bill/${r.id}/reject`,
  sub_acceptance: (r) => `/approvals/sub-acceptance/${r.id}/reject`,
  supplier_acceptance: (r) => `/approvals/supplier-acceptance/${r.id}/reject`,
  construction_log: (r) => `/approvals/construction-log/${r.id}/reject`,
  schedule_adjustment: (r) => `/approvals/schedule-adjustment/${r.id}/reject`,
  defect_verify: (r) => `/approvals/defect/${r.id}/reject`,
  budget: (r) => `/approvals/budget/${r.id}/reject`,
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
/* ─── Unified Control Bar ─── */
.ac-controls {
  background: white;
  border-radius: 20px;
  border: 1px solid #E8ECF1;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ac-controls__main {
  display: flex;
  align-items: center;
  gap: 12px;
}
.ac-controls__filters {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 10px 10px;
  background: #F8FAFC;
  border-radius: 14px;
  border: 1px solid #F1F5F9;
}
.role-selector :deep(.ant-radio-button-wrapper) {
  border-radius: 14px !important;
  border: 1px solid #E2E8F0 !important;
  margin-right: 12px;
  height: 52px;
  line-height: 50px;
  font-weight: 700;
  color: #64748B;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: white;
  position: relative;
  overflow: visible;
}
.role-selector :deep(.ant-radio-button-wrapper-checked) {
  background: #EFF6FF !important; /* Soft blue background */
  border-color: #2563EB !important; /* Strong blue border */
  color: #1D4ED8 !important; /* Blue text */
  box-shadow: 0 10px 20px -5px rgba(37, 99, 235, 0.2);
  transform: translateY(-2px);
}
/* Indicator Dot for Active Role */
.role-selector :deep(.ant-radio-button-wrapper-checked)::after {
  content: '';
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  background: #3B82F6;
  border-radius: 50%;
  box-shadow: 0 0 10px #3B82F6;
}

.role-selector :deep(.ant-radio-button-wrapper::before) {
  display: none !important;
}

.tab-badge {
  background: #F59E0B;
  color: white;
  font-size: 10px;
  padding: 0 7px;
  height: 20px;
  line-height: 20px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
  margin-left: 6px;
  font-weight: 800;
  box-shadow: 0 2px 4px rgba(245, 158, 11, 0.3);
}
.role-selector :deep(.ant-radio-button-wrapper-checked) .tab-badge {
  background: #2563EB;
  color: white;
  box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
}
/* Highlight active Segmented items */
.filter-group :deep(.ant-segmented) {
  background: #F1F5F9;
  padding: 3px;
  border-radius: 10px;
}
.filter-group :deep(.ant-segmented-item-selected) {
  background: #1E293B !important; /* Dark slate for premium feel */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  border-radius: 8px !important;
}
.filter-group :deep(.ant-segmented-item-selected .ant-segmented-item-label) {
  color: white !important;
  font-weight: 800;
}
.filter-group :deep(.ant-segmented-item-label) {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 12px;
}
.filter-label {
  font-size: 11px;
  font-weight: 800;
  color: #94A3B8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ─── Stats Grid ─── */
.ac-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.ac-stat-card {
  background: white;
  border-radius: 18px;
  border: 1px solid #E8ECF1;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}
.ac-stat-card:hover {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
  border-color: #CBD5E1;
}
.ac-stat-card__icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 20px;
  color: white;
}
.ac-stat-card__value {
  font-size: 26px;
  font-weight: 800;
  color: #0F172A;
  line-height: 1.1;
}
.ac-stat-card__value--amount {
  color: #6366F1;
  font-size: 20px;
}
.ac-stat-card__label {
  font-size: 12px;
  font-weight: 500;
  color: #64748B;
  margin-top: 2px;
}

/* ─── Table Card ─── */
.ac-table-card {
  background: white;
  border-radius: 20px;
  border: 1px solid #E2E8F0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}
.ac-table :deep(.ant-table-thead > tr > th) {
  background: #F8FAFC;
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 14px 16px;
}
.ac-table :deep(.ant-table-tbody > tr > td) {
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
  border-radius: 8px;
}

/* ─── History Activity Feed ─── */
.ac-history-card {
  background: white;
  border-radius: 20px;
  border: 1px solid #E2E8F0;
  overflow: hidden;
}
.ac-history-card__header {
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  background: #F8FAFC;
  transition: all 0.2s ease;
}
.ac-history-card__header:hover {
  background: #F1F5F9;
}
.history-pulse {
  width: 8px;
  height: 8px;
  background: #3B82F6;
  border-radius: 50%;
  box-shadow: 0 0 0 rgba(59, 130, 246, 0.4);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
  70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}
.history-count {
  background: #CBD5E1;
  color: #475569;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 10px;
}

.ac-history-body {
  border-top: 1px solid #F1F5F9;
}

/* Timeline Layout */
.ac-timeline {
  padding: 24px;
  display: flex;
  flex-direction: column;
}
.ac-timeline-item {
  display: flex;
  gap: 20px;
  position: relative;
}
.ac-timeline-item:last-child .ac-timeline-line {
  display: none;
}

.ac-timeline-left {
  width: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.ac-timeline-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #F1F5F9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #94A3B8;
  z-index: 1;
}
.ac-timeline-dot.approved, .ac-timeline-dot.confirmed, .ac-timeline-dot.paid, .ac-timeline-dot.verified {
  background: #DCFCE7;
  color: #16A34A;
}
.ac-timeline-dot.rejected, .ac-timeline-dot.cancelled {
  background: #FEE2E2;
  color: #DC2626;
}

.ac-timeline-line {
  flex-grow: 1;
  width: 2px;
  background: #F1F5F9;
  margin: 4px 0;
}

.ac-timeline-content {
  flex-grow: 1;
  padding-bottom: 24px;
  cursor: pointer;
}
.item-title-link {
  font-weight: 600;
  color: #1E293B;
  font-size: 13.5px;
  transition: color 0.15s ease;
}
.ac-timeline-content:hover .item-title-link {
  color: #2563EB;
}
.item-subtitle {
  font-size: 11px;
  color: #64748B;
}

.action-badge {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  background: #F1F5F9;
  color: #64748B;
}
.action-badge.approved, .action-badge.confirmed, .action-badge.paid, .action-badge.verified {
  background: #BBF7D0;
  color: #15803D;
}
.action-badge.rejected, .action-badge.cancelled {
  background: #FECACA;
  color: #B91C1C;
}

.item-reason-alert {
  margin-top: 8px;
  padding: 8px 12px;
  background: #FFF1F2;
  border-left: 3px solid #F43F5E;
  border-radius: 0 8px 8px 0;
  font-size: 12px;
  color: #9F1239;
  display: flex;
  align-items: center;
}

/* Animations */
.slide-fade-enter-active { transition: all 0.3s ease-out; }
.slide-fade-leave-active { transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
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
