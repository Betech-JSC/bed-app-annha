<template>
  <Head title="Truy xuất & Nhật ký thao tác" />

  <PageHeader title="Truy xuất & Nhật ký thao tác người dùng" subtitle="Lưu vết lịch sử Thêm, Sửa, Xóa, Phê duyệt, Khôi phục và đảm bảo tính chính xác báo cáo">
    <template #actions>
      <a-space>
        <a-button @click="exportCsv">
          <template #icon><DownloadOutlined /></template>
          Xuất báo cáo (CSV)
        </a-button>
        <a-button type="primary" @click="fetchLogs">
          <template #icon><ReloadOutlined /></template>
          Làm mới
        </a-button>
      </a-space>
    </template>
  </PageHeader>

  <!-- Metric Stats Cards -->
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    <div class="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
      <div>
        <div class="text-xs font-medium text-gray-500 uppercase tracking-wider">Hôm nay</div>
        <div class="text-2xl font-bold text-gray-900 mt-1">{{ stats.total_today }}</div>
        <div class="text-xs text-gray-400 mt-1">Thao tác người dùng</div>
      </div>
      <div class="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xl">
        <HistoryOutlined />
      </div>
    </div>

    <div class="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
      <div>
        <div class="text-xs font-medium text-gray-500 uppercase tracking-wider">Đã xóa</div>
        <div class="text-2xl font-bold text-red-600 mt-1">{{ stats.total_deletions }}</div>
        <div class="text-xs text-gray-400 mt-1">Bản ghi đã soft-delete</div>
      </div>
      <div class="w-12 h-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-xl">
        <DeleteOutlined />
      </div>
    </div>

    <div class="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
      <div>
        <div class="text-xs font-medium text-gray-500 uppercase tracking-wider">Chỉnh sửa</div>
        <div class="text-2xl font-bold text-amber-600 mt-1">{{ stats.total_updates }}</div>
        <div class="text-xs text-gray-400 mt-1">Thay đổi dữ liệu</div>
      </div>
      <div class="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
        <EditOutlined />
      </div>
    </div>

    <div class="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
      <div>
        <div class="text-xs font-medium text-gray-500 uppercase tracking-wider">Phê duyệt</div>
        <div class="text-2xl font-bold text-emerald-600 mt-1">{{ stats.total_approvals }}</div>
        <div class="text-xs text-gray-400 mt-1">Duyệt & Từ chối</div>
      </div>
      <div class="w-12 h-12 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl">
        <CheckCircleOutlined />
      </div>
    </div>
  </div>

  <!-- Tabs Main Content -->
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <a-tabs v-model:activeKey="activeTabKey" @change="handleTabChange">
      <!-- TAB 1: Lịch sử thao tác -->
      <a-tab-pane key="logs" tab="Lịch sử thao tác (Audit Trail)">
        <!-- Filter Bar -->
        <div class="bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-3">
          <a-input-search
            v-model:value="filterValues.search"
            placeholder="Tìm theo mã bản ghi, tên user, từ khóa..."
            style="width: 260px"
            allow-clear
            @search="applyFilters"
          />

          <a-select
            v-model:value="filterValues.action"
            placeholder="Hành động"
            style="width: 150px"
            allow-clear
            @change="applyFilters"
          >
            <a-select-option value="">Tất cả hành động</a-select-option>
            <a-select-option value="created">Thêm mới</a-select-option>
            <a-select-option value="updated">Cập nhật</a-select-option>
            <a-select-option value="deleted">Đã xóa</a-select-option>
            <a-select-option value="restored">Khôi phục</a-select-option>
            <a-select-option value="approved">Phê duyệt</a-select-option>
            <a-select-option value="rejected">Từ chối</a-select-option>
          </a-select>

          <a-select
            v-model:value="filterValues.subject_type"
            placeholder="Loại đối tượng"
            style="width: 180px"
            allow-clear
            @change="applyFilters"
          >
            <a-select-option value="">Tất cả đối tượng</a-select-option>
            <a-select-option v-for="(label, cls) in modelLabels" :key="cls" :value="cls">
              {{ label }}
            </a-select-option>
          </a-select>

          <a-select
            v-model:value="filterValues.project_id"
            placeholder="Dự án"
            style="width: 200px"
            allow-clear
            @change="applyFilters"
          >
            <a-select-option value="">Tất cả dự án</a-select-option>
            <a-select-option v-for="p in projects" :key="p.id" :value="p.id">
              {{ p.code ? `[${p.code}] ` : '' }}{{ p.name }}
            </a-select-option>
          </a-select>

          <a-button @click="resetFilters">
            <template #icon><UndoOutlined /></template>
            Đặt lại
          </a-button>
        </div>

        <!-- Table Audit Logs -->
        <a-table
          :data-source="logs.data"
          :columns="columns"
          :pagination="false"
          :loading="loading"
          row-key="id"
          size="middle"
          bordered
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'created_at'">
              <span class="text-xs text-gray-600 font-mono">{{ formatDate(record.created_at) }}</span>
            </template>


            <template v-if="column.key === 'user'">
              <div class="flex flex-col">
                <span class="font-medium text-gray-900 text-sm">{{ record.user_name || (record.user ? record.user.name : 'System') }}</span>
                <span class="text-xs text-gray-400">{{ record.user_email || (record.user ? record.user.email : '') }}</span>
              </div>
            </template>

            <template v-if="column.key === 'action'">
              <a-tag :color="getActionColor(record.action)" class="font-medium">
                {{ getActionLabel(record.action) }}
              </a-tag>
            </template>

            <template v-if="column.key === 'subject'">
              <div class="flex flex-col">
                <span class="font-medium text-gray-800 text-xs">
                  {{ getModelLabel(record.subject_type) }}
                </span>
                <span v-if="record.subject_code" class="text-xs font-semibold text-blue-600">
                  {{ record.subject_code }}
                </span>
              </div>
            </template>

            <template v-if="column.key === 'project'">
              <span v-if="record.project" class="text-xs text-gray-700 font-medium">
                {{ record.project.code ? `[${record.project.code}] ` : '' }}{{ record.project.name }}
              </span>
              <span v-else class="text-xs text-gray-400">—</span>
            </template>

            <template v-if="column.key === 'actions'">
              <a-button type="link" size="small" @click="viewDiff(record)">
                <template #icon><EyeOutlined /></template>
                Chi tiết Diff
              </a-button>
            </template>
          </template>
        </a-table>

        <!-- Pagination -->
        <div class="mt-4 flex justify-end">
          <a-pagination
            :current="logs.current_page"
            :total="logs.total"
            :page-size="logs.per_page"
            show-size-changer
            @change="handlePageChange"
          />
        </div>
      </a-tab-pane>

      <!-- TAB 2: Bản ghi đã xóa & Khôi phục -->
      <a-tab-pane key="deleted" tab="Dữ liệu đã Xóa & Khôi phục">
        <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-xs text-amber-800 flex items-start gap-3">
          <InfoCircleOutlined class="text-lg text-amber-600 mt-0.5" />
          <div>
            <strong>Lưu ý về tính toàn vẹn dữ liệu:</strong>
            Các bản ghi bị xóa tạm (Soft Delete) được tự động loại bỏ hoàn toàn khỏi tất cả báo cáo tài chính, báo cáo chi phí và tổng quan dự án. Bạn có thể kiểm tra danh sách bản ghi đã xóa dưới đây và khôi phục khi cần thiết.
          </div>
        </div>

        <div class="flex items-center gap-4 mb-4">
          <span class="text-sm font-medium text-gray-700">Chọn loại dữ liệu:</span>
          <a-select v-model:value="deletedType" style="width: 220px" @change="fetchDeletedRecords">
            <a-select-option value="Cost">Chi phí dự án (Cost)</a-select-option>
            <a-select-option value="MaterialBill">Phiếu vật tư (MaterialBill)</a-select-option>
            <a-select-option value="EquipmentRental">Thuê máy thi công (Rental)</a-select-option>
            <a-select-option value="SubcontractorPayment">Thanh toán thầu phụ</a-select-option>
            <a-select-option value="Contract">Hợp đồng (Contract)</a-select-option>
            <a-select-option value="Project">Dự án (Project)</a-select-option>
          </a-select>

          <a-input-search
            v-model:value="deletedSearch"
            placeholder="Tìm theo ID/Mã..."
            style="width: 240px"
            @search="fetchDeletedRecords"
          />
        </div>

        <a-table
          :data-source="deletedRecords.data"
          :columns="deletedColumns"
          :pagination="false"
          :loading="deletedLoading"
          row-key="id"
          size="middle"
          bordered
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'deleted_at'">
              <span class="text-xs text-gray-600 font-mono">{{ formatDate(record.deleted_at) }}</span>
            </template>

            <template v-if="column.key === 'project'">
              <span v-if="record.project">{{ record.project.name }}</span>
              <span v-else class="text-gray-400">—</span>
            </template>

            <template v-if="column.key === 'actions'">
              <a-popconfirm
                title="Bạn có chắc chắn muốn khôi phục bản ghi này?"
                ok-text="Khôi phục"
                cancel-text="Hủy"
                @confirm="restoreRecord(record)"
              >
                <a-button type="primary" ghost size="small">
                  <template #icon><UndoOutlined /></template>
                  Khôi phục
                </a-button>
              </a-popconfirm>
            </template>
          </template>
        </a-table>

        <div class="mt-4 flex justify-end">
          <a-pagination
            :current="deletedRecords.current_page"
            :total="deletedRecords.total"
            :page-size="deletedRecords.per_page"
            @change="handleDeletedPageChange"
          />
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>

  <!-- Diff Drawer -->
  <a-drawer
    v-model:visible="diffDrawerVisible"
    title="Chi tiết Thay đổi Dữ liệu (Diff Audit)"
    width="640"
    placement="right"
  >
    <div v-if="selectedLog" class="space-y-6">
      <!-- General Info Card -->
      <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 text-xs space-y-2">
        <div class="flex justify-between">
          <span class="text-gray-500">Mã Log:</span>
          <span class="font-mono font-bold">#{{ selectedLog.id }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Thời gian:</span>
          <span class="font-medium">{{ formatDate(selectedLog.created_at) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Người thực hiện:</span>
          <span class="font-semibold text-gray-900">{{ selectedLog.user_name || 'System' }} ({{ selectedLog.user_email || 'N/A' }})</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Hành động:</span>
          <a-tag :color="getActionColor(selectedLog.action)">{{ getActionLabel(selectedLog.action) }}</a-tag>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Đối tượng:</span>
          <span class="font-medium text-blue-700">{{ getModelLabel(selectedLog.subject_type) }} {{ selectedLog.subject_code ? `[${selectedLog.subject_code}]` : '' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-500">Địa chỉ IP / Agent:</span>
          <span class="font-mono text-gray-600">{{ selectedLog.ip_address || '127.0.0.1' }}</span>
        </div>
      </div>

      <!-- Description -->
      <div>
        <h4 class="text-sm font-semibold text-gray-800 mb-1">Mô tả chi tiết:</h4>
        <div class="p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-900">
          {{ selectedLog.description }}
        </div>
      </div>

      <!-- Diff Comparison -->
      <div v-if="selectedLog.old_values || selectedLog.new_values" class="space-y-3">
        <h4 class="text-sm font-semibold text-gray-800">So sánh Dữ liệu (Old vs New):</h4>

        <div class="grid grid-cols-2 gap-3 text-xs">
          <!-- Old Values -->
          <div class="border border-red-200 rounded-lg bg-red-50/50 p-3">
            <div class="font-bold text-red-700 mb-2 border-b border-red-200 pb-1">Giá trị cũ (Before)</div>
            <pre class="whitespace-pre-wrap font-mono text-gray-800 text-[11px] leading-tight overflow-x-auto">{{ formatJson(selectedLog.old_values) }}</pre>
          </div>

          <!-- New Values -->
          <div class="border border-emerald-200 rounded-lg bg-emerald-50/50 p-3">
            <div class="font-bold text-emerald-700 mb-2 border-b border-emerald-200 pb-1">Giá trị mới (After)</div>
            <pre class="whitespace-pre-wrap font-mono text-gray-800 text-[11px] leading-tight overflow-x-auto">{{ formatJson(selectedLog.new_values) }}</pre>
          </div>
        </div>
      </div>
      <div v-else class="text-xs text-gray-400 italic">
        Không có dữ liệu Diff cho thao tác này.
      </div>
    </div>
  </a-drawer>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { Head, router } from '@inertiajs/vue3';
import CrmLayout from '@/Layouts/CrmLayout.vue';
import PageHeader from '@/Components/Crm/PageHeader.vue';

import { message } from 'ant-design-vue';
import axios from 'axios';

defineOptions({ layout: CrmLayout });
import {
  HistoryOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  UndoOutlined,
  EyeOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons-vue';


const props = defineProps({
  logs: Object,
  stats: Object,
  filters: Object,
  projects: Array,
  users: Array,
  modelLabels: Object,
  actionLabels: Object,
});

const activeTabKey = ref('logs');
const loading = ref(false);

// Filter Form Values
const filterValues = reactive({
  search: props.filters?.search || '',
  action: props.filters?.action || '',
  subject_type: props.filters?.subject_type || '',
  project_id: props.filters?.project_id || '',
  date_from: props.filters?.date_from || '',
  date_to: props.filters?.date_to || '',
});

// Columns for Logs Table
const columns = [
  { title: 'Thời gian', key: 'created_at', width: 140 },
  { title: 'Người thực hiện', key: 'user', width: 180 },
  { title: 'Hành động', key: 'action', width: 130 },
  { title: 'Đối tượng', key: 'subject', width: 160 },
  { title: 'Dự án', key: 'project', width: 160 },
  { title: 'Mô tả thao tác', dataIndex: 'description', key: 'description' },
  { title: 'Thao tác', key: 'actions', width: 120, align: 'center' },
];

// Deleted records state
const deletedType = ref('Cost');
const deletedSearch = ref('');
const deletedLoading = ref(false);
const deletedRecords = reactive({ data: [], total: 0, current_page: 1, per_page: 15 });

const deletedColumns = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
  { title: 'Dự án', key: 'project', width: 180 },
  { title: 'Thời điểm xóa', key: 'deleted_at', width: 160 },
  { title: 'Thao tác', key: 'actions', width: 140, align: 'center' },
];

// Diff Drawer State
const diffDrawerVisible = ref(false);
const selectedLog = ref(null);

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getActionLabel(action) {
  const map = {
    created: 'Thêm mới',
    updated: 'Cập nhật',
    deleted: 'Đã xóa',
    restored: 'Khôi phục',
    approved: 'Phê duyệt',
    rejected: 'Từ chối',
    force_deleted: 'Xóa vĩnh viễn',
  };
  return map[action] || action;
}

function getActionColor(action) {
  const map = {
    created: 'green',
    updated: 'blue',
    deleted: 'red',
    restored: 'cyan',
    approved: 'purple',
    rejected: 'orange',
    force_deleted: 'magenta',
  };
  return map[action] || 'default';
}

function getModelLabel(typeStr) {
  return props.modelLabels?.[typeStr] || (typeStr ? typeStr.split('\\').pop() : 'Dữ liệu');
}

function formatJson(val) {
  if (!val) return 'None';
  return JSON.stringify(val, null, 2);
}

function applyFilters() {
  router.get('/activity-logs', filterValues, { preserveState: true, replace: true });
}

function resetFilters() {
  filterValues.search = '';
  filterValues.action = '';
  filterValues.subject_type = '';
  filterValues.project_id = '';
  applyFilters();
}

function handlePageChange(page) {
  router.get('/activity-logs', { ...filterValues, page }, { preserveState: true });
}

function fetchLogs() {
  router.reload();
}

function viewDiff(log) {
  selectedLog.value = log;
  diffDrawerVisible.value = true;
}

function handleTabChange(key) {
  if (key === 'deleted') {
    fetchDeletedRecords();
  }
}

async function fetchDeletedRecords(page = 1) {
  deletedLoading.value = true;
  try {
    const res = await axios.get('/activity-logs/deleted', {
      params: {
        type: deletedType.value,
        search: deletedSearch.value,
        page,
      },
    });
    if (res.data.success) {
      deletedRecords.data = res.data.records.data;
      deletedRecords.total = res.data.records.total;
      deletedRecords.current_page = res.data.records.current_page;
      deletedRecords.per_page = res.data.records.per_page;
    }
  } catch (err) {
    message.error('Không thể tải danh sách bản ghi đã xóa');
  } finally {
    deletedLoading.value = false;
  }
}

function handleDeletedPageChange(page) {
  fetchDeletedRecords(page);
}

function restoreRecord(record) {
  router.post('/activity-logs/restore', {
    model_type: deletedType.value,
    id: record.id,
  }, {
    onSuccess: () => {
      message.success('Đã khôi phục bản ghi thành công!');
      fetchDeletedRecords();
    },
    onError: () => {
      message.error('Khôi phục bản ghi thất bại');
    },
  });
}

function exportCsv() {
  window.open('/activity-logs/export', '_blank');
}
</script>

<style scoped>
pre {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
</style>
