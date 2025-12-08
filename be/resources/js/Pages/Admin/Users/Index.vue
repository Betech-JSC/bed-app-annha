<template>
  <div>
    <Head title="Quản lý Người dùng" />
    <a-typography-title :level="2" style="margin-bottom: 24px;">Quản lý Người dùng</a-typography-title>
    
    <a-card :bordered="false">
      <template #extra>
        <a-space>
          <a-input-search
            v-model:value="searchValue"
            placeholder="Tìm kiếm theo tên, email, số điện thoại"
            style="width: 300px"
            @search="handleSearch"
            @pressEnter="handleSearch"
          />
          <a-select
            v-model:value="roleFilter"
            placeholder="Vai trò"
            style="width: 120px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="sender">Sender</a-select-option>
            <a-select-option value="customer">Customer</a-select-option>
          </a-select>
          <a-select
            v-model:value="statusFilter"
            placeholder="Trạng thái"
            style="width: 120px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="active">Hoạt động</a-select-option>
            <a-select-option value="banned">Đã khóa</a-select-option>
          </a-select>
        </a-space>
      </template>

      <a-table
        :columns="columns"
        :data-source="users.data"
        :pagination="{
          current: users.current_page,
          pageSize: users.per_page,
          total: users.total,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} người dùng`,
        }"
        :row-key="record => record.id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <Link :href="`/admin/users/${record.id}`" style="color: #1890ff;">
              {{ record.name }}
              <a-tag v-if="record.is_banned" color="error" style="margin-left: 8px;">Đã khóa</a-tag>
            </Link>
          </template>
          <template v-else-if="column.key === 'role'">
            <a-tag :color="record.role === 'sender' ? 'blue' : 'green'">
              {{ record.role === 'sender' ? 'Sender' : 'Customer' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'wallet_balance'">
            {{ formatCurrency(record.wallet_balance) }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :color="record.is_banned ? 'error' : 'success'">
              {{ record.is_banned ? 'Đã khóa' : 'Hoạt động' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button
                v-if="record.is_banned"
                type="link"
                size="small"
                @click="handleUnban(record.id)"
              >
                Mở khóa
              </a-button>
              <a-button
                v-else
                type="link"
                danger
                size="small"
                @click="handleBan(record.id)"
              >
                Khóa
              </a-button>
              <Link :href="`/admin/users/${record.id}`">
                <a-button type="link" size="small">Chi tiết</a-button>
              </Link>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Head, Link, router } from '@inertiajs/vue3'
import { message } from 'ant-design-vue'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  filters: Object,
  users: Object,
})

const searchValue = ref(props.filters.search || '')
const roleFilter = ref(props.filters.role || null)
const statusFilter = ref(props.filters.status || null)

const columns = [
  {
    title: 'Tên',
    key: 'name',
    dataIndex: 'name',
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: 'Số điện thoại',
    dataIndex: 'phone',
    key: 'phone',
  },
  {
    title: 'Vai trò',
    key: 'role',
  },
  {
    title: 'Số dư ví',
    key: 'wallet_balance',
  },
  {
    title: 'Trạng thái',
    key: 'status',
  },
  {
    title: 'Thao tác',
    key: 'actions',
    width: 200,
  },
]

const handleSearch = () => {
  router.get('/admin/users', {
    search: searchValue.value || undefined,
    role: roleFilter.value || undefined,
    status: statusFilter.value || undefined,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}

const handleTableChange = (pagination) => {
  router.get('/admin/users', {
    page: pagination.current,
    per_page: pagination.pageSize,
    search: searchValue.value || undefined,
    role: roleFilter.value || undefined,
    status: statusFilter.value || undefined,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}

const handleBan = (id) => {
  router.post(`/admin/users/${id}/ban`, {}, {
    onSuccess: () => {
      message.success('Đã khóa tài khoản thành công')
    },
    onError: () => {
      message.error('Không thể khóa tài khoản')
    },
  })
}

const handleUnban = (id) => {
  router.post(`/admin/users/${id}/unban`, {}, {
    onSuccess: () => {
      message.success('Đã mở khóa tài khoản thành công')
    },
    onError: () => {
      message.error('Không thể mở khóa tài khoản')
    },
  })
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value || 0)
}
</script>
