<template>
  <Head title="Nhà cung cấp" />

  <PageHeader title="Quản Lý Nhà Cung Cấp" subtitle="Danh sách đối tác cung cấp vật tư, dịch vụ cho toàn bộ hệ thống">
    <template #actions>
      <a-button type="primary" size="large" class="rounded-xl" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);" @click="showCreateModal">
        <template #icon><PlusOutlined /></template>
        Thêm nhà cung cấp
      </a-button>
    </template>
  </PageHeader>

  <!-- ═══ Stats ═══ -->
  <div class="crm-stats-grid">
    <StatCard :value="stats.totalSuppliers" label="Tổng NCC" :icon="ShopOutlined" variant="primary" />
    <StatCard :value="formatMoney(stats.totalDebt)" label="Tổng công nợ" :icon="DollarOutlined" variant="warning" format="text" />
    <StatCard :value="formatMoney(stats.totalPaid)" label="Đã thanh toán" :icon="CheckCircleOutlined" variant="success" format="text" />
    <StatCard :value="stats.activeSuppliers" label="Đang hoạt động" :icon="VerifiedOutlined" variant="accent" />
  </div>

  <!-- ═══ Filters ═══ -->
  <div class="crm-content-card mb-6">
    <div class="crm-content-card__header" style="border-bottom: none; padding-bottom: 0;">
      <div class="flex flex-wrap items-center gap-3 w-full">
        <a-input-search
          v-model:value="localFilters.search" placeholder="Tìm NCC (tên, mã, SĐT...)" style="width: 250px;"
          size="large" allow-clear @search="applyFilters" @pressEnter="applyFilters"
        />
        <a-select v-model:value="localFilters.category" style="width: 180px;" size="large" @change="applyFilters" placeholder="Lĩnh vực" allow-clear>
          <a-select-option value="">Tất cả lĩnh vực</a-select-option>
          <a-select-option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</a-select-option>
        </a-select>
        <a-select v-model:value="localFilters.status" style="width: 160px;" size="large" @change="applyFilters" placeholder="Trạng thái">
          <a-select-option value="active">Đang hoạt động</a-select-option>
          <a-select-option value="inactive">Tạm ngưng</a-select-option>
        </a-select>
      </div>
    </div>
  </div>

  <!-- ═══ Table ═══ -->
  <div class="crm-content-card">
    <a-table
      :columns="columns" :data-source="suppliers.data" :pagination="false"
      row-key="id" class="crm-table" :scroll="{ x: 1200 }"
    >
      <template #bodyCell="{ column, record }">
        <!-- Name -->
        <template v-if="column.dataIndex === 'name'">
          <div class="cursor-pointer group" @click="showSupplierHistory(record)">
            <div class="font-bold text-blue-900 text-sm flex items-center gap-1 group-hover:text-blue-600 transition-colors">
              <span class="text-xs text-gray-400 font-normal">[{{ record.code }}]</span> 
              {{ record.name }}
            </div>
            <div v-if="record.category" class="text-xs text-gray-500 mt-0.5">{{ record.category }}</div>
          </div>
        </template>

        <!-- Contact -->
        <template v-if="column.dataIndex === 'contact'">
          <div class="text-xs">
            <div class="font-medium text-gray-700">{{ record.contact_person || '—' }}</div>
            <div class="text-gray-400 mt-0.5 flex items-center gap-1"><PhoneOutlined /> {{ record.phone || '—' }}</div>
          </div>
        </template>

        <!-- Debt Info -->
        <template v-if="column.dataIndex === 'debt'">
          <div class="text-right">
            <div class="font-semibold text-red-500 text-sm">{{ formatMoney(record.total_debt) }}</div>
            <div class="text-xs text-gray-400">Nợ cũ</div>
          </div>
        </template>

        <template v-if="column.dataIndex === 'paid'">
          <div class="text-right">
            <div class="font-semibold text-green-600 text-sm">{{ formatMoney(record.total_paid) }}</div>
            <div class="text-xs text-gray-400 text-right">Đã thanh toán</div>
          </div>
        </template>

        <!-- Status -->
        <template v-if="column.dataIndex === 'status'">
          <span class="crm-tag" :class="record.status === 'active' ? 'crm-tag--active' : 'crm-tag--cancelled'">
            {{ record.status === 'active' ? 'Hoạt động' : 'Tạm ngưng' }}
          </span>
        </template>

        <!-- Actions -->
        <template v-if="column.dataIndex === 'actions'">
          <div class="flex gap-1 items-center">
            <a-tooltip title="Xem lịch sử chi trả">
              <a-button type="text" size="small" class="text-blue-600" @click="showSupplierHistory(record)"><HistoryOutlined /></a-button>
            </a-tooltip>
            <a-tooltip title="Sửa">
              <a-button type="text" size="small" @click="showEditModal(record)"><EditOutlined /></a-button>
            </a-tooltip>
            <a-popconfirm title="Xóa nhà cung cấp này?" ok-text="Xóa" cancel-text="Hủy" @confirm="deleteSupplier(record.id)">
              <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>

    <div v-if="suppliers.last_page > 1" class="flex justify-center py-4 border-t border-gray-100">
      <a-pagination
        :current="suppliers.current_page" :total="suppliers.total" :page-size="suppliers.per_page"
        @change="(page) => router.visit(`/suppliers?page=${page}&${buildQuery()}`)"
      />
    </div>
  </div>

  <!-- Empty -->
  <div v-if="!suppliers.data?.length" class="text-center py-16">
    <ShopOutlined style="font-size: 56px; color: #D1D5DB;" />
    <p class="mt-4 text-gray-400 text-base">Chưa có nhà cung cấp nào</p>
    <a-button type="primary" class="mt-3 rounded-xl" @click="showCreateModal">Thêm nhà cung cấp đầu tiên</a-button>
  </div>

  <!-- ═══ Supplier History Drawer ═══ -->
  <a-drawer
    v-model:open="historyDrawerVisible"
    title="Lịch sử chi trả nhà cung cấp"
    width="780"
    :body-style="{ paddingBottom: '30px' }"
  >
    <div v-if="historyLoading" class="flex flex-col items-center justify-center py-20">
      <a-spin size="large" tip="Đang tải lịch sử chi..." />
    </div>

    <div v-else-if="historyData" class="space-y-6">
      <!-- Header Info Card -->
      <div class="bg-gradient-to-br from-blue-900 to-slate-800 text-white p-5 rounded-2xl shadow-md">
        <div class="flex justify-between items-start mb-3">
          <div>
            <div class="text-xs text-blue-200 uppercase tracking-wider font-semibold">[{{ historyData.supplier.code }}]</div>
            <h3 class="text-xl font-bold text-white m-0 mt-0.5">{{ historyData.supplier.name }}</h3>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md text-blue-100 border border-white/20">
            {{ historyData.supplier.category || 'Nhà cung cấp' }}
          </span>
        </div>

        <div class="grid grid-cols-3 gap-4 border-t border-white/10 pt-3 mt-3">
          <div>
            <div class="text-[11px] text-blue-200">Tổng công nợ</div>
            <div class="text-lg font-bold text-red-300">{{ formatMoney(historyData.supplier.total_debt) }}</div>
          </div>
          <div>
            <div class="text-[11px] text-blue-200">Đã thanh toán</div>
            <div class="text-lg font-bold text-emerald-400">{{ formatMoney(historyData.supplier.total_paid) }}</div>
          </div>
          <div>
            <div class="text-[11px] text-blue-200">Còn nợ</div>
            <div class="text-lg font-bold text-amber-300">{{ formatMoney(historyData.supplier.remaining_debt) }}</div>
          </div>
        </div>
      </div>

      <!-- Section 1: Itemized Cost / Payment History -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <div class="text-base font-bold text-gray-800 flex items-center gap-2">
            <HistoryOutlined class="text-blue-600" /> Danh sách phiếu chi ({{ historyData.costs?.length || 0 }})
          </div>
          <div class="text-xs text-gray-500 font-medium">
            Tổng cộng: <span class="font-bold text-blue-700">{{ formatMoney(historyData.grand_total) }}</span>
          </div>
        </div>

        <div v-if="historyData.costs?.length" class="space-y-3">
          <div v-for="cost in historyData.costs" :key="cost.id" class="p-3.5 bg-white border border-gray-100 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all">
            <div class="flex justify-between items-start">
              <div class="space-y-1 min-w-0 flex-1 pr-4">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-bold text-sm text-gray-800">{{ cost.name }}</span>
                  <span v-if="cost.project" class="text-xs px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-semibold border border-blue-100">
                    🏢 {{ cost.project.name }}
                  </span>
                  <span v-else class="text-xs px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 font-medium">
                    🏢 Chi phí công ty
                  </span>
                </div>

                <div v-if="cost.description" class="text-xs text-gray-500 italic truncate max-w-md">
                  {{ cost.description }}
                </div>

                <div class="text-[11px] text-gray-400 flex items-center gap-3">
                  <span>📅 Ngày chi: <strong>{{ formatDate(cost.cost_date) }}</strong></span>
                  <span v-if="cost.created_at">🕒 Tạo lúc: {{ formatDate(cost.created_at, 'HH:mm DD/MM/YYYY') }}</span>
                  <span v-if="cost.creator">👤 Người tạo: {{ cost.creator.name }}</span>
                </div>
              </div>

              <div class="text-right flex flex-col items-end flex-shrink-0">
                <div class="text-base font-bold text-blue-700">{{ formatMoney(cost.amount) }}</div>
                <span class="crm-tag mt-1" :class="statusClass(cost.status)">
                  {{ statusLabel(cost.status) }}
                </span>
              </div>
            </div>

            <!-- Attachments if any -->
            <div v-if="cost.attachments?.length" class="mt-2.5 pt-2 border-t border-dashed border-gray-100 flex items-center gap-2 overflow-x-auto">
              <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                <PaperClipOutlined /> Tệp ({{ cost.attachments.length }}):
              </span>
              <div v-for="att in cost.attachments" :key="att.id" 
                   class="flex items-center gap-1 px-2 py-0.5 rounded bg-gray-50 border border-gray-200/60 hover:border-blue-400 cursor-pointer text-xs transition-colors"
                   @click="openFilePreview(att)">
                <FileTextOutlined class="text-blue-500 text-[11px]" />
                <span class="text-[10px] text-gray-700 font-medium truncate max-w-[150px] hover:text-blue-600">{{ att.original_name || att.file_name }}</span>
                <EyeOutlined class="text-[10px] text-gray-400 hover:text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        <div v-else class="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <DollarOutlined class="text-4xl text-gray-300 mb-2" />
          <div class="text-sm text-gray-400">Chưa có phiếu chi nào cho nhà cung cấp này</div>
        </div>
      </div>

      <!-- Section 2: Bottom Summary Table (Tổng số tiền từng dự án) -->
      <div v-if="historyData.project_summaries?.length" class="space-y-3 pt-4 border-t border-gray-100">
        <div class="text-base font-bold text-gray-800 flex items-center gap-2">
          <PieChartOutlined class="text-emerald-600" /> Tổng hợp chi phí theo từng dự án
        </div>

        <div class="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <table class="w-full text-xs text-left">
            <thead class="bg-gray-100/80 text-gray-600 font-semibold border-b border-gray-200">
              <tr>
                <th class="py-2.5 px-4">STT</th>
                <th class="py-2.5 px-4">Tên Dự Án</th>
                <th class="py-2.5 px-4 text-center">Số lượt chi</th>
                <th class="py-2.5 px-4 text-right">Đã thanh toán</th>
                <th class="py-2.5 px-4 text-right">Tổng chi phí</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 bg-white">
              <tr v-for="(ps, idx) in historyData.project_summaries" :key="idx" class="hover:bg-blue-50/30 transition-colors">
                <td class="py-2.5 px-4 font-medium text-gray-400">{{ idx + 1 }}</td>
                <td class="py-2.5 px-4 font-bold text-gray-800">
                  <span v-if="ps.is_company" class="text-gray-600">🏢 {{ ps.project_name }}</span>
                  <span v-else class="text-blue-900">🏗️ {{ ps.project_name }} <span class="text-gray-400 text-[10px] font-normal">[{{ ps.project_code }}]</span></span>
                </td>
                <td class="py-2.5 px-4 text-center font-medium">{{ ps.count }} lượt</td>
                <td class="py-2.5 px-4 text-right font-semibold text-emerald-600">{{ formatMoney(ps.approved_amount) }}</td>
                <td class="py-2.5 px-4 text-right font-bold text-blue-700">{{ formatMoney(ps.total_amount) }}</td>
              </tr>
            </tbody>
            <tfoot class="bg-gray-100/90 font-bold border-t border-gray-200 text-gray-800">
              <tr>
                <td colspan="2" class="py-3 px-4 text-right uppercase tracking-wider text-[11px]">Tổng cộng toàn bộ:</td>
                <td class="py-3 px-4 text-center text-blue-800">{{ historyData.costs?.length || 0 }} lượt</td>
                <td class="py-3 px-4 text-right text-emerald-700 text-sm">{{ formatMoney(historyData.grand_approved) }}</td>
                <td class="py-3 px-4 text-right text-blue-800 text-sm font-extrabold">{{ formatMoney(historyData.grand_total) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </a-drawer>

  <!-- Universal File Preview Modal -->
  <FilePreviewModal
    v-model:open="showPreviewModal"
    :file="previewTargetFile"
  />

  <!-- ═══ Create/Edit Modal ═══ -->
  <a-modal
    v-model:open="formModalVisible"
    :title="editingSupplier ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp'"
    :width="720"
    @ok="saveForm"
    ok-text="Lưu"
    cancel-text="Hủy"
    :confirm-loading="form.processing"
    centered
  >
    <div class="space-y-4 mt-4 max-h-[70vh] overflow-y-auto px-1">
      <div class="grid grid-cols-3 gap-4">
        <div class="col-span-2">
          <label class="block text-sm font-medium text-gray-700 mb-1">Tên nhà cung cấp <span class="text-red-500">*</span></label>
          <a-input v-model:value="form.name" placeholder="VD: Cty TNHH Hòa Phát" size="large" />
          <div v-if="form.errors.name" class="text-red-500 text-xs mt-1">{{ form.errors.name }}</div>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mã NCC <span class="text-red-500">*</span></label>
          <a-input v-model:value="form.code" placeholder="Tự động" size="large" disabled />
          <div v-if="form.errors.code" class="text-red-500 text-xs mt-1">{{ form.errors.code }}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Lĩnh vực / Nhóm hàng</label>
          <a-input v-model:value="form.category" placeholder="VD: Vật liệu xây dựng, Nội thất..." size="large" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
          <a-radio-group v-model:value="form.status" button-style="solid" size="large" class="w-full">
            <a-radio-button value="active" class="w-1/2 text-center">Hoạt động</a-radio-button>
            <a-radio-button value="inactive" class="w-1/2 text-center">Tạm ngưng</a-radio-button>
          </a-radio-group>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Người liên hệ</label>
          <a-input v-model:value="form.contact_person" placeholder="Tên" size="large" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
          <a-input v-model:value="form.phone" placeholder="SĐT" size="large" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <a-input v-model:value="form.email" placeholder="Email" size="large" />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
        <a-textarea v-model:value="form.address" placeholder="Địa chỉ trụ sở" :rows="2" />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mã số thuế</label>
          <a-input v-model:value="form.tax_code" placeholder="MST" size="large" />
        </div>
      </div>

      <!-- Bank Info Section -->
      <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
        <div class="flex items-center gap-2 mb-3 text-blue-900 font-semibold">
          <BankOutlined /> Thông tin thanh toán
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">Ngân hàng</label>
            <a-input v-model:value="form.bank_name" placeholder="Tên ngân hàng" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
            <a-input v-model:value="form.bank_account" placeholder="STK" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Chủ tài khoản</label>
            <a-input v-model:value="form.bank_account_holder" placeholder="Tên chủ TK" />
          </div>
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
        <a-textarea v-model:value="form.description" placeholder="Ghi chú thêm..." :rows="3" />
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Head, router, useForm } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import dayjs from 'dayjs'
import FilePreviewModal from '@/Components/Crm/FilePreviewModal.vue'
import {
  PlusOutlined, ShopOutlined, DollarOutlined, CheckCircleOutlined, 
  VerifiedOutlined, PhoneOutlined, EditOutlined, DeleteOutlined,
  BankOutlined, HistoryOutlined, EyeOutlined, PaperClipOutlined,
  PieChartOutlined, FileTextOutlined
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  suppliers: Object,
  stats: Object,
  categories: Array,
  filters: Object,
})

const formatMoney = (v) => {
  if (!v && v !== 0) return '0đ'
  return new Intl.NumberFormat('vi-VN').format(parseFloat(v)) + 'đ'
}

// ============================================================
// FILTERS
// ============================================================
const localFilters = reactive({ ...props.filters })

const buildQuery = () => {
  const params = new URLSearchParams()
  if (localFilters.search) params.set('search', localFilters.search)
  if (localFilters.category) params.set('category', localFilters.category)
  if (localFilters.status) params.set('status', localFilters.status)
  return params.toString()
}

const applyFilters = () => {
  router.visit(`/suppliers?${buildQuery()}`, { preserveState: true })
}

// ============================================================
// TABLE
// ============================================================
const columns = [
  { title: 'Nhà cung cấp', dataIndex: 'name', key: 'name', width: 300 },
  { title: 'Liên hệ', dataIndex: 'contact', key: 'contact', width: 220 },
  { title: 'Công nợ', dataIndex: 'debt', key: 'debt', width: 160, align: 'right' },
  { title: 'Đã trả', dataIndex: 'paid', key: 'paid', width: 160, align: 'right' },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 140, align: 'center' },
  { title: '', dataIndex: 'actions', key: 'actions', width: 80, fixed: 'right' },
]

// ============================================================
// FORM
// ============================================================
const formModalVisible = ref(false)
const editingSupplier = ref(null)

const form = useForm({
  name: '',
  code: '',
  category: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  tax_code: '',
  bank_name: '',
  bank_account: '',
  bank_account_holder: '',
  description: '',
  status: 'active',
})

const showCreateModal = () => {
  editingSupplier.value = null
  form.reset()
  form.status = 'active'
  formModalVisible.value = true
}

const showEditModal = (record) => {
  editingSupplier.value = record
  form.name = record.name
  form.code = record.code
  form.category = record.category || ''
  form.contact_person = record.contact_person || ''
  form.phone = record.phone || ''
  form.email = record.email || ''
  form.address = record.address || ''
  form.tax_code = record.tax_code || ''
  form.bank_name = record.bank_name || ''
  form.bank_account = record.bank_account || ''
  form.bank_account_holder = record.bank_account_holder || ''
  form.description = record.description || ''
  form.status = record.status || 'active'
  formModalVisible.value = true
}

const saveForm = () => {
  if (editingSupplier.value) {
    form.put(`/suppliers/${editingSupplier.value.id}`, {
      preserveScroll: true,
      onSuccess: () => { formModalVisible.value = false },
    })
  } else {
    form.post('/suppliers', {
      preserveScroll: true,
      onSuccess: () => { formModalVisible.value = false },
    })
  }
}

const deleteSupplier = (id) => {
  router.delete(`/suppliers/${id}`, { preserveScroll: true })
}

// ============================================================
// SUPPLIER HISTORY DRAWER & FILE PREVIEW
// ============================================================
const historyDrawerVisible = ref(false)
const historyLoading = ref(false)
const historyData = ref(null)

const showSupplierHistory = (supplier) => {
  historyDrawerVisible.value = true
  historyLoading.value = true
  historyData.value = null

  fetch(`/suppliers/${supplier.id}/history`, {
    headers: { 'Accept': 'application/json' }
  })
    .then(res => res.json())
    .then(data => {
      historyData.value = data
      historyLoading.value = false
    })
    .catch(() => {
      historyLoading.value = false
    })
}

const formatDate = (d, fmt = 'DD/MM/YYYY') => {
  if (!d) return '—'
  return dayjs(d).format(fmt)
}

const statusLabel = (s) => ({
  draft: 'Nháp',
  pending_management_approval: 'Chờ BĐH',
  pending_accountant_approval: 'Chờ KT',
  approved: 'Đã thanh toán',
  rejected: 'Từ chối',
})[s] || s

const statusClass = (s) => ({
  draft: 'crm-tag--cancelled',
  pending_management_approval: 'crm-tag--pending',
  pending_accountant_approval: 'crm-tag--active',
  approved: 'crm-tag--completed',
  rejected: 'crm-tag--overdue',
})[s] || ''

const showPreviewModal = ref(false)
const previewTargetFile = ref(null)

const openFilePreview = (file) => {
  if (!file) return
  previewTargetFile.value = file
  showPreviewModal.value = true
}
</script>
