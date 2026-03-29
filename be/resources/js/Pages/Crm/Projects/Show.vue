<template>
  <Head :title="`Dự án: ${project.name}`" />

  <!-- Global Loading Bar -->
  <Transition name="loading-bar">
    <div v-if="pageLoading" class="fixed top-0 left-0 right-0 z-[9999]">
      <div class="h-[3px] bg-gradient-to-r from-blue-400 via-blue-600 to-indigo-600 loading-bar-animation"></div>
    </div>
  </Transition>

  <!-- Project Header (Compact Premium) -->
  <div class="bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4 min-w-0 flex-1">
        <a-button type="text" size="small" @click="router.visit('/projects')" class="flex-shrink-0"><ArrowLeftOutlined /></a-button>
        <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/50 flex-shrink-0">
          <span class="text-white text-lg font-bold">{{ (project.name || '?')[0] }}</span>
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2.5">
            <h1 class="text-xl font-extrabold text-gray-800 truncate">{{ project.name }}</h1>
            <a-tag :color="statusColors[project.status]" class="rounded-full text-xs flex-shrink-0">{{ statusLabels[project.status] }}</a-tag>
          </div>
          <div class="text-xs text-gray-400 mt-0.5 truncate">{{ project.code }} — {{ project.description || 'Chưa có mô tả' }}</div>
        </div>
      </div>
      <a-button v-if="can('project.update')" @click="openEditProject" class="flex-shrink-0">
        <template #icon><EditOutlined /></template>Sửa
      </a-button>
    </div>

    <!-- Quick Stats Bar (Inline, compact) -->
    <div class="flex items-center gap-1 mt-4 pt-4 border-t border-gray-100 overflow-x-auto">
      <div class="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100/60 min-w-fit">
        <span class="text-xs text-gray-500">Giá trị HĐ</span>
        <span class="text-sm font-bold text-gray-800">{{ fmt(project.contract?.contract_value) }}</span>
      </div>
      <div class="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100/60 min-w-fit">
        <span class="text-xs text-gray-500">Chi phí</span>
        <span class="text-sm font-bold text-red-500">{{ fmt(totalCosts) }}</span>
      </div>
      <div class="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100/60 min-w-fit">
        <span class="text-xs text-gray-500">Lợi nhuận</span>
        <span class="text-sm font-bold" :class="profitMargin >= 0 ? 'text-emerald-600' : 'text-red-500'">{{ profitMargin >= 0 ? '+' : '' }}{{ profitMargin.toFixed(1) }}%</span>
      </div>
      <div class="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100/60 min-w-fit">
        <span class="text-xs text-gray-500">Tiến độ</span>
        <span class="text-sm font-bold text-blue-600">{{ project.progress?.overall_percentage || 0 }}%</span>
        <div class="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-700" :style="{ width: (project.progress?.overall_percentage || 0) + '%' }"></div>
        </div>
      </div>
      <div class="flex items-center gap-2 px-3.5 py-2 bg-gray-50 rounded-xl border border-gray-100 min-w-fit">
        <span class="text-xs text-gray-500">Nhân sự</span>
        <span class="text-sm font-bold text-gray-700">{{ project.personnel?.length || 0 }}</span>
      </div>
      <div class="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100/60 min-w-fit" v-if="(project.defects?.length || 0) + (project.risks?.length || 0) > 0">
        <span class="text-xs text-gray-500">Lỗi/Rủi ro</span>
        <span class="text-sm font-bold text-amber-600">{{ project.defects?.length || 0 }}/{{ project.risks?.length || 0 }}</span>
      </div>
    </div>
  </div>

  <!-- Tab Navigation (Optimized: Group → Filtered Sub-tabs) -->
  <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
    <!-- Category Group Navigation (Segmented Control) -->
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

      <!-- ============ OVERVIEW TAB ============ -->
      <a-tab-pane key="overview" v-if="isTabVisible('overview')">
        <template #tab><a-tooltip title="Thông tin tổng quan dự án: trạng thái, tiến độ, ngân sách, nhân sự" placement="bottom">Tổng quan</a-tooltip></template>
        <div class="p-6 space-y-6">

          <!-- Row 1: Project Info + Timeline -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

            <!-- Project Info Card -->
            <div class="lg:col-span-2 bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-6 border border-blue-100/60 relative overflow-hidden">
              <div class="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div class="relative">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200">
                    <span class="text-white text-lg font-bold">{{ (project.name || '?')[0] }}</span>
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="text-lg font-bold text-gray-800 truncate">{{ project.name }}</h3>
                    <span class="text-xs text-gray-400 font-mono">{{ project.code }}</span>
                  </div>
                  <a-tag :color="statusColors[project.status]" class="rounded-full text-xs font-semibold px-3">{{ statusLabels[project.status] }}</a-tag>
                </div>

                <div class="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-blue-500 shadow-sm">
                      <UserOutlined />
                    </div>
                    <div>
                      <div class="text-[11px] text-gray-400 uppercase tracking-wider">Khách hàng</div>
                      <div class="font-semibold text-gray-700">{{ project.customer?.name || '—' }}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-indigo-500 shadow-sm">
                      <UserOutlined />
                    </div>
                    <div>
                      <div class="text-[11px] text-gray-400 uppercase tracking-wider">Quản lý dự án</div>
                      <div class="font-semibold text-gray-700">{{ project.project_manager?.name || '—' }}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-emerald-500 shadow-sm">
                      <CalendarOutlined />
                    </div>
                    <div>
                      <div class="text-[11px] text-gray-400 uppercase tracking-wider">Bắt đầu</div>
                      <div class="font-semibold text-gray-700">{{ fmtDate(project.start_date) }}</div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center text-orange-500 shadow-sm">
                      <CalendarOutlined />
                    </div>
                    <div>
                      <div class="text-[11px] text-gray-400 uppercase tracking-wider">Kết thúc</div>
                      <div class="font-semibold text-gray-700">{{ fmtDate(project.end_date) }}</div>
                    </div>
                  </div>
                </div>

                <!-- Timeline bar -->
                <div class="mt-5 pt-4 border-t border-blue-100/80">
                  <div class="flex justify-between text-[11px] text-gray-400 mb-1.5">
                    <span>{{ fmtDate(project.start_date) }}</span>
                    <span class="font-medium" :class="timelineProgress > 100 ? 'text-red-500' : 'text-blue-500'">
                      {{ timelineProgress > 100 ? 'Quá hạn' : `Còn ${daysRemaining} ngày` }}
                    </span>
                    <span>{{ fmtDate(project.end_date) }}</span>
                  </div>
                  <div class="h-2 bg-gray-200/60 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-700"
                      :class="timelineProgress > 100 ? 'bg-gradient-to-r from-red-400 to-red-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'"
                      :style="{ width: Math.min(timelineProgress, 100) + '%' }">
                    </div>
                  </div>
                </div>

                <div class="mt-3 text-sm text-gray-500 leading-relaxed" v-if="project.description">
                  {{ project.description }}
                </div>
              </div>
            </div>

            <!-- Progress Ring Card -->
            <div class="bg-white rounded-2xl p-6 border border-gray-100 flex flex-col items-center justify-center text-center">
              <div class="relative mb-4">
                <a-progress
                  type="circle"
                  :percent="project.progress?.overall_percentage || 0"
                  :size="140"
                  :stroke-width="8"
                  :stroke-color="{ '0%': '#3B82F6', '100%': '#6366F1' }"
                  trail-color="#F1F5F9"
                />
              </div>
              <div class="text-sm font-semibold text-gray-700 mb-1">Tiến độ tổng thể</div>
              <div class="text-xs text-gray-400">
                {{ taskStats.completed }}/{{ taskStats.total }} công việc hoàn thành
              </div>

              <!-- Mini stats -->
              <div class="grid grid-cols-3 gap-3 mt-5 w-full">
                <div class="text-center cursor-default group" title="Công việc">
                  <div class="text-lg font-bold text-blue-600 group-hover:scale-110 transition-transform">{{ taskStats.total }}</div>
                  <div class="text-[10px] text-gray-400 uppercase">Công việc</div>
                </div>
                <div class="text-center cursor-default group" title="Lỗi mở">
                  <div class="text-lg font-bold text-red-500 group-hover:scale-110 transition-transform">{{ openDefects }}</div>
                  <div class="text-[10px] text-gray-400 uppercase">Lỗi mở</div>
                </div>
                <div class="text-center cursor-default group" title="Rủi ro">
                  <div class="text-lg font-bold text-amber-500 group-hover:scale-110 transition-transform">{{ activeRisks }}</div>
                  <div class="text-[10px] text-gray-400 uppercase">Rủi ro</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Row 2: Financial Overview + Task Breakdown -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

            <!-- Financial Card -->
            <div class="bg-white rounded-2xl p-6 border border-gray-100">
              <div class="flex items-center justify-between mb-5">
                <h4 class="font-bold text-gray-700 flex items-center gap-2">
                  <span class="w-1.5 h-5 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-600"></span>
                  Tài chính
                </h4>
                <div class="text-xs px-2.5 py-1 rounded-full font-medium"
                  :class="profitMargin >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'">
                  {{ profitMargin >= 0 ? '+' : '' }}{{ profitMargin.toFixed(1) }}% lợi nhuận
                </div>
              </div>

              <div class="space-y-4">
                <!-- Contract value -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                      <span class="text-blue-500 text-sm">💰</span>
                    </div>
                    <span class="text-sm text-gray-500">Giá trị hợp đồng</span>
                  </div>
                  <span class="text-sm font-bold text-gray-800">{{ fmt(project.contract?.contract_value) }}</span>
                </div>

                <!-- Total costs -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                      <span class="text-red-500 text-sm">📊</span>
                    </div>
                    <span class="text-sm text-gray-500">Tổng chi phí thực tế</span>
                  </div>
                  <span class="text-sm font-bold text-red-500">{{ fmt(totalCosts) }}</span>
                </div>

                <!-- Additional costs -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                      <span class="text-orange-500 text-sm">⚡</span>
                    </div>
                    <span class="text-sm text-gray-500">Chi phí phát sinh</span>
                  </div>
                  <span class="text-sm font-bold text-orange-500">{{ fmt(totalAdditionalCosts) }}</span>
                </div>

                <!-- Subcontractor payments -->
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
                      <span class="text-purple-500 text-sm">🏗️</span>
                    </div>
                    <span class="text-sm text-gray-500">Thanh toán NTP</span>
                  </div>
                  <span class="text-sm font-bold text-purple-600">{{ fmt(totalSubPayments) }}</span>
                </div>

                <!-- Visual bar -->
                <div class="pt-3 border-t border-gray-50">
                  <div class="flex justify-between text-[11px] text-gray-400 mb-1">
                    <span>Chi tiêu / Hợp đồng</span>
                    <span class="font-medium" :class="budgetUsage > 100 ? 'text-red-500' : 'text-gray-500'">{{ budgetUsage.toFixed(0) }}%</span>
                  </div>
                  <div class="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-700"
                      :class="budgetUsage > 90 ? 'bg-gradient-to-r from-red-400 to-red-500' : budgetUsage > 70 ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-emerald-400 to-emerald-500'"
                      :style="{ width: Math.min(budgetUsage, 100) + '%' }">
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Team & Quick Links Card -->
            <div class="bg-white rounded-2xl p-6 border border-gray-100">
              <div class="flex items-center justify-between mb-5">
                <h4 class="font-bold text-gray-700 flex items-center gap-2">
                  <span class="w-1.5 h-5 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600"></span>
                  Nhân sự dự án
                </h4>
                <a-tag color="blue" class="rounded-full text-xs">{{ (project.personnel || []).length }} thành viên</a-tag>
              </div>

              <!-- Team Grid -->
              <div class="grid grid-cols-2 gap-3 mb-5" v-if="(project.personnel || []).length > 0">
                <div v-for="p in (project.personnel || []).slice(0, 6)" :key="p.id"
                  class="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                    :style="{ background: `hsl(${(p.user?.name || '').length * 37 % 360}, 60%, 55%)` }">
                    {{ (p.user?.name || '?')[0] }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-semibold text-gray-700 truncate group-hover:text-blue-600 transition-colors">{{ p.user?.name || 'N/A' }}</div>
                    <div class="text-[10px] text-gray-400 truncate">{{ p.role?.name || 'Thành viên' }}</div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-6 text-sm text-gray-400">Chưa có nhân sự</div>

              <!-- Quick Overview Metrics -->
              <div class="border-t border-gray-100 pt-4">
                <div class="text-xs text-gray-400 uppercase tracking-wider mb-3 font-medium">Trạng thái công việc</div>
                <div class="space-y-2.5">
                  <div class="flex items-center gap-3">
                    <div class="flex-1">
                      <div class="flex justify-between text-xs mb-1">
                        <span class="text-gray-500">Hoàn thành</span>
                        <span class="font-semibold text-emerald-600">{{ taskStats.total > 0 ? Math.round(taskStats.completed / taskStats.total * 100) : 0 }}%</span>
                      </div>
                      <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                          :style="{ width: (taskStats.total > 0 ? taskStats.completed / taskStats.total * 100 : 0) + '%' }"></div>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="flex-1">
                      <div class="flex justify-between text-xs mb-1">
                        <span class="text-gray-500">Đang thực hiện</span>
                        <span class="font-semibold text-blue-600">{{ taskStats.total > 0 ? Math.round(taskStats.in_progress / taskStats.total * 100) : 0 }}%</span>
                      </div>
                      <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-500"
                          :style="{ width: (taskStats.total > 0 ? taskStats.in_progress / taskStats.total * 100 : 0) + '%' }"></div>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="flex-1">
                      <div class="flex justify-between text-xs mb-1">
                        <span class="text-gray-500">Trễ tiến độ</span>
                        <span class="font-semibold text-orange-500">{{ taskStats.total > 0 ? Math.round(taskStats.delayed / taskStats.total * 100) : 0 }}%</span>
                      </div>
                      <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-orange-400 to-red-400 rounded-full transition-all duration-500"
                          :style="{ width: (taskStats.total > 0 ? taskStats.delayed / taskStats.total * 100 : 0) + '%' }"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </a-tab-pane>

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
            <div v-else class="border rounded-xl overflow-x-auto">
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
        <template #tab><a-tooltip title="Quản lý công việc, phân công và theo dõi tiến độ thi công theo WBS" placement="bottom">Tiến độ</a-tooltip></template>
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
              <tbody>
                <template v-if="rootTasks.length">
                  <template v-for="task in rootTasks" :key="task.id">
                    <!-- Parent Row -->
                    <tr class="border-b hover:bg-blue-50/50 transition-colors cursor-pointer" :class="task.children?.length ? 'bg-blue-50/30 font-semibold' : ''" @click="toggleExpand(task.id)">
                      <td class="py-2 px-3">
                        <div class="flex items-center gap-2">
                          <span v-if="task.children?.length" class="text-gray-400 text-xs transition-transform" :class="expandedTasks.has(task.id) ? 'rotate-90' : ''">▶</span>
                          <span v-else class="w-3"></span>
                          <span>{{ task.name }}</span>
                          <span v-if="task.children?.length" class="text-xs text-gray-400">({{ task.children.length }})</span>
                        </div>
                      </td>
                      <td class="text-center py-2 px-3"><a-tag :color="priorityColors[task.priority]" class="rounded-full text-xs">{{ priorityLabels[task.priority] || task.priority }}</a-tag></td>
                      <td class="text-center py-2 px-3"><a-tag :color="taskStatusColors[task.status]" class="rounded-full text-xs">{{ taskStatusLabels[task.status] || task.status }}</a-tag></td>
                      <td class="py-2 px-3"><a-progress :percent="parseFloat(task.progress_percentage || 0)" size="small" :stroke-color="parseFloat(task.progress_percentage || 0) >= 100 ? '#27AE60' : '#1B4F72'" /></td>
                      <td class="text-center py-2 px-3 text-xs text-gray-500">
                        <span v-if="task.start_date">{{ fmtDate(task.start_date) }}</span>
                        <span v-if="task.start_date && task.end_date"> ~ </span>
                        <span v-if="task.end_date">{{ fmtDate(task.end_date) }}</span>
                        <span v-if="!task.start_date && !task.end_date" class="text-gray-300">—</span>
                      </td>
                      <td class="text-center py-2 px-3 text-xs">{{ task.assigned_user?.name || '—' }}</td>
                      <td class="text-center py-2 px-3" @click.stop>
                        <div class="flex gap-1 justify-center">
                          <a-tooltip title="Sửa"><a-button type="text" size="small" @click.stop="openTaskModal(task)"><EditOutlined /></a-button></a-tooltip>
                          <a-popconfirm title="Xóa công việc?" @confirm="deleteTask(task)"><a-button type="text" size="small" danger @click.stop><DeleteOutlined /></a-button></a-popconfirm>
                        </div>
                      </td>
                    </tr>
                    <!-- Children Rows -->
                    <template v-if="expandedTasks.has(task.id) && task.children?.length">
                      <tr v-for="child in task.children" :key="child.id" class="border-b hover:bg-gray-50 transition-colors">
                        <td class="py-2 px-3 pl-10">
                          <div class="flex items-center gap-1 text-gray-600">
                            <span class="text-gray-300 mr-1">└</span>
                            {{ child.name }}
                          </div>
                        </td>
                        <td class="text-center py-2 px-3"><a-tag :color="priorityColors[child.priority]" class="rounded-full text-xs">{{ priorityLabels[child.priority] || child.priority }}</a-tag></td>
                        <td class="text-center py-2 px-3"><a-tag :color="taskStatusColors[child.status]" class="rounded-full text-xs">{{ taskStatusLabels[child.status] || child.status }}</a-tag></td>
                        <td class="py-2 px-3"><a-progress :percent="parseFloat(child.progress_percentage || 0)" size="small" :stroke-color="parseFloat(child.progress_percentage || 0) >= 100 ? '#27AE60' : '#2E86C1'" /></td>
                        <td class="text-center py-2 px-3 text-xs text-gray-500">
                          <span v-if="child.start_date">{{ fmtDate(child.start_date) }}</span>
                          <span v-if="child.start_date && child.end_date"> ~ </span>
                          <span v-if="child.end_date">{{ fmtDate(child.end_date) }}</span>
                          <span v-if="!child.start_date && !child.end_date" class="text-gray-300">—</span>
                        </td>
                        <td class="text-center py-2 px-3 text-xs">{{ child.assigned_user?.name || '—' }}</td>
                        <td class="text-center py-2 px-3" @click.stop>
                          <div class="flex gap-1 justify-center">
                            <a-tooltip title="Sửa"><a-button type="text" size="small" @click="openTaskModal(child)"><EditOutlined /></a-button></a-tooltip>
                            <a-popconfirm title="Xóa?" @confirm="deleteTask(child)"><a-button type="text" size="small" danger><DeleteOutlined /></a-button></a-popconfirm>
                          </div>
                        </td>
                      </tr>
                      <!-- Add child task row -->
                      <tr v-if="can('project.task.create')" class="border-b">
                        <td class="py-1 px-3 pl-10" colspan="7">
                          <a-button type="dashed" size="small" class="text-xs text-blue-500" @click="openTaskModal(null, task.id)">
                            <template #icon><PlusOutlined /></template>Thêm công việc con
                          </a-button>
                        </td>
                      </tr>
                    </template>
                  </template>
                </template>
                <tr v-else>
                  <td colspan="7" class="py-12 text-center text-gray-400">
                    <a-empty description="Chưa có công việc nào" />
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
            <a-button v-if="!project.contract && can('contract.create')" type="primary" size="small" @click="openContractModal(null)">
              <template #icon><PlusOutlined /></template>Tạo hợp đồng
            </a-button>
            <a-button v-if="project.contract && can('contract.update')" size="small" @click="openContractModal(project.contract)">
              <template #icon><EditOutlined /></template>Sửa
            </a-button>
          </div>
          <div v-if="project.contract" class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-gray-400">Giá trị</span><span class="font-bold text-lg">{{ fmt(project.contract.contract_value) }}</span></div>
            <div class="flex justify-between"><span class="text-gray-400">Ngày ký</span><span>{{ fmtDate(project.contract.signed_date) }}</span></div>
            <div class="flex justify-between"><span class="text-gray-400">Trạng thái</span><a-tag :color="contractStatusColors[project.contract.status]" class="rounded-full">{{ contractStatusLabels[project.contract.status] || project.contract.status }}</a-tag></div>
          </div>
          <a-empty v-else description="Chưa có hợp đồng" />
        </div>
      </a-tab-pane>

      <!-- ============ COSTS TAB (Renamed to Phiếu chi) ============ -->
      <a-tab-pane key="costs" v-if="isTabVisible('costs')">
        <template #tab><a-tooltip title="Quản lý phiếu chi: tạo, gửi duyệt BĐH → KT xác nhận, đính kèm chứng từ" placement="bottom">Phiếu chi ({{ project.costs?.length || 0 }})</a-tooltip></template>
        <div class="p-4">
          <!-- Status-based sub-tabs for Phiếu chi -->
          <div class="flex gap-2 mb-3 flex-wrap">
            <a-button :type="costStatusFilter === 'all' ? 'primary' : 'default'" size="small" @click="costStatusFilter = 'all'">Tất cả ({{ project.costs?.length || 0 }})</a-button>
            <a-button :type="costStatusFilter === 'draft' ? 'primary' : 'default'" size="small" @click="costStatusFilter = 'draft'">Nháp ({{ (project.costs || []).filter(c => c.status === 'draft').length }})</a-button>
            <a-button :type="costStatusFilter === 'pending' ? 'primary' : 'default'" size="small" @click="costStatusFilter = 'pending'">Chờ duyệt ({{ (project.costs || []).filter(c => ['pending_management_approval','pending_accountant_approval'].includes(c.status)).length }})</a-button>
            <a-button :type="costStatusFilter === 'approved' ? 'primary' : 'default'" size="small" @click="costStatusFilter = 'approved'">Đã duyệt ({{ (project.costs || []).filter(c => c.status === 'approved').length }})</a-button>
            <a-button :type="costStatusFilter === 'rejected' ? 'primary' : 'default'" size="small" danger ghost @click="costStatusFilter = 'rejected'">Từ chối ({{ (project.costs || []).filter(c => c.status === 'rejected').length }})</a-button>
          </div>
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm text-gray-400">Tổng: <span class="font-bold text-red-500">{{ fmt(totalCosts) }}</span></div>
            <a-button v-if="can('cost.create')" type="primary" size="small" @click="openCostModal(null)">
              <template #icon><PlusOutlined /></template>Thêm chi phí
            </a-button>
          </div>
          <a-table :columns="costCols" :data-source="filteredCosts" :pagination="{ pageSize: 10, showTotal: (t) => `${t} phiếu` }" row-key="id" size="small" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'amount'"><span class="font-semibold text-red-500">{{ fmt(record.amount) }}</span></template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="costStatusColors[record.status]" class="rounded-full text-xs">{{ costStatusLabels[record.status] || record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'creator'">{{ record.creator?.name || '—' }}</template>
              <template v-else-if="column.key === 'date'">{{ fmtDate(record.cost_date) }}</template>
              <template v-else-if="column.key === 'actions'">
                <div class="flex gap-1">
                  <a-tooltip v-if="record.status === 'draft' && can('cost.submit')" title="Gửi duyệt">
                    <a-button type="text" size="small" :loading="actionLoading[`submit-cost-${record.id}`]" @click="submitCost(record)"><SendOutlined class="text-blue-500" /></a-button>
                  </a-tooltip>
                  <a-tooltip v-if="record.status === 'pending_management_approval' && can('cost.approve.management')" title="Duyệt (BĐH)">
                    <a-button type="text" size="small" :loading="actionLoading[`approve-cost-mgmt-${record.id}`]" @click="approveCostMgmt(record)"><CheckCircleOutlined class="text-green-500" /></a-button>
                  </a-tooltip>
                  <a-tooltip v-if="record.status === 'pending_accountant_approval' && can('cost.approve.accountant')" title="Xác nhận (KT)">
                    <a-button type="text" size="small" :loading="actionLoading[`approve-cost-acct-${record.id}`]" @click="approveCostAcct(record)"><CheckCircleOutlined class="text-green-600" /></a-button>
                  </a-tooltip>
                  <a-tooltip v-if="['pending_management_approval','pending_accountant_approval'].includes(record.status) && can('cost.reject')" title="Từ chối">
                    <a-button type="text" size="small" danger @click="openRejectCostModal(record)"><CloseCircleOutlined /></a-button>
                  </a-tooltip>
                  <a-button v-if="can('cost.update') && record.status === 'draft'" type="text" size="small" @click="openCostModal(record)"><EditOutlined /></a-button>
                  <a-popconfirm v-if="can('cost.delete')" title="Xóa chi phí?" @confirm="deleteCost(record)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                  <a-tooltip title="Đính kèm file">
                    <a-badge :count="record.attachments?.length || 0" :offset="[-2, 2]" size="small">
                      <a-button type="text" size="small" @click="openAttachModal('cost', record)"><UploadOutlined class="text-gray-500" /></a-button>
                    </a-badge>
                  </a-tooltip>
                </div>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ PAYMENTS TAB ============ -->
      <a-tab-pane key="payments" v-if="isTabVisible('payments')">
        <template #tab><a-tooltip title="Quản lý đợt thanh toán: KH đánh dấu đã thanh toán → KT xác nhận/từ chối" placement="bottom">Thanh toán ({{ project.payments?.length || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-between items-center mb-3">
            <div class="text-xs text-gray-400">Luồng: Chờ TT → KH đánh dấu TT → KT xác nhận → Hoàn tất</div>
            <a-button v-if="can('payment.create')" type="primary" size="small" @click="openPaymentModal()">
              <template #icon><PlusOutlined /></template>Thêm thanh toán
            </a-button>
          </div>
          <a-table :columns="paymentCols" :data-source="project.payments || []" :pagination="{ pageSize: 10, showTotal: (t) => `${t} đợt` }" row-key="id" size="small" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'payment_number'">
                <span class="font-semibold text-gray-700">#{{ record.payment_number }}</span>
              </template>
              <template v-else-if="column.key === 'amount'"><span class="font-semibold text-green-600">{{ fmt(record.amount) }}</span></template>
              <template v-else-if="column.key === 'actual_amount'">
                <span v-if="record.actual_amount" class="font-semibold" :class="record.actual_amount >= record.amount ? 'text-green-600' : 'text-orange-500'">{{ fmt(record.actual_amount) }}</span>
                <span v-else class="text-gray-300">—</span>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="paymentTagColors[record.status]" class="rounded-full text-xs">{{ paymentStatusLabelsMap[record.status] || record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'date'">{{ fmtDate(record.due_date) }}</template>
              <template v-else-if="column.key === 'paid_date'">
                <span v-if="record.paid_date" class="text-green-600">{{ fmtDate(record.paid_date) }}</span>
                <span v-else class="text-gray-300">—</span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <a-space :size="2">
                  <!-- KH đánh dấu đã thanh toán (khi pending / overdue) -->
                  <a-popconfirm v-if="['pending','overdue'].includes(record.status)" title="Đánh dấu KH đã thanh toán?" @confirm="markPaymentPaid(record)">
                    <a-tooltip title="KH đã thanh toán">
                      <a-button type="text" size="small" class="text-blue-500"><DollarOutlined /></a-button>
                    </a-tooltip>
                  </a-popconfirm>
                  <!-- KT xác nhận (khi customer_paid) -->
                  <a-popconfirm v-if="record.status === 'customer_paid' && can('payment.confirm')" title="KT xác nhận thanh toán?" @confirm="confirmPaymentAction(record)">
                    <a-tooltip title="KT xác nhận">
                      <a-button type="text" size="small" class="text-green-500"><CheckCircleOutlined /></a-button>
                    </a-tooltip>
                  </a-popconfirm>
                  <!-- KT từ chối (khi customer_paid) -->
                  <a-tooltip v-if="record.status === 'customer_paid' && can('payment.confirm')" title="KT từ chối">
                    <a-button type="text" size="small" danger @click="openRejectPaymentModal(record)"><CloseCircleOutlined /></a-button>
                  </a-tooltip>
                  <!-- Xóa (khi chưa confirmed) -->
                  <a-popconfirm v-if="can('payment.delete') && !['confirmed','paid'].includes(record.status)" title="Xóa?" @confirm="deletePayment(record)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                  <a-tooltip title="Đính kèm chứng từ">
                    <a-badge :count="record.attachments?.length || 0" :offset="[-2, 2]" size="small">
                      <a-button type="text" size="small" @click="openAttachModal('payment', record)"><UploadOutlined class="text-gray-500" /></a-button>
                    </a-badge>
                  </a-tooltip>
                </a-space>
              </template>
            </template>
          </a-table>
          <a-empty v-if="!project.payments?.length" description="Chưa có thanh toán" />
        </div>
      </a-tab-pane>

      <!-- ============ PERSONNEL TAB ============ -->
      <a-tab-pane key="personnel" v-if="isTabVisible('personnel')">
        <template #tab><a-tooltip title="Phân công nhân sự tham gia dự án theo vai trò" placement="bottom">Nhân sự ({{ project.personnel?.length || 0 }})</a-tooltip></template>
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
        <template #tab><a-tooltip title="Quản lý nhà thầu phụ: báo giá, tiến độ, thanh toán và đối soát" placement="bottom">Nhà thầu phụ ({{ project.subcontractors?.length || 0 }})</a-tooltip></template>
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
              <template v-else-if="column.key === 'actions'">
                <div class="flex gap-1" @click.stop>
                  <a-tooltip title="Xem chi tiết"><a-button type="text" size="small" @click.stop="openSubDetail(record)"><EyeOutlined /></a-button></a-tooltip>
                  <a-button v-if="can('subcontractor.update')" type="text" size="small" @click.stop="openSubModal(record)"><EditOutlined /></a-button>
                  <a-popconfirm v-if="can('subcontractor.update') && !record.approved_at" title="Duyệt NTP này?" @confirm="approveSub(record)" ok-text="Duyệt" cancel-text="Hủy">
                    <a-button type="text" size="small" class="text-green-600" @click.stop><CheckCircleOutlined /></a-button>
                  </a-popconfirm>
                  <a-popconfirm v-if="can('subcontractor.delete')" title="Xóa NTP?" @confirm="deleteSub(record)">
                    <a-button type="text" size="small" danger @click.stop><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </div>
              </template>
            </template>
          </a-table>
          <a-empty v-if="!project.subcontractors?.length" description="Chưa có nhà thầu phụ" />
        </div>
      </a-tab-pane>

      <!-- ============ LOGS TAB ============ -->
      <a-tab-pane key="logs" v-if="isTabVisible('logs')">
        <template #tab><a-tooltip title="Nhật ký thi công: ghi chép hàng ngày về thời tiết, nhân công, tiến độ" placement="bottom">Nhật ký ({{ project.construction_logs?.length || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('log.create')" type="primary" size="small" @click="openLogModal()">
              <template #icon><PlusOutlined /></template>Thêm nhật ký
            </a-button>
          </div>
          <a-table :columns="logCols" :data-source="project.construction_logs || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'date'">{{ fmtDate(record.log_date) }}</template>
              <template v-else-if="column.key === 'task'">{{ record.task?.name || '—' }}</template>
              <template v-else-if="column.key === 'weather'">{{ record.weather || '—' }}</template>
              <template v-else-if="column.key === 'personnel'">{{ record.personnel_count ?? '—' }}</template>
              <template v-else-if="column.key === 'progress'">
                <a-progress :percent="Number(record.completion_percentage || 0)" :size="'small'" :stroke-color="Number(record.completion_percentage) >= 100 ? '#10B981' : '#1B4F72'" />
              </template>
              <template v-else-if="column.key === 'creator'">{{ record.creator?.name || '—' }}</template>
              <template v-else-if="column.key === 'notes'">
                <a-tooltip v-if="record.notes" :title="record.notes"><span class="text-gray-500 truncate block max-w-[150px]">{{ record.notes }}</span></a-tooltip>
                <span v-else class="text-gray-300">—</span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="flex gap-1">
                  <a-tooltip title="Sửa">
                    <a-button v-if="can('log.update') || can('log.create')" type="text" size="small" @click="openLogModal(record)"><EditOutlined /></a-button>
                  </a-tooltip>
                  <a-popconfirm v-if="can('log.delete')" title="Xóa nhật ký?" @confirm="deleteLog(record)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </div>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ ACCEPTANCE TAB ============ -->
      <a-tab-pane key="acceptance" v-if="isTabVisible('acceptance')">
        <template #tab><a-tooltip title="Quản lý nghiệm thu: tạo giai đoạn, duyệt 3 cấp, bộ tài liệu, lỗi ghi nhận" placement="bottom">Nghiệm thu ({{ project.acceptance_stages?.length || 0 }})</a-tooltip></template>
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
                <a-tooltip v-if="stage.status === 'pending' && can('acceptance.approve.level_1')" title="Duyệt (Giám sát)">
                  <a-button type="text" size="small" @click="approveAccept(stage, 1)"><CheckCircleOutlined class="text-blue-500" /></a-button>
                </a-tooltip>
                <a-tooltip v-if="stage.status === 'supervisor_approved' && can('acceptance.approve.level_2')" title="Duyệt (QLDA)">
                  <a-button type="text" size="small" @click="approveAccept(stage, 2)"><CheckCircleOutlined class="text-green-500" /></a-button>
                </a-tooltip>
                <a-tooltip v-if="stage.status === 'project_manager_approved' && can('acceptance.approve.level_3')" title="Duyệt (KH)">
                  <a-button type="text" size="small" @click="approveAccept(stage, 3)"><CheckCircleOutlined class="text-emerald-600" /></a-button>
                </a-tooltip>
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

            <!-- Description -->
            <div v-if="stage.description" class="px-4 pt-2 text-sm text-gray-500">{{ stage.description }}</div>

            <!-- Attachments Gallery (Giống APP: Image Gallery) -->
            <div v-if="stage.attachments?.length" class="px-4 pt-3">
              <div class="flex items-center gap-1 text-xs font-semibold text-gray-600 mb-2">
                <FileOutlined class="text-[10px]" /> Hình ảnh / Tài liệu nghiệm thu ({{ stage.attachments.length }})
              </div>
              <div class="flex gap-2 flex-wrap">
                <a v-for="att in stage.attachments" :key="att.id" href="#" @click.prevent="openFilePreview(att)"
                   class="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition border border-blue-100 cursor-pointer">
                  <EyeOutlined class="text-[10px]" /> {{ att.original_name || att.file_name }}
                </a>
              </div>
            </div>

            <!-- Checklist Items (hạng mục nghiệm thu) -->
            <div v-if="stage.items?.length" class="px-4 pt-3 pb-1">
              <div class="text-xs font-semibold text-gray-600 mb-2">Hạng mục ({{ stage.items.length }})</div>
              <div v-for="item in stage.items" :key="item.id" class="flex items-center gap-2 text-sm py-1.5 border-b border-gray-50 last:border-0">
                <a-checkbox :checked="item.workflow_status === 'customer_approved'" disabled />
                <span :class="item.workflow_status === 'customer_approved' ? 'text-gray-400 line-through' : 'text-gray-700'">{{ item.name }}</span>
                <a-tag v-if="item.workflow_status && item.workflow_status !== 'pending'" :color="acceptItemStatusColor(item.workflow_status)" class="rounded-full text-[10px] ml-auto">{{ acceptItemStatusLabel(item.workflow_status) }}</a-tag>
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
        <template #tab><a-tooltip title="Báo cáo và theo dõi lỗi thi công: mức độ, trạng thái xử lý" placement="bottom">Lỗi ({{ project.defects?.length || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('defect.create')" type="primary" size="small" @click="openDefectModal(null)">
              <template #icon><PlusOutlined /></template>Báo lỗi
            </a-button>
          </div>
          <a-table :columns="defectCols" :data-source="project.defects || []" :pagination="false" row-key="id" size="small" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'severity'">
                <a-tag :color="severityColors[record.severity]" class="rounded-full">{{ severityLabels[record.severity] || record.severity }}</a-tag>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="defectStatusColors[record.status]" class="rounded-full">{{ defectStatusLabels[record.status] || record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="flex gap-1">
                  <a-button v-if="can('defect.update')" type="text" size="small" @click="openDefectModal(record)"><EditOutlined /></a-button>
                  <a-popconfirm v-if="can('defect.delete')" title="Xóa?" @confirm="deleteDefect(record)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </div>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ CHANGE REQUESTS TAB ============ -->
      <a-tab-pane key="change_requests" v-if="isTabVisible('change_requests')">
        <template #tab><a-tooltip title="Yêu cầu thay đổi: phạm vi, chi phí, tiến độ — phân tích ảnh hưởng và phê duyệt" placement="bottom">Thay đổi ({{ project.change_requests?.length || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('change_request.create')" type="primary" size="small" @click="openChangeRequestModal()">
              <template #icon><PlusOutlined /></template>Yêu cầu thay đổi
            </a-button>
          </div>
          <a-table :columns="crCols" :data-source="project.change_requests || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table">
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
              <template v-else-if="column.key === 'actions'">
                <div class="flex gap-1 flex-wrap justify-center">
                  <a-tooltip title="Sửa" v-if="['draft','pending'].includes(record.status)">
                    <a-button type="text" size="small" @click="openChangeRequestModal(record)"><EditOutlined /></a-button>
                  </a-tooltip>
                  <a-tooltip title="Gửi duyệt" v-if="record.status === 'draft'">
                    <a-popconfirm title="Gửi yêu cầu để duyệt?" @confirm="submitCR(record)">
                      <a-button type="text" size="small" class="text-blue-600"><SendOutlined /></a-button>
                    </a-popconfirm>
                  </a-tooltip>
                  <a-tooltip title="Duyệt" v-if="record.status === 'pending' && can('change_request.approve')">
                    <a-popconfirm title="Duyệt yêu cầu thay đổi?" @confirm="approveCR(record)">
                      <a-button type="text" size="small" class="text-green-600"><CheckOutlined /></a-button>
                    </a-popconfirm>
                  </a-tooltip>
                  <a-tooltip title="Từ chối" v-if="record.status === 'pending' && can('change_request.approve')">
                    <a-popconfirm title="Từ chối yêu cầu?" @confirm="rejectCR(record)">
                      <a-button type="text" size="small" class="text-red-600"><CloseOutlined /></a-button>
                    </a-popconfirm>
                  </a-tooltip>
                  <a-tooltip title="Đánh dấu đã triển khai" v-if="record.status === 'approved'">
                    <a-popconfirm title="Đánh dấu đã triển khai?" @confirm="implementCR(record)">
                      <a-button type="text" size="small" class="text-purple-600"><CheckCircleOutlined /></a-button>
                    </a-popconfirm>
                  </a-tooltip>
                  <a-popconfirm v-if="['draft','cancelled'].includes(record.status) && can('change_request.delete')" title="Xóa?" @confirm="deleteChangeRequest(record)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </div>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ COMMENTS TAB ============ -->
      <a-tab-pane key="comments" v-if="isTabVisible('comments')">
        <template #tab><a-tooltip title="Trao đổi nội bộ giữa các thành viên dự án" placement="bottom">Bình luận ({{ commentCount }})</a-tooltip></template>
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
        <template #tab><a-tooltip title="Chi phí phát sinh ngoài báo giá: đề xuất → duyệt → ghi nhận" placement="bottom">CP Phát sinh ({{ project.additional_costs?.length || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('additional_cost.create')" type="primary" size="small" @click="openAdditionalCostModal()">
              <template #icon><PlusOutlined /></template>Đề xuất CP
            </a-button>
          </div>
          <a-table :columns="acCols" :data-source="project.additional_costs || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'amount'"><span class="font-semibold text-red-500">{{ fmt(record.amount) }}</span></template>
              <template v-else-if="column.key === 'proposer'">{{ record.proposer?.name || '—' }}</template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="acStatusColors[record.status]" class="rounded-full text-xs">{{ acStatusLabels[record.status] || record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="flex gap-1">
                  <a-tooltip v-if="record.status === 'pending_approval' && can('additional_cost.approve')" title="Duyệt">
                    <a-button type="text" size="small" :loading="actionLoading[`approve-ac-${record.id}`]" @click="approveAC(record)"><CheckCircleOutlined class="text-green-500" /></a-button>
                  </a-tooltip>
                  <a-tooltip v-if="record.status === 'pending_approval' && can('additional_cost.reject')" title="Từ chối">
                    <a-button type="text" size="small" danger @click="openRejectACModal(record)"><CloseCircleOutlined /></a-button>
                  </a-tooltip>
                  <a-popconfirm v-if="can('additional_cost.delete') && ['pending_approval','rejected'].includes(record.status)" title="Xóa?" @confirm="deleteAC(record)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                  <a-tooltip title="Đính kèm file">
                    <a-badge :count="record.attachments?.length || 0" :offset="[-2, 2]" size="small">
                      <a-button type="text" size="small" @click="openAttachModal('additional-cost', record)"><UploadOutlined class="text-gray-500" /></a-button>
                    </a-badge>
                  </a-tooltip>
                </div>
              </template>
            </template>
          </a-table>
          <a-empty v-if="!project.additional_costs?.length" description="Chưa có CP phát sinh" />
        </div>
      </a-tab-pane>

      <!-- ============ BUDGETS TAB ============ -->
      <a-tab-pane key="budgets" v-if="isTabVisible('budgets')">
        <template #tab><a-tooltip title="Quản lý ngân sách dự án: phân bổ theo hạng mục, theo dõi thực chi" placement="bottom">Ngân sách ({{ project.budgets?.length || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('budgets.create')" type="primary" size="small" @click="openBudgetModal()">
              <template #icon><PlusOutlined /></template>Tạo ngân sách
            </a-button>
          </div>
          <a-table :columns="budgetCols" :data-source="project.budgets || []" :pagination="false" row-key="id" size="small" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'total'"><span class="font-semibold">{{ fmt(record.total_budget) }}</span></template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="budgetStatusColors[record.status]" class="rounded-full text-xs">{{ budgetStatusLabels[record.status] || record.status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'creator'">{{ record.creator?.name || '—' }}</template>
              <template v-else-if="column.key === 'date'">{{ fmtDate(record.budget_date) }}</template>
              <template v-else-if="column.key === 'actions'">
                <div class="flex gap-1">
                  <a-tooltip v-if="can('budgets.update') && record.status === 'draft'" title="Duyệt">
                    <a-button type="text" size="small" @click="approveBudget(record)"><CheckCircleOutlined class="text-green-500" /></a-button>
                  </a-tooltip>
                  <a-popconfirm v-if="can('budgets.delete') && !['approved','archived'].includes(record.status)" title="Xóa?" @confirm="deleteBudget(record)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </div>
              </template>
            </template>
          </a-table>
          <a-empty v-if="!project.budgets?.length" description="Chưa có ngân sách" />
        </div>
      </a-tab-pane>

      <!-- ============ FINANCE DASHBOARD TAB (Sprint 2 — Module 3) ============ -->
      <a-tab-pane key="finance" v-if="isTabVisible('finance')">
        <template #tab><a-tooltip title="Dòng tiền, Lãi/Lỗ, Ngân sách vs Thực chi, Công nợ NTP, Bảo hành" placement="bottom">💰 Tài chính</a-tooltip></template>
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

      <!-- ============ INVOICES TAB ============ -->
      <a-tab-pane key="invoices" v-if="isTabVisible('invoices')">
        <template #tab><a-tooltip title="Quản lý hóa đơn xuất cho khách hàng: tạo, gửi, theo dõi thanh toán" placement="bottom">Hóa đơn ({{ project.invoices?.length || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('invoice.create')" type="primary" size="small" @click="openInvoiceModal(null)">
              <template #icon><PlusOutlined /></template>Tạo hóa đơn
            </a-button>
          </div>
          <a-table :columns="invoiceCols" :data-source="project.invoices || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'subtotal'"><span class="font-semibold">{{ fmt(record.subtotal) }}</span></template>
              <template v-else-if="column.key === 'total'"><span class="font-bold text-green-600">{{ fmt(record.total_amount) }}</span></template>
              <template v-else-if="column.key === 'date'">{{ fmtDate(record.invoice_date) }}</template>
              <template v-else-if="column.key === 'actions'">
                <div class="flex gap-1">
                  <a-button v-if="can('invoice.update')" type="text" size="small" @click="openInvoiceModal(record)"><EditOutlined /></a-button>
                  <a-popconfirm v-if="can('invoice.delete')" title="Xóa?" @confirm="deleteInvoice(record)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </div>
              </template>
            </template>
          </a-table>
          <a-empty v-if="!project.invoices?.length" description="Chưa có hóa đơn" />
        </div>
      </a-tab-pane>

      <!-- ============ RISKS TAB ============ -->
      <a-tab-pane key="risks" v-if="isTabVisible('risks')">
        <template #tab><a-tooltip title="Đánh giá và quản lý rủi ro: xác suất, ảnh hưởng, kế hoạch giảm thiểu" placement="bottom">Rủi ro ({{ project.risks?.length || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('project.risk.create')" type="primary" size="small" @click="openRiskModal()">
              <template #icon><PlusOutlined /></template>Thêm rủi ro
            </a-button>
          </div>
          <a-table :columns="riskCols" :data-source="project.risks || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table">
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
              <template v-else-if="column.key === 'actions'">
                <div class="flex gap-1 justify-center">
                  <a-tooltip title="Sửa">
                    <a-button type="text" size="small" @click="openRiskModal(record)"><EditOutlined /></a-button>
                  </a-tooltip>
                  <a-tooltip title="Đánh dấu đã xử lý" v-if="record.status !== 'closed'">
                    <a-popconfirm title="Đánh dấu rủi ro đã xử lý?" @confirm="resolveRisk(record)">
                      <a-button type="text" size="small" class="text-green-600"><CheckCircleOutlined /></a-button>
                    </a-popconfirm>
                  </a-tooltip>
                  <a-popconfirm v-if="can('project.risk.delete')" title="Xóa?" @confirm="deleteRisk(record)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </div>
              </template>
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
              <a-button type="primary" size="small" @click="showAttendanceModal = true">
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
            <a-table :columns="attendanceCols" :data-source="attendanceList" :pagination="{ pageSize: 15, showTotal: (t) => `${t} bản ghi` }" row-key="id" size="small" class="crm-table">
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
                  <span class="text-red-500">{{ record.check_out?.substring(0,5) || '—' }}</span>
                </template>
                <template v-else-if="column.key === 'hours'">
                  <span class="font-semibold">{{ record.hours_worked || 0 }}h</span>
                  <span v-if="record.overtime_hours > 0" class="text-amber-500 text-xs ml-1">(+{{ record.overtime_hours }}h OT)</span>
                </template>
                <template v-else-if="column.key === 'status'">
                  <a-tag :color="attendanceStatusColors[record.status]" class="rounded-full text-[10px]">{{ attendanceStatusLabels[record.status] || record.status }}</a-tag>
                </template>
                <template v-else-if="column.key === 'actions'">
                  <div class="flex gap-1">
                    <a-tooltip v-if="!record.approved_at" title="Duyệt">
                      <a-popconfirm title="Duyệt chấm công?" @confirm="approveAttendance(record.id)">
                        <a-button type="text" size="small"><CheckOutlined class="text-green-500" /></a-button>
                      </a-popconfirm>
                    </a-tooltip>
                    <span v-else class="text-xs text-green-500">✓</span>
                  </div>
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
            <a-button type="primary" size="small" @click="showLaborModal = true">
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
                <span class="text-lg font-bold" :class="(laborDashboard.summary?.avg_efficiency || 0) >= 90 ? 'text-green-600' : (laborDashboard.summary?.avg_efficiency || 0) >= 70 ? 'text-amber-600' : 'text-red-600'">
                  {{ laborDashboard.summary?.avg_efficiency?.toFixed(1) || 0 }}%
                </span>
              </div>
              <div class="h-4 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-700"
                  :class="(laborDashboard.summary?.avg_efficiency || 0) >= 90 ? 'bg-gradient-to-r from-green-400 to-green-500' : (laborDashboard.summary?.avg_efficiency || 0) >= 70 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-red-400 to-red-500'"
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
                  <div class="text-sm font-bold" :class="u.avg_efficiency >= 90 ? 'text-green-600' : u.avg_efficiency >= 70 ? 'text-amber-600' : 'text-red-500'">
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
                  <a-popconfirm title="Xóa bản ghi?" @confirm="deleteLaborRecord(record.id)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </template>
              </template>
            </a-table>
          </div>
        </div>
      </a-tab-pane>

      <!-- ============ MATERIALS TAB (Giống APP) ============ -->
      <a-tab-pane key="materials" v-if="isTabVisible('materials')">
        <template #tab><a-tooltip title="Quản lý vật liệu sử dụng trong dự án: ghi nhận xuất kho, chi phí vật tư" placement="bottom">Vật liệu ({{ projectMaterials?.length || 0 }})</a-tooltip></template>
        <div class="p-4">
          <!-- Summary Cards -->
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100/60">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center"><span class="text-blue-600 text-sm">📦</span></div>
                <span class="text-xs text-gray-400">Vật liệu sử dụng</span>
              </div>
              <div class="text-xl font-bold text-gray-800">{{ projectMaterials?.length || 0 }}</div>
            </div>
            <div class="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-100/60">
              <div class="flex items-center gap-2 mb-1">
                <div class="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center"><span class="text-emerald-600 text-sm">💰</span></div>
                <span class="text-xs text-gray-400">Tổng chi phí</span>
              </div>
              <div class="text-xl font-bold text-emerald-600">{{ fmt(totalMaterialCost) }}</div>
            </div>
          </div>

          <div class="flex justify-end mb-3">
            <a-button v-if="can('material.create')" type="primary" size="small" @click="openMaterialModal()">
              <template #icon><PlusOutlined /></template>Thêm vật liệu
            </a-button>
          </div>

          <a-table :columns="materialCols" :data-source="projectMaterials || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><span class="text-blue-600 text-xs">📦</span></div>
                  <div>
                    <div class="font-semibold text-gray-800">{{ record.name }}</div>
                    <div v-if="record.code" class="text-[10px] text-gray-400 font-mono">{{ record.code }}</div>
                  </div>
                </div>
              </template>
              <template v-else-if="column.key === 'usage'">
                <span class="font-semibold text-blue-600">{{ fmtQty(Math.abs(record.project_usage || 0)) }} <span class="text-xs text-gray-400">{{ record.unit }}</span></span>
              </template>
              <template v-else-if="column.key === 'transactions'">{{ record.project_transactions_count || 0 }} lần</template>
              <template v-else-if="column.key === 'total'">
                <span class="font-semibold text-emerald-600">{{ fmt(record.project_total_amount || 0) }}</span>
              </template>
            </template>
          </a-table>
          <a-empty v-if="!projectMaterials?.length" description="Chưa có vật liệu nào được sử dụng" />
        </div>
      </a-tab-pane>

      <!-- ============ EQUIPMENT TAB (Giống APP) ============ -->
      <a-tab-pane key="equipment" v-if="isTabVisible('equipment')">
        <template #tab><a-tooltip title="Quản lý thiết bị phân bổ cho dự án: thuê, có sẵn, bàn giao" placement="bottom">Thiết bị ({{ projectEquipment?.length || 0 }})</a-tooltip></template>
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('equipment.create')" type="primary" size="small" @click="openEquipmentModal()">
              <template #icon><PlusOutlined /></template>Phân bổ thiết bị
            </a-button>
          </div>

          <a-table :columns="equipmentCols" :data-source="projectEquipment || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table" :expandable="{ expandedRowRender: eqExpandedRow }">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <div class="flex items-center gap-2">
                  <div class="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center"><span class="text-amber-600 text-xs">🏗️</span></div>
                  <div>
                    <div class="font-semibold text-gray-800">{{ record.name }}</div>
                    <div v-if="record.code" class="text-[10px] text-gray-400 font-mono">{{ record.code }}</div>
                  </div>
                </div>
              </template>
              <template v-else-if="column.key === 'type'">
                <a-tag class="rounded-full text-xs">{{ eqTypeLabel(record.type) }}</a-tag>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="eqStatusColor(record.status)" class="rounded-full text-xs">{{ eqStatusLabel(record.status) }}</a-tag>
              </template>
              <template v-else-if="column.key === 'allocation'">
                <template v-if="record.allocations?.length">
                  <div v-for="a in record.allocations.slice(0,1)" :key="a.id">
                    <a-tag :color="a.allocation_type === 'rent' ? 'blue' : 'green'" class="rounded-full text-xs">{{ a.allocation_type === 'rent' ? 'Thuê' : 'Có sẵn' }}</a-tag>
                    <span class="text-xs text-gray-500 ml-1">{{ fmtDate(a.start_date) }}</span>
                    <span v-if="a.rental_fee" class="text-xs text-emerald-600 ml-1">{{ fmt(a.rental_fee) }}</span>
                  </div>
                </template>
                <span v-else class="text-xs text-gray-400">—</span>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="flex gap-1">
                  <template v-for="a in (record.allocations || []).filter(x => x.status === 'active')" :key="a.id">
                    <a-popconfirm title="Hoàn trả thiết bị?" @confirm="returnEquipmentAction(record, a)">
                      <a-button type="text" size="small" class="text-orange-500"><CloseCircleOutlined /> Trả</a-button>
                    </a-popconfirm>
                  </template>
                </div>
              </template>
            </template>
            <template #expandedRowRender="{ record }">
              <div class="px-4 py-2 bg-gray-50/50 rounded-lg">
                <div v-for="a in record.allocations" :key="a.id" class="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0 text-xs">
                  <a-tag :color="a.status === 'active' ? 'green' : 'default'" class="rounded-full">{{ a.status === 'active' ? 'Đang dùng' : 'Đã trả' }}</a-tag>
                  <span>{{ a.allocation_type === 'rent' ? 'Thuê' : 'Có sẵn' }} — SL: {{ a.quantity }}</span>
                  <span>{{ fmtDate(a.start_date) }} → {{ a.return_date ? fmtDate(a.return_date) : (a.end_date ? fmtDate(a.end_date) : '...') }}</span>
                  <span v-if="a.rental_fee" class="text-emerald-600 font-semibold">{{ fmt(a.rental_fee) }}</span>
                  <span v-if="a.manager" class="text-gray-500">👤 {{ a.manager.name }}</span>
                  <span v-if="a.notes" class="text-gray-400 italic">{{ a.notes }}</span>
                </div>
              </div>
            </template>
          </a-table>
          <a-empty v-if="!projectEquipment?.length" description="Chưa có thiết bị nào trong dự án" />
        </div>
      </a-tab-pane>

      <!-- ============ DOCUMENTS TAB ============ -->
      <a-tab-pane key="documents" v-if="isTabVisible('documents')">
        <template #tab><a-tooltip title="Kho tài liệu dự án: bản vẽ, hợp đồng, biên bản, hình ảnh" placement="bottom">Tài liệu ({{ project.attachments?.length || 0 }})</a-tooltip></template>
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
              <template v-else-if="column.key === 'date'">{{ fmtDate(record.created_at) }}</template>
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
  </div>

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
        <a-col :span="12"><a-form-item label="Số tiền" required v-bind="fieldStatus('amount')"><a-input-number v-model:value="costForm.amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
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
          <a v-for="a in editingCost.attachments" :key="a.id" href="#" @click.prevent="openFilePreview(a)" class="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition cursor-pointer">
            <EyeOutlined class="text-[10px]" /> {{ a.original_name || a.file_name }}
          </a>
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
          <a-form-item label="Giá trị HĐ" required v-bind="fieldStatus('contract_value')"><a-input-number v-model:value="contractForm.contract_value" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Ngày ký" v-bind="fieldStatus('signed_date')"><a-date-picker v-model:value="contractForm.signed_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Trạng thái">
        <a-select v-model:value="contractForm.status" size="large" class="w-full">
          <a-select-option value="draft">Bản nháp</a-select-option>
          <a-select-option value="pending_customer_approval">Chờ KH duyệt</a-select-option>
          <a-select-option value="approved">Đã duyệt</a-select-option>
          <a-select-option value="rejected">Từ chối</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item v-if="editingContract?.rejected_reason" label="Lý do từ chối">
        <a-alert :message="editingContract.rejected_reason" type="error" show-icon class="!text-xs" />
      </a-form-item>
      <!-- Inline Attachments -->
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Tệp hợp đồng đính kèm</div>
        <div v-if="editingContract?.attachments?.length" class="flex flex-wrap gap-2 mb-2">
          <a v-for="a in editingContract.attachments" :key="a.id" href="#" @click.prevent="openFilePreview(a)" class="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition cursor-pointer">
            <EyeOutlined class="text-[10px]" /> {{ a.original_name || a.file_name }}
          </a>
        </div>
        <input type="file" multiple @change="e => modalFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="modalFiles.length" class="text-[10px] text-green-600 mt-1">{{ modalFiles.length }} tệp đã chọn — sẽ upload khi lưu</div>
      </div>
    </a-form>
  </a-modal>

  <!-- Payment Modal -->
  <a-modal v-model:open="showPaymentModal" title="Thêm thanh toán" :width="500" @ok="savePayment" ok-text="Lưu" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Số phiếu thanh toán"><a-input v-model:value="paymentForm.payment_number" size="large" placeholder="TT-001" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Hợp đồng liên kết" v-if="project.contract"><a-select v-model:value="paymentForm.contract_id" size="large" class="w-full" allow-clear>
          <a-select-option :value="project.contract.id">HĐ #{{ project.contract.id }} — {{ fmt(project.contract.contract_value) }}</a-select-option>
        </a-select></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Số tiền" required v-bind="fieldStatus('amount')"><a-input-number v-model:value="paymentForm.amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Ngày đến hạn" v-bind="fieldStatus('due_date')"><a-date-picker v-model:value="paymentForm.due_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="Ghi chú"><a-input v-model:value="paymentForm.notes" size="large" placeholder="Ghi chú thanh toán..." /></a-form-item>
      <!-- Inline Attachments -->
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Chứng từ thanh toán</div>
        <div v-if="editingPayment?.attachments?.length" class="flex flex-wrap gap-2 mb-2">
          <a v-for="a in editingPayment.attachments" :key="a.id" href="#" @click.prevent="openFilePreview(a)" class="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition cursor-pointer">
            <EyeOutlined class="text-[10px]" /> {{ a.original_name || a.file_name }}
          </a>
        </div>
        <input type="file" multiple @change="e => modalFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="modalFiles.length" class="text-[10px] text-green-600 mt-1">{{ modalFiles.length }} tệp đã chọn — sẽ upload khi lưu</div>
      </div>
    </a-form>
  </a-modal>

  <!-- Reject Payment Modal -->
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
        <a-select v-model:value="logForm.task_id" size="large" class="w-full" placeholder="Chọn công việc (tùy chọn)" allow-clear show-search :filter-option="(input, opt) => opt.label?.toLowerCase().includes(input.toLowerCase())">
          <a-select-option v-for="t in projectTasks" :key="t.id" :value="t.id" :label="t.name">{{ t.name }}</a-select-option>
        </a-select>
      </a-form-item>
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Số lượng nhân công">
            <a-input-number v-model:value="logForm.personnel_count" :min="0" size="large" class="w-full" placeholder="VD: 10" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Phần trăm hoàn thành">
            <a-slider v-model:value="logForm.completion_percentage" :min="0" :max="100" :step="5" :marks="{ 0: '0%', 25: '25%', 50: '50%', 75: '75%', 100: '100%' }" />
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Ghi chú">
        <a-textarea v-model:value="logForm.notes" :rows="4" placeholder="Mô tả công việc đã thực hiện trong ngày..." :maxlength="2000" show-count />
      </a-form-item>
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
          <a-select-option v-for="t in projectTasks" :key="t.id" :value="t.id" :label="t.name">{{ t.name }}</a-select-option>
        </a-select></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Giai đoạn nghiệm thu"><a-select v-model:value="defectForm.acceptance_stage_id" size="large" class="w-full" allow-clear placeholder="Chọn giai đoạn">
          <a-select-option v-for="s in (project.acceptance_stages || [])" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
        </a-select></a-form-item></a-col>
      </a-row>
      <a-form-item label="Loại lỗi"><a-select v-model:value="defectForm.defect_type" size="large" class="w-full" allow-clear placeholder="Chọn loại">
        <a-select-option value="standard_violation">Vi phạm tiêu chuẩn</a-select-option>
        <a-select-option value="other">Khác</a-select-option>
      </a-select></a-form-item>
      <!-- Inline Attachments -->
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Hình ảnh / File đính kèm</div>
        <div v-if="editingDefect?.attachments?.length" class="flex flex-wrap gap-2 mb-2">
          <a v-for="a in editingDefect.attachments" :key="a.id" href="#" @click.prevent="openFilePreview(a)" class="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition cursor-pointer">
            <EyeOutlined class="text-[10px]" /> {{ a.original_name || a.file_name }}
          </a>
        </div>
        <input type="file" multiple accept="image/*,.pdf,.doc,.docx" @change="e => modalFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="modalFiles.length" class="text-[10px] text-green-600 mt-1">{{ modalFiles.length }} tệp đã chọn — sẽ upload khi lưu</div>
      </div>
    </a-form>
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
        <a-slider v-model:value="taskForm.progress_percentage" :min="0" :max="100" :marks="{0:'0%', 25:'25%', 50:'50%', 75:'75%', 100:'100%'}" />
      </a-form-item>
      <a-form-item label="Mô tả"><a-textarea v-model:value="taskForm.description" :rows="3" placeholder="Mô tả công việc..." :maxlength="5000" show-count /></a-form-item>
    </a-form>
  </a-modal>

  <!-- ==================== NTP DETAIL DRAWER ==================== -->
  <a-drawer v-model:open="showSubDetailDrawer" :title="subDetail ? `NTP: ${subDetail.name}` : 'Chi tiết NTP'" :width="640" placement="right" destroy-on-close class="sub-detail-drawer">
    <template v-if="subDetail">
      <!-- Financial Summary Card -->
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-100">
        <div class="text-sm font-bold text-gray-700 mb-3">💰 Tổng quan tài chính</div>
        <a-row :gutter="12">
          <a-col :span="8">
            <div class="text-center">
              <div class="text-xs text-gray-500 mb-1">Hợp đồng</div>
              <div class="text-lg font-bold text-gray-800">{{ fmt(subDetail.total_quote) }}</div>
            </div>
          </a-col>
          <a-col :span="8">
            <div class="text-center">
              <div class="text-xs text-gray-500 mb-1">Đã thanh toán</div>
              <div class="text-lg font-bold text-green-500">{{ fmt(subDetail.total_paid || 0) }}</div>
            </div>
          </a-col>
          <a-col :span="8">
            <div class="text-center">
              <div class="text-xs text-gray-500 mb-1">Còn lại</div>
              <div class="text-lg font-bold text-red-500">{{ fmt(subDetail.total_quote - (subDetail.total_paid || 0)) }}</div>
            </div>
          </a-col>
        </a-row>
        <a-progress :percent="subDetail.total_quote > 0 ? Math.round((subDetail.total_paid || 0) / subDetail.total_quote * 100) : 0" :stroke-color="{ from: '#3B82F6', to: '#10B981' }" class="mt-3" />
      </div>

      <!-- Progress Info -->
      <div class="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <div class="text-sm font-bold text-gray-700 mb-3">📋 Thông tin & Tiến độ</div>
        <a-descriptions :column="2" size="small" bordered>
          <a-descriptions-item label="Danh mục">{{ subDetail.category || '—' }}</a-descriptions-item>
          <a-descriptions-item label="Trạng thái"><a-tag :color="subProgressColors[subDetail.progress_status]">{{ subProgressLabels[subDetail.progress_status] || '—' }}</a-tag></a-descriptions-item>
          <a-descriptions-item label="Ngày bắt đầu">{{ subDetail.progress_start_date ? fmtDate(subDetail.progress_start_date) : '—' }}</a-descriptions-item>
          <a-descriptions-item label="Ngày kết thúc">{{ subDetail.progress_end_date ? fmtDate(subDetail.progress_end_date) : '—' }}</a-descriptions-item>
        </a-descriptions>
      </div>

      <!-- Bank Info -->
      <div v-if="subDetail.bank_name || subDetail.bank_account_number" class="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <div class="text-sm font-bold text-gray-700 mb-3">🏦 Thông tin ngân hàng</div>
        <a-descriptions :column="1" size="small" bordered>
          <a-descriptions-item label="Ngân hàng">{{ subDetail.bank_name || '—' }}</a-descriptions-item>
          <a-descriptions-item label="Số tài khoản"><span class="text-blue-600 font-mono">{{ subDetail.bank_account_number || '—' }}</span></a-descriptions-item>
          <a-descriptions-item label="Chủ tài khoản"><strong>{{ subDetail.bank_account_name || '—' }}</strong></a-descriptions-item>
        </a-descriptions>
      </div>

      <!-- Attachments -->
      <div v-if="subDetail.attachments?.length" class="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <div class="text-sm font-bold text-gray-700 mb-3">📎 Tệp đính kèm ({{ subDetail.attachments.length }})</div>
        <div class="flex flex-wrap gap-2">
          <a v-for="a in subDetail.attachments" :key="a.id" href="#" @click.prevent="openFilePreview(a)" class="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition cursor-pointer">
            <EyeOutlined class="text-[10px]" /> {{ a.original_name || a.file_name }}
          </a>
        </div>
      </div>

      <!-- Payments History -->
      <div class="bg-white rounded-xl p-4 mb-4 border border-gray-100">
        <div class="flex items-center justify-between mb-3">
          <div class="text-sm font-bold text-gray-700">💳 Lịch sử thanh toán ({{ subDetail.payments?.length || 0 }})</div>
          <a-button type="primary" size="small" @click="openSubPaymentDrawer(subDetail)"><PlusOutlined /> Tạo phiếu TT</a-button>
        </div>
        <div v-if="subDetail.payments?.length">
          <div v-for="p in subDetail.payments" :key="p.id" class="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
            <div>
              <div class="text-sm font-medium">{{ p.payment_stage || 'Thanh toán' }}</div>
              <div class="text-xs text-gray-400">{{ p.payment_date ? fmtDate(p.payment_date) : '—' }} · {{ subPayMethodLabels[p.payment_method] || p.payment_method }}</div>
            </div>
            <div class="text-right">
              <div class="font-semibold text-sm">{{ fmt(p.amount) }}</div>
              <a-tag :color="subPayStatusColors[p.status]" class="text-[10px] rounded-full">{{ subPayStatusLabels[p.status] || p.status }}</a-tag>
            </div>
            <div class="flex gap-1 ml-2" @click.stop>
              <a-popconfirm v-if="p.status === 'draft'" title="Gửi duyệt phiếu này?" @confirm="submitSubPayment(subDetail, p)">
                <a-button type="text" size="small" class="text-blue-500"><SendOutlined /></a-button>
              </a-popconfirm>
              <a-popconfirm v-if="p.status === 'pending_management_approval'" title="BĐH duyệt phiếu này?" @confirm="approveSubPayment(subDetail, p)" ok-text="Duyệt">
                <a-button type="text" size="small" class="text-green-500"><CheckCircleOutlined /></a-button>
              </a-popconfirm>
              <a-popconfirm v-if="p.status === 'pending_accountant_confirmation'" title="KT xác nhận đã thanh toán?" @confirm="confirmSubPayment(subDetail, p)" ok-text="Xác nhận">
                <a-button type="text" size="small" class="text-green-600"><CheckSquareOutlined /></a-button>
              </a-popconfirm>
              <a-popconfirm v-if="['pending_management_approval','pending_accountant_confirmation'].includes(p.status)" title="Từ chối phiếu này?" @confirm="rejectSubPayment(subDetail, p)" ok-text="Từ chối" :ok-button-props="{ danger: true }">
                <a-button type="text" size="small" danger><CloseCircleOutlined /></a-button>
              </a-popconfirm>
              <a-popconfirm v-if="p.status !== 'paid'" title="Xóa phiếu TT này?" @confirm="deleteSubPayment(subDetail, p)">
                <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
              </a-popconfirm>
            </div>
          </div>
        </div>
        <a-empty v-else description="Chưa có phiếu thanh toán" :image="null" class="py-4" />
      </div>
    </template>
  </a-drawer>

  <!-- ==================== NTP PAYMENT CREATE DRAWER ==================== -->
  <a-drawer v-model:open="showSubPayDrawer" :title="`Tạo phiếu TT: ${subPayTarget?.name || ''}`" :width="500" placement="right" destroy-on-close>
    <a-form layout="vertical" class="mt-2">
      <a-form-item label="Đợt thanh toán"><a-input v-model:value="subPayForm.payment_stage" size="large" placeholder="VD: Đợt 1, Nghiệm thu lần 1..." /></a-form-item>
      <a-form-item label="Số tiền" required><a-input-number v-model:value="subPayForm.amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item>
      <a-form-item label="Ngày thanh toán"><a-date-picker v-model:value="subPayForm.payment_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item>
      <a-form-item label="Phương thức">
        <a-radio-group v-model:value="subPayForm.payment_method" button-style="solid" size="small">
          <a-radio-button value="bank_transfer">Chuyển khoản</a-radio-button>
          <a-radio-button value="cash">Tiền mặt</a-radio-button>
          <a-radio-button value="check">Séc</a-radio-button>
          <a-radio-button value="other">Khác</a-radio-button>
        </a-radio-group>
      </a-form-item>
      <a-form-item label="Số tham chiếu"><a-input v-model:value="subPayForm.reference_number" size="large" placeholder="Số chứng từ..." /></a-form-item>
      <a-form-item label="Ghi chú"><a-textarea v-model:value="subPayForm.description" :rows="3" placeholder="Nhập ghi chú..." /></a-form-item>
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Tệp minh chứng</div>
        <input type="file" multiple @change="e => subPayFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="subPayFiles.length" class="text-[10px] text-green-600 mt-1">{{ subPayFiles.length }} tệp đã chọn</div>
      </div>
    </a-form>
    <template #footer>
      <div class="flex justify-end gap-2">
        <a-button @click="showSubPayDrawer = false">Hủy</a-button>
        <a-button type="primary" @click="saveSubPayment">Tạo phiếu</a-button>
      </div>
    </template>
  </a-drawer>

  <!-- Subcontractor Modal -->
  <a-modal v-model:open="showSubModal" :title="editingSub ? 'Sửa NTP' : 'Thêm nhà thầu phụ'" :width="640" @ok="saveSub" ok-text="Lưu" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item v-if="!editingSub && globalSubcontractors.length" label="Chọn NTP có sẵn">
        <a-select v-model:value="subForm.global_subcontractor_id" show-search option-filter-prop="label" size="large" class="w-full" allow-clear placeholder="Chọn hoặc nhập mới" @change="onGlobalSubSelect">
          <a-select-option v-for="gs in globalSubcontractors" :key="gs.id" :value="gs.id" :label="gs.name">{{ gs.name }} ({{ gs.category || '—' }})</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="Tên NTP" required v-bind="fieldStatus('name')"><a-input v-model:value="subForm.name" size="large" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Danh mục"><a-input v-model:value="subForm.category" size="large" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Giá trị báo giá" required v-bind="fieldStatus('total_quote')"><a-input-number v-model:value="subForm.total_quote" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Ngân hàng"><a-input v-model:value="subForm.bank_name" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Số TK"><a-input v-model:value="subForm.bank_account_number" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Chủ TK"><a-input v-model:value="subForm.bank_account_name" size="large" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Ngày bắt đầu"><a-date-picker v-model:value="subForm.progress_start_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Ngày kết thúc"><a-date-picker v-model:value="subForm.progress_end_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
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
      <div v-if="!editingSub" class="border-t pt-3 mt-2">
        <a-checkbox v-model:checked="subForm.create_cost" class="mb-2">Tự động tạo chi phí dự án cho NTP này</a-checkbox>
        <a-form-item v-if="subForm.create_cost && costGroups.length" label="Nhóm chi phí">
          <a-select v-model:value="subForm.cost_group_id" size="large" class="w-full" allow-clear placeholder="Tự động tìm nhóm 'Nhà thầu phụ'">
            <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id">{{ g.name }}</a-select-option>
          </a-select>
        </a-form-item>
      </div>
      <!-- File Upload -->
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Báo giá / Hồ sơ đính kèm</div>
        <div v-if="editingSub?.attachments?.length" class="flex flex-wrap gap-2 mb-2">
          <a v-for="a in editingSub.attachments" :key="a.id" href="#" @click.prevent="openFilePreview(a)" class="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition cursor-pointer">
            <EyeOutlined class="text-[10px]" /> {{ a.original_name || a.file_name }}
          </a>
        </div>
        <input type="file" multiple @change="e => subFiles = [...(e.target.files || [])]" class="block w-full text-xs py-1.5 px-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition" />
        <div v-if="subFiles.length" class="text-[10px] text-green-600 mt-1">{{ subFiles.length }} tệp đã chọn — sẽ upload khi lưu</div>
      </div>
    </a-form>
  </a-modal>

  <!-- Additional Cost Modal -->
  <a-modal v-model:open="showACModal" title="Đề xuất chi phí phát sinh" :width="500" @ok="saveAC" ok-text="Gửi" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Số tiền" required v-bind="fieldStatus('amount')"><a-input-number v-model:value="acForm.amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item>
      <a-form-item label="Mô tả" required v-bind="fieldStatus('description')"><a-textarea v-model:value="acForm.description" :rows="3" /></a-form-item>
      <!-- Inline Attachments -->
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> Tệp minh chứng</div>
        <div v-if="editingAC?.attachments?.length" class="flex flex-wrap gap-2 mb-2">
          <a v-for="a in editingAC.attachments" :key="a.id" href="#" @click.prevent="openFilePreview(a)" class="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition cursor-pointer">
            <EyeOutlined class="text-[10px]" /> {{ a.original_name || a.file_name }}
          </a>
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
  <a-modal v-model:open="showBudgetModal" title="Tạo ngân sách" :width="700" @ok="saveBudget" ok-text="Lưu" cancel-text="Hủy" :confirm-loading="savingForm" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Tên ngân sách" required v-bind="fieldStatus('name')"><a-input v-model:value="budgetForm.name" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Ngày" required v-bind="fieldStatus('budget_date')"><a-date-picker v-model:value="budgetForm.budget_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
        <a-col :span="4"><a-form-item label="Phiên bản"><a-input v-model:value="budgetForm.version" size="large" placeholder="v1" /></a-form-item></a-col>
        <a-col :span="4"><a-form-item label="Trạng thái"><a-select v-model:value="budgetForm.status" size="large" class="w-full">
          <a-select-option value="draft">Nháp</a-select-option>
          <a-select-option value="approved">Đã duyệt</a-select-option>
          <a-select-option value="revised">Sửa đổi</a-select-option>
        </a-select></a-form-item></a-col>
      </a-row>
      <a-form-item label="Ghi chú"><a-textarea v-model:value="budgetForm.notes" :rows="2" /></a-form-item>
      <div class="mb-2 font-bold text-sm text-gray-700">Hạng mục</div>
      <div v-for="(item, idx) in budgetForm.items" :key="idx" class="flex gap-2 mb-2 items-end">
        <a-input v-model:value="item.name" placeholder="Tên hạng mục" size="small" class="flex-1" />
        <a-input-number v-model:value="item.estimated_amount" :min="0" placeholder="Số tiền" size="small" style="width: 160px" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" />
        <a-button type="text" size="small" danger @click="budgetForm.items.splice(idx, 1)" :disabled="budgetForm.items.length <= 1"><DeleteOutlined /></a-button>
      </div>
      <a-button type="dashed" size="small" @click="budgetForm.items.push({ name: '', estimated_amount: 0 })"><PlusOutlined /> Thêm hạng mục</a-button>
    </a-form>
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
        <a-col :span="8"><a-form-item label="Giá trước thuế" required><a-input-number v-model:value="invoiceForm.subtotal" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Thuế"><a-input-number v-model:value="invoiceForm.tax_amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Giảm giá"><a-input-number v-model:value="invoiceForm.discount_amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="Mô tả"><a-textarea v-model:value="invoiceForm.description" :rows="2" /></a-form-item>
      <a-form-item label="Ghi chú"><a-textarea v-model:value="invoiceForm.notes" :rows="2" /></a-form-item>
      <!-- Inline Attachments -->
      <div class="border-t pt-3 mt-2">
        <div class="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1"><FileOutlined /> File hóa đơn đính kèm</div>
        <div v-if="editingInvoice?.attachments?.length" class="flex flex-wrap gap-2 mb-2">
          <a v-for="a in editingInvoice.attachments" :key="a.id" href="#" @click.prevent="openFilePreview(a)" class="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-lg hover:bg-blue-100 transition cursor-pointer">
            <EyeOutlined class="text-[10px]" /> {{ a.original_name || a.file_name }}
          </a>
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
          <div v-if="acceptDetailStage.created_at">📅 Ngày tạo: {{ dayjs(acceptDetailStage.created_at).format('DD/MM/YYYY HH:mm') }}</div>
          <div><a-tag :color="acceptStatusColors[acceptDetailStage.status] || 'default'" class="rounded-full text-xs">{{ acceptStatusLabels[acceptDetailStage.status] || acceptDetailStage.status }}</a-tag></div>
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

      <!-- 2. Lỗi ghi nhận -->
      <div class="mb-5">
        <div class="flex items-center justify-between mb-2">
          <div>
            <div class="text-sm font-bold text-gray-700 flex items-center gap-1">⚠️ Lỗi ghi nhận</div>
            <div v-if="acceptDetailDefects.length" class="text-xs text-gray-400 mt-0.5">
              <span v-if="acceptDetailDefects.filter(d => d.status === 'verified').length" class="text-emerald-600">✓ {{ acceptDetailDefects.filter(d => d.status === 'verified').length }} đã xử lý</span>
              <span v-if="acceptDetailDefects.filter(d => d.status !== 'verified').length" class="text-red-500 ml-1">⚠ {{ acceptDetailDefects.filter(d => d.status !== 'verified').length }} chưa xử lý</span>
            </div>
          </div>
          <a-button v-if="can('defect.create')" type="dashed" size="small" @click="showCreateDefectInDrawer = true">
            <PlusOutlined /> Tạo lỗi
          </a-button>
        </div>

        <!-- Defects list -->
        <div v-for="d in acceptDetailDefects" :key="d.id" class="p-3 mb-2 rounded-lg border" :class="d.status === 'verified' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'">
          <div class="flex items-start justify-between">
            <div class="flex-1">
              <div class="text-sm font-semibold" :class="d.status === 'verified' ? 'text-green-700 line-through' : 'text-red-700'">{{ d.description }}</div>
              <div class="flex items-center gap-2 mt-1">
                <a-tag :color="d.severity === 'high' ? 'red' : d.severity === 'low' ? 'green' : 'orange'" class="rounded-full text-[10px]">{{ { low: 'Nhẹ', medium: 'TB', high: 'Nặng' }[d.severity] || d.severity }}</a-tag>
                <a-tag :color="{ open: 'default', in_progress: 'processing', resolved: 'blue', verified: 'success' }[d.status] || 'default'" class="rounded-full text-[10px]">{{ { open: 'Mở', in_progress: 'Đang xử lý', resolved: 'Đã sửa', verified: 'Đã xác nhận' }[d.status] || d.status }}</a-tag>
              </div>
            </div>
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
            <a-button type="primary" block @click="createDefectFromDrawer" :loading="creatingDefect">
              <CheckOutlined /> Tạo lỗi ghi nhận
            </a-button>
          </a-form>
        </div>
      </div>

      <!-- 3. Hạng mục nghiệm thu (items) -->
      <div v-if="acceptDetailStage.items?.length" class="mb-5">
        <div class="text-sm font-bold text-gray-700 mb-2">📋 Hạng mục nghiệm thu ({{ acceptDetailStage.items.length }})</div>
        <div v-for="item in acceptDetailStage.items" :key="item.id" class="flex items-center gap-2 py-2 px-3 rounded-lg mb-1" :class="item.workflow_status === 'customer_approved' ? 'bg-green-50' : 'bg-gray-50'">
          <a-checkbox :checked="item.workflow_status === 'customer_approved'" disabled />
          <span class="flex-1 text-sm" :class="item.workflow_status === 'customer_approved' ? 'text-green-600 line-through' : ''">{{ item.name }}</span>
          <a-tag v-if="item.workflow_status && item.workflow_status !== 'pending'" :color="acceptItemStatusColor(item.workflow_status)" class="rounded-full text-[10px]">{{ acceptItemStatusLabel(item.workflow_status) }}</a-tag>
        </div>
      </div>

      <!-- 4. Tài liệu đính kèm -->
      <div v-if="acceptDetailStage.attachments?.length" class="mb-5">
        <div class="text-sm font-bold text-gray-700 mb-2">📎 Tài liệu đính kèm ({{ acceptDetailStage.attachments.length }})</div>
        <div class="flex gap-2 flex-wrap">
          <a v-for="att in acceptDetailStage.attachments" :key="att.id" href="#" @click.prevent="openFilePreview(att)"
             class="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition border border-blue-100 cursor-pointer">
            <EyeOutlined class="text-[10px]" /> {{ att.original_name || att.file_name }}
          </a>
        </div>
      </div>

      <!-- Save Button -->
      <div v-if="can('acceptance.update')" class="pt-4 border-t">
        <a-button type="primary" block size="large" @click="saveAcceptDetail" :loading="savingAcceptDetail">
          <CheckCircleOutlined /> Lưu nghiệm thu
        </a-button>
      </div>
    </template>
  </a-drawer>

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

  <!-- ==================== MATERIAL BATCH MODAL ==================== -->
  <a-modal v-model:open="showMaterialModal" title="Thêm Vật Liệu Sử Dụng" :width="700" :footer="null" centered destroy-on-close class="crm-modal">
    <div class="mt-4 space-y-4">
      <!-- Batch List Header -->
      <div v-if="materialBatchItems.length" class="bg-blue-50 rounded-xl p-3 border border-blue-100">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold text-blue-800">Danh sách chờ ({{ materialBatchItems.length }})</span>
          <a-button type="text" size="small" danger @click="materialBatchItems = []">Xóa tất cả</a-button>
        </div>
        <div v-for="(bi, i) in materialBatchItems" :key="i" class="flex items-center justify-between px-2 py-1.5 bg-white rounded-lg mb-1 text-xs">
          <span class="font-semibold">{{ bi.material.name }}</span>
          <span class="text-gray-500">{{ bi.quantity }} {{ bi.material.unit }} — {{ fmt(bi.amount) }}</span>
          <a-button type="text" size="small" danger @click="materialBatchItems.splice(i, 1)"><DeleteOutlined /></a-button>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-blue-100 mt-2">
          <span class="text-sm font-bold text-gray-700">Tổng cộng:</span>
          <span class="text-sm font-bold text-emerald-600">{{ fmt(materialBatchItems.reduce((s,i) => s + i.amount, 0)) }}</span>
        </div>
      </div>

      <!-- Select Material -->
      <a-form layout="vertical">
        <a-form-item label="Chọn vật liệu">
          <a-select v-model:value="matForm.material_id" show-search option-filter-prop="label" placeholder="Tìm và chọn vật liệu..." size="large" class="w-full" @change="onMaterialSelect">
            <a-select-option v-for="m in materials" :key="m.id" :value="m.id" :label="m.name">
              {{ m.name }} <span class="text-gray-400 text-xs">({{ m.code || 'N/A' }})</span>
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="6">
            <a-form-item :label="'Số lượng' + (matFormSelected?.unit ? ` (${matFormSelected.unit})` : '')">
              <a-input-number v-model:value="matForm.quantity" :min="0.01" :step="1" size="large" class="w-full" @change="calcMatAmount" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="Đơn giá (VNĐ)">
              <a-input-number v-model:value="matForm.unit_price" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" @change="calcMatAmount" />
              <div v-if="matFormSelected?.unit_price" class="text-xs text-gray-400 mt-1">Niêm yết: {{ new Intl.NumberFormat('vi-VN').format(matFormSelected.unit_price) }} đ</div>
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label="Thành tiền (VNĐ)">
              <a-input-number v-model:value="matForm.amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" />
            </a-form-item>
          </a-col>
          <a-col :span="6">
            <a-form-item label=" ">
              <a-button type="dashed" block size="large" @click="addMaterialToBatch" :disabled="!matForm.material_id || !matForm.quantity || !matForm.amount">
                <PlusOutlined /> Thêm vào danh sách
              </a-button>
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="Ngày giao dịch">
              <a-date-picker v-model:value="matForm.transaction_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Nhóm chi phí" required>
              <a-select v-model:value="matForm.cost_group_id" placeholder="Chọn nhóm chi phí" size="large" class="w-full">
                <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id">{{ g.name }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>

      <a-button v-if="materialBatchItems.length" type="primary" block size="large" :loading="submittingMaterial" @click="submitMaterialBatch">
        <CheckOutlined /> Xác nhận & Đẩy qua chi phí ({{ materialBatchItems.length }} vật liệu)
      </a-button>
    </div>
  </a-modal>

  <!-- ==================== EQUIPMENT ALLOCATION MODAL ==================== -->
  <a-modal v-model:open="showEquipmentModal" title="Phân Bổ Thiết Bị" :width="600" @ok="submitEquipmentAllocation" ok-text="Phân bổ" cancel-text="Hủy" centered destroy-on-close class="crm-modal" :confirm-loading="submittingEquipment">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Chọn thiết bị" required>
        <a-select v-model:value="eqForm.equipment_id" show-search option-filter-prop="label" placeholder="Tìm thiết bị..." size="large" class="w-full">
          <a-select-option v-for="e in allEquipment" :key="e.id" :value="e.id" :label="e.name">
            {{ e.name }} <span class="text-gray-400 text-xs">({{ e.code || '' }} — {{ eqStatusLabel(e.status) }})</span>
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-form-item label="Loại hình">
        <a-radio-group v-model:value="eqForm.allocation_type" button-style="solid" size="large">
          <a-radio-button value="rent">Thuê</a-radio-button>
          <a-radio-button value="buy">Có sẵn</a-radio-button>
        </a-radio-group>
      </a-form-item>

      <a-row :gutter="12">
        <a-col :span="8"><a-form-item label="Số lượng"><a-input-number v-model:value="eqForm.quantity" :min="1" size="large" class="w-full" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Ngày bắt đầu" required><a-date-picker v-model:value="eqForm.start_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Ngày kết thúc"><a-date-picker v-model:value="eqForm.end_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
      </a-row>

      <!-- Rent fields -->
      <a-form-item v-if="eqForm.allocation_type === 'rent'" label="Tổng phí thuê (VNĐ)" required>
        <a-input-number v-model:value="eqForm.rental_fee" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" />
      </a-form-item>

      <!-- Buy fields -->
      <template v-if="eqForm.allocation_type === 'buy'">
        <a-form-item label="Người nhận bàn giao" required>
          <a-select v-model:value="eqForm.manager_id" show-search option-filter-prop="label" placeholder="Chọn người..." size="large" class="w-full">
            <a-select-option v-for="u in users" :key="u.id" :value="u.id" :label="u.name">{{ u.name }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-row :gutter="12">
          <a-col :span="12"><a-form-item label="Ngày bàn giao"><a-date-picker v-model:value="eqForm.handover_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
          <a-col :span="12"><a-form-item label="Ngày hoàn trả"><a-date-picker v-model:value="eqForm.return_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
        </a-row>
      </template>

      <a-form-item label="Ghi chú"><a-textarea v-model:value="eqForm.notes" :rows="2" placeholder="Ghi chú (tùy chọn)..." /></a-form-item>
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
          <a-select-option v-for="u in (project.personnel || []).map(p => p.user)" :key="u?.id" :value="u?.id">{{ u?.name }}</a-select-option>
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
        <a-form-item label="OT (giờ)">
          <a-input-number v-model:value="attendanceForm.overtime_hours" size="large" class="w-full" :min="0" :max="12" :step="0.5" />
        </a-form-item>
      </div>
      <a-form-item label="Ghi chú">
        <a-textarea v-model:value="attendanceForm.note" :rows="2" placeholder="Ghi chú thêm..." />
      </a-form-item>
    </a-form>
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
      <a-form-item label="Hạng mục công việc" required>
        <a-input v-model:value="laborForm.work_item" size="large" placeholder="VD: Đổ sàn tầng 3, Xây tường ngăn" />
      </a-form-item>
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
      <!-- Preview -->
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

</template>

<script setup>
import { ref, computed, watch, reactive, onMounted, onBeforeUnmount } from 'vue'
import { Head, router, usePage } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  ArrowLeftOutlined, EditOutlined, PlusOutlined, DeleteOutlined,
  SendOutlined, CheckCircleOutlined, CloseCircleOutlined,
  CheckOutlined, CloseOutlined, DollarOutlined,
  UploadOutlined, DownloadOutlined, FileOutlined,
  UserOutlined, CalendarOutlined, EyeOutlined, CheckSquareOutlined,
  LinkOutlined,
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  project: Object,
  users: Array,
  permissions: Array,
  costGroups: { type: Array, default: () => [] },
  personnelRoles: { type: Array, default: () => [] },
  materials: { type: Array, default: () => [] },
  globalSubcontractors: { type: Array, default: () => [] },
  projectTasks: { type: Array, default: () => [] },
  allTasks: { type: Array, default: () => [] },
  acceptanceTemplates: { type: Array, default: () => [] },
  parentTasks: { type: Array, default: () => [] },
  projectMaterials: { type: Array, default: () => [] },
  projectEquipment: { type: Array, default: () => [] },
  allEquipment: { type: Array, default: () => [] },
})

// ============ RBAC ============
const can = (perm) => {
  if (!props.permissions) return true // fallback for admin
  return props.permissions.includes(perm) || props.permissions.includes('*')
}

// ============ HELPERS ============
const fmt = (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) : '0 ₫'
const fmtDate = (d) => d ? dayjs(d).format('DD/MM/YYYY') : '—'
const totalCosts = computed(() => (props.project.costs || []).reduce((s, c) => s + Number(c.amount || 0), 0))

// ============ OVERVIEW COMPUTED ============
const totalAdditionalCosts = computed(() => (props.project.additional_costs || []).reduce((s, c) => s + Number(c.amount || 0), 0))
const totalSubPayments = computed(() => {
  const subs = props.project.subcontractors || []
  return subs.reduce((sum, s) => sum + (s.payments || []).reduce((ps, p) => ps + Number(p.amount || 0), 0), 0)
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
const openDefects = computed(() => (props.project.defects || []).filter(d => d.status === 'open' || d.status === 'in_progress').length)
const activeRisks = computed(() => (props.project.risks || []).filter(r => r.status !== 'closed').length)

// ============ STATE ============
const activeTab = ref('overview')
const activeTabGroup = ref('overview')
const costStatusFilter = ref('all')
const commentText = ref('')

// ============ UNIVERSAL LOADING SYSTEM ============
// pageLoading shows the top loading bar during page transitions
const pageLoading = ref(false)
let removeStartListener = null
let removeFinishListener = null

onMounted(() => {
  removeStartListener = router.on('start', () => { pageLoading.value = true })
  removeFinishListener = router.on('finish', () => { pageLoading.value = false })
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

/** Vietnamese error labels for common backend field names. */
const fieldLabels = {
  name: 'Tên', amount: 'Số tiền', cost_date: 'Ngày', description: 'Mô tả',
  contract_value: 'Giá trị HĐ', signed_date: 'Ngày ký', content: 'Nội dung',
  payment_number: 'Số phiếu', payment_date: 'Ngày TT', title: 'Tiêu đề',
  user_id: 'Nhân viên', personnel_role_id: 'Vai trò', customer_id: 'Khách hàng',
  log_date: 'Ngày', weather: 'Thời tiết', work_done: 'Nội dung công việc',
  severity: 'Mức độ', priority: 'Ưu tiên', impact: 'Ảnh hưởng',
  start_date: 'Ngày BĐ', end_date: 'Ngày KT', status: 'Trạng thái',
  category: 'Loại', reason: 'Lý do', budget_date: 'Ngày NS',
  invoice_date: 'Ngày HĐ', rejected_reason: 'Lý do từ chối',
  phone: 'SĐT', email: 'Email', company_name: 'Tên công ty',
  contact_person: 'Người liên hệ', contract_amount: 'Giá trị HĐ NTP',
  subtotal: 'Tổng phụ', tax_amount: 'Thuế', cost_group_id: 'Nhóm chi phí',
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
    const firstErr = Object.values(errors)[0]
    message.error(Array.isArray(firstErr) ? firstErr[0] : (firstErr || 'Thao tác thất bại'))
    extraOptions.onError?.(errors)
  },
})

/**
 * Helper for modal form saves with loading state.
 * Shows validation errors on form fields + toast message.
 */
const savingOptions = (extraOptions = {}) => ({
  ...extraOptions,
  onStart: () => { savingForm.value = true; clearFormErrors(); extraOptions.onStart?.() },
  onFinish: () => { savingForm.value = false; extraOptions.onFinish?.() },
  onSuccess: (...args) => { savingForm.value = false; clearFormErrors(); extraOptions.onSuccess?.(...args) },
  onError: (errors) => {
    savingForm.value = false
    Object.assign(formErrors, errors)
    const errorMessages = Object.entries(errors).map(([field, msg]) => {
      const label = fieldLabels[field] || field
      const text = Array.isArray(msg) ? msg[0] : msg
      return `${label}: ${text}`
    })
    if (errorMessages.length <= 3) {
      errorMessages.forEach(e => message.error(e, 4))
    } else {
      message.error(`Có ${errorMessages.length} lỗi cần sửa. Vui lòng kiểm tra các trường bắt buộc.`, 5)
    }
    extraOptions.onError?.(errors)
  },
})

// Helper to check loading state
const isLoading = (key) => !!actionLoading[key]

// Tab group → sub-tab mapping
const tabGroupTabs = {
  overview: ['overview'],
  schedule: ['gantt', 'progress'],
  finance: ['contract', 'costs', 'payments', 'budgets', 'additional_costs', 'invoices', 'finance'],
  expense: ['materials', 'equipment', 'subcontractors'],
  monitor: ['logs', 'acceptance', 'defects', 'change_requests', 'risks', 'comments'],
  hr: ['attendance', 'labor', 'personnel'],
  other: ['documents'],
}

// Only render tab-pane if it belongs to the active group
const isTabVisible = (tabKey) => {
  const tabs = tabGroupTabs[activeTabGroup.value]
  return tabs ? tabs.includes(tabKey) : false
}

// Tab groups with dynamic badge counts
const tabGroups = computed(() => [
  { key: 'overview', icon: '📊', label: 'Tổng quan', defaultTab: 'overview', badge: 0 },
  { key: 'schedule', icon: '📅', label: 'Kế hoạch', defaultTab: 'gantt', badge: props.allTasks?.length || 0 },
  { key: 'finance', icon: '💰', label: 'Tài Chính', defaultTab: 'contract', badge: (props.project.costs?.length || 0) + (props.project.payments?.length || 0) },
  { key: 'expense', icon: '🏗️', label: 'Chi Phí', defaultTab: 'materials', badge: (props.project.subcontractors?.length || 0) },
  { key: 'monitor', icon: '📋', label: 'Giám sát', defaultTab: 'logs', badge: (props.project.defects?.filter(d => d.status !== 'closed')?.length || 0) },
  { key: 'hr', icon: '👥', label: 'Nhân sự', defaultTab: 'attendance', badge: props.project.personnel?.length || 0 },
  { key: 'other', icon: '📁', label: 'Khác', defaultTab: 'documents', badge: props.project.attachments?.length || 0 },
])

// Map activeTab to correct group (for when tab clicked directly)
watch(activeTab, (tab) => {
  const groupMap = {
    overview: 'overview',
    gantt: 'schedule', progress: 'schedule',
    contract: 'finance', payments: 'finance', costs: 'finance', invoices: 'finance', finance: 'finance', budgets: 'finance', additional_costs: 'finance',
    materials: 'expense', equipment: 'expense', subcontractors: 'expense',
    logs: 'monitor', acceptance: 'monitor', defects: 'monitor', change_requests: 'monitor', risks: 'monitor', comments: 'monitor',
    attendance: 'hr', labor: 'hr', personnel: 'hr',
    documents: 'other',
  }
  activeTabGroup.value = groupMap[tab] || 'overview'
})

const filteredCosts = computed(() => {
  const costs = props.project.costs || []
  if (costStatusFilter.value === 'all') return costs
  if (costStatusFilter.value === 'pending') return costs.filter(c => ['pending_management_approval', 'pending_accountant_approval'].includes(c.status))
  return costs.filter(c => c.status === costStatusFilter.value)
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
  ganttLoading.value = true
  try {
    const data = await apiGet(`/projects/${props.project.id}/gantt`)
    ganttTasks.value = data.data?.tasks || []
  } catch (e) { console.error('Gantt load error', e) }
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
watch(activeTab, (val) => {
  if (val === 'gantt') {
    loadGanttData()
    loadWbsTemplates()
    loadDelayWarnings()
  }
  if (val === 'finance') loadFinanceData()
})

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
const costStatusLabels = { draft: 'Nháp', submitted: 'Đã gửi', pending_management_approval: 'Chờ BĐH duyệt', pending_accountant_approval: 'Chờ KT xác nhận', approved_management: 'BĐH đã duyệt', approved_accountant: 'KT đã xác nhận', rejected: 'Từ chối' }
const costStatusColors = { draft: 'default', submitted: 'processing', pending_management_approval: 'orange', pending_accountant_approval: 'blue', approved_management: 'cyan', approved_accountant: 'green', rejected: 'red' }
const severityColors = { low: 'green', medium: 'orange', major: 'red', critical: 'volcano', high: 'red' }
const severityLabels = { low: 'Thấp', medium: 'Trung bình', major: 'Nghiêm trọng', critical: 'Rất nghiêm trọng', high: 'Cao' }
const subProgressLabels = { not_started: 'Chưa bắt đầu', in_progress: 'Đang thi công', completed: 'Hoàn thành', delayed: 'Chậm tiến độ' }
const subProgressColors = { not_started: 'default', in_progress: 'processing', completed: 'green', delayed: 'red' }
const subPayStatusLabels = { draft: 'Nháp', pending_management_approval: 'Chờ BĐH duyệt', pending_accountant_confirmation: 'Chờ KT xác nhận', paid: 'Đã thanh toán', rejected: 'Từ chối', cancelled: 'Đã hủy' }
const subPayStatusColors = { draft: 'default', pending_management_approval: 'orange', pending_accountant_confirmation: 'blue', paid: 'green', rejected: 'red', cancelled: 'default' }
const subPayMethodLabels = { bank_transfer: 'Chuyển khoản', cash: 'Tiền mặt', check: 'Séc', other: 'Khác' }
const acStatusLabels = { pending_approval: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' }
const acStatusColors = { pending_approval: 'orange', approved: 'green', rejected: 'red' }
const contractStatusLabels = { draft: 'Nháp', active: 'Đang hiệu lực', approved: 'Đã duyệt', expired: 'Hết hạn', terminated: 'Đã thanh lý' }
const contractStatusColors = { draft: 'default', active: 'green', approved: 'green', expired: 'orange', terminated: 'red' }
const paymentStatusLabelsMap = { pending: 'Chờ thanh toán', customer_paid: 'KH đã TT', customer_pending_approval: 'Chờ KH duyệt', customer_approved: 'KH đã duyệt', confirmed: 'KT đã xác nhận', paid: 'Đã TT đủ', partial: 'TT 1 phần', completed: 'Hoàn tất', overdue: 'Quá hạn TT' }
const paymentTagColors = { pending: 'orange', customer_paid: 'blue', customer_pending_approval: 'cyan', customer_approved: 'geekblue', confirmed: 'green', paid: 'green', partial: 'blue', completed: 'green', overdue: 'red' }
const defectStatusLabels = { open: 'Mở', in_progress: 'Đang xử lý', fixed: 'Đã sửa', verified: 'Đã xác nhận', closed: 'Đã đóng' }
const defectStatusColors = { open: 'red', in_progress: 'processing', fixed: 'green', verified: 'cyan', closed: 'default' }
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
const acceptStatusLabels = { pending: 'Chờ duyệt', supervisor_approved: 'GS duyệt', project_manager_approved: 'QLDA duyệt', customer_approved: 'KH duyệt', owner_approved: 'CĐT duyệt' }

// ============ TABLE COLUMNS ============
const costCols = [
  { title: 'Tên', dataIndex: 'name', ellipsis: true },
  { title: 'Số tiền', key: 'amount', align: 'right', width: 150 },
  { title: 'Nhóm', dataIndex: ['cost_group', 'name'], width: 130 },
  { title: 'Trạng thái', key: 'status', width: 120 },
  { title: 'Người tạo', key: 'creator', width: 120 },
  { title: 'Ngày', key: 'date', width: 110 },
  { title: '', key: 'actions', width: 160, align: 'center' },
]

const paymentCols = [
  { title: 'Đợt', key: 'payment_number', width: 60, align: 'center' },
  { title: 'Ghi chú', dataIndex: 'notes', ellipsis: true },
  { title: 'Số tiền', key: 'amount', align: 'right', width: 140 },
  { title: 'Thực TT', key: 'actual_amount', align: 'right', width: 140 },
  { title: 'Đến hạn', key: 'date', width: 110 },
  { title: 'Ngày TT', key: 'paid_date', width: 110 },
  { title: 'Trạng thái', key: 'status', width: 140 },
  { title: '', key: 'actions', width: 160, align: 'center' },
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

const defectCols = [
  { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
  { title: 'Mức độ', key: 'severity', width: 120 },
  { title: 'Trạng thái', key: 'status', width: 120 },
  { title: '', key: 'actions', width: 100, align: 'center' },
]

const crCols = [
  { title: 'Tiêu đề', dataIndex: 'title', ellipsis: true },
  { title: 'Loại', key: 'change_type', width: 100 },
  { title: 'Ưu tiên', key: 'priority', width: 100 },
  { title: 'CP ảnh hưởng', key: 'cost', align: 'right', width: 140 },
  { title: 'TĐ (ngày)', key: 'schedule', align: 'center', width: 90 },
  { title: 'Trạng thái', key: 'status', width: 130 },
  { title: '', key: 'actions', width: 180, align: 'center' },
]

const riskCols = [
  { title: 'Tiêu đề', dataIndex: 'title', ellipsis: true },
  { title: 'Danh mục', key: 'category', width: 100 },
  { title: 'Xác suất', key: 'probability', width: 90 },
  { title: 'Ảnh hưởng', key: 'impact', width: 90 },
  { title: 'Trạng thái', key: 'status', width: 130 },
  { title: 'Người xử lý', key: 'owner', width: 120 },
  { title: '', key: 'actions', width: 130, align: 'center' },
]

const subCols = [
  { title: 'Tên NTP', key: 'name', ellipsis: true },
  { title: 'Danh mục', dataIndex: 'category', width: 120 },
  { title: 'Báo giá', key: 'quote', align: 'right', width: 140 },
  { title: 'Đã TT', key: 'paid', align: 'right', width: 130 },
  { title: '% TT', key: 'paidPercent', width: 110 },
  { title: 'Tiến độ', key: 'progress', width: 120 },
  { title: 'Thời gian', key: 'dates', width: 120 },
  { title: '', key: 'actions', width: 150, align: 'center' },
]

const acCols = [
  { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
  { title: 'Số tiền', key: 'amount', align: 'right', width: 150 },
  { title: 'Người đề xuất', key: 'proposer', width: 140 },
  { title: 'Trạng thái', key: 'status', width: 120 },
  { title: '', key: 'actions', width: 120, align: 'center' },
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
  { title: '', key: 'actions', width: 100, align: 'center' },
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
const uploadModalFiles = (entityType, entityId) => {
  return new Promise((resolve) => {
    if (!modalFiles.value.length) return resolve()
    const formData = new FormData()
    modalFiles.value.forEach(f => formData.append('files[]', f))
    router.post(`/projects/${props.project.id}/${entityType}/${entityId}/attach-files`, formData, {
      forceFormData: true,
      preserveScroll: true,
      onSuccess: () => { modalFiles.value = []; resolve() },
      onError: () => { modalFiles.value = []; resolve() },
    })
  })
}

// ============ COST CRUD ============
const showCostModal = ref(false)
const editingCost = ref(null)
const costForm = ref({ name: '', amount: null, cost_date: null, cost_group_id: null, subcontractor_id: null, material_id: null, quantity: null, unit: '', description: '' })
const openCostModal = (c) => {
  editingCost.value = c
  modalFiles.value = []
  costForm.value = c ? { name: c.name, amount: c.amount, cost_date: c.cost_date, cost_group_id: c.cost_group_id, subcontractor_id: c.subcontractor_id || null, material_id: c.material_id || null, quantity: c.quantity || null, unit: c.unit || '', description: c.description || '' } : { name: '', amount: null, cost_date: dayjs().format('YYYY-MM-DD'), cost_group_id: null, subcontractor_id: null, material_id: null, quantity: null, unit: '', description: '' }
  showCostModal.value = true
}
const saveCost = () => {
  const url = editingCost.value ? `/projects/${props.project.id}/costs/${editingCost.value.id}` : `/projects/${props.project.id}/costs`
  const method = editingCost.value ? 'put' : 'post'
  router[method](url, costForm.value, savingOptions({
    onSuccess: async (page) => {
      showCostModal.value = false
      if (modalFiles.value.length) {
        const costId = editingCost.value?.id || page.props?.project?.costs?.slice(-1)[0]?.id
        if (costId) await uploadModalFiles('costs', costId)
        router.reload()
      }
    },
  }))
}
const deleteCost = (c) => router.delete(`/projects/${props.project.id}/costs/${c.id}`, loadingOptions(`delete-cost-${c.id}`))
const submitCost = (c) => router.post(`/projects/${props.project.id}/costs/${c.id}/submit`, {}, loadingOptions(`submit-cost-${c.id}`))
const approveCostMgmt = (c) => router.post(`/projects/${props.project.id}/costs/${c.id}/approve-management`, {}, loadingOptions(`approve-cost-mgmt-${c.id}`))
const approveCostAcct = (c) => router.post(`/projects/${props.project.id}/costs/${c.id}/approve-accountant`, {}, loadingOptions(`approve-cost-acct-${c.id}`))
const showRejectCostModal = ref(false)
const rejectingCost = ref(null)
const rejectCostReason = ref('')
const openRejectCostModal = (c) => { rejectingCost.value = c; rejectCostReason.value = ''; showRejectCostModal.value = true }
const rejectCost = () => { router.post(`/projects/${props.project.id}/costs/${rejectingCost.value.id}/reject`, { rejected_reason: rejectCostReason.value }, savingOptions({ onSuccess: () => showRejectCostModal.value = false })) }

// ============ CONTRACT CRUD ============
const showContractModal = ref(false)
const editingContract = ref(null)
const contractForm = ref({ contract_value: null, signed_date: null, status: 'draft' })

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
    ? { contract_value: c.contract_value, signed_date: c.signed_date, status: c.status || 'draft' }
    : { contract_value: null, signed_date: null, status: 'draft' }
  showContractModal.value = true
}
const saveContract = () => {
  const url = `/projects/${props.project.id}/contract`
  const method = editingContract.value ? 'put' : 'post'
  router[method](url, contractForm.value, savingOptions({
    onSuccess: async (page) => {
      showContractModal.value = false
      if (modalFiles.value.length) {
        const contractId = page.props?.project?.contract?.id
        if (contractId) await uploadModalFiles('contracts', contractId)
        router.reload()
      }
    },
  }))
}

// ============ PAYMENT CRUD ============
const showPaymentModal = ref(false)
const editingPayment = ref(null)
const paymentForm = ref({ payment_number: '', contract_id: null, notes: '', amount: null, due_date: null })
const openPaymentModal = (p = null) => {
  editingPayment.value = p
  modalFiles.value = []
  paymentForm.value = p ? { payment_number: p.payment_number || '', contract_id: p.contract_id || null, notes: p.notes || '', amount: p.amount, due_date: p.due_date } : { payment_number: '', contract_id: props.project.contract?.id || null, notes: '', amount: null, due_date: null }
  showPaymentModal.value = true
}
const savePayment = () => {
  router.post(`/projects/${props.project.id}/payments`, paymentForm.value, savingOptions({
    onSuccess: async (page) => {
      showPaymentModal.value = false
      if (modalFiles.value.length) {
        const payId = page.props?.project?.payments?.slice(-1)[0]?.id
        if (payId) await uploadModalFiles('payments', payId)
        router.reload()
      }
    },
  }))
}
const deletePayment = (p) => router.delete(`/projects/${props.project.id}/payments/${p.id}`, loadingOptions(`delete-pay-${p.id}`))
const markPaymentPaid = (p) => router.post(`/projects/${props.project.id}/payments/${p.id}/mark-paid`, { paid_date: new Date().toISOString().slice(0, 10) }, loadingOptions(`mark-paid-${p.id}`))
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
const attachType = ref('') // 'cost' | 'payment' | 'additional-cost'
const attachTarget = ref(null)
const attachFiles = ref([])
const attachFileInput = ref(null)
const attachModalTitles = { cost: 'Đính kèm file — Phiếu chi', payment: 'Đính kèm chứng từ — Thanh toán', 'additional-cost': 'Đính kèm file — CP Phát sinh' }
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
const logForm = ref({ log_date: null, task_id: null, weather: null, personnel_count: null, completion_percentage: 0, notes: '' })

const openLogModal = (record = null) => {
  if (record) {
    editingLog.value = record
    logForm.value = {
      task_id: record.task_id || null,
      weather: record.weather || null,
      personnel_count: record.personnel_count ?? null,
      completion_percentage: Number(record.completion_percentage || 0),
      notes: record.notes || '',
    }
  } else {
    editingLog.value = null
    logForm.value = { log_date: dayjs().format('YYYY-MM-DD'), task_id: null, weather: null, personnel_count: null, completion_percentage: 0, notes: '' }
  }
  showLogModal.value = true
}

const saveLog = () => {
  if (editingLog.value) {
    router.put(`/projects/${props.project.id}/logs/${editingLog.value.id}`, logForm.value, savingOptions({ preserveScroll: true, onSuccess: () => { showLogModal.value = false; editingLog.value = null } }))
  } else {
    router.post(`/projects/${props.project.id}/logs`, logForm.value, savingOptions({ preserveScroll: true, onSuccess: () => showLogModal.value = false }))
  }
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
const editingDefect = ref(null)
const defectForm = ref({ description: '', severity: 'medium', status: 'open', task_id: null, acceptance_stage_id: null, defect_type: null })
const openDefectModal = (d) => {
  editingDefect.value = d
  modalFiles.value = []
  defectForm.value = d
    ? { description: d.description || '', severity: d.severity, status: d.status, task_id: d.task_id || null, acceptance_stage_id: d.acceptance_stage_id || null, defect_type: d.defect_type || null }
    : { description: '', severity: 'medium', status: 'open', task_id: null, acceptance_stage_id: null, defect_type: null }
  showDefectModal.value = true
}
const saveDefect = () => {
  const url = editingDefect.value ? `/projects/${props.project.id}/defects/${editingDefect.value.id}` : `/projects/${props.project.id}/defects`
  const method = editingDefect.value ? 'put' : 'post'
  router[method](url, defectForm.value, savingOptions({
    onSuccess: async (page) => {
      showDefectModal.value = false
      if (modalFiles.value.length) {
        const defectId = editingDefect.value?.id || page.props?.project?.defects?.slice(-1)[0]?.id
        if (defectId) await uploadModalFiles('defects', defectId)
        router.reload()
      }
    },
  }))
}
const deleteDefect = (d) => router.delete(`/projects/${props.project.id}/defects/${d.id}`, loadingOptions(`delete-defect-${d.id}`))

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
    router.post(`/projects/${pId}/change-requests`, crForm.value, savingOptions({ preserveScroll: true, onSuccess: () => showCRModal.value = false }))
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
    router.post(`/projects/${pId}/risks`, riskForm.value, savingOptions({ preserveScroll: true, onSuccess: () => showRiskModal.value = false }))
  }
}

const resolveRisk = (r) => router.post(`/projects/${props.project.id}/risks/${r.id}/resolve`, {}, loadingOptions(`resolve-risk-${r.id}`, { preserveScroll: true }))
const deleteRisk = (r) => router.delete(`/projects/${props.project.id}/risks/${r.id}`, loadingOptions(`delete-risk-${r.id}`, { preserveScroll: true }))

// ============ TASK / PROGRESS ============
const taskStatusLabels = { not_started: 'Chưa bắt đầu', in_progress: 'Đang thực hiện', delayed: 'Trễ tiến độ', completed: 'Hoàn thành' }
const taskStatusColors = { not_started: 'default', in_progress: 'processing', delayed: 'error', completed: 'success' }

// Build tree: root = tasks with no parent_id
const rootTasks = computed(() => {
  return (props.allTasks || []).filter(t => !t.parent_id)
})

const taskStats = computed(() => {
  const all = props.allTasks || []
  return {
    total: all.length,
    not_started: all.filter(t => t.status === 'not_started').length,
    in_progress: all.filter(t => t.status === 'in_progress').length,
    delayed: all.filter(t => t.status === 'delayed').length,
    completed: all.filter(t => t.status === 'completed').length,
  }
})

const overallTaskProgress = computed(() => {
  const roots = rootTasks.value
  if (!roots.length) return 0
  const total = roots.reduce((sum, t) => sum + parseFloat(t.progress_percentage || 0), 0)
  return Math.round(total / roots.length * 10) / 10
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
    router.post(`/projects/${pId}/tasks`, taskForm.value, savingOptions({ preserveScroll: true, onSuccess: () => showTaskModal.value = false }))
  }
}

const deleteTask = (t) => router.delete(`/projects/${props.project.id}/tasks/${t.id}`, loadingOptions(`delete-task-${t.id}`, { preserveScroll: true }))

// ============ SUBCONTRACTOR CRUD ============
const showSubModal = ref(false)
const editingSub = ref(null)
const subFiles = ref([])
const subForm = ref({ name: '', category: '', total_quote: null, bank_name: '', bank_account_number: '', bank_account_name: '', progress_start_date: null, progress_end_date: null, progress_status: 'not_started', global_subcontractor_id: null, create_cost: true, cost_group_id: null })
const openSubModal = (s) => {
  editingSub.value = s
  subFiles.value = []
  subForm.value = s ? { name: s.name, category: s.category || '', total_quote: s.total_quote, bank_name: s.bank_name || '', bank_account_number: s.bank_account_number || '', bank_account_name: s.bank_account_name || '', progress_start_date: s.progress_start_date || null, progress_end_date: s.progress_end_date || null, progress_status: s.progress_status || 'not_started' }
    : { name: '', category: '', total_quote: null, bank_name: '', bank_account_number: '', bank_account_name: '', progress_start_date: null, progress_end_date: null, progress_status: 'not_started', global_subcontractor_id: null, create_cost: true, cost_group_id: null }
  showSubModal.value = true
}
const onGlobalSubSelect = (id) => {
  const gs = props.globalSubcontractors.find(g => g.id === id)
  if (gs) { subForm.value.name = gs.name; subForm.value.bank_name = gs.bank_name || ''; subForm.value.bank_account_number = gs.bank_account_number || ''; subForm.value.bank_account_name = gs.bank_account_name || ''; subForm.value.category = gs.category || '' }
}
const saveSub = () => {
  const url = editingSub.value ? `/projects/${props.project.id}/subcontractors/${editingSub.value.id}` : `/projects/${props.project.id}/subcontractors`
  const method = editingSub.value ? 'put' : 'post'

  // Use FormData if files are attached
  if (subFiles.value.length > 0) {
    const fd = new FormData()
    Object.entries(subForm.value).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') fd.append(k, v) })
    subFiles.value.forEach(f => fd.append('files[]', f))
    if (editingSub.value) fd.append('_method', 'PUT')
    router.post(url, fd, { forceFormData: true, preserveScroll: true, ...savingOptions({ onSuccess: () => { showSubModal.value = false; subFiles.value = [] } }) })
  } else {
    router[method](url, subForm.value, savingOptions({ preserveScroll: true, onSuccess: () => showSubModal.value = false }))
  }
}
const deleteSub = (s) => router.delete(`/projects/${props.project.id}/subcontractors/${s.id}`, loadingOptions(`delete-sub-${s.id}`, { preserveScroll: true }))
const approveSub = (s) => router.post(`/projects/${props.project.id}/subcontractors/${s.id}/approve`, {}, loadingOptions(`approve-sub-${s.id}`, { preserveScroll: true }))

// ============ SUBCONTRACTOR DETAIL DRAWER ============
const showSubDetailDrawer = ref(false)
const subDetail = ref(null)
const openSubDetail = (s) => { subDetail.value = s; showSubDetailDrawer.value = true }

// ============ SUBCONTRACTOR PAYMENT MANAGEMENT ============
const showSubPayDrawer = ref(false)
const subPayTarget = ref(null)
const subPayFiles = ref([])
const subPayForm = ref({ payment_stage: '', amount: null, payment_date: null, payment_method: 'bank_transfer', reference_number: '', description: '' })
const openSubPaymentDrawer = (sub) => {
  subPayTarget.value = sub
  subPayFiles.value = []
  subPayForm.value = { payment_stage: '', amount: null, payment_date: dayjs().format('YYYY-MM-DD'), payment_method: 'bank_transfer', reference_number: '', description: '' }
  showSubPayDrawer.value = true
}
const saveSubPayment = () => {
  if (!subPayTarget.value) return
  const url = `/projects/${props.project.id}/subcontractors/${subPayTarget.value.id}/payments`
  if (subPayFiles.value.length > 0) {
    const fd = new FormData()
    Object.entries(subPayForm.value).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') fd.append(k, v) })
    subPayFiles.value.forEach(f => fd.append('files[]', f))
    router.post(url, fd, { forceFormData: true, preserveScroll: true, ...savingOptions({ onSuccess: () => { showSubPayDrawer.value = false; subPayFiles.value = [] } }) })
  } else {
    router.post(url, subPayForm.value, savingOptions({ preserveScroll: true, onSuccess: () => showSubPayDrawer.value = false }))
  }
}
const submitSubPayment = (sub, p) => router.post(`/projects/${props.project.id}/subcontractors/${sub.id}/payments/${p.id}/submit`, {}, loadingOptions(`submit-subpay-${p.id}`, { preserveScroll: true }))
const approveSubPayment = (sub, p) => router.post(`/projects/${props.project.id}/subcontractors/${sub.id}/payments/${p.id}/approve`, {}, loadingOptions(`approve-subpay-${p.id}`, { preserveScroll: true }))
const rejectSubPayment = (sub, p) => router.post(`/projects/${props.project.id}/subcontractors/${sub.id}/payments/${p.id}/reject`, {}, loadingOptions(`reject-subpay-${p.id}`, { preserveScroll: true }))
const confirmSubPayment = (sub, p) => router.post(`/projects/${props.project.id}/subcontractors/${sub.id}/payments/${p.id}/confirm`, {}, loadingOptions(`confirm-subpay-${p.id}`, { preserveScroll: true }))
const deleteSubPayment = (sub, p) => router.delete(`/projects/${props.project.id}/subcontractors/${sub.id}/payments/${p.id}`, loadingOptions(`delete-subpay-${p.id}`, { preserveScroll: true }))

// ============ ADDITIONAL COST CRUD ============
const showACModal = ref(false)
const editingAC = ref(null)
const acForm = ref({ amount: null, description: '' })
const openAdditionalCostModal = (ac = null) => {
  editingAC.value = ac
  modalFiles.value = []
  acForm.value = ac ? { amount: ac.amount, description: ac.description || '' } : { amount: null, description: '' }
  showACModal.value = true
}
const saveAC = () => {
  router.post(`/projects/${props.project.id}/additional-costs`, acForm.value, savingOptions({
    onSuccess: async (page) => {
      showACModal.value = false
      if (modalFiles.value.length) {
        const acId = page.props?.project?.additional_costs?.slice(-1)[0]?.id
        if (acId) await uploadModalFiles('additional-costs', acId)
        router.reload()
      }
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

// ============ BUDGET CRUD ============
const showBudgetModal = ref(false)
const budgetForm = ref({ name: '', budget_date: null, version: '', status: 'draft', notes: '', items: [{ name: '', estimated_amount: 0 }] })
const openBudgetModal = () => { budgetForm.value = { name: '', budget_date: dayjs().format('YYYY-MM-DD'), version: 'v1', status: 'draft', notes: '', items: [{ name: '', estimated_amount: 0 }] }; showBudgetModal.value = true }
const saveBudget = () => { router.post(`/projects/${props.project.id}/budgets`, budgetForm.value, savingOptions({ onSuccess: () => showBudgetModal.value = false })) }
const approveBudget = (b) => router.put(`/projects/${props.project.id}/budgets/${b.id}`, { status: 'approved' }, loadingOptions(`approve-budget-${b.id}`))
const deleteBudget = (b) => router.delete(`/projects/${props.project.id}/budgets/${b.id}`, loadingOptions(`delete-budget-${b.id}`))

// ============ INVOICE CRUD ============
const showInvoiceModal = ref(false)
const editingInvoice = ref(null)
const invoiceForm = ref({ invoice_date: null, cost_group_id: null, subtotal: null, tax_amount: 0, discount_amount: 0, description: '', notes: '' })
const openInvoiceModal = (inv) => {
  editingInvoice.value = inv
  modalFiles.value = []
  invoiceForm.value = inv ? { invoice_date: inv.invoice_date, cost_group_id: inv.cost_group_id || null, subtotal: inv.subtotal, tax_amount: inv.tax_amount || 0, discount_amount: inv.discount_amount || 0, description: inv.description || '', notes: inv.notes || '' }
    : { invoice_date: dayjs().format('YYYY-MM-DD'), cost_group_id: null, subtotal: null, tax_amount: 0, discount_amount: 0, description: '', notes: '' }
  showInvoiceModal.value = true
}
const saveInvoice = () => {
  const url = editingInvoice.value ? `/projects/${props.project.id}/invoices/${editingInvoice.value.id}` : `/projects/${props.project.id}/invoices`
  const method = editingInvoice.value ? 'put' : 'post'
  router[method](url, invoiceForm.value, savingOptions({ onSuccess: () => showInvoiceModal.value = false }))
}
const deleteInvoice = (inv) => router.delete(`/projects/${props.project.id}/invoices/${inv.id}`, loadingOptions(`delete-invoice-${inv.id}`))

// ============ ACCEPTANCE CRUD (Giống APP: AcceptanceChecklist) ============
const showAcceptModal = ref(false)
const acceptForm = ref({ name: '', description: '', task_id: null, acceptance_template_id: null })
const openAcceptModal = () => { acceptForm.value = { name: '', description: '', task_id: null, acceptance_template_id: null }; showAcceptModal.value = true }
const saveAccept = () => { router.post(`/projects/${props.project.id}/acceptance`, acceptForm.value, savingOptions({ onSuccess: () => showAcceptModal.value = false })) }
const approveAccept = (stage, level) => router.post(`/projects/${props.project.id}/acceptance/${stage.id}/approve`, { level }, loadingOptions(`approve-accept-${stage.id}-${level}`))
const deleteAccept = (stage) => router.delete(`/projects/${props.project.id}/acceptance/${stage.id}`, loadingOptions(`delete-accept-${stage.id}`))

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
  if (stage.acceptability_status) return stage.acceptability_status
  const hasOpenDefects = (stage.defects || []).some(d => d.status === 'open' || d.status === 'in_progress')
  return hasOpenDefects ? 'not_acceptable' : 'acceptable'
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
const acceptItemStatusColor = (status) => ({ pending: 'default', submitted: 'processing', project_manager_approved: 'blue', customer_approved: 'success' }[status] || 'default')
const acceptItemStatusLabel = (status) => ({ pending: 'Chờ', submitted: 'Đã nộp', project_manager_approved: 'QLDA duyệt', customer_approved: 'KH duyệt' }[status] || status)

// ============ ACCEPTANCE DETAIL DRAWER (Giống APP: "Nghiệm thu giai đoạn") ============
const showAcceptDetailDrawer = ref(false)
const acceptDetailStage = ref(null)
const acceptDetailTemplateId = ref(null)
const acceptDetailDefects = ref([])
const showCreateDefectInDrawer = ref(false)
const newAcceptDefect = ref({ description: '', severity: 'medium' })
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
  showAcceptDetailDrawer.value = true
}

const onAcceptDetailTemplateChange = (val) => {
  acceptDetailTemplateId.value = val
}

const createDefectFromDrawer = () => {
  if (!newAcceptDefect.value.description?.trim()) return
  creatingDefect.value = true
  router.post(`/projects/${props.project.id}/defects`, {
    description: newAcceptDefect.value.description,
    severity: newAcceptDefect.value.severity,
    status: 'open',
    acceptance_stage_id: acceptDetailStage.value.id,
    task_id: acceptDetailStage.value.task_id || null,
  }, {
    onSuccess: () => {
      showCreateDefectInDrawer.value = false
      newAcceptDefect.value = { description: '', severity: 'medium' }
      showAcceptDetailDrawer.value = false // close drawer to refresh
    },
    onFinish: () => { creatingDefect.value = false },
  })
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

const attendanceStatusColors = { present: 'green', absent: 'red', late: 'orange', half_day: 'blue', leave: 'purple', holiday: 'pink' }
const attendanceStatusLabels = { present: 'Có mặt', absent: 'Vắng', late: 'Trễ', half_day: 'Nửa ngày', leave: 'Nghỉ phép', holiday: 'Nghỉ lễ' }

const attendanceCols = [
  { title: 'Nhân viên', key: 'user', width: 180 },
  { title: 'Ngày', key: 'date', width: 100, align: 'center' },
  { title: 'Vào', key: 'check_in', width: 70, align: 'center' },
  { title: 'Ra', key: 'check_out', width: 70, align: 'center' },
  { title: 'Giờ làm', key: 'hours', width: 130 },
  { title: 'Trạng thái', key: 'status', width: 100, align: 'center' },
  { title: '', key: 'actions', width: 60, align: 'center' },
]

const loadAttendanceData = async () => {
  try {
    const params = { project_id: props.project.id }
    if (attendanceDate.value) {
      params.year = attendanceDate.value.year()
      params.month = attendanceDate.value.month() + 1
    }
    const res = await axios.get('/api/attendance', { params })
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
    const res = await axios.get('/api/attendance/statistics', { params })
    attendanceSummary.value = res.data?.summary || null
    attendanceByUser.value = res.data?.by_user || []
  } catch (e) { console.error('Load attendance stats:', e) }
}

const approveAttendance = async (id) => {
  try {
    await axios.post(`/api/attendance/${id}/approve`)
    message.success('Đã duyệt chấm công')
    loadAttendanceData()
  } catch (e) { message.error('Lỗi duyệt chấm công') }
}

const loadShifts = async () => {
  try {
    const res = await axios.get('/api/shifts', { params: { project_id: props.project.id } })
    shiftsList.value = res.data || []
  } catch (e) { console.error('Load shifts:', e) }
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
    const res = await axios.get(`/api/projects/${props.project.id}/labor-productivity/dashboard`)
    laborDashboard.value = res.data || null
  } catch (e) { console.error('Load labor dashboard:', e) }
}

const loadLaborRecords = async () => {
  try {
    const res = await axios.get(`/api/projects/${props.project.id}/labor-productivity`)
    laborRecords.value = res.data?.data || res.data || []
  } catch (e) { console.error('Load labor records:', e) }
}

const deleteLaborRecord = async (id) => {
  try {
    await axios.delete(`/api/projects/${props.project.id}/labor-productivity/${id}`)
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
  work_item: '', unit: 'm²', planned_quantity: null, actual_quantity: null,
  workers_count: 1, hours_spent: 8, record_date: null, note: '',
})

const submitManualAttendance = async () => {
  if (!attendanceForm.value.user_id || !attendanceForm.value.work_date) {
    return message.warning('Vui lòng chọn nhân viên và ngày')
  }
  try {
    attendanceSaving.value = true
    await axios.post('/api/attendance', {
      ...attendanceForm.value,
      project_id: props.project.id,
      check_in_method: 'manual',
    })
    message.success('Đã chấm công thủ công')
    showAttendanceModal.value = false
    attendanceForm.value = { user_id: null, work_date: null, check_in: null, check_out: null, status: 'present', overtime_hours: 0, note: '' }
    loadAttendanceData()
  } catch (e) { message.error(e.response?.data?.message || 'Lỗi chấm công') }
  finally { attendanceSaving.value = false }
}

const submitShift = async () => {
  if (!shiftForm.value.name || !shiftForm.value.start_time || !shiftForm.value.end_time) {
    return message.warning('Vui lòng nhập tên ca và giờ')
  }
  try {
    shiftSaving.value = true
    await axios.post('/api/shifts', { ...shiftForm.value, project_id: props.project.id })
    message.success('Đã tạo ca làm việc')
    showShiftModal.value = false
    shiftForm.value = { name: '', start_time: null, end_time: null, break_hours: 1, overtime_multiplier: 1.5, is_overtime_shift: false }
    loadShifts()
  } catch (e) { message.error(e.response?.data?.message || 'Lỗi tạo ca') }
  finally { shiftSaving.value = false }
}

const submitLaborRecord = async () => {
  if (!laborForm.value.work_item || !laborForm.value.planned_quantity || !laborForm.value.actual_quantity) {
    return message.warning('Vui lòng nhập đầy đủ thông tin')
  }
  try {
    laborSaving.value = true
    await axios.post(`/api/projects/${props.project.id}/labor-productivity`, laborForm.value)
    message.success('Đã ghi nhận năng suất')
    showLaborModal.value = false
    laborForm.value = { work_item: '', unit: 'm²', planned_quantity: null, actual_quantity: null, workers_count: 1, hours_spent: 8, record_date: null, note: '' }
    loadLaborDashboard()
    loadLaborRecords()
  } catch (e) { message.error(e.response?.data?.message || 'Lỗi ghi nhận') }
  finally { laborSaving.value = false }
}

// Auto-load when switching to these tabs
watch(activeTab, (tab) => {
  if (tab === 'attendance') loadAttendanceData()
  if (tab === 'labor') { loadLaborDashboard(); loadLaborRecords() }
})

// ============ MATERIALS TAB (Giống APP) ============
const fmtQty = (v) => new Intl.NumberFormat('vi-VN').format(v)
const totalMaterialCost = computed(() => (props.projectMaterials || []).reduce((s, m) => s + Number(m.project_total_amount || 0), 0))

const materialCols = [
  { title: 'Vật liệu', key: 'name', dataIndex: 'name' },
  { title: 'Sử dụng', key: 'usage', width: 120, align: 'center' },
  { title: 'Lần dùng', key: 'transactions', width: 90, align: 'center' },
  { title: 'Tổng tiền', key: 'total', width: 150, align: 'right' },
]

const showMaterialModal = ref(false)
const materialBatchItems = ref([])
const submittingMaterial = ref(false)
const matForm = ref({ material_id: null, quantity: 1, unit_price: 0, amount: 0, notes: '', transaction_date: dayjs().format('YYYY-MM-DD'), cost_group_id: null })
const matFormSelected = computed(() => (props.materials || []).find(m => m.id === matForm.value.material_id))

const openMaterialModal = () => {
  matForm.value = { material_id: null, quantity: 1, unit_price: 0, amount: 0, notes: '', transaction_date: dayjs().format('YYYY-MM-DD'), cost_group_id: null }
  materialBatchItems.value = []
  showMaterialModal.value = true
}

const onMaterialSelect = (id) => {
  const m = (props.materials || []).find(x => x.id === id)
  if (m && m.unit_price) {
    matForm.value.unit_price = m.unit_price
    matForm.value.amount = matForm.value.quantity * m.unit_price
  } else {
    matForm.value.unit_price = 0
    matForm.value.amount = 0
  }
}

const calcMatAmount = () => {
  matForm.value.amount = (matForm.value.quantity || 0) * (matForm.value.unit_price || 0)
}

const addMaterialToBatch = () => {
  const m = (props.materials || []).find(x => x.id === matForm.value.material_id)
  if (!m) return
  materialBatchItems.value.push({
    material: m,
    quantity: matForm.value.quantity,
    amount: matForm.value.amount,
    notes: matForm.value.notes,
  })
  matForm.value = { ...matForm.value, material_id: null, quantity: 1, unit_price: 0, amount: 0, notes: '' }
}

const submitMaterialBatch = () => {
  if (!materialBatchItems.value.length || !matForm.value.cost_group_id) return
  submittingMaterial.value = true
  router.post(`/projects/${props.project.id}/materials/batch`, {
    transaction_date: matForm.value.transaction_date,
    cost_group_id: matForm.value.cost_group_id,
    items: materialBatchItems.value.map(b => ({
      material_id: b.material.id,
      quantity: b.quantity,
      amount: b.amount,
      notes: b.notes || undefined,
    })),
  }, {
    onSuccess: () => { showMaterialModal.value = false; materialBatchItems.value = [] },
    onFinish: () => { submittingMaterial.value = false },
  })
}

// ============ EQUIPMENT TAB (Giống APP) ============
const eqStatusLabel = (s) => ({ available: 'Sẵn sàng', in_use: 'Đang dùng', maintenance: 'Bảo trì', retired: 'Ngừng dùng' }[s] || s)
const eqStatusColor = (s) => ({ available: 'green', in_use: 'blue', maintenance: 'orange', retired: 'default' }[s] || 'default')
const eqTypeLabel = (t) => ({ owned: 'Có sẵn', rented: 'Thuê', leased: 'Thuê dài hạn' }[t] || t)

const equipmentCols = [
  { title: 'Thiết bị', key: 'name', dataIndex: 'name' },
  { title: 'Loại', key: 'type', width: 100, align: 'center' },
  { title: 'Trạng thái', key: 'status', width: 100, align: 'center' },
  { title: 'Phân bổ', key: 'allocation', width: 250 },
  { title: '', key: 'actions', width: 100, align: 'center' },
]

const showEquipmentModal = ref(false)
const submittingEquipment = ref(false)
const eqForm = ref({
  equipment_id: null, allocation_type: 'rent', quantity: 1,
  start_date: dayjs().format('YYYY-MM-DD'), end_date: null, notes: '',
  manager_id: null, handover_date: null, return_date: null, rental_fee: 0,
})

const openEquipmentModal = () => {
  eqForm.value = {
    equipment_id: null, allocation_type: 'rent', quantity: 1,
    start_date: dayjs().format('YYYY-MM-DD'), end_date: null, notes: '',
    manager_id: null, handover_date: null, return_date: null, rental_fee: 0,
  }
  showEquipmentModal.value = true
}

const submitEquipmentAllocation = () => {
  if (!eqForm.value.equipment_id) return
  submittingEquipment.value = true
  router.post(`/projects/${props.project.id}/equipment/allocate`, eqForm.value, {
    onSuccess: () => { showEquipmentModal.value = false },
    onFinish: () => { submittingEquipment.value = false },
  })
}

const returnEquipmentAction = (eq, allocation) => {
  router.post(`/projects/${props.project.id}/equipment/${allocation.id}/return`, {}, loadingOptions(`return-eq-${allocation.id}`))
}
</script>

<style scoped>
.crm-detail-tabs :deep(.ant-tabs-nav) { padding: 0 20px; background: #FAFBFC; border-bottom: 1px solid #E8ECF1; }
.crm-detail-tabs :deep(.ant-tabs-tab) { font-weight: 600; font-size: 13px; padding: 12px 4px; }
.crm-detail-tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn) { color: #2563EB !important; }
.crm-detail-tabs :deep(.ant-tabs-ink-bar) { background: #2563EB; height: 3px; border-radius: 3px 3px 0 0; }
.crm-modal :deep(.ant-modal-content) { border-radius: 16px; }

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
