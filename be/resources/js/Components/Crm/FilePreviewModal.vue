<template>
  <a-modal
    :open="open"
    @update:open="$emit('update:open', $event)"
    :title="null"
    :width="1050"
    :footer="null"
    centered
    destroy-on-close
    class="crm-modal file-preview-modal"
    :body-style="{ padding: 0 }"
    @cancel="handleClose"
  >
    <div v-if="targetFile" class="file-preview-container flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl">
      <!-- Header bar -->
      <div class="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base font-bold shadow-md" :style="{ background: extColor }">
            <template v-if="isImage">🖼️</template>
            <template v-else-if="isPdf">PDF</template>
            <template v-else-if="isExcel">XLS</template>
            <template v-else-if="isWord">DOC</template>
            <template v-else-if="isPpt">PPT</template>
            <template v-else>{{ extUpper.slice(0, 3) }}</template>
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-bold text-gray-800 truncate" :title="fileName">{{ fileName }}</div>
            <div class="text-[11px] text-gray-400 flex items-center gap-2 mt-0.5">
              <span class="font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 uppercase">{{ extUpper }}</span>
              <span v-if="fileSizeStr">• {{ fileSizeStr }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-shrink-0">
          <a-button v-if="isImage" size="small" @click="zoomed = !zoomed">
            <template #icon><ZoomInOutlined v-if="!zoomed" /><ZoomOutOutlined v-else /></template>
            {{ zoomed ? 'Thu nhỏ' : 'Phóng to' }}
          </a-button>

          <a v-if="fileUrl" :href="fileUrl" target="_blank" download class="no-underline">
            <a-button size="small" type="primary" class="bg-blue-600 border-none shadow-sm">
              <template #icon><DownloadOutlined /></template> Tải xuống
            </a-button>
          </a>

          <a v-if="fileUrl && !isRawFile" :href="fileUrl" target="_blank" class="no-underline">
            <a-button size="small">
              <template #icon><LinkOutlined /></template> Mở tab mới
            </a-button>
          </a>
        </div>
      </div>

      <!-- Content area -->
      <div class="file-preview-body relative min-h-[60vh] max-h-[80vh] overflow-auto bg-gray-50 flex items-center justify-center">
        <!-- Image Preview -->
        <template v-if="isImage">
          <div class="flex items-center justify-center p-6 w-full h-full min-h-[60vh] bg-gray-900/10">
            <img
              :src="fileUrl"
              :alt="fileName"
              class="max-w-full max-h-[70vh] rounded-xl shadow-xl object-contain transition-all duration-300 cursor-pointer"
              :class="{ 'scale-150': zoomed }"
              @click="zoomed = !zoomed"
            />
          </div>
        </template>

        <!-- PDF Preview -->
        <template v-else-if="isPdf">
          <iframe
            :src="fileUrl + '#toolbar=1'"
            class="w-full border-0"
            style="height: 75vh;"
          />
        </template>

        <!-- Video Preview -->
        <template v-else-if="isVideo">
          <div class="flex items-center justify-center p-6 bg-black w-full min-h-[60vh]">
            <video controls autoplay :src="fileUrl" class="max-w-full max-h-[70vh] rounded-xl shadow-xl">
              Trình duyệt không hỗ trợ xem video này.
            </video>
          </div>
        </template>

        <!-- Text / CSV / Log / Code Preview -->
        <template v-else-if="isText">
          <div class="p-6 w-full max-h-[75vh] overflow-auto">
            <div v-if="loadingText" class="p-8 text-center text-gray-400">Đang đọc nội dung...</div>
            <pre v-else class="p-4 bg-white text-gray-800 font-mono text-xs rounded-xl border border-gray-200 shadow-sm select-text whitespace-pre-wrap word-break-all">{{ textContent }}</pre>
          </div>
        </template>

        <!-- Office Viewer (Word / Excel / PowerPoint) -->
        <template v-else-if="isOffice">
          <div class="flex flex-col w-full h-full">
            <!-- Header bar for Office mode selection if external URL -->
            <div v-if="isPublicUrl" class="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100 text-xs">
              <div class="flex items-center gap-2">
                <span class="text-gray-500 font-medium">Trình xem trực tuyến:</span>
                <a-radio-group v-model:value="officeViewerType" size="small" button-style="solid">
                  <a-radio-button value="microsoft">Microsoft Office</a-radio-button>
                  <a-radio-button value="google">Google Docs</a-radio-button>
                </a-radio-group>
              </div>
            </div>

            <!-- Online Iframe Viewer for Public URLs -->
            <iframe
              v-if="isPublicUrl"
              :src="officeViewerType === 'google' ? googleDocsViewerUrl : msOfficeViewerUrl"
              class="w-full border-0"
              style="height: 72vh;"
            />

            <!-- Fallback for Localhost / Local Files -->
            <div v-else class="flex flex-col items-center justify-center py-16 px-8 text-center bg-white min-h-[55vh]">
              <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center mb-4 shadow-sm border border-blue-200">
                <FileExcelOutlined v-if="isExcel" class="text-4xl text-emerald-600" />
                <FileWordOutlined v-else-if="isWord" class="text-4xl text-blue-600" />
                <FilePptOutlined v-else-if="isPpt" class="text-4xl text-orange-600" />
                <FileTextOutlined v-else class="text-4xl text-gray-500" />
              </div>
              <div class="text-base font-bold text-gray-800 mb-1 max-w-lg truncate">{{ fileName }}</div>
              <div class="text-xs text-gray-500 mb-6 max-w-md leading-relaxed">
                Tài liệu <strong>.{{ extUpper }}</strong> cần được tải về máy để mở bằng ứng dụng tương ứng (Microsoft Word, Excel, PowerPoint...)
              </div>
              <a :href="fileUrl" target="_blank" download class="no-underline">
                <a-button type="primary" size="large" class="px-8 rounded-xl bg-blue-600 border-none shadow-md">
                  <template #icon><DownloadOutlined /></template> Tải xuống tệp gốc
                </a-button>
              </a>
            </div>
          </div>
        </template>

        <!-- Unsupported File Fallback -->
        <template v-else>
          <div class="flex flex-col items-center justify-center py-16 px-8 text-center bg-white min-h-[50vh]">
            <div class="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4 border border-gray-200">
              <FileOutlined class="text-4xl text-gray-400" />
            </div>
            <div class="text-base font-bold text-gray-800 mb-1 max-w-lg truncate">{{ fileName }}</div>
            <div class="text-xs text-gray-400 mb-6">Định dạng .{{ extUpper }} • {{ fileSizeStr }}</div>
            <a :href="fileUrl" target="_blank" download class="no-underline">
              <a-button type="primary" size="large" class="px-8 rounded-xl">
                <template #icon><DownloadOutlined /></template> Tải xuống tệp
              </a-button>
            </a>
          </div>
        </template>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import {
  DownloadOutlined, LinkOutlined, ZoomInOutlined, ZoomOutOutlined,
  FileTextOutlined, FileExcelOutlined, FileWordOutlined, FilePptOutlined, FileOutlined
} from '@ant-design/icons-vue'

const props = defineProps({
  open: Boolean,
  file: [Object, File, Array],
})

const emit = defineEmits(['update:open'])

const zoomed = ref(false)
const officeViewerType = ref('microsoft')
const textContent = ref('')
const loadingText = ref(false)
const localCreatedUrl = ref(null)

const handleClose = () => {
  emit('update:open', false)
}

// Target file item if array or object
const targetFile = computed(() => {
  if (!props.file) return null
  if (Array.isArray(props.file)) return props.file[0] || null
  return props.file
})

const isRawFile = computed(() => targetFile.value instanceof File || targetFile.value?.originFileObj instanceof File)

const fileName = computed(() => {
  if (!targetFile.value) return 'File'
  if (targetFile.value instanceof File) return targetFile.value.name
  if (targetFile.value.originFileObj instanceof File) return targetFile.value.originFileObj.name
  return targetFile.value.original_name || targetFile.value.file_name || targetFile.value.name || 'File'
})

const fileUrl = computed(() => {
  if (!targetFile.value) return ''
  
  if (targetFile.value instanceof File) {
    if (!localCreatedUrl.value) {
      localCreatedUrl.value = URL.createObjectURL(targetFile.value)
    }
    return localCreatedUrl.value
  }
  if (targetFile.value.originFileObj instanceof File) {
    if (!localCreatedUrl.value) {
      localCreatedUrl.value = URL.createObjectURL(targetFile.value.originFileObj)
    }
    return localCreatedUrl.value
  }
  
  const url = targetFile.value.file_url || targetFile.value.url || (targetFile.value.file_path ? `/storage/${targetFile.value.file_path}` : '')
  if (url && !url.startsWith('http') && !url.startsWith('/')) {
    return '/' + url
  }
  return url
})

const fileExtension = computed(() => {
  const name = fileName.value || ''
  const parts = name.split('.')
  if (parts.length > 1) return parts.pop().toLowerCase()
  
  const mime = targetFile.value?.mime_type || targetFile.value?.type || ''
  if (mime.includes('image/png')) return 'png'
  if (mime.includes('image/jpeg')) return 'jpg'
  if (mime.includes('image/gif')) return 'gif'
  if (mime.includes('image/webp')) return 'webp'
  if (mime.includes('pdf')) return 'pdf'
  if (mime.includes('sheet') || mime.includes('excel')) return 'xlsx'
  if (mime.includes('word') || mime.includes('document')) return 'docx'
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'pptx'
  
  return 'file'
})

const extUpper = computed(() => fileExtension.value.toUpperCase())

const extColor = computed(() => {
  const ext = fileExtension.value
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) return 'linear-gradient(135deg, #3B82F6, #1D4ED8)'
  if (ext === 'pdf') return 'linear-gradient(135deg, #EF4444, #B91C1C)'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'linear-gradient(135deg, #10B981, #047857)'
  if (['docx', 'doc'].includes(ext)) return 'linear-gradient(135deg, #2563EB, #1E40AF)'
  if (['pptx', 'ppt'].includes(ext)) return 'linear-gradient(135deg, #F97316, #C2410C)'
  return 'linear-gradient(135deg, #6B7280, #374151)'
})

const fileSizeStr = computed(() => {
  const bytes = targetFile.value?.size || targetFile.value?.file_size
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
})

const isImage = computed(() => {
  const ext = fileExtension.value
  const mime = targetFile.value?.mime_type || targetFile.value?.type || ''
  return ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext) || mime.startsWith('image/')
})

const isPdf = computed(() => {
  const ext = fileExtension.value
  const mime = targetFile.value?.mime_type || targetFile.value?.type || ''
  return ext === 'pdf' || mime.includes('pdf')
})

const isVideo = computed(() => {
  const ext = fileExtension.value
  const mime = targetFile.value?.mime_type || targetFile.value?.type || ''
  return ['mp4', 'webm', 'mov', 'avi'].includes(ext) || mime.startsWith('video/')
})

const isExcel = computed(() => ['xlsx', 'xls', 'csv'].includes(fileExtension.value))
const isWord = computed(() => ['docx', 'doc'].includes(fileExtension.value))
const isPpt = computed(() => ['pptx', 'ppt'].includes(fileExtension.value))
const isOffice = computed(() => isExcel.value || isWord.value || isPpt.value)

const isText = computed(() => {
  const ext = fileExtension.value
  return ['txt', 'log', 'json', 'xml', 'md'].includes(ext)
})

const isPublicUrl = computed(() => {
  const url = fileUrl.value
  return (url.startsWith('http://') || url.startsWith('https://'))
    && !url.includes('localhost') && !url.includes('127.0.0.1')
})

const msOfficeViewerUrl = computed(() => {
  const fullUrl = window.location.origin + fileUrl.value
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fullUrl)}`
})

const googleDocsViewerUrl = computed(() => {
  const fullUrl = window.location.origin + fileUrl.value
  return `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`
})

// Read text file content if text
watch(() => props.open, (isOpen) => {
  if (!isOpen) {
    if (localCreatedUrl.value) {
      URL.revokeObjectURL(localCreatedUrl.value)
      localCreatedUrl.value = null
    }
    return
  }

  zoomed.value = false

  if (isText.value && fileUrl.value) {
    loadingText.value = true
    fetch(fileUrl.value)
      .then(res => res.text())
      .then(txt => {
        textContent.value = txt.slice(0, 50000)
        loadingText.value = false
      })
      .catch(() => {
        textContent.value = 'Không thể đọc nội dung file văn bản.'
        loadingText.value = false
      })
  }
})

onUnmounted(() => {
  if (localCreatedUrl.value) {
    URL.revokeObjectURL(localCreatedUrl.value)
  }
})
</script>
