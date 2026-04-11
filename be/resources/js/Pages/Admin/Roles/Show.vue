<template>
  <div>
    <Head :title="`Chi tiết Vai trò: ${role.name}`" />
    <a-space style="margin-bottom: 16px;">
      <a-button @click="router.visit('/admin/roles')">
        <template #icon><ArrowLeftOutlined /></template>
        Quay lại
      </a-button>
      <a-button type="primary" @click="router.visit(`/admin/roles/${role.id}/edit`)">
        Chỉnh sửa
      </a-button>
    </a-space>
    
    <a-typography-title :level="2">Chi tiết Vai trò</a-typography-title>
    
    <a-row :gutter="16" style="margin-top: 24px;">
      <a-col :span="16">
        <a-card title="Thông tin Vai trò" :bordered="false">
          <a-descriptions :column="1" bordered>
            <a-descriptions-item label="Tên vai trò">{{ role.name }}</a-descriptions-item>
            <a-descriptions-item label="Mô tả">{{ role.description || 'Không có mô tả' }}</a-descriptions-item>
            <a-descriptions-item label="Ngày tạo">{{ role.created_at }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
        
        <a-card title="Quyền đã gán" :bordered="false" style="margin-top: 16px;">
          <a-collapse ghost expand-icon-position="right">
            <a-collapse-panel v-for="group in roleGroupedPermissions" :key="group.module">
              <template #header>
                <span style="font-weight: 600;">{{ group.module_name }}</span>
                <a-tag color="green" style="margin-left: 8px;">{{ group.permissions.length }} quyền</a-tag>
              </template>
              <a-list :data-source="group.permissions" size="small">
                <template #renderItem="{ item }">
                  <a-list-item>
                    <a-list-item-meta>
                      <template #title>{{ item.name }}</template>
                      <template #description>{{ item.description || 'Không có mô tả' }}</template>
                    </a-list-item-meta>
                  </a-list-item>
                </template>
              </a-list>
            </a-collapse-panel>
          </a-collapse>
          
          <div v-if="roleGroupedPermissions.length === 0" style="padding: 24px; text-align: center; color: #999;">
            <a-empty description="Chưa có quyền nào được gán cho vai trò này" />
          </div>
        </a-card>
      </a-col>
      
      <a-col :span="8">
        <a-card title="Nhân viên (Admin)" :bordered="false">
          <a-list :data-source="role.admins" size="small">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta>
                  <template #title>{{ item.name }}</template>
                  <template #description>{{ item.email }}</template>
                </a-list-item-meta>
              </a-list-item>
            </template>
            <template #empty>
              <a-empty description="Chưa có admin nào" />
            </template>
          </a-list>
        </a-card>
        
        <a-card title="Người dùng (User)" :bordered="false" style="margin-top: 16px;">
          <a-list :data-source="role.users" size="small">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta>
                  <template #title>{{ item.name }}</template>
                  <template #description>{{ item.email }}</template>
                </a-list-item-meta>
              </a-list-item>
            </template>
            <template #empty>
              <a-empty description="Chưa có user nào" />
            </template>
          </a-list>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  role: Object,
  groupedPermissions: Array,
  admin: Object,
})

// Only show modules and permissions that the role actually has
const roleGroupedPermissions = computed(() => {
  const rolePermNames = props.role.permissions.map(p => p.name)
  
  return props.groupedPermissions.map(group => {
    const filteredPerms = group.permissions.filter(p => rolePermNames.includes(p.name))
    if (filteredPerms.length > 0) {
      return { ...group, permissions: filteredPerms }
    }
    return null
  }).filter(Boolean)
})
</script>

