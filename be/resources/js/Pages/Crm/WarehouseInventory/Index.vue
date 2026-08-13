<template>
  <Head title="Kho vật tư công ty" />

  <PageHeader title="Kho vật tư công ty" subtitle="Quản lý nhập kho tổng công ty và xuất kho điều chuyển sang các dự án">
    <template #actions>
      <a-button type="primary" size="large" @click="openCreateBillModal">
        <template #icon><PlusOutlined /></template>
        Mua vật tư nhập kho
      </a-button>
    </template>
  </PageHeader>

  <!-- Stats Grid -->
  <div class="crm-stats-grid">
    <StatCard label="Tổng giá trị tồn kho" :value="stats.totalValue" icon="DollarOutlined" variant="primary" />
    <StatCard label="Số loại vật tư trong kho" :value="stats.totalTypes" icon="BuildOutlined" variant="success" />
    <StatCard label="Yêu cầu xuất kho chờ duyệt" :value="stats.pendingExports" icon="InboxOutlined" variant="warning" />
  </div>

  <!-- Tabs Panel -->
  <div class="crm-content-card">
    <a-tabs v-model:activeKey="activeTab" class="crm-tabs px-6 pt-4">
      <!-- TAB 1: TỒN KHO HIỆN TẠI -->
      <a-tab-pane key="inventory" tab="Tồn kho hiện tại">
        <div class="py-4 flex items-center gap-4 flex-wrap border-b border-gray-100">
          <a-input-search v-model:value="searchQuery" placeholder="Tìm vật tư..." class="max-w-xs" allow-clear />
        </div>
        <a-table 
          :columns="inventoryColumns" 
          :data-source="filteredInventory" 
          :pagination="{ pageSize: 15 }" 
          row-key="material_id" 
          size="small" 
          class="crm-table mt-4 pb-6"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'code'">
              <span class="font-mono text-xs text-slate-500">{{ record.code }}</span>
            </template>
            <template v-else-if="column.key === 'unit_price'">
              {{ formatCurrency(record.unit_price) }}
            </template>
            <template v-else-if="column.key === 'actual_stock'">
              <span class="font-bold text-slate-700">{{ record.actual_stock }}</span>
            </template>
            <template v-else-if="column.key === 'available_stock'">
              <a-badge :status="record.available_stock > 0 ? 'success' : 'default'" />
              <span class="font-bold text-blue-600">{{ record.available_stock }}</span>
            </template>
            <template v-else-if="column.key === 'total_value'">
              <span class="font-semibold text-slate-800">{{ formatCurrency(record.total_value) }}</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-button 
                type="primary" 
                ghost 
                size="small" 
                :disabled="record.available_stock <= 0"
                @click="openExportModal(record)"
              >
                <template #icon><SwapOutlined /></template>
                Xuất kho
              </a-button>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <!-- TAB 2: PHIẾU MUA NHẬP KHO (PVT) -->
      <a-tab-pane key="bills" tab="Phiếu mua nhập kho (PVT)">
        <a-table 
          :columns="billColumns" 
          :data-source="bills" 
          :pagination="{ pageSize: 10 }" 
          row-key="id" 
          size="small" 
          class="crm-table mt-4 pb-6"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'bill_number'">
              <span class="font-bold text-blue-600">{{ record.bill_number }}</span>
            </template>
            <template v-else-if="column.key === 'supplier'">
              <span>{{ record.supplier?.name || 'Mua nhỏ lẻ' }}</span>
            </template>
            <template v-else-if="column.key === 'total_amount'">
              <span class="font-semibold text-slate-800">{{ formatCurrency(record.total_amount) }}</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="getStatusColor(record.status)">
                {{ getStatusLabel(record.status) }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'bill_date'">
              {{ formatDate(record.bill_date) }}
            </template>
            <template v-else-if="column.key === 'creator'">
              <span>{{ record.creator?.name || 'N/A' }}</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <div class="flex items-center gap-1.5 justify-center">
                <!-- Xem chi tiết -->
                <a-button type="text" size="small" @click="viewBillDetails(record)">
                  <template #icon><EyeOutlined /></template>
                </a-button>

                <!-- Edit / Delete Draft/Rejected -->
                <template v-if="['draft', 'rejected'].includes(record.status)">
                  <a-button type="text" size="small" @click="openEditBillModal(record)">
                    <template #icon><EditOutlined /></template>
                  </a-button>
                  <a-popconfirm title="Gửi duyệt phiếu này?" @confirm="submitBill(record)">
                    <a-button type="text" size="small" class="text-blue-500"><template #icon><SendOutlined /></template></a-button>
                  </a-popconfirm>
                  <a-popconfirm title="Xóa phiếu này?" @confirm="deleteBill(record)">
                    <a-button type="text" size="small" danger><template #icon><DeleteOutlined /></template></a-button>
                  </a-popconfirm>
                </template>

                <!-- BĐH duyệt -->
                <template v-if="record.status === 'pending_management' && canApproveManagement">
                  <a-popconfirm title="Duyệt phiếu mua vật tư này?" @confirm="approveBillManagement(record)">
                    <a-button type="text" size="small" class="text-emerald-600"><template #icon><CheckOutlined /></template></a-button>
                  </a-popconfirm>
                  <a-button type="text" size="small" danger @click="openRejectBillModal(record)">
                    <template #icon><CloseOutlined /></template>
                  </a-button>
                </template>

                <!-- Kế toán xác nhận -->
                <template v-if="record.status === 'pending_accountant' && canApproveAccountant">
                  <a-popconfirm title="Xác nhận thanh toán và nhập kho?" @confirm="approveBillAccountant(record)">
                    <a-button type="text" size="small" class="text-indigo-600"><template #icon><FileDoneOutlined /></template></a-button>
                  </a-popconfirm>
                  <a-button type="text" size="small" danger @click="openRejectBillModal(record)">
                    <template #icon><CloseOutlined /></template>
                  </a-button>
                </template>

                <!-- Hoàn duyệt (Revert) -->
                <a-popconfirm 
                  v-if="canRevert(record)" 
                  title="Hoàn duyệt phiếu này về nháp/chờ duyệt?" 
                  @confirm="revertBill(record)"
                >
                  <a-button type="text" size="small" class="text-amber-500"><template #icon><RollbackOutlined /></template></a-button>
                </a-popconfirm>
              </div>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <!-- TAB 3: LỊCH SỬ GIAO DỊCH -->
      <a-tab-pane key="history" tab="Lịch sử giao dịch">
        <a-table 
          :columns="historyColumns" 
          :data-source="history" 
          :pagination="{ pageSize: 15 }" 
          row-key="id" 
          size="small" 
          class="crm-table mt-4 pb-6"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'transaction_date'">
              {{ formatDate(record.transaction_date) }}
            </template>
            <template v-else-if="column.key === 'type'">
              <a-tag :color="record.type === 'export' ? 'purple' : 'blue'">
                {{ record.type === 'export' ? 'Xuất kho' : 'Nhập kho' }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'material'">
              <span class="font-semibold text-slate-800">{{ record.material?.name }}</span>
              <div class="text-[10px] text-slate-400 font-mono">{{ record.material?.code }}</div>
            </template>
            <template v-else-if="column.key === 'quantity'">
              <span class="font-bold" :class="record.type === 'export' ? 'text-purple-600' : 'text-blue-600'">
                {{ record.type === 'export' ? '-' : '+' }}{{ record.quantity }}
              </span>
            </template>
            <template v-else-if="column.key === 'unit_price'">
              {{ formatCurrency(record.unit_price) }}
            </template>
            <template v-else-if="column.key === 'total_amount'">
              {{ formatCurrency(record.total_amount) }}
            </template>
            <template v-else-if="column.key === 'target_project'">
              <span>{{ record.target_project?.name || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="getTransStatusColor(record.status)">
                {{ getTransStatusLabel(record.status) }}
              </a-tag>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
      <a-tab-pane key="export_approvals" tab="Duyệt xuất kho">
        <a-table 
          :columns="exportApprovalColumns" 
          :data-source="pendingExports" 
          :pagination="{ pageSize: 15 }" 
          row-key="id" 
          size="small" 
          class="crm-table mt-4 pb-6"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'transaction_date'">
              {{ formatDate(record.transaction_date) }}
            </template>
            <template v-else-if="column.key === 'material'">
              <span class="font-semibold text-slate-800">{{ record.material?.name }}</span>
              <div class="text-[10px] text-slate-400 font-mono">{{ record.material?.code }}</div>
            </template>
            <template v-else-if="column.key === 'target_project'">
              <span>{{ record.target_project?.name || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'quantity'">
              <span class="font-bold text-purple-600">{{ record.quantity }}</span>
            </template>
            <template v-else-if="column.key === 'unit_price'">
              {{ formatCurrency(record.unit_price) }}
            </template>
            <template v-else-if="column.key === 'total_amount'">
              {{ formatCurrency(record.total_amount) }}
            </template>
            <template v-else-if="column.key === 'created_by'">
              <span>{{ record.creator?.name || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space :size="8">
                <a-button 
                  type="primary" 
                  size="small" 
                  class="bg-emerald-600 hover:bg-emerald-700 border-0 font-semibold text-white px-3 flex items-center gap-1 rounded-lg"
                  style="color: #fff !important; background-color: #059669 !important; border-color: #059669 !important;"
                  @click="openApproveExportModal(record)"
                >
                  <CheckOutlined /> Duyệt
                </a-button>
                <a-button 
                  type="primary" 
                  danger
                  size="small" 
                  class="bg-red-600 hover:bg-red-700 border-0 font-semibold text-white px-3 flex items-center gap-1 rounded-lg"
                  style="color: #fff !important; background-color: #dc2626 !important; border-color: #dc2626 !important;"
                  @click="openRejectExportModal(record)"
                >
                  <CloseOutlined /> Từ chối
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>
  </div>

  <!-- MODAL: XUẤT KHO SANG DỰ ÁN -->
  <a-modal 
    v-model:open="showExportModal" 
    title="Xuất vật tư điều chuyển sang Dự án" 
    :width="550" 
    @ok="handleExportSubmit" 
    @cancel="closeExportModal"
    ok-text="Gửi yêu cầu xuất kho" 
    cancel-text="Hủy"
    class="crm-modal" 
    centered
  >
    <div v-if="selectedMaterial" class="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4 flex justify-between">
      <div>
        <div class="text-xs text-blue-500 font-semibold uppercase">Vật tư xuất</div>
        <div class="text-sm font-bold text-blue-900 mt-0.5">{{ selectedMaterial.name }}</div>
      </div>
      <div class="text-right">
        <div class="text-xs text-blue-500 font-semibold uppercase">Tồn kho khả dụng</div>
        <div class="text-sm font-bold text-blue-900 mt-0.5">{{ selectedMaterial.available_stock }} {{ selectedMaterial.unit }}</div>
      </div>
    </div>

    <a-form layout="vertical">
      <a-form-item label="Dự án nhận" required :validate-status="exportForm.errors.target_project_id ? 'error' : ''" :help="exportForm.errors.target_project_id">
        <a-select 
          v-model:value="exportForm.target_project_id" 
          placeholder="Chọn dự án..." 
          show-search 
          option-filter-prop="label"
          size="large"
        >
          <a-select-option v-for="p in projects" :key="p.id" :value="p.id" :label="p.name">
            {{ p.name }} ({{ p.code }})
          </a-select-option>
        </a-select>
      </a-form-item>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Số lượng xuất" required :validate-status="exportForm.errors.quantity ? 'error' : ''" :help="exportForm.errors.quantity">
            <a-input-number 
              v-model:value="exportForm.quantity" 
              :min="0.01" 
              :max="selectedMaterial ? selectedMaterial.available_stock : 99999" 
              class="w-full" 
              size="large" 
            />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Đơn giá xuất (VND)" required :validate-status="exportForm.errors.unit_price ? 'error' : ''" :help="exportForm.errors.unit_price">
            <a-input-number 
              v-model:value="exportForm.unit_price" 
              :min="0" 
              class="w-full" 
              size="large" 
              :formatter="(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="Ngày xuất" required :validate-status="exportForm.errors.transaction_date ? 'error' : ''" :help="exportForm.errors.transaction_date">
        <a-input type="date" v-model:value="exportForm.transaction_date" class="w-full" size="large" />
      </a-form-item>

      <a-form-item label="Ghi chú">
        <a-textarea v-model:value="exportForm.notes" :rows="2" placeholder="Lý do xuất kho, ghi chú..." />
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- MODAL: MUA NHẬP KHO TỔNG (PVT) -->
  <a-modal 
    v-model:open="showBillModal" 
    :title="editingBill ? 'Chỉnh sửa phiếu mua nhập kho' : 'Tạo phiếu mua vật tư nhập kho tổng'" 
    :width="850" 
    @ok="handleBillSubmit" 
    @cancel="closeBillModal"
    ok-text="Lưu phiếu" 
    cancel-text="Hủy"
    class="crm-modal" 
    centered
  >
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Nhà cung cấp" required :validate-status="billForm.errors.supplier_id ? 'error' : ''" :help="billForm.errors.supplier_id">
            <a-select v-model:value="billForm.supplier_id" placeholder="Chọn nhà cung cấp..." size="large" show-search option-filter-prop="label">
              <a-select-option v-for="s in suppliers" :key="s.id" :value="s.id" :label="s.name">{{ s.name }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Ngày lập phiếu" required :validate-status="billForm.errors.bill_date ? 'error' : ''" :help="billForm.errors.bill_date">
            <a-input type="date" v-model:value="billForm.bill_date" size="large" />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Nhóm chi phí" :validate-status="billForm.errors.cost_group_id ? 'error' : ''" :help="billForm.errors.cost_group_id">
            <a-select v-model:value="billForm.cost_group_id" placeholder="Chọn nhóm chi phí..." size="large" show-search option-filter-prop="label">
              <a-select-option v-for="g in costGroups" :key="g.id" :value="g.id" :label="g.name">{{ g.name }}</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="Ghi chú">
            <a-input v-model:value="billForm.notes" placeholder="Ghi chú phiếu..." size="large" />
          </a-form-item>
        </a-col>
      </a-row>

      <!-- Danh sách vật tư nhập -->
      <div class="mt-4 border-t border-gray-100 pt-4">
        <div class="flex justify-between items-center mb-3">
          <h4 class="text-sm font-bold text-slate-700 uppercase tracking-wider">Danh sách vật tư nhập kho</h4>
          <a-button type="dashed" size="small" @click="addBillItem">
            <template #icon><PlusOutlined /></template> Add Item
          </a-button>
        </div>

        <div v-for="(item, idx) in billForm.items" :key="idx" class="flex items-center gap-3 mb-3 bg-slate-50 p-3 rounded-lg border border-slate-100 relative">
          <div class="flex-1">
            <a-form-item label="Vật tư" class="mb-0">
              <a-select 
                v-model:value="item.material_id" 
                placeholder="Chọn vật tư..." 
                show-search 
                option-filter-prop="label"
                @change="(val) => onMaterialChange(val, idx)"
              >
                <a-select-option v-for="m in inventory" :key="m.material_id" :value="m.material_id" :label="m.name">
                  {{ m.name }} ({{ m.code }})
                </a-select-option>
              </a-select>
            </a-form-item>
          </div>
          <div class="w-32">
            <a-form-item label="Số lượng" class="mb-0">
              <a-input-number v-model:value="item.quantity" :min="0.01" class="w-full" />
            </a-form-item>
          </div>
          <div class="w-44">
            <a-form-item label="Đơn giá nhập" class="mb-0">
              <a-input-number v-model:value="item.unit_price" :min="0" class="w-full" :formatter="(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')" />
            </a-form-item>
          </div>
          <div class="w-40 text-right pr-2">
            <span class="text-xs text-gray-400 block mb-1 font-semibold">Thành tiền</span>
            <span class="text-sm font-bold text-slate-800">{{ formatCurrency(item.quantity * item.unit_price) }}</span>
          </div>
          <div class="pt-6">
            <a-button type="text" danger size="small" @click="removeBillItem(idx)">
              <template #icon><DeleteOutlined /></template>
            </a-button>
          </div>
        </div>

        <div class="text-right text-base font-bold text-slate-800 mt-4 border-t border-slate-100 pt-3 flex justify-between px-3">
          <span>TỔNG TIỀN PHIẾU NHẬP:</span>
          <span class="text-blue-600 text-lg">{{ formatCurrency(billTotal) }}</span>
        </div>
      </div>
    </a-form>
  </a-modal>

  <!-- MODAL: XEM CHI TIẾT PHIẾU NHẬP (PVT DETAIL) -->
  <a-modal 
    v-model:open="showDetailModal" 
    title="Chi tiết phiếu mua vật tư nhập kho tổng" 
    :width="700" 
    :footer="null"
    class="crm-modal" 
    centered
  >
    <div v-if="selectedBill" class="flex flex-col gap-4 mt-4">
      <div class="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div>
          <div class="text-[10px] text-gray-400 font-bold uppercase">Số phiếu</div>
          <div class="text-sm font-bold text-slate-800 mt-0.5">{{ selectedBill.bill_number }}</div>
        </div>
        <div>
          <div class="text-[10px] text-gray-400 font-bold uppercase">Nhà cung cấp</div>
          <div class="text-sm font-bold text-slate-800 mt-0.5">{{ selectedBill.supplier?.name || 'Mua nhỏ lẻ' }}</div>
        </div>
        <div>
          <div class="text-[10px] text-gray-400 font-bold uppercase">Ngày lập phiếu</div>
          <div class="text-sm font-bold text-slate-800 mt-0.5">{{ formatDate(selectedBill.bill_date) }}</div>
        </div>
        <div>
          <div class="text-[10px] text-gray-400 font-bold uppercase">Trạng thái</div>
          <div class="mt-0.5">
            <a-tag :color="getStatusColor(selectedBill.status)">{{ getStatusLabel(selectedBill.status) }}</a-tag>
          </div>
        </div>
        <div class="col-span-2">
          <div class="text-[10px] text-gray-400 font-bold uppercase">Ghi chú</div>
          <div class="text-sm font-semibold text-slate-700 mt-0.5">{{ selectedBill.notes || '—' }}</div>
        </div>
      </div>

      <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mt-2 mb-1">Danh sách mặt hàng</h4>
      <div class="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-100">
              <th class="p-3 text-xs font-bold text-slate-500">Mặt hàng</th>
              <th class="p-3 text-xs font-bold text-slate-500 text-right">Số lượng</th>
              <th class="p-3 text-xs font-bold text-slate-500 text-right">Đơn giá</th>
              <th class="p-3 text-xs font-bold text-slate-500 text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in selectedBill.items" :key="item.id" class="border-b border-slate-100 hover:bg-slate-50/50">
              <td class="p-3">
                <div class="font-semibold text-slate-800 text-xs">{{ item.material?.name }}</div>
                <div class="text-[9px] text-slate-400 font-mono mt-0.5">{{ item.material?.code }}</div>
              </td>
              <td class="p-3 text-right font-medium text-slate-700 text-xs">{{ item.quantity }} {{ item.material?.unit }}</td>
              <td class="p-3 text-right font-medium text-slate-700 text-xs">{{ formatCurrency(item.unit_price) }}</td>
              <td class="p-3 text-right font-bold text-slate-800 text-xs">{{ formatCurrency(item.quantity * item.unit_price) }}</td>
            </tr>
            <tr class="bg-slate-50 font-bold text-slate-800">
              <td colspan="3" class="p-3 text-right text-xs">TỔNG CỘNG:</td>
              <td class="p-3 text-right text-sm text-blue-600">{{ formatCurrency(selectedBill.total_amount) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Chứng từ đính kèm -->
      <div class="mt-4 border-t border-gray-100 pt-4">
        <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Chứng từ đính kèm</h4>
        <div v-if="selectedBill.attachments && selectedBill.attachments.length > 0" class="flex flex-col gap-1.5 mb-3">
          <div v-for="file in selectedBill.attachments" :key="file.id" class="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs hover:bg-slate-100/50 transition">
            <div class="flex items-center gap-2 cursor-pointer truncate max-w-[80%]" @click="openFilePreview(file)">
              <span class="text-blue-500 hover:underline font-semibold truncate">📄 {{ file.original_name || file.file_name }}</span>
            </div>
            <div class="flex items-center gap-3">
              <a-button type="link" size="small" class="p-0 font-bold" @click="openFilePreview(file)">Xem</a-button>
              <a :href="`/files/${file.id}/download`" target="_blank" class="text-blue-500 hover:underline font-semibold">Tải về</a>
            </div>
          </div>
        </div>
        <div v-else class="text-xs text-slate-400 italic mb-3">Chưa có chứng từ đính kèm.</div>
      </div>

      <!-- Thao tác duyệt trực tiếp của BĐH -->
      <div v-if="selectedBill.status === 'pending_management' && canApproveManagement" class="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mt-2">
        <div class="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">Ban điều hành phê duyệt</div>
        <div class="flex items-center gap-2">
          <a-button 
            type="primary" 
            class="font-semibold text-white" 
            style="color: #fff !important; background-color: #059669 !important; border-color: #059669 !important;"
            @click="approveBillManagementDirect(selectedBill)"
          >
            Phê duyệt phiếu
          </a-button>
          <a-button 
            type="primary" 
            danger 
            class="font-semibold text-white" 
            style="color: #fff !important; background-color: #dc2626 !important; border-color: #dc2626 !important;"
            @click="openRejectBillModal(selectedBill)"
          >
            Từ chối phiếu
          </a-button>
        </div>
      </div>

      <!-- Thao tác duyệt & Upload file của Kế toán -->
      <div v-if="selectedBill.status === 'pending_accountant' && canApproveAccountant" class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mt-2">
        <div class="text-xs font-bold text-indigo-700 uppercase tracking-wider mb-2">Kế toán xác nhận & nhập kho</div>
        <a-form layout="vertical">
          <a-form-item label="Tải lên chứng từ thanh toán (Bắt buộc)" required class="mb-3">
            <input type="file" multiple @change="handleAccountantFileChange" class="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
          </a-form-item>
          
          <div class="flex items-center gap-2">
            <a-button 
              type="primary" 
              class="font-semibold text-white" 
              :style="{
                color: '#fff !important',
                backgroundColor: (accountantFiles.length > 0 || (selectedBill.attachments && selectedBill.attachments.length > 0)) ? '#059669 !important' : '',
                borderColor: (accountantFiles.length > 0 || (selectedBill.attachments && selectedBill.attachments.length > 0)) ? '#059669 !important' : ''
              }"
              :loading="submittingAccountantApproval"
              :disabled="accountantFiles.length === 0 && (!selectedBill.attachments || selectedBill.attachments.length === 0)"
              @click="submitAccountantApproveDirect(selectedBill)"
            >
              Xác nhận thanh toán & Nhập kho
            </a-button>
            <a-button 
              type="primary" 
              danger 
              class="font-semibold text-white" 
              style="color: #fff !important; background-color: #dc2626 !important; border-color: #dc2626 !important;"
              @click="openRejectBillModal(selectedBill)"
            >
              Từ chối phiếu
            </a-button>
          </div>
        </a-form>
      </div>
    </div>
  </a-modal>

  <!-- MODAL: XEM TRƯỚC CHỨNG TỪ (FILE PREVIEW) -->
  <a-modal
    v-model:open="showPreviewModal"
    title="Xem trước chứng từ"
    :width="800"
    :footer="null"
    class="crm-modal"
    centered
    @cancel="closeFilePreview"
  >
    <div v-if="previewFile" class="flex flex-col items-center justify-center p-2 mt-4">
      <div class="w-full mb-4 flex items-center justify-between text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <span class="font-bold truncate max-w-md">📄 {{ previewFile.original_name || previewFile.file_name }}</span>
        <a :href="previewFile.file_url" target="_blank" download class="text-blue-500 hover:underline font-bold">Tải tệp gốc</a>
      </div>
      
      <div class="w-full flex justify-center items-center overflow-auto bg-slate-50/50 rounded-xl border border-slate-100 p-2" style="min-height: 400px;">
        <!-- Nếu là ảnh -->
        <img 
          v-if="isImageFile(previewFile)" 
          :src="previewFile.file_url" 
          class="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm" 
        />
        
        <!-- Nếu là PDF -->
        <iframe 
          v-else-if="isPdfFile(previewFile)" 
          :src="previewFile.file_url" 
          class="w-full h-[65vh] rounded-lg border border-slate-200" 
          frameborder="0"
        ></iframe>
        
        <!-- Các định dạng khác -->
        <div v-else class="text-center py-12">
          <div class="text-5xl mb-4">📁</div>
          <div class="text-sm font-bold text-slate-700">Định dạng file này không hỗ trợ xem trước trực tiếp</div>
          <div class="text-xs text-slate-400 mt-1.5 mb-6">Bạn có thể tải tệp xuống thiết bị để xem chi tiết.</div>
          <a-button type="primary" class="bg-blue-600 border-blue-600 hover:bg-blue-700" :href="previewFile.file_url" target="_blank" download>
            Tải tệp xuống
          </a-button>
        </div>
      </div>
    </div>
  </a-modal>

  <!-- MODAL: TỪ CHỐI DUYỆT (REJECT BILL) -->
  <a-modal 
    v-model:open="showRejectModal" 
    title="Từ chối phê duyệt phiếu vật tư" 
    :width="500" 
    @ok="submitRejectBill" 
    @cancel="closeRejectBillModal"
    ok-text="Từ chối phiếu" 
    cancel-text="Hủy"
    class="crm-modal" 
    centered
  >
    <a-form layout="vertical" class="mt-4">
      <a-form-item label="Lý do từ chối" required>
        <a-textarea v-model:value="rejectReason" :rows="3" placeholder="Nhập lý do từ chối để nhân sự điều chỉnh..." />
      </a-form-item>
    </a-form>
  </a-modal>

  <!-- MODAL: PHÊ DUYỆT XUẤT KHO -->
  <a-modal
    v-model:open="showApproveExportModal"
    title="Phê duyệt yêu cầu xuất kho"
    :width="500"
    @ok="submitApproveExport"
    @cancel="closeApproveExportModal"
    ok-text="Xác nhận duyệt"
    cancel-text="Hủy"
    class="crm-modal"
    centered
  >
    <div v-if="selectedExport" class="mt-4 space-y-3">
      <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
        <div class="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-2">Thông tin xuất kho</div>
        <div class="grid grid-cols-2 gap-4 text-xs text-slate-600">
          <div>
            <div class="text-slate-400">Vật tư:</div>
            <div class="font-bold text-slate-800 text-sm mt-0.5">{{ selectedExport.material?.name }}</div>
          </div>
          <div>
            <div class="text-slate-400">Dự án nhận:</div>
            <div class="font-bold text-slate-800 text-sm mt-0.5">{{ selectedExport.target_project?.name }}</div>
          </div>
          <div>
            <div class="text-slate-400">Số lượng:</div>
            <div class="font-bold text-slate-800 text-sm mt-0.5">{{ selectedExport.quantity }}</div>
          </div>
          <div>
            <div class="text-slate-400 font-semibold">Thành tiền:</div>
            <div class="font-bold text-emerald-600 text-sm mt-0.5">{{ formatCurrency(selectedExport.total_amount) }}</div>
          </div>
        </div>
      </div>
      <p class="text-xs text-slate-500 italic mt-2">Lưu ý: Sau khi duyệt, hệ thống sẽ tự động hoàn thành phiếu xuất kho tổng, tạo phiếu nhập kho dự án tương ứng và ghi nhận chi phí cho dự án nhận.</p>
    </div>
  </a-modal>

  <!-- MODAL: TỪ CHỐI XUẤT KHO -->
  <a-modal
    v-model:open="showRejectExportModal"
    title="Từ chối yêu cầu xuất kho"
    :width="500"
    @ok="submitRejectExport"
    @cancel="closeRejectExportModal"
    ok-text="Xác nhận từ chối"
    cancel-text="Hủy"
    class="crm-modal"
    centered
  >
    <div v-if="selectedExport" class="mt-4 space-y-3">
      <div class="bg-red-50 border border-red-100 rounded-xl p-4">
        <div class="text-xs text-red-700 font-bold uppercase tracking-wider mb-2">Thông tin xuất kho</div>
        <div class="grid grid-cols-2 gap-4 text-xs text-slate-600">
          <div>
            <div class="text-slate-400">Vật tư:</div>
            <div class="font-bold text-slate-800 text-sm mt-0.5">{{ selectedExport.material?.name }}</div>
          </div>
          <div>
            <div class="text-slate-400 font-semibold">Thành tiền:</div>
            <div class="font-bold text-red-600 text-sm mt-0.5">{{ formatCurrency(selectedExport.total_amount) }}</div>
          </div>
        </div>
      </div>
      <a-form layout="vertical" class="mt-2">
        <a-form-item label="Lý do từ chối" required>
          <a-textarea v-model:value="rejectExportReason" :rows="3" placeholder="Nhập lý do từ chối để nhân sự điều chỉnh..." />
        </a-form-item>
      </a-form>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Head, useForm, router } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import { 
  PlusOutlined, EditOutlined, DeleteOutlined, SwapOutlined, SendOutlined, 
  RollbackOutlined, EyeOutlined, CheckOutlined, CloseOutlined, FileDoneOutlined,
  DollarOutlined, BuildOutlined, InboxOutlined
} from '@ant-design/icons-vue'

defineOptions({ layout: CrmLayout })
const props = defineProps({
  inventory: Array,
  bills: Array,
  history: Array,
  projects: Array,
  suppliers: Array,
  costGroups: Array
})

// Current user permission helpers
const canApproveManagement = computed(() => true) // Super admin or mapped roles
const canApproveAccountant = computed(() => true)

const activeTab = ref('inventory')
const searchQuery = ref('')

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const tab = urlParams.get('tab')
  if (tab) {
    activeTab.value = tab
  }
})

// Yêu cầu xuất kho chờ duyệt
const pendingExports = computed(() => props.history.filter(item => item.type === 'export' && item.status === 'pending'))

const exportApprovalColumns = [
  { title: 'Ngày yêu cầu', dataIndex: 'transaction_date', key: 'transaction_date', width: 120 },
  { title: 'Vật tư', key: 'material', width: 180 },
  { title: 'Dự án nhận', key: 'target_project', width: 180 },
  { title: 'Số lượng xuất', dataIndex: 'quantity', key: 'quantity', width: 100, align: 'right' },
  { title: 'Đơn giá xuất', dataIndex: 'unit_price', key: 'unit_price', width: 120, align: 'right' },
  { title: 'Thành tiền', dataIndex: 'total_amount', key: 'total_amount', width: 120, align: 'right' },
  { title: 'Người yêu cầu', key: 'created_by', width: 130 },
  { title: 'Thao tác', key: 'actions', width: 180, align: 'center' }
]

const showApproveExportModal = ref(false)
const showRejectExportModal = ref(false)
const selectedExport = ref(null)
const rejectExportReason = ref('')

const openApproveExportModal = (record) => {
  selectedExport.value = record
  showApproveExportModal.value = true
}

const closeApproveExportModal = () => {
  showApproveExportModal.value = false
  selectedExport.value = null
}

const submitApproveExport = () => {
  if (!selectedExport.value) return
  router.post(`/approvals/warehouse-export/${selectedExport.value.id}/approve`, {}, {
    preserveScroll: true,
    onSuccess: () => {
      showApproveExportModal.value = false
      selectedExport.value = null
    }
  })
}

const openRejectExportModal = (record) => {
  selectedExport.value = record
  rejectExportReason.value = ''
  showRejectExportModal.value = true
}

const closeRejectExportModal = () => {
  showRejectExportModal.value = false
  selectedExport.value = null
  rejectExportReason.value = ''
}

const submitRejectExport = () => {
  if (!selectedExport.value || !rejectExportReason.value.trim()) return
  router.post(`/approvals/warehouse-export/${selectedExport.value.id}/reject`, {
    reason: rejectExportReason.value.trim()
  }, {
    preserveScroll: true,
    onSuccess: () => {
      showRejectExportModal.value = false
      selectedExport.value = null
      rejectExportReason.value = ''
    }
  })
}

const formatCurrency = (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) : '—'
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString('vi-VN')
}

// Compute dashboard statistics
const stats = computed(() => {
  const totalValue = props.inventory.reduce((sum, item) => sum + item.total_value, 0)
  const totalTypes = props.inventory.filter(item => item.actual_stock > 0).length
  const pendingExports = props.history.filter(item => item.type === 'export' && item.status === 'pending').length

  return {
    totalValue,
    totalTypes,
    pendingExports
  }
})

// Filtered Inventory Data
const filteredInventory = computed(() => {
  if (!searchQuery.value) return props.inventory
  const q = searchQuery.value.toLowerCase()
  return props.inventory.filter(item => 
    item.name.toLowerCase().includes(q) || 
    item.code.toLowerCase().includes(q)
  )
})

// Columns Definitions
const inventoryColumns = [
  { title: 'Mã vật tư', key: 'code', width: 120 },
  { title: 'Tên vật tư', dataIndex: 'name', width: 250 },
  { title: 'ĐVT', dataIndex: 'unit', width: 80 },
  { title: 'Đơn giá hiện tại', key: 'unit_price', width: 140, align: 'right' },
  { title: 'Tồn thực tế', key: 'actual_stock', width: 120, align: 'right' },
  { title: 'Tồn khả dụng', key: 'available_stock', width: 120, align: 'right' },
  { title: 'Tổng giá trị', key: 'total_value', width: 150, align: 'right' },
  { title: 'Thao tác', key: 'actions', width: 120, align: 'center' }
]

const billColumns = [
  { title: 'Số phiếu', key: 'bill_number', width: 150 },
  { title: 'Nhà cung cấp', key: 'supplier', width: 200 },
  { title: 'Tổng giá trị', key: 'total_amount', width: 150, align: 'right' },
  { title: 'Trạng thái', key: 'status', width: 150, align: 'center' },
  { title: 'Ngày lập', key: 'bill_date', width: 120 },
  { title: 'Người tạo', key: 'creator', width: 150 },
  { title: 'Thao tác', key: 'actions', width: 200, align: 'center' }
]

const historyColumns = [
  { title: 'Ngày GD', key: 'transaction_date', width: 120 },
  { title: 'Loại GD', key: 'type', width: 100, align: 'center' },
  { title: 'Vật tư', key: 'material', width: 220 },
  { title: 'Số lượng', key: 'quantity', width: 120, align: 'right' },
  { title: 'Đơn giá', key: 'unit_price', width: 130, align: 'right' },
  { title: 'Thành tiền', key: 'total_amount', width: 150, align: 'right' },
  { title: 'Dự án nhận', key: 'target_project', width: 200 },
  { title: 'Trạng thái', key: 'status', width: 130, align: 'center' },
  { title: 'Ghi chú', dataIndex: 'notes', width: 200 }
]

// Status mappings
const getStatusLabel = (status) => {
  const map = {
    draft: 'Nháp',
    pending_management: 'Chờ BĐH duyệt',
    pending_accountant: 'Chờ Kế toán xác nhận',
    approved: 'Đã nhập kho',
    rejected: 'Bị từ chối',
    cancelled: 'Đã hủy'
  }
  return map[status] || status
}

const getStatusColor = (status) => {
  const map = {
    draft: 'default',
    pending_management: 'warning',
    pending_accountant: 'processing',
    approved: 'success',
    rejected: 'error',
    cancelled: 'error'
  }
  return map[status] || 'default'
}

const getTransStatusLabel = (status) => {
  const map = {
    pending: 'Chờ duyệt',
    approved: 'Đã hoàn thành',
    rejected: 'Bị từ chối'
  }
  return map[status] || status
}

const getTransStatusColor = (status) => {
  const map = {
    pending: 'warning',
    approved: 'success',
    rejected: 'error'
  }
  return map[status] || 'default'
}

// -------------------------------------------------------------
// LUỒNG XUẤT KHO SANG DỰ ÁN
// -------------------------------------------------------------
const showExportModal = ref(false)
const selectedMaterial = ref(null)

const exportForm = useForm({
  material_id: null,
  target_project_id: null,
  quantity: 1,
  unit_price: 0,
  transaction_date: new Date().toISOString().split('T')[0],
  notes: ''
})

const openExportModal = (material) => {
  selectedMaterial.value = material
  exportForm.reset()
  exportForm.material_id = material.material_id
  exportForm.unit_price = material.unit_price
  showExportModal.value = true
}

const closeExportModal = () => {
  showExportModal.value = false
  selectedMaterial.value = null
  exportForm.reset()
}

const handleExportSubmit = () => {
  exportForm.post('/warehouse-inventory/export', {
    onSuccess: () => {
      closeExportModal()
    }
  })
}

// -------------------------------------------------------------
// LUỒNG PHIẾU NHẬP KHO (BILLS - PVT)
// -------------------------------------------------------------
const showBillModal = ref(false)
const editingBill = ref(null)

const billForm = useForm({
  supplier_id: null,
  bill_date: new Date().toISOString().split('T')[0],
  cost_group_id: null,
  notes: '',
  items: [
    { material_id: null, quantity: 1, unit_price: 0 }
  ]
})

const billTotal = computed(() => {
  return billForm.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
})

const addBillItem = () => {
  billForm.items.push({ material_id: null, quantity: 1, unit_price: 0 })
}

const removeBillItem = (idx) => {
  if (billForm.items.length > 1) {
    billForm.items.splice(idx, 1)
  }
}

const onMaterialChange = (val, idx) => {
  const mat = props.inventory.find(item => item.material_id === val)
  if (mat) {
    billForm.items[idx].unit_price = mat.unit_price
  }
}

const openCreateBillModal = () => {
  editingBill.value = null
  billForm.reset()
  billForm.items = [{ material_id: null, quantity: 1, unit_price: 0 }]
  showBillModal.value = true
}

const openEditBillModal = (bill) => {
  editingBill.value = bill
  billForm.supplier_id = bill.supplier_id
  billForm.bill_date = bill.bill_date
  billForm.cost_group_id = bill.cost_group_id
  billForm.notes = bill.notes || ''
  billForm.items = bill.items.map(item => ({
    material_id: item.material_id,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price)
  }))
  showBillModal.value = true
}

const closeBillModal = () => {
  showBillModal.value = false
  editingBill.value = null
  billForm.reset()
}

const handleBillSubmit = () => {
  if (editingBill.value) {
    billForm.put(`/warehouse-inventory/bills/${editingBill.value.id}`, {
      onSuccess: () => closeBillModal()
    })
  } else {
    billForm.post('/warehouse-inventory/bills', {
      onSuccess: () => closeBillModal()
    })
  }
}

// Bill Actions
const submitBill = (bill) => {
  router.post(`/warehouse-inventory/bills/${bill.id}/submit`)
}

const approveBillManagement = (bill) => {
  router.post(`/warehouse-inventory/bills/${bill.id}/approve-management`)
}

const approveBillAccountant = (bill) => {
  router.post(`/warehouse-inventory/bills/${bill.id}/approve-accountant`)
}

const deleteBill = (bill) => {
  router.delete(`/warehouse-inventory/bills/${bill.id}`)
}

const revertBill = (bill) => {
  router.post(`/warehouse-inventory/bills/${bill.id}/revert`)
}

const canRevert = (bill) => {
  return ['pending_management', 'pending_accountant', 'approved'].includes(bill.status)
}

// Reject Bill Modal
const showRejectModal = ref(false)
const rejectingBill = ref(null)
const rejectReason = ref('')

const openRejectBillModal = (bill) => {
  rejectingBill.value = bill
  rejectReason.value = ''
  showRejectModal.value = true
  showDetailModal.value = false // Tự đóng modal chi tiết khi mở modal lý do từ chối
}

const closeRejectBillModal = () => {
  showRejectModal.value = false
  rejectingBill.value = null
  rejectReason.value = ''
}

const submitRejectBill = () => {
  if (!rejectReason.value) return
  router.post(`/warehouse-inventory/bills/${rejectingBill.value.id}/reject`, {
    reason: rejectReason.value
  }, {
    onSuccess: () => closeRejectBillModal()
  })
}

// -------------------------------------------------------------
// CHI TIẾT PHIẾU NHẬP (PVT DETAIL)
// -------------------------------------------------------------
const showDetailModal = ref(false)
const selectedBill = ref(null)

const accountantFiles = ref([])
const submittingAccountantApproval = ref(false)

const handleAccountantFileChange = (e) => {
  accountantFiles.value = Array.from(e.target.files || [])
}

const approveBillManagementDirect = (bill) => {
  router.post(`/warehouse-inventory/bills/${bill.id}/approve-management`, {}, {
    onSuccess: () => {
      showDetailModal.value = false
    }
  })
}

const submitAccountantApproveDirect = (bill) => {
  submittingAccountantApproval.value = true
  router.post(`/warehouse-inventory/bills/${bill.id}/approve-accountant`, {
    files: accountantFiles.value
  }, {
    forceFormData: true,
    onSuccess: () => {
      showDetailModal.value = false
      accountantFiles.value = []
    },
    onFinish: () => {
      submittingAccountantApproval.value = false
    }
  })
}

const viewBillDetails = (bill) => {
  selectedBill.value = bill
  showDetailModal.value = true
}

// File Preview
const showPreviewModal = ref(false)
const previewFile = ref(null)

const isImageFile = (file) => {
  if (!file) return false
  const ext = (file.file_name || '').toLowerCase()
  return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.gif') || ext.endsWith('.webp')
}

const isPdfFile = (file) => {
  if (!file) return false
  const ext = (file.file_name || '').toLowerCase()
  return ext.endsWith('.pdf')
}

const openFilePreview = (file) => {
  previewFile.value = file
  showPreviewModal.value = true
}

const closeFilePreview = () => {
  showPreviewModal.value = false
  previewFile.value = null
}
</script>

<style scoped>
.crm-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
.crm-content-card { background: white; border-radius: 16px; border: 1px solid #E8ECF1; overflow: hidden; }
.crm-table :deep(.ant-table-thead > tr > th) { background: #FAFBFC; font-weight: 600; font-size: 13px; color: #5D6B82; }
.crm-modal :deep(.ant-modal-content) { border-radius: 16px; overflow: hidden; }
.crm-modal :deep(.ant-modal-header) { padding: 20px 24px; border-bottom: 1px solid #F3F5F7; }
.crm-modal :deep(.ant-modal-footer) { padding: 16px 24px; border-top: 1px solid #F3F5F7; }
.crm-modal :deep(.ant-modal-title) { font-weight: 700 !important; font-size: 18px !important; }
</style>
