<template>
  <Head title="Tổng hợp File" />

  <PageHeader title="Tổng Hợp File" subtitle="Quản lý toàn bộ tài liệu và file đính kèm trong hệ thống">
    <template #actions>
      <a-button v-if="selectedIds.length" danger size="large" class="rounded-xl mr-2" @click="bulkDelete">
        <template #icon><DeleteOutlined /></template>
        Xóa {{ selectedIds.length }} file
      </a-button>
      <a-segmented v-model:value="viewMode" :options="viewModeOptions" size="large" />
    </template>
  </PageHeader>

  <!-- ═══ Stats ═══ -->
  <div class="crm-stats-grid">
    <StatCard :value="stats.totalFiles" label="Tổng file" :icon="FolderOutlined" variant="primary" />
    <StatCard :value="stats.totalSize" label="Tổng dung lượng" :icon="CloudOutlined" variant="success" format="text" />
    <StatCard :value="stats.imageCount" label="Hình ảnh" :icon="PictureOutlined" variant="warning" />
    <StatCard :value="stats.docCount" label="Tài liệu" :icon="FileTextOutlined" variant="accent" />
  </div>

  <!-- ═══ Charts Row ═══ -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <ChartCard title="File theo nguồn" subtitle="Phân bổ theo module" :height="260">
      <Doughnut :data="sourceChartData" :options="donutOpts" />
    </ChartCard>
    <ChartCard title="File theo loại" subtitle="Phân loại MIME" :height="260">
      <Bar :data="typeChartData" :options="horizontalBarOpts" />
    </ChartCard>
    <ChartCard title="Upload theo tháng" subtitle="6 tháng gần nhất" :height="260">
      <Bar :data="trendChartData" :options="verticalBarOpts" />
    </ChartCard>
  </div>

  <!-- ═══ Filters ═══ -->
  <div class="crm-content-card mb-6">
    <div class="crm-content-card__header" style="border-bottom: none; padding-bottom: 0;">
      <div class="flex flex-wrap items-center gap-3 w-full">
        <a-input-search
          v-model:value="localFilters.search" placeholder="Tìm tài liệu..." style="width: 250px;"
          size="large" allow-clear @search="applyFilters" @pressEnter="applyFilters"
        />
        <a-select v-model:value="localFilters.file_type" style="width: 150px;" size="large" @change="applyFilters" placeholder="Loại file">
          <a-select-option value="">Tất cả loại</a-select-option>
          <a-select-option value="image">Hình ảnh</a-select-option>
          <a-select-option value="document">Tài liệu</a-select-option>
          <a-select-option value="video">Video</a-select-option>
          <a-select-option value="audio">Âm thanh</a-select-option>
        </a-select>
        <a-select v-model:value="localFilters.source" style="width: 160px;" size="large" @change="applyFilters" placeholder="Nguồn">
          <a-select-option value="">Tất cả nguồn</a-select-option>
          <a-select-option value="project">Dự án</a-select-option>
          <a-select-option value="cost">Chi phí</a-select-option>
          <a-select-option value="contract">Hợp đồng</a-select-option>
          <a-select-option value="invoice">Hóa đơn</a-select-option>
          <a-select-option value="subcontractor">Nhà thầu phụ</a-select-option>
          <a-select-option value="defect">Lỗi/Sửa chữa</a-select-option>
          <a-select-option value="log">Nhật ký</a-select-option>
          <a-select-option value="acceptance">Nghiệm thu</a-select-option>
        </a-select>
        <a-select
          v-model:value="localFilters.uploaded_by" style="width: 180px;" size="large"
          @change="applyFilters" placeholder="Người upload" allow-clear show-search
          :filter-option="filterUsers" option-label-prop="label"
        >
          <a-select-option value="">Tất cả</a-select-option>
          <a-select-option v-for="u in uploaders" :key="u.id" :value="String(u.id)" :label="u.name">{{ u.name }}</a-select-option>
        </a-select>
      </div>
    </div>
  </div>

  <!-- ═══ Grid View ═══ -->
  <div v-if="viewMode === 'grid'" class="files-grid">
    <div
      v-for="file in files.data" :key="file.id"
      class="file-card" :class="{ 'file-card--selected': selectedIds.includes(file.id) }"
    >
      <!-- Checkbox -->
      <a-checkbox :checked="selectedIds.includes(file.id)" @change="toggleSelect(file.id)" class="file-card__check" />

      <!-- Preview area — clickable -->
      <div class="file-card__preview" :class="`file-card__preview--${file.file_type_icon}`" @click="openPreview(file)">
        <img
          v-if="file.file_type_icon === 'image' && (file.file_url || file.file_path)"
          :src="file.file_url || `/storage/${file.file_path}`" :alt="file.original_name"
          class="file-card__img" @error="(e) => e.target.style.display='none'"
        />
        <div v-else class="file-card__icon-wrap">
          <PictureOutlined v-if="file.file_type_icon === 'image'" class="file-card__type-icon" />
          <VideoCameraOutlined v-else-if="file.file_type_icon === 'video'" class="file-card__type-icon" />
          <FilePdfOutlined v-else-if="file.file_type_icon === 'pdf'" class="file-card__type-icon" />
          <FileExcelOutlined v-else-if="file.file_type_icon === 'excel'" class="file-card__type-icon" />
          <FileWordOutlined v-else-if="file.file_type_icon === 'word'" class="file-card__type-icon" />
          <FilePptOutlined v-else-if="file.file_type_icon === 'ppt'" class="file-card__type-icon" />
          <SoundOutlined v-else-if="file.file_type_icon === 'audio'" class="file-card__type-icon" />
          <FileOutlined v-else class="file-card__type-icon" />
        </div>
        <!-- Preview overlay -->
        <div class="file-card__preview-overlay">
          <EyeOutlined style="font-size: 22px;" />
          <span>Xem trước</span>
        </div>
      </div>

      <!-- Info -->
      <div class="file-card__body">
        <div class="file-card__name" :title="file.original_name">{{ file.original_name || file.file_name }}</div>
        <div class="file-card__meta">
          <a-tag :color="sourceColor(file.source_label)" class="text-xs rounded-lg">{{ file.source_label }}</a-tag>
          <span class="text-gray-400 text-xs">{{ file.human_size }}</span>
        </div>
        <div class="file-card__footer">
          <span class="text-gray-400 text-xs">{{ file.uploader?.name || '—' }}</span>
          <span class="text-gray-400 text-xs">{{ timeAgo(file.created_at) }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="file-card__actions">
        <a-tooltip title="Xem trước">
          <a-button type="text" size="small" shape="circle" @click.stop="openPreview(file)">
            <EyeOutlined />
          </a-button>
        </a-tooltip>
        <a-tooltip title="Tải về">
          <a-button type="text" size="small" shape="circle" @click.stop="downloadFile(file.id)">
            <DownloadOutlined />
          </a-button>
        </a-tooltip>
        <a-popconfirm title="Xóa file này?" ok-text="Xóa" cancel-text="Hủy" @confirm="deleteFile(file.id)">
          <a-button type="text" size="small" shape="circle" danger>
            <DeleteOutlined />
          </a-button>
        </a-popconfirm>
      </div>
    </div>
  </div>

  <!-- ═══ List View ═══ -->
  <div v-else class="crm-content-card">
    <a-table
      :columns="tableColumns" :data-source="files.data" :pagination="false"
      row-key="id" class="crm-table" :scroll="{ x: 1000 }"
      :row-selection="{ selectedRowKeys: selectedIds, onChange: (keys) => selectedIds = keys }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'original_name'">
          <div class="flex items-center gap-3 cursor-pointer" @click="openPreview(record)">
            <div class="file-list-icon" :class="`file-list-icon--${record.file_type_icon}`">
              <PictureOutlined v-if="record.file_type_icon === 'image'" />
              <VideoCameraOutlined v-else-if="record.file_type_icon === 'video'" />
              <FilePdfOutlined v-else-if="record.file_type_icon === 'pdf'" />
              <FileExcelOutlined v-else-if="record.file_type_icon === 'excel'" />
              <FileWordOutlined v-else-if="record.file_type_icon === 'word'" />
              <FileOutlined v-else />
            </div>
            <div>
              <div class="font-semibold text-gray-800 text-sm truncate hover:text-blue-600 transition-colors" style="max-width: 260px;">{{ record.original_name || record.file_name }}</div>
              <div class="text-xs text-gray-400">{{ record.mime_type }}</div>
            </div>
          </div>
        </template>
        <template v-if="column.dataIndex === 'source_label'">
          <a-tag :color="sourceColor(record.source_label)" class="text-xs rounded-lg">{{ record.source_label }}</a-tag>
          <div class="text-xs text-gray-400 mt-1 truncate" style="max-width: 140px;">{{ record.source_name }}</div>
        </template>
        <template v-if="column.dataIndex === 'human_size'">
          <span class="text-sm font-medium text-gray-600">{{ record.human_size }}</span>
        </template>
        <template v-if="column.dataIndex === 'uploader'">
          <span class="text-sm text-gray-600">{{ record.uploader?.name || '—' }}</span>
        </template>
        <template v-if="column.dataIndex === 'created_at'">
          <span class="text-sm text-gray-500">{{ timeAgo(record.created_at) }}</span>
        </template>
        <template v-if="column.dataIndex === 'actions'">
          <div class="flex gap-1">
            <a-tooltip title="Xem trước">
              <a-button type="text" size="small" @click="openPreview(record)"><EyeOutlined /></a-button>
            </a-tooltip>
            <a-tooltip title="Tải về">
              <a-button type="text" size="small" @click="downloadFile(record.id)"><DownloadOutlined /></a-button>
            </a-tooltip>
            <a-popconfirm title="Xóa file này?" ok-text="Xóa" cancel-text="Hủy" @confirm="deleteFile(record.id)">
              <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- Empty State -->
  <div v-if="!files.data?.length" class="text-center py-16">
    <FolderOpenOutlined style="font-size: 56px; color: #D1D5DB;" />
    <p class="mt-4 text-gray-400 text-base">Chưa có file nào trong hệ thống</p>
  </div>

  <!-- Pagination -->
  <div v-if="files.last_page > 1" class="flex justify-center mt-6 mb-4">
    <a-pagination
      :current="files.current_page" :total="files.total" :page-size="files.per_page"
      show-size-changer @change="(page) => router.visit(`/files?page=${page}&${buildQuery()}`)"
    />
  </div>

  <!-- ═══════════════════════════════════════════════
       PREVIEW MODAL
       ═══════════════════════════════════════════════ -->
  <a-modal
    v-model:open="previewVisible"
    :title="null"
    :footer="null"
    :width="previewWidth"
    wrap-class-name="preview-modal-wrap"
    centered
    destroy-on-close
  >
    <div v-if="previewFile" class="preview-modal">
      <!-- Header -->
      <div class="preview-modal__header">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="file-list-icon" :class="`file-list-icon--${previewFile.file_type_icon}`">
            <PictureOutlined v-if="previewFile.file_type_icon === 'image'" />
            <VideoCameraOutlined v-else-if="previewFile.file_type_icon === 'video'" />
            <FilePdfOutlined v-else-if="previewFile.file_type_icon === 'pdf'" />
            <FileExcelOutlined v-else-if="previewFile.file_type_icon === 'excel'" />
            <FileWordOutlined v-else-if="previewFile.file_type_icon === 'word'" />
            <SoundOutlined v-else-if="previewFile.file_type_icon === 'audio'" />
            <FileOutlined v-else />
          </div>
          <div class="min-w-0">
            <div class="font-bold text-gray-800 text-sm truncate">{{ previewFile.original_name || previewFile.file_name }}</div>
            <div class="text-xs text-gray-400 flex items-center gap-2">
              <span>{{ previewFile.human_size }}</span>
              <span>•</span>
              <a-tag :color="sourceColor(previewFile.source_label)" class="text-xs rounded-lg" style="margin:0;">{{ previewFile.source_label }}</a-tag>
              <span>•</span>
              <span>{{ previewFile.uploader?.name || '—' }}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <!-- Navigate prev/next -->
          <a-button type="text" size="small" :disabled="!canGoPrev" @click="previewPrev"><LeftOutlined /></a-button>
          <span class="text-xs text-gray-400">{{ previewIndex + 1 }} / {{ files.data.length }}</span>
          <a-button type="text" size="small" :disabled="!canGoNext" @click="previewNext"><RightOutlined /></a-button>
          <a-divider type="vertical" />
          <a-button type="primary" size="small" class="rounded-lg" @click="downloadFile(previewFile.id)">
            <template #icon><DownloadOutlined /></template>
            Tải về
          </a-button>
        </div>
      </div>

      <!-- Content -->
      <div class="preview-modal__body">
        <!-- Image -->
        <div v-if="isImage(previewFile)" class="preview-image-container">
          <img :src="getFileUrl(previewFile)" :alt="previewFile.original_name" class="preview-image" @error="previewError = true" />
          <div v-if="previewError" class="preview-fallback">
            <PictureOutlined style="font-size: 48px; color: #D1D5DB;" />
            <p class="text-gray-400 mt-2">Không thể tải hình ảnh</p>
          </div>
        </div>

        <!-- PDF -->
        <div v-else-if="isPdf(previewFile)" class="preview-pdf-container">
          <iframe :src="getFileUrl(previewFile)" class="preview-pdf" frameborder="0"></iframe>
        </div>

        <!-- Video -->
        <div v-else-if="isVideo(previewFile)" class="preview-video-container">
          <video controls autoplay :src="getFileUrl(previewFile)" class="preview-video">
            Trình duyệt không hỗ trợ video.
          </video>
        </div>

        <!-- Audio -->
        <div v-else-if="isAudio(previewFile)" class="preview-audio-container">
          <div class="preview-audio-visual">
            <div class="preview-audio-icon-bg">
              <SoundOutlined style="font-size: 48px; color: #F59E0B;" />
            </div>
            <div class="mt-4 font-semibold text-gray-700 text-center">{{ previewFile.original_name }}</div>
          </div>
          <audio controls autoplay :src="getFileUrl(previewFile)" class="preview-audio-player">
            Trình duyệt không hỗ trợ audio.
          </audio>
        </div>

        <!-- Unsupported -->
        <div v-else class="preview-unsupported">
          <div class="preview-unsupported__icon" :class="`file-list-icon--${previewFile.file_type_icon}`">
            <FileOutlined style="font-size: 48px;" />
          </div>
          <div class="mt-4 text-center">
            <div class="font-bold text-gray-700 text-lg">{{ previewFile.original_name }}</div>
            <div class="text-gray-400 text-sm mt-1 mb-4">Định dạng <b>{{ previewFile.mime_type }}</b> không hỗ trợ xem trước</div>
            <a-button type="primary" size="large" class="rounded-xl" @click="downloadFile(previewFile.id)">
              <template #icon><DownloadOutlined /></template>
              Tải về để xem
            </a-button>
          </div>
        </div>
      </div>

      <!-- Detail Info -->
      <div class="preview-modal__footer">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div class="text-gray-400 text-xs mb-0.5">Dung lượng</div>
            <div class="font-medium text-gray-700">{{ previewFile.human_size }}</div>
          </div>
          <div>
            <div class="text-gray-400 text-xs mb-0.5">Nguồn</div>
            <div class="font-medium text-gray-700">{{ previewFile.source_label }}</div>
          </div>
          <div>
            <div class="text-gray-400 text-xs mb-0.5">Thuộc về</div>
            <div class="font-medium text-gray-700 truncate" style="max-width: 180px;">{{ previewFile.source_name || '—' }}</div>
          </div>
          <div>
            <div class="text-gray-400 text-xs mb-0.5">Thời gian upload</div>
            <div class="font-medium text-gray-700">{{ timeAgo(previewFile.created_at) }}</div>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import { Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { Modal } from 'ant-design-vue'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import ChartCard from '@/Components/Crm/ChartCard.vue'
import { useChart, CHART_COLORS } from '@/Composables/useChart'
import {
  FolderOutlined, FolderOpenOutlined, CloudOutlined, PictureOutlined, FileTextOutlined,
  DeleteOutlined, DownloadOutlined, FileOutlined, FilePdfOutlined,
  FileExcelOutlined, FileWordOutlined, FilePptOutlined,
  VideoCameraOutlined, SoundOutlined, EyeOutlined,
  LeftOutlined, RightOutlined,
} from '@ant-design/icons-vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

defineOptions({ layout: CrmLayout })

const props = defineProps({
  files: Object,
  stats: Object,
  charts: Object,
  uploaders: Array,
  filters: Object,
})

const { doughnutOptions, barOptions, defaultOptions } = useChart()

const viewMode = ref('grid')
const viewModeOptions = [
  { value: 'grid', label: '🗂 Grid' },
  { value: 'list', label: '📋 List' },
]
const selectedIds = ref([])
const localFilters = reactive({ ...props.filters })

// ============================================================
// PREVIEW
// ============================================================
const previewVisible = ref(false)
const previewFile = ref(null)
const previewIndex = ref(0)
const previewError = ref(false)

const previewWidth = computed(() => {
  if (!previewFile.value) return 720
  if (isImage(previewFile.value)) return 900
  if (isPdf(previewFile.value)) return 960
  if (isVideo(previewFile.value)) return 860
  return 640
})

const canGoPrev = computed(() => previewIndex.value > 0)
const canGoNext = computed(() => previewIndex.value < (props.files?.data?.length || 0) - 1)

const openPreview = (file) => {
  const idx = props.files.data.findIndex(f => f.id === file.id)
  previewIndex.value = idx >= 0 ? idx : 0
  previewFile.value = file
  previewError.value = false
  previewVisible.value = true
}

const previewPrev = () => {
  if (!canGoPrev.value) return
  previewIndex.value--
  previewFile.value = props.files.data[previewIndex.value]
  previewError.value = false
}

const previewNext = () => {
  if (!canGoNext.value) return
  previewIndex.value++
  previewFile.value = props.files.data[previewIndex.value]
  previewError.value = false
}

// Keyboard navigation
const handleKeydown = (e) => {
  if (!previewVisible.value) return
  if (e.key === 'ArrowLeft') previewPrev()
  if (e.key === 'ArrowRight') previewNext()
  if (e.key === 'Escape') previewVisible.value = false
}

watch(previewVisible, (open) => {
  if (open) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})

const getFileUrl = (file) => {
  if (file.file_url) return file.file_url
  if (file.file_path) return `/storage/${file.file_path}`
  return ''
}

const isImage = (file) => file?.mime_type?.startsWith('image/')
const isPdf = (file) => file?.mime_type === 'application/pdf'
const isVideo = (file) => file?.mime_type?.startsWith('video/')
const isAudio = (file) => file?.mime_type?.startsWith('audio/')

// ============================================================
// FILTERS
// ============================================================
const buildQuery = () => {
  const params = new URLSearchParams()
  if (localFilters.search) params.set('search', localFilters.search)
  if (localFilters.file_type) params.set('file_type', localFilters.file_type)
  if (localFilters.source) params.set('source', localFilters.source)
  if (localFilters.uploaded_by) params.set('uploaded_by', localFilters.uploaded_by)
  return params.toString()
}

const applyFilters = () => {
  router.visit(`/files?${buildQuery()}`, { preserveState: true })
}

const filterUsers = (input, option) => {
  return option.label?.toLowerCase().includes(input.toLowerCase())
}

// ============================================================
// ACTIONS
// ============================================================
const toggleSelect = (id) => {
  const idx = selectedIds.value.indexOf(id)
  if (idx > -1) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

const downloadFile = (id) => {
  window.open(`/files/${id}/download`, '_blank')
}

const deleteFile = (id) => {
  router.delete(`/files/${id}`, { preserveScroll: true })
}

const bulkDelete = () => {
  Modal.confirm({
    title: `Xóa ${selectedIds.value.length} file?`,
    content: 'Hành động này không thể hoàn tác.',
    okText: 'Xóa',
    okType: 'danger',
    cancelText: 'Hủy',
    onOk: () => {
      router.post('/files/bulk-delete', { ids: selectedIds.value }, {
        preserveScroll: true,
        onSuccess: () => { selectedIds.value = [] },
      })
    },
  })
}

// ============================================================
// CHARTS
// ============================================================
const donutOpts = computed(() => ({
  ...doughnutOptions,
  cutout: '60%',
  plugins: { ...doughnutOptions.plugins, legend: { ...doughnutOptions.plugins.legend, position: 'bottom' } }
}))

const sourceChartData = computed(() => ({
  labels: props.charts?.bySource?.labels || [],
  datasets: [{
    data: props.charts?.bySource?.data || [],
    backgroundColor: CHART_COLORS.primary.slice(0, (props.charts?.bySource?.data || []).length),
    hoverOffset: 6,
  }]
}))

const horizontalBarOpts = computed(() => ({
  ...barOptions,
  plugins: { ...barOptions.plugins, legend: { display: false } }
}))

const typeChartData = computed(() => ({
  labels: props.charts?.byType?.labels || [],
  datasets: [{
    label: 'Số lượng',
    data: props.charts?.byType?.data || [],
    backgroundColor: CHART_COLORS.soft.slice(0, (props.charts?.byType?.data || []).length),
    borderColor: CHART_COLORS.primary.slice(0, (props.charts?.byType?.data || []).length),
    borderWidth: 1, borderRadius: 8,
  }]
}))

const verticalBarOpts = computed(() => ({
  ...defaultOptions,
  plugins: { ...defaultOptions.plugins, legend: { display: false } },
  scales: {
    ...defaultOptions.scales,
    y: { ...defaultOptions.scales.y, beginAtZero: true, ticks: { ...defaultOptions.scales.y.ticks, stepSize: 1, callback: (v) => Number.isInteger(v) ? v : '' } }
  }
}))

const trendChartData = computed(() => ({
  labels: props.charts?.uploadTrend?.labels || [],
  datasets: [{
    label: 'Files uploaded',
    data: props.charts?.uploadTrend?.data || [],
    backgroundColor: 'rgba(27, 79, 114, 0.75)',
    borderColor: '#1B4F72',
    borderWidth: 1, borderRadius: 10, barThickness: 32,
  }]
}))

// ============================================================
// TABLE
// ============================================================
const tableColumns = [
  { title: 'Tên file', dataIndex: 'original_name', key: 'original_name', width: 320 },
  { title: 'Nguồn', dataIndex: 'source_label', key: 'source_label', width: 160 },
  { title: 'Dung lượng', dataIndex: 'human_size', key: 'human_size', width: 110, align: 'right' },
  { title: 'Người upload', dataIndex: 'uploader', key: 'uploader', width: 140 },
  { title: 'Thời gian', dataIndex: 'created_at', key: 'created_at', width: 120 },
  { title: '', dataIndex: 'actions', key: 'actions', width: 120, fixed: 'right' },
]

// ============================================================
// HELPERS
// ============================================================
const sourceColor = (label) => {
  const map = { 'Dự án': 'blue', 'Chi phí': 'red', 'Hợp đồng': 'green', 'Hóa đơn': 'orange', 'Nhà thầu phụ': 'purple', 'Nhật ký': 'cyan', 'Nghiệm thu': 'gold', 'Thanh toán': 'lime' }
  return map[label] || 'default'
}

const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'Vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`
  return d.toLocaleDateString('vi-VN')
}
</script>

<style scoped>
/* ─── Files Grid ─── */
.files-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.file-card {
  position: relative;
  background: white;
  border-radius: 16px;
  border: 1px solid #E8ECF1;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
}
.file-card:hover {
  box-shadow: 0 8px 25px rgba(0,0,0,0.08);
  transform: translateY(-2px);
}
.file-card--selected {
  border-color: #1B4F72;
  box-shadow: 0 0 0 2px rgba(27, 79, 114, 0.15);
}

.file-card__check {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.2s;
}
.file-card:hover .file-card__check,
.file-card--selected .file-card__check { opacity: 1; }

/* Preview */
.file-card__preview {
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  cursor: pointer;
}
.file-card__preview--image { background: #F8FAFC; }
.file-card__preview--pdf { background: linear-gradient(135deg, #FEE2E2, #FEF2F2); }
.file-card__preview--excel { background: linear-gradient(135deg, #D1FAE5, #ECFDF5); }
.file-card__preview--word { background: linear-gradient(135deg, #DBEAFE, #EFF6FF); }
.file-card__preview--video { background: linear-gradient(135deg, #EDE9FE, #F5F3FF); }
.file-card__preview--ppt { background: linear-gradient(135deg, #FEE2E2, #FFF1F2); }
.file-card__preview--audio { background: linear-gradient(135deg, #FEF3C7, #FFFBEB); }
.file-card__preview--file { background: linear-gradient(135deg, #F3F4F6, #F9FAFB); }

.file-card__img { width: 100%; height: 100%; object-fit: cover; }
.file-card__icon-wrap { display: flex; align-items: center; justify-content: center; }
.file-card__type-icon { font-size: 36px; opacity: 0.6; }
.file-card__preview--pdf .file-card__type-icon { color: #EF4444; }
.file-card__preview--excel .file-card__type-icon { color: #10B981; }
.file-card__preview--word .file-card__type-icon { color: #3B82F6; }
.file-card__preview--video .file-card__type-icon { color: #8B5CF6; }
.file-card__preview--ppt .file-card__type-icon { color: #F59E0B; }
.file-card__preview--audio .file-card__type-icon { color: #F59E0B; }
.file-card__preview--image .file-card__type-icon { color: #06B6D4; }
.file-card__preview--file .file-card__type-icon { color: #9CA3AF; }

/* Preview Overlay */
.file-card__preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.25s ease;
  backdrop-filter: blur(2px);
}
.file-card__preview:hover .file-card__preview-overlay {
  opacity: 1;
}

/* Body */
.file-card__body { padding: 12px 14px; }
.file-card__name {
  font-weight: 600; font-size: 13px; color: #1F2937;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px;
}
.file-card__meta { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.file-card__footer { display: flex; align-items: center; justify-content: space-between; }

/* Actions */
.file-card__actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
  background: rgba(255,255,255,0.92);
  border-radius: 8px;
  padding: 2px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.file-card:hover .file-card__actions { opacity: 1; }

/* ─── List Icon ─── */
.file-list-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; font-size: 16px;
}
.file-list-icon--image { background: rgba(6, 182, 212, 0.1); color: #06B6D4; }
.file-list-icon--pdf { background: rgba(239, 68, 68, 0.1); color: #EF4444; }
.file-list-icon--excel { background: rgba(16, 185, 129, 0.1); color: #10B981; }
.file-list-icon--word { background: rgba(59, 130, 246, 0.1); color: #3B82F6; }
.file-list-icon--video { background: rgba(139, 92, 246, 0.1); color: #8B5CF6; }
.file-list-icon--audio { background: rgba(245, 158, 11, 0.1); color: #F59E0B; }
.file-list-icon--file { background: rgba(156, 163, 175, 0.1); color: #9CA3AF; }

/* ═══════════════════════════════════════════════
   PREVIEW MODAL
   ═══════════════════════════════════════════════ */
.preview-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  background: #F8FAFC;
  border-bottom: 1px solid #E8ECF1;
  border-radius: 12px 12px 0 0;
  margin: -24px -24px 0 -24px;
}

.preview-modal__body {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 0;
}

.preview-modal__footer {
  padding: 14px 20px;
  background: #F8FAFC;
  border-top: 1px solid #E8ECF1;
  border-radius: 0 0 12px 12px;
  margin: 0 -24px -24px -24px;
}

/* Image */
.preview-image-container {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
}
.preview-image {
  max-width: 100%;
  max-height: 65vh;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  object-fit: contain;
}
.preview-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

/* PDF */
.preview-pdf-container {
  width: 100%;
  height: 70vh;
}
.preview-pdf {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 1px solid #E8ECF1;
}

/* Video */
.preview-video-container {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview-video {
  max-width: 100%;
  max-height: 65vh;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
  background: #000;
}

/* Audio */
.preview-audio-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 40px 0;
}
.preview-audio-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.preview-audio-icon-bg {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #FEF3C7, #FFFBEB);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 20px rgba(245, 158, 11, 0.15);
  animation: pulse-glow 2s ease-in-out infinite;
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 4px 20px rgba(245, 158, 11, 0.15); }
  50% { box-shadow: 0 4px 30px rgba(245, 158, 11, 0.3); }
}
.preview-audio-player {
  width: 100%;
  max-width: 400px;
}

/* Unsupported */
.preview-unsupported {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
}
.preview-unsupported__icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(156, 163, 175, 0.1);
  color: #9CA3AF;
}
</style>

<style>
/* ─── Modal Overrides (unscoped) ─── */
.preview-modal-wrap .ant-modal-content {
  border-radius: 16px !important;
  overflow: hidden;
  padding: 24px !important;
}
.preview-modal-wrap .ant-modal-header {
  display: none !important;
}
.preview-modal-wrap .ant-modal-close {
  top: 26px !important;
  right: 26px !important;
}
</style>
