<template>
  <div>
    <Head title="Quản lý Đánh giá & Khiếu nại" />
    <a-typography-title :level="2" style="margin-bottom: 24px;">Quản lý Đánh giá & Khiếu nại</a-typography-title>
    
    <a-card :bordered="false">
      <template #extra>
        <a-space>
          <a-input-search
            v-model:value="searchValue"
            placeholder="Tìm kiếm theo mã đơn, tên người dùng"
            style="width: 300px"
            @search="handleSearch"
          />
          <a-select
            v-model:value="ratingFilter"
            placeholder="Đánh giá tối thiểu"
            style="width: 150px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option :value="5">5 sao</a-select-option>
            <a-select-option :value="4">4 sao trở lên</a-select-option>
            <a-select-option :value="3">3 sao trở lên</a-select-option>
            <a-select-option :value="2">2 sao trở lên</a-select-option>
            <a-select-option :value="1">1 sao trở lên</a-select-option>
          </a-select>
        </a-space>
      </template>

      <a-table
        :columns="columns"
        :data-source="reviews.data"
        :pagination="{
          current: reviews.current_page,
          pageSize: reviews.per_page,
          total: reviews.total,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} đánh giá`,
        }"
        :row-key="record => record.id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sender_rating'">
            <div v-if="record.sender_rating">
              <a-rate :value="record.sender_rating" disabled />
              <div style="margin-top: 4px; font-size: 12px; color: #666;">
                {{ record.sender_review || 'Không có nhận xét' }}
              </div>
            </div>
            <span v-else>-</span>
          </template>
          <template v-if="column.key === 'customer_rating'">
            <div v-if="record.customer_rating">
              <a-rate :value="record.customer_rating" disabled />
              <div style="margin-top: 4px; font-size: 12px; color: #666;">
                {{ record.customer_review || 'Không có nhận xét' }}
              </div>
            </div>
            <span v-else>-</span>
          </template>
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-popconfirm
                v-if="record.sender_rating"
                title="Xóa đánh giá của sender?"
                @confirm="handleDelete(record.id, 'sender')"
              >
                <a-button type="link" danger size="small">Xóa đánh giá Sender</a-button>
              </a-popconfirm>
              <a-popconfirm
                v-if="record.customer_rating"
                title="Xóa đánh giá của customer?"
                @confirm="handleDelete(record.id, 'customer')"
              >
                <a-button type="link" danger size="small">Xóa đánh giá Customer</a-button>
              </a-popconfirm>
            </a-space>
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
import { message } from 'ant-design-vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  reviews: Object,
  filters: Object,
  admin: Object,
})

const searchValue = ref(props.filters?.search || '')
const ratingFilter = ref(props.filters?.min_rating || null)

const columns = [
  {
    title: 'Mã đơn',
    dataIndex: 'tracking_code',
    key: 'tracking_code',
    width: 150,
  },
  {
    title: 'Sender',
    key: 'sender',
    width: 150,
    customRender: ({ record }) => record.sender?.name || 'N/A',
  },
  {
    title: 'Customer',
    key: 'customer',
    width: 150,
    customRender: ({ record }) => record.customer?.name || 'N/A',
  },
  {
    title: 'Đánh giá Sender',
    key: 'sender_rating',
    width: 250,
  },
  {
    title: 'Đánh giá Customer',
    key: 'customer_rating',
    width: 250,
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
    width: 200,
    fixed: 'right',
  },
]

const handleSearch = () => {
  router.get('/admin/reviews', {
    search: searchValue.value,
    min_rating: ratingFilter.value,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}

const handleTableChange = (pagination) => {
  router.get('/admin/reviews', {
    ...props.filters,
    page: pagination.current,
    per_page: pagination.pageSize,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}

const handleDelete = (id, type) => {
  router.delete(`/admin/reviews/${id}`, {
    data: { type },
    onSuccess: () => {
      message.success('Đã xóa đánh giá thành công')
    },
    onError: () => {
      message.error('Không thể xóa đánh giá')
    },
  })
}
</script>

