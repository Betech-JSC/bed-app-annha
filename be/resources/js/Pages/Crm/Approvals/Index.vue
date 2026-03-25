<template>
  <Head title="Trung Tâm Duyệt" />

  <PageHeader
    title="Trung Tâm Duyệt Yêu Cầu"
    subtitle="Quản lý phê duyệt theo từng cấp — BĐH → Kế Toán"
  >
    <template #actions>
      <a-button size="large" class="rounded-xl" @click="refreshPage">
        <template #icon><ReloadOutlined /></template>
        Làm mới
      </a-button>
    </template>
  </PageHeader>

  <!-- ─── Stats Overview ─── -->
  <div class="approval-overview">
    <div class="approval-overview__card">
      <div class="approval-overview__icon" style="background: linear-gradient(135deg, #F59E0B20, #F59E0B08);">
        <ClockCircleOutlined style="color: #F59E0B; font-size: 22px;" />
      </div>
      <div>
        <div class="approval-overview__value">{{ stats.pending_management }}</div>
        <div class="approval-overview__label">Chờ BĐH duyệt</div>
      </div>
    </div>
    <div class="approval-overview__card">
      <div class="approval-overview__icon" style="background: linear-gradient(135deg, #06B6D420, #06B6D408);">
        <AuditOutlined style="color: #06B6D4; font-size: 22px;" />
      </div>
      <div>
        <div class="approval-overview__value">{{ stats.pending_accountant }}</div>
        <div class="approval-overview__label">Chờ KT xác nhận</div>
      </div>
    </div>
    <div class="approval-overview__card">
      <div class="approval-overview__icon" style="background: linear-gradient(135deg, #10B98120, #10B98108);">
        <CheckCircleOutlined style="color: #10B981; font-size: 22px;" />
      </div>
      <div>
        <div class="approval-overview__value">{{ stats.approved_today }}</div>
        <div class="approval-overview__label">Đã duyệt hôm nay</div>
      </div>
    </div>
    <div class="approval-overview__card">
      <div class="approval-overview__icon" style="background: linear-gradient(135deg, #EF444420, #EF444408);">
        <CloseCircleOutlined style="color: #EF4444; font-size: 22px;" />
      </div>
      <div>
        <div class="approval-overview__value">{{ stats.rejected_today }}</div>
        <div class="approval-overview__label">Từ chối hôm nay</div>
      </div>
    </div>
  </div>

  <!-- ─── Approval Pipeline ─── -->
  <div class="approval-pipeline" v-if="stats.pending_management + stats.pending_accountant > 0">
    <div class="pipeline-total">
      <DollarOutlined style="font-size: 18px;" />
      <span>Tổng chờ duyệt: <strong>{{ formatCurrency(stats.total_pending_amount) }}</strong></span>
    </div>
    <div class="pipeline-flow">
      <div class="pipeline-step" :class="{ 'pipeline-step--active': stats.pending_management > 0 }">
        <div class="pipeline-step__dot" style="background: #F59E0B;"></div>
        <span>BĐH ({{ stats.pending_management }})</span>
      </div>
      <div class="pipeline-arrow">→</div>
      <div class="pipeline-step" :class="{ 'pipeline-step--active': stats.pending_accountant > 0 }">
        <div class="pipeline-step__dot" style="background: #06B6D4;"></div>
        <span>Kế Toán ({{ stats.pending_accountant }})</span>
      </div>
      <div class="pipeline-arrow">→</div>
      <div class="pipeline-step">
        <div class="pipeline-step__dot" style="background: #10B981;"></div>
        <span>Hoàn tất</span>
      </div>
    </div>
  </div>

  <!-- ─── Zone 1: Ban Điều Hành (Management) ─── -->
  <ApprovalZone
    title="Cấp 1 — Ban Điều Hành (BĐH)"
    subtitle="Lãnh đạo xem xét và phê duyệt chi phí"
    :items="managementItems"
    :color="'#F59E0B'"
    level="management"
    emptyText="Không có yêu cầu chờ BĐH duyệt"
    @approve="handleApprove"
    @reject="openRejectModal"
    @view="openDetailDrawer"
  />

  <!-- ─── Zone 2: Kế Toán (Accountant) ─── -->
  <ApprovalZone
    title="Cấp 2 — Kế Toán (KT)"
    subtitle="Kế toán xác nhận sau khi BĐH đã duyệt"
    :items="accountantItems"
    :color="'#06B6D4'"
    level="accountant"
    emptyText="Không có yêu cầu chờ Kế Toán xác nhận"
    @approve="handleApprove"
    @reject="openRejectModal"
    @view="openDetailDrawer"
  />

  <!-- ─── Zone 3: Lịch sử xử lý ─── -->
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
            <a-tag :color="record.type === 'project_cost' ? 'blue' : 'gold'" class="rounded-lg text-xs">
              {{ record.type_label }}
            </a-tag>
          </template>
          <template v-if="column.key === 'amount'">
            <span class="font-semibold text-gray-700 text-sm">{{ formatCurrency(record.amount) }}</span>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'approved' ? 'green' : 'red'" class="rounded-lg">
              {{ record.status_label }}
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
        <div class="detail-label">Loại chi phí</div>
        <a-tag :color="detailItem.type === 'project_cost' ? 'blue' : 'gold'" class="rounded-lg">
          {{ detailItem.type_label }}
        </a-tag>
      </div>
      <div class="detail-section">
        <div class="detail-label">Phân nhóm / Dự án</div>
        <div class="text-sm text-gray-700">{{ detailItem.subtitle }}</div>
      </div>
      <div class="detail-section">
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
      <div class="detail-section" v-if="detailItem.cost_date">
        <div class="detail-label">Ngày phát sinh</div>
        <div class="text-sm text-gray-600">{{ detailItem.cost_date }}</div>
      </div>
      <div class="detail-section" v-if="detailItem.description">
        <div class="detail-label">Mô tả</div>
        <div class="text-sm text-gray-600 whitespace-pre-wrap">{{ detailItem.description }}</div>
      </div>
      <a-divider />
      <div class="detail-section">
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
        <div class="text-sm text-emerald-600 font-semibold">{{ formatCurrency(rejectTarget.amount) }}</div>
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
import { ref } from 'vue'
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
  DollarOutlined,
  HistoryOutlined,
  UpOutlined,
  DownOutlined,
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  managementItems: { type: Array, default: () => [] },
  accountantItems: { type: Array, default: () => [] },
  recentItems: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
})

const rejectModalVisible = ref(false)
const rejectTarget = ref(null)
const rejectReason = ref('')
const rejectLoading = ref(false)
const showHistory = ref(false)
const detailItem = ref(null)

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0)
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

const openRejectModal = (record) => {
  rejectTarget.value = record
  rejectReason.value = ''
  rejectModalVisible.value = true
}

const handleReject = () => {
  if (!rejectReason.value.trim() || !rejectTarget.value) return

  rejectLoading.value = true
  router.post(`/approvals/${rejectTarget.value.id}/reject`, {
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
/* ─── Overview Cards ─── */
.approval-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.approval-overview__card {
  background: white;
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid #E8ECF1;
  transition: all 0.2s ease;
}
.approval-overview__card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}
.approval-overview__icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.approval-overview__value {
  font-size: 26px;
  font-weight: 800;
  color: #1F2937;
  line-height: 1;
}
.approval-overview__label {
  font-size: 12px;
  color: #9CA3AF;
  margin-top: 4px;
}

/* ─── Pipeline ─── */
.approval-pipeline {
  background: linear-gradient(135deg, #0f172a, #1e293b);
  border-radius: 16px;
  padding: 18px 28px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: white;
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.2);
}
.pipeline-total {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  opacity: 0.85;
}
.pipeline-total strong {
  color: #34d399;
  font-size: 16px;
}
.pipeline-flow {
  display: flex;
  align-items: center;
  gap: 12px;
}
.pipeline-step {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  opacity: 0.5;
  transition: opacity 0.2s ease;
}
.pipeline-step--active {
  opacity: 1;
  font-weight: 600;
}
.pipeline-step__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.pipeline-step--active .pipeline-step__dot {
  box-shadow: 0 0 8px currentColor;
  animation: pulse-dot 2s infinite;
}
.pipeline-arrow {
  color: rgba(255,255,255,0.3);
  font-size: 14px;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
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

@media (max-width: 768px) {
  .approval-overview {
    grid-template-columns: repeat(2, 1fr);
  }
  .approval-pipeline {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
