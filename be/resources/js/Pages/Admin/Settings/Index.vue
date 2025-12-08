<template>
  <div>
    <Head title="Cấu hình Hệ thống" />
    <a-typography-title :level="2" style="margin-bottom: 24px;">Cấu hình Hệ thống</a-typography-title>
    
    <a-card :bordered="false">
      <a-form :model="form" @finish="handleSubmit" layout="vertical">
        <a-tabs v-model:activeKey="activeTab">
          <a-tab-pane v-for="(group, groupName) in settings" :key="groupName" :tab="getGroupLabel(groupName)">
            <a-row :gutter="16">
              <a-col :span="12" v-for="setting in group" :key="setting.id">
                <a-form-item :label="setting.key" :name="`settings.${setting.key}`">
                  <a-input
                    v-if="setting.type === 'string'"
                    v-model:value="form.settings[setting.key]"
                    :placeholder="setting.description"
                  />
                  <a-input-number
                    v-else-if="setting.type === 'integer' || setting.type === 'float'"
                    v-model:value="form.settings[setting.key]"
                    :placeholder="setting.description"
                    style="width: 100%"
                  />
                  <a-switch
                    v-else-if="setting.type === 'boolean'"
                    v-model:checked="form.settings[setting.key]"
                  />
                  <a-textarea
                    v-else-if="setting.type === 'json'"
                    v-model:value="form.settings[setting.key]"
                    :rows="3"
                    :placeholder="setting.description"
                  />
                  <div v-if="setting.description" style="font-size: 12px; color: #666; margin-top: 4px;">
                    {{ setting.description }}
                  </div>
                </a-form-item>
              </a-col>
            </a-row>
          </a-tab-pane>
        </a-tabs>
        
        <a-form-item style="margin-top: 24px;">
          <a-space>
            <a-button type="primary" html-type="submit" :loading="submitting">
              Lưu cấu hình
            </a-button>
            <a-button @click="resetForm">
              Đặt lại
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'
import { message } from 'ant-design-vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  settings: Object,
  admin: Object,
})

const activeTab = ref('general')
const submitting = ref(false)

const form = reactive({
  settings: {},
})

onMounted(() => {
  // Initialize form with current settings
  Object.values(props.settings).flat().forEach(setting => {
    if (setting.type === 'json') {
      form.settings[setting.key] = setting.value ? JSON.stringify(setting.value) : ''
    } else if (setting.type === 'boolean') {
      form.settings[setting.key] = setting.value === '1' || setting.value === 'true'
    } else {
      form.settings[setting.key] = setting.value || ''
    }
  })
})

const getGroupLabel = (groupName) => {
  const labels = {
    general: 'Chung',
    payment: 'Thanh toán',
    system: 'Hệ thống',
    notification: 'Thông báo',
  }
  return labels[groupName] || groupName
}

const handleSubmit = () => {
  submitting.value = true
  router.put('/admin/settings', form, {
    onSuccess: () => {
      message.success('Đã cập nhật cấu hình thành công')
      submitting.value = false
    },
    onError: () => {
      message.error('Có lỗi xảy ra')
      submitting.value = false
    },
  })
}

const resetForm = () => {
  router.reload({ only: ['settings'] })
}
</script>

