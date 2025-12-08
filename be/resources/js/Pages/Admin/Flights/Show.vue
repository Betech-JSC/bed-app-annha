<template>
  <div>
    <Head title="Chi tiết Chuyến bay" />
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
      <a-typography-title :level="2" style="margin: 0;">Chi tiết Chuyến bay</a-typography-title>
      <a-button @click="$inertia.visit('/admin/flights')">Quay lại</a-button>
    </div>

    <a-row :gutter="16">
      <!-- Thông tin chuyến bay -->
      <a-col :xs="24" :md="12">
        <a-card title="Thông tin chuyến bay" :bordered="false">
          <a-descriptions :column="1" bordered>
            <a-descriptions-item label="Tuyến đường">
              <strong>{{ flight.from_airport }} → {{ flight.to_airport }}</strong>
            </a-descriptions-item>
            <a-descriptions-item label="Ngày bay">
              {{ flight.flight_date }}
            </a-descriptions-item>
            <a-descriptions-item label="Hãng bay">
              {{ flight.airline }}
            </a-descriptions-item>
            <a-descriptions-item label="Số hiệu chuyến">
              {{ flight.flight_number }}
            </a-descriptions-item>
            <a-descriptions-item label="Trọng lượng">
              {{ flight.booked_weight }}/{{ flight.max_weight }} kg
              <span style="color: #52c41a; margin-left: 8px;">
                (Còn lại: {{ flight.available_weight }} kg)
              </span>
            </a-descriptions-item>
            <a-descriptions-item label="Trạng thái">
              <a-tag :color="flight.verified ? 'success' : 'warning'">
                {{ flight.verified ? 'Đã xác thực' : 'Chờ xác thực' }}
              </a-tag>
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-col>

      <!-- Thao tác -->
      <a-col :xs="24" :md="12">
        <a-card title="Thao tác" :bordered="false">
          <a-space direction="vertical" style="width: 100%;">
            <a-button
              v-if="!flight.verified"
              type="primary"
              block
              @click="handleVerify"
            >
              Xác thực chuyến bay
            </a-button>
            <a-button
              v-if="!flight.verified"
              block
              @click="showRejectModal = true"
            >
              Từ chối
            </a-button>
            <a-button
              danger
              block
              @click="showCancelModal = true"
            >
              Hủy chuyến bay
            </a-button>
          </a-space>
        </a-card>
      </a-col>
    </a-row>

    <!-- Reject Modal -->
    <a-modal
      v-model:open="showRejectModal"
      title="Từ chối chuyến bay"
      @ok="handleReject"
      @cancel="showRejectModal = false"
    >
      <a-form :model="rejectForm" layout="vertical">
        <a-form-item label="Lý do từ chối" required>
          <a-textarea v-model:value="rejectForm.reason" :rows="4" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- Cancel Modal -->
    <a-modal
      v-model:open="showCancelModal"
      title="Hủy chuyến bay"
      @ok="handleCancel"
      @cancel="showCancelModal = false"
    >
      <a-form :model="cancelForm" layout="vertical">
        <a-form-item label="Lý do hủy" required>
          <a-textarea v-model:value="cancelForm.reason" :rows="4" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { Head, useForm } from '@inertiajs/vue3'
import { Modal, message } from 'ant-design-vue'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  flight: Object,
})

const showRejectModal = ref(false)
const showCancelModal = ref(false)

const rejectForm = reactive({
  reason: '',
})

const cancelForm = reactive({
  reason: '',
})

const handleVerify = () => {
  Modal.confirm({
    title: 'Xác nhận',
    content: 'Bạn có chắc chắn muốn xác thực chuyến bay này?',
    onOk: () => {
      useForm({}).post(`/admin/flights/${props.flight.id}/verify`, {
        onSuccess: () => {
          message.success('Đã xác thực chuyến bay thành công')
        },
        onError: () => {
          message.error('Không thể xác thực chuyến bay')
        },
      })
    },
  })
}

const handleReject = () => {
  if (!rejectForm.reason) {
    message.error('Vui lòng nhập lý do từ chối')
    return
  }
  
  useForm(rejectForm).post(`/admin/flights/${props.flight.id}/reject`, {
    onSuccess: () => {
      message.success('Đã từ chối chuyến bay')
      showRejectModal.value = false
      rejectForm.reason = ''
    },
    onError: () => {
      message.error('Không thể từ chối chuyến bay')
    },
  })
}

const handleCancel = () => {
  if (!cancelForm.reason) {
    message.error('Vui lòng nhập lý do hủy')
    return
  }
  
  useForm(cancelForm).post(`/admin/flights/${props.flight.id}/cancel`, {
    onSuccess: () => {
      message.success('Đã hủy chuyến bay thành công')
      showCancelModal.value = false
      cancelForm.reason = ''
    },
    onError: () => {
      message.error('Không thể hủy chuyến bay')
    },
  })
}
</script>
