<template>
  <Head title="Kế hoạch & Công việc Tháng" />

  <PageHeader title="Kế hoạch & Công việc Tháng" subtitle="Theo dõi và đánh giá mục tiêu, công việc định kỳ hàng tháng của công ty">
    <template #actions>
      <a-button v-if="canManage" type="primary" size="large" class="rounded-xl bg-blue-600 hover:bg-blue-700 border-none shadow-sm flex items-center gap-1" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Tạo kế hoạch mới
      </a-button>
    </template>
  </PageHeader>

  <!-- ═══ Stats Cards ═══ -->
  <div class="crm-stats-grid mb-6">
    <StatCard :value="plans.total || 0" label="Tổng số kế hoạch tháng" :icon="CalendarOutlined" variant="primary" />
    <StatCard :value="activePlansCount" label="Kế hoạch đang hoạt động" :icon="PieChartOutlined" variant="success" />
    <StatCard :value="totalTopTasks" label="Công việc đạt TOP" :icon="TrophyOutlined" variant="warning" />
    <StatCard :value="totalFlopTasks" label="Công việc FLOP / Trở ngại" :icon="WarningOutlined" variant="danger" />
  </div>

  <!-- ═══ Cards Grid Section ═══ -->
  <div v-if="plans.data && plans.data.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
    <div v-for="plan in plans.data" :key="plan.id" class="bg-white rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group">
      <!-- Card Header -->
      <div class="p-5 border-b border-gray-50 bg-gray-50/30 flex justify-between items-start">
        <div>
          <h3 class="text-lg font-extrabold text-gray-800 group-hover:text-blue-600 transition-colors">
            Tháng {{ String(plan.month).padStart(2, '0') }}/{{ plan.year }}
          </h3>
          <span class="text-[11px] text-gray-400 font-medium">Tạo ngày: {{ fmtDate(plan.created_at) }}</span>
        </div>
        <a-tag :color="statusColors[plan.status]" class="rounded-full px-3 py-0.5 text-[11px] font-bold border-none">
          {{ statusLabels[plan.status] || plan.status }}
        </a-tag>
      </div>

      <!-- Card Body -->
      <div class="p-5 flex-1 flex flex-col space-y-4">
        <!-- Goal Snippet -->
        <div>
          <div class="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Mục tiêu chung</div>
          <p class="text-xs text-gray-600 font-medium line-clamp-3 leading-relaxed">
            {{ plan.general_goal || 'Không có mục tiêu chung được ghi nhận.' }}
          </p>
        </div>

        <!-- Progress Bar -->
        <div>
          <div class="flex justify-between items-center text-[11px] mb-1">
            <span class="text-gray-400 font-bold uppercase tracking-wider">Tiến độ công việc</span>
            <span class="text-blue-600 font-extrabold">{{ getProgressPercent(plan) }}%</span>
          </div>
          <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div class="bg-blue-500 h-full rounded-full transition-all duration-500" :style="`width: ${getProgressPercent(plan)}%`"></div>
          </div>
          <div class="flex justify-between text-[10px] text-gray-400 mt-1 font-semibold">
            <span>{{ plan.completed_tasks_count || 0 }} Hoàn thành</span>
            <span>{{ plan.tasks_count || 0 }} Tổng số task</span>
          </div>
        </div>

        <!-- Evaluation Counts -->
        <div class="grid grid-cols-2 gap-2 pt-2">
          <div class="bg-amber-50/50 border border-amber-100/30 p-2.5 rounded-xl flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-amber-100/50 flex items-center justify-center shrink-0">
              <TrophyOutlined class="text-amber-500 text-sm" />
            </div>
            <div>
              <div class="text-[10px] text-gray-400 font-bold uppercase">Top</div>
              <div class="text-sm font-extrabold text-amber-700">{{ plan.top_tasks_count || 0 }}</div>
            </div>
          </div>
          <div class="bg-red-50/50 border border-red-100/30 p-2.5 rounded-xl flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-red-100/50 flex items-center justify-center shrink-0">
              <WarningOutlined class="text-red-500 text-sm" />
            </div>
            <div>
              <div class="text-[10px] text-gray-400 font-bold uppercase">Flop</div>
              <div class="text-sm font-extrabold text-red-700">{{ plan.flop_tasks_count || 0 }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Card Footer Actions -->
      <div class="p-4 bg-gray-50/50 border-t border-gray-50 flex gap-2">
        <a-button type="default" class="flex-1 rounded-xl font-bold flex items-center justify-center gap-1 hover:border-blue-400 hover:text-blue-600 transition-colors" @click="viewDetails(plan)">
          <EyeOutlined /> Chi tiết bảng CV
        </a-button>

        <a-popconfirm v-if="canManage" title="Xóa kế hoạch này và toàn bộ công việc kèm theo?" ok-text="Xóa" cancel-text="Hủy" :ok-button-props="{ danger: true }" @confirm="handleDelete(plan)">
          <a-button type="default" danger class="rounded-xl border-red-200 hover:bg-red-50 flex items-center justify-center shrink-0">
            <DeleteOutlined />
          </a-button>
        </a-popconfirm>
      </div>
    </div>
  </div>

  <!-- Empty State -->
  <div v-else class="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm mb-6">
    <div class="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
      <CalendarOutlined class="text-blue-500 text-3xl" />
    </div>
    <h3 class="text-lg font-extrabold text-gray-800 mb-1">Chưa có kế hoạch tháng nào</h3>
    <p class="text-gray-500 text-sm max-w-md mx-auto mb-6">Bắt đầu tạo kế hoạch mới để thiết lập mục tiêu chung và theo dõi danh sách công việc hàng tháng.</p>
    <a-button v-if="canManage" type="primary" size="large" class="rounded-xl bg-blue-600 hover:bg-blue-700 border-none shadow-sm" @click="openCreateModal">
      + Tạo kế hoạch đầu tiên
    </a-button>
  </div>

  <!-- Pagination -->
  <div v-if="plans.total > plans.per_page" class="flex justify-end bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
    <a-pagination v-model:current="currentLocalPage" :total="plans.total" :page-size="plans.per_page" show-less-items @change="handlePageChange" />
  </div>

  <!-- Create Plan Modal -->
  <a-modal v-model:open="showCreateModal" title="Tạo kế hoạch tháng mới" :footer="null" :width="500">
    <a-form layout="vertical" class="space-y-4 py-2" @finish="handleSubmit">
      <div class="grid grid-cols-2 gap-4">
        <a-form-item label="Tháng" required :validate-status="form.errors.month ? 'error' : ''" :help="form.errors.month">
          <a-select v-model:value="form.month" placeholder="Chọn tháng...">
            <a-select-option v-for="m in 12" :key="m" :value="m">Tháng {{ String(m).padStart(2, '0') }}</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Năm" required :validate-status="form.errors.year ? 'error' : ''" :help="form.errors.year">
          <a-select v-model:value="form.year" placeholder="Chọn năm...">
            <a-select-option v-for="y in Array.from({length: 10}, (_, i) => new Date().getFullYear() + 2 - i)" :key="y" :value="y">Năm {{ y }}</a-select-option>
          </a-select>
        </a-form-item>
      </div>

      <a-form-item label="Mục tiêu chung của tháng" :validate-status="form.errors.general_goal ? 'error' : ''" :help="form.errors.general_goal">
        <a-textarea v-model:value="form.general_goal" :rows="4" placeholder="Nhập mục tiêu trọng tâm cần đạt được trong tháng này..." />
      </a-form-item>

      <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
        <a-button @click="showCreateModal = false">Hủy</a-button>
        <a-button type="primary" html-type="submit" :loading="form.processing" class="bg-blue-600 hover:bg-blue-700 border-none">
          Tạo kế hoạch
        </a-button>
      </div>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, useForm, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import {
  PlusOutlined,
  CalendarOutlined,
  PieChartOutlined,
  TrophyOutlined,
  WarningOutlined,
  EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  plans: Object,
  canManage: Boolean,
})

const showCreateModal = ref(false)
const currentLocalPage = ref(props.plans.current_page)

const form = useForm({
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  general_goal: '',
})

const statusLabels = {
  draft: 'Nháp',
  active: 'Đang hoạt động',
  reviewed: 'Đã họp đánh giá',
}

const statusColors = {
  draft: 'default',
  active: 'blue',
  reviewed: 'green',
}

// Compute dashboard statistics
const activePlansCount = computed(() => {
  return props.plans.data ? props.plans.data.filter(p => p.status === 'active').length : 0
})

const totalTopTasks = computed(() => {
  if (!props.plans.data) return 0
  return props.plans.data.reduce((sum, p) => sum + (parseInt(p.top_tasks_count) || 0), 0)
})

const totalFlopTasks = computed(() => {
  if (!props.plans.data) return 0
  return props.plans.data.reduce((sum, p) => sum + (parseInt(p.flop_tasks_count) || 0), 0)
})

const getProgressPercent = (plan) => {
  if (!plan.tasks_count) return 0
  return Math.round(((plan.completed_tasks_count || 0) / plan.tasks_count) * 100)
}

const openCreateModal = () => {
  form.reset()
  form.month = new Date().getMonth() + 1
  form.year = new Date().getFullYear()
  showCreateModal.value = true
}

const handleSubmit = () => {
  form.post('/monthly-plans', {
    onSuccess: () => {
      showCreateModal.value = false
      message.success('Đã tạo kế hoạch tháng thành công')
    },
  })
}

const viewDetails = (plan) => {
  router.visit(`/monthly-plans/${plan.id}`)
}

const handleDelete = (plan) => {
  router.delete(`/monthly-plans/${plan.id}`, {
    onSuccess: () => message.success('Đã xóa kế hoạch tháng'),
  })
}

const handlePageChange = (page) => {
  router.get('/monthly-plans', { page }, { preserveState: true })
}

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN')
}
</script>
