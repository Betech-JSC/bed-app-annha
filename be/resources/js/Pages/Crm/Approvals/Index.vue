<template>
  <Head title="Trung Tâm Duyệt" />

  <PageHeader
    title="Trung Tâm Duyệt Yêu Cầu"
    subtitle="Xem và xử lý tất cả yêu cầu đang chờ phê duyệt"
  >
    <template #actions>
      <a-button size="large" class="rounded-xl" @click="refreshPage">
        <template #icon><ReloadOutlined /></template>
        Làm mới
      </a-button>
    </template>
  </PageHeader>

  <!-- Summary Stats -->
  <div class="crm-stats-grid" v-if="approvalData.summary?.length > 0">
    <div
      v-for="summary in approvalData.summary"
      :key="summary.type"
      class="approval-stat-card"
      :class="{ 'active': currentFilter === summary.type }"
      @click="toggleFilter(summary.type)"
    >
      <div class="approval-stat-icon" :style="{ background: `${summary.color}15` }">
        <WalletOutlined v-if="summary.icon === 'wallet'" :style="{ color: summary.color, fontSize: '22px' }" />
        <ProjectOutlined v-if="summary.icon === 'project'" :style="{ color: summary.color, fontSize: '22px' }" />
        <ToolOutlined v-else-if="summary.icon === 'tool'" :style="{ color: summary.color, fontSize: '22px' }" />
      </div>
      <div class="approval-stat-info">
        <div class="approval-stat-value">{{ summary.total }}</div>
        <div class="approval-stat-label">{{ summary.label }}</div>
        <div class="approval-stat-breakdown">
          <a-tag v-if="summary.pending_management > 0" color="orange" class="text-xs">
            BĐH: {{ summary.pending_management }}
          </a-tag>
          <a-tag v-if="summary.pending_accountant > 0" color="cyan" class="text-xs">
            KT: {{ summary.pending_accountant }}
          </a-tag>
        </div>
      </div>
    </div>
  </div>

  <!-- Grand Total Banner -->
  <div v-if="approvalData.grand_total > 0" class="grand-total-banner">
    <div class="grand-total-left">
      <SafetyCertificateOutlined style="font-size: 28px;" />
      <div>
        <div class="grand-total-label">Tổng yêu cầu chờ duyệt</div>
        <div class="grand-total-value">{{ approvalData.grand_total }}</div>
      </div>
    </div>
  </div>

  <!-- Empty State -->
  <div v-if="filteredItems.length === 0" class="empty-state">
    <CheckCircleOutlined style="font-size: 64px; color: #10B981;" />
    <h3>Tuyệt vời! 🎉</h3>
    <p>Không có yêu cầu nào đang chờ duyệt</p>
  </div>

  <!-- Approval Table -->
  <div v-else class="crm-content-card">
    <div class="crm-content-card__header">
      <h3 class="crm-content-card__title">
        Danh sách yêu cầu
        <a-tag color="blue" class="ml-2">{{ filteredItems.length }}</a-tag>
      </h3>
      <div class="flex gap-2">
        <a-radio-group v-model:value="currentFilter" button-style="solid" size="small">
          <a-radio-button value="all">Tất cả</a-radio-button>
          <a-radio-button value="company_cost">CP Công ty</a-radio-button>
          <a-radio-button value="project_cost">CP Dự án</a-radio-button>
        </a-radio-group>
      </div>
    </div>

    <a-table
      :columns="columns"
      :data-source="filteredItems"
      :pagination="{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `${total} yêu cầu` }"
      row-key="id"
      class="crm-table"
    >
      <template #bodyCell="{ column, record }">
        <!-- Title -->
        <template v-if="column.key === 'title'">
          <div>
            <div class="font-semibold text-gray-800">{{ record.title }}</div>
            <div class="text-xs text-gray-400">{{ record.subtitle }}</div>
          </div>
        </template>

        <!-- Type -->
        <template v-if="column.key === 'type'">
          <a-tag :color="getTypeColor(record.type)" class="rounded-lg">
            {{ getTypeLabel(record.type) }}
          </a-tag>
        </template>

        <!-- Amount -->
        <template v-if="column.key === 'amount'">
          <span class="font-semibold text-emerald-600">{{ formatCurrency(record.amount) }}</span>
        </template>

        <!-- Approval Level -->
        <template v-if="column.key === 'approval_level'">
          <a-tag :color="record.approval_level === 'management' ? 'orange' : 'cyan'" class="rounded-lg">
            {{ record.approval_level === 'management' ? 'Chờ BĐH' : 'Chờ KT' }}
          </a-tag>
        </template>

        <!-- Creator -->
        <template v-if="column.key === 'created_by'">
          <div class="flex items-center gap-2">
            <a-avatar :size="28" class="bg-crm-primary text-white text-xs">
              {{ record.created_by?.charAt(0)?.toUpperCase() }}
            </a-avatar>
            <div>
              <div class="text-sm font-medium">{{ record.created_by }}</div>
              <div class="text-xs text-gray-400">{{ record.created_at }}</div>
            </div>
          </div>
        </template>

        <!-- Management Approver -->
        <template v-if="column.key === 'management_approved_by'">
          <div v-if="record.management_approved_by" class="flex items-center gap-1">
            <CheckCircleOutlined class="text-green-500" />
            <span class="text-sm text-green-600">{{ record.management_approved_by }}</span>
          </div>
          <span v-else class="text-gray-300">—</span>
        </template>

        <!-- Actions -->
        <template v-if="column.key === 'actions'">
          <div class="flex gap-2">
            <a-tooltip title="Duyệt">
              <a-button
                type="primary"
                size="small"
                class="rounded-lg"
                style="background: #10B981; border-color: #10B981;"
                @click="handleApprove(record)"
              >
                <template #icon><CheckOutlined /></template>
              </a-button>
            </a-tooltip>

            <a-tooltip title="Từ chối">
              <a-button
                danger
                size="small"
                class="rounded-lg"
                @click="openRejectModal(record)"
              >
                <template #icon><CloseOutlined /></template>
              </a-button>
            </a-tooltip>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- Reject Modal -->
  <a-modal
    v-model:open="rejectModalVisible"
    title="Từ chối yêu cầu"
    @ok="handleReject"
    :confirm-loading="rejectLoading"
    ok-text="Xác nhận từ chối"
    cancel-text="Hủy"
    :ok-button-props="{ danger: true, disabled: !rejectReason.trim() }"
    class="rounded-xl"
  >
    <div class="py-4">
      <div v-if="rejectTarget" class="mb-4 p-3 bg-gray-50 rounded-xl">
        <div class="font-semibold text-gray-700">{{ rejectTarget.title }}</div>
        <div class="text-sm text-gray-500">{{ formatCurrency(rejectTarget.amount) }}</div>
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
import {
  ReloadOutlined,
  WalletOutlined,
  ProjectOutlined,
  ToolOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons-vue'
import { message, Modal } from 'ant-design-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  approvalData: { type: Object, default: () => ({ summary: [], items: [], grand_total: 0 }) },
  currentType: { type: String, default: 'all' },
})

const currentFilter = ref(props.currentType)
const rejectModalVisible = ref(false)
const rejectTarget = ref(null)
const rejectReason = ref('')
const rejectLoading = ref(false)

// Computed
const filteredItems = computed(() => {
  if (currentFilter.value === 'all') return props.approvalData.items || []
  return (props.approvalData.items || []).filter(item => item.type === currentFilter.value)
})

// Methods
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

const getTypeColor = (type) => {
  const map = { company_cost: 'gold', project_cost: 'blue', material_bill: 'purple' }
  return map[type] || 'default'
}

const getTypeLabel = (type) => {
  const map = { company_cost: 'CP Công ty', project_cost: 'CP Dự án', material_bill: 'Vật tư' }
  return map[type] || type
}

const toggleFilter = (type) => {
  currentFilter.value = currentFilter.value === type ? 'all' : type
}

const refreshPage = () => {
  router.reload()
}

const handleApprove = (record) => {
  const level = record.approval_level === 'management' ? 'Ban Điều Hành' : 'Kế Toán'

  Modal.confirm({
    title: 'Xác nhận duyệt',
    content: `Duyệt "${record.title}" (${level})?\n\nSố tiền: ${formatCurrency(record.amount)}`,
    okText: 'Duyệt',
    cancelText: 'Hủy',
    okButtonProps: { style: { background: '#10B981', borderColor: '#10B981' } },
    onOk() {
      const url = record.approval_level === 'management'
        ? `/approvals/${record.id}/approve-management`
        : `/approvals/${record.id}/approve-accountant`

      router.post(url, {}, {
        preserveScroll: true,
        onSuccess: () => {
          message.success(`Đã duyệt "${record.title}"`)
        },
        onError: () => {
          message.error('Không thể duyệt yêu cầu này')
        },
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

// Table Columns
const columns = [
  { title: 'Yêu cầu', key: 'title', width: 280 },
  { title: 'Loại', key: 'type', width: 120 },
  { title: 'Số tiền', key: 'amount', width: 160, align: 'right' },
  { title: 'Cấp duyệt', key: 'approval_level', width: 120 },
  { title: 'Người tạo', key: 'created_by', width: 200 },
  { title: 'BĐH duyệt', key: 'management_approved_by', width: 150 },
  { title: 'Thao tác', key: 'actions', width: 120, fixed: 'right' },
]
</script>

<style scoped>
.approval-stat-card {
  background: white;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  gap: 16px;
  align-items: center;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.approval-stat-card:hover {
  border-color: var(--crm-primary-light, #2E86C1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.approval-stat-card.active {
  border-color: var(--crm-primary, #1B4F72);
  box-shadow: 0 4px 12px rgba(27, 79, 114, 0.15);
}

.approval-stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.approval-stat-info {
  flex: 1;
}

.approval-stat-value {
  font-size: 28px;
  font-weight: 800;
  color: #1F2937;
  line-height: 1;
  margin-bottom: 4px;
}

.approval-stat-label {
  font-size: 13px;
  color: #6B7280;
  font-weight: 500;
  margin-bottom: 8px;
}

.approval-stat-breakdown {
  display: flex;
  gap: 4px;
}

.grand-total-banner {
  background: linear-gradient(135deg, #1B4F72, #2E86C1);
  border-radius: 16px;
  padding: 24px 28px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: white;
  box-shadow: 0 4px 16px rgba(27, 79, 114, 0.3);
}

.grand-total-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.grand-total-label {
  font-size: 13px;
  opacity: 0.7;
}

.grand-total-value {
  font-size: 36px;
  font-weight: 800;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.empty-state h3 {
  font-size: 22px;
  font-weight: 800;
  color: #1F2937;
  margin: 20px 0 8px;
}

.empty-state p {
  font-size: 15px;
  color: #6B7280;
}
</style>
