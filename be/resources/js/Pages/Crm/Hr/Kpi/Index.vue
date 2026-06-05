<template>
  <Head title="Quản lý KPI" />

  <PageHeader title="Quản Lý KPI Nhân Sự" subtitle="Theo dõi, đánh giá và xác nhận KPI toàn bộ nhân viên">
    <template #actions>
      <a-button type="primary" size="large" class="rounded-xl" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);" @click="showCreateModal">
        <template #icon><PlusOutlined /></template>
        Giao KPI
      </a-button>
    </template>
  </PageHeader>

  <!-- ═══ Stats ═══ -->
  <div class="crm-stats-grid">
    <StatCard :value="stats.totalKpi" label="Tổng KPI" :icon="AimOutlined" variant="primary" />
    <StatCard :value="stats.pendingKpi" label="Đang thực hiện" :icon="ClockCircleOutlined" variant="warning" />
    <StatCard :value="stats.verifiedSuccess" label="Đạt KPI" :icon="CheckCircleOutlined" variant="success" />
    <StatCard :value="`${stats.avgCompletion}%`" label="TB hoàn thành" :icon="RiseOutlined" variant="accent" format="text" />
  </div>

  <!-- ═══ Charts ═══ -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <ChartCard title="KPI theo trạng thái" :subtitle="`${stats.totalKpi} KPI`" :height="260">
      <Doughnut :data="statusChartData" :options="donutOpts" />
    </ChartCard>
    <ChartCard title="Top nhân viên" subtitle="% hoàn thành KPI trung bình" :height="260">
      <Bar :data="topEmployeesData" :options="horizontalBarOpts" />
    </ChartCard>
    <ChartCard title="KPI theo dự án" subtitle="Tổng / Đạt" :height="260">
      <Bar :data="byProjectData" :options="groupedBarOpts" />
    </ChartCard>
  </div>

  <!-- ═══ Filters ═══ -->
  <div class="crm-content-card mb-6">
    <div class="crm-content-card__header" style="border-bottom: none; padding-bottom: 0;">
      <div class="flex flex-wrap items-center gap-3 w-full">
        <a-input-search
          v-model:value="localFilters.search" placeholder="Tìm KPI..."
          style="width: 220px;" size="large" allow-clear
          @search="applyFilters" @pressEnter="applyFilters"
        />
        <a-select v-model:value="localFilters.status" style="width: 160px;" size="large" @change="applyFilters" placeholder="Trạng thái">
          <a-select-option value="">Tất cả</a-select-option>
          <a-select-option value="pending">Đang thực hiện</a-select-option>
          <a-select-option value="completed">Đã hoàn thành</a-select-option>
          <a-select-option value="verified_success">Đạt KPI</a-select-option>
          <a-select-option value="verified_fail">Không đạt</a-select-option>
        </a-select>
        <a-select
          v-model:value="localFilters.user_id" style="width: 200px;" size="large"
          @change="applyFilters" placeholder="Nhân viên" allow-clear show-search
          :filter-option="filterOption" option-label-prop="label"
        >
          <a-select-option value="">Tất cả</a-select-option>
          <a-select-option v-for="u in users" :key="u.id" :value="String(u.id)" :label="u.name">{{ u.name }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="localFilters.project_id" style="width: 200px;" size="large"
          @change="applyFilters" placeholder="Dự án" allow-clear show-search
          :filter-option="filterOption" option-label-prop="label"
        >
          <a-select-option value="">Tất cả</a-select-option>
          <a-select-option v-for="p in projects" :key="p.id" :value="String(p.id)" :label="`${p.code} - ${p.name}`">{{ p.code }} - {{ p.name }}</a-select-option>
        </a-select>
      </div>
    </div>
  </div>

  <!-- ═══ Table (Expandable) ═══ -->
  <div class="crm-content-card">
    <a-table
      :columns="columns"
      :data-source="kpis.data"
      :pagination="false"
      row-key="id"
      class="crm-table"
      :scroll="{ x: 1100 }"
      :expand-row-by-click="true"
    >
      <!-- Expand icon slot -->
      <template #expandIcon="{ expanded, onExpand, record }">
        <span
          v-if="record.children?.length"
          class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-50 border border-blue-200 cursor-pointer transition-all hover:bg-blue-100 mr-2"
          @click.stop="onExpand(record, $event)"
        >
          <RightOutlined class="text-blue-500 text-[10px]" :class="{ 'rotate-90': expanded }" style="transition: transform 0.2s;" />
        </span>
        <span v-else class="inline-flex w-6 mr-2" />
      </template>

      <!-- Expand row — show child items -->
      <template #expandedRowRender="{ record }">
        <div class="py-3 px-2">
          <div class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-3 px-1">
            Các mục KPI — {{ record.children?.length || 0 }} chỉ tiêu
          </div>
          <div class="space-y-2">
            <div
              v-for="child in (record.children || [])"
              :key="child.id"
              class="flex items-center gap-4 px-4 py-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-blue-200 transition-all group"
            >
              <!-- Bullet -->
              <div class="w-2 h-2 rounded-full flex-shrink-0" :class="statusDot(child.status)" />

              <!-- Title + desc -->
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-gray-800 text-sm leading-tight">{{ child.title }}</div>
                <div v-if="child.description" class="text-xs text-gray-400 mt-0.5 truncate">{{ child.description }}</div>
              </div>

              <!-- Progress -->
              <div class="flex items-center gap-2" style="min-width:160px;">
                <a-progress
                  :percent="progressPct(child)" :size="5" :show-info="false"
                  :stroke-color="progressColor(child)" style="flex:1;"
                />
                <span class="text-xs font-bold w-9 text-right" :style="{ color: progressColor(child) }">
                  {{ progressPct(child) }}%
                </span>
              </div>
              <div class="text-xs text-gray-400 w-28 text-right">
                {{ child.current_value }} / {{ child.target_value }} {{ child.unit }}
              </div>

              <!-- Status -->
              <div class="w-28 text-right">
                <span class="crm-tag text-xs" :class="kpiStatusTag(child.status)">
                  {{ kpiStatusLabel(child.status) }}
                </span>
              </div>

              <!-- Child Actions -->
              <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <a-tooltip title="Cập nhật tiến độ">
                  <a-button
                    v-if="child.status === 'pending'"
                    type="text" size="small"
                    @click.stop="showProgressModal(child)"
                  >
                    <RiseOutlined style="color: #3B82F6;" />
                  </a-button>
                </a-tooltip>
                <a-tooltip title="Xác nhận KPI">
                  <a-button
                    v-if="child.status === 'completed'"
                    type="text" size="small"
                    @click.stop="showVerifyModal(child)"
                  >
                    <SafetyOutlined style="color: #10B981;" />
                  </a-button>
                </a-tooltip>
                <a-popconfirm title="Xóa mục này?" ok-text="Xóa" cancel-text="Hủy" @confirm="deleteKpi(child.id)">
                  <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                </a-popconfirm>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #bodyCell="{ column, record }">
        <!-- Title -->
        <template v-if="column.dataIndex === 'title'">
          <div class="flex items-center gap-2">
            <div>
              <div class="font-semibold text-gray-800 text-sm leading-tight">{{ record.title }}</div>
              <div v-if="record.children?.length" class="text-xs text-blue-500 font-medium mt-0.5">
                <FolderOutlined class="mr-1" />{{ record.children.length }} mục chỉ tiêu
              </div>
              <div v-else-if="record.description" class="text-xs text-gray-400 mt-0.5 truncate" style="max-width:220px;">
                {{ record.description }}
              </div>
            </div>
          </div>
        </template>

        <!-- User -->
        <template v-if="column.dataIndex === 'user'">
          <div class="flex items-center gap-2">
            <a-avatar :size="28" class="flex-shrink-0" style="background: linear-gradient(135deg, #1B4F72, #2E86C1); font-size: 11px;">
              {{ record.user?.name?.charAt(0) || '?' }}
            </a-avatar>
            <span class="text-sm text-gray-700">{{ record.user?.name || '—' }}</span>
          </div>
        </template>

        <!-- Project -->
        <template v-if="column.dataIndex === 'project'">
          <a-tag v-if="record.project" color="blue" class="rounded-lg text-xs">{{ record.project.code }}</a-tag>
          <span v-else class="text-gray-400 text-xs">Công ty</span>
        </template>

        <!-- Progress (parent = avg of children) -->
        <template v-if="column.dataIndex === 'progress'">
          <div class="flex items-center gap-2" style="min-width: 160px;">
            <a-progress
              :percent="progressPct(record)" :size="6" :show-info="false"
              :stroke-color="progressColor(record)"
              style="flex: 1;"
            />
            <span class="text-xs font-bold" :style="{ color: progressColor(record) }">{{ progressPct(record) }}%</span>
          </div>
          <div v-if="record.children?.length" class="text-xs text-blue-400 mt-0.5 font-medium">
            TB {{ record.children.length }} mục
          </div>
          <div v-else class="text-xs text-gray-400 mt-0.5">
            {{ record.current_value }} / {{ record.target_value }} {{ record.unit }}
          </div>
        </template>

        <!-- Status -->
        <template v-if="column.dataIndex === 'status'">
          <span class="crm-tag" :class="kpiStatusTag(record.status)">
            {{ kpiStatusLabel(record.status) }}
          </span>
        </template>

        <!-- Period -->
        <template v-if="column.dataIndex === 'period'">
          <div class="text-xs text-gray-500">
            <div v-if="record.start_date">{{ formatDate(record.start_date) }}</div>
            <div v-if="record.end_date" class="text-gray-400">→ {{ formatDate(record.end_date) }}</div>
            <span v-if="!record.start_date && !record.end_date" class="text-gray-400">—</span>
          </div>
        </template>

        <!-- Actions (parent) -->
        <template v-if="column.dataIndex === 'actions'">
          <div class="flex gap-1">
            <!-- Update Progress only for parent with no children -->
            <a-tooltip title="Cập nhật tiến độ">
              <a-button v-if="record.status === 'pending' && !record.children?.length" type="text" size="small" @click="showProgressModal(record)">
                <RiseOutlined style="color: #3B82F6;" />
              </a-button>
            </a-tooltip>
            <!-- Verify only for parent with no children -->
            <a-tooltip title="Xác nhận KPI">
              <a-button v-if="record.status === 'completed' && !record.children?.length" type="text" size="small" @click="showVerifyModal(record)">
                <SafetyOutlined style="color: #10B981;" />
              </a-button>
            </a-tooltip>
            <!-- Edit parent -->
            <a-tooltip title="Sửa">
              <a-button type="text" size="small" @click="showEditModal(record)"><EditOutlined /></a-button>
            </a-tooltip>
            <!-- Delete parent -->
            <a-popconfirm title="Xóa KPI này (bao gồm các mục con)?" ok-text="Xóa" cancel-text="Hủy" @confirm="deleteKpi(record.id)">
              <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>

    <div v-if="kpis.last_page > 1" class="flex justify-center py-4 border-t border-gray-100">
      <a-pagination
        :current="kpis.current_page" :total="kpis.total" :page-size="kpis.per_page"
        @change="(page) => router.visit(`/hr/kpi?page=${page}&${buildQuery()}`)"
      />
    </div>
  </div>

  <!-- Empty -->
  <div v-if="!kpis.data?.length" class="text-center py-16">
    <AimOutlined style="font-size: 56px; color: #D1D5DB;" />
    <p class="mt-4 text-gray-400 text-base">Chưa có KPI nào trong hệ thống</p>
    <a-button type="primary" class="mt-3 rounded-xl" @click="showCreateModal">Giao KPI đầu tiên</a-button>
  </div>

  <!-- ═══ Create/Edit Modal ═══ -->
  <a-modal
    v-model:open="formModalVisible"
    :title="editingKpi ? 'Sửa KPI' : 'Giao KPI mới'"
    :width="680"
    @ok="saveForm"
    ok-text="Lưu"
    cancel-text="Hủy"
    :confirm-loading="form.processing"
    centered
    destroy-on-close
  >
    <div class="space-y-5 mt-4">
      <!-- Row 1: Nhân viên + Tháng -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nhân viên <span class="text-red-500">*</span></label>
          <a-select
            v-model:value="form.user_id"
            style="width: 100%;" size="large"
            placeholder="Chọn nhân viên"
            show-search :filter-option="filterOption" option-label-prop="label"
          >
            <a-select-option v-for="u in users" :key="u.id" :value="u.id" :label="u.name">{{ u.name }}</a-select-option>
          </a-select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tháng áp dụng</label>
          <a-month-picker
            v-model:value="formMonth"
            style="width: 100%;" size="large"
            format="MM/YYYY"
            placeholder="Chọn tháng..."
            @change="onMonthChange"
          />
        </div>
      </div>

      <!-- Tiêu đề KPI -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tiêu đề KPI <span class="text-red-500">*</span></label>
        <a-input v-model:value="form.title" placeholder="VD: KPI Tháng 06/2026" size="large" />
      </div>

      <!-- Row 2: Dự án + Thời hạn -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Dự án</label>
          <a-select
            v-model:value="form.project_id"
            style="width: 100%;" size="large"
            placeholder="Toàn công ty (tùy chọn)"
            allow-clear show-search :filter-option="filterOption" option-label-prop="label"
          >
            <a-select-option v-for="p in projects" :key="p.id" :value="p.id" :label="`${p.code} - ${p.name}`">{{ p.code }} - {{ p.name }}</a-select-option>
          </a-select>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
            <a-date-picker v-model:value="formStartDate" style="width: 100%;" size="large" format="DD/MM/YYYY" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
            <a-date-picker v-model:value="formEndDate" style="width: 100%;" size="large" format="DD/MM/YYYY" />
          </div>
        </div>
      </div>

      <!-- Mô tả KPI cha -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
        <a-textarea v-model:value="form.description" :rows="2" placeholder="Mô tả tổng quát KPI tháng này..." />
      </div>

      <!-- ═══ Các mục chỉ tiêu (Items) ═══ -->
      <div class="border border-gray-200 rounded-2xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div class="text-sm font-bold text-gray-700 flex items-center gap-2">
            <BarsOutlined class="text-blue-500" />
            Các mục chỉ tiêu KPI
            <span class="text-xs font-normal text-gray-400">({{ form.items.length }} mục)</span>
          </div>
          <a-button size="small" type="dashed" @click="addItem">
            <template #icon><PlusOutlined /></template>
            Thêm mục
          </a-button>
        </div>

        <div class="divide-y divide-gray-100">
          <transition-group name="kpi-item">
            <div
              v-for="(item, idx) in form.items"
              :key="item._key"
              class="px-4 py-4 bg-white hover:bg-gray-50 transition-colors"
            >
              <div class="flex items-start gap-3">
                <!-- Index badge -->
                <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-[11px] font-black flex items-center justify-center flex-shrink-0 mt-1">
                  {{ idx + 1 }}
                </div>

                <div class="flex-1 space-y-2">
                  <!-- Title -->
                  <a-input
                    v-model:value="item.title"
                    :placeholder="`Mục ${idx + 1}: VD: Hoàn thành 10 hạng mục`"
                    size="small"
                  />
                  <!-- Target + Unit -->
                  <div class="flex gap-2">
                    <a-input-number
                      v-model:value="item.target_value"
                      :min="0.01"
                      placeholder="Chỉ tiêu"
                      size="small"
                      style="width: 130px;"
                    />
                    <a-input
                      v-model:value="item.unit"
                      placeholder="Đơn vị (%, hạng mục...)"
                      size="small"
                      style="flex: 1;"
                    />
                  </div>
                  <!-- Description -->
                  <a-input
                    v-model:value="item.description"
                    placeholder="Mô tả chi tiết (tùy chọn)"
                    size="small"
                  />
                </div>

                <!-- Remove -->
                <a-button
                  type="text" size="small" danger
                  class="flex-shrink-0 mt-0.5"
                  :disabled="form.items.length <= 1"
                  @click="removeItem(idx)"
                >
                  <DeleteOutlined />
                </a-button>
              </div>
            </div>
          </transition-group>

          <div v-if="!form.items.length" class="px-4 py-8 text-center text-gray-400 text-sm">
            Chưa có mục nào — nhấn "Thêm mục" để bắt đầu
          </div>
        </div>
      </div>
    </div>
  </a-modal>

  <!-- ═══ Progress Modal ═══ -->
  <a-modal v-model:open="progressModalVisible" title="Cập nhật tiến độ KPI" :width="420" @ok="saveProgress" ok-text="Cập nhật" cancel-text="Hủy" centered>
    <div v-if="progressKpi" class="mt-4">
      <div class="text-sm font-bold text-gray-800 mb-1">{{ progressKpi.title }}</div>
      <div class="text-xs text-gray-400 mb-4">Chỉ tiêu: {{ progressKpi.target_value }} {{ progressKpi.unit }}</div>
      <a-progress :percent="progressPct(progressKpi)" :stroke-color="progressColor(progressKpi)" class="mb-4" />
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Giá trị hiện tại</label>
        <a-input-number v-model:value="progressValue" :min="0" :max="progressKpi.target_value * 2" style="width: 100%;" size="large" />
      </div>
    </div>
  </a-modal>

  <!-- ═══ Verify Modal ═══ -->
  <a-modal v-model:open="verifyModalVisible" title="Xác nhận KPI" :width="420" @ok="saveVerify" ok-text="Xác nhận" cancel-text="Hủy" centered>
    <div v-if="verifyKpi" class="mt-4">
      <div class="text-sm font-bold text-gray-800 mb-1">{{ verifyKpi.title }}</div>
      <div class="text-xs text-gray-400 mb-2">{{ verifyKpi.user?.name }} — {{ verifyKpi.current_value }}/{{ verifyKpi.target_value }} {{ verifyKpi.unit }}</div>
      <a-progress :percent="progressPct(verifyKpi)" :stroke-color="progressColor(verifyKpi)" class="mb-4" />
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Kết quả xác nhận</label>
        <a-radio-group v-model:value="verifyStatus" size="large" class="w-full">
          <a-radio-button value="verified_success" class="flex-1 text-center" style="border-radius: 10px 0 0 10px;">
            <CheckCircleOutlined /> Đạt KPI
          </a-radio-button>
          <a-radio-button value="verified_fail" class="flex-1 text-center" style="border-radius: 0 10px 10px 0;">
            <CloseCircleOutlined /> Không đạt
          </a-radio-button>
        </a-radio-group>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { Head, router, useForm } from '@inertiajs/vue3'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js'
import dayjs from 'dayjs'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import ChartCard from '@/Components/Crm/ChartCard.vue'
import { useChart, CHART_COLORS } from '@/Composables/useChart'
import { useStatusFormat } from '@/Composables/useStatusFormat'
import {
  PlusOutlined, AimOutlined, ClockCircleOutlined, CheckCircleOutlined, CloseCircleOutlined,
  RiseOutlined, EditOutlined, DeleteOutlined, SafetyOutlined, RightOutlined,
  FolderOutlined, BarsOutlined,
} from '@ant-design/icons-vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

defineOptions({ layout: CrmLayout })

const props = defineProps({
  kpis: Object,
  stats: Object,
  charts: Object,
  users: Array,
  projects: Array,
  filters: Object,
  parentKpis: Array,
})

const { defaultOptions, doughnutOptions, barOptions } = useChart()
const { kpiStatusLabel, kpiStatusTag } = useStatusFormat()

const filterOption = (input, option) => option.label?.toLowerCase().includes(input.toLowerCase())
const formatDate = (d) => d ? dayjs(d).format('DD/MM/YYYY') : '—'

// ============================================================
// PROGRESS HELPERS
// ============================================================
const progressPct = (kpi) => {
  if (kpi?.children?.length) {
    const totalPct = kpi.children.reduce((sum, child) => sum + progressPct(child), 0)
    return Math.round(totalPct / kpi.children.length)
  }
  if (!kpi?.target_value || kpi.target_value <= 0) return 0
  return Math.min(Math.round((kpi.current_value / kpi.target_value) * 100), 100)
}

const progressColor = (kpi) => {
  const pct = progressPct(kpi)
  if (kpi?.status === 'verified_success') return '#10B981'
  if (kpi?.status === 'verified_fail') return '#EF4444'
  if (pct >= 100) return '#10B981'
  if (pct >= 70) return '#3B82F6'
  if (pct >= 40) return '#F59E0B'
  return '#EF4444'
}

const statusDot = (status) => ({
  'bg-blue-500': status === 'pending',
  'bg-amber-500': status === 'completed',
  'bg-emerald-500': status === 'verified_success',
  'bg-red-500': status === 'verified_fail',
})

// ============================================================
// FILTERS
// ============================================================
const localFilters = reactive({ ...props.filters })

const buildQuery = () => {
  const params = new URLSearchParams()
  if (localFilters.search) params.set('search', localFilters.search)
  if (localFilters.status) params.set('status', localFilters.status)
  if (localFilters.user_id) params.set('user_id', localFilters.user_id)
  if (localFilters.project_id) params.set('project_id', localFilters.project_id)
  return params.toString()
}

const applyFilters = () => {
  router.visit(`/hr/kpi?${buildQuery()}`, { preserveState: true })
}

// ============================================================
// CHARTS
// ============================================================
const donutOpts = computed(() => ({
  ...doughnutOptions,
  cutout: '60%',
  plugins: { ...doughnutOptions.plugins, legend: { ...doughnutOptions.plugins.legend, position: 'bottom' } }
}))

const statusChartData = computed(() => ({
  labels: props.charts?.byStatus?.labels || [],
  datasets: [{
    data: props.charts?.byStatus?.data || [],
    backgroundColor: props.charts?.byStatus?.colors || [],
    hoverOffset: 6,
  }]
}))

const horizontalBarOpts = computed(() => ({
  ...barOptions,
  indexAxis: 'y',
  plugins: { ...barOptions.plugins, legend: { display: false }, tooltip: { ...barOptions.plugins.tooltip, callbacks: { label: (ctx) => `${ctx.raw}%` } } },
  scales: { x: { max: 100, ticks: { callback: (v) => `${v}%` }, grid: { color: 'rgba(0,0,0,0.04)' } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } }
}))

const topEmployeesData = computed(() => ({
  labels: props.charts?.topEmployees?.labels || [],
  datasets: [{
    data: props.charts?.topEmployees?.data || [],
    backgroundColor: 'rgba(27, 79, 114, 0.7)',
    borderColor: '#1B4F72',
    borderWidth: 1, borderRadius: 6, barThickness: 18,
  }]
}))

const groupedBarOpts = computed(() => ({
  ...defaultOptions,
  plugins: { ...defaultOptions.plugins, legend: { display: true, position: 'top', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } } },
  scales: {
    ...defaultOptions.scales,
    y: { ...defaultOptions.scales.y, beginAtZero: true, ticks: { ...defaultOptions.scales.y.ticks, stepSize: 1, callback: (v) => Number.isInteger(v) ? v : '' } }
  }
}))

const byProjectData = computed(() => ({
  labels: props.charts?.byProject?.labels || [],
  datasets: [
    { label: 'Tổng KPI', data: props.charts?.byProject?.data || [], backgroundColor: 'rgba(59, 130, 246, 0.6)', borderRadius: 6, barThickness: 16 },
    { label: 'Đạt', data: props.charts?.byProject?.success || [], backgroundColor: 'rgba(16, 185, 129, 0.6)', borderRadius: 6, barThickness: 16 },
  ]
}))

// ============================================================
// TABLE
// ============================================================
const columns = [
  { title: 'Tiêu đề KPI', dataIndex: 'title', key: 'title', width: 280 },
  { title: 'Nhân viên', dataIndex: 'user', key: 'user', width: 160 },
  { title: 'Dự án', dataIndex: 'project', key: 'project', width: 90 },
  { title: 'Tiến độ', dataIndex: 'progress', key: 'progress', width: 200 },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120 },
  { title: 'Thời hạn', dataIndex: 'period', key: 'period', width: 110 },
  { title: '', dataIndex: 'actions', key: 'actions', width: 140, fixed: 'right' },
]

// ============================================================
// CREATE / EDIT FORM
// ============================================================
const formModalVisible = ref(false)
const editingKpi = ref(null)
const formStartDate = ref(null)
const formEndDate = ref(null)
const formMonth = ref(null)

let _itemKey = 0
const makeItem = () => ({ _key: ++_itemKey, id: null, title: '', target_value: 1, unit: '', description: '' })

const form = useForm({
  user_id: null,
  project_id: null,
  title: '',
  description: '',
  start_date: '',
  end_date: '',
  items: [makeItem()],
})

const onMonthChange = (val) => {
  if (val) {
    const m = dayjs(val)
    form.title = `KPI Tháng ${m.format('MM/YYYY')}`
    formStartDate.value = m.startOf('month')
    formEndDate.value = m.endOf('month')
  }
}

const addItem = () => form.items.push(makeItem())
const removeItem = (idx) => {
  if (form.items.length > 1) form.items.splice(idx, 1)
}

const showCreateModal = () => {
  editingKpi.value = null
  form.reset()
  form.items = [makeItem()]
  formMonth.value = dayjs()
  onMonthChange(dayjs())
  formModalVisible.value = true
}

const showEditModal = (record) => {
  editingKpi.value = record
  form.user_id = record.user_id
  form.project_id = record.project_id
  form.title = record.title
  form.description = record.description || ''
  formStartDate.value = record.start_date ? dayjs(record.start_date) : null
  formEndDate.value = record.end_date ? dayjs(record.end_date) : null
  formMonth.value = record.start_date ? dayjs(record.start_date) : null

  // Load children as items
  if (record.children?.length) {
    form.items = record.children.map(c => ({
      _key: ++_itemKey,
      id: c.id,
      title: c.title,
      target_value: parseFloat(c.target_value),
      unit: c.unit,
      description: c.description || '',
    }))
  } else {
    form.items = [makeItem()]
  }

  formModalVisible.value = true
}

const saveForm = () => {
  form.start_date = formStartDate.value ? formStartDate.value.format('YYYY-MM-DD') : ''
  form.end_date = formEndDate.value ? formEndDate.value.format('YYYY-MM-DD') : ''

  // Strip internal _key from items before sending
  const payload = {
    ...form.data(),
    items: form.items.map(({ _key, ...rest }) => rest),
  }

  if (editingKpi.value) {
    router.put(`/hr/kpi/${editingKpi.value.id}`, payload, {
      preserveScroll: true,
      onSuccess: () => { formModalVisible.value = false },
    })
  } else {
    router.post('/hr/kpi', payload, {
      preserveScroll: true,
      onSuccess: () => { formModalVisible.value = false },
    })
  }
}

// ============================================================
// PROGRESS
// ============================================================
const progressModalVisible = ref(false)
const progressKpi = ref(null)
const progressValue = ref(0)

const showProgressModal = (record) => {
  progressKpi.value = record
  progressValue.value = parseFloat(record.current_value)
  progressModalVisible.value = true
}

const saveProgress = () => {
  router.patch(`/hr/kpi/${progressKpi.value.id}/progress`, { current_value: progressValue.value }, {
    preserveScroll: true,
    onSuccess: () => { progressModalVisible.value = false },
  })
}

// ============================================================
// VERIFY
// ============================================================
const verifyModalVisible = ref(false)
const verifyKpi = ref(null)
const verifyStatus = ref('verified_success')

const showVerifyModal = (record) => {
  verifyKpi.value = record
  verifyStatus.value = 'verified_success'
  verifyModalVisible.value = true
}

const saveVerify = () => {
  router.patch(`/hr/kpi/${verifyKpi.value.id}/verify`, { status: verifyStatus.value }, {
    preserveScroll: true,
    onSuccess: () => { verifyModalVisible.value = false },
  })
}

// ============================================================
// ACTIONS
// ============================================================
const deleteKpi = (id) => {
  router.delete(`/hr/kpi/${id}`, { preserveScroll: true })
}
</script>

<style scoped>
.kpi-item-enter-active { transition: all 0.2s ease; }
.kpi-item-leave-active { transition: all 0.15s ease; }
.kpi-item-enter-from { opacity: 0; transform: translateY(-6px); }
.kpi-item-leave-to { opacity: 0; transform: translateX(10px); }
.kpi-item-move { transition: transform 0.2s ease; }
</style>
