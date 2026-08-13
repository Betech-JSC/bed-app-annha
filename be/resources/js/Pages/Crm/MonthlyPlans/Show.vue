<template>
  <Head :title="plan.title" />

  <PageHeader :title="plan.title" :subtitle="`Quản lý bảng công việc và đánh giá hiệu suất của tháng`">
    <template #back>
      <Link href="/monthly-plans" class="mr-3 text-gray-400 hover:text-gray-600 transition-colors">
        <ArrowLeftOutlined style="font-size: 18px;" />
      </Link>
    </template>
    
    <template #actions>
      <div class="flex items-center gap-3">
        <!-- Plan Status Selector (canManage only) -->
        <div v-if="canManage" class="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Trạng thái kế hoạch:</span>
          <a-select v-model:value="planForm.status" style="width: 160px" :bordered="false" class="font-bold text-gray-800" @change="updatePlan">
            <a-select-option value="draft">📁 Nháp</a-select-option>
            <a-select-option value="active">🟢 Đang hoạt động</a-select-option>
            <a-select-option value="reviewed">✅ Đã họp đánh giá</a-select-option>
          </a-select>
        </div>
        <div v-else class="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Trạng thái:</span>
          <a-tag :color="statusColors[plan.status]" class="rounded-full px-3 py-0.5 text-xs font-bold border-none">
            {{ statusLabels[plan.status] || plan.status }}
          </a-tag>
        </div>

        <a-button v-if="canManage" type="primary" size="large" class="rounded-xl bg-blue-600 hover:bg-blue-700 border-none shadow-sm flex items-center gap-1" @click="openCreateTaskModal">
          <template #icon><PlusOutlined /></template>
          Thêm công việc
        </a-button>
      </div>
    </template>
  </PageHeader>

  <!-- ═══ Goal & Notes Collapsible Header Section ═══ -->
  <div class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm mb-6">
    <a-tabs v-model:activeKey="activeTab">
      <!-- Mục tiêu chung -->
      <a-tab-pane key="goal" tab="🎯 Mục tiêu chung của tháng">
        <div v-if="editingGoal" class="space-y-3">
          <a-textarea v-model:value="planForm.general_goal" :rows="4" placeholder="Nhập mục tiêu trọng tâm của tháng..." class="rounded-xl" />
          <div class="flex gap-2">
            <a-button type="primary" class="bg-blue-600 border-none rounded-lg flex items-center gap-1" @click="updatePlan">
              <template #icon><SaveOutlined /></template> Lưu
            </a-button>
            <a-button class="rounded-lg" @click="cancelEditGoal">Hủy</a-button>
          </div>
        </div>
        <div v-else class="group relative">
          <p class="text-sm text-gray-700 font-medium whitespace-pre-line leading-relaxed min-h-[50px] bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
            {{ plan.general_goal || 'Chưa thiết lập mục tiêu chung cho tháng này.' }}
          </p>
          <a-button v-if="canManage" type="text" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50 text-blue-500 rounded-lg" @click="startEditGoal">
            <template #icon><EditOutlined /></template> Chỉnh sửa
          </a-button>
        </div>
      </a-tab-pane>

      <!-- Biên bản cuộc họp -->
      <a-tab-pane key="notes" tab="📝 Biên bản họp đánh giá tháng">
        <div v-if="editingNotes" class="space-y-3">
          <a-textarea v-model:value="planForm.meeting_notes" :rows="6" placeholder="Nhập nội dung biên bản cuộc họp tổng kết tháng, đánh giá Top/Flop và rút kinh nghiệm..." class="rounded-xl" />
          <div class="flex gap-2">
            <a-button type="primary" class="bg-blue-600 border-none rounded-lg flex items-center gap-1" @click="updatePlan">
              <template #icon><SaveOutlined /></template> Lưu
            </a-button>
            <a-button class="rounded-lg" @click="cancelEditNotes">Hủy</a-button>
          </div>
        </div>
        <div v-else class="group relative">
          <div v-if="plan.meeting_notes" class="text-sm text-gray-700 whitespace-pre-line leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100/50 min-h-[80px]">
            {{ plan.meeting_notes }}
          </div>
          <div v-else class="text-center py-6 text-gray-400 text-xs bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
            Chưa ghi nhận nội dung cuộc họp tổng kết tháng.
            <div v-if="canManage" class="mt-2">
              <a-button type="dashed" size="small" class="rounded-lg border-blue-400 text-blue-600" @click="startEditNotes">
                + Viết biên bản cuộc họp
              </a-button>
            </div>
          </div>
          <a-button v-if="canManage && plan.meeting_notes" type="text" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50 text-blue-500 rounded-lg" @click="startEditNotes">
            <template #icon><EditOutlined /></template> Chỉnh sửa
          </a-button>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>

  <!-- ═══ Trello Board Container ═══ -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start select-none">
    <!-- Loop through Trello Columns -->
    <div
      v-for="col in boardColumns"
      :key="col.status"
      class="bg-slate-50 rounded-2xl border border-slate-100 p-3.5 flex flex-col max-h-[75vh] min-h-[300px] transition-all duration-300"
      :class="{'bg-blue-50/80 border-blue-200 shadow-sm': activeDragColumn === col.status}"
      @dragover.prevent
      @dragenter="activeDragColumn = col.status"
      @dragleave="onDragLeave"
      @drop="onDrop($event, col.status)"
    >
      <!-- Column Header -->
      <div class="flex items-center justify-between mb-3 px-1">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full" :class="col.dotClass"></span>
          <h4 class="text-sm font-extrabold text-slate-800">{{ col.title }}</h4>
          <span class="bg-slate-200/60 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
            {{ getTasksByStatus(col.status).length }}
          </span>
        </div>
        <a-button v-if="canManage" type="text" size="small" class="hover:bg-slate-200/50 text-slate-400 hover:text-slate-700 rounded-lg flex items-center justify-center" @click="openCreateTaskWithStatus(col.status)">
          <PlusOutlined />
        </a-button>
      </div>

      <!-- Cards Stack container -->
      <div class="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[220px]">
        <TransitionGroup name="card-list" tag="div" class="space-y-3 min-h-[200px]">
          <div
            v-for="task in getTasksByStatus(col.status)"
            :key="task.id"
            draggable="true"
            @dragstart="onDragStart($event, task)"
            @dragend="activeDragColumn = null"
            @click="openTaskDetail(task)"
            class="bg-white p-4 rounded-xl border border-gray-100 hover:border-blue-300 hover:shadow-sm transition-all duration-200 cursor-grab active:cursor-grabbing flex flex-col gap-2.5 group relative"
          >
            <!-- Title -->
            <h5 class="text-xs font-bold text-gray-800 leading-snug group-hover:text-blue-600 transition-colors break-words">
              {{ task.title }}
            </h5>

            <!-- Footer Details -->
            <div class="flex items-center justify-between mt-1 select-none">
              <!-- Assignee badge/avatar -->
              <div class="flex items-center gap-1.5 min-w-0">
                <a-tooltip :title="task.assignee ? `Giao cho: ${task.assignee.name}` : 'Chưa phân công'">
                  <div v-if="task.assignee" class="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-extrabold border border-white flex items-center justify-center truncate shrink-0">
                    <img v-if="task.assignee.avatar" :src="'/storage/' + task.assignee.avatar" class="w-full h-full rounded-full object-cover" />
                    <span v-else>{{ task.assignee.name.charAt(0).toUpperCase() }}</span>
                  </div>
                  <div v-else class="w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-[10px] border border-gray-200 border-dashed flex items-center justify-center shrink-0">
                    <UserOutlined />
                  </div>
                </a-tooltip>
                <span v-if="task.assignee" class="text-[10px] text-gray-500 font-semibold truncate max-w-[80px]">
                  {{ task.assignee.name }}
                </span>
              </div>

              <!-- Due Date / Evaluations -->
              <div class="flex items-center gap-1.5 shrink-0">
                <!-- Top/Flop evaluation badges -->
                <a-tooltip v-if="task.evaluation === 'top'" :title="`TOP: ${task.evaluation_reason || 'Hoàn thành xuất sắc'}`">
                  <div class="w-5 h-5 rounded bg-amber-50 flex items-center justify-center border border-amber-200/50 shadow-sm shrink-0 animate-bounce">
                    <TrophyOutlined class="text-amber-500 text-[11px]" />
                  </div>
                </a-tooltip>
                <a-tooltip v-if="task.evaluation === 'flop'" :title="`FLOP: ${task.evaluation_reason || 'Trở ngại / Chậm trễ'}`">
                  <div class="w-5 h-5 rounded bg-red-50 flex items-center justify-center border border-red-200/50 shadow-sm shrink-0">
                    <WarningOutlined class="text-red-500 text-[11px]" />
                  </div>
                </a-tooltip>

                <!-- Due date pill -->
                <span v-if="task.due_date" class="text-[9px] font-bold px-2 py-0.5 rounded font-mono shadow-sm border shrink-0" :class="getDueDateClass(task)">
                  {{ fmtDateShort(task.due_date) }}
                </span>
              </div>
            </div>
          </div>
        </TransitionGroup>

        <!-- Fallback Empty State in column -->
        <div v-if="getTasksByStatus(col.status).length === 0" class="flex flex-col items-center justify-center py-8 text-slate-300 text-center select-none">
          <CalendarOutlined class="text-2xl mb-1 text-slate-200" />
          <span class="text-[10px] font-semibold text-slate-400">Kéo thả công việc vào đây</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ Create Task Modal ═══ -->
  <a-modal v-model:open="showCreateTaskModal" title="Thêm công việc kế hoạch tháng" :footer="null" :width="500">
    <a-form layout="vertical" class="space-y-4 py-2" @finish="submitCreateTask">
      <a-form-item label="Tiêu đề công việc" required :validate-status="taskForm.errors.title ? 'error' : ''" :help="taskForm.errors.title">
        <a-input v-model:value="taskForm.title" placeholder="Nhập tiêu đề công việc ngắn gọn..." class="rounded-xl" />
      </a-form-item>

      <a-form-item label="Mô tả chi tiết" :validate-status="taskForm.errors.description ? 'error' : ''" :help="taskForm.errors.description">
        <a-textarea v-model:value="taskForm.description" :rows="3" placeholder="Nhập mô tả cụ thể về yêu cầu công việc..." class="rounded-xl" />
      </a-form-item>

      <div class="grid grid-cols-2 gap-4">
        <a-form-item label="Người phụ trách" :validate-status="taskForm.errors.assigned_to ? 'error' : ''" :help="taskForm.errors.assigned_to">
          <a-select v-model:value="taskForm.assigned_to" placeholder="Chọn nhân viên..." show-search option-filter-prop="label" allow-clear class="rounded-xl">
            <a-select-option v-for="emp in employees" :key="emp.id" :value="emp.id" :label="emp.name">
              {{ emp.name }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="Hạn chót (Due Date)" :validate-status="taskForm.errors.due_date ? 'error' : ''" :help="taskForm.errors.due_date">
          <a-date-picker v-model:value="taskForm.due_date" value-format="YYYY-MM-DD" class="w-full rounded-xl" placeholder="Chọn ngày..." />
        </a-form-item>
      </div>

      <div class="flex justify-end gap-2 pt-3 border-t border-gray-100">
        <a-button @click="showCreateTaskModal = false">Hủy</a-button>
        <a-button type="primary" html-type="submit" :loading="taskForm.processing" class="bg-blue-600 hover:bg-blue-700 border-none rounded-lg">
          Lưu công việc
        </a-button>
      </div>
    </a-form>
  </a-modal>

  <!-- ═══ Task Details & Evaluation Drawer ═══ -->
  <a-drawer v-model:open="showDetailDrawer" title="Chi tiết Công việc Tháng" width="480" destroy-on-close>
    <div v-if="selectedTask" class="space-y-6 text-sm pb-10">
      <!-- Edit Task form for admin/pm -->
      <a-form v-if="canManage" layout="vertical" class="space-y-3" @finish="submitUpdateTask">
        <a-form-item label="Tiêu đề công việc" required>
          <a-input v-model:value="editTaskForm.title" class="rounded-lg font-bold" />
        </a-form-item>

        <a-form-item label="Mô tả công việc">
          <a-textarea v-model:value="editTaskForm.description" :rows="3" class="rounded-lg font-medium" />
        </a-form-item>

        <div class="grid grid-cols-2 gap-3">
          <a-form-item label="Người phụ trách">
            <a-select v-model:value="editTaskForm.assigned_to" show-search option-filter-prop="label" allow-clear>
              <a-select-option v-for="emp in employees" :key="emp.id" :value="emp.id" :label="emp.name">
                {{ emp.name }}
              </a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="Hạn chót">
            <a-date-picker v-model:value="editTaskForm.due_date" value-format="YYYY-MM-DD" class="w-full" />
          </a-form-item>
        </div>

        <div class="flex gap-2 justify-end">
          <a-button type="primary" html-type="submit" :loading="editTaskForm.processing" class="bg-blue-600 hover:bg-blue-700 border-none rounded-lg">
            Cập nhật thông tin
          </a-button>
        </div>
      </a-form>

      <!-- View mode for normal employees -->
      <div v-else class="space-y-4">
        <div class="p-4 bg-gray-50 border border-gray-100 rounded-xl">
          <h4 class="font-extrabold text-gray-800 text-base leading-snug mb-2">{{ selectedTask.title }}</h4>
          <p class="text-xs text-gray-600 leading-relaxed font-medium whitespace-pre-line bg-white p-3 rounded-lg border border-gray-100/50">
            {{ selectedTask.description || 'Không có mô tả chi tiết cho công việc này.' }}
          </p>
        </div>

        <div class="space-y-2 border-b border-gray-100 pb-3">
          <div class="flex justify-between">
            <span class="text-gray-400">Người phụ trách:</span>
            <span class="font-bold text-gray-800">{{ selectedTask.assignee?.name || 'Chưa giao' }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Hạn chót:</span>
            <span class="font-bold font-mono text-gray-800">{{ fmtDate(selectedTask.due_date) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Trạng thái:</span>
            <a-tag :color="statusColors[selectedTask.status]" class="rounded-full font-bold border-none px-3 py-0.5">
              {{ statusLabels[selectedTask.status] || selectedTask.status }}
            </a-tag>
          </div>
          <div class="flex justify-between">
            <span class="text-gray-400">Người tạo:</span>
            <span class="font-semibold text-gray-700">{{ selectedTask.creator?.name || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- ═══ Task Evaluation Section (only for Admin/PM) ═══ -->
      <div v-if="canManage" class="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-4">
        <div class="flex items-center gap-1.5 border-b border-slate-200 pb-2">
          <TrophyOutlined class="text-amber-500" />
          <h4 class="text-sm font-extrabold text-slate-800">Đánh giá hiệu suất cuối tháng</h4>
        </div>

        <a-form layout="vertical" class="space-y-3" @finish="submitEvaluation">
          <a-form-item label="Nhãn hiệu suất">
            <a-select v-model:value="evalForm.evaluation" placeholder="Chọn đánh giá...">
              <a-select-option value="none">⚪ Chưa đánh giá / Bình thường</a-select-option>
              <a-select-option value="top">🔥 TOP (Thành tích vượt trội)</a-select-option>
              <a-select-option value="flop">⚠️ FLOP (Trở ngại / Trễ hạn)</a-select-option>
            </a-select>
          </a-form-item>

          <a-form-item label="Lý do đánh giá chi tiết">
            <a-textarea v-model:value="evalForm.evaluation_reason" :rows="3" placeholder="Nhập lý do cụ thể vì sao đạt Top hoặc Flop để họp đánh giá tổng kết..." class="rounded-lg font-medium" />
          </a-form-item>

          <div class="flex justify-end pt-1">
            <a-button type="primary" html-type="submit" :loading="evalForm.processing" class="bg-amber-600 hover:bg-amber-700 border-none rounded-lg flex items-center gap-1">
              <template #icon><CheckOutlined /></template> Lưu đánh giá
            </a-button>
          </div>
        </a-form>
      </div>

      <!-- View mode for evaluation (for employees) -->
      <div v-else-if="selectedTask.evaluation && selectedTask.evaluation !== 'none'" class="p-4 rounded-xl border" :class="selectedTask.evaluation === 'top' ? 'bg-amber-50/50 border-amber-100' : 'bg-red-50/50 border-red-100'">
        <div class="flex items-center gap-2 font-bold mb-2">
          <TrophyOutlined v-if="selectedTask.evaluation === 'top'" class="text-amber-500" />
          <WarningOutlined v-else class="text-red-500" />
          <span :class="selectedTask.evaluation === 'top' ? 'text-amber-800' : 'text-red-800'">
            {{ selectedTask.evaluation === 'top' ? 'Được đánh giá: TOP THÀNH TÍCH' : 'Được đánh giá: FLOP TRỞ NGẠI' }}
          </span>
        </div>
        <p class="text-xs font-semibold text-gray-700 leading-relaxed bg-white p-3 rounded-lg border border-gray-100/50">
          {{ selectedTask.evaluation_reason || 'Không ghi nhận lý do cụ thể.' }}
        </p>
      </div>

      <!-- ═══ Danger Zone / Delete Task (only for Admin/PM) ═══ -->
      <div v-if="canManage" class="pt-6 border-t border-gray-100 flex justify-between items-center">
        <div>
          <h5 class="text-xs font-bold text-gray-800">Xóa công việc</h5>
          <span class="text-[10px] text-gray-400">Hành động này không thể hoàn tác</span>
        </div>
        <a-popconfirm title="Bạn có chắc chắn muốn xóa công việc này?" ok-text="Xóa" cancel-text="Hủy" :ok-button-props="{ danger: true }" @confirm="deleteTask">
          <a-button danger type="dashed" class="rounded-lg">
            <template #icon><DeleteOutlined /></template> Xóa thẻ task
          </a-button>
        </a-popconfirm>
      </div>
    </div>
  </a-drawer>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { Head, Link, useForm, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  SaveOutlined,
  EditOutlined,
  UserOutlined,
  TrophyOutlined,
  WarningOutlined,
  DeleteOutlined,
  CheckOutlined,
  CalendarOutlined,
  PieChartOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  plan: Object,
  employees: Array,
  canManage: Boolean,
  currentUserId: Number,
})

const activeTab = ref('goal')
const editingGoal = ref(false)
const editingNotes = ref(false)

const showCreateTaskModal = ref(false)
const showDetailDrawer = ref(false)
const selectedTask = ref(null)

// Drag and drop column state
const activeDragColumn = ref(null)

// Static details maps
const boardColumns = [
  { status: 'todo', title: 'Cần làm', dotClass: 'bg-slate-400' },
  { status: 'in_progress', title: 'Đang thực hiện', dotClass: 'bg-blue-500' },
  { status: 'under_review', title: 'Đang kiểm tra', dotClass: 'bg-amber-500' },
  { status: 'done', title: 'Hoàn thành', dotClass: 'bg-emerald-500' },
]

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

const taskStatusLabels = {
  todo: 'Cần làm',
  in_progress: 'Đang thực hiện',
  under_review: 'Đang kiểm tra',
  done: 'Hoàn thành',
}

// Plan general edit form
const planForm = useForm({
  general_goal: props.plan.general_goal || '',
  meeting_notes: props.plan.meeting_notes || '',
  status: props.plan.status,
})

// Create task form
const taskForm = useForm({
  title: '',
  description: '',
  assigned_to: null,
  due_date: null,
  status: 'todo',
})

// Edit task form
const editTaskForm = useForm({
  title: '',
  description: '',
  assigned_to: null,
  due_date: null,
})

// Task evaluation form
const evalForm = useForm({
  evaluation: 'none',
  evaluation_reason: '',
})

// Helpers
const getTasksByStatus = (status) => {
  return props.plan.tasks ? props.plan.tasks.filter(t => t.status === status) : []
}

// Due Date status styling helper
const getDueDateClass = (task) => {
  if (task.status === 'done') return 'bg-gray-50 border-gray-100 text-gray-400'
  
  if (task.due_date) {
    const today = new Date().toISOString().substring(0, 10)
    if (task.due_date < today) {
      return 'bg-red-50 border-red-200 text-red-600 font-extrabold animate-pulse'
    }
  }
  return 'bg-blue-50 border-blue-100 text-blue-600'
}

// Edit Mode Triggers
const startEditGoal = () => {
  planForm.general_goal = props.plan.general_goal || ''
  editingGoal.value = true
}

const cancelEditGoal = () => {
  editingGoal.value = false
}

const startEditNotes = () => {
  activeTab.value = 'notes'
  planForm.meeting_notes = props.plan.meeting_notes || ''
  editingNotes.value = true
}

const cancelEditNotes = () => {
  editingNotes.value = false
}

// Update Plan properties (Goal/Notes/Status)
const updatePlan = () => {
  planForm.put(`/monthly-plans/${props.plan.id}`, {
    preserveState: true,
    onSuccess: () => {
      editingGoal.value = false
      editingNotes.value = false
      message.success('Đã cập nhật kế hoạch tháng')
    },
  })
}

// Create Task Modal triggerers
const openCreateTaskModal = () => {
  taskForm.reset()
  taskForm.status = 'todo'
  showCreateTaskModal.value = true
}

const openCreateTaskWithStatus = (status) => {
  taskForm.reset()
  taskForm.status = status
  showCreateTaskModal.value = true
}

const submitCreateTask = () => {
  taskForm.post(`/monthly-plans/${props.plan.id}/tasks`, {
    preserveState: true,
    onSuccess: () => {
      showCreateTaskModal.value = false
      message.success('Đã thêm công việc thành công')
    },
  })
}

// Drawer controls
const openTaskDetail = (task) => {
  selectedTask.value = task
  
  // Fill edit form
  editTaskForm.title = task.title
  editTaskForm.description = task.description || ''
  editTaskForm.assigned_to = task.assigned_to
  editTaskForm.due_date = task.due_date
  
  // Fill eval form
  evalForm.evaluation = task.evaluation || 'none'
  evalForm.evaluation_reason = task.evaluation_reason || ''
  
  showDetailDrawer.value = true
}

const submitUpdateTask = () => {
  editTaskForm.put(`/monthly-plans/${props.plan.id}/tasks/${selectedTask.value.id}`, {
    preserveState: true,
    onSuccess: () => {
      message.success('Đã cập nhật công việc thành công')
      // Sync local drawer selection
      selectedTask.value.title = editTaskForm.title
      selectedTask.value.description = editTaskForm.description
      selectedTask.value.assigned_to = editTaskForm.assigned_to
      selectedTask.value.due_date = editTaskForm.due_date
    },
  })
}

const submitEvaluation = () => {
  evalForm.put(`/monthly-plans/${props.plan.id}/tasks/${selectedTask.value.id}/evaluate`, {
    preserveState: true,
    onSuccess: () => {
      message.success('Đã lưu đánh giá công việc')
      // Sync local drawer selection
      selectedTask.value.evaluation = evalForm.evaluation
      selectedTask.value.evaluation_reason = evalForm.evaluation_reason
    },
  })
}

const deleteTask = () => {
  router.delete(`/monthly-plans/${props.plan.id}/tasks/${selectedTask.value.id}`, {
    onSuccess: () => {
      showDetailDrawer.value = false
      message.success('Đã xóa công việc')
    },
  })
}

// ─── Native Drag and Drop Logic ───
const onDragStart = (event, task) => {
  event.dataTransfer.setData('text/plain', task.id)
  event.dataTransfer.effectAllowed = 'move'
}

const onDragLeave = (event) => {
  // Clear highlighted active column when dragging away
  // Event targets can bubble, we only clear if it really exited
  const rect = event.currentTarget.getBoundingClientRect()
  const x = event.clientX
  const y = event.clientY
  
  if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
    activeDragColumn.value = null
  }
}

const onDrop = (event, newStatus) => {
  activeDragColumn.value = null
  const taskId = event.dataTransfer.getData('text/plain')
  if (!taskId) return

  // Find task in local plan data
  const task = props.plan.tasks.find(t => String(t.id) === String(taskId))
  if (!task) return

  // If status is the same, do nothing
  if (task.status === newStatus) return

  // Check permissions: only admin/pm or assigned employee can move status
  const canMove = props.canManage || task.assigned_to === props.currentUserId

  if (!canMove) {
    message.error('Bạn không có quyền chuyển trạng thái công việc này (Chỉ dành cho Admin, PM hoặc Người phụ trách).')
    return
  }

  // Optimistic UI Update (feel fast!)
  const oldStatus = task.status
  task.status = newStatus

  // Send request
  router.put(`/monthly-plans/${props.plan.id}/tasks/${task.id}/status`, { status: newStatus }, {
    preserveState: true,
    onError: () => {
      // Revert on error
      task.status = oldStatus
      message.error('Gặp lỗi khi cập nhật trạng thái công việc.')
    },
    onSuccess: () => {
      message.success(`Đã chuyển công việc sang "${taskStatusLabels[newStatus]}"`)
    }
  })
}

const fmtDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('vi-VN')
}

const fmtDateShort = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  return `${date.getDate()}/${date.getMonth() + 1}`
}
</script>

<style scoped>
/* Card transition animations */
.card-list-move,
.card-list-enter-active,
.card-list-leave-active {
  transition: all 0.3s ease;
}

.card-list-enter-from,
.card-list-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

.card-list-leave-active {
  position: absolute;
}
</style>
