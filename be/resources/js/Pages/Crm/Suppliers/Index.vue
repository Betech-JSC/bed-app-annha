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
          <div>
            <div class="font-bold text-blue-900 text-sm flex items-center gap-1">
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
          <div class="flex gap-1">
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
import {
  PlusOutlined, ShopOutlined, DollarOutlined, CheckCircleOutlined, 
  VerifiedOutlined, PhoneOutlined, EditOutlined, DeleteOutlined,
  BankOutlined
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
</script>
