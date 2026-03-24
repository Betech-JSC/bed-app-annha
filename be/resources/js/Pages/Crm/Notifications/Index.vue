<template>
  <Head title="Thông báo hệ thống" />

  <PageHeader title="Thông Báo Hệ Thống" subtitle="Quản lý và gửi thông báo">
    <template #actions>
      <a-button size="large" class="rounded-xl mr-2" @click="markAllRead" :disabled="!stats.unread">
        <template #icon><CheckCircleOutlined /></template>
        Đọc tất cả
      </a-button>
      <a-button type="primary" size="large" class="rounded-xl" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);" @click="showSendModal = true">
        <template #icon><SendOutlined /></template>
        Gửi thông báo
      </a-button>
    </template>
  </PageHeader>

  <!-- Stats -->
  <div class="crm-stats-grid">
    <StatCard :value="stats.total" label="Tổng thông báo" :icon="BellOutlined" variant="primary" />
    <StatCard :value="stats.unread" label="Chưa đọc" :icon="AlertOutlined" variant="warning" />
    <StatCard :value="stats.urgent" label="Khẩn cấp" :icon="ExclamationCircleOutlined" variant="danger" />
    <StatCard :value="stats.today" label="Hôm nay" :icon="CalendarOutlined" variant="success" />
  </div>

  <!-- Filters -->
  <div class="crm-content-card mb-6">
    <div class="crm-content-card__header" style="border-bottom: none; padding-bottom: 0;">
      <div class="flex flex-wrap items-center gap-3 w-full">
        <a-input-search
          v-model:value="localFilters.search"
          placeholder="Tìm kiếm thông báo..."
          style="width: 260px;"
          size="large"
          class="rounded-xl"
          allow-clear
          @search="applyFilters"
          @pressEnter="applyFilters"
        />
        <a-select v-model:value="localFilters.type" style="width: 160px;" size="large" @change="applyFilters" class="rounded-xl">
          <a-select-option v-for="t in types" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
        </a-select>
        <a-select v-model:value="localFilters.priority" style="width: 140px;" size="large" @change="applyFilters" class="rounded-xl">
          <a-select-option v-for="p in priorities" :key="p.value" :value="p.value">{{ p.label }}</a-select-option>
        </a-select>
        <a-segmented
          v-model:value="localFilters.status"
          :options="statusOptions"
          size="large"
          @change="applyFilters"
        />
        <div class="ml-auto" v-if="selectedIds.length">
          <a-button danger size="large" class="rounded-xl" @click="bulkDelete">
            <DeleteOutlined class="mr-1" /> Xóa {{ selectedIds.length }} mục
          </a-button>
        </div>
      </div>
    </div>
  </div>

  <!-- Notification List -->
  <div class="notification-list">
    <div
      v-for="notif in notifications.data"
      :key="notif.id"
      class="notif-item"
      :class="{
        'notif-item--unread': notif.status === 'unread',
        'notif-item--selected': selectedIds.includes(notif.id),
      }"
    >
      <a-checkbox
        :checked="selectedIds.includes(notif.id)"
        @change="toggleSelect(notif.id)"
        class="mr-3"
      />

      <!-- Priority indicator -->
      <div class="notif-priority" :class="`notif-priority--${notif.priority}`"></div>

      <!-- Icon -->
      <div class="notif-icon" :class="`notif-icon--${notif.type || 'system'}`">
        <BellOutlined v-if="notif.type === 'system'" />
        <LineChartOutlined v-else-if="notif.type === 'project_performance'" />
        <AuditOutlined v-else-if="notif.type === 'workflow'" />
        <UserSwitchOutlined v-else-if="notif.type === 'assignment'" />
        <MessageOutlined v-else-if="notif.type === 'mention'" />
        <BellOutlined v-else />
      </div>

      <!-- Content -->
      <div class="notif-content" @click="viewNotif(notif)">
        <div class="notif-title">
          <span v-if="notif.status === 'unread'" class="notif-dot"></span>
          {{ notif.title || notif.message || 'Thông báo' }}
        </div>
        <div class="notif-body" v-if="notif.body">{{ truncate(notif.body, 120) }}</div>
        <div class="notif-meta">
          <a-tag :color="priorityColor(notif.priority)" class="text-xs rounded-lg">
            {{ priorityLabel(notif.priority) }}
          </a-tag>
          <a-tag class="text-xs rounded-lg">{{ typeLabel(notif.type) }}</a-tag>
          <span v-if="notif.user" class="text-gray-400">
            <UserOutlined class="mr-1" />{{ notif.user.name }}
          </span>
          <span class="text-gray-400">{{ timeAgo(notif.created_at) }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="notif-actions">
        <a-tooltip v-if="notif.status === 'unread'" title="Đánh dấu đã đọc">
          <a-button type="text" size="small" shape="circle" @click="markRead(notif.id)">
            <CheckOutlined />
          </a-button>
        </a-tooltip>
        <a-tooltip v-if="notif.action_url" title="Mở liên kết">
          <a-button type="text" size="small" shape="circle" @click="router.visit(notif.action_url)">
            <LinkOutlined />
          </a-button>
        </a-tooltip>
        <a-popconfirm title="Xóa thông báo này?" ok-text="Xóa" cancel-text="Hủy" @confirm="deleteNotif(notif.id)">
          <a-button type="text" size="small" shape="circle" danger>
            <DeleteOutlined />
          </a-button>
        </a-popconfirm>
      </div>
    </div>

    <!-- Empty -->
    <div v-if="!notifications.data?.length" class="text-center py-16">
      <BellOutlined style="font-size: 48px; color: #D1D5DB;" />
      <p class="mt-4 text-gray-400 text-base">Không có thông báo nào</p>
    </div>
  </div>

  <!-- Pagination -->
  <div v-if="notifications.last_page > 1" class="flex justify-center mt-6 mb-4">
    <a-pagination
      :current="notifications.current_page"
      :total="notifications.total"
      :page-size="notifications.per_page"
      show-size-changer
      @change="(page) => router.visit(`/notifications?page=${page}&${buildQuery()}`)"
    />
  </div>

  <!-- Send Notification Modal -->
  <a-modal
    v-model:open="showSendModal"
    title="Gửi thông báo mới"
    :width="640"
    :footer="null"
    centered
    destroyOnClose
  >
    <div class="py-4">
      <div class="mb-4">
        <label class="form-label">Tiêu đề <span class="text-red-500">*</span></label>
        <a-input v-model:value="sendForm.title" size="large" placeholder="Tiêu đề thông báo" class="rounded-xl" />
      </div>

      <div class="mb-4">
        <label class="form-label">Nội dung <span class="text-red-500">*</span></label>
        <a-textarea v-model:value="sendForm.body" :rows="4" placeholder="Nội dung thông báo..." class="rounded-xl" />
      </div>

      <div class="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label class="form-label">Loại</label>
          <a-select v-model:value="sendForm.type" size="large" class="w-full rounded-xl">
            <a-select-option value="system">Hệ thống</a-select-option>
            <a-select-option value="workflow">Quy trình</a-select-option>
            <a-select-option value="assignment">Phân công</a-select-option>
          </a-select>
        </div>
        <div>
          <label class="form-label">Mức độ</label>
          <a-select v-model:value="sendForm.priority" size="large" class="w-full rounded-xl">
            <a-select-option value="low">Thấp</a-select-option>
            <a-select-option value="medium">Trung bình</a-select-option>
            <a-select-option value="high">Cao</a-select-option>
            <a-select-option value="urgent">Khẩn cấp</a-select-option>
          </a-select>
        </div>
      </div>

      <div class="mb-4">
        <label class="form-label">Gửi tới <span class="text-red-500">*</span></label>
        <a-select
          v-model:value="sendForm.user_ids"
          mode="multiple"
          size="large"
          class="w-full rounded-xl"
          placeholder="Chọn người nhận..."
          :filter-option="filterUsers"
          show-search
          option-label-prop="label"
        >
          <a-select-option v-for="u in users" :key="u.id" :value="u.id" :label="u.name">
            <span>{{ u.name }}</span>
            <span class="text-xs text-gray-400 ml-2">{{ u.email }}</span>
          </a-select-option>
        </a-select>
        <a-button type="link" size="small" class="mt-1" @click="sendForm.user_ids = users.map(u => u.id)">
          Chọn tất cả
        </a-button>
      </div>

      <div class="mb-4">
        <label class="form-label">Link hành động (tùy chọn)</label>
        <a-input v-model:value="sendForm.action_url" size="large" placeholder="/projects/1" class="rounded-xl" />
      </div>

      <div class="flex justify-end gap-3 mt-6">
        <a-button size="large" class="rounded-xl" @click="showSendModal = false">Hủy</a-button>
        <a-button
          type="primary"
          size="large"
          class="rounded-xl"
          style="background: linear-gradient(135deg, #1B4F72, #2E86C1);"
          :loading="sendForm.processing"
          @click="submitSend"
        >
          <SendOutlined class="mr-1" /> Gửi thông báo
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Head, router, useForm } from '@inertiajs/vue3'
import { Modal, message } from 'ant-design-vue'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import {
  BellOutlined,
  AlertOutlined,
  ExclamationCircleOutlined,
  CalendarOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CheckOutlined,
  DeleteOutlined,
  UserOutlined,
  LinkOutlined,
  LineChartOutlined,
  AuditOutlined,
  UserSwitchOutlined,
  MessageOutlined,
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  notifications: Object,
  stats: Object,
  types: Array,
  priorities: Array,
  filters: Object,
  users: { type: Array, default: () => [] },
})

const showSendModal = ref(false)
const selectedIds = ref([])
const localFilters = reactive({ ...props.filters })

const statusOptions = [
  { value: '', label: 'Tất cả' },
  { value: 'unread', label: 'Chưa đọc' },
  { value: 'read', label: 'Đã đọc' },
]

const sendForm = useForm({
  title: '',
  body: '',
  type: 'system',
  priority: 'medium',
  user_ids: [],
  action_url: '',
})

// ============================================================
// FILTERS
// ============================================================
const buildQuery = () => {
  const params = new URLSearchParams()
  if (localFilters.type) params.set('type', localFilters.type)
  if (localFilters.priority) params.set('priority', localFilters.priority)
  if (localFilters.status) params.set('status', localFilters.status)
  if (localFilters.search) params.set('search', localFilters.search)
  return params.toString()
}

const applyFilters = () => {
  router.visit(`/notifications?${buildQuery()}`, { preserveState: true })
}

// ============================================================
// ACTIONS
// ============================================================
const toggleSelect = (id) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

const markRead = (id) => {
  router.put(`/notifications/${id}/read`, {}, { preserveScroll: true })
}

const markAllRead = () => {
  router.put('/notifications/read-all', {}, { preserveScroll: true })
}

const deleteNotif = (id) => {
  router.delete(`/notifications/${id}`, { preserveScroll: true })
}

const bulkDelete = () => {
  Modal.confirm({
    title: `Xóa ${selectedIds.value.length} thông báo?`,
    okText: 'Xóa',
    okType: 'danger',
    cancelText: 'Hủy',
    onOk: () => {
      router.post('/notifications/bulk-delete', { ids: selectedIds.value }, {
        preserveScroll: true,
        onSuccess: () => { selectedIds.value = [] },
      })
    },
  })
}

const viewNotif = (notif) => {
  if (notif.status === 'unread') markRead(notif.id)
  if (notif.action_url) router.visit(notif.action_url)
}

const submitSend = () => {
  sendForm.post('/notifications/send', {
    onSuccess: () => {
      showSendModal.value = false
      sendForm.reset()
      message.success('Gửi thông báo thành công')
    },
  })
}

const filterUsers = (input, option) => {
  return option.label?.toLowerCase().includes(input.toLowerCase())
}

// ============================================================
// HELPERS
// ============================================================
const priorityColor = (p) => ({ urgent: 'red', high: 'orange', medium: 'blue', low: 'default' })[p] || 'default'
const priorityLabel = (p) => ({ urgent: 'Khẩn cấp', high: 'Cao', medium: 'TB', low: 'Thấp' })[p] || p
const typeLabel = (t) => ({ system: 'Hệ thống', project_performance: 'Dự án', workflow: 'Quy trình', assignment: 'Phân công', mention: 'Đề cập' })[t] || t

const truncate = (str, len) => str?.length > len ? str.slice(0, len) + '...' : str

const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'Vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`
  return d.toLocaleDateString('vi-VN')
}
</script>

<style scoped>
/* ─── Notification List ─── */
.notification-list {
  background: white;
  border-radius: 16px;
  border: 1px solid #E8ECF1;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}

.notif-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #F3F5F7;
  transition: all 0.2s ease;
  cursor: default;
}
.notif-item:last-child { border-bottom: none; }
.notif-item:hover { background: #FAFBFC; }
.notif-item--unread { background: rgba(27, 79, 114, 0.02); }
.notif-item--selected { background: rgba(27, 79, 114, 0.05); }

/* Priority dot */
.notif-priority {
  width: 4px;
  height: 36px;
  border-radius: 2px;
  flex-shrink: 0;
}
.notif-priority--urgent { background: #EF4444; }
.notif-priority--high { background: #F59E0B; }
.notif-priority--medium { background: #3B82F6; }
.notif-priority--low { background: #D1D5DB; }

/* Icon */
.notif-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 16px;
}
.notif-icon--system { background: rgba(27, 79, 114, 0.08); color: #1B4F72; }
.notif-icon--project_performance { background: rgba(245, 158, 11, 0.08); color: #F59E0B; }
.notif-icon--workflow { background: rgba(142, 68, 173, 0.08); color: #8E44AD; }
.notif-icon--assignment { background: rgba(29, 131, 72, 0.08); color: #1D8348; }
.notif-icon--mention { background: rgba(46, 134, 193, 0.08); color: #2E86C1; }

/* Content */
.notif-content { flex: 1; min-width: 0; cursor: pointer; }
.notif-title {
  font-weight: 600;
  font-size: 14px;
  color: #1F2937;
  display: flex;
  align-items: center;
  gap: 6px;
}
.notif-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1B4F72;
  flex-shrink: 0;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.notif-body { font-size: 13px; color: #6B7280; margin-top: 2px; line-height: 1.4; }
.notif-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 12px;
}

/* Actions */
.notif-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.notif-item:hover .notif-actions { opacity: 1; }

/* ─── Form ─── */
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}
</style>
