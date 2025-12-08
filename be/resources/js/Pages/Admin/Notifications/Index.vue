<template>
  <div>
    <Head title="Quản lý Thông báo" />
    <a-space style="margin-bottom: 16px;">
      <a-typography-title :level="2" style="margin: 0;">Quản lý Thông báo</a-typography-title>
      <a-button type="primary" @click="router.visit('/admin/notifications/create')">
        <template #icon><PlusOutlined /></template>
        Gửi thông báo hệ thống
      </a-button>
    </a-space>
    
    <a-card :bordered="false">
      <template #extra>
        <a-space>
          <a-input-search
            v-model:value="searchValue"
            placeholder="Tìm kiếm"
            style="width: 300px"
            @search="handleSearch"
          />
          <a-select
            v-model:value="typeFilter"
            placeholder="Loại"
            style="width: 120px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="info">Thông tin</a-select-option>
            <a-select-option value="warning">Cảnh báo</a-select-option>
            <a-select-option value="error">Lỗi</a-select-option>
            <a-select-option value="success">Thành công</a-select-option>
          </a-select>
        </a-space>
      </template>

      <a-table
        :columns="columns"
        :data-source="notifications.data"
        :pagination="{
          current: notifications.current_page,
          pageSize: notifications.per_page,
          total: notifications.total,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} thông báo`,
        }"
        :row-key="record => record.id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === 'read' ? 'green' : 'orange'">
              {{ record.status === 'read' ? 'Đã đọc' : 'Chưa đọc' }}
            </a-tag>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'
import { PlusOutlined } from '@ant-design/icons-vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  notifications: Object,
  filters: Object,
  admin: Object,
})

const searchValue = ref(props.filters?.search || '')
const typeFilter = ref(props.filters?.type || null)

const columns = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: 'Người nhận',
    key: 'user',
    width: 200,
    customRender: ({ record }) => record.user ? `${record.user.name} (${record.user.email})` : 'Tất cả',
  },
  {
    title: 'Tiêu đề',
    dataIndex: 'title',
    key: 'title',
  },
  {
    title: 'Nội dung',
    dataIndex: 'message',
    key: 'message',
    ellipsis: true,
  },
  {
    title: 'Trạng thái',
    key: 'status',
    width: 120,
  },
  {
    title: 'Ngày gửi',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 150,
  },
]

const handleSearch = () => {
  router.get('/admin/notifications', {
    search: searchValue.value,
    type: typeFilter.value,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}

const handleTableChange = (pagination) => {
  router.get('/admin/notifications', {
    ...props.filters,
    page: pagination.current,
    per_page: pagination.pageSize,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}
</script>

