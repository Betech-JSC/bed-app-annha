<template>
  <div>
    <Head title="Quản lý Yêu cầu" />
    <a-typography-title :level="2" style="margin-bottom: 24px;">Quản lý Yêu cầu</a-typography-title>
    
    <a-card :bordered="false">
      <template #extra>
        <a-space>
          <a-input-search
            v-model:value="searchValue"
            placeholder="Tìm kiếm theo UUID, mô tả, sender"
            style="width: 300px"
            @search="handleSearch"
          />
          <a-select
            v-model:value="statusFilter"
            placeholder="Trạng thái"
            style="width: 150px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="pending">Đang chờ</a-select-option>
            <a-select-option value="accepted">Đã chấp nhận</a-select-option>
            <a-select-option value="confirmed">Đã xác nhận</a-select-option>
            <a-select-option value="expired">Hết hạn</a-select-option>
            <a-select-option value="declined">Từ chối</a-select-option>
          </a-select>
          <a-select
            v-model:value="priorityFilter"
            placeholder="Ưu tiên"
            style="width: 120px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="urgent">Gấp</a-select-option>
            <a-select-option value="priority">Ưu tiên</a-select-option>
            <a-select-option value="normal">Thường</a-select-option>
          </a-select>
        </a-space>
      </template>

      <a-table
        :columns="columns"
        :data-source="requests.data"
        :pagination="{
          current: requests.current_page,
          pageSize: requests.per_page,
          total: requests.total,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} yêu cầu`,
        }"
        :row-key="record => record.id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">
              {{ getStatusLabel(record.status) }}
            </a-tag>
          </template>
          <template v-if="column.key === 'priority'">
            <a-tag :color="getPriorityColor(record.priority_level)">
              {{ record.priority_label }}
            </a-tag>
          </template>
          <template v-if="column.key === 'reward'">
            {{ formatCurrency(record.reward) }}
          </template>
          <template v-if="column.key === 'expired'">
            <a-tag :color="record.is_expired ? 'red' : 'green'">
              {{ record.is_expired ? 'Hết hạn' : 'Còn hiệu lực' }}
            </a-tag>
          </template>
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="viewDetail(record.id)">
                Chi tiết
              </a-button>
              <a-popconfirm
                title="Bạn có chắc muốn xóa yêu cầu này?"
                ok-text="Xóa"
                cancel-text="Hủy"
                @confirm="handleDelete(record.id)"
              >
                <a-button type="link" danger size="small" :disabled="record.has_order">
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
import { ref, reactive } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'
import { message } from 'ant-design-vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  requests: Object,
  filters: Object,
  admin: Object,
})

const searchValue = ref(props.filters?.search || '')
const statusFilter = ref(props.filters?.status || null)
const priorityFilter = ref(props.filters?.priority_level || null)

const columns = [
  {
    title: 'UUID',
    dataIndex: 'uuid',
    key: 'uuid',
    width: 200,
  },
  {
    title: 'Người gửi',
    key: 'sender',
    width: 150,
    customRender: ({ record }) => record.sender?.name || 'N/A',
  },
  {
    title: 'Chuyến bay',
    key: 'flight',
    width: 150,
    customRender: ({ record }) => {
      if (!record.flight) return 'N/A'
      return `${record.flight.from_airport} → ${record.flight.to_airport}`
    },
  },
  {
    title: 'Trạng thái',
    key: 'status',
    width: 120,
  },
  {
    title: 'Ưu tiên',
    key: 'priority',
    width: 100,
  },
  {
    title: 'Phần thưởng',
    key: 'reward',
    width: 120,
  },
  {
    title: 'Hết hạn',
    key: 'expired',
    width: 120,
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

const handleSearch = () => {
  router.get('/admin/requests', {
    search: searchValue.value,
    status: statusFilter.value,
    priority_level: priorityFilter.value,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}

const handleTableChange = (pagination) => {
  router.get('/admin/requests', {
    ...props.filters,
    page: pagination.current,
    per_page: pagination.pageSize,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}

const viewDetail = (id) => {
  router.visit(`/admin/requests/${id}`)
}

const handleDelete = (id) => {
  router.delete(`/admin/requests/${id}`, {
    onSuccess: () => {
      message.success('Đã xóa yêu cầu thành công')
    },
    onError: () => {
      message.error('Không thể xóa yêu cầu này')
    },
  })
}

const getStatusColor = (status) => {
  const colors = {
    pending: 'orange',
    accepted: 'blue',
    confirmed: 'green',
    expired: 'red',
    declined: 'default',
  }
  return colors[status] || 'default'
}

const getStatusLabel = (status) => {
  const labels = {
    pending: 'Đang chờ',
    accepted: 'Đã chấp nhận',
    confirmed: 'Đã xác nhận',
    expired: 'Hết hạn',
    declined: 'Từ chối',
  }
  return labels[status] || status
}

const getPriorityColor = (priority) => {
  const colors = {
    urgent: 'red',
    priority: 'orange',
    normal: 'default',
  }
  return colors[priority] || 'default'
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount || 0)
}
</script>

