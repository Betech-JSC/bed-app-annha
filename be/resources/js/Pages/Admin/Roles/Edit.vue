<template>
  <div>
    <Head title="Chỉnh sửa Vai trò" />
    <a-space style="margin-bottom: 16px;">
      <a-button @click="router.visit('/admin/roles')">
        <template #icon><ArrowLeftOutlined /></template>
        Quay lại
      </a-button>
    </a-space>
    
    <a-typography-title :level="2">Chỉnh sửa Vai trò</a-typography-title>
    
    <a-card :bordered="false" style="margin-top: 24px; max-width: 800px;">
      <a-form :model="form" :rules="rules" @finish="handleSubmit" layout="vertical">
        <a-form-item label="Tên vai trò" name="name">
          <a-input v-model:value="form.name" placeholder="Nhập tên vai trò" />
        </a-form-item>
        
        <a-form-item label="Mô tả" name="description">
          <a-textarea
            v-model:value="form.description"
            :rows="3"
            placeholder="Nhập mô tả vai trò"
          />
        </a-form-item>
        
        <a-form-item label="Quyền">
          <a-checkbox-group v-model:value="form.permission_ids" style="width: 100%;">
            <a-row :gutter="[16, 16]">
              <a-col :span="12" v-for="perm in permissions" :key="perm.id">
                <a-checkbox :value="perm.id">
                  <div>
                    <div style="font-weight: 500;">{{ perm.name }}</div>
                    <div style="font-size: 12px; color: #666;">{{ perm.description || 'Không có mô tả' }}</div>
                  </div>
                </a-checkbox>
              </a-col>
            </a-row>
          </a-checkbox-group>
        </a-form-item>
        
        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit" :loading="submitting">
              Cập nhật
            </a-button>
            <a-button @click="router.visit('/admin/roles')">
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
  role: Object,
  permissions: Array,
  admin: Object,
})

const submitting = ref(false)

const form = reactive({
  name: props.role.name,
  description: props.role.description || '',
  permission_ids: props.role.permission_ids || [],
})

const rules = {
  name: [{ required: true, message: 'Vui lòng nhập tên vai trò' }],
}

const handleSubmit = () => {
  submitting.value = true
  router.put(`/admin/roles/${props.role.id}`, form, {
    onSuccess: () => {
      message.success('Đã cập nhật vai trò thành công')
      router.visit('/admin/roles')
    },
    onError: () => {
      message.error('Có lỗi xảy ra khi cập nhật vai trò')
      submitting.value = false
    },
  })
}
</script>

