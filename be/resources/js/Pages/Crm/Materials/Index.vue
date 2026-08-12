<template>
  <Head title="Quản lý chi phí" />

  <PageHeader title="Quản lý chi phí" subtitle="Danh mục chi phí — vật tư, nhân công, thiết bị & chi phí quản lý">
    <template #actions>
      <a-button type="primary" size="large" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Thêm chi phí mới
      </a-button>
    </template>
  </PageHeader>

  <div class="crm-stats-grid" style="grid-template-columns: 1fr;">
    <StatCard label="Tổng danh mục chi phí" :value="stats.total" icon="ToolOutlined" variant="primary" />
  </div>

  <div class="crm-content-card">
    <div class="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
      <a-input-search v-model:value="filters.search" placeholder="Tìm chi phí..." class="max-w-xs" allow-clear @search="applyFilters" @change="debounceSearch" />
      <a-select v-model:value="filters.cost_group_id" placeholder="Nhóm chi phí" allow-clear style="width: 180px" @change="applyFilters">
        <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id">{{ g.name }}</a-select-option>
      </a-select>
    </div>

    <a-table :columns="columns" :data-source="materials.data" :pagination="{ current: materials.current_page, total: materials.total, pageSize: materials.per_page, showTotal: (t) => `${t} danh mục` }" :loading="loading" row-key="id" size="small" class="crm-table" @change="handleTableChange">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'name'">
          <div class="group cursor-pointer" @click="viewPriceHistory(record)">
            <div class="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
              {{ record.name }}
              <HistoryOutlined class="opacity-0 group-hover:opacity-100 text-blue-500 text-xs transition-all duration-200" />
            </div>
            <div class="text-xs text-slate-400 group-hover:text-blue-500/70 transition-colors">{{ record.code }}</div>
          </div>
        </template>
        <template v-else-if="column.key === 'cost_group'">
          <span v-if="record.cost_group" class="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-medium border border-blue-100">
            {{ record.cost_group.name }}
          </span>
          <span v-else class="text-gray-400 text-xs italic">—</span>
        </template>
        <template v-else-if="column.key === 'price'">{{ formatCurrency(record.unit_price) }}</template>
        <template v-else-if="column.key === 'actions'">
          <div class="flex items-center gap-1">
            <a-button type="text" size="small" @click="openEditModal(record)"><template #icon><EditOutlined /></template></a-button>
            <a-popconfirm title="Xóa danh mục chi phí?" @confirm="deleteMaterial(record)">
              <a-button type="text" size="small" danger><template #icon><DeleteOutlined /></template></a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- Modal -->
  <a-modal v-model:open="showModal" :title="editing ? 'Chỉnh sửa danh mục chi phí' : 'Thêm danh mục chi phí mới'" :width="600" @ok="handleSubmit" @cancel="resetForm" ok-text="Lưu" cancel-text="Hủy" class="crm-modal" centered destroy-on-close>
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="16"><a-form-item label="Tên chi phí" required><a-input v-model:value="form.name" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Mã"><a-input v-model:value="form.code" size="large" disabled placeholder="Tự động" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Đơn vị" required><a-input v-model:value="form.unit" placeholder="thùng, kg..." size="large" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Đơn giá"><a-input-number v-model:value="form.unit_price" :min="0" class="w-full" size="large" :formatter="(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Danh mục (Ví dụ: Sắt xây dựng, Cát đá...)">
            <a-input v-model:value="form.category" placeholder="Nhập danh mục..." size="large" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Nhóm chi phí (Liên kết)">
            <a-select v-model:value="form.cost_group_id" placeholder="Chọn nhóm chi phí..." size="large" show-search option-filter-prop="label">
              <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id" :label="g.name">{{ g.name }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Mô tả"><a-textarea v-model:value="form.description" :rows="2" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Price History Drawer -->
  <a-drawer
    v-model:open="showHistoryDrawer"
    :title="`Lịch sử đơn giá mua: ${selectedMaterial?.name || ''}`"
    width="650"
    placement="right"
    destroy-on-close
    class="crm-drawer"
  >
    <div v-if="selectedMaterial" class="flex flex-col h-full gap-6">
      <!-- Summary Info Card -->
      <div class="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-3">
        <div class="flex justify-between items-center border-b border-slate-200 pb-2.5">
          <div>
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mã sản phẩm</span>
            <div class="text-sm font-semibold text-slate-700 mt-0.5">{{ selectedMaterial.code || 'Chưa cập nhật' }}</div>
          </div>
          <div class="text-right">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Đơn vị tính</span>
            <div class="text-sm font-semibold text-slate-700 mt-0.5">{{ selectedMaterial.unit }}</div>
          </div>
        </div>
        <div class="flex justify-between items-center pt-0.5">
          <div>
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Nhóm chi phí</span>
            <div class="text-sm font-semibold text-slate-700 mt-0.5">{{ selectedMaterial.cost_group?.name || 'Chưa phân nhóm' }}</div>
          </div>
          <div class="text-right">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">Giá danh mục</span>
            <div class="text-sm font-bold text-blue-600 mt-0.5">{{ formatCurrency(selectedMaterial.unit_price) }}</div>
          </div>
        </div>
      </div>

      <!-- Sparkline Price Trend -->
      <div v-if="priceHistory.length > 1 && !historyLoading" class="border border-slate-100 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-2">
        <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Biến động giá mua gần đây</h4>
        <div class="flex items-end justify-between h-36 px-4 pt-4 border-b border-slate-100">
          <div v-for="(t, idx) in [...priceHistory].reverse()" :key="idx" class="flex flex-col items-center justify-end h-full flex-1 group relative pb-6">
            <!-- Tooltip -->
            <div class="absolute bottom-full mb-2 bg-slate-800 text-white text-[10px] py-1.5 px-2.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-md text-center">
              <span class="font-bold">{{ formatCurrency(t.unit_price) }}</span><br/>
              <span class="text-slate-400 text-[9px]">{{ t.date }}</span>
            </div>
            <!-- Bar Container (stretches flex-1 inside h-full parent column) -->
            <div class="w-full flex items-end justify-center flex-1 min-h-[40px]">
              <div 
                class="w-6 rounded-t transition-all duration-300 group-hover:brightness-95 cursor-pointer"
                :class="selectedMaterial.unit_price && t.unit_price > selectedMaterial.unit_price ? 'bg-red-400' : (selectedMaterial.unit_price && t.unit_price < selectedMaterial.unit_price ? 'bg-emerald-400' : 'bg-slate-400')"
                :style="{ height: `${Math.max(15, Math.min(100, (t.unit_price / Math.max(...priceHistory.map(x => x.unit_price))) * 100))}%` }"
              ></div>
            </div>
            <!-- X Axis Label -->
            <div class="absolute bottom-1 text-[10px] text-slate-500 mt-1 font-medium whitespace-nowrap">{{ t.date.split('-').slice(1).reverse().join('/') }}</div>
          </div>
        </div>
        <div class="flex justify-center items-center gap-4 text-[10px] text-slate-500 mt-4">
          <div class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-red-400"></span> Cao hơn giá danh mục</div>
          <div class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span> Thấp hơn giá danh mục</div>
          <div class="flex items-center gap-1"><span class="w-2.5 h-2.5 rounded-sm bg-slate-400"></span> Bằng giá danh mục</div>
        </div>
      </div>

      <!-- History Table/Timeline -->
      <div class="flex-1 flex flex-col min-h-0">
        <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Nhật ký mua hàng</h4>
        
        <div v-if="historyLoading" class="flex-1 flex items-center justify-center py-12">
          <a-spin size="large" />
        </div>

        <div v-else-if="priceHistory.length === 0" class="flex-1 flex items-center justify-center py-12">
          <a-empty description="Không có lịch sử mua hàng (chưa từng mua qua phiếu vật tư hoặc chi phí trực tiếp)" />
        </div>

        <div v-else class="flex-1 overflow-y-auto pr-1">
          <div class="flex flex-col gap-3">
            <div v-for="(h, idx) in priceHistory" :key="idx" class="border border-slate-100 rounded-xl p-4 bg-white hover:border-blue-200 transition-colors shadow-sm relative overflow-hidden">
              <!-- Background indicator -->
              <div class="absolute left-0 top-0 bottom-0 w-1" :class="h.type === 'bill' ? 'bg-blue-500' : 'bg-amber-500'"></div>
              
              <div class="flex justify-between items-start gap-4">
                <div class="flex-1">
                  <!-- Project Name -->
                  <div class="font-semibold text-slate-800 text-sm leading-snug">{{ h.project_name }}</div>
                  
                  <!-- Supplier Name -->
                  <div class="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <span class="font-medium text-slate-400">Nhà cung cấp:</span>
                    <span class="text-slate-700 font-medium">{{ h.supplier_name }}</span>
                  </div>
                  
                  <!-- Date & Reference -->
                  <div class="text-[11px] text-slate-400 mt-1.5 flex items-center gap-3">
                    <span>📅 {{ formatDate(h.date) }}</span>
                    <span>📄 {{ h.ref }}</span>
                  </div>
                </div>

                <div class="text-right flex flex-col items-end gap-1">
                  <!-- Price -->
                  <div class="font-bold text-slate-900 text-base leading-none">{{ formatCurrency(h.unit_price) }}</div>
                  
                  <!-- Quantity -->
                  <div class="text-xs text-slate-500">Số lượng: <strong>{{ h.quantity }} {{ selectedMaterial.unit }}</strong></div>

                  <!-- Percentage Compare Badge -->
                  <div class="mt-1">
                    <span 
                      v-if="selectedMaterial.unit_price && h.unit_price > selectedMaterial.unit_price" 
                      class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 inline-flex items-center gap-0.5"
                    >
                      <RiseOutlined /> +{{ Math.round((h.unit_price - selectedMaterial.unit_price) / selectedMaterial.unit_price * 100) }}%
                    </span>
                    <span 
                      v-else-if="selectedMaterial.unit_price && h.unit_price < selectedMaterial.unit_price" 
                      class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 inline-flex items-center gap-0.5"
                    >
                      <FallOutlined /> -{{ Math.round((selectedMaterial.unit_price - h.unit_price) / selectedMaterial.unit_price * 100) }}%
                    </span>
                    <span 
                      v-else
                      class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-100 inline-flex items-center gap-0.5"
                    >
                      <LineOutlined /> 0%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </a-drawer>
</template>

<script setup>
import { ref } from 'vue'
import { Head, useForm, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import { PlusOutlined, EditOutlined, DeleteOutlined, HistoryOutlined, RiseOutlined, FallOutlined, LineOutlined } from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })
const props = defineProps({ materials: Object, stats: Object, costGroups: Array, filters: Object })

const loading = ref(false)
const showModal = ref(false)
const editing = ref(null)
const filters = ref({ search: props.filters?.search || '', cost_group_id: props.filters?.cost_group_id ? Number(props.filters.cost_group_id) : undefined })

// Price History states
const showHistoryDrawer = ref(false)
const selectedMaterial = ref(null)
const priceHistory = ref([])
const historyLoading = ref(false)

const columns = [
  { title: 'Chi phí', key: 'name', width: 250 },
  { title: 'Đơn vị', dataIndex: 'unit', width: 100 },
  { title: 'Danh mục', dataIndex: 'category', width: 140 },
  { title: 'Nhóm chi phí', key: 'cost_group', width: 180 },
  { title: 'Đơn giá', key: 'price', align: 'right', width: 150 },
  { title: '', key: 'actions', width: 100, align: 'center' },
]

let searchTimeout = null
const debounceSearch = () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => applyFilters(), 400) }
const applyFilters = () => { loading.value = true; router.get('/materials', { search: filters.value.search || undefined, cost_group_id: filters.value.cost_group_id || undefined }, { preserveState: true, replace: true, onFinish: () => loading.value = false }) }
const handleTableChange = (p) => { loading.value = true; router.get('/materials', { page: p.current, ...filters.value }, { preserveState: true, replace: true, onFinish: () => loading.value = false }) }

const form = useForm({ name: '', code: '', unit: '', category: '', cost_group_id: null, unit_price: null, description: '' })
const openCreateModal = () => { editing.value = null; form.reset(); showModal.value = true }
const openEditModal = (m) => { editing.value = m; Object.assign(form, { name: m.name, code: m.code || '', unit: m.unit, category: m.category || '', cost_group_id: m.cost_group_id, unit_price: m.unit_price, description: m.description || '' }); showModal.value = true }
const handleSubmit = () => {
  if (editing.value) router.put(`/materials/${editing.value.id}`, form.data(), { onSuccess: () => { showModal.value = false; resetForm() } })
  else router.post('/materials', form.data(), { onSuccess: () => { showModal.value = false; resetForm() } })
}
const resetForm = () => { editing.value = null; form.reset() }
const deleteMaterial = (m) => router.delete(`/materials/${m.id}`)
const formatCurrency = (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) : '—'

const viewPriceHistory = async (record) => {
  selectedMaterial.value = record
  priceHistory.value = []
  showHistoryDrawer.value = true
  historyLoading.value = true
  try {
    const response = await fetch(`/materials/${record.id}/price-history`)
    const data = await response.json()
    priceHistory.value = data.history
  } catch (error) {
    console.error('Lỗi khi tải lịch sử giá:', error)
  } finally {
    historyLoading.value = false
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}
</script>

<style scoped>
.crm-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
.crm-content-card { background: white; border-radius: 16px; border: 1px solid #E8ECF1; overflow: hidden; }
.crm-table :deep(.ant-table-thead > tr > th) { background: #FAFBFC; font-weight: 600; font-size: 13px; color: #5D6B82; }
.crm-modal :deep(.ant-modal-content) { border-radius: 16px; }
</style>
