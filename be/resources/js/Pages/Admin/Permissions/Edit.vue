<template>
  <div>
    <Head title="Chỉnh sửa Quyền" />
    <a-space style="margin-bottom: 16px;">
      <a-button @click="router.visit('/admin/permissions')">
        <template #icon><ArrowLeftOutlined /></template>
        Quay lại
      </a-button>
    </a-space>
    
    <a-typography-title :level="2">Chỉnh sửa Quyền</a-typography-title>
    
    <a-card :bordered="false" style="margin-top: 24px; max-width: 600px;">
      <a-form :model="form" :rules="rules" @finish="handleSubmit" layout="vertical">
        <a-form-item label="Tên quyền" name="name">
          <a-input v-model:value="form.name" placeholder="Ví dụ: users.view, orders.edit" />
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
              Cập nhật
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
  permission: Object,
  admin: Object,
})

const submitting = ref(false)

const form = reactive({
  name: props.permission.name,
  description: props.permission.description || '',
})

const rules = {
  name: [{ required: true, message: 'Vui lòng nhập tên quyền' }],
}

const handleSubmit = () => {
  submitting.value = true
  router.put(`/admin/permissions/${props.permission.id}`, form, {
    onSuccess: () => {
      message.success('Đã cập nhật quyền thành công')
      router.visit('/admin/permissions')
    },
    onError: () => {
      message.error('Có lỗi xảy ra khi cập nhật quyền')
      submitting.value = false
    },
  })
}
</script>

