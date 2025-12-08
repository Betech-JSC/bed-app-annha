<template>
  <div>
    <Head :title="`Chi tiết Yêu cầu #${request.uuid}`" />
    <a-space style="margin-bottom: 16px;">
      <a-button @click="router.visit('/admin/requests')">
        <template #icon><ArrowLeftOutlined /></template>
        Quay lại
      </a-button>
    </a-space>
    
    <a-typography-title :level="2">Chi tiết Yêu cầu</a-typography-title>
    
    <a-card :bordered="false" style="margin-top: 24px;">
      <a-descriptions :column="2" bordered>
        <a-descriptions-item label="UUID">{{ request.uuid }}</a-descriptions-item>
        <a-descriptions-item label="Trạng thái">
          <a-tag :color="getStatusColor(request.status)">
            {{ getStatusLabel(request.status) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="Người gửi">
          {{ request.sender?.name }} ({{ request.sender?.email }})
        </a-descriptions-item>
        <a-descriptions-item label="Chuyến bay">
          {{ request.flight ? `${request.flight.from_airport} → ${request.flight.to_airport}` : 'N/A' }}
        </a-descriptions-item>
        <a-descriptions-item label="Loại hàng">{{ request.item_type }}</a-descriptions-item>
        <a-descriptions-item label="Giá trị hàng">{{ formatCurrency(request.item_value) }}</a-descriptions-item>
        <a-descriptions-item label="Phần thưởng">{{ formatCurrency(request.reward) }}</a-descriptions-item>
        <a-descriptions-item label="Mức ưu tiên">
          <a-tag :color="getPriorityColor(request.priority_level)">
            {{ request.priority_label }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="Mô tả" :span="2">{{ request.item_description }}</a-descriptions-item>
        <a-descriptions-item label="Ghi chú" :span="2">{{ request.note || 'Không có' }}</a-descriptions-item>
        <a-descriptions-item label="Hết hạn">{{ request.expires_at }}</a-descriptions-item>
        <a-descriptions-item label="Đã có đơn hàng">
          <a-tag :color="request.order ? 'green' : 'default'">
            {{ request.order ? 'Có' : 'Chưa có' }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="Ngày tạo">{{ request.created_at }}</a-descriptions-item>
      </a-descriptions>
    </a-card>
  </div>
</template>

<script setup>
import { Head, router } from '@inertiajs/vue3'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  request: Object,
  admin: Object,
})

const getStatusColor = (status) => {
  const colors = {
    pending: 'orange',
    accepted: 'blue',
    confirmed: 'green',
    expired: 'red',
    declined: 'default',
  }
  return colors[status] || 'default'
}

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Đang chờ',
    accepted: 'Đã chấp nhận',
    confirmed: 'Đã xác nhận',
    expired: 'Hết hạn',
    declined: 'Từ chối',
  }
  return labels[status] || status
}

const getPriorityColor = (priority) => {
  const colors = {
    urgent: 'red',
    priority: 'orange',
    normal: 'default',
  }
  return colors[priority] || 'default'
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount || 0)
}
</script>

