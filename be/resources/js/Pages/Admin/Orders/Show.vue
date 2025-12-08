<template>
  <div>
    <Head title="Chi tiết Đơn hàng" />
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <a-typography-title :level="2" style="margin: 0;">Chi tiết Đơn hàng</a-typography-title>
      <a-button @click="$inertia.visit('/admin/orders')">Quay lại</a-button>
    </div>

    <a-row :gutter="16">
      <!-- Thông tin đơn hàng -->
      <a-col :xs="24" :md="12">
        <a-card title="Thông tin đơn hàng" :bordered="false">
          <a-form
            :model="statusForm"
            layout="vertical"
            @finish="handleUpdateStatus"
          >
            <a-form-item label="Mã đơn">
              <strong>{{ order.tracking_code }}</strong>
            </a-form-item>
            <a-form-item label="Trạng thái" name="status">
              <a-select v-model:value="statusForm.status">
                <a-select-option value="confirmed">Đã xác nhận</a-select-option>
                <a-select-option value="picked_up">Đã lấy hàng</a-select-option>
                <a-select-option value="in_transit">Đang vận chuyển</a-select-option>
                <a-select-option value="arrived">Đã đến nơi</a-select-option>
                <a-select-option value="delivered">Đã giao hàng</a-select-option>
                <a-select-option value="completed">Hoàn thành</a-select-option>
                <a-select-option value="cancelled">Đã hủy</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="Phần thưởng">
              <strong>{{ formatCurrency(order.reward) }}</strong>
            </a-form-item>
            <a-form-item label="Escrow Status">
              {{ order.escrow_status }}
            </a-form-item>
            <a-form-item label="Ghi chú (Admin)" name="note">
              <a-textarea v-model:value="statusForm.note" :rows="3" />
            </a-form-item>
            <a-form-item
              v-if="statusForm.status === 'cancelled'"
              label="Lý do hủy"
              name="cancel_reason"
              :rules="[{ required: true, message: 'Vui lòng nhập lý do hủy' }]"
            >
              <a-textarea v-model:value="statusForm.cancel_reason" :rows="3" />
            </a-form-item>
            <a-form-item>
              <a-button type="primary" html-type="submit" :loading="statusForm.processing">
                Cập nhật trạng thái
              </a-button>
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>

      <!-- Thông tin người dùng -->
      <a-col :xs="24" :md="12">
        <a-card title="Thông tin người dùng" :bordered="false">
          <a-descriptions :column="1" bordered>
            <a-descriptions-item label="Người gửi">
              <div>
                <strong>{{ order.sender?.name }}</strong>
                <div style="color: #8c8c8c; font-size: 12px;">{{ order.sender?.email }}</div>
              </div>
            </a-descriptions-item>
            <a-descriptions-item label="Hành khách">
              <div>
                <strong>{{ order.customer?.name }}</strong>
                <div style="color: #8c8c8c; font-size: 12px;">{{ order.customer?.email }}</div>
              </div>
            </a-descriptions-item>
            <a-descriptions-item v-if="order.flight" label="Chuyến bay">
              <div>
                <strong>{{ order.flight.from_airport }} → {{ order.flight.to_airport }}</strong>
                <div style="color: #8c8c8c; font-size: 12px;">{{ order.flight.flight_date }}</div>
              </div>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { Head } from '@inertiajs/vue3'
import { useForm } from '@inertiajs/vue3'
import { message } from 'ant-design-vue'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  order: Object,
})

const statusForm = useForm({
  status: props.order.status,
  note: '',
  cancel_reason: '',
})

const handleUpdateStatus = () => {
  statusForm.put(`/admin/orders/${props.order.id}/status`, {
    onSuccess: () => {
      message.success('Cập nhật trạng thái thành công')
    },
    onError: () => {
      message.error('Cập nhật thất bại')
    },
  })
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value || 0)
}
</script>
