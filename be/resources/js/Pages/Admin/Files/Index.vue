<template>
  <div>
    <Head title="Quản lý File" />
    <a-typography-title :level="2" style="margin-bottom: 24px;">Quản lý File</a-typography-title>
    
    <!-- Thống kê -->
    <a-row :gutter="16" style="margin-bottom: 24px;">
      <a-col :span="6">
        <a-statistic title="Tổng số file" :value="stats.total" />
      </a-col>
      <a-col :span="6">
        <a-statistic title="Ảnh" :value="stats.images" />
      </a-col>
      <a-col :span="6">
        <a-statistic title="Video" :value="stats.videos" />
      </a-col>
      <a-col :span="6">
        <a-statistic title="Tài liệu" :value="stats.documents" />
      </a-col>
    </a-row>
    
    <a-card :bordered="false">
      <template #extra>
        <a-space>
          <a-input-search
            v-model:value="searchValue"
            placeholder="Tìm kiếm theo tên file"
            style="width: 300px"
            @search="handleSearch"
          />
          <a-select
            v-model:value="typeFilter"
            placeholder="Loại file"
            style="width: 150px"
            allow-clear
            @change="handleSearch"
          >
            <a-select-option value="image">Ảnh</a-select-option>
            <a-select-option value="video">Video</a-select-option>
            <a-select-option value="document">Tài liệu</a-select-option>
          </a-select>
        </a-space>
      </template>

      <a-table
        :columns="columns"
        :data-source="files.data"
        :pagination="{
          current: files.current_page,
          pageSize: files.per_page,
          total: files.total,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} file`,
        }"
        :row-key="record => record.id"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'preview'">
            <a-image
              v-if="record.type === 'image'"
              :src="record.file_url"
              :width="50"
              :height="50"
              :preview="false"
              style="object-fit: cover; border-radius: 4px;"
            />
            <span v-else>-</span>
          </template>
          <template v-if="column.key === 'file_size'">
            {{ formatFileSize(record.file_size) }}
          </template>
          <template v-if="column.key === 'type'">
            <a-tag :color="getTypeColor(record.type)">
              {{ getTypeLabel(record.type) }}
            </a-tag>
          </template>
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="handleDownload(record.id)">
                Tải xuống
              </a-button>
              <a-popconfirm
                title="Bạn có chắc muốn xóa file này?"
                @confirm="handleDelete(record.id)"
              >
                <a-button type="link" danger size="small">
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
import { ref } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import AdminLayoutAntd from '@/Shared/AdminLayoutAntd.vue'
import { message } from 'ant-design-vue'

defineOptions({
  layout: AdminLayoutAntd,
})

const props = defineProps({
  files: Object,
  filters: Object,
  stats: Object,
  admin: Object,
})

const searchValue = ref(props.filters?.search || '')
const typeFilter = ref(props.filters?.type || null)

const columns = [
  {
    title: 'Preview',
    key: 'preview',
    width: 80,
  },
  {
    title: 'Tên file',
    dataIndex: 'original_name',
    key: 'original_name',
  },
  {
    title: 'Loại',
    key: 'type',
    width: 100,
  },
  {
    title: 'Kích thước',
    key: 'file_size',
    width: 120,
  },
  {
    title: 'Người upload',
    key: 'uploader',
    width: 150,
    customRender: ({ record }) => record.uploader?.name || 'N/A',
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
  router.get('/admin/files', {
    search: searchValue.value,
    type: typeFilter.value,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}

const handleTableChange = (pagination) => {
  router.get('/admin/files', {
    ...props.filters,
    page: pagination.current,
    per_page: pagination.pageSize,
  }, {
    preserveState: true,
    preserveScroll: true,
  })
}

const handleDownload = (id) => {
  window.open(`/admin/files/${id}/download`, '_blank')
}

const handleDelete = (id) => {
  router.delete(`/admin/files/${id}`, {
    onSuccess: () => {
      message.success('Đã xóa file thành công')
    },
    onError: () => {
      message.error('Không thể xóa file')
    },
  })
}

const getTypeColor = (type) => {
  const colors = {
    image: 'blue',
    video: 'purple',
    document: 'green',
  }
  return colors[type] || 'default'
}

const getTypeLabel = (type) => {
  const labels = {
    image: 'Ảnh',
    video: 'Video',
    document: 'Tài liệu',
  }
  return labels[type] || type
}

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}
</script>

