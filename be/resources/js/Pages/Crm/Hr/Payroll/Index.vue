<template>
  <Head title="Quản lý Bảng lương / Phiếu lương" />

  <PageHeader 
    title="Bảng lương / Phiếu lương" 
    subtitle="Quản lý phiếu lương của nhân viên, quy trình duyệt và đồng bộ chi phí nhân công."
  >
    <template #actions>
      <a-button v-if="can('hr.salary.manage')" type="primary" size="large" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Tạo phiếu lương
      </a-button>
    </template>
  </PageHeader>

  <!-- KPI Stats Row -->
  <div class="crm-stats-grid">
    <StatCard 
      label="Tổng phiếu lương" 
      :value="stats.total_count || 0" 
      icon="FileTextOutlined" 
      variant="primary" 
    />
    <StatCard 
      label="Tổng lương thực nhận" 
      :value="formatCurrency(stats.total_net_salary)" 
      icon="DollarOutlined" 
      variant="success" 
    />
    <StatCard 
      label="Tổng phụ cấp chi trả" 
      :value="formatCurrency(stats.total_allowance)" 
      icon="SafetyCertificateOutlined" 
      variant="warning" 
    />
    <StatCard 
      label="Phiếu chờ phê duyệt" 
      :value="stats.pending_count || 0" 
      icon="ClockCircleOutlined" 
      variant="danger" 
    />
  </div>

  <!-- Main Content Card -->
  <div class="crm-content-card">
    <!-- Filters Bar -->
    <div class="p-4 border-b border-gray-100 flex items-center gap-4 flex-wrap">
      <a-input-search
        v-model:value="filters.search"
        placeholder="Tìm tên nhân viên..."
        class="max-w-xs"
        allow-clear
        @search="applyFilters"
        @change="debounceSearch"
      />

      <a-select
        v-model:value="filters.project_id"
        placeholder="Chọn dự án"
        allow-clear
        style="width: 200px"
        @change="applyFilters"
        show-search
        option-filter-prop="label"
      >
        <a-select-option v-for="p in projects" :key="p.id" :value="p.id" :label="p.name">
          {{ p.name }} ({{ p.code }})
        </a-select-option>
      </a-select>

      <a-select
        v-model:value="filters.status"
        placeholder="Trạng thái"
        allow-clear
        style="width: 180px"
        @change="applyFilters"
      >
        <a-select-option v-for="(v, k) in payrollStatusLabels" :key="k" :value="k">
          {{ v }}
        </a-select-option>
      </a-select>

      <a-date-picker
        v-model:value="filterMonth"
        picker="month"
        value-format="YYYY-MM"
        placeholder="Chọn tháng"
        style="width: 150px"
        @change="handleFilterMonthChange"
      />
    </div>

    <!-- DataTable -->
    <a-table
      :columns="columns"
      :data-source="payrolls.data"
      :pagination="{
        current: payrolls.current_page,
        pageSize: payrolls.per_page,
        total: payrolls.total,
        showSizeChanger: false,
        showTotal: (t) => `Tổng số ${t} phiếu lương`,
      }"
      :loading="loading"
      row-key="id"
      class="crm-table"
      @change="handleTableChange"
    >
      <template #bodyCell="{ column, record }">
        <!-- Mã phiếu -->
        <template v-if="column.key === 'payroll_number'">
          <span 
            class="font-semibold text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
            @click="openDetailDrawer(record)"
          >
            {{ record.payroll_number }}
          </span>
        </template>

        <!-- Nhân viên -->
        <template v-else-if="column.key === 'employee'">
          <div class="flex items-center gap-3">
            <a-avatar class="bg-crm-primary text-white font-semibold flex-shrink-0">
              {{ record.user?.name?.charAt(0)?.toUpperCase() || '?' }}
            </a-avatar>
            <div>
              <div class="font-semibold text-gray-800">{{ record.user?.name }}</div>
              <div class="text-xs text-gray-400">{{ record.user?.email }}</div>
            </div>
          </div>
        </template>

        <!-- Kỳ lương / Tháng -->
        <template v-else-if="column.key === 'period'">
          <div>
            <div class="font-semibold text-gray-700">
              Tháng {{ dayjs(record.period_start).format('MM/YYYY') }}
            </div>
            <div class="text-[10px] text-gray-400">
              {{ formatDate(record.period_start) }} - {{ formatDate(record.period_end) }}
            </div>
          </div>
        </template>

        <!-- Lương cơ bản -->
        <template v-else-if="column.key === 'base_salary'">
          <span class="text-gray-700">{{ formatCurrency(record.base_salary) }}</span>
        </template>

        <!-- Thưởng -->
        <template v-else-if="column.key === 'bonus_amount'">
          <span class="text-emerald-600">+{{ formatCurrency(record.bonus_amount) }}</span>
        </template>

        <!-- Phụ cấp -->
        <template v-else-if="column.key === 'allowance_amount'">
          <span class="text-amber-600">+{{ formatCurrency(record.allowance_amount) }}</span>
        </template>

        <!-- Khấu trừ -->
        <template v-else-if="column.key === 'deductions'">
          <span class="text-red-500">-{{ formatCurrency(record.deductions) }}</span>
        </template>

        <!-- Thực nhận -->
        <template v-else-if="column.key === 'net_salary'">
          <span class="font-bold text-indigo-700 text-sm">
            {{ formatCurrency(record.net_salary) }}
          </span>
        </template>

        <!-- Trạng thái -->
        <template v-else-if="column.key === 'status'">
          <a-tag :color="payrollStatusColors[record.status]" class="rounded-full px-3 py-0.5">
            {{ payrollStatusLabels[record.status] || record.status }}
          </a-tag>
        </template>

        <!-- Hành động -->
        <template v-else-if="column.key === 'actions'">
          <div class="flex items-center gap-1.5 justify-center">
            <a-tooltip title="Chi tiết">
              <a-button type="text" size="small" @click="openDetailDrawer(record)">
                <template #icon><EyeOutlined /></template>
              </a-button>
            </a-tooltip>

            <!-- Edit (allowed for draft / rejected) -->
            <a-tooltip v-if="can('hr.salary.manage') && ['draft', 'rejected'].includes(record.status)" title="Chỉnh sửa">
              <a-button type="text" size="small" @click="openEditModal(record)">
                <template #icon><EditOutlined /></template>
              </a-button>
            </a-tooltip>

            <!-- Delete (draft only) -->
            <a-popconfirm 
              v-if="can('hr.salary.manage') && record.status === 'draft'" 
              title="Xóa phiếu lương này?" 
              ok-text="Xóa" 
              cancel-text="Hủy" 
              @confirm="deletePayroll(record)"
            >
              <a-tooltip title="Xóa">
                <a-button type="text" size="small" danger>
                  <template #icon><DeleteOutlined /></template>
                </a-button>
              </a-tooltip>
            </a-popconfirm>

            <!-- Submit for Approval -->
            <a-popconfirm 
              v-if="can('hr.salary.manage') && ['draft', 'rejected'].includes(record.status)" 
              title="Gửi duyệt phiếu lương này đến Ban Điều Hành?" 
              ok-text="Gửi duyệt" 
              cancel-text="Hủy" 
              @confirm="submitPayroll(record)"
            >
              <a-tooltip title="Gửi duyệt">
                <a-button type="text" size="small" class="text-emerald-600 hover:text-emerald-700">
                  <template #icon><SendOutlined /></template>
                </a-button>
              </a-tooltip>
            </a-popconfirm>

            <!-- Revert to Draft (allowed for managers or accountants) -->
            <a-popconfirm 
              v-if="(can('hr.salary.manage') || can('cost.approve.accountant')) && record.status !== 'draft'" 
              title="Hoàn duyệt phiếu lương này về trạng thái Nháp?" 
              ok-text="Hoàn duyệt" 
              cancel-text="Hủy" 
              @confirm="revertPayroll(record)"
            >
              <a-tooltip title="Hoàn duyệt">
                <a-button type="text" size="small" class="text-amber-500 hover:text-amber-600">
                  <template #icon><ReloadOutlined /></template>
                </a-button>
              </a-tooltip>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- Create/Edit Modal Form (Modal-First Pattern) -->
  <a-modal
    v-model:open="showModal"
    :title="editingRecord ? 'Chỉnh sửa phiếu lương' : 'Tạo phiếu lương'"
    :width="680"
    :confirm-loading="form.processing"
    @ok="handleSubmit"
    @cancel="resetForm"
    ok-text="Lưu"
    cancel-text="Hủy"
    class="crm-modal"
    centered
    destroy-on-close
  >
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Nhân viên" required :validate-status="form.errors.user_id ? 'error' : ''" :help="form.errors.user_id">
            <a-select 
              v-model:value="form.user_id" 
              show-search 
              option-filter-prop="label" 
              placeholder="Chọn nhân viên..." 
              size="large"
              :disabled="!!editingRecord"
              @change="handleEmployeeChange"
            >
              <a-select-option 
                v-for="emp in employees" 
                :key="emp.id" 
                :value="emp.id" 
                :label="emp.name"
              >
                {{ emp.name }} ({{ emp.email }})
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Tháng áp dụng" required :validate-status="form.errors.period_start ? 'error' : ''" :help="form.errors.period_start">
            <a-date-picker 
              v-model:value="formMonth" 
              picker="month" 
              value-format="YYYY-MM" 
              placeholder="Chọn tháng..." 
              size="large" 
              style="width: 100%"
              @change="handleFormMonthChange"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Liên kết Dự án (Không bắt buộc)" :validate-status="form.errors.project_id ? 'error' : ''" :help="form.errors.project_id">
            <a-select 
              v-model:value="form.project_id" 
              show-search 
              option-filter-prop="label" 
              placeholder="Chọn dự án (nếu có)..." 
              size="large"
              allow-clear
            >
              <a-select-option 
                v-for="p in projects" 
                :key="p.id" 
                :value="p.id" 
                :label="p.name"
              >
                {{ p.name }} ({{ p.code }})
              </a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Hình thức kỳ lương" required :validate-status="form.errors.period_type ? 'error' : ''" :help="form.errors.period_type">
            <a-select v-model:value="form.period_type" size="large">
              <a-select-option value="monthly">Theo tháng (26 ngày công)</a-select-option>
              <a-select-option value="daily">Theo ngày</a-select-option>
              <a-select-option value="weekly">Theo tuần</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- Financial Calculations Section -->
      <div class="bg-gray-50 p-4 rounded-2xl border border-gray-100 my-4">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Các khoản lương & khấu trừ (VNĐ)</div>
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Lương cơ bản" required :validate-status="form.errors.base_salary ? 'error' : ''" :help="form.errors.base_salary" class="mb-3">
              <a-input-number 
                v-model:value="form.base_salary" 
                :min="0" 
                style="width: 100%" 
                size="large"
                :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="v => v.replace(/\$\s?|(,*)/g, '')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Thưởng thêm" :validate-status="form.errors.bonus_amount ? 'error' : ''" :help="form.errors.bonus_amount" class="mb-3">
              <a-input-number 
                v-model:value="form.bonus_amount" 
                :min="0" 
                style="width: 100%" 
                size="large"
                :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="v => v.replace(/\$\s?|(,*)/g, '')"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="Khoản phụ cấp (Allowance)" :validate-status="form.errors.allowance_amount ? 'error' : ''" :help="form.errors.allowance_amount" class="mb-0">
              <a-input-number 
                v-model:value="form.allowance_amount" 
                :min="0" 
                style="width: 100%" 
                size="large"
                :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="v => v.replace(/\$\s?|(,*)/g, '')"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="Các khoản khấu trừ" :validate-status="form.errors.deductions ? 'error' : ''" :help="form.errors.deductions" class="mb-0">
              <a-input-number 
                v-model:value="form.deductions" 
                :min="0" 
                style="width: 100%" 
                size="large"
                :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="v => v.replace(/\$\s?|(,*)/g, '')"
              />
            </a-form-item>
          </a-col>
        </a-row>

        <div class="border-t border-gray-200 mt-4 pt-3 flex justify-between items-center">
          <span class="text-xs text-gray-500 font-semibold">Ước tính lương thực nhận:</span>
          <span class="text-lg font-bold text-indigo-700">
            {{ formatCurrency(computedNetSalary) }}
          </span>
        </div>
      </div>

      <a-form-item label="Ghi chú diễn giải">
        <a-textarea v-model:value="form.notes" :rows="2" placeholder="Chi tiết phụ cấp, ngày nghỉ không lương, tăng ca..." />
      </a-form-item>

      <!-- File Upload Section -->
      <div class="mb-4">
        <label class="block text-sm font-semibold text-gray-700 mb-2">Tệp chứng từ đính kèm</label>
        <a-upload-dragger
          v-model:file-list="fileList"
          name="file"
          :multiple="true"
          action="/admin/files/upload"
          :headers="uploadHeaders"
          @change="handleUploadChange"
          list-type="picture"
        >
          <p class="ant-upload-drag-icon">
            <InboxOutlined class="text-blue-500" />
          </p>
          <p class="ant-upload-text">Kéo thả hoặc nhấn vào đây để tải tài liệu lên</p>
          <p class="ant-upload-hint">Hỗ trợ file PDF, Excel, hình ảnh chứng từ gốc...</p>
        </a-upload-dragger>
      </div>
    </a-form>
  </a-modal>

  <!-- Details Drawer -->
  <a-drawer
    v-model:open="showDrawer"
    :title="`Chi tiết Phiếu lương ${selectedRecord?.payroll_number || ''}`"
    :width="620"
    placement="right"
    class="crm-drawer"
    destroy-on-close
    @close="selectedRecord = null"
  >
    <div v-if="selectedRecord" class="space-y-6">
      <!-- Status Header -->
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg">
            <DollarOutlined class="text-xl" />
          </div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Mã phiếu</div>
            <div class="text-lg font-bold text-gray-800">{{ selectedRecord.payroll_number }}</div>
          </div>
        </div>
        <a-tag :color="payrollStatusColors[selectedRecord.status]" class="rounded-full px-4 py-1 text-xs font-semibold">
          {{ payrollStatusLabels[selectedRecord.status] || selectedRecord.status }}
        </a-tag>
      </div>

      <!-- Employee Information -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2 text-blue-500">
          <UserOutlined /> Nhân viên thụ hưởng
        </div>
        <div class="flex items-center gap-3">
          <a-avatar :size="48" class="bg-crm-primary text-white font-semibold text-lg flex-shrink-0">
            {{ selectedRecord.user?.name?.charAt(0)?.toUpperCase() || '?' }}
          </a-avatar>
          <div>
            <div class="font-bold text-gray-800 text-base">{{ selectedRecord.user?.name }}</div>
            <div class="text-xs text-gray-500">{{ selectedRecord.user?.email }}</div>
          </div>
        </div>
      </div>

      <!-- Financial Calculation Sheet -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500">
          <FileTextOutlined /> Bảng chi tiết lương
        </div>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between items-center py-2 border-b border-gray-50">
            <span class="text-gray-500">Tháng áp dụng</span>
            <span class="font-semibold text-gray-700">
              Tháng {{ dayjs(selectedRecord.period_start).format('MM/YYYY') }}
            </span>
          </div>
          <div v-if="selectedRecord.project" class="flex justify-between items-center py-2 border-b border-gray-50">
            <span class="text-gray-500">Dự án công trình</span>
            <span class="font-semibold text-gray-700">
              {{ selectedRecord.project?.name }} ({{ selectedRecord.project?.code }})
            </span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-50">
            <span class="text-gray-500">Hình thức</span>
            <span class="font-medium text-gray-700">
              {{ translatePeriodType(selectedRecord.period_type) }}
            </span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-50">
            <span class="text-gray-500">Lương cơ bản</span>
            <span class="font-semibold text-gray-700">
              {{ formatCurrency(selectedRecord.base_salary) }}
            </span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-50">
            <span class="text-gray-500">Thưởng thêm</span>
            <span class="font-semibold text-emerald-600">
              +{{ formatCurrency(selectedRecord.bonus_amount) }}
            </span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-50">
            <span class="text-gray-500">Khoản phụ cấp (Allowance)</span>
            <span class="font-semibold text-amber-600">
              +{{ formatCurrency(selectedRecord.allowance_amount) }}
            </span>
          </div>
          <div class="flex justify-between items-center py-2 border-b border-gray-50">
            <span class="text-gray-500">Khấu trừ</span>
            <span class="font-semibold text-red-500">
              -{{ formatCurrency(selectedRecord.deductions) }}
            </span>
          </div>
          <div class="flex justify-between items-center py-3 bg-indigo-50/50 px-3 rounded-xl mt-2 border border-indigo-100/50">
            <span class="font-bold text-indigo-900">Thực nhận (Net Salary)</span>
            <span class="text-xl font-black text-indigo-700">
              {{ formatCurrency(selectedRecord.net_salary) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Notes / Remarks -->
      <div v-if="selectedRecord.notes" class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ghi chú diễn giải</div>
        <p class="text-sm text-gray-600 m-0 leading-relaxed whitespace-pre-wrap">
          {{ selectedRecord.notes }}
        </p>
      </div>

      <!-- Attachments list (uploaded by creator & payment proof by accountant) -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500">
          <PaperClipOutlined /> Tệp tài liệu đính kèm ({{ selectedRecord.attachments?.length || 0 }})
        </div>
        <div v-if="selectedRecord.attachments?.length" class="space-y-2.5">
          <div 
            v-for="att in selectedRecord.attachments" 
            :key="att.id"
            class="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-blue-200 bg-gray-50/50 hover:bg-white transition-all cursor-pointer group"
            @click="openFilePreview(att)"
          >
            <div class="flex items-center gap-3 min-w-0">
              <FileTextOutlined v-if="att.description === 'after'" class="text-green-500 text-lg flex-shrink-0" />
              <FileTextOutlined v-else class="text-blue-400 text-lg flex-shrink-0" />
              <div class="min-w-0">
                <div class="text-xs font-semibold text-gray-700 truncate group-hover:text-blue-600 transition-colors">
                  {{ att.original_name || att.file_name }}
                </div>
                <div class="text-[9px] text-gray-400 uppercase mt-0.5">
                  {{ att.description === 'after' ? 'Chứng từ thanh toán (KT)' : 'Tài liệu gốc' }}
                </div>
              </div>
            </div>
            <EyeOutlined class="text-gray-300 group-hover:text-blue-500 text-sm" />
          </div>
        </div>
        <a-empty v-else :image="null" description="Không có tệp đính kèm nào" class="text-gray-300 my-0 py-2" />
      </div>

      <!-- Workflow Approval Timeline -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Quy trình phê duyệt</div>
        <a-steps direction="vertical" size="small" :current="getTimelineStepIndex(selectedRecord.status)">
          <a-step title="Khởi tạo phiếu lương">
            <template #description>
              <div class="text-xs text-gray-500 mt-1">
                Người tạo: <b>Phòng Nhân sự</b>
                <span v-if="selectedRecord.created_at"> lúc {{ formatDateTime(selectedRecord.created_at) }}</span>
              </div>
            </template>
          </a-step>

          <a-step 
            title="Ban Điều Hành duyệt" 
            :status="selectedRecord.status === 'rejected' ? 'error' : (['pending_accountant', 'approved'].includes(selectedRecord.status) ? 'finish' : (selectedRecord.status === 'pending_management' ? 'process' : 'wait'))"
          >
            <template #description>
              <div class="text-xs text-gray-500 mt-1">
                <template v-if="selectedRecord.management_approver">
                  Đã duyệt bởi: <b>{{ selectedRecord.management_approver?.name }}</b>
                  <span v-if="selectedRecord.management_approved_at"> lúc {{ formatDateTime(selectedRecord.management_approved_at) }}</span>
                </template>
                <template v-else-if="selectedRecord.status === 'rejected' && selectedRecord.rejected_reason && !selectedRecord.management_approved_at">
                  Bị từ chối bởi: <b>Ban Điều Hành</b>
                </template>
                <template v-else-if="selectedRecord.status === 'pending_management'">
                  Chờ Ban Điều Hành phê duyệt
                </template>
                <template v-else>
                  Chưa duyệt
                </template>
              </div>
            </template>
          </a-step>

          <a-step 
            title="Kế toán xác nhận chuyển khoản" 
            :status="selectedRecord.status === 'approved' ? 'finish' : (selectedRecord.status === 'pending_accountant' ? 'process' : 'wait')"
          >
            <template #description>
              <div class="text-xs text-gray-500 mt-1">
                <template v-if="selectedRecord.accountant_approver">
                  Xác nhận bởi: <b>{{ selectedRecord.accountant_approver?.name }}</b>
                  <span v-if="selectedRecord.accountant_approved_at"> lúc {{ formatDateTime(selectedRecord.accountant_approved_at) }}</span>
                </template>
                <template v-else-if="selectedRecord.status === 'rejected' && selectedRecord.rejected_reason && selectedRecord.management_approved_at">
                  Bị từ chối bởi: <b>Kế toán</b>
                </template>
                <template v-else-if="selectedRecord.status === 'pending_accountant'">
                  Chờ Kế toán đính kèm Ủy nhiệm chi &amp; xác nhận
                </template>
                <template v-else>
                  Chưa xác nhận
                </template>
              </div>
            </template>
          </a-step>
        </a-steps>

        <!-- Rejection reason box if rejected -->
        <div v-if="selectedRecord.status === 'rejected' && selectedRecord.rejected_reason" class="mt-4 p-4 bg-red-50 rounded-2xl border border-red-100">
          <div class="text-xs font-bold text-red-500 uppercase flex items-center gap-1.5 mb-1.5">
            <CloseCircleOutlined /> Lý do từ chối
          </div>
          <p class="text-sm text-red-700 m-0 leading-relaxed">
            {{ selectedRecord.rejected_reason }}
          </p>
        </div>
      </div>
    </div>

    <!-- Drawer Footer Actions -->
    <template #footer>
      <div v-if="selectedRecord" class="flex justify-between items-center w-full">
        <!-- Revert / Delete on the left -->
        <div class="flex gap-2">
          <a-popconfirm 
            v-if="can('hr.salary.manage') && selectedRecord.status === 'draft'" 
            title="Xóa phiếu lương này?" 
            ok-text="Xóa" 
            cancel-text="Hủy" 
            @confirm="deletePayroll(selectedRecord); showDrawer = false"
          >
            <a-button type="text" danger><DeleteOutlined /> Xóa</a-button>
          </a-popconfirm>

          <a-popconfirm 
            v-if="(can('hr.salary.manage') || can('cost.approve.accountant')) && selectedRecord.status !== 'draft'" 
            title="Hoàn duyệt phiếu lương về trạng thái Nháp?" 
            ok-text="Hoàn duyệt" 
            cancel-text="Hủy" 
            @confirm="revertPayroll(selectedRecord); showDrawer = false"
          >
            <a-button type="text" class="text-amber-500 hover:text-amber-600"><ReloadOutlined /> Hoàn duyệt</a-button>
          </a-popconfirm>
        </div>

        <!-- Submit / Approvals on the right -->
        <div class="flex gap-2">
          <!-- Submit for approval -->
          <a-popconfirm 
            v-if="can('hr.salary.manage') && ['draft', 'rejected'].includes(selectedRecord.status)" 
            title="Gửi duyệt phiếu lương đến Ban Điều Hành?" 
            ok-text="Gửi duyệt" 
            cancel-text="Hủy" 
            @confirm="submitPayroll(selectedRecord); showDrawer = false"
          >
            <a-button type="primary"><SendOutlined /> Gửi duyệt</a-button>
          </a-popconfirm>

          <!-- BHD Approve / Reject actions -->
          <template v-if="selectedRecord.status === 'pending_management' && (can('cost.approve.management') || can('hr.salary.manage'))">
            <a-button type="primary" class="bg-green-600 border-green-600 hover:bg-green-500" @click="approvePayrollManagement(selectedRecord)"><CheckCircleOutlined /> Duyệt phiếu</a-button>
            <a-button danger ghost @click="openRejectModal(selectedRecord)">Từ chối</a-button>
          </template>

          <!-- Accountant Approve / Reject actions (Opens Accountant confirmation modal for proof) -->
          <template v-if="selectedRecord.status === 'pending_accountant' && can('cost.approve.accountant')">
            <a-button type="primary" class="bg-blue-600 border-blue-600 hover:bg-blue-500" @click="openConfirmModal(selectedRecord)"><CheckCircleOutlined /> KT Xác nhận chi</a-button>
            <a-button danger ghost @click="openRejectModal(selectedRecord)">Từ chối</a-button>
          </template>
        </div>
      </div>
    </template>
  </a-drawer>

  <!-- Accountant Payment Proof Upload Modal -->
  <a-modal
    v-model:open="showConfirmModal"
    title="Kế toán xác nhận - Chi trả lương"
    @ok="handleConfirmOk"
    @cancel="closeConfirmModal"
    ok-text="Xác nhận chi trả"
    cancel-text="Hủy"
    centered
    class="crm-modal"
    :ok-button-props="{ disabled: !confirmFiles.length || confirmLoading }"
    :confirm-loading="confirmLoading"
  >
    <div class="p-4 space-y-4">
      <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-3">
        <InfoCircleOutlined class="text-blue-500 text-lg shrink-0" />
        <div class="text-xs text-blue-700 leading-tight">
          Vui lòng đính kèm chứng từ thanh toán (Biên lai chuyển khoản / Ủy nhiệm chi) để xác nhận chi trả và tự động đồng bộ chi phí nhân công.
        </div>
      </div>

      <div v-if="confirmTarget" class="bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs space-y-1.5">
        <div class="flex justify-between">
          <span class="text-gray-400">Nhân viên:</span>
          <span class="font-bold text-gray-700">{{ confirmTarget.user?.name }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Số tiền chi trả:</span>
          <span class="font-bold text-indigo-700">{{ formatCurrency(confirmTarget.net_salary) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Tháng áp dụng:</span>
          <span class="font-bold text-gray-700">Tháng {{ dayjs(confirmTarget.period_start).format('MM/YYYY') }}</span>
        </div>
      </div>

      <!-- File Select Button & List -->
      <div class="border-t border-dashed pt-4">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <UploadOutlined class="text-blue-500" /> Chứng từ thanh toán * <span class="text-red-500">(Bắt buộc)</span>
        </div>

        <div class="flex flex-col gap-2">
          <div class="relative group">
            <input 
              type="file" 
              multiple 
              @change="e => confirmFiles = [...(e.target.files || [])]" 
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            <div class="flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-blue-100 rounded-xl group-hover:border-blue-400 group-hover:bg-blue-50 transition-all">
              <UploadOutlined class="text-blue-400 group-hover:text-blue-600" />
              <span class="text-xs font-semibold text-blue-500 group-hover:text-blue-700">
                {{ confirmFiles.length ? 'Thay đổi chứng từ đã chọn' : 'Chọn tệp ủy nhiệm chi / biên lai chuyển khoản' }}
              </span>
            </div>
          </div>

          <!-- Selected Files List -->
          <div v-if="confirmFiles.length" class="space-y-1.5 mt-1">
            <div v-for="(file, idx) in confirmFiles" :key="idx" class="flex items-center justify-between p-2 bg-blue-50/50 rounded-lg border border-blue-100/50 text-xs">
              <div class="flex items-center gap-2 min-w-0">
                <PaperClipOutlined class="text-blue-400 shrink-0" />
                <span class="font-medium text-blue-900 truncate max-w-[280px]">{{ file.name }}</span>
              </div>
              <a-button type="text" danger size="small" @click="confirmFiles.splice(idx, 1)" class="p-0 hover:bg-red-50 rounded">
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </a-modal>

  <!-- Rejection Prompt Modal -->
  <a-modal
    v-model:open="showRejectModal"
    title="Từ chối phê duyệt phiếu lương"
    @ok="handleRejectSubmit"
    @cancel="closeRejectModal"
    ok-text="Từ chối"
    cancel-text="Hủy"
    centered
    class="crm-modal"
    ok-type="danger"
    :ok-button-props="{ disabled: !rejectReason.trim() }"
  >
    <div class="p-4 space-y-3">
      <div class="text-xs text-gray-500">Vui lòng nhập lý do từ chối phê duyệt phiếu lương này để người tạo có căn cứ chỉnh sửa lại.</div>
      <a-form-item label="Lý do từ chối" required>
        <a-textarea v-model:value="rejectReason" :rows="3" placeholder="Nhập lý do chi tiết..." />
      </a-form-item>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Head, useForm, router, usePage } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  SendOutlined, ReloadOutlined, DollarOutlined, ClockCircleOutlined,
  InboxOutlined, FileTextOutlined, PaperClipOutlined, UserOutlined,
  CloseCircleOutlined, CheckCircleOutlined, SafetyCertificateOutlined,
  UploadOutlined, InfoCircleOutlined
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })

const props = defineProps({
  payrolls: Object,
  stats: Object,
  employees: Array,
  projects: Array,
  filters: Object,
})

// Current user computed
const user = computed(() => usePage().props.auth?.user)
const can = (permission) => user.value?.super_admin || (user.value?.permissions || []).includes(permission)

// Loading and Modal State
const loading = ref(false)
const showModal = ref(false)
const editingRecord = ref(null)
const selectedRecord = ref(null)
const showDrawer = ref(false)

// File Upload State
const fileList = ref([])

// Month representation in UI
const formMonth = ref(null)
const filterMonth = ref(props.filters?.month || undefined)

// Accountant Confirmation Modal State
const showConfirmModal = ref(false)
const confirmTarget = ref(null)
const confirmFiles = ref([])
const confirmLoading = ref(false)

// Rejection Modal State
const showRejectModal = ref(false)
const rejectTarget = ref(null)
const rejectReason = ref('')

// Form definition
const form = useForm({
  id: null,
  user_id: undefined,
  project_id: undefined,
  period_type: 'monthly',
  period_start: '',
  period_end: '',
  base_salary: 0,
  bonus_amount: 0,
  allowance_amount: 0,
  deductions: 0,
  notes: '',
  attachment_ids: [],
})

// Filters
const filters = ref({
  search: props.filters?.search || '',
  project_id: props.filters?.project_id ? Number(props.filters.project_id) : undefined,
  status: props.filters?.status || undefined,
  month: props.filters?.month || undefined,
})

const columns = [
  { title: 'Mã phiếu', key: 'payroll_number', width: 130 },
  { title: 'Nhân viên', key: 'employee', width: 220 },
  { title: 'Kỳ lương', key: 'period', width: 150 },
  { title: 'Lương cơ bản', key: 'base_salary', align: 'right', width: 130 },
  { title: 'Thưởng', key: 'bonus_amount', align: 'right', width: 110 },
  { title: 'Phụ cấp', key: 'allowance_amount', align: 'right', width: 110 },
  { title: 'Khấu trừ', key: 'deductions', align: 'right', width: 110 },
  { title: 'Thực nhận', key: 'net_salary', align: 'right', width: 130 },
  { title: 'Trạng thái', key: 'status', align: 'center', width: 140 },
  { title: 'Thao tác', key: 'actions', align: 'center', width: 130, fixed: 'right' }
]

const payrollStatusLabels = {
  draft: 'Nháp',
  pending_management: 'Chờ BĐH duyệt',
  pending_accountant: 'Chờ KT xác nhận',
  approved: 'Đã duyệt',
  rejected: 'Từ chối'
}

const payrollStatusColors = {
  draft: 'default',
  pending_management: 'warning',
  pending_accountant: 'processing',
  approved: 'success',
  rejected: 'error'
}

// Upload headers
const uploadHeaders = computed(() => ({
  'X-Requested-With': 'XMLHttpRequest',
  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
  'Accept': 'application/json',
}))

// Compute Net Salary in form
const computedNetSalary = computed(() => {
  const gross = Number(form.base_salary || 0) + Number(form.bonus_amount || 0) + Number(form.allowance_amount || 0)
  return Math.max(0, gross - Number(form.deductions || 0))
})

// Timeline step mappings
const getTimelineStepIndex = (status) => {
  if (status === 'draft' || status === 'rejected') return 0
  if (status === 'pending_management') return 1
  if (status === 'pending_accountant') return 2
  if (status === 'approved') return 3
  return 0
}

// Pre-fill fields when user selection changes
const handleEmployeeChange = (empId) => {
  const emp = props.employees.find(e => e.id === empId)
  if (emp) {
    if (emp.salary_type === 'monthly') {
      form.base_salary = emp.current_salary || 0
    } else if (emp.salary_type === 'daily') {
      form.base_salary = (emp.daily_rate || 0) * 26
    } else if (emp.salary_type === 'hourly') {
      form.base_salary = (emp.hourly_rate || 0) * 208
    } else {
      form.base_salary = 0
    }
    form.period_type = emp.salary_type || 'monthly'
  }
}

// Compute period_start & period_end on month change
const handleFormMonthChange = (val) => {
  if (val) {
    form.period_start = dayjs(val).startOf('month').format('YYYY-MM-DD')
    form.period_end = dayjs(val).endOf('month').format('YYYY-MM-DD')
  } else {
    form.period_start = ''
    form.period_end = ''
  }
}

// Filter events
const handleFilterMonthChange = (val) => {
  filters.value.month = val || undefined
  applyFilters()
}

let searchTimeout = null
const debounceSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => applyFilters(), 400)
}

const applyFilters = () => {
  loading.value = true
  router.get('/hr/payrolls', {
    search: filters.value.search || undefined,
    project_id: filters.value.project_id || undefined,
    status: filters.value.status || undefined,
    month: filters.value.month || undefined,
  }, {
    preserveState: true,
    replace: true,
    onFinish: () => loading.value = false,
  })
}

const handleTableChange = (pagination) => {
  loading.value = true
  router.get('/hr/payrolls', {
    page: pagination.current,
    search: filters.value.search || undefined,
    project_id: filters.value.project_id || undefined,
    status: filters.value.status || undefined,
    month: filters.value.month || undefined,
  }, {
    preserveState: true,
    replace: true,
    onFinish: () => loading.value = false,
  })
}

// Upload logic
const handleUploadChange = (info) => {
  fileList.value = [...info.fileList]
  form.attachment_ids = info.fileList
    .filter(f => f.status === 'done' || f.status === 'success')
    .map(f => f.response?.id || f.id || f.uid)
    .filter(id => id && !isNaN(id))
}

// Open modals
const openCreateModal = () => {
  editingRecord.value = null
  form.reset()
  formMonth.value = null
  fileList.value = []
  form.clearErrors()
  showModal.value = true
}

const openEditModal = (record) => {
  editingRecord.value = record
  form.id = record.id
  form.user_id = record.user_id
  form.project_id = record.project_id || undefined
  form.period_type = record.period_type || 'monthly'
  form.period_start = record.period_start
  form.period_end = record.period_end
  form.base_salary = record.base_salary
  form.bonus_amount = record.bonus_amount
  form.allowance_amount = record.allowance_amount
  form.deductions = record.deductions
  form.notes = record.notes || ''
  form.attachment_ids = record.attachments ? record.attachments.map(a => a.id) : []
  
  if (record.period_start) {
    formMonth.value = dayjs(record.period_start).format('YYYY-MM')
  } else {
    formMonth.value = null
  }
  
  fileList.value = record.attachments ? record.attachments.map(a => ({
    uid: a.id,
    name: a.original_name || a.file_name,
    status: 'done',
    url: a.file_url || `/storage/${a.file_path}`,
    response: { id: a.id }
  })) : []

  showModal.value = true
}

const openDetailDrawer = (record) => {
  selectedRecord.value = record
  showDrawer.value = true
}

// Form Action Submissions
const handleSubmit = () => {
  if (editingRecord.value) {
    form.put(`/hr/payrolls/${editingRecord.value.id}`, {
      onSuccess: () => {
        message.success('Cập nhật phiếu lương thành công')
        showModal.value = false
        resetForm()
      }
    })
  } else {
    form.post('/hr/payrolls', {
      onSuccess: () => {
        message.success('Tạo phiếu lương thành công')
        showModal.value = false
        resetForm()
      }
    })
  }
}

const resetForm = () => {
  editingRecord.value = null
  form.reset()
  formMonth.value = null
  fileList.value = []
  form.clearErrors()
}

const deletePayroll = (record) => {
  router.delete(`/hr/payrolls/${record.id}`, {
    onSuccess: () => message.success('Đã xóa phiếu lương thành công')
  })
}

const submitPayroll = (record) => {
  router.post(`/hr/payrolls/${record.id}/submit`, {}, {
    onSuccess: () => message.success('Đã gửi phiếu lương duyệt thành công')
  })
}

const revertPayroll = (record) => {
  router.post(`/hr/payrolls/${record.id}/revert`, {}, {
    onSuccess: () => message.success('Đã hoàn duyệt phiếu lương về Nháp')
  })
}

// Approval actions from details drawer
const approvePayrollManagement = (record) => {
  router.post(`/approvals/payroll/${record.id}/approve`, {}, {
    onSuccess: () => {
      message.success('Ban điều hành đã phê duyệt phiếu lương')
      router.reload({ only: ['payrolls', 'stats'] })
      showDrawer.value = false
    }
  })
}

const openConfirmModal = (record) => {
  confirmTarget.value = record
  confirmFiles.value = []
  showConfirmModal.value = true
}

const closeConfirmModal = () => {
  showConfirmModal.value = false
  confirmTarget.value = null
  confirmFiles.value = []
}

const handleConfirmOk = () => {
  if (!confirmFiles.value.length) {
    message.warning('Vui lòng chọn ít nhất một chứng từ chuyển khoản.')
    return
  }

  confirmLoading.value = true
  const fd = new FormData()
  confirmFiles.value.forEach(f => fd.append('files[]', f))

  router.post(`/approvals/payroll/${confirmTarget.value.id}/approve`, fd, {
    forceFormData: true,
    preserveScroll: true,
    onSuccess: () => {
      showConfirmModal.value = false
      confirmFiles.value = []
      message.success('Kế toán đã xác nhận thanh toán & đồng bộ chi phí nhân công.')
      router.reload({ only: ['payrolls', 'stats'] })
      showDrawer.value = false
    },
    onError: (errs) => {
      message.error(errs.files?.[0] || 'Lỗi khi xác nhận chi.')
    },
    onFinish: () => {
      confirmLoading.value = false
    }
  })
}

const openRejectModal = (record) => {
  rejectTarget.value = record
  rejectReason.value = ''
  showRejectModal.value = true
}

const closeRejectModal = () => {
  showRejectModal.value = false
  rejectTarget.value = null
  rejectReason.value = ''
}

const handleRejectSubmit = () => {
  if (!rejectReason.value.trim()) return

  router.post(`/approvals/payroll/${rejectTarget.value.id}/reject`, {
    reason: rejectReason.value
  }, {
    onSuccess: () => {
      showRejectModal.value = false
      message.success('Đã từ chối phiếu lương.')
      router.reload({ only: ['payrolls', 'stats'] })
      showDrawer.value = false
    }
  })
}

// Helpers / Formatters
const formatCurrency = (val) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0)
}

const formatDate = (d) => d ? dayjs(d).format('DD/MM/YYYY') : '—'
const formatDateTime = (d) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—'

const translatePeriodType = (type) => {
  const map = { daily: 'Theo ngày', weekly: 'Theo tuần', monthly: 'Lương tháng' }
  return map[type] || type
}

const openFilePreview = (att) => {
  const url = att.file_url || `/storage/${att.file_path}`
  window.open(url, '_blank')
}
</script>

<style scoped>
.crm-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.crm-content-card {
  background: white;
  border-radius: 16px;
  border: 1px solid #E8ECF1;
  overflow: hidden;
}

.crm-table :deep(.ant-table-thead > tr > th) {
  background: #FAFBFC;
  font-weight: 600;
  font-size: 13px;
  color: #5D6B82;
  border-bottom: 1px solid #E8ECF1;
}

.crm-modal :deep(.ant-modal-content) {
  border-radius: 16px;
}

@media (max-width: 992px) {
  .crm-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 576px) {
  .crm-stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
