<template>
  <div>
    <Head title="Tạo Quyền mới" />
    <a-space style="margin-bottom: 16px;">
      <a-button @click="router.visit('/admin/permissions')">
        <template #icon><ArrowLeftOutlined /></template>
        Quay lại
      </a-button>
    </a-space>
    
    <a-typography-title :level="2">Tạo Quyền mới</a-typography-title>
    
    <a-card :bordered="false" style="margin-top: 24px; max-width: 600px;">
      <a-form :model="form" :rules="rules" @finish="handleSubmit" layout="vertical">
        <a-form-item label="Tên quyền" name="name">
          <a-input v-model:value="form.name" placeholder="Ví dụ: users.view, orders.edit" />
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            Định dạng: module.action (ví dụ: users.view, orders.edit)
          </div>
        </a-form-item>
        
        <a-form-item label="Mô tả" name="description">
          <a-textarea
            v-model:value="form.description"
            :rows="3"
            placeholder="Nhập mô tả quyền"
          />
        </a-form-item>
        
        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit" :loading="submitting">
              Tạo quyền
            </a-button>
            <a-button @click="router.visit('/admin/permissions')">
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
  admin: Object,
})

const submitting = ref(false)

const form = reactive({
  name: '',
  description: '',
})

const rules = {
  name: [{ required: true, message: 'Vui lòng nhập tên quyền' }],
}

const handleSubmit = () => {
  submitting.value = true
  router.post('/admin/permissions', form, {
    onSuccess: () => {
      message.success('Đã tạo quyền thành công')
      router.visit('/admin/permissions')
    },
    onError: () => {
      message.error('Có lỗi xảy ra khi tạo quyền')
      submitting.value = false
    },
  })
}
</script>

