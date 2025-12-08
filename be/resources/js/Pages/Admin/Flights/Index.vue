<template>
  <div>
    <Head title="Quản lý Chuyến bay" />
    <a-typography-title :level="2" style="margin-bottom: 24px;">Quản lý Chuyến bay</a-typography-title>
    
    <a-card :bordered="false">
      <template #extra>
        <a-space>
          <a-input-search
            v-model:value="searchValue"
            placeholder="Tìm kiếm..."
            style="width: 300px"
            @search="handleSearch"
          />
          <a-select
            v-model:value="verifiedFilter"
            placeholder="Xác thực"
            style="width: 120px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option :value="true">Đã xác thực</a-select-option>
            <a-select-option :value="false">Chưa xác thực</a-select-option>
          </a-select>
          <a-select
            v-model:value="statusFilter"
            placeholder="Trạng thái"
            style="width: 120px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="pending">Chờ xác thực</a-select-option>
            <a-select-option value="verified">Đã xác thực</a-select-option>
            <a-select-option value="cancelled">Đã hủy</a-select-option>
            <a-select-option value="rejected">Đã từ chối</a-select-option>
          </a-select>
        </a-space>
      </template>

      <a-table
        :columns="columns"
        :data-source="flights.data"
        :pagination="{
          current: flights.current_page,
          pageSize: flights.per_page,
          total: flights.total,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} chuyến bay`,
        }"
        :row-key="record => record.id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'flight_number'">
            <Link :href="`/admin/flights/${record.id}`" style="color: #1890ff;">
              {{ record.flight_number }}
            </Link>
          </template>
          <template v-else-if="column.key === 'route'">
            {{ record.from_airport }} → {{ record.to_airport }}
          </template>
          <template v-else-if="column.key === 'verified'">
            <a-tag :color="record.verified ? 'success' : 'warning'">
              {{ record.verified ? 'Đã xác thực' : 'Chờ xác thực' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'weight'">
            {{ record.booked_weight }}/{{ record.max_weight }} kg
          </template>
          <template v-else-if="column.key === 'actions'">
            <a-space>
              <a-button
                v-if="!record.verified"
                type="link"
                size="small"
                @click="handleVerify(record.id)"
              >
                Xác thực
              </a-button>
              <Link :href="`/admin/flights/${record.id}`">
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
  flights: Object,
})

const searchValue = ref(props.filters.search || '')
const verifiedFilter = ref(props.filters.verified !== undefined ? props.filters.verified === 'true' : null)
const statusFilter = ref(props.filters.status || null)

const columns = [
  {
    title: 'Mã chuyến',
    key: 'flight_number',
    dataIndex: 'flight_number',
  },
  {
    title: 'Hành khách',
    dataIndex: ['customer', 'name'],
    key: 'customer',
  },
  {
    title: 'Tuyến đường',
    key: 'route',
  },
  {
    title: 'Ngày bay',
    dataIndex: 'flight_date',
    key: 'flight_date',
  },
  {
    title: 'Trạng thái',
    key: 'verified',
  },
  {
    title: 'Trọng lượng',
    key: 'weight',
  },
  {
    title: 'Thao tác',
    key: 'actions',
    width: 150,
  },
]

const handleSearch = () => {
  router.get('/admin/flights', {
    search: searchValue.value || undefined,
    verified: verifiedFilter.value !== null ? verifiedFilter.value : undefined,
    status: statusFilter.value || undefined,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}

const handleTableChange = (pagination) => {
  router.get('/admin/flights', {
    page: pagination.current,
    per_page: pagination.pageSize,
    search: searchValue.value || undefined,
    verified: verifiedFilter.value !== null ? verifiedFilter.value : undefined,
    status: statusFilter.value || undefined,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}

const handleVerify = (id) => {
  router.post(`/admin/flights/${id}/verify`, {}, {
    onSuccess: () => {
      message.success('Đã xác thực chuyến bay thành công')
    },
    onError: () => {
      message.error('Không thể xác thực chuyến bay')
    },
  })
}
</script>
