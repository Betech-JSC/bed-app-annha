<template>
  <Head title="Tài chính" />

  <PageHeader title="Tổng quan tài chính" subtitle="Doanh thu, chi phí và lợi nhuận dự án" />

  <!-- Stats -->
  <div class="crm-stats-grid">
    <StatCard label="Tổng giá trị hợp đồng" :value="formatCurrency(stats.total_contract_value)" icon="DollarOutlined" variant="primary" />
    <StatCard label="Tổng chi phí" :value="formatCurrency(stats.total_costs)" icon="FallOutlined" variant="warning" />
    <StatCard label="Lợi nhuận ước tính" :value="formatCurrency(stats.profit)" icon="RiseOutlined" variant="success" />
    <StatCard label="Số dự án" :value="stats.project_count" icon="ProjectOutlined" variant="primary" />
  </div>

  <!-- Contracts table -->
  <div class="crm-content-card mb-6">
    <div class="p-4 border-b border-gray-100">
      <h3 class="font-bold text-gray-800">Hợp đồng dự án</h3>
    </div>
    <a-table :columns="contractColumns" :data-source="contracts" :pagination="false" row-key="id" size="small" class="crm-table">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'project'">
          {{ record.project?.name || '—' }}
        </template>
        <template v-else-if="column.key === 'value'">
          <span class="font-semibold">{{ formatCurrency(record.contract_value) }}</span>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="contractStatusColors[record.status] || 'default'" class="rounded-full">{{ statusLabels[record.status] || record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'date'">
          {{ record.signed_date ? dayjs(record.signed_date).format('DD/MM/YYYY') : '—' }}
        </template>
      </template>
    </a-table>
  </div>

  <!-- Recent costs -->
  <div class="crm-content-card">
    <div class="p-4 border-b border-gray-100">
      <h3 class="font-bold text-gray-800">Chi phí gần đây</h3>
    </div>
    <a-table :columns="costColumns" :data-source="recentCosts.data" :pagination="{ current: recentCosts.current_page, total: recentCosts.total, pageSize: recentCosts.per_page, showTotal: (t) => `${t} phiếu chi` }" row-key="id" size="small" class="crm-table">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'project'">
          {{ record.project?.name || '—' }}
        </template>
        <template v-else-if="column.key === 'amount'">
          <span class="font-semibold text-red-500">{{ formatCurrency(record.amount) }}</span>
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="statusColors[record.status]" class="rounded-full">{{ statusLabels[record.status] || record.status }}</a-tag>
        </template>
        <template v-else-if="column.key === 'creator'">
          {{ record.creator?.name || '—' }}
        </template>
        <template v-else-if="column.key === 'date'">
          {{ dayjs(record.created_at).format('DD/MM/YYYY') }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<script setup>
import { Head } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import dayjs from 'dayjs'

defineOptions({ layout: CrmLayout })
defineProps({ stats: Object, recentCosts: Object, contracts: Array })

const contractColumns = [
  { title: 'Dự án', key: 'project' },
  { title: 'Giá trị', key: 'value', align: 'right', width: 180 },
  { title: 'Trạng thái', key: 'status', width: 130 },
  { title: 'Ngày ký', key: 'date', width: 120 },
]

const costColumns = [
  { title: 'Dự án', key: 'project' },
  { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
  { title: 'Số tiền', key: 'amount', align: 'right', width: 160 },
  { title: 'Trạng thái', key: 'status', width: 130 },
  { title: 'Người tạo', key: 'creator', width: 140 },
  { title: 'Ngày', key: 'date', width: 110 },
]

const statusColors = { draft: 'default', submitted: 'processing', pending_management_approval: 'orange', pending_accountant_approval: 'cyan', approved_management: 'blue', approved_accountant: 'green', approved: 'green', rejected: 'red', paid: 'green', confirmed: 'cyan', completed: 'green' }
const contractStatusColors = { draft: 'default', pending_customer_approval: 'orange', pending_management_approval: 'orange', pending_accountant_approval: 'blue', active: 'green', approved: 'green', confirmed: 'cyan', signed: 'geekblue', expired: 'default', terminated: 'red', cancelled: 'default', completed: 'green' }
const statusLabels = {
  draft: 'Nháp',
  submitted: 'Đã gửi',
  pending: 'Chờ duyệt',
  pending_approval: 'Chờ duyệt',
  pending_management_approval: 'Chờ BĐH duyệt',
  pending_accountant_approval: 'Chờ KT xác nhận',
  pending_customer_approval: 'Chờ KH duyệt',
  customer_pending_approval: 'Chờ KH duyệt',
  approved_management: 'BĐH đã duyệt',
  approved_accountant: 'KT đã duyệt',
  approved: 'Đã duyệt',
  confirmed: 'Đã xác nhận',
  signed: 'Đã ký',
  rejected: 'Từ chối',
  active: 'Đang hiệu lực',
  expired: 'Hết hạn',
  terminated: 'Đã thanh lý',
  cancelled: 'Đã hủy',
  completed: 'Hoàn thành',
  paid: 'Đã thanh toán',
  customer_paid: 'KH báo TT',
  customer_approved: 'KH đã duyệt',
  pending_accountant_confirmation: 'Chờ KT xác nhận',
}
const formatCurrency = (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) : '0 ₫'
</script>

<style scoped>
.crm-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
.crm-content-card { background: white; border-radius: 16px; border: 1px solid #E8ECF1; overflow: hidden; }
.crm-table :deep(.ant-table-thead > tr > th) { background: #FAFBFC; font-weight: 600; font-size: 13px; color: #5D6B82; }
@media (max-width: 768px) { .crm-stats-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
