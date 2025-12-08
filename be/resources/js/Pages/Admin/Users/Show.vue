<template>
  <div>
    <Head title="Chi tiết Người dùng" />
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <a-typography-title :level="2" style="margin: 0;">Chi tiết Người dùng</a-typography-title>
      <a-button @click="$inertia.visit('/admin/users')">Quay lại</a-button>
    </div>

    <a-row :gutter="16">
      <!-- Thông tin cơ bản -->
      <a-col :xs="24" :md="12">
        <a-card title="Thông tin cơ bản" :bordered="false">
          <a-form
            :model="form"
            layout="vertical"
            @finish="handleUpdate"
          >
            <a-form-item label="Tên">
              <a-input v-model:value="form.name" />
            </a-form-item>
            <a-form-item label="Email">
              <a-input v-model:value="form.email" type="email" />
            </a-form-item>
            <a-form-item label="Số điện thoại">
              <a-input v-model:value="form.phone" />
            </a-form-item>
            <a-form-item label="Vai trò">
              <a-select v-model:value="form.role">
                <a-select-option value="sender">Sender</a-select-option>
                <a-select-option value="customer">Customer</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="Mật khẩu mới (để trống nếu không đổi)">
              <a-input-password v-model:value="form.password" />
            </a-form-item>
            <a-form-item>
              <a-space>
                <a-button type="primary" html-type="submit" :loading="form.processing">
                  Cập nhật
                </a-button>
                <a-button
                  v-if="user.is_banned"
                  type="default"
                  @click="handleUnban"
                >
                  Mở khóa
                </a-button>
                <a-button
                  v-else
                  danger
                  @click="handleBan"
                >
                  Khóa tài khoản
                </a-button>
              </a-space>
            </a-form-item>
          </a-form>
        </a-card>
      </a-col>

      <!-- Thống kê -->
      <a-col :xs="24" :md="12">
        <a-card title="Thống kê" :bordered="false">
          <a-descriptions :column="1" bordered>
            <a-descriptions-item label="Đơn hàng (Sender)">
              {{ user.statistics.orders_as_sender }}
            </a-descriptions-item>
            <a-descriptions-item label="Đơn hàng (Customer)">
              {{ user.statistics.orders_as_customer }}
            </a-descriptions-item>
            <a-descriptions-item label="Tổng đơn hàng">
              {{ user.statistics.total_orders }}
            </a-descriptions-item>
            <a-descriptions-item label="Chuyến bay">
              {{ user.statistics.flights_count }}
            </a-descriptions-item>
            <a-descriptions-item label="Số dư ví">
              {{ formatCurrency(user.wallet?.balance || 0) }}
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
import { Modal, message } from 'ant-design-vue'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  user: Object,
})

const form = useForm({
  name: props.user.name,
  email: props.user.email,
  phone: props.user.phone,
  role: props.user.role,
  password: '',
})

const handleUpdate = () => {
  form.put(`/admin/users/${props.user.id}`, {
    onSuccess: () => {
      message.success('Cập nhật thông tin thành công')
    },
    onError: () => {
      message.error('Cập nhật thất bại')
    },
  })
}

const handleBan = () => {
  Modal.confirm({
    title: 'Xác nhận',
    content: 'Bạn có chắc chắn muốn khóa tài khoản này?',
    onOk: () => {
      form.post(`/admin/users/${props.user.id}/ban`, {
        onSuccess: () => {
          message.success('Đã khóa tài khoản thành công')
        },
        onError: () => {
          message.error('Không thể khóa tài khoản')
        },
      })
    },
  })
}

const handleUnban = () => {
  form.post(`/admin/users/${props.user.id}/unban`, {
    onSuccess: () => {
      message.success('Đã mở khóa tài khoản thành công')
    },
    onError: () => {
      message.error('Không thể mở khóa tài khoản')
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
