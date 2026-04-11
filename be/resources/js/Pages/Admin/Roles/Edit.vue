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
        
        <a-form-item label="Phân quyền (Tích chọn các quyền cho vai trò này)">
          <div style="margin-bottom: 16px;">
            <a-input-search
              v-model:value="searchQuery"
              placeholder="Tìm kiếm quyền hoặc mô tả..."
              allow-clear
            />
          </div>

          <a-collapse v-model:activeKey="activeKeys" ghost expand-icon-position="right">
            <a-collapse-panel v-for="group in filteredGroups" :key="group.module">
              <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding-right: 24px;">
                  <span style="font-weight: 600; font-size: 15px;">
                    {{ group.module_name }} 
                    <a-tag color="blue" style="margin-left: 8px;">{{ group.permissions.length }} quyền</a-tag>
                  </span>
                  <a-checkbox 
                    :checked="isModuleAllSelected(group)"
                    :indeterminate="isModuleIndeterminate(group)"
                    @click.stop
                    @change="(e) => toggleModulePermissions(group, e.target.checked)"
                  >
                    Chọn tất cả
                  </a-checkbox>
                </div>
              </template>

              <a-checkbox-group v-model:value="form.permission_ids" style="width: 100%;">
                <a-row :gutter="[16, 16]">
                  <a-col :span="12" v-for="perm in group.permissions" :key="perm.id">
                    <a-checkbox :value="perm.id">
                      <div>
                        <div style="font-weight: 500;">{{ perm.name }}</div>
                        <div style="font-size: 12px; color: #666;">{{ perm.description }}</div>
                      </div>
                    </a-checkbox>
                  </a-col>
                </a-row>
              </a-checkbox-group>
            </a-collapse-panel>
          </a-collapse>
          
          <div v-if="filteredGroups.length === 0" style="text-align: center; padding: 40px; color: #999;">
            <Empty description="Không tìm thấy quyền nào khớp với từ khóa" />
          </div>
        </a-form-item>
        
        <a-form-item>
          <a-space>
            <a-button type="primary" size="large" html-type="submit" :loading="submitting">
              Cập nhật
            </a-button>
            <a-button size="large" @click="router.visit('/admin/roles')">
              Hủy
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'
import { message, Empty } from 'ant-design-vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  role: Object,
  permissions: Array,
  groupedPermissions: Array,
  admin: Object,
})

const submitting = ref(false)
const searchQuery = ref('')
const activeKeys = ref(props.groupedPermissions.map(g => g.module))

const form = reactive({
  name: props.role.name,
  description: props.role.description || '',
  permission_ids: props.role.permission_ids || [],
})

const rules = {
  name: [{ required: true, message: 'Vui lòng nhập tên vai trò' }],
}

// Filter permissions based on search query
const filteredGroups = computed(() => {
  if (!searchQuery.value) return props.groupedPermissions

  const query = searchQuery.value.toLowerCase()
  return props.groupedPermissions.map(group => {
    const filteredPerms = group.permissions.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.description && p.description.toLowerCase().includes(query))
    )
    if (filteredPerms.length > 0) {
      return { ...group, permissions: filteredPerms }
    }
    return null
  }).filter(Boolean)
})

// Check if all permissions in a module are selected
const isModuleAllSelected = (group) => {
  const permIds = group.permissions.map(p => p.id)
  return permIds.length > 0 && permIds.every(id => form.permission_ids.includes(id))
}

// Check if some (but not all) permissions in a module are selected
const isModuleIndeterminate = (group) => {
  const permIds = group.permissions.map(p => p.id)
  const selectedCount = permIds.filter(id => form.permission_ids.includes(id)).length
  return selectedCount > 0 && selectedCount < permIds.length
}

// Toggle all permissions in a module
const toggleModulePermissions = (group, checked) => {
  const permIds = group.permissions.map(p => p.id)
  if (checked) {
    // Add missing IDs
    const newIds = [...form.permission_ids]
    permIds.forEach(id => {
      if (!newIds.includes(id)) newIds.push(id)
    })
    form.permission_ids = newIds
  } else {
    // Remove IDs
    form.permission_ids = form.permission_ids.filter(id => !permIds.includes(id))
  }
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

