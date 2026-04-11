<template>
  <Head title="Bộ tài liệu Nghiệm thu" />

  <PageHeader
    title="Bộ tài liệu Nghiệm thu"
    subtitle="Quản lý các mẫu tài liệu, tiêu chí nghiệm thu theo hạng mục công trình"
  >
    <template #actions>
      <a-button type="primary" size="large" class="rounded-xl shadow-lg" @click="openCreate">
        <template #icon><PlusOutlined /></template>
        Thêm bộ tài liệu
      </a-button>
    </template>
  </PageHeader>

  <!-- Stats -->
  <div class="at-stats">
    <div v-for="s in statsList" :key="s.label" class="at-stats__card">
      <div class="at-stats__icon" :style="{ background: s.bg, color: s.color }">
        <component :is="s.icon" />
      </div>
      <div>
        <div class="at-stats__value">{{ s.value }}</div>
        <div class="at-stats__label">{{ s.label }}</div>
      </div>
    </div>
  </div>

  <!-- Template Grid -->
  <div class="at-grid">
    <div
      v-for="tpl in templates"
      :key="tpl.id"
      class="at-card"
      :class="{ 'at-card--inactive': !tpl.is_active }"
    >
      <!-- Header -->
      <div class="at-card__header">
        <div class="at-card__header-left">
          <div class="at-card__number">#{{ tpl.order || tpl.id }}</div>
          <a-tag v-if="tpl.is_active" color="green" class="rounded-lg">Đang dùng</a-tag>
          <a-tag v-else color="default" class="rounded-lg">Tạm ngưng</a-tag>
        </div>
        <a-dropdown>
          <a-button type="text" size="small" class="text-gray-400">
            <template #icon><MoreOutlined /></template>
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item @click="openEdit(tpl)">
                <EditOutlined class="mr-2" /> Chỉnh sửa
              </a-menu-item>
              <a-menu-item @click="toggleActive(tpl)">
                <SwapOutlined class="mr-2" />
                {{ tpl.is_active ? 'Vô hiệu hóa' : 'Kích hoạt' }}
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item danger @click="confirmDelete(tpl)">
                <DeleteOutlined class="mr-2" /> Xóa
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>

      <!-- Body -->
      <div class="at-card__body" @click="openDetail(tpl)">
        <h3 class="at-card__title">{{ tpl.name }}</h3>
        <p class="at-card__desc">{{ tpl.description || 'Chưa có mô tả' }}</p>

        <div v-if="tpl.standard" class="at-card__standard">
          <SafetyCertificateOutlined class="text-blue-500" />
          <span>{{ tpl.standard }}</span>
        </div>
      </div>

      <!-- Footer stats -->
      <div class="at-card__footer">
        <div class="at-card__stat">
          <CheckSquareOutlined />
          <span>{{ tpl.criteria_count }} tiêu chí</span>
        </div>
        <div class="at-card__stat">
          <PictureOutlined />
          <span>{{ tpl.images_count }} ảnh</span>
        </div>
        <div class="at-card__stat">
          <FileTextOutlined />
          <span>{{ tpl.documents_count }} file</span>
        </div>
      </div>
    </div>

    <!-- Add card -->
    <div class="at-card at-card--add" @click="openCreate">
      <PlusOutlined style="font-size: 32px; color: #D1D5DB;" />
      <span class="text-gray-400 font-semibold mt-2">Thêm bộ tài liệu mới</span>
    </div>
  </div>

  <!-- Empty state -->
  <div v-if="templates.length === 0" class="at-empty">
    <div class="at-empty__icon">
      <FileProtectOutlined />
    </div>
    <h3>Chưa có bộ tài liệu nghiệm thu</h3>
    <p>Tạo bộ tài liệu đầu tiên để sử dụng cho nghiệm thu công trình</p>
    <a-button type="primary" size="large" class="rounded-xl mt-4" @click="openCreate">
      <template #icon><PlusOutlined /></template>
      Tạo bộ tài liệu
    </a-button>
  </div>

  <!-- ─── CREATE/EDIT MODAL ─── -->
  <a-modal
    :open="modalVisible"
    :title="editingId ? 'Chỉnh sửa bộ tài liệu' : 'Thêm bộ tài liệu nghiệm thu'"
    :width="720"
    :confirm-loading="formLoading"
    @cancel="closeModal"
    @ok="handleSubmit"
    ok-text="Lưu"
    cancel-text="Hủy"
    class="at-modal"
  >
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="16">
          <a-form-item label="Tên bộ tài liệu" required>
            <a-input
              v-model:value="form.name"
              size="large"
              placeholder="VD: Nghiệm thu phần móng"
              class="rounded-xl"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Thứ tự">
            <a-input-number
              v-model:value="form.order"
              size="large"
              :min="0"
              style="width: 100%"
              class="rounded-xl"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="Tiêu chuẩn áp dụng">
        <a-input
          v-model:value="form.standard"
          size="large"
          placeholder="VD: TCVN 9362:2012, TCXD 79:1980"
          class="rounded-xl"
        />
      </a-form-item>

      <a-form-item label="Mô tả">
        <a-textarea
          v-model:value="form.description"
          :rows="3"
          placeholder="Mô tả chi tiết về bộ tài liệu nghiệm thu này..."
          class="rounded-xl"
          :maxlength="2000"
          show-count
        />
      </a-form-item>

      <a-form-item label="Trạng thái">
        <a-switch v-model:checked="form.is_active" checked-children="Đang dùng" un-checked-children="Tạm ngưng" />
      </a-form-item>

      <!-- Criteria Section -->
      <a-divider>
        <CheckSquareOutlined class="mr-1" /> Tiêu chí nghiệm thu
      </a-divider>

      <div class="at-criteria-list">
        <div v-for="(c, idx) in form.criteria" :key="idx" class="at-criteria-item">
          <div class="at-criteria-item__main">
            <a-input
              v-model:value="c.name"
              placeholder="Tên tiêu chí"
              size="large"
              class="rounded-xl"
            />
            <a-input
              v-model:value="c.description"
              placeholder="Mô tả (tuỳ chọn)"
              size="small"
              class="rounded-lg mt-1"
            />
          </div>
          <div class="at-criteria-item__actions">
            <a-tooltip :title="c.is_critical ? 'Tiêu chí BẮT BUỘC' : 'Tiêu chí tham khảo'">
              <a-tag
                :color="c.is_critical ? 'red' : 'default'"
                class="cursor-pointer rounded-lg"
                @click="c.is_critical = !c.is_critical"
              >
                {{ c.is_critical ? 'Bắt buộc' : 'Tham khảo' }}
              </a-tag>
            </a-tooltip>
            <a-button type="text" danger size="small" @click="removeCriterion(idx)">
              <template #icon><DeleteOutlined /></template>
            </a-button>
          </div>
        </div>
      </div>

      <a-button type="dashed" block class="rounded-xl mt-2" @click="addCriterion">
        <template #icon><PlusOutlined /></template>
        Thêm tiêu chí
      </a-button>

      <!-- PREMIMUM: File Upload Section in Modal -->
      <div class="modal-upload-container mt-6">
        <div class="modal-upload-header">
          <div class="flex items-center gap-2">
            <div class="modal-upload-icon-box">
              <CloudUploadOutlined />
            </div>
            <div>
              <div class="text-sm font-bold text-gray-800">Tài liệu đính kèm</div>
              <div class="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Định dạng hỗ trợ: JPG, PNG, PDF, Excel</div>
            </div>
          </div>
          <a-tag v-if="modalUploadFiles.length" color="blue" class="rounded-lg m-0 border-none bg-blue-50 text-blue-500 font-bold px-3">
            {{ modalUploadFiles.length }} tệp
          </a-tag>
        </div>

        <div class="modal-upload-body">
          <!-- Gallery: Combined Existing + New Files -->
          <transition-group 
            v-if="form.existing_images.length || form.existing_documents.length || modalUploadFiles.length" 
            name="list" 
            tag="div" 
            class="grid grid-cols-5 gap-3 mb-4"
          >
            <!-- Existing Images -->
            <div v-for="(img, idx) in form.existing_images" :key="'ex-img-' + img.id" class="modal-preview-card lg:col-span-1 col-span-1">
              <div class="modal-preview-card__inner">
                <img :src="img.file_url" class="w-full h-full object-cover" />
                <div class="modal-preview-overlay" @click="removeExistingImage(idx)">
                  <div class="delete-btn-circle"><CloseOutlined /></div>
                </div>
              </div>
            </div>

            <!-- Existing Documents -->
            <div v-for="(doc, idx) in form.existing_documents" :key="'ex-doc-' + doc.id" class="modal-preview-card">
              <div class="modal-preview-card__inner">
                <div class="flex flex-col items-center justify-center h-full p-2">
                  <div class="file-icon-wrapper is-generic"><FileTextOutlined /></div>
                  <span class="text-[9px] text-gray-400 truncate w-full text-center mt-1 px-1">{{ doc.file_name }}</span>
                </div>
                <div class="modal-preview-overlay" @click="removeExistingDocument(idx)">
                  <div class="delete-btn-circle"><CloseOutlined /></div>
                </div>
              </div>
            </div>

            <!-- New Files (to be uploaded) -->
            <div v-for="(file, idx) in modalUploadFiles" :key="'new-' + idx" class="modal-preview-card">
              <div class="modal-preview-card__inner border-dashed border-blue-200">
                <img v-if="isImageFile(file)" :src="getFilePreview(file)" class="w-full h-full object-cover opacity-70" />
                <div v-else class="flex flex-col items-center justify-center h-full p-2">
                  <div class="file-icon-wrapper" :class="getFileTypeClass(file)">
                    <FilePdfOutlined v-if="file.type === 'application/pdf'" />
                    <FileExcelOutlined v-else-if="file.type.includes('excel') || file.type.includes('spreadsheet')" />
                    <FileWordOutlined v-else-if="file.type.includes('word') || file.type.includes('officedocument')" />
                    <FileTextOutlined v-else />
                  </div>
                  <span class="text-[9px] text-gray-400 truncate w-full text-center mt-1 px-1">{{ file.name }}</span>
                </div>
                <div class="modal-preview-overlay" @click="removeModalFile(idx)">
                  <div class="delete-btn-circle"><CloseOutlined /></div>
                </div>
                <div class="absolute bottom-1 right-1"><a-tag color="blue" class="m-0 text-[8px] px-1 py-0 leading-none">Mới</a-tag></div>
              </div>
            </div>
          </transition-group>

          <!-- Dropzone Area -->
          <div 
            class="modal-dropzone"
            @click="modalUploadInput.click()"
          >
            <input 
              type="file" 
              multiple 
              ref="modalUploadInput" 
              style="display: none" 
              @change="onModalFilesSelect" 
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
            />
            <div class="modal-dropzone__content">
              <div class="plus-circle">
                <PlusOutlined />
              </div>
              <div class="text-xs font-bold text-gray-600">Thêm tệp ngay</div>
              <p class="text-[10px] text-gray-400 mt-0.5">Kéo thả hoặc nhấn để chọn</p>
            </div>
          </div>
        </div>
      </div>
    </a-form>
  </a-modal>

  <!-- ─── DETAIL DRAWER ─── -->
  <a-drawer
    :open="!!detailData"
    :title="detailData?.name"
    placement="right"
    :width="520"
    @close="detailData = null"
  >
    <template v-if="detailData">
      <div class="space-y-6">
        <!-- Info -->
        <div>
          <div class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Thông tin chung</div>
          <a-descriptions :column="1" size="small" bordered class="rounded-xl overflow-hidden">
            <a-descriptions-item label="Tên">{{ detailData.name }}</a-descriptions-item>
            <a-descriptions-item label="Tiêu chuẩn">{{ detailData.standard || '—' }}</a-descriptions-item>
            <a-descriptions-item label="Trạng thái">
              <a-tag :color="detailData.is_active ? 'green' : 'default'" class="rounded-lg">
                {{ detailData.is_active ? 'Đang dùng' : 'Tạm ngưng' }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="Cập nhật lần cuối">{{ detailData.updated_at }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <div v-if="detailData.description">
          <div class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">Mô tả</div>
          <div class="text-sm text-gray-600 bg-gray-50 rounded-xl p-4" style="white-space: pre-line;">{{ detailData.description }}</div>
        </div>

        <!-- Criteria -->
        <div>
          <div class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">
            Tiêu chí nghiệm thu ({{ detailData.criteria?.length || 0 }})
          </div>
          <div v-if="detailData.criteria?.length" class="space-y-2">
            <div
              v-for="(c, idx) in detailData.criteria"
              :key="c.id"
              class="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
            >
              <div class="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                :class="c.is_critical ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-400'"
              >{{ idx + 1 }}</div>
              <div>
                <div class="text-sm font-semibold text-gray-700">{{ c.name }}</div>
                <div v-if="c.description" class="text-xs text-gray-400 mt-0.5">{{ c.description }}</div>
                <a-tag v-if="c.is_critical" color="red" class="rounded-lg mt-1" style="font-size:10px;">Bắt buộc</a-tag>
              </div>
            </div>
          </div>
          <a-empty v-else description="Chưa có tiêu chí" :image-style="{ height: '40px' }" />
        </div>

        <!-- Images -->
        <div v-if="detailData.images?.length">
          <div class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">
            Hình ảnh minh họa ({{ detailData.images.length }})
          </div>
          <div class="grid grid-cols-3 gap-2">
            <div v-for="img in detailData.images" :key="img.id" class="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
              <a-image :src="img.file_url" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        <!-- Documents -->
        <div v-if="detailData.documents?.length">
          <div class="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">
            Tài liệu đính kèm ({{ detailData.documents.length }})
          </div>
          <div class="space-y-2">
            <a
              v-for="doc in detailData.documents"
              :key="doc.id"
              :href="doc.file_url"
              target="_blank"
              class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors"
            >
              <div class="drawer-doc-icon" :class="getDocTypeClass(doc.file_name)">
                <FilePdfOutlined v-if="doc.file_name.toLowerCase().endsWith('.pdf')" />
                <FileExcelOutlined v-else-if="doc.file_name.toLowerCase().endsWith('.xls') || doc.file_name.toLowerCase().endsWith('.xlsx')" />
                <FileWordOutlined v-else-if="doc.file_name.toLowerCase().endsWith('.doc') || doc.file_name.toLowerCase().endsWith('.docx')" />
                <FileTextOutlined v-else />
              </div>
              <span class="text-sm text-gray-700 font-medium">{{ doc.file_name }}</span>
            </a>
          </div>
        </div>


      </div>

      <div class="mt-8 flex gap-3">
        <a-button type="primary" class="rounded-xl flex-1" @click="openEdit(detailData); detailData = null">
          <template #icon><EditOutlined /></template>
          Chỉnh sửa
        </a-button>
        <a-button class="rounded-xl" @click="detailData = null">Đóng</a-button>
      </div>
    </template>
  </a-drawer>
</template>

<script setup>
import { ref, computed, h } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import { message, Modal } from 'ant-design-vue'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  SwapOutlined,
  CheckSquareOutlined,
  PictureOutlined,
  FileTextOutlined,
  FileProtectOutlined,
  SafetyCertificateOutlined,
  FolderOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  OrderedListOutlined,
  UploadOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileWordOutlined,
  CloseOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  templates: { type: Array, default: () => [] },
  stats: { type: Object, default: () => ({}) },
})

// ─── Stats ───
const statsList = computed(() => [
  { label: 'Tổng bộ TL', value: props.stats.total || 0, icon: FolderOutlined, bg: '#EEF2FF', color: '#6366F1' },
  { label: 'Đang dùng', value: props.stats.active || 0, icon: CheckCircleOutlined, bg: '#ECFDF5', color: '#10B981' },
  { label: 'Tạm ngưng', value: props.stats.inactive || 0, icon: CloseCircleOutlined, bg: '#FEF2F2', color: '#EF4444' },
  { label: 'Tổng tiêu chí', value: props.stats.total_criteria || 0, icon: OrderedListOutlined, bg: '#FFF7ED', color: '#F97316' },
])

// ─── Modal ───
const modalVisible = ref(false)
const formLoading = ref(false)
const editingId = ref(null)
const detailData = ref(null)
const detailLoading = ref(false)

const defaultForm = () => ({
  name: '',
  description: '',
  standard: '',
  is_active: true,
  order: 0,
  criteria: [],
  existing_images: [],
  existing_documents: [],
})

const form = ref(defaultForm())
const modalUploadFiles = ref([])
const modalUploadInput = ref(null)

const onModalFilesSelect = (e) => {
  const selected = Array.from(e.target.files || [])
  modalUploadFiles.value = [...modalUploadFiles.value, ...selected]
}

const removeModalFile = (idx) => {
  modalUploadFiles.value.splice(idx, 1)
}
const removeExistingImage = (idx) => {
  form.value.existing_images.splice(idx, 1)
}
const removeExistingDocument = (idx) => {
  form.value.existing_documents.splice(idx, 1)
}


const openCreate = () => {
  editingId.value = null
  form.value = defaultForm()
  modalUploadFiles.value = []
  modalVisible.value = true
}

const openEdit = (tpl) => {
  editingId.value = tpl.id
  // Fetch full detail with criteria
  fetch(`/acceptance-templates/${tpl.id}`)
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        form.value = {
          name: res.data.name,
          description: res.data.description || '',
          standard: res.data.standard || '',
          is_active: res.data.is_active,
          order: res.data.order || 0,
          criteria: (res.data.criteria || []).map(c => ({
            id: c.id,
            name: c.name,
            description: c.description || '',
            is_critical: c.is_critical,
            order: c.order,
          })),
          existing_images: res.data.images || [],
          existing_documents: res.data.documents || [],
        }
        modalUploadFiles.value = []
        modalVisible.value = true
      }
    })
    .catch(() => {
      // Fallback: use existing data
      form.value = {
        name: tpl.name,
        description: tpl.description || '',
        standard: tpl.standard || '',
        is_active: tpl.is_active,
        order: tpl.order || 0,
        criteria: [],
      }
      modalVisible.value = true
    })
}

const closeModal = () => {
  modalVisible.value = false
  editingId.value = null
}

const openDetail = (tpl) => {
  detailLoading.value = true
  fetch(`/acceptance-templates/${tpl.id}`)
    .then(r => r.json())
    .then(res => {
      if (res.success) {
        detailData.value = res.data
      }
      detailLoading.value = false
    })
    .catch(() => {
      // Fallback
      detailData.value = tpl
      detailLoading.value = false
    })
}

// ─── Criteria ───
const addCriterion = () => {
  form.value.criteria.push({
    name: '',
    description: '',
    is_critical: true,
    order: form.value.criteria.length,
  })
}

const removeCriterion = (idx) => {
  form.value.criteria.splice(idx, 1)
}

// ─── Submit ───
const handleSubmit = () => {
  if (!form.value.name.trim()) {
    message.warning('Vui lòng nhập tên bộ tài liệu')
    return
  }

  formLoading.value = true
  const payload = {
    ...form.value,
    criteria: form.value.criteria.filter(c => c.name.trim()),
    existing_image_ids: form.value.existing_images.map(img => img.id),
    existing_document_ids: form.value.existing_documents.map(doc => doc.id),
  }

  if (editingId.value) {
    // For files in PUT request, we use POST with _method: 'PUT'
    router.post(`/acceptance-templates/${editingId.value}`, {
      ...payload,
      _method: 'PUT',
      files: modalUploadFiles.value
    }, {
      preserveScroll: true,
      onSuccess: () => {
        message.success('Đã cập nhật bộ tài liệu')
        closeModal()
        formLoading.value = false
      },
      onError: () => {
        message.error('Lỗi cập nhật')
        formLoading.value = false
      },
    })
  } else {
    router.post('/acceptance-templates', {
      ...payload,
      files: modalUploadFiles.value
    }, {
      preserveScroll: true,
      onSuccess: () => {
        message.success('Đã tạo bộ tài liệu mới')
        closeModal()
        formLoading.value = false
      },
      onError: () => {
        message.error('Lỗi tạo bộ tài liệu')
        formLoading.value = false
      },
    })
  }
}

// ─── Toggle / Delete ───
const toggleActive = (tpl) => {
  router.put(`/acceptance-templates/${tpl.id}/toggle-active`, {}, {
    preserveScroll: true,
    onSuccess: () => message.success(`Đã ${tpl.is_active ? 'vô hiệu hóa' : 'kích hoạt'} "${tpl.name}"`),
  })
}

const confirmDelete = (tpl) => {
  Modal.confirm({
    title: 'Xóa bộ tài liệu?',
    content: `Bạn chắc chắn muốn xóa "${tpl.name}"? Hành động này không thể hoàn tác.`,
    okText: 'Xóa',
    cancelText: 'Hủy',
    okButtonProps: { danger: true },
    onOk() {
      router.delete(`/acceptance-templates/${tpl.id}`, {
        preserveScroll: true,
        onSuccess: () => message.success(`Đã xóa "${tpl.name}"`),
        onError: () => message.error('Không thể xóa bộ tài liệu này'),
      })
    },
  })
}

// ─── Modal Files ───
const isImageFile = (file) => file.type.startsWith('image/')

const getFileTypeClass = (file) => {
  if (file.type === 'application/pdf') return 'is-pdf'
  if (file.type.includes('excel') || file.type.includes('spreadsheet')) return 'is-excel'
  if (file.type.includes('word') || file.type.includes('officedocument')) return 'is-word'
  return 'is-generic'
}

const getDocTypeClass = (fileName) => {
  const ext = fileName.toLowerCase().split('.').pop()
  if (ext === 'pdf') return 'is-pdf'
  if (['xls', 'xlsx'].includes(ext)) return 'is-excel'
  if (['doc', 'docx'].includes(ext)) return 'is-word'
  return 'is-generic'
}

const getFilePreview = (file) => {
  if (isImageFile(file)) {
    return URL.createObjectURL(file)
  }
  return ''
}

</script>

<style scoped>
/* ─── Stats ─── */
.at-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 0 32px;
  margin-bottom: 24px;
}

.at-stats__card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: white;
  border-radius: 20px;
  border: 1px solid #E8ECF1;
  box-shadow: 0 2px 12px -4px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s ease;
}
.at-stats__card:hover { transform: translateY(-2px); }

.at-stats__icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.at-stats__value { font-size: 22px; font-weight: 800; color: #1F2937; }
.at-stats__label { font-size: 12px; color: #9CA3AF; font-weight: 500; }

/* ─── Grid ─── */
.at-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
  padding: 0 32px 48px;
}

/* ─── Card ─── */
.at-card {
  background: white;
  border-radius: 20px;
  border: 1px solid #E8ECF1;
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}
.at-card:hover {
  box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}
.at-card--inactive { opacity: 0.6; }
.at-card--inactive:hover { opacity: 1; }

.at-card--add {
  border: 2px dashed #E5E7EB;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  min-height: 240px;
  cursor: pointer;
  transition: all 0.3s ease;
}
.at-card--add:hover {
  border-color: #6366F1;
  background: #F5F3FF;
}

.at-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 0;
}
.at-card__header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.at-card__number {
  font-size: 11px;
  font-weight: 700;
  color: #9CA3AF;
  background: #F3F4F6;
  padding: 2px 8px;
  border-radius: 8px;
}

.at-card__body {
  padding: 12px 20px 16px;
  cursor: pointer;
  flex: 1;
}
.at-card__title {
  font-size: 16px;
  font-weight: 700;
  color: #1F2937;
  margin: 0 0 6px;
  line-height: 1.3;
}
.at-card__desc {
  font-size: 13px;
  color: #9CA3AF;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
}

.at-card__standard {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 6px 10px;
  background: #EFF6FF;
  border-radius: 10px;
  font-size: 12px;
  color: #3B82F6;
  font-weight: 500;
}

.at-card__footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: #FAFBFC;
  border-top: 1px solid #F3F4F6;
}
.at-card__stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6B7280;
}

/* ─── Empty ─── */
.at-empty {
  text-align: center;
  padding: 80px 32px;
}
.at-empty__icon {
  width: 80px;
  height: 80px;
  border-radius: 24px;
  background: #F3F4F6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  font-size: 36px;
  color: #D1D5DB;
}
.at-empty h3 { font-size: 18px; font-weight: 700; color: #374151; margin: 0 0 8px; }
.at-empty p { color: #9CA3AF; margin: 0; }

/* ─── Criteria ─── */
.at-criteria-list { display: flex; flex-direction: column; gap: 8px; }

.at-criteria-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  background: #FAFBFC;
  border-radius: 12px;
  border: 1px solid #F3F4F6;
}
.at-criteria-item__main { flex: 1; }
.at-criteria-item__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding-top: 6px;
}

@media (max-width: 768px) {
  .at-stats { grid-template-columns: repeat(2, 1fr); padding: 0 16px; }
  .at-grid { grid-template-columns: 1fr; padding: 0 16px 32px; }
}

/* ─── Premium Upload Container ─── */
.modal-upload-container {
  background: #F9FBFC;
  border: 1px solid #E2E8F0;
  border-radius: 20px;
  overflow: hidden;
}

.modal-upload-header {
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #F1F5F9;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-upload-icon-box {
  width: 36px;
  height: 36px;
  background: #EFF6FF;
  color: #3B82F6;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.modal-upload-body {
  padding: 20px;
}

/* Preview Card */
.modal-preview-card {
  position: relative;
  aspect-ratio: 1;
}

.modal-preview-card__inner {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 14px;
  border: 1px solid #E2E8F0;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
}

.modal-preview-card:hover .modal-preview-card__inner {
  transform: translateY(-4px);
  box-shadow: 0 12px 20px -8px rgba(0,0,0,0.1);
  border-color: #3B82F6;
}

.file-icon-wrapper {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 16px;
  margin-bottom: 4px;
}
.file-icon-wrapper.is-pdf { background: #FEF2F2; color: #EF4444; }
.file-icon-wrapper.is-excel { background: #F0FDF4; color: #10B981; }
.file-icon-wrapper.is-generic { background: #F8FAFC; color: #94A3B8; }

.modal-preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s ease;
  cursor: pointer;
}
.modal-preview-card:hover .modal-preview-overlay { opacity: 1; }

.delete-btn-circle {
  width: 28px;
  height: 28px;
  background: white;
  color: #EF4444;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transform: scale(0.8);
  transition: all 0.2s ease;
}
.modal-preview-card:hover .delete-btn-circle { transform: scale(1); }

/* Dropzone */
.modal-dropzone {
  border: 2px dashed #CBD5E1;
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;
  background: white;
  cursor: pointer;
}

.modal-dropzone:hover {
  border-color: #3B82F6;
  background: #F0F7FF;
  transform: translateY(-2px);
}

.modal-dropzone__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.plus-circle {
  width: 38px;
  height: 38px;
  background: #F1F5F9;
  color: #64748B;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  transition: all 0.3s ease;
}
.modal-dropzone:hover .plus-circle {
  background: #3B82F6;
  color: white;
  transform: rotate(90deg);
}

.file-icon-wrapper.is-pdf { color: #EF4444; background: #FEF2F2; }
.file-icon-wrapper.is-excel { color: #10B981; background: #ECFDF5; }
.file-icon-wrapper.is-word { color: #3B82F6; background: #EFF6FF; }
.file-icon-wrapper.is-generic { color: #6B7280; background: #F9FAFB; }

.drawer-doc-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
.drawer-doc-icon.is-pdf { color: #EF4444; background: #FEF2F2; }
.drawer-doc-icon.is-excel { color: #10B981; background: #ECFDF5; }
.drawer-doc-icon.is-word { color: #3B82F6; background: #EFF6FF; }
.drawer-doc-icon.is-generic { color: #6B7280; background: #F9FAFB; }

/* Animations */
.list-enter-active, .list-leave-active { transition: all 0.3s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: scale(0.5); }
</style>
