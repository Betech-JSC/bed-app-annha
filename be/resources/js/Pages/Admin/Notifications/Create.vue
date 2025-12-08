<template>
  <div>
    <Head title="Gửi thông báo hệ thống" />
    <a-space style="margin-bottom: 16px;">
      <a-button @click="router.visit('/admin/notifications')">
        <template #icon><ArrowLeftOutlined /></template>
        Quay lại
      </a-button>
    </a-space>
    
    <a-typography-title :level="2">Gửi thông báo hệ thống</a-typography-title>
    
    <a-card :bordered="false" style="margin-top: 24px; max-width: 800px;">
      <a-form :model="form" :rules="rules" @finish="handleSubmit" layout="vertical">
        <a-form-item label="Tiêu đề" name="title">
          <a-input v-model:value="form.title" placeholder="Nhập tiêu đề thông báo" />
        </a-form-item>
        
        <a-form-item label="Nội dung" name="message">
          <a-textarea
            v-model:value="form.message"
            :rows="4"
            placeholder="Nhập nội dung thông báo"
          />
        </a-form-item>
        
        <a-form-item label="Loại thông báo" name="type">
          <a-select v-model:value="form.type" placeholder="Chọn loại">
            <a-select-option value="info">Thông tin</a-select-option>
            <a-select-option value="warning">Cảnh báo</a-select-option>
            <a-select-option value="error">Lỗi</a-select-option>
            <a-select-option value="success">Thành công</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="Gửi đến">
          <a-select
            v-model:value="form.user_ids"
            mode="multiple"
            placeholder="Chọn người dùng (để trống = gửi tất cả)"
            :options="userOptions"
            :filter-option="filterOption"
            show-search
            allow-clear
          />
        </a-form-item>
        
        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit" :loading="submitting">
              Gửi thông báo
            </a-button>
            <a-button @click="router.visit('/admin/notifications')">
              Hủy
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  users: Array,
  admin: Object,
})

const submitting = ref(false)

const form = reactive({
  title: '',
  message: '',
  type: 'info',
  user_ids: [],
})

const rules = {
  title: [{ required: true, message: 'Vui lòng nhập tiêu đề' }],
  message: [{ required: true, message: 'Vui lòng nhập nội dung' }],
}

const userOptions = props.users.map(user => ({
  label: `${user.name} (${user.email}) - ${user.role}`,
  value: user.id,
}))

const filterOption = (input, option) => {
  return option.label.toLowerCase().includes(input.toLowerCase())
}

const handleSubmit = () => {
  submitting.value = true
  router.post('/admin/notifications/broadcast', form, {
    onSuccess: () => {
      message.success('Đã gửi thông báo thành công')
      router.visit('/admin/notifications')
    },
    onError: () => {
      message.error('Có lỗi xảy ra khi gửi thông báo')
      submitting.value = false
    },
  })
}
</script>

