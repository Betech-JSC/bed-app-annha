<template>
  <div>
    <Head title="Quản lý Quyền" />
    <a-space style="margin-bottom: 16px;">
      <a-typography-title :level="2" style="margin: 0;">Quản lý Quyền</a-typography-title>
      <a-button type="primary" @click="router.visit('/admin/permissions/create')">
        <template #icon><PlusOutlined /></template>
        Tạo quyền mới
      </a-button>
      <a-button @click="router.visit('/admin/permissions/admin-roles')">
        Phân quyền cho Admin
      </a-button>
    </a-space>
    
    <a-card :bordered="false">
      <a-table
        :columns="columns"
        :data-source="permissions"
        :pagination="false"
        :row-key="record => record.id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="editPermission(record.id)">
                Sửa
              </a-button>
              <a-popconfirm
                title="Bạn có chắc muốn xóa quyền này?"
                ok-text="Xóa"
                cancel-text="Hủy"
                @confirm="handleDelete(record.id)"
              >
                <a-button type="link" danger size="small" :disabled="record.roles_count > 0">
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
    title: 'Tên quyền',
    dataIndex: 'name',
    key: 'name',
    width: 200,
  },
  {
    title: 'Mô tả',
    dataIndex: 'description',
    key: 'description',
  },
  {
    title: 'Số roles sử dụng',
    dataIndex: 'roles_count',
    key: 'roles_count',
    width: 150,
  },
  {
    title: 'Ngày tạo',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 150,
  },
  {
    title: 'Thao tác',
    key: 'actions',
    width: 150,
    fixed: 'right',
  },
]

const editPermission = (id) => {
  router.visit(`/admin/permissions/${id}/edit`)
}

const handleDelete = (id) => {
  router.delete(`/admin/permissions/${id}`, {
    onSuccess: () => {
      message.success('Đã xóa quyền thành công')
    },
    onError: () => {
      message.error('Không thể xóa quyền đang được sử dụng')
    },
  })
}
</script>
