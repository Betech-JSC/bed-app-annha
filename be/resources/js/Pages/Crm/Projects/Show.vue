<template>
  <Head :title="`Dự án: ${project.name}`" />

  <!-- Project Header -->
  <div class="flex items-start justify-between mb-6">
    <div>
      <div class="flex items-center gap-3 mb-1">
        <a-button type="text" @click="router.visit('/projects')"><ArrowLeftOutlined /></a-button>
        <h1 class="text-2xl font-extrabold text-gray-800">{{ project.name }}</h1>
        <a-tag :color="statusColors[project.status]" class="rounded-full text-sm">{{ statusLabels[project.status] }}</a-tag>
      </div>
      <div class="text-sm text-gray-400 ml-10">{{ project.code }} — {{ project.description || 'Chưa có mô tả' }}</div>
    </div>
    <div class="flex gap-2">
      <a-button v-if="can('project.update')" @click="openEditProject">
        <template #icon><EditOutlined /></template>Sửa
      </a-button>
    </div>
  </div>

  <!-- Quick Stats -->
  <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
    <div class="bg-white rounded-xl p-4 border border-gray-100">
      <div class="text-xs text-gray-400">Giá trị HĐ</div>
      <div class="text-lg font-bold text-gray-800">{{ fmt(project.contract?.contract_value) }}</div>
    </div>
    <div class="bg-white rounded-xl p-4 border border-gray-100">
      <div class="text-xs text-gray-400">Chi phí</div>
      <div class="text-lg font-bold text-red-500">{{ fmt(totalCosts) }}</div>
    </div>
    <div class="bg-white rounded-xl p-4 border border-gray-100">
      <div class="text-xs text-gray-400">Tiến độ</div>
      <div class="text-lg font-bold text-blue-600">{{ project.progress?.overall_percentage || 0 }}%</div>
    </div>
    <div class="bg-white rounded-xl p-4 border border-gray-100">
      <div class="text-xs text-gray-400">Nhân sự</div>
      <div class="text-lg font-bold">{{ project.personnel?.length || 0 }}</div>
    </div>
    <div class="bg-white rounded-xl p-4 border border-gray-100">
      <div class="text-xs text-gray-400">Lỗi / Rủi ro</div>
      <div class="text-lg font-bold text-amber-600">{{ project.defects?.length || 0 }} / {{ project.risks?.length || 0 }}</div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden">
    <a-tabs v-model:activeKey="activeTab" class="crm-detail-tabs">

      <!-- ============ OVERVIEW TAB ============ -->
      <a-tab-pane key="overview" tab="Tổng quan">
        <div class="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 class="font-bold text-gray-700 mb-3">Thông tin chung</h4>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-gray-400">Mã dự án</span><span class="font-semibold">{{ project.code }}</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Khách hàng</span><span class="font-semibold">{{ project.customer?.name || '—' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Quản lý dự án</span><span class="font-semibold">{{ project.project_manager?.name || '—' }}</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Ngày bắt đầu</span><span>{{ fmtDate(project.start_date) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Ngày kết thúc</span><span>{{ fmtDate(project.end_date) }}</span></div>
              <div class="flex justify-between"><span class="text-gray-400">Người tạo</span><span>{{ project.creator?.name || '—' }}</span></div>
            </div>
          </div>
          <div>
            <h4 class="font-bold text-gray-700 mb-3">Tiến độ</h4>
            <a-progress :percent="project.progress?.overall_percentage || 0" :stroke-color="{ '0%': '#1B4F72', '100%': '#2E86C1' }" />
            <div class="mt-4 text-sm text-gray-500">{{ project.description || 'Chưa có mô tả dự án.' }}</div>
          </div>
        </div>
      </a-tab-pane>

      <!-- ============ CONTRACT TAB ============ -->
      <a-tab-pane key="contract" tab="Hợp đồng">
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

      <!-- ============ COSTS TAB ============ -->
      <a-tab-pane key="costs" :tab="`Chi phí (${project.costs?.length || 0})`">
        <div class="p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm text-gray-400">Tổng: <span class="font-bold text-red-500">{{ fmt(totalCosts) }}</span></div>
            <a-button v-if="can('cost.create')" type="primary" size="small" @click="openCostModal(null)">
              <template #icon><PlusOutlined /></template>Thêm chi phí
            </a-button>
          </div>
          <a-table :columns="costCols" :data-source="project.costs || []" :pagination="{ pageSize: 10, showTotal: (t) => `${t} phiếu` }" row-key="id" size="small" class="crm-table">
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
                    <a-button type="text" size="small" @click="submitCost(record)"><SendOutlined class="text-blue-500" /></a-button>
                  </a-tooltip>
                  <a-tooltip v-if="record.status === 'pending_management_approval' && can('cost.approve.management')" title="Duyệt (BĐH)">
                    <a-button type="text" size="small" @click="approveCostMgmt(record)"><CheckCircleOutlined class="text-green-500" /></a-button>
                  </a-tooltip>
                  <a-tooltip v-if="record.status === 'pending_accountant_approval' && can('cost.approve.accountant')" title="Xác nhận (KT)">
                    <a-button type="text" size="small" @click="approveCostAcct(record)"><CheckCircleOutlined class="text-green-600" /></a-button>
                  </a-tooltip>
                  <a-tooltip v-if="['pending_management_approval','pending_accountant_approval'].includes(record.status) && can('cost.reject')" title="Từ chối">
                    <a-button type="text" size="small" danger @click="openRejectCostModal(record)"><CloseCircleOutlined /></a-button>
                  </a-tooltip>
                  <a-button v-if="can('cost.update') && record.status === 'draft'" type="text" size="small" @click="openCostModal(record)"><EditOutlined /></a-button>
                  <a-popconfirm v-if="can('cost.delete')" title="Xóa chi phí?" @confirm="deleteCost(record)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </div>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ PAYMENTS TAB ============ -->
      <a-tab-pane key="payments" :tab="`Thanh toán (${project.payments?.length || 0})`">
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('payment.create')" type="primary" size="small" @click="openPaymentModal()">
              <template #icon><PlusOutlined /></template>Thêm thanh toán
            </a-button>
          </div>
          <a-table :columns="paymentCols" :data-source="project.payments || []" :pagination="false" row-key="id" size="small" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'amount'"><span class="font-semibold text-green-600">{{ fmt(record.amount) }}</span></template>
              <template v-else-if="column.key === 'status'"><a-tag :color="paymentTagColors[record.status]" class="rounded-full text-xs">{{ paymentStatusLabelsMap[record.status] || record.status }}</a-tag></template>
              <template v-else-if="column.key === 'date'">{{ fmtDate(record.due_date) }}</template>
              <template v-else-if="column.key === 'actions'">
                <a-popconfirm v-if="can('payment.delete')" title="Xóa?" @confirm="deletePayment(record)">
                  <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                </a-popconfirm>
              </template>
            </template>
          </a-table>
          <a-empty v-if="!project.payments?.length" description="Chưa có thanh toán" />
        </div>
      </a-tab-pane>

      <!-- ============ PERSONNEL TAB ============ -->
      <a-tab-pane key="personnel" :tab="`Nhân sự (${project.personnel?.length || 0})`">
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
      <a-tab-pane key="subcontractors" :tab="`Nhà thầu phụ (${project.subcontractors?.length || 0})`">
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('subcontractor.create')" type="primary" size="small" @click="openSubModal(null)">
              <template #icon><PlusOutlined /></template>Thêm NTP
            </a-button>
          </div>
          <a-table :columns="subCols" :data-source="project.subcontractors || []" :pagination="{ pageSize: 10 }" row-key="id" size="small" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'quote'"><span class="font-semibold">{{ fmt(record.total_quote) }}</span></template>
              <template v-else-if="column.key === 'progress'">
                <a-tag :color="subProgressColors[record.progress_status]" class="rounded-full text-xs">{{ subProgressLabels[record.progress_status] || record.progress_status }}</a-tag>
              </template>
              <template v-else-if="column.key === 'actions'">
                <div class="flex gap-1">
                  <a-button v-if="can('subcontractor.update')" type="text" size="small" @click="openSubModal(record)"><EditOutlined /></a-button>
                  <a-popconfirm v-if="can('subcontractor.delete')" title="Xóa NTP?" @confirm="deleteSub(record)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </div>
              </template>
            </template>
          </a-table>
          <a-empty v-if="!project.subcontractors?.length" description="Chưa có nhà thầu phụ" />
        </div>
      </a-tab-pane>

      <!-- ============ LOGS TAB ============ -->
      <a-tab-pane key="logs" :tab="`Nhật ký (${project.construction_logs?.length || 0})`">
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
      <a-tab-pane key="acceptance" :tab="`Nghiệm thu (${project.acceptance_stages?.length || 0})`">
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('acceptance.create')" type="primary" size="small" @click="openAcceptModal()">
              <template #icon><PlusOutlined /></template>Tạo giai đoạn
            </a-button>
          </div>
          <div v-for="stage in (project.acceptance_stages || [])" :key="stage.id" class="mb-4 p-4 bg-gray-50 rounded-xl">
            <div class="flex items-center justify-between mb-2">
              <h5 class="font-bold">{{ stage.name }}</h5>
              <div class="flex gap-1 items-center">
                <a-tag :color="stage.status === 'pending' ? 'orange' : stage.status === 'customer_approved' ? 'green' : 'blue'" class="rounded-full text-xs">{{ acceptStatusLabels[stage.status] || stage.status }}</a-tag>
                <a-tooltip v-if="stage.status === 'pending' && can('acceptance.approve.level_1')" title="Duyệt (Giám sát)">
                  <a-button type="text" size="small" @click="approveAccept(stage, 1)"><CheckCircleOutlined class="text-blue-500" /></a-button>
                </a-tooltip>
                <a-tooltip v-if="stage.status === 'supervisor_approved' && can('acceptance.approve.level_2')" title="Duyệt (QLDA)">
                  <a-button type="text" size="small" @click="approveAccept(stage, 2)"><CheckCircleOutlined class="text-green-500" /></a-button>
                </a-tooltip>
                <a-tooltip v-if="stage.status === 'project_manager_approved' && can('acceptance.approve.level_3')" title="Duyệt (KH)">
                  <a-button type="text" size="small" @click="approveAccept(stage, 3)"><CheckCircleOutlined class="text-emerald-600" /></a-button>
                </a-tooltip>
                <a-popconfirm v-if="can('acceptance.delete') && stage.status !== 'owner_approved'" title="Xóa?" @confirm="deleteAccept(stage)">
                  <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                </a-popconfirm>
              </div>
            </div>
            <div v-if="stage.description" class="text-sm text-gray-500 mb-2">{{ stage.description }}</div>
            <div v-for="item in (stage.items || [])" :key="item.id" class="flex items-center gap-2 text-sm py-1">
              <a-checkbox :checked="item.is_completed" disabled />
              <span>{{ item.name }}</span>
            </div>
          </div>
          <a-empty v-if="!project.acceptance_stages?.length" description="Chưa có nghiệm thu" />
        </div>
      </a-tab-pane>

      <!-- ============ DEFECTS TAB ============ -->
      <a-tab-pane key="defects" :tab="`Lỗi (${project.defects?.length || 0})`">
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
      <a-tab-pane key="change_requests" :tab="`Thay đổi (${project.change_requests?.length || 0})`">
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('change_request.create')" type="primary" size="small" @click="openChangeRequestModal()">
              <template #icon><PlusOutlined /></template>Yêu cầu thay đổi
            </a-button>
          </div>
          <a-table :columns="crCols" :data-source="project.change_requests || []" :pagination="false" row-key="id" size="small" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'cost'"><span v-if="record.cost_impact" class="font-semibold">{{ fmt(record.cost_impact) }}</span><span v-else>—</span></template>
              <template v-else-if="column.key === 'status'"><a-tag :color="crStatusColors[record.status]" class="rounded-full">{{ crStatusLabels[record.status] || record.status }}</a-tag></template>
              <template v-else-if="column.key === 'actions'">
                <a-popconfirm v-if="can('change_request.delete')" title="Xóa?" @confirm="deleteChangeRequest(record)">
                  <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                </a-popconfirm>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ COMMENTS TAB ============ -->
      <a-tab-pane key="comments" :tab="`Bình luận (${project.comments?.length || 0})`">
        <div class="p-4">
          <div v-if="can('project.comment.create')" class="flex gap-2 mb-4">
            <a-textarea v-model:value="commentText" placeholder="Viết bình luận..." :rows="2" class="flex-1" />
            <a-button type="primary" @click="addComment" :disabled="!commentText.trim()">Gửi</a-button>
          </div>
          <div v-for="c in (project.comments || [])" :key="c.id" class="flex gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
            <a-avatar :size="32" class="bg-blue-500 text-white text-xs flex-shrink-0">{{ c.user?.name?.charAt(0) }}</a-avatar>
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-semibold text-sm">{{ c.user?.name }}</span>
                <span class="text-xs text-gray-400">{{ fmtDate(c.created_at) }}</span>
              </div>
              <div class="text-sm text-gray-700">{{ c.content }}</div>
            </div>
            <a-popconfirm v-if="can('project.comment.delete')" title="Xóa?" @confirm="deleteComment(c)">
              <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
            </a-popconfirm>
          </div>
          <a-empty v-if="!project.comments?.length" description="Chưa có bình luận" />
        </div>
      </a-tab-pane>

      <!-- ============ ADDITIONAL COSTS TAB ============ -->
      <a-tab-pane key="additional_costs" :tab="`CP Phát sinh (${project.additional_costs?.length || 0})`">
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
                    <a-button type="text" size="small" @click="approveAC(record)"><CheckCircleOutlined class="text-green-500" /></a-button>
                  </a-tooltip>
                  <a-tooltip v-if="record.status === 'pending_approval' && can('additional_cost.reject')" title="Từ chối">
                    <a-button type="text" size="small" danger @click="openRejectACModal(record)"><CloseCircleOutlined /></a-button>
                  </a-tooltip>
                  <a-popconfirm v-if="can('additional_cost.delete') && ['pending_approval','rejected'].includes(record.status)" title="Xóa?" @confirm="deleteAC(record)">
                    <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                  </a-popconfirm>
                </div>
              </template>
            </template>
          </a-table>
          <a-empty v-if="!project.additional_costs?.length" description="Chưa có CP phát sinh" />
        </div>
      </a-tab-pane>

      <!-- ============ BUDGETS TAB ============ -->
      <a-tab-pane key="budgets" :tab="`Ngân sách (${project.budgets?.length || 0})`">
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

      <!-- ============ INVOICES TAB ============ -->
      <a-tab-pane key="invoices" :tab="`Hóa đơn (${project.invoices?.length || 0})`">
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
      <a-tab-pane key="risks" :tab="`Rủi ro (${project.risks?.length || 0})`">
        <div class="p-4">
          <div class="flex justify-end mb-3">
            <a-button v-if="can('project.risk.create')" type="primary" size="small" @click="openRiskModal()">
              <template #icon><PlusOutlined /></template>Thêm rủi ro
            </a-button>
          </div>
          <a-table :columns="riskCols" :data-source="project.risks || []" :pagination="false" row-key="id" size="small" class="crm-table">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'severity'"><a-tag :color="severityColors[record.severity]" class="rounded-full">{{ record.severity }}</a-tag></template>
              <template v-else-if="column.key === 'status'"><a-tag :color="riskStatusColors[record.status]" class="rounded-full">{{ riskStatusLabels[record.status] || record.status }}</a-tag></template>
              <template v-else-if="column.key === 'actions'">
                <a-popconfirm v-if="can('project.risk.delete')" title="Xóa?" @confirm="deleteRisk(record)">
                  <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
                </a-popconfirm>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- ============ DOCUMENTS TAB ============ -->
      <a-tab-pane key="documents" :tab="`Tài liệu (${project.attachments?.length || 0})`">
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
                  <a :href="record.file_url" target="_blank" class="text-blue-600 hover:underline">{{ record.original_name || record.file_name }}</a>
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

  <!-- ==================== MODALS ==================== -->

  <!-- Edit Project Modal -->
  <a-modal v-model:open="showEditProject" title="Chỉnh sửa dự án" :width="640" @ok="saveProject" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tên dự án" required><a-input v-model:value="projectForm.name" size="large" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Khách hàng"><a-select v-model:value="projectForm.customer_id" show-search option-filter-prop="label" size="large" class="w-full">
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
        <a-col :span="8"><a-form-item label="Ngày BĐ"><a-date-picker v-model:value="projectForm.start_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Ngày KT"><a-date-picker v-model:value="projectForm.end_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="Mô tả"><a-textarea v-model:value="projectForm.description" :rows="3" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Cost Modal -->
  <a-modal v-model:open="showCostModal" :title="editingCost ? 'Sửa chi phí' : 'Thêm chi phí'" :width="640" @ok="saveCost" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tên chi phí" required><a-input v-model:value="costForm.name" size="large" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Số tiền" required><a-input-number v-model:value="costForm.amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Ngày" required><a-date-picker v-model:value="costForm.cost_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
      </a-row>
      <a-form-item v-if="costGroups.length" label="Nhóm chi phí"><a-select v-model:value="costForm.cost_group_id" size="large" class="w-full" allow-clear placeholder="Chọn nhóm">
        <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id">{{ g.name }}</a-select-option>
      </a-select></a-form-item>
      <a-form-item label="Mô tả"><a-textarea v-model:value="costForm.description" :rows="2" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Contract Modal -->
  <a-modal v-model:open="showContractModal" :title="editingContract ? 'Sửa hợp đồng' : 'Tạo hợp đồng'" :width="500" @ok="saveContract" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Giá trị HĐ" required><a-input-number v-model:value="contractForm.contract_value" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item>
      <a-form-item label="Ngày ký"><a-date-picker v-model:value="contractForm.signed_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Payment Modal -->
  <a-modal v-model:open="showPaymentModal" title="Thêm thanh toán" :width="500" @ok="savePayment" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Mô tả" required><a-input v-model:value="paymentForm.description" size="large" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Số tiền" required><a-input-number v-model:value="paymentForm.amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Ngày đến hạn"><a-date-picker v-model:value="paymentForm.due_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
      </a-row>
    </a-form>
  </a-modal>

  <!-- Personnel Modal -->
  <a-modal v-model:open="showPersonnelModal" title="Phân công nhân sự" :width="500" @ok="savePersonnel" ok-text="Phân công" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Nhân viên" required><a-select v-model:value="personnelForm.user_id" show-search option-filter-prop="label" size="large" class="w-full" placeholder="Chọn nhân viên">
        <a-select-option v-for="u in users" :key="u.id" :value="u.id" :label="u.name">{{ u.name }} ({{ u.email }})</a-select-option>
      </a-select></a-form-item>
      <a-form-item v-if="personnelRoles.length" label="Vai trò"><a-select v-model:value="personnelForm.personnel_role_id" size="large" class="w-full" allow-clear placeholder="Chọn vai trò">
        <a-select-option v-for="r in personnelRoles" :key="r.id" :value="r.id">{{ r.name }}</a-select-option>
      </a-select></a-form-item>
    </a-form>
  </a-modal>

  <!-- Log Modal -->
  <a-modal v-model:open="showLogModal" :title="editingLog ? 'Cập nhật nhật ký thi công' : 'Thêm nhật ký thi công'" :width="640" @ok="saveLog" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Ngày ghi nhật ký" required>
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
  <a-modal v-model:open="showDefectModal" :title="editingDefect ? 'Sửa lỗi' : 'Báo lỗi mới'" :width="600" @ok="saveDefect" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tiêu đề" required><a-input v-model:value="defectForm.title" size="large" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Mức độ" required><a-select v-model:value="defectForm.severity" size="large" class="w-full">
          <a-select-option value="low">Thấp</a-select-option>
          <a-select-option value="medium">Trung bình</a-select-option>
          <a-select-option value="major">Nghiêm trọng</a-select-option>
          <a-select-option value="critical">Rất nghiêm trọng</a-select-option>
        </a-select></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Trạng thái"><a-select v-model:value="defectForm.status" size="large" class="w-full">
          <a-select-option value="open">Mở</a-select-option>
          <a-select-option value="in_progress">Đang xử lý</a-select-option>
          <a-select-option value="fixed">Đã sửa</a-select-option>
          <a-select-option value="verified">Đã xác nhận</a-select-option>
        </a-select></a-form-item></a-col>
      </a-row>
      <a-form-item label="Mô tả"><a-textarea v-model:value="defectForm.description" :rows="3" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Change Request Modal -->
  <a-modal v-model:open="showCRModal" title="Yêu cầu thay đổi" :width="600" @ok="saveCR" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tiêu đề" required><a-input v-model:value="crForm.title" size="large" /></a-form-item>
      <a-form-item label="Ảnh hưởng chi phí"><a-input-number v-model:value="crForm.cost_impact" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item>
      <a-form-item label="Mô tả"><a-textarea v-model:value="crForm.description" :rows="3" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Risk Modal -->
  <a-modal v-model:open="showRiskModal" title="Thêm rủi ro" :width="600" @ok="saveRisk" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tiêu đề" required><a-input v-model:value="riskForm.title" size="large" /></a-form-item>
      <a-form-item label="Mức độ" required><a-select v-model:value="riskForm.severity" size="large" class="w-full">
        <a-select-option value="low">Thấp</a-select-option>
        <a-select-option value="medium">Trung bình</a-select-option>
        <a-select-option value="high">Cao</a-select-option>
      </a-select></a-form-item>
      <a-form-item label="Mô tả"><a-textarea v-model:value="riskForm.description" :rows="3" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Subcontractor Modal -->
  <a-modal v-model:open="showSubModal" :title="editingSub ? 'Sửa NTP' : 'Thêm nhà thầu phụ'" :width="640" @ok="saveSub" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item v-if="!editingSub && globalSubcontractors.length" label="Chọn NTP có sẵn">
        <a-select v-model:value="subForm.global_subcontractor_id" show-search option-filter-prop="label" size="large" class="w-full" allow-clear placeholder="Chọn hoặc nhập mới" @change="onGlobalSubSelect">
          <a-select-option v-for="gs in globalSubcontractors" :key="gs.id" :value="gs.id" :label="gs.name">{{ gs.name }} ({{ gs.category || '—' }})</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="Tên NTP" required><a-input v-model:value="subForm.name" size="large" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Danh mục"><a-input v-model:value="subForm.category" size="large" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Giá trị báo giá" required><a-input-number v-model:value="subForm.total_quote" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Ngân hàng"><a-input v-model:value="subForm.bank_name" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Số TK"><a-input v-model:value="subForm.bank_account_number" size="large" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Chủ TK"><a-input v-model:value="subForm.bank_account_name" size="large" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="Trạng thái tiến độ">
        <a-select v-model:value="subForm.progress_status" size="large" class="w-full">
          <a-select-option value="not_started">Chưa bắt đầu</a-select-option>
          <a-select-option value="in_progress">Đang thực hiện</a-select-option>
          <a-select-option value="completed">Hoàn thành</a-select-option>
          <a-select-option value="delayed">Trễ tiến độ</a-select-option>
        </a-select>
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- Additional Cost Modal -->
  <a-modal v-model:open="showACModal" title="Đề xuất chi phí phát sinh" :width="500" @ok="saveAC" ok-text="Gửi" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Số tiền" required><a-input-number v-model:value="acForm.amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item>
      <a-form-item label="Mô tả" required><a-textarea v-model:value="acForm.description" :rows="3" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Reject Additional Cost Modal -->
  <a-modal v-model:open="showRejectACModal" title="Từ chối CP phát sinh" :width="400" @ok="rejectAC" ok-text="Từ chối" cancel-text="Hủy" centered destroy-on-close class="crm-modal" :ok-button-props="{ danger: true }">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Lý do từ chối" required><a-textarea v-model:value="rejectACReason" :rows="3" placeholder="Nhập lý do..." /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Budget Modal -->
  <a-modal v-model:open="showBudgetModal" title="Tạo ngân sách" :width="700" @ok="saveBudget" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="12"><a-form-item label="Tên ngân sách" required><a-input v-model:value="budgetForm.name" size="large" /></a-form-item></a-col>
        <a-col :span="12"><a-form-item label="Ngày" required><a-date-picker v-model:value="budgetForm.budget_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item></a-col>
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
  <a-modal v-model:open="showInvoiceModal" :title="editingInvoice ? 'Sửa hóa đơn' : 'Tạo hóa đơn'" :width="600" @ok="saveInvoice" ok-text="Lưu" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Ngày hóa đơn" required><a-date-picker v-model:value="invoiceForm.invoice_date" size="large" class="w-full" format="DD/MM/YYYY" value-format="YYYY-MM-DD" /></a-form-item>
      <a-row :gutter="16">
        <a-col :span="8"><a-form-item label="Giá trước thuế" required><a-input-number v-model:value="invoiceForm.subtotal" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Thuế"><a-input-number v-model:value="invoiceForm.tax_amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
        <a-col :span="8"><a-form-item label="Giảm giá"><a-input-number v-model:value="invoiceForm.discount_amount" :min="0" size="large" class="w-full" :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" /></a-form-item></a-col>
      </a-row>
      <a-form-item label="Mô tả"><a-textarea v-model:value="invoiceForm.description" :rows="2" /></a-form-item>
      <a-form-item label="Ghi chú"><a-textarea v-model:value="invoiceForm.notes" :rows="2" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- Acceptance Modal -->
  <a-modal v-model:open="showAcceptModal" title="Tạo giai đoạn nghiệm thu" :width="500" @ok="saveAccept" ok-text="Tạo" cancel-text="Hủy" centered destroy-on-close class="crm-modal">
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Tên giai đoạn" required><a-input v-model:value="acceptForm.name" size="large" /></a-form-item>
      <a-form-item label="Mô tả"><a-textarea v-model:value="acceptForm.description" :rows="3" /></a-form-item>
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
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import dayjs from 'dayjs'
import {
  ArrowLeftOutlined, EditOutlined, PlusOutlined, DeleteOutlined,
  SendOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UploadOutlined, DownloadOutlined, FileOutlined,
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

// ============ STATE ============
const activeTab = ref('overview')
const commentText = ref('')

// Status maps
const statusLabels = { planning: 'Lập kế hoạch', in_progress: 'Đang thi công', completed: 'Hoàn thành', cancelled: 'Đã hủy' }
const statusColors = { planning: 'blue', in_progress: 'processing', completed: 'green', cancelled: 'default' }
const costStatusLabels = { draft: 'Nháp', submitted: 'Đã gửi', pending_management_approval: 'Chờ BĐH duyệt', pending_accountant_approval: 'Chờ KT xác nhận', approved_management: 'BĐH đã duyệt', approved_accountant: 'KT đã xác nhận', rejected: 'Từ chối' }
const costStatusColors = { draft: 'default', submitted: 'processing', pending_management_approval: 'orange', pending_accountant_approval: 'blue', approved_management: 'cyan', approved_accountant: 'green', rejected: 'red' }
const severityColors = { low: 'green', medium: 'orange', major: 'red', critical: 'volcano', high: 'red' }
const severityLabels = { low: 'Thấp', medium: 'Trung bình', major: 'Nghiêm trọng', critical: 'Rất nghiêm trọng', high: 'Cao' }
const subProgressLabels = { not_started: 'Chưa bắt đầu', in_progress: 'Đang thi công', completed: 'Hoàn thành', delayed: 'Chậm tiến độ' }
const subProgressColors = { not_started: 'default', in_progress: 'processing', completed: 'green', delayed: 'red' }
const acStatusLabels = { pending_approval: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' }
const acStatusColors = { pending_approval: 'orange', approved: 'green', rejected: 'red' }
const contractStatusLabels = { draft: 'Nháp', active: 'Đang hiệu lực', approved: 'Đã duyệt', expired: 'Hết hạn', terminated: 'Đã thanh lý' }
const contractStatusColors = { draft: 'default', active: 'green', approved: 'green', expired: 'orange', terminated: 'red' }
const paymentStatusLabelsMap = { pending: 'Chưa TT', partial: 'TT 1 phần', paid: 'Đã TT đủ', completed: 'Đã TT đủ', overdue: 'Quá hạn TT' }
const paymentTagColors = { pending: 'orange', partial: 'blue', paid: 'green', completed: 'green', overdue: 'red' }
const defectStatusLabels = { open: 'Mở', in_progress: 'Đang xử lý', fixed: 'Đã sửa', verified: 'Đã xác nhận', closed: 'Đã đóng' }
const defectStatusColors = { open: 'red', in_progress: 'processing', fixed: 'green', verified: 'cyan', closed: 'default' }
const crStatusLabels = { pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' }
const crStatusColors = { pending: 'orange', approved: 'green', rejected: 'red' }
const budgetStatusLabels = { draft: 'Nháp', approved: 'Đã duyệt', archived: 'Lưu trữ' }
const budgetStatusColors = { draft: 'default', approved: 'green', archived: 'blue' }
const riskStatusLabels = { open: 'Đang mở', mitigated: 'Đã giảm thiểu', resolved: 'Đã xử lý', closed: 'Đã đóng' }
const riskStatusColors = { open: 'red', mitigated: 'orange', resolved: 'green', closed: 'default' }
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
  { title: 'Mô tả', dataIndex: 'description', ellipsis: true },
  { title: 'Số tiền', key: 'amount', align: 'right', width: 150 },
  { title: 'Đến hạn', key: 'date', width: 120 },
  { title: 'Trạng thái', key: 'status', width: 120 },
  { title: '', key: 'actions', width: 80, align: 'center' },
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
  { title: 'Tiêu đề', dataIndex: 'title', ellipsis: true },
  { title: 'Mức độ', key: 'severity', width: 120 },
  { title: 'Trạng thái', key: 'status', width: 120 },
  { title: '', key: 'actions', width: 100, align: 'center' },
]

const crCols = [
  { title: 'Tiêu đề', dataIndex: 'title', ellipsis: true },
  { title: 'Ảnh hưởng CP', key: 'cost', align: 'right', width: 150 },
  { title: 'Trạng thái', key: 'status', width: 120 },
  { title: '', key: 'actions', width: 80, align: 'center' },
]

const riskCols = [
  { title: 'Tiêu đề', dataIndex: 'title', ellipsis: true },
  { title: 'Mức độ', key: 'severity', width: 120 },
  { title: 'Trạng thái', key: 'status', width: 120 },
  { title: '', key: 'actions', width: 80, align: 'center' },
]

const subCols = [
  { title: 'Tên NTP', dataIndex: 'name', ellipsis: true },
  { title: 'Danh mục', dataIndex: 'category', width: 130 },
  { title: 'Báo giá', key: 'quote', align: 'right', width: 150 },
  { title: 'Tiến độ', key: 'progress', width: 120 },
  { title: '', key: 'actions', width: 100, align: 'center' },
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
const saveProject = () => { router.put(`/projects/${props.project.id}`, projectForm.value, { onSuccess: () => showEditProject.value = false }) }

// ============ COST CRUD ============
const showCostModal = ref(false)
const editingCost = ref(null)
const costForm = ref({ name: '', amount: null, cost_date: null, cost_group_id: null, description: '' })
const openCostModal = (c) => {
  editingCost.value = c
  costForm.value = c ? { name: c.name, amount: c.amount, cost_date: c.cost_date, cost_group_id: c.cost_group_id, description: c.description || '' } : { name: '', amount: null, cost_date: dayjs().format('YYYY-MM-DD'), cost_group_id: null, description: '' }
  showCostModal.value = true
}
const saveCost = () => {
  const url = editingCost.value ? `/projects/${props.project.id}/costs/${editingCost.value.id}` : `/projects/${props.project.id}/costs`
  const method = editingCost.value ? 'put' : 'post'
  router[method](url, costForm.value, { onSuccess: () => showCostModal.value = false })
}
const deleteCost = (c) => router.delete(`/projects/${props.project.id}/costs/${c.id}`)
const submitCost = (c) => router.post(`/projects/${props.project.id}/costs/${c.id}/submit`)
const approveCostMgmt = (c) => router.post(`/projects/${props.project.id}/costs/${c.id}/approve-management`)
const approveCostAcct = (c) => router.post(`/projects/${props.project.id}/costs/${c.id}/approve-accountant`)
const showRejectCostModal = ref(false)
const rejectingCost = ref(null)
const rejectCostReason = ref('')
const openRejectCostModal = (c) => { rejectingCost.value = c; rejectCostReason.value = ''; showRejectCostModal.value = true }
const rejectCost = () => { router.post(`/projects/${props.project.id}/costs/${rejectingCost.value.id}/reject`, { rejected_reason: rejectCostReason.value }, { onSuccess: () => showRejectCostModal.value = false }) }

// ============ CONTRACT CRUD ============
const showContractModal = ref(false)
const editingContract = ref(null)
const contractForm = ref({ contract_value: null, signed_date: null })
const openContractModal = (c) => {
  editingContract.value = c
  contractForm.value = c ? { contract_value: c.contract_value, signed_date: c.signed_date } : { contract_value: null, signed_date: null }
  showContractModal.value = true
}
const saveContract = () => {
  const url = `/projects/${props.project.id}/contract`
  const method = editingContract.value ? 'put' : 'post'
  router[method](url, contractForm.value, { onSuccess: () => showContractModal.value = false })
}

// ============ PAYMENT CRUD ============
const showPaymentModal = ref(false)
const paymentForm = ref({ description: '', amount: null, due_date: null })
const openPaymentModal = () => { paymentForm.value = { description: '', amount: null, due_date: null }; showPaymentModal.value = true }
const savePayment = () => { router.post(`/projects/${props.project.id}/payments`, paymentForm.value, { onSuccess: () => showPaymentModal.value = false }) }
const deletePayment = (p) => router.delete(`/projects/${props.project.id}/payments/${p.id}`)

// ============ PERSONNEL CRUD ============
const showPersonnelModal = ref(false)
const personnelForm = ref({ user_id: null, personnel_role_id: null })
const openPersonnelModal = () => { personnelForm.value = { user_id: null, personnel_role_id: null }; showPersonnelModal.value = true }
const savePersonnel = () => { router.post(`/projects/${props.project.id}/personnel`, personnelForm.value, { onSuccess: () => showPersonnelModal.value = false }) }
const removePersonnel = (p) => router.delete(`/projects/${props.project.id}/personnel/${p.id}`)

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
    router.put(`/projects/${props.project.id}/logs/${editingLog.value.id}`, logForm.value, { preserveScroll: true, onSuccess: () => { showLogModal.value = false; editingLog.value = null } })
  } else {
    router.post(`/projects/${props.project.id}/logs`, logForm.value, { preserveScroll: true, onSuccess: () => showLogModal.value = false })
  }
}

const deleteLog = (l) => router.delete(`/projects/${props.project.id}/logs/${l.id}`, { preserveScroll: true })

// ============ COMMENT CRUD ============
const addComment = () => {
  if (!commentText.value.trim()) return
  router.post(`/projects/${props.project.id}/comments`, { content: commentText.value }, { onSuccess: () => commentText.value = '' })
}
const deleteComment = (c) => router.delete(`/projects/${props.project.id}/comments/${c.id}`)

// ============ DEFECT CRUD ============
const showDefectModal = ref(false)
const editingDefect = ref(null)
const defectForm = ref({ title: '', description: '', severity: 'medium', status: 'open' })
const openDefectModal = (d) => {
  editingDefect.value = d
  defectForm.value = d ? { title: d.title, description: d.description || '', severity: d.severity, status: d.status } : { title: '', description: '', severity: 'medium', status: 'open' }
  showDefectModal.value = true
}
const saveDefect = () => {
  const url = editingDefect.value ? `/projects/${props.project.id}/defects/${editingDefect.value.id}` : `/projects/${props.project.id}/defects`
  const method = editingDefect.value ? 'put' : 'post'
  router[method](url, defectForm.value, { onSuccess: () => showDefectModal.value = false })
}
const deleteDefect = (d) => router.delete(`/projects/${props.project.id}/defects/${d.id}`)

// ============ CHANGE REQUEST CRUD ============
const showCRModal = ref(false)
const crForm = ref({ title: '', description: '', cost_impact: null })
const openChangeRequestModal = () => { crForm.value = { title: '', description: '', cost_impact: null }; showCRModal.value = true }
const saveCR = () => { router.post(`/projects/${props.project.id}/change-requests`, crForm.value, { onSuccess: () => showCRModal.value = false }) }
const deleteChangeRequest = (cr) => router.delete(`/projects/${props.project.id}/change-requests/${cr.id}`)

// ============ RISK CRUD ============
const showRiskModal = ref(false)
const riskForm = ref({ title: '', description: '', severity: 'medium' })
const openRiskModal = () => { riskForm.value = { title: '', description: '', severity: 'medium' }; showRiskModal.value = true }
const saveRisk = () => { router.post(`/projects/${props.project.id}/risks`, riskForm.value, { onSuccess: () => showRiskModal.value = false }) }
const deleteRisk = (r) => router.delete(`/projects/${props.project.id}/risks/${r.id}`)

// ============ SUBCONTRACTOR CRUD ============
const showSubModal = ref(false)
const editingSub = ref(null)
const subForm = ref({ name: '', category: '', total_quote: null, bank_name: '', bank_account_number: '', bank_account_name: '', progress_status: 'not_started', global_subcontractor_id: null })
const openSubModal = (s) => {
  editingSub.value = s
  subForm.value = s ? { name: s.name, category: s.category || '', total_quote: s.total_quote, bank_name: s.bank_name || '', bank_account_number: s.bank_account_number || '', bank_account_name: s.bank_account_name || '', progress_status: s.progress_status || 'not_started' }
    : { name: '', category: '', total_quote: null, bank_name: '', bank_account_number: '', bank_account_name: '', progress_status: 'not_started', global_subcontractor_id: null }
  showSubModal.value = true
}
const onGlobalSubSelect = (id) => {
  const gs = props.globalSubcontractors.find(g => g.id === id)
  if (gs) { subForm.value.name = gs.name; subForm.value.bank_name = gs.bank_name || ''; subForm.value.bank_account_number = gs.bank_account_number || ''; subForm.value.bank_account_name = gs.bank_account_name || ''; subForm.value.category = gs.category || '' }
}
const saveSub = () => {
  const url = editingSub.value ? `/projects/${props.project.id}/subcontractors/${editingSub.value.id}` : `/projects/${props.project.id}/subcontractors`
  const method = editingSub.value ? 'put' : 'post'
  router[method](url, subForm.value, { onSuccess: () => showSubModal.value = false })
}
const deleteSub = (s) => router.delete(`/projects/${props.project.id}/subcontractors/${s.id}`)

// ============ ADDITIONAL COST CRUD ============
const showACModal = ref(false)
const acForm = ref({ amount: null, description: '' })
const openAdditionalCostModal = () => { acForm.value = { amount: null, description: '' }; showACModal.value = true }
const saveAC = () => { router.post(`/projects/${props.project.id}/additional-costs`, acForm.value, { onSuccess: () => showACModal.value = false }) }
const approveAC = (ac) => router.post(`/projects/${props.project.id}/additional-costs/${ac.id}/approve`)
const showRejectACModal = ref(false)
const rejectingAC = ref(null)
const rejectACReason = ref('')
const openRejectACModal = (ac) => { rejectingAC.value = ac; rejectACReason.value = ''; showRejectACModal.value = true }
const rejectAC = () => { router.post(`/projects/${props.project.id}/additional-costs/${rejectingAC.value.id}/reject`, { rejected_reason: rejectACReason.value }, { onSuccess: () => showRejectACModal.value = false }) }
const deleteAC = (ac) => router.delete(`/projects/${props.project.id}/additional-costs/${ac.id}`)

// ============ BUDGET CRUD ============
const showBudgetModal = ref(false)
const budgetForm = ref({ name: '', budget_date: null, notes: '', items: [{ name: '', estimated_amount: 0 }] })
const openBudgetModal = () => { budgetForm.value = { name: '', budget_date: dayjs().format('YYYY-MM-DD'), notes: '', items: [{ name: '', estimated_amount: 0 }] }; showBudgetModal.value = true }
const saveBudget = () => { router.post(`/projects/${props.project.id}/budgets`, budgetForm.value, { onSuccess: () => showBudgetModal.value = false }) }
const approveBudget = (b) => router.put(`/projects/${props.project.id}/budgets/${b.id}`, { status: 'approved' })
const deleteBudget = (b) => router.delete(`/projects/${props.project.id}/budgets/${b.id}`)

// ============ INVOICE CRUD ============
const showInvoiceModal = ref(false)
const editingInvoice = ref(null)
const invoiceForm = ref({ invoice_date: null, subtotal: null, tax_amount: 0, discount_amount: 0, description: '', notes: '' })
const openInvoiceModal = (inv) => {
  editingInvoice.value = inv
  invoiceForm.value = inv ? { invoice_date: inv.invoice_date, subtotal: inv.subtotal, tax_amount: inv.tax_amount || 0, discount_amount: inv.discount_amount || 0, description: inv.description || '', notes: inv.notes || '' }
    : { invoice_date: dayjs().format('YYYY-MM-DD'), subtotal: null, tax_amount: 0, discount_amount: 0, description: '', notes: '' }
  showInvoiceModal.value = true
}
const saveInvoice = () => {
  const url = editingInvoice.value ? `/projects/${props.project.id}/invoices/${editingInvoice.value.id}` : `/projects/${props.project.id}/invoices`
  const method = editingInvoice.value ? 'put' : 'post'
  router[method](url, invoiceForm.value, { onSuccess: () => showInvoiceModal.value = false })
}
const deleteInvoice = (inv) => router.delete(`/projects/${props.project.id}/invoices/${inv.id}`)

// ============ ACCEPTANCE CRUD ============
const showAcceptModal = ref(false)
const acceptForm = ref({ name: '', description: '' })
const openAcceptModal = () => { acceptForm.value = { name: '', description: '' }; showAcceptModal.value = true }
const saveAccept = () => { router.post(`/projects/${props.project.id}/acceptance`, acceptForm.value, { onSuccess: () => showAcceptModal.value = false }) }
const approveAccept = (stage, level) => router.post(`/projects/${props.project.id}/acceptance/${stage.id}/approve`, { level })
const deleteAccept = (stage) => router.delete(`/projects/${props.project.id}/acceptance/${stage.id}`)

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
</script>

<style scoped>
.crm-detail-tabs :deep(.ant-tabs-nav) { padding: 0 24px; background: #FAFBFC; border-bottom: 1px solid #E8ECF1; }
.crm-detail-tabs :deep(.ant-tabs-tab) { font-weight: 600; font-size: 13px; }
.crm-modal :deep(.ant-modal-content) { border-radius: 16px; }
</style>
