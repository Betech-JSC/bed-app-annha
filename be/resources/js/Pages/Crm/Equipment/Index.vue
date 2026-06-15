<template>
  <Head title="Kho thiết bị" />

  <PageHeader title="Kho thiết bị" subtitle="Quản lý mua sắm, tồn kho và theo dõi tình trạng sử dụng">
    <template #actions>
      <a-button v-if="filters.tab === 'catalog'" type="primary" size="large" @click="openCreateCatalogModal">
        <template #icon><PlusOutlined /></template>
        Thêm thiết bị mẫu
      </a-button>
      <a-button v-else type="primary" size="large" @click="openCreateModal">
        <template #icon><PlusOutlined /></template>
        Tạo tài sản
      </a-button>
    </template>
  </PageHeader>

  <div class="crm-stats-grid">
    <StatCard label="Tổng tài sản" :value="stats.total" icon="ToolOutlined" variant="primary" />
    <StatCard label="Nháp / Chờ duyệt" :value="stats.draft + stats.pending" icon="ClockCircleOutlined" variant="warning" />
    <StatCard label="Trong kho" :value="stats.available" icon="CheckCircleOutlined" variant="success" />
    <StatCard label="Đang sử dụng" :value="stats.in_use" icon="ThunderboltOutlined" variant="primary" />
  </div>

  <div class="crm-content-card">
    <!-- Tabs Header -->
    <a-tabs v-model:activeKey="filters.tab" @change="handleTabChange" class="px-4 pt-2 border-b border-gray-100" :tabBarGutter="32">
      <a-tab-pane key="approvals" tab="Phiếu duyệt mua" />
      <a-tab-pane key="assets" tab="Danh sách tài sản" />
      <a-tab-pane key="catalog" tab="Danh mục thiết bị" />
    </a-tabs>

    <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-4 flex-wrap bg-gray-50/30">
      <a-input-search v-model:value="filters.search" placeholder="Tìm thiết bị..." class="max-w-xs" allow-clear @search="applyFilters" @change="debounceSearch" />
      <a-select v-if="filters.tab !== 'catalog'" v-model:value="filters.status" placeholder="Tất cả trạng thái" allow-clear style="width: 180px" @change="applyFilters">
        <template v-if="filters.tab === 'approvals'">
          <a-select-option value="draft">Nháp</a-select-option>
          <a-select-option value="pending_management">Chờ BĐH</a-select-option>
          <a-select-option value="pending_accountant">Chờ KT</a-select-option>
          <a-select-option value="rejected">Từ chối</a-select-option>
        </template>
        <template v-else>
          <a-select-option value="available">Trong kho</a-select-option>
          <a-select-option value="in_use">Đang sử dụng</a-select-option>
          <a-select-option value="maintenance">Bảo trì</a-select-option>
          <a-select-option value="retired">Thanh lý</a-select-option>
        </template>
      </a-select>
    </div>

    <a-table :columns="columns" :data-source="equipment.data" :pagination="{ current: equipment.current_page, total: equipment.total, pageSize: equipment.per_page, showTotal: (t) => filters.tab === 'catalog' ? `${t} thiết bị mẫu` : `${t} tài sản` }" :loading="loading" row-key="id" size="small" class="crm-table" @change="handleTableChange">
      <template #bodyCell="{ column, record }">
        <!-- Catalog Columns -->
        <template v-if="column.key === 'catalog_code'">
          <span class="font-mono text-xs text-gray-600 font-semibold">{{ record.code || 'NO-CODE' }}</span>
        </template>
        <template v-else-if="column.key === 'catalog_name'">
          <div class="font-bold text-gray-800 hover:text-blue-600 cursor-pointer" @click="openEditCatalogModal(record)">
            {{ record.name }}
          </div>
        </template>
        <template v-else-if="column.key === 'catalog_category'">
          <a-tag color="blue" class="rounded-lg border-none bg-blue-50 text-blue-600 font-medium px-2 py-0.5 text-[11px]">{{ categoryLabels[record.category] || record.category || 'Chưa phân loại' }}</a-tag>
        </template>
        <template v-else-if="column.key === 'catalog_price'">
          <div class="text-right font-semibold text-gray-700">
            {{ formatCurrency(record.unit_price) }}
          </div>
        </template>
        <template v-else-if="column.key === 'catalog_actions'">
          <div class="flex justify-center gap-2">
            <a-button type="text" size="small" class="hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg" @click="openEditCatalogModal(record)">
              <EditOutlined />
            </a-button>
            <a-popconfirm title="Xóa thiết bị mẫu này?" @confirm="deleteCatalogItem(record.id)">
              <a-button type="text" danger size="small" class="hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg">
                <DeleteOutlined />
              </a-button>
            </a-popconfirm>
          </div>
        </template>

        <!-- Equipment Columns -->
        <template v-else-if="column.key === 'name'">
          <div class="flex items-center gap-3 cursor-pointer" @click="openDetail(record)">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg shadow-sm" :style="{ background: categoryGradients[record.category] || '#9CA3AF' }">
              {{ categoryIcons[record.category] || '📦' }}
            </div>
            <div>
              <div class="font-bold text-gray-800 hover:text-blue-600 transition-colors">{{ record.name }}</div>
              <div class="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{{ record.code || 'NO-CODE' }} {{ record.serial_number ? `• SN: ${record.serial_number}` : '' }}</div>
            </div>
          </div>
        </template>
        <template v-else-if="column.key === 'category'">
          <a-tag color="blue" class="rounded-lg border-none bg-blue-50 text-blue-600 font-medium px-2 py-0.5 text-[11px]">{{ categoryLabels[record.category] || record.category || 'Chưa phân loại' }}</a-tag>
        </template>
        <template v-else-if="column.key === 'qty_price'">
          <div class="text-right">
            <div class="font-bold text-gray-700">{{ record.quantity || 1 }} <span class="text-[10px] text-gray-400 font-normal uppercase">{{ record.unit || 'cái' }}</span></div>
            <div class="text-[11px] text-gray-400">{{ formatCurrency(record.purchase_price) }}/đv</div>
          </div>
        </template>
        <template v-else-if="column.key === 'total'">
          <div class="text-right">
            <span class="font-extra-bold text-emerald-600 text-sm">{{ formatCurrency((record.quantity || 1) * (record.purchase_price || 0)) }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'status'">
          <div class="flex justify-center">
            <a-tag :color="statusColors[record.status]" class="rounded-full px-3 py-0.5 text-[11px] font-bold border-none">
              {{ statusLabels[record.status] || record.status }}
            </a-tag>
          </div>
        </template>
        <template v-else-if="column.key === 'creator'">
          <div class="flex flex-col items-center">
            <a-avatar :size="20" class="bg-indigo-50 text-indigo-500 mb-0.5" style="border: 1px solid #E0E7FF">
              {{ record.creator?.name?.charAt(0) || '?' }}
            </a-avatar>
            <span class="text-[10px] text-gray-500">{{ record.creator?.name || '—' }}</span>
          </div>
        </template>
        <template v-else-if="column.key === 'actions'">
          <div class="flex justify-center">
            <a-button type="text" size="small" class="hover:bg-blue-50 text-gray-400 hover:text-blue-600 rounded-lg" @click="openDetail(record)">
              <EyeOutlined />
            </a-button>
          </div>
        </template>
      </template>
    </a-table>
  </div>

  <!-- CREATE/EDIT MODAL -->
  <a-modal v-model:open="showModal" :title="editing ? 'Chỉnh sửa tài sản' : 'Tạo tài sản mới'" :width="680" @ok="handleSubmit" @cancel="resetForm" ok-text="Lưu" cancel-text="Hủy" class="crm-modal" centered destroy-on-close :confirm-loading="form.processing">
    <a-form layout="vertical" class="mt-4">
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="Thiết bị mẫu">
            <a-select
              v-model:value="form.global_equipment_id"
              show-search
              placeholder="Chọn thiết bị mẫu..."
              option-filter-prop="label"
              size="large"
              allow-clear
              @change="handleGlobalEquipmentChange"
            >
              <a-select-option v-for="ge in props.globalEquipments" :key="ge.id" :value="ge.id" :label="ge.name">
                {{ ge.name }} <span class="text-gray-400 font-mono text-xs">({{ ge.code }})</span>
              </a-select-option>
            </a-select>
            <span class="text-red-500 text-xs" v-if="form.errors.global_equipment_id">{{ form.errors.global_equipment_id }}</span>
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="Mã tài sản">
            <a-input v-model:value="form.code" size="large" placeholder="Tự sinh nếu trống" />
            <span class="text-red-500 text-xs" v-if="form.errors.code">{{ form.errors.code }}</span>
          </a-form-item>
        </a-col>
        <a-col :span="6">
          <a-form-item label="Đơn vị tính">
            <a-input v-model:value="form.unit" size="large" placeholder="VD: cái, bộ" />
            <span class="text-red-500 text-xs" v-if="form.errors.unit">{{ form.errors.unit }}</span>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="24">
          <a-form-item label="Tên tài sản" required>
            <a-input v-model:value="form.name" size="large" placeholder="VD: Máy xúc Komatsu PC200" />
            <span class="text-red-500 text-xs" v-if="form.errors.name">{{ form.errors.name }}</span>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="Loại">
            <a-select v-model:value="form.category" style="width: 100%;" size="large" placeholder="Chọn loại...">
              <a-select-option v-for="(label, val) in categoryLabels" :key="val" :value="val">
                {{ label }}
              </a-select-option>
            </a-select>
            <span class="text-red-500 text-xs" v-if="form.errors.category">{{ form.errors.category }}</span>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Hãng">
            <a-input v-model:value="form.brand" size="large" />
            <span class="text-red-500 text-xs" v-if="form.errors.brand">{{ form.errors.brand }}</span>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Model">
            <a-input v-model:value="form.model" size="large" />
            <span class="text-red-500 text-xs" v-if="form.errors.model">{{ form.errors.model }}</span>
          </a-form-item>
        </a-col>
      </a-row>
      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="Số lượng">
            <a-input-number v-model:value="form.quantity" :min="1" class="w-full" size="large" />
            <span class="text-red-500 text-xs" v-if="form.errors.quantity">{{ form.errors.quantity }}</span>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Đơn giá (VND)">
            <a-input-number v-model:value="form.purchase_price" :min="0" class="w-full" size="large"
              :formatter="(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
              :parser="v => v.replace(/,/g, '')" />
            <span class="text-red-500 text-xs" v-if="form.errors.purchase_price">{{ form.errors.purchase_price }}</span>
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="Thành tiền">
            <div class="h-10 flex items-center font-bold text-emerald-600 text-lg">
              {{ formatCurrency((form.quantity || 1) * (form.purchase_price || 0)) }}
            </div>
          </a-form-item>
        </a-col>
      </a-row>
      <a-form-item label="Chứng từ (Hóa đơn, Hợp đồng...)">
        <a-upload
          :file-list="fileList" 
          :before-upload="beforeUpload"
          @remove="handleRemoveFile"
          multiple
        >
          <a-button><UploadOutlined /> Chọn tệp</a-button>
        </a-upload>
      </a-form-item>
      <a-form-item label="Ghi chú"><a-textarea v-model:value="form.notes" :rows="2" /></a-form-item>
    </a-form>
  </a-modal>

  <!-- CATALOG CREATE/EDIT MODAL -->
  <a-modal v-model:open="showCatalogModal" :title="editingCatalog ? 'Chỉnh sửa thiết bị mẫu' : 'Thêm thiết bị mẫu'" :width="600" @ok="handleCatalogSubmit" @cancel="resetCatalogForm" ok-text="Lưu" cancel-text="Hủy" class="crm-modal" centered :confirm-loading="catalogForm.processing">
    <div class="space-y-4 mt-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tên thiết bị mẫu <span class="text-red-500">*</span></label>
        <a-input v-model:value="catalogForm.name" size="large" placeholder="VD: Máy xúc Komatsu PC200" />
        <span class="text-red-500 text-xs" v-if="catalogForm.errors.name">{{ catalogForm.errors.name }}</span>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mã thiết bị mẫu (Tự sinh nếu trống)</label>
          <a-input v-model:value="catalogForm.code" size="large" placeholder="VD: TB-0001" />
          <span class="text-red-500 text-xs" v-if="catalogForm.errors.code">{{ catalogForm.errors.code }}</span>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Loại thiết bị</label>
          <a-select v-model:value="catalogForm.category" style="width: 100%;" size="large" placeholder="Chọn loại...">
            <a-select-option v-for="(label, val) in categoryLabels" :key="val" :value="val">
              {{ label }}
            </a-select-option>
          </a-select>
          <span class="text-red-500 text-xs" v-if="catalogForm.errors.category">{{ catalogForm.errors.category }}</span>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Hãng</label>
          <a-input v-model:value="catalogForm.brand" size="large" placeholder="VD: Komatsu" />
          <span class="text-red-500 text-xs" v-if="catalogForm.errors.brand">{{ catalogForm.errors.brand }}</span>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <a-input v-model:value="catalogForm.model" size="large" placeholder="VD: PC200" />
          <span class="text-red-500 text-xs" v-if="catalogForm.errors.model">{{ catalogForm.errors.model }}</span>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
          <a-input v-model:value="catalogForm.unit" size="large" placeholder="VD: cái, bộ" />
          <span class="text-red-500 text-xs" v-if="catalogForm.errors.unit">{{ catalogForm.errors.unit }}</span>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Đơn giá định biên (VND)</label>
        <a-input-number v-model:value="catalogForm.unit_price" :min="0" style="width: 100%;" size="large"
          :formatter="v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
          :parser="v => v.replace(/,/g, '')" />
        <span class="text-red-500 text-xs" v-if="catalogForm.errors.unit_price">{{ catalogForm.errors.unit_price }}</span>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
        <a-textarea v-model:value="catalogForm.description" :rows="3" placeholder="Thông tin chi tiết thiết bị mẫu..." />
        <span class="text-red-500 text-xs" v-if="catalogForm.errors.description">{{ catalogForm.errors.description }}</span>
      </div>
    </div>
  </a-modal>

  <!-- DETAIL DRAWER -->
  <a-drawer v-model:open="showDetailDrawer" title="Chi tiết Tài sản" :width="560" @close="selectedItem = null" destroy-on-close class="crm-drawer">
    <div v-if="selectedItem" class="space-y-6 pb-24">
      <!-- Header -->
      <div class="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-100">🏗️</div>
          <div>
            <div class="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Mã: {{ selectedItem.code || `#${selectedItem.id}` }}</div>
            <div class="text-lg font-bold text-gray-800">{{ selectedItem.name }}</div>
          </div>
        </div>
        <a-tag :color="statusColors[selectedItem.status]" class="rounded-full px-4 py-1 text-xs font-semibold">{{ statusLabels[selectedItem.status] || selectedItem.status }}</a-tag>
      </div>

      <!-- Rejection reason -->
      <div v-if="selectedItem.status === 'rejected' && selectedItem.rejection_reason" class="p-4 bg-red-50 rounded-2xl border border-red-100">
        <div class="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Lý do từ chối</div>
        <div class="text-sm text-red-700">{{ selectedItem.rejection_reason }}</div>
      </div>

      <!-- Info -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-blue-500"><InfoCircleOutlined /> Thông tin tài sản</div>
        <div class="grid grid-cols-1 gap-1 text-sm">
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50"><span class="text-gray-400">Loại</span><span class="font-semibold">{{ selectedItem.category || '—' }}</span></div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50"><span class="text-gray-400">Hãng / Model</span><span class="font-semibold">{{ [selectedItem.brand, selectedItem.model].filter(Boolean).join(' / ') || '—' }}</span></div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50"><span class="text-gray-400">Số lượng</span><span class="font-semibold">{{ selectedItem.quantity || 1 }}</span></div>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-50"><span class="text-gray-400">Đơn giá</span><span class="font-semibold">{{ formatCurrency(selectedItem.purchase_price) }}</span></div>
          <div class="flex justify-between items-center py-2.5"><span class="text-gray-400">Thành tiền</span><span class="font-bold text-emerald-600 text-lg">{{ formatCurrency((selectedItem.quantity || 1) * (selectedItem.purchase_price || 0)) }}</span></div>
        </div>
      </div>

      <!-- Approval stepper -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-indigo-500"><SafetyCertificateOutlined /> Luồng duyệt</div>
        <a-steps :current="stepperCurrent(selectedItem)" size="small" class="mb-2" direction="vertical">
          <a-step title="Người lập tạo" :description="selectedItem.creator?.name || '—'" />
          <a-step title="BĐH duyệt" :description="selectedItem.approver ? `${selectedItem.approver.name} — ${fmtDate(selectedItem.approved_at)}` : 'Chờ duyệt'" />
          <a-step title="KT xác nhận chi & nhập kho" :description="selectedItem.confirmer ? `${selectedItem.confirmer.name} — ${fmtDate(selectedItem.confirmed_at)}` : 'Chờ xác nhận'" />
        </a-steps>
      </div>

      <!-- Attachments -->
      <div class="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 text-gray-400"><FileOutlined /> Chứng từ đính kèm ({{ selectedItem.attachments?.length || 0 }})</div>
        <div v-if="selectedItem.attachments?.length" class="space-y-2">
          <!-- Image previews -->
          <div v-if="imageAttachments.length" class="grid grid-cols-3 gap-2 mb-3">
            <div v-for="file in imageAttachments" :key="file.id" class="relative group cursor-pointer rounded-xl overflow-hidden border border-gray-100 aspect-square" @click="previewImage(file)">
              <img :src="`/storage/${file.file_path}`" :alt="file.original_name" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <EyeOutlined class="text-white text-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </div>
          <!-- Non-image files -->
          <a v-for="file in nonImageAttachments" :key="file.id" :href="`/storage/${file.file_path}`" target="_blank" class="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 group hover:border-blue-200 transition-colors cursor-pointer">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg flex items-center justify-center text-lg bg-blue-50 text-blue-500">
                <FileOutlined />
              </div>
              <div>
                <div class="text-xs font-medium text-gray-700 truncate max-w-[260px]">{{ file.original_name }}</div>
              </div>
            </div>
            <DownloadOutlined class="text-gray-300 group-hover:text-blue-500 transition-colors" />
          </a>
        </div>
        <a-empty v-else :image="null" description="Không có chứng từ" class="my-0" />
      </div>

      <!-- Image Preview Modal -->
      <a-modal v-model:open="imagePreviewVisible" :footer="null" :width="720" centered destroy-on-close>
        <img v-if="imagePreviewUrl" :src="imagePreviewUrl" style="width: 100%; border-radius: 12px;" />
      </a-modal>

      <!-- Fixed action bar -->
      <div class="fixed bottom-0 right-0 w-[560px] p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 flex justify-between items-center z-20">
        <div>
          <a-popconfirm v-if="selectedItem.status === 'draft'" title="Xóa tài sản này?" @confirm="deleteItem(selectedItem); showDetailDrawer = false">
            <a-button danger size="small"><DeleteOutlined /> Xóa</a-button>
          </a-popconfirm>
        </div>
        <div class="flex gap-2">
          <a-button @click="showDetailDrawer = false">Đóng</a-button>
          <a-button v-if="selectedItem.status === 'draft'" @click="openEditModal(selectedItem)"><EditOutlined /> Sửa</a-button>
          <a-button v-if="selectedItem.status === 'draft'" type="primary" @click="submitItem(selectedItem)"><SendOutlined /> Gửi duyệt</a-button>
          <a-button v-if="selectedItem.status === 'pending_management' && can('equipment.approve')" type="primary" class="!bg-green-500 !border-green-500 hover:!bg-green-600" @click="approveItem(selectedItem)"><CheckCircleOutlined /> BĐH Duyệt</a-button>
          <a-button v-if="selectedItem.status === 'pending_accountant' && can('cost.approve.accountant')" type="primary" @click="confirmItem(selectedItem)"><CheckSquareOutlined /> KT Xác nhận & Nhập kho</a-button>
          <a-popconfirm v-if="['pending_management','pending_accountant'].includes(selectedItem.status)" title="Từ chối tài sản này?" @confirm="rejectItem(selectedItem)">
            <template #description>
              <a-input v-model:value="rejectReason" placeholder="Nhập lý do từ chối..." class="mt-2" />
            </template>
            <a-button danger>Từ chối</a-button>
          </a-popconfirm>
          <a-button v-if="['pending_management', 'pending_accountant', 'rejected'].includes(selectedItem.status) && can('equipment.revert')" danger ghost @click="revertItem(selectedItem)">Hoàn duyệt</a-button>
        </div>
      </div>
    </div>
  </a-drawer>

  <!-- Accountant Confirm Equipment Modal with mandatory file upload -->
  <a-modal v-model:open="showConfirmEquipmentModal" title="Kế toán xác nhận chi & Nhập kho" @ok="confirmApproveEquipment" ok-text="Xác nhận" cancel-text="Hủy" centered class="crm-modal" :ok-button-props="{ disabled: !confirmEquipmentFiles.length || confirmEquipmentLoading }" :confirm-loading="confirmEquipmentLoading">
    <div class="p-4 space-y-4">
      <div class="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg"><InfoCircleOutlined /></div>
        <div class="text-[11px] text-blue-700 leading-tight">
          Vui lòng kiểm tra chứng từ mua thiết bị trước khi đính kèm Biên lai chuyển tiền / Ủy nhiệm chi để xác nhận chi & nhập kho thiết bị.
        </div>
      </div>

      <div v-if="confirmEquipmentTarget" class="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs">
         <div class="flex justify-between">
            <span class="text-gray-400">Thiết bị:</span>
            <span class="font-bold text-gray-700">{{ confirmEquipmentTarget.name }}</span>
         </div>
         <div class="flex justify-between mt-1">
            <span class="text-gray-400">Mã tài sản:</span>
            <span class="font-medium text-gray-700">{{ confirmEquipmentTarget.code || 'NO-CODE' }}</span>
         </div>
         <div class="flex justify-between mt-1">
            <span class="text-gray-400">Số lượng:</span>
            <span class="font-bold text-gray-700">{{ confirmEquipmentTarget.quantity || 1 }} {{ confirmEquipmentTarget.unit || 'cái' }}</span>
         </div>
         <div class="flex justify-between mt-1">
            <span class="text-gray-400">Thành tiền:</span>
            <span class="font-bold text-red-600">{{ formatCurrency((confirmEquipmentTarget.quantity || 1) * (confirmEquipmentTarget.purchase_price || 0)) }}</span>
         </div>
      </div>

      <!-- Existing attachments uploaded by creator -->
      <div v-if="confirmEquipmentTarget?.attachments?.filter(att => att.description !== 'after')?.length" class="border border-dashed border-gray-200 rounded-xl p-3 bg-gray-50/50">
        <div class="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
          <PaperClipOutlined class="text-gray-400" /> Tệp chứng từ gốc ({{ confirmEquipmentTarget.attachments.filter(att => att.description !== 'after').length }})
        </div>
        <div class="space-y-1.5 max-h-[120px] overflow-y-auto">
          <div v-for="att in confirmEquipmentTarget.attachments.filter(att => att.description !== 'after')" :key="att.id" 
               class="flex items-center justify-between p-2 rounded-lg border border-gray-100 bg-white hover:border-blue-300 transition-all cursor-pointer shadow-sm group"
               @click="window.open(att.file_url || `/storage/${att.file_path}`, '_blank')">
            <div class="flex items-center gap-2 min-w-0">
               <FileOutlined class="text-gray-400 text-xs" />
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
              @change="e => confirmEquipmentFiles = [...(e.target.files || [])]" 
              class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            <div class="flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-blue-100 rounded-xl group-hover:border-blue-400 group-hover:bg-blue-50 transition-all">
              <UploadOutlined class="text-blue-400 group-hover:text-blue-600" />
              <span class="text-xs font-semibold text-blue-500 group-hover:text-blue-700">
                {{ confirmEquipmentFiles.length ? 'Thay đổi tệp đã chọn' : 'Chọn tệp chứng từ thanh toán' }}
              </span>
            </div>
          </div>

          <!-- File List -->
          <div v-if="confirmEquipmentFiles.length" class="space-y-1.5 mt-1">
            <div v-for="(file, idx) in confirmEquipmentFiles" :key="idx" class="flex items-center justify-between p-2 bg-blue-50/50 rounded-lg border border-blue-100/50">
              <div class="flex items-center gap-2 min-w-0">
                <PaperClipOutlined class="text-blue-400 text-xs" />
                <span class="text-[10px] font-medium text-blue-700 truncate max-w-[280px]">{{ file.name }}</span>
                <span class="text-[9px] text-gray-400">({{ formatFileSize(file.size) }})</span>
              </div>
              <a-button type="text" size="small" @click="confirmEquipmentFiles.splice(idx, 1)" class="h-5 w-5 p-0 flex items-center justify-center">
                <CloseOutlined class="text-[10px] text-gray-400 hover:text-red-500" />
              </a-button>
            </div>
          </div>
          <div class="text-[10px] text-red-500 pl-1 mt-1 font-medium flex items-center gap-1" v-else>
            <span class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            * Vui lòng đính kèm chứng từ chuyển khoản để hoàn tất xác nhận.
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Head, useForm, router, usePage } from '@inertiajs/vue3'
import CrmLayout from '@/Layouts/CrmLayout.vue'
import PageHeader from '@/Components/Crm/PageHeader.vue'
import StatCard from '@/Components/Crm/StatCard.vue'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UploadOutlined, SendOutlined, CheckCircleOutlined, CheckSquareOutlined, InfoCircleOutlined, SafetyCertificateOutlined, FileOutlined, DownloadOutlined, CloseOutlined, PaperClipOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'

defineOptions({ layout: CrmLayout })
const props = defineProps({ equipment: Object, stats: Object, filters: Object, globalEquipments: Array })

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const id = urlParams.get('id')
  if (id) {
    const item = props.equipment.data.find(e => e.id == id)
    if (item) {
      openDetail(item)
    }
  }
})

// Permission helper
const can = (perm) => {
  const user = usePage().props.auth?.user
  if (user?.super_admin) return true
  return user?.permissions?.includes(perm) || user?.permissions?.includes('*') || false
}

const loading = ref(false)
const showModal = ref(false)
const showDetailDrawer = ref(false)
const editing = ref(null)
const selectedItem = ref(null)
const showConfirmEquipmentModal = ref(false)
const confirmEquipmentTarget = ref(null)
const confirmEquipmentFiles = ref([])
const confirmEquipmentLoading = ref(false)
const rejectReason = ref('')
const fileList = ref([])
const imagePreviewVisible = ref(false)
const imagePreviewUrl = ref('')
const filters = ref({ 
  search: props.filters?.search || '', 
  status: props.filters?.status || undefined,
  tab: props.filters?.tab || 'approvals' 
})

const columns = computed(() => {
  if (filters.value.tab === 'catalog') {
    return [
      { title: 'Mã thiết bị', key: 'catalog_code', dataIndex: 'code', width: 120 },
      { title: 'Tên thiết bị', key: 'catalog_name', dataIndex: 'name', width: 220 },
      { title: 'Loại', key: 'catalog_category', dataIndex: 'category', width: 120 },
      { title: 'Hãng', dataIndex: 'brand', width: 120 },
      { title: 'Model', dataIndex: 'model', width: 120 },
      { title: 'Đơn vị', dataIndex: 'unit', width: 100 },
      { title: 'Đơn giá định biên', key: 'catalog_price', align: 'right', width: 150 },
      { title: 'Thao tác', key: 'catalog_actions', width: 100, align: 'center' },
    ]
  }
  return [
    { title: 'Tài sản', key: 'name', width: 260 },
    { title: 'Loại', key: 'category', dataIndex: 'category', width: 100 },
    { title: 'SL × Đơn giá', key: 'qty_price', align: 'right', width: 140 },
    { title: 'Thành tiền', key: 'total', align: 'right', width: 150 },
    { title: 'Trạng thái', key: 'status', width: 140, align: 'center' },
    { title: 'Người lập', key: 'creator', width: 130 },
    { title: '', key: 'actions', width: 60, align: 'center' },
  ]
})

const statusLabels = {
  draft: 'Nháp', pending_management: 'Chờ BĐH', pending_accountant: 'Chờ KT',
  available: 'Trong kho', in_use: 'Đang dùng', maintenance: 'Bảo trì',
  retired: 'Thanh lý', rejected: 'Từ chối',
}
const statusColors = {
  draft: 'default', pending_management: 'orange', pending_accountant: 'blue',
  available: 'green', in_use: 'geekblue', maintenance: 'volcano',
  retired: 'default', rejected: 'red',
}
const categoryLabels = { computer: 'Máy tính / CNTT', machinery: 'Máy móc thi công', vehicle: 'Xe công ty', furniture: 'Nội thất VP', other: 'Khác' }
const categoryIcons = { computer: '💻', machinery: '🏗️', vehicle: '🚗', furniture: '🪑', other: '📦' }
const categoryGradients = { computer: 'linear-gradient(135deg, #2E86C1, #1B4F72)', machinery: 'linear-gradient(135deg, #E67E22, #D68910)', vehicle: 'linear-gradient(135deg, #1D8348, #27AE60)', furniture: 'linear-gradient(135deg, #8E44AD, #6C3483)', other: 'linear-gradient(135deg, #9CA3AF, #6B7280)' }

const stepperCurrent = (item) => {
  const map = { draft: 0, rejected: 0, pending_management: 1, pending_accountant: 2, available: 3, in_use: 3 }
  return map[item.status] ?? 0
}

let searchTimeout = null
const debounceSearch = () => { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => applyFilters(), 400) }
const applyFilters = () => { loading.value = true; router.get('/equipment', { search: filters.value.search || undefined, status: filters.value.status || undefined, tab: filters.value.tab }, { preserveState: true, replace: true, onFinish: () => loading.value = false }) }
const handleTableChange = (p) => { loading.value = true; router.get('/equipment', { page: p.current, ...filters.value }, { preserveState: true, replace: true, onFinish: () => loading.value = false }) }
const handleTabChange = () => {
  filters.value.status = undefined; // Reset status filter when switching tabs
  applyFilters();
}

// Equipment Form Setup
const form = useForm({
  global_equipment_id: null,
  name: '',
  code: '',
  category: undefined,
  brand: '',
  model: '',
  quantity: 1,
  purchase_price: null,
  unit: 'cái',
  notes: ''
})

const handleGlobalEquipmentChange = (val) => {
  if (!val) return
  const selected = props.globalEquipments.find(ge => ge.id === val)
  if (selected) {
    form.name = selected.name
    form.category = selected.category || undefined
    form.brand = selected.brand || ''
    form.model = selected.model || ''
    form.unit = selected.unit || 'cái'
    form.purchase_price = selected.unit_price
  }
}

const openCreateModal = () => {
  editing.value = null
  form.reset()
  form.clearErrors()
  fileList.value = []
  showModal.value = true
}

const openEditModal = (e) => {
  editing.value = e
  form.clearErrors()
  Object.assign(form, {
    global_equipment_id: e.global_equipment_id || null,
    name: e.name,
    code: e.code || '',
    category: e.category || undefined,
    brand: e.brand || '',
    model: e.model || '',
    quantity: e.quantity || 1,
    purchase_price: e.purchase_price,
    unit: e.unit || 'cái',
    notes: e.notes || ''
  })
  fileList.value = []
  showDetailDrawer.value = false
  showModal.value = true
}

const beforeUpload = (file) => {
  fileList.value = [...fileList.value, file]
  return false // prevent auto upload
}
const handleRemoveFile = (file) => {
  fileList.value = fileList.value.filter(f => f.uid !== file.uid)
}

const handleSubmit = () => {
  form.clearErrors()
  if (editing.value) {
    form.transform((data) => ({
      ...data,
      _method: 'PUT',
      attachments: fileList.value
    })).post(`/equipment/${editing.value.id}`, {
      forceFormData: true,
      onSuccess: () => {
        showModal.value = false
        resetForm()
        message.success('Đã cập nhật tài sản.')
      },
      onError: () => {
        message.error('Vui lòng kiểm tra lại thông tin trên Form.')
      }
    })
  } else {
    form.transform((data) => ({
      ...data,
      attachments: fileList.value
    })).post('/equipment', {
      forceFormData: true,
      onSuccess: () => {
        showModal.value = false
        resetForm()
        message.success('Đã tạo tài sản nháp.')
      },
      onError: () => {
        message.error('Vui lòng kiểm tra lại thông tin trên Form.')
      }
    })
  }
}

const resetForm = () => { editing.value = null; form.reset(); form.clearErrors(); fileList.value = [] }

// Catalog (Thiết bị mẫu) setup
const showCatalogModal = ref(false)
const editingCatalog = ref(null)
const catalogForm = useForm({
  name: '',
  code: '',
  category: undefined,
  brand: '',
  model: '',
  unit: 'cái',
  unit_price: null,
  description: ''
})

const openCreateCatalogModal = () => {
  editingCatalog.value = null
  catalogForm.reset()
  catalogForm.clearErrors()
  showCatalogModal.value = true
}

const openEditCatalogModal = (item) => {
  editingCatalog.value = item
  catalogForm.clearErrors()
  Object.assign(catalogForm, {
    name: item.name,
    code: item.code || '',
    category: item.category || undefined,
    brand: item.brand || '',
    model: item.model || '',
    unit: item.unit || 'cái',
    unit_price: item.unit_price,
    description: item.description || ''
  })
  showCatalogModal.value = true
}

const handleCatalogSubmit = () => {
  catalogForm.clearErrors()
  if (editingCatalog.value) {
    catalogForm.transform((data) => ({
      ...data,
      _method: 'PUT'
    })).post(`/equipment/catalog/${editingCatalog.value.id}`, {
      onSuccess: () => {
        showCatalogModal.value = false
        resetCatalogForm()
        message.success('Đã cập nhật thiết bị mẫu.')
      },
      onError: () => {
        message.error('Vui lòng kiểm tra lại thông tin trên Form.')
      }
    })
  } else {
    catalogForm.post('/equipment/catalog', {
      onSuccess: () => {
        showCatalogModal.value = false
        resetCatalogForm()
        message.success('Đã thêm thiết bị mẫu vào danh mục.')
      },
      onError: () => {
        message.error('Vui lòng kiểm tra lại thông tin trên Form.')
      }
    })
  }
}

const deleteCatalogItem = (id) => {
  router.delete(`/equipment/catalog/${id}`, {
    onSuccess: () => {
      message.success('Đã xóa thiết bị mẫu.')
    },
    onError: (err) => {
      message.error(err.error || 'Không thể xóa thiết bị mẫu đang được sử dụng.')
    }
  })
}

const resetCatalogForm = () => {
  editingCatalog.value = null
  catalogForm.reset()
  catalogForm.clearErrors()
}

// Detail
const openDetail = (item) => { selectedItem.value = item; showDetailDrawer.value = true }

// Workflow actions
const submitItem = (e) => router.post(`/equipment/${e.id}/submit`, {}, { preserveScroll: true })
const approveItem = (e) => router.post(`/equipment/${e.id}/approve-management`, {}, { preserveScroll: true })
const confirmItem = (e) => {
  confirmEquipmentTarget.value = e
  confirmEquipmentFiles.value = []
  showConfirmEquipmentModal.value = true
}
const confirmApproveEquipment = () => {
  if (!confirmEquipmentFiles.value.length) {
    message.error('Vui lòng đính kèm chứng từ thanh toán.')
    return
  }
  confirmEquipmentLoading.value = true
  const formData = new FormData()
  confirmEquipmentFiles.value.forEach(f => {
    formData.append('files[]', f)
  })
  router.post(`/equipment/${confirmEquipmentTarget.value.id}/confirm-accountant`, formData, {
    forceFormData: true,
    preserveScroll: true,
    onSuccess: () => {
      showConfirmEquipmentModal.value = false
      confirmEquipmentTarget.value = null
      confirmEquipmentFiles.value = []
      showDetailDrawer.value = false
      message.success('Xác nhận chi & nhập kho thiết bị thành công.')
    },
    onFinish: () => {
      confirmEquipmentLoading.value = false
    }
  })
}
const rejectItem = (e) => router.post(`/equipment/${e.id}/reject`, { reason: rejectReason.value }, { preserveScroll: true, onSuccess: () => { rejectReason.value = ''; showDetailDrawer.value = false } })
const revertItem = (e) => router.post(`/equipment/${e.id}/revert`, {}, { preserveScroll: true, onSuccess: () => { showDetailDrawer.value = false } })
const deleteItem = (e) => router.delete(`/equipment/${e.id}`)

const formatCurrency = (v) => v ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(v) : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : ''

// Attachment helpers
const imageAttachments = computed(() => {
  if (!selectedItem.value?.attachments) return []
  return selectedItem.value.attachments.filter(f => f.mime_type && f.mime_type.startsWith('image/'))
})
const nonImageAttachments = computed(() => {
  if (!selectedItem.value?.attachments) return []
  return selectedItem.value.attachments.filter(f => !f.mime_type || !f.mime_type.startsWith('image/'))
})
const previewImage = (file) => {
  imagePreviewUrl.value = `/storage/${file.file_path}`
  imagePreviewVisible.value = true
}
const formatFileSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}
</script>

<style scoped>
.crm-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.5rem; margin-bottom: 2rem; }
.crm-content-card { background: white; border-radius: 16px; border: 1px solid #E8ECF1; overflow: hidden; }
.crm-table :deep(.ant-table-thead > tr > th) { background: #FAFBFC; font-weight: 600; font-size: 13px; color: #5D6B82; }
.crm-modal :deep(.ant-modal-content) { border-radius: 16px; }
.crm-drawer :deep(.ant-drawer-body) { padding: 16px; }
@media (max-width: 768px) { .crm-stats-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
