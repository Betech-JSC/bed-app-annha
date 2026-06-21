<template>
  <Head title="Chi phí công ty" />

  <PageHeader title="Chi Phí Công Ty" subtitle="Quản lý toàn bộ chi phí hoạt động công ty (không thuộc dự án)">
    <template #actions>
      <a-button type="primary" size="large" class="rounded-xl" style="background: linear-gradient(135deg, #1B4F72, #2E86C1);" @click="showCreateModal">
        <template #icon><PlusOutlined /></template>
        Tạo chi phí
      </a-button>
    </template>
  </PageHeader>

  <!-- ═══ Stats ═══ -->
  <div class="crm-stats-grid">
    <StatCard :value="fmtCurrency(stats.totalAmount)" label="Tổng chi phí" :icon="DollarOutlined" variant="primary" format="text" />
    <StatCard :value="fmtCurrency(stats.approvedAmount)" label="Thực chi" :icon="CheckCircleOutlined" variant="success" format="text" />
    <StatCard :value="stats.pendingCount" label="Chờ duyệt" :icon="ClockCircleOutlined" variant="warning" />
    <StatCard :value="stats.draftCount" label="Nháp" :icon="FileTextOutlined" variant="accent" />
  </div>

  <!-- ═══ Charts ═══ -->
  <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
    <div class="xl:col-span-2">
      <ChartCard title="Chi phí theo tháng" subtitle="6 tháng gần nhất" :height="260">
        <Bar :data="monthlyChartData" :options="barOpts" />
      </ChartCard>
    </div>
    <ChartCard title="Theo trạng thái" :subtitle="`${stats.totalCount} khoản chi`" :height="260">
      <Doughnut :data="statusChartData" :options="donutOpts" />
    </ChartCard>
  </div>

  <!-- ═══ Filters ═══ -->
  <div class="crm-content-card mb-6">
    <div class="crm-content-card__header" style="border-bottom: none; padding-bottom: 0;">
      <div class="flex flex-wrap items-center gap-3 w-full">
        <a-input-search
          v-model:value="localFilters.search" placeholder="Tìm chi phí..." style="width: 220px;"
          size="large" allow-clear @search="applyFilters" @pressEnter="applyFilters"
        />
        <a-select v-model:value="localFilters.status" style="width: 140px;" size="large" @change="applyFilters" placeholder="Trạng thái">
          <a-select-option value="">Tất cả</a-select-option>
          <a-select-option value="draft">Nháp</a-select-option>
          <a-select-option value="pending_management_approval">Chờ BĐH</a-select-option>
          <a-select-option value="pending_accountant_approval">Chờ KT</a-select-option>
          <a-select-option value="approved">Đã duyệt</a-select-option>
          <a-select-option value="rejected">Từ chối</a-select-option>
        </a-select>
        <a-select v-model:value="localFilters.expense_category" style="width: 170px;" size="large" @change="applyFilters" placeholder="Phân loại" allow-clear>
          <a-select-option value="">Tất cả loại</a-select-option>
          <a-select-option value="capex">CAPEX</a-select-option>
          <a-select-option value="opex">OPEX</a-select-option>
          <a-select-option value="payroll">Lương</a-select-option>
        </a-select>
        <a-date-picker v-model:value="filterStartDate" placeholder="Từ ngày" size="large" format="DD/MM/YYYY" @change="applyFilters" />
        <a-date-picker v-model:value="filterEndDate" placeholder="Đến ngày" size="large" format="DD/MM/YYYY" @change="applyFilters" />
      </div>
    </div>
  </div>

  <!-- ═══ Table ═══ -->
  <div class="crm-content-card">
    <a-table
      :columns="columns"
      :data-source="costs.data"
      :pagination="false"
      row-key="id"
      class="crm-table"
      :scroll="{ x: 1100 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'name'">
          <div class="cursor-pointer group" @click="showDetail(record)">
            <div class="font-semibold text-gray-800 text-sm group-hover:text-blue-600 transition-colors">{{ record.name }}</div>
            <div class="text-xs text-gray-400 mt-0.5 truncate" style="max-width: 220px;">{{ record.description || '—' }}</div>
          </div>
        </template>
        <template v-if="column.dataIndex === 'expense_category'">
          <span v-if="record.expense_category === 'capex'" class="crm-tag crm-tag--completed">CAPEX</span>
          <span v-else-if="record.expense_category === 'opex'" class="crm-tag crm-tag--pending">OPEX</span>
          <span v-else-if="record.expense_category === 'payroll'" class="crm-tag crm-tag--active">Lương</span>
          <span v-else class="text-gray-400 text-xs">—</span>
        </template>
        <template v-if="column.dataIndex === 'cost_group'">
          <span v-if="record.cost_group" class="font-medium text-gray-700 text-xs bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5">
            {{ record.cost_group.name }}
          </span>
          <span v-else class="text-gray-300 italic text-xs">—</span>
        </template>
        <template v-if="column.dataIndex === 'amount'">
          <span class="font-bold text-sm" style="color: var(--crm-primary);">{{ fmtCurrency(record.amount) }}</span>
        </template>
        <template v-if="column.dataIndex === 'cost_date'">
          <span class="text-sm text-gray-600">{{ formatDate(record.cost_date) }}</span>
        </template>
        <template v-if="column.dataIndex === 'status'">
          <span class="crm-tag" :class="statusClass(record.status)">
            {{ statusLabel(record.status) }}
          </span>
        </template>
        <template v-if="column.dataIndex === 'creator'">
          <span class="text-sm text-gray-600">{{ record.creator?.name || '—' }}</span>
        </template>
        <template v-if="column.dataIndex === 'actions'">
          <div class="flex items-center gap-2">
            <a-button type="link" size="small" @click="showDetail(record)" class="px-1">Xem</a-button>
            
            <!-- Gửi duyệt (Submit) -->
            <a-popconfirm 
              v-if="record.status === 'draft' && can('company_cost.submit')"
              title="Gửi duyệt chi phí này?" ok-text="Gửi" cancel-text="Hủy"
              @confirm="submitCost(record.id)"
            >
              <a-button type="link" size="small" class="px-1 text-blue-600">Gửi duyệt</a-button>
            </a-popconfirm>

            <!-- Sửa (Edit) -->
            <a-button 
              v-if="['draft', 'rejected'].includes(record.status) && can('company_cost.update')"
              type="link" size="small" @click="showEditModal(record)" class="px-1 text-amber-600"
            >
              Sửa
            </a-button>

            <!-- Xóa (Delete) -->
            <a-popconfirm 
              v-if="['draft', 'rejected', 'approved'].includes(record.status) && can('company_cost.delete')"
              title="Xóa chi phí này vĩnh viễn?" ok-text="Xóa" cancel-text="Hủy"
              @confirm="deleteCost(record.id)"
            >
              <a-button type="link" size="small" danger class="px-1">Xóa</a-button>
            </a-popconfirm>

            <!-- Quick Approve Management -->
            <a-button 
              v-if="record.status === 'pending_management_approval' && can('company_cost.approve.management')"
              type="link" size="small" @click="approveCost(record.id)" class="px-1 text-green-600"
            >
              Duyệt
            </a-button>

            <!-- Quick Approve Accountant -->
            <a-button 
              v-if="record.status === 'pending_accountant_approval' && can('company_cost.approve.accountant')"
              type="link" size="small" @click="approveCost(record.id)" class="px-1 text-green-600"
            >
              Xác nhận chi
            </a-button>

            <!-- Hoàn duyệt (Revert) -->
            <a-popconfirm 
              v-if="['pending_management_approval', 'pending_accountant_approval', 'rejected'].includes(record.status) && can('company_cost.revert')"
              title="Hoàn duyệt về trạng thái Nháp?" ok-text="Đồng ý" cancel-text="Hủy"
              @confirm="revertCost(record.id)"
            >
              <a-button type="link" size="small" class="px-1 text-gray-500">Hoàn duyệt</a-button>
            </a-popconfirm>
          </div>
        </template>
      </template>
    </a-table>

    <!-- Pagination -->
    <div v-if="costs.last_page > 1" class="flex justify-center py-4 border-t border-gray-100">
      <a-pagination
        :current="costs.current_page"
        :total="costs.total"
        :page-size="costs.per_page"
        show-size-changer
        @change="(page) => router.visit(`/finance/company-costs?page=${page}&${buildQuery()}`)"
      />
    </div>
  </div>

  <!-- Empty State -->
  <div v-if="!costs.data?.length" class="text-center py-16">
    <DollarOutlined style="font-size: 56px; color: #D1D5DB;" />
    <p class="mt-4 text-gray-400 text-base">Chưa có chi phí công ty nào</p>
    <a-button type="primary" class="mt-3 rounded-xl" @click="showCreateModal">Tạo chi phí đầu tiên</a-button>
  </div>

  <!-- ═══ Detail Drawer ═══ -->
  <a-drawer
    v-model:open="drawerVisible"
    title="Chi tiết chi phí"
    width="560"
    :body-style="{ paddingBottom: '80px' }"
  >
    <template v-if="selectedCost">
      <div class="space-y-6">
        <!-- Header Info -->
        <div class="bg-gray-50 p-4 rounded-xl">
          <div class="flex justify-between items-start mb-2">
            <h3 class="text-lg font-bold text-gray-800 m-0">{{ selectedCost.name }}</h3>
            <span class="crm-tag" :class="statusClass(selectedCost.status)">
              {{ statusLabel(selectedCost.status) }}
            </span>
          </div>
          <div class="text-2xl font-bold" style="color: var(--crm-primary);">
            {{ fmtCurrency(selectedCost.amount) }}
          </div>
          <div class="text-xs text-gray-500 mt-1">Ngày chi: {{ formatDate(selectedCost.cost_date) }}</div>
        </div>

        <!-- Meta Info -->
        <div class="grid grid-cols-2 gap-4">
          <div class="p-3 border border-gray-100 rounded-xl">
            <div class="text-xs text-gray-400 mb-1">Người tạo</div>
            <div class="text-sm font-medium">{{ selectedCost.creator?.name || '—' }}</div>
          </div>
          <div class="p-3 border border-gray-100 rounded-xl">
            <div class="text-xs text-gray-400 mb-1">Phân loại</div>
            <div class="text-sm font-medium">
              <span v-if="selectedCost.expense_category === 'capex'">CAPEX — Tài sản</span>
              <span v-else-if="selectedCost.expense_category === 'opex'">OPEX — Vận hành</span>
              <span v-else-if="selectedCost.expense_category === 'payroll'">Lương, thưởng</span>
              <span v-else>Khác</span>
            </div>
          </div>
        </div>

        <div v-if="selectedCost.description" class="space-y-2">
          <div class="text-sm font-semibold text-gray-700">Mô tả / Ghi chú</div>
          <div class="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl border-l-4 border-gray-200">
            {{ selectedCost.description }}
          </div>
        </div>

        <!-- Attachments -->
        <div class="space-y-3">
          <div class="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <PaperClipOutlined /> Chứng từ đính kèm ({{ selectedCost.attachments?.filter(a => a.description !== 'after')?.length || 0 }})
          </div>
          <div v-if="selectedCost.attachments?.filter(a => a.description !== 'after')?.length" class="grid grid-cols-2 gap-3">
            <div v-for="file in selectedCost.attachments.filter(a => a.description !== 'after')" :key="file.id" class="relative group border border-gray-100 rounded-xl overflow-hidden bg-white hover:border-blue-300 hover:shadow-md transition-all cursor-pointer">
              <!-- Image files: clickable preview -->
              <template v-if="file.type === 'image' || file.mime_type?.startsWith('image/')">
                <a-image
                  :src="file.file_url"
                  :preview-mask="false"
                  class="w-full"
                  style="aspect-ratio: 16/10; object-fit: cover;"
                />
              </template>
              <!-- Non-image files: open in new tab -->
              <template v-else>
                <a :href="file.file_url" target="_blank" class="block">
                  <div class="aspect-video flex items-center justify-center bg-gray-50">
                    <FileTextOutlined style="font-size: 32px; color: #9CA3AF;" />
                  </div>
                </a>
              </template>
              <div class="p-2 text-xs truncate bg-white border-t border-gray-50 font-medium text-gray-600">
                <a :href="file.file_url" target="_blank" class="hover:text-blue-600 transition-colors">
                  {{ file.original_name || file.file_name || 'File' }}
                </a>
              </div>
            </div>
          </div>
          <div v-else class="text-xs text-gray-400 italic">Chưa có chứng từ đính kèm.</div>
        </div>

        <!-- Approval Logs -->
        <div v-if="selectedCost.status !== 'draft'" class="space-y-3">
          <div class="text-sm font-semibold text-gray-700">Thông tin phê duyệt</div>
          <div class="space-y-2">
            <div v-if="selectedCost.management_approved_at" class="flex items-start gap-3 p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <CheckCircleOutlined style="color: #3B82F6; margin-top: 2px;" />
              <div>
                <div class="text-sm font-medium text-blue-800">Ban điều hành đã duyệt</div>
                <div class="text-xs text-blue-600">Duyệt bởi: {{ selectedCost.management_approver?.name }} lúc {{ formatDate(selectedCost.management_approved_at, 'HH:mm DD/MM/YYYY') }}</div>
              </div>
            </div>
            <div v-if="selectedCost.accountant_approved_at" class="flex flex-col gap-2 p-3 bg-green-50/50 rounded-xl border border-green-100">
              <div class="flex items-start gap-3">
                <CheckCircleOutlined style="color: #10B981; margin-top: 2px;" />
                <div>
                  <div class="text-sm font-medium text-green-800">Kế toán đã xác nhận</div>
                  <div class="text-xs text-green-600">Xác nhận bởi: {{ selectedCost.accountant_approver?.name }} lúc {{ formatDate(selectedCost.accountant_approved_at, 'HH:mm DD/MM/YYYY') }}</div>
                </div>
              </div>
              
              <!-- Accountant payment confirmation vouchers (description === 'after') -->
              <div v-if="selectedCost.attachments?.filter(a => a.description === 'after')?.length" class="mt-2 pl-7 space-y-2">
                <div class="text-[10px] font-bold text-green-700 tracking-wider">CHỨNG TỪ THANH TOÁN / ỦY NHIỆM CHI:</div>
                <div class="grid grid-cols-2 gap-2">
                  <div v-for="file in selectedCost.attachments.filter(a => a.description === 'after')" :key="file.id" class="relative group border border-green-100 rounded-lg overflow-hidden bg-white hover:border-green-300 hover:shadow-sm transition-all cursor-pointer">
                    <template v-if="file.type === 'image' || file.mime_type?.startsWith('image/')">
                      <a-image
                        :src="file.file_url"
                        :preview-mask="false"
                        class="w-full"
                        style="aspect-ratio: 16/10; object-fit: cover;"
                      />
                    </template>
                    <template v-else>
                      <a :href="file.file_url" target="_blank" class="block">
                        <div class="aspect-[16/10] flex items-center justify-center bg-gray-50">
                          <FileTextOutlined style="font-size: 24px; color: #9CA3AF;" />
                        </div>
                      </a>
                    </template>
                    <div class="p-1.5 text-[9px] truncate bg-white border-t border-gray-50 font-medium text-gray-600">
                      <a :href="file.file_url" target="_blank" class="hover:text-green-600 transition-colors">
                        {{ file.original_name || file.file_name || 'File' }}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="selectedCost.status === 'rejected'" class="flex items-start gap-3 p-3 bg-red-50/50 rounded-xl border border-red-100">
              <InfoCircleOutlined style="color: #EF4444; margin-top: 2px;" />
              <div>
                <div class="text-sm font-medium text-red-800">Bị từ chối</div>
                <div class="text-xs text-red-600">Lý do: {{ selectedCost.rejected_reason || 'Không rõ lý do' }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Action Bar in Drawer -->
      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-between z-20">
        <!-- Left side: Destructive actions -->
        <div class="flex gap-2">
          <a-popconfirm v-if="['draft', 'rejected', 'approved'].includes(selectedCost.status)" title="Xóa chi phí này vĩnh viễn?" ok-text="Xóa" cancel-text="Hủy" @confirm="deleteCost(selectedCost.id); drawerVisible = false">
            <a-button danger size="small"><DeleteOutlined /> Xóa</a-button>
          </a-popconfirm>
          <a-popconfirm v-if="['pending_management_approval', 'pending_accountant_approval', 'rejected'].includes(selectedCost.status)" title="Hoàn duyệt về trạng thái Nháp?" @confirm="revertCost(selectedCost.id)">
            <a-button danger ghost size="small"><UndoOutlined /> Hoàn duyệt</a-button>
          </a-popconfirm>
        </div>

        <!-- Right side: Primary actions -->
        <div class="flex gap-2">
          <!-- Edit -->
          <a-button v-if="['draft', 'rejected'].includes(selectedCost.status)" size="small" @click="showEditModal(selectedCost)"><EditOutlined /> Sửa</a-button>

          <!-- Submit -->
          <a-popconfirm v-if="['draft', 'rejected'].includes(selectedCost.status)" title="Gửi duyệt chi phí này?" @confirm="submitCost(selectedCost.id)">
            <a-button type="primary" size="small"><SendOutlined /> Gửi duyệt</a-button>
          </a-popconfirm>

          <!-- Approve: Management -->
          <template v-if="selectedCost.status === 'pending_management_approval' && can('company_cost.approve.management')">
            <a-button type="primary" size="small" @click="approveCost(selectedCost.id)"><CheckCircleOutlined /> Duyệt</a-button>
            <a-button danger size="small" @click="rejectCost(selectedCost.id)"><CloseCircleOutlined /> Từ chối</a-button>
          </template>
 
          <!-- Approve: Accountant -->
          <template v-if="selectedCost.status === 'pending_accountant_approval' && can('company_cost.approve.accountant')">
            <a-button type="primary" size="small" @click="approveCost(selectedCost.id)"><CheckCircleOutlined /> Xác nhận chi</a-button>
            <a-button danger size="small" @click="rejectCost(selectedCost.id)"><CloseCircleOutlined /> Từ chối</a-button>
          </template>
        </div>
      </div>
    </template>
  </a-drawer>

  <!-- ═══ Create/Edit Modal ═══ -->
  <a-modal
    v-model:open="modalVisible"
    :title="editingCost ? 'Sửa chi phí công ty' : 'Tạo chi phí công ty'"
    :width="560"
    @ok="saveForm"
    ok-text="Lưu"
    cancel-text="Hủy"
    :confirm-loading="form.processing"
  >
    <div class="space-y-4 mt-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tên chi phí <span class="text-red-500">*</span></label>
        <a-input v-model:value="form.name" placeholder="VD: Tiền điện văn phòng T3" size="large" />
        <div v-if="form.errors?.name" class="text-red-500 text-xs mt-1">{{ form.errors.name }}</div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Số tiền <span class="text-red-500">*</span></label>
          <a-input-number v-model:value="form.amount" :min="0" :step="100000" style="width: 100%;" size="large"
            :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
            :parser="v => v.replace(/,/g, '')" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Ngày chi phí <span class="text-red-500">*</span></label>
          <a-date-picker v-model:value="formDate" style="width: 100%;" size="large" format="DD/MM/YYYY" />
        </div>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nhóm chi phí</label>
          <a-select v-model:value="form.cost_group_id" style="width: 100%;" size="large" placeholder="Chọn nhóm..." show-search option-filter-prop="label" allow-clear @change="handleCostGroupChange">
            <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id" :label="g.name">
              {{ g.name }} <span v-if="g.expense_category" class="text-gray-400 text-xs font-normal">({{ g.expense_category.toUpperCase() }})</span>
            </a-select-option>
          </a-select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Phân loại phí <span class="text-red-500">*</span></label>
          <a-select v-model:value="form.expense_category" style="width: 100%;" size="large" placeholder="Phân loại" allow-clear>
            <a-select-option value="capex">CAPEX — Mua sắm tài sản</a-select-option>
            <a-select-option value="opex">OPEX — Vận hành (điện, nước, mặt bằng)</a-select-option>
            <a-select-option value="payroll">Lương, thưởng, bảo hiểm</a-select-option>
          </a-select>
          <div v-if="form.errors?.expense_category" class="text-red-500 text-xs mt-1">{{ form.errors.expense_category }}</div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
          <a-input-number v-model:value="form.quantity" :min="0" style="width: 100%;" size="large" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
          <a-input v-model:value="form.unit" placeholder="VD: tháng, lần, cái" size="large" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
        <a-textarea v-model:value="form.description" :rows="3" placeholder="Ghi chú thêm..." />
      </div>

      <!-- File Upload Section -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">Chứng từ đính kèm (Bắt buộc) <span class="text-red-500">*</span></label>
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
            <InboxOutlined />
          </p>
          <p class="ant-upload-text">Nhấn hoặc kéo thả file vào đây để upload</p>
          <p class="ant-upload-hint">Hỗ trợ ảnh hóa đơn, file PDF, biên lai...</p>
        </a-upload-dragger>
      </div>
    </div>
  </a-modal>

  <!-- ACCOUNTANT CONFIRM COMPANY COST MODAL -->
  <a-modal v-model:open="showConfirmCompanyCostModal" title="Kế toán xác nhận - Chi phí Công ty" @ok="confirmApproveCompanyCost" ok-text="Xác nhận" cancel-text="Hủy" centered class="crm-modal" :ok-button-props="{ disabled: !confirmCostFiles.length || confirmCostLoading }" :confirm-loading="confirmCostLoading">
    <div class="p-4 space-y-4">
      <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg"><InfoCircleOutlined /></div>
        <div class="text-[11px] text-blue-700 leading-tight">
          Vui lòng kiểm tra kỹ thông tin khoản chi và chứng từ gốc trước khi đính kèm Biên lai chuyển tiền để kế toán xác nhận hoàn thành.
        </div>
      </div>

      <div v-if="confirmCostTarget" class="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs">
         <div class="flex justify-between">
            <span class="text-gray-400">Khoản chi:</span>
            <span class="font-bold text-gray-700">{{ confirmCostTarget.name }}</span>
         </div>
         <div class="flex justify-between mt-1">
            <span class="text-gray-400">Số tiền:</span>
            <span class="font-bold text-red-600">{{ fmtCurrency(confirmCostTarget.amount) }}</span>
         </div>
         <div v-if="confirmCostTarget.description" class="flex flex-col mt-1.5 border-t border-gray-200/50 pt-1.5">
            <span class="text-gray-400">Mô tả:</span>
            <span class="text-gray-600 italic mt-0.5">{{ confirmCostTarget.description }}</span>
         </div>
      </div>

      <!-- Existing attachments uploaded by creator -->
      <div v-if="confirmCostTarget?.attachments?.filter(att => att.description !== 'after')?.length" class="border border-dashed border-gray-200 rounded-xl p-3 bg-gray-50/50">
        <div class="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <PaperClipOutlined class="text-gray-400" /> Tệp chứng từ gốc ({{ confirmCostTarget.attachments.filter(att => att.description !== 'after').length }})
        </div>
        <div class="space-y-1.5 max-h-[120px] overflow-y-auto">
          <div v-for="att in confirmCostTarget.attachments.filter(att => att.description !== 'after')" :key="att.id" 
               class="flex items-center justify-between p-2 rounded-lg border border-gray-100 bg-white hover:border-blue-300 transition-all cursor-pointer shadow-sm group"
               @click="window.open(att.file_url || `/storage/${att.file_path}`, '_blank')">
            <div class="flex items-center gap-2 min-w-0">
               <FileTextOutlined class="text-gray-400 text-xs" />
               <span class="text-[10px] text-gray-700 font-medium truncate max-w-[280px] hover:text-blue-600">{{ att.original_name || att.file_name }}</span>
            </div>
            <EyeOutlined class="text-[10px] text-gray-300 group-hover:text-blue-500" />
          </div>
        </div>
      </div>

      <!-- Accountant payment proof upload (Mandatory) -->
      <div class="border-t border-dashed pt-4">
        <div class="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <UploadOutlined class="text-blue-500" /> Chứng từ thanh toán / Ủy nhiệm chi * <span class="text-red-500">(Bắt buộc)</span>
        </div>
        
        <div class="flex flex-col gap-2">
          <!-- Selection Button -->
          <div class="relative group">
            <input 
              type="file" 
              multiple 
              @change="e => confirmCostFiles = [...(e.target.files || [])]" 
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            <div class="flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-blue-100 rounded-xl group-hover:border-blue-400 group-hover:bg-blue-50 transition-all">
              <UploadOutlined class="text-blue-400 group-hover:text-blue-600" />
              <span class="text-xs font-semibold text-blue-500 group-hover:text-blue-700">
                {{ confirmCostFiles.length ? 'Thay đổi tệp đã chọn' : 'Chọn tệp chứng từ thanh toán' }}
              </span>
            </div>
          </div>

          <!-- File List -->
          <div v-if="confirmCostFiles.length" class="space-y-1.5 mt-1">
            <div v-for="(file, idx) in confirmCostFiles" :key="idx" class="flex items-center justify-between p-2 bg-blue-50/50 rounded-lg border border-blue-100/50">
              <div class="flex items-center gap-2 min-w-0">
                <PaperClipOutlined class="text-blue-400 text-xs" />
                <span class="text-[10px] font-medium text-blue-700 truncate max-w-[280px]">{{ file.name }}</span>
                <span class="text-[9px] text-gray-400">({{ formatFileSize(file.size) }})</span>
              </div>
              <a-button type="text" size="small" @click="confirmCostFiles.splice(idx, 1)" class="h-5 w-5 p-0 flex items-center justify-center">
                <CloseOutlined class="text-[10px] text-gray-400 hover:text-red-500" />
              </a-button>
            </div>
          </div>
          <div v-else class="text-[10px] text-red-500 pl-1 mt-1 font-medium flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            * Vui lòng đính kèm chứng từ chuyển khoản để hoàn tất xác nhận.
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Head, router, useForm, usePage } from '@inertiajs/vue3'
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
import {
  PlusOutlined, DollarOutlined, CheckCircleOutlined, ClockCircleOutlined,
  FileTextOutlined, EditOutlined, DeleteOutlined, SendOutlined, UndoOutlined,
  UploadOutlined, InboxOutlined, PaperClipOutlined, EyeOutlined, InfoCircleOutlined,
  CloseCircleOutlined, CloseOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend)

defineOptions({ layout: CrmLayout })

const props = defineProps({
  costs: Object,
  stats: Object,
  charts: Object,
  costGroups: Array,
  suppliers: Array,
  filters: Object,
})

const user = computed(() => usePage().props.auth.user)
const can = (permission) => user.value?.super_admin || (user.value?.permissions || []).includes(permission)

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const id = urlParams.get('id')
  if (id) {
    const cost = props.costs.data.find(c => c.id == id)
    if (cost) {
      showDetail(cost)
    }
  }
})

const { defaultOptions, doughnutOptions } = useChart()

const fmtCurrency = (v) => {
  if (!v && v !== 0) return '0đ'
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v)
}

const formatDate = (d) => {
  if (!d) return '—'
  return dayjs(d).format('DD/MM/YYYY')
}

// ============================================================
// FILTERS
// ============================================================
const localFilters = reactive({ ...props.filters })
const filterStartDate = ref(props.filters?.start_date ? dayjs(props.filters.start_date) : null)
const filterEndDate = ref(props.filters?.end_date ? dayjs(props.filters.end_date) : null)

const buildQuery = () => {
  const params = new URLSearchParams()
  if (localFilters.search) params.set('search', localFilters.search)
  if (localFilters.status) params.set('status', localFilters.status)
  if (localFilters.expense_category) params.set('expense_category', localFilters.expense_category)
  if (filterStartDate.value) params.set('start_date', filterStartDate.value.format('YYYY-MM-DD'))
  if (filterEndDate.value) params.set('end_date', filterEndDate.value.format('YYYY-MM-DD'))
  return params.toString()
}

const applyFilters = () => {
  router.visit(`/finance/company-costs?${buildQuery()}`, { preserveState: true })
}

const filterOption = (input, option) => option.label?.toLowerCase().includes(input.toLowerCase())

// ============================================================
// CHARTS
// ============================================================
const barOpts = computed(() => ({
  ...defaultOptions,
  plugins: { ...defaultOptions.plugins, legend: { display: false }, tooltip: { ...defaultOptions.plugins.tooltip, callbacks: { label: (ctx) => fmtCurrency(ctx.raw) } } },
  scales: {
    ...defaultOptions.scales,
    y: { ...defaultOptions.scales.y, ticks: { ...defaultOptions.scales.y.ticks, callback: (v) => { if (v >= 1e9) return (v/1e9).toFixed(1)+'T'; if (v >= 1e6) return (v/1e6).toFixed(1)+'Tr'; if (v >= 1e3) return (v/1e3).toFixed(0)+'K'; return v; } } }
  }
}))

const monthlyChartData = computed(() => ({
  labels: props.charts?.monthly?.labels || [],
  datasets: [{
    label: 'Chi phí',
    data: props.charts?.monthly?.data || [],
    backgroundColor: 'rgba(27, 79, 114, 0.7)',
    borderColor: '#1B4F72',
    borderWidth: 1, borderRadius: 10, barThickness: 36,
  }]
}))

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

// ============================================================
// TABLE
// ============================================================
const columns = [
  { title: 'Tên chi phí', dataIndex: 'name', key: 'name', width: 260 },
  { title: 'Nhóm chi phí', dataIndex: 'cost_group', key: 'cost_group', width: 160 },
  { title: 'Phân loại', dataIndex: 'expense_category', key: 'expense_category', width: 140 },
  { title: 'Số tiền', dataIndex: 'amount', key: 'amount', width: 140, align: 'right' },
  { title: 'Ngày', dataIndex: 'cost_date', key: 'cost_date', width: 110 },
  { title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 120 },
  { title: 'Người tạo', dataIndex: 'creator', key: 'creator', width: 130 },
  { title: '', dataIndex: 'actions', key: 'actions', width: 200, fixed: 'right' },
]

const statusLabel = (s) => ({
  draft: 'Nháp',
  pending_management_approval: 'Chờ BĐH',
  pending_accountant_approval: 'Chờ KT',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
})[s] || s

const statusClass = (s) => ({
  draft: 'crm-tag--cancelled',
  pending_management_approval: 'crm-tag--pending',
  pending_accountant_approval: 'crm-tag--active',
  approved: 'crm-tag--completed',
  rejected: 'crm-tag--overdue',
})[s] || ''

// ============================================================
// MODAL / FORM
// ============================================================
const modalVisible = ref(false)
const drawerVisible = ref(false)
const selectedCost = ref(null)
const editingCost = ref(null)
const formDate = ref(null)

const showDetail = (record) => {
  selectedCost.value = record
  drawerVisible.value = true
}

const showConfirmCompanyCostModal = ref(false)
const confirmCostTarget = ref(null)
const confirmCostFiles = ref([])
const confirmCostLoading = ref(false)

const formatFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const approveCost = (id) => {
  // Find cost from costs list or selectedCost
  const cost = props.costs?.data?.find(c => c.id === id) || (selectedCost.value?.id === id ? selectedCost.value : null)
  if (cost && cost.status === 'pending_accountant_approval') {
    confirmCostTarget.value = cost
    confirmCostFiles.value = []
    showConfirmCompanyCostModal.value = true
  } else {
    router.post(`/finance/company-costs/${id}/approve`, {}, {
      preserveScroll: true,
      onSuccess: () => {
        message.success('Đã duyệt chi phí thành công')
        refreshSelectedCost(id)
      }
    })
  }
}

const confirmApproveCompanyCost = () => {
  if (!confirmCostFiles.value.length) {
    message.warning('Vui lòng chọn ít nhất một chứng từ chuyển khoản.')
    return
  }

  confirmCostLoading.value = true
  const fd = new FormData()
  confirmCostFiles.value.forEach(f => fd.append('files[]', f))

  router.post(`/finance/company-costs/${confirmCostTarget.value.id}/approve`, fd, {
    forceFormData: true,
    preserveScroll: true,
    onSuccess: () => {
      showConfirmCompanyCostModal.value = false
      confirmCostFiles.value = []
      message.success('Đã xác nhận chi phí thành công')
      refreshSelectedCost(confirmCostTarget.value.id)
    },
    onError: (errs) => {
      if (errs && errs.files) {
        message.error(errs.files[0])
      } else {
        message.error('Đã xảy ra lỗi khi xác nhận.')
      }
    },
    onFinish: () => {
      confirmCostLoading.value = false
    }
  })
}

const rejectCost = (id) => {
  const reason = prompt('Vui lòng nhập lý do từ chối:')
  if (reason === null) return // Cancelled
  
  router.post(`/finance/company-costs/${id}/reject`, { reason }, {
    preserveScroll: true,
    onSuccess: () => {
      message.success('Đã từ chối chi phí')
      refreshSelectedCost(id)
    }
  })
}

const form = useForm({
  name: '',
  amount: 0,
  cost_group_id: null,
  expense_category: null,
  cost_date: '',
  description: '',
  quantity: null,
  unit: '',
  attachment_ids: [],
})

const handleCostGroupChange = (val) => {
  if (!val) return
  const group = props.costGroups.find(g => g.id === val)
  if (group && group.expense_category) {
    form.expense_category = group.expense_category
  }
}

const fileList = ref([])

const uploadHeaders = computed(() => ({
  'X-Requested-With': 'XMLHttpRequest',
  'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content || '',
  'Accept': 'application/json',
}))

const handleUploadChange = (info) => {
  fileList.value = [...info.fileList]
  
  // Always update form.attachment_ids from the current fileList
  form.attachment_ids = info.fileList
    .filter(f => f.status === 'done' || f.status === 'success')
    .map(f => f.response?.id || f.id || f.uid)
    .filter(id => id && !isNaN(id))
}

const showCreateModal = () => {
  editingCost.value = null
  // Explicitly clear everything to prevent state retention
  form.name = ''
  form.amount = 0
  form.cost_group_id = null
  form.expense_category = null
  form.cost_date = ''
  form.description = ''
  form.quantity = null
  form.unit = ''
  form.attachment_ids = []
  
  fileList.value = []
  formDate.value = dayjs()
  form.clearErrors()
  modalVisible.value = true
}

const showEditModal = (record) => {
  editingCost.value = record
  form.name = record.name
  form.amount = parseFloat(record.amount)
  form.cost_group_id = record.cost_group_id
  form.expense_category = record.expense_category
  form.description = record.description || ''
  form.quantity = record.quantity ? parseFloat(record.quantity) : null
  form.unit = record.unit || ''
  // Map existing attachments to fileList and form
  if (record.attachments && record.attachments.length > 0) {
    fileList.value = record.attachments.map(a => ({
      uid: a.id,
      name: a.original_name || a.file_name || 'File',
      status: 'done',
      url: a.file_url,
      id: a.id
    }))
    form.attachment_ids = record.attachments.map(a => a.id)
  } else {
    fileList.value = []
    form.attachment_ids = []
  }

  formDate.value = record.cost_date ? dayjs(record.cost_date) : null
  modalVisible.value = true
}

const saveForm = () => {
  form.cost_date = formDate.value ? formDate.value.format('YYYY-MM-DD') : ''

  if (editingCost.value) {
    form.put(`/finance/company-costs/${editingCost.value.id}`, {
      preserveScroll: true,
      onSuccess: () => { 
        modalVisible.value = false
        refreshSelectedCost(editingCost.value.id)
      },
    })
  } else {
    form.post('/finance/company-costs', {
      preserveScroll: true,
      onSuccess: () => { modalVisible.value = false },
    })
  }
}

const refreshSelectedCost = (id) => {
  if (selectedCost.value && selectedCost.value.id === id) {
    // Wait a bit for props to update if needed, though Inertia onSuccess should be fine
    const fresh = props.costs.data.find(c => c.id === id)
    if (fresh) selectedCost.value = fresh
  }
}

// ============================================================
// ACTIONS
// ============================================================
const submitCost = (id) => {
  router.post(`/finance/company-costs/${id}/submit`, {}, { 
    preserveScroll: true,
    onSuccess: () => refreshSelectedCost(id)
  })
}

const deleteCost = (id) => {
  router.delete(`/finance/company-costs/${id}`, { preserveScroll: true })
}

const revertCost = (id) => {
  router.post(`/finance/company-costs/${id}/revert`, {}, { 
    preserveScroll: true,
    onSuccess: () => refreshSelectedCost(id)
  })
}
</script>
