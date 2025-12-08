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
        
        <a-card title="Quyền" :bordered="false" style="margin-top: 16px;">
          <a-list :data-source="role.permissions" size="small">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta>
                  <template #title>{{ item.name }}</template>
                  <template #description>{{ item.description || 'Không có mô tả' }}</template>
                </a-list-item-meta>
              </a-list-item>
            </template>
            <template #empty>
              <a-empty description="Chưa có quyền nào" />
            </template>
          </a-list>
        </a-card>
      </a-col>
      
      <a-col :span="8">
        <a-card title="Admins có vai trò này" :bordered="false">
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
        
        <a-card title="Users có vai trò này" :bordered="false" style="margin-top: 16px;">
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
import { Head, router } from '@inertiajs/vue3'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'
import { ArrowLeftOutlined } from '@ant-design/icons-vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  role: Object,
  allPermissions: Array,
  admin: Object,
})
</script>

