<template>
  <div>
    <Head title="Quản lý Đơn hàng" />
    <a-typography-title :level="2" style="margin-bottom: 24px;">Quản lý Đơn hàng</a-typography-title>
    
    <a-card :bordered="false">
      <template #extra>
        <a-space>
          <a-input-search
            v-model:value="searchValue"
            placeholder="Tìm kiếm..."
            style="width: 300px"
            @search="handleSearch"
          />
          <a-select
            v-model:value="statusFilter"
            placeholder="Trạng thái"
            style="width: 150px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="confirmed">Đã xác nhận</a-select-option>
            <a-select-option value="picked_up">Đã lấy hàng</a-select-option>
            <a-select-option value="in_transit">Đang vận chuyển</a-select-option>
            <a-select-option value="arrived">Đã đến nơi</a-select-option>
            <a-select-option value="delivered">Đã giao hàng</a-select-option>
            <a-select-option value="completed">Hoàn thành</a-select-option>
            <a-select-option value="cancelled">Đã hủy</a-select-option>
          </a-select>
          <a-select
            v-model:value="escrowFilter"
            placeholder="Escrow"
            style="width: 120px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="held">Đang giữ</a-select-option>
            <a-select-option value="released">Đã giải ngân</a-select-option>
            <a-select-option value="refunded">Đã hoàn tiền</a-select-option>
          </a-select>
        </a-space>
      </template>

      <a-table
        :columns="columns"
        :data-source="orders.data"
        :pagination="{
          current: orders.current_page,
          pageSize: orders.per_page,
          total: orders.total,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} đơn hàng`,
        }"
        :row-key="record => record.id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'tracking_code'">
            <Link :href="`/admin/orders/${record.id}`" style="color: #1890ff;">
              {{ record.tracking_code }}
            </Link>
          </template>
          <template v-else-if="column.key === 'route'">
            <span v-if="record.flight">
              {{ record.flight.from_airport }} → {{ record.flight.to_airport }}
            </span>
            <span v-else>N/A</span>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">
              {{ getStatusLabel(record.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'reward'">
            {{ formatCurrency(record.reward) }}
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Head, Link, router } from '@inertiajs/vue3'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  filters: Object,
  orders: Object,
})

const searchValue = ref(props.filters.search || '')
const statusFilter = ref(props.filters.status || null)
const escrowFilter = ref(props.filters.escrow_status || null)

const columns = [
  {
    title: 'Mã đơn',
    key: 'tracking_code',
    dataIndex: 'tracking_code',
  },
  {
    title: 'Người gửi',
    dataIndex: ['sender', 'name'],
    key: 'sender',
  },
  {
    title: 'Hành khách',
    dataIndex: ['customer', 'name'],
    key: 'customer',
  },
  {
    title: 'Tuyến đường',
    key: 'route',
  },
  {
    title: 'Trạng thái',
    key: 'status',
  },
  {
    title: 'Phần thưởng',
    key: 'reward',
  },
  {
    title: 'Thao tác',
    key: 'actions',
    width: 100,
  },
]

const handleSearch = () => {
  router.get('/admin/orders', {
    search: searchValue.value || undefined,
    status: statusFilter.value || undefined,
    escrow_status: escrowFilter.value || undefined,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}

const handleTableChange = (pagination) => {
  router.get('/admin/orders', {
    page: pagination.current,
    per_page: pagination.pageSize,
    search: searchValue.value || undefined,
    status: statusFilter.value || undefined,
    escrow_status: escrowFilter.value || undefined,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value || 0)
}

const getStatusLabel = (status) => {
  const labels = {
    'confirmed': 'Đã xác nhận',
    'picked_up': 'Đã lấy hàng',
    'in_transit': 'Đang vận chuyển',
    'arrived': 'Đã đến nơi',
    'delivered': 'Đã giao hàng',
    'completed': 'Hoàn thành',
    'cancelled': 'Đã hủy',
  }
  return labels[status] || status
}

const getStatusColor = (status) => {
  const colors = {
    'confirmed': 'blue',
    'picked_up': 'purple',
    'in_transit': 'orange',
    'arrived': 'cyan',
    'delivered': 'green',
    'completed': 'success',
    'cancelled': 'error',
  }
  return colors[status] || 'default'
}
</script>
