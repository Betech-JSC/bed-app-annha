<template>
  <Head title="System Logs" />

  <PageHeader title="Nhật ký Hệ thống" subtitle="Theo dõi log Laravel, lỗi, cảnh báo và hoạt động hệ thống">
    <template #actions>
      <a-space>
        <a-button @click="downloadLog" :disabled="!stats.total">
          <template #icon><DownloadOutlined /></template>
          Tải log
        </a-button>
        <a-popconfirm title="Xóa toàn bộ log?" ok-text="Xóa" cancel-text="Hủy" @confirm="clearLog">
          <a-button danger :disabled="!stats.total">
            <template #icon><DeleteOutlined /></template>
            Xóa log
          </a-button>
        </a-popconfirm>
      </a-space>
    </template>
  </PageHeader>

  <!-- Stats -->
  <div class="crm-stats-grid">
    <StatCard :value="stats.total" label="Tổng log entries" icon="FileTextOutlined" variant="primary" />
    <StatCard :value="stats.error" label="Lỗi (Error)" icon="CloseCircleOutlined" variant="danger" />
    <StatCard :value="stats.warning" label="Cảnh báo" icon="WarningOutlined" variant="warning" />
    <StatCard :value="stats.info" label="Thông tin" icon="InfoCircleOutlined" variant="success" />
  </div>

  <!-- Info bar -->
  <div class="log-info-bar">
    <div class="log-info-bar__item">
      <DatabaseOutlined class="mr-1" />
      Kích thước: <strong>{{ stats.fileSize }}</strong>
    </div>
    <div class="log-info-bar__item">
      <ClockCircleOutlined class="mr-1" />
      Cập nhật lần cuối: <strong>{{ stats.lastModified || '—' }}</strong>
    </div>
    <div class="log-info-bar__item">
      <BugOutlined class="mr-1" />
      Critical: <strong class="text-red-600">{{ stats.critical }}</strong>
    </div>
    <div class="log-info-bar__item">
      <CodeOutlined class="mr-1" />
      Debug: <strong>{{ stats.debug }}</strong>
    </div>
  </div>

  <!-- Filters -->
  <div class="crm-content-card">
    <div class="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
      <a-input-search
        v-model:value="filterValues.search"
        placeholder="Tìm trong log..."
        class="max-w-xs"
        allow-clear
        @search="applyFilters"
        @change="debounceSearch"
      />
      <a-select
        v-model:value="filterValues.level"
        placeholder="Mức độ"
        allow-clear
        style="width: 160px"
        @change="applyFilters"
      >
        <a-select-option value="error">
          <a-badge color="red" text="Error" />
        </a-select-option>
        <a-select-option value="warning">
          <a-badge color="orange" text="Warning" />
        </a-select-option>
        <a-select-option value="info">
          <a-badge color="blue" text="Info" />
        </a-select-option>
        <a-select-option value="debug">
          <a-badge color="gray" text="Debug" />
        </a-select-option>
        <a-select-option value="critical">
          <a-badge color="volcano" text="Critical" />
        </a-select-option>
      </a-select>
      <a-date-picker
        v-model:value="datePickerVal"
        format="DD/MM/YYYY"
        placeholder="Lọc theo ngày"
        @change="handleDateChange"
      />
      <a-button type="link" @click="resetFilters">
        <ReloadOutlined class="mr-1" /> Reset
      </a-button>
    </div>

    <!-- Log entries -->
    <div class="log-list">
      <div
        v-for="(entry, idx) in entries"
        :key="idx"
        class="log-entry"
        :class="[`log-entry--${entry.level.toLowerCase()}`]"
      >
        <div class="log-entry__header">
          <a-tag :color="levelColor(entry.level)" class="rounded-lg font-mono text-xs">
            {{ entry.level }}
          </a-tag>
          <span class="log-entry__time">
            <ClockCircleOutlined class="mr-1" />
            {{ entry.datetime }}
          </span>
          <a-button
            v-if="entry.context"
            type="text"
            size="small"
            @click="toggleContext(idx)"
            class="ml-auto"
          >
            <template #icon>
              <DownOutlined v-if="!expandedEntries.includes(idx)" />
              <UpOutlined v-else />
            </template>
            {{ expandedEntries.includes(idx) ? 'Ẩn' : 'Chi tiết' }}
          </a-button>
        </div>
        <div class="log-entry__message">{{ entry.message }}</div>
        <transition name="slide">
          <div v-if="expandedEntries.includes(idx) && entry.context" class="log-entry__context">
            <pre>{{ entry.context }}</pre>
          </div>
        </transition>
      </div>

      <a-empty v-if="!entries.length" description="Không có log entries" class="py-12" />
    </div>

    <!-- Pagination -->
    <div v-if="pagination.total > pagination.per_page" class="p-4 border-t border-gray-100 flex justify-center">
      <a-pagination
        :current="pagination.current_page"
        :page-size="pagination.per_page"
        :total="pagination.total"
        show-less-items
        @change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { message } from 'ant-design-vue'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import {
  DownloadOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  BugOutlined,
  CodeOutlined,
  ReloadOutlined,
  DownOutlined,
  UpOutlined,
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  entries: Array,
  stats: Object,
  filters: Object,
  pagination: Object,
})

const filterValues = ref({
  search: props.filters?.search || '',
  level: props.filters?.level || undefined,
  date: props.filters?.date || '',
})

const datePickerVal = ref(props.filters?.date ? dayjs(props.filters.date) : null)
const expandedEntries = ref([])

const levelColor = (level) => ({
  ERROR: 'red',
  CRITICAL: 'volcano',
  WARNING: 'orange',
  INFO: 'blue',
  DEBUG: 'default',
  NOTICE: 'cyan',
  ALERT: 'magenta',
  EMERGENCY: 'red',
}[level] || 'default')

let searchTimeout = null
const debounceSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => applyFilters(), 400)
}

const applyFilters = () => {
  router.get('/system-logs', {
    search: filterValues.value.search || undefined,
    level: filterValues.value.level || undefined,
    date: filterValues.value.date || undefined,
  }, {
    preserveState: true,
    replace: true,
  })
}

const handleDateChange = (date) => {
  filterValues.value.date = date ? dayjs(date).format('YYYY-MM-DD') : ''
  applyFilters()
}

const resetFilters = () => {
  filterValues.value = { search: '', level: undefined, date: '' }
  datePickerVal.value = null
  router.get('/system-logs', {}, { preserveState: true, replace: true })
}

const handlePageChange = (page) => {
  router.get('/system-logs', {
    page,
    search: filterValues.value.search || undefined,
    level: filterValues.value.level || undefined,
    date: filterValues.value.date || undefined,
  }, {
    preserveState: true,
    replace: true,
  })
}

const toggleContext = (idx) => {
  const i = expandedEntries.value.indexOf(idx)
  if (i > -1) {
    expandedEntries.value.splice(i, 1)
  } else {
    expandedEntries.value.push(idx)
  }
}

const downloadLog = () => {
  window.location.href = '/system-logs/download'
}

const clearLog = () => {
  router.post('/system-logs/clear', {}, {
    onSuccess: () => message.success('Đã xóa log'),
  })
}
</script>

<style scoped>
.crm-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

/* ─── Info Bar ─── */
.log-info-bar {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding: 12px 20px;
  background: linear-gradient(135deg, rgba(27, 79, 114, 0.04), rgba(46, 134, 193, 0.06));
  border-radius: 12px;
  margin-bottom: 1.5rem;
  font-size: 13px;
  color: #5D6B82;
}
.log-info-bar__item {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ─── Content Card ─── */
.crm-content-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #E8ECF1;
  overflow: hidden;
}

/* ─── Log List ─── */
.log-list {
  max-height: 70vh;
  overflow-y: auto;
}

/* ─── Log Entry ─── */
.log-entry {
  padding: 14px 20px;
  border-bottom: 1px solid #F3F5F7;
  transition: background 0.15s ease;
}
.log-entry:hover { background: #FAFBFC; }

.log-entry--error, .log-entry--critical, .log-entry--emergency, .log-entry--alert {
  border-left: 3px solid #ff4d4f;
  background: rgba(255, 77, 79, 0.02);
}
.log-entry--warning {
  border-left: 3px solid #faad14;
  background: rgba(250, 173, 20, 0.02);
}
.log-entry--info {
  border-left: 3px solid #1890ff;
}
.log-entry--debug {
  border-left: 3px solid #d9d9d9;
  opacity: 0.75;
}

.log-entry__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.log-entry__time {
  font-size: 12px;
  color: #9CA3AF;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.log-entry__message {
  font-size: 13px;
  color: #1F2937;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  line-height: 1.5;
  word-break: break-word;
}

.log-entry__context {
  margin-top: 10px;
  padding: 12px;
  background: #1a1a2e;
  border-radius: 10px;
  overflow-x: auto;
}
.log-entry__context pre {
  margin: 0;
  font-size: 11px;
  color: #d4d4dc;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

/* ─── Slide Animation ─── */
.slide-enter-active, .slide-leave-active {
  transition: all 0.2s ease;
  max-height: 500px;
  overflow: hidden;
}
.slide-enter-from, .slide-leave-to {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
}

@media (max-width: 768px) {
  .crm-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .log-info-bar {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
