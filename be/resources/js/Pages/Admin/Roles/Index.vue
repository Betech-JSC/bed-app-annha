<template>
  <div>
    <Head title="Quản lý Vai trò" />
    <a-space style="margin-bottom: 16px;">
      <a-typography-title :level="2" style="margin: 0;">Quản lý Vai trò</a-typography-title>
      <a-button type="primary" @click="router.visit('/admin/roles/create')">
        <template #icon><PlusOutlined /></template>
        Tạo vai trò mới
      </a-button>
    </a-space>
    
    <a-card :bordered="false">
      <a-table
        :columns="columns"
        :data-source="roles"
        :pagination="false"
        :row-key="record => record.id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'permissions'">
            <a-space wrap>
              <a-tag v-for="perm in record.permissions" :key="perm.id" color="blue">
                {{ perm.name }}
              </a-tag>
              <span v-if="record.permissions.length === 0" style="color: #999;">Chưa có quyền</span>
            </a-space>
          </template>
          <template v-if="column.key === 'stats'">
            <div>
              <div>Admins: {{ record.admins_count }}</div>
              <div>Users: {{ record.users_count }}</div>
              <div>Permissions: {{ record.permissions_count }}</div>
            </div>
          </template>
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="viewDetail(record.id)">
                Chi tiết
              </a-button>
              <a-button type="link" size="small" @click="editRole(record.id)">
                Sửa
              </a-button>
              <a-popconfirm
                title="Bạn có chắc muốn xóa vai trò này?"
                ok-text="Xóa"
                cancel-text="Hủy"
                @confirm="handleDelete(record.id)"
              >
                <a-button type="link" danger size="small" :disabled="record.admins_count > 0 || record.users_count > 0">
                  Xóa
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { Head, router } from '@inertiajs/vue3'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  roles: Array,
  permissions: Array,
  admin: Object,
})

const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: 'Tên vai trò',
    dataIndex: 'name',
    key: 'name',
    width: 150,
  },
  {
    title: 'Mô tả',
    dataIndex: 'description',
    key: 'description',
  },
  {
    title: 'Quyền',
    key: 'permissions',
    width: 300,
  },
  {
    title: 'Thống kê',
    key: 'stats',
    width: 150,
  },
  {
    title: 'Thao tác',
    key: 'actions',
    width: 200,
    fixed: 'right',
  },
]

const viewDetail = (id) => {
  router.visit(`/admin/roles/${id}`)
}

const editRole = (id) => {
  router.visit(`/admin/roles/${id}/edit`)
}

const handleDelete = (id) => {
  router.delete(`/admin/roles/${id}`, {
    onSuccess: () => {
      message.success('Đã xóa vai trò thành công')
    },
    onError: () => {
      message.error('Không thể xóa vai trò đang được sử dụng')
    },
  })
}
</script>

