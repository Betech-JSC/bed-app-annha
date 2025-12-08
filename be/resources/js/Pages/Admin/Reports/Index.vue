<template>
  <div>
    <Head title="Báo cáo & Thống kê" />
    <a-typography-title :level="2" style="margin-bottom: 24px;">Báo cáo & Thống kê</a-typography-title>
    
    <!-- Tổng quan -->
    <a-row :gutter="16" style="margin-bottom: 24px;">
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="Tổng Người dùng"
            :value="overview.users.total"
            :value-style="{ color: '#1890ff' }"
          >
            <template #prefix>
              <UserOutlined />
            </template>
          </a-statistic>
          <div style="margin-top: 8px;">
            <span>Senders: {{ overview.users.senders }}</span> | 
            <span>Customers: {{ overview.users.customers }}</span>
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="Tổng Chuyến bay"
            :value="overview.flights.total"
            :value-style="{ color: '#52c41a' }"
          >
            <template #prefix>
              <SendOutlined />
            </template>
          </a-statistic>
          <div style="margin-top: 8px;">
            <span>Đã xác thực: {{ overview.flights.verified }}</span>
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="Tổng Đơn hàng"
            :value="overview.orders.total"
            :value-style="{ color: '#faad14' }"
          >
            <template #prefix>
              <ShoppingOutlined />
            </template>
          </a-statistic>
          <div style="margin-top: 8px;">
            <span>Hoàn thành: {{ overview.orders.completed }}</span>
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic
            title="Tổng Doanh thu"
            :value="formatCurrency(overview.orders.total_revenue)"
            :value-style="{ color: '#f5222d' }"
          >
            <template #prefix>
              <span>₫</span>
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- Doanh thu theo thời gian -->
    <a-card title="Doanh thu theo thời gian" :bordered="false" style="margin-bottom: 24px;">
      <a-row :gutter="16">
        <a-col :span="6">
          <a-statistic title="Hôm nay" :value="formatCurrency(revenueByPeriod.today)" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="Tuần này" :value="formatCurrency(revenueByPeriod.this_week)" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="Tháng này" :value="formatCurrency(revenueByPeriod.this_month)" />
        </a-col>
        <a-col :span="6">
          <a-statistic title="Năm nay" :value="formatCurrency(revenueByPeriod.this_year)" />
        </a-col>
      </a-row>
    </a-card>

    <!-- Top Routes & Users -->
    <a-row :gutter="16">
      <a-col :span="12">
        <a-card title="Top 10 Tuyến đường" :bordered="false">
          <a-list :data-source="topRoutes" size="small">
            <template #renderItem="{ item, index }">
              <a-list-item>
                <a-list-item-meta>
                  <template #title>
                    <span style="font-weight: bold;">#{{ index + 1 }}</span> {{ item.route }}
                  </template>
                  <template #description>
                    {{ item.count }} chuyến bay
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
      <a-col :span="12">
        <a-card title="Top 10 Senders" :bordered="false">
          <a-list :data-source="topSenders" size="small">
            <template #renderItem="{ item, index }">
              <a-list-item>
                <a-list-item-meta>
                  <template #title>
                    <span style="font-weight: bold;">#{{ index + 1 }}</span> {{ item.name }}
                  </template>
                  <template #description>
                    {{ item.orders_count }} đơn hàng hoàn thành
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
    </a-row>

    <!-- Đơn hàng theo trạng thái -->
    <a-card title="Đơn hàng theo trạng thái" :bordered="false" style="margin-top: 24px;">
      <a-row :gutter="16">
        <a-col :span="4" v-for="(count, status) in ordersByStatus" :key="status">
          <a-statistic :title="status" :value="count" />
        </a-col>
      </a-row>
    </a-card>
  </div>
</template>

<script setup>
import { Head } from '@inertiajs/vue3'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'
import { UserOutlined, SendOutlined, ShoppingOutlined } from '@ant-design/icons-vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  overview: Object,
  revenueByPeriod: Object,
  topRoutes: Array,
  topSenders: Array,
  topCustomers: Array,
  ordersByStatus: Object,
  ordersByMonth: Array,
  admin: Object,
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount || 0)
}
</script>


