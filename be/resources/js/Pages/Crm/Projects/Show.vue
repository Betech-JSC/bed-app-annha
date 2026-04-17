<template>
  <Head :title="`Dự án: ${project.name}`" />

  <!-- Global Loading Bar -->
  <Transition name="loading-bar">
    <div v-if="pageLoading" class="fixed top-0 left-0 right-0 z-[9999]">
      <div class="h-[3px] bg-gradient-to-r from-blue-400 via-blue-600 to-indigo-600 loading-bar-animation"></div>
    </div>
  </Transition>

  <div class="crm-project-details-container min-h-screen bg-gray-50/10 p-2 lg:p-6">
    <Transition name="fade" appear>
      <div v-if="showSuccess" class="fixed top-20 right-8 z-[100] flex items-center gap-3 bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-emerald-200 animate-slide-in">
        <CheckCircleFilled class="text-xl" />
        <span class="font-bold tracking-tight">Cập nhật dự án thành công!</span>
      </div>
    </Transition>

    <div class="lg:grid lg:grid-cols-4 lg:gap-6 items-start">
      <!-- Left Column: Main Content -->
      <div class="lg:col-span-3 space-y-5">
        <!-- Simplified Project Header -->
        <div class="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-4 min-w-0 flex-1">
              <a-button type="text" size="small" @click="router.visit('/projects')" class="flex-shrink-0"><ArrowLeftOutlined /></a-button>
              <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/50 flex-shrink-0">
                <span class="text-white text-lg font-bold">{{ (project.name || '?')[0] }}</span>
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2.5 flex-wrap">
                  <h1 class="text-xl font-extrabold text-gray-800 truncate">{{ project.name }}</h1>
                  <a-tag :color="statusColors[project.status]" class="rounded-full text-xs flex-shrink-0">{{ statusLabels[project.status] }}</a-tag>
                </div>
                <div class="text-xs text-gray-400 mt-0.5 truncate">{{ project.code }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <a-button v-if="can('project.update')" @click="openEditProject" class="flex-shrink-0 rounded-lg">
                <template #icon><EditOutlined /></template>Chỉnh sửa
              </a-button>
            </div>
          </div>
        </div>

        <!-- Tab Content Container -->
        <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <!-- Category Group Navigation -->
          <div class="flex items-center gap-1.5 px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white overflow-x-auto">
            <button v-for="g in tabGroups" :key="g.key"
              @click="activeTabGroup = g.key; activeTab = g.defaultTab"
              class="group flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 whitespace-nowrap border"
              :class="activeTabGroup === g.key ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200/50' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'">
              <span class="text-sm">{{ g.icon }}</span>
              <span>{{ g.label }}</span>
              <span v-if="g.badge > 0"
                class="ml-0.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                :class="activeTabGroup === g.key ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'">{{ g.badge > 99 ? '99+' : g.badge }}</span>
            </button>
          </div>
          <a-tabs v-model:activeKey="activeTab" class="crm-detail-tabs">

      <!-- ============ GANTT / CPM TAB (Sprint 1) ============ -->
      <a-tab-pane key="gantt" v-if="isTabVisible('gantt')">
        <template #tab><a-tooltip title="Biểu đồ Gantt, CPM đường găng, cảnh báo chậm tiến độ, đề xuất hiệu chỉnh" placement="bottom">Gantt/CPM</a-tooltip></template>
        <div class="p-4 space-y-4">

          <!-- Action Bar -->
          <div class="flex justify-between items-center">
            <div class="flex gap-2">
              <a-button size="small" :type="ganttView === 'chart' ? 'primary' : 'default'" @click="ganttView = 'chart'">Biểu đồ Gantt</a-button>
              <a-button size="small" :type="ganttView === 'cpm' ? 'primary' : 'default'" @click="loadCPMData(); ganttView = 'cpm'">Đường găng (CPM)</a-button>
              <a-button size="small" :type="ganttView === 'warnings' ? 'primary' : 'default'" @click="loadDelayWarnings(); ganttView = 'warnings'">
                <template v-if="delayWarnings.length"><a-badge :count="delayWarnings.length" :offset="[8, -4]" /></template>
                Cảnh báo
              </a-button>
              <a-button size="small" :type="ganttView === 'comparison' ? 'primary' : 'default'" @click="loadProgressComparison(); ganttView = 'comparison'">KH vs TT</a-button>
              <a-button size="small" :type="ganttView === 'adjustments' ? 'primary' : 'default'" @click="loadScheduleAdjustments(); ganttView = 'adjustments'">Hiệu chỉnh</a-button>
            </div>
            <div class="flex gap-2">
              <a-button size="small" @click="showImportWbs = true"><template #icon><PlusOutlined /></template>Import WBS Template</a-button>
              <a-button size="small" type="primary" @click="loadGanttData()" :loading="ganttLoading"><template #icon><CalendarOutlined /></template>Refresh</a-button>
            </div>
          </div>

          <!-- GANTT CHART VIEW -->
          <div v-if="ganttView === 'chart'">
            <div v-if="ganttLoading" class="py-12 text-center"><a-spin size="large" /></div>
            <div v-else-if="ganttTasks.length === 0" class="py-12 text-center text-gray-400">
              <a-empty description="Chưa có dữ liệu Gantt — vui lòng tạo công việc hoặc import WBS template" />
            </div>
            <div v-else class="border rounded-xl overflow-hidden">
              <table class="w-full text-xs">
                <thead>
                  <tr class="bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-600 border-b">
                    <th class="text-left py-2 px-3 sticky left-0 bg-blue-50 min-w-[220px]">Công việc</th>
                    <th class="text-center py-2 px-2 min-w-[60px]">Ngày bắt đầu</th>
                    <th class="text-center py-2 px-2 min-w-[60px]">Ngày kết thúc</th>
                    <th class="text-center py-2 px-2 min-w-[50px]">Ngày</th>
                    <th class="text-center py-2 px-2 min-w-[90px]">Tiến độ</th>
                    <th class="text-center py-2 px-2 min-w-[70px]">Trạng thái</th>
                    <th class="text-center py-2 px-2 min-w-[60px]">Phụ thuộc</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="task in ganttTasks" :key="task.id" class="border-b hover:bg-blue-50/30 transition-colors"
                    :class="{ 'bg-red-50/40 font-semibold': task.is_critical, 'bg-gray-50/50': task.is_parent }">
                    <td class="py-2 px-3 sticky left-0 bg-white" :style="{ paddingLeft: (task.level || 0) * 16 + 12 + 'px' }">
                      <div class="flex items-center gap-1.5">
                        <span v-if="task.is_critical" class="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Đường găng"></span>
                        <span class="truncate">{{ task.name }}</span>
                      </div>
                    </td>
                    <td class="text-center py-2 px-2 text-gray-500">{{ fmtDate(task.start_date) }}</td>
                    <td class="text-center py-2 px-2 text-gray-500">{{ fmtDate(task.end_date) }}</td>
                    <td class="text-center py-2 px-2">{{ task.duration || '—' }}</td>
                    <td class="py-2 px-2">
                      <a-progress :percent="Number(task.progress || task.progress_percentage || 0)" size="small"
                        :stroke-color="Number(task.progress || task.progress_percentage || 0) >= 100 ? '#10B981' : task.is_critical ? '#EF4444' : '#3B82F6'" />
                    </td>
                    <td class="text-center py-2 px-2">
                      <a-tag :color="taskStatusColors[task.status] || 'default'" class="text-[10px] rounded-full">{{ taskStatusLabels[task.status] || task.status }}</a-tag>
                    </td>
                    <td class="text-center py-2 px-2 text-gray-400">{{ task.dependencies?.length || 0 }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- CPM VIEW -->
          <div v-else-if="ganttView === 'cpm'">
            <div v-if="cpmLoading" class="py-12 text-center"><a-spin size="large" /></div>
            <div v-else>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <div class="text-2xl font-bold text-red-600">{{ cpmData.critical_tasks?.length || 0 }}</div>
                  <div class="text-xs text-red-500">Công việc trên đường găng</div>
                </div>
                <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <div class="text-2xl font-bold text-blue-600">{{ cpmData.total_duration || 0 }}</div>
                  <div class="text-xs text-blue-500">Tổng ngày (đường găng)</div>
                </div>
                <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div class="text-2xl font-bold text-green-600">{{ (cpmData.all_nodes || []).filter(n => n.TF > 0).length }}</div>
                  <div class="text-xs text-green-500">Công việc có dự trữ</div>
                </div>
                <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <div class="text-2xl font-bold text-amber-600">{{ cpmData.total_duration || '—' }} ngày</div>
                  <div class="text-xs text-amber-500">Tổng thời gian dự án</div>
                </div>
              </div>
              <div class="border rounded-xl overflow-hidden">
                <div class="bg-gradient-to-r from-red-50 to-orange-50 px-4 py-2 text-xs font-semibold text-red-700 border-b">🔴 Đường găng — Critical Path</div>
                <table class="w-full text-xs">
                  <thead><tr class="bg-gray-50 text-gray-500 border-b">
                    <th class="text-left py-2 px-3">Công việc</th><th class="text-center py-2 px-2">ES</th><th class="text-center py-2 px-2">EF</th>
                    <th class="text-center py-2 px-2">LS</th><th class="text-center py-2 px-2">LF</th><th class="text-center py-2 px-2">Float</th><th class="text-center py-2 px-2">Duration</th>
                  </tr></thead>
                  <tbody>
                    <tr v-for="item in (cpmData.critical_tasks || [])" :key="item.id" class="border-b bg-red-50/30">
                      <td class="py-2 px-3 font-medium text-red-700">{{ item.name }}</td>
                      <td class="text-center py-2 px-2">{{ item.ES }}</td>
                      <td class="text-center py-2 px-2">{{ item.EF }}</td>
                      <td class="text-center py-2 px-2">{{ item.LS }}</td>
                      <td class="text-center py-2 px-2">{{ item.LF }}</td>
                      <td class="text-center py-2 px-2 font-bold text-red-600">0</td>
                      <td class="text-center py-2 px-2">{{ item.duration }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- DELAY WARNINGS VIEW -->
          <div v-else-if="ganttView === 'warnings'">
            <div v-if="delayWarnings.length === 0" class="py-8 text-center">
              <div class="text-4xl mb-2">✅</div>
              <div class="text-gray-500">Không có cảnh báo chậm tiến độ</div>
            </div>
            <div v-else class="space-y-3">
              <div v-for="warning in delayWarnings" :key="warning.task_id"
                class="border rounded-xl p-4 hover:shadow-sm transition-shadow"
                :class="warning.priority === 'high' ? 'border-red-300 bg-red-50/50' : warning.priority === 'medium' ? 'border-orange-300 bg-orange-50/50' : 'border-yellow-200 bg-yellow-50/50'">
                <div class="flex items-start justify-between">
                  <div>
                    <div class="font-semibold text-gray-800">{{ warning.task_name }}</div>
                    <div class="text-xs text-gray-500 mt-1">
                      Kế hoạch: {{ warning.expected_progress?.toFixed(1) }}% — Thực tế: {{ warning.actual_progress?.toFixed(1) }}%
                    </div>
                  </div>
                  <a-tag :color="warning.priority === 'high' ? 'red' : warning.priority === 'medium' ? 'orange' : 'gold'" class="rounded-full">
                    Chậm {{ warning.delay_days }} ngày
                  </a-tag>
                </div>
                <div class="mt-2">
                  <a-progress :percent="Number(warning.actual_progress || 0)" :success="{ percent: Number(warning.expected_progress || 0) }" size="small" />
                </div>
              </div>
            </div>
          </div>

          <!-- PROGRESS COMPARISON VIEW -->
          <div v-else-if="ganttView === 'comparison'">
            <div v-if="progressComparisonData.length === 0" class="py-8 text-center text-gray-400"><a-empty description="Chưa có dữ liệu so sánh" /></div>
            <div v-else>
              <div class="border rounded-xl overflow-hidden">
                <table class="w-full text-xs">
                  <thead><tr class="bg-gradient-to-r from-green-50 to-blue-50 text-gray-600 border-b">
                    <th class="text-left py-2 px-3">Hạng mục</th>
                    <th class="text-center py-2 px-2">% Kế hoạch</th>
                    <th class="text-center py-2 px-2">% Thực tế</th>
                    <th class="text-center py-2 px-2">Chênh lệch</th>
                    <th class="text-center py-2 px-2">Trạng thái</th>
                  </tr></thead>
                  <tbody>
                    <tr v-for="item in progressComparisonData" :key="item.id" class="border-b hover:bg-gray-50">
                      <td class="py-2 px-3">{{ item.name }}</td>
                      <td class="text-center py-2 px-2">{{ item.planned_progress?.toFixed(1) }}%</td>
                      <td class="text-center py-2 px-2 font-medium">{{ item.actual_progress?.toFixed(1) }}%</td>
                      <td class="text-center py-2 px-2" :class="(item.actual_progress - item.planned_progress) >= 0 ? 'text-green-600' : 'text-red-600'">
                        {{ (item.actual_progress - item.planned_progress) >= 0 ? '+' : '' }}{{ (item.actual_progress - item.planned_progress)?.toFixed(1) }}%
                      </td>
                      <td class="text-center py-2 px-2">
                        <a-tag :color="item.gap <= 0 ? 'green' : 'red'" class="text-[10px] rounded-full">
                          {{ item.gap <= 0 ? 'Đúng tiến độ' : `Chậm ${item.delay_days} ngày` }}
                        </a-tag>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- SCHEDULE ADJUSTMENTS VIEW -->
          <div v-else-if="ganttView === 'adjustments'">
            <a-table :columns="adjustmentCols" :data-source="scheduleAdjustments" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'task'">{{ record.task?.name || '—' }}</template>
                <template v-else-if="column.key === 'reason'">
                  <a-tooltip :title="record.reason"><span class="truncate block max-w-[200px]">{{ record.reason }}</span></a-tooltip>
                </template>
                <template v-else-if="column.key === 'proposed'">
                  <span class="text-xs">{{ fmtDate(record.proposed_start_date) }} → {{ fmtDate(record.proposed_end_date) }}</span>
                </template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="record.status === 'approved' ? 'green' : record.status === 'rejected' ? 'red' : 'orange'" class="rounded-full text-[10px]">
                    {{ record.status === 'approved' ? 'Đã duyệt' : record.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt' }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <div v-if="record.status === 'pending'" class="flex gap-1">
                    <a-popconfirm title="Duyệt hiệu chỉnh tiến độ này?" @confirm="approveAdjustment(record.id)">
                      <a-button type="primary" size="small" ghost><CheckOutlined /></a-button>
                    </a-popconfirm>
                    <a-popconfirm title="Từ chối?" @confirm="rejectAdjustment(record.id)">
                      <a-button danger size="small" ghost><CloseOutlined /></a-button>
                    </a-popconfirm>
                  </div>
                  <span v-else class="text-gray-300">—</span>
                </template>
              </template>
            </a-table>
          </div>

        </div>
      </a-tab-pane>

      <!-- ============ PROGRESS / TASKS TAB ============ -->
      <a-tab-pane key="progress" v-if="isTabVisible('progress')">
        <template #tab><a-tooltip title="Quản lý công việc, phân công và theo dõi tiến độ thi công theo WBS" placement="bottom">Tiến độ ({{ counts.tasks || 0 }})</a-tooltip></template>
        <div class="p-4">
          <!-- Stats Cards -->
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center border border-blue-200">
              <div class="text-2xl font-bold text-blue-700">{{ taskStats.total }}</div>
              <div class="text-xs text-blue-500">Tổng công việc</div>
            </div>
            <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 text-center border border-gray-200">
              <div class="text-2xl font-bold text-gray-600">{{ taskStats.not_started }}</div>
              <div class="text-xs text-gray-500">Chưa bắt đầu</div>
            </div>
            <div class="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl p-3 text-center border border-cyan-200">
              <div class="text-2xl font-bold text-cyan-700">{{ taskStats.in_progress }}</div>
              <div class="text-xs text-cyan-500">Đang thực hiện</div>
            </div>
            <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 text-center border border-orange-200">
              <div class="text-2xl font-bold text-orange-600">{{ taskStats.delayed }}</div>
              <div class="text-xs text-orange-500">Trễ tiến độ</div>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 text-center border border-green-200">
              <div class="text-2xl font-bold text-green-700">{{ taskStats.completed }}</div>
              <div class="text-xs text-green-500">Hoàn thành</div>
            </div>
          </div>

          <!-- Add Root Task Button -->
          <div class="flex justify-between items-center mb-3">
            <div class="text-sm text-gray-500">
              <a-progress :percent="overallTaskProgress" :stroke-color="{ '0%': '#1B4F72', '100%': '#27AE60' }" :format="p => `${p.toFixed(1)}%`" style="width: 280px" />
            </div>
            <a-button v-if="can('project.task.create')" type="primary" size="small" @click="openTaskModal()">
              <template #icon><PlusOutlined /></template>Thêm công việc
            </a-button>
          </div>

          <!-- Task Tree Table -->
          <div class="border rounded-xl overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gray-50 text-gray-500 text-xs border-b">
                  <th class="text-left py-2 px-3 w-[40%]">Tên công việc</th>
                  <th class="text-center py-2 px-3 w-[10%]">Ưu tiên</th>
                  <th class="text-center py-2 px-3 w-[10%]">Trạng thái</th>
                  <th class="text-center py-2 px-3 w-[15%]">Tiến độ</th>
                  <th class="text-center py-2 px-3 w-[10%]">Thời gian</th>
                  <th class="text-center py-2 px-3 w-[8%]">Người GV</th>
                  <th class="text-center py-2 px-3 w-[7%]"></th>
                </tr>
              </thead>
              <tbody v-if="rootTasks.length">
                <template v-for="task in rootTasks" :key="task.id">
                  <!-- Parent Row -->
                  <tr class="border-b hover:bg-blue-50/50 transition-colors cursor-pointer" :class="task.children?.length ? 'bg-blue-50/30 font-semibold' : ''" @click="toggleExpand(task.id)">
                    <td class="py-2 px-3">
                      <div class="flex items-center gap-2">
                        <span v-if="task.children?.length" class="text-gray-400 text-xs transition-transform" :class="expandedTasks.has(task.id) ? 'rotate-90' : ''">▶</span>
                        <span v-else class="w-3"></span>
                        <span :class="task.children?.length ? 'font-bold text-blue-900' : ''">{{ task.name }}</span>
                        <span v-if="task.children?.length" class="text-xs text-blue-400 font-normal">({{ task.children.length }})</span>
                      </div>
                    </td>
                    <td class="text-center py-2 px-3"><a-tag :color="priorityColors[task.priority]" class="rounded-full text-xs">{{ priorityLabels[task.priority] || task.priority }}</a-tag></td>
                    <td class="text-center py-2 px-3"><a-tag :color="taskStatusColors[task.status]" class="rounded-full text-xs">{{ taskStatusLabels[task.status] || task.status }}</a-tag></td>
                    <td class="py-2 px-3">
                      <a-progress :percent="parseFloat(task.progress_percentage || 0)" size="small" :stroke-color="parseFloat(task.progress_percentage || 0) >= 100 && isAccepted(task) ? '#27AE60' : (parseFloat(task.progress_percentage || 0) >= 100 ? '#FAAD14' : '#1B4F72')" />
                      <div v-if="parseFloat(task.progress_percentage || 0) >= 100 && !isAccepted(task)" class="text-[10px] text-amber-500 mt-0.5 font-bold flex items-center gap-1">
                        <ClockCircleOutlined /> Đang chờ nghiệm thu
                      </div>
                    </td>
                    <td class="text-center py-2 px-3 text-xs text-gray-500">
                      <span v-if="task.start_date">{{ fmtDate(task.start_date) }}</span>
                      <span v-if="task.start_date && task.end_date"> ~ </span>
                      <span v-if="task.end_date">{{ fmtDate(task.end_date) }}</span>
                      <span v-if="!task.start_date && !task.end_date" class="text-gray-300">—</span>
                    </td>
                    <td class="text-center py-2 px-3 text-xs">{{ task.assigned_user?.name || '—' }}</td>
                    <td class="text-center py-2 px-3" @click.stop>
                      <div class="flex gap-1 justify-center">
                        <a-tooltip v-if="!task.children?.length && can('log.create')" title="Ghi nhật ký">
                          <a-button type="text" size="small" @click.stop="openLogModal(null, task.id)" class="text-blue-500 hover:bg-blue-50"><FileAddOutlined /></a-button>
                        </a-tooltip>
                        <a-tooltip title="Sửa"><a-button type="text" size="small" @click.stop="openTaskModal(task)"><EditOutlined /></a-button></a-tooltip>
                        <a-popconfirm title="Xóa công việc?" @confirm="deleteTask(task)"><a-button type="text" size="small" danger @click.stop><DeleteOutlined /></a-button></a-popconfirm>
                      </div>
                    </td>
                  </tr>
                  <!-- Children Rows -->
                    <template v-for="child in task.children" :key="child.id">
                      <tr class="border-b hover:bg-gray-50 transition-colors cursor-pointer" @click="toggleExpand(child.id)">
                        <td class="py-2 px-3 pl-10">
                          <div class="flex items-center gap-1">
                            <span v-if="child.children?.length" class="text-gray-400 text-[10px] transition-transform mr-1" :class="expandedTasks.has(child.id) ? 'rotate-90' : ''">▶</span>
                            <span v-else class="text-gray-300 mr-1">└</span>
                            <span :class="child.children?.length ? 'font-semibold text-gray-800' : 'text-gray-600'">{{ child.name }}</span>
                            <span v-if="child.children?.length" class="text-[10px] text-gray-400 ml-1">({{ child.children.length }})</span>
                          </div>
                        </td>
                        <td class="text-center py-2 px-3"><a-tag :color="priorityColors[child.priority]" class="rounded-full text-xs">{{ priorityLabels[child.priority] || child.priority }}</a-tag></td>
                        <td class="text-center py-2 px-3"><a-tag :color="taskStatusColors[child.status]" class="rounded-full text-xs">{{ taskStatusLabels[child.status] || child.status }}</a-tag></td>
                        <td class="py-2 px-3">
                          <a-progress :percent="parseFloat(child.progress_percentage || 0)" size="small" :stroke-color="parseFloat(child.progress_percentage || 0) >= 100 && isAccepted(child) ? '#27AE60' : (parseFloat(child.progress_percentage || 0) >= 100 ? '#FAAD14' : '#2E86C1')" />
                          <div v-if="parseFloat(child.progress_percentage || 0) >= 100 && !isAccepted(child)" class="text-[10px] text-amber-500 mt-0.5 font-bold flex items-center gap-1">
                            <ClockCircleOutlined /> Đang chờ nghiệm thu
                          </div>
                        </td>
                        <td class="text-center py-2 px-3 text-xs text-gray-500">
                          <span v-if="child.start_date">{{ fmtDate(child.start_date) }}</span>
                          <span v-if="child.start_date && child.end_date"> ~ </span>
                          <span v-if="child.end_date">{{ fmtDate(child.end_date) }}</span>
                        </td>
                        <td class="text-center py-2 px-3 text-xs">{{ child.assigned_user?.name || '—' }}</td>
                        <td class="text-center py-2 px-3" @click.stop>
                          <div class="flex gap-1 justify-center">
                            <a-tooltip v-if="!child.children?.length && can('log.create')" title="Ghi nhật ký">
                              <a-button type="text" size="small" @click.stop="openLogModal(null, child.id)" class="text-blue-500 hover:bg-blue-50"><FileAddOutlined /></a-button>
                            </a-tooltip>
                            <a-tooltip title="Sửa"><a-button type="text" size="small" @click="openTaskModal(child)"><EditOutlined /></a-button></a-tooltip>
                            <a-popconfirm title="Xóa?" @confirm="deleteTask(child)"><a-button type="text" size="small" danger><DeleteOutlined /></a-button></a-popconfirm>
                          </div>
                        </td>
                      </tr>
                      <!-- Grandchildren (3rd level) -->
                      <template v-if="expandedTasks.has(child.id) && child.children?.length">
                        <tr v-for="sub in child.children" :key="sub.id" class="border-b hover:bg-gray-50/80 transition-colors bg-gray-50/20">
                          <td class="py-1.5 px-3 pl-16">
                            <div class="flex items-center gap-1 text-gray-500 italic text-[13px]">
                              <span class="text-gray-300 mr-1">└─</span>
                              {{ sub.name }}
                            </div>
                          </td>
                          <td class="text-center py-1.5 px-3"><span class="text-[11px] text-gray-400">{{ priorityLabels[sub.priority] }}</span></td>
                          <td class="text-center py-1.5 px-3"><a-tag :color="taskStatusColors[sub.status]" class="scale-90 opacity-75">{{ taskStatusLabels[sub.status] }}</a-tag></td>
                          <td class="py-1.5 px-3">
                            <a-progress :percent="parseFloat(sub.progress_percentage || 0)" size="small" stroke-width="2" style="width: 80px" />
                          </td>
                          <td class="text-center py-1.5 px-3 text-[10px] text-gray-400">{{ fmtDate(sub.start_date) }} - {{ fmtDate(sub.end_date) }}</td>
                          <td class="text-center py-1.5 px-3 text-[11px]">{{ sub.assigned_user?.name || '—' }}</td>
                          <td class="text-center py-1.5 px-3" @click.stop>
                            <div class="flex gap-1 justify-center">
                              <a-button type="text" size="small" @click="openTaskModal(sub)" class="scale-75"><EditOutlined /></a-button>
                              <a-button type="text" size="small" danger @click="deleteTask(sub)" class="scale-75"><DeleteOutlined /></a-button>
                            </div>
                          </td>
                        </tr>
                      </template>
                      <!-- Add grandchild button -->
                      <tr v-if="can('project.task.create') && expandedTasks.has(child.id)" class="border-b">
                        <td class="py-1 px-3 pl-16" colspan="7">
                          <a-button type="dashed" size="small" class="text-[10px] text-gray-400 border-gray-200" @click="openTaskModal(null, child.id)">
                            <template #icon><PlusOutlined /></template>Thêm mục con
                          </a-button>
                        </td>
                      </tr>
                    </template>
                    <!-- Add child task row -->
                    <tr v-if="can('project.task.create')" class="border-b bg-blue-50/10">
                      <td class="py-1 px-3 pl-10" colspan="7">
                        <a-button type="dashed" size="small" class="text-xs text-blue-500 border-blue-100" @click="openTaskModal(null, task.id)">
                          <template #icon><PlusOutlined /></template>Thêm hạng mục con
                        </a-button>
                      </td>
                    </tr>
                  </template>
                </tbody>
                <tbody v-else>
                  <tr>
                    <td colspan="7" class="py-12 text-center text-gray-400">
                      <div class="flex flex-col items-center justify-center gap-2">
                        <InboxOutlined class="text-3xl" />
                        <span>Không có công việc nào trong dự án này</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
            </table>
          </div>
        </div>
      </a-tab-pane>

      <!-- ============ CONTRACT TAB ============ -->
      <a-tab-pane key="contract" v-if="isTabVisible('contract')">
        <template #tab><a-tooltip title="Quản lý hợp đồng dự án: giá trị, ngày ký, trạng thái duyệt" placement="bottom">Hợp đồng</a-tooltip></template>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-bold text-gray-700">Hợp đồng</h4>
            <div class="flex items-center gap-2">
              <a-button v-if="project.contract" size="small" @click="openContractDetail(project.contract)">
                <template #icon><EyeOutlined /></template>Chi tiết
              </a-button>
              <a-button v-if="!project.contract && can('contract.create')" type="primary" size="small" @click="openContractModal(null)">
                <template #icon><PlusOutlined /></template>Tạo hợp đồng
              </a-button>
              <a-button v-if="project.contract && can('contract.update')" size="small" @click="openContractModal(project.contract)">
                <template #icon><EditOutlined /></template>Sửa
              </a-button>
            </div>
          </div>
          <div v-if="project.contract" class="space-y-2 text-sm">
            <div class="flex justify-between cursor-pointer hover:bg-gray-50 p-2 rounded-lg -mx-2 transition" @click="openContractDetail(project.contract)">
              <span class="text-gray-400">Giá trị</span><span class="font-bold text-lg">{{ fmt(project.contract.contract_value) }}</span>
            </div>
            <div class="flex justify-between"><span class="text-gray-400">Ngày ký</span><span>{{ fmtDate(project.contract.signed_date) }}</span></div>
            <div class="flex justify-between"><span class="text-gray-400">Trạng thái</span><a-tag :color="contractStatusColors[project.contract.status]" class="rounded-full">{{ contractStatusLabels[project.contract.status] || project.contract.status }}</a-tag></div>

            <!-- Contract File Attachments -->
            <div v-if="project.contract.attachments?.length" class="mt-4 pt-4 border-t border-gray-100">
              <div class="text-xs font-semibold text-gray-600 mb-3 flex items-center gap-1.5">
                <FileOutlined class="text-blue-500" /> Tệp hợp đồng đính kèm ({{ project.contract.attachments.length }})
              </div>
              <div class="flex flex-wrap gap-2">
                <a v-for="att in project.contract.attachments" :key="att.id" href="#" @click.prevent="openFilePreview(att)"
                   class="inline-flex items-center gap-2 text-xs bg-blue-50 text-blue-600 px-3 py-2 rounded-lg hover:bg-blue-100 transition border border-blue-100 cursor-pointer group">
                  <span class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[9px] font-bold"
                    :style="{ backgroundColor: fileExtColor(att) }">{{ fileExt(att).toUpperCase().slice(0,3) }}</span>
                  <div class="flex flex-col">
                    <span class="font-medium group-hover:underline truncate max-w-[180px]">{{ att.original_name || att.file_name }}</span>
                    <span v-if="att.file_size" class="text-[10px] text-gray-400">{{ formatFileSize(att.file_size) }}</span>
                  </div>
                  <EyeOutlined class="text-blue-400 ml-1" />
                </a>
              </div>
            </div>
            <div v-else class="mt-4 pt-4 border-t border-gray-100">
              <div class="text-xs text-gray-400 flex items-center gap-1">
                <FileOutlined /> Chưa có tệp đính kèm — bấm "Sửa" để upload file hợp đồng
              </div>
            </div>
          </div>
          <a-empty v-else description="Chưa có hợp đồng" />
        </div>
      </a-tab-pane>

      <!-- ============ COSTS TAB (Renamed to Phiếu chi) ============ -->
      <a-tab-pane key="costs" v-if="isTabVisible('costs')">
        <template #tab><a-tooltip title="Quản lý phiếu chi: tạo, gửi duyệt BĐH → KT xác nhận, đính kèm chứng từ" placement="bottom">Phiếu chi ({{ counts.costs || 0 }})</a-tooltip></template>
        <div class="p-4">
          <!-- Premium Header for Phiếu chi -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Tổng chi phí</div>
              <div class="text-xl font-bold text-red-500">{{ fmt(totalCosts) }}</div>
            </div>
            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Chờ duyệt</div>
              <div class="text-xl font-bold text-orange-500">{{ costs.filter(c => ['pending_management_approval','pending_accountant_approval'].includes(c.status)).length }} <span class="text-xs font-normal text-gray-400">phiếu</span></div>
            </div>
            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center">
              <a-select v-model:value="costGroupFilter" size="small" class="w-full" allow-clear placeholder="Lọc theo nhóm">
                <a-select-option value="all">Tất cả nhóm</a-select-option>
                <a-select-option v-for="g in allFilterGroups" :key="g.id" :value="g.id">{{ g.name }}</a-select-option>
              </a-select>
            </div>
            <div class="flex items-center justify-end">
              <!-- Removed manual cost creation to maintain DB integrity as per request -->
            </div>
          </div>

          <!-- Status Filters -->
          <div class="flex gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar">
            <button v-for="s in ['all','draft','pending','approved','rejected']" :key="s" @click="costStatusFilter = s" 
                    :class="[costStatusFilter === s ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100']"
                    class="px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap">
              {{ s === 'all' ? 'Tất cả' : s === 'draft' ? 'Nháp' : s === 'pending' ? 'Chờ duyệt' : s === 'approved' ? 'Đã duyệt' : 'Từ chối' }}
            </button>
          </div>
          <a-table :columns="costCols" :data-source="filteredCosts" :pagination="{ pageSize: 10, showTotal: (t) => `${t} phiếu` }" row-key="id" size="small" class="crm-table hover-row" :custom-row="(record) => ({ onClick: () => openCostDetail(record), style: 'cursor: pointer' })">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <div class="flex items-center gap-1.5 min-w-0">
                  <span class="truncate">{{ record.name }}</span>
                  <a-tag v-if="record.attendance_id" color="teal" class="rounded-full text-[10px] shrink-0" style="font-size:10px;padding:0 5px;line-height:18px;">Nhân công</a-tag>
                </div>
              </template>
              <template v-else-if="column.key === 'amount'"><span class="font-semibold text-red-500">{{ fmt(record.amount) }}</span></template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="costStatusColors[record.status]" class="rounded-full text-xs">{{ costStatusLabels[record.status] || record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'creator'">
                <div class="text-[11px]">
                  <div class="font-medium text-gray-700">{{ record.creator?.name || '—' }}</div>
                  <div class="text-gray-400 text-[10px]">{{ fmtDateTime(record.created_at) }}</div>
                </div>
              </template>
              <template v-else-if="column.key === 'approver'">
                <div v-if="record.management_approver || record.accountant_approver" class="text-[10px] space-y-0.5">
                  <div v-if="record.management_approver" class="flex items-center gap-1">
                    <CheckCircleOutlined class="text-green-500 text-[9px]" /> 
                    <span class="text-gray-500">BĐH:</span> 
                    <span class="font-medium text-gray-700">{{ record.management_approver.name }}</span>
                  </div>
                  <div v-if="record.accountant_approver" class="flex items-center gap-1">
                    <CheckSquareOutlined class="text-blue-500 text-[9px]" /> 
                    <span class="text-gray-500">KT:</span> 
                    <span class="font-medium text-gray-700">{{ record.accountant_approver.name }}</span>
                  </div>
                </div>
                <span v-else class="text-gray-300">—</span>
              </template>
              <template v-else-if="column.key === 'date'">{{ fmtDate(record.cost_date) }}</template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ PAYMENTS TAB ============ -->
      <a-tab-pane key="payments" v-if="isTabVisible('payments')">
        <template #tab><a-tooltip title="Quản lý đợt thanh toán: KH đánh dấu đã thanh toán → KT xác nhận/từ chối" placement="bottom">Thanh toán ({{ counts.payments || 0 }})</a-tooltip></template>
        <div class="p-4">
          <!-- Premium Header for Payments -->
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Giá trị dự án</div>
              <div class="text-xl font-bold text-gray-800">{{ fmt(project.total_value) }}</div>
            </div>
            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Dòng tiền thu hồi</div>
              <div class="text-xl font-bold text-green-600">{{ fmt(project.total_paid_receivable || 0) }}</div>
            </div>
            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Phải thu còn lại</div>
              <div class="text-xl font-bold text-orange-500">{{ fmt(project.total_value - (project.total_paid_receivable || 0)) }}</div>
            </div>
            <div class="flex items-center justify-end">
              <a-button v-if="can('payment.create')" type="primary" class="h-10 rounded-lg shadow-blue-100 shadow-lg" @click="openPaymentModal()">
                <template #icon><PlusOutlined /></template>Thêm đợt thu
              </a-button>
            </div>
          </div>
          <div class="text-[10px] text-gray-400 bg-gray-50 p-2 rounded-lg border border-dashed mb-4">Lưu ý: KH đánh dấu TT → KT xác nhận chứng từ → Ghi nhận doanh thu thực tế</div>
          <a-table :columns="paymentCols" :data-source="project.payments || []" :pagination="{ pageSize: 10, showTotal: (t) => `${t} đợt` }" row-key="id" size="small" class="crm-table hover-row" :custom-row="(record) => ({ onClick: () => openPaymentDetail(record), style: 'cursor: pointer' })">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'payment_number'">
                <span class="font-semibold text-gray-700">#{{ record.payment_number }}</span>
              </template>
              <template v-else-if="column.key === 'amount'"><span class="font-semibold text-green-600">{{ fmt(record.amount) }}</span></template>
              <template v-else-if="column.key === 'actual_amount'">
                <span v-if="record.actual_amount" class="font-semibold" :class="record.actual_amount >= record.amount ? 'text-green-600' : 'text-orange-500'">{{ fmt(record.actual_amount) }}</span>
                <span v-else-if="record.status === 'confirmed'" class="font-semibold text-green-600">{{ fmt(record.amount) }}</span>
                <span v-else class="text-gray-300">—</span>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="paymentTagColors[record.status]" class="rounded-full text-xs">{{ paymentStatusLabelsMap[record.status] || record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'date'">{{ fmtDate(record.due_date) }}</template>
            </template>
          </a-table>
          <a-empty v-if="!project.payments?.length" description="Chưa có thanh toán" />
        </div>
      </a-tab-pane>

      <!-- ============ PERSONNEL TAB ============ -->
      <a-tab-pane key="personnel" v-if="isTabVisible('personnel')">
        <template #tab><a-tooltip title="Phân công nhân sự tham gia dự án theo vai trò" placement="bottom">Nhân sự ({{ counts.personnel || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('personnel.assign')" type="primary" size="small" @click="openPersonnelModal()">
              <template #icon><PlusOutlined /></template>Phân công
            </a-button>
          </div>
          <a-table :columns="personnelCols" :data-source="project.personnel || []" :pagination="false" row-key="id" size="small" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <div class="flex items-center gap-2">
                  <a-avatar :size="28" class="bg-blue-500 text-white text-xs">{{ record.user?.name?.charAt(0) }}</a-avatar>
                  <div><div class="font-semibold text-sm">{{ record.user?.name }}</div><div class="text-xs text-gray-400">{{ record.user?.email }}</div></div>
                </div>
              </template>
              <template v-else-if="column.key === 'role'">{{ record.personnel_role?.name || '—' }}</template>
              <template v-else-if="column.key === 'actions'">
                <a-popconfirm v-if="can('personnel.remove')" title="Gỡ nhân sự?" @confirm="removePersonnel(record)">
                  <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                </a-popconfirm>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ SUBCONTRACTORS TAB ============ -->
      <a-tab-pane key="subcontractors" v-if="isTabVisible('subcontractors')">
        <template #tab><a-tooltip title="Quản lý nhà thầu phụ: báo giá, tiến độ, thanh toán và đối soát" placement="bottom">Nhà thầu phụ ({{ counts.subcontractors || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('subcontractor.create')" type="primary" size="small" @click="openSubModal(null)">
              <template #icon><PlusOutlined /></template>Thêm NTP
            </a-button>
          </div>
          <a-table :columns="subCols" :data-source="project.subcontractors || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table" :custom-row="(r) => ({ onClick: () => openSubDetail(r), style: 'cursor: pointer' })">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-gray-800">{{ record.name }}</span>
                  <a-tag v-if="record.approved_at" color="green" class="rounded-full text-[10px]">Đã duyệt</a-tag>
                </div>
              </template>
              <template v-else-if="column.key === 'quote'"><span class="font-semibold">{{ fmt(record.total_quote) }}</span></template>
              <template v-else-if="column.key === 'paid'">
                <span class="font-semibold text-green-600">{{ fmt(record.total_paid || 0) }}</span>
              </template>
              <template v-else-if="column.key === 'paidPercent'">
                <a-progress :percent="record.total_quote > 0 ? Math.round((record.total_paid || 0) / record.total_quote * 100) : 0" :size="'small'" :stroke-color="record.total_quote > 0 && (record.total_paid || 0) >= record.total_quote ? '#10B981' : '#3B82F6'" />
              </template>
              <template v-else-if="column.key === 'progress'">
                <a-tag :color="subProgressColors[record.progress_status]" class="rounded-full text-xs">{{ subProgressLabels[record.progress_status] || record.progress_status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'dates'">
                <div class="text-xs text-gray-500">
                  <div v-if="record.progress_start_date">{{ fmtDate(record.progress_start_date) }}</div>
                  <div v-if="record.progress_end_date" class="text-gray-400">→ {{ fmtDate(record.progress_end_date) }}</div>
                </div>
              </template>
            </template>
          </a-table>
          <a-empty v-if="!project.subcontractors?.length" description="Chưa có nhà thầu phụ" />
        </div>
      </a-tab-pane>

      <!-- ============ LOGS TAB ============ -->
      <a-tab-pane key="logs" v-if="isTabVisible('logs')">
        <template #tab><a-tooltip title="Nhật ký thi công: ghi chép hàng ngày về thời tiết, nhân công, tiến độ" placement="bottom">Nhật ký ({{ counts.construction_logs || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('log.create')" type="primary" size="small" @click="openLogModal()">
              <template #icon><PlusOutlined /></template>Thêm nhật ký
            </a-button>
          </div>

          <!-- Compact Log Table -->
          <div v-if="groupedLogs.length === 0" class="text-center text-gray-400 py-8">Chưa có nhật ký thi công</div>
          <div v-else class="border rounded-xl overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-600 text-xs border-b">
                  <th class="text-left py-2.5 px-3 font-semibold">Ngày</th>
                  <th class="text-left py-2.5 px-3 font-semibold">Công việc</th>
                  <th class="text-left py-2.5 px-3 font-semibold">Người ghi</th>
                  <th class="text-center py-2.5 px-2 font-semibold">Thời tiết</th>
                  <th class="text-center py-2.5 px-2 font-semibold">Nhân lực</th>
                  <th class="py-2.5 px-3 font-semibold" style="min-width:120px">Tiến độ</th>
                  <th class="text-center py-2.5 px-2 font-semibold">Ảnh</th>
                  <th class="text-center py-2.5 px-2 font-semibold" style="width:90px"></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="group in groupedLogs" :key="group.date">
                  <tr v-for="(log, idx) in group.logs" :key="log.id"
                      class="border-b border-gray-50 hover:bg-blue-50/40 transition-colors cursor-pointer group/row"
                      @click="openLogDetailDrawer(log)">
                    <!-- Date (only first row per group) -->
                    <td class="py-2.5 px-3 align-top">
                      <div v-if="idx === 0" class="flex items-center gap-1.5">
                        <CalendarOutlined class="text-blue-500 text-xs" />
                        <span class="font-semibold text-gray-800 text-xs whitespace-nowrap">{{ fmtDate(group.date) }}</span>
                      </div>
                    </td>
                    <!-- Task -->
                    <td class="py-2.5 px-3">
                      <span v-if="log.task" class="text-xs text-gray-700 truncate block max-w-[200px]" :title="log.task.name">{{ log.task.name }}</span>
                      <span v-else class="text-xs text-gray-300">—</span>
                    </td>
                    <!-- Creator -->
                    <td class="py-2.5 px-3">
                      <div class="flex items-center gap-2">
                        <div class="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {{ (log.creator?.name || '?')[0] }}
                        </div>
                        <span class="text-xs text-gray-600 truncate max-w-[100px]">{{ log.creator?.name || '—' }}</span>
                      </div>
                    </td>
                    <!-- Weather -->
                    <td class="text-center py-2.5 px-2">
                      <span v-if="log.weather" class="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 whitespace-nowrap">{{ log.weather }}</span>
                      <span v-else class="text-gray-300 text-xs">—</span>
                    </td>
                    <!-- Personnel -->
                    <td class="text-center py-2.5 px-2">
                      <span v-if="log.personnel_count" class="text-xs font-semibold text-gray-700">{{ log.personnel_count }}</span>
                      <span v-else class="text-gray-300 text-xs">—</span>
                    </td>
                    <!-- Progress -->
                    <td class="py-2.5 px-3">
                      <div class="flex items-center gap-2">
                        <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div class="h-full rounded-full transition-all duration-500" :class="(log.completion_percentage || 0) >= 100 ? 'bg-emerald-500' : 'bg-blue-500'" :style="{ width: `${log.completion_percentage || 0}%` }"></div>
                        </div>
                        <span class="text-xs font-bold min-w-[32px] text-right" :class="(log.completion_percentage || 0) >= 100 ? 'text-emerald-600' : 'text-gray-700'">{{ log.completion_percentage || 0 }}%</span>
                      </div>
                    </td>
                    <!-- Attachments count -->
                    <td class="text-center py-2.5 px-2">
                      <span v-if="log.attachments?.length" class="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                        <PictureOutlined class="text-[10px]" /> {{ log.attachments.length }}
                      </span>
                      <span v-else class="text-gray-300 text-xs">—</span>
                    </td>
                    <!-- Actions -->
                    <td class="text-center py-2.5 px-2" @click.stop>
                      <div class="opacity-0 group-hover/row:opacity-100 transition-opacity flex items-center gap-0.5 justify-center">
                        <a-tooltip title="Sửa">
                          <a-button v-if="can('log.update')" type="text" size="small" @click="openLogModal(log)" class="text-gray-400 hover:text-blue-600"><EditOutlined /></a-button>
                        </a-tooltip>
                        <a-popconfirm v-if="can('log.delete')" title="Xóa nhật ký này?" @confirm="deleteLog(log)">
                          <a-button type="text" size="small" danger class="text-gray-400 hover:text-red-500"><DeleteOutlined /></a-button>
                        </a-popconfirm>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </a-tab-pane>

      <!-- ============ ACCEPTANCE TAB ============ -->
      <a-tab-pane key="acceptance" v-if="isTabVisible('acceptance')">
        <template #tab><a-tooltip title="Quản lý nghiệm thu: tạo giai đoạn, duyệt 3 cấp, bộ tài liệu, lỗi ghi nhận" placement="bottom">Nghiệm thu ({{ counts.acceptance_stages || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3 gap-2">
            <a-button v-if="can('acceptance.create')" type="primary" size="small" @click="openAcceptModal()">
              <template #icon><PlusOutlined /></template>Tạo giai đoạn
            </a-button>
          </div>

          <!-- Stage Cards (matching APP's AcceptanceChecklist) -->
          <div v-for="stage in (project.acceptance_stages || [])" :key="stage.id" class="mb-4 rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <!-- Stage Header -->
            <div class="flex items-center justify-between p-4 border-b border-gray-100">
              <div class="flex items-center gap-3 flex-1">
                <!-- Status Icon -->
                <div :class="['w-9 h-9 rounded-xl flex items-center justify-center', getAcceptIconClass(stage.status)]">
                  <CheckCircleOutlined v-if="stage.status?.includes('approved')" class="text-lg" />
                  <CloseCircleOutlined v-else-if="stage.status === 'rejected'" class="text-lg text-red-500" />
                  <span v-else class="text-lg">⏳</span>
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-bold text-gray-800">{{ stage.name }}</span>
                    <!-- Acceptability Status Badge (Giống APP) -->
                    <span :class="['inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                      getAcceptability(stage) === 'acceptable' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700']">
                      <span :class="['w-1.5 h-1.5 rounded-full', getAcceptability(stage) === 'acceptable' ? 'bg-emerald-500' : 'bg-red-500']"></span>
                      {{ getAcceptability(stage) === 'acceptable' ? 'Đạt' : 'Chưa đạt' }}
                    </span>
                  </div>
                  <!-- Task info (linked parent task) -->
                  <div v-if="stage.task" class="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <span>📐</span> {{ stage.task?.name }}
                  </div>
                  <!-- Template info -->
                  <div v-if="stage.acceptance_template" class="flex items-center gap-1 text-xs text-blue-400 mt-0.5">
                    <FileOutlined class="text-[10px]" /> {{ stage.acceptance_template.name }}
                  </div>
                </div>
              </div>
              <!-- Status & Actions -->
              <div class="flex gap-1 items-center flex-shrink-0">
                <a-tag :color="acceptStatusColors[stage.status] || 'default'" class="rounded-full text-xs">{{ acceptStatusLabels[stage.status] || stage.status }}</a-tag>
                <a-tooltip title="Sửa" v-if="can('acceptance.update') && stage.status !== 'owner_approved'">
                  <a-button type="text" size="small" @click="openEditAcceptModal(stage)"><EditOutlined /></a-button>
                </a-tooltip>
                <a-popconfirm v-if="can('acceptance.delete') && stage.status !== 'owner_approved'" title="Xóa?" @confirm="deleteAccept(stage)">
                  <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                </a-popconfirm>
              </div>
            </div>

            <!-- Completion Progress -->
            <div v-if="stage.items?.length" class="px-4 pt-3">
              <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Hoàn thành</span>
                <span class="font-semibold">{{ getAcceptCompletion(stage).approved }}/{{ getAcceptCompletion(stage).total }}</span>
              </div>
              <a-progress :percent="getAcceptCompletion(stage).percent" :size="'small'" :stroke-color="getAcceptCompletion(stage).percent >= 100 ? '#10B981' : '#3B82F6'" :show-info="false" />
            </div>

            <!-- Defect Warning (Giống APP) -->
            <div v-if="getOpenDefects(stage) > 0" class="mx-4 mt-3 px-3 py-2 bg-red-50 rounded-lg border border-red-100 flex items-center gap-2 cursor-pointer hover:bg-red-100 transition" @click="activeTab = 'defects'">
              <span class="text-red-500">⚠️</span>
              <div class="flex-1">
                <div class="text-xs font-semibold text-red-700">Còn {{ getOpenDefects(stage) }} lỗi chưa xử lý</div>
                <div class="text-[10px] text-red-400">Nhấn để xem chi tiết →</div>
              </div>
            </div>

            <!-- Workflow Info (Ai đã duyệt & Bước tiếp theo) -->
            <div class="px-4 py-3 bg-gray-50/50 border-y border-gray-100/50 mt-3 space-y-2">
              <!-- Approvers Info -->
              <div v-if="stage.approval_status_info?.length" class="flex flex-wrap gap-2">
                <div v-for="(info, idx) in stage.approval_status_info" :key="idx" 
                     class="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-100 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                  <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{{ info.role }}:</span>
                  <span class="text-xs font-semibold text-gray-700">{{ info.user }}</span>
                  <span class="text-[10px] text-gray-400">({{ dayjs(info.at).format('DD/MM/YY HH:mm') }})</span>
                </div>
              </div>

              <!-- Next Action -->
              <div v-if="stage.next_action?.label" class="flex items-center gap-2">
                <span class="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1.5 animate-pulse-slow">
                  <div class="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  TIẾP THEO: {{ stage.next_action.label }}
                </span>
                <span v-if="stage.next_action.action" class="text-[11px] text-gray-400 italic">
                  ({{ stage.next_action.action }})
                </span>
              </div>
            </div>

            <!-- Description -->
            <div v-if="stage.description" class="px-4 pt-2 text-sm text-gray-500">{{ stage.description }}</div>

            <!-- Attachments Gallery Categorized -->
            <div v-if="stage.attachments?.length" class="px-4 pt-3">
               <!-- BEFORE IMAGES -->
               <div v-if="stage.attachments.filter(a => a.type === 'before').length" class="mb-3">
                <div class="flex items-center gap-1 text-[10px] font-bold text-orange-600 uppercase mb-1.5 tracking-wider letter-spacing-1">
                  <CameraOutlined class="text-[10px]" /> Hình ảnh TRƯỚC nghiệm thu
                </div>
                <div class="flex gap-2 flex-wrap">
                  <a v-for="att in stage.attachments.filter(a => a.type === 'before')" :key="att.id" href="#" @click.prevent="openFilePreview(att)"
                     class="group relative inline-flex items-center justify-center w-12 h-12 rounded-lg border border-orange-100 overflow-hidden bg-orange-50 hover:border-orange-300 transition shadow-sm">
                    <img v-if="att.mime_type?.startsWith('image/')" :src="att.file_url" class="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                    <FileImageOutlined v-else class="text-orange-300 text-lg" />
                    <div class="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <EyeOutlined class="text-[10px] text-white" />
                    </div>
                  </a>
                </div>
              </div>

               <!-- AFTER IMAGES -->
               <div v-if="stage.attachments.filter(a => a.type === 'after').length" class="mb-3">
                <div class="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase mb-1.5 tracking-wider letter-spacing-1">
                  <CameraOutlined class="text-[10px]" /> Hình ảnh SAU nghiệm thu
                </div>
                <div class="flex gap-2 flex-wrap">
                  <a v-for="att in stage.attachments.filter(a => a.type === 'after')" :key="att.id" href="#" @click.prevent="openFilePreview(att)"
                     class="group relative inline-flex items-center justify-center w-12 h-12 rounded-lg border border-emerald-100 overflow-hidden bg-emerald-50 hover:border-emerald-300 transition shadow-sm">
                    <img v-if="att.mime_type?.startsWith('image/')" :src="att.file_url" class="w-full h-full object-cover group-hover:scale-110 transition duration-300" />
                    <FileImageOutlined v-else class="text-emerald-300 text-lg" />
                    <div class="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <EyeOutlined class="text-[10px] text-white" />
                    </div>
                  </a>
                </div>
              </div>

              <!-- OTHER ATTACHMENTS (DOCS) -->
              <div v-if="stage.attachments.filter(a => a.type !== 'before' && a.type !== 'after').length" class="mb-1">
                <div class="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase mb-1.5 tracking-wider">
                  <FileTextOutlined class="text-[10px]" /> Tài liệu khác
                </div>
                <div class="flex gap-2 flex-wrap">
                  <a v-for="att in stage.attachments.filter(a => a.type !== 'before' && a.type !== 'after')" :key="att.id" href="#" @click.prevent="openFilePreview(att)"
                     class="inline-flex items-center gap-1.5 text-[11px] bg-white text-gray-600 px-2.5 py-1.5 rounded-lg border shadow-sm hover:border-blue-400 hover:text-blue-500 transition cursor-pointer">
                    <PaperClipOutlined class="text-[10px]" /> {{ att.original_name || att.file_name }}
                  </a>
                </div>
              </div>
            </div>

            <!-- Checklist Items (hạng mục nghiệm thu) -->
            <div v-if="stage.items?.length" class="px-4 pt-3 pb-1">
              <div class="text-xs font-semibold text-gray-600 mb-2">Hạng mục ({{ stage.items.length }})</div>
              <div v-for="item in stage.items" :key="item.id" class="flex items-center gap-2 text-sm py-1.5 border-b border-gray-50 last:border-0">
                <a-checkbox :checked="item.workflow_status === 'customer_approved'" disabled />
                <span :class="item.workflow_status === 'customer_approved' ? 'text-gray-400 line-through' : 'text-gray-700'">{{ item.name }}</span>
                <div class="flex items-center gap-2 ml-auto">
                  <a-tag v-if="item.workflow_status && item.workflow_status !== 'pending'" :color="acceptItemStatusColor(item.workflow_status)" class="rounded-full text-[10px]">{{ acceptItemStatusLabel(item.workflow_status) }}</a-tag>
                  <a-button v-if="['pending', 'supervisor_approved', 'project_manager_approved', 'rejected'].includes(item.workflow_status) && (can('acceptance.approve.level_1') || item.created_by === page.props.auth?.user?.id)"
                            type="text" size="small" class="text-orange-500 hover:text-orange-600 p-0 h-auto" @click.stop="revertAcceptItemAction(stage, item)">
                    <ReloadOutlined class="text-[10px]" />
                  </a-button>
                </div>
              </div>
            </div>

            <!-- Action button (Giống APP: "Nghiệm thu giai đoạn") -->
            <div class="px-4 py-3 border-t border-gray-100 mt-2">
              <a-button type="link" block size="small" @click="openAcceptDetailModal(stage)" class="!text-blue-600 !font-semibold">
                <CheckCircleOutlined /> {{ can('acceptance.update') ? 'Nghiệm thu giai đoạn' : 'Xem chi tiết nghiệm thu' }}
                <span class="ml-1">→</span>
              </a-button>
            </div>
          </div>

          <a-empty v-if="!project.acceptance_stages?.length" description="Chưa có nghiệm thu" />
        </div>
      </a-tab-pane>

      <!-- ============ DEFECTS TAB ============ -->
      <a-tab-pane key="defects" v-if="isTabVisible('defects')">
        <template #tab><a-tooltip title="Báo cáo và theo dõi lỗi thi công: mức độ, trạng thái xử lý" placement="bottom">Lỗi ({{ counts.defects || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('defect.create')" type="primary" size="small" @click="openDefectModal(null)">
              <template #icon><PlusOutlined /></template>Báo lỗi
            </a-button>
          </div>
          <a-table :columns="defectCols" :data-source="project.defects || []" :pagination="false" row-key="id" size="small" :custom-row="(record) => ({ onClick: () => openDefectDetail(record), class: 'cursor-pointer hover-row' })" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'severity'">
                <a-tag :color="severityColors[record.severity]" class="rounded-full">{{ severityLabels[record.severity] || record.severity }}</a-tag>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="defectStatusColors[record.status]" class="rounded-full">{{ defectStatusLabels[record.status] || record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'next_action'">
                <div v-if="record.next_action?.label" class="flex flex-col gap-0.5">
                  <span class="text-[11px] font-bold text-blue-600 leading-none">{{ record.next_action.label }}</span>
                  <span v-if="record.next_action.action" class="text-[9px] text-gray-400 italic leading-none">{{ record.next_action.action }}</span>
                </div>
                <span v-else class="text-gray-300">—</span>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ CHANGE REQUESTS TAB ============ -->
      <a-tab-pane key="change_requests" v-if="isTabVisible('change_requests')">
        <template #tab><a-tooltip title="Yêu cầu thay đổi: phạm vi, chi phí, tiến độ — phân tích ảnh hưởng và phê duyệt" placement="bottom">Thay đổi ({{ counts.change_requests || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('change_request.create')" type="primary" size="small" @click="openChangeRequestModal()">
              <template #icon><PlusOutlined /></template>Yêu cầu thay đổi
            </a-button>
          </div>
          <a-table :columns="crCols" :data-source="project.change_requests || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" :custom-row="(record) => ({ onClick: () => openChangeRequestDetail(record), class: 'cursor-pointer hover-row' })" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'change_type'">
                <a-tag class="rounded-full">{{ crTypeLabels[record.change_type] || record.change_type }}</a-tag>
              </template>
              <template v-else-if="column.key === 'priority'">
                <a-tag :color="priorityColors[record.priority]" class="rounded-full">{{ priorityLabels[record.priority] || record.priority }}</a-tag>
              </template>
              <template v-else-if="column.key === 'cost'">
                <span v-if="record.estimated_cost_impact" class="font-semibold">{{ fmt(record.estimated_cost_impact) }}</span>
                <span v-else class="text-gray-300">—</span>
              </template>
              <template v-else-if="column.key === 'schedule'">
                <span v-if="record.estimated_schedule_impact_days">{{ record.estimated_schedule_impact_days }} ngày</span>
                <span v-else class="text-gray-300">—</span>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="crStatusColors[record.status]" class="rounded-full">{{ crStatusLabels[record.status] || record.status }}</a-tag>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ COMMENTS TAB ============ -->
      <a-tab-pane key="comments" v-if="isTabVisible('comments')">
        <template #tab><a-tooltip title="Trao đổi nội bộ giữa các thành viên dự án" placement="bottom">Bình luận ({{ counts.comments || 0 }})</a-tooltip></template>
        <div class="p-4">
          <!-- Root comment input -->
          <div v-if="can('project.comment.create')" class="flex gap-2 mb-5">
            <a-textarea v-model:value="commentText" placeholder="Viết bình luận..." :rows="2" class="flex-1" />
            <a-button type="primary" @click="addComment()" :disabled="!commentText.trim()">Gửi</a-button>
          </div>

          <!-- Comment Tree -->
          <div v-for="c in (project.comments || [])" :key="c.id" class="mb-4">
            <!-- Root Comment -->
            <div class="flex gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
              <a-avatar :size="32" class="bg-blue-500 text-white text-xs flex-shrink-0">{{ c.user?.name?.charAt(0) }}</a-avatar>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-semibold text-sm">{{ c.user?.name }}</span>
                  <span class="text-xs text-gray-400">{{ fmtDate(c.created_at) }}</span>
                </div>
                <div class="text-sm text-gray-700 mb-1.5">{{ c.content }}</div>
                <div class="flex items-center gap-3">
                  <a-button v-if="can('project.comment.create')" type="link" size="small" class="!p-0 !h-auto text-xs text-gray-400 hover:!text-blue-500" @click="toggleReply(c.id)">
                    <template #icon><SendOutlined class="text-[10px]" /></template>Trả lời
                  </a-button>
                  <a-popconfirm v-if="can('project.comment.delete')" title="Xóa?" @confirm="deleteComment(c)">
                    <a-button type="link" size="small" danger class="!p-0 !h-auto text-xs">Xóa</a-button>
                  </a-popconfirm>
                </div>
              </div>
            </div>

            <!-- Inline reply input -->
            <div v-if="replyingTo === c.id" class="ml-11 mt-2 flex gap-2">
              <a-textarea v-model:value="replyText" placeholder="Trả lời bình luận..." :rows="1" class="flex-1" auto-size />
              <a-button type="primary" size="small" @click="addComment(c.id)" :disabled="!replyText.trim()">Gửi</a-button>
              <a-button size="small" @click="replyingTo = null">Hủy</a-button>
            </div>

            <!-- Replies (children) -->
            <div v-if="c.replies?.length" class="ml-11 mt-1 border-l-2 border-blue-100 pl-3">
              <div v-for="r in c.replies" :key="r.id" class="flex gap-3 py-2 hover:bg-blue-50/50 rounded-lg px-2 transition-colors">
                <a-avatar :size="26" class="bg-green-500 text-white text-[10px] flex-shrink-0">{{ r.user?.name?.charAt(0) }}</a-avatar>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span class="font-semibold text-xs">{{ r.user?.name }}</span>
                    <span class="text-[10px] text-gray-400">{{ fmtDate(r.created_at) }}</span>
                  </div>
                  <div class="text-sm text-gray-600">{{ r.content }}</div>
                  <div class="flex items-center gap-3 mt-1">
                    <a-button v-if="can('project.comment.create')" type="link" size="small" class="!p-0 !h-auto text-[10px] text-gray-400 hover:!text-blue-500" @click="toggleReply(c.id)">
                      <template #icon><SendOutlined class="text-[10px]" /></template>Trả lời
                    </a-button>
                    <a-popconfirm v-if="can('project.comment.delete')" title="Xóa?" @confirm="deleteComment(r)">
                      <a-button type="link" size="small" danger class="!p-0 !h-auto text-[10px]">Xóa</a-button>
                    </a-popconfirm>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <a-empty v-if="!project.comments?.length" description="Chưa có bình luận" />
        </div>
      </a-tab-pane>

      <!-- ============ ADDITIONAL COSTS TAB ============ -->
      <a-tab-pane key="additional_costs" v-if="isTabVisible('additional_costs')">
        <template #tab><a-tooltip title="Chi phí phát sinh ngoài báo giá: đề xuất → duyệt → ghi nhận" placement="bottom">CP Phát sinh ({{ counts.additional_costs || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Tổng phát sinh</div>
              <div class="text-xl font-bold text-red-500">{{ fmt(project.additional_costs?.reduce((a, b) => a + Number(b.amount || 0), 0) || 0) }}</div>
            </div>
            <div class="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
              <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Phiếu đã duyệt</div>
              <div class="text-xl font-bold text-green-600">{{ project.additional_costs?.filter(ac => ac.status === 'approved').length || 0 }} <span class="text-xs font-normal text-gray-400">phiếu</span></div>
            </div>
            <div class="flex items-center justify-end">
              <a-button v-if="can('additional_cost.create')" type="primary" class="h-10 rounded-lg shadow-blue-100 shadow-lg" @click="openAdditionalCostModal()">
                <template #icon><PlusOutlined /></template>Đề xuất CP phát sinh
              </a-button>
            </div>
          </div>
          <a-table :columns="acCols" :data-source="project.additional_costs || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table hover-row"
            :custom-row="(record) => ({ onClick: () => openAdditionalCostDetail(record), style: 'cursor: pointer' })">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'amount'"><span class="font-semibold text-red-500">{{ fmt(record.amount) }}</span></template>
              <template v-else-if="column.key === 'proposer'">{{ record.proposer?.name || '—' }}</template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="acStatusColors[record.status]" class="rounded-full text-xs">{{ acStatusLabels[record.status] || record.status }}</a-tag>
              </template>
            </template>
          </a-table>
          <a-empty v-if="!project.additional_costs?.length" description="Chưa có CP phát sinh" />
        </div>
      </a-tab-pane>

      <!-- ============ BUDGETS TAB ============ -->
      <a-tab-pane key="budgets" v-if="isTabVisible('budgets')">
        <template #tab><a-tooltip title="Quản lý ngân sách dự án: phân bổ theo hạng mục, theo dõi thực chi" placement="bottom">Ngân sách ({{ counts.budgets || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('budgets.create')" type="primary" size="small" @click="openBudgetModal()">
              <template #icon><PlusOutlined /></template>Tạo ngân sách
            </a-button>
          </div>
          
          <!-- Budget Cards -->
          <div v-if="project.budgets?.length" class="space-y-3">
            <div v-for="budget in project.budgets" :key="budget.id" 
              class="group relative bg-white border border-gray-100 rounded-2xl p-4 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer overflow-hidden"
              @click="openBudgetDetail(budget)"
            >
              <!-- Glass decoration -->
              <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div class="flex items-center justify-between relative z-10">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-lg shadow-sm" 
                    :class="budget.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'">
                    {{ budget.status === 'active' ? '✨' : '📄' }}
                  </div>
                  <div>
                    <div class="flex items-center gap-2 mb-0.5">
                      <span class="font-bold text-gray-800 text-base">{{ budget.name }}</span>
                      <a-tag v-if="budget.status === 'active'" color="success" class="rounded-full px-2 text-[10px] border-none uppercase font-bold">ACTIVE</a-tag>
                    </div>
                    <div class="text-[11px] text-gray-400 font-medium flex gap-3">
                      <span><CalendarOutlined /> {{ fmtDate(budget.budget_date) }}</span>
                      <span><HistoryOutlined /> {{ budget.version || 'v1.0' }}</span>
                      <span class="text-blue-500 bg-blue-50 px-1.5 rounded">{{ budget.items?.length || 0 }} hạng mục</span>
                      <span v-if="budget.profit_percentage" class="text-emerald-600 bg-emerald-50 px-1.5 rounded">LN: {{ budget.profit_percentage }}%</span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-8 text-sm">
                  <div class="text-right">
                    <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Tổng dự toán</div>
                    <div class="text-xl font-black text-blue-600">{{ fmt(budget.total_budget) }}</div>
                  </div>
                  
                  <div class="flex flex-col items-end gap-1.5 min-w-[120px]">
                    <a-tag :color="budgetStatusColors[budget.status]" class="rounded-full text-[10px] font-bold uppercase m-0 px-3 border-none shadow-sm">
                      {{ budgetStatusLabels[budget.status] || budget.status }}
                    </a-tag>
                    <div class="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                      <div class="h-full rounded-full transition-all duration-500" 
                        :class="(budget.actual_cost > budget.total_budget) ? 'bg-red-500' : 'bg-emerald-500'"
                        :style="`width: ${Math.min(100, Math.round(((budget.actual_cost || 0) / (budget.total_budget || 1)) * 100))}%`"
                      ></div>
                    </div>
                  </div>

                  <div class="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center text-gray-300 group-hover:text-blue-500 group-hover:border-blue-200 transition-colors">
                    <RightOutlined />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <a-empty v-else description="Chưa có ngân sách" />
        </div>
      </a-tab-pane>

      <!-- ============ FINANCE DASHBOARD TAB (Sprint 2 — Module 3) ============ -->
      <a-tab-pane key="finance" v-if="isTabVisible('finance')">
        <template #tab><a-tooltip title="Dòng tiền, Lãi/Lỗ, Ngân sách vs Thực chi, Công nợ NTP, Bảo hành" placement="bottom">Tổng hợp TC</a-tooltip></template>
        <div class="p-4 space-y-4">
          <div class="flex gap-2 flex-wrap">
            <a-button size="small" :type="financeView === 'cashflow' ? 'primary' : 'default'" @click="financeView = 'cashflow'">Dòng tiền</a-button>
            <a-button size="small" :type="financeView === 'pnl' ? 'primary' : 'default'" @click="financeView = 'pnl'">Lãi / Lỗ</a-button>
            <a-button size="small" :type="financeView === 'bva' ? 'primary' : 'default'" @click="financeView = 'bva'">NS vs Thực chi</a-button>
            <a-button size="small" :type="financeView === 'debt' ? 'primary' : 'default'" @click="financeView = 'debt'">Công nợ NTP</a-button>
            <a-button size="small" :type="financeView === 'warranty' ? 'primary' : 'default'" @click="financeView = 'warranty'">Bảo hành</a-button>
            <a-button size="small" type="primary" ghost @click="loadFinanceData()" :loading="financeLoading"><template #icon><CalendarOutlined /></template>Refresh</a-button>
          </div>

          <!-- Cash Flow -->
          <div v-if="financeView === 'cashflow'">
            <div v-if="financeLoading" class="py-8 text-center"><a-spin /></div>
            <div v-else-if="!cashFlowData.months?.length" class="py-8 text-center"><a-empty description="Chưa có dữ liệu dòng tiền" /></div>
            <div v-else>
              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div class="text-xl font-bold text-green-600">{{ fmtMoney(cashFlowData.totals?.total_inflow) }}</div>
                  <div class="text-xs text-green-500">Tổng thu</div>
                </div>
                <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <div class="text-xl font-bold text-red-600">{{ fmtMoney(cashFlowData.totals?.total_outflow) }}</div>
                  <div class="text-xs text-red-500">Tổng chi</div>
                </div>
                <div class="rounded-xl p-4 text-center" :class="(cashFlowData.totals?.net_cash_flow || 0) >= 0 ? 'bg-blue-50 border border-blue-200' : 'bg-amber-50 border border-amber-200'">
                  <div class="text-xl font-bold" :class="(cashFlowData.totals?.net_cash_flow || 0) >= 0 ? 'text-blue-600' : 'text-amber-600'">{{ fmtMoney(cashFlowData.totals?.net_cash_flow) }}</div>
                  <div class="text-xs" :class="(cashFlowData.totals?.net_cash_flow || 0) >= 0 ? 'text-blue-500' : 'text-amber-500'">Dòng tiền ròng</div>
                </div>
              </div>
              <div class="border rounded-xl overflow-hidden">
                <table class="w-full text-xs">
                  <thead><tr class="bg-gradient-to-r from-blue-50 to-green-50 text-gray-600 border-b">
                    <th class="text-left py-2 px-3">Tháng</th>
                    <th class="text-right py-2 px-2">Thu (KH)</th><th class="text-right py-2 px-2">Thu (TT)</th>
                    <th class="text-right py-2 px-2">Chi (KH)</th><th class="text-right py-2 px-2">Chi (TT)</th>
                    <th class="text-right py-2 px-2">Lũy kế ròng</th>
                  </tr></thead>
                  <tbody>
                    <tr v-for="m in cashFlowData.months" :key="m.month" class="border-b hover:bg-gray-50">
                      <td class="py-2 px-3 font-medium">{{ m.label }}</td>
                      <td class="text-right py-2 px-2 text-green-600">{{ fmtMoney(m.planned_inflow) }}</td>
                      <td class="text-right py-2 px-2 text-green-700 font-medium">{{ fmtMoney(m.actual_inflow) }}</td>
                      <td class="text-right py-2 px-2 text-red-500">{{ fmtMoney(m.planned_outflow) }}</td>
                      <td class="text-right py-2 px-2 text-red-600 font-medium">{{ fmtMoney(m.actual_outflow) }}</td>
                      <td class="text-right py-2 px-2 font-bold" :class="m.cumulative_actual_net >= 0 ? 'text-blue-600' : 'text-amber-600'">{{ fmtMoney(m.cumulative_actual_net) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- P/L -->
          <div v-else-if="financeView === 'pnl'">
            <div v-if="financeLoading" class="py-8 text-center"><a-spin /></div>
            <div v-else-if="!pnlData.revenue" class="py-8 text-center"><a-empty description="Chưa có dữ liệu P/L" /></div>
            <div v-else class="space-y-4">
              <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 class="text-sm font-bold text-green-700 mb-3">📈 DOANH THU</h4>
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div><span class="text-xs text-gray-500">Giá trị HĐ:</span><div class="font-bold text-green-700">{{ fmtMoney(pnlData.revenue.contract_value) }}</div></div>
                  <div><span class="text-xs text-gray-500">Phát sinh:</span><div class="font-bold">{{ fmtMoney(pnlData.revenue.additional_value) }}</div></div>
                  <div><span class="text-xs text-gray-500">Tổng DT:</span><div class="font-bold text-green-800 text-lg">{{ fmtMoney(pnlData.revenue.total_revenue) }}</div></div>
                  <div><span class="text-xs text-gray-500">Còn phải thu:</span><div class="font-bold text-amber-600">{{ fmtMoney(pnlData.revenue.receivable) }}</div></div>
                </div>
              </div>
              <div class="bg-red-50 border border-red-200 rounded-xl p-4">
                <h4 class="text-sm font-bold text-red-700 mb-3">📉 CHI PHÍ</h4>
                <div class="space-y-1">
                  <div v-for="(val, cat) in pnlData.costs.by_category" :key="cat" class="flex justify-between text-xs">
                    <span class="text-gray-600">{{ costCatLabels[cat] || cat }}</span>
                    <span class="font-medium">{{ fmtMoney(val) }}</span>
                  </div>
                  <div class="flex justify-between font-bold text-sm pt-2 border-t border-red-200 mt-2">
                    <span>Tổng chi phí</span><span class="text-red-700">{{ fmtMoney(pnlData.costs.total_costs) }}</span>
                  </div>
                </div>
              </div>
              <div class="rounded-xl p-4 border-2" :class="pnlData.profit_loss.net_profit >= 0 ? 'bg-blue-50 border-blue-300' : 'bg-amber-50 border-amber-300'">
                <h4 class="text-sm font-bold mb-3" :class="pnlData.profit_loss.net_profit >= 0 ? 'text-blue-700' : 'text-amber-700'">{{ pnlData.profit_loss.net_profit >= 0 ? '✅ LÃI' : '⚠️ LỖ' }}</h4>
                <div class="grid grid-cols-2 gap-3">
                  <div><span class="text-xs text-gray-500">Lãi gộp:</span><div class="font-bold text-lg">{{ fmtMoney(pnlData.profit_loss.gross_profit) }}</div></div>
                  <div><span class="text-xs text-gray-500">Biên lãi gộp:</span><div class="font-bold text-lg">{{ pnlData.profit_loss.gross_margin }}%</div></div>
                  <div><span class="text-xs text-gray-500">Lãi ròng:</span><div class="font-bold text-lg">{{ fmtMoney(pnlData.profit_loss.net_profit) }}</div></div>
                  <div><span class="text-xs text-gray-500">Biên ròng:</span><div class="font-bold text-lg">{{ pnlData.profit_loss.net_margin }}%</div></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Budget vs Actual -->
          <div v-else-if="financeView === 'bva'">
            <div v-if="financeLoading" class="py-8 text-center"><a-spin /></div>
            <div v-else-if="!bvaData.items?.length" class="py-8 text-center"><a-empty description="Chưa có dữ liệu" /></div>
            <div v-else>
              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <div class="text-lg font-bold text-blue-600">{{ fmtMoney(bvaData.summary?.total_budget) }}</div>
                  <div class="text-xs text-blue-500">Ngân sách</div>
                </div>
                <div class="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                  <div class="text-lg font-bold text-purple-600">{{ fmtMoney(bvaData.summary?.total_actual) }}</div>
                  <div class="text-xs text-purple-500">Thực chi</div>
                </div>
                <div class="rounded-xl p-4 text-center" :class="(bvaData.summary?.variance || 0) >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
                  <div class="text-lg font-bold" :class="(bvaData.summary?.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600'">{{ bvaData.summary?.variance_pct }}%</div>
                  <div class="text-xs">Chênh lệch</div>
                </div>
              </div>
              <div class="border rounded-xl overflow-hidden">
                <table class="w-full text-xs">
                  <thead><tr class="bg-gradient-to-r from-blue-50 to-purple-50 text-gray-600 border-b">
                    <th class="text-left py-2 px-3">Hạng mục</th>
                    <th class="text-right py-2 px-2">NS</th><th class="text-right py-2 px-2">Thực chi</th>
                    <th class="text-right py-2 px-2">Chênh lệch</th><th class="text-center py-2 px-2">TT</th>
                  </tr></thead>
                  <tbody>
                    <tr v-for="item in bvaData.items" :key="item.id" class="border-b hover:bg-gray-50">
                      <td class="py-2 px-3 font-medium">{{ item.name }}</td>
                      <td class="text-right py-2 px-2 text-blue-600">{{ fmtMoney(item.budget_amount) }}</td>
                      <td class="text-right py-2 px-2 text-purple-600 font-medium">{{ fmtMoney(item.actual_amount) }}</td>
                      <td class="text-right py-2 px-2 font-bold" :class="item.variance >= 0 ? 'text-green-600' : 'text-red-600'">{{ fmtMoney(item.variance) }}</td>
                      <td class="text-center py-2 px-2"><a-tag :color="item.status === 'under_budget' ? 'green' : 'red'" class="text-[10px] rounded-full">{{ item.status === 'under_budget' ? '✓' : '✗' }}</a-tag></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Subcontractor Debt -->
          <div v-else-if="financeView === 'debt'">
            <div v-if="financeLoading" class="py-8 text-center"><a-spin /></div>
            <div v-else-if="!debtData.subcontractors?.length" class="py-8 text-center"><a-empty description="Chưa có nhà thầu phụ" /></div>
            <div v-else>
              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                  <div class="text-lg font-bold text-blue-600">{{ fmtMoney(debtData.summary?.total_contract) }}</div><div class="text-xs text-blue-500">Tổng HĐ</div>
                </div>
                <div class="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div class="text-lg font-bold text-green-600">{{ fmtMoney(debtData.summary?.total_paid) }}</div><div class="text-xs text-green-500">Đã TT</div>
                </div>
                <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                  <div class="text-lg font-bold text-amber-600">{{ fmtMoney(debtData.summary?.total_remaining) }}</div><div class="text-xs text-amber-500">Còn lại</div>
                </div>
              </div>
              <div class="space-y-2">
                <div v-for="sub in debtData.subcontractors" :key="sub.id" class="bg-white border rounded-xl p-3">
                  <div class="flex justify-between items-center mb-2">
                    <span class="font-medium text-sm">{{ sub.name }}</span>
                    <a-tag :color="sub.payment_status === 'completed' ? 'green' : sub.payment_status === 'partial' ? 'blue' : 'default'" class="text-[10px] rounded-full">{{ sub.paid_pct }}%</a-tag>
                  </div>
                  <a-progress :percent="sub.paid_pct" size="small" :stroke-color="sub.paid_pct >= 100 ? '#10B981' : '#3B82F6'" />
                  <div class="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Đã TT: {{ fmtMoney(sub.total_paid) }}</span>
                    <span>Còn: {{ fmtMoney(sub.remaining) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Warranty -->
          <div v-else-if="financeView === 'warranty'">
            <div v-if="financeLoading" class="py-8 text-center"><a-spin /></div>
            <div v-else-if="!warrantyData.retentions?.length" class="py-8 text-center"><a-empty description="Chưa có bảo hành" /></div>
            <div v-else class="space-y-2">
              <div v-for="ret in warrantyData.retentions" :key="ret.id" class="bg-white border rounded-xl p-3">
                <div class="flex justify-between items-center mb-1">
                  <span class="font-medium text-sm">{{ ret.subcontractor?.name || '—' }}</span>
                  <a-tag :color="ret.release_status === 'released' ? 'green' : 'default'" class="text-[10px]">{{ ret.release_status === 'released' ? 'Đã giải phóng' : ret.release_status === 'partial_release' ? 'Một phần' : 'Đang giữ' }}</a-tag>
                </div>
                <div class="text-xs text-gray-500">Giữ: {{ fmtMoney(ret.retention_amount) }} ({{ ret.retention_percentage }}%) — {{ fmtDate(ret.warranty_start_date) }} → {{ fmtDate(ret.warranty_end_date) }}</div>
              </div>
            </div>
          </div>
        </div>
      </a-tab-pane>
1277: 
      <!-- ============ WARRANTY TAB ============ -->
      <a-tab-pane key="warranty" v-if="isTabVisible('warranty')">
        <template #tab><a-tooltip title="Quản lý bảo hành: phiếu bàn giao, thời gian bảo hành, luồng duyệt khách hàng" placement="bottom">Phiếu Bảo hành ({{ counts.warranties || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('warranty.create')" type="primary" size="small" @click="openWarrantyModal()">
              <template #icon><PlusOutlined /></template>Tạo phiếu bảo hành
            </a-button>
          </div>
          <div v-if="project.warranties?.length" class="space-y-3">
            <div v-for="w in project.warranties" :key="w.id"
                 class="bg-white border rounded-2xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                 @click="openWarrantyDetail(w)">
              <div class="p-4 flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white"><SafetyCertificateOutlined /></div>
                  <div>
                    <div class="font-semibold text-gray-800">Phiếu bảo hành #{{ w.id }}</div>
                    <div class="text-xs text-gray-400">Ngày bàn giao: {{ fmtDate(w.handover_date) }} | Thời gian: {{ fmtDate(w.warranty_start_date) }} → {{ fmtDate(w.warranty_end_date) }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <a-tag :color="w.status === 'approved' ? 'green' : w.status === 'rejected' ? 'red' : w.status === 'pending_customer' ? 'orange' : 'default'" class="rounded-full text-xs">
                    {{ w.status === 'approved' ? 'Đã duyệt' : w.status === 'rejected' ? 'Từ chối' : w.status === 'pending_customer' ? 'Chờ KH duyệt' : 'Nháp' }}
                  </a-tag>
                  <div v-if="w.attachments?.length" class="text-xs text-gray-400">
                    <PaperClipOutlined /> {{ w.attachments.length }}
                  </div>
                </div>
              </div>
              <div class="px-4 pb-3">
                <div class="text-sm text-gray-500 line-clamp-2">{{ w.warranty_content }}</div>
              </div>
            </div>
          </div>
          <a-empty v-else description="Chưa có phiếu bảo hành" />
        </div>
      </a-tab-pane>

      <!-- ============ MAINTENANCES TAB ============ -->
      <a-tab-pane key="maintenances" v-if="isTabVisible('maintenances')">
        <template #tab><a-tooltip title="Lịch sử bảo trì định kỳ (6 tháng/lần) — Luồng duyệt: Nháp → Chờ KH duyệt → Đã duyệt" placement="bottom">Bảo trì ({{ counts.maintenances || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-between items-center mb-3">
             <div class="text-xs text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-100 flex items-center gap-1">
               <ClockCircleOutlined class="animate-bounce" /> Nhắc bảo trì định kỳ 6 tháng/lần
             </div>
             <a-button v-if="can('warranty.create')" type="primary" size="small" @click="openMaintenanceModal()">
               <template #icon><PlusOutlined /></template>Ghi nhận bảo trì
             </a-button>
          </div>
          <!-- Summary Cards -->
          <div class="grid grid-cols-4 gap-3 mb-4">
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100/60">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center"><span class="text-blue-600 text-xs">📋</span></div>
                <span class="text-[11px] text-gray-400">Tổng phiếu</span>
              </div>
              <div class="text-lg font-bold text-gray-800">{{ project.maintenances?.length || 0 }}</div>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-3 border border-green-100/60">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center"><CheckCircleOutlined class="text-green-600 text-xs" /></div>
                <span class="text-[11px] text-gray-400">Đã duyệt</span>
              </div>
              <div class="text-lg font-bold text-green-600">{{ (project.maintenances || []).filter(m => m.status === 'approved').length }}</div>
            </div>
            <div class="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-100/60">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center"><ClockCircleOutlined class="text-amber-600 text-xs" /></div>
                <span class="text-[11px] text-gray-400">Chờ duyệt</span>
              </div>
              <div class="text-lg font-bold text-amber-600">{{ (project.maintenances || []).filter(m => m.status === 'pending_customer').length }}</div>
            </div>
            <div class="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-3 border border-gray-100/60">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-7 h-7 rounded-lg bg-gray-500/10 flex items-center justify-center"><span class="text-gray-600 text-xs">📝</span></div>
                <span class="text-[11px] text-gray-400">Nháp</span>
              </div>
              <div class="text-lg font-bold text-gray-600">{{ (project.maintenances || []).filter(m => m.status === 'draft').length }}</div>
            </div>
          </div>
          <a-table :columns="maintenanceCols" :data-source="project.maintenances || []" :pagination="false" row-key="id" size="small" class="crm-table hover-row"
            :custom-row="(record) => ({ onClick: () => openMaintenanceDetail(record), style: 'cursor: pointer' })">
            <template #bodyCell="{ column, record }">
               <template v-if="column.key === 'maintenance_date'">{{ fmtDate(record.maintenance_date) }}</template> 
               <template v-else-if="column.key === 'next_date'">
                 <span class="font-bold" :class="isPast(record.next_maintenance_date) ? 'text-red-500' : 'text-blue-600'">{{ fmtDate(record.next_maintenance_date) }}</span>
               </template>
               <template v-else-if="column.key === 'status'">
                 <a-tag :color="maintenanceStatusColors[record.status]" class="rounded-full text-xs">{{ maintenanceStatusLabels[record.status] || record.status }}</a-tag>
               </template>
               <template v-else-if="column.key === 'creator'">{{ record.creator?.name || '—' }}</template>
               <template v-else-if="column.key === 'attachments'">
                 <div v-if="record.attachments?.length" class="flex gap-1">
                   <a-tooltip v-for="att in record.attachments" :key="att.id" :title="att.original_name">
                     <a :href="att.full_url" target="_blank" class="text-blue-500" @click.stop><PaperClipOutlined /></a>
                   </a-tooltip>
                 </div>
                 <span v-else class="text-gray-300">—</span>
               </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ INVOICES TAB ============ -->
      <a-tab-pane key="invoices" v-if="isTabVisible('invoices')">
        <template #tab><a-tooltip title="Quản lý hóa đơn xuất cho khách hàng: tạo, gửi, theo dõi thanh toán" placement="bottom">Hóa đơn ({{ counts.invoices || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('invoice.create')" type="primary" size="small" @click="openInvoiceModal(null)">
              <template #icon><PlusOutlined /></template>Tạo hóa đơn
            </a-button>
          </div>
          <a-table :columns="invoiceCols" :data-source="project.invoices || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" :custom-row="(record) => ({ onClick: () => openInvoiceDetail(record), class: 'cursor-pointer hover-row' })" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'subtotal'"><span class="font-semibold">{{ fmt(record.subtotal) }}</span></template>
              <template v-else-if="column.key === 'total'"><span class="font-bold text-green-600">{{ fmt(record.total_amount) }}</span></template>
              <template v-else-if="column.key === 'date'">{{ fmtDate(record.invoice_date) }}</template>
            </template>
          </a-table>
          <a-empty v-if="!project.invoices?.length" description="Chưa có hóa đơn" />
        </div>
      </a-tab-pane>

      <!-- ============ RISKS TAB ============ -->
      <a-tab-pane key="risks" v-if="isTabVisible('risks')">
        <template #tab><a-tooltip title="Đánh giá và quản lý rủi ro: xác suất, ảnh hưởng, kế hoạch giảm thiểu" placement="bottom">Rủi ro ({{ counts.risks || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('project.risk.create')" type="primary" size="small" @click="openRiskModal()">
              <template #icon><PlusOutlined /></template>Thêm rủi ro
            </a-button>
          </div>
          <a-table :columns="riskCols" :data-source="project.risks || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" :custom-row="(record) => ({ onClick: () => openRiskDetail(record), class: 'cursor-pointer hover-row' })" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'category'">
                <a-tag class="rounded-full">{{ riskCategoryLabels[record.category] || record.category }}</a-tag>
              </template>
              <template v-else-if="column.key === 'probability'">
                <a-tag :color="riskLevelColors[record.probability]" class="rounded-full">{{ riskLevelLabels[record.probability] || record.probability }}</a-tag>
              </template>
              <template v-else-if="column.key === 'impact'">
                <a-tag :color="riskLevelColors[record.impact]" class="rounded-full">{{ riskLevelLabels[record.impact] || record.impact }}</a-tag>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="riskStatusColors[record.status]" class="rounded-full">{{ riskStatusLabels[record.status] || record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'owner'">{{ record.owner?.name || '—' }}</template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ ATTENDANCE TAB ============ -->
      <a-tab-pane key="attendance" v-if="isTabVisible('attendance')">
        <template #tab><a-tooltip title="Quản lý chấm công: check-in/out, thống kê giờ làm, phân ca" placement="bottom">Chấm công</a-tooltip></template>
        <div class="p-4 space-y-4">
          <!-- Action Bar -->
          <div class="flex justify-between items-center">
            <div class="flex gap-2">
              <a-button size="small" :type="attendanceView === 'list' ? 'primary' : 'default'" @click="attendanceView = 'list'">Danh sách</a-button>
              <a-button size="small" :type="attendanceView === 'stats' ? 'primary' : 'default'" @click="loadAttendanceStats(); attendanceView = 'stats'">Thống kê tháng</a-button>
              <a-button size="small" :type="attendanceView === 'shifts' ? 'primary' : 'default'" @click="loadShifts(); attendanceView = 'shifts'">Phân ca</a-button>
            </div>
            <div class="flex gap-2">
              <a-date-picker v-model:value="attendanceDate" picker="month" size="small" format="MM/YYYY" @change="loadAttendanceData()" />
              <a-button v-if="can('attendance.manage')" size="small" @click="showGenerateLaborCostModal = true" :loading="generatingLaborCosts">
                <template #icon><CalculatorOutlined /></template>Tổng hợp lương
              </a-button>
              <a-button v-if="can('attendance.manage')" type="primary" size="small" @click="showAttendanceModal = true">
                <template #icon><PlusOutlined /></template>Chấm công thủ công
              </a-button>
            </div>
          </div>

          <!-- Stats Cards -->
          <div class="grid grid-cols-2 md:grid-cols-5 gap-3" v-if="attendanceSummary">
            <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 text-center border border-blue-200">
              <div class="text-2xl font-bold text-blue-700">{{ attendanceSummary.total_records || 0 }}</div>
              <div class="text-xs text-blue-500">Tổng ngày</div>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 text-center border border-green-200">
              <div class="text-2xl font-bold text-green-700">{{ attendanceSummary.total_present || 0 }}</div>
              <div class="text-xs text-green-500">Có mặt</div>
            </div>
            <div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3 text-center border border-amber-200">
              <div class="text-2xl font-bold text-amber-600">{{ attendanceSummary.total_late || 0 }}</div>
              <div class="text-xs text-amber-500">Trễ</div>
            </div>
            <div class="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-3 text-center border border-red-200">
              <div class="text-2xl font-bold text-red-600">{{ attendanceSummary.total_absent || 0 }}</div>
              <div class="text-xs text-red-500">Vắng</div>
            </div>
            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 text-center border border-purple-200">
              <div class="text-2xl font-bold text-purple-700">{{ attendanceSummary.total_overtime?.toFixed(1) || 0 }}h</div>
              <div class="text-xs text-purple-500">Tổng OT</div>
            </div>
          </div>

          <!-- List View -->
          <div v-if="attendanceView === 'list'">
            <a-table :columns="attendanceCols" :data-source="attendanceList" :pagination="{ pageSize: 15, showTotal: (t) => `${t} bản ghi` }" row-key="id" size="small" :custom-row="(record) => ({ onClick: () => openAttendanceDetail(record), class: 'cursor-pointer hover-row' })" class="crm-table">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'user'">
                  <div class="flex items-center gap-2">
                    <a-avatar :size="24" class="bg-blue-500 text-white text-xs">{{ record.user?.name?.[0] || '?' }}</a-avatar>
                    <span class="text-sm font-medium">{{ record.user?.name || '—' }}</span>
                  </div>
                </template>
                <template v-else-if="column.key === 'date'">{{ fmtDate(record.work_date) }}</template>
                <template v-else-if="column.key === 'check_in'">
                  <span :class="record.status === 'late' ? 'text-amber-600 font-medium' : 'text-green-600'">{{ record.check_in?.substring(0,5) || '—' }}</span>
                </template>
                <template v-else-if="column.key === 'check_out'">
                  <span class="text-gray-600">{{ record.check_out?.substring(0,5) || '—' }}</span>
                </template>
                <template v-else-if="column.key === 'hours'">
                  <span class="font-semibold" :class="(record.hours_worked || 0) < 0 ? 'text-red-500' : ''">{{ record.hours_worked }}h</span>
                </template>
                <template v-else-if="column.key === 'overtime'">
                  <span v-if="record.overtime_hours > 0" class="text-amber-600 font-bold">{{ record.overtime_hours }}h</span>
                  <span v-else class="text-gray-300">—</span>
                </template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="record.status === 'present' ? 'green' : (record.status === 'late' ? 'orange' : 'red')" class="rounded-full text-[10px] px-2" size="small">
                    {{ attendanceStatusLabels[record.status] || record.status }}
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'workflow'">
                  <a-tag :color="workflowAttColors[record.workflow_status] || 'default'" class="rounded-full text-[10px] px-2" size="small">
                    {{ workflowAttLabels[record.workflow_status] || record.workflow_status }}
                  </a-tag>
                </template>
              </template>
            </a-table>
          </div>

          <!-- Stats View -->
          <div v-else-if="attendanceView === 'stats'" class="space-y-3">
            <div v-for="(userStat, idx) in attendanceByUser" :key="idx"
              class="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between hover:shadow-sm transition-shadow">
              <div class="flex items-center gap-3">
                <a-avatar :size="32" class="bg-blue-500 text-white">{{ (userStat.user?.name || '?')[0] }}</a-avatar>
                <div>
                  <div class="text-sm font-semibold text-gray-700">{{ userStat.user?.name || '—' }}</div>
                  <div class="text-xs text-gray-400">{{ userStat.total_days }} ngày • {{ userStat.total_hours }}h tổng</div>
                </div>
              </div>
              <div class="flex items-center gap-3 text-xs">
                <a-tag color="green" class="rounded-full">✓ {{ userStat.present }}</a-tag>
                <a-tag color="orange" class="rounded-full">⏰ {{ userStat.late }}</a-tag>
                <a-tag color="red" class="rounded-full">✗ {{ userStat.absent }}</a-tag>
                <a-tag v-if="userStat.total_overtime > 0" color="purple" class="rounded-full">OT {{ userStat.total_overtime }}h</a-tag>
              </div>
            </div>
            <a-empty v-if="!attendanceByUser?.length" description="Chưa có dữ liệu tháng này" />
          </div>

          <!-- Shifts View -->
          <div v-else-if="attendanceView === 'shifts'" class="space-y-4">
            <div class="flex justify-end">
              <a-button type="primary" size="small" @click="showShiftModal = true">
                <template #icon><PlusOutlined /></template>Tạo ca
              </a-button>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div v-for="shift in shiftsList" :key="shift.id"
                class="bg-white rounded-xl p-4 border border-gray-100 hover:border-blue-200 transition-colors">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-semibold text-gray-800">{{ shift.name }}</span>
                  <a-tag v-if="shift.is_overtime_shift" color="orange" class="rounded-full text-[10px]">OT x{{ shift.overtime_multiplier }}</a-tag>
                </div>
                <div class="text-xs text-gray-500">{{ shift.start_time }} — {{ shift.end_time }}</div>
                <div class="text-xs text-gray-400 mt-1">Nghỉ giữa ca: {{ shift.break_hours }}h</div>
              </div>
            </div>
            <a-empty v-if="!shiftsList?.length" description="Chưa có ca làm việc" />
          </div>
        </div>
      </a-tab-pane>

      <!-- ============ LABOR PRODUCTIVITY TAB ============ -->
      <a-tab-pane key="labor" v-if="isTabVisible('labor')">
        <template #tab><a-tooltip title="Theo dõi năng suất lao động: khối lượng KH vs TT, hiệu suất nhân công" placement="bottom">Năng suất LĐ</a-tooltip></template>
        <div class="p-4 space-y-4">
          <!-- Action Bar -->
          <div class="flex justify-between items-center">
            <div class="flex gap-2">
              <a-button size="small" :type="laborView === 'dashboard' ? 'primary' : 'default'" @click="loadLaborDashboard(); laborView = 'dashboard'">Dashboard</a-button>
              <a-button size="small" :type="laborView === 'records' ? 'primary' : 'default'" @click="loadLaborRecords(); laborView = 'records'">Dữ liệu</a-button>
            </div>
            <a-button v-if="can('labor_productivity.create')" type="primary" size="small" @click="showLaborModal = true">
              <template #icon><PlusOutlined /></template>Ghi nhận
            </a-button>
          </div>

          <!-- Dashboard View -->
          <div v-if="laborView === 'dashboard' && laborDashboard">
            <!-- Summary Cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center border border-blue-200">
                <div class="text-2xl font-bold text-blue-700">{{ laborDashboard.summary?.total_records || 0 }}</div>
                <div class="text-xs text-blue-500">Bản ghi</div>
              </div>
              <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border border-green-200">
                <div class="text-2xl font-bold text-green-700">{{ laborDashboard.summary?.avg_efficiency?.toFixed(1) || 0 }}%</div>
                <div class="text-xs text-green-500">TB Hiệu suất</div>
              </div>
              <div class="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 text-center border border-amber-200">
                <div class="text-2xl font-bold text-amber-600">{{ laborDashboard.summary?.total_workers || 0 }}</div>
                <div class="text-xs text-amber-500">Nhân công</div>
              </div>
              <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center border border-purple-200">
                <div class="text-2xl font-bold text-purple-700">{{ Math.round(laborDashboard.summary?.total_hours || 0) }}h</div>
                <div class="text-xs text-purple-500">Tổng giờ</div>
              </div>
            </div>

            <!-- Efficiency Gauge -->
            <div class="bg-white rounded-xl p-5 border border-gray-100 mb-4">
              <div class="flex justify-between items-center mb-3">
                <h4 class="font-semibold text-gray-700 flex items-center gap-2">
                  <span class="w-1.5 h-5 rounded-full bg-gradient-to-b from-blue-400 to-blue-600"></span>
                  Hiệu suất tổng thể
                </h4>
                <span class="text-lg font-bold" :class="((laborDashboard.summary?.avg_efficiency || 0) >= 90) ? 'text-green-600' : ((laborDashboard.summary?.avg_efficiency || 0) >= 70) ? 'text-amber-600' : 'text-red-600'">
                  {{ laborDashboard.summary?.avg_efficiency?.toFixed(1) || 0 }}%
                </span>
              </div>
              <div class="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-700"
                  :class="((laborDashboard.summary?.avg_efficiency || 0) >= 90) ? 'bg-gradient-to-r from-green-400 to-green-500' : ((laborDashboard.summary?.avg_efficiency || 0) >= 70) ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-red-400 to-red-500'"
                  :style="{ width: Math.min(laborDashboard.summary?.avg_efficiency || 0, 100) + '%' }">
                </div>
              </div>
              <div class="flex justify-between text-[11px] text-gray-400 mt-2">
                <span>KH: {{ laborDashboard.summary?.total_planned?.toLocaleString() || 0 }}</span>
                <span>TT: {{ laborDashboard.summary?.total_actual?.toLocaleString() || 0 }}</span>
              </div>
            </div>

            <!-- By User Ranking -->
            <div v-if="laborDashboard.by_user?.length" class="bg-white rounded-xl p-5 border border-gray-100 mb-4">
              <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-400 to-amber-600"></span>
                🏆 Xếp hạng nhân công
              </h4>
              <div class="space-y-2">
                <div v-for="(u, idx) in laborDashboard.by_user.slice(0, 8)" :key="idx"
                  class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    :class="idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-gray-100 text-gray-600' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-50 text-gray-400'">
                    #{{ idx + 1 }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-semibold text-gray-700 truncate">{{ u.user_name }}</div>
                    <div class="text-[10px] text-gray-400">{{ u.records_count }} lượt • {{ u.total_actual?.toLocaleString() }} đơn vị</div>
                  </div>
                  <div class="text-sm font-bold" :class="(u.avg_efficiency >= 90) ? 'text-green-600' : (u.avg_efficiency >= 70) ? 'text-amber-600' : 'text-red-500'">
                    {{ u.avg_efficiency }}%
                  </div>
                </div>
              </div>
            </div>

            <!-- By Item -->
            <div v-if="laborDashboard.by_item?.length" class="bg-white rounded-xl p-5 border border-gray-100">
              <h4 class="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span class="w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600"></span>
                📦 Theo hạng mục
              </h4>
              <a-table :columns="laborItemCols" :data-source="laborDashboard.by_item" :pagination="false" row-key="work_item" size="small" class="crm-table">
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'efficiency'">
                    <span class="font-bold" :class="record.avg_efficiency >= 90 ? 'text-green-600' : record.avg_efficiency >= 70 ? 'text-amber-600' : 'text-red-500'">
                      {{ record.avg_efficiency }}%
                    </span>
                  </template>
                  <template v-else-if="column.key === 'planned'">{{ record.total_planned?.toLocaleString() }}</template>
                  <template v-else-if="column.key === 'actual'">{{ record.total_actual?.toLocaleString() }}</template>
                </template>
              </a-table>
            </div>
          </div>

          <!-- Records View -->
          <div v-else-if="laborView === 'records'">
            <a-table :columns="laborRecordCols" :data-source="laborRecords" :pagination="{ pageSize: 15, showTotal: (t) => `${t} bản ghi` }" row-key="id" size="small" class="crm-table">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'work_item'">
                  <div>
                    <div class="text-sm font-semibold">{{ record.work_item }}</div>
                    <div class="text-[10px] text-gray-400">{{ record.user?.name || '—' }} • {{ fmtDate(record.record_date) }}</div>
                  </div>
                </template>
                <template v-else-if="column.key === 'planned'">{{ record.planned_quantity }} {{ record.unit }}</template>
                <template v-else-if="column.key === 'actual'">
                  <span class="font-semibold">{{ record.actual_quantity }} {{ record.unit }}</span>
                </template>
                <template v-else-if="column.key === 'efficiency'">
                  <a-tag :color="record.efficiency_percent >= 90 ? 'green' : record.efficiency_percent >= 70 ? 'orange' : 'red'" class="rounded-full text-xs font-semibold">
                    {{ record.efficiency_percent }}%
                  </a-tag>
                </template>
                <template v-else-if="column.key === 'productivity'">
                  <span class="text-blue-600 font-medium">{{ record.productivity_rate }} {{ record.unit }}/ng·h</span>
                </template>
                <template v-else-if="column.key === 'workers'">{{ record.workers_count }} người • {{ record.hours_spent }}h</template>
                <template v-else-if="column.key === 'actions'">
                  <a-popconfirm v-if="can('labor_productivity.delete')" title="Xóa bản ghi?" @confirm="deleteLaborRecord(record.id)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </template>
              </template>
            </a-table>
          </div>
        </div>
      </a-tab-pane>

      <!-- ============ MATERIALS TAB — Bill-based tracking (Giống APP) ============ -->
      <a-tab-pane key="materials" v-if="isTabVisible('materials')">
        <template #tab><a-tooltip title="Quản lý chi phí vật liệu theo bill nhập: theo dõi từng phiếu, duyệt thanh toán" placement="bottom">Vật liệu ({{ counts.material_bills || 0 }})</a-tooltip></template>
        <div class="p-4">
          <!-- Summary Cards -->
          <div class="grid grid-cols-4 gap-3 mb-4">
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100/60">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center"><span class="text-blue-600 text-xs">📄</span></div>
                <span class="text-[11px] text-gray-400">Tổng phiếu</span>
              </div>
              <div class="text-lg font-bold text-gray-800">{{ materialBills?.length || 0 }}</div>
            </div>
            <div class="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border border-emerald-100/60">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center"><span class="text-emerald-600 text-xs">💰</span></div>
                <span class="text-[11px] text-gray-400">Tổng chi phí</span>
              </div>
              <div class="text-lg font-bold text-emerald-600">{{ fmt(totalBillAmount) }}</div>
            </div>
            <div class="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-3 border border-green-100/60">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center"><CheckCircleOutlined class="text-green-600 text-xs" /></div>
                <span class="text-[11px] text-gray-400">Đã duyệt</span>
              </div>
              <div class="text-lg font-bold text-green-600">{{ (materialBills || []).filter(b => b.status === 'approved').length }}</div>
            </div>
            <div class="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-100/60">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center"><ClockCircleOutlined class="text-amber-600 text-xs" /></div>
                <span class="text-[11px] text-gray-400">Chờ duyệt</span>
              </div>
              <div class="text-lg font-bold text-amber-600">{{ (materialBills || []).filter(b => ['pending_management','pending_accountant'].includes(b.status)).length }}</div>
            </div>
          </div>

            <div v-if="can('material.create')" class="flex justify-end mb-3">
              <a-button type="primary" size="small" @click="openBillModal()">
                <template #icon><PlusOutlined /></template>Tạo phiếu nhập
              </a-button>
            </div>

          <!-- Bill Table -->
          <a-table :columns="billCols" :data-source="materialBills || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table hover-row"
            :custom-row="(record) => ({ onClick: () => openMaterialDetail(record), style: 'cursor: pointer' })">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'bill_number'">
                <div class="font-semibold text-blue-600">{{ record.bill_number || `#${record.id}` }}</div>
                <div class="text-[10px] text-gray-400">{{ fmtDate(record.bill_date) }}</div>
              </template>
              <template v-else-if="column.key === 'supplier'">
                <span v-if="record.supplier" class="text-sm">{{ record.supplier.name }}</span>
                <span v-else class="text-xs text-gray-400 italic">—</span>
              </template>
              <template v-else-if="column.key === 'material_group'">
                <span class="text-[11px] text-gray-500 line-clamp-2" :title="getMaterialGroups(record)">{{ getMaterialGroups(record) }}</span>
              </template>
              <template v-else-if="column.key === 'items_count'">
                <span class="font-medium">{{ record.items?.length || 0 }} <span class="text-gray-400 text-xs">mặt hàng</span></span>
              </template>
              <template v-else-if="column.key === 'total'">
                <span class="font-bold text-emerald-600">{{ fmt(record.total_amount) }}</span>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="billStatusColor(record.status)" class="rounded-full text-[10px]">{{ billStatusLabel(record.status) }}</a-tag>
              </template>
            </template>
          </a-table>
          <a-empty v-if="!materialBills?.length" description="Chưa có phiếu nhập vật liệu" />
        </div>
      </a-tab-pane>

      <!-- ============ EQUIPMENT TAB — 2 Sub-tabs (Thuê / Sử dụng) ============ -->
      <a-tab-pane key="equipment" v-if="isTabVisible('equipment')">
        <template #tab><a-tooltip title="Thuê, sử dụng thiết bị dự án — phiếu duyệt 3 cấp" placement="bottom">Thiết bị ({{ counts.equipment || 0 }})</a-tooltip></template>
        <div class="p-4">
          <!-- Sub-tab switcher -->
          <div class="flex items-center gap-2 mb-4">
            <a-button :type="eqSubTab === 'rental' ? 'primary' : 'default'" size="small" @click="eqSubTab = 'rental'">🏗️ Thuê ({{ equipmentRentals?.length || 0 }})</a-button>
            <a-button :type="eqSubTab === 'usage' ? 'primary' : 'default'" size="small" @click="eqSubTab = 'usage'">📦 Sử dụng ({{ assetUsages?.length || 0 }})</a-button>
          </div>

          <!-- ===== RENTAL SUB-TAB ===== -->
          <div v-if="eqSubTab === 'rental'">
            <!-- Summary -->
            <div class="grid grid-cols-4 gap-3 mb-4">
              <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100/60">
                <div class="text-[11px] text-gray-400">Tổng phiếu</div>
                <div class="text-lg font-bold text-blue-700">{{ equipmentRentals?.length || 0 }}</div>
              </div>
              <div class="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-3 border border-emerald-100/60">
                <div class="text-[11px] text-gray-400">Tổng chi phí</div>
                <div class="text-lg font-bold text-emerald-600">{{ fmt((equipmentRentals || []).reduce((s,r) => s + (r.total_cost || 0), 0)) }}</div>
              </div>
              <div class="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-3 border border-green-100/60">
                <div class="text-[11px] text-gray-400">Hoàn tất</div>
                <div class="text-lg font-bold text-green-600">{{ (equipmentRentals || []).filter(r => r.status === 'completed').length }}</div>
              </div>
              <div class="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-100/60">
                <div class="text-[11px] text-gray-400">Chờ duyệt</div>
                <div class="text-lg font-bold text-amber-600">{{ (equipmentRentals || []).filter(r => ['pending_management','pending_accountant'].includes(r.status)).length }}</div>
              </div>
            </div>
            <div class="flex justify-end mb-3">
              <a-button v-if="can('equipment.create')" type="primary" size="small" @click="openRentalModal()">
                <template #icon><PlusOutlined /></template>Tạo phiếu thuê
              </a-button>
            </div>
            <a-table :columns="rentalCols" :data-source="equipmentRentals || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table hover-row"
              :customRow="(r) => ({ onClick: () => openRentalDetail(r), style: 'cursor: pointer' })">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'equipment_name'">
                  <div class="font-semibold text-gray-800">{{ record.equipment_name }}</div>
                  <div class="text-[10px] text-gray-400">{{ record.supplier?.name || '—' }}</div>
                </template>
                <template v-else-if="column.key === 'period'">
                  <span class="text-xs">{{ fmtDate(record.rental_start_date) }} → {{ fmtDate(record.rental_end_date) }}</span>
                </template>
                <template v-else-if="column.key === 'total_cost'">
                  <span class="font-bold text-emerald-600">{{ fmt(record.total_cost) }}</span>
                </template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="eqWorkflowColor(record.status)" class="rounded-full text-[10px]">{{ eqWorkflowLabel(record.status) }}</a-tag>
                </template>
              </template>
            </a-table>
            <a-empty v-if="!equipmentRentals?.length" description="Chưa có phiếu thuê thiết bị" />
          </div>

          <!-- ===== USAGE SUB-TAB ===== -->
          <div v-else-if="eqSubTab === 'usage'">
            <div class="grid grid-cols-4 gap-3 mb-4">
              <div class="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-3 border border-teal-100/60">
                <div class="text-[11px] text-gray-400">Tổng phiếu</div>
                <div class="text-lg font-bold text-teal-700">{{ assetUsages?.length || 0 }}</div>
              </div>
              <div class="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-3 border border-amber-100/60">
                <div class="text-[11px] text-gray-400">Chờ duyệt</div>
                <div class="text-lg font-bold text-amber-600">{{ (assetUsages || []).filter(u => ['draft','pending_management','pending_accountant'].includes(u.status)).length }}</div>
              </div>
              <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100/60">
                <div class="text-[11px] text-gray-400">Đang dùng</div>
                <div class="text-lg font-bold text-blue-600">{{ (assetUsages || []).filter(u => u.status === 'in_use').length }}</div>
              </div>
              <div class="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-3 border border-green-100/60">
                <div class="text-[11px] text-gray-400">Đã trả</div>
                <div class="text-lg font-bold text-green-600">{{ (assetUsages || []).filter(u => u.status === 'returned').length }}</div>
              </div>
            </div>
            <div v-if="can('equipment.create')" class="flex justify-end mb-3">
              <a-button type="primary" size="small" @click="openUsageModal()">
                <template #icon><PlusOutlined /></template>Mượn thiết bị
              </a-button>
            </div>
            <a-table :columns="usageCols" :data-source="assetUsages || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table hover-row"
              :customRow="(u) => ({ onClick: () => openUsageDetail(u), style: 'cursor: pointer' })">
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'asset'">
                  <div class="font-semibold text-gray-800">{{ record.asset?.name || '—' }}</div>
                  <div class="text-[10px] text-gray-400 font-mono">{{ record.asset?.code || '' }}</div>
                </template>
                <template v-else-if="column.key === 'receiver'">
                  <span class="text-sm">{{ record.receiver?.name || '—' }}</span>
                </template>
                <template v-else-if="column.key === 'quantity'">{{ record.quantity }}</template>
                <template v-else-if="column.key === 'dates'">
                  <div class="text-xs">Nhận: {{ fmtDate(record.received_date) }}</div>
                  <div v-if="record.returned_date" class="text-xs text-green-600">Trả: {{ fmtDate(record.returned_date) }}</div>
                </template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="usageStatusColor(record.status)" class="rounded-full text-[10px]">{{ usageStatusLabel(record.status) }}</a-tag>
                </template>
              </template>
            </a-table>
            <a-empty v-if="!assetUsages?.length" description="Chưa có phiếu mượn thiết bị" />
          </div>
        </div>
      </a-tab-pane>

      <!-- ============ DOCUMENTS TAB ============ -->
      <a-tab-pane key="documents" v-if="isTabVisible('documents')">
        <template #tab><a-tooltip title="Kho tài liệu dự án: bản vẽ, hợp đồng, biên bản, hình ảnh" placement="bottom">Tài liệu ({{ counts.attachments || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('project.document.upload')" type="primary" size="small" @click="showDocUploadModal = true">
              <template #icon><UploadOutlined /></template>Upload tài liệu
            </a-button>
          </div>
          <a-table :columns="docCols" :data-source="project.attachments || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <div class="flex items-center gap-2">
                  <FileOutlined class="text-blue-400" />
                  <a href="#" @click.prevent="openFilePreview(record)" class="text-blue-600 hover:underline">{{ record.original_name || record.file_name }}</a>
                </div>
              </template>
              <template v-else-if="column.key === 'size'">{{ formatFileSize(record.file_size) }}</template>
              <template v-else-if="column.key === 'date'">{{ fmtDateTime(record.created_at) }}</template>
              <template v-else-if="column.key === 'actions'">
                <div class="flex gap-1">
                  <a :href="record.file_url" target="_blank"><a-button type="text" size="small"><DownloadOutlined /></a-button></a>
                  <a-button v-if="can('project.document.upload')" type="text" size="small" @click="openEditDocModal(record)"><EditOutlined /></a-button>
                  <a-popconfirm v-if="can('project.document.delete')" title="Xóa tài liệu?" @confirm="deleteDoc(record)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </div>
              </template>
            </template>
          </a-table>
          <a-empty v-if="!project.attachments?.length" description="Chưa có tài liệu" />
        </div>
      </a-tab-pane>

    </a-tabs>
      </div> <!-- End Tab Content Container -->
    </div> <!-- End Left Column -->

    <!-- Right Column: Sidebar -->
    <div class="lg:col-span-1 space-y-6">
      
      <!-- 1. Project Progress Sidebar Card -->
      <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col items-center">
        <div class="relative mb-4">
          <a-progress
            type="circle"
            :percent="overallProjectProgress"
            :size="160"
            :stroke-width="10"
            :stroke-color="overallProjectProgress >= 100 ? { '0%': '#10B981', '100%': '#059669' } : { '0%': '#3B82F6', '100%': '#6366F1' }"
            trail-color="#F1F5F9"
          >
            <template #format="percent">
              <div class="flex flex-col items-center">
                <span class="text-3xl font-black text-gray-800">{{ percent }}%</span>
                <span class="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Tiến độ</span>
              </div>
            </template>
          </a-progress>
        </div>
        <div class="text-center">
          <div class="text-sm font-bold text-gray-700">Tiến độ tổng thể</div>
          <div class="text-xs text-gray-400 mt-1">{{ taskStats.completed }}/{{ taskStats.total }} hạng mục hoàn thành</div>
          <div v-if="progressSourceLabel" class="mt-1 inline-flex items-center gap-1 text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span> Tính từ: {{ progressSourceLabel }}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mt-6 w-full pt-6 border-t border-gray-50">
          <div class="bg-blue-50/50 rounded-xl p-3 border border-blue-100/50">
            <div class="text-[10px] text-blue-500 uppercase font-bold mb-1">Công việc</div>
            <div class="text-lg font-bold text-blue-700">{{ taskStats.total }}</div>
          </div>
          <div class="bg-amber-50/50 rounded-xl p-3 border border-amber-100/50">
            <div class="text-[10px] text-amber-500 uppercase font-bold mb-1">Rủi ro</div>
            <div class="text-lg font-bold text-amber-700">{{ activeRisks }}</div>
          </div>
        </div>
      </div>

      <!-- 2. Financial Overview Sidebar Card -->
      <div v-if="can('finance.view') || can('cost.view')" class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h4 class="text-sm font-bold text-gray-800 mb-5 flex items-center gap-2">
          <span class="w-1 h-4 bg-blue-600 rounded-full"></span> Báo cáo tài chính
        </h4>
        <div class="space-y-4">
          <div>
            <div class="flex justify-between items-end mb-1.5">
              <span class="text-xs text-gray-400">Giá trị hợp đồng</span>
              <span class="text-sm font-bold text-gray-800">{{ fmt(project.contract?.contract_value) }}</span>
            </div>
          </div>
          <div>
            <div class="flex justify-between items-end mb-1.5">
              <span class="text-xs text-gray-400">Chi phí thực tế</span>
              <span class="text-sm font-bold text-red-500">{{ fmt(totalCosts) }}</span>
            </div>
          </div>
          <div>
            <div class="flex justify-between items-end mb-1.5">
              <span class="text-xs text-gray-400">Lợi nhuận dự kiến</span>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold" :class="profitMargin >= 0 ? 'text-emerald-500' : 'text-red-500'">{{ (profitMargin).toFixed(1) }}%</span>
                <span class="text-sm font-bold text-emerald-600" v-if="profitMargin >= 0">{{ fmt(project.contract?.contract_value - totalCosts) }}</span>
              </div>
            </div>
          </div>
          
          <div class="pt-4 border-t border-gray-50">
            <div class="flex justify-between text-[11px] text-gray-400 mb-1.5 font-medium">
              <span>Sử dụng ngân sách</span>
              <span :class="budgetUsage > 90 ? 'text-red-500' : 'text-blue-500'">{{ budgetUsage.toFixed(1) }}%</span>
            </div>
            <div class="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-700"
                :class="budgetUsage > 90 ? 'bg-red-500' : 'bg-blue-500'" 
                :style="{ width: Math.min(budgetUsage, 100) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. Key Information Sidebar Card -->
      <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm overflow-hidden relative">
        <div class="absolute -right-4 -top-4 w-16 h-16 bg-blue-50 rounded-full"></div>
        <h4 class="text-sm font-bold text-gray-800 mb-5 flex items-center gap-2 relative">
          <span class="w-1 h-4 bg-indigo-600 rounded-full"></span> Thông tin dự án
        </h4>
        <div class="space-y-4 relative">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 text-blue-600"><UserOutlined /></div>
            <div class="min-w-0">
              <div class="text-[10px] text-gray-400 uppercase font-bold leading-tight">Khách hàng</div>
              <div class="text-sm font-semibold text-gray-700 truncate line-clamp-1">{{ project.customer?.name || '—' }}</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 text-indigo-600"><UserOutlined /></div>
            <div class="min-w-0">
              <div class="text-[10px] text-gray-400 uppercase font-bold leading-tight">Quản lý dự án (PM)</div>
              <div class="text-sm font-semibold text-gray-700 truncate line-clamp-1">{{ project.project_manager?.name || '—' }}</div>
            </div>
          </div>
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0 text-emerald-600"><CalendarOutlined /></div>
            <div class="min-w-0 flex-1">
              <div class="text-[10px] text-gray-400 uppercase font-bold leading-tight">Thời gian thực hiện</div>
              <div class="text-sm font-semibold text-gray-700">{{ fmtDate(project.start_date) }} — {{ fmtDate(project.end_date) }}</div>
              <div class="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full bg-indigo-500 rounded-full" :style="{ width: Math.min(timelineProgress, 100) + '%' }"></div>
              </div>
              <div class="text-[10px] text-gray-400 mt-1 flex justify-between">
                <span>{{ timelineProgress > 100 ? 'Quá hạn' : 'Tiến độ thời gian' }}</span>
                <span>{{ daysRemaining }} ngày nữa</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 4. Personnel Mini Card -->
      <div class="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div class="flex items-center justify-between mb-5">
           <h4 class="text-sm font-bold text-gray-800 flex items-center gap-2">
            <span class="w-1 h-4 bg-teal-600 rounded-full"></span> Nhân sự tham gia
          </h4>
          <span class="text-[10px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-bold">{{ project.personnel?.length || 0 }}</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <a-tooltip v-for="p in (project.personnel || []).slice(0, 12)" :key="p.id" :title="p.user?.name">
            <div class="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm -ml-2 first:ml-0 transition-transform hover:scale-110 hover:z-10 cursor-pointer"
              :style="{ background: `hsl(${(p.user?.name || '').length * 37 % 360}, 60%, 55%)` }">
              {{ (p.user?.name || '?')[0] }}
            </div>
          </a-tooltip>
          <div v-if="(project.personnel || []).length > 12" class="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-400 -ml-2">+{{ project.personnel.length - 12 }}</div>
        </div>
        <a-button type="link" size="small" class="mt-4 !p-0 !h-auto text-xs" @click="activeTabGroup = 'team'; activeTab = 'personnel'">Tất cả thành viên →</a-button>
      </div>

      <!-- 5. Alerts Sidebar Card -->
      <div class="bg-red-50 rounded-2xl border border-red-100 p-5 shadow-sm" v-if="delayWarnings.length > 0 || openDefects > 0">
        <h4 class="text-sm font-bold text-red-800 mb-4 flex items-center gap-2">
          <span class="w-1 h-4 bg-red-600 rounded-full"></span> Cảnh báo dự án
        </h4>
        <div class="space-y-3">
          <div v-if="delayWarnings.length > 0" class="flex gap-2.5 items-start">
            <div class="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-500 mt-0.5 flex-shrink-0"><ClockCircleOutlined class="text-[10px]" /></div>
            <div class="text-xs text-red-700">
              Có <span class="font-bold">{{ delayWarnings.length }}</span> công việc đang <span class="font-bold underline">chậm tiến độ</span>.
            </div>
          </div>
          <div v-if="openDefects > 0" class="flex gap-2.5 items-start">
            <div class="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 mt-0.5 flex-shrink-0"><WarningOutlined class="text-[10px]" /></div>
            <div class="text-xs text-orange-800">
              Phát hiện <span class="font-bold text-red-600">{{ openDefects }} lỗi thi công</span> chưa được khắc phục.
            </div>
          </div>
        </div>
      </div>
    </div> <!-- End Right Column -->
  </div> <!-- End Main Grid -->

  <!-- ==================== FILE PREVIEW MODAL (Premium Inline Viewer) ==================== -->
  <a-modal v-model:open="showFilePreview" :title="null" :width="1100" :footer="null" centered destroy-on-close class="crm-modal file-preview-modal" :bodyStyle="{ padding: 0 }">
    <div v-if="previewFile" class="file-preview-container">
      <!-- Header bar -->
      <div class="flex items-center justify-between px-5 py-3 border-b bg-gradient-to-r from-gray-50 to-white">
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-sm" :style="{ background: fileExtColor(previewFile) }">
            {{ fileExt(previewFile).toUpperCase().slice(0, 3) }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="text-sm font-semibold text-gray-800 truncate">{{ previewFile.original_name || previewFile.file_name }}</div>
            <div class="text-[11px] text-gray-400 flex items-center gap-2">
              <span>{{ fileExt(previewFile).toUpperCase() }}</span>
              <span v-if="previewFile.file_size">• {{ formatFileSize(previewFile.file_size) }}</span>
              <span v-if="previewFile.created_at">• {{ fmtDate(previewFile.created_at) }}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <a :href="previewFile.file_url" target="_blank" class="no-underline">
            <a-button size="small" type="primary" ghost><DownloadOutlined /> Tải xuống</a-button>
          </a>
          <a :href="previewFile.file_url" target="_blank" class="no-underline">
            <a-button size="small"><LinkOutlined /> Mở tab mới</a-button>
          </a>
        </div>
      </div>

      <!-- Preview content -->
      <div class="file-preview-body">
        <!-- Loading overlay -->
        <div v-if="previewLoading" class="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
          <a-spin size="large" tip="Đang tải file..." />
        </div>

        <!-- Image preview (with zoom) -->
        <template v-if="isImageFile(previewFile)">
          <div class="flex items-center justify-center p-4 bg-gray-900/5 min-h-[65vh]">
            <img :src="previewFile.file_url" :alt="previewFile.original_name"
                 class="max-w-full max-h-[70vh] rounded-lg shadow-xl object-contain transition-transform duration-300 cursor-zoom-in"
                 :class="{ 'scale-150 cursor-zoom-out': imageZoomed }"
                 @click="imageZoomed = !imageZoomed"
                 @load="previewLoading = false" />
          </div>
        </template>

        <!-- PDF preview -->
        <template v-else-if="isPdfFile(previewFile)">
          <iframe :src="previewFile.file_url + '#toolbar=1'" class="w-full border-0" style="height: 75vh;" @load="previewLoading = false" />
        </template>

        <!-- Video preview (mp4, webm, mov) -->
        <template v-else-if="isVideoFile(previewFile)">
          <div class="flex items-center justify-center p-6 bg-black min-h-[50vh]">
            <video controls autoplay :src="previewFile.file_url" class="max-w-full max-h-[70vh] rounded-lg shadow-xl" @loadeddata="previewLoading = false">
              Trình duyệt không hỗ trợ phát video.
            </video>
          </div>
        </template>

        <!-- Word / Excel / PowerPoint via Google Docs Viewer -->
        <template v-else-if="isOfficeFile(previewFile)">
          <iframe :src="googleDocsViewerUrl(previewFile)" class="w-full border-0" style="height: 75vh;" @load="previewLoading = false" />
        </template>

        <!-- Text / Code files -->
        <template v-else-if="isTextFile(previewFile)">
          <iframe :src="previewFile.file_url" class="w-full border-0 bg-white" style="height: 75vh;" @load="previewLoading = false" />
        </template>

        <!-- Unsupported file type -->
        <template v-else>
          <div class="flex flex-col items-center justify-center py-20 px-8 bg-gray-50 min-h-[40vh]">
            <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center mb-5 shadow-inner">
              <FileOutlined class="text-3xl text-gray-500" />
            </div>
            <div class="text-lg font-semibold text-gray-600 mb-2">{{ previewFile.original_name || previewFile.file_name }}</div>
            <div class="text-sm text-gray-400 mb-6">Loại file <strong>.{{ fileExt(previewFile) }}</strong> — {{ formatFileSize(previewFile.file_size) }}</div>
            <a :href="previewFile.file_url" target="_blank" class="no-underline">
              <a-button type="primary" size="large" class="px-8">
                <DownloadOutlined /> Tải xuống để xem
              </a-button>
            </a>
          </div>
        </template>
      </div>
    </div>
  </a-modal>

  <!-- ==================== MODALS ==================== -->

  <!-- Edit Project Modal -->
  <a-modal v-model:open="showEditProject" title="Chỉnh sửa dự án" :width="640" @ok="saveProject" ok-text="Lưu" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tên dự án" required v-bind="fieldStatus('name')"><a-input v-model:value="projectForm.name" size="large" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Khách hàng" v-bind="fieldStatus('customer_id')"><a-select v-model:value="projectForm.customer_id" show-search option-filter-prop="label" size="large" class="w-full">
          <a-select-option v-for="u in users" :key="u.id" :value="u.id" :label="u.name">{{ u.name }}</a-select-option>
        </a-select></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Quản lý"><a-select v-model:value="projectForm.project_manager_id" show-search option-filter-prop="label" size="large" class="w-full" allow-clear>
          <a-select-option v-for="u in users" :key="u.id" :value="u.id" :label="u.name">{{ u.name }}</a-select-option>
        </a-select></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Trạng thái"><a-select v-model:value="projectForm.status" size="large" class="w-full">
          <a-select-option value="planning">Lập kế hoạch</a-select-option>
          <a-select-option value="in_progress">Đang thi công</a-select-option>
          <a-select-option value="completed">Hoàn thành</a-select-option>
          <a-select-option value="cancelled">Đã hủy</a-select-option>
        </a-select></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Ngày BĐ" v-bind="fieldStatus('start_date')"><a-date-picker v-model:value="projectForm.start_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Ngày KT" v-bind="fieldStatus('end_date')"><a-date-picker v-model:value="projectForm.end_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="Mô tả"><a-textarea v-model:value="projectForm.description" :rows="3" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Cost Modal -->
  <a-modal v-model:open="showCostModal" :title="editingCost ? 'Sửa chi phí' : 'Thêm chi phí'" :width="640" @ok="saveCost" ok-text="Lưu" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tên chi phí" required v-bind="fieldStatus('name')"><a-input v-model:value="costForm.name" size="large" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Số tiền" required v-bind="fieldStatus('amount')"><a-input-number v-model:value="costForm.amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Ngày" required v-bind="fieldStatus('cost_date')"><a-date-picker v-model:value="costForm.cost_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item v-if="costGroups.length" label="Nhóm chi phí"><a-select v-model:value="costForm.cost_group_id" size="large" class="w-full" allow-clear placeholder="Chọn nhóm">
          <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id">{{ g.name }}</a-select-option>
        </a-select></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Nhà thầu phụ"><a-select v-model:value="costForm.subcontractor_id" size="large" class="w-full" allow-clear show-search option-filter-prop="label" placeholder="Chọn NTP">
          <a-select-option v-for="s in (project.subcontractors || [])" :key="s.id" :value="s.id" :label="s.name">{{ s.name }}</a-select-option>
        </a-select></a-form-item></a-col>
      </a-row>
      <a-form-item label="Nhà cung cấp">
        <a-select v-model:value="costForm.supplier_id" size="large" class="w-full" allow-clear show-search option-filter-prop="label" placeholder="Chọn Nhà cung cấp (Vật tư/Thiết bị)">
          <a-select-option v-for="s in suppliers" :key="s.id" :value="s.id" :label="s.name">{{ s.name }}</a-select-option>
        </a-select>
      </a-form-item>
      <!-- Budget Item Selector -->
      <a-form-item v-if="budgetItemOptions.length" label="Ngân sách liên kết">
        <a-select v-model:value="costForm.budget_item_id" size="large" class="w-full" allow-clear show-search option-filter-prop="label" placeholder="Chọn hạng mục ngân sách để theo dõi chi tiêu">
          <a-select-option v-for="bi in budgetItemOptions" :key="bi.id" :value="bi.id" :label="bi.label">
            <div class="flex justify-between items-center">
              <span>{{ bi.label }}</span>
              <span class="text-xs" :class="(bi.remaining < 0) ? 'text-red-500' : 'text-green-500'">{{ (bi.remaining < 0) ? 'Vượt ' + fmt(Math.abs(bi.remaining)) : 'Còn ' + fmt(bi.remaining) }}</span>
            </div>
          </a-select-option>
        </a-select>
        <div v-if="costForm.budget_item_id" class="mt-1 text-xs text-gray-400">
          {{ (() => { const bi = budgetItemOptions.find(b => b.id === costForm.budget_item_id); return bi ? `Dự toán: ${fmt(bi.estimated)} — Đã chi: ${fmt(bi.actual)} — Còn: ${fmt(bi.remaining)}` : '' })() }}
        </div>
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Vật tư"><a-input v-model:value="costForm.material_id" size="large" placeholder="Mã vật tư" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Số lượng"><a-input-number v-model:value="costForm.quantity" :min="0" size="large" class="w-full" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Đơn vị"><a-input v-model:value="costForm.unit" size="large" placeholder="VD: m², kg..." /></a-form-item></a-col>
      </a-row>
      <a-form-item label="Mô tả"><a-textarea v-model:value="costForm.description" :rows="2" /></a-form-item>
      <!-- Inline Attachments -->
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Tệp đính kèm</div>
        <div v-if="editingCost?.attachments?.length" class="flex flex-wrap gap-2 mb-2">
          <div v-for="a in editingCost.attachments" :key="a.id" class="relative group">
            <a href="#" @click.prevent="openFilePreview(a)" 
               class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition cursor-pointer border"
               :class="isAttachmentDeleted(costForm, a.id) ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-60' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 shadow-sm'">
              <span v-if="isAttachmentDeleted(costForm, a.id)" class="text-[10px] line-through italic mr-1 flex items-center gap-1"><CloseCircleOutlined /> Đã đánh dấu xóa</span>
              <EyeOutlined v-else class="text-[10px]" /> {{ a.original_name || a.file_name }}
            </a>
            <div v-if="!isAttachmentDeleted(costForm, a.id)" 
                 class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-red-600 z-10"
                 @click.stop="toggleDeleteAttachment(costForm, a.id)">
              <CloseOutlined class="text-[10px] font-bold" />
            </div>
            <div v-else 
                 class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-blue-600 z-10"
                 @click.stop="toggleDeleteAttachment(costForm, a.id)">
              <ReloadOutlined class="text-[10px] font-bold" />
            </div>
          </div>
        </div>
        <input type="file" multiple @change="e => modalFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="modalFiles.length" class="text-[10px] text-green-600 mt-1">{{ modalFiles.length }} tệp đã chọn — sẽ upload khi lưu</div>
      </div>
    </a-form>
  </a-modal>

  <!-- Contract Modal -->
  <a-modal v-model:open="showContractModal" :title="editingContract ? 'Sửa hợp đồng' : 'Tạo hợp đồng'" :width="640" @ok="saveContract" ok-text="Lưu" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Giá trị HĐ" required v-bind="fieldStatus('contract_value')"><a-input-number v-model:value="contractForm.contract_value" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" /></a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Ngày ký" v-bind="fieldStatus('signed_date')"><a-date-picker v-model:value="contractForm.signed_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item>
        </a-col>
      </a-row>
      <a-form-item v-if="editingContract?.rejected_reason" label="Lý do từ chối">
        <a-alert :message="editingContract.rejected_reason" type="error" show-icon class="!text-xs" />
      </a-form-item>
      <!-- Inline Attachments -->
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Tệp hợp đồng đính kèm</div>
        <div v-if="editingContract?.attachments?.length" class="flex flex-wrap gap-2 mb-2">
          <div v-for="a in editingContract.attachments" :key="a.id" class="relative group">
            <a href="#" @click.prevent="openFilePreview(a)" 
               class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition cursor-pointer border"
               :class="isAttachmentDeleted(contractForm, a.id) ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-60' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 shadow-sm'">
              <span v-if="isAttachmentDeleted(contractForm, a.id)" class="text-[10px] line-through italic mr-1 flex items-center gap-1"><CloseCircleOutlined /> Đã đánh dấu xóa</span>
              <EyeOutlined v-else class="text-[10px]" /> {{ a.original_name || a.file_name }}
            </a>
            <div v-if="!isAttachmentDeleted(contractForm, a.id)" 
                 class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-red-600 z-10"
                 @click.stop="toggleDeleteAttachment(contractForm, a.id)">
              <CloseOutlined class="text-[10px] font-bold" />
            </div>
            <div v-else 
                 class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-blue-600 z-10"
                 @click.stop="toggleDeleteAttachment(contractForm, a.id)">
              <ReloadOutlined class="text-[10px] font-bold" />
            </div>
          </div>
        </div>
        <input type="file" multiple @change="e => modalFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="modalFiles.length" class="text-[10px] text-green-600 mt-1">{{ modalFiles.length }} tệp đã chọn — sẽ upload khi lưu</div>
      </div>
    </a-form>
  </a-modal>

  <!-- Payment Modal -->
  <a-modal v-model:open="showPaymentModal" :title="editingPayment ? 'Cập nhật thanh toán' : 'Thêm đợt thanh toán'" :width="560" @ok="savePayment" ok-text="Lưu lại" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4 px-1">
      <a-row :gutter="20">
        <a-col :span="12">
          <a-form-item label="Đợt thanh toán số">
            <template #label><span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Đợt thanh toán số</span></template>
            <a-input v-model:value="paymentForm.payment_number" size="large" placeholder="Tự động" disabled class="w-full rounded-xl border-gray-200">
              <template #prefix><FileTextOutlined class="text-gray-400" /></template>
            </a-input>
          </a-form-item>
        </a-col>
        <a-col :span="12" v-if="project.contract">
          <a-form-item label="Hợp đồng liên kết">
            <template #label><span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Hợp đồng liên kết</span></template>
            <a-select v-model:value="paymentForm.contract_id" size="large" class="w-full" allow-clear dropdown-class-name="rounded-xl overflow-hidden">
              <template #prefix><AuditOutlined class="text-gray-400" /></template>
              <a-select-option :value="project.contract.id" class="py-2 px-3">HĐ #{{ project.contract.id }} — {{ fmt(project.contract.contract_value) }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="20" class="mt-2">
        <a-col :span="12">
          <a-form-item label="Số tiền" required v-bind="fieldStatus('amount')">
            <template #label><span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Số tiền đợt này</span></template>
            <a-input-number v-model:value="paymentForm.amount" :min="0" size="large" class="w-full rounded-xl border-gray-200" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')">
              <template #prefix><span class="text-blue-500 mr-1">₫</span></template>
            </a-input-number>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Ngày đến hạn" v-bind="fieldStatus('due_date')">
            <template #label><span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Ngày đến hạn</span></template>
            <a-date-picker v-model:value="paymentForm.due_date" size="large" class="w-full rounded-xl border-gray-200" format="DD/MM/YYYY" value-format="YYYY-MM-DD" placeholder="Chọn ngày hạn" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="Ghi chú đợt TT" class="mt-2">
        <template #label><span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Nội dung ghi chú</span></template>
        <a-textarea v-model:value="paymentForm.notes" :rows="2" placeholder="Nhập ghi chú chi tiết cho đợt thanh toán này..." class="rounded-xl border-gray-200 py-3" />
      </a-form-item>

      <!-- Premium Upload Section -->
      <div class="mt-2 pt-4 border-t border-dashed border-gray-200">
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
          <span>Chứng từ đính kèm (Ảnh/PDF)</span>
          <span v-if="modalFiles.length" class="text-green-500">{{ modalFiles.length }} file mới</span>
        </div>
        
        <div v-if="editingPayment?.attachments?.length" class="flex flex-wrap gap-2 mb-3">
          <div v-for="a in editingPayment.attachments" :key="a.id" class="relative group">
            <div @click="openFilePreview(a)" 
               class="flex items-center gap-2 text-xs px-3 py-2 rounded-xl transition-all cursor-pointer border"
               :class="isAttachmentDeleted(paymentForm, a.id) ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-60' : 'bg-gray-50 border-gray-100 hover:bg-white hover:border-blue-300 hover:shadow-sm'">
              <span v-if="isAttachmentDeleted(paymentForm, a.id)" class="text-[10px] line-through italic flex items-center gap-1"><CloseCircleOutlined /> Đã đánh dấu xóa</span>
              <template v-else>
                <FileTextOutlined class="text-blue-500" /> 
                <span class="max-w-[120px] truncate text-gray-600 font-medium">{{ a.original_name || a.file_name }}</span>
                <EyeOutlined class="text-gray-300 group-hover:text-blue-400 ml-1" />
              </template>
            </div>
            <div v-if="!isAttachmentDeleted(paymentForm, a.id)" 
                 class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-red-600 z-10"
                 @click.stop="toggleDeleteAttachment(paymentForm, a.id)">
              <CloseOutlined class="text-[10px] font-bold" />
            </div>
            <div v-else 
                 class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-blue-600 z-10"
                 @click.stop="toggleDeleteAttachment(paymentForm, a.id)">
              <ReloadOutlined class="text-[10px] font-bold" />
            </div>
          </div>
        </div>

        <div class="relative group">
          <input type="file" multiple @change="e => modalFiles = [...(e.target.files || [])]" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <div class="border-2 border-dashed border-gray-100 group-hover:border-blue-200 group-hover:bg-blue-50/30 rounded-2xl p-4 transition-all flex flex-col items-center justify-center text-center">
            <div class="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center mb-2 group-hover:bg-blue-100 transition-colors">
              <UploadOutlined class="text-gray-400 group-hover:text-blue-500" />
            </div>
            <div class="text-xs font-medium text-gray-500">Tải lên chứng từ hoặc hình ảnh</div>
            <div class="text-[10px] text-gray-300 mt-1">Dung lượng tối đa 10MB mỗi file</div>
          </div>
        </div>
      </div>
    </a-form>
  </a-modal>

  <!-- Reject Payment Modal -->
  <!-- Payment Proof Modal — KH upload chứng từ trước khi đánh dấu đã TT (giống APP) -->
  <a-modal v-model:open="showPaymentProofModal" title="Xác nhận thanh toán — Tải chứng từ" :width="520" @ok="submitPaymentProof" ok-text="Xác nhận đã thanh toán" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal" :ok-button-props="{ disabled: !paymentProofFiles.length }">
    <div class="mt-4">
      <div v-if="paymentProofTarget" class="mb-4 p-3 bg-blue-50 rounded-xl">
        <div class="font-semibold text-gray-700">Đợt #{{ paymentProofTarget.payment_number }}</div>
        <div class="text-lg text-blue-600 font-bold">{{ fmt(paymentProofTarget.amount) }}</div>
        <div v-if="paymentProofTarget.due_date" class="text-xs text-gray-500">Hạn TT: {{ fmtDate(paymentProofTarget.due_date) }}</div>
      </div>
      <a-form-item label="Chứng từ thanh toán" required :validate-status="!paymentProofFiles.length ? 'error' : 'success'" :help="!paymentProofFiles.length ? 'Bắt buộc tải lên ít nhất 1 file chứng từ' : `${paymentProofFiles.length} file đã chọn`">
        <input type="file" multiple accept=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx" @change="onPaymentProofFileChange" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
      </a-form-item>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="Ngày thanh toán">
            <a-input v-model:value="paymentProofForm.paid_date" type="date" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Số tiền thực TT">
            <a-input-number v-model:value="paymentProofForm.actual_amount" :min="0" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" class="w-full" placeholder="Bằng số tiền gốc nếu bỏ trống" />
          </a-form-item>
        </a-col>
      </a-row>
    </div>
  </a-modal>

  <a-modal v-model:open="showRejectPaymentModal" title="Từ chối thanh toán" :width="400" @ok="rejectPaymentAction" ok-text="Từ chối" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal" :ok-button-props="{ danger: true, disabled: !rejectPaymentReason.trim() }">
    <div class="mt-4">
      <div v-if="rejectPaymentTarget" class="mb-3 p-3 bg-gray-50 rounded-xl">
        <div class="font-semibold text-gray-700">Đợt #{{ rejectPaymentTarget.payment_number }}</div>
        <div class="text-sm text-green-600 font-semibold">{{ fmt(rejectPaymentTarget.amount) }}</div>
      </div>
      <a-form-item label="Lý do từ chối" :validate-status="!rejectPaymentReason.trim() ? 'error' : ''" help="Bắt buộc nhập lý do">
        <a-textarea v-model:value="rejectPaymentReason" placeholder="Nhập lý do từ chối thanh toán..." :rows="3" :maxlength="1000" show-count />
      </a-form-item>
    </div>
  </a-modal>

  <!-- Shared File Upload Modal — used by Cost, Payment, Additional Cost -->
  <a-modal v-model:open="showAttachModal" :title="attachModalTitle" :width="540" @ok="submitAttachFiles" ok-text="Upload" cancel-text="Đóng" centered destroy-on-close class="crm-modal" :ok-button-props="{ disabled: !attachFiles.length }">
    <div class="mt-4">
      <!-- Existing attachments -->
      <div v-if="attachTarget?.attachments?.length" class="mb-4">
        <div class="text-xs font-semibold text-gray-500 mb-2">File đã đính kèm ({{ attachTarget.attachments.length }})</div>
        <div v-for="att in attachTarget.attachments" :key="att.id" class="flex items-center gap-2 py-1.5 px-3 bg-gray-50 rounded-lg mb-1 text-sm">
          <FileOutlined class="text-gray-400" />
          <a href="#" @click.prevent="openFilePreview(att)" class="text-blue-600 hover:underline flex-1 truncate cursor-pointer">{{ att.original_name || att.file_name }}</a>
          <span class="text-gray-400 text-xs">{{ formatFileSize(att.file_size) }}</span>
        </div>
      </div>
      <!-- Upload new files -->
      <a-form-item label="Chọn file mới" required>
        <input type="file" ref="attachFileInput" @change="onAttachFileChange" multiple class="block w-full text-sm py-2 px-3 border border-gray-300 rounded-lg" />
      </a-form-item>
      <div v-if="attachFiles.length" class="text-xs text-green-600">{{ attachFiles.length }} file sẵn sàng upload</div>
    </div>
  </a-modal>

  <!-- Personnel Modal -->
  <a-modal v-model:open="showPersonnelModal" title="Phân công nhân sự" :width="500" @ok="savePersonnel" ok-text="Phân công" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Nhân viên" required v-bind="fieldStatus('user_id')"><a-select v-model:value="personnelForm.user_id" show-search option-filter-prop="label" size="large" class="w-full" placeholder="Chọn nhân viên">
        <a-select-option v-for="u in users" :key="u.id" :value="u.id" :label="u.name">{{ u.name }} ({{ u.email }})</a-select-option>
      </a-select></a-form-item>
      <a-form-item v-if="personnelRoles.length" label="Vai trò"><a-select v-model:value="personnelForm.personnel_role_id" size="large" class="w-full" allow-clear placeholder="Chọn vai trò">
        <a-select-option v-for="r in personnelRoles" :key="r.id" :value="r.id">{{ r.name }}</a-select-option>
      </a-select></a-form-item>
    </a-form>
  </a-modal>

  <!-- Log Modal -->
  <a-modal v-model:open="showLogModal" :title="editingLog ? 'Cập nhật nhật ký thi công' : 'Thêm nhật ký thi công'" :width="640" @ok="saveLog" ok-text="Lưu" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Ngày ghi nhật ký" required v-bind="fieldStatus('log_date')">
            <a-date-picker v-model:value="logForm.log_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" :disabled="!!editingLog" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Thời tiết">
            <a-select v-model:value="logForm.weather" size="large" class="w-full" placeholder="Chọn thời tiết" allow-clear>
              <a-select-option value="Nắng">☀️ Nắng</a-select-option>
              <a-select-option value="Mưa">🌧️ Mưa</a-select-option>
              <a-select-option value="Mây">⛅ Mây</a-select-option>
              <a-select-option value="Gió">💨 Gió</a-select-option>
              <a-select-option value="Bão">🌪️ Bão</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Công việc liên quan">
        <a-select v-model:value="logForm.task_id" size="large" class="w-full" placeholder="Chọn công việc (tùy chọn)" allow-clear show-search :filter-option="(input, opt) => opt.label?.toLowerCase().includes(input.toLowerCase())" @change="onLogTaskChange">
          <a-select-option v-for="t in allTasks" :key="t.id" :value="t.id" :label="t.name">
            <div class="flex justify-between items-center w-full">
              <span>{{ t.name }}</span>
              <span v-if="t.start_date" class="text-[10px] text-gray-400 font-normal ml-2">🕒 {{ dayjs(t.start_date).format('DD/MM/YYYY') }}</span>
            </div>
          </a-select-option>
        </a-select>
        <div v-if="logForm.task_id && logTaskCurrentProgress !== null" class="text-xs text-blue-500 mt-1">
          Tiến độ hiện tại: <strong>{{ logTaskCurrentProgress }}%</strong>
        </div>
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Số lượng nhân công">
            <a-input-number v-model:value="logForm.personnel_count" :min="0" size="large" class="w-full" placeholder="VD: 10" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Phần trăm hoàn thành">
            <template v-if="logTaskMinProgress >= 100">
              <div class="flex items-center gap-2 py-2">
                <a-progress :percent="100" size="small" status="success" style="flex:1" />
                <span class="text-xs text-emerald-600 font-bold">Đã hoàn thành 100%</span>
              </div>
            </template>
            <a-slider v-else v-model:value="logForm.completion_percentage" :min="logTaskMinProgress" :max="100" :step="5" :marks="logSliderMarks" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Ghi chú">
        <a-textarea v-model:value="logForm.notes" :rows="4" placeholder="Mô tả công việc đã thực hiện trong ngày..." :maxlength="2000" show-count />
      </a-form-item>
      <!-- Inline Attachments (giống Cost/Defect modal) -->
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Chứng từ / Hình ảnh đính kèm</div>
        <div v-if="editingLog?.attachments?.length" class="flex flex-wrap gap-2 mb-2">
          <div v-for="a in editingLog.attachments" :key="a.id" class="relative group">
            <a href="#" @click.prevent="openFilePreview(a)" 
               class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition cursor-pointer border"
               :class="isAttachmentDeleted(logForm, a.id) ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-60' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 shadow-sm'">
              <span v-if="isAttachmentDeleted(logForm, a.id)" class="text-[10px] line-through italic mr-1 flex items-center gap-1"><CloseCircleOutlined /> Đã đánh dấu xóa</span>
              <EyeOutlined v-else class="text-[10px]" /> {{ a.original_name || a.file_name }}
            </a>
            <div v-if="!isAttachmentDeleted(logForm, a.id)" 
                 class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-red-600 z-10"
                 @click.stop="toggleDeleteAttachment(logForm, a.id)">
              <CloseOutlined class="text-[10px] font-bold" />
            </div>
            <div v-else 
                 class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-blue-600 z-10"
                 @click.stop="toggleDeleteAttachment(logForm, a.id)">
              <ReloadOutlined class="text-[10px] font-bold" />
            </div>
          </div>
        </div>
        <input type="file" multiple @change="e => modalFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
        <div v-if="modalFiles.length" class="text-[10px] text-green-600 mt-1">{{ modalFiles.length }} tệp đã chọn — sẽ upload khi lưu</div>
      </div>
    </a-form>
  </a-modal>

  <!-- Defect Modal -->
  <a-modal v-model:open="showDefectModal" :title="editingDefect ? 'Sửa lỗi' : 'Báo lỗi mới'" :width="640" @ok="saveDefect" ok-text="Lưu" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Mô tả lỗi" required v-bind="fieldStatus('description')"><a-textarea v-model:value="defectForm.description" :rows="3" placeholder="Nhập mô tả chi tiết lỗi..." /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Mức độ" required v-bind="fieldStatus('severity')"><a-select v-model:value="defectForm.severity" size="large" class="w-full">
          <a-select-option value="low">Thấp</a-select-option>
          <a-select-option value="medium">Trung bình</a-select-option>
          <a-select-option value="high">Nghiêm trọng</a-select-option>
          <a-select-option value="critical">Rất nghiêm trọng</a-select-option>
        </a-select></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Trạng thái"><a-select v-model:value="defectForm.status" size="large" class="w-full">
          <a-select-option value="open">Mở</a-select-option>
          <a-select-option value="in_progress">Đang xử lý</a-select-option>
          <a-select-option value="fixed">Đã sửa</a-select-option>
          <a-select-option value="verified">Đã xác nhận</a-select-option>
        </a-select></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Công việc liên quan"><a-select v-model:value="defectForm.task_id" size="large" class="w-full" allow-clear show-search option-filter-prop="label" placeholder="Chọn công việc">
          <a-select-option v-for="t in allTasks" :key="t.id" :value="t.id" :label="t.name">{{ t.name }}</a-select-option>
        </a-select></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Giai đoạn nghiệm thu"><a-select v-model:value="defectForm.acceptance_stage_id" size="large" class="w-full" allow-clear placeholder="Chọn giai đoạn">
          <a-select-option v-for="s in (project.acceptance_stages || [])" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
        </a-select></a-form-item></a-col>
      </a-row>
      <a-form-item label="Loại lỗi"><a-select v-model:value="defectForm.defect_type" size="large" class="w-full" allow-clear placeholder="Chọn loại">
        <a-select-option value="standard_violation">Vi phạm tiêu chuẩn</a-select-option>
        <a-select-option value="other">Khác</a-select-option>
      </a-select></a-form-item>
      <!-- Inline Attachments — Ảnh trước khi sửa -->
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-orange-500 mb-2 flex items-center gap-1.5">
          <PictureOutlined /> Ảnh lỗi (Trước khi sửa)
          <span class="text-[10px] font-normal text-gray-400 ml-1">— dùng để đối chiếu sau khi khắc phục</span>
        </div>
        <div v-if="editingDefect?.before_images?.length" class="flex flex-wrap gap-2 mb-2">
          <div v-for="a in editingDefect.before_images" :key="a.id" class="relative group">
            <a href="#" @click.prevent="openFilePreview(a)"
               class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition cursor-pointer border"
               :class="isAttachmentDeleted(defectForm, a.id) ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-60' : 'bg-orange-50 text-orange-600 border-orange-100 hover:bg-orange-100 shadow-sm'">
              <span v-if="isAttachmentDeleted(defectForm, a.id)" class="text-[10px] line-through italic mr-1 flex items-center gap-1"><CloseCircleOutlined /> Đã đánh dấu xóa</span>
              <EyeOutlined v-else class="text-[10px]" /> {{ a.original_name || a.file_name }}
            </a>
            <div v-if="!isAttachmentDeleted(defectForm, a.id)"
                 class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-red-600 z-10"
                 @click.stop="toggleDeleteAttachment(defectForm, a.id)">
              <CloseOutlined class="text-[10px] font-bold" />
            </div>
            <div v-else
                 class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-blue-600 z-10"
                 @click.stop="toggleDeleteAttachment(defectForm, a.id)">
              <ReloadOutlined class="text-[10px] font-bold" />
            </div>
          </div>
        </div>
        <input type="file" multiple accept="image/*,.pdf,.doc,.docx" @change="e => modalFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-orange-200 rounded-lg hover:border-orange-400 transition bg-orange-50/30" />
        <div v-if="modalFiles.length" class="text-[10px] text-orange-600 mt-1">{{ modalFiles.length }} ảnh đã chọn — sẽ upload khi lưu</div>
      </div>
    </a-form>
  </a-modal>

  <!-- Reject Defect Fix Modal -->
  <a-modal v-model:open="showRejectDefectModal" title="Từ chối sửa lỗi" :width="480" @ok="confirmRejectDefect" ok-text="Từ chối" cancel-text="Hủy" ok-button-props="{ danger: true }" centered destroy-on-close class="crm-modal">
    <div class="mt-4">
      <p class="text-sm text-gray-600 mb-3">Lý do từ chối sửa lỗi <strong>"{{ rejectDefectRecord?.description?.substring(0, 50) }}..."</strong>:</p>
      <a-textarea v-model:value="rejectDefectReason" :rows="3" placeholder="Nhập lý do từ chối — lỗi này cần sửa lại như thế nào?" />
    </div>
  </a-modal>

  <!-- Change Request Modal -->
  <a-modal v-model:open="showCRModal" :title="editingCR ? 'Cập nhật yêu cầu thay đổi' : 'Tạo yêu cầu thay đổi'" :width="720" @ok="saveCR" ok-text="Lưu" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tiêu đề" required v-bind="fieldStatus('title')"><a-input v-model:value="crForm.title" size="large" placeholder="Tiêu đề yêu cầu thay đổi" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Loại thay đổi" required v-bind="fieldStatus('change_type')">
            <a-select v-model:value="crForm.change_type" size="large" class="w-full" placeholder="Chọn loại">
              <a-select-option value="scope">Phạm vi</a-select-option>
              <a-select-option value="schedule">Tiến độ</a-select-option>
              <a-select-option value="cost">Chi phí</a-select-option>
              <a-select-option value="quality">Chất lượng</a-select-option>
              <a-select-option value="resource">Nguồn lực</a-select-option>
              <a-select-option value="other">Khác</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Mức độ ưu tiên" required>
            <a-select v-model:value="crForm.priority" size="large" class="w-full" placeholder="Chọn mức">
              <a-select-option value="low">Thấp</a-select-option>
              <a-select-option value="medium">Trung bình</a-select-option>
              <a-select-option value="high">Cao</a-select-option>
              <a-select-option value="urgent">Khẩn cấp</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Mô tả chi tiết" required><a-textarea v-model:value="crForm.description" :rows="3" placeholder="Mô tả chi tiết yêu cầu thay đổi..." :maxlength="5000" show-count /></a-form-item>
      <a-form-item label="Lý do thay đổi"><a-textarea v-model:value="crForm.reason" :rows="2" placeholder="Lý do cần thay đổi..." :maxlength="2000" show-count /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Ảnh hưởng chi phí (VNĐ)"><a-input-number v-model:value="crForm.estimated_cost_impact" size="large" class="w-full" :min="0" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" /></a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Ảnh hưởng tiến độ (ngày)"><a-input-number v-model:value="crForm.estimated_schedule_impact_days" size="large" class="w-full" :min="0" /></a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Phân tích ảnh hưởng"><a-textarea v-model:value="crForm.impact_analysis" :rows="2" placeholder="Ảnh hưởng tới dự án..." :maxlength="5000" show-count /></a-form-item>
      <a-form-item label="Kế hoạch triển khai"><a-textarea v-model:value="crForm.implementation_plan" :rows="2" placeholder="Các bước triển khai sau khi duyệt..." :maxlength="5000" show-count /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Risk Modal -->
  <a-modal v-model:open="showRiskModal" :title="editingRisk ? 'Cập nhật rủi ro' : 'Thêm rủi ro'" :width="720" @ok="saveRisk" ok-text="Lưu" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tiêu đề" required v-bind="fieldStatus('title')"><a-input v-model:value="riskForm.title" size="large" placeholder="Tên rủi ro" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="Danh mục" required v-bind="fieldStatus('category')">
            <a-select v-model:value="riskForm.category" size="large" class="w-full" placeholder="Loại">
              <a-select-option value="schedule">Tiến độ</a-select-option>
              <a-select-option value="cost">Chi phí</a-select-option>
              <a-select-option value="quality">Chất lượng</a-select-option>
              <a-select-option value="scope">Phạm vi</a-select-option>
              <a-select-option value="resource">Nguồn lực</a-select-option>
              <a-select-option value="technical">Kỹ thuật</a-select-option>
              <a-select-option value="external">Bên ngoài</a-select-option>
              <a-select-option value="other">Khác</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Xác suất" required>
            <a-select v-model:value="riskForm.probability" size="large" class="w-full" placeholder="Mức">
              <a-select-option value="very_low">Rất thấp</a-select-option>
              <a-select-option value="low">Thấp</a-select-option>
              <a-select-option value="medium">Trung bình</a-select-option>
              <a-select-option value="high">Cao</a-select-option>
              <a-select-option value="very_high">Rất cao</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Mức ảnh hưởng" required>
            <a-select v-model:value="riskForm.impact" size="large" class="w-full" placeholder="Mức">
              <a-select-option value="very_low">Rất thấp</a-select-option>
              <a-select-option value="low">Thấp</a-select-option>
              <a-select-option value="medium">Trung bình</a-select-option>
              <a-select-option value="high">Cao</a-select-option>
              <a-select-option value="very_high">Rất cao</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Loại rủi ro">
            <a-select v-model:value="riskForm.risk_type" size="large" class="w-full">
              <a-select-option value="threat">🔴 Mối đe dọa</a-select-option>
              <a-select-option value="opportunity">🟢 Cơ hội</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Người chịu trách nhiệm">
            <a-select v-model:value="riskForm.owner_id" size="large" class="w-full" allow-clear show-search option-filter-prop="label" placeholder="Chọn người">
              <a-select-option v-for="u in users" :key="u.id" :value="u.id" :label="u.name">{{ u.name }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Mô tả"><a-textarea v-model:value="riskForm.description" :rows="2" placeholder="Mô tả chi tiết rủi ro..." :maxlength="5000" show-count /></a-form-item>
      <a-form-item label="Kế hoạch giảm thiểu"><a-textarea v-model:value="riskForm.mitigation_plan" :rows="2" placeholder="Phương án giảm thiểu rủi ro..." :maxlength="5000" show-count /></a-form-item>
      <a-form-item label="Kế hoạch dự phòng"><a-textarea v-model:value="riskForm.contingency_plan" :rows="2" placeholder="Phương án dự phòng..." :maxlength="5000" show-count /></a-form-item>
      <a-form-item label="Ngày mục tiêu xử lý">
        <a-date-picker v-model:value="riskForm.target_resolution_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" />
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- Task Modal -->
  <a-modal v-model:open="showTaskModal" :title="editingTask ? 'Cập nhật công việc' : 'Thêm công việc'" :width="640" @ok="saveTask" ok-text="Lưu" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tên công việc" required v-bind="fieldStatus('name')"><a-input v-model:value="taskForm.name" size="large" placeholder="Tên công việc" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Công việc cha">
            <a-select v-model:value="taskForm.parent_id" size="large" class="w-full" allow-clear placeholder="Không có (công việc gốc)" show-search option-filter-prop="label">
              <a-select-option v-for="t in parentTaskOptions" :key="t.id" :value="t.id" :label="t.name">{{ t.name }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Giai đoạn" v-if="(project.phases || []).length">
            <a-select v-model:value="taskForm.phase_id" size="large" class="w-full" allow-clear placeholder="Chọn giai đoạn">
              <a-select-option v-for="p in (project.phases || [])" :key="p.id" :value="p.id">{{ p.name }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Ngày bắt đầu"><a-date-picker v-model:value="taskForm.start_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Ngày kết thúc"><a-date-picker v-model:value="taskForm.end_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Thời lượng (ngày)"><a-input-number v-model:value="taskForm.duration" :min="0" size="large" class="w-full" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="Trạng thái">
            <a-select v-model:value="taskForm.status" size="large" class="w-full">
              <a-select-option value="pending">Chờ</a-select-option>
              <a-select-option value="in_progress">Đang thực hiện</a-select-option>
              <a-select-option value="completed">Hoàn thành</a-select-option>
              <a-select-option value="on_hold">Tạm dừng</a-select-option>
              <a-select-option value="cancelled">Hủy</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Ưu tiên">
            <a-select v-model:value="taskForm.priority" size="large" class="w-full">
              <a-select-option value="low">Thấp</a-select-option>
              <a-select-option value="medium">Trung bình</a-select-option>
              <a-select-option value="high">Cao</a-select-option>
              <a-select-option value="urgent">Khẩn cấp</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Người giao việc">
            <a-select v-model:value="taskForm.assigned_to" size="large" class="w-full" allow-clear show-search option-filter-prop="label" placeholder="Chọn người">
              <a-select-option v-for="u in users" :key="u.id" :value="u.id" :label="u.name">{{ u.name }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Tiến độ (%)">
        <a-slider v-model:value="taskForm.progress_percentage" :min="0" :max="100" :marks="{0:'0%', 25:'25%', 50:'50%', 75:'75%', 100:'100%'}" disabled />
        <div class="text-xs text-gray-400 mt-1">⚡ Tiến độ được tự động tính từ nhật ký thi công</div>
      </a-form-item>
      <a-form-item label="Mô tả"><a-textarea v-model:value="taskForm.description" :rows="3" placeholder="Mô tả công việc..." :maxlength="5000" show-count /></a-form-item>
    </a-form>
  </a-modal>


  <!-- SUBCONTRACTOR DETAIL DRAWER -->
  <a-drawer v-model:open="showSubDetailDrawer" title="Chi tiết Nhà thầu phụ" :width="560" @close="subDetail = null" destroy-on-close class="crm-drawer">
    <div v-if="subDetail" class="space-y-6 pb-24">
      <!-- Subcontractor Info -->
      <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white font-bold text-lg">{{ (subDetail.name || '?').charAt(0) }}</div>
        <div class="flex-1">
          <div class="text-xs text-gray-400 uppercase font-bold tracking-wider mb-0.5">Nhà thầu phụ</div>
          <div class="text-lg font-bold text-gray-800">{{ subDetail.name }}</div>
          <div class="flex items-center gap-2 mt-1">
             <a-tag class="rounded-full text-[10px]">{{ subDetail.category || 'N/A' }}</a-tag>
             <a-tag :color="subProgressColors[subDetail.progress_status]" class="rounded-full text-[10px]">{{ subProgressLabels[subDetail.progress_status] || subDetail.progress_status }}</a-tag>
          </div>
        </div>
      </div>

      <!-- Financial Status -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-blue-50 p-4 rounded-2xl border border-blue-100">
          <div class="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">Tổng giá trị hợp đồng</div>
          <div class="text-lg font-bold text-blue-600">{{ fmt(subDetail.total_quote) }}</div>
        </div>
        <div class="bg-green-50 p-4 rounded-2xl border border-green-100">
          <div class="text-[10px] text-green-400 font-bold uppercase tracking-wider mb-1">Đã quyết toán</div>
          <div class="text-lg font-bold text-green-600">{{ fmt(subDetail.total_paid || 0) }}</div>
        </div>
      </div>

      <!-- Payment Progress Bar -->
      <div class="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="flex justify-between items-center mb-2">
           <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Tiến độ thanh toán</span>
           <span class="text-xs font-bold text-blue-600">{{ Math.round(((subDetail.total_paid || 0) / (subDetail.total_quote || 1)) * 100) }}%</span>
        </div>
        <a-progress :percent="Math.round(((subDetail.total_paid || 0) / (subDetail.total_quote || 1)) * 100)" :stroke-width="12" stroke-color="#3b82f6" trail-color="#f3f4f6" />
      </div>

      <!-- Bank Account Information -->
      <div class="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><BankOutlined /> Thông tin thanh toán</div>
        <div class="grid grid-cols-1 gap-3 text-sm">
          <div class="flex justify-between items-center py-2 border-b border-gray-50">
            <span class="text-gray-400">Ngân hàng</span>
            <span class="font-medium text-gray-700">{{ subDetail.bank_name || '—' }}</span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-50">
            <span class="text-gray-400">Số tài khoản</span>
            <span class="font-bold text-blue-600">{{ subDetail.bank_account_number || '—' }}</span>
          </div>
          <div class="flex justify-between items-center py-2">
            <span class="text-gray-400">Chủ tài khoản</span>
            <span class="font-medium text-gray-700 uppercase">{{ subDetail.bank_account_name || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Date Information -->
      <div class="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><CalendarOutlined /> Thời gian dự kiến</div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Ngày bắt đầu</div>
            <div class="text-sm font-medium text-gray-700">{{ fmtDate(subDetail.progress_start_date) || '—' }}</div>
          </div>
          <div>
            <div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Ngày hoàn thành</div>
            <div class="text-sm font-medium text-gray-700">{{ fmtDate(subDetail.progress_end_date) || '—' }}</div>
          </div>
        </div>
      </div>
      
      <!-- Attachments -->
      <div class="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 text-blue-500">
            <PaperClipOutlined /> Hình ảnh / Tài liệu ({{ subDetail.attachments?.length || 0 }})
          </div>
          <a-button v-if="can('subcontractor.update')" type="link" size="small" @click="openAttachModal('subcontractor', subDetail)" class="p-0">
            <PlusOutlined /> Thêm file
          </a-button>
        </div>
        <div v-if="subDetail.attachments?.length" class="flex flex-wrap gap-2">
          <div v-for="att in subDetail.attachments" :key="att.id"
               class="relative group cursor-pointer"
               @click="openFilePreview(att)">
            <img v-if="att.mime_type?.startsWith('image/')"
                 :src="att.file_url || att.file_path"
                 class="w-20 h-20 object-cover rounded-xl border border-gray-200 shadow-sm group-hover:opacity-80 transition" />
            <div v-else class="w-20 h-20 rounded-xl border border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-1 group-hover:bg-gray-100 transition">
              <FileOutlined class="text-2xl text-gray-400" />
              <span class="text-[9px] text-gray-400 uppercase font-bold">{{ (att.original_name || att.file_name || '').split('.').pop() }}</span>
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-gray-400 italic">Chưa có tài liệu đính kèm.</div>
      </div>

      <!-- Action Footer -->
      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 transition-all">
        <a-popconfirm v-if="can('subcontractor.delete')" title="Xóa NTP này khỏi dự án?" @confirm="deleteSub(subDetail)">
          <a-button danger type="text" class="px-0"><DeleteOutlined /> Gỡ khỏi dự án</a-button>
        </a-popconfirm>
        <div class="flex gap-2">
          <a-button type="primary" size="small" ghost @click="openSubPaymentHistory(subDetail)"><HistoryOutlined /> TT Nhà thầu</a-button>
          <a-button type="link" @click="openSubModal(subDetail)" class="p-0 border-0 shadow-none"><EditOutlined /> Sửa thông tin</a-button>
          <a-button v-if="subDetail.progress_status === 'not_started'" type="primary" size="small" @click="approveSub(subDetail)">Bắt đầu</a-button>
          <a-button v-if="subDetail.status === 'approved' && can('subcontractor.approve')" type="primary" size="small" ghost danger @click="revertSubcontractorAction(subDetail)">Hoàn duyệt</a-button>
        </div>
      </div>

    </div>
  </a-drawer>

  <!-- COST DETAIL DRAWER -->
  <a-drawer v-model:open="showCostDetail" title="Chi tiết Phiếu chi" :width="560" @close="costDetailRecord = null" destroy-on-close class="crm-drawer">
    <div v-if="costDetailRecord" class="space-y-6">
      <!-- Status Header -->
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-100"><DollarOutlined class="text-2xl" /></div>
          <div>
             <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Mã số: #{{ costDetailRecord.id }}</div>
             <div class="text-lg font-bold text-gray-800">{{ costDetailRecord.name }}</div>
          </div>
        </div>
        <a-tag :color="costStatusColors[costDetailRecord.status]" class="rounded-full px-4 py-1 text-xs font-semibold">{{ costStatusLabels[costDetailRecord.status] || costDetailRecord.status }}</a-tag>
      </div>

      <!-- Financial summary -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><LineChartOutlined /> Thông tin thanh toán</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Số tiền chi</span>
            <span class="text-xl font-bold text-red-500">{{ fmt(costDetailRecord.amount) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Ngày chi</span>
            <span class="font-medium text-gray-700">{{ fmtDate(costDetailRecord.cost_date) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5">
            <span class="text-gray-400">Nhóm chi phí</span>
            <a-tag class="rounded-full bg-blue-50 text-blue-600 border-blue-100">{{ costDetailRecord.cost_group?.name || '—' }}</a-tag>
          </div>
        </div>
      </div>

      <!-- People Information -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><TeamOutlined /> Nhân sự liên quan</div>
        <div class="grid grid-cols-1 gap-3">
          <div class="flex items-center gap-3">
            <a-avatar size="small" class="bg-gray-400">{{ costDetailRecord.creator?.name?.charAt(0) }}</a-avatar>
            <div class="flex-1">
              <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Người tạo phiếu</div>
              <div class="text-sm font-medium text-gray-700">{{ costDetailRecord.creator?.name || '—' }} <span class="text-gray-400 text-xs font-normal">• {{ fmtDateTime(costDetailRecord.created_at) }}</span></div>
            </div>
          </div>
          <div v-if="costDetailRecord.management_approver" class="flex items-center gap-3 pt-3 border-t border-gray-50">
            <a-avatar size="small" class="bg-green-500">{{ costDetailRecord.management_approver.name.charAt(0) }}</a-avatar>
            <div class="flex-1">
              <div class="text-[10px] text-green-500 uppercase font-bold tracking-wider">Ban điều hành duyệt</div>
              <div class="text-sm font-medium text-gray-700">{{ costDetailRecord.management_approver.name }} <span class="text-gray-400 text-xs font-normal">• {{ fmtDateTime(costDetailRecord.management_approved_at) }}</span></div>
            </div>
          </div>
          <div v-if="costDetailRecord.accountant_approver" class="flex items-center gap-3 pt-3 border-t border-gray-50">
            <a-avatar size="small" class="bg-blue-500">{{ costDetailRecord.accountant_approver.name.charAt(0) }}</a-avatar>
            <div class="flex-1">
              <div class="text-[10px] text-blue-500 uppercase font-bold tracking-wider">Kế toán xác nhận</div>
              <div class="text-sm font-medium text-gray-700">{{ costDetailRecord.accountant_approver.name }} <span class="text-gray-400 text-xs font-normal">• {{ fmtDateTime(costDetailRecord.accountant_approved_at) }}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Attachments Section -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="flex justify-between items-center mb-4">
           <div class="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 text-blue-500"><FileProtectOutlined /> Chứng từ đính kèm ({{ costDetailRecord.attachments?.length || 0 }})</div>
           <a-button v-if="can('cost.update')" type="link" size="small" @click="openAttachModal('cost', costDetailRecord)" class="p-0">Thêm tệp</a-button>
        </div>
        <div v-if="costDetailRecord.attachments?.length" class="flex flex-wrap gap-2">
           <div v-for="att in costDetailRecord.attachments" :key="att.id" 
                class="group relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-400 transition"
                @click="openFilePreview(att)">
             <img v-if="isImageFile(att)" :src="att.file_url || att.url" class="w-full h-full object-cover" />
             <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-[10px] font-bold text-gray-400">
               {{ fileExt(att).toUpperCase() }}
             </div>
             <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
               <EyeOutlined class="text-white text-lg" />
             </div>
           </div>
        </div>
        <a-empty v-else :image="null" description="Chưa có chứng từ" class="text-gray-300 my-0 py-2" />
      </div>

      <!-- Action Footer -->
      <div class="pt-6 mt-6 border-t border-gray-100 flex flex-wrap justify-between items-center bg-white sticky bottom-0 z-10 py-4">
        <div class="flex gap-2">
           <a-popconfirm v-if="can('cost.delete') && costDetailRecord.status === 'draft'" title="Xóa phiếu chi này?" @confirm="deleteCost(costDetailRecord)">
             <a-button danger type="text"><DeleteOutlined /> Xóa phiếu</a-button>
           </a-popconfirm>
           <a-button v-if="can('cost.update') && costDetailRecord.status === 'draft'" size="small" @click="openCostModal(costDetailRecord)"><EditOutlined /> Sửa</a-button>
        </div>
        <div class="flex gap-2">
          <template v-if="costDetailRecord.status === 'draft' && can('cost.submit')">
            <a-button type="primary" :loading="actionLoading[`submit-cost-${costDetailRecord.id}`]" @click="handleSubmitCost(costDetailRecord)">Gửi duyệt</a-button>
          </template>
          <template v-if="costDetailRecord.status === 'pending_management_approval' && can('cost.approve.management')">
            <a-button type="primary" class="bg-green-600 border-green-600" @click="approveCostMgmt(costDetailRecord)">BĐH Duyệt</a-button>
            <a-button danger ghost @click="openRejectCostModal(costDetailRecord)">Từ chối</a-button>
          </template>
          <template v-if="costDetailRecord.status === 'pending_accountant_approval' && can('cost.approve.accountant')">
            <a-button type="primary" class="bg-green-600 border-green-600" @click="approveCostAcct(costDetailRecord)">KT Xác nhận</a-button>
            <a-button danger ghost @click="openRejectCostModal(costDetailRecord)">Từ chối</a-button>
          </template>

          <!-- Hoàn duyệt action -->
          <a-button v-if="['pending_management_approval', 'pending_accountant_approval', 'rejected'].includes(costDetailRecord.status) && (can('cost.approve.management') || costDetailRecord.created_by === $page.props.auth?.user?.id)"
                    class="border-orange-500 text-orange-500 hover:bg-orange-50 transition-colors" @click="revertCostAction(costDetailRecord)">
            <ReloadOutlined /> Hoàn duyệt
          </a-button>
        </div>
      </div>
    </div>
  </a-drawer>

  <!-- CONTRACT DETAIL DRAWER -->
  <a-drawer v-model:open="showContractDetail" title="Chi tiết Hợp đồng" :width="560" @close="contractDetailRecord = null" destroy-on-close class="crm-drawer">
    <div v-if="contractDetailRecord" class="space-y-6">
      <!-- Status Header -->
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100"><AuditOutlined class="text-2xl" /></div>
          <div>
             <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Mã HĐ: #{{ contractDetailRecord.id }}</div>
             <div class="text-lg font-bold text-gray-800">Hợp đồng dự án</div>
          </div>
        </div>
        <a-tag :color="contractStatusColors[contractDetailRecord.status]" class="rounded-full px-4 py-1 text-xs font-semibold">{{ contractStatusLabels[contractDetailRecord.status] || contractDetailRecord.status }}</a-tag>
      </div>

      <!-- Financial summary -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><DollarOutlined /> Thông tin hợp đồng</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Giá trị hợp đồng</span>
            <span class="text-xl font-bold text-green-600">{{ fmt(contractDetailRecord.contract_value) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Ngày ký</span>
            <span class="font-medium text-gray-700">{{ fmtDate(contractDetailRecord.signed_date) || 'Chưa có' }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5">
            <span class="text-gray-400">Trạng thái</span>
            <a-tag :color="contractStatusColors[contractDetailRecord.status]" class="rounded-full">{{ contractStatusLabels[contractDetailRecord.status] || contractDetailRecord.status }}</a-tag>
          </div>
        </div>
      </div>

      <!-- Approval Info -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><TeamOutlined /> Thông tin phê duyệt</div>
        <div class="grid grid-cols-1 gap-3">
          <div v-if="contractDetailRecord.approver" class="flex items-center gap-3">
            <a-avatar size="small" class="bg-green-500">{{ contractDetailRecord.approver.name?.charAt(0) }}</a-avatar>
            <div class="flex-1">
              <div class="text-[10px] text-green-500 uppercase font-bold tracking-wider">Người phê duyệt</div>
              <div class="text-sm font-medium text-gray-700">{{ contractDetailRecord.approver.name }} <span v-if="contractDetailRecord.approved_at" class="text-gray-400 text-xs font-normal">• {{ fmtDateTime(contractDetailRecord.approved_at) }}</span></div>
            </div>
          </div>
          <div v-else class="text-xs text-gray-400 flex items-center gap-1.5">
            <ClockCircleOutlined /> Chưa có thông tin phê duyệt
          </div>
        </div>
      </div>

      <!-- Rejected Reason -->
      <div v-if="contractDetailRecord.rejected_reason" class="p-5 bg-red-50 rounded-2xl border border-red-100 shadow-sm">
        <div class="text-xs font-bold text-red-500 uppercase tracking-wider mb-3 flex items-center gap-2"><CloseCircleOutlined /> Lý do từ chối</div>
        <div class="text-sm text-red-700 leading-relaxed">{{ contractDetailRecord.rejected_reason }}</div>
      </div>

      <!-- Attachments Section -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="flex justify-between items-center mb-4">
           <div class="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 text-blue-500"><FileProtectOutlined /> Tệp đính kèm ({{ contractDetailRecord.attachments?.length || 0 }})</div>
        </div>
        <div v-if="contractDetailRecord.attachments?.length" class="flex flex-wrap gap-2">
           <div v-for="att in contractDetailRecord.attachments" :key="att.id"
                class="group relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-400 transition"
                @click="openFilePreview(att)">
             <img v-if="isImageFile(att)" :src="att.file_url || att.url" class="w-full h-full object-cover" />
             <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-[10px] font-bold text-gray-400">
               {{ fileExt(att).toUpperCase() }}
             </div>
             <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
               <EyeOutlined class="text-white text-lg" />
             </div>
           </div>
        </div>
        <a-empty v-else :image="null" description="Chưa có tệp đính kèm" class="text-gray-300 my-0 py-2" />
      </div>

      <!-- Action Footer -->
      <div class="pt-6 mt-6 border-t border-gray-100 flex flex-wrap justify-between items-center bg-white sticky bottom-0 z-10 py-4">
        <div class="flex gap-2">
           <a-button v-if="can('contract.update')" size="small" @click="openContractModal(contractDetailRecord); showContractDetail = false"><EditOutlined /> Sửa</a-button>
        </div>
        <div class="flex gap-2">
          <template v-if="contractDetailRecord.status === 'draft' && can('contract.update')">
            <a-button type="primary" :loading="actionLoading['submit-contract']" @click="submitContractForApproval(contractDetailRecord)">Gửi duyệt</a-button>
          </template>
          <template v-if="contractDetailRecord.status === 'pending_customer_approval' && can('contract.approve.level_1')">
            <a-button type="primary" class="bg-green-600 border-green-600" :loading="actionLoading['approve-contract']" @click="approveContract(contractDetailRecord)">Phê duyệt</a-button>
            <a-button danger ghost @click="openRejectContractModal(contractDetailRecord)">Từ chối</a-button>
          </template>
        </div>
      </div>
    </div>
  </a-drawer>

  <!-- Reject Contract Modal -->
  <a-modal v-model:open="showRejectContractModal" title="Từ chối hợp đồng" :width="480" @ok="rejectContract" ok-text="Từ chối" cancel-text="Hủy" :confirm-loading="savingForm" :ok-button-props="{ danger: true }" centered destroy-on-close class="crm-modal">
    <div class="mt-4">
      <div v-if="rejectingContract" class="mb-3 p-3 bg-red-50 rounded-lg border border-red-100">
        <div class="font-medium text-red-800">Hợp đồng #{{ rejectingContract.id }}</div>
        <div class="text-xs text-red-600">{{ fmt(rejectingContract.contract_value) }} — {{ contractStatusLabels[rejectingContract.status] }}</div>
      </div>
      <a-form-item label="Lý do từ chối" required>
        <a-textarea v-model:value="rejectContractReason" :rows="3" placeholder="Nhập lý do từ chối hợp đồng..." />
      </a-form-item>
    </div>
  </a-modal>

  <!-- MATERIAL DETAIL DRAWER -->
  <a-drawer v-model:open="showMaterialDetailDrawer" title="Chi tiết Phiếu nhập vật liệu" :width="560" @close="materialDetail = null" destroy-on-close class="crm-drawer">
    <div v-if="materialDetail" class="space-y-6 pb-24">
      <!-- Header -->
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100"><FileOutlined class="text-2xl" /></div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Số phiếu: {{ materialDetail.bill_number || `#${materialDetail.id}` }}</div>
            <div class="text-lg font-bold text-gray-800">Phiếu nhập vật liệu</div>
          </div>
        </div>
        <a-tag :color="billStatusColor(materialDetail.status)" class="rounded-full px-4 py-1 text-xs font-semibold">{{ billStatusLabel(materialDetail.status) }}</a-tag>
      </div>

      <!-- Financial summary -->
      <div class="grid grid-cols-2 gap-4">
        <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Tổng tiền</div>
          <div class="text-xl font-bold text-emerald-600">{{ fmt(materialDetail.total_amount) }}</div>
        </div>
        <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Số mặt hàng</div>
          <div class="text-xl font-bold text-blue-600">{{ materialDetail.items?.length || 0 }} <span class="text-xs font-normal text-gray-400">mục</span></div>
        </div>
      </div>

      <!-- Info -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><BankOutlined /> Thông tin chung</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Nhà cung cấp</span>
            <span class="font-bold text-gray-800">{{ materialDetail.supplier?.name || '—' }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Ngày nhập</span>
            <span class="font-medium text-gray-700">{{ fmtDate(materialDetail.bill_date) }}</span>
          </div>
          <div v-if="materialDetail.notes" class="py-2.5">
            <span class="text-gray-400 block mb-1">Ghi chú:</span>
            <div class="text-sm text-gray-600 italic whitespace-pre-wrap">{{ materialDetail.notes }}</div>
          </div>
        </div>
      </div>

      <!-- Items Table -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><HistoryOutlined /> Chi tiết vật liệu</div>
        <table class="w-full text-xs">
          <thead><tr class="border-b border-gray-100 text-gray-400"><th class="text-left pb-2">Vật liệu</th><th class="text-right pb-2">SL</th><th class="text-right pb-2">Thành tiền</th></tr></thead>
          <tbody class="divide-y divide-gray-50">
            <tr v-for="item in (materialDetail.items || [])" :key="item.id">
              <td class="py-3">
                <div class="font-bold text-gray-700">{{ item.material?.name || '—' }}</div>
                <div class="text-[10px] text-gray-400">{{ item.material?.unit }}</div>
              </td>
              <td class="py-3 text-right">
                <div class="font-medium text-blue-600">{{ fmtQty(item.quantity) }}</div>
                <div class="text-[10px] text-gray-400">{{ fmt(item.unit_price) }}</div>
              </td>
              <td class="py-3 text-right font-bold text-emerald-600">{{ fmt(item.total_price) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Rejected Reason -->
      <div v-if="materialDetail.rejected_reason" class="p-5 bg-red-50 rounded-2xl border border-red-100">
        <div class="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-2"><CloseCircleOutlined /> Lý do từ chối</div>
        <div class="text-sm text-red-700">{{ materialDetail.rejected_reason }}</div>
      </div>

      <!-- Attachments -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 text-blue-500"><CameraOutlined /> Chứng từ nhập hàng ({{ materialDetail.attachments?.length || 0 }})</div>
          <a-button type="link" size="small" @click="openAttachModal('material_bill', materialDetail)" class="p-0">Thêm tệp</a-button>
        </div>
        <div v-if="materialDetail.attachments?.length" class="flex flex-wrap gap-2">
          <div v-for="att in materialDetail.attachments" :key="att.id" 
               class="group relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-400 transition"
               @click="openFilePreview(att)">
            <img v-if="isImageFile(att)" :src="att.file_url || att.url" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-[10px] font-bold text-gray-400">
              {{ fileExt(att).toUpperCase() }}
            </div>
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <EyeOutlined class="text-white text-lg" />
            </div>
          </div>
        </div>
        <a-empty v-else :image="null" description="Chưa có ảnh chứng từ" class="text-gray-300 my-0 py-2" />
      </div>

      <!-- Action Footer -->
      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 transition-all">
        <div class="flex gap-2">
          <a-popconfirm v-if="['draft', 'rejected'].includes(materialDetail.status) && can('material.delete')" title="Xóa phiếu nhập này?" @confirm="deleteBill(materialDetail)">
            <a-button danger type="text"><DeleteOutlined /> Xóa phiếu</a-button>
          </a-popconfirm>
          <a-button v-if="['draft', 'rejected'].includes(materialDetail.status)" size="small" @click="openBillModal(materialDetail)"><EditOutlined /> Sửa</a-button>
        </div>
        <div class="flex gap-2">
          <template v-if="['draft', 'rejected'].includes(materialDetail.status) && can('material.update')">
            <a-button type="primary" @click="submitBill(materialDetail)">Gửi duyệt</a-button>
          </template>
          <template v-if="materialDetail.status === 'pending_management' && can('cost.approve.management')">
            <a-button type="primary" class="bg-green-600 border-green-600" @click="approveBillManagement(materialDetail)">BĐH Duyệt</a-button>
            <a-button danger ghost @click="openRejectBillModal(materialDetail)">Từ chối</a-button>
          </template>
          <template v-if="materialDetail.status === 'pending_accountant' && can('cost.approve.accountant')">
            <a-button type="primary" class="bg-green-600 border-green-600" @click="approveBillAccountant(materialDetail)">KT Xác nhận</a-button>
            <a-button danger ghost @click="openRejectBillModal(materialDetail)">Từ chối</a-button>
          </template>
        </div>
      </div>
    </div>
  </a-drawer>

  <!-- ==================== BUDGET DETAIL DRAWER ==================== -->
  <a-drawer v-model:open="showBudgetDetailDrawer" title="Chi tiết Ngân sách dự án" :width="640" @close="budgetDetail = null" destroy-on-close class="crm-drawer">
    <div v-if="budgetDetail" class="space-y-6 pb-24">
      <!-- Premium Header Card -->
      <div class="p-6 bg-gradient-to-br from-indigo-700 via-blue-600 to-cyan-500 rounded-3xl text-white shadow-xl shadow-blue-100 flex flex-col gap-6 overflow-hidden relative">
        <div class="absolute -right-4 -top-8 opacity-10 text-9xl rotate-12 pointer-events-none">💰</div>
        
        <div class="flex justify-between items-start relative z-10">
          <div>
            <div class="text-[10px] text-blue-100 uppercase font-bold tracking-wider mb-1 px-2 py-0.5 bg-white/10 rounded-full w-fit">Mã ngân sách: {{ budgetDetail.version || `#${budgetDetail.id}` }}</div>
            <div class="text-2xl font-black tracking-tight leading-tight">
              {{ budgetDetail.name }}
            </div>
            <div class="text-xs text-blue-100 mt-2 flex gap-4 opacity-90 font-medium">
              <span><CalendarOutlined class="mr-1" /> {{ fmtDate(budgetDetail.budget_date) }}</span>
              <span><UserOutlined class="mr-1" /> {{ budgetDetail.creator?.name || '—' }}</span>
            </div>
          </div>
          <div v-if="budgetDetail.status === 'active'" class="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/30">
            Đang áp dụng
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4 pt-4 border-t border-white/20 relative z-10">
          <div>
            <div class="text-[10px] text-indigo-100 opacity-80 uppercase font-bold mb-1">Giá trị hợp đồng</div>
            <div class="text-lg font-bold truncate">{{ fmt(budgetDetail.contract_value || 0) }}</div>
          </div>
          <div>
            <div class="text-[10px] text-indigo-100 opacity-80 uppercase font-bold mb-1">Lợi nhuận ({{ budgetDetail.profit_percentage || 0 }}%)</div>
            <div class="text-lg font-bold text-cyan-200 truncate">{{ fmt(budgetDetail.profit_amount || 0) }}</div>
          </div>
          <div class="text-right">
            <div class="text-[10px] text-indigo-100 opacity-80 uppercase font-bold mb-1">Tổng dự toán</div>
            <div class="text-xl font-black text-yellow-300 leading-none">{{ fmt(budgetDetail.total_budget) }}</div>
          </div>
        </div>
      </div>

      <!-- Status & Progress -->
      <div class="grid grid-cols-2 gap-4">
        <div class="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
          <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2">Trạng thái hiện tại</div>
          <div class="flex items-center gap-2">
            <a-tag :color="budgetStatusColors[budgetDetail.status]" class="rounded-full px-4 py-1 text-xs font-semibold">
              {{ budgetStatusLabels[budgetDetail.status] || budgetDetail.status }}
            </a-tag>
          </div>
        </div>
        <div class="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2">Tỷ lệ thực chi</div>
          <div class="flex items-center gap-3">
            <span class="text-xl font-bold" :class="(budgetDetail.actual_cost > budgetDetail.total_budget) ? 'text-red-500' : 'text-emerald-600'">
              {{ Math.round(((budgetDetail.actual_cost || 0) / (budgetDetail.total_budget || 1)) * 100) }}%
            </span>
            <a-progress :percent="Math.min(100, Math.round(((budgetDetail.actual_cost || 0) / (budgetDetail.total_budget || 1)) * 100))" 
              :show-info="false" 
              :stroke-color="(budgetDetail.actual_cost > budgetDetail.total_budget) ? '#ef4444' : '#10b981'" 
              class="flex-1 m-0"
            />
          </div>
        </div>
      </div>

      <!-- Rejected Reason (if any) -->
      <div v-if="budgetDetail.status === 'rejected' && budgetDetail.rejected_reason" class="p-5 bg-red-50 rounded-2xl border border-red-100 animate-pulse-slow">
        <div class="text-[10px] text-red-400 uppercase font-bold tracking-wider mb-1">Lý do từ chối</div>
        <div class="text-sm text-red-700 font-medium italic">"{{ budgetDetail.rejected_reason }}"</div>
      </div>

      <!-- Budget Items Table -->
      <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-5 py-4 bg-gray-50/50 border-b flex justify-between items-center">
          <div class="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Hạng mục ngân sách ({{ budgetDetail.items?.length || 0 }})</div>
          <div class="text-xs text-gray-400 italic">Tổng thực chi: {{ fmt(budgetDetail.actual_cost || 0) }}</div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-[11px] text-gray-400 uppercase border-b border-gray-50 bg-gray-50/50">
                <th class="px-5 py-3 font-bold">Hạng mục</th>
                <th class="px-5 py-3 font-bold text-center">Tỷ lệ</th>
                <th class="px-5 py-3 font-bold text-right">Dự toán</th>
                <th class="px-5 py-3 font-bold text-right">Thực chi</th>
                <th class="px-5 py-3 font-bold text-right">Còn lại</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="item in (budgetDetail.items || [])" :key="item.id" class="hover:bg-blue-50/50 transition-colors">
                <td class="px-5 py-4">
                  <div class="flex items-center gap-2 mb-1">
                    <span v-if="item.cost_group" class="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold uppercase">{{ item.cost_group.code || 'GP' }}</span>
                    <div class="font-bold text-gray-800 leading-tight">{{ item.name }}</div>
                  </div>
                  <div v-if="item.description" class="text-[10px] text-gray-400 mt-0.5 line-clamp-1">{{ item.description }}</div>
                </td>
                <td class="px-5 py-4 text-center">
                  <span class="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{{ item.percentage || 0 }}%</span>
                </td>
                <td class="px-5 py-4 text-right">
                  <div class="font-bold text-indigo-600">{{ fmt(item.estimated_amount) }}</div>
                </td>
                <td class="px-5 py-4 text-right">
                  <div class="font-bold" :class="(item.actual_amount > item.estimated_amount) ? 'text-red-500' : 'text-emerald-500'">{{ fmt(item.actual_amount || 0) }}</div>
                  <div class="text-[9px] text-gray-400">{{ Math.round(((item.actual_amount || 0) / (item.estimated_amount || 1)) * 100) }}%</div>
                </td>
                <td class="px-5 py-4 text-right">
                  <div class="font-bold" :class="(item.remaining_amount < 0) ? 'text-red-600' : 'text-gray-600'">
                    {{ fmt(item.remaining_amount ?? item.estimated_amount) }}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="!budgetDetail.items?.length" class="p-8 text-center text-gray-300">Chưa có hạng mục ngân sách</div>
      </div>

      <!-- Action Footer (Sticky) -->
      <div class="fixed bottom-0 right-0 w-[640px] p-4 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10">
        <div class="flex gap-2">
          <!-- Xóa: Chỉ khi Nháp hoặc Bị từ chối -->
          <a-tooltip v-if="['draft', 'rejected'].includes(budgetDetail.status) && can('budgets.delete')" title="Gỡ bỏ ngân sách này khỏi hệ thống" placement="bottom">
            <a-popconfirm title="Xóa ngân sách này?" @confirm="deleteBudget(budgetDetail)">
              <a-button danger type="text"><DeleteOutlined /> Xóa</a-button>
            </a-popconfirm>
          </a-tooltip>

          <!-- Sửa: Khi Nháp, Từ chối, hoặc Đã duyệt (nhưng chưa Active) -->
          <a-tooltip v-if="['draft', 'rejected', 'approved', 'pending_approval'].includes(budgetDetail.status) && can('budgets.update')" title="Thay đổi thông tin phiên bản hoặc hạng mục" placement="bottom">
            <a-button size="small" @click="openBudgetModal(budgetDetail)"><EditOutlined /> Sửa</a-button>
          </a-tooltip>
        </div>

        <div class="flex gap-2">
          <!-- Gửi duyệt: Chỉ khi Nháp hoặc Bị từ chối -->
          <template v-if="['draft', 'rejected'].includes(budgetDetail.status)">
            <a-tooltip title="Trình BĐH xem xét và phê duyệt" placement="bottom">
              <a-button type="primary" @click="submitBudgetForApproval(budgetDetail)"><SendOutlined /> Gửi duyệt</a-button>
            </a-tooltip>
          </template>

          <!-- Duyệt: Chỉ khi đang Chờ duyệt -->
          <template v-if="budgetDetail.status === 'pending_approval' && can('budgets.approve')">
            <a-tooltip title="Không duyệt ngân sách này" placement="bottom">
              <a-button danger ghost @click="openRejectBudgetModal"><CloseCircleOutlined /> Từ chối</a-button>
            </a-tooltip>
            <a-tooltip title="Xác nhận ngân sách hợp lệ" placement="bottom">
              <a-button type="primary" class="bg-emerald-500 border-none" @click="approveBudget(budgetDetail)"><CheckCircleOutlined /> Duyệt</a-button>
            </a-tooltip>
          </template>

          <template v-if="['approved', 'pending_approval', 'rejected'].includes(budgetDetail.status) && can('budgets.approve')">
             <a-button danger ghost @click="revertBudgetAction(budgetDetail)">Hoàn duyệt</a-button>
          </template>

          <!-- Áp dụng (Active): Chỉ khi đã Đã duyệt -->
          <template v-if="budgetDetail.status === 'approved' && can('budgets.approve')">
            <a-tooltip title="Kích hoạt làm định mức chính thức cho dự án" placement="bottom">
              <a-button type="primary" class="bg-indigo-600 border-none" @click="activateBudget(budgetDetail)"><PlayCircleOutlined /> Áp dụng (Active)</a-button>
            </a-tooltip>
          </template>
        </div>
      </div>
    </div>
  </a-drawer>

  <!-- REJECT BUDGET MODAL -->
  <a-modal v-model:open="showRejectBudgetModal" title="Từ chối Ngân sách" @ok="confirmRejectBudget" ok-text="Từ chối" cancel-text="Hủy" centered :ok-button-props="{ danger: true }" class="crm-modal">
    <div class="p-4">
      <div class="text-xs text-gray-400 mb-2">Vui lòng nhập lý do từ chối để người lập điều chỉnh phù hợp:</div>
      <a-textarea v-model:value="rejectBudgetReason" placeholder="Nhập lý do tại đây..." :rows="4" />
    </div>
  </a-modal>

  <!-- EQUIPMENT DETAIL DRAWER -->
  <a-drawer v-model:open="showEquipmentDetailDrawer" title="Chi tiết Thiết bị" :width="560" @close="equipmentDetail = null" destroy-on-close class="crm-drawer">
    <!-- Legacy drawer kept for compatibility if needed, but we now use specific ones below -->
  </a-drawer>

  <!-- RENTAL DETAIL DRAWER -->
  <a-drawer v-model:open="showRentalDetailDrawer" title="Chi tiết Phiếu thuê thiết bị" :width="560" @close="selectedRental = null" destroy-on-close class="crm-drawer">
    <div v-if="selectedRental" class="space-y-6 pb-24">
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100">🏗️</div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Mã Phiếu: #{{ selectedRental.id }}</div>
            <div class="text-lg font-bold text-gray-800">{{ selectedRental.equipment_name }}</div>
          </div>
        </div>
        <a-tag :color="eqWorkflowColor(selectedRental.status)" class="rounded-full px-4 py-1 text-xs font-semibold">{{ eqWorkflowLabel(selectedRental.status) }}</a-tag>
      </div>

      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500 font-mono"><DollarOutlined /> Thông tin thuê</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Nhà cung cấp</span>
            <span class="font-semibold text-gray-700">{{ selectedRental.supplier?.name || '—' }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Số lượng</span>
            <span class="font-semibold text-gray-700">{{ selectedRental.quantity || 1 }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Đơn giá</span>
            <span class="font-semibold text-gray-700">{{ fmt(selectedRental.unit_price) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Thời gian</span>
            <span class="font-semibold text-gray-700">{{ fmtDate(selectedRental.rental_start_date) }} → {{ fmtDate(selectedRental.rental_end_date) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5">
            <span class="text-gray-400">Thành tiền</span>
            <span class="font-bold text-emerald-600 text-lg">{{ fmt(selectedRental.total_cost) }}</span>
          </div>
        </div>
      </div>

      <div v-if="selectedRental.notes" class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2 text-gray-400"><EditOutlined /> Ghi chú</div>
        <div class="text-sm text-gray-600 leading-relaxed">{{ selectedRental.notes }}</div>
      </div>

      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-indigo-500"><FileOutlined /> Tệp đính kèm ({{ selectedRental.attachments?.length || 0 }})</div>
        <div v-if="selectedRental.attachments?.length" class="space-y-2">
          <div v-for="file in selectedRental.attachments" :key="file.id" class="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 group hover:border-blue-200 transition-colors cursor-pointer" @click="openFilePreview(file)">
             <div class="flex items-center gap-3">
                <FilePdfOutlined v-if="isPdfFile(file)" class="text-red-500" />
                <PictureOutlined v-else-if="isImageFile(file)" class="text-blue-500" />
                <FileOutlined v-else class="text-gray-400" />
                <span class="text-xs font-medium text-gray-700">{{ file.original_name }}</span>
             </div>
             <DownloadOutlined class="text-gray-300 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
        <a-empty v-else :image="null" description="Không có tệp" class="my-0" />
      </div>

      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-between items-center z-20">
         <div>
           <a-popconfirm v-if="selectedRental.status === 'draft'" title="Xóa phiếu thuê này?" @confirm="deleteRental(selectedRental); showRentalDetailDrawer = false">
             <a-button danger size="small"><DeleteOutlined /> Xóa</a-button>
           </a-popconfirm>
         </div>
         <div class="flex gap-2">
           <a-button @click="showRentalDetailDrawer = false">Đóng</a-button>
           <a-button v-if="selectedRental.status === 'draft'" @click="openRentalModal(selectedRental)"><EditOutlined /> Sửa</a-button>
           <a-button v-if="selectedRental.status === 'draft'" type="primary" @click="submitRental(selectedRental)">Gửi duyệt</a-button>
           <a-button v-if="selectedRental.status === 'pending_management'" type="primary" class="!bg-green-500 !border-green-500 hover:!bg-green-600" @click="approveRentalMgmt(selectedRental)"><CheckCircleOutlined /> BĐH Duyệt</a-button>
            <a-button v-if="selectedRental.status === 'pending_accountant' && can('cost.approve.accountant')" type="primary" @click="confirmRentalKT(selectedRental)"><CheckSquareOutlined /> KT Xác nhận</a-button>
            <a-button v-if="selectedRental.status === 'in_use'" type="primary" class="!bg-orange-500 !border-orange-500 hover:!bg-orange-600" @click="requestReturnRental(selectedRental)">Đánh dấu đã trả</a-button>
            <a-button v-if="selectedRental.status === 'pending_return' && can('cost.approve.accountant')" type="primary" @click="confirmReturnRentalAction(selectedRental)"><CheckSquareOutlined /> KT Xác nhận trả</a-button>
            <a-popconfirm v-if="['pending_management','pending_accountant'].includes(selectedRental.status)" title="Từ chối phiếu thuê?" @confirm="rejectRental(selectedRental)">
             <template #description>
               <a-input v-model:value="rejectReason" placeholder="Nhập lý do từ chối..." class="mt-2" />
             </template>
             <a-button danger>Từ chối</a-button>
           </a-popconfirm>
         </div>
      </div>
    </div>
  </a-drawer>

  <!-- PURCHASE DETAIL DRAWER — DISABLED: Purchase chuyển sang module Kho công ty -->
  <!--
  <a-drawer v-model:open="showPurchaseDetailDrawer" title="Chi tiết Phiếu mua thiết bị" :width="560" @close="selectedPurchase = null" destroy-on-close class="crm-drawer">
    <div v-if="selectedPurchase" class="space-y-6 pb-24">
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-100">🛒</div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Mã Phiếu: #{{ selectedPurchase.id }}</div>
            <div class="text-lg font-bold text-gray-800">Mua thiết bị dự án</div>
          </div>
        </div>
        <a-tag :color="eqWorkflowColor(selectedPurchase.status)" class="rounded-full px-4 py-1 text-xs font-semibold">{{ eqWorkflowLabel(selectedPurchase.status) }}</a-tag>
      </div>

      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-purple-500"><PlusOutlined /> Danh sách mặt hàng</div>
        <div class="space-y-3">
          <div v-for="(item, idx) in selectedPurchase.items" :key="idx" class="flex justify-between items-center p-3 rounded-xl bg-gray-50 border border-gray-100">
            <div>
              <div class="text-sm font-bold text-gray-700">{{ item.name }}</div>
              <div class="text-[10px] text-gray-400">Mã: {{ item.code || '—' }} — SL: {{ item.quantity }}</div>
            </div>
            <div class="text-sm font-bold text-emerald-600">{{ fmt(item.quantity * item.unit_price) }}</div>
          </div>
          <div class="flex justify-between items-center pt-3 border-t border-gray-100 px-1">
            <span class="text-sm font-bold text-gray-500">Tổng cộng:</span>
            <span class="text-lg font-extrabold text-emerald-600">{{ fmt(selectedPurchase.total_amount) }}</span>
          </div>
        </div>
      </div>

      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-indigo-500"><FileOutlined /> Tệp đính kèm ({{ selectedPurchase.attachments?.length || 0 }})</div>
        <div v-if="selectedPurchase.attachments?.length" class="space-y-2">
          <div v-for="file in selectedPurchase.attachments" :key="file.id" class="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 group hover:border-blue-200 transition-colors cursor-pointer" @click="openFilePreview(file)">
             <div class="flex items-center gap-3">
                <FilePdfOutlined v-if="isPdfFile(file)" class="text-red-500" />
                <PictureOutlined v-else-if="isImageFile(file)" class="text-blue-500" />
                <FileOutlined v-else class="text-gray-400" />
                <span class="text-xs font-medium text-gray-700">{{ file.original_name }}</span>
             </div>
             <DownloadOutlined class="text-gray-300 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
        <a-empty v-else :image="null" description="Không có tệp" class="my-0" />
      </div>

      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-between items-center z-20">
         <div>
           <a-popconfirm v-if="selectedPurchase.status === 'draft'" title="Xóa phiếu mua này?" @confirm="deletePurchase(selectedPurchase); showPurchaseDetailDrawer = false">
             <a-button danger size="small"><DeleteOutlined /> Xóa</a-button>
           </a-popconfirm>
         </div>
         <div class="flex gap-2">
           <a-button @click="showPurchaseDetailDrawer = false">Đóng</a-button>
           <a-button v-if="selectedPurchase.status === 'draft'" @click="openPurchaseModal(selectedPurchase)"><EditOutlined /> Sửa</a-button>
           <a-button v-if="selectedPurchase.status === 'draft'" type="primary" @click="submitPurchase(selectedPurchase)">Gửi duyệt</a-button>
           <a-button v-if="selectedPurchase.status === 'pending_management'" type="primary" class="!bg-green-500 !border-green-500 hover:!bg-green-600" @click="approvePurchaseMgmt(selectedPurchase)"><CheckCircleOutlined /> BĐH Duyệt</a-button>
           <a-button v-if="selectedPurchase.status === 'pending_accountant'" type="primary" @click="confirmPurchaseKT(selectedPurchase)"><CheckSquareOutlined /> KT Xác nhận</a-button>
           <a-popconfirm v-if="['pending_management','pending_accountant'].includes(selectedPurchase.status)" title="Từ chối phiếu mua?" @confirm="rejectPurchase(selectedPurchase)">
             <template #description>
               <a-input v-model:value="rejectReason" placeholder="Nhập lý do từ chối..." class="mt-2" />
             </template>
             <a-button danger>Từ chối</a-button>
           </a-popconfirm>
         </div>
      </div>
    </div>
  </a-drawer>
  -->

  <!-- USAGE DETAIL DRAWER -->
  <a-drawer v-model:open="showUsageDetailDrawer" title="Chi tiết sử dụng thiết bị" :width="560" @close="selectedUsage = null" destroy-on-close class="crm-drawer">
    <div v-if="selectedUsage" class="space-y-6 pb-24">
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-teal-100">📦</div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Mã Mượn: #{{ selectedUsage.id }}</div>
            <div class="text-lg font-bold text-gray-800">{{ selectedUsage.asset?.name || 'Thiết bị kho' }}</div>
          </div>
        </div>
        <a-tag :color="usageStatusColor(selectedUsage.status)" class="rounded-full px-4 py-1 text-xs font-semibold">{{ usageStatusLabel(selectedUsage.status) }}</a-tag>
      </div>

      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-teal-500"><UserOutlined /> Thông tin sử dụng</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Người nhận</span>
            <span class="font-semibold text-gray-700">{{ selectedUsage.receiver?.name || '—' }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Số lượng</span>
            <span class="font-bold text-gray-700">{{ selectedUsage.quantity }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Ngày nhận</span>
            <span class="font-semibold text-gray-700">{{ fmtDate(selectedUsage.received_date) }}</span>
          </div>
          <div v-if="selectedUsage.returned_date" class="flex justify-between items-center py-2.5">
            <span class="text-gray-400">Ngày trả</span>
            <span class="font-semibold text-green-600">{{ fmtDate(selectedUsage.returned_date) }}</span>
          </div>
        </div>
      </div>

      <div v-if="selectedUsage.attachments?.length" class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-indigo-500"><FileOutlined /> Tệp đính kèm ({{ selectedUsage.attachments.length }})</div>
        <div class="space-y-2">
          <div v-for="file in selectedUsage.attachments" :key="file.id" class="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 group hover:border-blue-200 transition-colors cursor-pointer" @click="openFilePreview(file)">
             <div class="flex items-center gap-3">
                <FilePdfOutlined v-if="isPdfFile(file)" class="text-red-500" />
                <PictureOutlined v-else-if="isImageFile(file)" class="text-blue-500" />
                <FileOutlined v-else class="text-gray-400" />
                <span class="text-xs font-medium text-gray-700">{{ file.original_name }}</span>
             </div>
             <DownloadOutlined class="text-gray-300 group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      </div>

      <!-- Rejection reason -->
      <div v-if="selectedUsage.rejection_reason" class="p-4 bg-red-50 rounded-2xl border border-red-100">
        <div class="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-2"><ExclamationCircleOutlined /> Lý do từ chối</div>
        <div class="text-sm text-red-700">{{ selectedUsage.rejection_reason }}</div>
      </div>

      <!-- Approval info -->
      <div v-if="selectedUsage.approver || selectedUsage.confirmer" class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><SafetyCertificateOutlined /> Lịch sử duyệt</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div v-if="selectedUsage.approver" class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">BĐH duyệt bởi</span>
            <span class="font-semibold text-gray-700">{{ selectedUsage.approver?.name }} · {{ fmtDate(selectedUsage.approved_at) }}</span>
          </div>
          <div v-if="selectedUsage.confirmer" class="flex justify-between items-center py-2.5">
            <span class="text-gray-400">KT xác nhận bởi</span>
            <span class="font-semibold text-gray-700">{{ selectedUsage.confirmer?.name }} · {{ fmtDate(selectedUsage.confirmed_at) }}</span>
          </div>
        </div>
      </div>

      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-between items-center z-20">
         <div>
           <a-popconfirm v-if="['draft','rejected'].includes(selectedUsage.status) && can('equipment.delete')" title="Xóa phiếu này?" @confirm="deleteUsage(selectedUsage); showUsageDetailDrawer = false">
             <a-button danger size="small"><DeleteOutlined /> Xóa</a-button>
           </a-popconfirm>
         </div>
         <div class="flex gap-2">
           <a-button @click="showUsageDetailDrawer = false">Đóng</a-button>

           <!-- Draft / Rejected: Sửa + Gửi duyệt -->
           <a-button v-if="['draft','rejected'].includes(selectedUsage.status) && can('equipment.update')" @click="openUsageModal(selectedUsage)"><EditOutlined /> Sửa</a-button>
           <a-button v-if="['draft','rejected'].includes(selectedUsage.status) && can('equipment.update')" type="primary" @click="submitUsage(selectedUsage)"><SendOutlined /> Gửi duyệt</a-button>

           <!-- Pending Management: BĐH duyệt / Từ chối -->
           <a-button v-if="selectedUsage.status === 'pending_management' && can('cost.approve.management')" type="primary" class="!bg-green-500 !border-green-500 hover:!bg-green-600" @click="approveUsageManagement(selectedUsage)"><CheckCircleOutlined /> BĐH Duyệt</a-button>
           <a-popconfirm v-if="selectedUsage.status === 'pending_management' && can('cost.approve.management')" title="Từ chối phiếu?" @confirm="rejectUsage(selectedUsage)" ok-text="Từ chối" cancel-text="Hủy">
             <template #description>
               <a-input v-model:value="rejectReason" placeholder="Nhập lý do từ chối..." class="mt-2" />
             </template>
             <a-button danger>Từ chối</a-button>
           </a-popconfirm>

           <!-- Pending Accountant: KT xác nhận / Từ chối -->
           <a-button v-if="selectedUsage.status === 'pending_accountant' && can('cost.approve.accountant')" type="primary" class="!bg-purple-500 !border-purple-500 hover:!bg-purple-600" @click="confirmUsageAccountant(selectedUsage)"><CheckSquareOutlined /> KT Xác nhận</a-button>
           <a-popconfirm v-if="selectedUsage.status === 'pending_accountant' && can('cost.approve.accountant')" title="Từ chối phiếu?" @confirm="rejectUsage(selectedUsage)" ok-text="Từ chối" cancel-text="Hủy">
             <template #description>
               <a-input v-model:value="rejectReason" placeholder="Nhập lý do từ chối..." class="mt-2" />
             </template>
             <a-button danger>Từ chối</a-button>
           </a-popconfirm>

           <!-- In Use: Yêu cầu trả -->
           <a-button v-if="selectedUsage.status === 'in_use'" type="primary" class="!bg-orange-500 !border-orange-500 hover:!bg-orange-600" @click="requestReturn(selectedUsage)">Yêu cầu trả</a-button>

           <!-- Pending Return: Xác nhận trả -->
           <a-button v-if="selectedUsage.status === 'pending_return'" type="primary" @click="confirmReturn(selectedUsage)"><CheckSquareOutlined /> Xác nhận trả</a-button>
         </div>
      </div>
    </div>
  </a-drawer>

  <!-- ADDITIONAL COST DETAIL DRAWER -->
  <a-drawer v-model:open="showAdditionalCostDetailDrawer" title="Chi tiết Chi phí Phát sinh" :width="560" @close="additionalCostDetail = null" destroy-on-close class="crm-drawer">
    <div v-if="additionalCostDetail" class="space-y-6 pb-24">
      <!-- Header -->
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-red-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-100">💰</div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Mã đề xuất: #{{ additionalCostDetail.id }}</div>
            <div class="text-lg font-bold text-gray-800">Chi phí phát sinh</div>
          </div>
        </div>
        <a-tag :color="acStatusColors[additionalCostDetail.status]" class="rounded-full px-4 py-1 text-xs font-semibold">{{ acStatusLabels[additionalCostDetail.status] || additionalCostDetail.status }}</a-tag>
      </div>

      <!-- Financial summary -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">Số tiền đề xuất</div>
        <div class="text-2xl font-bold text-red-600">{{ fmt(additionalCostDetail.amount) }}</div>
      </div>

      <!-- Info -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><UserOutlined /> Thông tin đề xuất</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Người đề xuất</span>
            <span class="font-bold text-gray-800">{{ additionalCostDetail.proposer?.name || '—' }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Ngày đề xuất</span>
            <span class="font-medium text-gray-700">{{ fmtDate(additionalCostDetail.created_at) }}</span>
          </div>
          <div class="py-2.5">
            <span class="text-gray-400 block mb-1">Nội dung / Lý do:</span>
            <div class="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{{ additionalCostDetail.description || 'Không có mô tả' }}</div>
          </div>
        </div>
      </div>

      <!-- Attachments -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 text-blue-500"><CameraOutlined /> Chứng từ / Ảnh chụp ({{ additionalCostDetail.attachments?.length || 0 }})</div>
          <a-button type="link" size="small" @click="openAttachModal('additional-cost', additionalCostDetail)" class="p-0">Thêm tệp</a-button>
        </div>
        <div v-if="additionalCostDetail.attachments?.length" class="flex flex-wrap gap-2">
          <div v-for="att in additionalCostDetail.attachments" :key="att.id" 
               class="group relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-400 transition"
               @click="openFilePreview(att)">
            <img v-if="isImageFile(att)" :src="att.file_url || att.url" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-[10px] font-bold text-gray-400">
              {{ fileExt(att).toUpperCase() }}
            </div>
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <EyeOutlined class="text-white text-lg" />
            </div>
          </div>
        </div>
        <a-empty v-else :image="null" description="Chưa có ảnh chứng từ" class="text-gray-300 my-0 py-2" />
      </div>

      <!-- Action Footer -->
      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 transition-all">
        <div class="flex gap-2">
          <a-popconfirm v-if="can('additional_cost.delete') && ['pending_approval','rejected'].includes(additionalCostDetail.status)" title="Xóa đề xuất?" @confirm="deleteAC(additionalCostDetail)">
            <a-button danger type="text"><DeleteOutlined /> Xóa</a-button>
          </a-popconfirm>
        </div>
        <div class="flex gap-2">
          <template v-if="additionalCostDetail.status === 'pending_approval' && can('additional_cost.approve')">
            <template v-if="additionalCostDetail.attachments?.length > 0">
              <a-button type="primary" class="bg-green-600 border-green-600" @click="approveAC(additionalCostDetail)">Duyệt chi phí</a-button>
            </template>
            <template v-else>
              <a-tooltip title="Cần đính kèm chứng từ trước khi duyệt">
                <a-button disabled><WarningOutlined /> Thiếu chứng từ</a-button>
              </a-tooltip>
            </template>
            <a-button danger ghost @click="openRejectACModal(additionalCostDetail)">Từ chối</a-button>
          </template>
        </div>
      </div>
    </div>
  </a-drawer>

  <!-- INVOICE DETAIL DRAWER -->
  <a-drawer v-model:open="showInvoiceDetailDrawer" title="Chi tiết Hóa đơn" :width="560" @close="invoiceDetail = null" destroy-on-close class="crm-drawer">
    <div v-if="invoiceDetail" class="space-y-6">
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-indigo-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-100"><FileTextOutlined class="text-xl" /></div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Mã Hóa Đơn: #{{ invoiceDetail.id }}</div>
            <div class="text-lg font-bold text-gray-800">Hóa đơn bán hàng</div>
          </div>
        </div>
      </div>

      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><BankOutlined /> Giá trị hóa đơn</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Giá trước thuế</span>
            <span class="font-semibold text-gray-800">{{ fmt(invoiceDetail.subtotal) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Thuế ({{ invoiceDetail.tax_rate || 0 }}%)</span>
            <span class="font-medium text-gray-600">{{ fmt(invoiceDetail.tax_amount || 0) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400 font-bold">Tổng cộng</span>
            <span class="text-xl font-bold text-green-600">{{ fmt(invoiceDetail.total_amount) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5">
            <span class="text-gray-400">Ngày xuất</span>
            <span class="font-medium text-gray-700">{{ fmtDate(invoiceDetail.invoice_date) }}</span>
          </div>
        </div>
      </div>

      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm pb-24">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><AlignLeftOutlined /> Mô tả</div>
        <div class="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{{ invoiceDetail.description || 'Không có mô tả' }}</div>
      </div>

      <!-- Action Footer -->
      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 transition-all">
        <div class="flex gap-2">
          <a-popconfirm v-if="can('invoice.delete')" title="Xóa hóa đơn?" @confirm="deleteInvoice(invoiceDetail)">
            <a-button danger type="text"><DeleteOutlined /> Xóa</a-button>
          </a-popconfirm>
        </div>
        <div class="flex gap-2">
          <a-button v-if="can('invoice.update')" type="primary" ghost @click="openInvoiceModal(invoiceDetail)"><EditOutlined /> Sửa hóa đơn</a-button>
        </div>
      </div>
    </div>
  </a-drawer>

  <!-- DEFECT DETAIL DRAWER -->
  <a-drawer v-model:open="showDefectDetailDrawer" title="Chi tiết Lỗi / Sai sót" :width="560" @close="defectDetail = null" destroy-on-close class="crm-drawer">
    <div v-if="defectDetail" class="space-y-6">
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-100"><BugOutlined class="text-xl" /></div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Mã lỗi: #{{ defectDetail.id }}</div>
            <div class="text-lg font-bold text-gray-800">Thông tin lỗi thi công</div>
          </div>
        </div>
        <a-tag :color="defectStatusColors[defectDetail.status]" class="rounded-full px-4 py-1 text-xs font-semibold">{{ defectStatusLabels[defectDetail.status] || defectDetail.status }}</a-tag>
      </div>

      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm pb-24">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><InfoCircleOutlined /> Chi tiết lỗi</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Mức độ</span>
            <a-tag :color="severityColors[defectDetail.severity]" class="rounded-full m-0">{{ severityLabels[defectDetail.severity] || defectDetail.severity }}</a-tag>
          </div>
          <div class="py-2.5 border-b border-gray-50">
            <span class="text-gray-400 block mb-1">Mô tả lỗi:</span>
            <div class="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{{ defectDetail.description || 'Không có mô tả' }}</div>
          </div>
          <div class="py-2.5 border-b border-gray-50" v-if="defectDetail.rectification_plan">
            <span class="text-gray-400 block mb-1">Kế hoạch khắc phục:</span>
            <div class="text-sm text-gray-800 whitespace-pre-wrap bg-blue-50 p-3 rounded-lg border border-blue-100">{{ defectDetail.rectification_plan }}</div>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50" v-if="defectDetail.deadline">
             <span class="text-gray-400">Hạn chót xử lý</span>
             <span class="font-bold text-red-500">{{ fmtDate(defectDetail.deadline) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5">
             <span class="text-gray-400">Người báo cáo</span>
             <span class="font-medium text-gray-700">{{ defectDetail.reporter?.name || '—' }} ({{ fmtDate(defectDetail.created_at) }})</span>
          </div>
        </div>
      </div>

      <!-- Đối chiếu ảnh Trước / Sau khi sửa -->
      <div v-if="defectDetail.before_images?.length || defectDetail.after_images?.length" class="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <PictureOutlined class="text-gray-400" />
          <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Đối chiếu hình ảnh Trước / Sau khi sửa</span>
        </div>
        <div class="grid grid-cols-2 divide-x divide-gray-100">
          <!-- BEFORE column -->
          <div class="p-4">
            <div class="flex items-center gap-1.5 mb-3">
              <span class="w-2 h-2 rounded-full bg-orange-400 shrink-0"></span>
              <span class="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Trước khi sửa</span>
              <span class="text-[10px] text-gray-400 ml-auto">({{ defectDetail.before_images?.length || 0 }})</span>
            </div>
            <div v-if="defectDetail.before_images?.length" class="grid grid-cols-2 gap-2">
              <div
                v-for="att in defectDetail.before_images"
                :key="att.id"
                class="relative aspect-square rounded-xl overflow-hidden cursor-pointer group border border-orange-100 hover:border-orange-300 transition-all"
                @click="openFilePreview(att)"
              >
                <img
                  v-if="/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(att.original_name || att.file_name || '')"
                  :src="att.file_url"
                  :alt="att.original_name || 'Ảnh lỗi'"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div v-else class="w-full h-full flex flex-col items-center justify-center bg-orange-50 text-orange-300">
                  <FileOutlined class="text-xl mb-1" />
                  <span class="text-[9px] px-1 text-center truncate w-full">{{ att.original_name || att.file_name }}</span>
                </div>
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <EyeOutlined class="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                </div>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center py-6 text-orange-200">
              <PictureOutlined class="text-2xl mb-1" />
              <span class="text-[10px] text-orange-300">Chưa có ảnh lỗi</span>
            </div>
          </div>

          <!-- AFTER column -->
          <div class="p-4">
            <div class="flex items-center gap-1.5 mb-3">
              <span class="w-2 h-2 rounded-full bg-green-500 shrink-0"></span>
              <span class="text-[10px] font-bold text-green-600 uppercase tracking-wider">Sau khi sửa</span>
              <span class="text-[10px] text-gray-400 ml-auto">({{ defectDetail.after_images?.length || 0 }})</span>
            </div>
            <div v-if="defectDetail.after_images?.length" class="grid grid-cols-2 gap-2">
              <div
                v-for="att in defectDetail.after_images"
                :key="att.id"
                class="relative aspect-square rounded-xl overflow-hidden cursor-pointer group border border-green-200 hover:border-green-400 transition-all"
                @click="openFilePreview(att)"
              >
                <img
                  v-if="/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(att.original_name || att.file_name || '')"
                  :src="att.file_url"
                  :alt="att.original_name || 'Ảnh đã sửa'"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div v-else class="w-full h-full flex flex-col items-center justify-center bg-green-50 text-green-300">
                  <FileOutlined class="text-xl mb-1" />
                  <span class="text-[9px] px-1 text-center truncate w-full">{{ att.original_name || att.file_name }}</span>
                </div>
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <EyeOutlined class="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                </div>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center py-6 text-green-200">
              <CheckCircleOutlined class="text-2xl mb-1" />
              <span class="text-[10px] text-green-300">Chờ ảnh khắc phục</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 transition-all">
        <div class="flex gap-2">
           <a-popconfirm v-if="can('defect.delete') && ['open','rejected'].includes(defectDetail.status)" title="Xóa?" @confirm="deleteDefect(defectDetail)">
             <a-button danger type="text"><DeleteOutlined /> Xóa</a-button>
           </a-popconfirm>
           <a-button v-if="can('defect.update') && ['open','rejected'].includes(defectDetail.status)" type="text" @click="openDefectModal(defectDetail)"><EditOutlined /> Sửa</a-button>
        </div>
        <div class="flex gap-2">
           <a-popconfirm v-if="defectDetail.status === 'open' && can('defect.update')" title="Nhận xử lý lỗi này?" @confirm="defectAction(defectDetail, 'mark-in-progress')" ok-text="Nhận" cancel-text="Hủy">
             <a-button type="primary" ghost>🔧 Nhận xử lý</a-button>
           </a-popconfirm>
           <a-button v-if="defectDetail.status === 'in_progress' && can('defect.update')" class="text-green-600 border-green-600 hover:bg-green-50" @click="defectAction(defectDetail, 'mark-fixed')">✅ Báo cáo đã sửa</a-button>
           <template v-if="defectDetail.status === 'fixed' && can('defect.update')">
             <a-button danger ghost @click="openRejectDefectModal(defectDetail)">✗ Từ chối KQ</a-button>
             <a-popconfirm title="Xác nhận lỗi đã sửa xong?" @confirm="defectAction(defectDetail, 'verify')" ok-text="Xác nhận" cancel-text="Hủy">
               <a-button class="text-cyan-600 border-cyan-600 hover:bg-cyan-50">✔ Nghiệm thu sửa lỗi</a-button>
             </a-popconfirm>
           </template>
        </div>
      </div>
    </div>
  </a-drawer>

  <!-- REPORT DEFECT FIXED MODAL -->
  <a-modal v-model:open="showDefectFixModal" title="Báo cáo đã sửa lỗi — Đối chiếu trước / sau" @ok="submitDefectFix" :confirm-loading="actionLoading['submit-defect-fix']" ok-text="Gửi báo cáo" cancel-text="Hủy" :width="760" class="crm-modal">
    <div class="py-2 space-y-4">
      <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-start gap-2">
        <InfoCircleOutlined class="text-blue-500 mt-0.5 shrink-0" />
        <div class="text-xs text-blue-700 leading-relaxed">
          Tải lên ảnh sau khi sửa để Giám sát/Khách hàng đối chiếu với ảnh lỗi ban đầu và nghiệm thu.
        </div>
      </div>

      <!-- Side-by-side comparison -->
      <div class="grid grid-cols-2 gap-4">
        <!-- LEFT: Before images (read-only) -->
        <div class="rounded-xl border border-orange-200 bg-orange-50/30 overflow-hidden">
          <div class="px-3 py-2 bg-orange-50 border-b border-orange-200 flex items-center gap-1.5">
            <PictureOutlined class="text-orange-500 text-sm" />
            <span class="text-[11px] font-bold text-orange-600 uppercase tracking-wide">Ảnh lỗi (Trước khi sửa)</span>
            <span class="ml-auto text-[10px] text-orange-400">({{ editingDefect?.before_images?.length || 0 }} ảnh)</span>
          </div>
          <div class="p-3">
            <div v-if="editingDefect?.before_images?.length" class="grid grid-cols-3 gap-2">
              <div
                v-for="att in editingDefect.before_images"
                :key="att.id"
                class="relative aspect-square rounded-lg overflow-hidden cursor-pointer group border border-orange-100 hover:border-orange-300 transition-all"
                @click="openFilePreview(att)"
              >
                <img
                  v-if="/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(att.original_name || att.file_name || '')"
                  :src="att.file_url"
                  :alt="att.original_name || 'Ảnh lỗi'"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div v-else class="w-full h-full flex flex-col items-center justify-center bg-orange-50 text-orange-300">
                  <FileOutlined class="text-xl mb-1" />
                  <span class="text-[9px] px-1 text-center truncate w-full">{{ att.original_name || att.file_name }}</span>
                </div>
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <EyeOutlined class="text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                </div>
              </div>
            </div>
            <div v-else class="flex flex-col items-center justify-center py-6 text-orange-200">
              <PictureOutlined class="text-3xl mb-2" />
              <span class="text-[11px] text-orange-300">Chưa có ảnh lỗi</span>
            </div>
          </div>
        </div>

        <!-- RIGHT: After images (upload) -->
        <div class="rounded-xl border border-green-200 bg-green-50/30 overflow-hidden">
          <div class="px-3 py-2 bg-green-50 border-b border-green-200 flex items-center gap-1.5">
            <CheckCircleOutlined class="text-green-500 text-sm" />
            <span class="text-[11px] font-bold text-green-600 uppercase tracking-wide">Ảnh đã sửa (Sau khi sửa)</span>
            <span class="ml-auto text-[10px] text-green-400">({{ defectFixForm.files.length }} ảnh)</span>
          </div>
          <div class="p-3">
            <div class="grid grid-cols-3 gap-2">
              <div v-for="(file, idx) in defectFixForm.files" :key="idx" class="relative aspect-square rounded-lg overflow-hidden border border-green-100 shadow-sm">
                <img :src="file.preview" class="w-full h-full object-cover" />
                <div class="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer hover:bg-black/70" @click="defectFixForm.files.splice(idx, 1)">
                  <CloseOutlined class="text-[10px]" />
                </div>
              </div>
              <label v-if="defectFixForm.files.length < 9" class="aspect-square rounded-lg border-2 border-dashed border-green-200 hover:border-green-400 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white hover:bg-green-50 group">
                <input type="file" multiple accept="image/*" class="hidden" @change="onFixFilesChange" />
                <CameraOutlined class="text-green-300 group-hover:text-green-500 text-xl mb-1" />
                <span class="text-[10px] text-green-400 group-hover:text-green-600 font-medium">Tải ảnh</span>
              </label>
            </div>
            <p class="text-[10px] text-green-500 mt-2 text-center">Bắt buộc tải ít nhất 1 ảnh minh chứng</p>
          </div>
        </div>
      </div>

      <div>
        <div class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Ghi chú khắc phục (Nếu có)</div>
        <a-textarea v-model:value="defectFixForm.rectification_details" placeholder="Mô tả ngắn gọn kết quả xử lý..." :rows="3" class="rounded-xl border-gray-200" />
      </div>
    </div>
  </a-modal>

  <!-- CHANGE REQUEST DETAIL DRAWER -->
  <a-drawer v-model:open="showChangeRequestDetailDrawer" title="Chi tiết Yêu cầu thay đổi" :width="560" @close="changeRequestDetail = null" destroy-on-close class="crm-drawer">
    <div v-if="changeRequestDetail" class="space-y-6">
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-100"><SwapOutlined class="text-xl" /></div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Mã YC: #{{ changeRequestDetail.id }}</div>
            <div class="text-lg font-bold text-gray-800">{{ changeRequestDetail.title }}</div>
          </div>
        </div>
        <a-tag :color="crStatusColors[changeRequestDetail.status]" class="rounded-full px-4 py-1 text-xs font-semibold">{{ crStatusLabels[changeRequestDetail.status] || changeRequestDetail.status }}</a-tag>
      </div>

      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm pb-24">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><ControlOutlined /> Thông tin thay đổi</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Loại</span>
            <a-tag class="rounded-full m-0">{{ crTypeLabels[changeRequestDetail.change_type] || changeRequestDetail.change_type }}</a-tag>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Mức ưu tiên</span>
            <a-tag :color="priorityColors[changeRequestDetail.priority]" class="rounded-full m-0">{{ priorityLabels[changeRequestDetail.priority] || changeRequestDetail.priority }}</a-tag>
          </div>
          <div class="py-2.5 border-b border-gray-50">
            <span class="text-gray-400 block mb-1">Mô tả chi tiết:</span>
            <div class="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{{ changeRequestDetail.description || 'Không có mô tả' }}</div>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400 font-bold">Ảnh hưởng chi phí</span>
            <span class="text-lg font-bold text-red-600">{{ changeRequestDetail.estimated_cost_impact ? fmt(changeRequestDetail.estimated_cost_impact) : 'Không' }}</span>
          </div>
           <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400 font-bold">Ảnh hưởng tiến độ</span>
            <span class="text-md font-bold text-orange-600">{{ changeRequestDetail.estimated_schedule_impact_days ? `${changeRequestDetail.estimated_schedule_impact_days} ngày` : 'Không' }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5">
             <span class="text-gray-400">Người yêu cầu</span>
             <span class="font-medium text-gray-700">{{ changeRequestDetail.requester?.name || '—' }} ({{ fmtDate(changeRequestDetail.requested_date) }})</span>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 transition-all">
        <div class="flex gap-2">
           <a-popconfirm v-if="['draft','cancelled'].includes(changeRequestDetail.status) && can('change_request.delete')" title="Xóa?" @confirm="deleteChangeRequest(changeRequestDetail)">
             <a-button danger type="text"><DeleteOutlined /> Xóa</a-button>
           </a-popconfirm>
           <a-button v-if="['draft','pending'].includes(changeRequestDetail.status)" type="text" @click="openChangeRequestModal(changeRequestDetail)"><EditOutlined /> Sửa</a-button>
        </div>
        <div class="flex gap-2">
           <a-popconfirm v-if="changeRequestDetail.status === 'draft'" title="Gửi yêu cầu để duyệt?" @confirm="submitCR(changeRequestDetail)">
             <a-button type="primary" ghost>Gửi duyệt</a-button>
           </a-popconfirm>
           <template v-if="changeRequestDetail.status === 'pending' && can('change_request.approve')">
             <a-popconfirm title="Từ chối yêu cầu?" @confirm="rejectCR(changeRequestDetail)">
               <a-button danger ghost>Từ chối</a-button>
             </a-popconfirm>
             <a-popconfirm title="Duyệt yêu cầu thay đổi?" @confirm="approveCR(changeRequestDetail)">
               <a-button class="text-green-600 border-green-600 hover:bg-green-50">✅ Phê duyệt</a-button>
             </a-popconfirm>
           </template>
           <a-popconfirm v-if="changeRequestDetail.status === 'approved'" title="Đánh dấu đã triển khai?" @confirm="implementCR(changeRequestDetail)">
             <a-button class="text-purple-600 border-purple-600 hover:bg-purple-50">✔ Đã triển khai</a-button>
           </a-popconfirm>
        </div>
      </div>
    </div>
  </a-drawer>

  <!-- RISK DETAIL DRAWER -->
  <a-drawer v-model:open="showRiskDetailDrawer" title="Chi tiết Rủi ro" :width="560" @close="riskDetail = null" destroy-on-close class="crm-drawer">
    <div v-if="riskDetail" class="space-y-6">
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-pink-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-pink-100"><WarningOutlined class="text-xl" /></div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Mã rủi ro: #{{ riskDetail.id }}</div>
            <div class="text-lg font-bold text-gray-800">{{ riskDetail.title }}</div>
          </div>
        </div>
        <a-tag :color="riskStatusColors[riskDetail.status]" class="rounded-full px-4 py-1 text-xs font-semibold">{{ riskStatusLabels[riskDetail.status] || riskDetail.status }}</a-tag>
      </div>

      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm pb-24">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><SafetyCertificateOutlined /> Đánh giá rủi ro</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Danh mục</span>
            <a-tag class="rounded-full m-0">{{ riskCategoryLabels[riskDetail.category] || riskDetail.category }}</a-tag>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Xác suất</span>
            <a-tag :color="riskLevelColors[riskDetail.probability]" class="rounded-full m-0">{{ riskLevelLabels[riskDetail.probability] || riskDetail.probability }}</a-tag>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Ảnh hưởng</span>
            <a-tag :color="riskLevelColors[riskDetail.impact]" class="rounded-full m-0">{{ riskLevelLabels[riskDetail.impact] || riskDetail.impact }}</a-tag>
          </div>
          <div class="py-2.5 border-b border-gray-50">
            <span class="text-gray-400 block mb-1">Mô tả rủi ro:</span>
            <div class="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{{ riskDetail.description || 'Không có mô tả' }}</div>
          </div>
          <div class="py-2.5 border-b border-gray-50" v-if="riskDetail.mitigation_plan">
            <span class="text-gray-400 block mb-1">Kế hoạch giảm thiểu:</span>
            <div class="text-sm text-gray-800 whitespace-pre-wrap bg-blue-50 p-3 rounded-lg border border-blue-100">{{ riskDetail.mitigation_plan }}</div>
          </div>
          <div class="flex justify-between items-center py-2.5">
             <span class="text-gray-400">Người xử lý</span>
             <span class="font-medium text-gray-700">{{ riskDetail.owner?.name || 'Chưa phân công' }}</span>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 transition-all">
        <div class="flex gap-2">
           <a-popconfirm v-if="can('project.risk.delete')" title="Xóa?" @confirm="deleteRisk(riskDetail)">
             <a-button danger type="text"><DeleteOutlined /> Xóa</a-button>
           </a-popconfirm>
           <a-button type="text" @click="openRiskModal(riskDetail)"><EditOutlined /> Sửa</a-button>
        </div>
        <div class="flex gap-2">
           <a-popconfirm v-if="riskDetail.status !== 'closed'" title="Đánh dấu rủi ro đã xử lý?" @confirm="resolveRisk(riskDetail)">
             <a-button class="text-green-600 border-green-600 hover:bg-green-50">✅ Đã xử lý xong</a-button>
           </a-popconfirm>
        </div>
      </div>
    </div>
  </a-drawer>

  <!-- LOG DETAIL DRAWER -->
  <a-drawer v-model:open="showAttendanceDetailDrawer" title="Chi tiết Chấm công" :width="560" @close="selectedAttendance = null" destroy-on-close class="crm-drawer">
    <div v-if="selectedAttendance" class="space-y-6">
      <div class="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
        <a-avatar :size="54" class="bg-blue-600 text-white text-xl shadow-sm">{{ selectedAttendance.user?.name?.[0] }}</a-avatar>
        <div class="flex-1">
          <div class="text-lg font-bold text-gray-800">{{ selectedAttendance.user?.name || '—' }}</div>
          <div class="text-gray-500 text-sm flex items-center gap-1"><MailOutlined class="text-xs" /> {{ selectedAttendance.user?.email || '—' }}</div>
          <div class="mt-1"><a-tag :color="attendanceStatusColors[selectedAttendance.status]" class="rounded-full">{{ attendanceStatusLabels[selectedAttendance.status] }}</a-tag></div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div class="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Ngày làm việc</div>
          <div class="text-base font-bold text-gray-700">{{ fmtDate(selectedAttendance.work_date) }}</div>
        </div>
        <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div class="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Trạng thái duyệt</div>
          <div class="text-base font-bold">
             <a-tag :color="workflowAttColors[selectedAttendance.workflow_status || 'draft']" class="rounded-full m-0">
               {{ workflowAttLabels[selectedAttendance.workflow_status || 'draft'] }}
             </a-tag>
          </div>
        </div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
        <div class="flex justify-between items-center border-b border-gray-50 pb-3">
          <div class="text-gray-400 text-sm uppercase tracking-wide font-bold">Thời gian làm việc</div>
        </div>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-[10px] text-gray-400 mb-1">Vào ca</div>
            <div class="text-lg font-bold text-green-600">{{ selectedAttendance.check_in?.substring(0,5) || '—' }}</div>
          </div>
          <div>
            <div class="text-[10px] text-gray-400 mb-1">Ra ca</div>
            <div class="text-lg font-bold text-red-500">{{ selectedAttendance.check_out?.substring(0,5) || '—' }}</div>
          </div>
          <div>
            <div class="text-[10px] text-gray-400 mb-1">Tổng giờ</div>
            <div class="text-lg font-bold text-blue-600">{{ selectedAttendance.hours_worked || 0 }}h</div>
          </div>
        </div>
        <div v-if="selectedAttendance.overtime_hours > 0" class="bg-amber-50 p-3 rounded-xl border border-amber-100 flex justify-between items-center">
          <span class="text-amber-800 text-xs font-bold">Giờ tăng ca (OT)</span>
          <span class="text-amber-600 font-bold text-base">{{ selectedAttendance.overtime_hours }}h</span>
        </div>
      </div>

      <div v-if="selectedAttendance.labor_cost" class="bg-teal-50 p-5 rounded-2xl border border-teal-100 space-y-3">
        <div class="flex justify-between items-center">
          <div class="text-teal-800 text-sm font-bold flex items-center gap-1"><DollarCircleOutlined /> Chi phí nhân công</div>
          <a-tag :color="selectedAttendance.labor_cost.status === 'approved' ? 'green' : 'orange'" class="rounded-full text-[10px] m-0">
            {{ costStatusLabels[selectedAttendance.labor_cost.status] || selectedAttendance.labor_cost.status }}
          </a-tag>
        </div>
        <div class="text-2xl font-black text-teal-700">{{ fmt(selectedAttendance.labor_cost.amount) }}</div>
        <div class="text-[10px] text-teal-600 italic">Chi phí này được tạo tự động dựa trên cấu hình lương tại thời điểm chấm công.</div>
      </div>

      <div v-if="selectedAttendance.note || selectedAttendance.rejected_reason" class="space-y-4">
        <div v-if="selectedAttendance.note" class="bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <div class="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-2">Ghi chú</div>
          <div class="text-sm text-gray-600 italic">{{ selectedAttendance.note }}</div>
        </div>
        <div v-if="selectedAttendance.workflow_status === 'rejected'" class="bg-red-50 p-4 rounded-2xl border border-red-100">
          <div class="text-[10px] text-red-400 uppercase tracking-wider font-bold mb-2">Lý do từ chối</div>
          <div class="text-sm text-red-600 font-medium">{{ selectedAttendance.rejected_reason || 'Không rõ lý do' }}</div>
        </div>
      </div>

      <!-- Action Footer -->
      <div v-if="(selectedAttendance.workflow_status !== 'approved' || !selectedAttendance.labor_cost) && can('attendance.approve')" 
           class="pt-6 mt-6 border-t border-gray-100 flex gap-3">
        <a-tooltip title="Chỉ Admin, Kế toán hoặc Quản lý dự án mới có quyền phê duyệt" placement="top">
          <a-popconfirm 
            :title="selectedAttendance.workflow_status === 'approved' ? 'Bổ sung chi phí nhân công cho bản ghi này?' : 'Xác nhận phê duyệt bản ghi chấm công này?'" 
            ok-text="Xác nhận" 
            cancel-text="Hủy" 
            @confirm="approveAttendance(selectedAttendance.id); showAttendanceDetailDrawer = false"
          >
            <a-button type="primary" size="large" class="flex-1 rounded-2xl shadow-lg shadow-blue-100 font-bold hover:scale-[1.02] transition-all">
              <template #icon><CheckCircleOutlined /></template>
              {{ selectedAttendance.workflow_status === 'approved' ? 'Bổ sung chi phí' : 'Phê duyệt' }}
            </a-button>
          </a-popconfirm>
        </a-tooltip>
        
        <a-tooltip title="Chỉ Admin hoặc Quản lý dự án mới có quyền từ chối" placement="top">
          <a-button 
            v-if="selectedAttendance.workflow_status !== 'approved'" 
            danger 
            size="large" 
            class="flex-1 rounded-2xl font-bold hover:scale-[1.02] transition-all" 
            @click="openRejectAtt(selectedAttendance.id); showAttendanceDetailDrawer = false"
          >
            Tiếp nhận / Từ chối
          </a-button>
        </a-tooltip>

        <a-button 
          v-if="['approved', 'rejected'].includes(selectedAttendance.workflow_status) && can('attendance.approve')" 
          danger 
          ghost
          size="large" 
          class="flex-1 rounded-2xl font-bold hover:scale-[1.02] transition-all" 
          @click="revertAttendanceAction(selectedAttendance); showAttendanceDetailDrawer = false"
        >
          Hoàn duyệt
        </a-button>
      </div>
    </div>
  </a-drawer>

  <a-drawer v-model:open="showLogDetailDrawer" title="Chi tiết Nhật ký thi công" :width="560" @close="logDetailRecord = null" destroy-on-close class="crm-drawer">
    <div v-if="logDetailRecord" class="space-y-5 pb-24">
      <!-- Header Card -->
      <div class="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100/60">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-200/50">
            <UserOutlined v-if="!logDetailRecord.creator?.name" />
            <span v-else>{{ logDetailRecord.creator.name[0] }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-bold text-gray-800">{{ logDetailRecord.creator?.name || 'Vô danh' }}</div>
            <div class="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
              <span class="flex items-center gap-1"><CalendarOutlined /> {{ fmtDate(logDetailRecord.log_date) }}</span>
              <span class="flex items-center gap-1"><ClockCircleOutlined /> {{ logDetailRecord.created_at ? dayjs.utc(logDetailRecord.created_at).local().format('HH:mm') : '—' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Task Badge -->
      <div v-if="logDetailRecord.task" class="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-2 flex items-center gap-1.5"><ProjectOutlined class="text-blue-500" /> Công việc liên quan</div>
        <div class="flex items-center gap-3">
          <div class="flex-1 text-sm font-semibold text-gray-800">{{ logDetailRecord.task.name }}</div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500 mx-auto mb-2"><CloudOutlined class="text-base" /></div>
          <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Thời tiết</div>
          <div class="text-xs font-bold text-gray-800">{{ logDetailRecord.weather || '—' }}</div>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 mx-auto mb-2"><TeamOutlined class="text-base" /></div>
          <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Nhân lực</div>
          <div class="text-xs font-bold text-gray-800">{{ logDetailRecord.personnel_count ?? '—' }} <span class="text-gray-400 font-normal">người</span></div>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <div class="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 mx-auto mb-2"><CheckCircleOutlined class="text-base" /></div>
          <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Tiến độ</div>
          <div class="text-sm font-bold" :class="(logDetailRecord.completion_percentage || 0) >= 100 ? 'text-emerald-600' : 'text-gray-800'">{{ logDetailRecord.completion_percentage || 0 }}%</div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div class="flex justify-between items-center mb-2">
          <span class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Phần trăm hoàn thành</span>
          <span class="text-sm font-bold" :class="(logDetailRecord.completion_percentage || 0) >= 100 ? 'text-emerald-600' : 'text-blue-600'">{{ logDetailRecord.completion_percentage || 0 }}%</span>
        </div>
        <div class="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
          <div class="h-full rounded-full transition-all duration-700" :class="(logDetailRecord.completion_percentage || 0) >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-blue-400 to-blue-600'" :style="{ width: `${logDetailRecord.completion_percentage || 0}%` }"></div>
        </div>
      </div>

      <!-- Notes -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-3 flex items-center gap-1.5"><FileOutlined class="text-blue-500" /> Ghi chú / Mô tả công việc</div>
        <p class="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed" :class="logDetailRecord.notes ? '' : 'italic text-gray-400'">{{ logDetailRecord.notes || 'Không có ghi chú mô tả.' }}</p>
      </div>

      <!-- Attachments -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1.5"><PictureOutlined class="text-blue-500" /> Hình ảnh / Tài liệu ({{ logDetailRecord.attachments?.length || 0 }})</div>
          <a-button type="link" size="small" @click="openAttachModal('logs', logDetailRecord)" class="p-0 text-xs"><UploadOutlined /> Thêm</a-button>
        </div>
        <div v-if="logDetailRecord.attachments?.length" class="grid grid-cols-3 sm:grid-cols-4 gap-3">
          <a-image-preview-group>
            <template v-for="att in logDetailRecord.attachments" :key="att.id">
              <div class="aspect-square rounded-xl overflow-hidden border border-gray-200 group/img relative shadow-sm hover:shadow-md transition-all cursor-pointer bg-gray-50">
                <a-image
                  v-if="att.mime_type?.startsWith('image/')"
                  :src="att.file_url"
                  :fallback="'/images/fallback-image.png'"
                  class="!w-full !h-full object-cover [&>.ant-image-img]:!w-full [&>.ant-image-img]:!h-full [&>.ant-image-img]:object-cover group-hover/img:scale-110 transition duration-500"
                />
                <a v-else :href="att.file_url" target="_blank" class="absolute inset-0 flex flex-col items-center justify-center hover:bg-blue-50 transition text-gray-400 hover:text-blue-500 z-10 p-2">
                  <FilePdfOutlined v-if="att.mime_type?.includes('pdf')" class="text-3xl mb-2 text-red-400" />
                  <FileWordOutlined v-else-if="att.mime_type?.includes('word')" class="text-3xl mb-2 text-blue-500" />
                  <FileExcelOutlined v-else-if="att.mime_type?.includes('spreadsheet')" class="text-3xl mb-2 text-green-500" />
                  <FileOutlined v-else class="text-3xl mb-2" />
                  <span class="text-[10px] text-center px-1 font-medium truncate w-full" :title="att.original_name">{{ att.original_name }}</span>
                </a>
              </div>
            </template>
          </a-image-preview-group>
        </div>
        <a-empty v-else :image="null" description="Chưa có hình ảnh" class="text-gray-300 my-0 py-2" />
      </div>

      <!-- Action Footer -->
      <div class="pt-4 mt-4 border-t border-gray-100 flex justify-between items-center bg-white sticky bottom-0 z-10 py-4">
        <div class="flex gap-2">
          <a-popconfirm v-if="can('log.delete')" title="Xóa nhật ký này?" @confirm="deleteLog(logDetailRecord); showLogDetailDrawer = false">
            <a-button danger type="text"><DeleteOutlined /> Xóa</a-button>
          </a-popconfirm>
        </div>
        <div class="flex gap-2">
          <a-button v-if="can('log.update')" @click="openLogModal(logDetailRecord); showLogDetailDrawer = false"><EditOutlined /> Sửa nhật ký</a-button>
          <a-button type="primary" @click="openAttachModal('logs', logDetailRecord)"><UploadOutlined /> Upload ảnh</a-button>
        </div>
      </div>
    </div>
  </a-drawer>

  <!-- PAYMENT DETAIL DRAWER -->
  <a-drawer v-model:open="showPaymentDetail" title="Chi tiết Đợt thanh toán" :width="560" @close="paymentDetailRecord = null" destroy-on-close class="crm-drawer">
    <div v-if="paymentDetailRecord" class="space-y-6">
      <!-- Status Header -->
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-green-100"><DollarOutlined class="text-2xl" /></div>
          <div>
             <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Đợt số: #{{ paymentDetailRecord.payment_number }}</div>
             <div class="text-lg font-bold text-gray-800">Thanh toán đợt {{ paymentDetailRecord.payment_number }}</div>
          </div>
        </div>
        <a-tag :color="paymentTagColors[paymentDetailRecord.status]" class="rounded-full px-4 py-1 text-xs font-semibold">{{ paymentStatusLabelsMap[paymentDetailRecord.status] || paymentDetailRecord.status }}</a-tag>
      </div>

      <!-- Financial summary -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><BankOutlined /> Giá trị thanh toán</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Số tiền phải thu (Dự kiến)</span>
            <span class="text-lg font-bold text-gray-800">{{ fmt(paymentDetailRecord.amount) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400 font-bold">Số tiền thực thu</span>
            <span class="text-xl font-bold text-green-600">{{ fmt(paymentDetailRecord.actual_amount || 0) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Ngày đến hạn</span>
            <span class="font-medium text-gray-700">{{ fmtDate(paymentDetailRecord.due_date) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5">
            <span class="text-gray-400">Ngày thực thu</span>
            <span v-if="paymentDetailRecord.paid_date" class="font-bold text-green-600">{{ fmtDate(paymentDetailRecord.paid_date) }}</span>
            <span v-else class="text-gray-300">—</span>
          </div>
        </div>
      </div>

      <!-- Confirmers -->
      <div v-if="paymentDetailRecord.customer_approver || paymentDetailRecord.confirmer" class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><TeamOutlined /> Phê duyệt & Đối soát</div>
        <div class="space-y-4">
          <div v-if="paymentDetailRecord.customer_approver" class="flex items-center gap-3">
             <a-avatar size="small" class="bg-orange-400">{{ paymentDetailRecord.customer_approver.name.charAt(0) }}</a-avatar>
             <div>
                <div class="text-[10px] text-orange-500 uppercase font-bold tracking-wider">Khách hàng xác nhận</div>
                <div class="text-sm font-medium text-gray-700">{{ paymentDetailRecord.customer_approver.name }}</div>
             </div>
          </div>
          <div v-if="paymentDetailRecord.confirmer" class="flex items-center gap-3 pt-3 border-t border-gray-50">
             <a-avatar size="small" class="bg-blue-500">{{ paymentDetailRecord.confirmer.name.charAt(0) }}</a-avatar>
             <div>
                <div class="text-[10px] text-blue-500 uppercase font-bold tracking-wider">Kế toán đối soát</div>
                <div class="text-sm font-medium text-gray-700">{{ paymentDetailRecord.confirmer.name }} <span class="text-gray-400 text-xs font-normal">• {{ fmtDateTime(paymentDetailRecord.confirmed_at) }}</span></div>
             </div>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div v-if="paymentDetailRecord.notes" class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ghi chú thanh toán</div>
        <div class="text-sm text-gray-600 leading-relaxed">{{ paymentDetailRecord.notes }}</div>
      </div>

      <!-- Attachments -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="flex justify-between items-center mb-4">
           <div class="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 text-blue-500"><CameraOutlined /> Chứng từ thanh toán ({{ paymentDetailRecord.attachments?.length || 0 }})</div>
           <a-button v-if="can('payment.update')" type="link" size="small" @click="openAttachModal('payment', paymentDetailRecord)" class="p-0">Thêm tệp</a-button>
        </div>
        <div v-if="paymentDetailRecord.attachments?.length" class="flex flex-wrap gap-2">
           <div v-for="att in paymentDetailRecord.attachments" :key="att.id" 
                class="group relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-400 transition"
                @click="openFilePreview(att)">
             <img v-if="isImageFile(att)" :src="att.file_url || att.url" class="w-full h-full object-cover" />
             <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-[10px] font-bold text-gray-400">
               {{ fileExt(att).toUpperCase() }}
             </div>
             <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
               <EyeOutlined class="text-white text-lg" />
             </div>
           </div>
        </div>
        <a-empty v-else :image="null" description="Chưa có ảnh chứng từ / UNC" class="text-gray-300 my-0 py-2" />
      </div>

      <!-- Action Footer -->
      <div class="pt-6 mt-6 border-t border-gray-100 flex flex-wrap justify-between items-center bg-white sticky bottom-0 z-10 py-4">
        <div class="flex gap-2">
           <a-popconfirm v-if="can('payment.delete') && !['confirmed','paid'].includes(paymentDetailRecord.status)" title="Xóa đợt thanh toán này?" @confirm="deletePayment(paymentDetailRecord)">
             <a-button danger type="text"><DeleteOutlined /> Xóa đợt</a-button>
           </a-popconfirm>
           <a-button v-if="can('payment.update') && ['pending','overdue'].includes(paymentDetailRecord.status)" size="small" @click="openPaymentModal(paymentDetailRecord)"><EditOutlined /> Thay đổi NS</a-button>
        </div>
        <div class="flex gap-2">
          <!-- Staff: Submit request to customer -->
          <template v-if="['pending','overdue'].includes(paymentDetailRecord.status) && can('payment.update')">
            <a-button type="primary" @click="submitPaymentAction(paymentDetailRecord)">Gửi yêu cầu thanh toán</a-button>
          </template>

          <!-- Customer: Approve & Pay -->
          <template v-if="paymentDetailRecord.status === 'customer_pending_approval' && can('payment.approve')">
            <a-button type="primary" class="bg-blue-600 border-blue-600" @click="openPaymentProofModal(paymentDetailRecord)">Duyệt & Báo cáo thanh toán</a-button>
            <a-button danger ghost @click="openRejectPaymentModal(paymentDetailRecord)">Từ chối</a-button>
          </template>

          <!-- Customer: Report paid (if approved but not paid) -->
          <template v-if="paymentDetailRecord.status === 'customer_approved' && can('payment.mark_paid_by_customer')">
            <a-button type="primary" class="bg-green-600 border-green-600" @click="openPaymentProofModal(paymentDetailRecord)">Báo cáo Đã thanh toán</a-button>
          </template>

          <!-- Accountant: Confirm payment -->
          <template v-if="paymentDetailRecord.status === 'customer_paid' && can('payment.confirm')">
             <a-button type="primary" class="bg-green-600 border-green-600" @click="confirmPaymentAction(paymentDetailRecord)">KT Xác nhận</a-button>
             <a-button danger ghost @click="openRejectPaymentModal(paymentDetailRecord)">Từ chối</a-button>
          </template>

          <!-- Hoàn duyệt: Khi đã Duyệt hoặc Chờ duyệt -->
          <template v-if="['customer_approved', 'customer_paid', 'confirmed'].includes(paymentDetailRecord.status) && can('payment.confirm')">
             <a-button danger ghost @click="revertPaymentAction(paymentDetailRecord)">Hoàn duyệt</a-button>
          </template>
        </div>
      </div>
    </div>
  </a-drawer>

  <a-drawer v-model:open="showSubPayDrawer" title="Ghi nhận thanh toán NTP" :width="520" @close="showSubPayDrawer = false" destroy-on-close class="crm-drawer">
     <div v-if="subDetail" class="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <div class="flex items-center justify-between mb-3">
          <div class="text-sm font-bold text-gray-700">💳 Lịch sử thanh toán ({{ subDetail.payments?.length || 0 }})</div>
          <a-button v-if="can('subcontractor_payment.create')" type="primary" size="small" @click="openSubPaymentDrawer(subDetail)"><PlusOutlined /> Tạo phiếu TT</a-button>
        </div>
        <div v-if="subDetail.payments?.length" class="space-y-3">
          <div v-for="p in subDetail.payments" :key="p.id" class="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
            <div>
              <div class="text-sm font-medium">{{ p.payment_stage || 'Thanh toán' }}</div>
              <div class="text-xs text-gray-400">{{ p.payment_date ? fmtDate(p.payment_date) : '—' }} · {{ subPayMethodLabels[p.payment_method] || p.payment_method }}</div>
              <div class="text-[10px] text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                <span v-if="p.creator">👤 Tạo: {{ p.creator.name }}</span>
                <span v-if="p.approver" class="text-green-600">✅ Duyệt: {{ p.approver.name }}</span>
                <span v-if="p.payer" class="text-blue-600">💰 Chi: {{ p.payer.name }}</span>
                <span v-if="p.rejector" class="text-red-500">❌ Từ chối: {{ p.rejector.name }}</span>
              </div>
            </div>
            <div class="text-right">
              <div class="font-semibold text-sm">{{ fmt(p.amount) }}</div>
              <a-tag :color="subPayStatusColors[p.status]" class="text-[10px] rounded-full">{{ subPayStatusLabels[p.status] || p.status }}</a-tag>
            </div>
            <div class="flex gap-1 ml-2" @click.stop>
              <a-popconfirm v-if="p.status === 'draft' && can('subcontractor_payment.create')" title="Gửi duyệt phiếu này?" @confirm="submitSubPayment(subDetail, p)">
                <a-button type="text" size="small" class="text-blue-500"><SendOutlined /></a-button>
              </a-popconfirm>
              <a-popconfirm v-if="p.status === 'pending_management_approval' && can('subcontractor_payment.approve')" title="BĐH duyệt phiếu này?" @confirm="approveSubPayment(subDetail, p)" ok-text="Duyệt">
                <a-button type="text" size="small" class="text-green-500"><CheckCircleOutlined /></a-button>
              </a-popconfirm>
              <a-popconfirm v-if="p.status === 'pending_accountant_confirmation' && can('subcontractor_payment.mark_paid')" title="KT xác nhận đã thanh toán?" @confirm="confirmSubPayment(subDetail, p)" ok-text="Xác nhận">
                <a-button type="text" size="small" class="text-green-600"><CheckSquareOutlined /></a-button>
              </a-popconfirm>

              <a-button v-if="['pending_management_approval', 'pending_accountant_confirmation', 'rejected'].includes(p.status) && (can('subcontractor_payment.approve') || p.created_by === page.props.auth?.user?.id)"
                        type="text" size="small" class="text-orange-500 hover:text-orange-600" @click="revertSubPaymentAction(subDetail, p)">
                <ReloadOutlined />
              </a-button>

              <a-popconfirm v-if="['pending_management_approval','pending_accountant_confirmation'].includes(p.status) && (can('subcontractor_payment.approve') || can('subcontractor_payment.mark_paid'))" title="Từ chối phiếu này?" @confirm="rejectSubPayment(subDetail, p)" ok-text="Từ chối" :ok-button-props="{ danger: true }">
                <a-button type="text" size="small" danger><CloseCircleOutlined /></a-button>
              </a-popconfirm>
              <a-popconfirm v-if="p.status !== 'paid' && can('subcontractor_payment.delete')" title="Xóa phiếu TT này?" @confirm="deleteSubPayment(subDetail, p)">
                <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
              </a-popconfirm>
            </div>
          </div>
        </div>
        <a-empty v-else description="Chưa có phiếu thanh toán" :image="null" class="py-4" />
     </div>
  </a-drawer>

  <!-- ==================== NTP PAYMENT CREATE DRAWER ==================== -->
  <a-drawer v-model:open="showSubPayCreateDrawer" :title="`Tạo phiếu TT: ${subPayTarget?.name || ''}`" :width="500" placement="right" destroy-on-close>
    <a-form layout="vertical" class="mt-2">
      <a-form-item label="Đợt thanh toán"><a-input v-model:value="subPayForm.payment_stage" size="large" placeholder="VD: Đợt 1, Nghiệm thu lần 1..." /></a-form-item>
      <a-form-item label="Số tiền" required><a-input-number v-model:value="subPayForm.amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" /></a-form-item>
      <a-form-item label="Ngày thanh toán"><a-date-picker v-model:value="subPayForm.payment_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item>
      <a-form-item label="Phương thức">
        <a-radio-group v-model:value="subPayForm.payment_method" button-style="solid" size="small">
          <a-radio-button value="bank_transfer">Chuyển khoản</a-radio-button>
          <a-radio-button value="cash">Tiền mặt</a-radio-button>
          <a-radio-button value="other">Khác</a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="Ghi chú"><a-textarea v-model:value="subPayForm.description" :rows="3" placeholder="Nhập ghi chú..." /></a-form-item>
      <a-form-item label="Chứng từ đính kèm" required>
        <div class="relative flex flex-col items-center justify-center w-full min-h-[100px] border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100/50 transition-colors p-4">
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" @change="e => subPayFiles = [...(subPayFiles || []), ...(e.target.files || [])]" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
          <svg class="w-8 h-8 text-blue-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          <p class="text-sm font-semibold text-blue-700 m-0">Click hoặc Kéo thả tệp vào đây</p>
          <p class="text-xs text-blue-400 mt-1 mb-0">(Chấp nhận: Ảnh, PDF, Word, Excel...)</p>
          <div v-if="subPayFiles?.length" class="w-full mt-3 space-y-1 relative z-20">
            <div v-for="(f, i) in subPayFiles" :key="i" class="flex justify-between items-center bg-white border border-blue-200 rounded px-2 py-1.5 text-xs text-slate-700 shadow-sm">
              <span class="truncate pr-2 font-medium">{{ f.name }}</span>
              <button @click.prevent="subPayFiles.splice(i, 1)" class="text-red-500 hover:text-red-700 shrink-0 p-1 rounded hover:bg-red-50 transition-colors">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          </div>
        </div>
      </a-form-item>
    </a-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <a-button @click="showSubPayCreateDrawer = false">Hủy</a-button>
        <a-button type="primary" @click="saveSubPayment">Tạo phiếu</a-button>
      </div>
    </template>
  </a-drawer>

  <a-modal v-model:open="showSubModal" :title="editingSub ? 'Sửa NTP' : 'Thêm nhà thầu phụ'" :width="680" @ok="saveSub" ok-text="Lưu" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item v-if="globalSubcontractors.length > 0" label="Tên NTP (Chọn từ danh sách)" required v-bind="fieldStatus('global_subcontractor_id')">
        <a-select v-model:value="subForm.global_subcontractor_id" 
                  show-search 
                  :filter-option="(input, option) => option.label.toLowerCase().indexOf(input.toLowerCase()) >= 0"
                  size="large" class="w-full" allow-clear placeholder="Tìm kiếm nhà thầu phụ từ hệ thống..." @change="onGlobalSubSelect">
          <a-select-option v-for="gs in globalSubcontractors" :key="gs.id" :value="gs.id" :label="gs.name">{{ gs.name }} ({{ gs.category || '—' }})</a-select-option>
        </a-select>
        <div class="mt-1.5">
          <a class="text-xs text-blue-500 cursor-pointer" @click="subForm.global_subcontractor_id = null">Hoặc nhập tên NTP mới ↓</a>
        </div>
      </a-form-item>
      
      <a-form-item v-if="!subForm.global_subcontractor_id" :label="globalSubcontractors.length > 0 ? 'Nhập tên mới' : 'Tên nhà thầu phụ'" required v-bind="fieldStatus('name')">
        <a-input v-model:value="subForm.name" size="large" placeholder="Nhập tên nhà thầu phụ..." />
      </a-form-item>
      
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Danh mục">
            <a-input v-model:value="subForm.category" size="large" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Giá trị báo giá" required v-bind="fieldStatus('total_quote')">
            <a-input-number v-model:value="subForm.total_quote" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="Ngân hàng">
            <a-input v-model:value="subForm.bank_name" size="large" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Số TK">
            <a-input v-model:value="subForm.bank_account_number" size="large" />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Chủ TK">
            <a-input v-model:value="subForm.bank_account_name" size="large" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Ngày bắt đầu">
            <a-date-picker v-model:value="subForm.progress_start_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" placeholder="Select date" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Ngày kết thúc">
            <a-date-picker v-model:value="subForm.progress_end_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" placeholder="Select date" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="Trạng thái tiến độ">
        <a-select v-model:value="subForm.progress_status" size="large" class="w-full">
          <a-select-option value="not_started">Chưa bắt đầu</a-select-option>
          <a-select-option value="in_progress">Đang thực hiện</a-select-option>
          <a-select-option value="completed">Hoàn thành</a-select-option>
          <a-select-option value="delayed">Trễ tiến độ</a-select-option>
        </a-select>
      </a-form-item>

      <!-- Auto-create Cost (matching APP) -->
      <div v-if="!editingSub" class="border-t pt-4 mt-4">
        <a-checkbox v-model:checked="subForm.create_cost" class="mb-2 text-sm font-medium">Tự động tạo chi phí dự án cho NTP này</a-checkbox>
        <a-form-item v-if="subForm.create_cost" label="Nhóm chi phí">
          <a-select v-model:value="subForm.cost_group_id" size="large" class="w-full" allow-clear placeholder="Tự động tìm nhóm 'Nhà thầu phụ'">
            <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id">{{ g.name }}</a-select-option>
          </a-select>
        </a-form-item>
      </div>

      <!-- File Upload area updated to match screenshot style -->
      <div class="border-t pt-4 mt-4">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
          <FileOutlined /> Báo giá / Hồ sơ đính kèm
        </div>
        
        <div class="border-2 border-dashed border-gray-200 rounded-xl p-4 transition-colors hover:border-blue-400 bg-gray-50/30">
          <div v-if="editingSub?.attachments?.length" class="flex flex-wrap gap-2 mb-3">
            <div v-for="a in editingSub.attachments" :key="a.id" class="relative group">
              <a href="#" @click.prevent="openFilePreview(a)" 
                 class="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition cursor-pointer border"
                 :class="isAttachmentDeleted(subForm, a.id) ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-60' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 shadow-sm'">
                <span v-if="isAttachmentDeleted(subForm, a.id)" class="text-[10px] line-through italic mr-1 flex items-center gap-1"><CloseCircleOutlined /> Đã đánh dấu xóa</span>
                <EyeOutlined v-else class="text-[10px]" /> {{ a.original_name || a.file_name }}
              </a>
              <div v-if="!isAttachmentDeleted(subForm, a.id)" 
                   class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-red-600 z-10"
                   @click.stop="toggleDeleteAttachment(subForm, a.id)">
                <CloseOutlined class="text-[10px] font-bold" />
              </div>
              <div v-else 
                   class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-blue-600 z-10"
                   @click.stop="toggleDeleteAttachment(subForm, a.id)">
                <ReloadOutlined class="text-[10px] font-bold" />
              </div>
            </div>
          </div>
          
          <input type="file" multiple @change="e => subFiles = [...(e.target.files || [])]" class="block w-full text-sm cursor-pointer file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border file:border-gray-300 file:text-xs file:font-semibold file:bg-white file:text-gray-700 hover:file:bg-gray-50" />
          
          <div v-if="subFiles.length" class="mt-3 space-y-1">
            <div v-for="(f, i) in subFiles" :key="i" class="text-[11px] text-green-600 flex items-center gap-2">
              <CheckCircleOutlined /> {{ f.name }} <span class="text-gray-400">({{ (f.size / 1024).toFixed(1) }} KB)</span>
            </div>
          </div>
        </div>
      </div>
    </a-form>
  </a-modal>

  <!-- Additional Cost Modal -->
  <a-modal v-model:open="showACModal" title="Đề xuất chi phí phát sinh" :width="500" @ok="saveAC" ok-text="Gửi" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Số tiền" required v-bind="fieldStatus('amount')"><a-input-number v-model:value="acForm.amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" /></a-form-item>
      <a-form-item label="Mô tả" required v-bind="fieldStatus('description')"><a-textarea v-model:value="acForm.description" :rows="3" /></a-form-item>
      <!-- Inline Attachments -->
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Tệp minh chứng</div>
        <div v-if="editingAC?.attachments?.length" class="flex flex-wrap gap-2 mb-2">
          <div v-for="a in editingAC.attachments" :key="a.id" class="relative group">
            <a href="#" @click.prevent="openFilePreview(a)" 
               class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition cursor-pointer border"
               :class="isAttachmentDeleted(acForm, a.id) ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-60' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 shadow-sm'">
              <span v-if="isAttachmentDeleted(acForm, a.id)" class="text-[10px] line-through italic mr-1 flex items-center gap-1"><CloseCircleOutlined /> Đã đánh dấu xóa</span>
              <EyeOutlined v-else class="text-[10px]" /> {{ a.original_name || a.file_name }}
            </a>
            <div v-if="!isAttachmentDeleted(acForm, a.id)" 
                 class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-red-600 z-10"
                 @click.stop="toggleDeleteAttachment(acForm, a.id)">
              <CloseOutlined class="text-[10px] font-bold" />
            </div>
            <div v-else 
                 class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-blue-600 z-10"
                 @click.stop="toggleDeleteAttachment(acForm, a.id)">
              <ReloadOutlined class="text-[10px] font-bold" />
            </div>
          </div>
        </div>
        <input type="file" multiple @change="e => modalFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="modalFiles.length" class="text-[10px] text-green-600 mt-1">{{ modalFiles.length }} tệp đã chọn — sẽ upload khi lưu</div>
      </div>
    </a-form>
  </a-modal>

  <!-- Reject Additional Cost Modal -->
  <a-modal v-model:open="showRejectACModal" title="Từ chối CP phát sinh" :width="400" @ok="rejectAC" ok-text="Từ chối" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal" :ok-button-props="{ danger: true }">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Lý do từ chối" required><a-textarea v-model:value="rejectACReason" :rows="3" placeholder="Nhập lý do..." /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Budget Modal -->
  <!-- Budget Modal -->
  <a-modal v-model:open="showBudgetModal" :title="editingBudget ? 'Chỉnh sửa ngân sách' : 'Tạo ngân sách'" :width="850" @ok="saveBudget" ok-text="Lưu" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <div class="p-4 bg-gray-50 rounded-xl mb-4 border border-gray-100">
        <a-row :gutter="16">
          <a-col :span="10"><a-form-item label="Tên ngân sách" required v-bind="fieldStatus('name')"><a-input v-model:value="budgetForm.name" size="large" placeholder="Ví dụ: Ngân sách xây thô v1" /></a-form-item></a-col>
          <a-col :span="6"><a-form-item label="Ngày" required v-bind="fieldStatus('budget_date')"><a-date-picker v-model:value="budgetForm.budget_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
          <a-col :span="4"><a-form-item label="Phiên bản"><a-input v-model:value="budgetForm.version" size="large" placeholder="v1" /></a-form-item></a-col>
          <a-col :span="4">
            <a-form-item label="Trạng thái">
              <a-select v-model:value="budgetForm.status" size="large" class="w-full">
                <a-select-option value="draft">Nháp</a-select-option>
                <a-select-option value="approved" v-if="can('budgets.approve')">Đã duyệt</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        
        <a-row :gutter="16" class="mt-2">
          <a-col :span="8">
            <a-form-item label="Giá trị hợp đồng">
              <a-input-number v-model:value="budgetForm.contract_value" :min="0" class="w-full" size="large" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" @change="recalculateProfitByTotal" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="Tổng ngân sách (Dự toán)">
              <div class="h-10 px-3 bg-white border border-gray-300 rounded-lg flex items-center font-bold text-gray-800 text-lg">
                {{ fmt(budgetForm.total_budget || totalBudgetSum) }}
              </div>
            </a-form-item>
          </a-col>
          <a-col :span="4">
            <a-form-item label="Lợi nhuận (%)">
              <a-input-number v-model:value="budgetForm.profit_percentage" :min="0" :max="100" class="w-full" size="large" @change="recalculateProfitByPercent" />
            </a-form-item>
          </a-col>
          <a-col :span="4">
            <a-form-item label="Lợi nhuận (đ)">
              <a-input-number v-model:value="budgetForm.profit_amount" :min="0" class="w-full" size="large" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" @change="recalculateProfitByAmount" />
            </a-form-item>
          </a-col>
        </a-row>
      </div>

      <div class="flex justify-between items-center mb-3">
        <div class="font-bold text-base text-gray-700 flex items-center gap-2"><CalculatorOutlined class="text-blue-500" /> Phân bổ hạng mục</div>
        <div class="text-xs text-gray-500 italic">Tổng cộng: {{ (itemsPercentageSum || 0).toFixed(1) }}%</div>
      </div>

      <div class="max-h-[350px] overflow-y-auto pr-2">
        <div v-for="(item, idx) in budgetForm.items" :key="idx" class="p-3 bg-white border border-gray-200 rounded-xl mb-3 shadow-sm hover:border-blue-300 transition-all relative group">
          <a-row :gutter="12">
            <a-col :span="10">
              <div class="text-[10px] text-gray-400 mb-1 uppercase font-bold">Nhóm chi phí / Tên hạng mục</div>
              <div class="flex gap-1">
                <a-select v-model:value="item.cost_group_id" placeholder="Chọn Nhóm chi phí..." size="small" class="w-full" @change="val => onBudgetCostGroupChange(idx, val)" show-search option-filter-prop="label">
                  <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id" :label="g.name">{{ g.name }}</a-select-option>
                </a-select>
              </div>
            </a-col>
            <a-col :span="4">
              <div class="text-[10px] text-gray-400 mb-1 uppercase font-bold">Tỷ lệ (%)</div>
              <a-input-number v-model:value="item.percentage" :min="0" :max="100" size="small" class="w-full" @change="recalculateItemByPercent(idx)" />
            </a-col>
            <a-col :span="10">
              <div class="text-[10px] text-gray-400 mb-1 uppercase font-bold">Số tiền dự toán</div>
              <div class="flex gap-1 items-center">
                <a-input-number v-model:value="item.estimated_amount" :min="0" placeholder="Số tiền" size="small" class="flex-1" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" @change="recalculateItemByAmount(idx)" />
                <a-button type="text" size="small" danger @click="budgetForm.items.splice(idx, 1)" :disabled="budgetForm.items.length <= 1"><DeleteOutlined /></a-button>
              </div>
            </a-col>
          </a-row>
        </div>
      </div>
      
      <div class="mt-4 flex justify-between items-center">
        <a-button type="dashed" @click="budgetForm.items.push({ cost_group_id: null, name: '', estimated_amount: 0, percentage: 0 })">
          <template #icon><PlusOutlined /></template> Thêm hạng mục
        </a-button>
        <div class="text-right">
          <div class="text-xs text-gray-400">Ghi chú chung</div>
          <a-textarea v-model:value="budgetForm.notes" :rows="1" placeholder="Ghi chú cho bản ngân sách này..." class="mt-1" />
        </div>
      </div>
    </a-form>
  </a-modal>

  <!-- Reject Cost Modal -->
  <a-modal v-model:open="showRejectCostModal" title="Từ chối phiếu chi" :width="480" @ok="rejectCost" ok-text="Từ chối" cancel-text="Hủy" :confirm-loading="savingForm" :ok-button-props="{ danger: true }" centered destroy-on-close class="crm-modal">
    <div class="mt-4">
      <div v-if="rejectingCost" class="mb-3 p-3 bg-red-50 rounded-lg border border-red-100">
        <div class="font-medium text-red-800">{{ rejectingCost.name }}</div>
        <div class="text-xs text-red-600">{{ fmt(rejectingCost.amount) }} — {{ costStatusLabels[rejectingCost.status] }}</div>
      </div>
      <a-form-item label="Lý do từ chối" required>
        <a-textarea v-model:value="rejectCostReason" :rows="3" placeholder="Nhập lý do từ chối phiếu chi..." />
      </a-form-item>
    </div>
  </a-modal>

  <!-- Submit Cost Modal — bắt buộc upload chứng từ trước khi gửi duyệt -->
  <a-modal v-model:open="showSubmitCostModal" title="Upload chứng từ & Gửi duyệt" :width="520" :footer="null" centered destroy-on-close class="crm-modal">
    <div class="mt-4">
      <div v-if="submitCostTarget" class="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <div class="flex justify-between items-start">
          <div>
            <div class="font-semibold text-blue-800 text-lg">{{ submitCostTarget.name }}</div>
            <div class="text-xs text-blue-600 mt-1">{{ submitCostTarget.cost_group?.name || '—' }} • {{ fmtDate(submitCostTarget.cost_date) }}</div>
          </div>
          <div class="text-right">
            <div class="text-xl font-bold text-red-500">{{ fmt(submitCostTarget.amount) }}</div>
          </div>
        </div>
        <div v-if="submitCostTarget.description" class="mt-2 text-xs text-gray-500 bg-white/60 p-2 rounded">{{ submitCostTarget.description }}</div>
      </div>

      <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2">
        <ExclamationCircleOutlined class="text-amber-500 mt-0.5" />
        <div>
          <div class="font-semibold text-amber-800 text-sm">Bắt buộc upload chứng từ</div>
          <div class="text-xs text-amber-600 mt-0.5">Phải đính kèm ít nhất 1 chứng từ (hóa đơn, phiếu chi, UNC...) để BĐH và Kế toán xem xét trước khi duyệt.</div>
        </div>
      </div>

      <div class="border-2 border-dashed rounded-xl p-4 text-center transition" :class="submitCostFiles.length ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-blue-400'">
        <input type="file" multiple @change="onSubmitCostFileChange" class="block w-full text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 file:cursor-pointer" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" />
        <div v-if="submitCostFiles.length" class="mt-2 space-y-1">
          <div v-for="(f, i) in submitCostFiles" :key="i" class="text-xs text-green-700 flex items-center gap-1 justify-center">
            <CheckCircleOutlined class="text-green-500" /> {{ f.name }} <span class="text-gray-400">({{ (f.size / 1024).toFixed(0) }} KB)</span>
          </div>
        </div>
        <div v-else class="mt-1 text-xs text-gray-400">Kéo thả hoặc chọn file chứng từ</div>
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <a-button @click="showSubmitCostModal = false">Hủy</a-button>
        <a-button type="primary" :disabled="!submitCostFiles.length" :loading="savingForm" @click="doSubmitCostWithFiles">
          <template #icon><SendOutlined /></template>
          Upload chứng từ & Gửi duyệt
        </a-button>
      </div>
    </div>
  </a-modal>


  <!-- Invoice Modal -->
  <a-modal v-model:open="showInvoiceModal" :title="editingInvoice ? 'Sửa hóa đơn' : 'Tạo hóa đơn'" :width="640" @ok="saveInvoice" ok-text="Lưu" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Ngày hóa đơn" required><a-date-picker v-model:value="invoiceForm.invoice_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item v-if="costGroups.length" label="Nhóm chi phí"><a-select v-model:value="invoiceForm.cost_group_id" size="large" class="w-full" allow-clear placeholder="Chọn nhóm">
          <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id">{{ g.name }}</a-select-option>
        </a-select></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Giá trước thuế" required><a-input-number v-model:value="invoiceForm.subtotal" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Thuế"><a-input-number v-model:value="invoiceForm.tax_amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Giảm giá"><a-input-number v-model:value="invoiceForm.discount_amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="Mô tả"><a-textarea v-model:value="invoiceForm.description" :rows="2" /></a-form-item>
      <a-form-item label="Ghi chú"><a-textarea v-model:value="invoiceForm.notes" :rows="2" /></a-form-item>
      <!-- Inline Attachments -->
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> File hóa đơn đính kèm</div>
        <div v-if="editingInvoice?.attachments?.length" class="flex flex-wrap gap-2 mb-2">
          <div v-for="a in editingInvoice.attachments" :key="a.id" class="relative group">
            <a href="#" @click.prevent="openFilePreview(a)" 
               class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition cursor-pointer border"
               :class="isAttachmentDeleted(invoiceForm, a.id) ? 'bg-gray-100 text-gray-400 border-gray-200 opacity-60' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 shadow-sm'">
              <span v-if="isAttachmentDeleted(invoiceForm, a.id)" class="text-[10px] line-through italic mr-1 flex items-center gap-1"><CloseCircleOutlined /> Đã đánh dấu xóa</span>
              <EyeOutlined v-else class="text-[10px]" /> {{ a.original_name || a.file_name }}
            </a>
            <div v-if="!isAttachmentDeleted(invoiceForm, a.id)" 
                 class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-red-600 z-10"
                 @click.stop="toggleDeleteAttachment(invoiceForm, a.id)">
              <CloseOutlined class="text-[10px] font-bold" />
            </div>
            <div v-else 
                 class="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-all cursor-pointer bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center shadow-lg border border-white hover:bg-blue-600 z-10"
                 @click.stop="toggleDeleteAttachment(invoiceForm, a.id)">
              <ReloadOutlined class="text-[10px] font-bold" />
            </div>
          </div>
        </div>
        <input type="file" multiple @change="e => modalFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="modalFiles.length" class="text-[10px] text-green-600 mt-1">{{ modalFiles.length }} tệp đã chọn — sẽ upload khi lưu</div>
      </div>
    </a-form>
  </a-modal>

  <!-- Acceptance Create Modal -->
  <a-modal v-model:open="showAcceptModal" title="Tạo giai đoạn nghiệm thu" :width="600" @ok="saveAccept" ok-text="Tạo" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tên giai đoạn" required v-bind="fieldStatus('name')"><a-input v-model:value="acceptForm.name" size="large" placeholder="VD: Nghiệm thu phần thô, nghiệm thu hoàn thiện..." /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Công việc cha (hạng mục A)"><a-select v-model:value="acceptForm.task_id" size="large" class="w-full" allow-clear show-search option-filter-prop="label" placeholder="Chọn hạng mục">
          <a-select-option v-for="t in parentTasks" :key="t.id" :value="t.id" :label="t.name">{{ t.name }}</a-select-option>
        </a-select></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Mẫu nghiệm thu"><a-select v-model:value="acceptForm.acceptance_template_id" size="large" class="w-full" allow-clear show-search option-filter-prop="label" placeholder="Chọn mẫu">
          <a-select-option v-for="t in acceptanceTemplates" :key="t.id" :value="t.id" :label="t.name">{{ t.name }}</a-select-option>
        </a-select></a-form-item></a-col>
      </a-row>
      <a-form-item label="Mô tả"><a-textarea v-model:value="acceptForm.description" :rows="3" placeholder="Mô tả nội dung nghiệm thu..." /></a-form-item>
      <!-- Inline Attachments -->
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Biên bản / Tài liệu nghiệm thu</div>
        <input type="file" multiple @change="e => modalFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="modalFiles.length" class="text-[10px] text-green-600 mt-1">{{ modalFiles.length }} tệp đã chọn — sẽ upload khi lưu</div>
      </div>
    </a-form>
  </a-modal>

  <!-- Acceptance Edit Modal -->
  <a-modal v-model:open="showEditAcceptModal" title="Chỉnh sửa giai đoạn nghiệm thu" :width="600" @ok="updateAccept" ok-text="Cập nhật" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tên giai đoạn" required><a-input v-model:value="editAcceptForm.name" size="large" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Công việc cha (hạng mục A)"><a-select v-model:value="editAcceptForm.task_id" size="large" class="w-full" allow-clear show-search option-filter-prop="label" placeholder="Chọn hạng mục">
          <a-select-option v-for="t in parentTasks" :key="t.id" :value="t.id" :label="t.name">{{ t.name }}</a-select-option>
        </a-select></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Mẫu nghiệm thu"><a-select v-model:value="editAcceptForm.acceptance_template_id" size="large" class="w-full" allow-clear show-search option-filter-prop="label" placeholder="Chọn mẫu">
          <a-select-option v-for="t in acceptanceTemplates" :key="t.id" :value="t.id" :label="t.name">{{ t.name }}</a-select-option>
        </a-select></a-form-item></a-col>
      </a-row>
      <a-form-item label="Mô tả"><a-textarea v-model:value="editAcceptForm.description" :rows="3" /></a-form-item>
      <a-form-item label="Thứ tự"><a-input-number v-model:value="editAcceptForm.order" :min="0" size="large" class="w-full" placeholder="Tự động" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- ==================== ACCEPTANCE DETAIL DRAWER (Giống APP: "Nghiệm thu giai đoạn") ==================== -->
  <a-drawer v-model:open="showAcceptDetailDrawer" :title="acceptDetailStage ? `Nghiệm thu: ${acceptDetailStage.name}` : 'Chi tiết nghiệm thu'"
    :width="640" placement="right" destroy-on-close class="accept-detail-drawer">
    <template v-if="acceptDetailStage">
      <!-- Stage Info Card -->
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-100">
        <div class="flex items-center justify-between mb-2">
          <span class="font-bold text-gray-800 text-base">{{ acceptDetailStage.name }}</span>
          <span :class="['inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold',
            getAcceptability(acceptDetailStage) === 'acceptable' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700']">
            {{ getAcceptability(acceptDetailStage) === 'acceptable' ? '✅ Đạt' : '❌ Chưa đạt' }}
          </span>
        </div>
        <div class="text-xs text-gray-500 space-y-1">
          <div v-if="acceptDetailStage.task">📐 Hạng mục: <span class="font-semibold">{{ acceptDetailStage.task.name }}</span></div>
          <div v-if="acceptDetailStage.created_at">📅 Ngày tạo: {{ fmtDateTime(acceptDetailStage.created_at) }}</div>
          <div class="flex items-center gap-2">
            <a-tag :color="acceptStatusColors[acceptDetailStage.status] || 'default'" class="rounded-full text-xs">{{ acceptStatusLabels[acceptDetailStage.status] || acceptDetailStage.status }}</a-tag>
            
            <span v-if="acceptDetailStage.next_action?.label" class="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 flex items-center gap-1">
              TIẾP THEO: {{ acceptDetailStage.next_action.label }}
            </span>
          </div>
        </div>

        <!-- Approvers History in Detail -->
        <div v-if="acceptDetailStage.approval_status_info?.length" class="mt-3 flex flex-wrap gap-1.5">
          <div v-for="(info, idx) in acceptDetailStage.approval_status_info" :key="idx" 
               class="px-2 py-1 bg-white/60 border border-white/80 rounded-lg text-[10px] shadow-sm">
            <span class="font-bold text-gray-400 uppercase tracking-tighter">{{ info.role }}:</span>
            <span class="font-semibold text-gray-700 ml-1">{{ info.user }}</span>
          </div>
        </div>
      </div>

      <!-- 1. Bộ tài liệu nghiệm thu (Template) -->
      <div class="mb-5">
        <div class="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1"><FileOutlined /> Bộ tài liệu nghiệm thu</div>
        <a-select v-if="can('acceptance.update')" v-model:value="acceptDetailTemplateId" size="large" class="w-full mb-2" allow-clear show-search option-filter-prop="label" placeholder="Chọn bộ tài liệu nghiệm thu từ cài đặt" @change="onAcceptDetailTemplateChange">
          <a-select-option v-for="t in acceptanceTemplates" :key="t.id" :value="t.id" :label="t.name">
            {{ t.name }} <span v-if="t.description" class="text-gray-400 text-xs ml-1">— {{ t.description }}</span>
          </a-select-option>
        </a-select>
        <div v-else-if="acceptDetailStage.acceptance_template" class="p-3 bg-gray-50 rounded-lg">
          <div class="font-semibold text-sm">{{ acceptDetailStage.acceptance_template.name }}</div>
          <div v-if="acceptDetailStage.acceptance_template.description" class="text-xs text-gray-500 mt-1">{{ acceptDetailStage.acceptance_template.description }}</div>
        </div>
        <div v-else class="text-xs text-gray-400 italic">Chưa chọn bộ tài liệu</div>

        <!-- Template documents/images preview -->
        <div v-if="acceptDetailSelectedTemplate" class="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <div class="text-xs font-semibold text-blue-700 mb-1">{{ acceptDetailSelectedTemplate.name }}</div>
          <div v-if="acceptDetailSelectedTemplate.description" class="text-xs text-blue-500">{{ acceptDetailSelectedTemplate.description }}</div>
          <div v-if="acceptDetailSelectedTemplate.documents?.length" class="text-xs text-gray-500 mt-1">📄 {{ acceptDetailSelectedTemplate.documents.length }} tài liệu</div>
          <div v-if="acceptDetailSelectedTemplate.images?.length" class="text-xs text-gray-500">🖼 {{ acceptDetailSelectedTemplate.images.length }} hình ảnh</div>
        </div>
      </div>

      <!-- BEFORE / AFTER IMAGES (Giống Mobile) -->
      <div class="mb-5">
        <div class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1"><CameraOutlined /> Hình ảnh nghiệm thu thực tế</div>
        <div class="grid grid-cols-2 gap-4">
          <!-- Before column -->
          <div class="p-3 rounded-xl bg-orange-50 border border-orange-100">
            <div class="text-[10px] font-bold text-orange-600 uppercase mb-2">📸 Hình ảnh TRƯỚC</div>
            <div class="space-y-2">
              <div v-for="att in acceptDetailStage.attachments?.filter(a => a.type === 'before')" :key="att.id" class="relative group aspect-square rounded-lg overflow-hidden border border-orange-200 bg-white">
                <img v-if="att.mime_type?.startsWith('image/')" :src="att.file_url" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center"><FileOutlined class="text-orange-200 text-xl" /></div>
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center" @click="openFilePreview(att)">
                  <EyeOutlined class="text-white text-lg" />
                </div>
              </div>
              <label :for="'upload-before-'+acceptDetailStage.id" class="block w-full py-2 border-2 border-dashed border-orange-200 rounded-lg text-center cursor-pointer hover:bg-orange-100 hover:border-orange-300 transition">
                <PlusOutlined class="text-orange-400" />
                <div class="text-[10px] text-orange-400 mt-1 font-semibold">Tải ảnh Trước</div>
              </label>
              <input :id="'upload-before-'+acceptDetailStage.id" type="file" multiple accept="image/*" class="hidden" @change="e => uploadAcceptStageFiles(e, 'before')" />
            </div>
          </div>
          <!-- After column -->
          <div class="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <div class="text-[10px] font-bold text-emerald-600 uppercase mb-2">📸 Hình ảnh SAU</div>
            <div class="space-y-2">
              <div v-for="att in acceptDetailStage.attachments?.filter(a => a.type === 'after')" :key="att.id" class="relative group aspect-square rounded-lg overflow-hidden border border-emerald-200 bg-white">
                <img v-if="att.mime_type?.startsWith('image/')" :src="att.file_url" class="w-full h-full object-cover" />
                <div v-else class="w-full h-full flex items-center justify-center"><FileOutlined class="text-emerald-200 text-xl" /></div>
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center" @click="openFilePreview(att)">
                  <EyeOutlined class="text-white text-lg" />
                </div>
              </div>
              <label :for="'upload-after-'+acceptDetailStage.id" class="block w-full py-2 border-2 border-dashed border-emerald-200 rounded-lg text-center cursor-pointer hover:bg-emerald-100 hover:border-emerald-300 transition">
                <PlusOutlined class="text-emerald-400" />
                <div class="text-[10px] text-emerald-400 mt-1 font-semibold">Tải ảnh Sau</div>
              </label>
              <input :id="'upload-after-'+acceptDetailStage.id" type="file" multiple accept="image/*" class="hidden" @change="e => uploadAcceptStageFiles(e, 'after')" />
            </div>
          </div>
        </div>
      </div>

      <div class="mb-5">
        <div class="flex items-center justify-between mb-2">
          <div>
            <div class="text-sm font-bold text-gray-700 flex items-center gap-1">⚠️ Lỗi ghi nhận</div>
            <div v-if="acceptDetailDefects?.length" class="text-xs text-gray-400 mt-0.5">
              <span v-if="acceptDetailDefects.filter(d => d.status === 'verified').length" class="text-emerald-600">✓ {{ acceptDetailDefects.filter(d => d.status === 'verified').length }} đã xử lý</span>
              <span v-if="acceptDetailDefects.filter(d => d.status !== 'verified').length" class="text-red-500 ml-1">⚠ {{ acceptDetailDefects.filter(d => d.status !== 'verified').length }} chưa xử lý</span>
            </div>
          </div>
          <a-button v-if="can('defect.create')" type="dashed" size="small" @click="showCreateDefectInDrawer = true">
            <PlusOutlined /> Tạo lỗi
          </a-button>
        </div>

        <!-- Defects list -->
        <div v-for="d in acceptDetailDefects" :key="d.id" class="p-3 mb-2 rounded-lg border cursor-pointer hover:shadow-sm transition" :class="d.status === 'verified' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'"
          @click="goToDefect(d)">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="text-sm font-semibold" :class="d.status === 'verified' ? 'text-green-700 line-through' : 'text-red-700'">{{ d.description }}</div>
              <div class="flex items-center gap-2 mt-1">
                <a-tag :color="d.severity === 'high' ? 'red' : d.severity === 'low' ? 'green' : 'orange'" class="rounded-full text-[10px]">{{ { low: 'Nhẹ', medium: 'TB', high: 'Nặng' }[d.severity] || d.severity }}</a-tag>
                <a-tag :color="{ open: 'default', in_progress: 'processing', resolved: 'blue', verified: 'success' }[d.status] || 'default'" class="rounded-full text-[10px]">{{ { open: 'Mở', in_progress: 'Đang xử lý', resolved: 'Đã sửa', verified: 'Đã xác nhận' }[d.status] || d.status }}</a-tag>
              </div>
              <!-- Defect attachments thumbnails -->
              <div v-if="d.attachments?.length" class="flex gap-1 mt-2 flex-wrap">
                <a v-for="att in d.attachments.slice(0, 4)" :key="att.id" href="#" @click.stop.prevent="openFilePreview(att)"
                  class="w-10 h-10 rounded-md overflow-hidden border border-gray-200 hover:border-blue-400 transition">
                  <img v-if="att.mime_type?.startsWith('image/')" :src="att.file_url" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center bg-gray-50"><FileOutlined class="text-gray-400 text-xs" /></div>
                </a>
                <span v-if="d.attachments.length > 4" class="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center text-[10px] text-gray-500 border border-gray-200">+{{ d.attachments.length - 4 }}</span>
              </div>
            </div>
            <a-tooltip title="Xem tại Module Lỗi">
              <LinkOutlined class="text-gray-400 hover:text-blue-500 text-sm ml-2 mt-1" />
            </a-tooltip>
          </div>
        </div>
        <a-empty v-if="!acceptDetailDefects.length" :image="null" description="Không có lỗi nào — tuyệt vời!" class="py-2" />

        <!-- Inline Create Defect Form -->
        <div v-if="showCreateDefectInDrawer" class="mt-3 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-bold text-gray-700">Tạo lỗi mới</span>
            <a-button type="text" size="small" @click="showCreateDefectInDrawer = false"><CloseOutlined /></a-button>
          </div>
          <a-form layout="vertical">
            <a-form-item label="Mô tả lỗi" required><a-textarea v-model:value="newAcceptDefect.description" :rows="2" placeholder="Mô tả lỗi phát hiện..." /></a-form-item>
            <a-row :gutter="12">
              <a-col :span="12"><a-form-item label="Mức độ">
                <a-radio-group v-model:value="newAcceptDefect.severity" size="small" button-style="solid">
                  <a-radio-button value="low">Nhẹ</a-radio-button>
                  <a-radio-button value="medium">TB</a-radio-button>
                  <a-radio-button value="high">Nặng</a-radio-button>
                </a-radio-group>
              </a-form-item></a-col>
            </a-row>
            <!-- File upload for defect -->
            <a-form-item label="Ảnh / Chứng từ lỗi">
              <div class="flex items-center gap-2 flex-wrap">
                <div v-for="(f, idx) in newAcceptDefectFiles" :key="idx" class="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 group">
                  <img v-if="f.preview" :src="f.preview" class="w-full h-full object-cover" />
                  <div v-else class="w-full h-full flex items-center justify-center bg-gray-50"><FileOutlined class="text-gray-400" /></div>
                  <div class="absolute top-0 right-0 p-0.5 cursor-pointer opacity-0 group-hover:opacity-100 transition" @click="newAcceptDefectFiles.splice(idx, 1)">
                    <CloseCircleOutlined class="text-red-500 text-sm bg-white rounded-full" />
                  </div>
                </div>
                <label for="defect-file-upload" class="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-400 flex flex-col items-center justify-center cursor-pointer transition hover:bg-blue-50">
                  <CameraOutlined class="text-gray-400 text-lg" />
                  <span class="text-[8px] text-gray-400 mt-0.5">Thêm</span>
                </label>
                <input id="defect-file-upload" type="file" multiple accept="image/*,.pdf,.doc,.docx" class="hidden" @change="onDefectFileSelect" />
              </div>
            </a-form-item>
            <a-button type="primary" block @click="createDefectFromDrawer" :loading="creatingDefect">
              <CheckOutlined /> Tạo lỗi ghi nhận
            </a-button>
          </a-form>
        </div>
      </div>

      <!-- Stage Actions (Sync with List) -->
      <div v-if="acceptDetailStage.status !== 'owner_approved'" class="p-4 bg-gray-50 rounded-2xl mb-4 border border-gray-100">
        <div class="text-[10px] font-bold text-gray-400 uppercase mb-3 text-center tracking-widest">THAO TÁC GIAI ĐOẠN</div>
        <div class="grid grid-cols-2 gap-3">
          <!-- Approval Buttons based on roles -->
          <a-button v-if="acceptDetailStage.status === 'pending' && can('acceptance.approve.level_1')" type="primary" size="large" class="rounded-xl flex-1 ac-bg-blue" @click="approveAccept(acceptDetailStage, 1)">
            <CheckCircleOutlined /> Duyệt (GS)
          </a-button>
          <a-button v-if="acceptDetailStage.status === 'supervisor_approved' && can('acceptance.approve.level_2')" type="primary" size="large" class="rounded-xl flex-1 ac-bg-blue" @click="approveAccept(acceptDetailStage, 2)">
            <CheckCircleOutlined /> Duyệt (QLDA)
          </a-button>
          <a-button v-if="acceptDetailStage.status === 'project_manager_approved' && can('acceptance.approve.level_3')" type="primary" size="large" class="rounded-xl flex-1 ac-bg-emerald" @click="approveAccept(acceptDetailStage, 3)">
            <CheckCircleOutlined /> Duyệt (KH)
          </a-button>
          
          <a-button v-if="['pending', 'supervisor_approved', 'project_manager_approved'].includes(acceptDetailStage.status) && (can('acceptance.approve.level_1') || can('acceptance.approve.level_2'))" danger ghost size="large" class="rounded-xl flex-1" @click="rejectAcceptDrawer">
            <CloseCircleOutlined /> Từ chối
          </a-button>
        </div>
      </div>

      <!-- Save Button -->
      <div v-if="can('acceptance.update') && acceptDetailStage.status !== 'owner_approved'" class="pt-4 border-t">
        <a-button type="primary" block size="large" @click="saveAcceptDetail" :loading="savingAcceptDetail" class="rounded-xl h-12 font-bold shadow-lg shadow-blue-100">
          <SaveOutlined /> Cập nhật thông tin
        </a-button>
      </div>
    </template>
  </a-drawer>

  <!-- ==================== ACCEPT ITEM REJECT MODAL ==================== -->
  <a-modal v-model:open="showRejectAcceptItemModal" title="Từ chối hạng mục nghiệm thu" :width="480" @ok="confirmRejectAcceptItem" ok-text="Từ chối" cancel-text="Hủy"
    :ok-button-props="{ danger: true, disabled: !rejectAcceptItemReason.trim() }" centered destroy-on-close class="crm-modal">
    <div class="mt-4">
      <div class="p-3 mb-3 bg-red-50 rounded-lg border border-red-100">
        <div class="text-sm font-semibold text-red-700">{{ rejectingAcceptItem?.name }}</div>
        <div class="text-xs text-red-500 mt-1">Khi từ chối, hệ thống sẽ tự động tạo lỗi ghi nhận.</div>
      </div>
      <a-form-item label="Lý do từ chối" required>
        <a-textarea v-model:value="rejectAcceptItemReason" :rows="3" placeholder="Nhập lý do từ chối nghiệm thu..." :max-length="1000" show-count />
      </a-form-item>
    </div>
  </a-modal>

  <!-- ==================== EDIT ACCEPT ITEM MODAL ==================== -->
  <a-modal v-model:open="showEditAcceptItemModal" title="Sửa hạng mục nghiệm thu" :width="520" @ok="updateAcceptItemData" ok-text="Cập nhật" cancel-text="Hủy"
    :confirm-loading="editingAcceptItemLoading" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4" size="small">
      <a-form-item label="Tên hạng mục" required><a-input v-model:value="editAcceptItemForm.name" placeholder="Tên hạng mục nghiệm thu" /></a-form-item>
      <a-row :gutter="8">
        <a-col :span="12"><a-form-item label="Ngày bắt đầu"><a-date-picker v-model:value="editAcceptItemForm.start_date" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Ngày kết thúc"><a-date-picker v-model:value="editAcceptItemForm.end_date" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="Ghi chú"><a-textarea v-model:value="editAcceptItemForm.notes" :rows="2" placeholder="Ghi chú" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Document Upload Modal -->
  <a-modal v-model:open="showDocUploadModal" title="Upload tài liệu" :width="500" @ok="uploadDoc" ok-text="Upload" cancel-text="Hủy" centered destroy-on-close class="crm-modal" :ok-button-props="{ disabled: !docUploadForm.file }">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Chọn tệp" required>
        <input type="file" ref="fileInput" @change="onDocFileChange" class="block w-full text-sm py-2 px-3 border border-gray-300 rounded-lg" />
      </a-form-item>
      <a-form-item label="Mô tả"><a-textarea v-model:value="docUploadForm.description" :rows="2" placeholder="Mô tả tài liệu (tuỳ chọn)" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Edit Document Modal -->
  <a-modal v-model:open="showDocEditModal" title="Sửa mô tả tài liệu" :width="400" @ok="updateDoc" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Mô tả"><a-textarea v-model:value="docEditForm.description" :rows="3" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- ==================== MATERIAL BILL MODAL (Bill-based) ==================== -->
  <a-modal v-model:open="showBillModal" :width="740" :footer="null" centered destroy-on-close class="crm-modal" :bodyStyle="{ padding: 0 }">
    <template #title>
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-200/50">
          <span class="text-white text-lg">🧱</span>
        </div>
        <div>
          <div class="text-base font-bold text-gray-800">{{ isEditBill ? 'Cập nhật Phiếu Nhập Vật Liệu' : 'Tạo Phiếu Nhập Vật Liệu' }}</div>
          <div class="text-xs text-gray-400 font-normal">{{ isEditBill ? 'Chỉnh sửa thông tin phiếu nhập vật liệu đã có' : 'Tạo bill nhập vật liệu → gửi duyệt BĐH → KT xác nhận thanh toán' }}</div>
        </div>
      </div>
    </template>

    <div class="p-6 space-y-5">
      <!-- Section 1: Bill Info -->
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Ngày nhập" required class="mb-3" v-bind="fieldStatus('bill_date')">
              <a-date-picker v-model:value="billForm.bill_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Nhà cung cấp" class="mb-3" v-bind="fieldStatus('supplier_id')">
              <a-select v-model:value="billForm.supplier_id" placeholder="Chọn NCC (tùy chọn)" size="large" class="w-full" allow-clear show-search option-filter-prop="label">
                <a-select-option v-for="s in suppliers" :key="s.id" :value="s.id" :label="s.name">{{ s.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Nhóm chi phí" class="mb-3">
              <a-select v-model:value="billForm.cost_group_id" placeholder="Chọn nhóm chi phí" size="large" class="w-full">
                <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id">{{ g.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Ghi chú" class="mb-3">
              <a-input v-model:value="billForm.notes" placeholder="Ghi chú (tùy chọn)" size="large" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <!-- Section 2: Add item inline -->
      <div class="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Thêm vật liệu vào phiếu</div>
        <a-row :gutter="8" align="bottom">
          <a-col :span="8">
            <a-form-item label="Vật liệu" class="mb-2">
              <a-select v-model:value="billItemForm.material_id" show-search option-filter-prop="label" placeholder="Chọn VL..." size="small" class="w-full" @change="onBillMaterialSelect">
                <a-select-option v-for="m in materials" :key="m.id" :value="m.id" :label="m.name">{{ m.name }} <span class="text-gray-400 text-[10px]">({{ m.unit }})</span></a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="4">
            <a-form-item label="Số lượng" class="mb-2">
              <a-input-number v-model:value="billItemForm.quantity" :min="0.01" size="small" class="w-full" @change="calcBillItemTotal" />
            </a-form-item>
          </a-col>
          <a-col :span="5">
            <a-form-item label="Đơn giá" class="mb-2">
              <a-input-number v-model:value="billItemForm.unit_price" :min="0" size="small" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" @change="calcBillItemTotal" />
            </a-form-item>
          </a-col>
          <a-col :span="4">
            <a-form-item label="Thành tiền" class="mb-2">
              <div class="text-sm font-bold text-emerald-600 leading-8">{{ fmt(billItemForm.total_price) }}</div>
            </a-form-item>
          </a-col>
          <a-col :span="3">
            <a-form-item class="mb-2" label=" ">
              <a-button type="primary" size="small" block @click="addBillItem" :disabled="!billItemForm.material_id || !billItemForm.quantity"><PlusOutlined /></a-button>
            </a-form-item>
          </a-col>
        </a-row>
      </div>

      <!-- Section 3: Items list -->
      <div v-if="billForm.items.length">
        <div class="text-xs font-bold text-gray-500 mb-2">Danh sách vật liệu ({{ billForm.items.length }})</div>
        <div class="space-y-1.5 max-h-[220px] overflow-y-auto">
          <div v-for="(bi, i) in billForm.items" :key="i" class="flex items-center justify-between p-2.5 bg-white rounded-lg border border-gray-100 hover:border-blue-200 transition">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="w-7 h-7 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-xs font-bold text-orange-500">{{ i + 1 }}</div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-semibold text-gray-700 truncate">{{ bi._name }}</div>
                <div class="text-xs text-gray-400">{{ fmtQty(bi.quantity) }} {{ bi._unit }} × {{ fmt(bi.unit_price) }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-emerald-600 whitespace-nowrap">{{ fmt(bi.quantity * bi.unit_price) }}</span>
              <a-button type="text" size="small" danger @click="billForm.items.splice(i, 1)"><CloseOutlined class="text-xs" /></a-button>
            </div>
          </div>
        </div>
        <!-- Total -->
        <div class="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
          <span class="text-sm font-semibold text-gray-600">Tổng cộng ({{ billForm.items.length }} vật liệu)</span>
          <span class="text-base font-extrabold text-emerald-600">{{ fmt(billForm.items.reduce((s,i) => s + i.quantity * i.unit_price, 0)) }}</span>
        </div>
      </div>
      <div v-else class="text-center py-6">
        <div class="text-3xl mb-2 opacity-40">📦</div>
        <div class="text-sm text-gray-400">Chưa có vật liệu</div>
        <div class="text-xs text-gray-300">Chọn vật liệu ở trên và nhấn nút +</div>
      </div>

      <!-- Section 4: Existing Attachments (When editing) -->
      <div v-if="isEditBill && attachTargetForBill?.attachments?.length" class="border-t border-dashed pt-4 mb-4">
        <div class="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <PaperClipOutlined /> Tệp chứng từ hiện có ({{ attachTargetForBill.attachments.length }})
        </div>
        <div class="space-y-1">
          <div v-for="att in attachTargetForBill.attachments" :key="att.id" 
               class="flex items-center justify-between p-2 rounded-lg border transition-all"
               :class="billForm.deleted_attachment_ids.includes(att.id) ? 'bg-red-50 border-red-100 opacity-60' : 'bg-gray-50 border-gray-100'">
            <div class="flex items-center gap-2 min-w-0">
              <FileOutlined class="text-gray-400 text-xs" />
              <a href="#" @click.prevent="openFilePreview(att)" 
                 class="text-[10px] truncate max-w-[200px]"
                 :class="billForm.deleted_attachment_ids.includes(att.id) ? 'text-red-400 line-through' : 'text-gray-700 hover:text-blue-600'">{{ att.original_name }}</a>
              <span class="text-[9px] text-gray-400">({{ formatFileSize(att.file_size) }})</span>
            </div>
            <a-button type="text" size="small" @click="toggleBillAttachmentDeletion(att.id)" class="h-6 w-6 p-0 flex items-center justify-center">
              <UndoOutlined v-if="billForm.deleted_attachment_ids.includes(att.id)" class="text-[10px] text-blue-500" />
              <DeleteOutlined v-else class="text-[10px] text-gray-400 hover:text-red-500" />
            </a-button>
          </div>
        </div>
      </div>

      <!-- Section 5: File Attachments (Add new) -->
      <div class="border-t border-dashed pt-4 mb-4">
        <div class="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <FileOutlined /> Chứng từ đính kèm (Ảnh chụp phiếu/hóa đơn)
        </div>
        
        <div class="flex flex-col gap-2">
          <!-- Selection Button -->
          <div class="relative group">
            <input 
              type="file" 
              multiple 
              @change="e => billFiles = [...(e.target.files || [])]" 
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            <div class="flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-gray-200 rounded-xl group-hover:border-blue-400 group-hover:bg-blue-50 transition-all">
              <UploadOutlined class="text-gray-400 group-hover:text-blue-500" />
              <span class="text-xs font-medium text-gray-500 group-hover:text-blue-600">
                {{ billFiles.length ? 'Thay đổi tệp đã chọn' : 'Nhấn để chọn tệp chứng từ' }}
              </span>
            </div>
          </div>

          <!-- File List -->
          <div v-if="billFiles.length" class="space-y-1 mt-1">
            <div v-for="(file, idx) in billFiles" :key="idx" class="flex items-center justify-between p-2 bg-blue-50/50 rounded-lg border border-blue-100/50">
              <div class="flex items-center gap-2 min-w-0">
                <PaperClipOutlined class="text-blue-400 text-xs" />
                <span class="text-[10px] font-medium text-blue-700 truncate max-w-[200px]">{{ file.name }}</span>
                <span class="text-[9px] text-gray-400">({{ formatFileSize(file.size) }})</span>
              </div>
              <a-button type="text" size="small" @click="billFiles.splice(idx, 1)" class="h-6 w-6 p-0 flex items-center justify-center">
                <CloseOutlined class="text-[10px] text-gray-400 hover:text-red-500" />
              </a-button>
            </div>
          </div>
          <div v-else class="text-[10px] text-gray-400 mt-1 italic pl-1">Không bắt buộc đính kèm file</div>
        </div>
      </div>

      <!-- Submit -->
      <a-button v-if="billForm.items.length" type="primary" block size="large" :loading="submittingBill" @click="submitBillForm" :disabled="!billForm.bill_date">
        <CheckOutlined /> {{ isEditBill ? 'Cập nhật phiếu nhập vật liệu' : 'Tạo phiếu nhập vật liệu' }}
      </a-button>
    </div>
  </a-modal>

  <a-modal v-model:open="showRejectBillModal" title="Từ chối phiếu vật liệu" @ok="confirmRejectBill" ok-text="Từ chối" cancel-text="Hủy" centered :ok-button-props="{ danger: true }" class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Lý do từ chối" required>
        <a-textarea v-model:value="rejectBillReason" :rows="3" placeholder="Nhập lý do từ chối..." />
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- ACCOUNTANT CONFIRM PAYMENT MODAL (Unified for Material & Sub) -->
  <a-modal v-model:open="showConfirmPaymentModal" :title="confirmPaymentType === 'material' ? 'Kế toán xác nhận - Phiếu Vật tư' : 'Kế toán xác nhận - Thanh toán thầu phụ'" @ok="confirmApprovePayment" ok-text="Xác nhận chi" cancel-text="Hủy" centered class="crm-modal">
    <div class="p-4 space-y-4">
      <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg"><InfoCircleOutlined /></div>
        <div class="text-[11px] text-blue-700 leading-tight">
          Xác nhận khoản chi này thuộc hạng mục ngân sách nào để hệ thống tự động trừ định mức của dự án.
        </div>
      </div>

      <div v-if="confirmPaymentTarget" class="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs">
         <div class="flex justify-between">
            <span class="text-gray-400">Số phiếu:</span>
            <span class="font-bold text-gray-700">{{ confirmPaymentTarget.bill_number || confirmPaymentTarget.payment_number }}</span>
         </div>
         <div class="flex justify-between mt-1">
            <span class="text-gray-400">Số tiền:</span>
            <span class="font-bold text-red-600">{{ fmt(confirmPaymentTarget.total_amount || confirmPaymentTarget.amount) }}</span>
         </div>
         <div v-if="confirmPaymentSub" class="flex justify-between mt-1">
            <span class="text-gray-400">Nhà thầu:</span>
            <span class="font-medium">{{ confirmPaymentSub.name }}</span>
         </div>
      </div>

      <div>
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Chọn hạng mục Ngân sách</div>
        <a-select v-model:value="confirmPaymentBudgetItem" class="w-full" placeholder="Chọn hạng mục dự toán..." show-search :filter-option="(input, option) => (option.label || '').toLowerCase().indexOf(input.toLowerCase()) >= 0">
          <a-select-opt-group v-for="budget in (project.budgets || []).filter(b => b.status === 'active')" :key="budget.id">
            <template #label><span class="text-indigo-600 font-bold uppercase text-[10px]">{{ budget.name }} - ĐANG SỬ DỤNG</span></template>
            <a-select-option v-for="item in budget.items" :key="item.id" :value="item.id" :label="item.name">
              <div class="flex justify-between items-center w-full">
                <span>{{ item.name }}</span>
                <span class="text-[10px] text-gray-400">Còn lại: {{ fmt(item.remaining_amount || 0) }}</span>
              </div>
            </a-select-option>
          </a-select-opt-group>
          <a-select-opt-group label="Các ngân sách khác (Bản nháp/Chờ duyệt)">
             <template v-for="budget in (project.budgets || []).filter(b => b.status !== 'active')" :key="budget.id">
                <a-select-option v-for="item in budget.items" :key="item.id" :value="item.id" :label="item.name">
                  <span class="text-gray-400">[{{ budget.name }}]</span> {{ item.name }}
                </a-select-option>
             </template>
          </a-select-opt-group>
        </a-select>
        <div v-if="!confirmPaymentBudgetItem" class="mt-1 text-[10px] text-amber-500 italic">* Khuyên dùng: Hãy chọn hạng mục để theo dõi thực chi chính xác.</div>
      </div>
    </div>
  </a-modal>



  <!-- ==================== EQUIPMENT RENTAL MODAL ==================== -->
  <a-modal v-model:open="showRentalModal" :title="isEditRental ? 'Cập nhật Phiếu Thuê Thiết Bị' : 'Tạo Phiếu Thuê Thiết Bị'" :width="640" @ok="submitRentalForm" :ok-text="isEditRental ? 'Cập nhật' : 'Tạo phiếu'" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tên thiết bị thuê" required v-bind="fieldStatus('equipment_name')">
        <a-input v-model:value="rentalForm.equipment_name" size="large" placeholder="VD: Máy đào CAT 320..." />
      </a-form-item>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="Số lượng" required>
            <a-input-number v-model:value="rentalForm.quantity" :min="1" size="large" class="w-full" @change="updateRentalTotal" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Đơn giá (thuê)" required>
            <a-input-number v-model:value="rentalForm.unit_price" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" @change="updateRentalTotal" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="12">
        <a-col :span="8">
          <a-form-item label="Ngày bắt đầu" required v-bind="fieldStatus('rental_start_date')"><a-date-picker v-model:value="rentalForm.rental_start_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Ngày kết thúc" required v-bind="fieldStatus('rental_end_date')"><a-date-picker v-model:value="rentalForm.rental_end_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Thành tiền (VNĐ)">
            <a-input-number v-model:value="rentalForm.total_cost" :min="0" size="large" class="w-full !bg-gray-50" readonly :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" :parser="v => v.replace(/,/g, '')" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Ghi chú"><a-textarea v-model:value="rentalForm.notes" :rows="2" placeholder="Ghi chú..." /></a-form-item>
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Tệp đính kèm</div>
        <input type="file" multiple @change="e => rentalFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="rentalFiles.length" class="text-[10px] text-green-600 mt-1">{{ rentalFiles.length }} tệp đã chọn</div>
      </div>
    </a-form>
  </a-modal>

  <!-- ==================== EQUIPMENT PURCHASE MODAL — DISABLED ==================== -->
  <!--
  <a-modal v-model:open="showPurchaseModal" :title="isEditPurchase ? 'Cập nhật Phiếu Mua Thiết Bị' : 'Tạo Phiếu Mua Thiết Bị'" :width="700" @ok="submitPurchaseForm" :ok-text="isEditPurchase ? 'Cập nhật' : 'Tạo phiếu'" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <div class="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
        <div class="flex items-center justify-between mb-3">
          <h4 class="font-semibold text-gray-700 flex items-center gap-2">
            <span class="w-1.5 h-5 rounded-full bg-gradient-to-b from-purple-400 to-purple-600"></span>
            Danh sách thiết bị mua
          </h4>
          <a-button type="dashed" size="small" @click="addPurchaseItem"><PlusOutlined /> Thêm</a-button>
        </div>
        <div v-for="(item, idx) in purchaseForm.items" :key="idx" class="flex gap-2 items-end mb-2">
          <div class="flex-1">
            <div v-if="idx === 0" class="text-[10px] text-gray-400 mb-1">Tên thiết bị *</div>
            <a-input v-model:value="item.name" size="small" placeholder="Tên thiết bị..." />
          </div>
          <div class="w-24">
            <div v-if="idx === 0" class="text-[10px] text-gray-400 mb-1">Mã</div>
            <a-input v-model:value="item.code" size="small" placeholder="Mã" />
          </div>
          <div class="w-16">
            <div v-if="idx === 0" class="text-[10px] text-gray-400 mb-1">SL</div>
            <a-input-number v-model:value="item.quantity" :min="1" size="small" class="w-full" />
          </div>
          <div class="w-32">
            <div v-if="idx === 0" class="text-[10px] text-gray-400 mb-1">Đơn giá (VNĐ)</div>
            <a-input-number v-model:value="item.unit_price" :min="0" size="small" class="w-full" />
          </div>
          <div class="w-24 text-right text-xs font-bold text-emerald-600 pb-0.5">{{ fmt(item.quantity * item.unit_price) }}</div>
          <a-button v-if="purchaseForm.items.length > 1" type="text" size="small" danger @click="removePurchaseItem(idx)"><DeleteOutlined /></a-button>
        </div>
        <div class="border-t pt-2 mt-2 flex justify-end text-sm font-bold text-gray-700">
          Tổng: <span class="text-emerald-600 ml-2">{{ fmt(purchaseForm.items.reduce((s, i) => s + (i.quantity * i.unit_price), 0)) }}</span>
        </div>
      </div>
      <a-form-item label="Ghi chú"><a-textarea v-model:value="purchaseForm.notes" :rows="2" placeholder="Ghi chú..." /></a-form-item>
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Tệp đính kèm</div>
        <input type="file" multiple @change="e => purchaseFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="purchaseFiles.length" class="text-[10px] text-green-600 mt-1">{{ purchaseFiles.length }} tệp đã chọn</div>
      </div>
    </a-form>
  </a-modal>
  -->

  <!-- ==================== ASSET USAGE MODAL ==================== -->
  <a-modal v-model:open="showUsageModal" :title="isEditUsage ? 'Cập nhật Mượn Thiết Bị Từ Kho' : 'Mượn Thiết Bị Từ Kho'" :width="540" @ok="submitUsageForm" :ok-text="isEditUsage ? 'Cập nhật' : 'Tạo phiếu'" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Thiết bị từ kho" required>
        <a-select v-model:value="usageForm.equipment_id" show-search option-filter-prop="label" placeholder="Tìm thiết bị..." size="large" class="w-full">
          <a-select-option v-for="e in allEquipment" :key="e.id" :value="e.id" :label="e.name">
            {{ e.name }} <span class="text-gray-400 text-xs">({{ e.code || '' }} — {{ eqStatusLabel(e.status) }})</span>
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-row :gutter="12">
        <a-col :span="12">
          <a-form-item label="Người nhận" required>
            <a-select v-model:value="usageForm.receiver_id" show-search option-filter-prop="label" placeholder="Chọn người nhận..." size="large" class="w-full">
              <a-select-option v-for="u in users" :key="u.id" :value="u.id" :label="u.name">{{ u.name }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="Số lượng"><a-input-number v-model:value="usageForm.quantity" :min="1" size="large" class="w-full" /></a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="Ngày nhận" required><a-date-picker v-model:value="usageForm.received_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Ghi chú"><a-textarea v-model:value="usageForm.notes" :rows="2" placeholder="Ghi chú..." /></a-form-item>
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Tệp đính kèm</div>
        <input type="file" multiple @change="e => usageFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="usageFiles.length" class="text-[10px] text-green-600 mt-1">{{ usageFiles.length }} tệp đã chọn</div>
      </div>
    </a-form>
  </a-modal>

  <!-- WBS Import Modal (Sprint 1) -->
  <a-modal v-model:open="showImportWbs" title="Import WBS Template" :width="500" @ok="importWbsTemplate" ok-text="Import" cancel-text="Hủy" centered destroy-on-close class="crm-modal" :confirm-loading="wbsImporting">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="WBS Template" required>
        <a-select v-model:value="wbsImportForm.template_id" size="large" class="w-full" placeholder="Chọn template" @change="loadWbsTemplatePreview">
          <a-select-option v-for="t in wbsTemplates" :key="t.id" :value="t.id">
            {{ t.name }} <span class="text-gray-400">({{ t.project_type }})</span>
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="Ngày bắt đầu dự án" required>
        <a-date-picker v-model:value="wbsImportForm.start_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" />
      </a-form-item>
      <div v-if="wbsPreview" class="bg-gray-50 rounded-xl p-3 text-xs space-y-1 max-h-60 overflow-y-auto">
        <div class="font-semibold text-gray-600 mb-2">Preview cấu trúc ({{ wbsPreview.items_count }} hạng mục):</div>
        <div v-for="phase in (wbsPreview.tree || [])" :key="phase.id">
          <div class="font-medium text-blue-600">📁 {{ phase.name }}</div>
          <div v-for="cat in (phase.children || [])" :key="cat.id" class="pl-4 text-gray-500">
            <div>📂 {{ cat.name }}</div>
            <div v-for="task in (cat.children || []).slice(0, 3)" :key="task.id" class="pl-4 text-gray-400">
              └ {{ task.name }} ({{ task.default_duration || '?' }} ngày)
            </div>
            <div v-if="(cat.children || []).length > 3" class="pl-4 text-gray-300">... và {{ cat.children.length - 3 }} hạng mục khác</div>
          </div>
        </div>
      </div>
    </a-form>
  </a-modal>

  <!-- ============ ATTENDANCE MODAL ============ -->
  <a-modal v-model:open="showAttendanceModal" title="Chấm công thủ công" :width="520" @ok="submitManualAttendance" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal" :confirm-loading="attendanceSaving">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Nhân viên" required>
        <a-select v-model:value="attendanceForm.user_id" size="large" class="w-full" placeholder="Chọn nhân viên" show-search :filter-option="filterOption">
          <a-select-option v-for="u in (users || [])" :key="u.id" :value="u.id">
            {{ u.name }} <span class="text-gray-400 text-xs">— {{ u.phone || u.email }}</span>
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="Ngày làm việc" required>
        <a-date-picker v-model:value="attendanceForm.work_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" />
      </a-form-item>
      <div class="grid grid-cols-2 gap-3">
        <a-form-item label="Giờ vào">
          <a-time-picker v-model:value="attendanceForm.check_in" size="large" class="w-full" format="HH:mm" value-format="HH:mm" />
        </a-form-item>
        <a-form-item label="Giờ ra">
          <a-time-picker v-model:value="attendanceForm.check_out" size="large" class="w-full" format="HH:mm" value-format="HH:mm" />
        </a-form-item>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <a-form-item label="Trạng thái">
          <a-select v-model:value="attendanceForm.status" size="large" class="w-full">
            <a-select-option value="present">Có mặt</a-select-option>
            <a-select-option value="absent">Vắng</a-select-option>
            <a-select-option value="late">Trễ</a-select-option>
            <a-select-option value="half_day">Nửa ngày</a-select-option>
            <a-select-option value="leave">Nghỉ phép</a-select-option>
            <a-select-option value="holiday">Nghỉ lễ</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Tăng ca (giờ)">
          <a-input-number v-model:value="attendanceForm.overtime_hours" size="large" class="w-full" :min="0" :max="12" :step="0.5" placeholder="0" />
        </a-form-item>
      </div>
      <a-form-item label="Ghi chú">
        <a-textarea v-model:value="attendanceForm.note" :rows="2" placeholder="Ghi chú thêm..." />
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- ============ REJECT ATTENDANCE MODAL ============ -->
  <a-modal
    v-model:open="showRejectAttModal"
    title="Từ chối chấm công"
    ok-text="Từ chối"
    ok-type="danger"
    cancel-text="Hủy"
    :width="420"
    centered
    @ok="rejectAttendance"
  >
    <div class="mt-4 space-y-3">
      <p class="text-sm text-gray-500">Nhập lý do từ chối để nhân viên biết cần chỉnh sửa lại.</p>
      <a-textarea v-model:value="rejectAttReason" :rows="3" placeholder="Lý do từ chối..." />
    </div>
  </a-modal>

  <!-- ============ GENERATE LABOR COST MODAL ============ -->
  <a-modal
    v-model:open="showGenerateLaborCostModal"
    title="🧮 Tổng hợp chi phí nhân công từ chấm công"
    :width="560"
    :footer="null"
    centered
    destroy-on-close
    class="crm-modal"
  >
    <div class="space-y-4 mt-4">
      <a-alert
        message="Hệ thống sẽ tìm tất cả bản chấm công đã duyệt trong tháng và tự tạo phiếu Chi phí nhân công (nhóm NC) dựa trên cấu hình lương của nhân viên."
        type="info"
        show-icon
        class="rounded-lg"
      />
      <div class="grid grid-cols-2 gap-3">
        <a-form-item label="Tháng">
          <a-select v-model:value="laborCostForm.month" size="large" class="w-full">
            <a-select-option v-for="m in 12" :key="m" :value="m">Tháng {{ m }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="Năm">
          <a-input-number v-model:value="laborCostForm.year" size="large" class="w-full" :min="2020" :max="2030" />
        </a-form-item>
      </div>

      <!-- Result after generate -->
      <div v-if="laborCostResult" class="space-y-3">
        <a-divider>Kết quả</a-divider>
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-green-50 p-3 rounded-lg text-center">
            <div class="text-2xl font-bold text-green-700">{{ laborCostResult.created }}</div>
            <div class="text-xs text-gray-500">Đã tạo</div>
          </div>
          <div class="bg-gray-50 p-3 rounded-lg text-center">
            <div class="text-2xl font-bold text-gray-600">{{ laborCostResult.skipped }}</div>
            <div class="text-xs text-gray-500">Đã có</div>
          </div>
          <div class="bg-amber-50 p-3 rounded-lg text-center">
            <div class="text-2xl font-bold text-amber-600">{{ laborCostResult.no_config }}</div>
            <div class="text-xs text-gray-500">Chưa cấu hình lương</div>
          </div>
        </div>
        <div class="bg-blue-50 p-3 rounded-lg text-center">
          <div class="text-sm text-gray-500">Tổng chi phí tạo mới</div>
          <div class="text-2xl font-bold text-blue-700">{{ fmtMoney(laborCostResult.total_amount) }}</div>
        </div>
        <div v-if="laborCostResult.errors?.length" class="mt-2">
          <a-alert v-for="(err, i) in laborCostResult.errors" :key="i" :message="err" type="error" class="mb-1 rounded" />
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <a-button @click="showGenerateLaborCostModal = false">Đóng</a-button>
        <a-button type="primary" :loading="generatingLaborCosts" @click="submitGenerateLaborCosts">
          <template #icon><CalculatorOutlined /></template>
          Tổng hợp
        </a-button>
      </div>
    </div>
  </a-modal>

  <!-- ============ SHIFT MODAL ============ -->
  <a-modal v-model:open="showShiftModal" title="Tạo ca làm việc" :width="480" @ok="submitShift" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal" :confirm-loading="shiftSaving">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tên ca" required>
        <a-input v-model:value="shiftForm.name" size="large" placeholder="VD: Ca sáng, Ca đêm" />
      </a-form-item>
      <div class="grid grid-cols-2 gap-3">
        <a-form-item label="Giờ bắt đầu" required>
          <a-time-picker v-model:value="shiftForm.start_time" size="large" class="w-full" format="HH:mm" value-format="HH:mm" />
        </a-form-item>
        <a-form-item label="Giờ kết thúc" required>
          <a-time-picker v-model:value="shiftForm.end_time" size="large" class="w-full" format="HH:mm" value-format="HH:mm" />
        </a-form-item>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <a-form-item label="Nghỉ giữa ca (giờ)">
          <a-input-number v-model:value="shiftForm.break_hours" size="large" class="w-full" :min="0" :max="2" :step="0.5" />
        </a-form-item>
        <a-form-item label="Hệ số OT">
          <a-input-number v-model:value="shiftForm.overtime_multiplier" size="large" class="w-full" :min="1" :max="3" :step="0.5" />
        </a-form-item>
      </div>
      <a-form-item>
        <a-checkbox v-model:checked="shiftForm.is_overtime_shift">Ca ngoài giờ (OT)</a-checkbox>
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- ============ LABOR PRODUCTIVITY MODAL ============ -->
  <a-modal v-model:open="showLaborModal" title="Ghi nhận năng suất lao động" :width="560" @ok="submitLaborRecord" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal" :confirm-loading="laborSaving">
    <a-form layout="vertical" class="mt-4">
      <div class="grid grid-cols-2 gap-3">
        <a-form-item label="Hạng mục công việc" required>
          <a-input v-model:value="laborForm.work_item" size="large" placeholder="VD: Đổ sàn tầng 3, Xây tường ngăn" />
        </a-form-item>
        <a-form-item label="Người thực hiện/Phụ trách">
          <a-select v-model:value="laborForm.user_id" size="large" class="w-full" placeholder="Chọn nhân viên" show-search :filter-option="filterOption">
            <a-select-option v-for="u in (users || [])" :key="u.id" :value="u.id">
              {{ u.name }} <span class="text-gray-400 text-xs">— {{ u.phone || u.email }}</span>
            </a-select-option>
          </a-select>
        </a-form-item>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <a-form-item label="Đơn vị" required>
          <a-select v-model:value="laborForm.unit" size="large" class="w-full">
            <a-select-option v-for="u in ['m²', 'm³', 'm', 'kg', 'tấn', 'cái', 'bộ', 'm.dài', 'điểm']" :key="u" :value="u">{{ u }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="KL Kế hoạch" required>
          <a-input-number v-model:value="laborForm.planned_quantity" size="large" class="w-full" :min="0" placeholder="0" />
        </a-form-item>
        <a-form-item label="KL Thực tế" required>
          <a-input-number v-model:value="laborForm.actual_quantity" size="large" class="w-full" :min="0" placeholder="0" />
        </a-form-item>
      </div>
      <div class="grid grid-cols-3 gap-3">
        <a-form-item label="Nhân công">
          <a-input-number v-model:value="laborForm.workers_count" size="large" class="w-full" :min="1" />
        </a-form-item>
        <a-form-item label="Số giờ làm">
          <a-input-number v-model:value="laborForm.hours_spent" size="large" class="w-full" :min="0.5" :step="0.5" />
        </a-form-item>
        <a-form-item label="Ngày">
          <a-date-picker v-model:value="laborForm.record_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" />
        </a-form-item>
      </div>
      <div v-if="laborForm.planned_quantity && laborForm.actual_quantity" class="bg-blue-50 rounded-xl p-4 border border-blue-200 mb-4">
        <div class="text-xs text-gray-500 mb-2 font-semibold">📊 Xem trước năng suất</div>
        <div class="flex gap-6 text-sm">
          <div>
            <span class="text-gray-400">Hiệu suất:</span>
            <span class="font-bold ml-1"
              :class="(laborForm.actual_quantity / laborForm.planned_quantity * 100) >= 90 ? 'text-green-600' : (laborForm.actual_quantity / laborForm.planned_quantity * 100) >= 70 ? 'text-amber-600' : 'text-red-500'">
              {{ (laborForm.actual_quantity / laborForm.planned_quantity * 100).toFixed(1) }}%
            </span>
          </div>
          <div v-if="laborForm.workers_count && laborForm.hours_spent">
            <span class="text-gray-400">Năng suất:</span>
            <span class="font-bold text-blue-600 ml-1">
              {{ (laborForm.actual_quantity / (laborForm.workers_count * laborForm.hours_spent)).toFixed(2) }} {{ laborForm.unit }}/người·giờ
            </span>
          </div>
        </div>
      </div>
      <a-form-item label="Ghi chú">
        <a-textarea v-model:value="laborForm.note" :rows="2" placeholder="Ghi chú thêm..." />
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- ============ WARRANTY MODAL ============ -->
  <a-modal v-model:open="showWarrantyModal" :title="isEditWarranty ? 'Cập nhật Phiếu Bảo Hành' : 'Tạo Phiếu Bảo Hành'" :width="640" @ok="submitWarrantyForm" :confirm-loading="savingWarranty" ok-text="Lưu phiếu" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Ngày bàn giao" required><a-date-picker v-model:value="warrantyForm.handover_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item>
      <a-row :gutter="12">
        <a-col :span="12"><a-form-item label="Bắt đầu bảo hành" required><a-date-picker v-model:value="warrantyForm.warranty_start_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Kết thúc bảo hành" required><a-date-picker v-model:value="warrantyForm.warranty_end_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="Nội dung bảo hành" required><a-textarea v-model:value="warrantyForm.warranty_content" :rows="4" placeholder="Nhập chi tiết các hạng mục bảo hành..." /></a-form-item>
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Chứng từ bàn giao / Bảo hành</div>
        <input type="file" multiple @change="e => warrantyFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="warrantyFiles.length" class="text-[10px] text-green-600 mt-1">{{ warrantyFiles.length }} tệp đã chọn</div>
      </div>
    </a-form>
  </a-modal>

  <!-- ============ MAINTENANCE MODAL ============ -->
  <a-modal v-model:open="showMaintenanceModal" :title="isEditMaintenance ? 'Cập nhật phiếu bảo trì' : 'Ghi nhận bảo trì định kỳ'" :width="540" @ok="submitMaintenanceForm" :confirm-loading="savingMaintenance" :ok-text="isEditMaintenance ? 'Cập nhật' : 'Ghi nhận'" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Ngày bảo trì" required><a-date-picker v-model:value="maintenanceForm.maintenance_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item>
      <a-form-item label="Nội dung thực hiện" required><a-textarea v-model:value="maintenanceForm.notes" :rows="4" placeholder="Mô tả các công việc bảo trì đã thực hiện..." /></a-form-item>
      <div class="bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
         <span class="text-xs text-blue-700 font-semibold">Ngày bảo trì tiếp theo (dự kiến):</span>
         <span class="text-sm font-bold text-blue-800">{{ maintenanceForm.maintenance_date ? dayjs(maintenanceForm.maintenance_date).add(6, 'month').format('DD/MM/YYYY') : '—' }}</span>
      </div>
      <div class="border-t pt-3 mt-4">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Hình ảnh / Biên bản bảo trì</div>
        <input type="file" multiple @change="e => maintenanceFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="maintenanceFiles.length" class="text-[10px] text-green-600 mt-1">{{ maintenanceFiles.length }} tệp đã chọn</div>
      </div>
    </a-form>
  </a-modal>

  <!-- ============ MAINTENANCE DETAIL DRAWER ============ -->
  <a-drawer v-model:open="showMaintenanceDetailDrawer" title="Chi tiết Phiếu Bảo trì" :width="560" @close="maintenanceDetail = null" destroy-on-close class="crm-drawer">
    <div v-if="maintenanceDetail" class="space-y-6 pb-24">
      <!-- Header -->
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-teal-100">🔧</div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Mã phiếu: #{{ maintenanceDetail.id }}</div>
            <div class="text-lg font-bold text-gray-800">Phiếu bảo trì định kỳ</div>
          </div>
        </div>
        <a-tag :color="maintenanceStatusColors[maintenanceDetail.status]" class="rounded-full px-4 py-1 text-xs font-semibold">{{ maintenanceStatusLabels[maintenanceDetail.status] || maintenanceDetail.status }}</a-tag>
      </div>

      <!-- Timeline Info -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-teal-500"><CalendarOutlined /> Thời gian bảo trì</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Ngày thực hiện</span>
            <span class="font-bold text-gray-800">{{ fmtDate(maintenanceDetail.maintenance_date) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Lần bảo trì tiếp theo</span>
            <span class="font-bold" :class="isPast(maintenanceDetail.next_maintenance_date) ? 'text-red-500' : 'text-blue-600'">
              {{ fmtDate(maintenanceDetail.next_maintenance_date) }}
              <a-tag v-if="isPast(maintenanceDetail.next_maintenance_date)" color="red" class="ml-1 text-[10px] rounded-full">QUÁ HẠN</a-tag>
            </span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Người tạo</span>
            <span class="font-semibold text-gray-700">{{ maintenanceDetail.creator?.name || '—' }}</span>
          </div>
          <div v-if="maintenanceDetail.approver" class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Người duyệt</span>
            <span class="font-semibold text-green-600">{{ maintenanceDetail.approver?.name || '—' }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5">
            <span class="text-gray-400">Ngày tạo phiếu</span>
            <span class="font-medium text-gray-600">{{ fmtDate(maintenanceDetail.created_at) }}</span>
          </div>
        </div>
      </div>

      <!-- Notes -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2 text-teal-500"><FileOutlined /> Nội dung bảo trì</div>
        <div class="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{{ maintenanceDetail.notes || 'Không có nội dung' }}</div>
      </div>

      <!-- Attachments -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="flex justify-between items-center mb-4">
          <div class="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 text-teal-500"><CameraOutlined /> Hình ảnh / Biên bản ({{ maintenanceDetail.attachments?.length || 0 }})</div>
        </div>
        <div v-if="maintenanceDetail.attachments?.length" class="flex flex-wrap gap-2">
          <div v-for="att in maintenanceDetail.attachments" :key="att.id"
               class="group relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-400 transition"
               @click="openFilePreview(att)">
            <img v-if="isImageFile(att)" :src="att.file_url || att.url" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-[10px] font-bold text-gray-400">
              {{ fileExt(att).toUpperCase() }}
            </div>
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <EyeOutlined class="text-white text-lg" />
            </div>
          </div>
        </div>
        <a-empty v-else :image="null" description="Chưa có ảnh / biên bản" class="text-gray-300 my-0 py-2" />
      </div>

      <!-- Approval Flow Visualization -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-teal-500"><HistoryOutlined /> Luồng duyệt</div>
        <div class="flex items-center gap-2">
          <div class="flex flex-col items-center">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                 :class="maintenanceDetail.status !== 'draft' ? 'bg-green-500' : 'bg-blue-500 ring-2 ring-blue-200'">1</div>
            <div class="text-[10px] text-gray-500 mt-1 font-semibold">Nháp</div>
          </div>
          <div class="flex-1 h-0.5 rounded" :class="['pending_customer','approved'].includes(maintenanceDetail.status) ? 'bg-green-400' : 'bg-gray-200'"></div>
          <div class="flex flex-col items-center">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                 :class="maintenanceDetail.status === 'approved' ? 'bg-green-500' : maintenanceDetail.status === 'pending_customer' ? 'bg-amber-500 ring-2 ring-amber-200' : maintenanceDetail.status === 'rejected' ? 'bg-red-500' : 'bg-gray-300'">2</div>
            <div class="text-[10px] text-gray-500 mt-1 font-semibold">Chờ KH</div>
          </div>
          <div class="flex-1 h-0.5 rounded" :class="maintenanceDetail.status === 'approved' ? 'bg-green-400' : 'bg-gray-200'"></div>
          <div class="flex flex-col items-center">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                 :class="maintenanceDetail.status === 'approved' ? 'bg-green-500 text-white ring-2 ring-green-200' : maintenanceDetail.status === 'rejected' ? 'bg-red-500 text-white' : 'bg-gray-300 text-gray-500'">
              {{ maintenanceDetail.status === 'rejected' ? '✗' : '3' }}
            </div>
            <div class="text-[10px] text-gray-500 mt-1 font-semibold">{{ maintenanceDetail.status === 'rejected' ? 'Từ chối' : 'Duyệt' }}</div>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 transition-all">
        <div class="flex gap-2">
          <a-popconfirm v-if="can('warranty.delete') && ['draft','rejected'].includes(maintenanceDetail.status)" title="Xóa phiếu bảo trì?" @confirm="deleteMaintenance(maintenanceDetail)">
            <a-button danger type="text"><DeleteOutlined /> Xóa</a-button>
          </a-popconfirm>
          <a-button v-if="can('warranty.update') && ['draft','rejected'].includes(maintenanceDetail.status)" type="text" @click="editMaintenanceFromDrawer(maintenanceDetail)">
            <template #icon><EditOutlined /></template> Sửa
          </a-button>
        </div>
        <div class="flex gap-2">
          <!-- Draft → Submit for customer approval -->
          <a-button v-if="maintenanceDetail.status === 'draft' && can('warranty.update')" type="primary" @click="submitMaintenanceForApproval(maintenanceDetail)">
            <template #icon><SendOutlined /></template>Gửi KH duyệt
          </a-button>
          <!-- Pending Customer → Approve / Reject -->
          <template v-if="maintenanceDetail.status === 'pending_customer' && can('warranty.approve')">
            <a-button type="primary" class="bg-green-600 border-green-600" @click="approveMaintenanceRecord(maintenanceDetail)">
              <template #icon><CheckCircleOutlined /></template>Duyệt
            </a-button>
            <a-button danger ghost @click="rejectMaintenanceRecord(maintenanceDetail)">
              <template #icon><CloseCircleOutlined /></template>Từ chối
            </a-button>
          </template>
        </div>
      </div>
    </div>
  </a-drawer>

  <!-- ============ WARRANTY DETAIL DRAWER ============ -->
  <a-drawer v-model:open="showWarrantyDetailDrawer" title="Chi tiết Phiếu Bảo hành" :width="560" @close="warrantyDetail = null" destroy-on-close class="crm-drawer">
    <div v-if="warrantyDetail" class="space-y-6 pb-24">
      <!-- Header -->
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100"><SafetyCertificateOutlined class="text-xl" /></div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Phiếu bảo hành #{{ warrantyDetail.id }}</div>
            <div class="text-lg font-bold text-gray-800">Bảo hành dự án</div>
          </div>
        </div>
        <a-tag :color="warrantyDetail.status === 'approved' ? 'green' : warrantyDetail.status === 'rejected' ? 'red' : warrantyDetail.status === 'pending_customer' ? 'orange' : 'default'" class="rounded-full px-4 py-1 text-xs font-semibold">
          {{ warrantyDetail.status === 'approved' ? 'Đã duyệt' : warrantyDetail.status === 'rejected' ? 'Từ chối' : warrantyDetail.status === 'pending_customer' ? 'Chờ KH duyệt' : 'Nháp' }}
        </a-tag>
      </div>

      <!-- Timeline -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><CalendarOutlined /> Thông tin bảo hành</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Ngày bàn giao</span>
            <span class="font-bold text-gray-800">{{ fmtDate(warrantyDetail.handover_date) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Thời gian bảo hành</span>
            <span class="font-bold text-blue-600">{{ fmtDate(warrantyDetail.warranty_start_date) }} → {{ fmtDate(warrantyDetail.warranty_end_date) }}</span>
          </div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50">
            <span class="text-gray-400">Người tạo</span>
            <span class="font-semibold text-gray-700">{{ warrantyDetail.creator?.name || '—' }}</span>
          </div>
          <div v-if="warrantyDetail.approver" class="flex justify-between items-center py-2.5">
            <span class="text-gray-400">Người duyệt</span>
            <span class="font-semibold text-green-600">{{ warrantyDetail.approver?.name || '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Content -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2 text-blue-500"><FileProtectOutlined /> Nội dung bảo hành</div>
        <div class="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border border-gray-100">{{ warrantyDetail.warranty_content || 'Không có nội dung' }}</div>
      </div>

      <!-- Attachments -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><CameraOutlined /> Chứng từ ({{ warrantyDetail.attachments?.length || 0 }})</div>
        <div v-if="warrantyDetail.attachments?.length" class="flex flex-wrap gap-2">
          <div v-for="att in warrantyDetail.attachments" :key="att.id"
               class="group relative w-16 h-16 rounded-lg border border-gray-200 overflow-hidden cursor-pointer hover:border-blue-400 transition"
               @click="openFilePreview(att)">
            <img v-if="isImageFile(att)" :src="att.file_url || att.url" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-[10px] font-bold text-gray-400">{{ fileExt(att).toUpperCase() }}</div>
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"><EyeOutlined class="text-white text-lg" /></div>
          </div>
        </div>
        <a-empty v-else :image="null" description="Chưa có chứng từ" class="text-gray-300 my-0 py-2" />
      </div>

      <!-- Action Footer -->
      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white border-t border-gray-100 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 transition-all">
        <div class="flex gap-2">
          <a-button v-if="can('warranty.update')" type="text" @click="editWarrantyFromDrawer(warrantyDetail)">
            <template #icon><EditOutlined /></template> Sửa
          </a-button>
        </div>
        <div class="flex gap-2">
          <template v-if="warrantyDetail.status === 'draft' && can('warranty.approve')">
            <a-button type="primary" class="bg-green-600 border-green-600" @click="approveWarranty(warrantyDetail)">Duyệt</a-button>
            <a-button danger ghost @click="rejectWarranty(warrantyDetail)">Từ chối</a-button>
          </template>
        </div>
      </div>
    </div>
  </a-drawer>

</div> <!-- End Root Div -->
</template>

<script setup>
import { ref, computed, watch, reactive, onMounted, onBeforeUnmount } from 'vue'
import { Head, router, usePage } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import { message, Modal, notification } from 'ant-design-vue'
import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
dayjs.extend(utc)
import {
  ArrowLeftOutlined, EditOutlined, PlusOutlined, DeleteOutlined,
  SendOutlined, CheckCircleOutlined, CloseCircleOutlined, PlayCircleOutlined,
  CheckOutlined, CloseOutlined, DollarOutlined, ReloadOutlined,
  UploadOutlined, DownloadOutlined, FileOutlined,
  UserOutlined, CalendarOutlined, EyeOutlined, CheckSquareOutlined,
  LinkOutlined, CameraOutlined, CheckCircleFilled, MoreOutlined,
  SyncOutlined, DownOutlined, ExclamationCircleOutlined, WarningOutlined,
  ProjectOutlined, CloudOutlined, TeamOutlined, PictureOutlined,
  FilePdfOutlined, FileWordOutlined, FileExcelOutlined, ClockCircleOutlined,
  LineChartOutlined, FileProtectOutlined, BankOutlined, HistoryOutlined,
  FileAddOutlined, SafetyCertificateOutlined, PaperClipOutlined,
  CalculatorOutlined
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })

const page = usePage()

const props = defineProps({
  project: Object,
  users: Array,
  permissions: Array,
  counts: { type: Object, default: () => ({}) },
  costGroups: { type: Array, default: () => [] },
  personnelRoles: { type: Array, default: () => [] },
  contract: Object,
  materials: { type: Array, default: () => [] },
  suppliers: { type: Array, default: () => [] },
  acceptanceTemplates: { type: Array, default: () => [] },
  globalSubcontractors: { type: Array, default: () => [] },
  financeData: Object,
  scheduleData: Object,
  monitorData: Object,
  teamData: Object,
  equipmentData: Object,
  otherData: Object,
})

// ============ LAZY DATA BRIDGES ============
const costs = computed(() => props.financeData?.costs || props.project.costs || [])
const payments = computed(() => props.financeData?.payments || props.project.payments || [])
const invoices = computed(() => props.financeData?.invoices || [])
const budgets = computed(() => props.financeData?.budgets || props.project.budgets || [])
const allTasks = computed(() => props.scheduleData?.allTasks || [])
const counts = computed(() => props.counts || {})
const materialBills = computed(() => {
  const bills = props.scheduleData?.materialBills || [];
  return [...bills].sort((a, b) => {
    const dateA = new Date(a.bill_date || a.created_at || 0);
    const dateB = new Date(b.bill_date || b.created_at || 0);
    if (dateB.getTime() !== dateA.getTime()) return dateB.getTime() - dateA.getTime();
    return (b.id || 0) - (a.id || 0);
  });
})
const logs = computed(() => props.monitorData?.logs || props.project.construction_logs || [])
const acceptanceStages = computed(() => props.monitorData?.acceptanceStages || props.project.acceptance_stages || [])
const defects = computed(() => props.monitorData?.defects || props.project.defects || [])
const additionalCosts = computed(() => props.monitorData?.additional_costs || props.project.additional_costs || [])
const changeRequests = computed(() => props.monitorData?.change_requests || props.project.change_requests || [])
const personnel = computed(() => props.teamData?.personnel || props.project.personnel || [])
const subcontractors = computed(() => props.teamData?.subcontractors || props.project.subcontractors || [])
const equipmentRentals = computed(() => props.equipmentData?.rentals || [])
const equipmentPurchases = computed(() => props.equipmentData?.purchases || [])
const assetUsages = computed(() => props.equipmentData?.usages || [])
const allEquipment = computed(() => props.equipmentData?.allEquipment || [])
const companyAssets = computed(() => props.equipmentData?.companyAssets || [])
const contract = computed(() => props.contract || props.otherData?.contract || props.project?.contract || null)
const warranties = computed(() => props.otherData?.warranties || [])
const maintenances = computed(() => props.otherData?.maintenances || [])
const attachments = computed(() => props.otherData?.attachments || [])
const risks = computed(() => props.otherData?.risks || [])
const comments = computed(() => props.otherData?.comments || [])

// ============ PROXY PROJECT (The Magic Optimization) ============
// This computed property overrides the 'project' prop in template scope.
// It redirects array access to our lazy-loaded computed bridges.
const project = computed(() => {
  return new Proxy(props.project || {}, {
    get(target, prop) {
      if (prop === 'costs') return costs.value
      if (prop === 'payments') return payments.value
      if (prop === 'subcontractors') return subcontractors.value
      if (prop === 'personnel') return personnel.value
      if (prop === 'defects') return defects.value
      if (prop === 'acceptanceStages' || prop === 'acceptance_stages') return acceptanceStages.value
      if (prop === 'constructionLogs' || prop === 'construction_logs') return logs.value
      if (prop === 'additionalCosts' || prop === 'additional_costs') return additionalCosts.value
      if (prop === 'changeRequests' || prop === 'change_requests') return changeRequests.value
      if (prop === 'warranties') return warranties.value
      if (prop === 'maintenances') return maintenances.value
      if (prop === 'comments') return comments.value
      if (prop === 'risks') return risks.value
      if (prop === 'invoices') return invoices.value
      if (prop === 'budgets') return budgets.value
      if (prop === 'attachments') return attachments.value
      if (prop === 'contract') return contract.value
      if (prop === 'materialBills' || prop === 'material_bills') return materialBills.value
      
      // Dynamic financial properties for summary cards
      if (prop === 'total_value') {
        const contractVal = Number(contract.value?.contract_value || 0)
        const additionalVal = additionalCosts.value.reduce((s, c) => s + Number(c.amount || 0), 0)
        return contractVal + additionalVal
      }
      if (prop === 'total_paid_receivable') {
        return payments.value.filter(p => p.status === 'confirmed').reduce((s, p) => s + Number((p.actual_amount ?? p.amount) || 0), 0)
      }

      return target[prop]
    }
  })
})

const can = (perm) => {
  if (!page.props.permissions || !Array.isArray(page.props.permissions)) return true
  return page.props.permissions.includes(perm) || page.props.permissions.includes('*')
}

// Tab group → sub-tab mapping
const tabGroupTabs = {
  overview: ['overview'],
  schedule: ['gantt', 'progress'],
  finance: ['contract', 'costs', 'payments', 'additional_costs', 'budgets', 'finance', 'invoices'],
  expense: ['subcontractors', 'materials', 'equipment'],
  monitor: ['logs', 'acceptance', 'defects', 'change_requests', 'comments', 'risks'],
  hr: ['personnel', 'attendance', 'labor'],
  warranty: ['warranty', 'maintenances'],
  other: ['documents'],
}

const tabPermissions = {
  gantt: 'gantt.view',
  progress: 'project.task.view',
  contract: 'contract.view',
  costs: 'cost.view',
  payments: 'payment.view',
  invoices: 'invoice.view',
  budgets: 'budgets.view',
  finance: 'finance.view',
  subcontractors: 'subcontractor.view',
  materials: 'material.view',
  equipment: 'equipment.view',
  logs: 'log.view',
  acceptance: 'acceptance.view',
  defects: 'defect.view',
  change_requests: 'change_request.view',
  additional_costs: 'additional_cost.view',
  comments: 'project.comment.view',
  risks: 'project.risk.view',
  personnel: 'personnel.view',
  attendance: 'attendance.view',
  labor: 'labor_productivity.view',
  warranty: 'warranty.view',
  maintenances: 'warranty.view',
  documents: 'document.view',
}

const isTabPermitted = (tabKey) => {
  if (!tabPermissions[tabKey]) return true
  return can(tabPermissions[tabKey])
}

// ============ HELPERS ============
const fmt = (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) : '0 ₫'
const fmtDate = (d) => d ? dayjs.utc(d).local().format('DD/MM/YYYY') : '—'
const fmtDateTime = (d) => d ? dayjs.utc(d).local().format('DD/MM/YYYY HH:mm') : '—'
const isAccepted = (task) => {
  if (!task) return false
  if (!task.parent_id) {
    // Category A (Parent): Check if any linked stage is approved
    const stages = task.acceptance_stages || []
    if (stages.length === 0) return true // Align with backend: default true if no stages defined
    return stages.some(s => s.status === 'customer_approved')
  } else {
    // Category B (Child): Check linked acceptance item workflow
    if (!task.acceptance_item) return true // Align with backend: default true if no item defined
    return task.acceptance_item.workflow_status === 'customer_approved'
  }
}
const totalCosts = computed(() => costs.value.reduce((s, c) => s + Number(c.amount || 0), 0))

// ============ OVERVIEW COMPUTED ============
const totalAdditionalCosts = computed(() => (props.project.additional_costs || []).reduce((s, c) => s + Number(c.amount || 0), 0))
const totalSubPayments = computed(() => {
  const subs = props.project.subcontractors || []
  return subs.reduce((sum, s) => sum + (s.payments || []).filter(p => p.status === 'paid').reduce((ps, p) => ps + Number(p.amount || 0), 0), 0)
})
const contractValue = computed(() => Number(props.project.contract?.contract_value || 0))
const profitMargin = computed(() => {
  if (contractValue.value <= 0) return 0
  return ((contractValue.value - totalCosts.value) / contractValue.value) * 100
})
const budgetUsage = computed(() => {
  if (contractValue.value <= 0) return 0
  return (totalCosts.value / contractValue.value) * 100
})
const timelineProgress = computed(() => {
  if (!props.project.start_date || !props.project.end_date) return 0
  const start = dayjs(props.project.start_date)
  const end = dayjs(props.project.end_date)
  const total = end.diff(start, 'day') || 1
  const elapsed = dayjs().diff(start, 'day')
  return Math.round((elapsed / total) * 100)
})
const daysRemaining = computed(() => {
  if (!props.project.end_date) return 0
  const diff = dayjs(props.project.end_date).diff(dayjs(), 'day')
  return Math.max(0, diff)
})

// ============ STATE ============
// Read initial tab from URL query string (?tab=costs, ?tab=materials, etc.)
const getSubTabCount = (tabKey) => {
  const c = props.counts || {}
  const map = {
    gantt: c.tasks, progress: c.tasks,
    contract: 1, costs: c.costs, payments: c.payments, additional_costs: c.additional_costs, budgets: c.budgets, finance: 1, invoices: c.invoices,
    subcontractors: c.subcontractors, materials: c.material_bills || c.materials, equipment: c.equipment,
    logs: c.construction_logs, acceptance: c.acceptance_stages, defects: c.defects, change_requests: c.change_requests, comments: c.comments, risks: c.risks,
    personnel: c.personnel, attendance: c.attendance, labor: c.labor_productivity,
    warranty: c.warranties, maintenances: c.maintenances,
    documents: c.attachments,
  }
  return map[tabKey] || 0
}

const getInitialTab = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const tabParam = urlParams.get('tab')
  const validTabs = [
    'overview', 'gantt', 'progress',
    'contract', 'costs', 'payments', 'additional_costs', 'budgets', 'finance', 'invoices',
    'subcontractors', 'materials', 'equipment',
    'logs', 'acceptance', 'defects', 'change_requests', 'comments', 'risks',
    'personnel', 'attendance', 'labor',
    'warranty', 'maintenances',
    'documents',
  ]
  const target = (tabParam && validTabs.includes(tabParam)) ? tabParam : null
  
  if (target && isTabPermitted(target)) return target
  
  // Smart landing: find first group with data
  const groups = [
    { key: 'schedule', tabs: ['gantt', 'progress'] },
    { key: 'finance', tabs: ['contract', 'costs', 'payments'] },
    { key: 'expense', tabs: ['subcontractors', 'materials', 'equipment'] },
    { key: 'monitor', tabs: ['logs', 'acceptance', 'defects', 'change_requests'] },
    { key: 'hr', tabs: ['personnel', 'attendance'] },
    { key: 'warranty', tabs: ['warranty', 'maintenances'] },
    { key: 'other', tabs: ['documents'] },
  ]

  // 1st pass: find tab with permission AND data
  for (const g of groups) {
    const bestTab = g.tabs.find(t => isTabPermitted(t) && getSubTabCount(t) > 0)
    if (bestTab) return bestTab
  }

  // 2nd pass: just permission
  for (const g of groups) {
    const firstVis = g.tabs.find(t => isTabPermitted(t))
    if (firstVis) return firstVis
  }

  return 'overview'
}

const getGroupForTab = (tab) => {
  const groupMap = {
    overview: 'overview',
    gantt: 'schedule', progress: 'schedule',
    contract: 'finance', costs: 'finance', payments: 'finance', additional_costs: 'finance', budgets: 'finance', finance: 'finance', invoices: 'finance',
    subcontractors: 'expense', materials: 'expense', equipment: 'expense',
    logs: 'monitor', acceptance: 'monitor', defects: 'monitor', change_requests: 'monitor', comments: 'monitor', risks: 'monitor',
    personnel: 'hr', attendance: 'hr', labor: 'hr',
    warranty: 'warranty', maintenances: 'warranty',
    documents: 'other',
  }
  return groupMap[tab] || 'schedule'
}

const initialTab = getInitialTab()
const activeTab = ref(initialTab)
const activeTabGroup = ref(getGroupForTab(initialTab))
const costStatusFilter = ref('all')
const costGroupFilter = ref(null)
const commentText = ref('')
const openDefects = computed(() => defects.value.filter(d => d.status === 'open' || d.status === 'in_progress').length)
const activeRisks = computed(() => risks.value.filter(r => r.status !== 'closed').length)
const allFilterGroups = computed(() => {
  const systemGroups = page.props.system_cost_categories || []
  const dbGroups = props.costGroups || []
  const filteredDbGroups = dbGroups.filter(dg => !systemGroups.some(sg => sg.name === dg.name))
  return [...systemGroups, ...filteredDbGroups]
})

// Drawer Detail Refs
const showCostDetail = ref(false)
const costDetailRecord = ref(null)
const showPaymentDetail = ref(false)
const paymentDetailRecord = ref(null)
const showSubDetailDrawer = ref(false)
const subDetail = ref(null)
const showMaterialDetailDrawer = ref(false)
const materialDetail = ref(null)
const showEquipmentDetailDrawer = ref(false)
const equipmentDetail = ref(null)
const showAdditionalCostDetailDrawer = ref(false)
const additionalCostDetail = ref(null)
const showInvoiceDetailDrawer = ref(false)
const invoiceDetail = ref(null)
const showDefectDetailDrawer = ref(false)
const defectDetail = ref(null)
const showChangeRequestDetailDrawer = ref(false)
const changeRequestDetail = ref(null)
const showRiskDetailDrawer = ref(false)
const riskDetail = ref(null)

// ============ SYNC DRAWERS WITH PROPS ============
watch(() => props, (newProps) => {
  if (showCostDetail.value && costDetailRecord.value) {
    const updated = newProps.project?.costs?.find(x => x.id === costDetailRecord.value.id)
    if (updated) costDetailRecord.value = updated; else showCostDetail.value = false;
  }
  if (showPaymentDetail.value && paymentDetailRecord.value) {
    const updated = newProps.project?.payments?.find(x => x.id === paymentDetailRecord.value.id)
    if (updated) paymentDetailRecord.value = updated; else showPaymentDetail.value = false;
  }
  if (showSubDetailDrawer.value && subDetail.value) {
    const updated = newProps.project?.subcontractors?.find(x => x.id === subDetail.value.id)
    if (updated) subDetail.value = updated; else showSubDetailDrawer.value = false;
  }
  if (showMaterialDetailDrawer.value && materialDetail.value) {
    const updated = newProps.materialBills?.find(x => x.id === materialDetail.value.id)
    if (updated) materialDetail.value = updated; else showMaterialDetailDrawer.value = false;
  }
  if (showEquipmentDetailDrawer.value && equipmentDetail.value) {
    const updated = newProps.projectEquipment?.find(x => x.id === equipmentDetail.value.id)
    if (updated) equipmentDetail.value = updated; else showEquipmentDetailDrawer.value = false;
  }
  if (showAdditionalCostDetailDrawer.value && additionalCostDetail.value) {
    const updated = newProps.project?.additional_costs?.find(x => x.id === additionalCostDetail.value.id)
    if (updated) additionalCostDetail.value = updated; else showAdditionalCostDetailDrawer.value = false;
  }
  if (showInvoiceDetailDrawer.value && invoiceDetail.value) {
    const updated = newProps.project?.invoices?.find(x => x.id === invoiceDetail.value.id)
    if (updated) invoiceDetail.value = updated; else showInvoiceDetailDrawer.value = false;
  }
  if (showDefectDetailDrawer.value && defectDetail.value) {
    const updated = newProps.project?.defects?.find(x => x.id === defectDetail.value.id)
    if (updated) defectDetail.value = updated; else showDefectDetailDrawer.value = false;
  }
  if (showChangeRequestDetailDrawer.value && changeRequestDetail.value) {
    const updated = newProps.project?.change_requests?.find(x => x.id === changeRequestDetail.value.id)
    if (updated) changeRequestDetail.value = updated; else showChangeRequestDetailDrawer.value = false;
  }
  if (showRiskDetailDrawer.value && riskDetail.value) {
    const updated = newProps.project?.risks?.find(x => x.id === riskDetail.value.id)
    if (updated) riskDetail.value = updated; else showRiskDetailDrawer.value = false;
  }
  if (showLogDetailDrawer.value && logDetailRecord.value) {
    const logs = newProps.project?.construction_logs || newProps.project?.constructionLogs || []
    const updated = logs.find(x => x.id === logDetailRecord.value.id)
    if (updated) logDetailRecord.value = updated; else showLogDetailDrawer.value = false;
  }
  if (showContractDetail.value && contractDetailRecord.value) {
    const updated = newProps.project?.contract
    if (updated) contractDetailRecord.value = updated; else showContractDetail.value = false;
  }
}, { deep: true })

// ============ UNIVERSAL LOADING SYSTEM ============
// pageLoading shows the top loading bar during page transitions
const pageLoading = ref(false)
let removeStartListener = null
let removeFinishListener = null

onMounted(() => {
  removeStartListener = router.on('start', () => { pageLoading.value = true })
  removeFinishListener = router.on('finish', () => { pageLoading.value = false })

  // Auto-load data based on initial tab
  if (activeTab.value === 'gantt' || activeTab.value === 'progress') {
    loadGanttData()
  }
  
  // Pre-fill ganttTasks from allTasks immediately to avoid "empty" state flicker
  if (allTasks.value.length > 0 && ganttTasks.value.length === 0) {
    ganttTasks.value = allTasks.value.map(t => ({
      ...t,
      progress: parseFloat(t.progress_percentage || 0),
      start_date: t.start_date || props.project?.start_date,
      end_date: t.end_date || props.project?.end_date,
      is_critical: false // fallback
    }))
  }
})
onBeforeUnmount(() => {
  removeStartListener?.()
  removeFinishListener?.()
})

// actionLoading tracks per-item loading (e.g., actionLoading['delete-cost-123'])
const actionLoading = reactive({})
// savingForm tracks modal form submissions
const savingForm = ref(false)

/**
 * Universal loading wrapper for Inertia router calls.
 * Usage: withLoading('approve-cost-5', () => router.post(url, data, options))
 * - Sets actionLoading[key] = true on start
 * - Sets actionLoading[key] = false on finish (success or error)
 * - Merges with existing onSuccess/onFinish/onError callbacks
 */
const withLoading = (key, routerCall) => {
  actionLoading[key] = true
  routerCall()
  setTimeout(() => { actionLoading[key] = false }, 8000)
}

// ============ FORM VALIDATION SYSTEM ============
// Stores server-side validation errors from Inertia responses
const formErrors = reactive({})

/**
 * Returns Ant Design form-item props for field validation display.
 * Backend now returns Vietnamese messages, so we show them directly.
 * Usage: <a-form-item v-bind="fieldStatus('name')">
 */
const fieldStatus = (field) => {
  const err = formErrors[field]
  if (!err) return {}
  return { validateStatus: 'error', help: Array.isArray(err) ? err[0] : err }
}

/** Clears all form errors. Called when opening modals. */
const clearFormErrors = () => {
  Object.keys(formErrors).forEach(k => delete formErrors[k])
}

/**
 * Shows a single consolidated error notification for validation failures.
 * Groups all field errors into one organized notification instead of
 * spamming multiple toast messages.
 */
const showValidationErrors = (errors) => {
  const entries = Object.entries(errors)
  const errorList = entries.map(([, msg]) => {
    const text = Array.isArray(msg) ? msg[0] : msg
    return text
  })

  if (errorList.length === 1) {
    // Single error → show as clean message
    message.warning(errorList[0], 4)
  } else {
    // Multiple errors → show consolidated notification
    notification.warning({
      message: `Vui lòng kiểm tra ${errorList.length} trường`,
      description: errorList.map(e => `• ${e}`).join('\n'),
      duration: 6,
      placement: 'topRight',
      style: { whiteSpace: 'pre-line' },
    })
  }
}

/**
 * Wraps a router call with proper onStart/onFinish loading callbacks.
 * For router.post/put/delete with options objects.
 */
const loadingOptions = (key, extraOptions = {}) => ({
  ...extraOptions,
  onStart: () => { actionLoading[key] = true; extraOptions.onStart?.() },
  onFinish: () => { actionLoading[key] = false; extraOptions.onFinish?.() },
  onSuccess: (...args) => { actionLoading[key] = false; clearFormErrors(); extraOptions.onSuccess?.(...args) },
  onError: (errors) => {
    actionLoading[key] = false
    Object.assign(formErrors, errors)
    showValidationErrors(errors)
    extraOptions.onError?.(errors)
  },
})

/**
 * Helper for modal form saves with loading state.
 * Shows validation errors inline on form fields + one consolidated notification.
 */
const savingOptions = (extraOptions = {}) => ({
  ...extraOptions,
  onStart: () => { savingForm.value = true; clearFormErrors(); extraOptions.onStart?.() },
  onFinish: () => { savingForm.value = false; extraOptions.onFinish?.() },
  onSuccess: (...args) => { savingForm.value = false; clearFormErrors(); extraOptions.onSuccess?.(...args) },
  onError: (errors) => {
    savingForm.value = false
    Object.assign(formErrors, errors)
    showValidationErrors(errors)
    extraOptions.onError?.(errors)
  },
})

// Helper to check loading state
const isLoading = (key) => !!actionLoading[key]

// Helpers below used by tabGroups computed logic previously defined

// Tab groups with dynamic badge counts and permission filtering
const tabGroups = computed(() => {
  const groups = [
    { key: 'schedule', icon: '📅', label: 'Kế hoạch', defaultTab: 'gantt', badge: props.counts?.tasks || 0, perms: ['gantt.view', 'project.task.view'] },
    { key: 'finance', icon: '💰', label: 'Tài chính', defaultTab: 'contract', badge: (props.counts?.costs || 0) + (props.counts?.payments || 0) + (props.counts?.budgets || 0), perms: ['contract.view', 'payment.view', 'invoice.view', 'cost.view', 'budgets.view', 'finance.view'] },
    { key: 'expense', icon: '🏗️', label: 'Chi phí', defaultTab: 'subcontractors', badge: (props.counts?.subcontractors || 0) + (props.counts?.material_bills || 0) + (props.counts?.equipment || 0), perms: ['subcontractor.view', 'material.view', 'equipment.view'] },
    { key: 'monitor', icon: '📋', label: 'Giám sát', defaultTab: 'logs', badge: (props.counts?.construction_logs || 0) + (props.counts?.acceptance_stages || 0) + (props.counts?.defects || 0) + (props.counts?.additional_costs || 0) + (props.counts?.change_requests || 0), perms: ['log.view', 'acceptance.view', 'defect.view', 'change_request.view', 'additional_cost.view', 'project.comment.view', 'project.risk.view'] },
    { key: 'hr', icon: '👥', label: 'Nhân sự', defaultTab: 'personnel', badge: props.counts?.personnel || 0, perms: ['personnel.view', 'attendance.view', 'labor_productivity.view'] },
    { key: 'warranty', icon: '🛡️', label: 'Bảo hành', defaultTab: 'warranty', badge: (props.counts?.warranties || 0) + (props.counts?.maintenances || 0), perms: ['warranty.view'] },
    { key: 'other', icon: '📁', label: 'Khác', defaultTab: 'documents', badge: props.counts?.attachments || 0, perms: ['document.view'] },
  ]
  return groups
    .map(g => {
      const visibleSubTabs = (tabGroupTabs[g.key] || []).filter(t => isTabPermitted(t))
      if (visibleSubTabs.length === 0) return null
      
      // Preference logic: 
      // 1. If original default is permitted AND has data -> use it
      // 2. Else find first visible tab with data
      // 3. Fallback to first visible tab
      let effectiveDefault = g.defaultTab
      if (!isTabPermitted(effectiveDefault) || getSubTabCount(effectiveDefault) === 0) {
        const withData = visibleSubTabs.find(t => getSubTabCount(t) > 0)
        effectiveDefault = withData || visibleSubTabs[0]
      }
      
      return { ...g, defaultTab: effectiveDefault }
    })
    .filter(Boolean)
})

const isTabVisible = (tabKey) => {
  if (!isTabPermitted(tabKey)) return false
  const tabs = tabGroupTabs[activeTabGroup.value]
  return tabs ? tabs.includes(tabKey) : false
}

// Map activeTab to correct group (for when tab clicked directly)
watch(activeTab, (tab) => {
  activeTabGroup.value = getGroupForTab(tab)
})

const filteredCosts = computed(() => {
  // Temporarily showing all for debugging
  let c = costs.value // .filter(item => !item.material_bill_id && !item.subcontractor_payment_id && !item.equipment_rental_id && !item.equipment_allocation_id)

  // Status filter
  if (costStatusFilter.value === 'pending') {
    c = c.filter(c => ['pending_management_approval', 'pending_accountant_approval'].includes(c.status))
  } else if (costStatusFilter.value !== 'all') {
    c = c.filter(item => item.status === costStatusFilter.value)
  }

  // Group filter
  const gf = costGroupFilter.value
  if (gf && gf !== 'all') {
    if (gf === '_labor') {
      c = c.filter(item => item.attendance_id != null || item.category === 'labor')
    } else if (gf === '_vatlieu') {
      c = c.filter(item => item.category === 'construction_materials')
    } else if (gf === '_thietbi') {
      c = c.filter(item => item.category === 'equipment')
    } else if (gf === '_ntp') {
      c = c.filter(item => item.subcontractor_id != null)
    } else if (gf === '_other') {
      c = c.filter(item => !['construction_materials', 'equipment', 'labor'].includes(item.category) && !item.subcontractor_id && !item.attendance_id)
    } else {
      // Filter by cost_group_id
      c = c.filter(item => item.cost_group_id === gf)
    }
  }

  return c
})

// ============ GANTT/CPM STATE (Sprint 1) ============
const ganttView = ref('chart')
const ganttLoading = ref(false)
const cpmLoading = ref(false)
const ganttTasks = ref([])
const cpmData = ref({})
const delayWarnings = ref([])
const progressComparisonData = ref([])
const scheduleAdjustments = ref([])
const showImportWbs = ref(false)
const wbsImporting = ref(false)
const wbsTemplates = ref([])
const wbsPreview = ref(null)
const wbsImportForm = ref({ template_id: null, start_date: null })

const adjustmentCols = [
  { title: 'Công việc', key: 'task', dataIndex: 'task' },
  { title: 'Lý do', key: 'reason', dataIndex: 'reason' },
  { title: 'Đề xuất', key: 'proposed' },
  { title: 'Trạng thái', key: 'status', dataIndex: 'status', width: 100 },
  { title: '', key: 'actions', width: 90 },
]

const apiBase = '/api'
const apiGet = async (url) => {
  const res = await fetch(apiBase + url, {
    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin',
  })
  return res.json()
}
const apiPost = async (url, body = {}) => {
  const token = document.querySelector('meta[name="csrf-token"]')?.content
  const res = await fetch(apiBase + url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': token, 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  return res.json()
}

const loadGanttData = async () => {
  if (ganttLoading.value) return
  ganttLoading.value = true
  try {
    const data = await apiGet(`/projects/${props.project.id}/gantt`)
    const backendTasks = data.data?.tasks || []
    
    if (backendTasks.length > 0) {
      ganttTasks.value = backendTasks
    } else if (allTasks.value.length > 0) {
      // Fallback to allTasks if API returns nothing but we have tasks in props
      ganttTasks.value = allTasks.value.map(t => ({
        ...t,
        progress: parseFloat(t.progress_percentage || 0),
        start_date: t.start_date || props.project?.start_date,
        end_date: t.end_date || props.project?.end_date,
        is_critical: false
      }))
    }
  } catch (e) { 
    console.error('Gantt load error', e)
    // Emergency fallback to props data on network error
    if (allTasks.value.length > 0 && ganttTasks.value.length === 0) {
      ganttTasks.value = allTasks.value.map(t => ({
        ...t,
        progress: parseFloat(t.progress_percentage || 0),
        start_date: t.start_date || props.project?.start_date,
        end_date: t.end_date || props.project?.end_date
      }))
    }
  }
  ganttLoading.value = false
}

const loadCPMData = async () => {
  cpmLoading.value = true
  try {
    const data = await apiGet(`/projects/${props.project.id}/gantt/cpm`)
    cpmData.value = data.data || {}
  } catch (e) { console.error('CPM error', e) }
  cpmLoading.value = false
}

const loadDelayWarnings = async () => {
  try {
    const data = await apiGet(`/projects/${props.project.id}/gantt/delay-warnings`)
    delayWarnings.value = data.data?.warnings || []
  } catch (e) { console.error('Warnings error', e) }
}

const loadProgressComparison = async () => {
  try {
    const data = await apiGet(`/projects/${props.project.id}/gantt/progress-comparison`)
    progressComparisonData.value = data.data?.comparison || []
  } catch (e) { console.error('Comparison error', e) }
}

const loadScheduleAdjustments = async () => {
  try {
    const data = await apiGet(`/projects/${props.project.id}/schedule-adjustments`)
    scheduleAdjustments.value = data.data?.data || []
  } catch (e) { console.error('Adjustments error', e) }
}

const approveAdjustment = async (id) => {
  try {
    await apiPost(`/projects/${props.project.id}/schedule-adjustments/${id}/approve`)
    loadScheduleAdjustments()
    loadGanttData()
  } catch (e) { console.error('Approve error', e) }
}

const rejectAdjustment = async (id) => {
  try {
    await apiPost(`/projects/${props.project.id}/schedule-adjustments/${id}/reject`)
    loadScheduleAdjustments()
  } catch (e) { console.error('Reject error', e) }
}

// WBS Import
const loadWbsTemplates = async () => {
  try {
    const data = await apiGet('/wbs-templates')
    wbsTemplates.value = data.data || []
  } catch (e) { console.error('WBS templates error', e) }
}

const loadWbsTemplatePreview = async (templateId) => {
  if (!templateId) { wbsPreview.value = null; return }
  try {
    const data = await apiGet(`/wbs-templates/${templateId}`)
    wbsPreview.value = data.data || null
  } catch (e) { console.error('WBS preview error', e) }
}

const importWbsTemplate = async () => {
  if (!wbsImportForm.value.template_id || !wbsImportForm.value.start_date) return
  wbsImporting.value = true
  try {
    await apiPost(`/projects/${props.project.id}/tasks/import-template`, wbsImportForm.value)
    showImportWbs.value = false
    wbsImportForm.value = { template_id: null, start_date: null }
    wbsPreview.value = null
    loadGanttData()
    router.reload({ preserveScroll: true })
  } catch (e) { console.error('Import error', e) }
  wbsImporting.value = false
}

// Auto-load gantt data when switching to gantt tab
// Auto-load data when switching tabs (SOA Lazy Loading)
watch(activeTab, (val) => {
  // 1. Logic for specific data loading functions
  if (val === 'gantt') {
    loadGanttData()
    loadWbsTemplates()
    loadDelayWarnings()
  }
  if (val === 'attendance') loadAttendanceData()
  if (val === 'labor') { loadLaborDashboard(); loadLaborRecords() }
  if (val === 'finance') loadFinanceData()

  // 2. Logic for SOA Partial Reloads (Inertia::lazy)
  if (['costs', 'payments', 'invoices', 'budgets', 'finance', 'pnl'].includes(val)) {
    router.reload({ only: ['financeData'], preserveState: true, preserveScroll: true })
  } else if (['gantt', 'progress', 'materials', 'material_bills'].includes(val)) {
    router.reload({ only: ['scheduleData'], preserveState: true, preserveScroll: true })
  } else if (['logs', 'acceptance', 'defects', 'change_requests', 'additional_costs'].includes(val)) {
    router.reload({ only: ['monitorData'], preserveState: true, preserveScroll: true })
  } else if (['personnel', 'subcontractors'].includes(val)) {
    router.reload({ only: ['teamData'], preserveState: true, preserveScroll: true })
  } else if (['equipment', 'equipment_rentals', 'equipment_purchases', 'asset_usages'].includes(val)) {
    router.reload({ only: ['equipmentData'], preserveState: true, preserveScroll: true })
  } else if (['other', 'documents', 'discussion', 'risks', 'warranty', 'maintenances', 'contract', 'comments'].includes(val)) {
    router.reload({ only: ['otherData'], preserveState: true, preserveScroll: true })
  }
}, { immediate: true })

// ============ Sprint 2 — Finance Dashboard State ============
const financeView = ref('cashflow')
const financeLoading = ref(false)
const cashFlowData = ref({})
const pnlData = ref({})
const bvaData = ref({})
const debtData = ref({})
const warrantyData = ref({})

const costCatLabels = {
  material: 'Vật tư xây dựng',
  labor: 'Nhân công',
  equipment: 'Thiết bị',
  subcontractor: 'Nhà thầu phụ',
  transportation: 'Vận chuyển',
  other: 'Chi phí khác',
}

const loadFinanceData = async () => {
  financeLoading.value = true
  try {
    const [cf, pl, bva, debt, warranty] = await Promise.all([
      apiGet(`/projects/${props.project.id}/cash-flow`),
      apiGet(`/projects/${props.project.id}/profit-loss`),
      apiGet(`/projects/${props.project.id}/budget-vs-actual`),
      apiGet(`/projects/${props.project.id}/subcontractor-debt`),
      apiGet(`/projects/${props.project.id}/warranty-retentions`),
    ])
    cashFlowData.value = cf.data || {}
    pnlData.value = pl.data || {}
    bvaData.value = bva.data || {}
    debtData.value = debt.data || {}
    warrantyData.value = warranty.data || {}
  } catch (e) { console.error('Finance load error', e) }
  financeLoading.value = false
}

// Status maps
const statusLabels = { planning: 'Lập kế hoạch', in_progress: 'Đang thi công', completed: 'Hoàn thành', cancelled: 'Đã hủy' }
const statusColors = { planning: 'blue', in_progress: 'processing', completed: 'green', cancelled: 'default' }
const costStatusLabels = { draft: 'Nháp', pending: 'Chờ duyệt', pending_management_approval: 'Chờ BĐH duyệt', pending_accountant_approval: 'Chờ KT xác nhận', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã hủy' }
const costStatusColors = { draft: 'default', pending: 'orange', pending_management_approval: 'orange', pending_accountant_approval: 'blue', approved: 'green', rejected: 'red', cancelled: 'default' }
const severityColors = { low: 'green', medium: 'orange', major: 'red', critical: 'volcano', high: 'red' }
const severityLabels = { low: 'Thấp', medium: 'Trung bình', major: 'Nghiêm trọng', critical: 'Rất nghiêm trọng', high: 'Cao' }
const subProgressLabels = { not_started: 'Chưa bắt đầu', in_progress: 'Đang thi công', completed: 'Hoàn thành', delayed: 'Chậm tiến độ' }
const subProgressColors = { not_started: 'default', in_progress: 'processing', completed: 'green', delayed: 'red' }
const subPayStatusLabels = { draft: 'Nháp', pending_management_approval: 'Chờ BĐH duyệt', pending_accountant_confirmation: 'Chờ KT xác nhận', paid: 'Đã thanh toán', rejected: 'Từ chối', cancelled: 'Đã hủy' }
const subPayStatusColors = { draft: 'default', pending_management_approval: 'orange', pending_accountant_confirmation: 'blue', paid: 'green', rejected: 'red', cancelled: 'default' }
const subPayMethodLabels = { bank_transfer: 'Chuyển khoản', cash: 'Tiền mặt', check: 'Séc', other: 'Khác' }
const acStatusLabels = { draft: 'Nháp', pending: 'Chờ duyệt', pending_approval: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã hủy' }
const acStatusColors = { draft: 'default', pending: 'orange', pending_approval: 'orange', approved: 'green', rejected: 'red', cancelled: 'default' }
const contractStatusLabels = { draft: 'Nháp', pending_customer_approval: 'Chờ KH duyệt', pending_management_approval: 'Chờ BĐH duyệt', pending_accountant_approval: 'Chờ KT xác nhận', active: 'Đang hiệu lực', approved: 'Đã duyệt', rejected: 'Từ chối', expired: 'Hết hạn', terminated: 'Đã thanh lý', cancelled: 'Đã hủy' }
const contractStatusColors = { draft: 'default', pending_customer_approval: 'orange', pending_management_approval: 'orange', pending_accountant_approval: 'blue', active: 'green', approved: 'green', rejected: 'red', expired: 'orange', terminated: 'red', cancelled: 'default' }
const paymentStatusLabelsMap = { pending: 'Chờ gửi y/c', customer_paid: 'Đã thanh toán', customer_pending_approval: 'Chờ KH duyệt', customer_approved: 'Đã duyệt (Chờ TT)', confirmed: 'Đã xác nhận', paid: 'Đã xác nhận', partial: 'TT 1 phần', completed: 'Hoàn tất', overdue: 'Quá hạn' }
const paymentTagColors = { pending: 'default', customer_paid: 'blue', customer_pending_approval: 'cyan', customer_approved: 'geekblue', confirmed: 'green', paid: 'green', partial: 'blue', completed: 'green', overdue: 'red' }
const defectStatusLabels = { open: 'Mới', in_progress: 'Đang sửa lỗi', rejected: 'Chưa đạt', fixed: 'Đã sửa', verified: 'Đã xác nhận', closed: 'Đã đóng' }
const defectStatusColors = { open: 'red', in_progress: 'processing', rejected: 'red', fixed: 'green', verified: 'cyan', closed: 'default' }
const crStatusLabels = { draft: 'Nháp', pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', implemented: 'Đã triển khai', cancelled: 'Đã hủy' }
const crStatusColors = { draft: 'default', pending: 'orange', approved: 'green', rejected: 'red', implemented: 'cyan', cancelled: 'default' }
const crTypeLabels = { scope: 'Phạm vi', schedule: 'Tiến độ', cost: 'Chi phí', quality: 'Chất lượng', resource: 'Nguồn lực', other: 'Khác' }
const priorityLabels = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', urgent: 'Khẩn cấp' }
const priorityColors = { low: 'default', medium: 'blue', high: 'orange', urgent: 'red' }
const budgetStatusLabels = { draft: 'Nháp', approved: 'Đã duyệt', archived: 'Lưu trữ' }
const budgetStatusColors = { draft: 'default', approved: 'green', archived: 'blue' }
const riskStatusLabels = { identified: 'Đã nhận diện', analyzed: 'Đã phân tích', mitigated: 'Đã giảm thiểu', monitored: 'Đang giám sát', closed: 'Đã đóng' }
const riskStatusColors = { identified: 'orange', analyzed: 'blue', mitigated: 'cyan', monitored: 'processing', closed: 'green' }
const riskCategoryLabels = { schedule: 'Tiến độ', cost: 'Chi phí', quality: 'Chất lượng', scope: 'Phạm vi', resource: 'Nguồn lực', technical: 'Kỹ thuật', external: 'Bên ngoài', other: 'Khác' }
const riskLevelLabels = { very_low: 'Rất thấp', low: 'Thấp', medium: 'TB', high: 'Cao', very_high: 'Rất cao' }
const riskLevelColors = { very_low: 'default', low: 'green', medium: 'blue', high: 'orange', very_high: 'red' }
const acceptStatusLabels = {
  pending: 'Chờ duyệt',
  supervisor_approved: 'GS đã duyệt',
  project_manager_approved: 'QLDA đã duyệt',
  customer_approved: 'KH đã duyệt',
  owner_approved: 'CĐT đã duyệt',
  design_approved: 'TK đã duyệt',
  internal_approved: 'Nội bộ đã duyệt',
  rejected: 'Từ chối',
}

// ============ TABLE COLUMNS ============
const costCols = [
  { title: 'Tên', key: 'name', ellipsis: true },
  { title: 'Nhóm', dataIndex: ['cost_group', 'name'], width: 130 },
  { title: 'Trạng thái', key: 'status', width: 130 },
  { title: 'Số tiền', key: 'amount', align: 'right', width: 130 },
  { title: 'Người tạo', key: 'creator', width: 130 },
  { title: 'Người duyệt', key: 'approver', width: 160 },
  { title: 'Ngày', key: 'date', width: 100 },
]

const paymentCols = [
  { title: 'Đợt TT', key: 'payment_number', width: 80, align: 'center' },
  { title: 'Diễn giải / Ghi chú', dataIndex: 'notes', ellipsis: true },
  { title: 'Trạng thái', key: 'status', width: 140 },
  { title: 'Phải thu', key: 'amount', align: 'right', width: 130 },
  { title: 'Thực thu', key: 'actual_amount', align: 'right', width: 130 },
  { title: 'Hạn TT', key: 'date', width: 100 },
]

const personnelCols = [
  { title: 'Nhân sự', key: 'name' },
  { title: 'Vai trò', key: 'role', width: 160 },
  { title: '', key: 'actions', width: 80, align: 'center' },
]

const logCols = [
  { title: 'Ngày', key: 'date', width: 110 },
  { title: 'Công việc', key: 'task', ellipsis: true },
  { title: 'Thời tiết', key: 'weather', width: 90 },
  { title: 'Nhân công', key: 'personnel', width: 90, align: 'center' },
  { title: 'Tiến độ', key: 'progress', width: 140 },
  { title: 'Ghi chú', key: 'notes', ellipsis: true },
  { title: 'Người tạo', key: 'creator', width: 120 },
  { title: '', key: 'actions', width: 100, align: 'center' },
]

// Grouped version: without date column (date is shown as section header)
const logColsGrouped = [
  { title: 'Công việc', key: 'task', ellipsis: true },
  { title: 'Thời tiết', key: 'weather', width: 90 },
  { title: 'Nhân công', key: 'personnel', width: 90, align: 'center' },
  { title: 'Tiến độ', key: 'progress', width: 140 },
  { title: 'Ghi chú', key: 'notes', ellipsis: true },
  { title: 'Người tạo', key: 'creator', width: 120 },
  { title: '', key: 'actions', width: 100, align: 'center' },
]

const groupedLogs = computed(() => {
  const logsArr = project.value.construction_logs || []
  if (!logsArr.length) return []

  // Group by log_date
  const groups = {}
  logsArr.forEach(log => {
    const dateKey = log.log_date || 'unknown'
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(log)
  })

  // Sort dates descending, map to array
  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map(date => {
      const dayLogs = groups[date]
      const weathers = [...new Set(dayLogs.map(l => l.weather).filter(Boolean))]
      return {
        date,
        logs: dayLogs,
        weatherSummary: weathers.length ? weathers.join(', ') : '',
      }
    })
})

const defectCols = [
  { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
  { title: 'Mức độ', key: 'severity', width: 100 },
  { title: 'Trạng thái', key: 'status', width: 110 },
  { title: 'Tiếp theo', key: 'next_action', width: 160 },
]

const crCols = [
  { title: 'Tiêu đề', dataIndex: 'title', ellipsis: true },
  { title: 'Loại', key: 'change_type', width: 100 },
  { title: 'Ưu tiên', key: 'priority', width: 100 },
  { title: 'CP ảnh hưởng', key: 'cost', align: 'right', width: 140 },
  { title: 'TĐ (ngày)', key: 'schedule', align: 'center', width: 90 },
  { title: 'Trạng thái', key: 'status', width: 130 },
]

const riskCols = [
  { title: 'Tiêu đề', dataIndex: 'title', ellipsis: true },
  { title: 'Danh mục', key: 'category', width: 100 },
  { title: 'Xác suất', key: 'probability', width: 90 },
  { title: 'Ảnh hưởng', key: 'impact', width: 90 },
  { title: 'Trạng thái', key: 'status', width: 130 },
  { title: 'Người xử lý', key: 'owner', width: 120 },
]

const subCols = [
  { title: 'Tên NTP', key: 'name', ellipsis: true },
  { title: 'Danh mục', dataIndex: 'category', width: 120 },
  { title: 'Báo giá', key: 'quote', align: 'right', width: 140 },
  { title: 'Đã TT', key: 'paid', align: 'right', width: 130 },
  { title: '% TT', key: 'paidPercent', width: 110 },
  { title: 'Tiến độ', key: 'progress', width: 120 },
  { title: 'Thời gian', key: 'dates', width: 120 },
]

const acCols = [
  { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
  { title: 'Trạng thái', key: 'status', width: 140 },
  { title: 'Số tiền', key: 'amount', align: 'right', width: 140 },
  { title: 'Người đề xuất', key: 'proposer', width: 150 },
]

const budgetCols = [
  { title: 'Tên', dataIndex: 'name', ellipsis: true },
  { title: 'Tổng NS', key: 'total', align: 'right', width: 150 },
  { title: 'Trạng thái', key: 'status', width: 120 },
  { title: 'Người tạo', key: 'creator', width: 120 },
  { title: 'Ngày', key: 'date', width: 110 },
  { title: '', key: 'actions', width: 100, align: 'center' },
]

const invoiceCols = [
  { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
  { title: 'Giá trước thuế', key: 'subtotal', align: 'right', width: 150 },
  { title: 'Tổng', key: 'total', align: 'right', width: 150 },
  { title: 'Ngày', key: 'date', width: 110 },
]

const docCols = [
  { title: 'Tên file', key: 'name', ellipsis: true },
  { title: 'Mô tả', dataIndex: 'description', ellipsis: true, width: 200 },
  { title: 'Loại', dataIndex: 'type', width: 80 },
  { title: 'Kích thước', key: 'size', width: 100 },
  { title: 'Ngày', key: 'date', width: 110 },
  { title: '', key: 'actions', width: 120, align: 'center' },
]

const formatFileSize = (bytes) => {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}

// ============ EDIT PROJECT ============
const showEditProject = ref(false)
const projectForm = ref({})
const openEditProject = () => {
  const p = props.project
  projectForm.value = { name: p.name, description: p.description || '', customer_id: p.customer_id, project_manager_id: p.project_manager_id, status: p.status, start_date: p.start_date, end_date: p.end_date }
  showEditProject.value = true
}
const saveProject = () => { router.put(`/projects/${props.project.id}`, projectForm.value, savingOptions({ onSuccess: () => showEditProject.value = false })) }

// ============ SHARED MODAL FILES ============
const modalFiles = ref([])
// uploadModalFiles removed - unified into single request logic

// ============ FORM DATA HELPER ============
const appendFormEntries = (formData, formObj, parentKey = null) => {
  Object.entries(formObj).forEach(([k, v]) => {
    if (v === null || v === undefined) return
    const key = parentKey ? `${parentKey}[${k}]` : k
    
    // Check if it's a file or array of files first to NOT recurse into them
    if (v instanceof File || (Array.isArray(v) && v[0] instanceof File)) {
      if (Array.isArray(v)) {
        v.forEach(f => formData.append(`${key}[]`, f))
      } else {
        formData.append(key, v)
      }
      return
    }

    if (Array.isArray(v)) {
      v.forEach((item, index) => {
        // If it's an object in the array (like material bill items), recurse with index
        if (typeof item === 'object' && item !== null) {
          appendFormEntries(formData, item, `${key}[${index}]`)
        } else {
          formData.append(`${key}[]`, item)
        }
      })
    } else if (typeof v === 'object' && v !== null) {
      // Recurse for nested objects
      appendFormEntries(formData, v, key)
    } else {
      formData.append(key, v)
    }
  })
}

// ============ COST CRUD ============
const showCostModal = ref(false)
const editingCost = ref(null)
const costForm = ref({ name: '', amount: null, cost_date: null, cost_group_id: null, budget_item_id: null, subcontractor_id: null, material_id: null, quantity: null, unit: '', description: '', deleted_attachment_ids: [] })
const toggleDeleteAttachment = (form, id) => {
  if (!form.deleted_attachment_ids) form.deleted_attachment_ids = []
  const idx = form.deleted_attachment_ids.indexOf(id)
  if (idx === -1) form.deleted_attachment_ids.push(id)
  else form.deleted_attachment_ids.splice(idx, 1)
}
const isAttachmentDeleted = (form, id) => form.deleted_attachment_ids?.includes(id) || false

const removeSelectedFile = (index) => {
  modalFiles.value.splice(index, 1)
}
const openCostModal = (c) => {
  editingCost.value = c
  modalFiles.value = []
  costForm.value = c ? { 
    name: c.name, 
    amount: c.amount, 
    cost_date: c.cost_date, 
    cost_group_id: c.cost_group_id, 
    budget_item_id: c.budget_item_id || null, 
    subcontractor_id: c.subcontractor_id || null, 
    material_id: c.material_id || null, 
    quantity: c.quantity || null, 
    unit: c.unit || '', 
    description: c.description || '',
    deleted_attachment_ids: []
  } : { name: '', amount: null, cost_date: dayjs().format('YYYY-MM-DD'), cost_group_id: null, budget_item_id: null, subcontractor_id: null, material_id: null, quantity: null, unit: '', description: '', deleted_attachment_ids: [] }
  showCostModal.value = true
}
const saveCost = () => {
  if (!modalFiles.value.length && (!editingCost.value || !editingCost.value.attachments?.length)) {
    return Modal.warning({ title: 'Hành động bị chặn', content: 'Vui lòng đính kèm ít nhất một chứng từ (ảnh phiếu chi, hóa đơn...) để kế toán có thể đối soát.' })
  }
  const url = editingCost.value ? `/projects/${props.project.id}/costs/${editingCost.value.id}` : `/projects/${props.project.id}/costs`
  const data = { ...costForm.value }
  if (editingCost.value) data._method = 'PUT'
  if (modalFiles.value.length) data.files = modalFiles.value

  router.post(url, data, savingOptions({
    forceFormData: true,
    onSuccess: () => {
      showCostModal.value = false
      modalFiles.value = []
    },
  }))
}
const deleteCost = (c) => router.delete(`/projects/${props.project.id}/costs/${c.id}`, loadingOptions(`delete-cost-${c.id}`))

// Gửi duyệt: nếu đã có file → submit, nếu chưa có → mở modal upload
const showSubmitCostModal = ref(false)
const submitCostTarget = ref(null)
const submitCostFiles = ref([])

const handleSubmitCost = (c) => {
  if (c.attachments?.length > 0) {
    // Đã có chứng từ → gửi duyệt trực tiếp
    router.post(`/projects/${props.project.id}/costs/${c.id}/submit`, {}, loadingOptions(`submit-cost-${c.id}`))
  } else {
    // Chưa có chứng từ → mở modal bắt upload
    submitCostTarget.value = c
    submitCostFiles.value = []
    showSubmitCostModal.value = true
  }
}

const onSubmitCostFileChange = (e) => { submitCostFiles.value = Array.from(e.target.files || []) }

const doSubmitCostWithFiles = () => {
  if (!submitCostFiles.value.length || !submitCostTarget.value) return
  const formData = new FormData()
  submitCostFiles.value.forEach(f => formData.append('files[]', f))
  router.post(`/projects/${props.project.id}/costs/${submitCostTarget.value.id}/submit`, formData, savingOptions({
    forceFormData: true,
    onSuccess: () => { showSubmitCostModal.value = false; submitCostFiles.value = [] },
  }))
}

const approveCostMgmt = (c) => router.post(`/projects/${props.project.id}/costs/${c.id}/approve-management`, {}, loadingOptions(`approve-cost-mgmt-${c.id}`))

// KT xác nhận — simple approve (chứng từ đã có từ lúc gửi duyệt)
const approveCostAcct = (c) => {
  if (!c.attachments?.length && !(c.attachments_count > 0)) {
    return Modal.warning({
      title: 'Thiếu chứng từ',
      content: 'Kế toán chỉ có thể xác nhận khi đã có tệp chứng từ đính kèm để đối chiếu.'
    })
  }
  router.post(`/projects/${props.project.id}/costs/${c.id}/approve-accountant`, {}, loadingOptions(`approve-cost-acct-${c.id}`))
}

// Drawer Openers
const openCostDetail = (c) => { costDetailRecord.value = c; showCostDetail.value = true }
const openPaymentDetail = (p) => { paymentDetailRecord.value = p; showPaymentDetail.value = true }

// Budget Item Options for cost form selector
const budgetItemOptions = computed(() => {
  if (!props.project.budgets?.length) return []
  const options = []
  for (const b of props.project.budgets) {
    if (b.status !== 'approved' && b.status !== 'draft') continue
    for (const item of (b.items || [])) {
      options.push({
        id: item.id,
        label: `${b.name} → ${item.name}`,
        estimated: item.estimated_amount || 0,
        actual: item.actual_amount || 0,
        remaining: (item.remaining_amount ?? item.estimated_amount) || 0,
      })
    }
  }
  return options
})

// Budget expand state
const expandedBudgets = ref([])
// Budget details drawer
const showBudgetDetailDrawer = ref(false)
const budgetDetail = ref(null)
const openBudgetDetail = (budget) => { 
  budgetDetail.value = budget
  showBudgetDetailDrawer.value = true 
}

const toggleBudgetExpand = (id) => {
  const idx = expandedBudgets.value.indexOf(id)
  if (idx >= 0) expandedBudgets.value.splice(idx, 1)
  else expandedBudgets.value.push(id)
}

const showRejectCostModal = ref(false)
const rejectingCost = ref(null)
const rejectCostReason = ref('')
const openRejectCostModal = (c) => { rejectingCost.value = c; rejectCostReason.value = ''; showRejectCostModal.value = true }
const rejectCost = () => { router.post(`/projects/${props.project.id}/costs/${rejectingCost.value.id}/reject`, { rejected_reason: rejectCostReason.value }, savingOptions({ onSuccess: () => showRejectCostModal.value = false })) }
const revertCostAction = (c) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Dữ liệu này sẽ được đưa về trạng thái Nháp để bạn có thể chỉnh sửa hoặc xóa. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => router.post(`/projects/${props.project.id}/costs/${c.id}/revert`, {}, loadingOptions(`revert-cost-${c.id}`))
  })
}

// ============ CONTRACT CRUD ============
const showContractModal = ref(false)
const editingContract = ref(null)
const contractForm = ref({ contract_value: null, signed_date: null, status: 'draft', deleted_attachment_ids: [] })

// ============ CONTRACT DETAIL DRAWER ============
const showContractDetail = ref(false)
const contractDetailRecord = ref(null)
const openContractDetail = (c) => { contractDetailRecord.value = c; showContractDetail.value = true }

const submitContractForApproval = (c) => {
  router.put(`/projects/${props.project.id}/contract`, { contract_value: c.contract_value, signed_date: c.signed_date, status: 'pending_customer_approval' }, loadingOptions('submit-contract', {
    onSuccess: () => {
      const updated = props.project?.contract
      if (updated) contractDetailRecord.value = updated
    }
  }))
}

const approveContract = (c) => {
  router.post(`/approvals/contract/${c.id}/approve`, {}, loadingOptions('approve-contract', {
    onSuccess: () => {
      const updated = props.project?.contract
      if (updated) contractDetailRecord.value = updated; else showContractDetail.value = false
    }
  }))
}

const showRejectContractModal = ref(false)
const rejectingContract = ref(null)
const rejectContractReason = ref('')
const openRejectContractModal = (c) => { rejectingContract.value = c; rejectContractReason.value = ''; showRejectContractModal.value = true }
const rejectContract = () => {
  router.post(`/approvals/contract/${rejectingContract.value.id}/reject`, { reason: rejectContractReason.value }, savingOptions({
    onSuccess: () => {
      showRejectContractModal.value = false
      const updated = props.project?.contract
      if (updated) contractDetailRecord.value = updated; else showContractDetail.value = false
    }
  }))
}

// ============ FILE PREVIEW (Premium Inline Viewer) ============
const showFilePreview = ref(false)
const previewFile = ref(null)
const previewLoading = ref(false)
const imageZoomed = ref(false)

const openFilePreview = (file) => {
  previewFile.value = file
  previewLoading.value = true
  imageZoomed.value = false
  showFilePreview.value = true
  // Auto-stop loading for unsupported types
  if (!isImageFile(file) && !isPdfFile(file) && !isVideoFile(file) && !isOfficeFile(file) && !isTextFile(file)) {
    previewLoading.value = false
  }
}

const fileExt = (f) => {
  const name = f?.original_name || f?.file_name || f?.mime_type || ''
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return ext
}

const isImageFile = (f) => /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff)$/i.test(f.original_name || f.file_name || '') || (f.mime_type && f.mime_type.startsWith('image/'))
const isPdfFile = (f) => /\.pdf$/i.test(f.original_name || f.file_name || '') || f.mime_type === 'application/pdf'
const isVideoFile = (f) => /\.(mp4|webm|mov|avi|mkv|ogg)$/i.test(f.original_name || f.file_name || '') || (f.mime_type && f.mime_type.startsWith('video/'))
const isOfficeFile = (f) => /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(f.original_name || f.file_name || '')
const isTextFile = (f) => /\.(txt|csv|json|xml|html|htm|css|js|md|log)$/i.test(f.original_name || f.file_name || '')

const googleDocsViewerUrl = (f) => {
  const fullUrl = f.file_url?.startsWith('http') ? f.file_url : window.location.origin + f.file_url
  return `https://docs.google.com/gview?url=${encodeURIComponent(fullUrl)}&embedded=true`
}

const fileExtColor = (f) => {
  const ext = fileExt(f)
  const colors = {
    pdf: '#E53E3E', doc: '#2B6CB0', docx: '#2B6CB0',
    xls: '#2F855A', xlsx: '#2F855A', ppt: '#DD6B20', pptx: '#DD6B20',
    jpg: '#805AD5', jpeg: '#805AD5', png: '#805AD5', gif: '#805AD5', webp: '#805AD5', svg: '#805AD5',
    mp4: '#D53F8C', mov: '#D53F8C', webm: '#D53F8C', avi: '#D53F8C',
    zip: '#718096', rar: '#718096', '7z': '#718096',
    txt: '#4A5568', csv: '#4A5568', json: '#4A5568',
  }
  return colors[ext] || '#A0AEC0'
}

const openContractModal = (c) => {
  editingContract.value = c
  modalFiles.value = []
  contractForm.value = c
    ? { contract_value: c.contract_value, signed_date: c.signed_date, status: c.status || 'draft', deleted_attachment_ids: [] }
    : { contract_value: null, signed_date: null, status: 'draft', deleted_attachment_ids: [] }
  showContractModal.value = true
}
const saveContract = () => {
  if (!modalFiles.value.length && (!editingContract.value || !editingContract.value.attachments?.length)) {
    return Modal.warning({ title: 'Thiếu tệp hợp đồng', content: 'Vui lòng đính kèm file hợp đồng bản scan hoặc ảnh chụp để tiếp tục.' })
  }
  const url = `/projects/${props.project.id}/contract`
  const method = editingContract.value ? 'put' : 'post'
  const formData = new FormData()
  appendFormEntries(formData, contractForm.value)
  modalFiles.value.forEach(f => formData.append('files[]', f))
  if (editingContract.value) formData.append('_method', 'PUT')
  
  router.post(url, formData, savingOptions({
    forceFormData: true,
    onSuccess: () => {
      showContractModal.value = false
      modalFiles.value = []
    },
  }))
}

// ============ PAYMENT CRUD ============
const showPaymentModal = ref(false)
const editingPayment = ref(null)
const paymentForm = ref({ payment_number: '', contract_id: null, notes: '', amount: null, due_date: null, deleted_attachment_ids: [] })
const openPaymentModal = (p = null) => {
  editingPayment.value = p
  modalFiles.value = []
  paymentForm.value = p ? { payment_number: p.payment_number, contract_id: p.contract_id || null, notes: p.notes || '', amount: p.amount, due_date: p.due_date, deleted_attachment_ids: [] } : { payment_number: '', contract_id: props.project.contract?.id || null, notes: '', amount: null, due_date: null, deleted_attachment_ids: [] }
  showPaymentModal.value = true
}
const savePayment = () => {
  if (!modalFiles.value.length && (!editingPayment.value || !editingPayment.value.attachments?.length)) {
    return Modal.warning({ title: 'Yêu cầu chứng từ', content: 'Mọi đợt thanh toán đều cần đính kèm ảnh chụp ủy nhiệm chi hoặc biên lai để xác nhận.' })
  }
  const formData = new FormData()
  appendFormEntries(formData, paymentForm.value)
  modalFiles.value.forEach(f => formData.append('files[]', f))
  
  router.post(`/projects/${props.project.id}/payments`, formData, savingOptions({
    forceFormData: true,
    onSuccess: () => {
      showPaymentModal.value = false
      modalFiles.value = []
    },
  }))
}
// Payment Proof Modal — KH phải upload chứng từ mới được đánh dấu thanh toán
const showPaymentProofModal = ref(false)
const paymentProofTarget = ref(null)
const paymentProofFiles = ref([])
const paymentProofForm = ref({ paid_date: new Date().toISOString().slice(0, 10), actual_amount: null })
const openPaymentProofModal = (record) => {
  paymentProofTarget.value = record
  paymentProofFiles.value = []
  paymentProofForm.value = { paid_date: new Date().toISOString().slice(0, 10), actual_amount: null }
  showPaymentProofModal.value = true
}
const onPaymentProofFileChange = (e) => { paymentProofFiles.value = Array.from(e.target.files || []) }
const submitPaymentProof = () => {
  if (!paymentProofFiles.value.length || !paymentProofTarget.value) return
  const formData = new FormData()
  paymentProofFiles.value.forEach(f => formData.append('files[]', f))
  if (paymentProofForm.value.paid_date) formData.append('paid_date', paymentProofForm.value.paid_date)
  if (paymentProofForm.value.actual_amount) formData.append('actual_amount', paymentProofForm.value.actual_amount)
  router.post(`/projects/${props.project.id}/payments/${paymentProofTarget.value.id}/mark-paid`, formData, savingOptions({
    forceFormData: true,
    onSuccess: () => { showPaymentProofModal.value = false; paymentProofFiles.value = []; paymentProofTarget.value = null },
  }))
}
const deletePayment = (p) => router.delete(`/projects/${props.project.id}/payments/${p.id}`, loadingOptions(`delete-pay-${p.id}`))
const submitPaymentAction = (p) => router.post(`/projects/${props.project.id}/payments/${p.id}/submit`, {}, loadingOptions(`submit-pay-${p.id}`))
const approvePaymentByCustomerAction = (p) => router.post(`/projects/${props.project.id}/payments/${p.id}/customer-approve`, {}, loadingOptions(`approve-pay-${p.id}`))
const confirmPaymentAction = (p) => router.post(`/projects/${props.project.id}/payments/${p.id}/confirm`, { paid_date: new Date().toISOString().slice(0, 10) }, loadingOptions(`confirm-pay-${p.id}`))
const showRejectPaymentModal = ref(false)
const rejectPaymentTarget = ref(null)
const rejectPaymentReason = ref('')
const openRejectPaymentModal = (record) => { rejectPaymentTarget.value = record; rejectPaymentReason.value = ''; showRejectPaymentModal.value = true }
const rejectPaymentAction = () => {
  if (!rejectPaymentReason.value.trim()) return
  router.post(`/projects/${props.project.id}/payments/${rejectPaymentTarget.value.id}/reject`, { reason: rejectPaymentReason.value.trim() }, savingOptions({ onSuccess: () => { showRejectPaymentModal.value = false; rejectPaymentTarget.value = null } }))
}

// ============ SHARED FILE UPLOAD ============
const showAttachModal = ref(false)
const attachType = ref('') // 'cost' | 'payment' | 'additional-cost' | 'logs' | 'material_bill' | 'subcontractor'
const attachTarget = ref(null)
const attachFiles = ref([])
const attachFileInput = ref(null)
const attachModalTitles = {
  cost: 'Đính kèm file — Phiếu chi',
  payment: 'Đính kèm chứng từ — Thanh toán',
  'additional-cost': 'Đính kèm file — CP Phát sinh',
  logs: 'Đính kèm hình ảnh — Nhật ký thi công',
  material_bill: 'Đính kèm chứng từ — Phiếu vật tư',
  subcontractor: 'Đính kèm file — Nhà thầu phụ',
}
const attachModalTitle = computed(() => attachModalTitles[attachType.value] || 'Đính kèm file')
const openAttachModal = (type, record) => { attachType.value = type; attachTarget.value = record; attachFiles.value = []; showAttachModal.value = true }
const onAttachFileChange = (e) => { attachFiles.value = Array.from(e.target.files || []) }
const submitAttachFiles = () => {
  if (!attachFiles.value.length || !attachTarget.value) return
  const formData = new FormData()
  attachFiles.value.forEach((f) => formData.append('files[]', f))
  const urlMap = {
    cost: `/projects/${props.project.id}/costs/${attachTarget.value.id}/attach-files`,
    payment: `/projects/${props.project.id}/payments/${attachTarget.value.id}/attach-files`,
    'additional-cost': `/projects/${props.project.id}/additional-costs/${attachTarget.value.id}/attach-files`,
    logs: `/projects/${props.project.id}/logs/${attachTarget.value.id}/attach-files`,
    material_bill: `/projects/${props.project.id}/material-bills/${attachTarget.value.id}/attach-files`,
    subcontractor: `/projects/${props.project.id}/subcontractors/${attachTarget.value.id}/attach-files`,
  }
  router.post(urlMap[attachType.value], formData, savingOptions({
    forceFormData: true,
    onSuccess: () => { showAttachModal.value = false; attachFiles.value = [] },
  }))
}

// ============ PERSONNEL CRUD ============
const showPersonnelModal = ref(false)
const personnelForm = ref({ user_id: null, personnel_role_id: null })
const openPersonnelModal = () => { personnelForm.value = { user_id: null, personnel_role_id: null }; showPersonnelModal.value = true }
const savePersonnel = () => { router.post(`/projects/${props.project.id}/personnel`, personnelForm.value, savingOptions({ onSuccess: () => showPersonnelModal.value = false })) }
const removePersonnel = (p) => router.delete(`/projects/${props.project.id}/personnel/${p.id}`, loadingOptions(`remove-person-${p.id}`))

// ============ LOG CRUD ============
const showLogModal = ref(false)
const editingLog = ref(null)
const logForm = ref({ log_date: null, task_id: null, weather: null, personnel_count: null, completion_percentage: 0, notes: '', deleted_attachment_ids: [] })

// Log Detail Drawer
const showLogDetailDrawer = ref(false)
const logDetailRecord = ref(null)
const openLogDetailDrawer = (log) => {
  logDetailRecord.value = log
  showLogDetailDrawer.value = true
}

const openLogModal = (record = null, preSelectedTaskId = null) => {
  modalFiles.value = []
  logTaskCurrentProgress.value = null
  if (record) {
    editingLog.value = record
    logForm.value = {
      log_date: record.log_date || null,
      task_id: record.task_id || null,
      weather: record.weather || null,
      personnel_count: record.personnel_count ?? null,
      completion_percentage: Number(record.completion_percentage || 0),
      notes: record.notes || '',
      deleted_attachment_ids: []
    }
    // Prefill current progress from task's logs
    if (record.task_id) {
      onLogTaskChange(record.task_id, true)
    }
  } else {
    editingLog.value = null
    logForm.value = { log_date: dayjs().format('YYYY-MM-DD'), task_id: preSelectedTaskId || null, weather: null, personnel_count: null, completion_percentage: 0, notes: '', deleted_attachment_ids: [] }
    if (preSelectedTaskId) {
      onLogTaskChange(preSelectedTaskId)
    }
  }
  showLogModal.value = true
}

// When user selects/changes a task, auto-fill completion_percentage with latest progress
const logTaskCurrentProgress = ref(null)
const logTaskMinProgress = computed(() => logTaskCurrentProgress.value ?? 0)
const logSliderMarks = computed(() => {
  const min = logTaskMinProgress.value
  const marks = {}
  marks[min] = `${min}%`
  if (min < 50) marks[50] = '50%'
  if (min < 75) marks[75] = '75%'
  if (min < 100) marks[100] = '100%'
  return marks
})
const onLogTaskChange = (taskId, isEditing = false) => {
  if (!taskId) {
    logTaskCurrentProgress.value = null
    logForm.value.completion_percentage = 0
    return
  }
  
  // Find task in allTasks to get current progress percentage (backend calculated)
  const task = (allTasks.value).find(t => t.id === taskId)
  if (task) {
    const currentPct = Number(task.progress_percentage || 0)
    logTaskCurrentProgress.value = currentPct
    // Auto-fill: set slider to current progress (user can increase from here)
    if (!isEditing) {
      logForm.value.completion_percentage = currentPct
    }
  } else {
    // Fallback: search logs directly
    const logs = (props.project.construction_logs || props.project.constructionLogs || []).filter(
      l => l.task_id === taskId && l.completion_percentage != null
    )
    if (logs.length) {
      const maxPct = Math.max(...logs.map(l => Number(l.completion_percentage)))
      logTaskCurrentProgress.value = maxPct
      if (!isEditing) logForm.value.completion_percentage = maxPct
    } else {
      logTaskCurrentProgress.value = null
      if (!isEditing) logForm.value.completion_percentage = 0
    }
  }
}

const saveLog = () => {
  const url = editingLog.value ? `/projects/${props.project.id}/logs/${editingLog.value.id}` : `/projects/${props.project.id}/logs`
  const formData = new FormData()
  appendFormEntries(formData, logForm.value)
  modalFiles.value.forEach(f => formData.append('files[]', f))
  if (editingLog.value) formData.append('_method', 'PUT')

  router.post(url, formData, savingOptions({
    forceFormData: true,
    preserveScroll: true,
    onSuccess: () => {
      showLogModal.value = false
      modalFiles.value = []
    },
  }))
}

const deleteLog = (l) => router.delete(`/projects/${props.project.id}/logs/${l.id}`, loadingOptions(`delete-log-${l.id}`, { preserveScroll: true }))

// ============ COMMENT CRUD (Threaded) ============
const replyingTo = ref(null)
const replyText = ref('')
const commentCount = computed(() => {
  const comments = props.project.comments || []
  return comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0)
})
const toggleReply = (commentId) => {
  if (replyingTo.value === commentId) { replyingTo.value = null; replyText.value = '' }
  else { replyingTo.value = commentId; replyText.value = '' }
}
const addComment = (parentId = null) => {
  const content = parentId ? replyText.value : commentText.value
  if (!content.trim()) return
  const data = { content: content.trim() }
  if (parentId) data.parent_id = parentId
  router.post(`/projects/${props.project.id}/comments`, data, loadingOptions(`add-comment-${parentId || 'root'}`, {
    preserveScroll: true,
    onSuccess: () => {
      if (parentId) { replyText.value = ''; replyingTo.value = null }
      else { commentText.value = '' }
    },
  }))
}
const deleteComment = (c) => router.delete(`/projects/${props.project.id}/comments/${c.id}`, loadingOptions(`delete-comment-${c.id}`, { preserveScroll: true }))

// ============ DEFECT CRUD ============
const showDefectModal = ref(false)
const showDefectFixModal = ref(false)
const defectFixForm = ref({ files: [], rectification_details: '' })
const editingDefect = ref(null)
const defectForm = ref({ description: '', severity: 'medium', status: 'open', task_id: null, acceptance_stage_id: null, defect_type: null, deleted_attachment_ids: [] })
const openDefectModal = (d) => {
  editingDefect.value = d
  modalFiles.value = []
  defectForm.value = d
    ? { description: d.description || '', severity: d.severity, status: d.status, task_id: d.task_id || null, acceptance_stage_id: d.acceptance_stage_id || null, defect_type: d.defect_type || null, deleted_attachment_ids: [] }
    : { description: '', severity: 'medium', status: 'open', task_id: null, acceptance_stage_id: null, defect_type: null, deleted_attachment_ids: [] }
  showDefectModal.value = true
}
const saveDefect = () => {
  const url = editingDefect.value ? `/projects/${props.project.id}/defects/${editingDefect.value.id}` : `/projects/${props.project.id}/defects`
  const formData = new FormData()
  appendFormEntries(formData, defectForm.value)
  modalFiles.value.forEach(f => formData.append('files[]', f))
  if (editingDefect.value) formData.append('_method', 'PUT')

  router.post(url, formData, savingOptions({
    forceFormData: true,
    onSuccess: () => {
      showDefectModal.value = false
      modalFiles.value = []
    },
  }))
}
const deleteDefect = (d) => router.delete(`/projects/${props.project.id}/defects/${d.id}`, loadingOptions(`delete-defect-${d.id}`))

// ============ DEFECT WORKFLOW ACTIONS ============
const defectAction = (record, action) => {
  if (action === 'mark-fixed') {
    editingDefect.value = record
    defectFixForm.value = { files: [], rectification_details: '' }
    showDefectFixModal.value = true
    return
  }
  router.post(`/projects/${props.project.id}/defects/${record.id}/${action}`, {}, loadingOptions(`defect-action-${record.id}`))
}

const onFixFilesChange = (e) => {
  const files = Array.from(e.target.files)
  files.forEach(file => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      defectFixForm.value.files.push({
        file: file,
        preview: ev.target.result
      })
    }
    reader.readAsDataURL(file)
  })
}

const submitDefectFix = () => {
  if (!defectFixForm.value.files.length) {
    return message.warning('Vui lòng tải lên ít nhất một hình ảnh minh chứng đã khắc phục lỗi.')
  }

  const fd = new FormData()
  fd.append('rectification_details', defectFixForm.value.rectification_details)
  defectFixForm.value.files.forEach(f => fd.append('files[]', f.file))

  router.post(`/projects/${props.project.id}/defects/${editingDefect.value.id}/mark-fixed`, fd, {
    forceFormData: true,
    preserveScroll: true,
    ...loadingOptions('submit-defect-fix', {
      onSuccess: () => {
        showDefectFixModal.value = false
        defectFixForm.value = { files: [], rectification_details: '' }
        showDefectDetailDrawer.value = false
        message.success('Đã gửi báo cáo khắc phục lỗi.')
      }
    })
  })
}

const rejectDefectRecord = ref(null)
const rejectDefectReason = ref('')
const showRejectDefectModal = ref(false)
const openRejectDefectModal = (record) => {
  rejectDefectRecord.value = record
  rejectDefectReason.value = ''
  showRejectDefectModal.value = true
}
const confirmRejectDefect = () => {
  if (!rejectDefectReason.value?.trim()) return
  router.post(`/projects/${props.project.id}/defects/${rejectDefectRecord.value.id}/reject-fix`, {
    rejection_reason: rejectDefectReason.value
  }, loadingOptions(`reject-defect-${rejectDefectRecord.value.id}`, {
    onSuccess: () => { showRejectDefectModal.value = false; rejectDefectRecord.value = null }
  }))
}

// ============ CHANGE REQUEST CRUD ============
const showCRModal = ref(false)
const editingCR = ref(null)
const crFormDefault = () => ({ title: '', description: '', change_type: null, priority: null, reason: '', impact_analysis: '', estimated_cost_impact: null, estimated_schedule_impact_days: null, implementation_plan: '' })
const crForm = ref(crFormDefault())

const openChangeRequestModal = (record = null) => {
  if (record) {
    editingCR.value = record
    crForm.value = {
      title: record.title || '',
      description: record.description || '',
      change_type: record.change_type || null,
      priority: record.priority || null,
      reason: record.reason || '',
      impact_analysis: record.impact_analysis || '',
      estimated_cost_impact: record.estimated_cost_impact ?? null,
      estimated_schedule_impact_days: record.estimated_schedule_impact_days ?? null,
      implementation_plan: record.implementation_plan || '',
    }
  } else {
    editingCR.value = null
    crForm.value = crFormDefault()
  }
  showCRModal.value = true
}

const saveCR = () => {
  const pId = props.project.id
  if (editingCR.value) {
    router.put(`/projects/${pId}/change-requests/${editingCR.value.id}`, crForm.value, savingOptions({ preserveScroll: true, onSuccess: () => { showCRModal.value = false; editingCR.value = null } }))
  } else {
    router.post(`/projects/${pId}/change-requests`, crForm.value, savingOptions({ preserveScroll: true, onSuccess: () => { showCRModal.value = false } }))
  }
}

const submitCR = (cr) => router.post(`/projects/${props.project.id}/change-requests/${cr.id}/submit`, {}, loadingOptions(`submit-cr-${cr.id}`, { preserveScroll: true }))
const approveCR = (cr) => router.post(`/projects/${props.project.id}/change-requests/${cr.id}/approve`, {}, loadingOptions(`approve-cr-${cr.id}`, { preserveScroll: true }))
const rejectCR = (cr) => router.post(`/projects/${props.project.id}/change-requests/${cr.id}/reject`, { reason: 'Không đồng ý' }, loadingOptions(`reject-cr-${cr.id}`, { preserveScroll: true }))
const implementCR = (cr) => router.post(`/projects/${props.project.id}/change-requests/${cr.id}/implement`, {}, loadingOptions(`implement-cr-${cr.id}`, { preserveScroll: true }))
const deleteChangeRequest = (cr) => router.delete(`/projects/${props.project.id}/change-requests/${cr.id}`, loadingOptions(`delete-cr-${cr.id}`, { preserveScroll: true }))

// ============ RISK CRUD ============
const showRiskModal = ref(false)
const editingRisk = ref(null)
const riskFormDefault = () => ({ title: '', description: '', category: null, probability: null, impact: null, risk_type: 'threat', mitigation_plan: '', contingency_plan: '', owner_id: null, target_resolution_date: null })
const riskForm = ref(riskFormDefault())

const openRiskModal = (record = null) => {
  if (record) {
    editingRisk.value = record
    riskForm.value = {
      title: record.title || '',
      description: record.description || '',
      category: record.category || null,
      probability: record.probability || null,
      impact: record.impact || null,
      risk_type: record.risk_type || 'threat',
      mitigation_plan: record.mitigation_plan || '',
      contingency_plan: record.contingency_plan || '',
      owner_id: record.owner_id ?? null,
      target_resolution_date: record.target_resolution_date || null,
    }
  } else {
    editingRisk.value = null
    riskForm.value = riskFormDefault()
  }
  showRiskModal.value = true
}

const saveRisk = () => {
  const pId = props.project.id
  if (editingRisk.value) {
    router.put(`/projects/${pId}/risks/${editingRisk.value.id}`, riskForm.value, savingOptions({ preserveScroll: true, onSuccess: () => { showRiskModal.value = false; editingRisk.value = null } }))
  } else {
    router.post(`/projects/${pId}/risks`, riskForm.value, savingOptions({ preserveScroll: true, onSuccess: () => { showRiskModal.value = false } }))
  }
}

const resolveRisk = (r) => router.post(`/projects/${props.project.id}/risks/${r.id}/resolve`, {}, loadingOptions(`resolve-risk-${r.id}`, { preserveScroll: true }))
const deleteRisk = (r) => router.delete(`/projects/${props.project.id}/risks/${r.id}`, loadingOptions(`delete-risk-${r.id}`, { preserveScroll: true }))

// ============ TASK / PROGRESS ============
const taskStatusLabels = { not_started: 'Chưa bắt đầu', in_progress: 'Đang thực hiện', delayed: 'Trễ tiến độ', completed: 'Hoàn thành' }
const taskStatusColors = { not_started: 'default', in_progress: 'processing', delayed: 'error', completed: 'success' }

// Build tree: root = tasks with no parent_id
const rootTasks = computed(() => {
  return (allTasks.value).filter(t => !t.parent_id)
})

const taskStats = computed(() => {
  const all = allTasks.value
  return {
    total: all.length,
    not_started: all.filter(t => t.status === 'not_started').length,
    in_progress: all.filter(t => t.status === 'in_progress').length,
    delayed: all.filter(t => t.status === 'delayed').length,
    completed: all.filter(t => t.status === 'completed').length,
  }
})

// Tiến độ tính từ WBS tasks (dùng trong tab Tiến độ — context task-level)
const overallTaskProgress = computed(() => {
  const roots = rootTasks.value
  if (!roots.length) return parseFloat(props.project?.progress?.overall_percentage || 0)
  const totalWeight = roots.reduce((sum, t) => sum + Math.max(1, parseInt(t.duration || 0)), 0)
  const weightedSum = roots.reduce((sum, t) => sum + parseFloat(t.progress_percentage || 0) * Math.max(1, parseInt(t.duration || 0)), 0)
  return Math.round(weightedSum / totalWeight * 10) / 10
})

// Tiến độ tổng thể toàn dự án (ưu tiên: DB overall_percentage → overallTaskProgress)
// DB value đã được backend tính đúng theo thứ tự: Acceptance → Tasks → Logs → Subcontractors
const overallProjectProgress = computed(() => {
  const dbValue = parseFloat(props.project?.progress?.overall_percentage || 0)
  if (dbValue > 0) return Math.round(dbValue * 10) / 10
  return overallTaskProgress.value
})

// Nguồn tính tiến độ (hiển thị label trong UI)
const progressSourceLabel = computed(() => {
  const src = props.project?.progress?.calculated_from
  const map = { acceptance: 'Nghiệm thu', tasks: 'Công việc', logs: 'Nhật ký', subcontractors: 'Nhà thầu', mixed: 'Hỗn hợp', manual: 'Thủ công' }
  return map[src] || ''
})

// Expand/Collapse
const expandedTasks = ref(new Set())
const toggleExpand = (taskId) => {
  if (expandedTasks.value.has(taskId)) {
    expandedTasks.value.delete(taskId)
  } else {
    expandedTasks.value.add(taskId)
  }
}

// Parent task options (exclude the task being edited and its descendants)
const parentTaskOptions = computed(() => {
  return rootTasks.value.filter(t => !editingTask.value || t.id !== editingTask.value.id)
})

// Task CRUD
const showTaskModal = ref(false)
const editingTask = ref(null)
const taskFormDefault = () => ({ name: '', description: '', parent_id: null, phase_id: null, start_date: null, end_date: null, duration: null, progress_percentage: 0, status: 'pending', priority: 'medium', assigned_to: null })
const taskForm = ref(taskFormDefault())

const openTaskModal = (record = null, parentId = null) => {
  if (record) {
    editingTask.value = record
    taskForm.value = {
      name: record.name || '',
      description: record.description || '',
      parent_id: record.parent_id ?? null,
      phase_id: record.phase_id ?? null,
      start_date: record.start_date ? record.start_date.substring(0, 10) : null,
      end_date: record.end_date ? record.end_date.substring(0, 10) : null,
      duration: record.duration ?? null,
      progress_percentage: record.progress_percentage ?? 0,
      status: record.status || 'pending',
      priority: record.priority || 'medium',
      assigned_to: record.assigned_to ?? null,
    }
  } else {
    editingTask.value = null
    const form = taskFormDefault()
    if (parentId) form.parent_id = parentId
    taskForm.value = form
  }
  showTaskModal.value = true
}

const saveTask = () => {
  const pId = props.project.id
  if (editingTask.value) {
    router.put(`/projects/${pId}/tasks/${editingTask.value.id}`, taskForm.value, savingOptions({ preserveScroll: true, onSuccess: () => { showTaskModal.value = false; editingTask.value = null } }))
  } else {
    router.post(`/projects/${pId}/tasks`, taskForm.value, savingOptions({ preserveScroll: true, onSuccess: () => { showTaskModal.value = false } }))
  }
}

const deleteTask = (t) => router.delete(`/projects/${props.project.id}/tasks/${t.id}`, loadingOptions(`delete-task-${t.id}`, { preserveScroll: true }))

// ============ SUBCONTRACTOR CRUD ============
const showSubModal = ref(false)
const editingSub = ref(null)
const subFiles = ref([])
const subForm = ref({ name: '', category: '', total_quote: null, bank_name: '', bank_account_number: '', bank_account_name: '', progress_start_date: null, progress_end_date: null, progress_status: 'not_started', global_subcontractor_id: null, create_cost: true, cost_group_id: null, deleted_attachment_ids: [] })
const openSubModal = (s) => {
  editingSub.value = s
  subFiles.value = []
  subForm.value = s ? { name: s.name, category: s.category || '', total_quote: s.total_quote, bank_name: s.bank_name || '', bank_account_number: s.bank_account_number || '', bank_account_name: s.bank_account_name || '', progress_start_date: s.progress_start_date || null, progress_end_date: s.progress_end_date || null, progress_status: s.progress_status || 'not_started', deleted_attachment_ids: [] }
    : { name: '', category: '', total_quote: null, bank_name: '', bank_account_number: '', bank_account_name: '', progress_start_date: null, progress_end_date: null, progress_status: 'not_started', global_subcontractor_id: null, create_cost: true, cost_group_id: null, deleted_attachment_ids: [] }
  showSubModal.value = true
}
const onGlobalSubSelect = (id) => {
  if (!id) {
    subForm.value.name = '';
    return;
  }
  const gs = (props.globalSubcontractors || []).find(g => g.id === id)
  if (gs) { 
    subForm.value.name = gs.name; 
    subForm.value.bank_name = gs.bank_name || ''; 
    subForm.value.bank_account_number = gs.bank_account_number || ''; 
    subForm.value.bank_account_name = gs.bank_account_name || ''; 
    subForm.value.category = gs.category || '' 
  }
}
const saveSub = () => {
  const url = editingSub.value ? `/projects/${props.project.id}/subcontractors/${editingSub.value.id}` : `/projects/${props.project.id}/subcontractors`
  const method = editingSub.value ? 'put' : 'post'

  // Use FormData if files are attached or we need to ensure boolean transmission
  if (subFiles.value.length > 0 || !editingSub.value) {
    const fd = new FormData()
    Object.entries(subForm.value).forEach(([k, v]) => { 
      if (k === 'deleted_attachment_ids' && Array.isArray(v)) { v.forEach(item => fd.append(`${k}[]`, item)); return }
      if (v === true) fd.append(k, '1')
      else if (v === false) fd.append(k, '0')
      else if (v !== null && v !== undefined && v !== '') fd.append(k, v) 
    })
    subFiles.value.forEach(f => fd.append('files[]', f))
    if (editingSub.value) {
      fd.append('_method', 'PUT')
      router.post(url, fd, { forceFormData: true, preserveScroll: true, ...savingOptions({ onSuccess: () => { showSubModal.value = false; subFiles.value = [] } }) })
    } else {
      router.post(url, fd, { forceFormData: true, preserveScroll: true, ...savingOptions({ onSuccess: () => { showSubModal.value = false; subFiles.value = [] } }) })
    }
  } else {
    router[method](url, subForm.value, savingOptions({ preserveScroll: true, onSuccess: () => { showSubModal.value = false } }))
  }
}
const deleteSub = (s) => router.delete(`/projects/${props.project.id}/subcontractors/${s.id}`, loadingOptions(`delete-sub-${s.id}`, { preserveScroll: true }))
const approveSub = (s) => router.post(`/projects/${props.project.id}/subcontractors/${s.id}/approve`, {}, loadingOptions(`approve-sub-${s.id}`, { preserveScroll: true }))

const openSubDetail = (s) => { subDetail.value = s; showSubDetailDrawer.value = true }
const openMaterialDetail = (m) => { materialDetail.value = m; showMaterialDetailDrawer.value = true }
const openEquipmentDetail = (e) => { equipmentDetail.value = e; showEquipmentDetailDrawer.value = true }
const openAdditionalCostDetail = (ac) => { additionalCostDetail.value = ac; showAdditionalCostDetailDrawer.value = true }
const openInvoiceDetail = (inv) => { invoiceDetail.value = inv; showInvoiceDetailDrawer.value = true }
const openDefectDetail = (d) => { defectDetail.value = d; showDefectDetailDrawer.value = true }
const openChangeRequestDetail = (cr) => { changeRequestDetail.value = cr; showChangeRequestDetailDrawer.value = true }
const openRiskDetail = (r) => { riskDetail.value = r; showRiskDetailDrawer.value = true }

// ============ SUBCONTRACTOR PAYMENT MANAGEMENT ============
const showSubPayDrawer = ref(false)
const showSubPayCreateDrawer = ref(false)
const subPayTarget = ref(null)
const subPayFiles = ref([])
const subPayForm = ref({ payment_stage: '', amount: null, payment_date: null, payment_method: 'bank_transfer', reference_number: '', description: '' })
const openSubPaymentHistory = (sub) => {
  subDetail.value = sub
  showSubPayDrawer.value = true
}
const openSubPaymentDrawer = (sub) => {
  subPayTarget.value = sub
  subPayFiles.value = []
  subPayForm.value = { payment_stage: '', amount: null, payment_date: dayjs().format('YYYY-MM-DD'), payment_method: 'bank_transfer', reference_number: '', description: '' }
  showSubPayCreateDrawer.value = true
}
const saveSubPayment = () => {
  if (!subPayFiles.value.length) {
    return Modal.warning({ title: 'Thiếu chứng từ NTP', content: 'Vui lòng đính kèm chứng từ thanh toán cho nhà thầu phụ.' })
  }
  if (!subPayTarget.value) return
  const url = `/projects/${props.project.id}/subcontractors/${subPayTarget.value.id}/payments`
  if (subPayFiles.value.length > 0) {
    const fd = new FormData()
    Object.entries(subPayForm.value).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') fd.append(k, v) })
    subPayFiles.value.forEach(f => fd.append('files[]', f))
    router.post(url, fd, { 
      forceFormData: true, 
      preserveScroll: true, 
      onSuccess: () => { 
        showSubPayCreateDrawer.value = false; 
        subPayFiles.value = [];
        message.success('Đã tạo phiếu thanh toán');
      },
      onError: () => {
        message.error('Lỗi khi tạo phiếu thanh toán');
      }
    })
  } else {
    router.post(url, subPayForm.value, {
      preserveScroll: true, 
      onSuccess: () => {
        showSubPayCreateDrawer.value = false;
        message.success('Đã tạo phiếu thanh toán');
      },
      onError: () => {
        message.error('Lỗi khi tạo phiếu thanh toán');
      }
    })
  }
}
const submitSubPayment = (sub, p) => router.post(`/projects/${props.project.id}/subcontractors/${sub.id}/payments/${p.id}/submit`, {}, loadingOptions(`submit-subpay-${p.id}`, { preserveScroll: true }))
const approveSubPayment = (sub, p) => router.post(`/projects/${props.project.id}/subcontractors/${sub.id}/payments/${p.id}/approve`, {}, loadingOptions(`approve-subpay-${p.id}`, { preserveScroll: true }))
const rejectSubPayment = (sub, p) => router.post(`/projects/${props.project.id}/subcontractors/${sub.id}/payments/${p.id}/reject`, {}, loadingOptions(`reject-subpay-${p.id}`, { preserveScroll: true }))
// confirmSubPayment is moved up to use unified modal logic
const deleteSubPayment = (sub, p) => router.delete(`/projects/${props.project.id}/subcontractors/${sub.id}/payments/${p.id}`, loadingOptions(`delete-subpay-${p.id}`, { preserveScroll: true }))
const revertSubPaymentAction = (sub, p) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Phiếu thanh toán này sẽ được đưa về trạng thái Nháp để bạn có thể chỉnh sửa hoặc xóa. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => router.post(`/projects/${props.project.id}/subcontractors/${sub.id}/payments/${p.id}/revert`, {}, loadingOptions(`revert-subpay-${p.id}`, { preserveScroll: true }))
  })
}

// ============ ADDITIONAL COST CRUD ============
const showACModal = ref(false)
const editingAC = ref(null)
const acForm = ref({ amount: null, description: '', deleted_attachment_ids: [] })
const openAdditionalCostModal = (ac = null) => {
  editingAC.value = ac
  modalFiles.value = []
  acForm.value = ac ? { amount: ac.amount, description: ac.description || '', deleted_attachment_ids: [] } : { amount: null, description: '', deleted_attachment_ids: [] }
  showACModal.value = true
}
const saveAC = () => {
  if (!modalFiles.value.length && (!editingAC.value || !editingAC.value.attachments?.length)) {
    return Modal.warning({ title: 'Yêu cầu minh chứng', content: 'Chi phí phát sinh bắt buộc phải có ảnh chụp hiện trường hoặc phiếu đề xuất có chữ ký.' })
  }
  const data = { ...acForm.value }
  if (modalFiles.value.length) {
    data.files = modalFiles.value
  }

  router.post(`/projects/${props.project.id}/additional-costs`, data, savingOptions({
    forceFormData: true,
    onSuccess: () => {
      showACModal.value = false
      modalFiles.value = []
    },
  }))
}
const approveAC = (ac) => router.post(`/projects/${props.project.id}/additional-costs/${ac.id}/approve`, {}, loadingOptions(`approve-ac-${ac.id}`))
const showRejectACModal = ref(false)
const rejectingAC = ref(null)
const rejectACReason = ref('')
const openRejectACModal = (ac) => { rejectingAC.value = ac; rejectACReason.value = ''; showRejectACModal.value = true }
const rejectAC = () => { router.post(`/projects/${props.project.id}/additional-costs/${rejectingAC.value.id}/reject`, { rejected_reason: rejectACReason.value }, savingOptions({ onSuccess: () => showRejectACModal.value = false })) }
const deleteAC = (ac) => router.delete(`/projects/${props.project.id}/additional-costs/${ac.id}`, loadingOptions(`delete-ac-${ac.id}`))

const showBudgetModal = ref(false)
const editingBudget = ref(null)
const budgetForm = ref({ 
  name: '', 
  budget_date: null, 
  version: '', 
  status: 'draft', 
  notes: '', 
  contract_value: 0,
  profit_percentage: 0,
  profit_amount: 0,
  total_budget: 0,
  items: [{ cost_group_id: null, name: '', estimated_amount: 0, percentage: 0 }] 
})

const totalBudgetSum = computed(() => budgetForm.value.items.reduce((s, i) => s + (parseFloat(i.estimated_amount) || 0), 0))
const itemsPercentageSum = computed(() => budgetForm.value.items.reduce((s, i) => s + (parseFloat(i.percentage) || 0), 0))

const recalculateProfitByPercent = () => {
  if (budgetForm.value.contract_value) {
    budgetForm.value.profit_amount = Math.round(budgetForm.value.contract_value * (budgetForm.value.profit_percentage / 100))
    budgetForm.value.total_budget = budgetForm.value.contract_value - budgetForm.value.profit_amount
  }
}
const recalculateProfitByAmount = () => {
  if (budgetForm.value.contract_value) {
    budgetForm.value.profit_percentage = parseFloat(((budgetForm.value.profit_amount / budgetForm.value.contract_value) * 100).toFixed(2))
    budgetForm.value.total_budget = budgetForm.value.contract_value - budgetForm.value.profit_amount
  }
}
const recalculateProfitByTotal = () => {
  if (budgetForm.value.contract_value) {
    budgetForm.value.profit_amount = budgetForm.value.contract_value - (budgetForm.value.total_budget || 0)
    budgetForm.value.profit_percentage = parseFloat(((budgetForm.value.profit_amount / budgetForm.value.contract_value) * 100).toFixed(2))
  }
}

const recalculateItemByPercent = (idx) => {
  const item = budgetForm.value.items[idx]
  if (budgetForm.value.total_budget) {
    item.estimated_amount = Math.round(budgetForm.value.total_budget * (item.percentage / 100))
  }
}
const recalculateItemByAmount = (idx) => {
  const item = budgetForm.value.items[idx]
  if (budgetForm.value.total_budget) {
    item.percentage = parseFloat(((item.estimated_amount / budgetForm.value.total_budget) * 100).toFixed(2))
  }
}

const onBudgetCostGroupChange = (idx, groupId) => {
  const group = props.costGroups.find(g => g.id === groupId)
  if (group) {
    budgetForm.value.items[idx].name = group.name
  }
}

const openBudgetModal = (budget = null) => {
  clearFormErrors()
  editingBudget.value = budget
  if (budget) {
    budgetForm.value = {
      name: budget.name || '',
      budget_date: budget.budget_date || dayjs().format('YYYY-MM-DD'),
      version: budget.version || '',
      status: budget.status || 'draft',
      notes: budget.notes || '',
      contract_value: budget.contract_value || 0,
      profit_percentage: budget.profit_percentage || 0,
      profit_amount: budget.profit_amount || 0,
      total_budget: budget.total_budget || 0,
      items: budget.items?.length
        ? budget.items.map(i => ({ 
            cost_group_id: i.cost_group_id,
            name: i.name, 
            percentage: i.percentage || 0,
            estimated_amount: i.estimated_amount, 
            description: i.description || '' 
          }))
        : [{ cost_group_id: null, name: '', estimated_amount: 0, percentage: 0 }],
    }
  } else {
    // Reset ve 0 hoac rong cho ngan sach moi
    const defaultContractValue = props.contract?.contract_value || 0
    budgetForm.value = { 
      name: '', 
      budget_date: dayjs().format('YYYY-MM-DD'), 
      version: 'v1', 
      status: 'draft', 
      notes: '', 
      contract_value: defaultContractValue,
      profit_percentage: 0,
      profit_amount: 0,
      total_budget: defaultContractValue,
      items: [{ cost_group_id: null, name: '', estimated_amount: 0, percentage: 0 }] 
    }
  }
  showBudgetModal.value = true
}
const saveBudget = () => {
  if (editingBudget.value) {
    router.put(`/projects/${props.project.id}/budgets/${editingBudget.value.id}`, budgetForm.value, savingOptions({ onSuccess: () => { showBudgetModal.value = false; editingBudget.value = null } }))
  } else {
    router.post(`/projects/${props.project.id}/budgets`, budgetForm.value, savingOptions({ onSuccess: () => showBudgetModal.value = false }))
  }
}
const submitBudgetForApproval = (b) => {
  router.post(`/projects/${props.project.id}/budgets/${b.id}/submit`, {}, loadingOptions(`submit-budget-${b.id}`))
}

const approveBudget = (b) => {
  router.post(`/projects/${props.project.id}/budgets/${b.id}/approve`, {}, loadingOptions(`approve-budget-${b.id}`))
}

const activateBudget = (b) => {
  router.post(`/projects/${props.project.id}/budgets/${b.id}/activate`, {}, loadingOptions(`activate-budget-${b.id}`))
}
const deleteBudget = (b) => router.delete(`/projects/${props.project.id}/budgets/${b.id}`, loadingOptions(`delete-budget-${b.id}`))

const showRejectBudgetModal = ref(false)
const rejectBudgetReason = ref('')
const openRejectBudgetModal = () => {
  rejectBudgetReason.value = ''
  showRejectBudgetModal.value = true
}
const confirmRejectBudget = () => {
  if (!rejectBudgetReason.value.trim()) return message.warning('Vui lòng nhập lý do')
  router.post(`/projects/${props.project.id}/budgets/${budgetDetail.value.id}/reject`, {
    rejected_reason: rejectBudgetReason.value
  }, {
    preserveScroll: true,
    onSuccess: () => {
      showRejectBudgetModal.value = false
      showBudgetDetailDrawer.value = false
      message.success('Đã từ chối ngân sách')
    }
  })
}

// ============ INVOICE CRUD ============
const showInvoiceModal = ref(false)
const editingInvoice = ref(null)
const invoiceForm = ref({ invoice_date: null, cost_group_id: null, subtotal: null, tax_amount: 0, discount_amount: 0, description: '', notes: '', deleted_attachment_ids: [] })
const openInvoiceModal = (inv) => {
  editingInvoice.value = inv
  modalFiles.value = []
  invoiceForm.value = inv ? { invoice_date: inv.invoice_date, cost_group_id: inv.cost_group_id || null, subtotal: inv.subtotal, tax_amount: inv.tax_amount || 0, discount_amount: inv.discount_amount || 0, description: inv.description || '', notes: inv.notes || '', deleted_attachment_ids: [] }
    : { invoice_date: dayjs().format('YYYY-MM-DD'), cost_group_id: null, subtotal: null, tax_amount: 0, discount_amount: 0, description: '', notes: '', deleted_attachment_ids: [] }
  showInvoiceModal.value = true
}
const saveInvoice = () => {
  if (!modalFiles.value.length && (!editingInvoice.value || !editingInvoice.value.attachments?.length)) {
    return Modal.warning({ title: 'Thiếu tệp hóa đơn', content: 'Vui lòng đính kèm bản scan hóa đơn để lưu trữ.' })
  }
  const url = editingInvoice.value ? `/projects/${props.project.id}/invoices/${editingInvoice.value.id}` : `/projects/${props.project.id}/invoices`
  const formData = new FormData()
  appendFormEntries(formData, invoiceForm.value)
  modalFiles.value.forEach(f => formData.append('files[]', f))
  if (editingInvoice.value) formData.append('_method', 'PUT')

  router.post(url, formData, savingOptions({
    forceFormData: true,
    onSuccess: () => {
      showInvoiceModal.value = false
      modalFiles.value = []
    },
  }))
}
const deleteInvoice = (inv) => router.delete(`/projects/${props.project.id}/invoices/${inv.id}`, loadingOptions(`delete-invoice-${inv.id}`))

// ============ ACCEPTANCE CRUD (Giống APP: AcceptanceChecklist) ============
const showAcceptModal = ref(false)
const acceptForm = ref({ name: '', description: '', task_id: null, acceptance_template_id: null })
const openAcceptModal = () => { acceptForm.value = { name: '', description: '', task_id: null, acceptance_template_id: null }; showAcceptModal.value = true }
const saveAccept = () => {
  const formData = new FormData()
  Object.entries(acceptForm.value).forEach(([k, v]) => { if (v !== null) formData.append(k, v) })
  modalFiles.value.forEach(f => formData.append('files[]', f))

  router.post(`/projects/${props.project.id}/acceptance`, formData, savingOptions({
    forceFormData: true,
    onSuccess: () => {
      showAcceptModal.value = false
      modalFiles.value = []
    },
  }))
}
const approveAccept = (stage, level) => router.post(`/projects/${props.project.id}/acceptance/${stage.id}/approve`, { level }, loadingOptions(`approve-accept-${stage.id}-${level}`, { 
  preserveScroll: true,
  onSuccess: () => message.success('Đã duyệt giai đoạn nghiệm thu.')
}))
const deleteAccept = (stage) => {
  Modal.confirm({
    title: 'Xóa giai đoạn nghiệm thu?',
    content: `Danh sách hạng mục kiểm tra của "${stage.name}" sẽ bị xóa. Thao tác không thể hoàn tác.`,
    okText: 'Xóa',
    okType: 'danger',
    onOk: () => {
      router.delete(`/projects/${props.project.id}/acceptance/${stage.id}`, {
        onSuccess: () => message.success('Đã xóa giai đoạn nghiệm thu')
      })
    }
  })
}

// Item actions inside drawer
const approveItem = (item) => {
  const stageId = acceptDetailStage.value.id
  const base = `/projects/${props.project.id}/acceptance/${stageId}/items/${item.id}`

  // Chọn URL duyệt theo workflow_status hiện tại
  let url = `${base}/approve-supervisor`
  if (item.workflow_status === 'supervisor_approved') {
    url = `${base}/approve-pm`
  } else if (item.workflow_status === 'project_manager_approved') {
    url = `${base}/approve-customer`
  }

  router.post(url, {}, {
    preserveState: true,
    preserveScroll: true,
    onSuccess: () => message.success('Đã duyệt hạng mục')
  })
}

const rejectItem = (item) => {
  const stageId = acceptDetailStage.value.id
  Modal.confirm({
    title: 'Từ chối hạng mục?',
    content: `Hạng mục "${item.name}" sẽ được đánh dấu là không đạt.`,
    okText: 'Từ chối',
    okType: 'danger',
    onOk: () => {
      // NOTE: backend controller expects 'rejection_reason'
      router.post(`/projects/${props.project.id}/acceptance/${stageId}/items/${item.id}/reject`, {
        rejection_reason: 'Không đạt yêu cầu kỹ thuật'
      }, {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => message.success('Đã từ chối hạng mục')
      })
    }
  })
}

const approveAllItems = () => {
  if (!acceptDetailStage.value) return
  const stageId = acceptDetailStage.value.id
  Modal.confirm({
    title: 'Duyệt tất cả hạng mục?',
    content: `Duyệt nhanh toàn bộ hạng mục trong giai đoạn "${acceptDetailStage.value.name}"?`,
    onOk: () => {
      router.post(`/projects/${props.project.id}/acceptance/${stageId}/approve-all`, {}, {
        preserveState: true,
        preserveScroll: true,
        onSuccess: () => message.success('Đã duyệt tất cả hạng mục')
      })
    }
  })
}

const rejectAcceptDrawer = () => {
  if (!acceptDetailStage.value) return
  Modal.confirm({
    title: 'Từ chối giai đoạn nghiệm thu?',
    content: 'Vui lòng xác nhận từ chối giai đoạn này.',
    okText: 'Từ chối',
    okType: 'danger',
    onOk: () => {
      router.post(`/approvals/acceptance-supervisor/${acceptDetailStage.value.id}/reject`, { reason: 'Từ chối từ chi tiết dự án' }, {
        onSuccess: () => {
          message.warning('Đã từ chối giai đoạn')
          showAcceptDetailDrawer.value = false
        }
      })
    }
  })
}

// Edit acceptance
const showEditAcceptModal = ref(false)
const editAcceptForm = ref({ name: '', description: '', task_id: null, acceptance_template_id: null, order: null })
const editingAcceptId = ref(null)
const openEditAcceptModal = (stage) => {
  editingAcceptId.value = stage.id
  editAcceptForm.value = {
    name: stage.name || '',
    description: stage.description || '',
    task_id: stage.task_id || null,
    acceptance_template_id: stage.acceptance_template_id || null,
    order: stage.order || null,
  }
  showEditAcceptModal.value = true
}
const updateAccept = () => {
  router.put(`/projects/${props.project.id}/acceptance/${editingAcceptId.value}`, editAcceptForm.value, savingOptions({
    onSuccess: () => { showEditAcceptModal.value = false }
  }))
}

// Acceptance status helpers
const acceptStatusColors = {
  pending: 'orange', supervisor_approved: 'blue', project_manager_approved: 'cyan',
  customer_approved: 'green', owner_approved: 'purple', design_approved: 'geekblue',
  internal_approved: 'gold', rejected: 'red',
}
const getAcceptIconClass = (status) => {
  if (!status) return 'bg-gray-100'
  if (status.includes('approved')) return 'bg-emerald-100 text-emerald-600'
  if (status === 'rejected') return 'bg-red-100 text-red-600'
  return 'bg-orange-100 text-orange-600'
}
const getAcceptability = (stage) => {
  // 1. Stage phải đạt ít nhất customer_approved
  const approvedStatuses = ['customer_approved', 'design_approved', 'owner_approved']
  const isFullyApproved = approvedStatuses.includes(stage.status)

  // 2. No open or in-progress defects
  const hasOpenDefects = (stage.defects || []).some(d => d.status === 'open' || d.status === 'in_progress')

  // 3. All checklist items must be customer_approved (if items exist)
  const items = stage.items || []
  const allItemsApproved = items.length === 0 || items.every(i => i.workflow_status === 'customer_approved')

  return (isFullyApproved && !hasOpenDefects && allItemsApproved) ? 'acceptable' : 'not_acceptable'
}
const getAcceptCompletion = (stage) => {
  const items = stage.items || []
  const total = items.length
  const approved = items.filter(i => i.workflow_status === 'customer_approved').length
  return { total, approved, percent: total > 0 ? Math.round((approved / total) * 100) : 0 }
}
const getOpenDefects = (stage) => {
  return (stage.defects || []).filter(d => d.status !== 'verified').length
}
const acceptItemStatusColor = (status) => ({ draft: 'default', pending: 'default', submitted: 'processing', supervisor_approved: 'cyan', project_manager_approved: 'blue', customer_approved: 'success', rejected: 'error' }[status] || 'default')
const acceptItemStatusLabel = (status) => ({ draft: 'Nháp', pending: 'Chờ duyệt', submitted: 'Chờ GS duyệt', supervisor_approved: 'Chờ PM duyệt', project_manager_approved: 'Chờ KH duyệt', customer_approved: 'KH đã duyệt', rejected: 'Từ chối' }[status] || status)

// ============ ACCEPTANCE DETAIL DRAWER (Giống APP: "Nghiệm thu giai đoạn") ============
const showAcceptDetailDrawer = ref(false)
const acceptDetailStage = ref(null)
const acceptDetailTemplateId = ref(null)
const acceptDetailDefects = ref([])
const showCreateDefectInDrawer = ref(false)
const newAcceptDefect = ref({ description: '', severity: 'medium' })
const newAcceptDefectFiles = ref([])
const creatingDefect = ref(false)
const savingAcceptDetail = ref(false)

const acceptDetailSelectedTemplate = computed(() => {
  if (!acceptDetailTemplateId.value) return null
  return (props.acceptanceTemplates || []).find(t => t.id === acceptDetailTemplateId.value)
})

const openAcceptDetailModal = (stage) => {
  acceptDetailStage.value = stage
  acceptDetailTemplateId.value = stage.acceptance_template_id || null
  acceptDetailDefects.value = stage.defects || []
  showCreateDefectInDrawer.value = false
  newAcceptDefect.value = { description: '', severity: 'medium' }
  newAcceptDefectFiles.value = []
  showAcceptDetailDrawer.value = true
}

const onAcceptDetailTemplateChange = (val) => {
  acceptDetailTemplateId.value = val
}

const createDefectFromDrawer = () => {
  if (!newAcceptDefect.value.description?.trim()) return
  creatingDefect.value = true
  const formData = new FormData()
  formData.append('description', newAcceptDefect.value.description)
  formData.append('severity', newAcceptDefect.value.severity)
  formData.append('status', 'open')
  formData.append('defect_type', 'acceptance')
  formData.append('acceptance_stage_id', acceptDetailStage.value.id)
  if (acceptDetailStage.value.task_id) formData.append('task_id', acceptDetailStage.value.task_id)
  // Attach files
  newAcceptDefectFiles.value.forEach(f => formData.append('files[]', f.file))
  router.post(`/projects/${props.project.id}/defects`, formData, {
    forceFormData: true,
    onSuccess: () => {
      showCreateDefectInDrawer.value = false
      newAcceptDefect.value = { description: '', severity: 'medium' }
      newAcceptDefectFiles.value = []
      showAcceptDetailDrawer.value = false
    },
    onFinish: () => { creatingDefect.value = false },
  })
}

// Select files for defect
const onDefectFileSelect = (event) => {
  const files = event.target.files
  if (!files?.length) return
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const entry = { file, preview: null }
    if (file.type.startsWith('image/')) {
      entry.preview = URL.createObjectURL(file)
    }
    newAcceptDefectFiles.value.push(entry)
  }
  event.target.value = ''
}

// Navigate to defect in Defects tab
const goToDefect = (defect) => {
  showAcceptDetailDrawer.value = false
  activeTab.value = 'defects'
}

const saveAcceptDetail = () => {
  if (!acceptDetailStage.value) return
  savingAcceptDetail.value = true
  router.put(`/projects/${props.project.id}/acceptance/${acceptDetailStage.value.id}`, {
    acceptance_template_id: acceptDetailTemplateId.value,
  }, {
    onSuccess: () => { showAcceptDetailDrawer.value = false },
    onFinish: () => { savingAcceptDetail.value = false },
  })
}

// Upload files to acceptance stage (With Before/After types)
const uploadAcceptStageFiles = (event, type = null) => {
  const files = event.target.files
  if (!files?.length || !acceptDetailStage.value) return
  const formData = new FormData()
  for (let i = 0; i < files.length; i++) {
    formData.append('files[]', files[i])
  }
  if (type) formData.append('type', type)

  router.post(`/projects/${props.project.id}/acceptance/${acceptDetailStage.value.id}/attach-files`, formData, {
    forceFormData: true,
    preserveScroll: true,
    onSuccess: () => {
      message.success(`Đã đính kèm hình ảnh ${type === 'before' ? 'Trước' : type === 'after' ? 'Sau' : ''} nghiệm thu.`)
    }
  })
  event.target.value = ''
}

// ============ ACCEPTANCE ITEM WORKFLOW (matching APP AcceptanceItemController) ============
const showAddAcceptItem = ref(false)
const newAcceptItem = ref({ name: '', start_date: null, end_date: null, task_id: null, notes: '' })
const creatingAcceptItem = ref(false)

// Reject item modal
const showRejectAcceptItemModal = ref(false)
const rejectingAcceptItem = ref(null)
const rejectAcceptItemReason = ref('')

// Edit item modal
const showEditAcceptItemModal = ref(false)
const editingAcceptItemData = ref(null)
const editAcceptItemForm = ref({ name: '', start_date: null, end_date: null, notes: '' })
const editingAcceptItemLoading = ref(false)

// Workflow step progress helper
const getStepState = (currentStatus, stepKey) => {
  const steps = ['submitted', 'supervisor_approved', 'project_manager_approved', 'customer_approved']
  const currentIdx = steps.indexOf(currentStatus)
  const stepIdx = steps.indexOf(stepKey)

  // Handle pm_approved alias
  if (currentStatus === 'pm_approved') {
    const aliasIdx = steps.indexOf('project_manager_approved')
    if (stepIdx < aliasIdx) return 'done'
    if (stepIdx === aliasIdx) return 'done'
    return 'pending'
  }

  if (currentStatus === 'rejected' || currentStatus === 'draft' || !currentStatus) return 'pending'
  if (stepIdx < currentIdx) return 'done'
  if (stepIdx === currentIdx) return 'done'
  if (stepIdx === currentIdx + 1) return 'current'
  return 'pending'
}

// Create acceptance item
const createAcceptItem = () => {
  if (!newAcceptItem.value.name?.trim() || !newAcceptItem.value.start_date || !newAcceptItem.value.end_date) return
  creatingAcceptItem.value = true
  const stageId = acceptDetailStage.value.id
  router.post(`/projects/${props.project.id}/acceptance/${stageId}/items`, {
    name: newAcceptItem.value.name,
    start_date: newAcceptItem.value.start_date,
    end_date: newAcceptItem.value.end_date,
    task_id: newAcceptItem.value.task_id,
    notes: newAcceptItem.value.notes,
  }, {
    preserveScroll: true,
    onSuccess: () => {
      showAddAcceptItem.value = false
      newAcceptItem.value = { name: '', start_date: null, end_date: null, task_id: null, notes: '' }
      showAcceptDetailDrawer.value = false // close to refresh data
    },
    onFinish: () => { creatingAcceptItem.value = false },
  })
}

// Edit acceptance item
const editAcceptItem = (item) => {
  editingAcceptItemData.value = item
  editAcceptItemForm.value = {
    name: item.name || '',
    start_date: item.start_date ? dayjs(item.start_date).format('YYYY-MM-DD') : null,
    end_date: item.end_date ? dayjs(item.end_date).format('YYYY-MM-DD') : null,
    notes: item.notes || '',
  }
  showEditAcceptItemModal.value = true
}

const updateAcceptItemData = () => {
  if (!editingAcceptItemData.value || !editAcceptItemForm.value.name?.trim()) return
  editingAcceptItemLoading.value = true
  const stageId = acceptDetailStage.value.id
  router.put(`/projects/${props.project.id}/acceptance/${stageId}/items/${editingAcceptItemData.value.id}`, editAcceptItemForm.value, {
    preserveScroll: true,
    onSuccess: () => {
      showEditAcceptItemModal.value = false
      showAcceptDetailDrawer.value = false // close to refresh
    },
    onFinish: () => { editingAcceptItemLoading.value = false },
  })
}

// Delete acceptance item
const deleteAcceptItem = (item) => {
  if (!confirm(`Xóa hạng mục "${item.name}"?`)) return
  const stageId = acceptDetailStage.value.id
  router.delete(`/projects/${props.project.id}/acceptance/${stageId}/items/${item.id}`, {
    preserveScroll: true,
    onSuccess: () => { showAcceptDetailDrawer.value = false },
  })
}

// Submit for approval (draft/rejected → submitted)
const submitAcceptItem = (item) => {
  const stageId = acceptDetailStage.value.id
  router.post(`/projects/${props.project.id}/acceptance/${stageId}/items/${item.id}/submit`, {}, {
    preserveScroll: true,
    onSuccess: () => { showAcceptDetailDrawer.value = false },
  })
}

// Supervisor approve (submitted → supervisor_approved)
const approveAcceptItemSupervisor = (item) => {
  const stageId = acceptDetailStage.value.id
  router.post(`/projects/${props.project.id}/acceptance/${stageId}/items/${item.id}/approve-supervisor`, {}, {
    preserveScroll: true,
    onSuccess: () => { showAcceptDetailDrawer.value = false },
  })
}

// PM approve (supervisor_approved → project_manager_approved)
const approveAcceptItemPM = (item) => {
  const stageId = acceptDetailStage.value.id
  router.post(`/projects/${props.project.id}/acceptance/${stageId}/items/${item.id}/approve-pm`, {}, {
    preserveScroll: true,
    onSuccess: () => { showAcceptDetailDrawer.value = false },
  })
}

// Customer approve (project_manager_approved → customer_approved)
const approveAcceptItemCustomer = (item) => {
  const stageId = acceptDetailStage.value.id
  router.post(`/projects/${props.project.id}/acceptance/${stageId}/items/${item.id}/approve-customer`, {}, {
    preserveScroll: true,
    onSuccess: () => { showAcceptDetailDrawer.value = false },
  })
}

// Reject item (opens modal)
const openRejectAcceptItemModal = (item) => {
  rejectingAcceptItem.value = item
  rejectAcceptItemReason.value = ''
  showRejectAcceptItemModal.value = true
}

const confirmRejectAcceptItem = () => {
  if (!rejectingAcceptItem.value || !rejectAcceptItemReason.value.trim()) return
  const stageId = acceptDetailStage.value.id
  router.post(`/projects/${props.project.id}/acceptance/${stageId}/items/${rejectingAcceptItem.value.id}/reject`, {
    rejection_reason: rejectAcceptItemReason.value,
  }, {
    preserveScroll: true,
    onSuccess: () => {
      showRejectAcceptItemModal.value = false
      showAcceptDetailDrawer.value = false // close to refresh
    },
  })
}

const revertAcceptItemAction = (stage, item) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Hạng mục này sẽ được đưa về trạng thái Nháp để bạn có thể chỉnh sửa hoặc xóa. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => {
      router.post(`/projects/${props.project.id}/acceptance/${stage.id}/items/${item.id}/revert`, {}, {
        preserveScroll: true,
        onSuccess: () => { 
          if (showAcceptDetailDrawer.value) showAcceptDetailDrawer.value = false 
        },
      })
    }
  })
}

// Upload photos for acceptance item
const uploadAcceptItemPhotos = (item, event) => {
  const files = event.target.files
  if (!files?.length) return
  const stageId = acceptDetailStage.value.id
  const formData = new FormData()
  for (let i = 0; i < files.length; i++) {
    formData.append('files[]', files[i])
  }
  router.post(`/projects/${props.project.id}/acceptance/${stageId}/items/${item.id}/attach-files`, formData, {
    forceFormData: true,
    preserveScroll: true,
    onSuccess: () => { showAcceptDetailDrawer.value = false },
  })
  // Clear input
  event.target.value = ''
}


// ============ DOCUMENT CRUD ============
const showDocUploadModal = ref(false)
const fileInput = ref(null)
const docUploadForm = ref({ file: null, description: '' })
const onDocFileChange = (e) => { docUploadForm.value.file = e.target.files[0] || null }
const uploadDoc = () => {
  const formData = new FormData()
  formData.append('file', docUploadForm.value.file)
  if (docUploadForm.value.description) formData.append('description', docUploadForm.value.description)
  router.post(`/projects/${props.project.id}/documents`, formData, {
    forceFormData: true,
    onSuccess: () => { showDocUploadModal.value = false; docUploadForm.value = { file: null, description: '' } }
  })
}
const showDocEditModal = ref(false)
const editingDoc = ref(null)
const docEditForm = ref({ description: '' })
const openEditDocModal = (doc) => { editingDoc.value = doc; docEditForm.value = { description: doc.description || '' }; showDocEditModal.value = true }
const updateDoc = () => { router.put(`/projects/${props.project.id}/documents/${editingDoc.value.id}`, docEditForm.value, { onSuccess: () => showDocEditModal.value = false }) }
const deleteDoc = (doc) => router.delete(`/projects/${props.project.id}/documents/${doc.id}`)

// ============ ATTENDANCE TAB STATE ============
const attendanceView = ref('list')
const attendanceDate = ref(null)
const attendanceList = ref([])
const attendanceSummary = ref(null)
const attendanceByUser = ref([])
const shiftsList = ref([])
const showAttendanceModal = ref(false)
const showShiftModal = ref(false)
const showAttendanceDetailDrawer = ref(false)
const selectedAttendance = ref(null)

const attendanceStatusColors = { present: 'green', absent: 'red', late: 'orange', half_day: 'blue', leave: 'purple', holiday: 'pink' }
const attendanceStatusLabels = { present: 'Có mặt', absent: 'Vắng', late: 'Trễ', half_day: 'Nửa ngày', leave: 'Nghỉ phép', holiday: 'Nghỉ lễ' }

const attendanceCols = [
  { title: 'Nhân viên', key: 'user', width: 180 },
  { title: 'Ngày', key: 'date', width: 100, align: 'center' },
  { title: 'Vào', key: 'check_in', width: 70, align: 'center' },
  { title: 'Ra', key: 'check_out', width: 70, align: 'center' },
  { title: 'Giờ làm', key: 'hours', width: 90, align: 'center' },
  { title: 'Tăng ca', key: 'overtime', width: 80, align: 'center' },
  { title: 'Trạng thái', key: 'status', width: 95, align: 'center' },
  { title: 'Duyệt', key: 'workflow', width: 95, align: 'center' },
]

const workflowAttColors = { draft: 'default', submitted: 'orange', approved: 'green', rejected: 'red' }
const workflowAttLabels = { draft: 'Nháp', submitted: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' }

// Reject attendance in project tab
const showRejectAttModal = ref(false)
const rejectAttId = ref(null)
const rejectAttReason = ref('')

const openRejectAtt = (id) => {
  rejectAttId.value = id
  rejectAttReason.value = ''
  showRejectAttModal.value = true
}

const rejectAttendance = async () => {
  if (!rejectAttReason.value.trim()) { message.warning('Vui lòng nhập lý do từ chối'); return }
  try {
    await axios.post(`/projects/${props.project.id}/attendance/${rejectAttId.value}/reject`, { reason: rejectAttReason.value })
    message.success('Đã từ chối bản ghi chấm công')
    showRejectAttModal.value = false
    loadAttendanceData()
  } catch (e) { message.error('Lỗi từ chối chấm công') }
}

const loadAttendanceData = async () => {
  try {
    const params = { project_id: props.project.id }
    if (attendanceDate.value) {
      params.year = attendanceDate.value.year()
      params.month = attendanceDate.value.month() + 1
    }
    const res = await axios.get(`/projects/${props.project.id}/attendance`, { params })
    attendanceList.value = res.data?.data || res.data || []
    // Also load stats
    loadAttendanceStats()
  } catch (e) { console.error('Load attendance:', e) }
}

const loadAttendanceStats = async () => {
  try {
    const now = new Date()
    const params = {
      year: attendanceDate.value?.year() || now.getFullYear(),
      month: (attendanceDate.value?.month() + 1) || (now.getMonth() + 1),
      project_id: props.project.id,
    }
    const res = await axios.get(`/projects/${props.project.id}/attendance/statistics`, { params })
    attendanceSummary.value = res.data?.summary || null
    attendanceByUser.value = res.data?.by_user || []
  } catch (e) { console.error('Load attendance stats:', e) }
}

const approveAttendance = async (id) => {
  try {
    await axios.post(`/projects/${props.project.id}/attendance/${id}/approve`)
    message.success('Đã phê duyệt bản ghi chấm công')
    loadAttendanceData()
  } catch (e) { message.error('Lỗi duyệt chấm công') }
}

const openAttendanceDetail = (record) => {
  selectedAttendance.value = record
  showAttendanceDetailDrawer.value = true
}

const loadShifts = async () => {
  try {
    const res = await axios.get(`/projects/${props.project.id}/shifts`)
    shiftsList.value = res.data || []
  } catch (e) { console.error('Load shifts:', e) }
}

// ============ GENERATE LABOR COSTS ============
const showGenerateLaborCostModal = ref(false)
const generatingLaborCosts = ref(false)
const laborCostResult = ref(null)
const laborCostForm = ref({
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
})

const submitGenerateLaborCosts = async () => {
  generatingLaborCosts.value = true
  laborCostResult.value = null
  try {
    const res = await axios.post(`/projects/${props.project.id}/attendance/generate-labor-costs`, laborCostForm.value)
    laborCostResult.value = res.data?.data || res.data
    if (res.data?.data?.created > 0) {
      message.success(res.data.message)
    } else {
      message.info(res.data.message || 'Không có chi phí mới được tạo')
    }
  } catch (e) {
    message.error(e.response?.data?.message || 'Lỗi tổng hợp chi phí nhân công')
  } finally {
    generatingLaborCosts.value = false
  }
}

// ============ LABOR PRODUCTIVITY TAB STATE ============
const laborView = ref('dashboard')
const laborDashboard = ref(null)
const laborRecords = ref([])
const showLaborModal = ref(false)

const laborRecordCols = [
  { title: 'Hạng mục', key: 'work_item', width: 200 },
  { title: 'KH', key: 'planned', width: 100, align: 'center' },
  { title: 'Thực tế', key: 'actual', width: 100, align: 'center' },
  { title: 'Hiệu suất', key: 'efficiency', width: 90, align: 'center' },
  { title: 'Năng suất', key: 'productivity', width: 130 },
  { title: 'Nhân công', key: 'workers', width: 120, align: 'center' },
  { title: '', key: 'actions', width: 50 },
]

const laborItemCols = [
  { title: 'Hạng mục', dataIndex: 'work_item', key: 'work_item' },
  { title: 'Đơn vị', dataIndex: 'unit', key: 'unit', width: 70, align: 'center' },
  { title: 'KH', key: 'planned', width: 100, align: 'right' },
  { title: 'Thực tế', key: 'actual', width: 100, align: 'right' },
  { title: 'Hiệu suất', key: 'efficiency', width: 100, align: 'center' },
]

const loadLaborDashboard = async () => {
  try {
    const res = await axios.get(`/projects/${props.project.id}/labor-productivity/dashboard`)
    laborDashboard.value = res.data || null
  } catch (e) { console.error('Load labor dashboard:', e) }
}

const loadLaborRecords = async () => {
  try {
    const res = await axios.get(`/projects/${props.project.id}/labor-productivity`)
    laborRecords.value = res.data?.data || res.data || []
  } catch (e) { console.error('Load labor records:', e) }
}

const deleteLaborRecord = async (id) => {
  try {
    await axios.delete(`/projects/${props.project.id}/labor-productivity/${id}`)
    message.success('Đã xóa')
    loadLaborRecords()
    loadLaborDashboard()
  } catch (e) { message.error('Lỗi xóa') }
}

// ---- Attendance / Shift / Labor FORM STATE ----
const filterOption = (input, option) => (option?.children || option?.label || '').toString().toLowerCase().includes(input.toLowerCase())
const attendanceSaving = ref(false)
const shiftSaving = ref(false)
const laborSaving = ref(false)

const attendanceForm = ref({
  user_id: null, work_date: null, check_in: null, check_out: null,
  status: 'present', overtime_hours: 0, note: '',
})
const shiftForm = ref({
  name: '', start_time: null, end_time: null,
  break_hours: 1, overtime_multiplier: 1.5, is_overtime_shift: false,
})
const laborForm = ref({
  work_item: '', user_id: null, unit: 'm²', planned_quantity: null, actual_quantity: null,
  workers_count: 1, hours_spent: 8, record_date: null, note: '',
})

const submitManualAttendance = async () => {
  if (!attendanceForm.value.user_id || !attendanceForm.value.work_date) {
    return message.warning('Vui lòng chọn nhân viên và ngày')
  }
  try {
    attendanceSaving.value = true
    const res = await axios.post(`/projects/${props.project.id}/attendance`, {
      ...attendanceForm.value,
      project_id: props.project.id,
      check_in_method: 'manual',
    })
    message.success(res.data?.message || 'Đã chấm công thủ công')
    showAttendanceModal.value = false
    attendanceForm.value = { user_id: null, work_date: null, check_in: null, check_out: null, status: 'present', overtime_hours: 0, note: '' }
    loadAttendanceData()
  } catch (e) {
    console.error('Attendance error:', e)
    const errorMsg = e.response?.data?.message || e.message || 'Lỗi chấm công'
    message.error(errorMsg)
    if (e.response?.data?.errors) {
      Object.values(e.response.data.errors).flat().forEach(err => message.error(err))
    }
  } finally { attendanceSaving.value = false }
}

const submitShift = async () => {
  if (!shiftForm.value.name || !shiftForm.value.start_time || !shiftForm.value.end_time) {
    return message.warning('Vui lòng nhập tên ca và giờ')
  }
  try {
    shiftSaving.value = true
    await axios.post(`/projects/${props.project.id}/shifts`, shiftForm.value)
    message.success('Đã tạo ca làm việc')
    showShiftModal.value = false
    shiftForm.value = { name: '', start_time: null, end_time: null, break_hours: 1, overtime_multiplier: 1.5, is_overtime_shift: false }
    loadShifts()
  } catch (e) {
    console.error('Shift error:', e)
    const errorMsg = e.response?.data?.message || e.message || 'Lỗi tạo ca'
    message.error(errorMsg)
    if (e.response?.data?.errors) {
      Object.values(e.response.data.errors).flat().forEach(err => message.error(err))
    }
  } finally { shiftSaving.value = false }
}

const submitLaborRecord = async () => {
  if (!laborForm.value.work_item || !laborForm.value.planned_quantity || !laborForm.value.actual_quantity) {
    return message.warning('Vui lòng nhập đầy đủ thông tin')
  }
  try {
    laborSaving.value = true
    const res = await axios.post(`/projects/${props.project.id}/labor-productivity`, laborForm.value)
    message.success(res.data?.message || 'Đã ghi nhận năng suất')
    showLaborModal.value = false
    laborForm.value = { work_item: '', user_id: null, unit: 'm²', planned_quantity: null, actual_quantity: null, workers_count: 1, hours_spent: 8, record_date: dayjs().format('YYYY-MM-DD'), note: '' }
    loadLaborDashboard()
    loadLaborRecords()
  } catch (e) {
    console.error('Labor error:', e)
    const errorMsg = e.response?.data?.message || e.message || 'Lỗi ghi nhận'
    message.error(errorMsg)
    if (e.response?.data?.errors) {
      Object.values(e.response.data.errors).flat().forEach(err => message.error(err))
    }
  }
  finally { laborSaving.value = false }
}

// Attendance and Labor logic moved to main activeTab watcher

// ============ MATERIALS TAB — Bill-based tracking (Giống APP) ============
const fmtQty = (v) => new Intl.NumberFormat('vi-VN').format(v)
const totalBillAmount = computed(() => (materialBills.value).reduce((s, b) => s + Number(b.total_amount || 0), 0))

const billCols = [
  { title: 'Mã phiếu', key: 'bill_number', width: 130 },
  { title: 'Nhà cung cấp', key: 'supplier' },
  { title: 'Nhóm vật tư', key: 'material_group', width: 150 },
  { title: 'Mặt hàng', key: 'items_count', width: 100, align: 'center' },
  { title: 'Tổng tiền', key: 'total', width: 150, align: 'right' },
  { title: 'Trạng thái', key: 'status', width: 140, align: 'center' },
]

const billStatusLabel = (s) => ({
  draft: 'Nháp', pending_management: 'Chờ BĐH', pending_accountant: 'Chờ KT', approved: 'Đã duyệt', rejected: 'Từ chối'
}[s] || s)
const billStatusColor = (s) => ({
  draft: 'default', pending_management: 'processing', pending_accountant: 'warning', approved: 'success', rejected: 'error'
}[s] || 'default')

const getMaterialGroups = (bill) => {
  if (!bill.items?.length) return '—'
  const groups = bill.items
    .map(item => item.material?.group?.name || item.material?.material_group?.name || '')
    .filter((v, i, a) => v && a.indexOf(v) === i)
  return groups.length ? groups.join(', ') : '—'
}

const billExpandedRow = () => null // handled in template

// ---- Sync Material Bill Costs (retroactive fix) ----
const syncingMaterialCosts = ref(false)
const syncMaterialBillCosts = () => {
  syncingMaterialCosts.value = true
  router.post(`/projects/${props.project.id}/material-bills/sync-costs`, {}, {
    preserveScroll: true,
    onFinish: () => { syncingMaterialCosts.value = false },
  })
}

// ---- Bill Creation Modal ----
const showBillModal = ref(false)
const submittingBill = ref(false)
const billFiles = ref([])
const billForm = ref({ bill_date: dayjs().format('YYYY-MM-DD'), supplier_id: null, cost_group_id: 2, notes: '', items: [], deleted_attachment_ids: [] })
const billItemForm = ref({ material_id: null, quantity: 1, unit_price: 0, total_price: 0 })

const isEditBill = ref(false)
const editingBillId = ref(null)
const attachTargetForBill = ref(null)

const toggleBillAttachmentDeletion = (id) => {
  if (billForm.value.deleted_attachment_ids.includes(id)) {
    billForm.value.deleted_attachment_ids = billForm.value.deleted_attachment_ids.filter(x => x !== id)
  } else {
    billForm.value.deleted_attachment_ids.push(id)
  }
}

const openBillModal = (record = null) => {
  isEditBill.value = !!record
  editingBillId.value = record?.id || null
  attachTargetForBill.value = record
  billFiles.value = []
  
  if (record) {
    billForm.value = {
      bill_date: dayjs(record.bill_date).format('YYYY-MM-DD'),
      supplier_id: record.supplier_id,
      cost_group_id: record.cost_group_id,
      notes: record.notes || '',
      items: (record.items || []).map(i => ({
        material_id: i.material_id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        _name: i.material?.name || '—',
        _unit: i.material?.unit || ''
      })),
      deleted_attachment_ids: []
    }
  } else {
    billForm.value = { bill_date: dayjs().format('YYYY-MM-DD'), supplier_id: null, cost_group_id: 2, notes: '', items: [], deleted_attachment_ids: [] }
  }
  billItemForm.value = { material_id: null, quantity: 1, unit_price: 0, total_price: 0 }
  showBillModal.value = true
}

const onBillMaterialSelect = (id) => {
  const m = (props.materials || []).find(x => x.id === id)
  if (m && m.unit_price) {
    billItemForm.value.unit_price = m.unit_price
    billItemForm.value.total_price = billItemForm.value.quantity * m.unit_price
  }
}

const calcBillItemTotal = () => {
  billItemForm.value.total_price = (billItemForm.value.quantity || 0) * (billItemForm.value.unit_price || 0)
}

const addBillItem = () => {
  const m = (props.materials || []).find(x => x.id === billItemForm.value.material_id)
  if (!m) return
  billForm.value.items.push({
    material_id: m.id,
    quantity: billItemForm.value.quantity,
    unit_price: billItemForm.value.unit_price,
    _name: m.name,
    _unit: m.unit || '',
  })
  billItemForm.value = { material_id: null, quantity: 1, unit_price: 0, total_price: 0 }
}

const submitBillForm = () => {
  if (!billForm.value.items.length || !billForm.value.bill_date) return
  submittingBill.value = true
  
  const fd = new FormData()
  appendFormEntries(fd, billForm.value)

  if (billFiles.value.length) {
    billFiles.value.forEach(f => fd.append('files[]', f))
  }

  const url = isEditBill.value 
    ? `/projects/${props.project.id}/material-bills/${editingBillId.value}`
    : `/projects/${props.project.id}/material-bills`

  if (isEditBill.value) fd.append('_method', 'PUT')

  router.post(url, fd, {
    onSuccess: () => { 
      showBillModal.value = false
      billFiles.value = []
      // Update drawer if open
      if (materialDetail.value) {
        const updated = props.project.material_bills?.find(x => x.id === materialDetail.value.id)
        if (updated) materialDetail.value = updated
      }
      clearFormErrors()
    },
    onError: (errors) => {
      Object.assign(formErrors, errors)
      showValidationErrors(errors)
    },
    onFinish: () => { submittingBill.value = false },
    forceFormData: true
  })
}

// ---- Bill Workflow Actions ----
const submitBill = (bill) => {
  router.post(`/projects/${props.project.id}/material-bills/${bill.id}/submit`, {}, { preserveScroll: true })
}

const approveBillManagement = (bill) => {
  router.post(`/projects/${props.project.id}/material-bills/${bill.id}/approve-management`, {}, { preserveScroll: true })
}

const showConfirmPaymentModal = ref(false)
const confirmPaymentType = ref('') // 'material' or 'sub'
const confirmPaymentTarget = ref(null)
const confirmPaymentSub = ref(null) // Only for sub
const confirmPaymentBudgetItem = ref(null)

const approveBillAccountant = (bill) => {
  if (!bill.attachments?.length && !(bill.attachments_count > 0)) {
    return Modal.warning({
      title: 'Thiếu chứng từ',
      content: 'Kế toán chỉ có thể xác nhận khi đã có tệp chứng từ đính kèm để đối chiếu.'
    })
  }
  confirmPaymentType.value = 'material'
  confirmPaymentTarget.value = bill
  confirmPaymentBudgetItem.value = bill.budget_item_id || null
  showConfirmPaymentModal.value = true
}

const confirmSubPayment = (sub, p) => {
  if (!p.attachments?.length && !(p.attachments_count > 0)) {
    return Modal.warning({
      title: 'Thiếu chứng từ',
      content: 'Kế toán chỉ có thể xác nhận khi đã có tệp chứng từ đính kèm để đối chiếu.'
    })
  }
  confirmPaymentType.value = 'sub'
  confirmPaymentTarget.value = p
  confirmPaymentSub.value = sub
  confirmPaymentBudgetItem.value = p.budget_item_id || null
  showConfirmPaymentModal.value = true
}

const confirmApprovePayment = () => {
  if (confirmPaymentType.value === 'material') {
    router.post(`/projects/${props.project.id}/material-bills/${confirmPaymentTarget.value.id}/approve-accountant`, {
      budget_item_id: confirmPaymentBudgetItem.value
    }, {
      onSuccess: () => {
        showConfirmPaymentModal.value = false
        materialDetail.value = null
        showMaterialDetailDrawer.value = false
        message.success('Đã xác nhận thanh toán và ghi nhận ngân sách')
      }
    })
  } else if (confirmPaymentType.value === 'sub') {
    router.post(`/projects/${props.project.id}/subcontractors/${confirmPaymentSub.value.id}/payments/${confirmPaymentTarget.value.id}/confirm`, {
      budget_item_id: confirmPaymentBudgetItem.value
    }, {
      onSuccess: () => {
        showConfirmPaymentModal.value = false
        message.success('Đã xác nhận thanh toán thầu phụ')
      }
    })
  }
}

const deleteBill = (bill) => {
  router.delete(`/projects/${props.project.id}/material-bills/${bill.id}`, { preserveScroll: true })
}

// ---- Reject Bill ----
const showRejectBillModal = ref(false)
const rejectBillReason = ref('')
const rejectingBill = ref(null)

const openRejectBillModal = (bill) => {
  rejectingBill.value = bill
  rejectBillReason.value = ''
  showRejectBillModal.value = true
}

const confirmRejectBill = () => {
  if (!rejectingBill.value || !rejectBillReason.value.trim()) return
  router.post(`/projects/${props.project.id}/material-bills/${rejectingBill.value.id}/reject`, {
    rejected_reason: rejectBillReason.value,
  }, {
    preserveScroll: true,
    onSuccess: () => { showRejectBillModal.value = false },
  })
}

// Keep old refs for backward compatibility (won't break anything)
const showMaterialModal = ref(false)
const materialBatchItems = ref([])
const submittingMaterial = ref(false)
const matForm = ref({ material_id: null, quantity: 1, unit_price: 0, amount: 0, notes: '', transaction_date: dayjs().format('YYYY-MM-DD'), cost_group_id: null })
const matFormSelected = computed(() => (props.materials || []).find(m => m.id === matForm.value.material_id))
const totalMaterialCost = computed(() => 0)
const materialCols = []


// ============ EQUIPMENT TAB — 3 Sub-tabs (Giống APP) ============
const eqStatusLabel = (s) => ({ available: 'Sẵn sàng', in_use: 'Đang dùng', maintenance: 'Bảo trì', retired: 'Ngừng dùng' }[s] || s)
const eqStatusColor = (s) => ({ available: 'green', in_use: 'blue', maintenance: 'orange', retired: 'default' }[s] || 'default')
const eqTypeLabel = (t) => ({ owned: 'Có sẵn', rented: 'Thuê', leased: 'Thuê dài hạn' }[t] || t)

const eqWorkflowLabel = (s) => ({ draft: 'Nháp', pending_management: 'Chờ BĐH', pending_accountant: 'Chờ KT', completed: 'Hoàn tất', in_use: 'Đang dùng', pending_return: 'Chờ xác nhận trả', returned: 'Đã hoàn trả', rejected: 'Từ chối' }[s] || s)
const eqWorkflowColor = (s) => ({ draft: 'default', pending_management: 'orange', pending_accountant: 'blue', completed: 'green', in_use: 'geekblue', pending_return: 'purple', returned: 'cyan', rejected: 'red' }[s] || 'default')

const usageStatusLabel = (s) => ({ draft: 'Nháp', pending_management: 'Chờ BĐH', pending_accountant: 'Chờ KT', approved: 'Đã duyệt', in_use: 'Đang dùng', pending_return: 'Chờ trả', returned: 'Đã trả', rejected: 'Từ chối', pending_receive: 'Chờ nhận' }[s] || s)
const usageStatusColor = (s) => ({ draft: 'default', pending_management: 'orange', pending_accountant: 'blue', approved: 'cyan', in_use: 'geekblue', pending_return: 'purple', returned: 'green', rejected: 'red', pending_receive: 'orange' }[s] || 'default')

const eqSubTab = ref('rental')
const rejectReason = ref('')

const totalEquipmentCount = computed(() =>
  (equipmentRentals.value?.length || 0) + (assetUsages.value?.length || 0)
)

// Column definitions
const rentalCols = [
  { title: 'Thiết bị', key: 'equipment_name', dataIndex: 'equipment_name' },
  { title: 'Thời gian thuê', key: 'period', width: 200 },
  { title: 'Chi phí', key: 'total_cost', width: 140, align: 'right' },
  { title: 'Trạng thái', key: 'status', width: 130, align: 'center' },
]

const purchaseCols = [
  { title: 'Mã phiếu', key: 'id', width: 100 },
  { title: 'Danh sách thiết bị', key: 'items' },
  { title: 'Tổng tiền', key: 'total_amount', width: 140, align: 'right' },
  { title: 'Trạng thái', key: 'status', width: 130, align: 'center' },
]

const usageCols = [
  { title: 'Thiết bị', key: 'asset' },
  { title: 'Người nhận', key: 'receiver', width: 140 },
  { title: 'SL', key: 'quantity', width: 60, align: 'center' },
  { title: 'Thời gian', key: 'dates', width: 160 },
  { title: 'Trạng thái', key: 'status', width: 130, align: 'center' },
]

// ---- RENTAL ----
const showRentalModal = ref(false)
const isEditRental = ref(false)
const rentalForm = ref({ equipment_name: '', equipment_id: null, supplier_id: null, quantity: 1, unit_price: 0, rental_start_date: dayjs().format('YYYY-MM-DD'), rental_end_date: '', total_cost: 0, notes: '' })
const rentalFiles = ref([])
const showRentalDetailDrawer = ref(false)
const selectedRental = ref(null)

const openRentalDetail = (record) => {
  selectedRental.value = record
  showRentalDetailDrawer.value = true
}

const openRentalModal = (record = null) => {
  if (record) {
    isEditRental.value = true
    rentalForm.value = {
      equipment_name: record.equipment_name,
      equipment_id: record.equipment_id,
      supplier_id: record.supplier_id,
      quantity: record.quantity || 1,
      unit_price: record.unit_price || 0,
      rental_start_date: record.rental_start_date,
      rental_end_date: record.rental_end_date,
      total_cost: record.total_cost,
      notes: record.notes || ''
    }
  } else {
    isEditRental.value = false
    rentalForm.value = { equipment_name: '', equipment_id: null, supplier_id: null, quantity: 1, unit_price: 0, rental_start_date: dayjs().format('YYYY-MM-DD'), rental_end_date: '', total_cost: 0, notes: '' }
  }
  rentalFiles.value = []
  showRentalModal.value = true
}

const updateRentalTotal = () => {
  rentalForm.value.total_cost = (rentalForm.value.quantity || 0) * (rentalForm.value.unit_price || 0)
}

const submitRentalForm = () => {
  if (!rentalForm.value.equipment_name) return
  const fd = new FormData()
  Object.entries(rentalForm.value).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v) })
  rentalFiles.value.forEach(f => fd.append('files[]', f))
  
  const url = isEditRental.value 
    ? `/projects/${props.project.id}/equipment-rentals/${selectedRental.value.id}`
    : `/projects/${props.project.id}/equipment-rentals`
  
  if (isEditRental.value) fd.append('_method', 'PUT')

  router.post(url, fd, {
    onSuccess: () => { 
      showRentalModal.value = false; 
      rentalFiles.value = []; 
      if (selectedRental.value) selectedRental.value = props.project.equipment_rentals?.find(r => r.id === selectedRental.value.id) 
      clearFormErrors()
    },
    onError: (errors) => {
      Object.assign(formErrors, errors)
      showValidationErrors(errors)
    },
    forceFormData: true
  })
}
const submitRental = (r) => router.post(`/projects/${props.project.id}/equipment-rentals/${r.id}/submit`)
const approveRentalMgmt = (r) => router.post(`/projects/${props.project.id}/equipment-rentals/${r.id}/approve-management`)
const confirmRentalKT = (r) => router.post(`/projects/${props.project.id}/equipment-rentals/${r.id}/confirm-accountant`)
const rejectRental = (r) => router.post(`/projects/${props.project.id}/equipment-rentals/${r.id}/reject`, { reason: rejectReason.value }, { onSuccess: () => { rejectReason.value = '' } })
const deleteRental = (r) => router.delete(`/projects/${props.project.id}/equipment-rentals/${r.id}`)
const requestReturnRental = (r) => router.post(`/projects/${props.project.id}/equipment-rentals/${r.id}/request-return`)
const confirmReturnRentalAction = (r) => router.post(`/projects/${props.project.id}/equipment-rentals/${r.id}/confirm-return`)

// ---- PURCHASE ----
const showPurchaseModal = ref(false)
const isEditPurchase = ref(false)
const purchaseForm = ref({ notes: '', items: [{ name: '', code: '', quantity: 1, unit_price: 0 }] })
const purchaseFiles = ref([])
const showPurchaseDetailDrawer = ref(false)
const selectedPurchase = ref(null)

const openPurchaseDetail = (record) => {
  selectedPurchase.value = record
  showPurchaseDetailDrawer.value = true
}

const openPurchaseModal = (record = null) => {
  if (record) {
    isEditPurchase.value = true
    purchaseForm.value = {
      notes: record.notes || '',
      items: record.items?.map(i => ({ name: i.name, code: i.code, quantity: i.quantity, unit_price: i.unit_price })) || []
    }
  } else {
    isEditPurchase.value = false
    purchaseForm.value = { notes: '', items: [{ name: '', code: '', quantity: 1, unit_price: 0 }] }
  }
  purchaseFiles.value = []
  showPurchaseModal.value = true
}

const addPurchaseItem = () => purchaseForm.value.items.push({ name: '', code: '', quantity: 1, unit_price: 0 })
const removePurchaseItem = (idx) => { if (purchaseForm.value.items.length > 1) purchaseForm.value.items.splice(idx, 1) }

const submitPurchaseForm = () => {
  if (!purchaseForm.value.items.some(i => i.name)) return
  const fd = new FormData()
  fd.append('notes', purchaseForm.value.notes || '')
  
  purchaseForm.value.items.forEach((item, idx) => {
    fd.append(`items[${idx}][name]`, item.name)
    if (item.code) fd.append(`items[${idx}][code]`, item.code)
    fd.append(`items[${idx}][quantity]`, item.quantity)
    fd.append(`items[${idx}][unit_price]`, item.unit_price)
  })
  
  purchaseFiles.value.forEach(f => fd.append('files[]', f))

  const url = isEditPurchase.value 
    ? `/projects/${props.project.id}/equipment-purchases/${selectedPurchase.value.id}`
    : `/projects/${props.project.id}/equipment-purchases`
  
  if (isEditPurchase.value) fd.append('_method', 'PUT')

  router.post(url, fd, {
    onSuccess: () => { 
      showPurchaseModal.value = false; 
      purchaseFiles.value = [];
      purchaseForm.value = { notes: '', items: [{ name: '', code: '', quantity: 1, unit_price: 0 }] } 
    },
    forceFormData: true
  })
}
const submitPurchase = (p) => router.post(`/projects/${props.project.id}/equipment-purchases/${p.id}/submit`)
const approvePurchaseMgmt = (p) => router.post(`/projects/${props.project.id}/equipment-purchases/${p.id}/approve-management`)
const confirmPurchaseKT = (p) => router.post(`/projects/${props.project.id}/equipment-purchases/${p.id}/confirm-accountant`)
const rejectPurchase = (p) => router.post(`/projects/${props.project.id}/equipment-purchases/${p.id}/reject`, { reason: rejectReason.value }, { onSuccess: () => { rejectReason.value = '' } })
const deletePurchase = (p) => router.delete(`/projects/${props.project.id}/equipment-purchases/${p.id}`)

// ---- USAGE ----
const showUsageModal = ref(false)
const isEditUsage = ref(false)
const usageForm = ref({ equipment_id: null, quantity: 1, receiver_id: null, received_date: dayjs().format('YYYY-MM-DD'), notes: '' })
const usageFiles = ref([])
const showUsageDetailDrawer = ref(false)
const selectedUsage = ref(null)

const openUsageDetail = (record) => {
  selectedUsage.value = record
  showUsageDetailDrawer.value = true
}

const openUsageModal = (record = null) => {
  if (record) {
    isEditUsage.value = true
    usageForm.value = {
      equipment_id: record.equipment_id,
      quantity: record.quantity,
      receiver_id: record.receiver_id,
      received_date: record.received_date,
      notes: record.notes || ''
    }
  } else {
    isEditUsage.value = false
    usageForm.value = { equipment_id: null, quantity: 1, receiver_id: null, received_date: dayjs().format('YYYY-MM-DD'), notes: '' }
  }
  usageFiles.value = []
  showUsageModal.value = true
}

const submitUsageForm = () => {
  if (!usageForm.value.equipment_id || !usageForm.value.receiver_id) return
  const fd = new FormData()
  Object.entries(usageForm.value).forEach(([k, v]) => { if (v !== null && v !== undefined) fd.append(k, v) })
  usageFiles.value.forEach(f => fd.append('files[]', f))

  const url = isEditUsage.value 
    ? `/projects/${props.project.id}/asset-usages/${selectedUsage.value.id}`
    : `/projects/${props.project.id}/asset-usages`
  
  if (isEditUsage.value) fd.append('_method', 'PUT')

  router.post(url, fd, {
    onSuccess: () => { 
      showUsageModal.value = false; 
      usageFiles.value = [];
      usageForm.value = { equipment_id: null, quantity: 1, receiver_id: null, received_date: dayjs().format('YYYY-MM-DD'), notes: '' } 
    },
    forceFormData: true
  })
}
const submitUsage = (u) => router.post(`/projects/${props.project.id}/asset-usages/${u.id}/submit`)
const approveUsageManagement = (u) => router.post(`/projects/${props.project.id}/asset-usages/${u.id}/approve-management`)
const confirmUsageAccountant = (u) => router.post(`/projects/${props.project.id}/asset-usages/${u.id}/confirm-accountant`)
const rejectUsage = (u) => router.post(`/projects/${props.project.id}/asset-usages/${u.id}/reject`, { rejection_reason: rejectReason.value }, { onSuccess: () => { rejectReason.value = '' } })
const requestReturn = (u) => router.post(`/projects/${props.project.id}/asset-usages/${u.id}/request-return`)
const confirmReturn = (u) => router.post(`/projects/${props.project.id}/asset-usages/${u.id}/confirm-return`)
const deleteUsage = (u) => router.delete(`/projects/${props.project.id}/asset-usages/${u.id}`)
// ============ WARRANTY & MAINTENANCE TAB STATE ============
const showWarrantyModal = ref(false)
const isEditWarranty = ref(false)
const editingWarrantyId = ref(null)
const savingWarranty = ref(false)
const warrantyForm = ref({ handover_date: dayjs().format('YYYY-MM-DD'), warranty_start_date: dayjs().format('YYYY-MM-DD'), warranty_end_date: dayjs().add(12, 'month').format('YYYY-MM-DD'), warranty_content: '' })
const warrantyFiles = ref([])

// Warranty Detail Drawer
const showWarrantyDetailDrawer = ref(false)
const warrantyDetail = ref(null)
const openWarrantyDetail = (w) => { warrantyDetail.value = w; showWarrantyDetailDrawer.value = true }
const editWarrantyFromDrawer = (w) => { showWarrantyDetailDrawer.value = false; openWarrantyModal(w) }

const showMaintenanceModal = ref(false)
const isEditMaintenance = ref(false)
const editingMaintenanceUuid = ref(null)
const savingMaintenance = ref(false)
const maintenanceForm = ref({ maintenance_date: dayjs().format('YYYY-MM-DD'), notes: '' })
const maintenanceFiles = ref([])

// Maintenance Detail Drawer
const showMaintenanceDetailDrawer = ref(false)
const maintenanceDetail = ref(null)
const openMaintenanceDetail = (m) => { maintenanceDetail.value = m; showMaintenanceDetailDrawer.value = true }

// Status labels & colors
const maintenanceStatusLabels = { draft: 'Nháp', pending_customer: 'Chờ KH duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' }
const maintenanceStatusColors = { draft: 'default', pending_customer: 'orange', approved: 'green', rejected: 'red' }

const maintenanceCols = [
  { title: 'Ngày bảo trì', key: 'maintenance_date', width: 130 },
  { title: 'Nội dung', dataIndex: 'notes', key: 'notes', ellipsis: true },
  { title: 'Người tạo', key: 'creator', width: 120 },
  { title: 'Lần tiếp theo', key: 'next_date', width: 140 },
  { title: 'Trạng thái', key: 'status', width: 130, align: 'center' },
  { title: 'Chứng từ', key: 'attachments', width: 80, align: 'center' },
]

const isPast = (date) => dayjs(date).isBefore(dayjs(), 'day')

const openWarrantyModal = (w = null) => {
  if (w) {
    isEditWarranty.value = true
    editingWarrantyId.value = w.id
    warrantyForm.value = {
      handover_date: w.handover_date,
      warranty_start_date: w.warranty_start_date,
      warranty_end_date: w.warranty_end_date,
      warranty_content: w.warranty_content
    }
  } else {
    isEditWarranty.value = false
    editingWarrantyId.value = null
    warrantyForm.value = { handover_date: dayjs().format('YYYY-MM-DD'), warranty_start_date: dayjs().format('YYYY-MM-DD'), warranty_end_date: dayjs().add(12, 'month').format('YYYY-MM-DD'), warranty_content: '' }
  }
  warrantyFiles.value = []
  showWarrantyModal.value = true
}

const submitWarrantyForm = () => {
  if (!warrantyForm.value.handover_date || !warrantyForm.value.warranty_content) return
  savingWarranty.value = true
  const fd = new FormData()
  Object.entries(warrantyForm.value).forEach(([k, v]) => { if (v) fd.append(k, v) })
  warrantyFiles.value.forEach(f => fd.append('files[]', f))
  
  const url = isEditWarranty.value 
    ? `/projects/${props.project.id}/warranties/${editingWarrantyId.value}`
    : `/projects/${props.project.id}/warranties`
  
  if (isEditWarranty.value) fd.append('_method', 'PUT')

  router.post(url, fd, {
    forceFormData: true,
    onSuccess: () => { showWarrantyModal.value = false; warrantyFiles.value = [] },
    onFinish: () => { savingWarranty.value = false }
  })
}

const approveWarranty = (w) => {
  Modal.confirm({
    title: 'Xác nhận duyệt',
    content: 'Bạn có chắc chắn muốn duyệt phiếu bảo hành này trên danh nghĩa khách hàng?',
    onOk: () => router.post(`/projects/${props.project.id}/warranties/${w.id}/approve`, {}, {
      onSuccess: () => { showWarrantyDetailDrawer.value = false; warrantyDetail.value = null }
    })
  })
}

const rejectWarranty = (w) => {
  Modal.confirm({
    title: 'Từ chối',
    content: 'Bạn có chắc chắn muốn từ chối phiếu bảo hành này?',
    onOk: () => router.post(`/projects/${props.project.id}/warranties/${w.id}/reject`, {}, {
      onSuccess: () => { showWarrantyDetailDrawer.value = false; warrantyDetail.value = null }
    })
  })
}

const openMaintenanceModal = (m = null) => {
  if (m) {
    isEditMaintenance.value = true
    editingMaintenanceUuid.value = m.uuid
    maintenanceForm.value = { maintenance_date: m.maintenance_date, notes: m.notes || '' }
  } else {
    isEditMaintenance.value = false
    editingMaintenanceUuid.value = null
    maintenanceForm.value = { maintenance_date: dayjs().format('YYYY-MM-DD'), notes: '' }
  }
  maintenanceFiles.value = []
  showMaintenanceModal.value = true
}

const editMaintenanceFromDrawer = (m) => {
  showMaintenanceDetailDrawer.value = false
  openMaintenanceModal(m)
}

const submitMaintenanceForm = () => {
  if (!maintenanceForm.value.maintenance_date || !maintenanceForm.value.notes) return
  savingMaintenance.value = true
  const fd = new FormData()
  Object.entries(maintenanceForm.value).forEach(([k, v]) => { if (v) fd.append(k, v) })
  maintenanceFiles.value.forEach(f => fd.append('files[]', f))
  
  const url = isEditMaintenance.value
    ? `/projects/${props.project.id}/maintenances/${editingMaintenanceUuid.value}`
    : `/projects/${props.project.id}/maintenances`
  
  if (isEditMaintenance.value) fd.append('_method', 'PUT')

  router.post(url, fd, {
    forceFormData: true,
    onSuccess: () => { showMaintenanceModal.value = false; maintenanceFiles.value = [] },
    onFinish: () => { savingMaintenance.value = false }
  })
}

// Maintenance Approval Workflow
const submitMaintenanceForApproval = (m) => {
  Modal.confirm({
    title: 'Gửi khách hàng duyệt',
    content: 'Bạn có chắc chắn muốn gửi phiếu bảo trì này cho khách hàng duyệt?',
    onOk: () => router.post(`/projects/${props.project.id}/maintenances/${m.uuid}/submit`, {}, {
      onSuccess: () => { showMaintenanceDetailDrawer.value = false; maintenanceDetail.value = null }
    })
  })
}

const approveMaintenanceRecord = (m) => {
  Modal.confirm({
    title: 'Xác nhận duyệt',
    content: 'Bạn có chắc chắn muốn duyệt phiếu bảo trì này trên danh nghĩa khách hàng?',
    onOk: () => router.post(`/projects/${props.project.id}/maintenances/${m.uuid}/approve`, {}, {
      onSuccess: () => { showMaintenanceDetailDrawer.value = false; maintenanceDetail.value = null }
    })
  })
}

const rejectMaintenanceRecord = (m) => {
  Modal.confirm({
    title: 'Từ chối phiếu bảo trì',
    content: 'Bạn có chắc chắn muốn từ chối phiếu bảo trì này?',
    onOk: () => router.post(`/projects/${props.project.id}/maintenances/${m.uuid}/reject`, {}, {
      onSuccess: () => { showMaintenanceDetailDrawer.value = false; maintenanceDetail.value = null }
    })
  })
}

const deleteMaintenance = (m) => {
  router.delete(`/projects/${props.project.id}/maintenances/${m.uuid}`, {
    onSuccess: () => { showMaintenanceDetailDrawer.value = false; maintenanceDetail.value = null }
  })
}

// ============ REVERT WORKFLOW ACTIONS ============
const canRevert = (record) => {
  const user = props.auth.user
  const isSuperAdmin = method_exists(user, 'isSuperAdmin') ? user.isSuperAdmin() : (user.is_admin || user.role === 'admin')
  return isSuperAdmin || record.created_by === user.id
}

const revertLogAction = (log) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Nhật ký thi công sẽ được đưa về trạng thái Đang chờ để bạn có thể chỉnh sửa. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => {
      router.post(`/projects/${props.project.id}/logs/${log.id}/revert`, {}, {
        preserveScroll: true,
        onSuccess: () => { 
          if (showLogDetailDrawer.value) showLogDetailDrawer.value = false 
        },
      })
    }
  })
}

const revertACAction = (ac) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Chi phí phát sinh sẽ được đưa về trạng thái Đang chờ duyệt để bạn có thể chỉnh sửa. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => {
      router.post(`/projects/${props.project.id}/additional-costs/${ac.id}/revert`, {}, {
        preserveScroll: true,
        onSuccess: () => { 
          if (showAdditionalCostDetailDrawer.value) showAdditionalCostDetailDrawer.value = false 
        },
      })
    }
  })
}

const revertMaterialBillAction = (bill) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Phiếu vật tư sẽ được đưa về trạng thái Nháp để bạn có thể chỉnh sửa hoặc xóa. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => {
      router.post(`/projects/${props.project.id}/material-bills/${bill.id}/revert`, {}, {
        preserveScroll: true,
        onSuccess: () => { 
          if (showMaterialDetailDrawer.value) showMaterialDetailDrawer.value = false 
        },
      })
    }
  })
}

const revertRentalAction = (rental) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Phiếu thuê thiết bị sẽ được đưa về trạng thái Nháp để bạn có thể chỉnh sửa. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => {
      router.post(`/projects/${props.project.id}/equipment-rentals/${rental.id}/revert`, {}, {
        preserveScroll: true,
        onSuccess: () => { 
          if (showRentalDetailDrawer.value) showRentalDetailDrawer.value = false 
        },
      })
    }
  })
}

const revertPurchaseAction = (purchase) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Phiếu mua thiết bị sẽ được đưa về trạng thái Nháp để bạn có thể chỉnh sửa. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => {
      router.post(`/projects/${props.project.id}/equipment-purchases/${purchase.id}/revert`, {}, {
        preserveScroll: true,
        onSuccess: () => { 
          if (showPurchaseDetailDrawer.value) showPurchaseDetailDrawer.value = false 
        },
      })
    }
  })
}

const revertUsageAction = (usage) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Phiếu mượn thiết bị sẽ được đưa về trạng thái Nháp để bạn có thể chỉnh sửa. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => {
      router.post(`/projects/${props.project.id}/asset-usages/${usage.id}/revert`, {}, {
        preserveScroll: true,
        onSuccess: () => { 
          if (showUsageDetailDrawer.value) showUsageDetailDrawer.value = false 
        },
      })
    }
  })
}

const revertChangeRequestAction = (cr) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Yêu cầu thay đổi sẽ được đưa về trạng thái Nháp để bạn có thể chỉnh sửa. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => {
      router.post(`/projects/${props.project.id}/change-requests/${cr.id}/revert`, {}, {
        preserveScroll: true,
        onSuccess: () => { 
          if (showChangeRequestDetailDrawer.value) showChangeRequestDetailDrawer.value = false 
        },
      })
    }
  })
}

const revertProjectWarrantyAction = (w) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Phiếu bảo hành sẽ được đưa về trạng thái Nháp để bạn có thể chỉnh sửa. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => {
      router.post(`/projects/${props.project.id}/warranties/${w.uuid}/revert`, {}, {
        preserveScroll: true,
        onSuccess: () => { 
          if (showWarrantyDetailDrawer.value) showWarrantyDetailDrawer.value = false 
        },
      })
    }
  })
}

const revertProjectMaintenanceAction = (m) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Phiếu bảo trì sẽ được đưa về trạng thái Nháp để bạn có thể chỉnh sửa. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => {
      router.post(`/projects/${props.project.id}/maintenances/${m.uuid}/revert`, {}, {
        preserveScroll: true,
        onSuccess: () => { 
          if (showMaintenanceDetailDrawer.value) showMaintenanceDetailDrawer.value = false 
        },
      })
    }
  })
}

const revertSubcontractorAction = (sub) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Nhà thầu phụ sẽ được đưa về trạng thái Nháp để bạn có thể chỉnh sửa. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => {
      router.post(`/projects/${props.project.id}/subcontractors/${sub.id}/revert`, {}, {
        preserveScroll: true,
      })
    }
  })
}

const revertBudgetAction = (budget) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Ngân sách sẽ được đưa về trạng thái Nháp để bạn có thể chỉnh sửa. Lưu ý: Các liên kết thực tế có thể cần cập nhật lại.',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => {
      router.post(`/projects/${props.project.id}/budgets/${budget.id}/revert`, {}, {
        preserveScroll: true,
      })
    }
  })
}

const revertPaymentAction = (payment) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Thanh toán sẽ được đưa về trạng thái Chờ xác nhận. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => {
      router.post(`/projects/${props.project.id}/payments/${payment.id}/revert`, {}, {
        preserveScroll: true,
      })
    }
  })
}

const revertAttendanceAction = (attendance) => {
  Modal.confirm({
    title: 'Xác nhận hoàn duyệt',
    content: 'Bản ghi chấm công sẽ được đưa về trạng thái Chờ duyệt. Bạn có chắc chắn muốn thực hiện?',
    okText: 'Đồng ý',
    cancelText: 'Hủy',
    onOk: () => {
      router.post(`/projects/${props.project.id}/attendance/${attendance.id}/revert`, {}, {
        preserveScroll: true,
      })
    }
  })
}
</script>

<style scoped>
.crm-detail-tabs :deep(.ant-tabs-nav) { padding: 0 20px; background: #FAFBFC; border-bottom: 1px solid #E8ECF1; }
.crm-detail-tabs :deep(.ant-tabs-tab) { font-weight: 600; font-size: 13px; padding: 12px 4px; }
.crm-detail-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) { color: #2563EB !important; }
.crm-detail-tabs :deep(.ant-tabs-ink-bar) { background: #2563EB; height: 3px; border-radius: 3px 3px 0 0; }
.crm-modal :deep(.ant-modal-content) { border-radius: 16px; }

/* Material Modal — Premium UX */
.material-modal :deep(.ant-modal-header) {
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f1f5f9;
}
.mat-section {
  background: #fafbfc;
  border-radius: 14px;
  border: 1px solid #e8ecf1;
  padding: 16px;
}
.mat-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.mat-section-accent {
  width: 3px;
  height: 16px;
  border-radius: 3px;
  flex-shrink: 0;
}
.mat-add-btn {
  border-radius: 10px !important;
  font-weight: 600 !important;
  height: 42px !important;
  background: linear-gradient(135deg, #2563EB 0%, #4F46E5 100%) !important;
  border: none !important;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25) !important;
  transition: all 0.2s ease !important;
}
.mat-add-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35) !important;
}
.mat-add-btn:disabled {
  background: #e2e8f0 !important;
  box-shadow: none !important;
}
.mat-empty-state {
  text-align: center;
  padding: 24px 16px;
  border: 2px dashed #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
}
.mat-batch-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: white;
  border-radius: 10px;
  border: 1px solid #e8ecf1;
  transition: all 0.2s ease;
}
.mat-batch-item:hover {
  border-color: #c7d2fe;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.08);
}
.mat-delete-btn {
  opacity: 0.4;
  transition: opacity 0.15s ease !important;
}
.mat-batch-item:hover .mat-delete-btn {
  opacity: 1;
}
.mat-batch-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  margin-top: 10px;
  background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%);
  border-radius: 10px;
  border: 1px solid #bbf7d0;
}
.mat-submit-btn {
  border-radius: 12px !important;
  font-weight: 700 !important;
  height: 48px !important;
  font-size: 15px !important;
  background: linear-gradient(135deg, #059669 0%, #10B981 100%) !important;
  border: none !important;
  box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3) !important;
  transition: all 0.2s ease !important;
}
.mat-submit-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4) !important;
}
.mat-submit-btn:disabled {
  background: #d1d5db !important;
  box-shadow: none !important;
}
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.crm-table :deep(.ant-table-thead > tr > th) {
  background: #f8fafc !important;
  font-size: 11px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  color: #64748b !important;
  font-weight: 700 !important;
  border-bottom: 2px solid #f1f5f9 !important;
}

.crm-table :deep(.ant-table-tbody > tr > td) {
  padding: 12px 16px !important;
  border-bottom: 1px solid #f8fafc !important;
}

.crm-table :deep(.ant-table-tbody > tr:hover > td) {
  background: #f8fafc !important;
}
.hover-row :deep(.ant-table-tbody > tr:hover > td) {
  background: #eff6ff !important;
  cursor: pointer;
}
/* Batch item transition animations */
.mat-item-enter-active { transition: all 0.3s ease; }
.mat-item-leave-active { transition: all 0.2s ease; }
.mat-item-enter-from { opacity: 0; transform: translateY(-8px) scale(0.97); }
.mat-item-leave-to { opacity: 0; transform: translateX(20px) scale(0.95); }
.mat-item-move { transition: transform 0.25s ease; }

/* File Preview Modal — Premium Inline Viewer */
.file-preview-modal :deep(.ant-modal-content) {
  border-radius: 16px;
  overflow: hidden;
  padding: 0;
}
.file-preview-modal :deep(.ant-modal-header) { display: none; }
.file-preview-modal :deep(.ant-modal-body) { padding: 0 !important; }
.file-preview-container { border-radius: 16px; overflow: hidden; }
.file-preview-body { position: relative; min-height: 40vh; background: #f9fafb; }
.file-preview-body iframe { display: block; }

/* Global Loading Bar Animation */
.loading-bar-animation {
  animation: loading-shimmer 1.5s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5), 0 0 30px rgba(59, 130, 246, 0.2);
}
@keyframes loading-shimmer {
  0% { width: 0%; opacity: 1; }
  50% { width: 70%; opacity: 1; }
  100% { width: 100%; opacity: 0.8; }
}
.loading-bar-enter-active { transition: opacity 0.15s ease; }
.loading-bar-leave-active { transition: opacity 0.4s ease; }
.loading-bar-enter-from, .loading-bar-leave-to { opacity: 0; }
</style>
