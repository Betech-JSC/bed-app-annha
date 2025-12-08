<template>
  <div>
    <Head title="Admin Dashboard" />
    <a-typography-title :level="2" style="margin-bottom: 24px;">Dashboard</a-typography-title>
    
    <a-row :gutter="16" style="margin-bottom: 24px;">
      <!-- Users Stats -->
      <a-col :xs="24" :sm="12" :md="8">
        <a-card title="Người dùng" :bordered="false">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-statistic title="Tổng số" :value="usersStats.total" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="Sender" :value="usersStats.senders" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="Customer" :value="usersStats.customers" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="Đã khóa" :value="usersStats.banned" :value-style="{ color: '#cf1322' }" />
            </a-col>
          </a-row>
        </a-card>
      </a-col>

      <!-- Flights Stats -->
      <a-col :xs="24" :sm="12" :md="8">
        <a-card title="Chuyến bay" :bordered="false">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-statistic title="Tổng số" :value="flightsStats.total" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="Đã xác thực" :value="flightsStats.verified" :value-style="{ color: '#3f8600' }" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="Chờ xác thực" :value="flightsStats.pending" :value-style="{ color: '#faad14' }" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="Có đơn hàng" :value="flightsStats.with_orders" />
            </a-col>
          </a-row>
        </a-card>
      </a-col>

      <!-- Orders Stats -->
      <a-col :xs="24" :sm="12" :md="8">
        <a-card title="Đơn hàng" :bordered="false">
          <a-row :gutter="16">
            <a-col :span="12">
              <a-statistic title="Tổng số" :value="ordersStats.total" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="Hoàn thành" :value="ordersStats.completed" :value-style="{ color: '#3f8600' }" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="Đang xử lý" :value="ordersStats.in_transit" :value-style="{ color: '#faad14' }" />
            </a-col>
            <a-col :span="12">
              <a-statistic title="Doanh thu" :value="formatCurrency(ordersStats.total_revenue)" :value-style="{ color: '#3f8600' }" />
            </a-col>
          </a-row>
        </a-card>
      </a-col>
    </a-row>

    <!-- Recent Orders -->
    <a-card title="Đơn hàng gần đây" :bordered="false">
      <a-table
        :columns="columns"
        :data-source="recentOrders"
        :pagination="false"
        :row-key="record => record.id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'tracking_code'">
            <Link :href="`/admin/orders/${record.id}`" style="color: #1890ff;">
              {{ record.tracking_code }}
            </Link>
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
import { Head, Link } from '@inertiajs/vue3'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  usersStats: Object,
  flightsStats: Object,
  ordersStats: Object,
  recentOrders: Array,
})

const columns = [
  {
    title: 'Mã đơn',
    dataIndex: 'tracking_code',
    key: 'tracking_code',
  },
  {
    title: 'Người gửi',
    dataIndex: 'sender_name',
    key: 'sender_name',
  },
  {
    title: 'Hành khách',
    dataIndex: 'customer_name',
    key: 'customer_name',
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
    title: 'Ngày tạo',
    dataIndex: 'created_at',
    key: 'created_at',
  },
]

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
